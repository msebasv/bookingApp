# role-authorization Specification

## Purpose

Asigna y comprueba los roles Administrador, Profesor y Estudiante en el servidor, de modo que el registro público no pueda crear un Administrador.

## Requirements

### Requirement: Public registration assigns Student
The system SHALL assign the Student role on the server to every account created by public registration. The system MUST ignore any role submitted by the client, including Administrator and Professor.

#### Scenario: Registration without a requested role
- **WHEN** a person completes public registration without choosing a role
- **THEN** the new account has the Student role

#### Scenario: Client sends a privileged role
- **WHEN** a public registration request includes the Administrator or Professor role
- **THEN** the new account still has the Student role

### Requirement: User cannot change own role
The system SHALL reject a request by the signed-in user to change their own role. The stored role MUST remain unchanged.

#### Scenario: Student requests a new role for themselves
- **WHEN** a signed-in Student asks to change their own role
- **THEN** the system rejects the request and the stored role remains Student

### Requirement: First administrator comes from initialization
The system SHALL create the first Administrator only through a controlled initialization procedure that is not public registration. Public registration MUST NOT be able to produce an Administrator account.

#### Scenario: Initialization creates the administrator
- **WHEN** the controlled initialization procedure runs with the required administrator credentials
- **THEN** the system creates an Administrator account that can start a session

#### Scenario: Public registration cannot create an administrator
- **WHEN** a person uses public registration and attempts to become an Administrator
- **THEN** the system does not create an Administrator account

#### Scenario: Procedure does not create another administrator
- **WHEN** the controlled initialization procedure runs and an Administrator account already exists
- **THEN** the system does not create another Administrator account

### Requirement: Administrator assigns only Student or Professor
The system SHALL allow an Administrator to change another user's role to Student or Professor. The system MUST NOT allow that change to grant the Administrator role.

#### Scenario: Administrator assigns Professor
- **WHEN** an Administrator changes another user's role to Professor
- **THEN** the stored role of that user becomes Professor

#### Scenario: Administrator tries to grant Administrator
- **WHEN** an Administrator attempts to change another user's role to Administrator
- **THEN** the system rejects the change and the stored role remains unchanged

### Requirement: Protected operations check the server session
The system SHALL verify the server-side session and the stored role before completing each protected operation. A missing session or an insufficient role MUST cause rejection, even if the client claims a privileged role or reaches the operation directly.

#### Scenario: Anonymous access to a protected operation
- **WHEN** a person without a session requests a protected operation
- **THEN** the system rejects the operation

#### Scenario: Student requests an administrator operation
- **WHEN** a signed-in Student requests an operation reserved for an Administrator
- **THEN** the system rejects the operation and does not change protected data

#### Scenario: Client claims a privileged role
- **WHEN** a signed-in Student sends a request that claims the Administrator role
- **THEN** the system still treats the user as a Student and rejects the administrator operation
