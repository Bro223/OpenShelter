# Spec Delta: proposed-community-wording (M7)

## ADDED Requirements

### Requirement: Proposed / community-reported labels for community rows

The community-state badge reads "Newly added" for NEW rows and
"Community-checked" for CONFIRMED rows, single-sourced in `shelter-copy.ts`
(`sourceTrustLabel`) and rendered on every surface that shows the badge:
the map list row, the shelter detail header, the /mine contributions
panel and the admin list. REJECTED rows read "Rejected" on the /mine and
admin surfaces only (never public).

#### Scenario: New vs confirmed community rows

- **WHEN** the map list shows one NEW and one CONFIRMED community row
- **THEN** their badges read "Newly added" and "Community-checked"
  respectively, on the map row, the detail header, /mine and the admin
  list alike

#### Scenario: Legend and chip match the renamed state

- **WHEN** the user opens the map
- **THEN** the legend entry for the amber marker reads "New by community"
  and the green marker entry reads "Confirmed by community"

### Requirement: Proposed wording on the remaining copy surfaces

The map subtitle still reads "Find registered and community-submitted
bomb shelters in Estonia."; only the meta description in `index.html`
carries "community-reported". The submit-success notice SHALL read "Your
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
