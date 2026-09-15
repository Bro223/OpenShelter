# map-browse Specification

## Purpose

Public, read-only browsing of Estonia's shelters on an interactive map with a sidebar list and a
source filter. This is the frontend capability that turns `GET /api/shelters` rows into an
accessible browse experience; it requires no authentication.

## Requirements

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

### Requirement: Load and render shelters

The map page SHALL load all shelters from the backend (`GET /api/shelters`, no paging) and render
them both as markers on a map and as rows in a sidebar list, each showing the shelter name,
address (when present), and a source badge.

#### Scenario: Shelters exist

- **WHEN** the map page loads and the backend returns shelter rows
- **THEN** every returned shelter appears as a map marker and as a sidebar row, with no duplicate
  entries

#### Scenario: Shelter has no address

- **WHEN** a shelter row has a null address (user-submitted rows)
- **THEN** the sidebar row renders without an address line and without a layout break

### Requirement: Source filter

The map page SHALL offer source-filter chips (All, Registry, User) that refetch shelters from the
server with the corresponding `?source=` value; filtering SHALL be server-side, not client-side.

#### Scenario: Filter by registry

- **WHEN** the user selects the Registry chip
- **THEN** the page refetches with source REGISTRY and the map and list show only registry rows
  (PAASETEAMET and MUNICIPALITY)

#### Scenario: Filter by user submissions

- **WHEN** the user selects the User chip
- **THEN** the page refetches with source USER and the map and list show only USER rows

#### Scenario: Back to all

- **WHEN** the user selects the All chip
- **THEN** the page refetches with source ALL and shows every shelter again

### Requirement: Visual source distinction with legend

The map page SHALL distinguish registry shelters from user-submitted shelters visually (distinct
marker appearance per source) and SHALL show a legend explaining the distinction.

#### Scenario: Legend present

- **WHEN** the map page is shown
- **THEN** a legend labels registry markers and user markers with their meanings

### Requirement: Map and list selection sync

The map page SHALL keep the map and the sidebar list synchronized: selecting a list row selects
it and flies the map to that shelter at street level, and selecting a marker highlights the
matching list row. Clicks are SELECTION, not navigation — the user stays on `/map`.

#### Scenario: Row selected flies map

- **WHEN** the user selects a sidebar row
- **THEN** the row is highlighted and the map flies to that shelter's coordinates at street level
  (the zoom is the payoff of the click, not a navigation)

#### Scenario: Marker selected highlights row

- **WHEN** the user clicks a shelter marker on the map
- **THEN** the corresponding sidebar row becomes visibly selected and the map shows that shelter
  at street level — the app stays on `/map`

### Requirement: Navigate to shelter detail

Navigation to the detail page is a separate, explicit step: the map page SHALL navigate to
`/shelters/{id}` only when the user activates the "View details" link that appears on the SELECTED
sidebar row. Clicking a marker or a sidebar row SHALL select the shelter (select + fly to street
level) and NOT navigate away from `/map`.

#### Scenario: Marker click selects and zooms

- **WHEN** the user clicks a shelter marker on the map
- **THEN** the corresponding sidebar row becomes selected, the map flies to the shelter at street
  level, and the app stays on `/map`

#### Scenario: Row click selects and zooms

- **WHEN** the user clicks a shelter sidebar row
- **THEN** the row becomes selected, the map flies to the shelter at street level, and the app
  stays on `/map`

#### Scenario: View details navigates

- **WHEN** the user clicks the "View details" link on the selected row
- **THEN** the application navigates to the detail route for that shelter id

### Requirement: Loading, empty, and error states

The map page SHALL show a loading state while fetching, an explicit empty state when no shelters
match, and an error banner (per the shared error conventions) when the backend is unreachable —
while keeping the page chrome intact in all three states.

#### Scenario: Fetching in progress

- **WHEN** the page is fetching shelters
- **THEN** a loading indicator is visible and no empty or error state is shown

#### Scenario: Empty result set

- **WHEN** the fetch completes with zero shelters for the current filter
- **THEN** the page shows an empty state message and the map remains usable

#### Scenario: Backend unreachable

- **WHEN** the fetch fails (network error or HTTP error)
- **THEN** the page shows an error banner with the error message and the page chrome (header,
  nav) stays intact

### Requirement: Map lifecycle hygiene

The map SHALL be created once per page visit and destroyed when the user leaves the page so no map
instance or DOM listener leaks between visits.

#### Scenario: Leaving the page

- **WHEN** the user navigates away from `/map`
- **THEN** the map instance is destroyed and a later return to `/map` renders a fresh map without
  stale markers or duplicated tiles

### Requirement: Nearest shelter action

The map page SHALL provide a "Show shelters around you" button (styled with
the `--color-cta` safety-orange token — the token's only consumer is this
CTA; orange is
the single crisis affordance) that requests high-accuracy geolocation,
computes the closest shelter from the already-loaded list client-side,
pans and zooms the map to it, and
highlights the matching list row. Per-error states SHALL show specific copy
for permission denied, timeout, unsupported, and unavailable (same
vocabulary as the submit page's geolocation errors). An empty shelter list
SHALL show "No listed locations around you yet." with a link to /submit for
authenticated users. The action SHALL NOT add a backend call.

#### Scenario: nearest found

- **WHEN** the user taps "Show shelters around you" and geolocation succeeds
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
