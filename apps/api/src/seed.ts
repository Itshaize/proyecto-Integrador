import bcrypt from 'bcryptjs';
import { createDatabase } from './db.js';

const db=createDatabase();
const password_hash=await bcrypt.hash('CuidoDemo123',12);
db.prepare(`INSERT OR IGNORE INTO usuarios (nombre,cedula,correo,telefono,password_hash,rol) VALUES (?,?,?,?,?,'ADMINISTRADOR')`).run('Ana Sofía Ruiz','1712345675','ana@cuido.ec','0987654321',password_hash);
console.log('Cuenta demo lista: ana@cuido.ec / CuidoDemo123');
db.close();

