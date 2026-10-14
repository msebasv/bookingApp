# Proposal

## Why

BookingApp ya distingue cuentas y roles, pero no tiene un catálogo de salas que se pueda consultar y mantener. Sin ese catálogo, la disponibilidad y las reservas no tienen un espacio real sobre el cual apoyarse.

## What Changes

- El Administrador consulta todas las salas, activas e inactivas. Estudiante y Profesor consultan solo las salas activas.
- Quien no tiene sesión y abre `/salas` es redirigido a `/ingreso`.
- Crear una sala y editar sus datos. Editar no cambia el estado.
- Activar o desactivar una sala sin borrar el registro. El estado inicial es activa.
- Validar en el cliente y, de forma independiente, en el servidor: nombre obligatorio de hasta 100 caracteres, código obligatorio de hasta 20 caracteres y único sin distinguir mayúsculas, ubicación obligatoria de hasta 120 caracteres, capacidad como entero mayor o igual que 1, y descripción opcional de hasta 500 caracteres.
- Reservar la creación, la edición y el cambio de estado al rol Administrador, comprobado en el servidor en cada operación de escritura.
- Pruebas de extremo a extremo para listar según el rol, crear, editar, activar y desactivar, rechazar datos inválidos y rechazar escrituras de quien no es Administrador.
- Quedan fuera: reservas, calendarios, disponibilidad horaria, recurrencias y notificaciones.

## Capabilities

### New Capabilities

- `room-management`: catálogo de salas de estudio, con consulta según el rol, alta, edición, estado activa o inactiva y autorización de escritura.

### Modified Capabilities

- Ninguna. `user-auth` y `role-authorization` no cambian sus requisitos. Este cambio reutiliza la sesión de servidor y el rol almacenado que esas especificaciones ya exigen.

## Impact

- Nueva página de salas y acciones de escritura sobre la aplicación y la interfaz visual existentes.
- Nueva persistencia para salas. El esquema actual solo contiene usuarios y sesiones; no hay una entidad de sala que se pueda reutilizar. La migración es aditiva y no modifica las tablas ni las migraciones de autenticación.
- No se añaden dependencias.
- Las pruebas de extremo a extremo existentes permanecen en el mismo proyecto y siguen usando una base desechable.
