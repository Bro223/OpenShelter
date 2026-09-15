# Spec Delta: shelter-submission (community-review-queue)

## ADDED Requirements

### Requirement: Community submissions publish immediately with a trust lifecycle

A newly submitted USER shelter SHALL be public immediately with
`review_status = NEW` (there is no blocking review queue — the owner
does not actively moderate). `NEW` rows carry the unverified treatment
in the UI. When a positive community report (type OPEN_CONFIRMED) is
submitted by a user other than the row's submitter, the row's
review_status SHALL become CONFIRMED in the same transaction. The
admin CONFIRM action performs the same transition manually. A rejected
row (status INACTIVE, review_status REJECTED) restored through the
existing admin status endpoint SHALL return to NEW.

#### Scenario: New submission is public but visibly new

- **WHEN** a verified user submits a new shelter
- **THEN** it appears in the public list and map with the amber
  "new community" treatment and its owner sees it in /mine as NEW

#### Scenario: A positive report from another user confirms it

- **WHEN** a user other than the submitter files an OPEN_CONFIRMED
  report on a NEW row
- **THEN** the row becomes CONFIRMED (green treatment) and an
  AUTO_CONFIRM audit row exists; a positive report by the submitter
  themselves does NOT promote the row

#### Scenario: Rejection then restore starts over

- **WHEN** an admin rejects a row and later restores it via the
  existing status endpoint
- **THEN** the row is public again as NEW (not CONFIRMED)

### Requirement: Private location declaration

The submission form SHALL let the submitter declare the location a
private home or private shelter (stored as location_kind PRIVATE;
default PUBLIC). Private rows remain public results but SHALL show a
"Private home (declared)" badge on list rows, the detail page, and the
admin list, with a detail-page note that it is a resident-offered
location, not an official facility. The declaration is a building-type
claim only: the UI SHALL NOT derive or display any access policy
("publicly available" yes/no) from it, and no filter SHALL hide
PRIVATE rows.

#### Scenario: Declared private home

- **WHEN** a submitter ticks the private-home declaration
- **THEN** the row is public with the PRIVATE kind and every surface
  shows the private-location badge
