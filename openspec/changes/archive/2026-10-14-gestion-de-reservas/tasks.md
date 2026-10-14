# Tasks

## 1. Persistencia

- [x] 1.1 Añadir `HorarioSala`, `Reserva` y `ReservaOcupacion` en `prisma/schema.prisma` y en una migración nueva, sin editar `20261014015041_init` ni `20261014080241_add_sala` y sin cambiar columnas ya existentes de `Usuario`, `Sesion` o `Sala`, y verificar que el SQL crea las tres tablas, el único `(salaId, dia)`, el único `(salaId, instante)` y las claves foráneas con `ON DELETE RESTRICT`
- [x] 1.2 Verificar con `prisma validate` que `HorarioSala` apunta a `Sala`, que `Reserva` apunta a `Sala` y a `Usuario`, que `ReservaOcupacion` guarda `salaId` e `instante` y apunta a `Reserva` y a `Sala`, y que el cliente generado expone los tres modelos sin haber aplicado la migración a la base de desarrollo

## 2. Reglas puras

- [x] 2.1 Implementar en `lib/reservations/time.ts` el día ISO 1–7 con `Intl.DateTimeFormat.formatToParts`, locale `en-US`, `weekday: "long"` y el mapa fijo de lunes a domingo, más hora y minuto con `America/Bogota` y `hourCycle: "h23"`, sin cambiar `sessionExpiry`, y verificar con `node:test` que el mapa es estable y que un nombre de día no reconocido se rechaza
- [x] 2.2 Implementar la duración en `lib/reservations/validation.ts`: si se omite, asignar 60 minutos; si es explícita y distinta de 60, rechazarla, y verificar con `node:test` ambos casos
- [x] 2.3 Implementar la ventana de inicio, inclusive, desde el instante actual hasta ese instante más 30 días de 24 horas en `America/Bogota`, sin usar esa ventana para rechazar el fin, y verificar con `node:test` el instante actual, el extremo de 30 días y un inicio anterior o posterior
- [x] 2.4 Implementar la rejilla de minutos 0 o 30, el rechazo de un inicio a las 08:15, el rechazo de sábado y domingo aunque tengan horario, y el rechazo cuando inicio y fin caen en fechas distintas de Bogotá, incluidos un inicio de lunes a jueves a las 23:00 o 23:30 y un fin de viernes que cae en sábado, y verificar cada caso con `node:test`
- [x] 2.5 Implementar la validación de horario por sala y día: minutos de 0 a 1439, cierre posterior a la apertura, día sin fila, inicio igual o posterior a la apertura y fin igual o anterior al cierre, y verificar con `node:test` la apertura igual, el cierre igual, el inicio anterior a la apertura, el fin posterior al cierre, el día ausente y el cierre que no es posterior a la apertura
- [x] 2.6 Añadir el script `test:unit` con `node --test` y cubrir en `tests/unit/reservations.test.ts` las ocupaciones `{inicio, inicio + 30 minutos}` sin ocupar `fin`, el solape a los 0 y 30 minutos, la adyacencia a los 60 minutos, y la cancelación con reloj fijo igual a `inicio` o anterior, y verificar que `npm run test:unit` pasa sin abrir una base de datos

## 3. Horarios

- [x] 3.1 Crear `tests/e2e/reservations.spec.ts` antes de cualquier otra tarea que lo use e implementar ahí el guardado del horario de un día en una transacción interactiva que toma el bloqueo antes de modificar la fila, reemplazando o borrando `(salaId, dia)` en ese mismo callback, y verificar con Playwright que un par inválido no cambia las horas guardadas y que vaciar un día lo deja sin horario
- [x] 3.2 Limitar la configuración al Administrador, incluido el domingo, ampliando el spec creado en 3.1, y verificar con Playwright que guarda lunes y domingo y que Estudiante y Profesor no cambian el horario
- [x] 3.3 Mostrar el formulario de horario en los controles de administrador de `/salas`, reutilizando los estilos existentes, y verificar con Playwright, en el spec creado en 3.1, que el Administrador lo ve y que Estudiante y Profesor no reciben esos controles

## 4. Reservas

- [x] 4.1 Implementar `lib/reservations/queries.ts` sin marcarlo como server action, la página `/reservas` con Suspense y el enlace «Reservas», y verificar con Playwright, ampliando el spec creado en 3.1, que sin sesión redirige a `/ingreso`, que Estudiante y Profesor ven solo sus reservas y que el Administrador ve todas
- [x] 4.2 Implementar la creación que confirma automáticamente una reserva de 60 minutos para Administrador, Profesor o Estudiante, sin una acción que modifique `inicio`, `fin` o `salaId`, y verificar con Playwright, en ese mismo spec, la confirmación, que una duración omitida queda guardada con fin a los 60 minutos, el rechazo de otra duración explícita y el rechazo de una edición sin cambiar la fila
- [x] 4.3 Implementar la cancelación en una transacción que relee la reserva, no escribe si no está `CONFIRMADA` o si `inicio` ya no es estrictamente futuro, y borra solo las ocupaciones de ese `reservaId` antes de pasar a `CANCELADA`, y verificar con Playwright, en el spec ya creado, la cancelación propia, el rechazo de una reserva ajena, la cancelación por un Administrador y que una segunda cancelación no vuelve a ocupar el intervalo
- [x] 4.4 Ampliar el spec creado en 3.1 con dos salas distintas y el mismo intervalo, y verificar con Playwright que el servidor confirma las dos reservas
- [x] 4.5 Ampliar ese spec con una reserva y otra cuyo inicio es exactamente el fin de la primera, y verificar con Playwright que el servidor confirma ambas y que no hay conflicto de ocupación
- [x] 4.6 Después de la cancelación de 4.3, ampliar ese spec para cancelar una reserva y crear otra en el mismo intervalo, y verificar con Playwright que quedan dos registros distintos, uno `CANCELADA` y otro `CONFIRMADA`, y que la operación no se trata como una edición
- [x] 4.7 Después de la creación de 4.2, ampliar ese spec para sábado y domingo con horario configurado, y verificar con Playwright que el servidor rechaza esas reservas y no crea filas

## 5. Concurrencia

- [x] 5.1 Crear la reserva y sus dos `ReservaOcupacion`, con el mismo `salaId`, dentro de una transacción interactiva que ya tomó el bloqueo, releyendo ahí que la sala sigue activa y que el horario de ese día todavía admite el intervalo, y verificar con Playwright, en el spec creado en 3.1, que si falta el horario o el fin supera el cierre no se insertan `Reserva` ni `ReservaOcupacion`
- [x] 5.2 Dejar que `P2002` salga del callback y se traduzca fuera a rechazo por solape, sin capturarlo dentro de la transacción, y verificar con dos creaciones reales simultáneas de la misma sala e intervalo, en ese spec, que cualquiera puede ganar, que solo una queda confirmada y que esa reserva tiene exactamente dos ocupaciones y no hay filas de más. Esta carrera no demuestra el manejo de `P2028` ni de `SQLITE_BUSY`
- [x] 5.3 Comprobar el índice único con dos inserciones directas de `ReservaOcupacion` para el mismo `(salaId, instante)` usando solo `e2e.db` (`DATABASE_URL=file:./e2e.db`), sin usar la base de desarrollo y sin llamar a la acción de creación, y verificar que la segunda inserción falla, que queda una sola ocupación para esa clave y que el intento fallido no deja un duplicado ni una escritura parcial
- [x] 5.4 Forzar en `e2e.db` el fallo de espera o de bloqueo con otra conexión que mantiene `BEGIN IMMEDIATE` mientras la creación usa una transacción interactiva de espera corta, y verificar que el error es `P2028` o un error de conector por `SQLITE_BUSY` o base bloqueada, que no se clasifica como `P2002`, y que ese intento no deja `Reserva` ni `ReservaOcupacion`

## 6. Gestión de salas

- [x] 6.1 Coordinar la desactivación en `setRoomState` con una transacción interactiva que, ya con el bloqueo, busca reservas no canceladas con `fin` posterior al instante actual, y verificar con Playwright, en el spec creado en 3.1 y sembrando por Prisma solo en `e2e.db`, que una reserva confirmada futura que todavía no empieza y una reserva ya iniciada y no terminada impiden desactivar, que la sala sigue activa, que sus reservas no se borran y que desactivar sí procede cuando la reserva se canceló o ya terminó
- [x] 6.2 Rechazar una reserva nueva si la relectura interna de la transacción encuentra la sala inactiva, conservando las reservas ya existentes, y verificar con Playwright, en ese spec, el rechazo y que la reserva previa sigue almacenada hasta una cancelación explícita
- [x] 6.3 Dejar la activación como está hoy y verificar con Playwright, en ese spec, que una sala inactiva puede volver a activa sin borrar reservas

## 7. Seguridad

- [x] 7.1 Autorizar cada escritura de reserva y de horario con el rol guardado por `getSessionUser`, ignorando el rol enviado por el cliente, sin modificar `lib/auth/session.ts` ni `lib/auth/actions.ts`, y verificar con Playwright, en el spec creado en 3.1, que un Estudiante que afirma ser Administrador no configura horarios, no cancela reservas ajenas y no recibe el listado completo
- [x] 7.2 Rechazar en el servidor una petición directa que se salta el formulario y viola una regla crítica, y verificar con Playwright, en ese spec, que las reservas y los horarios almacenados no cambian y que el acceso anónimo a la funcionalidad de reservas redirige a `/ingreso` sin mostrar datos

## 8. Pruebas unitarias

- [x] 8.1 Completar `tests/unit/reservations.test.ts` con los límites de 30 días, el inicio a las 08:15, el inicio anterior a la apertura, el fin posterior al cierre, el día sin horario, la duración omitida de 60 minutos, sábado y domingo aunque tengan horario, el cruce de medianoche, la cancelación con reloj fijo y los solapamientos de la rejilla, y verificar que `npm run test:unit` pasa, que los tests no dependen del orden y que no usan datos residuales ni una base de datos

## 9. Pruebas E2E

- [x] 9.1 Ampliar el `tests/e2e/reservations.spec.ts` creado en 3.1, sin crear otro archivo, de modo que cada prueba cree sus propios usuarios y salas con identificadores únicos, sin asumir tablas vacías ni el orden de `rooms.spec.ts` o de las pruebas de autenticación, y verificar que la spec se ejecuta sobre `e2e.db` y no sobre la base de desarrollo
- [x] 9.2 Comprobar en ese spec, y añadir el caso que falte, la creación confirmada, la duración omitida guardada a 60 minutos, el rechazo de las 08:15, el inicio anterior a la apertura, el fin posterior al cierre, el día sin horario, sábado y domingo con horario configurado, las dos salas en el mismo intervalo, el inicio adyacente, la cancelación seguida de una reserva nueva, la cancelación en el instante de inicio sembrada o decidida con reloj explícito, los permisos y la desactivación, y verificar que esos casos pasan en Playwright
- [x] 9.3 Comprobar en ese spec la carrera de dos creaciones de la misma sala e intervalo, por separado de la prueba controlada de `P2028` o `SQLITE_BUSY` de la tarea 5.4 y de la inserción directa del índice en `e2e.db`, y verificar un solo confirmado, ninguna reserva parcial y que ni el índice ni la carrera sustituyen a la prueba de bloqueo
- [x] 9.4 Comprobar las claves foráneas con el cliente Prisma de la aplicación sobre `e2e.db`, sin ejecutar `PRAGMA foreign_keys = ON` y sin usar la base de desarrollo, y verificar que `PRAGMA foreign_keys` vale `1`, que borrar `Sala`, `Usuario` o `Reserva` con hijos falla y conserva la fila, y que insertar un hijo con padre inexistente también falla

## 10. Verificación final

- [x] 10.1 Ejecutar `npm run lint`, `npm run build`, `npm run test:unit` y `npm run test:e2e`, y verificar que pasan el análisis, la compilación, las pruebas unitarias y la suite completa, incluidas autenticación, salas y reservas
- [x] 10.2 Ejecutar `openspec validate gestion-de-reservas --strict` y verificar que el cambio sigue siendo válido
- [x] 10.3 Revisar el diff y verificar que no se reescribieron las migraciones anteriores, que no se aplicó la migración nueva a la base de desarrollo, que las pruebas de reservas usan `e2e.db`, y que la sesión, la cookie y la asignación de roles permanecen sin cambios

## Workflow follow-up

- Archivar el cambio cuando la implementación esté aceptada, para copiar los deltas a las especificaciones principales.
