# public-home Specification

## Purpose

Explica en la portada pública que la aplicación sirve para consultar salas, ver horarios y reservar, y conserva el ingreso y el registro.

## Requirements

### Requirement: Public home describes rooms, schedules, and reservations
The system SHALL present the public home page as the entry to study-room booking and SHALL name rooms, schedules, and reservations. The page MUST offer a way to sign in and a way to register. The page MUST keep those actions available on a narrow screen.

#### Scenario: Visitor reads the product
- **WHEN** a person opens the public home page
- **THEN** the page describes rooms, schedules, and reservations and offers sign-in and registration

#### Scenario: Narrow screen keeps the same entry
- **WHEN** a person opens the public home page on a narrow screen
- **THEN** the same sign-in and registration actions remain available
