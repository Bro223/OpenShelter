# entry-verification-meta Specification

## Purpose
TBD - created by archiving change entry-verification-meta. Update Purpose after archive.

## Requirements

### Requirement: Per-entry last-verified stamp on the shelter DTOs

The shelter DTOs (public list, detail, /mine) SHALL carry
`lastVerifiedAt` — the server-derived verification stamp: for registry
rows, the newest `OK` / `NOT_MODIFIED` import run of the row's own
source; for community rows, the newest non-submitter `OPEN_CONFIRMED`
report or `CONFIRM` / `AUTO_CONFIRM` moderation action; `null` when the
row has never been verified. The derivation SHALL be batched (no N+1)
and computed server-side — the UI never re-derives it.

#### Scenario: A registry row carries its newest verifying import

- **WHEN** a PAASETEAMET row's source has import runs OK (t1), FAILED
  (t2) and NOT_MODIFIED (t3, t3 > t2 > t1)
- **THEN** the row's `lastVerifiedAt` equals t3 (the 304 re-check
  verifies; the FAILED run is skipped)

#### Scenario: A failed-only history leaves the row unverified

- **WHEN** a registry row's source has only FAILED / SKIPPED runs
- **THEN** the row's `lastVerifiedAt` is null

#### Scenario: A cross-user community check stamps the row

- **WHEN** a verified user other than the submitter files an
  `OPEN_CONFIRMED` report on a community row
- **THEN** the row's `lastVerifiedAt` is that report's time (and the
  row is promoted to CONFIRMED by the existing auto-confirm flow)

#### Scenario: A self-confirm never stamps the row

- **WHEN** the submitter's own `OPEN_CONFIRMED` report is the only
  check on a community row
- **THEN** the row's `lastVerifiedAt` remains null and the row stays
  UNDER_REVIEW

### Requirement: Total report count on the shelter DTOs

The shelter DTOs SHALL carry `reportCount` — the TOTAL community
shelter-report count over all types, computed from the existing batched
per-type counts. `nonexistentReports` SHALL remain the NON_EXISTENT
subset that drives the orange reported state.

#### Scenario: Mixed report types sum into the total

- **WHEN** a row has 1 NON_EXISTENT, 1 CLOSED and 1 WRONG_LOCATION
  report
- **THEN** its `reportCount` is 3 and its `nonexistentReports` is 1

### Requirement: The UI surfaces the stamp and the counts

The orange reported badge SHALL read "Reported (n)" where n is the
open trust-report total — `nonexistentReports` + `inaccurateReports`
(the same OR of the two that drives the badge) (map row and detail
header). The shelter detail header SHALL show the verification fact
and the report fact as TWO separate, self-contained lines — the copy
SHALL NOT join them into one string (the previous "·"-joined line is
removed):

- The VERIFICATION line: "Last verified against the registry {ago}"
  for registry rows (the stamp is the newest non-failed import of the
  row's source — the line names the registry the check was against),
  "Last verified {ago}" for community rows (relative under 7 days; a
  concrete "D Mon YYYY" date beyond), "Newly added {age} — not yet
  verified" for UNDER_REVIEW rows, and "No verification record yet" for
  other unverified rows.
- The REPORT line: "Community reports: N (total, all types)", rendered
  only when `reportCount` > 0 — a labeled lifetime total, explicitly
  not a live tally: the open/closed and how-full taps are per-user live
  states that do not change this count, and no report action changes
  the verification line.

All copy SHALL be single-sourced in `shelter-copy.ts` with spec pins.

#### Scenario: The reported badge carries its count

- **WHEN** a row with 2 NON_EXISTENT reports renders on the map
- **THEN** its orange badge reads "Reported (2)"

#### Scenario: A verified registry row names the registry the stamp came from

- **WHEN** the detail page of a registry row whose newest verified
  import was 2 hours ago renders
- **THEN** the verification line reads "Last verified against the
  registry 2 h ago"

#### Scenario: A verified community row keeps the plain form

- **WHEN** the detail page of a community row whose newest
  community/moderation verification was 2 hours ago renders
- **THEN** the verification line reads "Last verified 2 h ago" (no
  registry attribution — a community check is not a registry import)

#### Scenario: The two facts render as two lines, never one string

- **WHEN** the detail page of a registry row with a verification stamp
  of 2 hours ago and 3 community reports of mixed types renders
- **THEN** the verification line reads "Last verified against the
  registry 2 h ago" and a SEPARATE line reads "Community reports: 3
  (total, all types)" — the count is not spliced onto the stamp line

#### Scenario: An under-review row with reports keeps both facts separate

- **WHEN** the detail page of an UNDER_REVIEW row whose `createdAt` is
  3 days ago and `reportCount` is 1 renders
- **THEN** the verification line reads "Newly added 3 d ago — not yet
  verified" and a separate line reads "Community reports: 1 (total,
  all types)"

#### Scenario: No report line while the count is zero

- **WHEN** the detail page of a verified row with `reportCount` 0
  renders
- **THEN** only the verification line renders; no report line is shown
