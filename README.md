# Cuido+

Aplicación móvil integrada para que un familiar administre hasta dos adultos mayores, consulte su ubicación y zona segura, reciba alertas y encuentre rutas o lugares de ayuda. Incluye un único acceso con redirección por rol y una API segura común para los módulos de Ismael, Mauricio y Juan.

## Stack

- App: Expo + React Native + TypeScript
- API: Node.js + Express + SQLite nativo
- Seguridad: JWT de 8 horas y bcrypt (12 rondas)
- Integraciones: Location API nativa, Maps SDK, Geocoding, Routes, Places y geofencing

## Ejecutar el proyecto

Requiere Node.js 22.5 o posterior.

1. Copia `.env.example` como `.env` y cambia `JWT_SECRET`.
2. Agrega una clave de Google Maps con Geocoding habilitado en `GOOGLE_MAPS_API_KEY`.
3. Instala dependencias con `npm install`.
4. Crea las dos cuentas y datos de exposición con `npm run seed:demo`.
5. Inicia la API con `npm run dev:api`.
6. En otra terminal inicia la app con `npm run dev:mobile`.

Para probar en un teléfono real, reemplaza `localhost` en `EXPO_PUBLIC_API_URL` por la IP local de la computadora, por ejemplo `http://192.168.1.20:4000/api`.

## Cuenta demo

- Administradora: `ana@cuido.ec` / `CuidoDemo123`
- Adulta mayor: `maria@cuido.ec` / `Temporal123`

El recorrido completo para la presentación está en [GUIA_DEMO_UNIVERSIDAD.md](GUIA_DEMO_UNIVERSIDAD.md).

## Comandos de verificación

```bash
npm test
npm run typecheck
npm run build -w @cuido/api
```

## Reglas implementadas

- Registro exclusivo de administradores.
- Login único y apertura de panel por `ADMINISTRADOR` o `ADULTO_MAYOR`.
- Correo y cédula únicos; validación de cédula ecuatoriana.
- Contraseñas cifradas y JWT de corta duración.
- Máximo dos adultos activos por administrador, validado en API y app.
- La cuenta del adulto se crea en la misma transacción que su perfil y relación.
- Un administrador no puede consultar ni editar adultos de otro administrador.
- Las claves externas permanecen en el backend.
- El adulto comparte `latitude`, `longitude`, `accuracy`, `fecha` y `hora` con su mismo `adultId`.
- La salida de zona crea automáticamente una alerta `FUERA_DE_ZONA` sin duplicarla en cada actualización.
- El S.O.S., historial, estados, rutas y cinco categorías de ayuda usan datos persistentes o APIs reales.

Consulta el contrato completo en [docs/API.md](docs/API.md), las decisiones en [docs/INTEGRACION.md](docs/INTEGRACION.md) y los casos de prueba en [docs/PRUEBAS.md](docs/PRUEBAS.md).

