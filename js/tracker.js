/**
 * tracker.js
 * ─────────────────────────────────────────────────────────────────
 * Módulo: Ubicación, Mapa y Zonas Seguras
 * Proyecto: Sistema de monitoreo — Adulto Mayor
 * Desarrollado por: Mauricio Jácome
 * ─────────────────────────────────────────────────────────────────
 *
 * INTEGRACIONES:
 *  · Ismael (Auth): llama a TrackerModule.init({ adultId, nombre })
 *    después del login exitoso.
 *  · Juan (SOS/Routes): lee window.locationState continuamente para
 *    obtener { adultId, latitude, longitude, estadoZona }.
 *
 * APIS USADAS:
 *  · navigator.geolocation.watchPosition()  — tracking del dispositivo
 *  · POST /api/locations                    — guardar coordenadas
 *  · GET  /api/safe-zones/{adultId}         — obtener zona segura
 *  · POST /api/sos  (Juan)                  — enviar alerta SOS
 *  · GET  /api/geocode?lat=&lng=            — dirección aproximada
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// CONTRATO GLOBAL CON JUAN — siempre actualizado
// Juan lee window.locationState para SOS, Routes y Places.
// ═══════════════════════════════════════════════════════════════════
window.locationState = {
  adultId:    null,
  latitude:   null,
  longitude:  null,
  estadoZona: 'SIN_ACTUALIZACION'   // estado inicial obligatorio
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DEL MÓDULO
// ═══════════════════════════════════════════════════════════════════
const CONFIG = {
  /** URL base del backend interno */
  API_BASE: '/api',

  /** Intervalo mínimo entre envíos de ubicación al backend (ms) */
  SEND_INTERVAL_MS: 30_000,

  /** Opciones para watchPosition */
  GEO_OPTIONS: {
    enableHighAccuracy: true,   // GPS real en vez de red
    timeout:            15_000, // 15 s de espera máxima
    maximumAge:         10_000  // aceptar cache de 10 s
  },

  /** Tolerancia de distancia para recalcular zona (metros) */
  ZONE_CHECK_TOLERANCE_M: 5
};

// ═══════════════════════════════════════════════════════════════════
// ESTADO INTERNO DEL MÓDULO (privado)
// ═══════════════════════════════════════════════════════════════════
const _state = {
  adultId:          null,    // recibido de Ismael — NUNCA se cambia
  nombre:           null,    // nombre del adulto mayor
  watchId:          null,    // ID del watchPosition activo
  lastSendTime:     0,       // timestamp del último POST enviado
  safeZone:         null,    // { latitude, longitude, radio, nombre, estado }
  lastPosition:     null,    // { latitude, longitude, accuracy, timestamp }
  geocodeCache:     {},      // cache simple: "lat,lng" → dirección
  isSendingLocation: false   // evita envíos simultáneos
};

// ═══════════════════════════════════════════════════════════════════
// MÓDULO PÚBLICO — expuesto en window.TrackerModule
// ═══════════════════════════════════════════════════════════════════
window.TrackerModule = {

  // ─── INICIALIZACIÓN ──────────────────────────────────────────────
  /**
   * Punto de entrada. Llamado por el módulo de Ismael después del login.
   *
   * @param {Object} userData - Objeto exacto que entrega Ismael:
   *                            { adultId: Number, nombre: String }
   *
   * Ejemplo de uso (en el código de Ismael):
   *   window.TrackerModule.init({ adultId: 1, nombre: "María Guzmán" });
   */
  init(userData) {
    if (!userData?.adultId) {
      _logError('init(): adultId requerido. Verificar integración con Ismael.');
      return;
    }

    _state.adultId = userData.adultId;
    _state.nombre  = userData.nombre || 'Adulto Mayor';

    // Inicializar contrato global con Juan
    window.locationState.adultId = _state.adultId;

    // Actualizar UI con nombre del adulto
    _ui.setAdminName('tu familiar'); // hasta recibir nombre del admin
    _ui.showToast(`Bienvenida, ${_state.nombre}`, 'info');

    // Cargar zona segura desde backend, luego iniciar GPS
    _fetchSafeZone(_state.adultId)
      .finally(() => _startGeolocation());

    // Reloj en tiempo real
    _startClock();

    _log(`Tracker iniciado para adultId=${_state.adultId}`);
  },

  // ─── OBTENER ESTADO ACTUAL (Juan puede llamar esto) ──────────────
  /**
   * Retorna el estado actual de ubicación en el formato que necesita Juan.
   * Juan también puede leer window.locationState directamente.
   *
   * @returns {{ adultId, latitude, longitude, estadoZona }}
   */
  getLocationState() {
    return { ...window.locationState };
  },

  // ─── SOS (llamado desde el HTML al confirmar) ─────────────────────
  /**
   * Dispara la alerta SOS.
   * Envía la ubicación actual al endpoint de Juan para procesar el SOS.
   * Si Juan expone window.SOSModule.trigger(), lo usará directamente.
   */
  triggerSOS() {
    if (!_state.lastPosition) {
      _ui.showToast('No hay ubicación disponible para el SOS', 'error');
      return;
    }

    _log('SOS activado — enviando alerta');
    _ui.showToast('🆘 ¡Alerta enviada a tu familiar!', 'error');

    // Actualizar estado para que Juan lo lea
    window.locationState.estadoZona = window.locationState.estadoZona;

    // PUNTO DE INTEGRACIÓN CON JUAN
    // Si Juan expone su módulo SOS, lo invocamos directamente:
    if (typeof window.SOSModule?.trigger === 'function') {
      window.SOSModule.trigger(window.locationState);
    } else {
      // Fallback: POST directo (Juan deberá proveer el endpoint)
      _sendSOS();
    }
  }
};

// ═══════════════════════════════════════════════════════════════════
// GEOLOCALIZACIÓN
// ═══════════════════════════════════════════════════════════════════

/**
 * Inicia el watchPosition del navegador.
 * Se ejecuta continuamente mientras la página esté abierta.
 */
function _startGeolocation() {
  if (!('geolocation' in navigator)) {
    _handleGeoError({ code: 0, message: 'Geolocalización no disponible en este dispositivo.' });
    return;
  }

  _log('Iniciando watchPosition…');
  _ui.setGpsState('searching', 'Buscando GPS…');

  _state.watchId = navigator.geolocation.watchPosition(
    _onPositionSuccess,
    _onPositionError,
    CONFIG.GEO_OPTIONS
  );
}

/**
 * Callback de éxito de watchPosition.
 * @param {GeolocationPosition} position
 */
function _onPositionSuccess(position) {
  const { latitude, longitude, accuracy } = position.coords;
  const timestamp = position.timestamp;

  // Guardar última posición
  _state.lastPosition = { latitude, longitude, accuracy, timestamp };

  // Actualizar UI inmediatamente
  _ui.setCoordinates(latitude, longitude, accuracy);
  _ui.setGpsState('active', 'Ubicación activa');

  // Calcular estado de zona
  const estadoZona = _calculateZoneState(latitude, longitude);

  // Actualizar contrato global con Juan (siempre sincronizado)
  window.locationState.latitude   = latitude;
  window.locationState.longitude  = longitude;
  window.locationState.estadoZona = estadoZona;

  // Actualizar chip de zona en el mapa
  _ui.setZoneChip(estadoZona);

  // Obtener dirección (con throttle interno)
  _fetchReverseGeocode(latitude, longitude);

  // Enviar al backend (con throttle por CONFIG.SEND_INTERVAL_MS)
  _throttledSendLocation(latitude, longitude, accuracy, timestamp);
}

/**
 * Callback de error de watchPosition.
 * @param {GeolocationPositionError} error
 */
function _onPositionError(error) {
  _handleGeoError(error);
}

/**
 * Maneja todos los errores de geolocalización con mensajes claros.
 */
function _handleGeoError(error) {
  let estado = 'SIN_ACTUALIZACION';
  let mensaje = '';
  let gpsState = 'error';

  switch (error.code) {
    case 1: // PERMISSION_DENIED
      mensaje  = 'Permiso de ubicación denegado';
      estado   = 'UBICACION_DESACTIVADA';
      gpsState = 'disabled';
      _ui.showToast('Debes permitir el acceso a tu ubicación', 'error');
      break;

    case 2: // POSITION_UNAVAILABLE
      mensaje  = 'Ubicación no disponible';
      estado   = 'UBICACION_DESACTIVADA';
      _ui.showToast('No se puede obtener tu ubicación', 'error');
      break;

    case 3: // TIMEOUT
      mensaje  = 'Tiempo de espera agotado';
      _ui.showToast('GPS tardando demasiado…', 'info');
      break;

    default:
      mensaje  = 'GPS no disponible en este dispositivo';
      estado   = 'UBICACION_DESACTIVADA';
      break;
  }

  _ui.setGpsState(gpsState, mensaje);
  _ui.setZoneChip(estado);
  window.locationState.estadoZona = estado;

  _logError(`Geo error [${error.code}]: ${mensaje}`);
}

// ═══════════════════════════════════════════════════════════════════
// ZONA SEGURA
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene la zona segura del adulto desde el backend.
 * GET /api/safe-zones/{adultId}
 *
 * @param {number} adultId
 */
async function _fetchSafeZone(adultId) {
  try {
    const response = await fetch(`${CONFIG.API_BASE}/safe-zones/${adultId}`);

    if (!response.ok) {
      _log('No hay zona segura configurada para este adulto.');
      return;
    }

    const data = await response.json();

    _state.safeZone = {
      latitude:  data.latitude,
      longitude: data.longitude,
      radio:     data.radio,
      nombre:    data.nombre,
      estado:    data.estado
    };

    _log(`Zona segura cargada: "${_state.safeZone.nombre}" (radio ${_state.safeZone.radio}m)`);
  } catch (err) {
    // El backend no está disponible
    _log('Backend no disponible para _fetchSafeZone. Verifica que el servidor esté encendido.');
    _state.safeZone = null;
  }
}

/**
 * Calcula si el adulto está dentro o fuera de la zona segura.
 * Usa la fórmula de Haversine para distancia entre coordenadas.
 *
 * @param {number} lat - Latitud actual
 * @param {number} lng - Longitud actual
 * @returns {string} Estado: DENTRO_DE_ZONA | FUERA_DE_ZONA | SIN_ACTUALIZACION
 */
function _calculateZoneState(lat, lng) {
  if (!_state.safeZone || !_state.safeZone.estado) {
    return 'UBICACION_DESACTIVADA';
  }

  const distanciaM = _haversineDistance(
    lat, lng,
    _state.safeZone.latitude,
    _state.safeZone.longitude
  );

  const estado = distanciaM <= _state.safeZone.radio
    ? 'DENTRO_DE_ZONA'
    : 'FUERA_DE_ZONA';

  // Si salió de la zona, mostrar alerta visual
  if (estado === 'FUERA_DE_ZONA') {
    _onFueraDeZona(distanciaM);
  }

  return estado;
}

/**
 * Dispara la alerta visual cuando el adulto sale de la zona.
 * @param {number} distanciaM - Distancia al centro de la zona en metros
 */
function _onFueraDeZona(distanciaM) {
  document.getElementById('app')?.classList.add('estado--fuera-de-zona');
  _ui.showToast(`⚠ Saliste de tu zona segura (${Math.round(distanciaM)}m)`, 'error');
  _log(`FUERA_DE_ZONA: distancia ${Math.round(distanciaM)}m`);
}

/**
 * Calcula la distancia entre dos coordenadas usando la fórmula de Haversine.
 * @returns {number} Distancia en metros
 */
function _haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 6_371_000; // Radio de la Tierra en metros
  const toRad = deg => deg * Math.PI / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ═══════════════════════════════════════════════════════════════════
// ENVÍO AL BACKEND — POST /api/locations
// ═══════════════════════════════════════════════════════════════════

/**
 * Limita el envío de ubicación al backend según CONFIG.SEND_INTERVAL_MS.
 */
function _throttledSendLocation(latitude, longitude, accuracy, timestamp) {
  const now = Date.now();
  if (now - _state.lastSendTime < CONFIG.SEND_INTERVAL_MS) return;
  _state.lastSendTime = now;
  _sendLocationToBackend(latitude, longitude, accuracy, timestamp);
}

/**
 * Envía la ubicación actual al backend del proyecto.
 *
 * Endpoint: POST /api/locations
 * Payload exacto del contrato del proyecto:
 * {
 *   "adultId":   1,
 *   "latitude":  -0.1807,
 *   "longitude": -78.4678,
 *   "accuracy":  15,
 *   "fecha":     "2026-07-13",
 *   "hora":      "22:30:00"
 * }
 */
async function _sendLocationToBackend(latitude, longitude, accuracy, timestamp) {
  if (_state.isSendingLocation) return; // evitar envíos simultáneos
  _state.isSendingLocation = true;

  // Formatear fecha y hora desde el timestamp del GPS
  const now   = new Date(timestamp);
  const fecha = _formatDate(now);
  const hora  = _formatTime(now);

  /** @type {LocationPayload} */
  const payload = {
    adultId:   _state.adultId,   // NUNCA cambiar este nombre — contrato Ismael
    latitude:  latitude,
    longitude: longitude,
    accuracy:  Math.round(accuracy),
    fecha:     fecha,
    hora:      hora
  };

  try {
    const response = await fetch(`${CONFIG.API_BASE}/locations`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Actualizar hora de última actualización en UI
    _ui.setLastUpdate(hora);
    _log(`Ubicación enviada: lat=${latitude}, lng=${longitude}, fecha=${fecha} ${hora}`);

  } catch (err) {
    // Backend no disponible — la app sigue funcionando en modo offline
    _logError(`Error al enviar ubicación: ${err.message}`);

    // Aún actualizar la UI con la hora local
    _ui.setLastUpdate(_formatTime(new Date()));
  } finally {
    _state.isSendingLocation = false;
  }
}

// ═══════════════════════════════════════════════════════════════════
// GEOCODIFICACIÓN INVERSA (Dirección desde coordenadas)
// ═══════════════════════════════════════════════════════════════════

/**
 * Obtiene la dirección aproximada desde coordenadas.
 * Usa un cache simple para no repetir la misma llamada.
 *
 * En producción: integrar con Geocoding API de Google Maps.
 * Endpoint sugerido: GET /api/geocode?lat={lat}&lng={lng}
 *
 * @param {number} lat
 * @param {number} lng
 */
async function _fetchReverseGeocode(lat, lng) {
  // Key para cache (redondeado a 4 decimales ≈ 11m de precisión)
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;

  if (_state.geocodeCache[key]) {
    _ui.setAddress(_state.geocodeCache[key]);
    return;
  }

  _ui.showAddressLoading(true);

  try {
    // Intentar backend interno primero
    const response = await fetch(
      `${CONFIG.API_BASE}/geocode?lat=${lat}&lng=${lng}`
    );

    if (!response.ok) throw new Error('Backend geocode no disponible');

    const data = await response.json();
    const address = data.direccion || data.formatted_address || 'Dirección no disponible';

    _state.geocodeCache[key] = address;
    _ui.setAddress(address);

  } catch {
    // Fallback: Geocoding API de Google Maps directo
    _fetchGoogleGeocode(lat, lng, key);
  } finally {
    _ui.showAddressLoading(false);
  }
}

/**
 * Fallback con la API de Google Maps Geocoding.
 * NOTA: La API Key se debe pasar desde el backend por seguridad.
 * Este fallback es solo para desarrollo/demo.
 */
async function _fetchGoogleGeocode(lat, lng, cacheKey) {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=COLOCA_TU_API_KEY`;
    const response = await fetch(url);
    const data     = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const address = data.results[0].formatted_address;
      _state.geocodeCache[cacheKey] = address;
      _ui.setAddress(address);
    } else {
      _ui.setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    }
  } catch {
    // Sin conexión — mostrar coordenadas como fallback
    _ui.setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// ENVÍO DE SOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Envía la alerta SOS al backend (fallback si Juan no está disponible).
 * Juan debe proveer el endpoint de SOS.
 */
async function _sendSOS() {
  try {
    const payload = {
      ...window.locationState,
      timestamp: new Date().toISOString()
    };

    // SIMULACIÓN: Comunicar a la pestaña del administrador que se activó el SOS
    localStorage.setItem('simulated_sos', Date.now().toString());

    const response = await fetch(`${CONFIG.API_BASE}/sos`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!response.ok) throw new Error(`SOS HTTP ${response.status}`);
    _log('SOS enviado exitosamente.');
  } catch (err) {
    _logError(`Error enviando SOS: ${err.message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════
// INTERFAZ DE USUARIO — funciones de actualización del DOM
// ═══════════════════════════════════════════════════════════════════
const _ui = {

  /** Actualiza las coordenadas en pantalla */
  setCoordinates(lat, lng, accuracy) {
    const latEl = document.getElementById('lat-value');
    const lngEl = document.getElementById('lng-value');
    const accEl = document.getElementById('accuracy-value');

    if (latEl) latEl.textContent = lat.toFixed(6);
    if (lngEl) lngEl.textContent = lng.toFixed(6);
    if (accEl) accEl.textContent = `Precisión: ±${Math.round(accuracy)}m`;
  },

  /** Actualiza el chip de estado de zona sobre el mapa */
  setZoneChip(estadoZona) {
    const chip = document.getElementById('zone-chip');
    if (!chip) return;

    // Remover clases anteriores
    chip.className = 'map-chip map-chip--zone';

    const labels = {
      'DENTRO_DE_ZONA':        { label: '✓ DENTRO DE ZONA',   cls: 'dentro-de-zona' },
      'FUERA_DE_ZONA':         { label: '⚠ FUERA DE ZONA',    cls: 'fuera-de-zona' },
      'UBICACION_DESACTIVADA': { label: 'GPS DESACTIVADO',     cls: 'ubicacion-desactivada' },
      'SIN_ACTUALIZACION':     { label: 'SIN ACTUALIZACIÓN',   cls: 'sin-actualizacion' }
    };

    const info = labels[estadoZona] || labels['SIN_ACTUALIZACION'];
    chip.classList.add(`map-chip--${info.cls}`);
    chip.querySelector('#zone-label').textContent = info.label;
  },

  /** Actualiza el estado del indicador GPS en el header */
  setGpsState(state, label) {
    const dot   = document.getElementById('gps-indicator');
    const lbl   = document.getElementById('gps-label');

    if (dot) {
      dot.className = `gps-dot gps-dot--${state}`;
      dot.querySelector('.gps-dot__pulse').className = 'gps-dot__pulse';
    }
    if (lbl) lbl.textContent = label;
  },

  /** Actualiza la dirección en la tarjeta */
  setAddress(address) {
    const el = document.getElementById('address-text');
    if (el) el.textContent = address;
  },

  /** Muestra/oculta el spinner de carga de dirección */
  showAddressLoading(loading) {
    const spinner = document.getElementById('address-spinner');
    if (spinner) spinner.hidden = !loading;
  },

  /** Actualiza la hora de última actualización */
  setLastUpdate(hora) {
    const el = document.getElementById('last-update');
    if (el) el.textContent = hora;
  },

  /** Actualiza el nombre del administrador en el footer */
  setAdminName(nombre) {
    const el = document.getElementById('admin-name');
    if (el) el.textContent = nombre;
  },

  /**
   * Muestra un toast de notificación temporal.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   * @param {number} duration - ms antes de desaparecer
   */
  showToast(message, type = 'info', duration = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className   = `toast toast--${type}`;
    toast.hidden      = false;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => { toast.hidden = true; }, duration);
  }
};

// ═══════════════════════════════════════════════════════════════════
// RELOJ EN TIEMPO REAL
// ═══════════════════════════════════════════════════════════════════
function _startClock() {
  const update = () => {
    const el = document.getElementById('header-time');
    if (el) el.textContent = _formatTime(new Date());
  };
  update();
  setInterval(update, 1_000);
}

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

/**
 * Formatea una fecha como "YYYY-MM-DD" (contrato del proyecto).
 * @param {Date} date
 * @returns {string}
 */
function _formatDate(date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formatea una hora como "HH:MM:SS" (contrato del proyecto).
 * @param {Date} date
 * @returns {string}
 */
function _formatTime(date) {
  const h  = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const s  = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${mi}:${s}`;
}

/** Log de desarrollo (se puede desactivar en producción) */
function _log(msg) {
  console.log(`[TrackerModule] ${msg}`);
}

/** Log de error */
function _logError(msg) {
  console.error(`[TrackerModule] ❌ ${msg}`);
}
