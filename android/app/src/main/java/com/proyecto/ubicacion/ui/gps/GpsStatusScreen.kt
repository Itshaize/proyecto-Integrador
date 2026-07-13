package com.proyecto.ubicacion.ui.gps

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import android.content.Intent
import android.provider.Settings
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.GpsEstado
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 6 — Estado del GPS.
 *
 * Muestra el estado actual del GPS con ícono animado y mensajes claros.
 * Permite ir directamente a Configuración si hay problema.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GpsStatusScreen(onBack: () -> Unit) {
    val context  = LocalContext.current
    val gpsEstado = MockData.gpsEstado

    // Rotación del satélite (solo cuando está activo)
    val rotation by rememberInfiniteTransition(label = "satellite").animateFloat(
        initialValue = 0f,
        targetValue  = if (gpsEstado == GpsEstado.ACTIVO) 360f else 0f,
        animationSpec = infiniteRepeatable(
            animation  = tween(4000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotate_anim"
    )

    // Pulso de señal
    val pulse by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 0.85f,
        targetValue  = 1.05f,
        animationSpec = infiniteRepeatable(
            animation  = tween(1200, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_anim"
    )

    val (statusColor, statusIcon, statusTitle, statusMsg, canFix) = when (gpsEstado) {
        GpsEstado.ACTIVO -> Quint(
            ZonaDentro, Icons.Default.GpsFixed,
            "Ubicación activa",
            "El GPS está funcionando correctamente y enviando coordenadas.",
            false
        )
        GpsEstado.DESACTIVADO -> Quint(
            ZonaWarning, Icons.Default.GpsOff,
            "GPS desactivado",
            "El GPS está apagado. Actívalo en la configuración del dispositivo.",
            true
        )
        GpsEstado.PERMISO_DENEGADO -> Quint(
            ZonaFuera, Icons.Default.Block,
            "Permiso denegado",
            "La aplicación no tiene permiso para acceder a la ubicación. Ve a Ajustes para concederlo.",
            true
        )
        GpsEstado.NO_DISPONIBLE -> Quint(
            ZonaDisabled, Icons.Default.SignalWifiBad,
            "Ubicación no disponible",
            "No se puede obtener la ubicación en este momento. Verifica la señal.",
            false
        )
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .statusBarsPadding()
    ) {
        // Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            IconButton(onClick = onBack) {
                Icon(Icons.Default.ArrowBack, contentDescription = "Regresar", tint = PrimaryCyan)
            }
            Text("Estado del GPS", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OnBackground)
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(28.dp)
        ) {
            Spacer(Modifier.height(32.dp))

            // Ícono de satélite animado
            Box(
                modifier = Modifier.size(160.dp),
                contentAlignment = Alignment.Center
            ) {
                // Anillos de señal (solo en activo)
                if (gpsEstado == GpsEstado.ACTIVO) {
                    Box(
                        modifier = Modifier
                            .size(160.dp)
                            .clip(CircleShape)
                            .background(statusColor.copy(alpha = 0.06f))
                            .border(1.dp, statusColor.copy(alpha = 0.2f), CircleShape)
                    )
                    Box(
                        modifier = Modifier
                            .size(120.dp)
                            .clip(CircleShape)
                            .background(statusColor.copy(alpha = 0.1f))
                            .border(1.dp, statusColor.copy(alpha = 0.4f), CircleShape)
                    )
                }

                // Ícono central
                Box(
                    modifier = Modifier
                        .size(88.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.radialGradient(
                                listOf(statusColor.copy(alpha = 0.3f), statusColor.copy(alpha = 0.05f))
                            )
                        )
                        .border(2.5.dp, statusColor, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector        = statusIcon,
                        contentDescription = null,
                        tint               = statusColor,
                        modifier           = Modifier
                            .size(44.dp)
                            .rotate(if (gpsEstado == GpsEstado.ACTIVO) rotation else 0f)
                    )
                }
            }

            // Título y mensaje
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text       = statusTitle,
                    fontSize   = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = statusColor,
                    textAlign  = TextAlign.Center
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    text      = statusMsg,
                    fontSize  = 15.sp,
                    color     = OnSurface,
                    textAlign = TextAlign.Center,
                    lineHeight = 22.sp
                )
            }

            // Indicadores de señal GPS (solo cuando activo)
            if (gpsEstado == GpsEstado.ACTIVO) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape    = RoundedCornerShape(14.dp),
                    colors   = CardDefaults.cardColors(containerColor = Surface),
                    border   = BorderStroke(1.dp, ZonaDentro.copy(alpha = 0.4f))
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        GpsSignalRow(label = "Señal", value = "Buena", color = ZonaDentro)
                        GpsSignalRow(label = "Precisión", value = "±15 m", color = PrimaryCyan)
                        GpsSignalRow(label = "Última fijación", value = "Hace 10 seg", color = ZonaWarning)
                        GpsSignalRow(label = "Proveedor", value = "GPS + Red", color = OnSurface)
                    }
                }
            }

            Spacer(Modifier.weight(1f))

            // Botón ir a ajustes (solo si hay problema)
            if (canFix) {
                Button(
                    onClick = {
                        val intent = if (gpsEstado == GpsEstado.PERMISO_DENEGADO)
                            Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                        else
                            Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS)
                        context.startActivity(intent)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(54.dp),
                    shape  = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) {
                    Icon(Icons.Default.Settings, contentDescription = null, tint = OnPrimary)
                    Spacer(Modifier.width(8.dp))
                    Text("Ir a Configuración", fontWeight = FontWeight.Bold, color = OnPrimary, fontSize = 15.sp)
                }
            }

            OutlinedButton(
                onClick  = onBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape    = RoundedCornerShape(14.dp),
                border   = BorderStroke(1.dp, ChipBorder)
            ) {
                Text("Volver", color = OnSurface, fontSize = 15.sp)
            }
        }
    }
}

@Composable
fun GpsSignalRow(label: String, value: String, color: Color) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(text = label, fontSize = 13.sp, color = OnSurface, modifier = Modifier.weight(1f))
        Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = color)
    }
}

// Helper 5 valores
data class Quint<A, B, C, D, E>(val first: A, val second: B, val third: C, val fourth: D, val fifth: E)
operator fun <A, B, C, D, E> Quint<A, B, C, D, E>.component1() = first
operator fun <A, B, C, D, E> Quint<A, B, C, D, E>.component2() = second
operator fun <A, B, C, D, E> Quint<A, B, C, D, E>.component3() = third
operator fun <A, B, C, D, E> Quint<A, B, C, D, E>.component4() = fourth
operator fun <A, B, C, D, E> Quint<A, B, C, D, E>.component5() = fifth
