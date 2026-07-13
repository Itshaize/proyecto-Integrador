package com.proyecto.ubicacion.data.mock

import com.proyecto.ubicacion.data.model.*

/**
 * Datos simulados para desarrollo mientras el backend no está disponible.
 * Coordenadas centradas en Quito, Ecuador.
 */
object MockData {

    // Adultos mayores registrados (máximo 2, según el proyecto)
    val adultos = listOf(
        AdultoMayor(adultId = 1, nombre = "María Guzmán"),
        AdultoMayor(adultId = 2, nombre = "Roberto Sánchez")
    )

    // Última ubicación conocida de cada adulto
    val ubicaciones = mapOf(
        1 to LocationModel(
            adultId    = 1,
            latitude   = -0.1807,
            longitude  = -78.4678,
            accuracy   = 15.0f,
            fecha      = "2026-07-13",
            hora       = "22:30:00",
            estadoZona = ZonaEstado.DENTRO_DE_ZONA,
            direccion  = "Av. Amazonas N35-17, Quito"
        ),
        2 to LocationModel(
            adultId    = 2,
            latitude   = -0.2005,
            longitude  = -78.4955,
            accuracy   = 22.0f,
            fecha      = "2026-07-13",
            hora       = "22:15:00",
            estadoZona = ZonaEstado.FUERA_DE_ZONA,
            direccion  = "Av. 10 de Agosto, La Mariscal, Quito"
        )
    )

    // Zonas seguras configuradas
    val zonasSeguras = listOf(
        SafeZoneModel(
            id_zona   = 1,
            id_adulto = 1,
            nombre    = "Casa de María",
            direccion = "Av. Amazonas N35-17, Quito",
            latitude  = -0.1807,
            longitude = -78.4678,
            radio     = 300,
            estado    = true
        ),
        SafeZoneModel(
            id_zona   = 2,
            id_adulto = 2,
            nombre    = "Casa de Roberto",
            direccion = "Av. 10 de Agosto 1234, Quito",
            latitude  = -0.1950,
            longitude = -78.4900,
            radio     = 500,
            estado    = true
        )
    )

    // Estado del GPS simulado
    val gpsEstado = GpsEstado.ACTIVO

    // Coordenadas del administrador (para mostrarse en el mapa)
    val adminLatitude  = -0.1750
    val adminLongitude = -78.4800
}
