# Design

## Context

El repositorio es Next.js 16.4.0 con App Router, React 19.3.0 y TypeScript. `cacheComponents` y `partialPrefetching` ya están activos. No hay autenticación, Prisma ni pruebas. La página actual es la plantilla. See proposal.md for why this slice comes first.

La guía de autenticación instalada con esta versión usa formularios y Server Actions, y exige leer la sesión en el momento de la petición cuando Cache Components está activo. El ejemplo de esa guía no define los campos de BookingApp.

## Goals / Non-Goals

**Goals:**

- Una sola aplicación Next.js. Las reglas de cuenta y rol viven en módulos de servidor.
- SQLite mediante Prisma, con usuarios y sesiones.
- Cookie httpOnly que solo identifica la sesión. El rol se lee de la base en cada operación protegida.
- Un script de inicialización, fuera de cualquier ruta pública, que crea el primer Administrador.
- Playwright cubre registro, inicio, cierre, expiración a las 12 horas, acceso no autorizado y las restricciones para asignar roles.

**Non-Goals:**

- Salas, disponibilidad y reservas.
- Verificar el correo, recuperar la contraseña o crear más de un Administrador.
- Elegir los bordes de las franjas de reserva. America/Bogota se aplica solo a las marcas de tiempo de este módulo.

## Decisions

### Sesión en la base y cookie opaca

La cookie es httpOnly y guarda solo el identificador de una fila `Sesion`. No guarda el rol ni la contraseña. Al cerrar sesión se borra la fila, así una cookie copiada deja de autorizar. El rol se lee del usuario en el servidor en cada operación protegida.

Alternativa descartada: cookie firmada con el rol dentro. Un cambio de rol no tendría efecto hasta expirar y un cliente podría presentar un rol que la base no tiene.

Duración aprobada de la sesión: 12 horas desde su creación, evaluada en America/Bogota. El cierre explícito la invalida antes. Pasadas las 12 horas, la operación protegida se rechaza.

### Hash con bcrypt

La contraseña se hashea en el servidor con bcrypt y un factor de coste 12. En Windows y en un plazo corto evita una dependencia nativa. El valor guardado no es la contraseña.

Alternativa descartada: Argon2. Es más resistente, pero su módulo nativo complica la puesta en marcha local.

### Registro público sin rol elegible

El Server Action de registro escribe siempre `ESTUDIANTE`, aunque el formulario envíe otro valor. El correo se guarda en minúsculas y es único. La contraseña de menos de 8 caracteres se rechaza antes de crear la cuenta. Esos ocho caracteres son una decisión aprobada, no un supuesto.

### Script del primer Administrador

Un script de Node, no una ruta, lee el correo y la contraseña desde variables de entorno y crea un usuario `ADMINISTRADOR` solo si todavía no existe ninguno. Si ya existe, termina sin crear otro. No se invoca desde el registro.

Alternativa descartada: usuario administrador fijo en el código. Quedaría en el repositorio.

### Autorización en la acción de servidor

Cada operación protegida llama a un módulo de servidor que carga la sesión y el usuario. El permiso se decide con el rol almacenado, no con el valor que envíe el cliente. Asignar rol exige sesión de Administrador y un destino `ESTUDIANTE` o `PROFESOR`. El destino `ADMINISTRADOR` se rechaza: ese rol solo nace del procedimiento controlado. Profesor y Estudiante reciben el mismo rechazo en esa operación, y un usuario no puede cambiar su propio rol.

La interfaz puede ocultar el control. La prueba de acceso no autorizado entra por la acción o la ruta, no solo por el botón.

Con Cache Components, la lectura de la cookie no entra en `use cache`. La interfaz autenticada queda detrás de Suspense. Los datos de cuenta no se prerenderizan como contenido público.

### Prisma y SQLite

Modelos `Usuario` (id, email único, passwordHash, rol, creadoEn) y `Sesion` (id, usuarioId, expiraEn, creadoEn). `creadoEn` y `expiraEn` se persisten en UTC y se interpretan en America/Bogota al comprobar la expiración y al mostrar el instante. Así el escenario de zona horaria no depende del reloj local de la máquina.

`DATABASE_URL` apunta a un archivo SQLite ignorado por Git. Las pruebas usan otro archivo vacío.

### Playwright

La suite arranca la aplicación con la base de prueba, con un solo trabajador para no compartir el archivo SQLite. Los títulos citan el comportamiento de `user-auth` y `role-authorization`. Playwright cubre el registro, el inicio válido e inválido, el cierre, el rechazo cuando han pasado 12 horas en America/Bogota, el acceso anónimo, el Estudiante que pide una operación de administrador y los intentos de asignar Administrador o de cambiar el propio rol.

## Risks / Trade-offs

- [Cache Components sirve una cuenta prerenderizada] → No cachear lecturas de sesión ni de rol. Leer la cookie solo en la petición.
- [El script se ejecuta dos veces] → No crea un segundo Administrador si ya hay uno.
- [bcrypt a coste 12 ralentiza el registro en pruebas] → Aceptable para el MVP. No bajar el coste en producción para acelerar Playwright.
- [La zona de la máquina de pruebas no es Bogota] → Comparar contra America/Bogota, no contra la zona local.
- [SQLite y varios trabajadores de Playwright] → Un trabajador en esta suite.

## Migration Plan

No hay datos previos que migrar. En la construcción se añade el esquema, se genera el cliente y se crea el archivo SQLite local. El retroceso es quitar las rutas de cuenta, el esquema y la dependencia, porque ninguna otra función los usa todavía. Las variables del script no se commitean.

## Open Questions

Ninguna. La longitud mínima de 8 caracteres, la sesión de 12 horas, los tres roles, el Estudiante automático en el registro público y la creación del Administrador solo por el procedimiento controlado están aprobadas. No quedan contradicciones entre la propuesta, las especificaciones, este diseño y las tareas.
