# Spec Delta: shelter-reports (factual-reports-rating-demotion, M11)

## ADDED Requirements

### Requirement: Typed shelter reports

The system SHALL provide `POST /api/shelters/{id}/reports` accepting a JSON
body `{ "type": <NON_EXISTENT | CLOSED | OPEN_CONFIRMED | WRONG_LOCATION |
OTHER>, "detail": <optional text, max 500 chars> }`. `detail` is the
factual substance of the report (M11): it is STORED for the factual types
`CLOSED` and `WRONG_LOCATION` (a "when did it close" / an actual address)
and for `OTHER` (as before), and IGNORED (stored as null) for the binary
types `NON_EXISTENT` and `OPEN_CONFIRMED` — the type alone is the claim.
The stored detail SHALL be visible to admins on the report-queue row.
Reporting SHALL require a verified registered user (the same `canWrite()`
gate as submissions; unverified → the standard 403/redirect vocabulary).
A user SHALL have at most one report of a given type per shelter; a repeat
of the same (shelter, user, type) SHALL return 409. Reporting a
non-existent shelter id SHALL return 404. The stored report SHALL carry
shelter id, user id, type, optional detail, and creation time.

#### Scenario: verified user reports a shelter

- **WHEN** a verified user POSTs `NON_EXISTENT` for shelter 7
- **THEN** the report is stored and the shelter's derived reported state
  reflects it immediately on the next list fetch

#### Scenario: factual reports carry their detail

- **WHEN** a verified user POSTs `CLOSED` with a detail for one shelter
  and `WRONG_LOCATION` with the actual address for another
- **THEN** both reports store their detail and the admin report queue
  renders it on the rows

#### Scenario: binary reports ignore detail

- **WHEN** a verified user POSTs `NON_EXISTENT` (or `OPEN_CONFIRMED`)
  with a detail
- **THEN** the report is stored without the detail (null)

#### Scenario: duplicate report is rejected

- **WHEN** the same verified user POSTs the same type for the same shelter
  twice
- **THEN** the second request fails with 409 and the count stays at one

#### Scenario: unverified users cannot report

- **WHEN** a guest or an unverified registered user calls the endpoint
- **THEN** the request fails exactly like a submission attempt (no report stored)
