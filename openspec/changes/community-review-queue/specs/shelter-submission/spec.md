# Spec Delta: shelter-submission (community-review-queue)

## ADDED Requirements

### Requirement: Community submissions publish immediately with a trust lifecycle

A newly submitted USER shelter SHALL be public immediately with
`review_status = NEW` (there is no blocking review queue — the owner
does not actively moderate). `NEW` rows carry the unverified treatment
in the UI (the "Newly added" badge — the unified yellow family, one
value with the verified yellow). When the row's tally of distinct
community confirmers — verified users other than the row's submitter
who filed an open (non-dismissed) `OPEN_CONFIRMED` report or whose
current live tap is `OPEN`, each counted once — reaches three, the
row's review_status SHALL become CONFIRMED in the same transaction as
the crossing action (audited `AUTO_CONFIRM`, the crossing user as
actor; the threshold was one cross-user report at V11 and three
distinct confirmers since community-self-moderation). The admin
CONFIRM action performs the same transition manually. A rejected
row (status INACTIVE, review_status REJECTED) restored through the
existing admin status endpoint SHALL return to NEW.

#### Scenario: New submission is public but visibly new

- **WHEN** a verified user submits a new shelter
- **THEN** it appears in the public list and map with the
  "Newly added" treatment (unified yellow) and its owner sees it in /mine as NEW

#### Scenario: The third distinct non-submitter confirmation confirms it

- **WHEN** three distinct users other than the submitter have confirmed
  a NEW row (open `OPEN_CONFIRMED` reports and/or current OPEN taps,
  each counted once)
- **THEN** the row becomes CONFIRMED (the unified "Community-checked"
  treatment) and one AUTO_CONFIRM audit row exists with the crossing
  user as actor; two distinct confirmers leave it NEW, and the
  submitter's own confirmation does NOT count, not even as the third

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
