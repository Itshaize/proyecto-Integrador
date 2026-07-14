import { z } from "zod";
import { authenticate, authorize } from "./auth.js";
import { config } from "./config.js";
import { nextId } from "./db.js";

const coordinates = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
};
const locationSchema = z.object({ adultId: z.number().int().positive(), ...coordinates, accuracy: z.number().min(0).max(5000), fecha: z.iso.date().optional(), hora: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(), direccion: z.string().trim().max(240).optional().nullable() });
const safeZoneSchema = z.object({ adultId: z.number().int().positive(), nombre: z.string().trim().min(2).max(60), direccion: z.string().trim().min(4).max(200), ...coordinates, radio: z.number().int().min(50).max(2000), estado: z.enum(["ACTIVO", "INACTIVO"]).optional() });
const alertSchema = z.object({ adultId: z.number().int().positive(), tipo: z.enum(["SOS", "FUERA_DE_ZONA"]), ...coordinates, estado: z.enum(["NUEVA", "VISTA", "ATENDIDA", "CERRADA"]).default("NUEVA") });
const alertStatusSchema = z.object({ estado: z.enum(["NUEVA", "VISTA", "ATENDIDA", "CERRADA"]) });
const routeSchema = z.object({ origin: z.object({ lat: z.number(), lng: z.number() }), destination: z.object({ lat: z.number(), lng: z.number() }) });
const placeSchema = z.object({ ...coordinates, categoria: z.enum(["todos", "hospital", "farmacia", "centro_salud", "policia", "punto_ayuda"]).default("todos") });

function registerIntegratedRoutes(app, db) {
  app.post("/api/locations", authenticate, async (req, res) => {
    const data = locationSchema.parse(req.body);
    if (!await canAccessAdult(db, req.user, data.adultId)) return forbidden(res);
    const now = ecuadorNow();
    const zone = await getActiveSafeZone(db, data.adultId);
    const previous = await db.Location.findOne({ id_adulto: data.adultId }).sort({ id_ubicacion: -1 }).lean();
    const previousState = zone && previous ? zoneState(previous.latitude, previous.longitude, zone) : "SIN_ACTUALIZACION";
    const estadoZona = zone ? zoneState(data.latitude, data.longitude, zone) : "SIN_ACTUALIZACION";
    const location = await db.Location.create({
      id_ubicacion: await nextId("ubicaciones"), id_adulto: data.adultId,
      latitude: data.latitude, longitude: data.longitude, accuracy: data.accuracy,
      fecha: data.fecha ?? now.fecha, hora: data.hora ?? now.hora, direccion: data.direccion ?? null
    });
    let alerta = null;
    if (estadoZona === "FUERA_DE_ZONA" && previousState !== "FUERA_DE_ZONA") {
      alerta = await createAlert(db, data.adultId, "FUERA_DE_ZONA", data.latitude, data.longitude, "NUEVA");
    }
    res.status(201).json({ id_ubicacion: location.id_ubicacion, ...data, fecha: location.fecha, hora: location.hora, estadoZona, alerta });
  });

  app.get("/api/locations/:adultId/latest", authenticate, async (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!await canAccessAdult(db, req.user, adultId)) return forbidden(res);
    const row = await db.Location.findOne({ id_adulto: adultId }).sort({ id_ubicacion: -1 }).lean();
    if (!row) {
      res.status(404).json({ message: "Todavía no existe una ubicación para este adulto mayor." });
      return;
    }
    const zone = await getActiveSafeZone(db, adultId);
    res.json({ id_ubicacion: row.id_ubicacion, adultId: row.id_adulto, latitude: row.latitude, longitude: row.longitude, accuracy: row.accuracy, fecha: row.fecha, hora: row.hora, direccion: row.direccion, estadoZona: zone ? zoneState(row.latitude, row.longitude, zone) : "SIN_ACTUALIZACION" });
  });

  app.post("/api/safe-zones", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const data = safeZoneSchema.parse(req.body);
    if (!await canAccessAdult(db, req.user, data.adultId)) return forbidden(res);
    if (await getSafeZone(db, data.adultId)) {
      res.status(409).json({ message: "Este adulto ya tiene una zona segura. Puedes editarla desde el mapa." });
      return;
    }
    const zone = await db.SafeZone.create({ id_zona: await nextId("zonas_seguras"), id_adulto: data.adultId, nombre: data.nombre, direccion: data.direccion, latitude: data.latitude, longitude: data.longitude, radio: data.radio, estado: data.estado ?? "ACTIVO" });
    res.status(201).json(zoneResponse(zone.toObject()));
  });

  app.get("/api/safe-zones/:adultId", authenticate, async (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!await canAccessAdult(db, req.user, adultId)) return forbidden(res);
    const zone = await getSafeZone(db, adultId);
    if (!zone) {
      res.status(404).json({ message: "Este adulto todavía no tiene una zona segura." });
      return;
    }
    res.json(zoneResponse(zone));
  });

  app.put("/api/safe-zones/:id", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const current = await db.SafeZone.findOne({ id_zona: Number(req.params.id) }).lean();
    if (!current || !await canAccessAdult(db, req.user, current.id_adulto)) {
      res.status(404).json({ message: "Zona segura no encontrada." });
      return;
    }
    const data = safeZoneSchema.parse({ ...req.body, adultId: current.id_adulto });
    const zone = await db.SafeZone.findOneAndUpdate({ id_zona: current.id_zona }, { $set: { nombre: data.nombre, direccion: data.direccion, latitude: data.latitude, longitude: data.longitude, radio: data.radio, estado: data.estado ?? current.estado } }, { returnDocument: "after" }).lean();
    res.json(zoneResponse(zone));
  });

  app.delete("/api/safe-zones/:id", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const zone = await db.SafeZone.findOne({ id_zona: Number(req.params.id) }).lean();
    if (!zone || !await canAccessAdult(db, req.user, zone.id_adulto)) {
      res.status(404).json({ message: "Zona segura no encontrada." });
      return;
    }
    await db.SafeZone.deleteOne({ id_zona: zone.id_zona });
    res.json({ success: true });
  });

  app.post("/api/alerts", authenticate, async (req, res) => {
    const data = alertSchema.parse(req.body);
    if (!await canAccessAdult(db, req.user, data.adultId)) return forbidden(res);
    res.status(201).json({ message: "Alerta creada.", alerta: await createAlert(db, data.adultId, data.tipo, data.latitude, data.longitude, data.estado) });
  });

  app.get("/api/alerts/:adultId", authenticate, async (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!await canAccessAdult(db, req.user, adultId)) return forbidden(res);
    const alerts = await db.Alert.find({ id_adulto: adultId }).sort({ fecha: -1, hora: -1 }).lean();
    res.json(alerts.map(alertResponse));
  });

  app.put("/api/alerts/:id/status", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const estado = alertStatusSchema.parse(req.body).estado;
    const alert = await db.Alert.findOne({ id_alerta: Number(req.params.id) }).lean();
    if (!alert || !await canAccessAdult(db, req.user, alert.id_adulto)) {
      res.status(404).json({ message: "Alerta no encontrada." });
      return;
    }
    await db.Alert.updateOne({ id_alerta: alert.id_alerta }, { $set: { estado } });
    res.json({ id_alerta: alert.id_alerta, estado });
  });

  app.get("/api/contacts/:adultId", authenticate, async (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!await canAccessAdult(db, req.user, adultId)) return forbidden(res);
    const relation = await db.Relation.findOne({ id_adulto: adultId, estado: "ACTIVO" }).lean();
    const [adult, user] = relation ? await Promise.all([db.Adult.findOne({ id_adulto: adultId }).lean(), db.User.findOne({ id_usuario: relation.id_administrador }).lean()]) : [null, null];
    res.json(relation && adult && user ? [{ id_contacto: relation.id_administrador, id_adulto: adultId, nombre: user.nombre, telefono: adult.contacto_emergencia, relacion: "Familiar responsable" }] : []);
  });

  app.post("/api/routes", authenticate, authorize("ADMINISTRADOR"), async (req, res) => {
    const data = routeSchema.parse(req.body);
    if (!config.googleMapsApiKey) {
      res.status(503).json({ message: "Configura GOOGLE_MAPS_API_KEY para calcular rutas." });
      return;
    }
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": config.googleMapsApiKey, "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline" }, body: JSON.stringify({ origin: { location: { latLng: { latitude: data.origin.lat, longitude: data.origin.lng } } }, destination: { location: { latLng: { latitude: data.destination.lat, longitude: data.destination.lng } } }, travelMode: "DRIVE" }) });
    const body = await response.json();
    if (!response.ok || !body.routes?.[0]) {
      res.status(422).json({ message: "No pudimos calcular una ruta hasta el adulto mayor." });
      return;
    }
    const route = body.routes[0];
    const seconds = Number(String(route.duration).replace("s", ""));
    res.json({ distancia: `${(route.distanceMeters / 1000).toFixed(1)} km`, distanciaMetros: route.distanceMeters, duracion: `${Math.ceil(seconds / 60)} min`, duracionSegundos: seconds, polyline: route.polyline });
  });

  app.post("/api/nearby-places", authenticate, async (req, res) => {
    const data = placeSchema.parse(req.body);
    if (!config.googleMapsApiKey) {
      res.status(503).json({ message: "Configura GOOGLE_MAPS_API_KEY para buscar lugares cercanos." });
      return;
    }
    const types = { hospital: ["hospital"], farmacia: ["pharmacy"], centro_salud: ["medical_clinic", "doctor"], policia: ["police"], punto_ayuda: ["fire_station", "local_government_office"], todos: ["hospital", "pharmacy", "medical_clinic", "police", "fire_station"] };
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": config.googleMapsApiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types" }, body: JSON.stringify({ includedTypes: types[data.categoria], maxResultCount: 10, locationRestriction: { circle: { center: { latitude: data.latitude, longitude: data.longitude }, radius: 2000 } } }) });
    const body = await response.json();
    if (!response.ok) {
      res.status(422).json({ message: "No pudimos consultar lugares cercanos." });
      return;
    }
    const lugares = (body.places ?? []).map((place) => ({ id: place.id, nombre: place.displayName?.text ?? "Lugar de ayuda", direccion: place.formattedAddress ?? "Dirección no disponible", latitude: place.location.latitude, longitude: place.location.longitude, categoria: categoryOf(place.types ?? []), distancia: Math.round(haversine(data.latitude, data.longitude, place.location.latitude, place.location.longitude)) })).sort((a, b) => a.distancia - b.distancia);
    res.json(lugares);
  });
}

async function getSafeZone(db, adultId) {
  return db.SafeZone.findOne({ id_adulto: adultId }).lean();
}
async function getActiveSafeZone(db, adultId) {
  const zone = await getSafeZone(db, adultId);
  return zone?.estado === "ACTIVO" ? zone : undefined;
}
async function canAccessAdult(db, user, adultId) {
  if (!Number.isInteger(adultId) || adultId <= 0) return false;
  if (user.rol === "ADULTO_MAYOR") return user.adultId === adultId || Boolean(await db.Adult.exists({ id_usuario: user.id_usuario, id_adulto: adultId }));
  return Boolean(await db.Relation.exists({ id_administrador: user.id_usuario, id_adulto: adultId, estado: "ACTIVO" }));
}
function zoneState(lat, lng, zone) {
  return zone.estado === "INACTIVO" ? "UBICACION_DESACTIVADA" : haversine(lat, lng, zone.latitude, zone.longitude) <= zone.radio ? "DENTRO_DE_ZONA" : "FUERA_DE_ZONA";
}
function haversine(lat1, lon1, lat2, lon2) {
  const radius = 6371e3, toRad = (number) => number * Math.PI / 180, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}
async function createAlert(db, adultId, tipo, latitude, longitude, estado) {
  const now = ecuadorNow();
  const alert = await db.Alert.create({ id_alerta: await nextId("alertas"), id_adulto: adultId, tipo, ...now, latitude, longitude, estado });
  return alertResponse(alert.toObject());
}
function ecuadorNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value ?? "";
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hora: `${get("hour")}:${get("minute")}:${get("second")}` };
}
function categoryOf(types) {
  if (types.includes("hospital")) return "hospital";
  if (types.includes("pharmacy")) return "farmacia";
  if (types.includes("medical_clinic") || types.includes("doctor")) return "centro_salud";
  if (types.includes("police")) return "policia";
  return "punto_ayuda";
}
function zoneResponse(zone) {
  return { id_zona: zone.id_zona, id_adulto: zone.id_adulto, adultId: zone.id_adulto, nombre: zone.nombre, direccion: zone.direccion, latitude: zone.latitude, longitude: zone.longitude, radio: zone.radio, estado: zone.estado };
}
function alertResponse(alert) {
  return { id_alerta: alert.id_alerta, id_adulto: alert.id_adulto, tipo: alert.tipo, fecha: alert.fecha, hora: alert.hora, latitude: alert.latitude, longitude: alert.longitude, estado: alert.estado };
}
function forbidden(res) {
  res.status(403).json({ message: "No tienes acceso a los datos de este adulto mayor." });
}

export { registerIntegratedRoutes };
