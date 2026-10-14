# Proposal

## Why

La navegación muestra las mismas opciones a quien no tiene sesión y a quien ya entró, y la portada no distingue lo que cada rol puede hacer. El encabezado debe seguir la sesión del servidor y la interfaz debe leerse con más claridad, sin cambiar las reglas ya probadas.

## What Changes

- Sin sesión, la navegación muestra solo Inicio, Ingresar y Crear cuenta.
- Con sesión, oculta Ingresar y Crear cuenta, muestra el correo, un cierre de sesión y las opciones del rol. Estudiante y Profesor ven Inicio, Salas, Reservas y Mi cuenta. El Administrador ve además Roles.
- La portada del visitante presenta la reserva de espacios de estudio. La de una sesión ofrece accesos solo a lo que ese rol puede usar.
- El estilo visual se unifica con la paleta actual, tarjetas, botones y estados de libre, ocupada, cancelación y error.
- No cambian la autenticación, la autorización de las operaciones, las reservas, los horarios ni la persistencia.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `role-authorization`: la navegación principal depende de la sesión y del rol almacenados.
- `public-home`: la portada del visitante conserva el ingreso y el registro; la de una sesión muestra accesos según el rol.

## Impact

- Cambian el encabezado, la portada y el aspecto de estados ya visibles. El cierre de sesión reutiliza la acción existente.
- No hay migración, dependencia nueva ni cambio de esquema.
- Las pruebas que esperan ver Salas o Reservas en la navegación de un visitante deben esperar la navegación pública.
