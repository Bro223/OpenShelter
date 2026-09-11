# Spec Delta: map-browse (map-crisis-actions)

## ADDED Requirements

### Requirement: Nearest shelter action

The map page SHALL provide a "Nearest shelter" button (styled with the
`--color-cta` safety-orange token — the token's only consumers are this
CTA and its matching row emphasis (`.shelter-row--nearest`); orange is
the single crisis affordance) that requests high-accuracy geolocation,
computes the closest shelter from the already-loaded list client-side,
pans and zooms the map to it, and
highlights the matching list row. Per-error states SHALL show specific copy
for permission denied, timeout, unsupported, and unavailable (same
vocabulary as the submit page's geolocation errors). An empty shelter list
SHALL show "No shelters near you yet." with a link to /submit for
authenticated users. The action SHALL NOT add a backend call.

#### Scenario: nearest found

- **WHEN** the user taps "Nearest shelter" and geolocation succeeds
- **THEN** the map centers on the closest shelter and that list row is
  visually emphasized

#### Scenario: permission denied

- **WHEN** the user denies the location prompt
- **THEN** the message explains that location access is off and that they
  can enable it in browser settings; the list and map are untouched

#### Scenario: no shelters

- **WHEN** the shelter list is empty
- **THEN** the message offers to add the first shelter (authenticated)

### Requirement: Navigate to shelter

The shelter detail page SHALL provide a "Navigate" action that opens the
user's phone navigation app with walking directions to the shelter's
coordinates (Google Maps walking deep link), plus an "Open in Apple Maps"
fallback link. No in-app navigation and no third-party navigation library
SHALL be introduced.

#### Scenario: navigate opens maps

- **WHEN** the user taps "Navigate"
- **THEN** a Google Maps walking-directions deep link for the shelter
  coordinates opens in a new context

## MODIFIED Requirements

### Requirement: Public shelter map page

The application SHALL expose a public map page at the `/map` route that is also the default route
for the application, and SHALL require no authentication to view it. For
authenticated users, the sidebar SHALL additionally show an "Add shelter"
button (above the list) linking to /submit. The top navigation bar SHALL
NOT contain a submission item.

#### Scenario: Anonymous user opens the app root

- **WHEN** an anonymous user opens the application root
- **THEN** the application shows the shelter map page without prompting for login

#### Scenario: Authenticated user opens /map

- **WHEN** any user, signed in or not, navigates to `/map`
- **THEN** the shelter map page is shown with the same read-only content for both

#### Scenario: Authenticated user sees the add action

- **WHEN** an authenticated user opens /map
- **THEN** the sidebar shows an "Add shelter" button that routes to /submit
