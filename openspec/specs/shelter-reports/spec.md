# shelter-reports Specification

## Purpose
TBD - created by archiving change shelter-trust-and-reports. Update Purpose after archive.

## Requirements

### Requirement: Typed shelter reports

The system SHALL provide `POST /api/shelters/{id}/reports` accepting a JSON
body `{ "type": <NON_EXISTENT | CLOSED | OPEN_CONFIRMED | WRONG_LOCATION |
OTHER>, "detail": <optional text, max 500 chars> }` (detail is STORED for the factual types `CLOSED` and `WRONG_LOCATION`
and for `OTHER`; it is stored as null for the binary types). Reporting SHALL require a verified
registered user (the same
`canWrite()` gate as submissions; unverified → the standard 403/redirect
vocabulary). A user SHALL have at most one report of a given type per
shelter; a repeat of the same (shelter, user, type) SHALL return 409.
Reporting a non-existent shelter id SHALL return 404. The stored report
SHALL carry shelter id, user id, type, optional detail, and creation time.

#### Scenario: verified user reports a shelter

- **WHEN** a verified user POSTs `NON_EXISTENT` for shelter 7
- **THEN** the report is stored and the shelter's derived reported state
  reflects it immediately on the next list fetch

#### Scenario: duplicate report is rejected

- **WHEN** the same verified user POSTs the same type for the same shelter
  twice
- **THEN** the second request fails with 409 and the count stays at one

#### Scenario: unverified users cannot report

- **WHEN** a guest or an unverified registered user calls the endpoint
- **THEN** the request fails exactly like a submission attempt (no report stored)

### Requirement: Auto-hide on the trust-weighted non-existence tally

When the report insert that brings a shelter's trust-weighted hide
tally — the sum of the distinct `NON_EXISTENT` reporters' derived trust
weights, dampened reports contributing 0 and admin-dismissed reports
excluded entirely — crosses from below 5 points to at least 5, the
system SHALL set the shelter's status to `INACTIVE` (soft auto-hide; the
row and its reports are retained). Five baseline (weight-1) reporters
still hide on the fifth report; trusted reporters (weight 2–3) reach
the tally faster, and a set of dampened or dismissed reports alone
never hides. The transition SHALL trigger only on the crossing insert;
after any manual status change (admin restore or author action),
further `NON_EXISTENT` reports SHALL increment the tally but SHALL NOT
re-hide the shelter. A hidden shelter SHALL be excluded from the public
list and the map, SHALL remain visible in the owner's /mine list (marked
hidden), and SHALL remain fetchable by id for the owner and admins.

#### Scenario: Five baseline reporters hide on the fifth report

- **WHEN** five distinct verified users with no trust history file
  `NON_EXISTENT` reports on an ACTIVE, armed shelter
- **THEN** the shelter stays ACTIVE and only flagged through the first
  four reports, and becomes `INACTIVE` exactly on the fifth,
  disappearing from the public list and map

#### Scenario: Trusted reporters reach the threshold faster

- **WHEN** two weight-2 reporters file `NON_EXISTENT` reports on an
  ACTIVE shelter and a third, baseline reporter files the third
- **THEN** the tally is 2 + 2 + 1 = 5 and the shelter is hidden on
  the third report

#### Scenario: Dampened and dismissed reports count nothing

- **WHEN** every `NON_EXISTENT` report on an ACTIVE shelter is
  dampened or admin-dismissed
- **THEN** the tally stays at 0 and those reports never auto-hide the
  shelter

#### Scenario: no re-hide after a manual restore

- **WHEN** an admin restores an auto-hidden shelter and later users report
  `NON_EXISTENT` again
- **THEN** the shelter stays visible; only an admin can hide it again

### Requirement: Live open/closed status taps

The system SHALL provide `PUT /api/shelters/{id}/open-status` accepting
`{ "state": <OPEN | CLOSED> }` — the caller's live open/closed state,
the same level as the occupancy band. Each user SHALL have at most one
live state per shelter (an upsert: a re-send updates it, latest state
wins, `created_at` refreshed). Tapping SHALL require a verified
registered user (guests and unverified users → 403 with the same
REPORTING_MESSAGE vocabulary as occupancy); an unknown shelter id SHALL
return 404, and a value outside `OPEN`/`CLOSED` SHALL return 400 (Spring
enum binding, same as the occupancy `band`). A tap is a state, not a
report action: it is NOT throttled and consumes no action-log budget.
The derived state is display-only — it SHALL never affect visibility,
status, markers or any filter — and SHALL degrade to silence once no
tap is fresh (fresh = within 2 hours).

#### Scenario: verified user taps a state

- **WHEN** a verified user PUTs `CLOSED` for shelter 7
- **THEN** the tap is stored as their one live state for that shelter
  and the derived open/closed state reflects it on the next list fetch

#### Scenario: re-tapping updates, never stacks

- **WHEN** the same user PUTs `OPEN` for the same shelter again
- **THEN** their stored state flips to `OPEN` (latest state wins,
  timestamp refreshed) and they still have exactly one live state

#### Scenario: stale taps degrade to silence

- **WHEN** the newest tap for a shelter is older than 2 hours
- **THEN** the shelter shows no open/closed state (the derived block is
  null)

#### Scenario: open/closed never hides

- **WHEN** every fresh tap for a shelter is `CLOSED`
- **THEN** the shelter remains fully visible, mappable and filterable,
  with its status and markers untouched

### Requirement: Occupancy reports

The system SHALL provide `PUT /api/shelters/{id}/occupancy` accepting
`{ "band": <SPACE | GETTING_FULL | FULL> }` (verified users only). Each
user SHALL have at most one live report per shelter (upsert, `updated_at`
refreshed). Display is derived at read time over the last 2 hours of
`updated_at`: no fresh reports → no occupancy shown; exactly one fresh
report → hedged copy ("Reported full" / "Reported getting full" /
"Reported space available"); two or more fresh reports agreeing with the
most recent band → firm copy ("Full" / "Getting full" / "Space
available"). Occupancy SHALL never affect visibility, status, marker
color, or any filter. Stale reports (older than 2 h) SHALL be ignored at
read time with no cleanup job.

#### Scenario: lone report is hedged

- **WHEN** one fresh `FULL` report exists for a shelter
- **THEN** the shelter shows "Reported full" (hedged), never plain "Full"

#### Scenario: agreeing reports firm up

- **WHEN** two or more fresh reports share the most recent band `FULL`
- **THEN** the shelter shows "Full" with the recency of the latest report

#### Scenario: stale occupancy disappears

- **WHEN** the only occupancy report is older than 2 hours
- **THEN** no occupancy information is shown

#### Scenario: occupancy never hides

- **WHEN** every reporter marks a shelter `FULL`
- **THEN** the shelter remains fully visible and mappable

### Requirement: Report throttling and per-user submission cap

Report and occupancy endpoints SHALL be rate-limited per user (10
report-type actions across all targets and types per rolling hour, 429
with the standard throttle error body — same pattern as the verification
and password-reset throttles). `POST /api/shelters` SHALL reject with 409
when the submitting user already has 10 shelters with `source=USER` and
`status=ACTIVE`; the cap SHALL NOT apply to users of `ADMIN` kind.

#### Scenario: report spam is throttled

- **WHEN** a verified user makes the 11th report-type action within a
  rolling hour
- **THEN** the request fails with 429 and the standard throttle message

#### Scenario: eleventh active shelter is rejected

- **WHEN** a verified user with 10 active user-shelters submits an
  11th
- **THEN** the request fails with 409 explaining the cap

### Requirement: Reported-state derivation is server-side

The public shelter DTO SHALL carry the derived state consumed by the UI:
`nonexistentReports` (int, 0 when none), `inaccurateReports` (int, 0 when
none — the open `WRONG_LOCATION` + `OTHER` subset; a dismissed report
stops counting) — the reported state is the OR of the two: either open
report kind at > 0 drives the orange reported marker and badge — an
open/closed block
`openStatus` (`state` = `OPEN` | `CLOSED` — the latest fresh (≤ 2 h)
tap's state, `reportCount` = the number of fresh taps agreeing with that
state, `reportedAt` = the newest fresh tap's time — null when nothing is
fresh), and an occupancy block
(`band` = the latest fresh band, `reportCount` = fresh reports agreeing
with that band, `lastReportedAt` — null when nothing fresh; the UI shows
hedged copy when `reportCount` is 1, firm copy at 2+). The detail
projection additionally SHALL carry `yourOccupancyBand` (the caller's own
band, null for guests and anonymous users) and `yourOpenStatus` (the
caller's own live open/closed state, same null rules).
Derivations SHALL be computed in the list/detail projection (batched, no
N+1 — the established `submitterVerified` batching pattern) and
SHALL NOT be client-computed from raw report lists.

#### Scenario: list responses carry derived state

- **WHEN** any client fetches the shelter list
- **THEN** each shelter DTO already contains its reported, open/closed
  and occupancy state and the client renders it without extra calls
