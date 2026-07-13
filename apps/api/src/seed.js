import bcrypt from "bcryptjs";
import { createDatabase } from "./db.js";
const ADMIN = {
  nombre: "Ana Sof\xEDa Ruiz",
  cedula: "1712345675",
  correo: "ana@cuido.ec",
  telefono: "0987654321",
  password: "CuidoDemo123"
};
const ADULT = {
  nombre: "Mar\xEDa Elena Guzm\xE1n",
  cedula: "0926687815",
  correo: "maria@cuido.ec",
  telefono: "0994567810",
  password: "Temporal123",
  fechaNacimiento: "1952-04-18",
  direccion: "Av. Amazonas y Naciones Unidas, Quito",
  latitude: -0.1807,
  longitude: -78.4678,
  contactoEmergencia: ADMIN.telefono
};
const db = createDatabase();
const [adminHash, adultHash] = await Promise.all([
  bcrypt.hash(ADMIN.password, 12),
  bcrypt.hash(ADULT.password, 12)
]);
try {
  db.exec("BEGIN");
  db.prepare(
    `INSERT INTO usuarios (nombre,cedula,correo,telefono,password_hash,rol,estado)
     VALUES (?,?,?,?,?,'ADMINISTRADOR','ACTIVO')
     ON CONFLICT(correo) DO UPDATE SET
       nombre=excluded.nombre,cedula=excluded.cedula,telefono=excluded.telefono,
       password_hash=excluded.password_hash,rol='ADMINISTRADOR',estado='ACTIVO'`
  ).run(ADMIN.nombre, ADMIN.cedula, ADMIN.correo, ADMIN.telefono, adminHash);
  const adminId = Number(
    db.prepare(
      "SELECT id_usuario FROM usuarios WHERE correo=? COLLATE NOCASE"
    ).get(ADMIN.correo).id_usuario
  );
  db.prepare(
    `INSERT INTO usuarios (nombre,cedula,correo,telefono,password_hash,rol,estado)
     VALUES (?,?,?,?,?,'ADULTO_MAYOR','ACTIVO')
     ON CONFLICT(correo) DO UPDATE SET
       nombre=excluded.nombre,cedula=excluded.cedula,telefono=excluded.telefono,
       password_hash=excluded.password_hash,rol='ADULTO_MAYOR',estado='ACTIVO'`
  ).run(ADULT.nombre, ADULT.cedula, ADULT.correo, ADULT.telefono, adultHash);
  const adultUserId = Number(
    db.prepare(
      "SELECT id_usuario FROM usuarios WHERE correo=? COLLATE NOCASE"
    ).get(ADULT.correo).id_usuario
  );
  db.prepare(
    `INSERT INTO adultos_mayores
      (id_usuario,fecha_nacimiento,direccion,latitude,longitude,contacto_emergencia,foto)
     VALUES (?,?,?,?,?,?,NULL)
     ON CONFLICT(id_usuario) DO UPDATE SET
       fecha_nacimiento=excluded.fecha_nacimiento,direccion=excluded.direccion,
       latitude=excluded.latitude,longitude=excluded.longitude,
       contacto_emergencia=excluded.contacto_emergencia`
  ).run(
    adultUserId,
    ADULT.fechaNacimiento,
    ADULT.direccion,
    ADULT.latitude,
    ADULT.longitude,
    ADULT.contactoEmergencia
  );
  const adultId = Number(
    db.prepare("SELECT id_adulto FROM adultos_mayores WHERE id_usuario=?").get(adultUserId).id_adulto
  );
  db.prepare(
    `INSERT INTO relaciones (id_administrador,id_adulto,estado)
     VALUES (?,?,'ACTIVO')
     ON CONFLICT(id_adulto) DO UPDATE SET
       id_administrador=excluded.id_administrador,estado='ACTIVO'`
  ).run(adminId, adultId);
  db.prepare(
    `INSERT INTO zonas_seguras
      (id_adulto,nombre,direccion,latitude,longitude,radio,estado)
     VALUES (?,'Casa',?,?,?,350,'ACTIVO')
     ON CONFLICT(id_adulto) DO UPDATE SET
       nombre='Casa',direccion=excluded.direccion,latitude=excluded.latitude,
       longitude=excluded.longitude,radio=350,estado='ACTIVO'`
  ).run(adultId, ADULT.direccion, ADULT.latitude, ADULT.longitude);
  const now = ecuadorNow();
  const latestLocation = db.prepare(
    "SELECT id_ubicacion FROM ubicaciones WHERE id_adulto=? ORDER BY id_ubicacion DESC LIMIT 1"
  ).get(adultId);
  if (latestLocation) {
    db.prepare(
      `UPDATE ubicaciones SET latitude=?,longitude=?,accuracy=25,fecha=?,hora=?,direccion=?
       WHERE id_ubicacion=?`
    ).run(
      ADULT.latitude,
      ADULT.longitude,
      now.fecha,
      now.hora,
      ADULT.direccion,
      latestLocation.id_ubicacion
    );
  } else {
    db.prepare(
      `INSERT INTO ubicaciones
        (id_adulto,latitude,longitude,accuracy,fecha,hora,direccion)
       VALUES (?,?,?,25,?,?,?)`
    ).run(
      adultId,
      ADULT.latitude,
      ADULT.longitude,
      now.fecha,
      now.hora,
      ADULT.direccion
    );
  }
  const hasDemoAlert = db.prepare("SELECT 1 FROM alertas WHERE id_adulto=? AND tipo='SOS' LIMIT 1").get(adultId);
  if (!hasDemoAlert) {
    db.prepare(
      `INSERT INTO alertas
        (id_adulto,tipo,fecha,hora,latitude,longitude,estado)
       VALUES (?,'SOS',?,?,?,?, 'NUEVA')`
    ).run(adultId, now.fecha, now.hora, ADULT.latitude, ADULT.longitude);
  }
  db.exec("COMMIT");
  console.log("Credenciales demo listas:");
  console.log(`ADMIN  ${ADMIN.correo} / ${ADMIN.password}`);
  console.log(`ADULTO ${ADULT.correo} / ${ADULT.password}`);
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
function ecuadorNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(/* @__PURE__ */ new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    fecha: `${get("year")}-${get("month")}-${get("day")}`,
    hora: `${get("hour")}:${get("minute")}:${get("second")}`
  };
}
