# Design

## Context

See proposal.md. `getSessionUser` in `lib/auth/session.ts` is the only session read. `logout` in `lib/auth/actions.ts` already ends the session and redirects to `/ingreso`. The header in `components/shell.tsx` currently renders the same links for every visitor and adds the role link in Suspense. Cache Components require that cookie read to stay behind Suspense. There is no separate display name on `Usuario`; the stored email is the identity already shown on `/cuenta`.

## Goals / Non-Goals

**Goals:**

- Render the whole primary navigation from the stored session, with a fallback that does not show visitor-only or role-only links.
- Reuse `logout` and the existing protected-route redirects.
- Restyle with the current palette, cards, and status colors. Do not add a component library.

**Non-Goals:**

- A second role check, a new user-name field, a migration, or a change to reservation, schedule, or cancellation rules.
- Replacing the account page logout. The header adds another control that calls the same action.

## Decisions

### One server navigation

`SessionNav` calls `getSessionUser` and chooses the links. Anonymous: Inicio, Ingresar, Crear cuenta. Student and Professor: Inicio, Salas, Reservas, Mi cuenta, plus the email and Cerrar sesión. Administrator adds Roles. The layout wraps that component in Suspense. The fallback renders only Inicio, which every session is allowed to see. A query role is not read.

Alternative discarded: hiding links in the browser after a client session fetch. The menu would be wrong until that fetch finished, and the client would become another authorization path.

### Home page

The visitor view keeps the product description and the two entry buttons. The signed-in view replaces those buttons with shortcuts to the same destinations as the navigation. Both views are chosen on the server inside Suspense. The fallback does not render Ingresar or Crear cuenta.

### Visual states

Libre uses the existing ok color, Ocupada and CANCELADA use the existing danger color, and Activa/Inactiva stay the same words with a status treatment. Alerts keep `role="alert"`.

## Risks / Trade-offs

- [Existing tests expect Salas or Reservas in the anonymous header] → Those assertions move to the signed-in header. The redirect and the absence of protected controls stay.
- [Two logout buttons on the account page] → The account test clicks the button inside the principal navigation. Both buttons call `logout`.
- [The email in the header is also on the page] → Tests that look for another person's email still fail closed, because the header shows only the session email.

## Migration Plan

No data change. Rollback is restoring the previous header and home page.

## Open Questions

None.
