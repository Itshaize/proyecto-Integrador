package com.proyecto.ubicacion.ui.adulto

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Person
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.AdultoMayor
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla de selección de adulto mayor (punto de entrada del módulo).
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdultoListScreen(onAdultoSelected: (Int) -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(top = 56.dp)
    ) {
        // Header
        Column(modifier = Modifier.padding(horizontal = 24.dp, vertical = 16.dp)) {
            Text(
                text       = "Ubicación",
                fontSize   = 28.sp,
                fontWeight = FontWeight.Bold,
                color      = PrimaryCyan
            )
            Text(
                text     = "Selecciona un adulto mayor",
                fontSize = 15.sp,
                color    = OnSurface
            )
        }

        Spacer(modifier = Modifier.height(8.dp))

        LazyColumn(
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            items(MockData.adultos) { adulto ->
                AdultoCard(adulto = adulto, onClick = { onAdultoSelected(adulto.adultId) })
            }
        }
    }
}

@Composable
fun AdultoCard(adulto: AdultoMayor, onClick: () -> Unit) {
    val ubicacion = MockData.ubicaciones[adulto.adultId]
    val statusColor = when (ubicacion?.estadoZona?.name) {
        "DENTRO_DE_ZONA"       -> ZonaDentro
        "FUERA_DE_ZONA"        -> ZonaFuera
        "UBICACION_DESACTIVADA"-> ZonaDisabled
        else                    -> ZonaWarning
    }
    val statusLabel = when (ubicacion?.estadoZona?.name) {
        "DENTRO_DE_ZONA"       -> "Dentro de zona"
        "FUERA_DE_ZONA"        -> "Fuera de zona ⚠"
        "UBICACION_DESACTIVADA"-> "GPS desactivado"
        else                    -> "Sin actualización"
    }

    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable { onClick() },
        shape  = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = Surface),
        border = BorderStroke(1.dp, ChipBorder)
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Avatar
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .clip(CircleShape)
                    .background(
                        Brush.linearGradient(listOf(PrimaryCyan.copy(alpha = 0.3f), SurfaceVariant))
                    )
                    .border(2.dp, statusColor, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector        = Icons.Default.Person,
                    contentDescription = null,
                    tint               = PrimaryCyan,
                    modifier           = Modifier.size(28.dp)
                )
            }

            Spacer(modifier = Modifier.width(16.dp))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text       = adulto.nombre,
                    fontWeight = FontWeight.SemiBold,
                    fontSize   = 16.sp,
                    color      = OnBackground
                )
                Text(
                    text     = ubicacion?.direccion ?: "Ubicación no disponible",
                    fontSize = 12.sp,
                    color    = OnSurface,
                    maxLines = 1
                )
            }

            Spacer(modifier = Modifier.width(8.dp))

            // Badge de estado
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(50))
                    .background(statusColor.copy(alpha = 0.15f))
                    .border(1.dp, statusColor, RoundedCornerShape(50))
                    .padding(horizontal = 10.dp, vertical = 4.dp)
            ) {
                Text(text = statusLabel, fontSize = 11.sp, color = statusColor, fontWeight = FontWeight.SemiBold)
            }
        }
    }
}
