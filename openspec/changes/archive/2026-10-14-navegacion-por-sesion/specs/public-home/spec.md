# Spec Delta

## MODIFIED Requirements

### Requirement: Public home describes rooms, schedules, and reservations
The system SHALL present the home page to a person without a session as the entry to study-room booking and SHALL name rooms, schedules, and reservations. That page MUST offer sign-in and registration and MUST keep those actions available on a narrow screen. A signed-in user MUST NOT be offered sign-in or registration on the home page.

#### Scenario: Visitor reads the product
- **WHEN** a person without a session opens the home page
- **THEN** the page describes rooms, schedules, and reservations and offers sign-in and registration

#### Scenario: Narrow screen keeps the same entry
- **WHEN** a person without a session opens the home page on a narrow screen
- **THEN** the same sign-in and registration actions remain available

#### Scenario: Signed-in user does not see visitor actions
- **WHEN** a signed-in user opens the home page
- **THEN** the page does not offer sign-in or registration

## ADDED Requirements

### Requirement: Signed-in home offers only allowed shortcuts
The system SHALL offer a signed-in Student or Professor shortcuts to rooms, reservations, and the account. An Administrator MUST also receive a shortcut to role assignment. A Student or Professor MUST NOT receive that role-assignment shortcut.

#### Scenario: Student shortcuts omit role assignment
- **WHEN** a signed-in Student opens the home page
- **THEN** the page offers rooms, reservations, and the account, and does not offer role assignment

#### Scenario: Professor shortcuts omit role assignment
- **WHEN** a signed-in Professor opens the home page
- **THEN** the page offers rooms, reservations, and the account, and does not offer role assignment

#### Scenario: Administrator shortcut includes role assignment
- **WHEN** a signed-in Administrator opens the home page
- **THEN** the page offers rooms, reservations, the account, and role assignment
