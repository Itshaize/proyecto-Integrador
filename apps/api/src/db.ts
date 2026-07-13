import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

export type Db = DatabaseSync;

export function createDatabase(path = config.databasePath): Db {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON;');
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
  `);
  return db;
}

