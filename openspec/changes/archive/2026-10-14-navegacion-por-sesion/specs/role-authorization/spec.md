# Spec Delta

## ADDED Requirements

### Requirement: Anonymous navigation shows only public entry
The system SHALL show a person without a session only navigation links to the home page, sign-in, and registration. That navigation MUST NOT include rooms, reservations, the account, or role assignment.

#### Scenario: Visitor sees the public links
- **WHEN** a person without a session views the navigation
- **THEN** the navigation shows the home page, sign-in, and registration, and does not show rooms, reservations, the account, or role assignment

#### Scenario: Protected route still requires a session
- **WHEN** a person without a session opens a protected room, reservation, or role-assignment route directly
- **THEN** the system redirects that person to sign-in and does not show the protected content

### Requirement: Signed-in navigation follows the stored role
The system SHALL hide sign-in and registration from a signed-in user and SHALL show logout, the home page, rooms, reservations, and the account. An Administrator MUST also see role assignment. A Student or Professor MUST NOT see role assignment. The navigation MUST show the session email and MUST ignore a role claimed by the client. After logout, the navigation MUST return to the public entry.

#### Scenario: Student navigation has no administration
- **WHEN** a signed-in Student views the navigation
- **THEN** the navigation shows the home page, rooms, reservations, the account, and logout, shows that Student's email, and does not show sign-in, registration, or role assignment

#### Scenario: Professor navigation matches a Student
- **WHEN** a signed-in Professor views the navigation
- **THEN** the navigation shows the same destinations as a Student and does not show role assignment

#### Scenario: Administrator navigation includes role assignment
- **WHEN** a signed-in Administrator views the navigation
- **THEN** the navigation shows role assignment in addition to the home page, rooms, reservations, the account, and logout

#### Scenario: Logout restores the public navigation
- **WHEN** a signed-in user logs out
- **THEN** the navigation shows only the home page, sign-in, and registration

#### Scenario: Client claims the Administrator role
- **WHEN** a signed-in Student views the navigation while claiming the Administrator role
- **THEN** the navigation still omits role assignment
