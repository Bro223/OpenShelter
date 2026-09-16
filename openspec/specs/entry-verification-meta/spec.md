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
NON_EXISTENT count (map row and detail header). The shelter detail
header SHALL show a last-verified meta line: "Last verified {ago}" for
verified rows (relative under 7 days; a concrete "D Mon YYYY" date
beyond), "Proposed {age} — not yet verified" for UNDER_REVIEW rows, and
"No verification record yet" for other unverified rows; a present
`reportCount` rides on the same line as "· N community reports". All
copy SHALL be single-sourced in `shelter-copy.ts` with spec pins.

#### Scenario: The reported badge carries its count

- **WHEN** a row with 2 NON_EXISTENT reports renders on the map
- **THEN** its orange badge reads "Reported (2)"

#### Scenario: A Proposed row shows the under-review line

- **WHEN** the detail page of an UNDER_REVIEW row whose `createdAt` is
  3 days ago renders
- **THEN** the meta line reads "Proposed 3 d ago — not yet verified"

#### Scenario: A verified registry row shows the import stamp

- **WHEN** the detail page of a registry row whose newest verified
  import was 2 hours ago renders
- **THEN** the meta line reads "Last verified 2 h ago"
