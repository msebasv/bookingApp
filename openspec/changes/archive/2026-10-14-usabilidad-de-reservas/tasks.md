# Tasks

## 1. Reglas de consulta

- [x] 1.1 Añadir en `lib/reservations` funciones puras para los inicios ofrecidos, las franjas de 30 minutos y la clasificación próximas, pasadas y canceladas, y verificar con `npm run test:unit` que un inicio cabe solo si cae en la grilla, empieza en la apertura o después y termina a la hora de cierre o antes, que sábado, domingo y un día sin horario no ofrecen inicios, que una franja ocupada no recibe datos de reserva y que una reserva confirmada sin terminar es próxima
- [x] 1.2 Verificar con el mismo test que un filtro ausente o desconocido equivale a próximas, que una confirmada ya terminada es pasada y que una cancelada no entra en próximas ni en pasadas

## 2. Horario y horas antes de reservar

- [x] 2.1 Mostrar en el formulario de `/reservas` el horario guardado de la sala elegida, incluidos los días sin horario y la nota de que sábado y domingo no se reservan, y verificar en `tests/e2e/reservations.spec.ts` que un estudiante ve la apertura y el cierre antes de confirmar
- [x] 2.2 Sustituir la hora libre por un selector de inicios compatibles y adaptar el helper de reserva de ese spec para elegir una opción legal o inyectar una hora ilegal solo dentro de la prueba, y verificar que una reserva válida sigue confirmándose y que un inicio fuera de horario, enviado fuera del selector, sigue sin crear fila

## 3. Agenda y filtros

- [x] 3.1 Consultar en el servidor las franjas de una sala activa y una fecha usando solo el instante de `ReservaOcupacion`, mostrar libre u ocupada, no reservable en fin de semana y sin horario en un día cerrado, y verificar en el spec E2E que un estudiante ve ocupada la franja de otra persona sin su correo ni el identificador de esa reserva
- [x] 3.2 Filtrar en el servidor la lista por `vista` próximas, pasadas o canceladas, con próximas como valor por defecto, manteniendo el alcance por rol, y verificar en el spec E2E el filtro de cada estado y que un estudiante no ve la reserva de otra persona en ninguno de los tres
- [x] 3.3 Actualizar las afirmaciones E2E existentes que buscan una reserva cancelada en la lista por defecto para abrir antes el filtro canceladas, y verificar que esas pruebas siguen comprobando el mismo registro cancelado

## 4. Navegación y portada

- [x] 4.1 Mostrar el enlace a `/admin/roles` dentro de Suspense solo cuando `getSessionUser` devuelve Administrador, y verificar en el spec E2E que el administrador lo ve, que el estudiante no lo ve y que `?rol=ADMINISTRADOR` no se lo muestra al estudiante
- [x] 4.2 Actualizar la portada para nombrar salas, horarios y reservas, conservar Ingresar y Crear cuenta y el diseño actual, y verificar en el spec E2E que la portada muestra esos tres usos y ambos enlaces

## 5. Cierre

- [x] 5.1 Ejecutar `npm run lint`, `npm run build`, `npm run test:unit`, `npm run test:e2e` con `BOOKINGAPP_E2E_DATABASE_URL` en una base temporal fuera de `prisma/`, y `openspec validate usabilidad-de-reservas --strict`, y verificar que todos terminan sin errores
- [x] 5.2 Revisar `git diff --check`, `git status --short` y los hashes de `prisma/dev.db` y `prisma/e2e.db`, y verificar que no hay errores de espacio, que no se modificaron migraciones anteriores ni esas bases, y que `.cursor/`, `.env` y artefactos generados quedan fuera del índice

## Workflow follow-up

- Sincronizar las especificaciones y archivar `usabilidad-de-reservas` solo después de que el grupo 5 pase.
- No crear un commit ni hacer push.
