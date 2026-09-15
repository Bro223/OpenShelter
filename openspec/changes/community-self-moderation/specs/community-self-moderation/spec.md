# Spec Delta: community-self-moderation (M9)

## ADDED Requirements

### Requirement: Derived reporter trust weight

The system SHALL derive a reporter's trust weight at report-write time
from existing rows only (no new user column, no new table): weight 1
for any verified account, +1 when the reporter has at least one USER
submission with `review_status = CONFIRMED`, +1 when the reporter's own
`AUTO_CONFIRM` moderation actions number at least two, capped at 3.

#### Scenario: A fresh verified reporter has the baseline weight

- **WHEN** a verified user with no cross-confirmed submissions and at
  most one AUTO_CONFIRM action reports a shelter
- **THEN** their report counts with weight 1

#### Scenario: A cross-confirmed contributor weighs more

- **WHEN** a verified user has at least one USER submission in review
  state CONFIRMED and reports a shelter
- **THEN** their report counts with weight 2

#### Scenario: Proven positive reports add the second point

- **WHEN** a verified user's own AUTO_CONFIRM actions number at least
  two (and they have no confirmed submission)
- **THEN** their report counts with weight 2; with a confirmed
  submission as well, weight 3 (the cap)

### Requirement: Trust-weighted NON_EXISTENT auto-hide

The `NON_EXISTENT` auto-hide SHALL fire on the report insert that
brings the shelter's trust-weighted hide tally — the sum of the
weights of the distinct `NON_EXISTENT` reporters, dampened reports
contributing 0 — from below 5 to at least 5. The exactly-once
posture SHALL hold: after a manual status change the tally is already
at or above 5 and later reports never re-hide. The raw per-type
counts (display flags, "Reported (n)" badge) SHALL remain unweighted.

#### Scenario: Five baseline reporters hide on the fifth report

- **WHEN** five distinct verified users with no trust history file
  `NON_EXISTENT` reports on an ACTIVE, armed shelter
- **THEN** the shelter becomes INACTIVE exactly on the fifth report

#### Scenario: Trusted reporters reach the threshold faster

- **WHEN** two weight-2 reporters file `NON_EXISTENT` reports on an
  ACTIVE shelter and a third, baseline reporter files the third
- **THEN** the tally is 2 + 2 + 1 = 5 and the shelter is hidden on
  the third report

#### Scenario: A dampened report contributes zero points

- **WHEN** a reporter whose own USER listing of the same place
  (same normalized name, within the duplicate haversine) files a
  `NON_EXISTENT` report
- **THEN** the stored report is marked damped, the hide tally treats
  it as 0 points, and the shelter's status is unchanged by that
  report alone

#### Scenario: No re-hide after a manual restore

- **WHEN** a shelter already hidden by the weighted tally is restored
  to ACTIVE and further `NON_EXISTENT` reports arrive
- **THEN** the shelter stays ACTIVE (the tally is already ≥ 5)

### Requirement: Duplicate dampening of self-interested negative reports

A `NON_EXISTENT` report SHALL be stored with `damped = true` when the
reporter holds their own other USER listing of the same place — same
normalized name within `app.limits.duplicate-coord-meters` haversine
of the reported shelter, the reporter's row in any status, the target
row itself excluded. Dampened reports SHALL remain stored and visible
in the admin report queue (flagged as dampened); they SHALL NOT be
deleted, and only `NON_EXISTENT` reports SHALL be eligible for
dampening.

#### Scenario: A displaced rival's negative report is dampened

- **WHEN** user B's USER listing of place P was rejected (INACTIVE)
  and user A later lists the same place P, and B files `NON_EXISTENT`
  on A's row
- **THEN** B's report row is stored with `damped = true` and
  contributes 0 to the hide tally

#### Scenario: A reporter without a duplicate listing is not dampened

- **WHEN** a verified user files `NON_EXISTENT` on a shelter and has
  no USER listing with the same normalized name within the duplicate
  haversine
- **THEN** their report is stored with `damped = false` and counts
  with their full trust weight

#### Scenario: Positive reports are never dampened

- **WHEN** a user who holds a duplicate listing files
  `OPEN_CONFIRMED` (or any non-`NON_EXISTENT` type) on the reported
  shelter
- **THEN** the report is stored with `damped = false` and its normal
  effect (auto-confirm promotion) applies

### Requirement: Report endpoints surface the dampening outcome

`POST /api/shelters/{id}/reports` SHALL answer `200` with a body of
`{"damped": true|false}` stating whether the stored report was
dampened. The `GET /admin/reports` rows SHALL carry the report's
`damped` flag, and the admin queue SHALL render a "dampened" marker
on such rows. The shelter detail page SHALL show the dampened success
notice (single-sourced copy) when its report came back dampened.

#### Scenario: The report response carries the damp flag

- **WHEN** a verified user files a report that the dampening rule
  marks
- **THEN** the endpoint returns 200 with `{"damped": true}` and the
  detail page shows the reduced-weight notice; an undampened report
  returns `{"damped": false}` and the plain notice

#### Scenario: The admin queue flags dampened rows

- **WHEN** an admin opens the shelter-report queue containing a
  dampened report
- **THEN** that row's `damped` field is true and the queue renders
  the "dampened" marker beside the report type

### Requirement: The positive half of self-moderation is unchanged

The auto-confirm promotion SHALL remain exactly as shipped: one
`OPEN_CONFIRMED` report by a user other than the submitter promotes a
USER row from NEW to CONFIRMED in the same transaction with an
`AUTO_CONFIRM` audit row; the submitter's own positive report SHALL
never promote. Trust weighting SHALL NOT gate the positive side.

#### Scenario: A single baseline cross-user positive report promotes

- **WHEN** a verified user with no trust history files
  `OPEN_CONFIRMED` on another user's NEW row
- **THEN** the row becomes CONFIRMED and one AUTO_CONFIRM audit row
  is written (identical to the pre-M9 behaviour)
