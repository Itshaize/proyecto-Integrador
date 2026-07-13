// App state
let activeRole = 'adult'; // 'adult' or 'familiar'
let activeTab = 'view-inicio';
let mapType = 'leaflet'; // 'leaflet' or 'google'
let googleApiKey = null;

// Developer simulation state (mirrors backend state)
let simState = {
  session: {
    adultId: "adult-123",
    name: "Juan Salvador",
    id_administrador: "admin-456"
  },
  location: {
    adultId: "adult-123",
    latitude: -0.180653,
    longitude: -78.467834,
    zone_status: "DENTRO_DE_ZONA"
  }
};

// Emergency Contact state
let activeContact = {
  name: "María Pérez (Hija)",
  phone: "+593 99 123 4567",
  relationship: "Hija",
  email: "maria.perez@example.com"
};

// Map instances
let leafletMapInicio = null;
let leafletMapRoutes = null;
let googleMapInicio = null;
let googleMapRoutes = null;

// Map markers & layers
let leafletMarkersInicio = [];
let leafletMarkersRoutes = [];
let leafletRoutePolyline = null;
let googleMarkersInicio = [];
let googleMarkersRoutes = [];
let googleRoutePolyline = null;

// SOS flow timer
let sosCountdownInterval = null;
let countdownSeconds = 5;

// Geocoding Cache & Address Helper
const geocodeCache = {};
async function getAddressFromCoords(lat, lng) {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache[cacheKey]) return geocodeCache[cacheKey];

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (res.ok) {
      const data = await res.json();
      const address = data.display_name.split(',').slice(0, 3).join(',');
      geocodeCache[cacheKey] = address;
      return address;
    }
  } catch (err) {
    console.warn("OSM Geocoding failed, using coordinates string:", err);
  }
  return `Coordenadas: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// Initialize Application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();
  
  // 1. Fetch initial configuration and simulation state
  await fetchConfig();
  await fetchSimulationState();
  await fetchContact();
  
  // 2. Load Maps SDK
  if (googleApiKey) {
    loadGoogleMapsSDK();
  } else {
    initLeafletMaps();
  }

  // 3. Render state
  renderApp();
});

// Setup active role tab-visibility
function updateTabVisibility() {
  const navInicio = document.getElementById('navItemInicio');
  const navContactos = document.getElementById('navItemContactos');
  const navRutas = document.getElementById('navItemRutas');
  const navHistorial = document.getElementById('navItemHistorial');

  if (activeRole === 'adult') {
    navInicio.style.display = 'flex';
    navContactos.style.display = 'flex';
    navRutas.style.display = 'none';
    navHistorial.style.display = 'none';
    
    // Auto-switch to active view if navigating in prohibited area
    if (activeTab === 'view-rutas' || activeTab === 'view-historial') {
      switchTab('view-inicio');
    }
  } else {
    navInicio.style.display = 'none';
    navContactos.style.display = 'flex';
    navRutas.style.display = 'flex';
    navHistorial.style.display = 'flex';
    
    if (activeTab === 'view-inicio') {
      switchTab('view-rutas');
    }
  }
}

// Navigation logic
function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-item');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-target');
      switchTab(target);
    });
  });
  updateTabVisibility();
}

function switchTab(targetViewId) {
  activeTab = targetViewId;
  
  // Update nav item active classes
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    if (item.getAttribute('data-target') === targetViewId) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update views
  const views = document.querySelectorAll('.app-view');
  views.forEach(view => {
    if (view.id === targetViewId) {
      view.classList.add('active');
    } else {
      view.classList.remove('active');
    }
  });

  // Re-render/invalidate maps when switching tabs to fix rendering sizing bugs
  setTimeout(() => {
    if (targetViewId === 'view-inicio') {
      invalidateMap(leafletMapInicio, googleMapInicio);
      updateInicioMapMarker();
    } else if (targetViewId === 'view-rutas') {
      invalidateMap(leafletMapRoutes, googleMapRoutes);
      calculateAndDrawRoute();
      fetchNearbyPlaces();
    } else if (targetViewId === 'view-historial') {
      fetchAlertHistory();
    }
  }, 100);
}

function invalidateMap(leafletMap, googleMap) {
  if (mapType === 'leaflet' && leafletMap) {
    leafletMap.invalidateSize();
  } else if (mapType === 'google' && googleMap) {
    // google maps doesn't usually need invalidateSize unless container size changed,
    // but triggering a resize event helps.
    google.maps.event.trigger(googleMap, 'resize');
  }
}

// Setup events
function setupEventListeners() {
  // SOS button triggers confirmation
  document.getElementById('btnSosTrigger').addEventListener('click', openSosConfirmation);
  
  // SOS Cancel / Confirm
  document.getElementById('btnSosConfirmCancel').addEventListener('click', closeSosConfirmation);
  document.getElementById('btnSosConfirmSend').addEventListener('click', triggerSosAlert);
  document.getElementById('btnSosSuccessClose').addEventListener('click', closeSosSuccessScreen);

  // Quick Action Buttons
  document.getElementById('btnCallFamilyQuick').addEventListener('click', callEmergencyContact);
  document.getElementById('btnContactCall').addEventListener('click', callEmergencyContact);
  document.getElementById('btnContactMessage').addEventListener('click', sendMessageEmergencyContact);
  document.getElementById('btnShareLocationQuick').addEventListener('click', shareLocation);

  // Toggle Role (Adult vs Family/Admin)
  document.getElementById('btnToggleRole').addEventListener('click', toggleRole);

  // Save emergency contact form
  document.getElementById('contactForm').addEventListener('submit', handleSaveContact);

  // Simulation Update Handlers
  document.getElementById('btnUpdateSession').addEventListener('click', handleUpdateSessionSim);
  document.getElementById('btnUpdateLocation').addEventListener('click', handleUpdateLocationSim);
}

// Fetch config from backend
async function fetchConfig() {
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.hasGoogleMapsKey) {
        googleApiKey = data.googleApiKey;
      }
    }
  } catch (err) {
    console.error("Failed to load backend config:", err);
  }
}

// Fetch Simulation state from backend
async function fetchSimulationState() {
  try {
    const res = await fetch('/api/simulation/state');
    if (res.ok) {
      const data = await res.json();
      simState = data;
      
      // Update form values in simulator console
      document.getElementById('simAdultId').value = simState.session.adultId;
      document.getElementById('simAdultName').value = simState.session.name;
      document.getElementById('simAdminId').value = simState.session.id_administrador;
      
      document.getElementById('simLat').value = simState.location.latitude;
      document.getElementById('simLng').value = simState.location.longitude;
      document.getElementById('simZoneStatus').value = simState.location.zone_status;
    }
  } catch (err) {
    console.error("Failed to fetch simulation state:", err);
  }
}

// Fetch emergency contact
async function fetchContact() {
  try {
    const res = await fetch(`/api/contacts/${simState.session.adultId}`);
    if (res.ok) {
      const contacts = await res.json();
      if (contacts && contacts.length > 0) {
        activeContact = contacts[0];
      }
      renderContactInfo();
    }
  } catch (err) {
    console.error("Failed to fetch contact details:", err);
  }
}

// Save contact to backend
async function handleSaveContact(e) {
  e.preventDefault();
  const name = document.getElementById('contactName').value;
  const phone = document.getElementById('contactPhone').value;
  const relationship = document.getElementById('contactRelationship').value;
  const email = document.getElementById('contactEmail').value;

  try {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adultId: simState.session.adultId,
        name,
        phone,
        relationship,
        email
      })
    });
    if (res.ok) {
      alert("Contacto de emergencia actualizado correctamente.");
      await fetchContact();
    } else {
      alert("Error al guardar el contacto.");
    }
  } catch (err) {
    console.error("Error saving contact:", err);
    alert("Error al guardar el contacto.");
  }
}

// Dynamic Script Loader for Google Maps SDK
function loadGoogleMapsSDK() {
  document.getElementById('sdkStatusIndicator').innerText = "Cargando...";
  document.getElementById('sdkStatusIndicator').className = "status-unknown";

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&libraries=places`;
  script.async = true;
  script.defer = true;
  
  script.onload = () => {
    mapType = 'google';
    document.getElementById('sdkStatusIndicator').innerText = "Google Maps API";
    document.getElementById('sdkStatusIndicator').className = "status-online";
    initGoogleMaps();
  };

  script.onerror = () => {
    console.error("Google Maps SDK failed to load. Falling back to Leaflet (OpenStreetMap).");
    document.getElementById('sdkStatusIndicator').innerText = "Falla (Fallback Leaflet)";
    document.getElementById('sdkStatusIndicator').className = "status-unknown";
    mapType = 'leaflet';
    initLeafletMaps();
  };

  document.head.appendChild(script);
}

// ==========================================================================
// LEAFLET MAPS INITIALIZATION (Responsive open-source maps fallback)
// ==========================================================================
function initLeafletMaps() {
  console.log("Initializing Leaflet Maps...");
  mapType = 'leaflet';

  // Map 1: Inicio View Map
  const startLat = simState.location.latitude;
  const startLng = simState.location.longitude;
  
  leafletMapInicio = L.map('map-inicio', {
    zoomControl: false,
    attributionControl: false
  }).setView([startLat, startLng], 16);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20
  }).addTo(leafletMapInicio);

  // Map 2: Route Map
  leafletMapRoutes = L.map('map-routes', {
    zoomControl: true,
    attributionControl: false
  }).setView([startLat, startLng], 14);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 20
  }).addTo(leafletMapRoutes);

  // Update initial markers
  updateInicioMapMarker();
}

// ==========================================================================
// GOOGLE MAPS INITIALIZATION (Official Google SDK)
// ==========================================================================
function initGoogleMaps() {
  console.log("Initializing Google Maps...");
  const startLat = simState.location.latitude;
  const startLng = simState.location.longitude;

  // Custom dark mode theme for Google Maps
  const darkStyle = [
    { elementType: "geometry", stylers: [{ color: "#0b0f17" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#0b0f17" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#f1f5f9" }] },
    { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#00e5c9" }] },
    { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#111827" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#243249" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#243249" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b13" }] }
  ];

  // Map 1: Inicio Map
  googleMapInicio = new google.maps.Map(document.getElementById('map-inicio'), {
    center: { lat: startLat, lng: startLng },
    zoom: 16,
    disableDefaultUI: true,
    styles: darkStyle
  });

  // Map 2: Route Map
  googleMapRoutes = new google.maps.Map(document.getElementById('map-routes'), {
    center: { lat: startLat, lng: startLng },
    zoom: 14,
    styles: darkStyle
  });

  // Update initial markers
  updateInicioMapMarker();
}

// Update Active Location Map (Inicio)
async function updateInicioMapMarker() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  const isSafe = simState.location.zone_status === 'DENTRO_DE_ZONA';

  // Get address description
  const address = await getAddressFromCoords(lat, lng);
  document.getElementById('locAddressText').innerText = address;

  if (mapType === 'leaflet' && leafletMapInicio) {
    // Clear old markers
    leafletMarkersInicio.forEach(m => leafletMapInicio.removeLayer(m));
    leafletMarkersInicio = [];

    // Safe Zone Circle Mock if unsafe/safe
    const circleColor = isSafe ? '#10b981' : '#ef4444';
    const circle = L.circle([lat, lng], {
      color: circleColor,
      fillColor: circleColor,
      fillOpacity: 0.15,
      radius: 120 // mock visibility radius
    }).addTo(leafletMapInicio);
    leafletMarkersInicio.push(circle);

    // Marker
    const marker = L.circleMarker([lat, lng], {
      color: circleColor,
      fillColor: '#fff',
      fillOpacity: 1,
      radius: 8,
      weight: 3
    }).addTo(leafletMapInicio);
    leafletMarkersInicio.push(marker);

    leafletMapInicio.setView([lat, lng], 16);
  } else if (mapType === 'google' && googleMapInicio) {
    // Clear old markers
    googleMarkersInicio.forEach(m => m.setMap(null));
    googleMarkersInicio = [];

    // Safe Zone Circle
    const circleColor = isSafe ? '#10b981' : '#ef4444';
    const circle = new google.maps.Circle({
      strokeColor: circleColor,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: circleColor,
      fillOpacity: 0.15,
      map: googleMapInicio,
      center: { lat, lng },
      radius: 120
    });
    googleMarkersInicio.push(circle);

    // Marker
    const marker = new google.maps.Marker({
      position: { lat, lng },
      map: googleMapInicio,
      title: "Mi Ubicación",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#ffffff',
        fillOpacity: 1,
        strokeColor: circleColor,
        strokeWeight: 4,
        scale: 8
      }
    });
    googleMarkersInicio.push(marker);

    googleMapInicio.setCenter({ lat, lng });
  }
}

// Render values into DOM
function renderApp() {
  // Welcome and active profiles
  document.getElementById('activeProfileName').innerText = simState.session.name;
  
  // Safe zone display status
  const badge = document.getElementById('zoneBadge');
  const badgeText = document.getElementById('zoneBadgeText');
  const appHeader = document.getElementById('appHeader');

  if (simState.location.zone_status === 'DENTRO_DE_ZONA') {
    badge.className = 'zone-badge safe';
    badgeText.innerText = 'En Zona Segura';
    appHeader.classList.remove('danger-state');
  } else {
    badge.className = 'zone-badge danger';
    badgeText.innerText = '⚠️ FUERA DE ZONA';
    appHeader.classList.add('danger-state');
  }

  renderContactInfo();
}

function renderContactInfo() {
  document.getElementById('contactNameText').innerText = activeContact.name || "No configurado";
  document.getElementById('contactRelText').innerText = activeContact.relationship || "Familiar de Emergencia";
  document.getElementById('contactPhoneText').innerText = activeContact.phone || "Sin teléfono";
  document.getElementById('contactEmailText').innerText = activeContact.email || "Sin correo electrónico";
  
  // Populate form with existing contact details
  document.getElementById('contactName').value = activeContact.name || "";
  document.getElementById('contactPhone').value = activeContact.phone || "";
  document.getElementById('contactRelationship').value = activeContact.relationship || "";
  document.getElementById('contactEmail').value = activeContact.email || "";

  // Success screen fields
  document.getElementById('successContactName').innerText = activeContact.name || "Familiar de Emergencia";
  document.getElementById('successContactPhone').innerText = activeContact.phone || "";
}

// ==========================================================================
// ROUTE CALCULATION AND MAP PLOTTING (Juan's core responsibility)
// ==========================================================================
async function calculateAndDrawRoute(destinationCoords = null) {
  // Origin: Familiar position, Destination: Adult position (or vice-versa, here rescue route from Familiar coordinates to Adult coordinates)
  // Let's use simulator parameters
  const famLat = parseFloat(document.getElementById('simFamLat').value);
  const famLng = parseFloat(document.getElementById('simFamLng').value);
  
  // Adult coordinates
  let destLat = simState.location.latitude;
  let destLng = simState.location.longitude;

  // If a nearby place is explicitly clicked, route to it from the adult's location instead!
  let routeLabel = "Ruta de Rescate";
  if (destinationCoords) {
    destLat = destinationCoords.lat;
    destLng = destinationCoords.lng;
    routeLabel = `Ruta hacia ${destinationCoords.name}`;
  }

  try {
    const res = await fetch('/api/routes/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { lat: famLat, lng: famLng },
        destination: { lat: destLat, lng: destLng }
      })
    });

    if (!res.ok) throw new Error("API call failed");
    const routeData = await res.json();

    document.getElementById('routeDistanceText').innerText = routeData.distance;
    document.getElementById('routeDurationText').innerText = routeData.duration;

    // Draw on Map
    if (mapType === 'leaflet' && leafletMapRoutes) {
      // Clear previous layers
      leafletMarkersRoutes.forEach(m => leafletMapRoutes.removeLayer(m));
      leafletMarkersRoutes = [];
      if (leafletRoutePolyline) {
        leafletMapRoutes.removeLayer(leafletRoutePolyline);
        leafletRoutePolyline = null;
      }

      // Add Start Marker (Familiar / Emergency start)
      const familiarIcon = L.divIcon({
        html: '<div style="background-color:#3b82f6; width:16px; height:16px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5);"></div>',
        className: 'custom-leaflet-marker-familiar',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      const mFam = L.marker([famLat, famLng], { icon: familiarIcon }).addTo(leafletMapRoutes)
        .bindPopup(destinationCoords ? "Mi Ubicación" : "Tu Ubicación (Familiar)").openPopup();
      leafletMarkersRoutes.push(mFam);

      // Add Destination Marker (Adult Mayor or Selected Hospital/Pharmacy)
      const colorDest = destinationCoords ? '#ef4444' : '#00e5c9';
      const adultIcon = L.divIcon({
        html: `<div style="background-color:${colorDest}; width:20px; height:20px; border-radius:50%; border:3px solid #fff; box-shadow:0 0 10px rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center; color:#fff; font-size:10px;"><i class="fa-solid ${destinationCoords ? 'fa-hospital' : 'fa-person'}"></i></div>`,
        className: 'custom-leaflet-marker-adult',
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      const mDest = L.marker([destLat, destLng], { icon: adultIcon }).addTo(leafletMapRoutes)
        .bindPopup(destinationCoords ? destinationCoords.name : `Adulto: ${simState.session.name}`);
      leafletMarkersRoutes.push(mDest);

      // Draw path line
      let coords = [];
      if (routeData.isMock) {
        coords = routeData.coordinates;
      } else {
        // Decode google encoded polyline if present, otherwise fallback to simple line
        if (routeData.polyline && routeData.polyline.encodedPolyline) {
          coords = decodeGooglePolyline(routeData.polyline.encodedPolyline);
        } else {
          coords = [[famLat, famLng], [destLat, destLng]];
        }
      }

      leafletRoutePolyline = L.polyline(coords, {
        color: '#00e5c9',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round'
      }).addTo(leafletMapRoutes);

      // Fit bounds
      const bounds = L.latLngBounds(coords);
      leafletMapRoutes.fitBounds(bounds, { padding: [40, 40] });

    } else if (mapType === 'google' && googleMapRoutes) {
      // Clear previous markers
      googleMarkersRoutes.forEach(m => m.setMap(null));
      googleMarkersRoutes = [];
      if (googleRoutePolyline) {
        googleRoutePolyline.setMap(null);
        googleRoutePolyline = null;
      }

      // Add Start Marker (Familiar)
      const mFam = new google.maps.Marker({
        position: { lat: famLat, lng: famLng },
        map: googleMapRoutes,
        title: destinationCoords ? "Mi Ubicación" : "Tu Ubicación (Familiar)",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#3b82f6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 8
        }
      });
      googleMarkersRoutes.push(mFam);

      // Add Destination Marker
      const colorDest = destinationCoords ? '#ef4444' : '#00e5c9';
      const mDest = new google.maps.Marker({
        position: { lat: destLat, lng: destLng },
        map: googleMapRoutes,
        title: destinationCoords ? destinationCoords.name : `Adulto: ${simState.session.name}`,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: colorDest,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
          scale: 10
        }
      });
      googleMarkersRoutes.push(mDest);

      // Draw Path
      let pathCoords = [];
      if (routeData.isMock) {
        pathCoords = routeData.coordinates.map(c => ({ lat: c[0], lng: c[1] }));
      } else {
        // Decode google encoded polyline
        pathCoords = google.maps.geometry.encoding.decodePath(routeData.polyline.encodedPolyline);
      }

      googleRoutePolyline = new google.maps.Polyline({
        path: pathCoords,
        geodesic: true,
        strokeColor: '#00e5c9',
        strokeOpacity: 0.8,
        strokeWeight: 6,
        map: googleMapRoutes
      });

      // Fit bounds
      const bounds = new google.maps.LatLngBounds();
      pathCoords.forEach(c => bounds.extend(c));
      googleMapRoutes.fitBounds(bounds, 40);
    }

  } catch (err) {
    console.error("Error drawing route on map:", err);
  }
}

// Simple Polyline decoder helper for Leaflet fallback
function decodeGooglePolyline(encoded) {
  let len = encoded.length;
  let index = 0;
  let array = [];
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    let dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    array.push([lat * 1e-5, lng * 1e-5]);
  }
  return array;
}

// ==========================================================================
// NEARBY PLACES (Juan's responsibility, hospital/pharmacy finder)
// ==========================================================================
let nearbyPlacesData = [];
async function fetchNearbyPlaces() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;

  try {
    const res = await fetch(`/api/places/nearby?latitude=${lat}&longitude=${lng}`);
    if (res.ok) {
      nearbyPlacesData = await res.json();
      renderPlacesList('all');
    }
  } catch (err) {
    console.error("Failed to query nearby places:", err);
  }
}

function renderPlacesList(categoryFilter = 'all') {
  const container = document.getElementById('placesList');
  container.innerHTML = '';

  const filtered = categoryFilter === 'all'
    ? nearbyPlacesData
    : nearbyPlacesData.filter(p => p.category === categoryFilter);

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No se encontraron servicios de emergencia en un radio de 2000m.</div>';
    return;
  }

  filtered.forEach(place => {
    const item = document.createElement('div');
    item.className = 'place-item';
    
    // Choose icon base on category
    let iconClass = 'fa-hospital';
    let labelCat = 'Hospital';
    if (place.category === 'pharmacy') {
      iconClass = 'fa-pills';
      labelCat = 'Farmacia';
    } else if (place.category === 'help_center') {
      iconClass = 'fa-handshake-angle';
      labelCat = 'Apoyo';
    }

    item.innerHTML = `
      <div class="place-badge-icon ${place.category}">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="place-main">
        <div class="place-name">${place.name}</div>
        <div class="place-address">${place.address}</div>
      </div>
      <div class="place-right">
        <div class="place-distance">${(place.distance / 1000).toFixed(2)} km</div>
        <div class="place-action-hint">Ver Ruta</div>
      </div>
    `;

    // Click on place calculates route to it
    item.addEventListener('click', () => {
      calculateAndDrawRoute({
        lat: place.latitude,
        lng: place.longitude,
        name: place.name
      });
      // Scroll back up to the route dashboard smoothly
      document.querySelector('.route-dashboard').scrollIntoView({ behavior: 'smooth' });
    });

    container.appendChild(item);
  });
}

// Places category buttons
document.querySelectorAll('.place-tab-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.place-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const cat = btn.getAttribute('data-category');
    renderPlacesList(cat);
  });
});

// ==========================================================================
// ALERT HISTORY LOG (Juan's responsibility, history tracking)
// ==========================================================================
async function fetchAlertHistory() {
  try {
    const res = await fetch(`/api/alerts/${simState.session.adultId}`);
    if (res.ok) {
      const alerts = await res.json();
      renderAlertHistory(alerts);
    }
  } catch (err) {
    console.error("Failed to load alerts history:", err);
  }
}

function renderAlertHistory(alerts) {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (!alerts || alerts.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay alertas registradas para este adulto mayor.</div>';
    return;
  }

  alerts.forEach(alert => {
    const item = document.createElement('div');
    const isSos = alert.type === 'SOS';
    item.className = `history-item ${isSos ? 'sos' : 'zone'}`;

    const dateStr = new Date(alert.date_time).toLocaleString('es-EC', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const isResolved = alert.status === 'resolved';

    item.innerHTML = `
      <div class="history-item-header">
        <span class="history-type">
          <i class="fa-solid ${isSos ? 'fa-phone-flip' : 'fa-circle-exclamation'}"></i>
          Alerta: ${isSos ? 'S.O.S. (Pánico)' : 'Fuera de Zona Segura'}
        </span>
        <span class="history-date">${dateStr}</span>
      </div>
      <div class="history-coordinates">
        <i class="fa-solid fa-location-crosshairs"></i>
        Ubicación: ${alert.latitude.toFixed(5)}, ${alert.longitude.toFixed(5)}
      </div>
      <div class="history-actions">
        <span class="history-status-badge ${alert.status}">
          ${isResolved ? 'Resuelta' : 'ACTIVA'}
        </span>
        ${!isResolved ? `<button class="btn-resolve-alert" data-id="${alert.id}">Marcar Resuelta</button>` : ''}
      </div>
    `;

    // Click Resolve Action
    if (!isResolved) {
      item.querySelector('.btn-resolve-alert').addEventListener('click', async (e) => {
        e.stopPropagation();
        const alertId = alert.id;
        try {
          const res = await fetch(`/api/alerts/${alertId}/resolve`, { method: 'PUT' });
          if (res.ok) {
            fetchAlertHistory();
          } else {
            alert("Error al resolver la alerta.");
          }
        } catch (err) {
          console.error("Failed to resolve alert:", err);
        }
      });
    }

    container.appendChild(item);
  });
}

// ==========================================================================
// SOS ALERT COUNTDOWN AND CONFIRMATION SYSTEM
// ==========================================================================
function openSosConfirmation() {
  const overlay = document.getElementById('sosConfirmOverlay');
  overlay.classList.add('active');
  
  // Set up countdown of 5 seconds
  countdownSeconds = 5;
  document.getElementById('countdownNumber').innerText = countdownSeconds;
  document.getElementById('cancelSec').innerText = `${countdownSeconds}s`;
  
  // Reset svg circle transition
  const bar = document.getElementById('countdownBar');
  bar.style.transition = 'none';
  bar.style.strokeDashoffset = '0';
  
  // Start transition animate
  setTimeout(() => {
    bar.style.transition = 'stroke-dashoffset 5s linear';
    bar.style.strokeDashoffset = '283'; // complete circle empty
  }, 50);

  clearInterval(sosCountdownInterval);
  sosCountdownInterval = setInterval(() => {
    countdownSeconds--;
    document.getElementById('countdownNumber').innerText = countdownSeconds;
    document.getElementById('cancelSec').innerText = `${countdownSeconds}s`;

    if (countdownSeconds <= 0) {
      clearInterval(sosCountdownInterval);
      triggerSosAlert();
    }
  }, 1000);
}

function closeSosConfirmation() {
  clearInterval(sosCountdownInterval);
  document.getElementById('sosConfirmOverlay').classList.remove('active');
}

// Perform POST alert to backend
async function triggerSosAlert() {
  clearInterval(sosCountdownInterval);
  document.getElementById('sosConfirmOverlay').classList.remove('active');

  const lat = simState.location.latitude;
  const lng = simState.location.longitude;

  try {
    const res = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adultId: simState.session.adultId,
        type: 'SOS',
        latitude: lat,
        longitude: lng
      })
    });

    if (res.ok) {
      openSosSuccessScreen();
    } else {
      alert("No se pudo enviar la alerta SOS. Revisa tu conexión.");
    }
  } catch (err) {
    console.error("SOS Alert failed to register:", err);
    alert("Error al registrar alerta SOS.");
  }
}

function openSosSuccessScreen() {
  document.getElementById('sosSuccessOverlay').classList.add('active');
}

function closeSosSuccessScreen() {
  document.getElementById('sosSuccessOverlay').classList.remove('active');
  switchTab('view-inicio');
}

// Phone Action Handlers
function callEmergencyContact() {
  if (activeContact && activeContact.phone) {
    alert(`[Simulación de Llamada] Llamando a ${activeContact.name} al ${activeContact.phone}...`);
    window.location.href = `tel:${activeContact.phone}`;
  } else {
    alert("No hay un contacto configurado con número de teléfono.");
  }
}

function sendMessageEmergencyContact() {
  if (activeContact && activeContact.phone) {
    alert(`[Simulación de Mensaje] Enviando SMS a ${activeContact.name}: "AYUDA, tengo una emergencia..."`);
    window.location.href = `sms:${activeContact.phone}?body=AYUDA,%20tengo%20una%20emergencia.`;
  } else {
    alert("No hay un contacto configurado para recibir mensajes.");
  }
}

function shareLocation() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  
  if (navigator.share) {
    navigator.share({
      title: `Ubicación de ${simState.session.name}`,
      text: `Monitorea mi ubicación actual.`,
      url: url,
    }).catch(err => console.log(err));
  } else {
    // Copy to clipboard fallback
    navigator.clipboard.writeText(url).then(() => {
      alert("Enlace de ubicación copiado al portapapeles:\n" + url);
    }).catch(err => {
      alert("Ubicación: " + url);
    });
  }
}

// Toggle active view mode for demonstration
function toggleRole() {
  if (activeRole === 'adult') {
    activeRole = 'familiar';
    document.getElementById('activeRoleText').innerText = "Familiar / Admin";
    document.getElementById('btnToggleRole').innerText = "Cambiar a Adulto";
  } else {
    activeRole = 'adult';
    document.getElementById('activeRoleText').innerText = "Adulto Mayor";
    document.getElementById('btnToggleRole').innerText = "Cambiar a Familiar";
  }
  updateTabVisibility();
}

// ==========================================================================
// DEVELOPER SIMULATION EVENT HANDLERS (Integrating Ismael & Mauricio)
// ==========================================================================
async function handleUpdateSessionSim() {
  const adultId = document.getElementById('simAdultId').value;
  const name = document.getElementById('simAdultName').value;
  const id_administrador = document.getElementById('simAdminId').value;

  try {
    const res = await fetch('/api/simulation/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adultId, name, id_administrador })
    });

    if (res.ok) {
      const data = await res.json();
      simState.session = data.session;
      alert("Datos del Adulto (Autenticación de Ismael) actualizados en sesión.");
      
      // Reload contact and alerts details for the new adult
      await fetchContact();
      renderApp();
      
      if (activeTab === 'view-historial') fetchAlertHistory();
    }
  } catch (err) {
    console.error("Simulation session update failed:", err);
  }
}

async function handleUpdateLocationSim() {
  const latitude = parseFloat(document.getElementById('simLat').value);
  const longitude = parseFloat(document.getElementById('simLng').value);
  const zone_status = document.getElementById('simZoneStatus').value;

  try {
    const res = await fetch('/api/simulation/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adultId: simState.session.adultId,
        latitude,
        longitude,
        zone_status
      })
    });

    if (res.ok) {
      const data = await res.json();
      simState.location = data.location;
      
      // If an alert was auto-created because they left the safe zone
      if (data.alertCreated) {
        alert(`🚨 ¡ALERTA AUTOMÁTICA REGISTRADA! El adulto mayor ha salido de la zona segura. Mauricio detectó geofencing FUERA_DE_ZONA.`);
      }

      alert("Ubicación y estado de zona (Módulo de Mauricio) actualizados.");
      
      renderApp();
      updateInicioMapMarker();

      // Refresh active map elements
      if (activeTab === 'view-rutas') {
        calculateAndDrawRoute();
        fetchNearbyPlaces();
      } else if (activeTab === 'view-historial') {
        fetchAlertHistory();
      }
    }
  } catch (err) {
    console.error("Simulation location update failed:", err);
  }
}
