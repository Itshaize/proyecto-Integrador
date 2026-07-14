import express from "express";
import cors from "cors";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import { ZodError } from "zod";
import { createToken, authenticate, authorize } from "./auth.js";
import { createAdultSchema, geocodeSchema, loginSchema, registerSchema, updateAdultSchema } from "./validation.js";
import { config } from "./config.js";
import { models, nextId } from "./db.js";
import { registerIntegratedRoutes } from "./integrated.js";

function createApp(db = models, geocoder = googleGeocode) {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "cuido-api", database: "mongodb" }));

  app.post("/api/auth/register", async (req, res) => {
    const data = registerSchema.parse(req.body);
    try {
      const user = await db.User.create({
        id_usuario: await nextId("usuarios"),
        nombre: data.nombre,
        cedula: data.cedula,
        correo: data.correo,
        telefono: data.telefono,
        password_hash: await bcrypt.hash(data.password, 12),
        rol: "ADMINISTRADOR"
      });
      const usuario = { id_usuario: user.id_usuario, nombre: user.nombre, rol: user.rol };
      res.status(201).json({ token: createToken(usuario), usuario });
    } catch (error) {
      handleUnique(error, res);
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const data = loginSchema.parse(req.body);
    const user = await db.User.findOne({ correo: data.correo.toLowerCase() }).lean();
    if (!user || !await bcrypt.compare(data.password, user.password_hash)) {
      res.status(401).json({ message: "Correo o contraseña incorrectos." });
      return;
    }
    if (user.estado !== "ACTIVO") {
      res.status(403).json({ message: "Esta cuenta está inactiva. Contacta a tu administrador." });
      return;
    }
    const adult = user.rol === "ADULTO_MAYOR" ? await db.Adult.findOne({ id_usuario: user.id_usuario }).lean() : null;
    const relation = adult ? await db.Relation.findOne({ id_adulto: adult.id_adulto, estado: "ACTIVO" }).lean() : null;
    const usuario = {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      rol: user.rol,
      ...(adult ? { adultId: adult.id_adulto, id_administrador: relation?.id_administrador } : {})
    };
    res.json({ token: createToken(usuario), usuario });
  });

  app.get("/api/auth/me", authenticate, async (req, res) => {
    const user = await db.User.findOne({ id_usuario: req.user.id_usuario, estado: "ACTIVO" }).lean();
    if (!user) {
      res.status(401).json({ message: "Tu cuenta ya no está activa." });
      return;
    }
    const adult = user.rol === "ADULTO_MAYOR" ? await db.Adult.findOne({ id_usuario: user.id_usuario }).lean() : null;
    const relation = adult ? await db.Relation.findOne({ id_adulto: adult.id_adulto, estado: "ACTIVO" }).lean() : null;
    res.json({ usuario: {
      id_usuario: user.id_usuario,
      nombre: user.nombre,
      rol: user.rol,
      ...(adult ? { adultId: adult.id_adulto, id_administrador: relation?.id_administrador } : {})
    } });
  });

  app.get("/api/adults", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const relations = await db.Relation.find({ id_administrador: req.user.id_usuario, estado: "ACTIVO" }).sort({ fecha_asignacion: -1 }).lean();
    const adults = (await Promise.all(relations.map((relation) => ownedAdult(db, relation.id_adulto, req.user.id_usuario)))).filter(Boolean);
    res.json({ adultos: adults, total: adults.length, limite: 2 });
  });

  app.get("/api/adults/:id", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const adult = await ownedAdult(db, Number(req.params.id), req.user.id_usuario);
    if (!adult) {
      res.status(404).json({ message: "Adulto mayor no encontrado." });
      return;
    }
    res.json({ adulto: adult });
  });

  app.post("/api/adults", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const data = createAdultSchema.parse(req.body);
    const count = await db.Relation.countDocuments({ id_administrador: req.user.id_usuario, estado: "ACTIVO" });
    if (count >= 2) {
      res.status(409).json({ code: "ADULT_LIMIT_REACHED", message: "Límite máximo alcanzado. Cada administrador puede registrar hasta dos adultos mayores." });
      return;
    }
    let user;
    let adult;
    try {
      user = await db.User.create({
        id_usuario: await nextId("usuarios"),
        nombre: data.nombre,
        cedula: data.cedula,
        correo: data.correo,
        telefono: data.telefono,
        password_hash: await bcrypt.hash(data.password, 12),
        rol: "ADULTO_MAYOR",
        estado: "ACTIVO"
      });
      adult = await db.Adult.create({
        id_adulto: await nextId("adultos"),
        id_usuario: user.id_usuario,
        fecha_nacimiento: data.fecha_nacimiento,
        direccion: data.direccion,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        contacto_emergencia: data.contacto_emergencia,
        foto: data.foto ?? null
      });
      await db.Relation.create({
        id_relacion: await nextId("relaciones"),
        id_administrador: req.user.id_usuario,
        id_adulto: adult.id_adulto
      });
      res.status(201).json({ adulto: {
        adultId: adult.id_adulto,
        id_adulto: adult.id_adulto,
        id_usuario: user.id_usuario,
        id_administrador: req.user.id_usuario,
        nombre: user.nombre,
        estado: user.estado
      } });
    } catch (error) {
      if (adult) await db.Adult.deleteOne({ id_adulto: adult.id_adulto });
      if (user) await db.User.deleteOne({ id_usuario: user.id_usuario });
      handleUnique(error, res);
    }
  });

  app.put("/api/adults/:id", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const id = Number(req.params.id);
    const current = await ownedAdult(db, id, req.user.id_usuario);
    if (!current) {
      res.status(404).json({ message: "Adulto mayor no encontrado." });
      return;
    }
    const data = updateAdultSchema.parse(req.body);
    try {
      await Promise.all([
        db.User.updateOne({ id_usuario: current.id_usuario }, { $set: {
          nombre: data.nombre, cedula: data.cedula, correo: data.correo,
          telefono: data.telefono, estado: data.estado ?? current.estado
        } }),
        db.Adult.updateOne({ id_adulto: id }, { $set: {
          fecha_nacimiento: data.fecha_nacimiento, direccion: data.direccion,
          latitude: data.latitude ?? null, longitude: data.longitude ?? null,
          contacto_emergencia: data.contacto_emergencia, foto: data.foto ?? null
        } })
      ]);
      res.json({ adulto: await ownedAdult(db, id, req.user.id_usuario) });
    } catch (error) {
      handleUnique(error, res);
    }
  });

  app.patch("/api/adults/:id/status", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const adult = await ownedAdult(db, Number(req.params.id), req.user.id_usuario);
    if (!adult) {
      res.status(404).json({ message: "Adulto mayor no encontrado." });
      return;
    }
    const estado = ["ACTIVO", "INACTIVO"].includes(req.body.estado) ? req.body.estado : null;
    if (!estado) {
      res.status(400).json({ message: "El estado debe ser ACTIVO o INACTIVO." });
      return;
    }
    await db.User.updateOne({ id_usuario: adult.id_usuario }, { $set: { estado } });
    res.json({ adultId: Number(req.params.id), estado });
  });

  app.post("/api/geocoding/address", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const { direccion } = geocodeSchema.parse(req.body);
    try {
      res.json(await geocoder(direccion));
    } catch (error) {
      if (String(error).includes("GOOGLE_MAPS_API_KEY")) {
        res.status(503).json({ message: "Configura GOOGLE_MAPS_API_KEY en el servidor para usar geocodificación." });
        return;
      }
      res.status(422).json({ message: "No pudimos encontrar esa dirección en Quito." });
    }
  });

  registerIntegratedRoutes(app, db);
  app.use((_req, res) => res.status(404).json({ message: "Ruta no encontrada." }));
  app.use((error, _req, res, _next) => {
    if (error instanceof ZodError) {
      res.status(400).json({ message: "Revisa los datos ingresados.", errors: error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })) });
      return;
    }
    console.error(error);
    res.status(500).json({ message: "No pudimos completar la operación. Intenta nuevamente." });
  });
  return app;
}

async function googleGeocode(direccion) {
  if (!config.googleMapsApiKey) throw new Error("GOOGLE_MAPS_API_KEY");
  const address = `${direccion}, Quito, Ecuador`;
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${config.googleMapsApiKey}`);
  const body = await response.json();
  if (!response.ok || body.status !== "OK" || !body.results?.[0]) throw new Error("GEOCODING_FAILED");
  const result = body.results[0];
  return { direccion: result.formatted_address, latitude: result.geometry.location.lat, longitude: result.geometry.location.lng };
}

async function ownedAdult(db, id, administratorId) {
  const relation = await db.Relation.findOne({ id_adulto: id, id_administrador: administratorId, estado: "ACTIVO" }).lean();
  if (!relation) return null;
  const [adult, user] = await Promise.all([
    db.Adult.findOne({ id_adulto: id }).lean(),
    db.Adult.findOne({ id_adulto: id }).lean().then((row) => row ? db.User.findOne({ id_usuario: row.id_usuario }).lean() : null)
  ]);
  if (!adult || !user) return null;
  return {
    adultId: adult.id_adulto,
    id_adulto: adult.id_adulto,
    id_usuario: user.id_usuario,
    nombre: user.nombre,
    cedula: user.cedula,
    correo: user.correo,
    telefono: user.telefono,
    estado: user.estado,
    fecha_nacimiento: adult.fecha_nacimiento,
    direccion: adult.direccion,
    latitude: adult.latitude ?? null,
    longitude: adult.longitude ?? null,
    contacto_emergencia: adult.contacto_emergencia,
    foto: adult.foto ?? null,
    id_administrador: relation.id_administrador,
    fecha_asignacion: relation.fecha_asignacion
  };
}

function handleUnique(error, res) {
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
    if (field === "correo") {
      res.status(409).json({ message: "Ese correo ya está registrado.", field: "correo" });
      return;
    }
    if (field === "cedula") {
      res.status(409).json({ message: "Esa cédula ya está registrada.", field: "cedula" });
      return;
    }
  }
  throw error;
}

export { createApp };
