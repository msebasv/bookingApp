# Proposal

## Why

BookingApp ya autentica por sesión, distingue Administrador, Profesor y Estudiante, y mantiene un catálogo de salas. Ese catálogo no basta para reservar: no hay una reserva confirmada, un horario de sala ni una regla que impida ocupar dos veces el mismo intervalo.

La motivación es permitir reservar una sala real, ya registrada, solo cuando hay disponibilidad. Sin eso, el catálogo no cumple el propósito de la aplicación.

## Objectives

- Confirmar una reserva de forma automática cuando hay disponibilidad, sin un paso de aprobación.
- Permitir crear reservas a Administrador, Profesor y Estudiante. Estudiante y Profesor consultan y cancelan solo las propias. El Administrador consulta y cancela cualquiera.
- Fijar cada reserva en 60 minutos. Si la solicitud no indica duración, asignar 60 minutos. Rechazar una duración explícita distinta. No permitir editar una reserva: quien necesite otro horario cancela y crea otra.
- Admitir un inicio solo de lunes a viernes, en intervalos de 30 minutos alineados con las horas en punto de `America/Bogota`, y solo si esa fecha y hora está entre el momento actual y exactamente 30 días después, ambos límites incluidos.
- Exigir que el inicio y el fin caigan en el horario configurado de esa sala y en un día permitido para reservar. El inicio puede coincidir con la apertura. El fin no supera el cierre y puede coincidir con él.
- Dar a cada sala su propio horario, con hora de apertura y hora de cierre para cualquier día de la semana, configurable solo por el Administrador. Rechazar un horario cuyo cierre sea anterior o igual a la apertura, o que cruce la medianoche. Un día sin horario no admite reservas. Las reservas siguen permitidas solo de lunes a viernes.
- Impedir reservas solapadas de una misma sala. Una reserva puede empezar en el instante en que otra de la misma sala termina.
- Permitir cancelar solo de forma estricta antes de la hora de inicio.
- Impedir desactivar una sala mientras tenga una reserva no cancelada cuyo intervalo todavía no haya terminado, incluida una reserva ya iniciada y en curso. Las reservas canceladas no bloquean la desactivación. Una sala inactiva no admite reservas nuevas, y las existentes se conservan salvo cancelación explícita.
- Comprobar en el servidor las validaciones críticas y la autorización, con independencia del cliente. Quien accede a las reservas sin una sesión válida es redirigido a `/ingreso`.

## What Changes

Alcance del MVP, con las decisiones ya confirmadas:

- Administrador, Profesor y Estudiante pueden crear una reserva. Si hay disponibilidad, queda confirmada.
- Cada reserva dura exactamente 60 minutos. Si la solicitud omite la duración, se asignan 60 minutos. Una duración explícita distinta se rechaza. No se edita una reserva existente.
- El inicio es de lunes a viernes. Cae en un intervalo de 30 minutos alineado con las horas en punto de `America/Bogota`, como 08:00, 08:30 o 09:00.
- La fecha y hora de inicio están entre el momento actual y exactamente 30 días después, ambos incluidos. La zona horaria es `America/Bogota`.
- El inicio queda dentro del horario de apertura y puede coincidir con esa hora. El fin no supera el cierre y puede coincidir con él. Inicio y fin caen, además, en un día permitido para reservar. La ventana de 30 días limita el inicio, no el fin.
- Cada sala tiene su propio horario: hora de apertura y hora de cierre para cualquier día de la semana, incluido el fin de semana. Solo el Administrador lo configura. Se rechaza un cierre anterior o igual a la apertura, y un horario que cruce la medianoche. Un día puede quedar sin horario, y ese día no admite reservas. Configurar sábado o domingo no permite reservar esos días.
- Dos reservas de la misma sala no se solapan. Si una termina en el instante en que la otra empieza, no hay solape.
- Estudiante y Profesor cancelan solo sus propias reservas. El Administrador cancela cualquiera. La cancelación solo se permite estrictamente antes de la hora de inicio.
- Estudiante y Profesor ven solo sus propias reservas. El Administrador ve todas.
- Una sala inactiva no admite reservas nuevas. Las reservas existentes se conservan, salvo cancelación explícita.
- No se puede desactivar una sala mientras tenga una reserva no cancelada cuyo intervalo todavía no haya terminado. Eso incluye una reserva que ya comenzó y sigue en curso. Una reserva cancelada no bloquea la desactivación.
- Las validaciones críticas y la autorización se comprueban en el servidor. Acceder a las reservas sin una sesión válida redirige a `/ingreso`.

Quedan fuera de alcance las reservas recurrentes, las notificaciones, los pagos y los calendarios externos.

## Success criteria

- Una solicitud válida, hecha por Administrador, Profesor o Estudiante y con disponibilidad, queda almacenada como reserva confirmada de 60 minutos.
- El servidor rechaza un inicio que no sea de lunes a viernes, que no caiga en un intervalo de 30 minutos alineado con las horas en punto de `America/Bogota`, que sea anterior al momento actual, que sea posterior a exactamente 30 días después, o que indique una duración distinta de 60 minutos. Acepta un inicio igual al momento actual, un inicio igual a ese momento más 30 días, y una solicitud que omite la duración, guardándola como 60 minutos.
- El servidor rechaza una reserva cuyo inicio sea anterior a la apertura, cuyo fin supere el cierre o cuyo inicio o fin caigan fuera de un día permitido para reservar. Acepta un inicio igual a la apertura y un fin igual al cierre. Rechaza una reserva en sábado o domingo, o en un día sin horario, aunque el fin de semana pueda tener horas configuradas.
- Una solicitud que se solapa con otra reserva de la misma sala es rechazada. Una que empieza exactamente cuando la anterior termina es aceptada si el resto de las reglas se cumple.
- Una solicitud de edición de una reserva existente es rechazada. El horario distinto se obtiene cancelando y creando otra.
- Estudiante y Profesor no cancelan reservas ajenas ni consultan reservas ajenas. El Administrador consulta todas y cancela cualquiera. Una cancelación en el instante de inicio, o después, es rechazada.
- Una sala inactiva rechaza una reserva nueva y conserva las reservas ya existentes hasta que se cancelen de forma explícita.
- Desactivar una sala que tiene una reserva no cancelada todavía no terminada, aunque ya haya comenzado, es rechazado y la sala sigue activa. Una reserva cancelada no impide la desactivación.
- Quien no es Administrador no configura el horario de una sala. Guardar un cierre anterior o igual a la apertura, o un horario que cruza la medianoche, es rechazado y no cambia el horario almacenado.
- Una escritura sin el permiso correspondiente es rechazada en el servidor, aunque el cliente afirme tenerlo. Quien accede sin sesión es redirigido a `/ingreso` y no recibe datos de reservas.
- El sistema no ofrece reservas recurrentes, notificaciones, pagos ni conexión con calendarios externos.

## Capabilities

### New Capabilities

- `reservation-management`: reservas confirmadas de salas de estudio, con duración fija, días e intervalos de inicio, ventana de 30 días en `America/Bogota`, horario propio de cada sala, exclusión de solapes, consulta y cancelación según el rol, salas inactivas sin reservas nuevas y autorización comprobada en el servidor.

### Modified Capabilities

- `room-management`: desactivar una sala deja de ser siempre posible. No se puede desactivar mientras tenga una reserva no cancelada cuyo intervalo todavía no haya terminado, incluida una reserva en curso. Una reserva cancelada no bloquea la desactivación. Desactivarla no borra las reservas existentes. `user-auth` y `role-authorization` no cambian. La sesión y el rol almacenado se reutilizan.

## Impact

- Nueva consulta y nuevas operaciones de reserva sobre la aplicación existente. La ruta de las reservas no forma parte de esta propuesta. Acceder a esas funciones sin una sesión válida redirige a `/ingreso`, igual que el catálogo de salas.
- Nueva persistencia para reservas y para el horario propio de cada sala, con apertura y cierre por día de la semana. El esquema actual cubre usuarios, sesiones y salas. La migración, cuando se implemente, debe ser aditiva y no alterar las migraciones ya aplicadas de autenticación ni de salas.
- La desactivación de salas, ya especificada en `room-management`, deberá rechazarse mientras exista una reserva no cancelada que todavía no haya terminado, y no deberá borrar las reservas. Eso exige un delta de esa capacidad antes de implementar.
- No se añaden dependencias en esta etapa. La propuesta no elige bibliotecas de calendario.
- Las pruebas de extremo a extremo, cuando se implementen, deben seguir en el mismo proyecto y usar una base desechable.
