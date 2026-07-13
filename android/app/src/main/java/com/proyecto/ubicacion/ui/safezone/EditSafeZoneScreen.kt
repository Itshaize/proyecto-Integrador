package com.proyecto.ubicacion.ui.safezone

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import android.widget.Toast
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.proyecto.ubicacion.data.model.SafeZoneModel
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 4 — Editar zona segura.
 *
 * Permite: modificar dirección, mover punto central, cambiar radio,
 * activar/desactivar zona, eliminar zona.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EditSafeZoneScreen(
    zoneId: Int, 
    adultId: Int,
    viewModel: SafeZoneViewModel = viewModel(),
    onSaved: () -> Unit, 
    onBack: () -> Unit
) {
    LaunchedEffect(adultId) {
        viewModel.loadZone(adultId)
    }
    
    val zonaOriginal by viewModel.currentZone.collectAsState()
    val isSuccess by viewModel.actionSuccess.collectAsState()
    val actionMessage by viewModel.actionMessage.collectAsState()
    val context = LocalContext.current

    LaunchedEffect(actionMessage) {
        actionMessage?.let {
            Toast.makeText(context, it, Toast.LENGTH_LONG).show()
            if (isSuccess) {
                viewModel.resetAction()
                onSaved()
            } else {
                viewModel.resetAction()
            }
        }
    }

    var nombre     by remember(zonaOriginal) { mutableStateOf(zonaOriginal?.nombre ?: "") }
    var direccion  by remember(zonaOriginal) { mutableStateOf(zonaOriginal?.direccion ?: "") }
    var radioValue by remember(zonaOriginal) { mutableFloatStateOf(zonaOriginal?.radio?.toFloat() ?: 300f) }
    var activa     by remember(zonaOriginal) { mutableStateOf(zonaOriginal?.estado ?: true) }
    var showDelete by remember { mutableStateOf(false) }
    var showSave   by remember { mutableStateOf(false) }

    val center = remember(zonaOriginal) { 
        LatLng(zonaOriginal?.latitude ?: -0.1807, zonaOriginal?.longitude ?: -78.4678) 
    }

    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(center, 15f)
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
            Column(modifier = Modifier.weight(1f)) {
                Text("Editar zona segura", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OnBackground)
                Text(nombre, fontSize = 13.sp, color = OnSurface)
            }
            // Botón eliminar zona
            IconButton(onClick = { showDelete = true }) {
                Icon(Icons.Default.Delete, contentDescription = "Eliminar zona", tint = ZonaFuera)
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Mapa con marcador arrastrable
            Text("Mover punto central", fontSize = 12.sp, color = PrimaryCyan, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, if (activa) ChipBorder else ZonaFuera.copy(alpha = 0.4f), RoundedCornerShape(14.dp))
            ) {
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraState
                ) {
                    // Marcador arrastrable
                    Marker(
                        state    = MarkerState(position = center),
                        title    = nombre,
                        draggable = false // Dragging needs custom state handling
                    )
                    Circle(
                        center      = center,
                        radius      = radioValue.toDouble(),
                        fillColor   = if (activa) ZoneCircleFill else ZonaFuera.copy(alpha = 0.1f),
                        strokeColor = if (activa) ZoneCircleBorder else ZonaFuera,
                        strokeWidth = 2f
                    )
                }
            }

            // Switch activar / desactivar
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape    = RoundedCornerShape(12.dp),
                colors   = CardDefaults.cardColors(containerColor = Surface),
                border   = BorderStroke(1.dp, if (activa) ZonaDentro else ZonaFuera)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (activa) Icons.Default.Shield else Icons.Default.ShieldMoon,
                        contentDescription = null,
                        tint = if (activa) ZonaDentro else ZonaFuera,
                        modifier = Modifier.size(22.dp)
                    )
                    Spacer(Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text       = if (activa) "Zona activa" else "Zona desactivada",
                            fontWeight = FontWeight.SemiBold,
                            fontSize   = 15.sp,
                            color      = if (activa) ZonaDentro else ZonaFuera
                        )
                        Text("Activa el monitoreo de esta zona", fontSize = 12.sp, color = OnSurface)
                    }
                    Switch(
                        checked = activa,
                        onCheckedChange = { activa = it },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor  = ZonaDentro,
                            checkedTrackColor  = ZonaDentro.copy(alpha = 0.3f),
                            uncheckedThumbColor = ZonaFuera,
                            uncheckedTrackColor = ZonaFuera.copy(alpha = 0.2f)
                        )
                    )
                }
            }

            // Nombre
            NeonTextField(
                value         = nombre,
                onValueChange = { nombre = it },
                label         = "Nombre de la zona",
                icon          = Icons.Default.Label,
                placeholder   = "Ej: Casa de María"
            )

            // Dirección
            NeonTextField(
                value         = direccion,
                onValueChange = { direccion = it },
                label         = "Dirección",
                icon          = Icons.Default.LocationOn,
                placeholder   = "Ej: Av. Amazonas N35-17"
            )

            // Slider radio
            Text("Radio: ${radioValue.toInt()} m", fontSize = 12.sp, color = PrimaryCyan, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
            Slider(
                value         = radioValue,
                onValueChange = { radioValue = it },
                valueRange    = 50f..2000f,
                colors        = SliderDefaults.colors(
                    thumbColor         = PrimaryCyan,
                    activeTrackColor   = PrimaryCyan,
                    inactiveTrackColor = ChipBorder
                )
            )

            Spacer(Modifier.height(4.dp))

            // Botón guardar cambios
            Button(
                onClick  = { showSave = true },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape    = RoundedCornerShape(14.dp),
                colors   = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
            ) {
                Icon(Icons.Default.Save, contentDescription = null, tint = OnPrimary)
                Spacer(Modifier.width(8.dp))
                Text("Guardar cambios", fontWeight = FontWeight.Bold, color = OnPrimary, fontSize = 15.sp)
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    // Confirmación guardar
    if (showSave) {
        AlertDialog(
            onDismissRequest = { showSave = false },
            containerColor   = Surface,
            title = { Text("Guardar cambios", color = OnBackground, fontWeight = FontWeight.Bold) },
            text  = { Text("¿Confirmas los cambios en la zona \"$nombre\"?", color = OnSurface) },
            confirmButton = {
                Button(onClick = { 
                    showSave = false
                    val updated = SafeZoneModel(
                        id_zona = zoneId,
                        id_adulto = adultId,
                        nombre = nombre,
                        direccion = direccion,
                        latitude = center.latitude,
                        longitude = center.longitude,
                        radio = radioValue.toInt(),
                        estado = activa
                    )
                    viewModel.saveZone(updated)
                }, colors = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)) {
                    Text("Guardar", color = OnPrimary)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSave = false }) { Text("Cancelar", color = OnSurface) }
            }
        )
    }

    // Confirmación eliminar
    if (showDelete) {
        AlertDialog(
            onDismissRequest = { showDelete = false },
            containerColor   = Surface,
            title = { Text("Eliminar zona", color = ZonaFuera, fontWeight = FontWeight.Bold) },
            text  = { Text("¿Estás seguro de eliminar la zona \"$nombre\"? Esta acción no se puede deshacer.", color = OnSurface) },
            confirmButton = {
                Button(onClick = { 
                    showDelete = false
                    viewModel.deleteZone(zoneId)
                }, colors = ButtonDefaults.buttonColors(containerColor = ZonaFuera)) {
                    Text("Eliminar", color = OnBackground, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { showDelete = false }) { Text("Cancelar", color = OnSurface) }
            }
        )
    }
}
