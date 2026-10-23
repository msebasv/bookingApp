# Spec Delta

## ADDED Requirements

### Requirement: Cancellation asks for confirmation
The system SHALL ask a signed-in user to confirm before cancelling a reservation from the reservation list. The confirmation MUST identify the reservation by room name, date, and start and end time. The system MUST NOT send the cancellation request until the user confirms. Dismissing the confirmation MUST leave the reservation unchanged.

#### Scenario: Cancel button opens the confirmation
- **WHEN** a signed-in Student selects "Cancelar reserva" on a reservation that Student may cancel
- **THEN** the system shows a confirmation dialog with the room name, the date, and the start and end time of that reservation, and the reservation stays confirmed

#### Scenario: Going back keeps the reservation
- **WHEN** the user chooses "Volver" or closes the confirmation dialog
- **THEN** the dialog closes, no cancellation request is sent, and the reservation stays confirmed

#### Scenario: Confirming cancels with the existing rules
- **WHEN** the user confirms the cancellation strictly before the reservation start
- **THEN** the system cancels the reservation with the existing server rules and the list no longer shows it as an upcoming reservation

#### Scenario: A rejected cancellation shows the error
- **WHEN** the user confirms the cancellation and the server rejects it
- **THEN** the system shows the error and does not show a success message

#### Scenario: Confirmation does not widen who may cancel
- **WHEN** a signed-in Professor sends a cancellation request for another person's reservation without using the dialog
- **THEN** the system rejects the cancellation and that reservation stays unchanged

### Requirement: Cancellation confirmation is keyboard accessible
The confirmation dialog SHALL be modal, SHALL move focus inside the dialog when it opens, SHALL close with the Escape key, and SHALL return focus to the "Cancelar reserva" button when it closes. Every action in the dialog MUST be reachable with the keyboard alone.

#### Scenario: Keyboard user opens and closes the dialog
- **WHEN** a keyboard user activates "Cancelar reserva" and then presses Escape
- **THEN** focus moves into the dialog when it opens, the dialog closes on Escape, focus returns to "Cancelar reserva", and the reservation stays confirmed
