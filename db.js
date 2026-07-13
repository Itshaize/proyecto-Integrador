const fs = require('fs');
const path = require('path');

let dbType = 'sqlite';
let dbInstance = null;
const fallbackFilePath = path.join(__dirname, 'db_fallback.json');

// Helper to initialize fallback JSON with correct field names per contract
function initFallbackJson() {
  if (!fs.existsSync(fallbackFilePath)) {
    const now = new Date();
    const hace2h = new Date(Date.now() - 3600000 * 2);
    const hace1h = new Date(Date.now() - 3600000);

    const fmtFecha = (d) => d.toISOString().split('T')[0];
    const fmtHora  = (d) => d.toTimeString().split(' ')[0];

    const initialData = {
      alertas: [
        {
          id_alerta: 1,
          id_adulto: 1,
          tipo: "SOS",
          fecha: fmtFecha(hace2h),
          hora: fmtHora(hace2h),
          latitude: -0.180653,
          longitude: -78.467834,
          estado: "ATENDIDA"
        },
        {
          id_alerta: 2,
          id_adulto: 1,
          tipo: "FUERA_DE_ZONA",
          fecha: fmtFecha(hace1h),
          hora: fmtHora(hace1h),
          latitude: -0.178553,
          longitude: -78.465834,
          estado: "NUEVA"
        }
      ],
      contactos_emergencia: [
        {
          id_contacto: 1,
          id_adulto: 1,
          nombre: "María Pérez",
          telefono: "+593 99 123 4567",
          relacion: "Hija"
        }
      ]
    };
    fs.writeFileSync(fallbackFilePath, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

// Check if sqlite3 can be required
let sqlite3;
try {
  sqlite3 = require('sqlite3').verbose();
} catch (err) {
  console.warn("⚠️ SQLite3 no disponible. Usando base de datos JSON como respaldo...");
  dbType = 'json';
  initFallbackJson();
}

function connectSqlite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'taller.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) { console.error("Error conectando SQLite:", err.message); reject(err); }
      else { resolve(db); }
    });
  });
}

function runSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allSql(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Date helpers
function getFecha() { return new Date().toISOString().split('T')[0]; }
function getHora()  { return new Date().toTimeString().split(' ')[0]; }

const dbModule = {
  async init() {
    if (dbType === 'json') {
      console.log("📂 Base de datos JSON inicializada en:", fallbackFilePath);
      return;
    }

    try {
      dbInstance = await connectSqlite();
      console.log("💾 SQLite conectado correctamente.");

      // Tabla alertas — campos según contrato oficial del proyecto
      await runSql(dbInstance, `
        CREATE TABLE IF NOT EXISTS alertas (
          id_alerta   INTEGER PRIMARY KEY AUTOINCREMENT,
          id_adulto   INTEGER NOT NULL,
          tipo        TEXT NOT NULL,
          fecha       TEXT NOT NULL,
          hora        TEXT NOT NULL,
          latitude    REAL NOT NULL,
          longitude   REAL NOT NULL,
          estado      TEXT NOT NULL DEFAULT 'NUEVA'
        )
      `);

      // Tabla contactos_emergencia — campos según contrato oficial
      await runSql(dbInstance, `
        CREATE TABLE IF NOT EXISTS contactos_emergencia (
          id_contacto INTEGER PRIMARY KEY AUTOINCREMENT,
          id_adulto   INTEGER NOT NULL UNIQUE,
          nombre      TEXT NOT NULL,
          telefono    TEXT NOT NULL,
          relacion    TEXT
        )
      `);

      // Seed datos iniciales de prueba si las tablas están vacías
      const contactsCount = await getSql(dbInstance, "SELECT COUNT(*) as count FROM contactos_emergencia");
      if (contactsCount.count === 0) {
        await runSql(dbInstance,
          `INSERT INTO contactos_emergencia (id_adulto, nombre, telefono, relacion)
           VALUES (?, ?, ?, ?)`,
          [1, "María Pérez", "+593 99 123 4567", "Hija"]
        );
      }

      const alertsCount = await getSql(dbInstance, "SELECT COUNT(*) as count FROM alertas");
      if (alertsCount.count === 0) {
        const hace2h = new Date(Date.now() - 3600000 * 2);
        const hace1h = new Date(Date.now() - 3600000);

        await runSql(dbInstance,
          `INSERT INTO alertas (id_adulto, tipo, fecha, hora, latitude, longitude, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [1, "SOS",
           hace2h.toISOString().split('T')[0], hace2h.toTimeString().split(' ')[0],
           -0.180653, -78.467834, "ATENDIDA"]
        );
        await runSql(dbInstance,
          `INSERT INTO alertas (id_adulto, tipo, fecha, hora, latitude, longitude, estado)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [1, "FUERA_DE_ZONA",
           hace1h.toISOString().split('T')[0], hace1h.toTimeString().split(' ')[0],
           -0.178553, -78.465834, "NUEVA"]
        );
      }

      console.log("✅ Tablas inicializadas y datos de prueba insertados.");
    } catch (err) {
      console.error("❌ Error SQLite. Usando respaldo JSON.", err);
      dbType = 'json';
      initFallbackJson();
    }
  },

  // ---------- ALERTAS ----------

  // Crea alerta. Recibe id_adulto (entero), tipo, lat, lng. Estado inicial = 'NUEVA'
  async createAlert(idAdulto, tipo, latitude, longitude, estado = 'NUEVA') {
    const fecha = getFecha();
    const hora  = getHora();

    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const newId = data.alertas.length > 0
        ? Math.max(...data.alertas.map(a => a.id_alerta)) + 1 : 1;
      const newAlert = {
        id_alerta: newId,
        id_adulto: parseInt(idAdulto),
        tipo,
        fecha,
        hora,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        estado
      };
      data.alertas.push(newAlert);
      fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      return newAlert;
    } else {
      const res = await runSql(dbInstance,
        `INSERT INTO alertas (id_adulto, tipo, fecha, hora, latitude, longitude, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [parseInt(idAdulto), tipo, fecha, hora,
         parseFloat(latitude), parseFloat(longitude), estado]
      );
      return { id_alerta: res.id, id_adulto: parseInt(idAdulto), tipo, fecha, hora,
                latitude: parseFloat(latitude), longitude: parseFloat(longitude), estado };
    }
  },

  // Consulta historial por id_adulto, orden descendente de fecha+hora
  async getAlertsByAdult(idAdulto) {
    const id = parseInt(idAdulto);
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      return data.alertas
        .filter(a => a.id_adulto === id)
        .sort((a, b) => {
          const da = new Date(`${b.fecha}T${b.hora}`);
          const db2 = new Date(`${a.fecha}T${a.hora}`);
          return da - db2;
        });
    } else {
      return await allSql(dbInstance,
        `SELECT * FROM alertas
         WHERE id_adulto = ?
         ORDER BY fecha DESC, hora DESC`,
        [id]
      );
    }
  },

  // Actualiza el estado de una alerta (NUEVA → VISTA → ATENDIDA → CERRADA)
  async updateAlertStatus(idAlerta, estado) {
    const estadosValidos = ['NUEVA', 'VISTA', 'ATENDIDA', 'CERRADA'];
    if (!estadosValidos.includes(estado)) {
      throw new Error(`Estado inválido: ${estado}. Valores válidos: ${estadosValidos.join(', ')}`);
    }

    const id = parseInt(idAlerta);
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const idx = data.alertas.findIndex(a => a.id_alerta === id);
      if (idx !== -1) {
        data.alertas[idx].estado = estado;
        fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
      }
      return false;
    } else {
      const res = await runSql(dbInstance,
        `UPDATE alertas SET estado = ? WHERE id_alerta = ?`,
        [estado, id]
      );
      return res.changes > 0;
    }
  },

  // ---------- CONTACTOS ----------

  async getContactsByAdult(idAdulto) {
    const id = parseInt(idAdulto);
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      return data.contactos_emergencia.filter(c => c.id_adulto === id);
    } else {
      return await allSql(dbInstance,
        `SELECT * FROM contactos_emergencia WHERE id_adulto = ?`,
        [id]
      );
    }
  },

  // nombre, telefono, relacion — sin email según esquema del plan
  async upsertContact(idAdulto, nombre, telefono, relacion) {
    const id = parseInt(idAdulto);
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const idx = data.contactos_emergencia.findIndex(c => c.id_adulto === id);
      if (idx !== -1) {
        data.contactos_emergencia[idx] = { ...data.contactos_emergencia[idx], nombre, telefono, relacion };
      } else {
        const newId = data.contactos_emergencia.length > 0
          ? Math.max(...data.contactos_emergencia.map(c => c.id_contacto)) + 1 : 1;
        data.contactos_emergencia.push({ id_contacto: newId, id_adulto: id, nombre, telefono, relacion });
      }
      fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } else {
      const existing = await getSql(dbInstance,
        "SELECT id_contacto FROM contactos_emergencia WHERE id_adulto = ?", [id]);
      if (existing) {
        await runSql(dbInstance,
          `UPDATE contactos_emergencia SET nombre = ?, telefono = ?, relacion = ? WHERE id_adulto = ?`,
          [nombre, telefono, relacion, id]
        );
      } else {
        await runSql(dbInstance,
          `INSERT INTO contactos_emergencia (id_adulto, nombre, telefono, relacion) VALUES (?, ?, ?, ?)`,
          [id, nombre, telefono, relacion]
        );
      }
      return true;
    }
  }
};

module.exports = dbModule;
