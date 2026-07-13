# 🚀 Integración del Módulo de Ubicación y Zonas Seguras

Hola equipo 👋,

Este documento es una guía rápida para que puedan integrar el módulo de **Monitoreo y Zonas Seguras** sin conflictos. Hemos dejado todo listo tanto en el Backend, la Web (Prototipo) y la App Móvil (Android).

## 📂 ¿Qué contiene esta integración?

1. **Backend (Carpeta `/backend`)**
   - Es un servidor ligero de Node.js + Express.
   - Maneja en memoria (por ahora) la ubicación del GPS y las zonas seguras.
   - **Lógica clave:** Contiene la fórmula matemática de Haversine para calcular si el adulto mayor salió de su "zona segura".
   - **Endpoints disponibles:**
     - `POST /api/locations`: Recibe el GPS del adulto mayor.
     - `GET /api/locations/:adultId/latest`: Retorna la última ubicación y el estado (`DENTRO_DE_ZONA` o `FUERA_DE_ZONA`).
     - `POST /api/safe-zones`: Permite crear la zona segura.
     - `GET /api/safe-zones/:adultId`: Permite leer la zona segura actual.

2. **Web Prototipo (Archivos `.html` y `.js`)**
   - El código en `admin_logic.js` y `tracker.js` está preparado.
   - Cuenta con fallbacks (*Modo Prueba*) por si el Backend está apagado.

3. **Android App (Carpeta `/android`)**
   - Desarrollada 100% en Jetpack Compose.
   - Interfaz conectada a un ViewModel (`SafeZoneViewModel`, `AdminMapViewModel`).
   - Ya envía y recibe la información a nuestro Backend a través de Retrofit (`ApiClient.kt`).
   - Incorpora cierre automático de pantallas (pop backstack) y notificaciones emergentes nativas (Toasts) al guardar con éxito o en caso de error.

---

## ⚙️ Pasos para ejecutar y unir (Para los devs del equipo)

### Paso 1: Levantar el Backend
Para que la app Android y la Web se sincronicen de verdad, **tienen que levantar el backend**.
Abran una terminal, entren a la carpeta `backend` y ejecuten:
```bash
npm install
node server.js
```
Verán el mensaje: `Backend server running on http://localhost:3000`.

### Paso 2: Importar Colección de Pruebas (Opcional)
Se dejó un archivo llamado `thunder-collection_adulto_mayor.json` en la raíz del proyecto.
Si usan **Thunder Client** en VSCode, pueden darle a "Import" y subir este archivo. Así tendrán todas las peticiones a un solo clic para probar la API sin programar nada.

### Paso 3: Integración con Autenticación (Próximo paso)
La API asume actualmente que el adulto mayor tiene un ID estático (ej: `adultId: 1`).
Cuando el equipo de Auth fusione su parte, deberán reemplazar el ID `1` por el ID real que devuelve el login, o utilizar un Token JWT en las peticiones.

---
**¡Buen trabajo y suerte con la fusión en GitHub! No olviden hacer el merge de estos archivos en la rama principal.**
