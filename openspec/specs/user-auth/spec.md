# user-auth Specification

## Purpose

Permite crear una cuenta con correo y contraseña, iniciar una sesión de servidor de 12 horas, cerrarla, y conservar las marcas de tiempo en America/Bogota.

## Requirements

### Requirement: Public registration creates an account
The system SHALL create a new account when a person submits an unused email address and a password of at least 8 characters. The system MUST NOT use an external identity provider.

#### Scenario: Successful registration
- **WHEN** a person registers with an unused email and a password of at least 8 characters
- **THEN** the system creates an account that did not exist and those credentials can start a session

#### Scenario: Duplicate email
- **WHEN** a person registers with an email that already belongs to an account
- **THEN** the system rejects the registration and does not create a second account

#### Scenario: Short password
- **WHEN** a person registers with a password shorter than 8 characters
- **THEN** the system rejects the registration and does not create an account

### Requirement: Password is not recoverable
The system SHALL store the password only in a form that cannot be read back as the original password. The system MUST NOT return the password in a registration, login, or session response.

#### Scenario: Stored password is not the original
- **WHEN** an account is created with a password
- **THEN** the stored credential value is different from that password and does not reveal it

### Requirement: Login opens a server session
The system SHALL open a server-side session only when the email and password match an existing account. The system MUST reject credentials that do not match any account and MUST NOT open a session in that case.

#### Scenario: Valid credentials
- **WHEN** a person submits the email and password of an existing account
- **THEN** the system opens a server-side session for that account

#### Scenario: Invalid credentials
- **WHEN** a person submits an email or password that does not match an account
- **THEN** the system does not open a session

### Requirement: Logout ends the server session
The system SHALL end the server-side session when the signed-in user logs out. After logout, a protected operation using that session MUST be rejected.

#### Scenario: Session no longer authorizes
- **WHEN** a signed-in user logs out and then requests a protected operation with the same session
- **THEN** the system rejects the operation

### Requirement: Session lasts twelve hours
The system SHALL accept a server session for 12 hours from its creation, measured in America/Bogota. After those 12 hours, a protected operation that uses the session MUST be rejected.

#### Scenario: Session is still inside the approved duration
- **WHEN** less than 12 hours have passed since the session was created in America/Bogota and the user requests a protected operation their role allows
- **THEN** the system accepts the operation

#### Scenario: Session has expired
- **WHEN** 12 hours have passed since the session was created in America/Bogota and the user requests a protected operation with that session
- **THEN** the system rejects the operation

### Requirement: Timestamps use America/Bogota
The system SHALL record account creation and session expiry using the America/Bogota time zone.

#### Scenario: Creation instant uses Bogota time
- **WHEN** an account or a session is created
- **THEN** its recorded creation instant corresponds to America/Bogota and not to another zone
