import mongoose from "mongoose";
import { config } from "./config.js";

const commonOptions = { versionKey: false };

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, required: true, default: 0 }
}, commonOptions);

const userSchema = new mongoose.Schema({
  id_usuario: { type: Number, required: true, unique: true, index: true },
  nombre: { type: String, required: true },
  cedula: { type: String, required: true, unique: true },
  correo: { type: String, required: true, unique: true, lowercase: true, trim: true },
  telefono: { type: String, required: true },
  password_hash: { type: String, required: true },
  rol: { type: String, required: true, enum: ["ADMINISTRADOR", "ADULTO_MAYOR"] },
  estado: { type: String, required: true, enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO" },
  fecha_registro: { type: Date, default: Date.now }
}, commonOptions);

const adultSchema = new mongoose.Schema({
  id_adulto: { type: Number, required: true, unique: true, index: true },
  id_usuario: { type: Number, required: true, unique: true, index: true },
  fecha_nacimiento: { type: String, required: true },
  direccion: { type: String, required: true },
  latitude: Number,
  longitude: Number,
  contacto_emergencia: { type: String, required: true },
  foto: { type: String, default: null }
}, commonOptions);

const relationSchema = new mongoose.Schema({
  id_relacion: { type: Number, required: true, unique: true },
  id_administrador: { type: Number, required: true, index: true },
  id_adulto: { type: Number, required: true, unique: true, index: true },
  fecha_asignacion: { type: Date, default: Date.now },
  estado: { type: String, enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO" }
}, commonOptions);

const locationSchema = new mongoose.Schema({
  id_ubicacion: { type: Number, required: true, unique: true },
  id_adulto: { type: Number, required: true, index: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  accuracy: { type: Number, required: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  direccion: { type: String, default: null }
}, commonOptions);
locationSchema.index({ id_adulto: 1, id_ubicacion: -1 });

const safeZoneSchema = new mongoose.Schema({
  id_zona: { type: Number, required: true, unique: true },
  id_adulto: { type: Number, required: true, unique: true, index: true },
  nombre: { type: String, required: true },
  direccion: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  radio: { type: Number, required: true, min: 50, max: 2000 },
  estado: { type: String, enum: ["ACTIVO", "INACTIVO"], default: "ACTIVO" }
}, commonOptions);

const alertSchema = new mongoose.Schema({
  id_alerta: { type: Number, required: true, unique: true },
  id_adulto: { type: Number, required: true, index: true },
  tipo: { type: String, required: true, enum: ["SOS", "FUERA_DE_ZONA"] },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  estado: { type: String, enum: ["NUEVA", "VISTA", "ATENDIDA", "CERRADA"], default: "NUEVA" }
}, commonOptions);
alertSchema.index({ id_adulto: 1, fecha: -1, hora: -1 });

const Counter = mongoose.models.Counter ?? mongoose.model("Counter", counterSchema, "contadores");
const User = mongoose.models.User ?? mongoose.model("User", userSchema, "usuarios");
const Adult = mongoose.models.Adult ?? mongoose.model("Adult", adultSchema, "adultos_mayores");
const Relation = mongoose.models.Relation ?? mongoose.model("Relation", relationSchema, "relaciones");
const Location = mongoose.models.Location ?? mongoose.model("Location", locationSchema, "ubicaciones");
const SafeZone = mongoose.models.SafeZone ?? mongoose.model("SafeZone", safeZoneSchema, "zonas_seguras");
const Alert = mongoose.models.Alert ?? mongoose.model("Alert", alertSchema, "alertas");

const models = { Counter, User, Adult, Relation, Location, SafeZone, Alert };

async function connectDatabase(options = {}) {
  if (!config.mongodbUri) throw new Error("MONGODB_URI no está configurada.");
  if (mongoose.connection.readyState === 1) return models;
  await mongoose.connect(config.mongodbUri, {
    dbName: options.dbName ?? config.mongodbDatabase,
    serverSelectionTimeoutMS: options.serverSelectionTimeoutMS ?? 12000
  });
  await Promise.all(Object.values(models).filter((model) => model !== Counter).map((model) => model.init()));
  return models;
}

async function disconnectDatabase() {
  await mongoose.disconnect();
}

async function nextId(name) {
  const counter = await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { returnDocument: "after", upsert: true });
  return counter.seq;
}

async function ensureCounter(name, value) {
  await Counter.updateOne({ _id: name, seq: { $lt: value } }, { $set: { seq: value } }, { upsert: true });
}

export { connectDatabase, disconnectDatabase, ensureCounter, models, nextId };
