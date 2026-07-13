package com.proyecto.ubicacion.ui.adulto

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import androidx.lifecycle.viewmodel.compose.viewModel

@Composable
fun AdultoScreen(
    adultId: Int,
    viewModel: AdultoViewModel = viewModel(),
    onSosClick: () -> Unit,
    onBack: () -> Unit
) {
    val context = LocalContext.current
    val isTracking by viewModel.isTracking.collectAsState()
    val lastLocation by viewModel.lastSentLocation.collectAsState()

    var permissionGranted by remember { mutableStateOf(false) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
        onResult = { permissions ->
            permissionGranted = permissions[Manifest.permission.ACCESS_FINE_LOCATION] == true ||
                                permissions[Manifest.permission.ACCESS_COARSE_LOCATION] == true
            if (permissionGranted) {
                viewModel.startTracking()
            }
        }
    )

    LaunchedEffect(adultId) {
        viewModel.setAdultId(adultId)
        val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val hasCoarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        
        if (hasFine || hasCoarse) {
            permissionGranted = true
            viewModel.startTracking()
        } else {
            permissionLauncher.launch(
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                )
            )
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text("Panel del Adulto Mayor", style = MaterialTheme.typography.headlineMedium)
        Spacer(modifier = Modifier.height(16.dp))

        if (permissionGranted) {
            Text("GPS Activo: Compartiendo ubicación", color = MaterialTheme.colorScheme.primary)
            Spacer(modifier = Modifier.height(8.dp))
            lastLocation?.let {
                Text("Última enviada: ${it.fecha} ${it.hora}")
                Text("Lat: ${it.latitude}, Lng: ${it.longitude}")
            }
        } else {
            Text("Permiso de GPS denegado.", color = MaterialTheme.colorScheme.error)
            Button(onClick = { 
                permissionLauncher.launch(
                    arrayOf(
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                    )
                ) 
            }) {
                Text("Solicitar Permiso")
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onSosClick,
            colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
            modifier = Modifier.size(120.dp, 120.dp)
        ) {
            Text("SOS", style = MaterialTheme.typography.headlineLarge)
        }
    }
}
