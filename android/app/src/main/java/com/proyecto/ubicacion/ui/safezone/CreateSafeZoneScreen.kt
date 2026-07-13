package com.proyecto.ubicacion.ui.safezone

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.android.gms.maps.model.CameraPosition
import com.google.android.gms.maps.model.LatLng
import com.google.maps.android.compose.*
import com.proyecto.ubicacion.data.mock.MockData
import com.proyecto.ubicacion.data.model.SafeZoneModel
import com.proyecto.ubicacion.ui.theme.*

/**
 * Pantalla 3 — Crear zona segura.
 *
 * Campos: nombre, dirección, lat, lng, radio, adulto asignado.
 * Incluye un mapa inline para confirmar el punto central.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreateSafeZoneScreen(
    adultId: Int, 
    viewModel: SafeZoneViewModel = viewModel(),
    onSaved: () -> Unit, 
    onBack: () -> Unit
) {
    var nombre     by remember { mutableStateOf("") }
    var direccion  by remember { mutableStateOf("") }
    var latitud    by remember { mutableStateOf("-0.1807") }
    var longitud   by remember { mutableStateOf("-78.4678") }
    var radioValue by remember { mutableFloatStateOf(300f) }
    var showConfirm by remember { mutableStateOf(false) }

    val lat = latitud.toDoubleOrNull() ?: -0.1807
    val lng = longitud.toDoubleOrNull() ?: -78.4678
    val center = LatLng(lat, lng)

    val cameraState = rememberCameraPositionState {
        position = CameraPosition.fromLatLngZoom(center, 15f)
    }

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
                Text("Crear zona segura", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = OnBackground)
                Text(
                    MockData.adultos.firstOrNull { it.adultId == adultId }?.nombre ?: "Adulto Mayor",
                    fontSize = 13.sp, color = OnSurface
                )
            }
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            // Mapa inline para seleccionar punto
            Text("Punto central en el mapa", fontSize = 12.sp, color = PrimaryCyan, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .clip(RoundedCornerShape(14.dp))
                    .border(1.dp, ChipBorder, RoundedCornerShape(14.dp))
            ) {
                GoogleMap(
                    modifier = Modifier.fillMaxSize(),
                    cameraPositionState = cameraState
                ) {
                    Marker(state = MarkerState(position = center), title = nombre.ifEmpty { "Nueva zona" })
                    Circle(
                        center      = center,
                        radius      = radioValue.toDouble(),
                        fillColor   = ZoneCircleFill,
                        strokeColor = ZoneCircleBorder,
                        strokeWidth = 2f
                    )
                }
            }

            // Nombre de la zona
            NeonTextField(
                value       = nombre,
                onValueChange = { nombre = it },
                label       = "Nombre de la zona",
                icon        = Icons.Default.Label,
                placeholder = "Ej: Casa de María"
            )

            // Dirección
            NeonTextField(
                value       = direccion,
                onValueChange = { direccion = it },
                label       = "Dirección",
                icon        = Icons.Default.LocationOn,
                placeholder = "Ej: Av. Amazonas N35-17, Quito"
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                NeonTextField(
                    value         = latitud,
                    onValueChange = { latitud = it },
                    label         = "Latitud",
                    icon          = Icons.Default.MyLocation,
                    placeholder   = "-0.1807",
                    keyboardType  = KeyboardType.Decimal,
                    modifier      = Modifier.weight(1f)
                )
                NeonTextField(
                    value         = longitud,
                    onValueChange = { longitud = it },
                    label         = "Longitud",
                    icon          = Icons.Default.MyLocation,
                    placeholder   = "-78.4678",
                    keyboardType  = KeyboardType.Decimal,
                    modifier      = Modifier.weight(1f)
                )
            }

            // Slider radio
            Text("Radio: ${radioValue.toInt()} m", fontSize = 12.sp, color = PrimaryCyan, fontWeight = FontWeight.SemiBold, letterSpacing = 1.sp)
            Slider(
                value         = radioValue,
                onValueChange = { radioValue = it },
                valueRange    = 50f..2000f,
                colors        = SliderDefaults.colors(
                    thumbColor       = PrimaryCyan,
                    activeTrackColor = PrimaryCyan,
                    inactiveTrackColor = ChipBorder
                )
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("50 m", fontSize = 11.sp, color = OnSurface)
                Text("2000 m", fontSize = 11.sp, color = OnSurface)
            }

            Spacer(Modifier.height(4.dp))

            // Botón guardar
            Button(
                onClick  = { if (nombre.isNotBlank()) showConfirm = true },
                enabled  = nombre.isNotBlank(),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape    = RoundedCornerShape(14.dp),
                colors   = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
            ) {
                Icon(Icons.Default.Save, contentDescription = null, tint = OnPrimary)
                Spacer(Modifier.width(8.dp))
                Text("Guardar zona segura", fontWeight = FontWeight.Bold, color = OnPrimary, fontSize = 15.sp)
            }

            Spacer(Modifier.height(24.dp))
        }
    }

    // Diálogo de confirmación
    if (showConfirm) {
        AlertDialog(
            onDismissRequest = { showConfirm = false },
            containerColor   = Surface,
            title = { Text("Confirmar zona", color = OnBackground, fontWeight = FontWeight.Bold) },
            text  = {
                Text(
                    "¿Deseas guardar la zona \"$nombre\" con un radio de ${radioValue.toInt()} metros?",
                    color = OnSurface
                )
            },
            confirmButton = {
                Button(
                    onClick = { 
                        showConfirm = false
                        val newZone = SafeZoneModel(
                            id_zona = 0,
                            id_adulto = adultId,
                            nombre = nombre,
                            direccion = direccion,
                            latitude = center.latitude,
                            longitude = center.longitude,
                            radio = radioValue.toInt(),
                            estado = true
                        )
                        viewModel.saveZone(newZone)
                    },
                    colors  = ButtonDefaults.buttonColors(containerColor = PrimaryCyan)
                ) { Text("Guardar", color = OnPrimary) }
            },
            dismissButton = {
                TextButton(onClick = { showConfirm = false }) {
                    Text("Cancelar", color = OnSurface)
                }
            }
        )
    }
}

// Componente reutilizable de campo de texto neon
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NeonTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    modifier: Modifier = Modifier
) {
    OutlinedTextField(
        value         = value,
        onValueChange = onValueChange,
        label         = { Text(label, fontSize = 12.sp) },
        placeholder   = { Text(placeholder, fontSize = 13.sp) },
        leadingIcon   = { Icon(imageVector = icon, contentDescription = null, tint = PrimaryCyan, modifier = Modifier.size(18.dp)) },
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        modifier      = modifier.fillMaxWidth(),
        shape         = RoundedCornerShape(12.dp),
        colors        = OutlinedTextFieldDefaults.colors(
            focusedBorderColor    = PrimaryCyan,
            unfocusedBorderColor  = ChipBorder,
            focusedLabelColor     = PrimaryCyan,
            unfocusedLabelColor   = OnSurface,
            cursorColor           = PrimaryCyan,
            focusedTextColor      = OnBackground,
            unfocusedTextColor    = OnBackground,
            focusedContainerColor = Surface,
            unfocusedContainerColor = Surface
        )
    )
}
