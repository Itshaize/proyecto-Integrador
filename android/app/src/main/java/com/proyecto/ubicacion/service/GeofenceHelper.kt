package com.proyecto.ubicacion.service

import com.proyecto.ubicacion.data.model.ZonaEstado
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.sin
import kotlin.math.sqrt

object GeofenceHelper {
    
    /**
     * Calcula la distancia en metros entre dos coordenadas usando la fórmula de Haversine.
     */
    fun calculateDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double): Double {
        val R = 6371e3 // Radio de la tierra en metros
        val phi1 = Math.toRadians(lat1)
        val phi2 = Math.toRadians(lat2)
        val deltaPhi = Math.toRadians(lat2 - lat1)
        val deltaLambda = Math.toRadians(lon2 - lon1)

        val a = sin(deltaPhi / 2) * sin(deltaPhi / 2) +
                cos(phi1) * cos(phi2) *
                sin(deltaLambda / 2) * sin(deltaLambda / 2)
        val c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
    }

    /**
     * Determina el estado de la zona en base a la ubicación actual y la zona segura configurada.
     */
    fun determineZoneState(currentLat: Double, currentLon: Double, zoneLat: Double, zoneLon: Double, radius: Int): ZonaEstado {
        val distance = calculateDistance(currentLat, currentLon, zoneLat, zoneLon)
        return if (distance <= radius) {
            ZonaEstado.DENTRO_DE_ZONA
        } else {
            ZonaEstado.FUERA_DE_ZONA
        }
    }
}
