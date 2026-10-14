# Spec Delta

## ADDED Requirements

### Requirement: Navigation shows role assignment only to an Administrator
The system SHALL show a navigation link to role assignment only when the stored role of the server session is Administrator. A Student, a Professor, or a person without a session MUST NOT see that link. The system MUST use the stored role and MUST ignore a role claimed by the client.

#### Scenario: Administrator sees the link
- **WHEN** a signed-in Administrator views the navigation
- **THEN** the navigation includes a link to role assignment

#### Scenario: Student does not see the link
- **WHEN** a signed-in Student views the navigation
- **THEN** the navigation does not include a link to role assignment

#### Scenario: Anonymous visitor does not see the link
- **WHEN** a person without a session views the navigation
- **THEN** the navigation does not include a link to role assignment

#### Scenario: Client claims the Administrator role
- **WHEN** a signed-in Student views the navigation while claiming the Administrator role
- **THEN** the navigation still omits the role-assignment link
