# Design

## Context

See proposal.md for why reservations are needed, and the deltas under `specs/` for the approved behavior. This document only records how that behavior fits the current application.

Prisma 6 and SQLite today persist `Usuario`, `Sesion` and `Sala`. `Sala` has no relation to `Usuario`. Roles are the strings `ESTUDIANTE`, `PROFESOR` and `ADMINISTRADOR`. There is no Prisma enum. `getSessionUser` reads the httpOnly cookie `bookingapp_session` and loads the stored role. Room writes repeat that check inside the server action. `/salas` redirects to `/ingreso` when `listRoomsForSession` returns null. Cache Components require that session read to happen on the request, behind Suspense, and not inside `use cache`.

`America/Bogota` is already the zone for session timestamps, via `BOGOTA_TIME_ZONE` and `Intl.DateTimeFormat` in `lib/auth/time.ts`. Colombia does not observe daylight saving time. There is no date library in `package.json`.

Playwright uses one worker, `DATABASE_URL=file:./e2e.db`, deletes that file in `tests/global-setup.ts`, and runs `prisma migrate deploy` before `next start` on port 3100. The only test script is `test:e2e`. There is no unit-test dependency. That setup wipes the database once per run. Later files share whatever rows earlier files inserted.

The installed query engine for Prisma 6.19.3 (engines `c2990dca591cba766e3b7ef5d9e8a84796e47ab7`) contains `BEGIN IMMEDIATE` at `quaint\src\connector\sqlite\params.rs:87` and does not contain `BEGIN DEFERRED` or `BEGIN EXCLUSIVE`. Interactive `prisma.$transaction` on this native engine is the write path that uses that statement. `lib/rooms/actions.ts` today updates `Sala.estado` with a single `update` and branches only on `P2002`.

## Goals / Non-Goals

**Goals:**

- Persist reservations and per-room weekly hours without changing session, cookie, password, or role-assignment behavior.
- Make a double booking of the same room fail even when two requests pass the availability check together.
- Keep deactivation in the existing room action, and refuse it while a non-cancelled reservation has not ended.
- Test the pure time rules without a new dependency, and test the authorized flows with the existing Playwright project.

**Non-Goals:**

- Recurring reservations, notifications, payments, and external calendars.
- A new date library, a Postgres exclusion constraint, or an in-memory lock as the overlap guarantee.
- Editing `20261014015041_init` or `20261014080241_add_sala`.
- Physical deletion of rooms, users, or reservations.

## Decisions

### Data model

Add three models in one new migration. Do not edit `Usuario` or `Sala` columns that already exist. Add relations only.

`HorarioSala` belongs to one `Sala` through `salaId`, with `onDelete: Restrict`. One row is one weekday. `dia` is an integer using ISO numbering in `America/Bogota`: 1 Monday through 7 Sunday. `aperturaMinuto` and `cierreMinuto` are minutes from midnight on that same day, from 0 through 1439. The pair is unique on `(salaId, dia)`. A missing row means that weekday has no hours and admits no reservation. Saving is rejected when `cierreMinuto` is less than or equal to `aperturaMinuto`, or when either minute falls outside 0 through 1439. That comparison also rejects a window that crosses midnight, because an overnight window cannot be stored as a later closing minute on the same day. Clearing one day deletes that `HorarioSala` row from the application. Restrict does not block that delete; it blocks deleting the parent `Sala` while the row exists.

`Reserva` belongs to one `Sala` and to the `Usuario` who created it. Both foreign keys use `onDelete: Restrict`. The application does not delete rooms, users, or reservations. Restrict is what keeps a historical reservation row when a parent delete is attempted. Fields: `id` (cuid), `salaId`, `usuarioId`, `inicio`, `fin`, `estado`, `creadoEn`, and `actualizadoEn`. `inicio` and `fin` are absolute instants. `fin` is always `inicio` plus 60 minutes. `estado` is the text `CONFIRMADA` or `CANCELADA`, following the existing choice of text instead of a Prisma enum. SQLite does not gain a `CHECK` on `estado`; the application is the only writer of those two values.

`ReservaOcupacion` belongs to one `Reserva` through `reservaId` and to one `Sala` through `salaId`. Both foreign keys use `onDelete: Restrict`. The reservation row stays after cancellation, so occupancy is removed by an explicit `deleteMany` on `reservaId`, not by deleting `Reserva`. Restrict on `reservaId` keeps that history if a later delete of `Reserva` is attempted while occupancy rows still exist. The server writes the same `salaId` on the reservation and on both occupancy rows. The unique key is `(salaId, instante)`.

A migration clause `ON DELETE RESTRICT` records the rule. It is not the runtime guarantee. On this project's Prisma Client 6.19.3, a new connection to SQLite 3.46.0 already reports `PRAGMA foreign_keys` as `1`, including across eight concurrent reads on that client. A restricted delete of a parent that still has a child fails and leaves the parent row in place. Inserting a child whose parent does not exist fails as well. Raw SQL surfaces that as `P2010` with the message `FOREIGN KEY constraint failed`. The application does not run `PRAGMA foreign_keys = ON` to turn the flag on, and it does not run that statement inside `$transaction`, where SQLite would ignore it. The automated test under Tests is what checks this on `e2e.db` with the application's Prisma client.

Alternatives discarded: storing opening hours as `DateTime` values, which SQLite would treat as instants and which would drift away from a wall-clock schedule; storing the schedule as JSON on `Sala`, which would not constrain one row per weekday; using a Prisma enum, which the current SQLite models do not use; `onDelete: Cascade` on these new relations, which would discard hours or occupancy when a parent row disappeared.

### Reservation state and cancellation

A successful create stores `CONFIRMADA` and its occupancy rows. There is no update action for room, start, or end. Cancellation is allowed only when the reservation is `CONFIRMADA` and the caller's instant is strictly before `inicio`. At `inicio` or later, the action changes nothing.

The cancel action performs that decision inside one interactive `prisma.$transaction`, the same `BEGIN IMMEDIATE` shape as create and deactivation:

1. Read that reservation again inside the transaction.
2. If `estado` is not `CONFIRMADA`, or `inicio` is not strictly after the caller's instant, finish the callback without writing. The action outside the callback returns the functional rejection. The stored row and its occupancy stay as they were.
3. If it is still cancellable, `deleteMany` where `reservaId` is that reservation, then set `estado` to `CANCELADA`. Both statements are in that same callback. The reservation row remains.

Estudiante and Profesor may cancel only a row whose `usuarioId` is the session user. Administrador may cancel any `CONFIRMADA` reservation that is still strictly before `inicio`. A second cancel finds a row that is no longer `CONFIRMADA`, writes nothing, and does not insert occupancy again.

### Availability

Shared validation lives in a module that both the form and the server action call. The server result is authoritative. The rules, evaluated in `America/Bogota`, are:

- The caller has a session. The page and the reservation actions redirect to `/ingreso` when the session is missing, and they do not read or write reservation data. This matches `/salas`. Room actions keep their current error texts; this design does not change them except for the deactivation guard below.
- The stored role is `ESTUDIANTE`, `PROFESOR`, or `ADMINISTRADOR`. A role sent by the client is ignored.
- The room exists and, inside the create transaction, is still `ACTIVA`. The form may read `estado` or the schedule early; the reads that decide the insert are the ones inside that transaction, as specified under overlap.
- `inicio` is greater than or equal to the current instant and less than or equal to that instant plus exactly 30 days of 24 hours. The end may fall outside that window.
- The Bogota weekday of `inicio` and of `fin` is Monday through Friday.
- The Bogota minute of `inicio` is 0 or 30.
- `inicio` and `fin` fall on the same Bogota calendar date. A reservation that reaches the next date is rejected. Each instant is compared with the `HorarioSala` of its own date: `inicio` is greater than or equal to that day's opening, so 08:00 is valid when the room opens at 08:00, and `fin` is less than or equal to that day's closing.
- If the request omits duration, the server assigns 60 minutes. An explicit duration other than 60 minutes is rejected and creates no row.

Weekday, calendar date, hour, and minute come from `Intl.DateTimeFormat.formatToParts` with `timeZone: BOGOTA_TIME_ZONE`, extending `lib/auth/time.ts` without changing `sessionExpiry`. The weekday formatter uses `weekday: "long"` and locale `en-US`, so the names do not follow the server locale. The map is fixed: `Monday` 1, `Tuesday` 2, `Wednesday` 3, `Thursday` 4, `Friday` 5, `Saturday` 6, `Sunday` 7. Hour and minute use `hourCycle: "h23"`, the same cycle `bogotaHour` already uses. A missing part, or a weekday name outside that map, rejects the request. The server clock remains `Date.now()`. Bogota has no daylight-saving transition, so 30 calendar days from an instant equal 30 times 24 hours.

### Overlap under concurrent requests

SQLite has no exclusion constraint. A query that looks for an overlap and then inserts, outside one write transaction, lets two requests both observe no conflict.

The selected guarantee has two parts:

1. Each confirmed reservation occupies exactly two grid instants: `inicio` and `inicio` plus 30 minutes. It does not occupy `fin`. The interval is therefore half-open, `[inicio, fin)`. A later reservation whose `inicio` equals the earlier `fin` uses the next two instants and does not collide. A reservation at 08:30 collides with one at 08:00 because both claim 08:30. The unique key `(salaId, instante)` makes that collision a database constraint. A cancelled reservation deletes its occupancy rows, so the key can be used again. This key excludes overlaps only while the server enforces both of the following: the stored duration is exactly 60 minutes, and the Bogota minute of `inicio` is 0 or 30. A 90-minute reservation, or a start at minute 15, can overlap another interval without sharing those two instants. The server rejects those requests before insert. The index alone does not.
2. The server creates the `Reserva` and its two `ReservaOcupacion` rows inside one interactive `prisma.$transaction`. On this SQLite engine, Prisma starts that transaction with `BEGIN IMMEDIATE`, so the write lock is held before the callback reads the rows that decide the insert. The callback then reads `Sala` again. If the room is missing or `estado` is not `ACTIVA`, it returns without inserting, and the action outside reports the inactive-room rejection. If the room is still active, the callback reads `HorarioSala` for that `salaId` and for the ISO weekday of the reservation's Bogota date. If that row is missing, or the reservation no longer fits that opening and closing, the callback returns without inserting. Only then does it insert the `CONFIRMADA` reservation and the two occupancy rows with that same `salaId`. It does not catch errors inside the callback.

Saving one day's schedule uses its own interactive transaction of the same shape. `BEGIN IMMEDIATE` takes the write lock before that callback changes the row. Inside the single callback the action replaces that `(salaId, dia)` row, or deletes it when the day is cleared. A concurrent create cannot see the day with the old row already gone and the new row not yet written. This design does not reject a schedule save because an existing reservation would fall outside the new hours. That rule is not approved. Existing reservations stay until they are cancelled.

Deactivation uses its own interactive transaction of the same shape. Inside it, the action reads non-cancelled reservations of that room with `fin` greater than the current instant. If any exist, including one already in progress, the callback returns without updating. Otherwise it sets `Sala.estado` to `INACTIVA`. A create that commits first leaves occupancy the waiting deactivation then observes. A deactivation that commits first leaves `INACTIVA`, which the waiting create observes on its in-transaction read. A read taken before `BEGIN IMMEDIATE` is not the decision any of these actions uses.

If either callback throws, Prisma rolls the transaction back. The thrown errors are classified only after the callback has ended:

- `P2002`, already used in `lib/rooms/actions.ts` for a unique violation, means the occupancy key was taken. The action reports the overlap rejection. Rollback removes any `Reserva` and any occupancy row inserted in that callback, so one successful insert of the first occupancy cannot remain beside a failed second insert.
- A transaction-wait failure is a different error. Prisma documents `P2028` for an interactive transaction that exceeds its wait. This repository's room actions do not branch on it, and the local client sources used for this design do not list it beside `P2002`. The reservation action treats `P2028` as a failed attempt that stored nothing.
- A SQLite lock or busy failure is also different. It surfaces as a connector error for a locked database or `SQLITE_BUSY`, not as `P2002`. The action reports a failed attempt that stored nothing. It uses a different functional message from the overlap rejection. The caller may retry. The message does not say the interval is occupied unless the code was `P2002`.

The callback must not catch these three failures and return a result. A caught unique error would let Prisma commit the statements that already ran. Translation to the functional error happens in the action after `$transaction` throws. The default interactive-transaction wait remains the Prisma default; this design does not change it. A wait that expires is the `P2028` path above, including when the other writer still holds the `BEGIN IMMEDIATE` lock.

Alternatives discarded:

- Check-then-insert without a transaction or without the unique key. It does not hold for concurrent requests.
- An in-process mutex. It does not cover two server processes, and it is not the mechanism SQLite already uses for writers.
- A Postgres exclusion constraint or a new SQLite extension. The database is SQLite and the dependency set stays as it is.
- One occupancy row per minute. The approved grid and duration need only the start and the following 30-minute mark.
- Treating every transaction failure as `P2002`. That would describe a lock timeout as an overlap.

### Permissions

Reservation list and writes go through server modules. The list module is not a server action, same as `listRoomsForSession`, so it is not a public callable that could ignore the page filter. Writes are server actions.

Estudiante and Profesor queries filter `usuarioId` to the session user. Administrador queries do not. The UI hides the other controls, and the action still checks the stored role. Schedule changes require `ADMINISTRADOR`. Create requires any stored role and an active room on the in-transaction read. Edit is not implemented: there is no action that updates `inicio`, `fin`, or `salaId`.

`setRoomState` remains the only deactivation path. Setting `INACTIVA` runs the unfinished-reservation read and the state update inside the interactive transaction above. Setting `ACTIVA` stays as it is today. Anonymous access to `/salas` is unchanged.

### Interface and files

The reservation page is `/reservas`, parallel to `/salas`. The proposal does not name this path; it is a routing choice, not a new business rule. The header gains the link «Reservas». Without a session the page redirects to `/ingreso`. The visual surface reuses `Panel`, the existing field and alert classes, and Suspense around the session read. No icon library and no sample reservations.

Schedule editing stays on `/salas`, inside the administrator room controls, because it configures a room. Saving one day without times deletes that `HorarioSala` row inside the schedule transaction above. Saving an invalid pair does not change stored hours.

Expected files:

- `prisma/schema.prisma` and one new migration directory under `prisma/migrations/`.
- `lib/reservations/validation.ts`, `lib/reservations/time.ts`, `lib/reservations/queries.ts`, and `lib/reservations/actions.ts`.
- `app/reservas/page.tsx` and `components/reservation-forms.tsx`.
- `components/shell.tsx` for the link.
- `lib/rooms/actions.ts` for the deactivation guard only.
- `components/room-forms.tsx` and `app/salas/page.tsx` for the schedule form.
- `tests/unit/reservations.test.ts` and `tests/e2e/reservations.spec.ts`.
- `package.json` script `test:unit`, invoking `node --test`.

`lib/auth/session.ts`, `lib/auth/actions.ts`, and the auth specs are not modified.

### Tests

Unit tests use `node:test`, which ships with Node and adds no dependency. They cover the pure functions: omitted duration becomes 60 minutes, an explicit other duration fails, the `en-US` weekday map through `formatToParts`, an unrecognized weekday name fails, the inclusive 30-day endpoints, start equal to opening, end equal to closing, end after closing, a missing weekday, closing time not after opening, a start and end on different Bogota dates fails, and the half-open occupancy instants for a 60-minute grid start. They pass a fixed clock into the cancellation predicate: when that clock equals `inicio`, cancellation is rejected; when it is earlier, cancellation is still allowed by the predicate. They do not open a database. They also state the occupancy-key limit: two 60-minute grid reservations overlap exactly when their occupied instants intersect, and a start 60 minutes after another does not intersect.

Playwright keeps one worker and the disposable `e2e.db`. Each test creates the users and rooms it touches, with unique emails and unique room codes, and then uses only those rows. A test does not assume that `Usuario`, `Sala`, `Reserva`, or `HorarioSala` is empty, and it does not require `rooms.spec.ts` or the auth specs to have run first or in a given order. `global-setup.ts` still wipes `e2e.db` once at the start; that wipe is not the isolation between tests.

The new spec covers create and automatic confirmation, overlap, a start exactly at the previous end, inactive rooms, own versus all reservations, own versus any cancellation, the rejected edit, anonymous redirect to `/ingreso`, a direct server request that bypasses the form, and administrator schedule save including Sunday. The existing auth and room specs stay in the suite.

Two cases cannot be reached through the reservation form, because the server rejects a start in the past:

- Deactivation while a reservation is in progress. The test creates its own room and users, then uses Prisma against `e2e.db` to insert a `CONFIRMADA` reservation whose `inicio` is already past and whose `fin` is still future, plus that reservation's two occupancy rows. The administrator deactivation action must leave the room `ACTIVA`. A later case in the same test, on that same room, cancels or finishes that seeded reservation and then expects deactivation to succeed. The form is not the setup path.
- Cancellation at the start instant. The unit test above fixes the clock at `inicio`. The Playwright process cannot freeze `Date.now()` inside `next start`. The end-to-end case therefore seeds, with Prisma, a `CONFIRMADA` reservation and its occupancy whose `inicio` is already equal to or earlier than the server clock, then invokes the real cancel action and expects `estado` and occupancy to stay unchanged. That shows the action's refusal when `inicio` is not strictly in the future. The equality comparison itself is the unit test with the explicit clock.

Concurrency is two separate tests:

- Two real create requests leave the test process at the same time, through the running app, for one room and one interval created by that test. Either request may finish first. The outcome is one confirmed reservation for that interval and a functional overlap rejection for the other request. After both settle, that room and interval have one `CONFIRMADA` row and exactly two occupancy rows linked by its `reservaId`. There is no reservation of that attempt missing an occupancy row, and no occupancy row of that attempt whose reservation is missing. This test does not query Prisma error codes through the page.
- A direct Prisma insert of two `ReservaOcupacion` rows with the same `(salaId, instante)` expects the unique constraint to reject the second insert. That test does not call the server action and does not stand in for the transaction test above.

The foreign-key test uses the application's Prisma client against the migrated `e2e.db`. It does not execute `PRAGMA foreign_keys = ON`. It reads `PRAGMA foreign_keys` and expects `1` on a new client. It creates a room, a user, a `HorarioSala`, a `Reserva`, and a `ReservaOcupacion`, then attempts to delete the `Sala`, the `Usuario`, and the `Reserva` while those children exist. Each delete must fail and the parent row must remain. Inserting an occupancy or a reservation whose parent id does not exist must also fail. The migration SQL is not the evidence this test replaces.

## Risks / Trade-offs

- [A reservation is inserted outside the transaction] → The unique `(salaId, instante)` key still rejects a second occupant of the same instant. It does not roll back a reservation that was inserted and then failed on the second occupancy row. Create, cancel, and deactivation each use one interactive transaction, and the callback does not catch `P2002`, `P2028`, or a lock error.
- [The callback catches `P2002` and returns] → Prisma commits the writes already performed. The action maps that code only after `$transaction` throws.
- [A lock wait is reported as overlap] → Only `P2002` uses the overlap message. `P2028` and a SQLite lock or busy error use the failed-attempt message and leave no rows from that transaction.
- [Occupancy rows remain after cancel] → The cancellable path deletes them by `reservaId` in the same transaction that sets `CANCELADA`, after reading `estado` and `inicio` again.
- [Deactivation and create interleave] → Each runs in its own `BEGIN IMMEDIATE` transaction and repeats its read inside that transaction. The create read is `Sala.estado`. The deactivation read is an unfinished non-cancelled reservation.
- [The occupancy key is treated as an exclusion constraint] → It excludes overlaps only for a stored duration of 60 minutes and a Bogota start minute of 0 or 30. The server rejects every other duration and every other start minute.
- [The server zone is not Bogota] → Weekday, calendar date, and clock time come from `formatToParts` with `America/Bogota` and the `en-US` weekday map, not from `Date#getDay` or `Date#getHours`.
- [A migration declares `ON DELETE RESTRICT`] → Prisma Client 6.19.3 already opens SQLite 3.46.0 with `PRAGMA foreign_keys` equal to `1`. The `e2e.db` test reads that pragma and expects the restricted delete and the missing-parent insert to fail. The application does not turn the pragma on itself.
- [Tests share `e2e.db` after the single global wipe] → Each test creates unique users and rooms and uses those ids.
- [The reservation route was not in the proposal] → `/reservas` is only the page path. The behavior stays the one in the reservation spec.
- [SQLite remains a single writer] → That is acceptable for this deployment. The unique key, under the 60-minute grid rules, provides the overlap invariant. `BEGIN IMMEDIATE` orders the writers.
- [A schedule save runs while a create is validating hours] → Both use an interactive transaction and read or replace the day's `HorarioSala` only after `BEGIN IMMEDIATE`. The day's delete and insert share one callback, so the create cannot observe a gap between them.

## Migration Plan

Add one migration that creates `HorarioSala`, `Reserva`, and `ReservaOcupacion`, their foreign keys with `ON DELETE RESTRICT`, and the unique indexes `(salaId, dia)` and `(salaId, instante)`. Do not alter the init migration or the sala migration. `tests/global-setup.ts` already deploys every migration onto `e2e.db`. Existing room and user rows stay valid because the new foreign keys point from the new tables toward them.

Rollback is reverting that migration and removing the reservation route, actions, and the deactivation guard. `Usuario`, `Sesion`, and `Sala` do not depend on the new tables.

## Open Questions

None. Foreign-key enforcement was measured on Prisma Client 6.19.3 and SQLite 3.46.0, and the schedule read now shares the write transaction with create.
