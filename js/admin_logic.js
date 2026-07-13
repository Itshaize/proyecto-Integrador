/**
 * admin_logic.js
 * ─────────────────────────────────────────────────────────────────
 * Módulo: Panel del ADMINISTRADOR — Ubicación, Mapa y Zonas Seguras
 * Proyecto: Sistema de monitoreo — Adulto Mayor
 * Desarrollado por: Mauricio Jácome
 * ─────────────────────────────────────────────────────────────────
 *
 * INTEGRACIONES:
 *  · Ismael (Auth): llama a AdminModule.init({ adultId, nombre })
 *    después de autenticar al administrador.
 *  · Juan (SOS/Routes): puede leer window.adminLocationState para
 *    obtener la última ubicación conocida del adulto mayor.
 *
 * ENDPOINTS USADOS (contrato del proyecto):
 *  GET  /api/locations/{adultId}/latest  → última ubicación
 *  GET  /api/safe-zones/{adultId}        → zona segura del adulto
 *  POST /api/safe-zones                  → crear zona segura
 *  PUT  /api/safe-zones/{id}             → editar zona segura
 *  DELETE /api/safe-zones/{id}           → eliminar zona segura
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════
// ESTADO GLOBAL — disponible para Juan (SOS & Routes)
// ═══════════════════════════════════════════════════════════════════
window.adminLocationState = {
  adultId:    null,
  latitude:   null,
  longitude:  null,
  estadoZona: 'SIN_ACTUALIZACION'
};

// ═══════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════
const ADMIN_CONFIG = {
  API_BASE:          '/api',
  POLL_INTERVAL_MS:  5_000,    // ⚡ SIMULACIÓN RÁPIDA: Consulta al backend cada 5 segundos
  ZONE_RADIO_DEFAULT: 300      // Radio en metros por defecto al crear zona
};

// ═══════════════════════════════════════════════════════════════════
// ESTADO INTERNO DEL MÓDULO ADMIN
// ═══════════════════════════════════════════════════════════════════
const _admin = {
  adultId:         null,
  nombre:          null,
  safeZone:        null,   // objeto zona segura activa
  lastLocation:    null,   // última respuesta de GET /api/locations/latest
  pollTimer:       null,
  isAlertVisible:  false,
  isEditMode:      false,  // true → modal en modo edición, false → creación
  alertDismissed:  false   // evitar re-disparar la misma alerta
};

// ═══════════════════════════════════════════════════════════════════
// MÓDULO PÚBLICO — window.AdminModule
// ═══════════════════════════════════════════════════════════════════
window.AdminModule = {

  // ── INICIALIZACIÓN ──────────────────────────────────────────────
  /**
   * Punto de entrada. Llamado por Ismael tras el login del administrador.
   *
   * @param {{ adultId: number, nombre: string }} userData
   *
   * Ejemplo:
   *   window.AdminModule.init({ adultId: 1, nombre: "María Guzmán" });
   */
  init(userData) {
    if (!userData?.adultId) {
      _adminLog('init(): adultId requerido. Verificar integración con Ismael.');
      return;
    }

    // SIMULACIÓN SOS: Escuchar a la pestaña de adulto_mayor.html
    window.addEventListener('storage', (e) => {
      if (e.key === 'simulated_sos') {
        _adminUI.showSOSAlert(_admin.nombre);
      }
    });

    _admin.adultId = userData.adultId;
    _admin.nombre  = userData.nombre || 'Adulto Mayor';

    // Inicializar contrato global
    window.adminLocationState.adultId = _admin.adultId;

    // Actualizar nombre en la UI
    _adminUI.setPatientName(_admin.nombre, _admin.adultId);
    _adminUI.setMarkerLabel(_admin.nombre);

    // Poblar el select "Adulto asignado" del formulario de zona segura.
    // Ismael provee la lista completa. Por ahora usamos el adulto actual
    // como entrada inicial. Cuando Ismael exponga window.AdultosList se usa eso.
    const adultosList = window.AdultosList ?? [{ adultId: userData.adultId, nombre: userData.nombre }];
    _populateAdultoSelect(adultosList);

    // Inicializar el mapa principal
    _initMainMap();

    // Carga inicial: zona segura y ubicación
    Promise.all([
      _fetchSafeZone(_admin.adultId),
      _fetchLatestLocation(_admin.adultId)
    ]).finally(() => {
      _adminUI.hideLoading();
      _startPolling();
    });

    _adminLog(`AdminModule iniciado para adultId=${_admin.adultId} (${_admin.nombre})`);
  },

  // ── ACTUALIZAR MANUALMENTE ──────────────────────────────────────
  /** Fuerza una actualización inmediata de la ubicación. */
  async refreshLocation() {
    _adminUI.showToast('Actualizando…', 'info', 1500);
    await _fetchLatestLocation(_admin.adultId);
  },

  /** Centra el mapa en la posición del adulto mayor. */
  centerOnAdulto() {
    if (!_admin.lastLocation) {
      _adminUI.showToast('Sin ubicación disponible aún', 'info');
      return;
    }
    // Con Maps SDK real: map.panTo({ lat: ..., lng: ... });
    _adminLog(`Centrar mapa en: ${_admin.lastLocation.latitude}, ${_admin.lastLocation.longitude}`);
    _adminUI.showToast('Mapa centrado en adulto mayor', 'info', 1500);
  },

  // ── MODALES DE ZONA SEGURA ──────────────────────────────────────
  /** Abre el modal en modo CREAR. */
  openCreateZoneModal() {
    _admin.isEditMode = false;
    _resetZoneForm();
    // Precargar coordenadas de la última ubicación conocida
    if (_admin.lastLocation) {
      document.getElementById('zone-latitud').value = _admin.lastLocation.latitude;
      document.getElementById('zone-longitud').value = _admin.lastLocation.longitude;
    }
    document.getElementById('zone-modal-title').textContent = 'Crear zona segura';
    document.getElementById('zone-save-btn').textContent    = 'Guardar zona';
    document.getElementById('zone-modal').hidden = false;
    
    // Inicializar o actualizar el mapa del modal
    if (window.L) {
      setTimeout(_initModalMap, 200); // 200ms para asegurar que el modal es visible
    }
  },

  /** Abre el modal en modo EDITAR con la zona actual. */
  openEditZoneModal() {
    if (!_admin.safeZone) {
      _adminUI.showToast('No hay zona segura configurada aún', 'info');
      return;
    }

    _admin.isEditMode = true;
    _resetZoneForm();
    _populateZoneForm(_admin.safeZone);

    document.getElementById('zone-modal-title').textContent = 'Editar zona segura';
    document.getElementById('zone-save-btn').textContent    = 'Guardar cambios';
    document.getElementById('zone-modal').hidden = false;
    
    if (window.L) {
      setTimeout(_initModalMap, 200);
    }
  },

  /** Cierra el modal de zona. */
  closeZoneModal() {
    document.getElementById('zone-modal').hidden = true;
    _resetZoneForm();
  },

  /** Valida y envía el formulario (crear o editar). */
  async submitZoneForm() {
    if (!_validateZoneForm()) return;

    const btn = document.getElementById('zone-save-btn');
    btn.disabled    = true;
    btn.textContent = 'Guardando…';

    const formData = _readZoneForm();

    try {
      if (_admin.isEditMode && _admin.safeZone?.id_zona) {
        await _updateSafeZone(_admin.safeZone.id_zona, formData);
      } else {
        await _createSafeZone(formData);
      }
      this.closeZoneModal();
    } finally {
      btn.disabled    = false;
      btn.textContent = _admin.isEditMode ? 'Guardar cambios' : 'Guardar zona';
    }
  },

  // ── ALERTA FUERA DE ZONA ────────────────────────────────────────
  /** Descarta la alerta de zona. */
  dismissAlert() {
    document.getElementById('alert-modal').hidden = true;
    _admin.isAlertVisible = false;
    // Marcar como atendida para no volver a disparar en el mismo ciclo
    _admin.alertDismissed = true;
    _adminLog('Alerta FUERA_DE_ZONA atendida por el administrador.');
    _adminUI.showToast('Alerta atendida', 'success', 2000);
  }
};

// ═══════════════════════════════════════════════════════════════════
// POLLING — consulta periódica al backend
// ═══════════════════════════════════════════════════════════════════
function _startPolling() {
  _admin.pollTimer = setInterval(async () => {
    await _fetchLatestLocation(_admin.adultId);
  }, ADMIN_CONFIG.POLL_INTERVAL_MS);

  _adminLog(`Polling iniciado cada ${ADMIN_CONFIG.POLL_INTERVAL_MS / 1000}s`);
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/locations/{adultId}/latest
// ═══════════════════════════════════════════════════════════════════
/**
 * Obtiene la última ubicación conocida del adulto mayor.
 *
 * Respuesta esperada del backend:
 * {
 *   "adultId":    1,
 *   "latitude":   -0.1807,
 *   "longitude":  -78.4678,
 *   "accuracy":   15,
 *   "estadoZona": "DENTRO_DE_ZONA"
 * }
 *
 * @param {number} adultId
 */
async function _fetchLatestLocation(adultId) {
  try {
    const response = await fetch(
      `${ADMIN_CONFIG.API_BASE}/locations/${adultId}/latest`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    _processLocationData(data);

  } catch (err) {
    _adminLog(`Backend no disponible. Usando datos mock. (${err.message})`);
    // Datos simulados para desarrollo sin backend
    _processLocationData(_getMockLocationData(adultId));
  }
}

/**
 * Procesa los datos de ubicación recibidos y actualiza toda la UI.
 * @param {Object} data - Objeto de ubicación del backend
 */
function _processLocationData(data) {
  _admin.lastLocation = data;

  // Actualizar contrato global con Juan
  window.adminLocationState.latitude   = data.latitude;
  window.adminLocationState.longitude  = data.longitude;
  window.adminLocationState.estadoZona = data.estadoZona;

  // Actualizar UI
  _adminUI.updateCoordinates(data.latitude, data.longitude);
  _adminUI.updateStatusBadge(data.estadoZona);
  _adminUI.updateDeviceCard(data.accuracy || 0, _admin.safeZone?.nombre || '—');
  _adminUI.setLastUpdateTime(_formatTime(new Date()));

  // Actualizar mapa principal interactivo
  if (_admin.mainMap && _admin.mainMarker) {
    const latlng = [data.latitude, data.longitude];
    _admin.mainMarker.setLatLng(latlng);
    // Si la cámara no ha sido movida por el admin, podríamos hacer que lo siga:
    // _admin.mainMap.panTo(latlng);
  }

  // Verificar si salió de la zona
  _checkFueraDeZonaAlert(data);

  _adminLog(`Ubicación actualizada: ${data.estadoZona} (${data.latitude?.toFixed(5)}, ${data.longitude?.toFixed(5)})`);
}

/**
 * Dispara la alerta visual cuando el adulto está FUERA_DE_ZONA.
 * Solo dispara una vez hasta que el admin la atiende.
 * @param {Object} locationData
 */
function _checkFueraDeZonaAlert(locationData) {
  if (locationData.estadoZona !== 'FUERA_DE_ZONA') {
    // Si regresó a la zona, resetear el flag
    _admin.alertDismissed = false;
    document.getElementById('safe-zone-overlay').classList.remove('state--fuera');
    return;
  }

  // Cambiar círculo de zona a rojo
  if (_admin.mainCircle) {
    _admin.mainCircle.setStyle({ color: '#ff1744', fillColor: '#ff1744' });
  }

  // No volver a disparar si ya fue atendida
  if (_admin.isAlertVisible || _admin.alertDismissed) return;

  // Calcular distancia si tenemos la zona
  let distanciaTexto = '—';
  if (_admin.safeZone) {
    const dist = _haversineDistance(
      locationData.latitude,  locationData.longitude,
      _admin.safeZone.latitude, _admin.safeZone.longitude
    );
    distanciaTexto = `${Math.round(dist)} m`;
  }

  // Mostrar modal de alerta
  _admin.isAlertVisible = true;
  _adminUI.showFueraDeZonaAlert({
    nombre:    _admin.nombre,
    latitude:  locationData.latitude,
    longitude: locationData.longitude,
    distancia: distanciaTexto
  });

  _adminLog(`ALERTA: ${_admin.nombre} está FUERA_DE_ZONA (${distanciaTexto} del centro)`);
}

// ═══════════════════════════════════════════════════════════════════
// GET /api/safe-zones/{adultId}
// ═══════════════════════════════════════════════════════════════════
/**
 * Carga la zona segura del adulto mayor desde el backend.
 * @param {number} adultId
 */
async function _fetchSafeZone(adultId) {
  try {
    const response = await fetch(
      `${ADMIN_CONFIG.API_BASE}/safe-zones/${adultId}`
    );

    if (response.status === 404) {
      _adminLog('No hay zona segura configurada para este adulto.');
      _adminUI.showToast('Sin zona segura configurada aún', 'info', 4000);
      return;
    }

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    _admin.safeZone = data;
    _adminUI.updateZoneInfo(data);
    _adminLog(`Zona cargada: "${data.nombre}" (radio ${data.radio}m)`);

  } catch (err) {
    _adminLog(`Error cargando zona: ${err.message}. Usando mock.`);
    // Mock para desarrollo
    _admin.safeZone = _getMockSafeZone(adultId);
    _adminUI.updateZoneInfo(_admin.safeZone);
  }
}

// ═══════════════════════════════════════════════════════════════════
// POST /api/safe-zones — CREAR zona segura
// ═══════════════════════════════════════════════════════════════════
/**
 * Crea una nueva zona segura en el backend.
 *
 * Payload exacto del contrato:
 * {
 *   "adultId":   1,
 *   "nombre":    "Casa",
 *   "direccion": "Av. Amazonas...",
 *   "latitude":  -0.1807,
 *   "longitude": -78.4678,
 *   "radio":     300
 * }
 *
 * @param {Object} formData - Datos del formulario de zona
 */
async function _createSafeZone(formData) {
  const payload = {
    adultId:   formData.adultId || _admin.adultId,
    nombre:    formData.nombre,
    direccion: formData.direccion,
    latitude:  formData.latitude,
    longitude: formData.longitude,
    radio:     formData.radio
  };

  try {
    const response = await fetch(`${ADMIN_CONFIG.API_BASE}/safe-zones`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const created = await response.json();
    _admin.safeZone = created;
    _adminUI.updateZoneInfo(created);
    _adminUI.showToast(`✓ Zona "${created.nombre}" creada`, 'success');
    _adminLog(`Zona creada: id=${created.id_zona}, radio=${created.radio}m`);

  } catch (err) {
    _adminLog(`Backend no disponible para POST /safe-zones. Usando fallback mock. (${err.message})`);
    
    // Mock de creación exitosa para desarrollo sin backend
    const created = {
      id_zona: Math.floor(Math.random() * 1000) + 1,
      ...payload,
      estado: true
    };
    
    _admin.safeZone = created;
    _adminUI.updateZoneInfo(created);
    _adminUI.showToast(`✓ Zona "${created.nombre}" creada (Modo Prueba)`, 'success');
  }
}

// ═══════════════════════════════════════════════════════════════════
// PUT /api/safe-zones/{id} — EDITAR zona segura
// ═══════════════════════════════════════════════════════════════════
/**
 * Actualiza una zona segura existente.
 *
 * @param {number} zoneId
 * @param {Object} formData
 */
async function _updateSafeZone(zoneId, formData) {
  const payload = {
    adultId:   formData.adultId || _admin.adultId,
    nombre:    formData.nombre,
    direccion: formData.direccion,
    latitude:  formData.latitude,
    longitude: formData.longitude,
    radio:     formData.radio
  };

  try {
    const response = await fetch(
      `${ADMIN_CONFIG.API_BASE}/safe-zones/${zoneId}`,
      {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload)
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const updated = await response.json();
    _admin.safeZone = updated;
    _adminUI.updateZoneInfo(updated);
    _adminUI.showToast(`✓ Zona "${updated.nombre}" actualizada`, 'success');
    _adminLog(`Zona actualizada: id=${zoneId}`);

  } catch (err) {
    _adminLog(`Backend no disponible para PUT /safe-zones. Usando fallback mock. (${err.message})`);
    
    // Mock de actualización exitosa
    const updated = {
      id_zona: zoneId,
      ...payload,
      estado: true
    };
    
    _admin.safeZone = updated;
    _adminUI.updateZoneInfo(updated);
    _adminUI.showToast(`✓ Zona "${updated.nombre}" actualizada (Modo Prueba)`, 'success');
  }
}

// ═══════════════════════════════════════════════════════════════════
// FORMULARIO DE ZONA — helpers
// ═══════════════════════════════════════════════════════════════════

/** Lee los valores del formulario y los normaliza. */
function _readZoneForm() {
  return {
    adultId:   parseInt(document.getElementById('zone-adulto').value, 10),
    nombre:    document.getElementById('zone-nombre').value.trim(),
    direccion: document.getElementById('zone-direccion').value.trim(),
    latitude:  parseFloat(document.getElementById('zone-latitud').value),
    longitude: parseFloat(document.getElementById('zone-longitud').value),
    radio:     parseInt(document.getElementById('zone-radio').value, 10)
  };
}

/** Valida los campos obligatorios y muestra errores en la UI. */
function _validateZoneForm() {
  let valid = true;

  const nombre  = document.getElementById('zone-nombre').value.trim();
  const lat     = document.getElementById('zone-latitud').value;
  const lng     = document.getElementById('zone-longitud').value;
  const adulto  = document.getElementById('zone-adulto').value;

  // Nombre
  _setFieldError('field-nombre', !nombre);
  if (!nombre) valid = false;

  // Latitud
  const latNum = parseFloat(lat);
  const latInvalid = isNaN(latNum) || latNum < -90 || latNum > 90;
  _setFieldError('field-latitud', latInvalid);
  if (latInvalid) valid = false;

  // Longitud
  const lngNum = parseFloat(lng);
  const lngInvalid = isNaN(lngNum) || lngNum < -180 || lngNum > 180;
  _setFieldError('field-longitud', lngInvalid);
  if (lngInvalid) valid = false;

  // Adulto asignado
  _setFieldError('field-adulto', !adulto);
  if (!adulto) valid = false;

  return valid;
}

/** Marca o desmarca el error visual de un campo. */
function _setFieldError(fieldId, hasError) {
  const field = document.getElementById(fieldId);
  if (!field) return;
  field.classList.toggle('has-error', hasError);
}

/** Limpia el formulario de zona. */
function _resetZoneForm() {
  document.getElementById('zone-id').value         = '';
  document.getElementById('zone-nombre').value     = '';
  document.getElementById('zone-direccion').value  = '';
  document.getElementById('zone-latitud').value    = '';
  document.getElementById('zone-longitud').value   = '';
  document.getElementById('zone-radio').value      = ADMIN_CONFIG.ZONE_RADIO_DEFAULT;
  document.getElementById('radio-display').textContent = `${ADMIN_CONFIG.ZONE_RADIO_DEFAULT} m`;
  document.getElementById('zone-adulto').value     = '';

  ['field-nombre', 'field-latitud', 'field-longitud', 'field-adulto'].forEach(id => {
    _setFieldError(id, false);
  });
}

/** Rellena el formulario con los datos de una zona existente. */
function _populateZoneForm(zone) {
  document.getElementById('zone-id').value        = zone.id_zona || '';
  document.getElementById('zone-nombre').value    = zone.nombre || '';
  document.getElementById('zone-direccion').value = zone.direccion || '';
  document.getElementById('zone-latitud').value   = zone.latitude || '';
  document.getElementById('zone-longitud').value  = zone.longitude || '';
  document.getElementById('zone-radio').value     = zone.radio || ADMIN_CONFIG.ZONE_RADIO_DEFAULT;
  document.getElementById('radio-display').textContent = `${zone.radio || ADMIN_CONFIG.ZONE_RADIO_DEFAULT} m`;
  // Pre-seleccionar adulto si la zona ya tiene uno asignado
  if (zone.id_adulto) {
    document.getElementById('zone-adulto').value = zone.id_adulto;
  }
}

/** 
 * Actualiza el texto del display y el tamaño del círculo en el mapa 
 * cuando el usuario mueve el slider.
 * Llamada desde el HTML oninput.
 */
window.updateRadioDisplay = function(val) {
  document.getElementById('radio-display').textContent = val + ' m';
  if (_admin.modalCircle) {
    _admin.modalCircle.setRadius(parseInt(val, 10));
  }
}

/**
 * Carga los adultos mayores disponibles en el select del formulario.
 * Máximo 2 adultos según el contrato del proyecto.
 * Recibe el array de adultos de Ismael: [{ adultId, nombre }, ...]
 * @param {Array} adultos
 */
function _populateAdultoSelect(adultos) {
  const select = document.getElementById('zone-adulto');
  if (!select) return;

  // Limpiar opciones previas (excepto la primera placeholder)
  while (select.options.length > 1) select.remove(1);

  adultos.forEach(a => {
    const opt = document.createElement('option');
    opt.value       = a.adultId;
    opt.textContent = `${a.nombre} (ID: ${a.adultId})`;
    select.appendChild(opt);
  });

  // Si solo hay uno, pre-seleccionarlo
  if (adultos.length === 1) {
    select.value = adultos[0].adultId;
  }
}

// ═══════════════════════════════════════════════════════════════════
// INTERFAZ DE USUARIO — funciones de actualización del DOM
// ═══════════════════════════════════════════════════════════════════
const _adminUI = {

  /** Muestra el nombre e ID del paciente en la tarjeta flotante */
  setPatientName(nombre, adultId) {
    const nameEl = document.getElementById('patient-name');
    const idEl   = document.getElementById('patient-id-label');
    if (nameEl) nameEl.textContent = nombre;
    if (idEl)   idEl.textContent   = `ID: ${adultId}`;
  },

  /** Actualiza la etiqueta del marcador en el mapa */
  setMarkerLabel(nombre) {
    const el = document.getElementById('marker-adulto-label');
    if (el) {
      // Mostrar solo primer nombre para que quepa en el mapa
      el.textContent = nombre.split(' ')[0];
    }
  },

  /** Actualiza el badge de estado en el bottom sheet */
  updateStatusBadge(estadoZona) {
    const badge = document.getElementById('status-badge');
    const label = document.getElementById('status-badge-text');
    if (!badge || !label) return;

    badge.className = 'status-badge';

    const config = {
      'DENTRO_DE_ZONA':        { cls: 'status-badge--dentro',     txt: '✓  DENTRO DE ZONA'    },
      'FUERA_DE_ZONA':         { cls: 'status-badge--fuera',      txt: '⚠  FUERA DE ZONA'     },
      'UBICACION_DESACTIVADA': { cls: 'status-badge--desactivada',txt: 'GPS DESACTIVADO'       },
      'SIN_ACTUALIZACION':     { cls: 'status-badge--sin',        txt: 'SIN ACTUALIZACIÓN'     }
    };

    const info = config[estadoZona] || config['SIN_ACTUALIZACION'];
    badge.classList.add(info.cls);
    label.textContent = info.txt;
  },

  /** Actualiza las coordenadas en el bottom sheet */
  updateCoordinates(lat, lng) {
    const latEl = document.getElementById('coord-lat');
    const lngEl = document.getElementById('coord-lng');
    if (latEl) latEl.textContent = lat != null ? lat.toFixed(5) : '—';
    if (lngEl) lngEl.textContent = lng != null ? lng.toFixed(5) : '—';
  },

  /** Actualiza la card de dispositivo (top-right) */
  updateDeviceCard(accuracy, zonaNombre) {
    const accEl  = document.getElementById('device-accuracy');
    const zoneEl = document.getElementById('device-zone-name');
    const gpsDot = document.getElementById('device-gps-dot');
    const gpsVal = document.getElementById('device-gps-val');

    if (accEl)  accEl.textContent  = accuracy ? `±${Math.round(accuracy)} m` : '— m';
    if (zoneEl) zoneEl.textContent = zonaNombre || '—';

    // GPS activo si tenemos datos
    if (gpsDot) gpsDot.style.background = 'var(--green)';
    if (gpsVal) { gpsVal.textContent = 'Activo'; gpsVal.style.color = 'var(--green)'; }
  },

  /** Actualiza la info de zona en el bottom sheet y en el mapa principal */
  updateZoneInfo(zone) {
    const radioEl = document.getElementById('coord-radio');
    if (radioEl && zone) radioEl.textContent = `${zone.radio} m`;

    // Actualizar card de dispositivo con nombre de zona
    const zoneEl = document.getElementById('device-zone-name');
    if (zoneEl && zone) zoneEl.textContent = zone.nombre;
    
    // Actualizar el círculo en el mapa principal interactivo
    if (_admin.mainMap && _admin.mainCircle && zone) {
      const latlng = [zone.latitude, zone.longitude];
      _admin.mainCircle.setLatLng(latlng);
      _admin.mainCircle.setRadius(zone.radio);
      _admin.mainCircle.setStyle({ color: '#00ff88', fillColor: '#00ff88' }); // reset a verde
    }
    
    // Actualizar la lista de zonas en el panel lateral
    _populateZonesList(zone);
  },

  /** Actualiza la hora de última actualización */
  setLastUpdateTime(hora) {
    const el = document.getElementById('last-update-time');
    if (el) el.textContent = hora;
  },

  /** Muestra la alerta de FUERA_DE_ZONA */
  showFueraDeZonaAlert({ nombre, latitude, longitude, distancia }) {
    const modal   = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const bodyEl  = document.getElementById('alert-body');
    const nameEl  = document.getElementById('alert-adulto-name');
    const latEl   = document.getElementById('alert-lat');
    const lngEl   = document.getElementById('alert-lng');
    const distEl  = document.getElementById('alert-dist');

    if (titleEl) titleEl.textContent = '¡FUERA DE ZONA!';
    if (bodyEl)  bodyEl.textContent  = 'El adulto mayor salió de la zona segura:';
    if (nameEl) nameEl.textContent = nombre;
    if (latEl)  latEl.textContent  = latitude?.toFixed(5)  ?? '—';
    if (lngEl)  lngEl.textContent  = longitude?.toFixed(5) ?? '—';
    if (distEl) distEl.textContent = distancia;

    if (modal) modal.hidden = false;
  },

  /** Muestra la alerta de SOS de emergencia */
  showSOSAlert(nombre) {
    const modal   = document.getElementById('alert-modal');
    const titleEl = document.getElementById('alert-title');
    const bodyEl  = document.getElementById('alert-body');
    const nameEl  = document.getElementById('alert-adulto-name');

    if (titleEl) titleEl.textContent = '¡ALERTA SOS (EMERGENCIA)!';
    if (bodyEl)  bodyEl.textContent  = 'El adulto mayor ha presionado el botón de ayuda urgente:';
    if (nameEl)  nameEl.textContent  = nombre;

    if (modal) modal.hidden = false;
  },

  /** Oculta el overlay de carga inicial */
  hideLoading() {
    const el = document.getElementById('loading-overlay');
    if (el) el.classList.add('hidden');
    setTimeout(() => { if (el) el.style.display = 'none'; }, 500);
  },

  /**
   * Muestra un toast de notificación.
   * @param {string} message
   * @param {'success'|'error'|'info'} type
   * @param {number} duration
   */
  showToast(message, type = 'info', duration = 3500) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.className   = `toast toast--${type}`;
    toast.hidden      = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.hidden = true; }, duration);
  }
};

// ═══════════════════════════════════════════════════════════════════
// INTEGRACIÓN MAPS SDK (placeholder)
// ═══════════════════════════════════════════════════════════════════
/**
 * Inicializa Google Maps.
 * Esta función se llamará cuando el SDK esté disponible.
 *
 * INSTRUCCIONES DE INTEGRACIÓN:
 * 1. Agregar en <head>:
 *    <script src="https://maps.googleapis.com/maps/api/js?key=API_KEY&callback=_initGoogleMap" defer></script>
 * 2. Descomentar el cuerpo de esta función.
 */
/**
 * Instancia o actualiza el mapa principal usando Leaflet (OpenStreetMap)
 * para simulación de la vista nativa de Maps SDK.
 */
function _initMainMap() {
  const mapEl = document.getElementById('map-container');
  if (!mapEl) return;

  const lat = _admin.lastLocation?.latitude || -0.1807;
  const lng = _admin.lastLocation?.longitude || -78.4678;

  if (!_admin.mainMap) {
    _admin.mainMap = L.map(mapEl, {
      zoomControl: false,
      attributionControl: false
    }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(_admin.mainMap);

    _admin.mainMarker = L.marker([lat, lng]).addTo(_admin.mainMap);

    _admin.mainCircle = L.circle([lat, lng], {
      color: '#00ff88',
      fillColor: '#00ff88',
      fillOpacity: 0.15,
      weight: 2,
      radius: ADMIN_CONFIG.ZONE_RADIO_DEFAULT
    }).addTo(_admin.mainMap);
  } else {
    _admin.mainMap.setView([lat, lng], 15);
    _admin.mainMarker.setLatLng([lat, lng]);
  }
}

/**
 * Instancia o actualiza el mini-mapa dentro del modal usando Leaflet (OpenStreetMap).
 */
function _initModalMap() {
  const mapEl = document.getElementById('zone-modal-map');
  const latInput = document.getElementById('zone-latitud');
  const lngInput = document.getElementById('zone-longitud');
  const radioInput = document.getElementById('zone-radio');
  const dirInput = document.getElementById('zone-direccion');

  // Valores iniciales
  let currentLat = parseFloat(latInput.value) || -0.1807;
  let currentLng = parseFloat(lngInput.value) || -78.4678;
  let currentRadio = parseInt(radioInput.value, 10) || ADMIN_CONFIG.ZONE_RADIO_DEFAULT;

  // Crear mapa si no existe
  if (!_admin.modalMap) {
    _admin.modalMap = L.map(mapEl, {
      zoomControl: false,
      attributionControl: false
    }).setView([currentLat, currentLng], 15);

    // Tiles oscuros (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(_admin.modalMap);

    // Marcador arrastrable
    _admin.modalMarker = L.marker([currentLat, currentLng], {
      draggable: true
    }).addTo(_admin.modalMap);

    // Círculo de la zona
    _admin.modalCircle = L.circle([currentLat, currentLng], {
      color: '#00ff88',
      fillColor: '#00ff88',
      fillOpacity: 0.15,
      weight: 2,
      radius: currentRadio
    }).addTo(_admin.modalMap);

    // Evento: al arrastrar el marcador
    _admin.modalMarker.on('dragend', function(event) {
      const latlng = event.target.getLatLng();
      const lat = latlng.lat;
      const lng = latlng.lng;
      
      latInput.value = lat.toFixed(6);
      lngInput.value = lng.toFixed(6);
      
      _admin.modalCircle.setLatLng(latlng);
      _admin.modalMap.panTo(latlng);

      // Reverse geocoding para actualizar la dirección
      _reverseGeocode(lat, lng, dirInput);
    });

    // Evento: Autocompletado dinámico al escribir (reemplaza a Google Places)
    const suggestionsList = document.getElementById('address-suggestions');
    let searchTimeout;

    dirInput.addEventListener('input', function(e) {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 3) {
        suggestionsList.hidden = true;
        return;
      }
      
      searchTimeout = setTimeout(() => {
        _fetchSuggestions(query, suggestionsList, dirInput, latInput, lngInput);
      }, 500); // Debounce de 500ms
    });

    // Ocultar sugerencias si se hace clic fuera
    document.addEventListener('click', function(e) {
      if (e.target !== dirInput && e.target !== suggestionsList) {
        suggestionsList.hidden = true;
      }
    });

  } else {
    // Si ya existe, solo actualizamos posiciones
    const newLatLng = [currentLat, currentLng];
    _admin.modalMap.setView(newLatLng, 15);
    _admin.modalMarker.setLatLng(newLatLng);
    _admin.modalCircle.setLatLng(newLatLng);
    _admin.modalCircle.setRadius(currentRadio);
    
    // Forzar actualización del mapa al mostrar el modal
    setTimeout(() => { _admin.modalMap.invalidateSize(); }, 50);
  }
}

/** Obtiene la dirección a partir de las coordenadas usando Nominatim API (gratis) */
async function _reverseGeocode(lat, lng, inputEl) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
    if (!res.ok) throw new Error('Geocoding falló');
    const data = await res.json();
    if (data && data.display_name) {
      // Tomamos solo la parte más relevante de la dirección larga
      const partes = data.display_name.split(',').slice(0, 3).join(',').trim();
      inputEl.value = partes;
    }
  } catch (error) {
    console.error('Error reverse geocoding:', error);
  }
}

/** Obtiene sugerencias de autocompletado desde Nominatim */
async function _fetchSuggestions(query, listEl, inputEl, latInput, lngInput) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`);
    if (!res.ok) throw new Error('Falló fetch sugerencias');
    const data = await res.json();
    
    listEl.innerHTML = '';
    
    if (data && data.length > 0) {
      data.forEach(item => {
        const li = document.createElement('li');
        // Mostrar un resumen amigable
        li.textContent = item.display_name.split(',').slice(0, 4).join(',');
        
        li.addEventListener('click', () => {
          inputEl.value = li.textContent;
          listEl.hidden = true;
          
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const latlng = [lat, lng];
          
          // Actualizar inputs
          latInput.value = lat.toFixed(6);
          lngInput.value = lng.toFixed(6);
          
          // Actualizar mapa
          if (_admin.modalMap && _admin.modalMarker && _admin.modalCircle) {
            _admin.modalMap.panTo(latlng);
            _admin.modalMarker.setLatLng(latlng);
            _admin.modalCircle.setLatLng(latlng);
          }
        });
        
        listEl.appendChild(li);
      });
      listEl.hidden = false;
    } else {
      const li = document.createElement('li');
      li.textContent = "No se encontraron resultados";
      li.style.color = "var(--text-muted)";
      li.style.cursor = "default";
      listEl.appendChild(li);
      listEl.hidden = false;
    }
  } catch (err) {
    console.error('Error sugerencias:', err);
  }
}

/** Estilos de mapa dark para Google Maps SDK */
const _DARK_MAP_STYLE = [
  { elementType: 'geometry',        stylers: [{ color: '#0a1520' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7fa8c0' }] },
  { featureType: 'road',            elementType: 'geometry', stylers: [{ color: '#1a2a3a' }] },
  { featureType: 'water',           elementType: 'geometry', stylers: [{ color: '#061622' }] },
  { featureType: 'poi',             stylers: [{ visibility: 'off' }] }
];

// ═══════════════════════════════════════════════════════════════════
// DATOS MOCK — para desarrollo sin backend
// ═══════════════════════════════════════════════════════════════════
let mockLat = -0.1807;
let mockLng = -78.4678;

function _getMockLocationData(adultId) {
  // Simular movimiento continuo
  mockLat += 0.0005; // Moverse aprox 55 metros al norte en cada polling
  mockLng += 0.0002;

  let estado = 'DENTRO_DE_ZONA';
  if (_admin.safeZone) {
    const dist = _haversineDistance(mockLat, mockLng, _admin.safeZone.latitude, _admin.safeZone.longitude);
    if (dist > _admin.safeZone.radio) {
      estado = 'FUERA_DE_ZONA';
    }
  } else {
    // Si no hay zona segura todavía, vemos la distancia al punto inicial
    const dist = _haversineDistance(mockLat, mockLng, -0.1807, -78.4678);
    if (dist > 300) estado = 'FUERA_DE_ZONA';
  }

  return {
    adultId:    adultId,
    latitude:  mockLat,
    longitude: mockLng,
    accuracy:   15,
    estadoZona: estado,
    fecha:      _formatDate(new Date()),
    hora:       _formatTime(new Date())
  };
}

function _getMockSafeZone(adultId) {
  return {
    id_zona:   1,
    id_adulto: adultId,
    nombre:    'Casa',
    direccion: 'Av. Amazonas N35-17, Quito',
    latitude:  -0.1807,
    longitude: -78.4678,
    radio:     300,
    estado:    true
  };
}

// ═══════════════════════════════════════════════════════════════════
// UTILIDADES
// ═══════════════════════════════════════════════════════════════════

/** Haversine: distancia en metros entre dos coordenadas */
function _haversineDistance(lat1, lng1, lat2, lng2) {
  const R    = 6_371_000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function _formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function _formatTime(date) {
  return `${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}:${String(date.getSeconds()).padStart(2,'0')}`;
}

function _adminLog(msg)      { console.log(`[AdminModule] ${msg}`); }
function _adminLogError(msg) { console.error(`[AdminModule] ❌ ${msg}`); }
