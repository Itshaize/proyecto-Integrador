import { z } from "zod";
import { authenticate, authorize } from "./auth.js";
import { config } from "./config.js";
const coordinates = {
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
};
const locationSchema = z.object({
  adultId: z.number().int().positive(),
  ...coordinates,
  accuracy: z.number().min(0).max(5e3),
  fecha: z.iso.date().optional(),
  hora: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional(),
  direccion: z.string().trim().max(240).optional().nullable()
});
const safeZoneSchema = z.object({ adultId: z.number().int().positive(), nombre: z.string().trim().min(2).max(60), direccion: z.string().trim().min(4).max(200), ...coordinates, radio: z.number().int().min(50).max(2e3), estado: z.enum(["ACTIVO", "INACTIVO"]).optional() });
const alertSchema = z.object({ adultId: z.number().int().positive(), tipo: z.enum(["SOS", "FUERA_DE_ZONA"]), ...coordinates, estado: z.enum(["NUEVA", "VISTA", "ATENDIDA", "CERRADA"]).default("NUEVA") });
const alertStatusSchema = z.object({ estado: z.enum(["NUEVA", "VISTA", "ATENDIDA", "CERRADA"]) });
const routeSchema = z.object({ origin: z.object({ lat: z.number(), lng: z.number() }), destination: z.object({ lat: z.number(), lng: z.number() }) });
const placeSchema = z.object({ ...coordinates, categoria: z.enum(["todos", "hospital", "farmacia", "centro_salud", "policia", "punto_ayuda"]).default("todos") });
function registerIntegratedRoutes(app, db) {
  app.post("/api/locations", authenticate, (req, res) => {
    const data = locationSchema.parse(req.body);
    if (!canAccessAdult(db, req.user, data.adultId)) {
      forbidden(res);
      return;
    }
    const now = ecuadorNow();
    const zone = getActiveSafeZone(db, data.adultId);
    const previous = db.prepare("SELECT latitude,longitude FROM ubicaciones WHERE id_adulto=? ORDER BY id_ubicacion DESC LIMIT 1").get(data.adultId);
    const previousState = zone && previous ? zoneState(previous.latitude, previous.longitude, zone) : "SIN_ACTUALIZACION";
    const estadoZona = zone ? zoneState(data.latitude, data.longitude, zone) : "SIN_ACTUALIZACION";
    const result = db.prepare("INSERT INTO ubicaciones (id_adulto,latitude,longitude,accuracy,fecha,hora,direccion) VALUES (?,?,?,?,?,?,?)").run(data.adultId, data.latitude, data.longitude, data.accuracy, data.fecha ?? now.fecha, data.hora ?? now.hora, data.direccion ?? null);
    let alerta = null;
    if (estadoZona === "FUERA_DE_ZONA" && previousState !== "FUERA_DE_ZONA") alerta = createAlert(db, data.adultId, "FUERA_DE_ZONA", data.latitude, data.longitude, "NUEVA");
    res.status(201).json({ id_ubicacion: Number(result.lastInsertRowid), ...data, fecha: data.fecha ?? now.fecha, hora: data.hora ?? now.hora, estadoZona, alerta });
  });
  app.get("/api/locations/:adultId/latest", authenticate, (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!canAccessAdult(db, req.user, adultId)) {
      forbidden(res);
      return;
    }
    const row = db.prepare("SELECT id_ubicacion,id_adulto AS adultId,latitude,longitude,accuracy,fecha,hora,direccion FROM ubicaciones WHERE id_adulto=? ORDER BY id_ubicacion DESC LIMIT 1").get(adultId);
    if (!row) {
      res.status(404).json({ message: "Todav\xEDa no existe una ubicaci\xF3n para este adulto mayor." });
      return;
    }
    const zone = getActiveSafeZone(db, adultId);
    res.json({ ...row, estadoZona: zone ? zoneState(Number(row.latitude), Number(row.longitude), zone) : "SIN_ACTUALIZACION" });
  });
  app.post("/api/safe-zones", authenticate, authorize("ADMINISTRADOR"), (req, res) => {
    const data = safeZoneSchema.parse(req.body);
    if (!canAccessAdult(db, req.user, data.adultId)) {
      forbidden(res);
      return;
    }
    const existing = getSafeZone(db, data.adultId);
    if (existing) {
      res.status(409).json({ message: "Este adulto ya tiene una zona segura. Puedes editarla desde el mapa." });
      return;
    }
    const result = db.prepare("INSERT INTO zonas_seguras (id_adulto,nombre,direccion,latitude,longitude,radio,estado) VALUES (?,?,?,?,?,?,?)").run(data.adultId, data.nombre, data.direccion, data.latitude, data.longitude, data.radio, data.estado ?? "ACTIVO");
    res.status(201).json({ id_zona: Number(result.lastInsertRowid), id_adulto: data.adultId, ...data, estado: data.estado ?? "ACTIVO" });
  });
  app.get("/api/safe-zones/:adultId", authenticate, (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!canAccessAdult(db, req.user, adultId)) {
      forbidden(res);
      return;
    }
    const zone = getSafeZone(db, adultId);
    if (!zone) {
      res.status(404).json({ message: "Este adulto todav\xEDa no tiene una zona segura." });
      return;
    }
    res.json(zone);
  });
  app.put("/api/safe-zones/:id", authenticate, authorize("ADMINISTRADOR"), (req, res) => {
    const id = Number(req.params.id);
    const current = db.prepare("SELECT * FROM zonas_seguras WHERE id_zona=?").get(id);
    if (!current || !canAccessAdult(db, req.user, current.id_adulto)) {
      res.status(404).json({ message: "Zona segura no encontrada." });
      return;
    }
    const data = safeZoneSchema.parse({ ...req.body, adultId: current.id_adulto });
    db.prepare("UPDATE zonas_seguras SET nombre=?,direccion=?,latitude=?,longitude=?,radio=?,estado=? WHERE id_zona=?").run(data.nombre, data.direccion, data.latitude, data.longitude, data.radio, data.estado ?? current.estado, id);
    res.json(getSafeZone(db, current.id_adulto));
  });
  app.delete("/api/safe-zones/:id", authenticate, authorize("ADMINISTRADOR"), (req, res) => {
    const zone = db.prepare("SELECT * FROM zonas_seguras WHERE id_zona=?").get(Number(req.params.id));
    if (!zone || !canAccessAdult(db, req.user, zone.id_adulto)) {
      res.status(404).json({ message: "Zona segura no encontrada." });
      return;
    }
    db.prepare("DELETE FROM zonas_seguras WHERE id_zona=?").run(zone.id_zona);
    res.json({ success: true });
  });
  app.post("/api/alerts", authenticate, (req, res) => {
    const data = alertSchema.parse(req.body);
    if (!canAccessAdult(db, req.user, data.adultId)) {
      forbidden(res);
      return;
    }
    res.status(201).json({ message: "Alerta creada.", alerta: createAlert(db, data.adultId, data.tipo, data.latitude, data.longitude, data.estado) });
  });
  app.get("/api/alerts/:adultId", authenticate, (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!canAccessAdult(db, req.user, adultId)) {
      forbidden(res);
      return;
    }
    res.json(db.prepare("SELECT id_alerta,id_adulto,tipo,fecha,hora,latitude,longitude,estado FROM alertas WHERE id_adulto=? ORDER BY fecha DESC,hora DESC").all(adultId));
  });
  app.put("/api/alerts/:id/status", authenticate, authorize("ADMINISTRADOR"), (req, res) => {
    const estado = alertStatusSchema.parse(req.body).estado;
    const alert = db.prepare("SELECT * FROM alertas WHERE id_alerta=?").get(Number(req.params.id));
    if (!alert || !canAccessAdult(db, req.user, alert.id_adulto)) {
      res.status(404).json({ message: "Alerta no encontrada." });
      return;
    }
    db.prepare("UPDATE alertas SET estado=? WHERE id_alerta=?").run(estado, Number(req.params.id));
    res.json({ id_alerta: Number(req.params.id), estado });
  });
  app.get("/api/contacts/:adultId", authenticate, (req, res) => {
    const adultId = Number(req.params.adultId);
    if (!canAccessAdult(db, req.user, adultId)) {
      forbidden(res);
      return;
    }
    const contact = db.prepare(`SELECT r.id_administrador AS id_contacto,a.id_adulto,u.nombre,a.contacto_emergencia AS telefono,'Familiar responsable' AS relacion FROM relaciones r JOIN adultos_mayores a ON a.id_adulto=r.id_adulto JOIN usuarios u ON u.id_usuario=r.id_administrador WHERE a.id_adulto=? AND r.estado='ACTIVO'`).get(adultId);
    res.json(contact ? [contact] : []);
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
    res.json({ distancia: `${(route.distanceMeters / 1e3).toFixed(1)} km`, distanciaMetros: route.distanceMeters, duracion: `${Math.ceil(seconds / 60)} min`, duracionSegundos: seconds, polyline: route.polyline });
  });
  app.post("/api/nearby-places", authenticate, async (req, res) => {
    const data = placeSchema.parse(req.body);
    if (!config.googleMapsApiKey) {
      res.status(503).json({ message: "Configura GOOGLE_MAPS_API_KEY para buscar lugares cercanos." });
      return;
    }
    const types = { hospital: ["hospital"], farmacia: ["pharmacy"], centro_salud: ["medical_clinic", "doctor"], policia: ["police"], punto_ayuda: ["fire_station", "local_government_office"], todos: ["hospital", "pharmacy", "medical_clinic", "police", "fire_station"] };
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", { method: "POST", headers: { "Content-Type": "application/json", "X-Goog-Api-Key": config.googleMapsApiKey, "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types" }, body: JSON.stringify({ includedTypes: types[data.categoria], maxResultCount: 10, locationRestriction: { circle: { center: { latitude: data.latitude, longitude: data.longitude }, radius: 2e3 } } }) });
    const body = await response.json();
    if (!response.ok) {
      res.status(422).json({ message: "No pudimos consultar lugares cercanos." });
      return;
    }
    const lugares = (body.places ?? []).map((p) => ({ id: p.id, nombre: p.displayName?.text ?? "Lugar de ayuda", direccion: p.formattedAddress ?? "Direcci\xF3n no disponible", latitude: p.location.latitude, longitude: p.location.longitude, categoria: categoryOf(p.types ?? []), distancia: Math.round(haversine(data.latitude, data.longitude, p.location.latitude, p.location.longitude)) })).sort((a, b) => a.distancia - b.distancia);
    res.json(lugares);
  });
}
function getSafeZone(db, adultId) {
  return db.prepare("SELECT id_zona,id_adulto,id_adulto AS adultId,nombre,direccion,latitude,longitude,radio,estado FROM zonas_seguras WHERE id_adulto=?").get(adultId);
}
function getActiveSafeZone(db, adultId) {
  const zone = getSafeZone(db, adultId);
  return zone?.estado === "ACTIVO" ? zone : void 0;
}
function canAccessAdult(db, user, adultId) {
  if (!Number.isInteger(adultId) || adultId <= 0) return false;
  if (user.rol === "ADULTO_MAYOR") return user.adultId === adultId || Boolean(db.prepare("SELECT 1 FROM adultos_mayores WHERE id_usuario=? AND id_adulto=?").get(user.id_usuario, adultId));
  return Boolean(db.prepare("SELECT 1 FROM relaciones WHERE id_administrador=? AND id_adulto=? AND estado='ACTIVO'").get(user.id_usuario, adultId));
}
function zoneState(lat, lng, zone) {
  return zone.estado === "INACTIVO" ? "UBICACION_DESACTIVADA" : haversine(lat, lng, zone.latitude, zone.longitude) <= zone.radio ? "DENTRO_DE_ZONA" : "FUERA_DE_ZONA";
}
function haversine(lat1, lon1, lat2, lon2) {
  const r = 6371e3, toRad = (n) => n * Math.PI / 180, dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return r * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function createAlert(db, adultId, tipo, latitude, longitude, estado) {
  const now = ecuadorNow(), result = db.prepare("INSERT INTO alertas (id_adulto,tipo,fecha,hora,latitude,longitude,estado) VALUES (?,?,?,?,?,?,?)").run(adultId, tipo, now.fecha, now.hora, latitude, longitude, estado);
  return { id_alerta: Number(result.lastInsertRowid), id_adulto: adultId, tipo, ...now, latitude, longitude, estado };
}
function ecuadorNow() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).formatToParts(/* @__PURE__ */ new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return { fecha: `${get("year")}-${get("month")}-${get("day")}`, hora: `${get("hour")}:${get("minute")}:${get("second")}` };
}
function categoryOf(types) {
  if (types.includes("hospital")) return "hospital";
  if (types.includes("pharmacy")) return "farmacia";
  if (types.includes("medical_clinic") || types.includes("doctor")) return "centro_salud";
  if (types.includes("police")) return "policia";
  return "punto_ayuda";
}
function forbidden(res) {
  res.status(403).json({ message: "No tienes acceso a los datos de este adulto mayor." });
}
export {
  registerIntegratedRoutes
};
