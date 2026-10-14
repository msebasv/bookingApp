# Spec Delta

## ADDED Requirements

### Requirement: Selected room schedule is visible before booking
The system SHALL show a signed-in user the configured opening and closing times of the room selected for a new reservation, including a weekday that has no hours. That display MUST NOT replace server validation of the reservation.

#### Scenario: Student sees the selected room hours
- **WHEN** a signed-in Student selects a room that has configured hours
- **THEN** the system shows those opening and closing times before the reservation is submitted

#### Scenario: A weekday without hours is shown as closed
- **WHEN** a signed-in Professor selects a room and one weekday has no configured hours
- **THEN** the system shows that weekday as having no hours

### Requirement: Offered starts follow the selected room day
The system SHALL offer start times only on the thirty-minute grid of America/Bogota that begin at or after opening and end at or before closing for the selected room and date. The system MUST still reject on the server a submitted start that breaks an existing reservation rule.

#### Scenario: Compatible starts are offered
- **WHEN** a signed-in user selects a room and a Monday-through-Friday date whose hours can fit a 60-minute reservation
- **THEN** each offered start is on a thirty-minute boundary, is at or after opening, and leaves the reservation ending at or before closing

#### Scenario: Server still rejects an incompatible start
- **WHEN** a signed-in user submits a start outside the configured hours even though the offered choices were bypassed
- **THEN** the system rejects the reservation and does not create it

### Requirement: A non-reservable day offers no start
The system SHALL offer no start time when the selected date falls on Saturday or Sunday in America/Bogota, or when the selected room has no hours on that date.

#### Scenario: Weekend selection offers no start
- **WHEN** a signed-in user selects a Saturday or Sunday for a new reservation
- **THEN** the system offers no start time

#### Scenario: Closed weekday offers no start
- **WHEN** a signed-in user selects a Monday-through-Friday date on which the room has no hours
- **THEN** the system offers no start time

### Requirement: Availability agenda hides other people's reservation details
The system SHALL show a signed-in user the free and occupied bands of a visible active room on a chosen day. An occupied band MUST NOT include the name, email, identifier, or any other detail of a reservation. A person without a session MUST be redirected to /ingreso and MUST NOT receive those bands.

#### Scenario: Occupied band shows no other person
- **WHEN** a signed-in Student opens the agenda for a room and day that another person has reserved
- **THEN** the system shows that band as occupied and does not show that other person's name, email, or reservation identifier

#### Scenario: Free band is distinguishable
- **WHEN** a signed-in user opens the agenda for a room and day that has an open band inside the configured hours
- **THEN** the system shows that band as free

#### Scenario: Anonymous agenda redirects to sign in
- **WHEN** a person without a session attempts to open the availability agenda
- **THEN** the system redirects that person to /ingreso and does not show bands

### Requirement: Weekend agenda is not reservable
The system SHALL show Saturday and Sunday as not reservable in the agenda, including when those days have configured hours. The system MUST NOT present those hours as free reservation bands.

#### Scenario: Saturday with hours is not offered as free
- **WHEN** a signed-in user opens the agenda for a Saturday on which the room has opening and closing times
- **THEN** the system shows that the day is not reservable and does not mark those hours as free

### Requirement: Closed weekday agenda has no bands
The system SHALL show a Monday-through-Friday date with no configured hours as having no reservable bands. The system MUST NOT present another person's reservation on that view.

#### Scenario: Day without hours has no bands
- **WHEN** a signed-in user opens the agenda for a weekday on which the room has no hours
- **THEN** the system shows that the day has no hours and does not show a reservation identifier

### Requirement: Reservation list filters by time and cancellation
The system SHALL filter the reservation list on the server into upcoming confirmed reservations, past confirmed reservations, or cancelled reservations. Upcoming means confirmed and not yet ended. Past means confirmed and already ended. A missing or unrecognized filter MUST mean upcoming. A Student or Professor MUST see only reservations they created. An Administrator MUST see every reservation that matches the filter.

#### Scenario: Opening the list without a filter shows upcoming reservations
- **WHEN** a signed-in user opens the reservation list without choosing a filter
- **THEN** the system applies the upcoming filter

#### Scenario: Student sees only their upcoming reservations
- **WHEN** a signed-in Student selects the upcoming filter and both their own upcoming reservation and another person's reservation exist
- **THEN** the system shows only that Student's upcoming reservation

#### Scenario: Past confirmed reservation stays out of the upcoming filter
- **WHEN** a signed-in user selects the past filter and has a confirmed reservation that has already ended
- **THEN** the system shows that reservation in the past filter and does not show it as upcoming

#### Scenario: Cancelled reservation stays out of the upcoming filter
- **WHEN** a signed-in user selects the cancelled filter and has a cancelled reservation
- **THEN** the system shows that cancelled reservation and does not show it in the upcoming filter

#### Scenario: Administrator filter includes every matching reservation
- **WHEN** a signed-in Administrator selects a filter and reservations created by other people match that filter
- **THEN** the system shows every reservation that matches the filter
