import bcrypt from "bcryptjs";
import { connectDatabase, disconnectDatabase, models, nextId } from "./db.js";

const ADMIN = { nombre: "Ana Sofía Ruiz", cedula: "1712345675", correo: "ana@cuido.ec", telefono: "0987654321", password: "CuidoDemo123" };
const ADULT = { nombre: "María Elena Guzmán", cedula: "0926687815", correo: "maria@cuido.ec", telefono: "0994567810", password: "Temporal123", fechaNacimiento: "1952-04-18", direccion: "Av. Amazonas y Naciones Unidas, Quito", latitude: -0.1807, longitude: -78.4678, contactoEmergencia: ADMIN.telefono };

try {
  await connectDatabase();
  const [adminHash, adultHash] = await Promise.all([bcrypt.hash(ADMIN.password, 12), bcrypt.hash(ADULT.password, 12)]);

  const admin = await upsertUser(ADMIN, "ADMINISTRADOR", adminHash);
  const adultUser = await upsertUser(ADULT, "ADULTO_MAYOR", adultHash);

  let adult = await models.Adult.findOne({ id_usuario: adultUser.id_usuario });
  if (!adult) {
    adult = await models.Adult.create({ id_adulto: await nextId("adultos"), id_usuario: adultUser.id_usuario, fecha_nacimiento: ADULT.fechaNacimiento, direccion: ADULT.direccion, latitude: ADULT.latitude, longitude: ADULT.longitude, contacto_emergencia: ADULT.contactoEmergencia, foto: null });
  } else {
    Object.assign(adult, { fecha_nacimiento: ADULT.fechaNacimiento, direccion: ADULT.direccion, latitude: ADULT.latitude, longitude: ADULT.longitude, contacto_emergencia: ADULT.contactoEmergencia });
    await adult.save();
  }

  await models.Relation.findOneAndUpdate(
    { id_adulto: adult.id_adulto },
    { $set: { id_administrador: admin.id_usuario, estado: "ACTIVO" }, $setOnInsert: { id_relacion: await nextId("relaciones"), fecha_asignacion: new Date() } },
    { upsert: true, returnDocument: "after" }
  );
  await models.SafeZone.findOneAndUpdate(
    { id_adulto: adult.id_adulto },
    { $set: { nombre: "Casa", direccion: ADULT.direccion, latitude: ADULT.latitude, longitude: ADULT.longitude, radio: 350, estado: "ACTIVO" }, $setOnInsert: { id_zona: await nextId("zonas_seguras") } },
    { upsert: true, returnDocument: "after" }
  );

  const now = ecuadorNow();
  const latest = await models.Location.findOne({ id_adulto: adult.id_adulto }).sort({ id_ubicacion: -1 });
  if (latest) {
    Object.assign(latest, { latitude: ADULT.latitude, longitude: ADULT.longitude, accuracy: 25, fecha: now.fecha, hora: now.hora, direccion: ADULT.direccion });
    await latest.save();
  } else {
    await models.Location.create({ id_ubicacion: await nextId("ubicaciones"), id_adulto: adult.id_adulto, latitude: ADULT.latitude, longitude: ADULT.longitude, accuracy: 25, fecha: now.fecha, hora: now.hora, direccion: ADULT.direccion });
  }
  if (!await models.Alert.exists({ id_adulto: adult.id_adulto, tipo: "SOS" })) {
    await models.Alert.create({ id_alerta: await nextId("alertas"), id_adulto: adult.id_adulto, tipo: "SOS", fecha: now.fecha, hora: now.hora, latitude: ADULT.latitude, longitude: ADULT.longitude, estado: "NUEVA" });
  }

  console.log("MongoDB Atlas: datos demo listos en la base cuido.");
  console.log(`ADMIN  ${ADMIN.correo} / ${ADMIN.password}`);
  console.log(`ADULTO ${ADULT.correo} / ${ADULT.password}`);
} finally {
  await disconnectDatabase();
}

async function upsertUser(data, rol, passwordHash) {
  let user = await models.User.findOne({ correo: data.correo });
  if (!user) {
    user = new models.User({ id_usuario: await nextId("usuarios") });
  }
  Object.assign(user, { nombre: data.nombre, cedula: data.cedula, correo: data.correo, telefono: data.telefono, password_hash: passwordHash, rol, estado: "ACTIVO" });
  return user.save();
}

function ecuadorNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hora: `${get("hour")}:${get("minute")}:${get("second")}` };
}
