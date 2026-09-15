# Spec Delta: user-contributions (shelter-trust-and-reports)

## MODIFIED Requirements

### Requirement: The user can list their own shelters

The application SHALL provide an authenticated endpoint returning the caller's own shelters using
the same lean read projection as the public shelter list. The list SHALL contain only shelters the
caller created — never other users' shelters, never registry rows. Unlike the public list, the
owner's list SHALL include auto-hidden (status `INACTIVE`) shelters; each shelter's response SHALL
carry its status and its `nonexistentReports` count so the UI can show hidden ones as
"Hidden — reported by the community (n reports)". Hidden shelters SHALL NOT be restorable from
the user UI (admin only).

#### Scenario: Own shelters listed

- **WHEN** a user who submitted two shelters calls the "my shelters" endpoint
- **THEN** the response contains exactly those two shelters

#### Scenario: No leakage of others' shelters

- **WHEN** user A calls the endpoint and user B has submitted shelters
- **THEN** B's shelters do not appear in A's response

#### Scenario: Hidden own shelter is visible to its owner

- **WHEN** the user's shelter was auto-hidden by five non-existence reports
- **THEN** the /mine list shows it, marked hidden with the report count, and offers no
  restore action in the UI
