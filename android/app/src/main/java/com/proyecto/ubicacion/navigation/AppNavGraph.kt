package com.proyecto.ubicacion.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.proyecto.ubicacion.ui.gps.GpsStatusScreen
import com.proyecto.ubicacion.ui.location.LocationDetailScreen
import com.proyecto.ubicacion.ui.map.AdminMapScreen
import com.proyecto.ubicacion.ui.safezone.CreateSafeZoneScreen
import com.proyecto.ubicacion.ui.safezone.EditSafeZoneScreen
import com.proyecto.ubicacion.ui.status.SecurityStatusScreen
import com.proyecto.ubicacion.ui.adulto.AdultoListScreen

@Composable
fun AppNavGraph(navController: NavHostController) {
    NavHost(
        navController    = navController,
        startDestination = Screen.AdultoList.route
    ) {
        // Selección de adulto mayor
        composable(Screen.AdultoList.route) {
            AdultoListScreen(
                onAdultoSelected = { adultId ->
                    navController.navigate(Screen.AdminMap.createRoute(adultId))
                }
            )
        }

        // Pantalla 1 — Mapa del administrador
        composable(
            route     = Screen.AdminMap.route,
            arguments = listOf(navArgument("adultId") { type = NavType.IntType })
        ) { backStack ->
            val adultId = backStack.arguments?.getInt("adultId") ?: 1
            AdminMapScreen(
                adultId = adultId,
                onVerDetalle    = { navController.navigate(Screen.LocationDetail.createRoute(adultId)) },
                onCrearZona     = { navController.navigate(Screen.CreateSafeZone.createRoute(adultId)) },
                onEditarZona    = { zoneId -> navController.navigate(Screen.EditSafeZone.createRoute(zoneId)) },
                onVerEstado     = { navController.navigate(Screen.SecurityStatus.createRoute(adultId)) },
                onGpsStatus     = { navController.navigate(Screen.GpsStatus.route) },
                onBack          = { navController.popBackStack() }
            )
        }

        // Pantalla 2 — Detalle de ubicación
        composable(
            route     = Screen.LocationDetail.route,
            arguments = listOf(navArgument("adultId") { type = NavType.IntType })
        ) { backStack ->
            val adultId = backStack.arguments?.getInt("adultId") ?: 1
            LocationDetailScreen(
                adultId = adultId,
                onBack  = { navController.popBackStack() }
            )
        }

        // Pantalla 3 — Crear zona segura
        composable(
            route     = Screen.CreateSafeZone.route,
            arguments = listOf(navArgument("adultId") { type = NavType.IntType })
        ) { backStack ->
            val adultId = backStack.arguments?.getInt("adultId") ?: 1
            CreateSafeZoneScreen(
                adultId   = adultId,
                onSaved   = { navController.popBackStack() },
                onBack    = { navController.popBackStack() }
            )
        }

        // Pantalla 4 — Editar zona segura
        composable(
            route     = Screen.EditSafeZone.route,
            arguments = listOf(navArgument("zoneId") { type = NavType.IntType })
        ) { backStack ->
            val zoneId = backStack.arguments?.getInt("zoneId") ?: 1
            EditSafeZoneScreen(
                zoneId  = zoneId,
                onSaved = { navController.popBackStack() },
                onBack  = { navController.popBackStack() }
            )
        }

        // Pantalla 5 — Estado de seguridad
        composable(
            route     = Screen.SecurityStatus.route,
            arguments = listOf(navArgument("adultId") { type = NavType.IntType })
        ) { backStack ->
            val adultId = backStack.arguments?.getInt("adultId") ?: 1
            SecurityStatusScreen(
                adultId = adultId,
                onBack  = { navController.popBackStack() }
            )
        }

        // Pantalla 6 — Estado del GPS
        composable(Screen.GpsStatus.route) {
            GpsStatusScreen(onBack = { navController.popBackStack() })
        }
    }
}
