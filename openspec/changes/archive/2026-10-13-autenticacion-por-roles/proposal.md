# Proposal

## Why

BookingApp no puede proteger salas ni reservas mientras cualquiera pueda actuar sin una cuenta y un rol comprobados en el servidor. Este cambio abre solo el módulo de autenticación y autorización, con la longitud de contraseña, la duración de la sesión, los tres roles y la creación del Administrador ya aprobados.

## What Changes

- Registro e inicio de sesión con correo electrónico y contraseña, sin proveedor externo de identidad.
- Las contraseñas se almacenan solo como hash seguro. La longitud mínima aprobada es de 8 caracteres.
- La sesión vive en el servidor, dura 12 horas y se puede cerrar antes.
- Roles aprobados: Administrador, Profesor y Estudiante. El registro público asigna siempre Estudiante e ignora cualquier rol enviado por el cliente.
- El rol Administrador solo se crea mediante un procedimiento controlado fuera del registro público. Un administrador existente no puede asignar ese rol a otro usuario. Sí puede asignar Profesor o Estudiante.
- Cada operación protegida vuelve a comprobar la sesión y el rol en el servidor.
- Las marcas de tiempo de cuentas y sesiones usan America/Bogota.
- Pruebas Playwright de registro, inicio y cierre de sesión, expiración de la sesión, acceso no autorizado y restricciones de asignación de roles.
- Quedan fuera: salas, disponibilidad, reservas, notificaciones, pagos y calendarios externos.

## Capabilities

### New Capabilities

- `user-auth`: registro, inicio y cierre de sesión, hash de contraseña y sesión de servidor.
- `role-authorization`: roles, asignación inicial de Estudiante, script del primer Administrador y rechazo de operaciones no autorizadas.

### Modified Capabilities

- Ninguna. El repositorio aún no tiene especificaciones en `openspec/specs/`.

## Impact

- Nuevas rutas y acciones de servidor sobre el App Router existente (Next.js 16.4.0, React 19.3.0, TypeScript). La página actual sigue siendo la plantilla.
- Nueva persistencia SQLite con Prisma para usuarios y sesiones. Hoy no hay base de datos ni script de pruebas.
- Dependencias nuevas en la fase de construcción: Prisma, cliente SQLite y una librería de hash. Playwright para los criterios de aceptación. Este cambio no las instala.
- La zona horaria America/Bogota queda como regla de las marcas de tiempo de este módulo. No define todavía los bordes de las franjas de reserva.
