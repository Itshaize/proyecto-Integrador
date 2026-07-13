# Evidencia de pruebas

La suite automatizada integrada está en `apps/api/test/api.test.ts` y se ejecuta con `npm test`.

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
| Guardar ubicación y consultar última | API automatizada con token de adulto y lectura del administrador |
| Detectar dentro y fuera de zona | Haversine real y creación automática de alerta |
| Enviar S.O.S. y actualizar estado | Persistencia SQLite y estados oficiales |
| Impedir acceso a adultos ajenos | Segundo administrador recibe `403` |
| Calcular ruta | Adaptador HTTP de Routes verificado sin consumir cuota |
| Buscar cinco categorías de ayuda | Places verificado para todas las categorías oficiales |

Antes de la exposición, ejecutar también una prueba manual en teléfono físico para aceptar ubicación, observar el marcador y verificar el cuadro de confirmación S.O.S.

Última ejecución de integración: **7 suites, 7 aprobadas, 0 fallos**.

