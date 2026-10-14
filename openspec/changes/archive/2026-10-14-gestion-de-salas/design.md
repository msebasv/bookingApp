# Design

## Context

La aplicación ya tiene autenticación y autorización. Prisma con SQLite define solo `Usuario` y `Sesion`, en la migración `20261014015041_init`. No existe un modelo, tabla o relación de sala. See proposal.md for why this slice comes next.

La sesión se lee en el servidor con la cookie httpOnly existente. Cada operación protegida vuelve a cargar el rol almacenado. Con Cache Components, esa lectura ocurre en el momento de la petición, detrás de Suspense, y no entra en `use cache`. La interfaz usa los tokens de `app/globals.css`, `Panel` y la cabecera de `components/shell.tsx`, y los campos y alertas de `components/auth-forms.tsx`.

Playwright arranca `next start` en el puerto 3100, con un trabajador, `DATABASE_URL=file:./e2e.db` y la migración aplicada en el preparador global. Las nueve pruebas de autenticación siguen siendo la base que no hay que romper.

## Goals / Non-Goals

**Goals:**

- Añadir el catálogo de salas sin tocar el comportamiento de cuentas, sesiones, cookies, contraseñas ni asignación de roles.
- Mostrar al Administrador todas las salas y, a Estudiante y Profesor, solo las activas.
- Reutilizar la sesión y el rol ya almacenados para autorizar la escritura.
- Mantener la misma superficie visual: fondo claro, tarjetas, campos y alertas existentes.
- Dejar pruebas de extremo a extremo para la consulta según el rol, el alta, la edición, la activación, la desactivación, la validación y el rechazo de quien no es Administrador.

**Non-Goals:**

- Reservas, calendarios, disponibilidad horaria, recurrencias y notificaciones.
- Borrar salas, relacionar una sala con un usuario o guardar quién la editó.
- Nuevas dependencias, un segundo administrador o cambios al script de inicialización.
- Un tope de capacidad distinto de un entero mayor o igual que 1.

## Decisions

### No hay una sala que reutilizar

La revisión del esquema y de la migración inicial no encuentra una entidad equivalente. Se añade el modelo `Sala` en una migración nueva. La migración `20261014015041_init` no se edita. No se crea una relación con `Usuario`: la autorización usa la sesión actual y no necesita una clave foránea.

Alternativa descartada: guardar las salas como texto dentro de `Usuario`. Mezclaría el catálogo con las cuentas y no permitiría un código único de sala.

### Campos persistidos

`Sala` guarda `id` (cuid), `nombre`, `codigo`, `codigoNormalizado`, `ubicacion`, `capacidad` (entero), `descripcion` opcional, `estado` (texto, valor inicial `ACTIVA`) y las marcas `creadoEn` y `actualizadoEn`. El estado solo admite `ACTIVA` e `INACTIVA`. `descripcion` vacía se guarda como ausente. Las marcas no se muestran en el catálogo; la lista muestra nombre, código, ubicación, capacidad, descripción si existe y el estado.

Los límites confirmados se aplican en la validación de la aplicación, no como ancho de columna de SQLite: nombre hasta 100 caracteres, código hasta 20, ubicación hasta 120 y descripción hasta 500. La capacidad es un entero mayor o igual que 1, sin otro máximo.

`codigo` conserva el texto recortado, con sus mayúsculas, para mostrarlo. `codigoNormalizado` es ese mismo texto en minúsculas y tiene índice único. SQLite trata el único de `codigo` como sensible a mayúsculas, así que el índice normalizado es el que impide `A-1` y `a-1` a la vez. Al editar, la comparación excluye la propia sala.

Alternativa descartada: un enum de Prisma. El rol ya es texto por SQLite; el estado sigue el mismo criterio.

Alternativa descartada: `deletedAt`. El requisito es activar y desactivar, no un borrado lógico paralelo.

### Página `/salas` y operaciones separadas

Sin sesión, `/salas` redirige a `/ingreso`. Con sesión, el listado se filtra en el servidor según el rol almacenado: el Administrador recibe activas e inactivas; Estudiante y Profesor reciben solo `ACTIVA`. El orden es por nombre, sin distinguir mayúsculas. Estudiante y Profesor no ven los controles de escritura. El Administrador ve crear, editar, activar y desactivar. La cabecera añade el enlace «Salas».

La edición actualiza nombre, código, ubicación, capacidad y descripción. No acepta un estado y no lo modifica. Activar y desactivar son operaciones distintas y solo cambian `estado`. Si la sala ya está en el estado pedido, la operación termina sin error y sin borrar nada. No existe una operación de borrado.

Alternativa descartada: mostrar las inactivas también a Estudiante y Profesor. La decisión confirmada es que solo el Administrador las consulta.

### Autorización dentro de cada escritura

Cada acción de crear, editar o cambiar estado llama a la lectura de sesión existente. Sin sesión responde «Debes iniciar sesión.» Un rol distinto de `ADMINISTRADOR` responde «No autorizado.» El rol enviado por el cliente se ignora. Es el mismo criterio que asignar rol: ocultar el botón no sustituye la comprobación.

Los textos estables de la interfaz, para las pruebas, son: «Salas», «No hay salas registradas.», «Crear sala», «Guardar cambios», «Activar», «Desactivar», «Activa», «Inactiva», «Sala creada.», «Sala actualizada.», «Sala activada.», «Sala desactivada.», «El nombre es obligatorio.», «El nombre admite como máximo 100 caracteres.», «El código es obligatorio.», «El código admite como máximo 20 caracteres.», «La ubicación es obligatoria.», «La ubicación admite como máximo 120 caracteres.», «La descripción admite como máximo 500 caracteres.», «La capacidad debe ser un entero mayor o igual que 1.» y «Ese código ya está registrado.»

### Validación repetida

Una función compartida recorta los textos y aplica los límites confirmados. El formulario la usa antes de enviar y la acción de servidor la vuelve a aplicar. Una petición directa con datos inválidos no crea ni modifica filas. Un valor de 100, 20, 120 o 500 caracteres en el campo correspondiente es válido. Uno más largo se rechaza.

### Interfaz

Se reutilizan `Panel`, los colores ya definidos y las clases de campo, botón y alerta de los formularios de cuenta. Si el campo de esos formularios no está exportado, se exporta o se comparte el bloque visual; no se copia una segunda identidad gráfica ni se añade una librería de iconos. El listado es una serie de superficies con borde, legible en escritorio y en un ancho estrecho. No se insertan salas de ejemplo.

### Pruebas

Las pruebas nuevas viven en `tests/e2e`, en el mismo proyecto de Playwright y con el mismo trabajador único. Cubren el listado vacío, el orden por nombre, que el Administrador ve una sala inactiva y que Estudiante y Profesor no la ven, la redirección de `/salas` a `/ingreso` sin sesión, el alta, los límites de 100, 20, 120 y 500 caracteres, la edición que no cambia el estado, la desactivación y la reactivación sin perder la fila, el rechazo de campos vacíos, capacidad inválida y código duplicado aunque cambie la caja, y el rechazo de escritura anónima, de Estudiante y de Profesor, incluido un rol de Administrador enviado por el cliente. La suite de autenticación no se reescribe.

## Risks / Trade-offs

- [El listado se prerenderiza sin sesión] → Leer la sesión en la petición, dentro de Suspense, y no cachear esa lectura.
- [El control está oculto pero la acción se puede invocar] → Cada escritura comprueba sesión y rol. La prueba repite la petición, no solo mira el botón.
- [El único de SQLite distingue mayúsculas] → El índice de `codigoNormalizado` cubre el requisito. La sala editada no choca consigo misma.
- [Varios trabajadores escriben el mismo SQLite] → La suite sigue en un trabajador y una base desechable.
- [Una sala inactiva se filtra mal] → La consulta de Estudiante y Profesor exige `ACTIVA`. La prueba compara ese listado con el del Administrador.

## Migration Plan

Durante la implementación se crea una migración nueva que solo añade `Sala` y sus índices únicos. No se modifica `20261014015041_init` ni los modelos `Usuario` y `Sesion`. El preparador de Playwright aplica esa migración sobre `e2e.db`. No hay filas previas que convertir.

El retroceso es revertir esa migración y quitar la ruta y las acciones de salas. Las cuentas y sesiones no dependen de `Sala`.
