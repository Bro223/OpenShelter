# Spec Delta: proposed-community-wording (M7)

## ADDED Requirements

### Requirement: Proposed / community-reported labels for community rows

The community-state badge SHALL read "Proposed" for UNDER_REVIEW rows
and "Community-reported" for COMMUNITY_REPORTED rows, single-sourced in
`shelter-copy.ts` (`provenanceText`) and rendered on every surface that
shows the provenance badge: the map list row, the shelter detail
header, the /mine contributions panel and the admin list. The map
legend's amber entry and the UNDER_REVIEW filter chip SHALL read
"Proposed"; the COMMUNITY_REPORTED legend entry and chip keep the short
form "Community".

#### Scenario: New vs confirmed community rows

- **WHEN** the map list shows one UNDER_REVIEW and one
  COMMUNITY_REPORTED row
- **THEN** their badges read "Proposed" and "Community-reported"
  respectively, on the map row, the detail header, /mine and the admin
  list alike

#### Scenario: Legend and chip match the renamed state

- **WHEN** the user opens the map
- **THEN** the legend entry for the amber marker and the UNDER_REVIEW
  filter chip both read "Proposed", and selecting the chip refetches
  `?provenance=UNDER_REVIEW`

### Requirement: Proposed wording on the remaining copy surfaces

The map subtitle SHALL read "Find registered and community-reported
bomb shelters in Estonia." The submit-success notice SHALL read "Your
location is now listed and marked as proposed. Community reports
confirm it." The unverified warning SHALL keep its pinned sentence
(community-review-queue) and its surfaces: the detail page of
UNDER_REVIEW rows, and the around-you result line whenever the
highlighted row is a USER row (any review status).

#### Scenario: Submitting a shelter announces the proposed state

- **WHEN** a verified user submits a new shelter successfully
- **THEN** the success notice reads "Your location is now listed and
  marked as proposed. Community reports confirm it."

#### Scenario: The unverified warning still surfaces on community rows

- **WHEN** the detail page of an UNDER_REVIEW row renders, or the
  around-you result highlights a USER row
- **THEN** the pinned unverified-warning sentence is shown in the
  respective surface (detail block / result line)
