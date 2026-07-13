const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// In-memory data store
const db = {
  locations: [], // Array of location objects
  safeZones: []  // Array of safe zone objects
};

let safeZoneIdCounter = 1;

// Helper to calculate distance (Haversine formula)
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ─── ENDPOINTS DE UBICACIÓN ──────────────────────────────────────────

// POST /api/locations - Guardar ubicación
app.post('/api/locations', (req, res) => {
  const { adultId, latitude, longitude, accuracy, fecha, hora } = req.body;
  if (!adultId || latitude == null || longitude == null) {
    return res.status(400).json({ error: 'Faltan campos obligatorios' });
  }

  const newLocation = { adultId, latitude, longitude, accuracy, fecha, hora, timestamp: Date.now() };
  db.locations.push(newLocation);
  
  res.status(201).json(newLocation);
});

// GET /api/locations/:adultId/latest - Consultar última ubicación
app.get('/api/locations/:adultId/latest', (req, res) => {
  const adultId = parseInt(req.params.adultId, 10);
  
  // Buscar la última ubicación del adulto
  const userLocations = db.locations.filter(loc => loc.adultId === adultId);
  if (userLocations.length === 0) {
    return res.status(404).json({ error: 'Ubicación no encontrada' });
  }
  
  // Tomar la más reciente
  const latestLocation = userLocations[userLocations.length - 1];
  
  // Verificar estado de zona
  const userZone = db.safeZones.find(z => z.adultId === adultId);
  let estadoZona = 'SIN_ACTUALIZACION';
  
  if (userZone) {
    const dist = haversineDistance(latestLocation.latitude, latestLocation.longitude, userZone.latitude, userZone.longitude);
    estadoZona = dist <= userZone.radio ? 'DENTRO_DE_ZONA' : 'FUERA_DE_ZONA';
  } else {
    // Para simplificar, si no hay zona, diremos que está dentro
    estadoZona = 'DENTRO_DE_ZONA';
  }
  
  res.json({
    adultId: latestLocation.adultId,
    latitude: latestLocation.latitude,
    longitude: latestLocation.longitude,
    accuracy: latestLocation.accuracy,
    estadoZona: estadoZona
  });
});

// ─── ENDPOINTS DE ZONAS SEGURAS ──────────────────────────────────────

// POST /api/safe-zones - Crear zona segura
app.post('/api/safe-zones', (req, res) => {
  const { adultId, nombre, latitude, longitude, radio, direccion } = req.body;
  
  // Eliminar zona anterior si existe para este adulto (máximo 1 zona según UI actual, o reemplazarla)
  db.safeZones = db.safeZones.filter(z => z.adultId !== adultId);
  
  const newZone = {
    id_zona: safeZoneIdCounter++,
    adultId,
    nombre,
    direccion,
    latitude,
    longitude,
    radio: radio || 300,
    estado: true
  };
  
  db.safeZones.push(newZone);
  res.status(201).json(newZone);
});

// GET /api/safe-zones/:adultId - Consultar zona
app.get('/api/safe-zones/:adultId', (req, res) => {
  const adultId = parseInt(req.params.adultId, 10);
  const userZone = db.safeZones.find(z => z.adultId === adultId);
  
  if (!userZone) {
    return res.status(404).json({ error: 'Zona segura no encontrada' });
  }
  
  res.json(userZone);
});

// PUT /api/safe-zones/:id - Editar zona
app.put('/api/safe-zones/:id', (req, res) => {
  const id_zona = parseInt(req.params.id, 10);
  const index = db.safeZones.findIndex(z => z.id_zona === id_zona);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Zona no encontrada' });
  }
  
  db.safeZones[index] = { ...db.safeZones[index], ...req.body, id_zona };
  res.json(db.safeZones[index]);
});

// DELETE /api/safe-zones/:id - Eliminar zona
app.delete('/api/safe-zones/:id', (req, res) => {
  const id_zona = parseInt(req.params.id, 10);
  const initialLength = db.safeZones.length;
  db.safeZones = db.safeZones.filter(z => z.id_zona !== id_zona);
  
  if (db.safeZones.length === initialLength) {
    return res.status(404).json({ error: 'Zona no encontrada' });
  }
  
  res.json({ success: true });
});

// ─── SOS ENDPOINT ───────────────────────────────────────────────────
app.post('/api/sos', (req, res) => {
  // Solo logueamos por ahora en el backend
  console.log('🚨 ALERTA SOS RECIBIDA:', req.body);
  res.json({ success: true, message: 'Alerta procesada' });
});

// ─── START SERVER ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
