// ============================================================
// ESTADO GLOBAL DE LA APLICACIÓN
// ============================================================
let simState = {
  session:  { adultId: 1, nombre: "Juan Salvador", id_administrador: 10 },
  location: { adultId: 1, latitude: -0.180653, longitude: -78.467834, estadoZona: "DENTRO_DE_ZONA" },
  familiar: { latitude: -0.188553, longitude: -78.480834 }
};

// Contrato: id_contacto, id_adulto, nombre, telefono, relacion
let activeContact = {
  id_contacto: 1,
  id_adulto:   1,
  nombre:      "María Pérez",
  telefono:    "+593 99 123 4567",
  relacion:    "Hija"
};

let activeTab  = 'view-inicio';
let mapType    = 'leaflet';   // 'leaflet' | 'google'
let googleKey  = null;

// Instancias de mapas
let mapInicio  = null;
let mapRoutes  = null;

// Capas y marcadores
let layersInicio  = [];
let layersRoutes  = [];
let routePolyline = null;

// Contador SOS
let countdownInterval = null;
let cdSeconds = 5;

// Lugares cargados
let placesData = [];

// ============================================================
// INICIO
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {
  updateClock();
  setInterval(updateClock, 60000);

  setupNavigation();
  setupEvents();

  await fetchConfig();
  await fetchSimState();
  await fetchContact();

  if (googleKey) {
    loadGoogleMaps();
  } else {
    initLeaflet();
  }

  renderApp();
});

// Reloj de la barra de estado
function updateClock() {
  const now = new Date();
  const hh  = String(now.getHours()).padStart(2,'0');
  const mm  = String(now.getMinutes()).padStart(2,'0');
  const el  = document.getElementById('sbTime');
  if (el) el.textContent = `${hh}:${mm}`;
}

// ============================================================
// NAVEGACIÓN
// ============================================================
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.getAttribute('data-view')));
  });
}

function switchTab(viewId) {
  activeTab = viewId;

  document.querySelectorAll('.nav-btn').forEach(b =>
    b.classList.toggle('active', b.getAttribute('data-view') === viewId)
  );

  document.querySelectorAll('.app-view').forEach(v =>
    v.classList.toggle('active', v.id === viewId)
  );

  // Acciones específicas al cambiar de pestaña
  setTimeout(() => {
    if (viewId === 'view-inicio') {
      invalidateMap(mapInicio);
      updateInicioMarker();
    } else if (viewId === 'view-rutas') {
      invalidateMap(mapRoutes);
      calcularRuta();
    } else if (viewId === 'view-lugares') {
      buscarLugares('todos');
    } else if (viewId === 'view-historial') {
      cargarHistorial();
    }
  }, 80);
}

function invalidateMap(m) {
  if (mapType === 'leaflet' && m) m.invalidateSize();
  else if (mapType === 'google' && m) google.maps.event.trigger(m, 'resize');
}

// ============================================================
// EVENTOS DE LA UI
// ============================================================
function setupEvents() {
  // SOS
  document.getElementById('btnSosTrigger').addEventListener('click', abrirConfirmSOS);
  document.getElementById('btnSosEnviar').addEventListener('click', enviarSOS);
  document.getElementById('btnSosCancelar').addEventListener('click', cerrarConfirmSOS);
  document.getElementById('btnSosSuccessClose').addEventListener('click', cerrarExitoSOS);
  document.getElementById('btnSosLlamar').addEventListener('click', llamarFamiliar);
  document.getElementById('btnSosCompartir').addEventListener('click', compartirUbicacion);

  // Botones inicio
  document.getElementById('btnCallFamiliar').addEventListener('click', llamarFamiliar);
  document.getElementById('btnShareUbicacion').addEventListener('click', compartirUbicacion);
  document.getElementById('btnVerUbicacion').addEventListener('click', () => switchTab('view-rutas'));

  // Contacto
  document.getElementById('btnContactLlamar').addEventListener('click', llamarFamiliar);
  document.getElementById('btnContactMensaje').addEventListener('click', enviarMensaje);
  document.getElementById('contactForm').addEventListener('submit', guardarContacto);

  // Iniciar navegación
  document.getElementById('btnIniciarNavegacion').addEventListener('click', iniciarNavegacion);

  // Filtros de categoría de lugares
  document.querySelectorAll('.cat-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.cat-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLugares(btn.getAttribute('data-cat'));
    });
  });

  // Filtro historial
  document.getElementById('historialFiltro').addEventListener('change', cargarHistorial);

  // Cambio de rol (demostración)
  document.getElementById('btnCambiarRol').addEventListener('click', cambiarRol);

  // Simulación Ismael
  document.getElementById('btnUpdateSession').addEventListener('click', simActualizarSesion);

  // Simulación Mauricio
  document.getElementById('btnUpdateLocation').addEventListener('click', simActualizarUbicacion);
}

// ============================================================
// CONFIGURACIÓN Y ESTADO INICIAL
// ============================================================
async function fetchConfig() {
  try {
    const r = await fetch('/api/config');
    if (r.ok) {
      const d = await r.json();
      if (d.hasGoogleMapsKey) googleKey = d.googleApiKey;
    }
  } catch (e) { console.warn("fetchConfig:", e); }
}

async function fetchSimState() {
  try {
    const r = await fetch('/api/simulation/state');
    if (r.ok) {
      const d = await r.json();
      simState = d;
      // Sync formulario simulación
      document.getElementById('simAdultId').value    = simState.session.adultId;
      document.getElementById('simAdultNombre').value= simState.session.nombre;
      document.getElementById('simAdminId').value    = simState.session.id_administrador;
      document.getElementById('simLat').value        = simState.location.latitude;
      document.getElementById('simLng').value        = simState.location.longitude;
      document.getElementById('simEstadoZona').value = simState.location.estadoZona;
      document.getElementById('simFamLat').value     = simState.familiar.latitude;
      document.getElementById('simFamLng').value     = simState.familiar.longitude;
    }
  } catch (e) { console.warn("fetchSimState:", e); }
}

// ============================================================
// CONTACTO DE EMERGENCIA
// Contrato: { id_contacto, id_adulto, nombre, telefono, relacion }
// ============================================================
async function fetchContact() {
  try {
    const r = await fetch(`/api/contacts/${simState.session.adultId}`);
    if (r.ok) {
      const list = await r.json();
      if (list?.length) activeContact = list[0];
      renderContacto();
    }
  } catch (e) { console.warn("fetchContact:", e); }
}

async function guardarContacto(e) {
  e.preventDefault();
  const nombre   = document.getElementById('formNombre').value;
  const telefono = document.getElementById('formTelefono').value;
  const relacion = document.getElementById('formRelacion').value;

  try {
    const r = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adultId: simState.session.adultId, nombre, telefono, relacion })
    });
    if (r.ok) {
      mostrarMensaje("Contacto de emergencia guardado correctamente.");
      await fetchContact();
    } else {
      mostrarMensaje("Error al guardar el contacto.", true);
    }
  } catch (e) {
    mostrarMensaje("Error de conexión.", true);
  }
}

function renderContacto() {
  document.getElementById('contactNombreText').textContent   = activeContact.nombre   || "Sin contacto";
  document.getElementById('contactRelacionText').textContent = activeContact.relacion  || "Familiar";
  document.getElementById('contactTelefonoText').textContent = activeContact.telefono  || "Sin teléfono";
  // Formulario
  document.getElementById('formNombre').value   = activeContact.nombre   || "";
  document.getElementById('formTelefono').value = activeContact.telefono || "";
  document.getElementById('formRelacion').value = activeContact.relacion  || "";
  // Pantalla de éxito SOS
  document.getElementById('successNombre').textContent   = activeContact.nombre   || "—";
  document.getElementById('successTelefono').textContent = activeContact.telefono || "—";
  // Botón llamar
  const btnLlamar = document.getElementById('btnContactLlamar');
  if (btnLlamar) btnLlamar.href = activeContact.telefono ? `tel:${activeContact.telefono}` : '#';
}

// ============================================================
// RENDERIZADO GENERAL
// ============================================================
function renderApp() {
  // Saludo — "Hola, nombre"
  document.getElementById('headerGreeting').textContent = "Hola,";
  document.getElementById('headerName').textContent     = simState.session.nombre || "...";

  // Estado de zona segura
  const badge     = document.getElementById('zoneBadge');
  const badgeText = document.getElementById('zoneBadgeText');
  const header    = document.getElementById('appHeader');
  const esDentro  = simState.location.estadoZona === "DENTRO_DE_ZONA";

  badge.className = `zone-badge ${esDentro ? 'safe' : 'danger'}`;
  badgeText.textContent = esDentro ? "Zona segura" : "⚠️ FUERA DE ZONA";
  header.classList.toggle('danger', !esDentro);

  renderContacto();
  actualizarMarkerInicio();
}

// ============================================================
// MAPAS — Leaflet (OpenStreetMap, sin API Key)
// ============================================================
function initLeaflet() {
  console.log("Leaflet/OSM inicializado.");
  document.getElementById('sdkStatusIndicator').textContent  = "Leaflet / OpenStreetMap";
  document.getElementById('dbStatusIndicator').textContent   = "SQLite / JSON";
  document.getElementById('sdkStatusIndicator').className    = "tag-unknown";

  const lat = simState.location.latitude;
  const lng = simState.location.longitude;

  // Mapa inicio
  mapInicio = L.map('map-inicio', { zoomControl: false, attributionControl: false })
    .setView([lat, lng], 16);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 })
    .addTo(mapInicio);

  // Mapa rutas
  mapRoutes = L.map('map-routes', { zoomControl: true, attributionControl: false })
    .setView([lat, lng], 14);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 20 })
    .addTo(mapRoutes);

  actualizarMarkerInicio();
}

// ============================================================
// MAPAS — Google Maps (si existe API Key)
// ============================================================
function loadGoogleMaps() {
  document.getElementById('sdkStatusIndicator').textContent = "Cargando Google Maps...";
  const s = document.createElement('script');
  s.src = `https://maps.googleapis.com/maps/api/js?key=${googleKey}&libraries=places,geometry`;
  s.async = true;
  s.defer = true;
  s.onload = () => {
    mapType = 'google';
    document.getElementById('sdkStatusIndicator').textContent = "Google Maps SDK";
    document.getElementById('sdkStatusIndicator').className   = "tag-online";
    initGoogleMaps();
  };
  s.onerror = () => {
    console.warn("Google Maps falló. Usando Leaflet.");
    document.getElementById('sdkStatusIndicator').textContent = "Leaflet (fallback)";
    initLeaflet();
  };
  document.head.appendChild(s);
}

function initGoogleMaps() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  const darkStyle = [
    { elementType: "geometry",            stylers: [{ color: "#0b0f17" }] },
    { elementType: "labels.text.stroke",  stylers: [{ color: "#0b0f17" }] },
    { elementType: "labels.text.fill",    stylers: [{ color: "#94a3b8" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#070b13" }] }
  ];
  const opts = { center: { lat, lng }, zoom: 16, disableDefaultUI: true, styles: darkStyle };
  mapInicio  = new google.maps.Map(document.getElementById('map-inicio'),  { ...opts });
  mapRoutes  = new google.maps.Map(document.getElementById('map-routes'),  { ...opts, zoom: 14 });
  actualizarMarkerInicio();
}

// Marcador en mapa de inicio
async function actualizarMarkerInicio() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  const safe = simState.location.estadoZona === "DENTRO_DE_ZONA";
  const color = safe ? '#10b981' : '#ef4444';

  // Actualizar dirección y última actualización
  document.getElementById('locUpdateTime').textContent =
    `Última actualización: ${new Date().toLocaleTimeString('es-EC')}`;
  obtenerDireccion(lat, lng).then(addr =>
    document.getElementById('locAddressText').textContent = addr
  );

  if (mapType === 'leaflet' && mapInicio) {
    layersInicio.forEach(l => mapInicio.removeLayer(l));
    layersInicio = [];

    const circle = L.circle([lat, lng], {
      color, fillColor: color, fillOpacity: 0.15, radius: 120
    }).addTo(mapInicio);

    const marker = L.circleMarker([lat, lng], {
      color, fillColor: '#fff', fillOpacity: 1, radius: 8, weight: 3
    }).addTo(mapInicio);

    layersInicio.push(circle, marker);
    mapInicio.setView([lat, lng], 16);

  } else if (mapType === 'google' && mapInicio) {
    layersInicio.forEach(m => m.setMap ? m.setMap(null) : null);
    layersInicio = [];

    const circle = new google.maps.Circle({
      strokeColor: color, strokeOpacity: 0.8, strokeWeight: 2,
      fillColor: color, fillOpacity: 0.15,
      map: mapInicio, center: { lat, lng }, radius: 120
    });
    const marker = new google.maps.Marker({
      position: { lat, lng }, map: mapInicio,
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor: '#fff', fillOpacity: 1,
              strokeColor: color, strokeWeight: 4, scale: 8 }
    });
    layersInicio.push(circle, marker);
    mapInicio.setCenter({ lat, lng });
  }
}

// Alias para el render
function updateInicioMarker() { actualizarMarkerInicio(); }

// Geocodificación inversa (Nominatim / OSM)
const geoCache = {};
async function obtenerDireccion(lat, lng) {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geoCache[key]) return geoCache[key];
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=17`
    );
    if (r.ok) {
      const d = await r.json();
      const addr = d.display_name.split(',').slice(0, 3).join(', ');
      geoCache[key] = addr;
      return addr;
    }
  } catch (_) {}
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

// ============================================================
// FLUJO SOS
// ============================================================
function abrirConfirmSOS() {
  document.getElementById('overlaySosConfirm').classList.add('show');
  cdSeconds = 5;
  document.getElementById('countdownNumber').textContent = cdSeconds;
  document.getElementById('cdSec').textContent = cdSeconds;

  // Reiniciar barra SVG
  const bar = document.getElementById('countdownBar');
  bar.style.transition = 'none';
  bar.style.strokeDashoffset = '0';
  setTimeout(() => {
    bar.style.transition = 'stroke-dashoffset 5s linear';
    bar.style.strokeDashoffset = '276';
  }, 50);

  clearInterval(countdownInterval);
  countdownInterval = setInterval(() => {
    cdSeconds--;
    document.getElementById('countdownNumber').textContent = cdSeconds;
    document.getElementById('cdSec').textContent = cdSeconds;
    if (cdSeconds <= 0) {
      clearInterval(countdownInterval);
      enviarSOS();
    }
  }, 1000);
}

function cerrarConfirmSOS() {
  clearInterval(countdownInterval);
  document.getElementById('overlaySosConfirm').classList.remove('show');
}

// POST /api/alerts — contrato: { adultId, tipo, latitude, longitude, estado }
async function enviarSOS() {
  clearInterval(countdownInterval);
  document.getElementById('overlaySosConfirm').classList.remove('show');

  const lat = simState.location.latitude;
  const lng = simState.location.longitude;

  try {
    const r = await fetch('/api/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adultId:   simState.session.adultId,
        tipo:      'SOS',
        latitude:  lat,
        longitude: lng,
        estado:    'NUEVA'
      })
    });

    if (r.ok) {
      document.getElementById('overlaySOSSuccess').classList.add('show');
    } else {
      mostrarMensaje("No se pudo enviar la alerta SOS. Revisa tu conexión.", true);
    }
  } catch (e) {
    mostrarMensaje("Error al enviar la alerta SOS.", true);
  }
}

function cerrarExitoSOS() {
  document.getElementById('overlaySOSSuccess').classList.remove('show');
  switchTab('view-inicio');
}

// ============================================================
// ACCIONES: LLAMAR, MENSAJE, COMPARTIR, NAVEGACIÓN
// ============================================================
function llamarFamiliar(e) {
  if (e?.preventDefault) e.preventDefault();
  if (activeContact?.telefono) {
    window.location.href = `tel:${activeContact.telefono}`;
  } else {
    mostrarMensaje("No hay teléfono del familiar configurado.");
  }
}

function enviarMensaje() {
  if (activeContact?.telefono) {
    const lat = simState.location.latitude;
    const lng = simState.location.longitude;
    const msg = encodeURIComponent(
      `Necesito ayuda. Mi ubicación: https://maps.google.com/?q=${lat},${lng}`
    );
    window.location.href = `sms:${activeContact.telefono}?body=${msg}`;
  } else {
    mostrarMensaje("No hay teléfono del familiar configurado.");
  }
}

function compartirUbicacion() {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  const url = `https://www.google.com/maps?q=${lat},${lng}`;
  if (navigator.share) {
    navigator.share({ title: `Ubicación de ${simState.session.nombre}`, url })
      .catch(() => {});
  } else {
    navigator.clipboard.writeText(url).then(() =>
      mostrarMensaje("Enlace de ubicación copiado al portapapeles.")
    ).catch(() => mostrarMensaje("Enlace: " + url));
  }
}

function iniciarNavegacion() {
  const destLat = simState.location.latitude;
  const destLng = simState.location.longitude;
  // Abre Google Maps con la navegación activa al adulto mayor
  const url = `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}&travelmode=driving`;
  window.open(url, '_blank');
}

// ============================================================
// RUTAS — POST /api/routes
// Origen: familiar | Destino: adulto mayor
// ============================================================
async function calcularRuta(destCoords = null) {
  const famLat = parseFloat(document.getElementById('simFamLat').value);
  const famLng = parseFloat(document.getElementById('simFamLng').value);
  let destLat  = simState.location.latitude;
  let destLng  = simState.location.longitude;
  let destLabel = simState.session.nombre;

  if (destCoords) {
    destLat   = destCoords.lat;
    destLng   = destCoords.lng;
    destLabel = destCoords.nombre;
  }

  // Actualizar labels
  document.getElementById('routeOrigenText').textContent  = "Tu ubicación (familiar)";
  document.getElementById('routeDestinoText').textContent = destLabel;

  try {
    const r = await fetch('/api/routes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin:      { lat: famLat, lng: famLng },
        destination: { lat: destLat, lng: destLng }
      })
    });

    if (!r.ok) throw new Error("Error en /api/routes");
    const data = await r.json();

    document.getElementById('routeDistanciaText').textContent = data.distancia;
    document.getElementById('routeDuracionText').textContent  = data.duracion;

    dibujarRutaEnMapa(famLat, famLng, destLat, destLng, destLabel, data);
  } catch (e) {
    console.error("calcularRuta:", e);
  }
}

function dibujarRutaEnMapa(oLat, oLng, dLat, dLng, dLabel, data) {
  if (mapType === 'leaflet' && mapRoutes) {
    // Limpiar capas anteriores
    layersRoutes.forEach(l => mapRoutes.removeLayer(l));
    layersRoutes = [];
    if (routePolyline) { mapRoutes.removeLayer(routePolyline); routePolyline = null; }

    // Marcador origen (familiar)
    const iconFam = L.divIcon({
      html: '<div style="background:#3b82f6;width:14px;height:14px;border-radius:50%;border:3px solid #fff;"></div>',
      className: '', iconSize: [14,14], iconAnchor: [7,7]
    });
    const iconDest = L.divIcon({
      html: '<div style="background:#00e5c9;width:16px;height:16px;border-radius:50%;border:3px solid #fff;"></div>',
      className: '', iconSize: [16,16], iconAnchor: [8,8]
    });

    const mFam  = L.marker([oLat, oLng], { icon: iconFam }).addTo(mapRoutes).bindPopup("Familiar (origen)");
    const mDest = L.marker([dLat, dLng], { icon: iconDest }).addTo(mapRoutes).bindPopup(`Destino: ${dLabel}`);
    layersRoutes.push(mFam, mDest);

    // Coordenadas del trayecto
    let coords = data.isMock
      ? data.coordenadas
      : (data.polyline?.encodedPolyline
          ? decodificarPolyline(data.polyline.encodedPolyline)
          : [[oLat, oLng], [dLat, dLng]]);

    routePolyline = L.polyline(coords, {
      color: '#00e5c9', weight: 5, opacity: 0.85, lineCap: 'round'
    }).addTo(mapRoutes);

    mapRoutes.fitBounds(L.latLngBounds(coords), { padding: [40, 40] });

  } else if (mapType === 'google' && mapRoutes) {
    layersRoutes.forEach(m => m.setMap?.(null));
    layersRoutes = [];
    if (routePolyline) { routePolyline.setMap(null); routePolyline = null; }

    const mFam = new google.maps.Marker({
      position: { lat: oLat, lng: oLng }, map: mapRoutes,
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor:'#3b82f6', fillOpacity:1, strokeColor:'#fff', strokeWeight:3, scale:7 }
    });
    const mDest = new google.maps.Marker({
      position: { lat: dLat, lng: dLng }, map: mapRoutes,
      icon: { path: google.maps.SymbolPath.CIRCLE, fillColor:'#00e5c9', fillOpacity:1, strokeColor:'#fff', strokeWeight:3, scale:9 }
    });
    layersRoutes.push(mFam, mDest);

    let pathCoords = data.isMock
      ? data.coordenadas.map(c => ({ lat: c[0], lng: c[1] }))
      : google.maps.geometry.encoding.decodePath(data.polyline.encodedPolyline);

    routePolyline = new google.maps.Polyline({
      path: pathCoords, geodesic: true,
      strokeColor: '#00e5c9', strokeOpacity: 0.85, strokeWeight: 5,
      map: mapRoutes
    });

    const bounds = new google.maps.LatLngBounds();
    pathCoords.forEach(c => bounds.extend(c));
    mapRoutes.fitBounds(bounds, 40);
  }
}

// Decodificador de Google Encoded Polyline (para Leaflet)
function decodificarPolyline(encoded) {
  let index = 0, lat = 0, lng = 0;
  const coords = [];
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : (result >> 1);
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : (result >> 1);
    coords.push([lat * 1e-5, lng * 1e-5]);
  }
  return coords;
}

// ============================================================
// LUGARES CERCANOS — POST /api/nearby-places
// Categorías: hospital | farmacia | centro_salud | policia | punto_ayuda
// ============================================================
async function buscarLugares(categoria = 'todos') {
  const lat = simState.location.latitude;
  const lng = simState.location.longitude;
  try {
    const body = { latitude: lat, longitude: lng };
    if (categoria && categoria !== 'todos') body.categoria = categoria;

    const r = await fetch('/api/nearby-places', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (r.ok) {
      placesData = await r.json();
      renderLugares(categoria);
    }
  } catch (e) {
    console.error("buscarLugares:", e);
  }
}

function renderLugares(categoria = 'todos') {
  const container = document.getElementById('placesList');
  container.innerHTML = '';

  const filtered = categoria === 'todos'
    ? placesData
    : placesData.filter(p => p.categoria === categoria);

  if (!filtered.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-map-marker-alt"></i>No se encontraron servicios en un radio de 2000 m.</div>`;
    return;
  }

  const iconMap = {
    hospital:     { icon: 'fa-truck-medical', label: 'Hospital' },
    farmacia:     { icon: 'fa-pills',         label: 'Farmacia' },
    centro_salud: { icon: 'fa-heart-pulse',   label: 'C. Salud' },
    policia:      { icon: 'fa-shield-halved', label: 'Policía' },
    punto_ayuda:  { icon: 'fa-handshake-angle', label: 'Apoyo' }
  };

  filtered.forEach(p => {
    const meta = iconMap[p.categoria] || { icon: 'fa-circle-dot', label: 'Lugar' };
    const item = document.createElement('div');
    item.className = 'place-item';
    item.innerHTML = `
      <div class="place-icon ${p.categoria}">
        <i class="fa-solid ${meta.icon}"></i>
      </div>
      <div class="place-info">
        <div class="place-nombre">${p.nombre}</div>
        <div class="place-dir">${p.direccion}</div>
      </div>
      <div class="place-dist">
        ${(p.distancia / 1000).toFixed(2)} km
        <span class="place-dist-hint">Ver ruta</span>
      </div>
    `;
    // Al hacer clic, calcula ruta desde el familiar hasta este lugar
    item.addEventListener('click', () => {
      switchTab('view-rutas');
      setTimeout(() => calcularRuta({ lat: p.latitude, lng: p.longitude, nombre: p.nombre }), 100);
    });
    container.appendChild(item);
  });
}

// ============================================================
// HISTORIAL DE ALERTAS
// Campos según contrato: id_alerta, id_adulto, tipo, fecha, hora,
//                        latitude, longitude, estado
// Estados: NUEVA | VISTA | ATENDIDA | CERRADA
// ============================================================
async function cargarHistorial() {
  const filtro = document.getElementById('historialFiltro').value;
  try {
    const r = await fetch(`/api/alerts/${simState.session.adultId}`);
    if (r.ok) {
      let alertas = await r.json();
      if (filtro !== 'todos') alertas = alertas.filter(a => a.estado === filtro);
      renderHistorial(alertas);
    }
  } catch (e) { console.error("cargarHistorial:", e); }
}

function renderHistorial(alertas) {
  const container = document.getElementById('historyList');
  container.innerHTML = '';

  if (!alertas?.length) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-bell-slash"></i>Sin alertas registradas.</div>`;
    return;
  }

  alertas.forEach(a => {
    const esSOS = a.tipo === 'SOS';
    const item  = document.createElement('div');
    item.className = `history-item ${esSOS ? 'sos' : 'fuera_de_zona'}`;

    // Campos del contrato: fecha, hora, tipo, latitude, longitude, estado
    item.innerHTML = `
      <div class="history-header">
        <span class="history-tipo">
          <i class="fa-solid ${esSOS ? 'fa-phone-flip' : 'fa-circle-exclamation'}"></i>
          ${esSOS ? 'Alerta S.O.S.' : 'Salida de Zona Segura'}
        </span>
        <span class="history-fecha-hora">${a.fecha}<br>${a.hora}</span>
      </div>
      <div class="history-ubicacion">
        <i class="fa-solid fa-location-crosshairs"></i>
        Tipo: <strong>${a.tipo}</strong> &nbsp;|&nbsp;
        Ubicación: ${parseFloat(a.latitude).toFixed(5)}, ${parseFloat(a.longitude).toFixed(5)}
      </div>
      <div class="history-footer">
        <span class="estado-badge ${a.estado}">${a.estado}</span>
        ${a.estado !== 'CERRADA'
          ? `<select class="history-estado-select" data-id="${a.id_alerta}">
               ${['NUEVA','VISTA','ATENDIDA','CERRADA'].map(s =>
                 `<option value="${s}" ${a.estado === s ? 'selected' : ''}>${s}</option>`
               ).join('')}
             </select>`
          : ''
        }
      </div>
    `;

    // Cambio de estado desde el select — PUT /api/alerts/:id/status
    const sel = item.querySelector('.history-estado-select');
    if (sel) {
      sel.addEventListener('change', async () => {
        const nuevoEstado = sel.value;
        try {
          const r = await fetch(`/api/alerts/${a.id_alerta}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
          });
          if (r.ok) cargarHistorial();
          else mostrarMensaje("Error al actualizar el estado.", true);
        } catch (e) {
          mostrarMensaje("Error de conexión.", true);
        }
      });
    }

    container.appendChild(item);
  });
}

// ============================================================
// CAMBIO DE ROL (demostración)
// ============================================================
function cambiarRol() {
  const txt = document.getElementById('rolActualText').textContent;
  const esAdulto = txt === 'Adulto Mayor';
  document.getElementById('rolActualText').textContent = esAdulto ? 'Familiar / Admin' : 'Adulto Mayor';
  document.getElementById('btnCambiarRol').textContent  = esAdulto ? 'Cambiar rol' : 'Cambiar rol';
}

// ============================================================
// SIMULACIÓN — Ismael y Mauricio
// ============================================================
async function simActualizarSesion() {
  const adultId          = parseInt(document.getElementById('simAdultId').value);
  const nombre           = document.getElementById('simAdultNombre').value;
  const id_administrador = parseInt(document.getElementById('simAdminId').value);

  try {
    const r = await fetch('/api/simulation/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adultId, nombre, id_administrador })
    });
    if (r.ok) {
      const d = await r.json();
      simState.session = d.session;
      mostrarMensaje(`Sesión actualizada: ${nombre} (ID: ${adultId})`);
      await fetchContact();
      renderApp();
    }
  } catch (e) { mostrarMensaje("Error al actualizar sesión.", true); }
}

// Contrato de Mauricio: { adultId, latitude, longitude, estadoZona }
async function simActualizarUbicacion() {
  const adultId    = parseInt(document.getElementById('simAdultId').value);
  const latitude   = parseFloat(document.getElementById('simLat').value);
  const longitude  = parseFloat(document.getElementById('simLng').value);
  const estadoZona = document.getElementById('simEstadoZona').value;
  const famLat     = parseFloat(document.getElementById('simFamLat').value);
  const famLng     = parseFloat(document.getElementById('simFamLng').value);

  // Actualizar familiar
  simState.familiar = { latitude: famLat, longitude: famLng };

  try {
    const r = await fetch('/api/simulation/location', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adultId, latitude, longitude, estadoZona })
    });

    if (r.ok) {
      const d = await r.json();
      simState.location = d.location;

      if (d.alertaCreada) {
        mostrarMensaje(
          `🚨 Alerta FUERA_DE_ZONA registrada automáticamente\n` +
          `Estado: ${d.alertaCreada.estado} | ${d.alertaCreada.fecha} ${d.alertaCreada.hora}`
        );
      } else {
        mostrarMensaje(`Ubicación actualizada. estadoZona: ${estadoZona}`);
      }

      renderApp();
      actualizarMarkerInicio();

      if (activeTab === 'view-rutas')     { calcularRuta(); }
      if (activeTab === 'view-lugares')   { buscarLugares('todos'); }
      if (activeTab === 'view-historial') { cargarHistorial(); }
    }
  } catch (e) { mostrarMensaje("Error al actualizar ubicación.", true); }
}

// ============================================================
// UTILIDADES
// ============================================================
function mostrarMensaje(msg, esError = false) {
  // Toast simple no-blocking
  const toast = document.createElement('div');
  toast.textContent = msg;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '90px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: esError ? '#ef4444' : '#10b981',
    color: '#fff',
    padding: '10px 18px',
    borderRadius: '10px',
    fontSize: '13px',
    zIndex: '9999',
    maxWidth: '300px',
    textAlign: 'center',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    whiteSpace: 'pre-line'
  });
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
