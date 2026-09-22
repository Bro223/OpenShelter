# Spec Delta: map-browse (community-review-queue)

## ADDED Requirements

### Requirement: Trust-state marker colours and badges

The map legend SHALL show four entries: Registry (blue), New community
(new token — the unified yellow family, one value with the verified
yellow), Confirmed community (green), Reported (orange). (Superseded by
later owner decisions: the NEW legend entry was removed, and then the NEW
marker tone itself — the pin carries verification depth, not recency; the
state rides on the "Newly added" badge; design-tokens.spec.ts pins the
absence of a .shelter-marker--new rule.)
Marker tone for community rows: the verification-depth shape (the yellow
family) when the submitter's depth is reported, the community tone
otherwise — there is no recency tone on the pin; reported rows keep the
orange override. List rows and
detail pages SHALL badge community rows: "Newly added" (NEW) or
"Community-checked" (CONFIRMED); rows with location_kind PRIVATE add a
"Private home (declared)" badge and the detail page shows a note that it
is a resident-offered location, not an official facility. The UI
SHALL NOT derive or display any access policy from locationKind (no
"publicly available" display, no filter hiding PRIVATE rows — design
D7a). NEW community
detail pages SHALL additionally show the unverified warning: the
location was submitted by a community member, is not officially
verified, and must not be relied on during an emergency.

#### Scenario: New vs confirmed community rows

- **WHEN** the map shows one NEW and one CONFIRMED community row
- **THEN** both render the community tone (the pin carries depth, not
  recency — the NEW row's "Newly added" badge, not the pin, carries the
  state)

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
