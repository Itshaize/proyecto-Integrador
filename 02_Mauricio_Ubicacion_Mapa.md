# Plan de trabajo — Mauricio Jácome

## Módulo asignado

**Ubicación, mapa y zonas seguras**

Tu módulo obtiene la ubicación del celular, la guarda, la muestra en el mapa y verifica si el adulto mayor está dentro o fuera de la zona segura.

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

1. Obtener la ubicación del celular.
2. Guardar latitud, longitud, precisión, fecha y hora.
3. Mostrar al adulto mayor en el mapa.
4. Mostrar la última ubicación.
5. Crear una zona segura.
6. Editar su radio.
7. Verificar si está dentro o fuera.
8. Generar alerta por salida de zona.

---

## Pantallas móviles que debes crear

### 1. Mapa del administrador

Debe mostrar:

```text
Marcador del adulto mayor
Ubicación del administrador
Zona segura
Dirección actual
Hora de actualización
Estado dentro/fuera
```

### 2. Detalle de ubicación

Datos:

```text
Latitud
Longitud
Precisión
Fecha
Hora
Dirección aproximada
```

### 3. Crear zona segura

Campos:

```text
Nombre de la zona
Dirección
Latitud
Longitud
Radio en metros
Adulto asignado
```

### 4. Editar zona segura

Debe permitir:

- modificar dirección;
- mover punto central;
- cambiar radio;
- activar o desactivar zona.

### 5. Estado de seguridad

Estados visuales:

```text
DENTRO_DE_ZONA
FUERA_DE_ZONA
UBICACION_DESACTIVADA
SIN_ACTUALIZACION
```

### 6. Estado del GPS

Mensajes:

```text
Ubicación activa
GPS desactivado
Permiso de ubicación denegado
Ubicación no disponible
```

---

## Funcionamiento de tu parte

```text
1. El celular solicita permiso.
2. Obtiene latitud y longitud.
3. Envía coordenadas al backend.
4. El backend guarda la ubicación.
5. El administrador consulta la última ubicación.
6. Maps SDK muestra el marcador.
7. Geofencing compara ubicación y radio.
8. Si está fuera, se crea una alerta.
```

---

## Backend que debes desarrollar

- recibir ubicación;
- validar `adultId`;
- guardar coordenadas;
- consultar última ubicación;
- crear zona segura;
- consultar zona;
- editar zona;
- eliminar zona;
- calcular distancia al centro;
- cambiar estado dentro/fuera;
- generar alerta por salida.

---

## Endpoints internos de tu módulo

### Guardar ubicación

```http
POST /api/locations
```

Ejemplo:

```json
{
  "adultId": 1,
  "latitude": -0.1807,
  "longitude": -78.4678,
  "accuracy": 20,
  "fecha": "2026-07-13",
  "hora": "10:30:00"
}
```

### Consultar última ubicación

```http
GET /api/locations/{adultId}/latest
```

Respuesta:

```json
{
  "adultId": 1,
  "latitude": -0.1807,
  "longitude": -78.4678,
  "accuracy": 20,
  "estadoZona": "DENTRO_DE_ZONA"
}
```

### Crear zona segura

```http
POST /api/safe-zones
```

Ejemplo:

```json
{
  "adultId": 1,
  "nombre": "Casa",
  "latitude": -0.1807,
  "longitude": -78.4678,
  "radio": 500
}
```

### Consultar zona

```http
GET /api/safe-zones/{adultId}
```

### Editar zona

```http
PUT /api/safe-zones/{id}
```

### Eliminar zona

```http
DELETE /api/safe-zones/{id}
```

---

## APIs y tecnologías oficiales asignadas

### Location API nativa

Obtiene:

```text
Latitud
Longitud
Precisión
Fecha
Hora
```

No utiliza endpoint REST.

Debes controlar:

- permiso aceptado;
- permiso denegado;
- GPS apagado;
- señal débil;
- actualización de ubicación;
- consumo de batería.

### Maps SDK

Se usa para:

- renderizar mapa de Quito;
- colocar marcadores;
- centrar cámara;
- dibujar círculo de zona segura;
- mostrar ruta enviada por Juan;
- mostrar ubicación actual.

No utiliza endpoint REST tradicional.

### Geofencing nativo

Utiliza:

```text
Latitud central
Longitud central
Radio
Ubicación actual
```

Regla:

```text
distancia <= radio → DENTRO_DE_ZONA
distancia > radio → FUERA_DE_ZONA
```

---

## Tablas o modelos asignados

### ubicaciones

```text
id_ubicacion
id_adulto
latitude
longitude
accuracy
fecha
hora
```

### zonas_seguras

```text
id_zona
id_adulto
nombre
direccion
latitude
longitude
radio
estado
```

---

## Integración con Ismael

Recibirás de Ismael:

```json
{
  "adultId": 1,
  "nombre": "María Guzmán"
}
```

No debes crear otro identificador diferente.

---

## Integración con Juan

Debes entregar a Juan:

```json
{
  "adultId": 1,
  "latitude": -0.1807,
  "longitude": -78.4678,
  "estadoZona": "FUERA_DE_ZONA"
}
```

Juan utilizará esa ubicación para:

- SOS;
- Routes API;
- Places API;
- compartir ubicación.

---

## Orden recomendado de trabajo

1. Crear tablas y modelos.
2. Crear servicio de ubicación.
3. Guardar coordenadas simuladas.
4. Crear endpoint de última ubicación.
5. Integrar Maps SDK.
6. Crear zona segura.
7. Dibujar círculo.
8. Implementar cálculo dentro/fuera.
9. Crear alerta por salida.
10. Probar con datos reales del celular.

---

## Casos de prueba obligatorios

- Permiso de ubicación aceptado.
- Permiso denegado.
- GPS apagado.
- Guardar ubicación.
- Consultar última ubicación.
- Crear zona segura.
- Cambiar radio.
- Detectar dentro de zona.
- Detectar fuera de zona.
- Mostrar marcador en Quito.
- Generar alerta por salida.

---

## Entregable final

- Ubicación nativa funcionando.
- Mapa de Quito.
- Marcador del adulto mayor.
- Guardado de coordenadas.
- Última ubicación.
- Zona segura.
- Estado dentro/fuera.
- Alerta de salida.
- Documentación de endpoints.
- Capturas y pruebas.

---

## Checklist

- [ ] Permisos de ubicación.
- [ ] GPS funcionando.
- [ ] POST de ubicación.
- [ ] GET de última ubicación.
- [ ] Maps SDK integrado.
- [ ] Marcador visible.
- [ ] Zona segura creada.
- [ ] Radio editable.
- [ ] Detección dentro/fuera.
- [ ] Alerta de salida.
- [ ] Datos compartidos con Juan.
- [ ] Pruebas realizadas.