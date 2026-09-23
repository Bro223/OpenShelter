# map-browse Specification

## Purpose

Public, read-only browsing of Estonia's shelters on an interactive map with a sidebar list and a
legend tone filter (the source chips are gone — the legend IS the filter). This is the
frontend capability that turns `GET /api/shelters` rows into an
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

### Requirement: Legend tone filter and practical filter chips

The map page SHALL offer NO source-filter chips (the All / Registry / User
chips shipped earlier were removed on 2026-09-22 as the legend's duplicate —
the registry-versus-user distinction they carried is the legend's registry
entry against its four community tones). The list SHALL always fetch ALL
sources: the map page's own requests carry no `?source=` narrowing
(`source=ALL` is the gateway's constant argument, never a user selection —
the parameter remains a backend filter per the viewport/paging requirement,
the page just does not vary it). The page's filter controls are the LEGEND
and the two practical chips:

- The legend's five pin-tone entries (registry, the unverified user tone,
  the two verified tones, and the reported tone) SHALL be toggle buttons —
  the legend IS the tone filter. The selection SHALL be the URL's `tones`
  parameter (URL-only state, no localStorage; legend order, comma-joined,
  the parameter absent when the set is empty). A hand-typed value SHALL
  sanitize in place to the nearest legal set (unknown names dropped), never
  an error. An empty set (or an absent parameter) is the unfiltered view.
  The filter SHALL be DISPLAY-ONLY: the loaded list is filtered and the
  markers re-render from the same view — no refetch, and the fetched data
  is never altered. The sixth legend entry (the address-search anchor
  diamond) is a UI reference point, not a pin tone, and SHALL NOT be a
  filter.
- The `Open` chip SHALL keep the rows whose derived display status is not a
  fresh CLOSED state; it is client-side (the backend has no open/closed
  parameter) and refilters the loaded list WITHOUT a refetch.
- The `Has capacity` chip SHALL refetch the list with `hasCapacity=true`
  (ALL sources), keeping only shelters whose capacity data is present.

#### Scenario: Selecting legend tones filters the loaded list

- **WHEN** the user toggles legend entries on or off
- **THEN** the map and the sidebar show exactly the rows whose marker tone
  is selected (every row when nothing is selected), the selection is
  written to the `tones` URL parameter, and no list refetch happens

#### Scenario: The tone selection is URL state

- **WHEN** a user opens a URL whose `tones` parameter carries a legal set —
  or an invalid hand-typed value
- **THEN** the page applies that tone set to the loaded list, clamping an
  invalid value to the nearest legal set without an error, and the view
  and the URL agree

#### Scenario: Has capacity refetches with all sources

- **WHEN** the user toggles the `Has capacity` chip
- **THEN** the page refetches with `hasCapacity=true` (no `?source=`
  narrowing) and only shelters with capacity data remain

#### Scenario: Open filters without a refetch

- **WHEN** the user toggles the `Open` chip
- **THEN** the loaded list is filtered to the rows whose derived display
  status is not a fresh CLOSED state, the markers re-render from the
  filtered view, and no request is sent

#### Scenario: Filters combine

- **WHEN** the user selects legend tones and activates one or both chips
- **THEN** the view is the intersection of the tone selection, the Open
  predicate, and (while the chip is on) the capacity-refetched list

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

### Requirement: Viewport filter and paging on the shelter list

The public list endpoint `GET /api/shelters` SHALL accept six optional
query parameters that change nothing when omitted: a viewport box —
`minLat`, `minLng`, `maxLat`, `maxLng` — and offset/limit paging —
`limit`, `offset`.

The viewport box is all-or-nothing: a request carrying any one of the
four edges SHALL carry all four, and it SHALL keep exactly the rows whose
coordinates fall inside the box, **inclusive** of the edges (a row
exactly on an edge is returned). The edges SHALL be validated as finite
WGS84 coordinates — latitude within −90…90, longitude within −180…180,
`minLat ≤ maxLat`, `minLng ≤ maxLng` — and a partial box, a non-finite or
out-of-range edge, or an inverted box SHALL answer 400 with the uniform
error body.

Paging SHALL be applied over the list's existing stable id-ascending
order, and the existing filters (`source`, `hasCapacity`, `provenance`)
SHALL apply before the slice, so a page never contains a row the filters
would drop. `limit` SHALL be between 1 and 200; `offset` SHALL be
non-negative; a value outside those bounds SHALL answer 400 with the
uniform error body. An `offset` beyond the end of the filtered list SHALL
answer 200 with an empty array. Over a static dataset, paging SHALL be
deterministic: repeating a page request SHALL return the same page, and
consecutive `limit`-sized pages SHALL tile the filtered list without
overlap or skipped rows. The response SHALL remain a bare JSON array of
shelter rows (no envelope, no total count). This requirement is
backend-only: the map page's own consumption of the parameters (viewport
tracking, incremental paging) is a follow-up change and is NOT part of
this one.

#### Scenario: Omitting the parameters keeps today's behaviour

- **WHEN** a caller requests `GET /api/shelters` with none of the six
  parameters
- **THEN** the endpoint answers 200 with every ACTIVE row in
  id-ascending order — the same query, order and body as before the
  parameters existed

#### Scenario: The viewport keeps inside rows and includes the edges

- **WHEN** shelters exist inside, exactly on, and outside the box
- **THEN** the request carrying all four edges answers 200 with the
  inside rows and the on-edge rows, and with none of the outside rows

#### Scenario: A partial box is refused

- **WHEN** a request carries `minLat` and `maxLat` but no longitude edges
- **THEN** the endpoint answers 400 with the uniform error body and no
  filtering takes place

#### Scenario: An inverted or out-of-range box is refused

- **WHEN** a request carries `minLat > maxLat` (or `minLng > maxLng`), or
  a latitude outside −90…90, or a longitude outside −180…180
- **THEN** the endpoint answers 400 with the uniform error body

#### Scenario: Pages tile the list without overlap or skips

- **WHEN** a filtered list holds seven rows and the caller requests
  `limit=3` at `offset=0`, `3` and `6`
- **THEN** the three answers hold three, three and one row respectively,
  in the stable id-ascending order, and their union is exactly the
  filtered list with no row appearing in two pages

#### Scenario: An offset past the end is an empty page

- **WHEN** the caller requests an `offset` beyond the end of the filtered
  list
- **THEN** the endpoint answers 200 with an empty array, not an error

#### Scenario: Filters apply before paging

- **WHEN** the caller combines `hasCapacity=true` with `limit=1`
- **THEN** the answer is the first (lowest-id) row of the
  capacity-filtered list, not the first row of the unfiltered list

#### Scenario: Out-of-bounds paging values are refused

- **WHEN** a request carries `limit=0` (or a `limit` above 200) or a
  negative `offset`
- **THEN** the endpoint answers 400 with the uniform error body

### Requirement: The map page SHALL offer address search as a browse anchor

The map page SHALL include an address search input (below the
geolocation note) that queries OpenStreetMap Nominatim through the
existing `GeocodeGateway` (client-side, Estonia-restricted, limit 5,
no autosuggest, 1 request/s spacing, attribution line always
rendered) — the same contract and the same single gateway module as
the /submit address search. Submitting (button or Enter) with a
non-blank query runs ONE search; presses while a search is pending
are ignored. Results (≤5, display name + type) render as buttons;
selecting one sets a BROWSE ANCHOR at the result's coordinates: the
ORIGIN MARKER, the map flies to the point at neighbourhood scale, and
every list row gains its straight-line distance from the anchor (the
`straightLineText` honesty format — never a route claim). While an
anchor is active the list is sorted by that distance (name as the
tiebreak); clearing the anchor removes the marker, the per-row
distances, and restores the stable name sort. Setting an anchor
supersedes the nearest-shelter emphasis. A failed search (no results /
429 / network) renders an inline state and changes nothing else. The
search is client-side: no backend call, no JWT, never IP
geolocation.

The ORIGIN MARKER SHALL be visually distinct from shelter markers on
SHAPE, not colour alone: shelter markers are 14 px circles, the origin
is a smaller (12 px) diamond in the user-picked-spot teal
(`.shelter-marker--anchor` — the `/submit` pick pin keeps its own
circular style). The map legend SHALL carry a matching entry (the same
marker class as swatch, an existing translated label key). The marker
SHALL carry an accessible name ("Searched address") and SHALL NOT
obscure shelter markers: shelter markers outrank the origin pin in
z-order, so a shelter at the anchor point always draws above the pin,
at every zoom the app uses (country 7, neighbourhood 14, street 16).

The distance rule SHALL be documented where a future developer will
find it — the map context doc
(`frontend/docs/agent/05-CONTEXT-MAP.md`, "Distance numbers" section,
cross-referenced from the `MapPage` doc comment) — stating: which two
points (the origin — the user's geolocation fix for the around-you CTA,
or the geocoded address point for the anchor — and the shelter's
stored WGS84 coordinates), which formula (Haversine great-circle
distance, Earth radius 6371 km, `haversineKm` in `shared/geolocation.ts`,
computed client-side over the loaded rows — no backend call, no IP
geolocation), which zoom (the number is a property of the two points,
not of the view — zoom-independent; the camera flies to the origin at
neighbourhood scale 14, selecting a row flies to that shelter at
street level 16), and what the number means to the user (an
approximate straight line over the earth's surface — never a
walking/driving route, never an official distance; "≈" is the honesty
marker).

#### Scenario: Search and select an address

- **WHEN** the user submits an Estonian address and selects a result
- **THEN** the origin marker renders at the result's coordinates, the
  map flies there, each list row shows its straight-line distance from
  the origin, and the list is sorted by that distance

#### Scenario: The origin marker is distinct from shelter markers

- **WHEN** the user selects an address search result
- **THEN** the origin renders as a diamond (not a circle) in the
  user-picked-spot teal, smaller than the 14 px shelter dots, with the
  accessible name "Searched address", and the map legend carries a
  matching entry (diamond swatch + label)

#### Scenario: A shelter at the anchor point is not obscured

- **WHEN** a shelter's coordinates coincide with the anchor point
- **THEN** the shelter marker draws above the origin pin (the shelter
  outranks the pin in z-order), at the zoom levels the app uses

#### Scenario: The distance rule is documented

- **WHEN** a future developer reads the map context doc's
  "Distance numbers" section (or the `MapPage` doc comment that
  cross-references it)
- **THEN** it states which two points the figures measure, the
  Haversine formula and its client-side-only scope, that the number is
  zoom-independent (origin camera at 14, shelter selection at 16), and
  that the figure is a straight-line approximation — never a route or
  an official distance

#### Scenario: Clear the anchor

- **WHEN** the user clears the anchor
- **THEN** the origin marker and the per-row distances are removed and
  the list returns to the stable name sort

#### Scenario: The search is throttled

- **WHEN** Nominatim returns 429
- **THEN** the inline "please wait a moment" state renders and no
  anchor is set

#### Scenario: No results

- **WHEN** Nominatim returns an empty list
- **THEN** the inline no-results state renders and no anchor is set
### Requirement: The shelter detail page SHALL offer a distance-from-you action

The shelter detail page SHALL offer a "Distance from you" action
alongside the existing Navigate / Open-in-Apple-Maps deep links.
Activating it requests high-accuracy browser geolocation (the map CTA's
exact options: `enableHighAccuracy`, `timeout` 10000, `maximumAge` 0)
and, on success, renders the straight-line distance from the user to
the shelter's coordinates in the honesty format suffixed " from you"
(never a walking-route or official claim). Each geolocation failure
mode renders the per-error copy mirrored from the map CTA's
vocabulary. The computation is client-side: no backend call, no IP
geolocation. A failure renders the error line and no distance line.

#### Scenario: Distance shown on success

- **WHEN** the user activates the action and geolocation succeeds
- **THEN** the straight-line distance line ("≈ … straight line from
  you") renders under the coordinate line

#### Scenario: Geolocation denied

- **WHEN** the browser denies location access
- **THEN** the denied per-error line renders and no distance line
  renders

#### Scenario: Unsupported browser

- **WHEN** the browser has no geolocation support
- **THEN** the unsupported per-error line renders and no distance
  line renders

### Requirement: Reported and occupancy presentation

Shelters with an open report of EITHER kind — `nonexistentReports > 0`
or `inaccurateReports > 0` (a dismissed report stops counting) — SHALL
render an orange reported marker on the map and an orange "Reported (n)"
badge on the list row, where n is the open trust-report total
(`nonexistentReports` + `inaccurateReports`) (the orange is the single
"reported" affordance; provenance colors apply only
to unreported shelters). The `openStatus` block (`state` = OPEN/CLOSED, fresh ≤ 2 h) SHALL
render a badge only for a fresh CLOSED state — "Reported closed" at
exactly one fresh agreeing tap, "Closed" at two+ — on the list row and
detail header; a fresh OPEN state renders no badge (open is the
default). Fresh occupancy SHALL render as a neutral badge with
recency ("Full · 12 min ago"; hedged "Reported full" for lone reports) —
never styled as success or crisis. Auto-hidden shelters SHALL NOT appear
on the map or in the list at all.

#### Scenario: Reported shelter gets the orange state

- **WHEN** a shelter has an open report of either kind (a non-existence
  report or an inaccurate-information report) and is still active
- **THEN** its marker is orange and its list row shows the "Reported"
  badge

#### Scenario: Closed state shows, shelter stays

- **WHEN** a shelter's `openStatus` block carries a fresh CLOSED state
- **THEN** the list row and detail header show "Reported closed" (one
  fresh agreeing tap) or "Closed" (two+) and the shelter remains
  mappable

#### Scenario: Occupancy badge with recency

- **WHEN** a shelter has two fresh FULL reports, the latest 12 minutes
  old
- **THEN** the list row and detail header show "Full · 12 min ago"
