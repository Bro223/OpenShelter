# Spec Delta: shelter-reports (shelter-trust-and-reports)

## ADDED Requirements

### Requirement: Typed shelter reports

The system SHALL provide `POST /api/shelters/{id}/reports` accepting a JSON
body `{ "type": <NON_EXISTENT | CLOSED | OPEN_CONFIRMED | WRONG_LOCATION |
OTHER>, "detail": <optional text, max 500 chars> }` (detail is free text
for `OTHER`, otherwise ignored). Reporting SHALL require a verified
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

### Requirement: Auto-hide on five non-existence reports

When the report count of type `NON_EXISTENT` for a shelter reaches exactly
5, the system SHALL set the shelter's status to `INACTIVE` (soft
auto-hide; the row and its reports/reviews are retained). The transition
SHALL trigger only on the insert that brings the count to 5; after any
manual status change (admin restore or author action), further
`NON_EXISTENT` reports SHALL increment the count but SHALL NOT re-hide the
shelter. A hidden shelter SHALL be excluded from the public list and the
map, SHALL remain visible in the owner's /mine list (marked hidden), and
SHALL remain fetchable by id for the owner and admins.

#### Scenario: fifth non-existence report hides the shelter

- **WHEN** the 5th distinct user's `NON_EXISTENT` report for a shelter is
  stored
- **THEN** the shelter becomes `INACTIVE` and disappears from the public
  list and map

#### Scenario: reports before the threshold only flag

- **WHEN** a shelter has 1–4 `NON_EXISTENT` reports
- **THEN** it stays `ACTIVE`, stays public, and shows the reported state

#### Scenario: no re-hide after a manual restore

- **WHEN** an admin restores an auto-hidden shelter and later users report
  `NON_EXISTENT` again
- **THEN** the shelter stays visible; only an admin can hide it again

### Requirement: Closed and open confirmation flag

`CLOSED` and `OPEN_CONFIRMED` reports SHALL net out to a display-only
flag on the shelter: more `CLOSED` than `OPEN_CONFIRMED` (confirmed may
be 0) → `REPORTED_CLOSED`; `OPEN_CONFIRMED` ≥ `CLOSED` with both ≥ 1 (a
tie counts as confirmed open) → `CONFIRMED_OPEN`; otherwise no flag.
The flag SHALL never change shelter visibility or
status.

#### Scenario: community reports a shelter closed

- **WHEN** 2 users report `CLOSED` and none report `OPEN_CONFIRMED`
- **THEN** the shelter is listed and mappable with the "Reported closed"
  flag, never hidden

#### Scenario: someone confirms it is open again

- **WHEN** after 2 `CLOSED` reports, 3 users report `OPEN_CONFIRMED`
- **THEN** the flag flips to `CONFIRMED_OPEN` and the shelter remains
  visible throughout

### Requirement: Review reports and hidden reviews

The system SHALL provide `POST /api/shelters/{id}/reviews/{reviewId}/
reports` accepting `{ "reason": <FALSY_DATA | NOT_RELEVANT | SPAM | OTHER>,
"detail": <optional text, max 500 chars> }`. Rules: verified users only;
one report per user per review (repeat → 409); a user SHALL NOT report
their own review (403). When a review accumulates 5 reports the system
SHALL hide it (`hidden_at` set once). A hidden review SHALL be excluded
from the review list (except for its author, who sees it marked hidden),
from the shelter's average rating and review count, and from the
`reviewed` filter. The review DTO SHALL carry `hidden` (boolean) so the author's view
can mark it; hidden reviews are never returned to non-authors. Hiding
SHALL never delete the review row.

#### Scenario: five reports hide a review

- **WHEN** the 5th distinct user's report on a review is stored
- **THEN** the review disappears from the public list and from the
  shelter's average rating and count

#### Scenario: author still sees their hidden review

- **WHEN** the review's author opens the shelter detail page
- **THEN** their own hidden review is visible to them, marked as hidden

#### Scenario: own review cannot be reported

- **WHEN** a user attempts to report their own review
- **THEN** the request fails with 403 and nothing is stored

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
`nonexistentReports` (int, 0 when none), `statusFlag`
(`REPORTED_CLOSED` | `CONFIRMED_OPEN` | null), and an occupancy block
(`band` = the latest fresh band, `reportCount` = fresh reports agreeing
with that band, `lastReportedAt` — null when nothing fresh; the UI shows
hedged copy when `reportCount` is 1, firm copy at 2+). The detail
projection additionally SHALL carry `yourOccupancyBand` (the caller's own
band, null for guests and anonymous users).
Derivations SHALL be computed in the list/detail projection (batched, no
N+1 — the established `submitterVerified`/`averageRating` pattern) and
SHALL NOT be client-computed from raw report lists.

#### Scenario: list responses carry derived state

- **WHEN** any client fetches the shelter list
- **THEN** each shelter DTO already contains its reported/occupancy
  state and the client renders it without extra calls
