import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";
function createDatabase(path = config.databasePath) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec("PRAGMA foreign_keys = ON;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      cedula TEXT NOT NULL UNIQUE,
      correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
      telefono TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      rol TEXT NOT NULL CHECK (rol IN ('ADMINISTRADOR','ADULTO_MAYOR')),
      estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
      fecha_registro TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS adultos_mayores (
      id_adulto INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL UNIQUE,
      fecha_nacimiento TEXT NOT NULL,
      direccion TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      contacto_emergencia TEXT NOT NULL,
      foto TEXT,
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS relaciones (
      id_relacion INTEGER PRIMARY KEY AUTOINCREMENT,
      id_administrador INTEGER NOT NULL,
      id_adulto INTEGER NOT NULL UNIQUE,
      fecha_asignacion TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      estado TEXT NOT NULL DEFAULT 'ACTIVO',
      FOREIGN KEY (id_administrador) REFERENCES usuarios(id_usuario),
      FOREIGN KEY (id_adulto) REFERENCES adultos_mayores(id_adulto) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS ubicaciones (
      id_ubicacion INTEGER PRIMARY KEY AUTOINCREMENT,
      id_adulto INTEGER NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      accuracy REAL NOT NULL,
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      direccion TEXT,
      FOREIGN KEY (id_adulto) REFERENCES adultos_mayores(id_adulto) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_ubicaciones_adulto_fecha
      ON ubicaciones(id_adulto, id_ubicacion DESC);
    CREATE TABLE IF NOT EXISTS zonas_seguras (
      id_zona INTEGER PRIMARY KEY AUTOINCREMENT,
      id_adulto INTEGER NOT NULL UNIQUE,
      nombre TEXT NOT NULL,
      direccion TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      radio INTEGER NOT NULL CHECK (radio BETWEEN 50 AND 2000),
      estado TEXT NOT NULL DEFAULT 'ACTIVO' CHECK (estado IN ('ACTIVO','INACTIVO')),
      FOREIGN KEY (id_adulto) REFERENCES adultos_mayores(id_adulto) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS alertas (
      id_alerta INTEGER PRIMARY KEY AUTOINCREMENT,
      id_adulto INTEGER NOT NULL,
      tipo TEXT NOT NULL CHECK (tipo IN ('SOS','FUERA_DE_ZONA')),
      fecha TEXT NOT NULL,
      hora TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      estado TEXT NOT NULL DEFAULT 'NUEVA' CHECK (estado IN ('NUEVA','VISTA','ATENDIDA','CERRADA')),
      FOREIGN KEY (id_adulto) REFERENCES adultos_mayores(id_adulto) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_alertas_adulto_fecha
      ON alertas(id_adulto, id_alerta DESC);
  `);
  return db;
}
export {
  createDatabase
};
