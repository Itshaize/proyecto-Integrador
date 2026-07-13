package com.proyecto.ubicacion.navigation

/**
 * Rutas de navegación de la app.
 */
sealed class Screen(val route: String) {
    object AdminMap        : Screen("admin_map/{adultId}") {
        fun createRoute(adultId: Int) = "admin_map/$adultId"
    }
    object LocationDetail  : Screen("location_detail/{adultId}") {
        fun createRoute(adultId: Int) = "location_detail/$adultId"
    }
    object CreateSafeZone  : Screen("create_safe_zone/{adultId}") {
        fun createRoute(adultId: Int) = "create_safe_zone/$adultId"
    }
    object EditSafeZone    : Screen("edit_safe_zone/{zoneId}") {
        fun createRoute(zoneId: Int) = "edit_safe_zone/$zoneId"
    }
    object SecurityStatus  : Screen("security_status/{adultId}") {
        fun createRoute(adultId: Int) = "security_status/$adultId"
    }
    object GpsStatus       : Screen("gps_status")
    object AdultoList      : Screen("adulto_list")
}
