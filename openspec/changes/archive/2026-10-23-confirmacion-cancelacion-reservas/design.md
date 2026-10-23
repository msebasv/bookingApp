# Design

## Context

See proposal.md for why cancellation needs a confirmation step. `CancelReservationForm` in `components/reservation-forms.tsx` is a client component that posts the hidden reservation `id` to the `cancelReservation` server action with `useActionState` and shows its error or notice. `app/reservas/page.tsx` renders it inside each cancellable reservation article and already formats `inicio` and `fin` in America/Bogota. The project has no dialog component and no UI library.

## Goals / Non-Goals

**Goals:**

- Require an explicit confirmation before the cancel action is posted.
- Show the room name, date, and start and end time in the confirmation.
- Keep the server action, its authorization, and its messages unchanged.
- Keep the dialog keyboard accessible and usable on small screens.

**Non-Goals:**

- Undoing a cancellation after it is confirmed.
- Changing who may cancel, or until when.
- A new dependency, a shared modal system, or a schema change.

## Decisions

### Native `<dialog>` opened with `showModal()`

The "Cancelar reserva" button becomes `type="button"` and calls `showModal()` on a `<dialog>` rendered inside the same form. A modal `<dialog>` gives focus containment, makes the rest of the page inert, closes on Escape, and returns focus to the opener when it closes, without extra code or dependencies. "Volver" is the first focusable element in the dialog, so `showModal()` puts the initial focus on the safe choice. React's `autoFocus` is not used because it focuses on mount, while the dialog is still closed. The dialog has `aria-labelledby` and `aria-describedby` pointing to its title and to the reservation details.

Alternative discarded: `window.confirm()`. It cannot show formatted details consistently, cannot be styled to match the app, and is awkward to test.

Alternative discarded: a custom `div` overlay. It would need focus trapping, inert handling, and Escape handling written by hand.

### Same form, same action

The dialog lives inside the existing `<form>`, so "Confirmar cancelación" is a normal submit button and the posted body (`id`) is identical to today's. The form's `onSubmit` closes the dialog so the error or notice rendered below the button is visible. The confirm button is disabled while the action is pending to avoid double submission.

### Close the dialog when the page is hidden

With Cache Components, Next.js hides a page with React's `<Activity>` on navigation instead of unmounting it (see `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). A modal dialog left open would keep the rest of the page inert when the user comes back. A `useLayoutEffect` cleanup closes the dialog whenever the component is hidden or unmounted.

### Same visual language

The dialog reuses the existing tokens and button classes: the outlined button for "Volver" and the primary navy button for "Confirmar cancelación". It is centered, capped at `max-w-md`, and keeps a 1rem margin on narrow screens; the actions stack vertically below the `sm` breakpoint.

### Details formatted on the server

`app/reservas/page.tsx` passes `sala`, `fecha` (long Spanish date) and `horario` (`HH:mm a HH:mm`) strings formatted with `Intl.DateTimeFormat` in America/Bogota, like the rest of the page, so the client does not depend on the browser time zone.

## Risks / Trade-offs

- [Existing E2E tests click "Cancelar reserva" and expect a POST] → They now open the dialog and press "Confirmar cancelación" through a shared helper.
- [A request can still be sent without the dialog] → Expected: the dialog is a UX safeguard, not a security control. The server keeps enforcing ownership, role, state, and the start instant, and the existing tests that replay the action keep covering that.
