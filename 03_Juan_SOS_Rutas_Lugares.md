# Plan de trabajo — Juan Núñez

## Módulo asignado

**Panel del adulto mayor, SOS, alertas, rutas y lugares cercanos**

Tu módulo permite que el adulto mayor use una interfaz sencilla para pedir ayuda y que el administrador calcule rutas y encuentre lugares cercanos.

## Indicaciones generales del proyecto

### Alcance obligatorio

- El proyecto es una **aplicación móvil**.
- No se utilizarán sensores externos, IoT ni Firebase.
- Existirá **un solo login**.
- El sistema revisará el rol del usuario:
  - `ADMINISTRADOR` → panel administrador.
  - `ADULTO_MAYOR` → panel del adulto mayor.
- El administrador podrá registrar un máximo de **2 adultos mayores**.
- Cada adulto mayor tendrá su propia cuenta.
- Todos deben trabajar con las mismas APIs y endpoints definidos en el proyecto.
- No se deben cambiar nombres de campos, rutas o estados sin comunicarlo al grupo.

### APIs oficiales del proyecto

1. Location API nativa del celular.
2. Maps SDK para Android o iOS.
3. Geolocation API.
4. Geocoding API.
5. Routes API.
6. Places API.
7. Geofencing nativo.

### Endpoints oficiales externos

```http
POST https://www.googleapis.com/geolocation/v1/geolocate?key=API_KEY
```

```http
GET https://maps.googleapis.com/maps/api/geocode/json
?address=Quito,Ecuador&key=API_KEY
```

```http
GET https://maps.googleapis.com/maps/api/geocode/json
?latlng=-0.1807,-78.4678&key=API_KEY
```

```http
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

```http
POST https://places.googleapis.com/v1/places:searchNearby
```

> Maps SDK, Location API y Geofencing nativo no son endpoints REST. Se integran directamente en la aplicación móvil.

### Contrato común de datos

Todos deben respetar estos nombres:

```text
id_usuario
id_administrador
id_adulto
adultId
latitude
longitude
accuracy
fecha
hora
estado
```

Roles permitidos:

```text
ADMINISTRADOR
ADULTO_MAYOR
```

Estados de alerta:

```text
NUEVA
VISTA
ATENDIDA
CERRADA
```

### Reglas de trabajo

- Cada integrante desarrollará frontend, backend e integración de su módulo.
- Los tres pueden trabajar al mismo tiempo después de acordar:
  - nombres de tablas;
  - nombres de campos;
  - formato JSON;
  - endpoints internos;
  - diseño visual;
  - colores, tipografía e iconos.
- Mientras otro módulo no esté terminado, se usarán datos simulados.
- Cada integrante trabajará en una rama distinta.
- Nadie debe modificar el módulo de otro sin avisar.
- Las API Keys nunca deben escribirse directamente en el código.
- Se deben usar variables de entorno o archivos de configuración excluidos del repositorio.
- Todos los errores deben mostrar mensajes claros en la aplicación.

### Diseño móvil y usabilidad

- Botones grandes.
- Texto legible.
- Buen contraste.
- Pocas acciones por pantalla.
- Menú inferior con máximo 4 o 5 opciones.
- Confirmación antes de acciones importantes.
- Botón SOS siempre visible en el panel del adulto mayor.
- Formularios divididos en pasos cuando sean extensos.
- La interfaz debe ser fácil de usar por una persona adulta mayor.

### Flujo general

```text
1. El familiar se registra como administrador.
2. Inicia sesión.
3. Registra máximo dos adultos mayores.
4. Se crea una cuenta para cada adulto mayor.
5. El adulto mayor inicia sesión desde el mismo login.
6. El celular obtiene la ubicación.
7. La ubicación se guarda y aparece en el mapa.
8. Se verifica la zona segura.
9. Si sale de la zona, se genera una alerta.
10. Si activa SOS, se notifica al administrador.
11. El familiar puede calcular una ruta y buscar lugares de ayuda.
```

### Repositorio sugerido

```text
main
├── feature/auth-adults-ismael
├── feature/location-map-mauricio
└── feature/sos-routes-juan
```

### Antes de integrar

Cada integrante debe entregar:

- pantallas terminadas;
- endpoints funcionando;
- tablas o modelos;
- validaciones;
- datos de prueba;
- documentación breve;
- pruebas realizadas;
- capturas del funcionamiento.

---

## Objetivo de tu módulo

Al finalizar, la aplicación debe permitir:

1. Mostrar el panel del adulto mayor.
2. Activar SOS.
3. Guardar ubicación, fecha y hora de la alerta.
4. Notificar al administrador.
5. Llamar al familiar.
6. Compartir ubicación.
7. Calcular ruta hasta el adulto mayor.
8. Buscar hospitales y farmacias cercanas.
9. Consultar y actualizar alertas.

---

## Pantallas móviles que debes crear

### 1. Inicio del adulto mayor

Debe mostrar:

```text
Hola, nombre
Ubicación activa
Estado de zona segura
Última actualización
```

Botones:

```text
SOS
Llamar a mi familiar
Compartir ubicación
Ver mi ubicación
```

### 2. Confirmación de SOS

```text
¿Desea enviar una alerta SOS?

Cancelar
Enviar alerta
```

### 3. Alerta enviada

```text
Alerta enviada correctamente.
Su familiar ha sido notificado.
```

### 4. Contacto de emergencia

Debe mostrar:

```text
Nombre del familiar
Teléfono
Botón llamar
Botón enviar mensaje
```

### 5. Lugares cercanos

Opciones:

```text
Hospitales
Farmacias
Centros de salud
Policía
Puntos de ayuda
```

### 6. Ruta de ayuda

Debe mostrar:

```text
Origen
Destino
Distancia
Tiempo estimado
Ruta
Botón iniciar navegación
```

### 7. Historial de alertas

Debe mostrar:

```text
Fecha
Hora
Tipo
Ubicación
Estado
```

---

## Funcionamiento de tu parte

### Flujo SOS

```text
1. El adulto presiona SOS.
2. La aplicación solicita confirmación.
3. Obtiene la última ubicación.
4. Registra la alerta.
5. Guarda fecha y hora.
6. Notifica al administrador.
7. Permite llamar o compartir ubicación.
```

### Flujo de rutas

```text
1. Se obtiene ubicación del familiar.
2. Se obtiene ubicación del adulto.
3. Se envían ambas a Routes API.
4. Se recibe distancia, duración y trayectoria.
5. Maps SDK dibuja la ruta.
```

### Flujo de lugares

```text
1. Se toma la ubicación del adulto.
2. Se selecciona hospital o farmacia.
3. Se consulta Places API.
4. Se muestran resultados por cercanía.
```

---

## Backend que debes desarrollar

- crear alerta;
- guardar ubicación;
- guardar fecha y hora;
- consultar historial;
- cambiar estado;
- consultar última ubicación de Mauricio;
- llamar Routes API;
- llamar Places API;
- devolver resultados al frontend;
- generar enlace para compartir ubicación.

---

## Endpoints internos de tu módulo

### Crear alerta

```http
POST /api/alerts
```

Ejemplo:

```json
{
  "adultId": 1,
  "tipo": "SOS",
  "latitude": -0.1807,
  "longitude": -78.4678,
  "estado": "NUEVA"
}
```

### Consultar alertas

```http
GET /api/alerts/{adultId}
```

### Actualizar estado

```http
PUT /api/alerts/{id}/status
```

Ejemplo:

```json
{
  "estado": "ATENDIDA"
}
```

### Calcular ruta

```http
POST /api/routes
```

### Buscar lugares

```http
POST /api/nearby-places
```

---

## APIs oficiales asignadas

### Routes API

```http
POST https://routes.googleapis.com/directions/v2:computeRoutes
```

Headers:

```http
X-Goog-Api-Key: API_KEY
X-Goog-FieldMask: routes.duration,routes.distanceMeters,routes.polyline
```

Datos de entrada:

```text
Origen: ubicación del familiar
Destino: ubicación del adulto mayor
```

Resultado:

```text
Distancia
Duración
Polyline
Ruta recomendada
```

### Places API

```http
POST https://places.googleapis.com/v1/places:searchNearby
```

Ejemplo:

```json
{
  "includedTypes": ["hospital"],
  "maxResultCount": 5,
  "locationRestriction": {
    "circle": {
      "center": {
        "latitude": -0.1807,
        "longitude": -78.4678
      },
      "radius": 2000
    }
  }
}
```

Uso:

- hospitales;
- farmacias;
- centros de salud;
- policía;
- lugares seguros.

---

## Tablas o modelos asignados

### alertas

```text
id_alerta
id_adulto
tipo
fecha
hora
latitude
longitude
estado
```

### contactos_emergencia

```text
id_contacto
id_adulto
nombre
telefono
relacion
```

---

## Integración con Ismael

Recibirás:

```json
{
  "adultId": 1,
  "nombre": "María Guzmán",
  "id_administrador": 10
}
```

El `adultId` debe ser exactamente el mismo.

---

## Integración con Mauricio

Recibirás la última ubicación:

```json
{
  "adultId": 1,
  "latitude": -0.1807,
  "longitude": -78.4678,
  "estadoZona": "FUERA_DE_ZONA"
}
```

No debes crear coordenadas diferentes.

---

## Orden recomendado de trabajo

1. Crear panel del adulto mayor.
2. Crear botón SOS.
3. Crear alertas con datos simulados.
4. Guardar alerta.
5. Crear historial.
6. Integrar llamada y compartir ubicación.
7. Integrar Routes API.
8. Integrar Places API.
9. Mostrar ruta en Maps SDK.
10. Probar con ubicación real de Mauricio.

---

## Casos de prueba obligatorios

- Entrar como adulto mayor.
- Ver estado de ubicación.
- Presionar SOS.
- Cancelar SOS.
- Confirmar SOS.
- Guardar ubicación de alerta.
- Consultar historial.
- Cambiar estado.
- Llamar al familiar.
- Compartir ubicación.
- Calcular ruta.
- Buscar hospitales.
- Buscar farmacias.
- Manejar error sin conexión.

---

## Entregable final

- Panel del adulto mayor.
- SOS funcional.
- Historial de alertas.
- Llamada y mensaje.
- Compartir ubicación.
- Routes API.
- Places API.
- Vista de ruta.
- Lugares cercanos.
- Documentación de endpoints.
- Capturas y pruebas.

---

## Checklist

- [ ] Panel adulto mayor.
- [ ] Botón SOS.
- [ ] Confirmación.
- [ ] Alerta guardada.
- [ ] Historial.
- [ ] Estado actualizado.
- [ ] Llamada.
- [ ] Compartir ubicación.
- [ ] Routes API.
- [ ] Places API.
- [ ] Datos recibidos de Mauricio.
- [ ] Pruebas realizadas.