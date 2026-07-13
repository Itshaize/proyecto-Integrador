package com.proyecto.ubicacion.ui.adulto

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.proyecto.ubicacion.data.model.LocationModel
import com.proyecto.ubicacion.data.network.ApiClient
import com.proyecto.ubicacion.service.LocationHelper
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class AdultoViewModel(application: Application) : AndroidViewModel(application) {

    private val locationHelper = LocationHelper(application)
    
    private val _isTracking = MutableStateFlow(false)
    val isTracking: StateFlow<Boolean> = _isTracking.asStateFlow()

    private val _lastSentLocation = MutableStateFlow<LocationModel?>(null)
    val lastSentLocation: StateFlow<LocationModel?> = _lastSentLocation.asStateFlow()

    private var adultId: Int = -1

    init {
        // Collect location updates from LocationHelper
        viewModelScope.launch {
            locationHelper.locationState.collect { locData ->
                if (locData != null && adultId != -1) {
                    sendLocationToServer(locData.latitude, locData.longitude, locData.accuracy)
                }
            }
        }
    }

    fun setAdultId(id: Int) {
        this.adultId = id
    }

    fun startTracking() {
        if (_isTracking.value) return
        _isTracking.value = true
        locationHelper.startTracking()
    }

    fun stopTracking() {
        if (!_isTracking.value) return
        _isTracking.value = false
        locationHelper.stopTracking()
    }

    private suspend fun sendLocationToServer(lat: Double, lng: Double, acc: Float) {
        val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())
        val timeFormat = SimpleDateFormat("HH:mm:ss", Locale.getDefault())
        val now = Date()
        
        val loc = LocationModel(
            adultId = adultId,
            latitude = lat,
            longitude = lng,
            accuracy = acc,
            fecha = dateFormat.format(now),
            hora = timeFormat.format(now)
        )

        try {
            val response = ApiClient.apiService.saveLocation(loc)
            _lastSentLocation.value = response
        } catch (e: Exception) {
            // Error uploading location
        }
    }

    override fun onCleared() {
        super.onCleared()
        stopTracking()
    }
}
