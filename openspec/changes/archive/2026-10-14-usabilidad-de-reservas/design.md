# Design

## Context

See proposal.md for why this consultation is needed. The approved reservation rules stay in `lib/reservations/validation.ts` and `lib/reservations/actions.ts`. `HorarioSala` stores one opening and closing minute per room and ISO weekday. `ReservaOcupacion` stores the two occupied instants of a confirmed 60-minute reservation, unique on `(salaId, instante)`. Cancellation deletes those rows. `app/reservas/page.tsx` already loads active rooms and their schedules for the signed-in user, and `CreateReservationForm` uses the schedules only to block an invalid submit. `components/shell.tsx` renders the same links for every visitor. `next.config.ts` enables Cache Components, so a cookie read stays behind Suspense, as `/salas` and `/reservas` already do.

## Goals / Non-Goals

**Goals:**

- Show the selected room's stored hours and offer only 60-minute starts that fit them, without moving the decision off the server.
- Render free and occupied 30-minute bands from existing occupancy rows, with no reservation or user fields in that response.
- Filter the existing reservation query on the server.
- Show the role-assignment link only after `getSessionUser` returns Administrador.

**Non-Goals:**

- A new table, migration, notification, recurrence, payment, or external calendar.
- Changing duration, the 30-day window, weekdays, the grid, overlap, cancellation, or role checks.
- Showing inactive rooms in the agenda. The agenda uses the same active rooms the reservation form already offers.
- A directory of users.

## Decisions

### Schedule and offered starts

The create form keeps `salaId`, `fecha`, and `hora`. `hora` becomes a select. Its options come from the schedule already passed to the form and from the Bogota weekday of the chosen date. A start is offered when it is 0 or 30 minutes, it is greater than or equal to opening, and the start plus 60 minutes is less than or equal to closing. Saturday, Sunday, and a weekday with no row produce no options and an explicit reason. The same pure function is covered by the unit tests. Submitting a value outside that list still reaches `createReservation`, which keeps the current rejection. The displayed schedule lists every stored weekday, including a day with no hours, and states that weekend hours are not reservable.

Alternative discarded: leaving a free time input beside the select. Two controls with the same name would make the submitted value ambiguous.

### Agenda

The agenda is a section of `/reservas`, not a new route. A signed-in user chooses an active room and a date. The server reads `HorarioSala` for that room and weekday and reads `ReservaOcupacion` with `select: { instante: true }` for instants that fall on that Bogota date. It does not select `id`, `reservaId`, `usuarioId`, or email. Each band is 30 minutes from opening inclusive to closing exclusive. A band is occupied when one of those instants falls in it. Weekend dates render as not reservable and do not list bands. A weekday without hours renders as closed and does not list bands. Anonymous access stays on the existing redirect to `/ingreso`.

Alternative discarded: joining `Reserva` and hiding the email in the client. The email would still be sent to the browser.

### Filters

`vista` is `proximas`, `pasadas`, or `canceladas`. Any other value, including absence, is `proximas`. The server adds it to the existing role constraint: upcoming is `CONFIRMADA` with `fin` after the current instant, past is `CONFIRMADA` with `fin` at or before that instant, and cancelled is `CANCELADA`. In-progress reservations stay in upcoming because they have not ended. The page links the three filters. After this, a cancelled row is no longer on the default list, so the existing end-to-end assertions that look for `CANCELADA` on that list open the cancelled filter first. The cancel action itself is unchanged.

Alternative discarded: filtering only in the browser after loading every row. That would send other categories, and for an administrator it would send every reservation, on every visit.

### Navigation and home

`SiteHeader` gains a slot. The layout renders an async link inside Suspense that calls `getSessionUser` and returns the `/admin/roles` link only for `ADMINISTRADOR`. A query or form role is not read. The home page replaces the three account-only points with rooms, schedules, and reservations, and keeps the same layout, colors, and the two entry links.

## Risks / Trade-offs

- [A cancelled reservation disappears from the default list] → The cancelled filter shows it, and the affected end-to-end assertions follow that filter. The stored row and its occupancy behavior stay the same.
- [The time control is a select, so current tests that fill an input stop finding it] → The booking helper selects a legal option and, for an illegal probe, adds that option in the test before submit. Server rejection tests that replay a request stay as they are.
- [Reading the session in the header during prerender] → The read stays inside Suspense. The fallback renders no role link, so an anonymous visitor never receives it.
- [Occupied bands reveal that someone booked, without saying who] → That is the requested agenda. It does not include a name, email, or reservation identifier.

## Migration Plan

No schema change and no data backfill. Rollback is reverting the page, header, query, and pure helpers. Existing reservation rows remain valid.

## Open Questions

None.
