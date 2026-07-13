package com.proyecto.ubicacion.ui.status

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
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.ZonaEstado
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 5 — Estado de seguridad.
 *
 * Muestra el estado actual del adulto mayor:
 * DENTRO_DE_ZONA / FUERA_DE_ZONA / UBICACION_DESACTIVADA / SIN_ACTUALIZACION
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SecurityStatusScreen(adultId: Int, onBack: () -> Unit) {
    val ubicacion = MockData.ubicaciones[adultId]
    val adulto    = MockData.adultos.firstOrNull { it.adultId == adultId }
    val zona      = MockData.zonasSeguras.firstOrNull { it.id_adulto == adultId }
    val estado    = ubicacion?.estadoZona ?: ZonaEstado.SIN_ACTUALIZACION

    // Pulsación animada para estados de alerta
    val pulse by rememberInfiniteTransition(label = "pulse").animateFloat(
        initialValue = 1f,
        targetValue  = if (estado == ZonaEstado.FUERA_DE_ZONA) 1.08f else 1f,
        animationSpec = infiniteRepeatable(
            animation  = tween(800, easing = EaseInOut),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse_anim"
    )

    val (statusColor, statusIcon, statusTitle, statusSub) = when (estado) {
        ZonaEstado.DENTRO_DE_ZONA -> Quad(
            ZonaDentro, Icons.Default.CheckCircle,
            "DENTRO DE ZONA", "El adulto mayor está en un lugar seguro"
        )
        ZonaEstado.FUERA_DE_ZONA -> Quad(
            ZonaFuera, Icons.Default.Warning,
            "FUERA DE ZONA", "¡El adulto mayor ha salido de la zona segura!"
        )
        ZonaEstado.UBICACION_DESACTIVADA -> Quad(
            ZonaDisabled, Icons.Default.GpsOff,
            "GPS DESACTIVADO", "No se puede verificar la ubicación"
        )
        ZonaEstado.SIN_ACTUALIZACION -> Quad(
            ZonaWarning, Icons.Default.AccessTime,
            "SIN ACTUALIZACIÓN", "No se reciben datos recientes"
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
            Column {
                Text("Estado de seguridad", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OnBackground)
                Text(adulto?.nombre ?: "Adulto Mayor", fontSize = 13.sp, color = OnSurface)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(24.dp)
        ) {
            Spacer(Modifier.height(24.dp))

            // Ícono de estado grande con animación
            Box(
                modifier = Modifier
                    .size(140.dp)
                    .scale(pulse)
                    .clip(CircleShape)
                    .background(
                        Brush.radialGradient(
                            listOf(statusColor.copy(alpha = 0.3f), statusColor.copy(alpha = 0.05f))
                        )
                    )
                    .border(3.dp, statusColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector        = statusIcon,
                    contentDescription = null,
                    tint               = statusColor,
                    modifier           = Modifier.size(72.dp)
                )
            }

            // Título y subtítulo
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text       = statusTitle,
                    fontSize   = 26.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color      = statusColor,
                    textAlign  = TextAlign.Center
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    text      = statusSub,
                    fontSize  = 15.sp,
                    color     = OnSurface,
                    textAlign = TextAlign.Center
                )
            }

            // Info cards
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                StatusInfoCard(icon = Icons.Default.Person,      label = "Adulto mayor", value = adulto?.nombre ?: "-")
                StatusInfoCard(icon = Icons.Default.AccessTime,  label = "Última actualización", value = "${ubicacion?.fecha ?: "-"} ${ubicacion?.hora ?: ""}")
                StatusInfoCard(icon = Icons.Default.Shield,      label = "Zona asignada", value = zona?.nombre ?: "Sin zona configurada")
                StatusInfoCard(icon = Icons.Default.RadioButtonChecked, label = "Radio de zona", value = zona?.let { "${it.radio} m" } ?: "-")
            }

            Spacer(Modifier.weight(1f))

            // Botón volver al mapa
            OutlinedButton(
                onClick  = onBack,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                shape    = RoundedCornerShape(14.dp),
                border   = BorderStroke(1.5.dp, PrimaryCyan)
            ) {
                Icon(Icons.Default.Map, contentDescription = null, tint = PrimaryCyan)
                Spacer(Modifier.width(8.dp))
                Text("Ver en mapa", color = PrimaryCyan, fontWeight = FontWeight.SemiBold, fontSize = 15.sp)
            }
        }
    }
}

@Composable
fun StatusInfoCard(icon: ImageVector, label: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(containerColor = Surface),
        border   = BorderStroke(1.dp, ChipBorder)
    ) {
        Row(
            modifier          = Modifier.padding(horizontal = 16.dp, vertical = 13.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(12.dp))
            Text(text = label, fontSize = 13.sp, color = OnSurface, modifier = Modifier.weight(1f))
            Text(text = value, fontSize = 14.sp, fontWeight = FontWeight.SemiBold, color = OnBackground)
        }
    }
}

// Helper para destructuring de 4 valores
data class Quad<A, B, C, D>(val first: A, val second: B, val third: C, val fourth: D)
operator fun <A, B, C, D> Quad<A, B, C, D>.component1() = first
operator fun <A, B, C, D> Quad<A, B, C, D>.component2() = second
operator fun <A, B, C, D> Quad<A, B, C, D>.component3() = third
operator fun <A, B, C, D> Quad<A, B, C, D>.component4() = fourth
