# Spec Delta

## Purpose

Permite a un Administrador consultar todas las salas y mantenerlas, y permite a Estudiante y Profesor consultar solo las salas activas, sin eliminar registros.

## ADDED Requirements

### Requirement: Room list depends on the stored role
The system SHALL show an Administrator every registered room, including inactive rooms, and SHALL show a Student or a Professor only active rooms. The visible rooms MUST be ordered by name without regard to letter case. A person without a session MUST NOT receive room data.

#### Scenario: Administrator sees active and inactive rooms
- **WHEN** an Administrator opens the room catalog and both active and inactive rooms exist
- **THEN** the system shows every one of those rooms, with its name, identification code, location, capacity, description when one is stored, and whether it is active or inactive

#### Scenario: Student sees only active rooms
- **WHEN** a signed-in Student opens the room catalog and both active and inactive rooms exist
- **THEN** the system shows the active rooms and does not show the inactive rooms

#### Scenario: Professor sees only active rooms
- **WHEN** a signed-in Professor opens the room catalog and both active and inactive rooms exist
- **THEN** the system shows the active rooms and does not show the inactive rooms

#### Scenario: Rooms are ordered by name
- **WHEN** a signed-in user opens the room catalog and more than one room is visible to that user
- **THEN** those rooms appear ordered by name without regard to letter case

#### Scenario: Nothing is visible for that role
- **WHEN** a signed-in user opens the room catalog and no room is visible to that role
- **THEN** the system shows that there are no rooms and does not present rooms that were not registered

#### Scenario: Anonymous user is sent to sign in
- **WHEN** a person without a session opens /salas
- **THEN** the system redirects that person to /ingreso and does not show room data

### Requirement: Administrator creates an active room
The system SHALL create a room when an Administrator submits valid room data, including a unique identification code and an integer capacity of at least 1. The new room MUST be active. The system SHALL allow the description to be absent.

#### Scenario: Create with the required data
- **WHEN** an Administrator submits a name, an unused identification code, a location, and a capacity of 1 or greater, all within the field limits
- **THEN** the system stores a new active room with those values

#### Scenario: Create without a description
- **WHEN** an Administrator creates a room and leaves the description blank
- **THEN** the stored room has no description

### Requirement: Room fields are validated on the server
The system SHALL reject a create or edit when, after trimming, the name, code, or location is blank, the name exceeds 100 characters, the code exceeds 20 characters, the location exceeds 120 characters, the description exceeds 500 characters, or the capacity is not an integer of at least 1. The system MUST enforce these limits on the server even if the client already rejected the data. A rejected request MUST NOT change stored rooms.

#### Scenario: Missing required text
- **WHEN** an Administrator submits a room whose name, identification code, or location is blank
- **THEN** the system rejects the request and does not create or change a room

#### Scenario: Text exceeds its maximum length
- **WHEN** an Administrator submits a name longer than 100 characters, a code longer than 20 characters, a location longer than 120 characters, or a description longer than 500 characters
- **THEN** the system rejects the request and does not create or change a room

#### Scenario: Text at the maximum length is accepted
- **WHEN** an Administrator submits a name of 100 characters, a code of 20 characters, a location of 120 characters, and a description of 500 characters, with a valid unused code and a valid capacity
- **THEN** the system stores that room

#### Scenario: Capacity is not a positive integer
- **WHEN** an Administrator submits a capacity of 0, a negative number, or a value that is not an integer
- **THEN** the system rejects the request and does not create or change a room

#### Scenario: Client checks are bypassed
- **WHEN** an Administrator sends invalid room data directly to the server
- **THEN** the system still rejects the data and the stored rooms stay unchanged

### Requirement: Identification code is unique ignoring letter case
The system SHALL reject a create or edit whose identification code matches another room when letter case is ignored. The system MUST NOT keep two rooms whose codes differ only by letter case.

#### Scenario: Duplicate code on create
- **WHEN** an Administrator creates a room with an identification code that another room already has
- **THEN** the system rejects the request and does not create a second room

#### Scenario: Code differs only by letter case
- **WHEN** an Administrator submits a code that matches an existing code except for letter case
- **THEN** the system rejects the request and does not store that duplicate

#### Scenario: Edit keeps the same room code
- **WHEN** an Administrator edits a room and submits that room's current identification code
- **THEN** the system accepts the edit

#### Scenario: Edit collides with another room
- **WHEN** an Administrator changes a room's code to the code of a different room, ignoring letter case
- **THEN** the system rejects the edit and both rooms keep their previous codes

### Requirement: Administrator edits room details
The system SHALL let an Administrator update the name, identification code, location, capacity, and description of an existing room. That edit MUST NOT change whether the room is active or inactive.

#### Scenario: Successful edit
- **WHEN** an Administrator submits valid new details for an existing room
- **THEN** the system stores those details and the room's active or inactive state stays as it was

#### Scenario: Clearing the description
- **WHEN** an Administrator edits a room and leaves the description blank
- **THEN** the stored room has no description and its other valid details are updated

### Requirement: Administrator changes activity without deleting the room
The system SHALL let an Administrator set an existing room to inactive and later set it back to active. The room MUST remain stored. The system MUST NOT delete a room as part of this capability.

#### Scenario: Deactivate a room
- **WHEN** an Administrator deactivates an active room
- **THEN** the room remains stored and the Administrator sees it as inactive

#### Scenario: Activate a room again
- **WHEN** an Administrator activates an inactive room
- **THEN** the room remains stored and is shown as active

#### Scenario: Deactivation is not deletion
- **WHEN** an Administrator deactivates a room and then lists the rooms
- **THEN** that room is still present in the Administrator's list

### Requirement: Only an Administrator can write rooms
The system SHALL reject room creation, editing, and activity changes from a person without a session and from a signed-in user whose stored role is not Administrator. The system MUST decide this from the role stored for the server session and MUST ignore a role claimed by the client. A rejected request MUST NOT change room data.

#### Scenario: Anonymous write
- **WHEN** a person without a session creates, edits, or changes the activity of a room
- **THEN** the system rejects the operation and the stored rooms stay unchanged

#### Scenario: Student write
- **WHEN** a signed-in Student creates, edits, or changes the activity of a room
- **THEN** the system rejects the operation and the stored rooms stay unchanged

#### Scenario: Professor write
- **WHEN** a signed-in Professor creates, edits, or changes the activity of a room
- **THEN** the system rejects the operation and the stored rooms stay unchanged

#### Scenario: Client claims the Administrator role
- **WHEN** a signed-in Student sends a room write that claims the Administrator role
- **THEN** the system still treats the user as a Student, rejects the write, and does not change room data
