require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Developer Simulation State (In-Memory default, synced with db where applicable)
let simulatedSession = {
  adultId: "adult-123",
  name: "Juan Salvador",
  id_administrador: "admin-456"
};

let simulatedLocation = {
  adultId: "adult-123",
  latitude: -0.180653,
  longitude: -78.467834,
  zone_status: "DENTRO_DE_ZONA"
};

// Emergency contact fallback memory state if sqlite3 is not writeable, 
// but db.js handles upserts perfectly.

// --- REST API ENDPOINTS ---

// GET config status (checks if Google Maps API key is present)
app.get('/api/config', (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  const hasKey = apiKey && !apiKey.includes('tu_api_key_aqui') && apiKey.trim() !== '';
  res.json({ 
    hasGoogleMapsKey: !!hasKey,
    googleApiKey: hasKey ? apiKey : null
  });
});

// GET current simulation state (Developer use)
app.get('/api/simulation/state', (req, res) => {
  res.json({
    session: simulatedSession,
    location: simulatedLocation
  });
});

// POST update simulation session (Simulates Ismael's Auth)
app.post('/api/simulation/session', (req, res) => {
  const { adultId, name, id_administrador } = req.body;
  if (!adultId || !name) {
    return res.status(400).json({ error: "Missing adultId or name" });
  }
  simulatedSession = { adultId, name, id_administrador: id_administrador || "admin-456" };
  res.json({ message: "Session updated successfully", session: simulatedSession });
});

// POST update simulation location (Simulates Mauricio's GPS tracking)
app.post('/api/simulation/location', async (req, res) => {
  const { adultId, latitude, longitude, zone_status } = req.body;
  if (!adultId || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing adultId, latitude, or longitude" });
  }

  const previousStatus = simulatedLocation.zone_status;
  simulatedLocation = {
    adultId,
    latitude: parseFloat(latitude),
    longitude: parseFloat(longitude),
    zone_status: zone_status || "DENTRO_DE_ZONA"
  };

  let autoCreatedAlert = null;
  // If the status changes to FUERA_DE_ZONA, trigger an automatic Out-of-Zone alert!
  if (simulatedLocation.zone_status === "FUERA_DE_ZONA" && previousStatus !== "FUERA_DE_ZONA") {
    try {
      autoCreatedAlert = await db.createAlert(
        adultId,
        "FUERA_DE_ZONA",
        simulatedLocation.latitude,
        simulatedLocation.longitude,
        "active"
      );
      console.log(`[Simulation] Automatic FUERA_DE_ZONA alert created for ${adultId}`);
    } catch (err) {
      console.error("Failed to automatically create out-of-zone alert:", err);
    }
  }

  res.json({
    message: "Location and zone status updated successfully",
    location: simulatedLocation,
    alertCreated: autoCreatedAlert
  });
});

// GET alert history for a specific adult (Juan's module)
app.get('/api/alerts/:adultId', async (req, res) => {
  try {
    const alerts = await db.getAlertsByAdult(req.params.adultId);
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve alerts", details: err.message });
  }
});

// POST create a new alert (Juan's module / triggered by SOS button)
app.post('/api/alerts', async (req, res) => {
  const { adultId, type, latitude, longitude } = req.body;
  if (!adultId || !type || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing required fields (adultId, type, latitude, longitude)" });
  }

  try {
    const alert = await db.createAlert(adultId, type, latitude, longitude, 'active');
    res.status(201).json({ message: "Alert created successfully", alert });
  } catch (err) {
    res.status(500).json({ error: "Failed to create alert", details: err.message });
  }
});

// PUT resolve an alert (Juan's module)
app.put('/api/alerts/:alertId/resolve', async (req, res) => {
  try {
    const resolved = await db.resolveAlert(req.params.alertId);
    if (resolved) {
      res.json({ message: "Alert resolved successfully" });
    } else {
      res.status(404).json({ error: "Alert not found or already resolved" });
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve alert", details: err.message });
  }
});

// GET emergency contacts for an adult (Juan's module)
app.get('/api/contacts/:adultId', async (req, res) => {
  try {
    const contacts = await db.getContactsByAdult(req.params.adultId);
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: "Failed to retrieve contacts", details: err.message });
  }
});

// POST add/update emergency contact (Juan's module)
app.post('/api/contacts', async (req, res) => {
  const { adultId, name, phone, relationship, email } = req.body;
  if (!adultId || !name || !phone) {
    return res.status(400).json({ error: "Missing required fields (adultId, name, phone)" });
  }

  try {
    await db.upsertContact(adultId, name, phone, relationship || "", email || "");
    res.json({ message: "Emergency contact saved successfully" });
  } catch (err) {
    res.status(500).json({ error: "Failed to save emergency contact", details: err.message });
  }
});

// Helper for Haversine Distance (in meters)
function getHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // in meters
}

// POST calculate route (Juan's module, calls Google Routes API)
app.post('/api/routes/calculate', async (req, res) => {
  const { origin, destination } = req.body; // {lat, lng}
  if (!origin || !destination || origin.lat === undefined || origin.lng === undefined || destination.lat === undefined || destination.lng === undefined) {
    return res.status(400).json({ error: "Missing origin or destination coordinates" });
  }

  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.includes('tu_api_key_aqui') || apiKey.trim() === '') {
    // Return a mocked route if there is no API key
    console.log("[Routes API] Using mock route calculation (No API Key).");
    const distanceMeters = Math.round(getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng));
    // Assume average speed 30km/h (8.33 m/s)
    const durationSeconds = Math.round(distanceMeters / 8.33);

    // Create a mock polyline (for Leaflet fallback we just return list of coords, but we also send a simulated path)
    const mockCoordinates = [
      [origin.lat, origin.lng],
      [(origin.lat + destination.lat) / 2 + 0.001, (origin.lng + destination.lng) / 2 - 0.001], // add a slight bend
      [destination.lat, destination.lng]
    ];

    return res.json({
      isMock: true,
      distance: `${(distanceMeters / 1000).toFixed(2)} km`,
      distanceMeters,
      duration: `${Math.round(durationSeconds / 60)} min`,
      durationSeconds,
      polyline: {
        encodedPolyline: "" // Google Maps encoded polyline
      },
      coordinates: mockCoordinates // Simple coordinate list for Leaflet
    });
  }

  try {
    const url = "https://routes.googleapis.com/directions/v2:computeRoutes";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline"
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: parseFloat(origin.lat),
              longitude: parseFloat(origin.lng)
            }
          }
        },
        destination: {
          location: {
            latLng: {
              latitude: parseFloat(destination.lat),
              longitude: parseFloat(destination.lng)
            }
          }
        },
        travelMode: "DRIVE"
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routes found from Google API");
    }

    const route = data.routes[0];
    const distanceMeters = route.distanceMeters;
    // duration comes like "450s" or "3200s", parse it
    const durationSeconds = parseInt(route.duration.replace('s', ''));

    res.json({
      isMock: false,
      distance: `${(distanceMeters / 1000).toFixed(2)} km`,
      distanceMeters,
      duration: `${Math.round(durationSeconds / 60)} min`,
      durationSeconds,
      polyline: {
        encodedPolyline: route.polyline.encodedPolyline
      }
    });
  } catch (err) {
    console.error("[Routes API Error] Falling back to mock route:", err.message);
    const distanceMeters = Math.round(getHaversineDistance(origin.lat, origin.lng, destination.lat, destination.lng));
    const durationSeconds = Math.round(distanceMeters / 8.33);
    const mockCoordinates = [
      [origin.lat, origin.lng],
      [(origin.lat + destination.lat) / 2 + 0.001, (origin.lng + destination.lng) / 2 - 0.001],
      [destination.lat, destination.lng]
    ];

    res.json({
      isMock: true,
      distance: `${(distanceMeters / 1000).toFixed(2)} km`,
      distanceMeters,
      duration: `${Math.round(durationSeconds / 60)} min`,
      durationSeconds,
      polyline: {
        encodedPolyline: ""
      },
      coordinates: mockCoordinates
    });
  }
});

// GET search nearby places (Juan's module, calls Google Places API)
app.get('/api/places/nearby', async (req, res) => {
  const { latitude, longitude } = req.query;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: "Missing latitude or longitude in query parameters" });
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!apiKey || apiKey.includes('tu_api_key_aqui') || apiKey.trim() === '') {
    return res.json(getMockPlaces(lat, lng));
  }

  try {
    // New Google Places API - Search Nearby (v1)
    const url = "https://places.googleapis.com/v1/places:searchNearby";
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types"
      },
      body: JSON.stringify({
        includedTypes: ["hospital", "pharmacy"],
        maxResultCount: 15,
        locationRestriction: {
          circle: {
            center: {
              latitude: lat,
              longitude: lng
            },
            radius: 2000.0
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (!data.places || data.places.length === 0) {
      return res.json(getMockPlaces(lat, lng));
    }

    // Format Places response to be consumed by Frontend
    const places = data.places.map(place => {
      let category = 'hospital';
      if (place.types.includes('pharmacy')) {
        category = 'pharmacy';
      } else if (place.types.includes('hospital') || place.types.includes('medical_clinic') || place.types.includes('doctor')) {
        category = 'hospital';
      } else {
        category = 'help_center';
      }

      return {
        id: place.id,
        name: place.displayName.text,
        address: place.formattedAddress || "Dirección no disponible",
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        category,
        distance: getHaversineDistance(lat, lng, place.location.latitude, place.location.longitude)
      };
    }).sort((a, b) => a.distance - b.distance);

    res.json(places);
  } catch (err) {
    console.error("[Places API Error] Falling back to mock places:", err.message);
    res.json(getMockPlaces(lat, lng));
  }
});

// Helper function to return simulated places near the adult's coordinates
function getMockPlaces(lat, lng) {
  console.log(`[Places API] Generating mock emergency places in a 2000m radius from (${lat}, ${lng})`);
  const mockTemplates = [
    {
      name: "Hospital Metropolitano del Norte (Simulado)",
      address: "Av. Occidental N45-12 y San Gabriel, Quito",
      category: "hospital",
      latOffset: 0.004,
      lngOffset: -0.005
    },
    {
      name: "Clínica de la Mujer y el Adulto Mayor (Simulado)",
      address: "Calle de las Rosas E8-32, Quito",
      category: "hospital",
      latOffset: -0.003,
      lngOffset: 0.006
    },
    {
      name: "Farmacia Fybeca Cerca (Simulado)",
      address: "Av. Amazonas y Eloy Alfaro, Quito",
      category: "pharmacy",
      latOffset: 0.001,
      lngOffset: 0.002
    },
    {
      name: "Farmacia SanaSana La Carolina (Simulado)",
      address: "Av. República e Hipólito Aguirre, Quito",
      category: "pharmacy",
      latOffset: -0.002,
      lngOffset: -0.001
    },
    {
      name: "Centro de Apoyo y Cuidado del Adulto Mayor GAD (Simulado)",
      address: "Pasaje Los Tulipanes N3-14, Quito",
      category: "help_center",
      latOffset: 0.007,
      lngOffset: 0.003
    },
    {
      name: "Punto de Auxilio Cruz Roja (Simulado)",
      address: "Av. Gran Colombia y Tarqui, Quito",
      category: "help_center",
      latOffset: -0.006,
      lngOffset: -0.004
    }
  ];

  return mockTemplates.map((item, index) => {
    const itemLat = lat + item.latOffset;
    const itemLng = lng + item.lngOffset;
    const distance = getHaversineDistance(lat, lng, itemLat, itemLng);

    return {
      id: `mock-place-${index + 1}`,
      name: item.name,
      address: item.address,
      latitude: itemLat,
      longitude: itemLng,
      category: item.category,
      distance
    };
  }).filter(item => item.distance <= 2000) // Ensure strict 2000m radius filter
    .sort((a, b) => a.distance - b.distance);
}

// Start Server and Init Database
db.init().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error("Critical error starting database/server:", err);
});
