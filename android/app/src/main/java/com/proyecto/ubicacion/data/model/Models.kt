package com.proyecto.ubicacion.data.model

/**
 * Modelo de ubicación del adulto mayor.
 * Respeta el contrato de datos del proyecto.
 */
data class LocationModel(
    val adultId: Int,
    val latitude: Double,
    val longitude: Double,
    val accuracy: Float,
    val fecha: String,
    val hora: String,
    val estadoZona: ZonaEstado = ZonaEstado.SIN_ACTUALIZACION,
    val direccion: String = ""
)

/**
 * Modelo de zona segura.
 */
data class SafeZoneModel(
    val id_zona: Int = 0,
    val id_adulto: Int,
    val nombre: String,
    val direccion: String,
    val latitude: Double,
    val longitude: Double,
    val radio: Int,           // metros
    val estado: Boolean = true // activa por defecto
)

/**
 * Estados de zona — contrato del proyecto.
 */
enum class ZonaEstado {
    DENTRO_DE_ZONA,
    FUERA_DE_ZONA,
    UBICACION_DESACTIVADA,
    SIN_ACTUALIZACION
}

/**
 * Estados del GPS.
 */
enum class GpsEstado {
    ACTIVO,
    DESACTIVADO,
    PERMISO_DENEGADO,
    NO_DISPONIBLE
}

/**
 * Adulto mayor — recibido del módulo de Ismael.
 */
data class AdultoMayor(
    val adultId: Int,
    val nombre: String
)
