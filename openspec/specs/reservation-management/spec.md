# reservation-management Specification

## Purpose

Permite reservar una sala ya registrada cuando hay disponibilidad, confirmarla de inmediato y cancelarla según el rol, sin editarla ni recurrir a calendarios externos.

## Requirements

### Requirement: Available request becomes a confirmed reservation
The system SHALL store a confirmed reservation when an Administrator, a Professor, or a Student submits an available room and a valid start. Confirmation MUST be automatic and MUST NOT require a separate approval.

#### Scenario: Student reserves an available room
- **WHEN** a signed-in Student requests a room that is available for a valid start
- **THEN** the system stores a confirmed reservation for that Student and does not wait for approval

#### Scenario: Professor reserves an available room
- **WHEN** a signed-in Professor requests a room that is available for a valid start
- **THEN** the system stores a confirmed reservation for that Professor

#### Scenario: Administrator reserves an available room
- **WHEN** a signed-in Administrator requests a room that is available for a valid start
- **THEN** the system stores a confirmed reservation for that Administrator

### Requirement: Same-room reservations do not overlap
The system SHALL reject a reservation that shares any instant with another non-cancelled reservation of the same room. A reservation that starts at the exact instant another ends MUST be accepted when the other rules pass. Reservations of different rooms MUST NOT block each other. A cancelled reservation MUST NOT occupy its interval.

#### Scenario: Overlap on the same room is rejected
- **WHEN** a signed-in user requests a room for an interval that shares time with a non-cancelled reservation of that same room
- **THEN** the system rejects the request and does not create a second reservation

#### Scenario: Next reservation starts when the previous one ends
- **WHEN** a signed-in user requests a room whose start is the exact instant at which another non-cancelled reservation of that room ends, and the other rules pass
- **THEN** the system stores the new confirmed reservation

#### Scenario: Another room may be reserved at the same time
- **WHEN** a signed-in user requests a different room for the same interval as an existing reservation
- **THEN** the system does not reject the request because of that other room

### Requirement: Reservation lasts sixty minutes
The system SHALL store every reservation for exactly 60 minutes. When the request omits the duration, the system MUST assign 60 minutes. The system MUST reject an explicit duration other than 60 minutes, and that rejection MUST NOT create a reservation.

#### Scenario: Omitted duration becomes sixty minutes
- **WHEN** a signed-in user submits a valid reservation request and does not provide a duration
- **THEN** the system stores a reservation that ends exactly 60 minutes after its start

#### Scenario: Another explicit duration is rejected
- **WHEN** a signed-in user requests an explicit duration other than 60 minutes
- **THEN** the system rejects the request and does not create a reservation

### Requirement: Start falls inside the next thirty days in Bogota
The system SHALL accept a start only when, in America/Bogota, it is between the current instant and exactly 30 days after that instant, both limits included. The system MUST reject an earlier or later start. This limit applies to the start and MUST NOT by itself reject an end that falls later.

#### Scenario: Start equal to the current instant is accepted
- **WHEN** a signed-in user requests a start equal to the current instant in America/Bogota and the other rules pass
- **THEN** the system stores the reservation

#### Scenario: Start equal to thirty days later is accepted
- **WHEN** a signed-in user requests a start equal to exactly 30 days after the current instant in America/Bogota and the other rules pass
- **THEN** the system stores the reservation even if its end is after that limit

#### Scenario: Start outside the window is rejected
- **WHEN** a signed-in user requests a start before the current instant, or after exactly 30 days after that instant, in America/Bogota
- **THEN** the system rejects the request and does not create a reservation

### Requirement: Reservations are only Monday through Friday
The system SHALL reject a reservation whose start or end falls on Saturday or Sunday in America/Bogota. Configured hours on those days MUST NOT make them reservable.

#### Scenario: Weekend start is rejected
- **WHEN** a signed-in user requests a start on Saturday or Sunday in America/Bogota, including a day that has configured opening and closing hours
- **THEN** the system rejects the request and does not create a reservation

#### Scenario: End on Saturday is rejected
- **WHEN** a signed-in user requests a Friday start whose 60-minute end falls on Saturday in America/Bogota
- **THEN** the system rejects the request and does not create a reservation

### Requirement: Start uses a thirty-minute Bogota grid
The system SHALL accept a start only on a thirty-minute boundary aligned to the clock hours of America/Bogota, such as 08:00, 08:30, or 09:00. The system MUST reject any other minute.

#### Scenario: Clock-aligned start is accepted
- **WHEN** a signed-in user requests a start at 08:00, 08:30, or 09:00 in America/Bogota and the other rules pass
- **THEN** the system stores the reservation

#### Scenario: Unaligned start is rejected
- **WHEN** a signed-in user requests a start at 08:15 in America/Bogota
- **THEN** the system rejects the request and does not create a reservation

### Requirement: Start and end stay inside the room schedule
The system SHALL reject a reservation whose start is before the opening time configured for that room and weekday, or whose end is after the configured closing time. The start MAY equal the opening time. The end MAY equal the closing time. The start and the end MUST both fall on a day allowed for reservations and on the same America/Bogota date. A weekday without configured hours MUST NOT admit a reservation.

#### Scenario: Start equal to opening time is accepted
- **WHEN** a room opens at 08:00 and a signed-in user requests a start at 08:00, and the end, 60 minutes later, is before or equal to that day's closing time
- **THEN** the system stores the reservation

#### Scenario: Reservation fits the configured hours
- **WHEN** a signed-in user requests a start inside the opening hours configured for that room and weekday, and the end, 60 minutes later, is before or equal to that day's closing time
- **THEN** the system stores the reservation

#### Scenario: End equal to closing time is accepted
- **WHEN** a signed-in user requests a reservation whose end is exactly the room's closing time for that day and the other rules pass
- **THEN** the system stores the reservation

#### Scenario: Start before opening is rejected
- **WHEN** a signed-in user requests a start before the opening time configured for that room and weekday
- **THEN** the system rejects the request and does not create a reservation

#### Scenario: End after closing is rejected
- **WHEN** a signed-in user requests a reservation whose end is after the room's closing time
- **THEN** the system rejects the request and does not create a reservation

#### Scenario: Day without hours admits no reservation
- **WHEN** a signed-in user requests a reservation on a weekday for which that room has no opening and closing times
- **THEN** the system rejects the request and does not create a reservation

#### Scenario: Reservation that crosses midnight is rejected
- **WHEN** a signed-in user requests a 60-minute reservation starting at 23:00 or 23:30 on Monday through Thursday in America/Bogota, and the end falls on the next date
- **THEN** the system rejects the request and does not create a reservation

### Requirement: Administrator configures each room schedule
The system SHALL let only an Administrator set an opening time and a closing time for each room on any day of the week, including Saturday and Sunday. The system MUST reject a closing time earlier than or equal to the opening time, and MUST reject hours that cross midnight. A weekday MAY be left without hours. A Student, a Professor, or a person without a session MUST NOT change a room schedule. Hours on Saturday or Sunday MUST NOT make those days reservable.

#### Scenario: Administrator sets hours for every weekday
- **WHEN** an Administrator sets an opening time and a closing time for a room on Monday through Sunday
- **THEN** the system stores that schedule for that room, including Saturday and Sunday

#### Scenario: Student or Professor cannot configure hours
- **WHEN** a signed-in Student or Professor attempts to change a room schedule
- **THEN** the system rejects the attempt and the stored schedule stays unchanged

#### Scenario: Closing time is not after opening time
- **WHEN** an Administrator saves a schedule whose closing time is earlier than or equal to its opening time
- **THEN** the system rejects the schedule and does not change the stored hours

#### Scenario: Hours must not cross midnight
- **WHEN** an Administrator saves a schedule that continues past midnight
- **THEN** the system rejects the schedule and does not change the stored hours

#### Scenario: A day may have no hours
- **WHEN** an Administrator leaves one weekday without opening and closing times and saves valid hours for the other days
- **THEN** the system stores that day as having no hours and does not reject the schedule for that reason

### Requirement: Student and Professor see and cancel only their own reservations
The system SHALL show a Student or a Professor only the reservations that person created, and SHALL let that person cancel only those reservations. The system MUST reject cancellation of another person's reservation and MUST NOT show that other reservation to them.

#### Scenario: Student sees only reservations they created
- **WHEN** a signed-in Student opens the reservation list and both their own reservations and another person's reservations exist
- **THEN** the system shows only the reservations that Student created

#### Scenario: Professor cannot cancel another person's reservation
- **WHEN** a signed-in Professor attempts to cancel a reservation created by someone else
- **THEN** the system rejects the cancellation and that reservation stays unchanged

### Requirement: Administrator sees and cancels every reservation
The system SHALL show an Administrator every reservation and SHALL let that Administrator cancel any reservation whose cancellation time is still allowed.

#### Scenario: Administrator sees every reservation
- **WHEN** a signed-in Administrator opens the reservation list and reservations created by other people exist
- **THEN** the system shows every one of those reservations

#### Scenario: Administrator cancels another person's reservation
- **WHEN** a signed-in Administrator cancels another person's reservation strictly before its start
- **THEN** the system cancels that reservation and it no longer occupies its interval

### Requirement: Existing reservation cannot be edited
The system SHALL reject a request to change an existing reservation. The stored reservation MUST remain unchanged. A different time requires cancelling that reservation and creating another one.

#### Scenario: Edit is rejected
- **WHEN** a signed-in user requests a change to the room or time of an existing reservation
- **THEN** the system rejects the request and the stored reservation keeps its previous values

#### Scenario: Different time is a new reservation
- **WHEN** the owner cancels an existing reservation strictly before its start and then submits a new valid request
- **THEN** the system stores a separate confirmed reservation and does not treat that request as an edit

### Requirement: Inactive room rejects a new reservation
The system SHALL reject a new reservation for an inactive room. A reservation that already exists MUST remain stored until an explicit cancellation.

#### Scenario: New reservation on an inactive room is rejected
- **WHEN** a signed-in user requests a new reservation for an inactive room
- **THEN** the system rejects the request and does not create a reservation

#### Scenario: Existing reservation remains until cancelled
- **WHEN** a room is inactive and already has a reservation that has not been cancelled
- **THEN** the system keeps that reservation until an explicit cancellation

### Requirement: Cancellation is only strictly before the start
The system SHALL cancel a reservation only when the request occurs strictly before its start. The system MUST reject a cancellation at the start instant or later. A permitted cancellation MUST stop that reservation from occupying its interval.

#### Scenario: Cancellation before the start succeeds
- **WHEN** the reservation owner, or an Administrator, cancels a reservation strictly before its start
- **THEN** the system cancels it and the interval is no longer occupied

#### Scenario: Cancellation at the start is rejected
- **WHEN** the reservation owner, or an Administrator, attempts to cancel a reservation at its start instant or after that instant
- **THEN** the system rejects the cancellation and the reservation stays unchanged

### Requirement: Server enforces reservation rules and permissions
The system SHALL enforce duration, time window, weekday, start grid, room schedule, overlap, room activity, the prohibition on editing, cancellation time, and the caller's stored role on the server. The system MUST ignore a role claimed by the client. A person without a valid session who attempts to access reservation functionality MUST be redirected to /ingreso and MUST NOT receive reservation data or complete the operation. A rejected request MUST NOT change stored reservations or schedules.

#### Scenario: Client checks are bypassed
- **WHEN** a signed-in user sends the server a reservation request that breaks a critical rule, even if a client check was skipped
- **THEN** the system rejects the request and the stored reservations stay unchanged

#### Scenario: Anonymous access redirects to sign in
- **WHEN** a person without a valid session attempts to access reservation functionality
- **THEN** the system redirects that person to /ingreso and does not show reservation data or apply the operation

#### Scenario: Client claims the Administrator role
- **WHEN** a signed-in Student sends a reservation or schedule request that claims the Administrator role
- **THEN** the system still treats the user as a Student and does not grant Administrator access

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
