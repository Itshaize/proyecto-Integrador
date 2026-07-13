# Plan de trabajo — Ismael Cornejo

## Módulo asignado

**Acceso, autenticación y administración de adultos mayores**

Tu módulo permite registrar al administrador, iniciar sesión, reconocer el rol y registrar hasta dos adultos mayores.

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

1. Crear una cuenta de administrador.
2. Iniciar sesión.
3. Reconocer si el usuario es administrador o adulto mayor.
4. Abrir el panel correcto.
5. Registrar máximo dos adultos mayores.
6. Crear automáticamente la cuenta del adulto mayor.
7. Consultar y editar los adultos registrados.
8. Convertir direcciones de Quito en coordenadas.

---

## Pantallas móviles que debes crear

### 1. Pantalla de bienvenida

Debe mostrar:

- logo;
- nombre de la aplicación;
- botón **Iniciar sesión**;
- botón **Crear cuenta de administrador**.

### 2. Registro del administrador

Campos:

```text
Nombre completo
Cédula
Correo electrónico
Teléfono
Contraseña
Confirmar contraseña
Aceptar términos
```

Al guardar, el rol será:

```text
ADMINISTRADOR
```

### 3. Login único

Campos:

```text
Correo electrónico
Contraseña
Botón Ingresar
Recuperar contraseña
```

Comportamiento:

```text
ADMINISTRADOR → panel administrador
ADULTO_MAYOR → panel adulto mayor
```

### 4. Inicio del panel administrador

Debe mostrar:

```text
Hola, nombre del administrador
Adultos registrados: 0 de 2
Alertas activas
Última actualización
```

Botón obligatorio:

```text
+ Registrar adulto mayor
```

### 5. Lista de adultos mayores

Cada tarjeta debe mostrar:

```text
Foto
Nombre
Estado
Última ubicación
Última actualización
Botón Ver
Botón Editar
```

### 6. Formulario de adulto mayor

Campos:

```text
Nombre completo
Cédula
Fecha de nacimiento
Teléfono
Dirección
Fotografía
Contacto de emergencia
Usuario o correo
Contraseña temporal
```

### 7. Edición del adulto mayor

Debe permitir actualizar:

- datos personales;
- teléfono;
- dirección;
- contacto de emergencia;
- estado de la cuenta.

---

## Regla principal

Cada administrador puede registrar máximo dos adultos mayores.

```text
0 registrados → puede agregar 2
1 registrado → puede agregar 1
2 registrados → botón bloqueado
```

Mensaje:

```text
Límite máximo alcanzado.
Cada administrador puede registrar hasta dos adultos mayores.
```

---

## Backend que debes desarrollar

### Autenticación

- registrar administrador;
- validar correo;
- cifrar contraseña;
- iniciar sesión;
- devolver token o sesión;
- devolver rol;
- redirigir al panel correcto.

### Administración de adultos

- registrar adulto mayor;
- comprobar el límite de dos;
- crear usuario del adulto;
- relacionar adulto con administrador;
- consultar lista;
- consultar detalle;
- editar datos;
- desactivar cuenta.

### Validaciones

- correo único;
- cédula única;
- contraseña confirmada;
- campos obligatorios;
- máximo de dos adultos;
- un adulto solo puede pertenecer al administrador autorizado.

---

## Endpoints internos de tu módulo

### Registrar administrador

```http
POST /api/auth/register
```

Ejemplo:

```json
{
  "nombre": "Juan Pérez",
  "cedula": "1712345678",
  "correo": "juan@email.com",
  "telefono": "0999999999",
  "password": "claveSegura"
}
```

### Iniciar sesión

```http
POST /api/auth/login
```

Respuesta esperada:

```json
{
  "token": "TOKEN",
  "usuario": {
    "id_usuario": 1,
    "nombre": "Juan Pérez",
    "rol": "ADMINISTRADOR"
  }
}
```

### Registrar adulto mayor

```http
POST /api/adults
```

### Listar adultos del administrador

```http
GET /api/adults
```

### Consultar adulto

```http
GET /api/adults/{id}
```

### Editar adulto

```http
PUT /api/adults/{id}
```

---

## APIs oficiales asignadas

### Geocoding API

Convierte dirección en coordenadas:

```http
GET https://maps.googleapis.com/maps/api/geocode/json
?address=La+Carolina,Quito,Ecuador&key=API_KEY
```

Convierte coordenadas en dirección:

```http
GET https://maps.googleapis.com/maps/api/geocode/json
?latlng=-0.1807,-78.4678&key=API_KEY
```

Tu uso principal:

- registrar dirección del adulto;
- registrar dirección de zona segura;
- obtener latitud y longitud desde una dirección;
- mostrar una dirección entendible.

### Geolocation API

```http
POST https://www.googleapis.com/geolocation/v1/geolocate?key=API_KEY
```

Uso:

- apoyo cuando el GPS no sea confiable;
- estimar posición con Wi-Fi o torres celulares.

> No reemplaza la ubicación nativa del celular. Solo sirve como apoyo.

---

## Tablas o modelos asignados

### usuarios

```text
id_usuario
nombre
cedula
correo
telefono
password_hash
rol
estado
fecha_registro
```

### adultos_mayores

```text
id_adulto
id_usuario
fecha_nacimiento
direccion
contacto_emergencia
foto
```

### relaciones

```text
id_relacion
id_administrador
id_adulto
fecha_asignacion
estado
```

---

## Datos que debes entregar a Mauricio y Juan

Debes garantizar que puedan obtener:

```json
{
  "adultId": 1,
  "nombre": "María Guzmán",
  "id_administrador": 10,
  "estado": "ACTIVO"
}
```

Mauricio necesita `adultId` para guardar ubicaciones.

Juan necesita `adultId` para registrar SOS y consultar alertas.

---

## Orden recomendado de trabajo

1. Crear modelos y tablas.
2. Crear registro del administrador.
3. Crear login y control de roles.
4. Crear panel administrador básico.
5. Crear registro de adulto mayor.
6. Agregar validación de máximo dos.
7. Crear listado y edición.
8. Integrar Geocoding.
9. Probar con datos simulados.
10. Entregar contrato de datos al equipo.

---

## Casos de prueba obligatorios

- Registrar administrador correctamente.
- Impedir correo repetido.
- Iniciar sesión como administrador.
- Iniciar sesión como adulto mayor.
- Registrar primer adulto.
- Registrar segundo adulto.
- Bloquear tercer registro.
- Consultar lista de adultos.
- Editar adulto.
- Convertir una dirección de Quito a coordenadas.

---

## Entregable final

- Login funcional.
- Registro del administrador.
- Redirección por rol.
- Panel administrador inicial.
- Registro máximo de dos adultos.
- Creación de cuenta del adulto mayor.
- Lista y edición de adultos.
- Integración con Geocoding.
- Documentación de endpoints.
- Capturas y pruebas.

---

## Checklist

- [ ] Registro de administrador.
- [ ] Login único.
- [ ] Roles funcionando.
- [ ] Panel correcto según rol.
- [ ] Registro de adultos.
- [ ] Límite de dos.
- [ ] Cuenta del adulto creada.
- [ ] Lista de adultos.
- [ ] Edición.
- [ ] Geocoding integrado.
- [ ] Endpoints documentados.
- [ ] Pruebas realizadas.