# Integración de módulos — Ismael, Mauricio y Juan

## Decisión de arquitectura

Las ramas originales usaban tres stacks diferentes: Expo/React Native, Android Compose y una aplicación web. Fusionarlas directamente habría creado tres servidores, dos bases y contratos sin autenticación compartida. La integración porta la lógica útil a la arquitectura de Ismael: una app Expo y una API Express con MongoDB Atlas.

## Responsabilidad conservada

### Ismael

- Usuarios, roles, login único y JWT.
- `adultId` canónico y relación administrador–adulto.
- Límite de dos adultos, datos personales y geocodificación.

### Mauricio

- Ubicación nativa y guardado periódico.
- Última ubicación, precisión, fecha y hora.
- Zona segura, radio editable y Haversine.
- Estados dentro/fuera/sin actualización.
- Lenguaje visual del adulto: mapa protagonista, estado GPS, dirección, S.O.S. circular y confirmación.

### Juan

- Alertas `SOS` y `FUERA_DE_ZONA`.
- Historial y estados `NUEVA`, `VISTA`, `ATENDIDA`, `CERRADA`.
- Contacto familiar, llamada y compartir ubicación.
- Routes API y Places API con cinco categorías.

## Flujo integrado

1. Ismael crea la cuenta y entrega `adultId` en el login del adulto.
2. El teléfono publica la ubicación en `/api/locations`.
3. La API de Mauricio calcula el estado contra la zona segura.
4. Al pasar a `FUERA_DE_ZONA`, la API crea una alerta de Juan.
5. El S.O.S. usa la última coordenada real del mismo adulto.
6. El administrador consulta mapa, alertas, ruta y lugares desde la misma sesión.

## Seguridad

El backend deriva el acceso desde el JWT y la tabla `relaciones`. Un adulto solo escribe sobre su perfil y un administrador solo consulta adultos asignados. Las claves de Google permanecen en `GOOGLE_MAPS_API_KEY` del servidor.
