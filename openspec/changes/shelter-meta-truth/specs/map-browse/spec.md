# Spec Delta: map-browse (shelter-meta-truth, M8)

## MODIFIED Requirements

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
