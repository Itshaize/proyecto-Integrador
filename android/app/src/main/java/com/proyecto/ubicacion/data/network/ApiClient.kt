package com.proyecto.ubicacion.data.network

import com.proyecto.ubicacion.BuildConfig
import com.proyecto.ubicacion.data.model.LocationModel
import com.proyecto.ubicacion.data.model.SafeZoneModel
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.Path
import java.util.concurrent.TimeUnit

interface ApiService {
    // ── Ubicaciones ──
    @POST("locations")
    suspend fun saveLocation(@Body location: LocationModel): LocationModel

    @GET("locations/{adultId}/latest")
    suspend fun getLatestLocation(@Path("adultId") adultId: Int): LocationModel

    // ── Zonas Seguras ──
    @POST("safe-zones")
    suspend fun createSafeZone(@Body zone: SafeZoneModel): SafeZoneModel

    @GET("safe-zones/{adultId}")
    suspend fun getSafeZone(@Path("adultId") adultId: Int): SafeZoneModel

    @PUT("safe-zones/{id}")
    suspend fun updateSafeZone(@Path("id") idZona: Int, @Body zone: SafeZoneModel): SafeZoneModel

    @DELETE("safe-zones/{id}")
    suspend fun deleteSafeZone(@Path("id") idZona: Int)
}

object ApiClient {
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()

    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
