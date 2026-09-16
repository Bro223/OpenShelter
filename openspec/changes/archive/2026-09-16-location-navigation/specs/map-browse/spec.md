# Spec Delta: map-browse (location-navigation, M12)

## ADDED Requirements

### Requirement: The map page SHALL offer address search as a browse anchor

The map page SHALL include an address search input (below the
geolocation note) that queries OpenStreetMap Nominatim through the
existing `GeocodeGateway` (client-side, Estonia-restricted, limit 5,
no autosuggest, 1 request/s spacing, attribution line always
rendered) — the same contract and the same single gateway module as
the /submit address search. Submitting (button or Enter) with a
non-blank query runs ONE search; presses while a search is pending
are ignored. Results (≤5, display name + type) render as buttons;
selecting one sets a BROWSE ANCHOR at the result's coordinates: a
non-interactive, non-draggable anchor pin on the map, the map flies
to the point at neighbourhood scale, and every list row gains its
straight-line distance from the anchor (the `straightLineText`
honesty format — never a route claim). While an anchor is active the
list is sorted by that distance (name as the tiebreak); clearing the
anchor removes the pin, the per-row distances, and restores the
stable name sort. Setting an anchor supersedes the nearest-shelter
emphasis. A failed search (no results / 429 / network) renders an
inline state and changes nothing else. The search is client-side: no
backend call, no JWT, never IP geolocation.

#### Scenario: Search and select an address

- **WHEN** the user submits an Estonian address and selects a result
- **THEN** an anchor pin renders at the result's coordinates, the map
  flies there, each list row shows its straight-line distance from
  the anchor, and the list is sorted by that distance

#### Scenario: Clear the anchor

- **WHEN** the user clears the anchor
- **THEN** the pin and the per-row distances are removed and the list
  returns to the stable name sort

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
