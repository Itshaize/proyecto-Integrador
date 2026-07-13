package com.proyecto.ubicacion.ui.safezone

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.proyecto.ubicacion.data.model.SafeZoneModel
import com.proyecto.ubicacion.data.network.ApiClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

class SafeZoneViewModel : ViewModel() {

    private val _currentZone = MutableStateFlow<SafeZoneModel?>(null)
    val currentZone: StateFlow<SafeZoneModel?> = _currentZone.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _actionMessage = MutableStateFlow<String?>(null)
    val actionMessage: StateFlow<String?> = _actionMessage.asStateFlow()

    private val _actionSuccess = MutableStateFlow(false)
    val actionSuccess: StateFlow<Boolean> = _actionSuccess.asStateFlow()

    fun loadZone(adultId: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val zone = ApiClient.apiService.getSafeZone(adultId)
                _currentZone.value = zone
            } catch (e: Exception) {
                _currentZone.value = null
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun saveZone(zone: SafeZoneModel) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                if (zone.id_zona == 0) {
                    ApiClient.apiService.createSafeZone(zone)
                    _actionMessage.value = "Zona creada correctamente"
                } else {
                    ApiClient.apiService.updateSafeZone(zone.id_zona, zone)
                    _actionMessage.value = "Zona actualizada correctamente"
                }
                _actionSuccess.value = true
            } catch (e: Exception) {
                _actionMessage.value = "Error al guardar. Verifica el servidor."
                _actionSuccess.value = false
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun deleteZone(idZona: Int) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                ApiClient.apiService.deleteSafeZone(idZona)
                _actionMessage.value = "Zona eliminada correctamente"
                _actionSuccess.value = true
            } catch (e: Exception) {
                _actionMessage.value = "Error al eliminar. Verifica el servidor."
                _actionSuccess.value = false
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun resetAction() {
        _actionSuccess.value = false
        _actionMessage.value = null
    }
}
