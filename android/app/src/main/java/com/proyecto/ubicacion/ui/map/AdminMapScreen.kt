package com.proyecto.ubicacion.ui.map

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.BitmapDescriptorFactory
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.ZonaEstado
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 1 — Mapa del administrador.
 *
 * Muestra:
 * - Marcador del adulto mayor
 * - Marcador del administrador
 * - Círculo de zona segura
 * - Dirección actual (chip)
 * - Hora de última actualización (chip)
 * - Badge de estado DENTRO / FUERA
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminMapScreen(
    adultId: Int,
    viewModel: AdminMapViewModel = viewModel(),
    onVerDetalle: () -> Unit,
    onCrearZona: () -> Unit,
    onEditarZona: (Int) -> Unit,
    onVerEstado: () -> Unit,
    onGpsStatus: () -> Unit,
    onBack: () -> Unit
) {
    // Escuchar estado del ViewModel
    val ubicacion by viewModel.location.collectAsState()
    val zona by viewModel.safeZone.collectAsState()
    
    // Adulto se puede obtener de donde prefieras, aquí por simplicidad se mockea solo el nombre o se pasa
    val adultoNombre = "Adulto Mayor"

    LaunchedEffect(adultId) {
        viewModel.startPolling(adultId)
    }

    val adultoPos = ubicacion?.let { LatLng(it.latitude, it.longitude) }
        ?: LatLng(-0.1807, -78.4678)
    
    // Posición estática para el admin por ahora
    val adminPos = LatLng(-0.1790, -78.4650)

    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(adultoPos, 15f)
    }

    val mapProperties = MapProperties(
        mapType       = MapType.NORMAL,
        isMyLocationEnabled = false
    )

    val mapUiSettings = MapUiSettings(
        zoomControlsEnabled  = false,
        compassEnabled       = true,
        myLocationButtonEnabled = false
    )

    Box(modifier = Modifier.fillMaxSize()) {
        // ── Mapa ──────────────────────────────────────────────────────
        GoogleMap(
            modifier       = Modifier.fillMaxSize(),
            cameraPositionState = cameraState,
            properties     = mapProperties,
            uiSettings     = mapUiSettings
        ) {
            // Marcador: Adulto mayor
            adultoPos.let {
                Marker(
                    state  = MarkerState(position = it),
                    title  = adultoNombre,
                    icon   = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_CYAN),
                    snippet = "${ubicacion?.fecha} ${ubicacion?.hora}"
                )
            }

            // Marcador: Administrador
            Marker(
                state  = MarkerState(position = adminPos),
                title  = "Administrador",
                icon   = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_AZURE)
            )

            // Círculo de zona segura
            zona?.let { z ->
                Circle(
                    center      = LatLng(z.latitude, z.longitude),
                    radius      = z.radio.toDouble(),
                    fillColor   = ZoneCircleFill,
                    strokeColor = ZoneCircleBorder,
                    strokeWidth = 3f
                )
                // Marcador del centro de la zona
                Marker(
                    state   = MarkerState(position = LatLng(z.latitude, z.longitude)),
                    title   = z.nombre,
                    snippet = "Radio: ${z.radio}m",
                    icon    = BitmapDescriptorFactory.defaultMarker(BitmapDescriptorFactory.HUE_GREEN)
                )
            }
        }

        // ── Capa de UI sobre el mapa ───────────────────────────────────
        Column(modifier = Modifier.fillMaxSize()) {

            // TopBar translúcida
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Background.copy(alpha = 0.85f))
                    .statusBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 10.dp)
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector        = Icons.Default.ArrowBack,
                            contentDescription = "Regresar",
                            tint               = PrimaryCyan
                        )
                    }
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text       = adultoNombre,
                            fontWeight = FontWeight.Bold,
                            fontSize   = 16.sp,
                            color      = OnBackground
                        )
                        Text(
                            text     = "Mapa de ubicación",
                            fontSize = 12.sp,
                            color    = OnSurface
                        )
                    }
                    // Botón GPS status
                    IconButton(onClick = onGpsStatus) {
                        Icon(
                            imageVector        = Icons.Default.GpsFixed,
                            contentDescription = "Estado GPS",
                            tint               = ZonaDentro
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            // ── Chips de información ──────────────────────────────────
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Badge de estado DENTRO / FUERA
                ubicacion?.let {
                    val (bgColor, label, icon) = when (it.estadoZona) {
                        ZonaEstado.DENTRO_DE_ZONA        -> Triple(ZonaDentro, "DENTRO DE ZONA ✓", Icons.Default.CheckCircle)
                        ZonaEstado.FUERA_DE_ZONA         -> Triple(ZonaFuera, "FUERA DE ZONA ⚠", Icons.Default.Warning)
                        ZonaEstado.UBICACION_DESACTIVADA -> Triple(ZonaDisabled, "GPS DESACTIVADO", Icons.Default.GpsOff)
                        ZonaEstado.SIN_ACTUALIZACION     -> Triple(ZonaWarning, "SIN ACTUALIZACIÓN", Icons.Default.AccessTime)
                    }
                    StatusBadge(color = bgColor, label = label, onClick = onVerEstado)
                }

                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    // Dirección
                    InfoChip(
                        icon  = Icons.Default.LocationOn,
                        text  = ubicacion?.direccion ?: "Dirección no disponible",
                        modifier = Modifier.weight(1f)
                    )
                    // Hora
                    InfoChip(
                        icon = Icons.Default.AccessTime,
                        text = ubicacion?.hora ?: "--:--"
                    )
                }
            }

            // ── Bottom bar de acciones ────────────────────────────────
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Background.copy(alpha = 0.92f))
                    .navigationBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MapActionButton(
                    icon    = Icons.Default.Info,
                    label   = "Detalle",
                    onClick = onVerDetalle
                )
                MapActionButton(
                    icon    = Icons.Default.AddCircle,
                    label   = "Crear zona",
                    onClick = onCrearZona
                )
                zona?.let {
                    MapActionButton(
                        icon    = Icons.Default.Edit,
                        label   = "Editar zona",
                        onClick = { onEditarZona(it.id_zona) }
                    )
                }
            }
        }
    }
}

@Composable
fun StatusBadge(color: Color, label: String, onClick: () -> Unit) {
    Button(
        onClick = onClick,
        colors = ButtonDefaults.buttonColors(containerColor = color.copy(alpha = 0.18f)),
        shape  = RoundedCornerShape(12.dp),
        border = BorderStroke(1.5.dp, color),
        modifier = Modifier.fillMaxWidth()
    ) {
        Text(
            text       = label,
            color      = color,
            fontWeight = FontWeight.Bold,
            fontSize   = 14.sp
        )
    }
}

@Composable
fun InfoChip(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String, modifier: Modifier = Modifier) {
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(10.dp))
            .background(ChipBackground)
            .border(1.dp, ChipBorder, RoundedCornerShape(10.dp))
            .padding(horizontal = 10.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(imageVector = icon, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(14.dp))
        Spacer(modifier = Modifier.width(6.dp))
        Text(text = text, fontSize = 11.sp, color = OnSurface, maxLines = 1)
    }
}

@Composable
fun MapActionButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, onClick: () -> Unit) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        IconButton(
            onClick  = onClick,
            modifier = Modifier
                .size(52.dp)
                .clip(CircleShape)
                .background(SurfaceVariant)
                .border(1.dp, ChipBorder, CircleShape)
        ) {
            Icon(imageVector = icon, contentDescription = label, tint = PrimaryCyan, modifier = Modifier.size(24.dp))
        }
        Text(text = label, fontSize = 10.sp, color = OnSurface)
    }
}
