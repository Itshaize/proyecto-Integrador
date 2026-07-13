package com.proyecto.ubicacion.ui.map

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.proyecto.ubicacion.data.model.LocationModel
import com.proyecto.ubicacion.data.model.SafeZoneModel
import com.proyecto.ubicacion.data.network.ApiClient
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class AdminMapViewModel : ViewModel() {

    private val _location = MutableStateFlow<LocationModel?>(null)
    val location: StateFlow<LocationModel?> = _location.asStateFlow()

    private val _safeZone = MutableStateFlow<SafeZoneModel?>(null)
    val safeZone: StateFlow<SafeZoneModel?> = _safeZone.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private var isPolling = false

    fun startPolling(adultId: Int) {
        if (isPolling) return
        isPolling = true
        viewModelScope.launch {
            // Cargar la zona segura inicial
            try {
                val zone = ApiClient.apiService.getSafeZone(adultId)
                _safeZone.value = zone
            } catch (e: Exception) {
                // Posiblemente no exista zona segura todavía
                _safeZone.value = null
            }

            // Iniciar polling
            while (isPolling) {
                try {
                    val loc = ApiClient.apiService.getLatestLocation(adultId)
                    _location.value = loc
                } catch (e: Exception) {
                    // Log error o manejar reconexión
                }
                delay(5000) // Poll cada 5 segundos para mantenerlo sincronizado
            }
        }
    }

    fun stopPolling() {
        isPolling = false
    }

    override fun onCleared() {
        super.onCleared()
        stopPolling()
    }
}
