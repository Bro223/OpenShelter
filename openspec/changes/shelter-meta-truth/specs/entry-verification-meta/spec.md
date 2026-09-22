# Spec Delta: entry-verification-meta (shelter-meta-truth, M8)

## MODIFIED Requirements

### Requirement: The UI surfaces the stamp and the counts

The orange reported badge SHALL read "Reported (n)" where n is the
open trust-report total — `nonexistentReports` + `inaccurateReports`
(the same OR of the two that drives the badge) (map row and detail
header). The shelter detail header SHALL show the verification fact
and the report fact as TWO separate, self-contained lines — the copy SHALL NOT join them into one
string (the previous "·"-joined line is removed):

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
