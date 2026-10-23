# Proposal

## Why

Hoy el botón «Cancelar reserva» envía la cancelación con un solo clic. Un clic accidental libera una sala que la persona sí necesitaba, y la cancelación no se puede deshacer: hay que volver a reservar, si la franja sigue libre. La historia KAN-38 pide confirmar antes de cancelar.

## What Changes

- «Cancelar reserva» deja de enviar el formulario y abre un diálogo modal de confirmación.
- El diálogo identifica la reserva con el nombre de la sala, la fecha y la hora de inicio y fin.
- «Volver», la tecla Escape o cerrar el diálogo no envían nada y la reserva no cambia.
- «Confirmar cancelación» envía la misma acción de servidor que ya existe. Si el servidor rechaza la cancelación, se muestra el error y no aparece el mensaje de éxito.
- El diálogo usa el elemento `<dialog>` nativo, recibe el foco al abrirse y se puede usar solo con teclado.
- No cambian la regla de cancelar estrictamente antes del inicio, la autorización por rol, el esquema de la base de datos ni las dependencias.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `reservation-management`: la cancelación desde la lista pide confirmación con los datos de la reserva antes de enviarse.

## Impact

- `components/reservation-forms.tsx`: `CancelReservationForm` abre el diálogo y recibe la sala, la fecha y la hora para mostrarlas.
- `app/reservas/page.tsx`: pasa esos datos, ya formateados en America/Bogota, al formulario de cancelación.
- `lib/reservations/actions.ts` no cambia: `cancelReservation` sigue validando sesión, rol, estado e instante en el servidor.
- Las pruebas E2E que pulsan «Cancelar reserva» deben confirmar en el diálogo. No hay migración ni dependencia nueva.
