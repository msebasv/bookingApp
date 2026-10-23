# Tasks

## 1. Diálogo de confirmación

- [x] 1.1 Convertir «Cancelar reserva» en un botón que abre un `<dialog>` modal dentro del mismo formulario, con «Volver» (foco inicial) y «Confirmar cancelación» (envío), y cerrar el diálogo al enviar
- [x] 1.2 Mostrar en el diálogo la sala, la fecha y el horario de la reserva, formateados en America/Bogota desde `app/reservas/page.tsx`
- [x] 1.3 Deshabilitar «Confirmar cancelación» mientras la acción está pendiente y mantener debajo del botón el error o el aviso que devuelve `cancelReservation`

## 2. Pruebas

- [x] 2.1 Añadir en `tests/e2e/reservations.spec.ts` un helper `confirmCancel` y usarlo en las pruebas existentes que cancelan, y verificar que siguen comprobando el mismo registro cancelado
- [x] 2.2 Añadir pruebas E2E para abrir el diálogo con los datos de la reserva, volver sin enviar nada, cerrar con Escape devolviendo el foco, confirmar la cancelación y mostrar el error sin aviso de éxito cuando el servidor la rechaza
- [x] 2.3 Verificar que la prueba existente que reenvía la acción sobre la reserva de otra persona sigue recibiendo «No autorizado.»

## 3. Cierre

- [x] 3.1 Ejecutar `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:e2e` con `BOOKINGAPP_E2E_DATABASE_URL` fuera de `prisma/` y `openspec validate confirmacion-cancelacion-reservas --strict`, y verificar que terminan sin errores
- [x] 3.2 Revisar `git diff --check` y `git status --short`, y verificar que `.env`, las bases SQLite y los artefactos de prueba quedan fuera del índice
