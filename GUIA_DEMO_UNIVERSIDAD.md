# Guía de demostración de Cuido+

## Credenciales de la exposición

| Perfil | Correo | Contraseña |
| --- | --- | --- |
| Administradora — Ana Sofía Ruiz | `ana@cuido.ec` | `CuidoDemo123` |
| Adulta mayor — María Elena Guzmán | `maria@cuido.ec` | `Temporal123` |

Estas dos cuentas se crean o restauran con `npm run seed:demo`. El sembrado también deja lista la relación familiar, una ubicación en Quito, una zona segura y una alerta S.O.S. inicial.

## Preparación única en la computadora de la universidad

Requisitos: Node.js 22.5 o posterior, npm y dos terminales de PowerShell.

Desde la raíz del repositorio:

```powershell
npm install
Copy-Item .env.example apps/api/.env -Force
Set-Content apps/mobile/.env 'EXPO_PUBLIC_API_URL=http://localhost:4000/api'
npm run seed:demo
```

La clave de Google Maps puede quedar vacía para la exposición. El mapa base, los marcadores, la ubicación, la zona y el S.O.S. funcionan; Ruta y Ayuda cercana mostrarán un botón para continuar en Google Maps.

## Encender localhost

Terminal 1 — API:

```powershell
npm run dev:api
```

Terminal 2 — aplicación web:

```powershell
npm run web -w @cuido/mobile -- --port 8081
```

Abrir:

- Aplicación: [http://localhost:8081](http://localhost:8081)
- Estado de la API: [http://localhost:4000/api/health](http://localhost:4000/api/health)

La API está lista si responde `{"status":"ok","service":"cuido-api"}`.

## Recorrido recomendado para Ismael

### 1. Mostrar el perfil de adulta mayor

1. Iniciar sesión con `maria@cuido.ec` / `Temporal123`.
2. Enseñar el mapa oscuro, la dirección, la precisión y el estado de zona.
3. Si el navegador bloquea el GPS, pulsar **Usar prueba**. Esto actualiza la ubicación demo en Quito.
4. Pulsar **Compartir** para copiar o abrir el enlace de ubicación.
5. Pulsar **Ayuda** para mostrar categorías y el respaldo de Google Maps.
6. Pulsar **SOS**, confirmar y explicar que la alerta se guarda con coordenadas.
7. Cerrar sesión con el icono de salida junto a la hora.

### 2. Mostrar el perfil administrador

1. Iniciar sesión con `ana@cuido.ec` / `CuidoDemo123`.
2. Mostrar el contador de adultos y de alertas.
3. Entrar a **Adultos → María Elena Guzmán → Ver ubicación y zona segura**.
4. Enseñar que el administrador ve el mismo punto enviado por la adulta.
5. Probar **Crear/Editar zona**, **Ruta** y **Ayuda cerca**.
6. Entrar a **Alertas**, abrir la alerta S.O.S. y cambiar su estado.
7. Entrar a **Ajustes** y pulsar **Comprobar conexión**.

## Guion corto para explicar el proyecto

> Cuido+ integra autenticación por roles, administración de adultos mayores, ubicación compartida, geocercas, alertas S.O.S., rutas y lugares de ayuda. La adulta comparte su posición y el familiar administrador recibe el mismo `adultId`, la ubicación y las alertas desde una API común protegida con JWT.

## Checklist diez minutos antes de exponer

- [ ] La computadora está conectada a internet para cargar las calles del mapa.
- [ ] `npm run seed:demo` terminó mostrando las dos credenciales.
- [ ] La API responde en `http://localhost:4000/api/health`.
- [ ] La web abre en `http://localhost:8081`.
- [ ] Ambas credenciales permiten iniciar sesión.
- [ ] **Usar prueba** actualiza la dirección y el marcador.
- [ ] Un S.O.S. creado por María aparece en el panel de Ana.
- [ ] No hay otra aplicación ocupando los puertos `4000` o `8081`.

## Solución rápida de problemas

### El login no funciona

Con la API encendida, abre otra terminal y ejecuta:

```powershell
npm run seed:demo
```

Después recarga el navegador con `Ctrl+F5`.

### El GPS aparece sin permiso

Es normal en navegadores o proyectores con permisos bloqueados. Pulsa **Usar prueba**; no impide demostrar el flujo completo.

### Ruta o Ayuda cercana pide una API key

La integración automática de Google necesita `GOOGLE_MAPS_API_KEY`. Sin clave, usa el botón **Abrir/Buscar en Google Maps** que aparece como recuperación.

### El mapa no carga calles

Verifica la conexión a internet y recarga la página. La API local puede seguir funcionando aunque el proveedor de mosaicos no tenga conexión.

### Un puerto está ocupado

Consulta qué proceso lo usa:

```powershell
Get-NetTCPConnection -State Listen | Where-Object LocalPort -in 4000,8081
```

## Indicaciones para otra IA

1. Leer primero `README.md`, `docs/INTEGRACION.md`, `docs/API.md` y este archivo.
2. Mantener estas credenciales demo y el comando `npm run seed:demo`; son parte del guion de evaluación.
3. No editar manualmente las colecciones de demostración en Atlas. Cambiar datos reproducibles únicamente en `apps/api/src/seed.js`.
4. Mantener `react-native-maps` para Android/iOS y Leaflet para web mediante `map.native.tsx` y `map.web.tsx`.
5. Mantener almacenamiento de sesión separado: SecureStore en nativo y localStorage en web.
6. No exponer JWT, contraseñas reales ni `GOOGLE_MAPS_API_KEY` en el frontend o en Git.
7. Antes de entregar cambios ejecutar:

```powershell
npm run seed:demo
npm test
npm run typecheck
npm run build -w @cuido/api
```

8. Verificar manualmente ambos roles en `http://localhost:8081` y confirmar que `git status` no incluya `.env`, secretos, logs ni `dist-web`.

## Estado esperado en Git

La versión integrada y lista para exposición vive en la rama `main` del repositorio `Itshaize/proyecto-Integrador`.
