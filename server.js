require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const db      = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================
// ESTADO DE SIMULACIÓN (en memoria, mientras los módulos de
// Ismael y Mauricio no estén listos — usar datos simulados)
// ============================================================

// Simula lo que entrega Ismael (Autenticación)
let simulatedSession = {
  adultId:          1,
  nombre:           "Juan Salvador",
  id_administrador: 10
};

// Simula lo que entrega Mauricio (Ubicación + Geofencing)
// Respeta el contrato: adultId, latitude, longitude, estadoZona
let simulatedLocation = {
  adultId:    1,
  latitude:   -0.180653,
  longitude:  -78.467834,
  estadoZona: "DENTRO_DE_ZONA"   // FUERA_DE_ZONA | DENTRO_DE_ZONA
};

// Ubicación simulada del familiar (para calcular ruta de rescate)
let familiarLocation = {
  latitude:  -0.188553,
  longitude: -78.480834
};

// ============================================================
// CONFIGURACIÓN
// ============================================================

app.get('/api/config', (req, res) => {
  const key    = process.env.GOOGLE_API_KEY;
  const hasKey = key && !key.includes('tu_api_key_aqui') && key.trim() !== '';
  res.json({
    hasGoogleMapsKey: !!hasKey,
    googleApiKey:     hasKey ? key : null
  });
});

// ============================================================
// SIMULACIÓN — endpoints para el panel de desarrollador
// ============================================================

// GET estado actual de la simulación
app.get('/api/simulation/state', (req, res) => {
  res.json({ session: simulatedSession, location: simulatedLocation, familiar: familiarLocation });
});

// POST actualiza sesión (simula módulo de Ismael)
// Contrato: { adultId, nombre, id_administrador }
app.post('/api/simulation/session', (req, res) => {
  const { adultId, nombre, id_administrador } = req.body;
  if (!adultId || !nombre) {
    return res.status(400).json({ error: "Faltan adultId o nombre" });
  }
  simulatedSession = {
    adultId:          parseInt(adultId),
    nombre,
    id_administrador: parseInt(id_administrador) || 10
  };
  res.json({ message: "Sesión actualizada", session: simulatedSession });
});

// POST actualiza ubicación (simula módulo de Mauricio)
// Contrato: { adultId, latitude, longitude, estadoZona }
app.post('/api/simulation/location', async (req, res) => {
  const { adultId, latitude, longitude, estadoZona } = req.body;
  if (!adultId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Faltan adultId, latitude o longitude" });
  }

  const estadoAnterior = simulatedLocation.estadoZona;
  simulatedLocation = {
    adultId:    parseInt(adultId),
    latitude:   parseFloat(latitude),
    longitude:  parseFloat(longitude),
    estadoZona: estadoZona || "DENTRO_DE_ZONA"
  };

  let alertaCreada = null;

  // Si cambia a FUERA_DE_ZONA, el sistema registra automáticamente la alerta
  if (simulatedLocation.estadoZona === "FUERA_DE_ZONA" && estadoAnterior !== "FUERA_DE_ZONA") {
    try {
      alertaCreada = await db.createAlert(
        adultId, "FUERA_DE_ZONA",
        simulatedLocation.latitude,
        simulatedLocation.longitude,
        "NUEVA"
      );
      console.log(`[Simulación] Alerta FUERA_DE_ZONA creada automáticamente para adultId=${adultId}`);
    } catch (err) {
      console.error("Error creando alerta automática:", err);
    }
  }

  res.json({ message: "Ubicación actualizada", location: simulatedLocation, alertaCreada });
});

// POST actualiza ubicación del familiar (para cálculo de rutas)
app.post('/api/simulation/familiar', (req, res) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Faltan latitude o longitude" });
  }
  familiarLocation = { latitude: parseFloat(latitude), longitude: parseFloat(longitude) };
  res.json({ message: "Ubicación del familiar actualizada", familiar: familiarLocation });
});

// ============================================================
// ALERTAS
// Contrato de campos: id_alerta, id_adulto, tipo, fecha, hora,
//                     latitude, longitude, estado
// Estados válidos: NUEVA | VISTA | ATENDIDA | CERRADA
// ============================================================

// POST /api/alerts — crear alerta
// Body: { adultId, tipo, latitude, longitude, estado? }
app.post('/api/alerts', async (req, res) => {
  const { adultId, tipo, latitude, longitude, estado } = req.body;
  if (!adultId || !tipo || latitude === undefined || longitude === undefined) {
    return res.status(400).json({
      error: "Faltan campos requeridos: adultId, tipo, latitude, longitude"
    });
  }
  const tiposValidos = ['SOS', 'FUERA_DE_ZONA'];
  if (!tiposValidos.includes(tipo)) {
    return res.status(400).json({ error: `Tipo inválido. Valores válidos: ${tiposValidos.join(', ')}` });
  }
  try {
    const alerta = await db.createAlert(adultId, tipo, latitude, longitude, estado || 'NUEVA');
    res.status(201).json({ message: "Alerta creada", alerta });
  } catch (err) {
    res.status(500).json({ error: "Error al crear alerta", detalle: err.message });
  }
});

// GET /api/alerts/:adultId — historial de alertas
app.get('/api/alerts/:adultId', async (req, res) => {
  try {
    const alertas = await db.getAlertsByAdult(req.params.adultId);
    res.json(alertas);
  } catch (err) {
    res.status(500).json({ error: "Error al consultar alertas", detalle: err.message });
  }
});

// PUT /api/alerts/:id/status — actualizar estado
// Body: { estado: "VISTA" | "ATENDIDA" | "CERRADA" }
app.put('/api/alerts/:id/status', async (req, res) => {
  const { estado } = req.body;
  if (!estado) {
    return res.status(400).json({ error: "Falta el campo 'estado'" });
  }
  try {
    const actualizado = await db.updateAlertStatus(req.params.id, estado);
    if (actualizado) {
      res.json({ message: `Estado de alerta actualizado a '${estado}'` });
    } else {
      res.status(404).json({ error: "Alerta no encontrada" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// CONTACTOS DE EMERGENCIA
// Contrato: id_contacto, id_adulto, nombre, telefono, relacion
// ============================================================

// GET /api/contacts/:adultId
app.get('/api/contacts/:adultId', async (req, res) => {
  try {
    const contactos = await db.getContactsByAdult(req.params.adultId);
    res.json(contactos);
  } catch (err) {
    res.status(500).json({ error: "Error al consultar contactos", detalle: err.message });
  }
});

// POST /api/contacts — crear/actualizar contacto
// Body: { adultId, nombre, telefono, relacion }
app.post('/api/contacts', async (req, res) => {
  const { adultId, nombre, telefono, relacion } = req.body;
  if (!adultId || !nombre || !telefono) {
    return res.status(400).json({ error: "Faltan campos: adultId, nombre, telefono" });
  }
  try {
    await db.upsertContact(adultId, nombre, telefono, relacion || "");
    res.json({ message: "Contacto de emergencia guardado correctamente" });
  } catch (err) {
    res.status(500).json({ error: "Error al guardar contacto", detalle: err.message });
  }
});

// ============================================================
// UTILIDADES
// ============================================================

// Distancia Haversine en metros
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a  = Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ============================================================
// RUTAS — POST /api/routes
// Llama a Google Routes API v2 y retorna distancia, duración y
// polyline para dibujar en Maps SDK
// ============================================================
app.post('/api/routes', async (req, res) => {
  const { origin, destination } = req.body;
  if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng) {
    return res.status(400).json({
      error: "Faltan origin {lat,lng} o destination {lat,lng}"
    });
  }

  const key = process.env.GOOGLE_API_KEY;
  const hasKey = key && !key.includes('tu_api_key_aqui') && key.trim() !== '';

  if (!hasKey) {
    // Mock — usa Haversine y devuelve polyline simple para Leaflet
    const distM = Math.round(haversine(origin.lat, origin.lng, destination.lat, destination.lng));
    const durSeg = Math.round(distM / 8.33); // ~30 km/h
    return res.json({
      isMock: true,
      distancia: `${(distM / 1000).toFixed(2)} km`,
      distanciaMetros: distM,
      duracion: `${Math.round(durSeg / 60)} min`,
      duracionSegundos: durSeg,
      polyline: { encodedPolyline: "" },
      coordenadas: [
        [origin.lat, origin.lng],
        [(origin.lat + destination.lat) / 2 + 0.001, (origin.lng + destination.lng) / 2 - 0.001],
        [destination.lat, destination.lng]
      ]
    });
  }

  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin:      { location: { latLng: { latitude: parseFloat(origin.lat), longitude: parseFloat(origin.lng) } } },
        destination: { location: { latLng: { latitude: parseFloat(destination.lat), longitude: parseFloat(destination.lng) } } },
        travelMode: "DRIVE"
      })
    });

    if (!response.ok) throw new Error(`Google Routes API: ${response.status} ${await response.text()}`);
    const data = await response.json();
    if (!data.routes?.length) throw new Error("No se encontraron rutas");

    const ruta = data.routes[0];
    const distM  = ruta.distanceMeters;
    const durSeg = parseInt(ruta.duration.replace('s', ''));

    res.json({
      isMock: false,
      distancia: `${(distM / 1000).toFixed(2)} km`,
      distanciaMetros: distM,
      duracion: `${Math.round(durSeg / 60)} min`,
      duracionSegundos: durSeg,
      polyline: { encodedPolyline: ruta.polyline.encodedPolyline }
    });
  } catch (err) {
    console.error("[Routes API] Fallback a mock:", err.message);
    const distM = Math.round(haversine(origin.lat, origin.lng, destination.lat, destination.lng));
    const durSeg = Math.round(distM / 8.33);
    res.json({
      isMock: true,
      distancia: `${(distM / 1000).toFixed(2)} km`,
      distanciaMetros: distM,
      duracion: `${Math.round(durSeg / 60)} min`,
      duracionSegundos: durSeg,
      polyline: { encodedPolyline: "" },
      coordenadas: [
        [origin.lat, origin.lng],
        [(origin.lat + destination.lat)/2 + 0.001, (origin.lng + destination.lng)/2 - 0.001],
        [destination.lat, destination.lng]
      ]
    });
  }
});

// ============================================================
// LUGARES CERCANOS — POST /api/nearby-places
// Busca hospitales, farmacias, centros de salud, policía y
// puntos de ayuda en radio de 2000m (Google Places API)
// ============================================================

// Categorías soportadas con sus tipos de Google Places API
const CATEGORY_TYPES = {
  hospital:      ["hospital"],
  farmacia:      ["pharmacy"],
  centro_salud:  ["medical_clinic", "doctor", "dentist"],
  policia:       ["police"],
  punto_ayuda:   ["fire_station", "local_government_office"]
};

app.post('/api/nearby-places', async (req, res) => {
  const { latitude, longitude, categoria } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Faltan latitude y longitude en el body" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const key = process.env.GOOGLE_API_KEY;
  const hasKey = key && !key.includes('tu_api_key_aqui') && key.trim() !== '';

  if (!hasKey) {
    return res.json(getMockPlaces(lat, lng, categoria));
  }

  // Tipos a consultar según categoría seleccionada
  const tipos = categoria && CATEGORY_TYPES[categoria]
    ? CATEGORY_TYPES[categoria]
    : [
        "hospital", "pharmacy", "medical_clinic",
        "police", "fire_station", "doctor"
      ];

  try {
    const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
      },
      body: JSON.stringify({
        includedTypes: tipos,
        maxResultCount: 15,
        locationRestriction: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: 2000.0
          }
        }
      })
    });

    if (!response.ok) throw new Error(`Google Places API: ${response.status} ${await response.text()}`);
    const data = await response.json();

    if (!data.places?.length) return res.json(getMockPlaces(lat, lng, categoria));

    const lugares = data.places.map(p => {
      let cat = 'punto_ayuda';
      const t = p.types || [];
      if (t.includes('hospital'))       cat = 'hospital';
      else if (t.includes('pharmacy'))  cat = 'farmacia';
      else if (t.includes('medical_clinic') || t.includes('doctor')) cat = 'centro_salud';
      else if (t.includes('police'))    cat = 'policia';

      return {
        id:        p.id,
        nombre:    p.displayName.text,
        direccion: p.formattedAddress || "Dirección no disponible",
        latitude:  p.location.latitude,
        longitude: p.location.longitude,
        categoria: cat,
        distancia: Math.round(haversine(lat, lng, p.location.latitude, p.location.longitude))
      };
    })
    .filter(l => l.distancia <= 2000)
    .sort((a, b) => a.distancia - b.distancia);

    res.json(lugares);
  } catch (err) {
    console.error("[Places API] Fallback a mock:", err.message);
    res.json(getMockPlaces(lat, lng, categoria));
  }
});

// Lugares simulados para todas las categorías del plan
function getMockPlaces(lat, lng, categoriaFiltro) {
  const templates = [
    { nombre: "Hospital Eugenio Espejo (Simulado)",        direccion: "Av. Gran Colombia s/n, Quito",          categoria: "hospital",     latOff: 0.005,  lngOff: -0.004 },
    { nombre: "Hospital Pablo Arturo Suárez (Simulado)",   direccion: "Av. 10 de Agosto N26-89, Quito",        categoria: "hospital",     latOff: -0.004, lngOff: 0.006  },
    { nombre: "Farmacia Fybeca La Carolina (Simulado)",    direccion: "Av. Amazonas y Eloy Alfaro, Quito",     categoria: "farmacia",     latOff: 0.001,  lngOff: 0.002  },
    { nombre: "Farmacia SanaSana Norte (Simulado)",        direccion: "Av. República e Hipólito Aguirre",      categoria: "farmacia",     latOff: -0.002, lngOff: -0.001 },
    { nombre: "Centro de Salud La Vicentina (Simulado)",   direccion: "Pasaje Los Pinos N3-14, Quito",         categoria: "centro_salud", latOff: 0.006,  lngOff: 0.003  },
    { nombre: "Subcentro de Salud El Inca (Simulado)",     direccion: "Av. El Inca y Rodrigo de Chávez, Quito", categoria: "centro_salud", latOff: -0.003, lngOff: -0.005 },
    { nombre: "UPC La Carolina (Policía) (Simulado)",      direccion: "Av. Amazonas y Naciones Unidas, Quito", categoria: "policia",      latOff: 0.003,  lngOff: -0.002 },
    { nombre: "UPC Iñaquito (Policía) (Simulado)",         direccion: "Av. Iñaquito y Mariana de Jesús, Quito", categoria: "policia",     latOff: -0.005, lngOff: 0.004  },
    { nombre: "Punto de Apoyo Cruz Roja Norte (Simulado)", direccion: "Av. Gran Colombia y Tarqui, Quito",     categoria: "punto_ayuda",  latOff: 0.007,  lngOff: 0.001  },
    { nombre: "Bomberos Quito Norte (Simulado)",           direccion: "Av. de la Prensa N52-120, Quito",       categoria: "punto_ayuda",  latOff: -0.006, lngOff: -0.003 }
  ];

  return templates
    .map((t, i) => {
      const pLat = lat + t.latOff;
      const pLng = lng + t.lngOff;
      return {
        id:        `mock-${i + 1}`,
        nombre:    t.nombre,
        direccion: t.direccion,
        latitude:  pLat,
        longitude: pLng,
        categoria: t.categoria,
        distancia: Math.round(haversine(lat, lng, pLat, pLng))
      };
    })
    .filter(l => {
      if (l.distancia > 2000) return false;
      if (categoriaFiltro && categoriaFiltro !== 'todos') return l.categoria === categoriaFiltro;
      return true;
    })
    .sort((a, b) => a.distancia - b.distancia);
}

// Iniciar servidor
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`   Rama: feature/sos-routes-juan`);
  });
}).catch(err => {
  console.error("Error crítico al iniciar:", err);
});
