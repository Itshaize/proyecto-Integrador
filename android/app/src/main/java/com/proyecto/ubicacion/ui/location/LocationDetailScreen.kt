package com.proyecto.ubicacion.ui.location

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.LocationModel
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 2 — Detalle de ubicación.
 *
 * Muestra latitud, longitud, precisión, fecha, hora y dirección aproximada
 * del adulto mayor seleccionado.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocationDetailScreen(adultId: Int, onBack: () -> Unit) {
    val ubicacion = MockData.ubicaciones[adultId]
    val adulto    = MockData.adultos.firstOrNull { it.adultId == adultId }

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
                Text("Detalle de ubicación", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OnBackground)
                Text(adulto?.nombre ?: "Adulto Mayor", fontSize = 13.sp, color = OnSurface)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp, vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (ubicacion == null) {
                NoDataCard()
            } else {
                // Coordenadas
                SectionHeader(title = "Coordenadas GPS")
                DetailRow(icon = Icons.Default.MyLocation,    label = "Latitud",    value = "${ubicacion.latitude}°")
                DetailRow(icon = Icons.Default.MyLocation,    label = "Longitud",   value = "${ubicacion.longitude}°")
                DetailRow(icon = Icons.Default.GpsFixed,      label = "Precisión",  value = "±${ubicacion.accuracy.toInt()} m")

                Divider(color = Outline, modifier = Modifier.padding(vertical = 4.dp))

                // Fecha y hora
                SectionHeader(title = "Última actualización")
                DetailRow(icon = Icons.Default.CalendarToday, label = "Fecha",      value = ubicacion.fecha)
                DetailRow(icon = Icons.Default.AccessTime,    label = "Hora",       value = ubicacion.hora)

                Divider(color = Outline, modifier = Modifier.padding(vertical = 4.dp))

                // Dirección
                SectionHeader(title = "Dirección aproximada")
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape    = RoundedCornerShape(12.dp),
                    colors   = CardDefaults.cardColors(containerColor = Surface),
                    border   = BorderStroke(1.dp, ChipBorder)
                ) {
                    Row(
                        modifier = Modifier.padding(16.dp),
                        verticalAlignment = Alignment.Top
                    ) {
                        Icon(
                            imageVector        = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint               = PrimaryCyan,
                            modifier           = Modifier.size(20.dp)
                        )
                        Spacer(Modifier.width(12.dp))
                        Text(
                            text     = ubicacion.direccion.ifEmpty { "Dirección no disponible" },
                            fontSize = 15.sp,
                            color    = OnBackground,
                            lineHeight = 22.sp
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                // Botón: Ver en mapa
                Button(
                    onClick  = onBack, // Regresa al mapa
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    shape    = RoundedCornerShape(14.dp),
                    colors   = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) {
                    Icon(Icons.Default.Map, contentDescription = null, tint = OnPrimary)
                    Spacer(Modifier.width(8.dp))
                    Text("Ver en mapa", fontWeight = FontWeight.Bold, color = OnPrimary, fontSize = 15.sp)
                }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String) {
    Text(
        text       = title,
        fontSize   = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color      = PrimaryCyan,
        letterSpacing = 1.sp
    )
}

@Composable
fun DetailRow(icon: ImageVector, label: String, value: String) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(10.dp),
        colors   = CardDefaults.cardColors(containerColor = Surface),
        border   = BorderStroke(1.dp, ChipBorder)
    ) {
        Row(
            modifier          = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(imageVector = icon, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(12.dp))
            Text(text = label, fontSize = 14.sp, color = OnSurface, modifier = Modifier.weight(1f))
            Text(text = value, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, color = OnBackground)
        }
    }
}

@Composable
fun NoDataCard() {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape    = RoundedCornerShape(12.dp),
        colors   = CardDefaults.cardColors(containerColor = Surface),
        border   = BorderStroke(1.dp, ZonaWarning)
    ) {
        Column(
            modifier            = Modifier.padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Icon(Icons.Default.Warning, contentDescription = null, tint = ZonaWarning, modifier = Modifier.size(36.dp))
            Spacer(Modifier.height(8.dp))
            Text("No hay datos de ubicación disponibles", fontSize = 14.sp, color = ZonaWarning)
        }
    }
}
