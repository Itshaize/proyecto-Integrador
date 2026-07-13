# Evidencia de pruebas

La suite automatizada está en `apps/api/test/api.test.ts` y se ejecuta con `npm test`.

| Caso obligatorio | Cobertura |
|---|---|
| Registrar administrador | API automatizada + formulario móvil |
| Impedir correo repetido | API automatizada, respuesta 409 |
| Login administrador | API automatizada, rol verificado |
| Login adulto mayor | API automatizada, cuenta creada automáticamente |
| Registrar primer y segundo adulto | API automatizada |
| Bloquear tercer adulto | API automatizada + botón móvil deshabilitado |
| Consultar lista | API automatizada + pantalla con estados vacío/cargado/error |
| Editar adulto | API automatizada + formulario precargado |
| Convertir dirección de Quito | API automatizada con adaptador simulado; integración real disponible con clave |

Antes de la exposición, ejecutar también una prueba manual en teléfono físico para aceptar ubicación, observar el marcador y verificar el cuadro de confirmación S.O.S.

