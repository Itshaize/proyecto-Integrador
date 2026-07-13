package com.proyecto.ubicacion.service

import com.proyecto.ubicacion.data.model.ZonaEstado

/**
 * Contrato de integración con Juan.
 * Mantiene el estado global de la ubicación y la zona para que
 * los módulos de SOS y Rutas puedan leerlo de manera síncrona.
 */
object SharedState {
    var adultId: Int = -1
    var latitude: Double = 0.0
    var longitude: Double = 0.0
    var estadoZona: String = ZonaEstado.SIN_ACTUALIZACION.name

    /**
     * Retorna el estado en el formato requerido por el contrato:
     * {
     *   "adultId": 1,
     *   "latitude": -0.1807,
     *   "longitude": -78.4678,
     *   "estadoZona": "FUERA_DE_ZONA"
     * }
     */
    fun getSnapshot(): Map<String, Any> {
        return mapOf(
            "adultId" to adultId,
            "latitude" to latitude,
            "longitude" to longitude,
            "estadoZona" to estadoZona
        )
    }

    /**
     * Actualiza el estado global.
     */
    fun update(id: Int, lat: Double, lng: Double, estado: ZonaEstado) {
        adultId = id
        latitude = lat
        longitude = lng
        estadoZona = estado.name
    }
}
