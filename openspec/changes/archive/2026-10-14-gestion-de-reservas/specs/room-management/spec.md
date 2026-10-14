# Spec Delta

## MODIFIED Requirements

### Requirement: Administrator changes activity without deleting the room
The system SHALL let an Administrator set an existing room to inactive and later set it back to active. The room MUST remain stored. The system MUST NOT delete a room or its reservations as part of this capability. The system MUST reject deactivation while the room has a non-cancelled reservation whose interval has not ended, including a reservation already in progress. A cancelled reservation MUST NOT block deactivation.

#### Scenario: Deactivate a room
- **WHEN** an Administrator deactivates an active room that has no non-cancelled reservation whose interval has not yet ended
- **THEN** the room remains stored, the Administrator sees it as inactive, and its reservations are not deleted

#### Scenario: Activate a room again
- **WHEN** an Administrator activates an inactive room
- **THEN** the room remains stored and is shown as active

#### Scenario: Deactivation is not deletion
- **WHEN** an Administrator deactivates a room and then lists the rooms
- **THEN** that room is still present in the Administrator's list and its reservations are still stored

#### Scenario: Unfinished reservation blocks deactivation
- **WHEN** an Administrator deactivates a room that has a non-cancelled reservation whose end is still in the future
- **THEN** the system rejects the deactivation, the room stays active, and the reservation stays stored

#### Scenario: In-progress reservation blocks deactivation
- **WHEN** an Administrator deactivates a room that has a non-cancelled reservation which has already started and has not ended
- **THEN** the system rejects the deactivation and the room stays active

#### Scenario: Cancelled reservation does not block deactivation
- **WHEN** an Administrator deactivates a room whose only reservation in that interval has been cancelled
- **THEN** the system stores the room as inactive and does not delete the cancelled reservation

#### Scenario: Finished reservation does not block deactivation
- **WHEN** an Administrator deactivates a room whose non-cancelled reservations have all ended
- **THEN** the system stores the room as inactive and does not delete those reservations
