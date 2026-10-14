# Proposal

## Why

Quien reserva ya puede crear, consultar y cancelar, pero no ve el horario de la sala ni las franjas ocupadas antes de enviar la solicitud, y la lista no separa próximas, pasadas y canceladas. La portada y la navegación tampoco muestran la aplicación que ya existe.

## What Changes

- Antes de reservar, Estudiante y Profesor ven el horario configurado de la sala elegida y pueden elegir inicios compatibles con esa apertura y ese cierre. La validación que decide si la reserva se guarda sigue en el servidor.
- La navegación muestra el enlace de asignación de roles solo cuando la sesión almacenada es de Administrador.
- La portada describe salas, horarios y reservas, conserva el ingreso y el registro, y mantiene la presentación visual actual en pantallas pequeñas.
- Una agenda muestra, por sala y día, franjas libres y ocupadas. No incluye nombre, correo, identificador ni ningún otro dato de la reserva de otra persona.
- La lista de reservas se filtra en próximas, pasadas y canceladas. Estudiante y Profesor siguen viendo solo las suyas. El Administrador sigue viendo todas, dentro del filtro elegido.
- No cambian la duración de 60 minutos, la ventana de 30 días, los días y la grilla, el solape, la cancelación ni la autorización. No hay tablas nuevas, notificaciones, recurrencia, pagos ni calendarios externos.

## Capabilities

### New Capabilities

- `public-home`: la portada pública explica el uso real de salas, horarios y reservas y conserva el acceso a ingreso y registro.

### Modified Capabilities

- `reservation-management`: consulta del horario antes de reservar, agenda de franjas libres y ocupadas sin datos ajenos, y filtros de próximas, pasadas y canceladas respetando el rol.
- `role-authorization`: el enlace de asignación de roles aparece en la navegación solo para el Administrador de la sesión almacenada.

## Impact

- La portada, la cabecera y la página de reservas cambian su presentación. La cabecera necesita la sesión para decidir el enlace de roles.
- La agenda y los filtros leen `HorarioSala`, `Reserva` y `ReservaOcupacion`. No hay migración ni dependencia nueva.
- Las pruebas de extremo a extremo existentes que esperan ver toda la lista deberán usar el filtro que corresponda. La autorización y las reglas de reserva no se reescriben.
