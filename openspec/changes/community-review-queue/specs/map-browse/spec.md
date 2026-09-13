# Spec Delta: map-browse (community-review-queue)

## ADDED Requirements

### Requirement: Trust-state marker colours and badges

The map legend SHALL show four entries: Registry (blue), New community
(amber, new token), Confirmed community (green), Reported (orange).
Marker tone for community rows: amber when review_status NEW, green
when CONFIRMED; reported rows keep the orange override. List rows and
detail pages SHALL badge community rows: "Newly added" (NEW) or
"Community-checked" (CONFIRMED); rows with location_kind PRIVATE add a
"Private location" badge and the detail page shows a note that it is a
resident-offered location, not an official facility. NEW community
detail pages SHALL additionally show the unverified warning: the
location was submitted by a community member, is not officially
verified, and must not be relied on during an emergency.

#### Scenario: New vs confirmed community rows

- **WHEN** the map shows one NEW and one CONFIRMED community row
- **THEN** they render amber and green respectively and the legend
  names both states

#### Scenario: Private declaration surfaces everywhere

- **WHEN** a PRIVATE row is shown in the list, its detail page, or the
  admin list
- **THEN** the private-location badge is present on each surface

### Requirement: "Show shelters around you" with honest distance

The CTA SHALL read "Show shelters around you" (button, result line,
empty state — replacing "Nearest listed location"); it SHALL remain
browser-geolocation only (no IP geolocation). The result line SHALL
display the straight-line distance computed for ranking ("≈ 2.4 km
straight line"; metres below 1 km) and SHALL NOT claim a walking
route. When the highlighted row is a community row (any review status),
the result SHALL also show the unverified warning line.

#### Scenario: Around-you result is a community row

- **WHEN** the user's closest listed location is a community row
- **THEN** the result shows the straight-line distance and the
  unverified warning

#### Scenario: Around-you result is official

- **WHEN** the closest row is a registry row
- **THEN** the result shows the straight-line distance and no
  unverified warning
