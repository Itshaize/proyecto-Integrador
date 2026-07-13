const fs = require('fs');
const path = require('path');

let dbType = 'sqlite';
let dbInstance = null;
const fallbackFilePath = path.join(__dirname, 'db_fallback.json');

// Helper to initialize fallback JSON
function initFallbackJson() {
  if (!fs.existsSync(fallbackFilePath)) {
    const initialData = {
      alertas: [
        {
          id: 1,
          adult_id: "adult-123",
          type: "SOS",
          date_time: new Date(Date.now() - 3600000 * 2).toISOString(),
          latitude: -0.180653,
          longitude: -78.467834,
          status: "resolved"
        },
        {
          id: 2,
          adult_id: "adult-123",
          type: "FUERA_DE_ZONA",
          date_time: new Date(Date.now() - 3600000).toISOString(),
          latitude: -0.178553,
          longitude: -78.465834,
          status: "active"
        }
      ],
      contactos_emergencia: [
        {
          id: 1,
          adult_id: "adult-123",
          name: "María Pérez (Hija)",
          phone: "+593 99 123 4567",
          relationship: "Hija",
          email: "maria.perez@example.com"
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
  console.warn("⚠️ SQLite3 native compilation is not available. Falling back to JSON file database...");
  dbType = 'json';
  initFallbackJson();
}

function connectSqlite() {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(__dirname, 'taller.db');
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error("Error connecting to SQLite database:", err.message);
        reject(err);
      } else {
        resolve(db);
      }
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

const dbModule = {
  async init() {
    if (dbType === 'json') {
      console.log("📂 File-based JSON Database initialized at:", fallbackFilePath);
      return;
    }

    try {
      dbInstance = await connectSqlite();
      console.log("💾 SQLite Database connected successfully.");

      // Create Tables
      await runSql(dbInstance, `
        CREATE TABLE IF NOT EXISTS alertas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adult_id TEXT NOT NULL,
          type TEXT NOT NULL,
          date_time TEXT NOT NULL,
          latitude REAL NOT NULL,
          longitude REAL NOT NULL,
          status TEXT NOT NULL
        )
      `);

      await runSql(dbInstance, `
        CREATE TABLE IF NOT EXISTS contactos_emergencia (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          adult_id TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          relationship TEXT,
          email TEXT
        )
      `);

      // Seed mock contact and alerts if empty
      const contactsCount = await getSql(dbInstance, "SELECT COUNT(*) as count FROM contactos_emergencia");
      if (contactsCount.count === 0) {
        await runSql(dbInstance, `
          INSERT INTO contactos_emergencia (adult_id, name, phone, relationship, email)
          VALUES (?, ?, ?, ?, ?)
        `, ["adult-123", "María Pérez (Hija)", "+593 99 123 4567", "Hija", "maria.perez@example.com"]);
      }

      const alertsCount = await getSql(dbInstance, "SELECT COUNT(*) as count FROM alertas");
      if (alertsCount.count === 0) {
        await runSql(dbInstance, `
          INSERT INTO alertas (adult_id, type, date_time, latitude, longitude, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ["adult-123", "SOS", new Date(Date.now() - 3600000 * 2).toISOString(), -0.180653, -78.467834, "resolved"]);
        
        await runSql(dbInstance, `
          INSERT INTO alertas (adult_id, type, date_time, latitude, longitude, status)
          VALUES (?, ?, ?, ?, ?, ?)
        `, ["adult-123", "FUERA_DE_ZONA", new Date(Date.now() - 3600000).toISOString(), -0.178553, -78.465834, "active"]);
      }

      console.log("✅ SQLite Database tables initialized and seeded.");
    } catch (err) {
      console.error("❌ Failed to initialize SQLite database. Falling back to JSON database.", err);
      dbType = 'json';
      initFallbackJson();
    }
  },

  // Alerts functions
  async createAlert(adultId, type, latitude, longitude, status = 'active') {
    const dateTime = new Date().toISOString();
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const newId = data.alertas.length > 0 ? Math.max(...data.alertas.map(a => a.id)) + 1 : 1;
      const newAlert = { id: newId, adult_id: adultId, type, date_time: dateTime, latitude: parseFloat(latitude), longitude: parseFloat(longitude), status };
      data.alertas.push(newAlert);
      fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      return newAlert;
    } else {
      const res = await runSql(dbInstance, `
        INSERT INTO alertas (adult_id, type, date_time, latitude, longitude, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [adultId, type, dateTime, latitude, longitude, status]);
      return { id: res.id, adult_id: adultId, type, date_time: dateTime, latitude, longitude, status };
    }
  },

  async getAlertsByAdult(adultId) {
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      return data.alertas
        .filter(a => a.adult_id === adultId)
        .sort((a, b) => new Date(b.date_time) - new Date(a.date_time));
    } else {
      return await allSql(dbInstance, `
        SELECT * FROM alertas 
        WHERE adult_id = ? 
        ORDER BY datetime(date_time) DESC
      `, [adultId]);
    }
  },

  async resolveAlert(alertId) {
    const id = parseInt(alertId);
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const idx = data.alertas.findIndex(a => a.id === id);
      if (idx !== -1) {
        data.alertas[idx].status = 'resolved';
        fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
      }
      return false;
    } else {
      const res = await runSql(dbInstance, `
        UPDATE alertas 
        SET status = 'resolved' 
        WHERE id = ?
      `, [id]);
      return res.changes > 0;
    }
  },

  // Contact functions
  async getContactsByAdult(adultId) {
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      return data.contactos_emergencia.filter(c => c.adult_id === adultId);
    } else {
      return await allSql(dbInstance, `
        SELECT * FROM contactos_emergencia 
        WHERE adult_id = ?
      `, [adultId]);
    }
  },

  async upsertContact(adultId, name, phone, relationship, email) {
    if (dbType === 'json') {
      const data = JSON.parse(fs.readFileSync(fallbackFilePath, 'utf8'));
      const idx = data.contactos_emergencia.findIndex(c => c.adult_id === adultId);
      if (idx !== -1) {
        data.contactos_emergencia[idx] = {
          ...data.contactos_emergencia[idx],
          name,
          phone,
          relationship,
          email
        };
      } else {
        const newId = data.contactos_emergencia.length > 0 ? Math.max(...data.contactos_emergencia.map(c => c.id)) + 1 : 1;
        data.contactos_emergencia.push({
          id: newId,
          adult_id: adultId,
          name,
          phone,
          relationship,
          email
        });
      }
      fs.writeFileSync(fallbackFilePath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } else {
      const existing = await getSql(dbInstance, "SELECT id FROM contactos_emergencia WHERE adult_id = ?", [adultId]);
      if (existing) {
        await runSql(dbInstance, `
          UPDATE contactos_emergencia 
          SET name = ?, phone = ?, relationship = ?, email = ?
          WHERE adult_id = ?
        `, [name, phone, relationship, email, adultId]);
      } else {
        await runSql(dbInstance, `
          INSERT INTO contactos_emergencia (adult_id, name, phone, relationship, email)
          VALUES (?, ?, ?, ?, ?)
        `, [adultId, name, phone, relationship, email]);
      }
      return true;
    }
  }
};

module.exports = dbModule;
