import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import { ZodError } from 'zod';
import type { Db } from './db.js';
import { createToken, authenticate, authorize } from './auth.js';
import { createAdultSchema, geocodeSchema, loginSchema, registerSchema, updateAdultSchema } from './validation.js';
import { config } from './config.js';

type UserRow = { id_usuario:number; nombre:string; correo:string; password_hash:string; rol:'ADMINISTRADOR'|'ADULTO_MAYOR'; estado:string };

type GeocodeResult = { direccion:string; latitude:number; longitude:number };
type Geocoder = (direccion:string) => Promise<GeocodeResult>;

export function createApp(db: Db, geocoder:Geocoder = googleGeocode) {
  const app = express();
  app.use(helmet()); app.use(cors()); app.use(express.json({ limit: '2mb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'cuido-api' }));

  app.post('/api/auth/register', async (req, res) => {
    const data = registerSchema.parse(req.body);
    const password_hash = await bcrypt.hash(data.password, 12);
    try {
      const result = db.prepare(`INSERT INTO usuarios (nombre,cedula,correo,telefono,password_hash,rol) VALUES (?,?,?,?,?,'ADMINISTRADOR')`)
        .run(data.nombre, data.cedula, data.correo, data.telefono, password_hash);
      const usuario = { id_usuario: Number(result.lastInsertRowid), nombre: data.nombre, rol: 'ADMINISTRADOR' as const };
      res.status(201).json({ token: createToken(usuario), usuario });
    } catch (error) { handleUnique(error, res); }
  });

  app.post('/api/auth/login', async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = db.prepare('SELECT id_usuario,nombre,correo,password_hash,rol,estado FROM usuarios WHERE correo = ? COLLATE NOCASE').get(data.correo) as UserRow | undefined;
    if (!user || !(await bcrypt.compare(data.password, user.password_hash))) { res.status(401).json({ message: 'Correo o contraseña incorrectos.' }); return; }
    if (user.estado !== 'ACTIVO') { res.status(403).json({ message: 'Esta cuenta está inactiva. Contacta a tu administrador.' }); return; }
    const usuario = { id_usuario: user.id_usuario, nombre: user.nombre, rol: user.rol };
    res.json({ token: createToken(usuario), usuario });
  });

  app.get('/api/auth/me', authenticate, (req, res) => res.json({ usuario: req.user }));

  app.get('/api/adults', authenticate, authorize('ADMINISTRADOR'), (req, res) => {
    const adults = db.prepare(`SELECT a.id_adulto AS adultId,a.id_adulto,u.id_usuario,u.nombre,u.cedula,u.correo,u.telefono,u.estado,
      a.fecha_nacimiento,a.direccion,a.latitude,a.longitude,a.contacto_emergencia,a.foto,r.id_administrador,r.fecha_asignacion
      FROM relaciones r JOIN adultos_mayores a ON a.id_adulto=r.id_adulto JOIN usuarios u ON u.id_usuario=a.id_usuario
      WHERE r.id_administrador=? AND r.estado='ACTIVO' ORDER BY r.fecha_asignacion DESC`).all(req.user!.id_usuario);
    res.json({ adultos: adults, total: adults.length, limite: 2 });
  });

  app.get('/api/adults/:id', authenticate, authorize('ADMINISTRADOR'), (req, res) => {
    const adult = ownedAdult(db, Number(req.params.id), req.user!.id_usuario);
    if (!adult) { res.status(404).json({ message: 'Adulto mayor no encontrado.' }); return; }
    res.json({ adulto: adult });
  });

  app.post('/api/adults', authenticate, authorize('ADMINISTRADOR'), async (req, res) => {
    const data = createAdultSchema.parse(req.body);
    // Hash first so the limit check and all inserts run synchronously as one critical section.
    const password_hash = await bcrypt.hash(data.password, 12);
    const count = (db.prepare(`SELECT COUNT(*) AS total FROM relaciones WHERE id_administrador=? AND estado='ACTIVO'`).get(req.user!.id_usuario) as {total:number}).total;
    if (count >= 2) { res.status(409).json({ code: 'ADULT_LIMIT_REACHED', message: 'Límite máximo alcanzado. Cada administrador puede registrar hasta dos adultos mayores.' }); return; }
    try {
      db.exec('BEGIN');
      const userResult = db.prepare(`INSERT INTO usuarios (nombre,cedula,correo,telefono,password_hash,rol,estado) VALUES (?,?,?,?,?,'ADULTO_MAYOR','ACTIVO')`)
        .run(data.nombre,data.cedula,data.correo,data.telefono,password_hash);
      const id_usuario = Number(userResult.lastInsertRowid);
      const adultResult = db.prepare(`INSERT INTO adultos_mayores (id_usuario,fecha_nacimiento,direccion,latitude,longitude,contacto_emergencia,foto) VALUES (?,?,?,?,?,?,?)`)
        .run(id_usuario,data.fecha_nacimiento,data.direccion,data.latitude ?? null,data.longitude ?? null,data.contacto_emergencia,data.foto ?? null);
      const adultId = Number(adultResult.lastInsertRowid);
      db.prepare('INSERT INTO relaciones (id_administrador,id_adulto) VALUES (?,?)').run(req.user!.id_usuario,adultId);
      db.exec('COMMIT');
      res.status(201).json({ adulto: { adultId, id_adulto: adultId, id_usuario, id_administrador:req.user!.id_usuario, nombre:data.nombre, estado:'ACTIVO' } });
    } catch (error) { db.exec('ROLLBACK'); handleUnique(error,res); }
  });

  app.put('/api/adults/:id', authenticate, authorize('ADMINISTRADOR'), (req, res) => {
    const id = Number(req.params.id); const current = ownedAdult(db,id,req.user!.id_usuario) as any;
    if (!current) { res.status(404).json({ message: 'Adulto mayor no encontrado.' }); return; }
    const data = updateAdultSchema.parse(req.body);
    try {
      db.exec('BEGIN');
      db.prepare('UPDATE usuarios SET nombre=?,cedula=?,correo=?,telefono=?,estado=? WHERE id_usuario=?')
        .run(data.nombre,data.cedula,data.correo,data.telefono,data.estado ?? current.estado,current.id_usuario);
      db.prepare('UPDATE adultos_mayores SET fecha_nacimiento=?,direccion=?,latitude=?,longitude=?,contacto_emergencia=?,foto=? WHERE id_adulto=?')
        .run(data.fecha_nacimiento,data.direccion,data.latitude ?? null,data.longitude ?? null,data.contacto_emergencia,data.foto ?? null,id);
      db.exec('COMMIT');
      res.json({ adulto: ownedAdult(db,id,req.user!.id_usuario) });
    } catch(error) { db.exec('ROLLBACK'); handleUnique(error,res); }
  });

  app.patch('/api/adults/:id/status', authenticate, authorize('ADMINISTRADOR'), (req,res) => {
    const adult = ownedAdult(db,Number(req.params.id),req.user!.id_usuario) as any;
    if (!adult) { res.status(404).json({ message:'Adulto mayor no encontrado.' }); return; }
    const estado = req.body.estado === 'ACTIVO' ? 'ACTIVO' : req.body.estado === 'INACTIVO' ? 'INACTIVO' : null;
    if (!estado) { res.status(400).json({ message:'El estado debe ser ACTIVO o INACTIVO.' }); return; }
    db.prepare('UPDATE usuarios SET estado=? WHERE id_usuario=?').run(estado,adult.id_usuario);
    res.json({ adultId:Number(req.params.id), estado });
  });

  app.post('/api/geocoding/address', authenticate, authorize('ADMINISTRADOR'), async (req,res) => {
    const { direccion } = geocodeSchema.parse(req.body);
    try { res.json(await geocoder(direccion)); }
    catch (error) {
      if (String(error).includes('GOOGLE_MAPS_API_KEY')) { res.status(503).json({ message:'Configura GOOGLE_MAPS_API_KEY en el servidor para usar geocodificación.' }); return; }
      res.status(422).json({ message:'No pudimos encontrar esa dirección en Quito.' });
    }
  });

  app.use((_req,res) => res.status(404).json({ message:'Ruta no encontrada.' }));
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) { res.status(400).json({ message:'Revisa los datos ingresados.', errors:error.issues.map(i => ({ field:i.path.join('.'), message:i.message })) }); return; }
    console.error(error); res.status(500).json({ message:'No pudimos completar la operación. Intenta nuevamente.' });
  });
  return app;
}

async function googleGeocode(direccion:string):Promise<GeocodeResult> {
  if (!config.googleMapsApiKey) throw new Error('GOOGLE_MAPS_API_KEY');
  const address = `${direccion}, Quito, Ecuador`;
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.googleMapsApiKey}`);
  const body = await response.json() as any;
  if (!response.ok || body.status !== 'OK' || !body.results?.[0]) throw new Error('GEOCODING_FAILED');
  const result = body.results[0];
  return { direccion:result.formatted_address, latitude:result.geometry.location.lat, longitude:result.geometry.location.lng };
}

function ownedAdult(db:Db,id:number,administratorId:number) {
  return db.prepare(`SELECT a.id_adulto AS adultId,a.id_adulto,u.id_usuario,u.nombre,u.cedula,u.correo,u.telefono,u.estado,a.fecha_nacimiento,a.direccion,a.latitude,a.longitude,a.contacto_emergencia,a.foto,r.id_administrador FROM relaciones r JOIN adultos_mayores a ON a.id_adulto=r.id_adulto JOIN usuarios u ON u.id_usuario=a.id_usuario WHERE a.id_adulto=? AND r.id_administrador=? AND r.estado='ACTIVO'`).get(id,administratorId);
}
function handleUnique(error:unknown,res:Response) {
  const message=String(error);
  if(message.includes('usuarios.correo')) { res.status(409).json({ message:'Ese correo ya está registrado.',field:'correo' }); return; }
  if(message.includes('usuarios.cedula')) { res.status(409).json({ message:'Esa cédula ya está registrada.',field:'cedula' }); return; }
  throw error;
}
