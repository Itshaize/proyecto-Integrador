# Contrato de API — módulo de autenticación y adultos

Base local: `http://localhost:4000/api`. Todas las rutas privadas requieren `Authorization: Bearer TOKEN`.

## Autenticación

### `POST /auth/register`

Recibe `nombre`, `cedula`, `correo`, `telefono`, `password`. Crea un usuario con rol `ADMINISTRADOR` y devuelve `{ token, usuario }`.

### `POST /auth/login`

Recibe `{ correo, password }`. Devuelve el mismo formato para ambos roles. El cliente decide el panel usando `usuario.rol`.

### `GET /auth/me`

Valida la sesión y devuelve el usuario autenticado.

## Adultos mayores

### `GET /adults`

Lista solo los adultos del administrador autenticado. Devuelve `{ adultos, total, limite: 2 }`.

### `POST /adults`

Campos: `nombre`, `cedula`, `fecha_nacimiento`, `telefono`, `direccion`, `contacto_emergencia`, `correo`, `password`, `foto?`, `latitude?`, `longitude?`.

La respuesta mínima que consumen los otros módulos es:

```json
{
  "adulto": {
    "adultId": 1,
    "id_adulto": 1,
    "id_usuario": 2,
    "id_administrador": 1,
    "nombre": "María Elena Guzmán",
    "estado": "ACTIVO"
  }
}
```

Cuando ya existen dos registros responde `409` y `code: "ADULT_LIMIT_REACHED"`.

### `GET /adults/{id}` y `PUT /adults/{id}`

Consultan o actualizan un adulto únicamente si pertenece al administrador autenticado. La edición permite `estado: ACTIVO | INACTIVO`.

### `PATCH /adults/{id}/status`

Recibe `{ "estado": "ACTIVO" }` o `{ "estado": "INACTIVO" }`.

## Geocodificación

### `POST /geocoding/address`

Recibe `{ "direccion": "La Carolina" }`. El servidor añade Quito, Ecuador y devuelve `direccion`, `latitude`, `longitude`. La clave de Google nunca se expone a la app.

## Códigos esperados

- `400`: validación de campos.
- `401`: credenciales o sesión inválidas.
- `403`: rol no autorizado o cuenta inactiva.
- `404`: recurso ajeno o inexistente.
- `409`: correo/cédula repetidos o límite alcanzado.
- `422`: dirección no encontrada.
- `503`: clave de geocodificación no configurada.

## Ubicación y zonas seguras — Mauricio

- `POST /locations`: guarda `adultId`, `latitude`, `longitude`, `accuracy`, `fecha`, `hora` y dirección. Devuelve `estadoZona`.
- `GET /locations/{adultId}/latest`: devuelve la última ubicación y su estado de zona.
- `POST /safe-zones`: crea una zona de 50 a 2.000 metros.
- `GET /safe-zones/{adultId}`: consulta la zona del adulto.
- `PUT /safe-zones/{id}`: edita centro, dirección, radio o estado.
- `DELETE /safe-zones/{id}`: elimina la zona.

Estados de zona: `DENTRO_DE_ZONA`, `FUERA_DE_ZONA`, `UBICACION_DESACTIVADA`, `SIN_ACTUALIZACION`.

## S.O.S., alertas, rutas y lugares — Juan

- `POST /alerts`: crea una alerta `SOS` o `FUERA_DE_ZONA`.
- `GET /alerts/{adultId}`: historial del adulto.
- `PUT /alerts/{id}/status`: actualiza a `NUEVA`, `VISTA`, `ATENDIDA` o `CERRADA`.
- `GET /contacts/{adultId}`: obtiene el familiar responsable y teléfono de emergencia.
- `POST /routes`: calcula distancia, duración y polyline con Routes API.
- `POST /nearby-places`: busca `hospital`, `farmacia`, `centro_salud`, `policia` o `punto_ayuda` en 2 km.

Todos estos endpoints requieren JWT. La API valida el `adultId` contra la relación creada por Ismael; no acepta datos de adultos ajenos.

