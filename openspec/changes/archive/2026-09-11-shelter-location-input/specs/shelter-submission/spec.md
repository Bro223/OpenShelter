## ADDED Requirements

### Requirement: The submit form SHALL capture location by text, link, geolocation, or map pick

The shelter submission form SHALL provide a location section with four
capture modes that all write to one shared location state: (1) a smart
text input accepting coordinate strings (incl. DMS, with reversed lng/lat
auto-swap) and long-form map URLs, (2) a `maps.app.goo.gl` short link
resolved by the backend, (3) a "Use my location" geolocation button,
(4) the existing map click/drag picking. The resolved coordinates are
shown in a read-only readout — a display of the shared state, NOT a
capture mode. Manual numeric latitude/longitude entry is removed (the
smart text input replaces it). Submitting without a resolved location
SHALL keep the existing inline validation error.

#### Scenario: Coordinate string

- **WHEN** the user types `59.4370, 24.7535` (or with space/semicolon)
- **THEN** the marker moves to that position, the coordinates display
  updates, and no error shows

#### Scenario: Reversed order auto-swap

- **WHEN** the user pastes `24.7535, 59.4370` (lng,lat — outside the
  Estonia box in that order)
- **THEN** the form uses (59.4370, 24.7535) and shows a hint that the
  values were detected as longitude,latitude

#### Scenario: DMS string

- **WHEN** the user pastes `59°26'13"N 24°45'12"E`
- **THEN** the marker moves to the equivalent decimal position

#### Scenario: Unparseable text

- **WHEN** the input contains no coordinate pair
- **THEN** an inline error tells the user the text has no recognizable
  coordinates and offers map picking or "Use my location"

#### Scenario: Out-of-Estonia coordinates

- **WHEN** a parsed pair is outside the Estonia bounding box in both
  orders
- **THEN** an inline error says the location is outside Estonia and the
  marker is not placed

### Requirement: Map URLs with embedded coordinates SHALL be accepted client-side

Long-form map URLs (Google `?q=lat,lng` / `?ll=` / `?daddr=`,
`!3d…!4d…`, `/@lat,lng`; Apple `?ll=`; Bing `?q=lat,lng`) that contain a
pair inside the Estonia box SHALL be parsed client-side without any
network call.

#### Scenario: Google share link

- **WHEN** the user pastes
  `https://www.google.com/maps/place/@59.43703,24.75353,17z`
- **THEN** the marker is placed at 59.43703, 24.75353

#### Scenario: Map URL without coordinates

- **WHEN** the user pastes a map URL whose query is a place name (no
  numeric pair)
- **THEN** the inline error explains the link has no coordinates in it

### Requirement: Google short links SHALL be resolved by the backend

`maps.app.goo.gl/…` URLs SHALL be resolved by `POST /api/geo/resolve`
(JWT-protected, per-IP limited to 5 requests/minute). The endpoint SHALL
follow at most 3 redirects, extract the coordinate pair from the final
URL using the same Estonia-bbox rule, and return the pair or a single
generic not-found error.

#### Scenario: Short link resolves

- **WHEN** the user pastes a `maps.app.goo.gl` link that redirects to a
  Google Maps URL with an Estonia-coordinate pair
- **THEN** the form returns 200 with `{latitude, longitude}`, the marker
  is placed, and the coordinates display updates

#### Scenario: Short link without coordinates

- **WHEN** the redirect target carries no extractable pair (place name)
- **THEN** the endpoint returns 400 with the generic message and the
  form shows the inline not-found error

#### Scenario: Non-whitelisted host

- **WHEN** the client (or a direct API caller) sends any other host
- **THEN** the endpoint returns 400 with the generic message (it never
  fetches arbitrary URLs)

#### Scenario: Upstream failure

- **WHEN** the redirect chain times out or fails
- **THEN** the endpoint returns 502 with a generic retry-later message
  and no upstream detail

### Requirement: Geolocation SHALL be available as a one-tap capture

The "Use my location" button SHALL use the browser geolocation API
(high-accuracy, 10 s timeout), place the marker on success with an
accuracy hint, and map each error code (denied / unavailable / timeout)
to a specific inline message that suggests the other capture modes.

#### Scenario: Position acquired

- **WHEN** the browser returns a position
- **THEN** the marker is placed, an accuracy hint shows, and dragging
  the pin still works to fine-tune

#### Scenario: Permission denied

- **WHEN** the user denies the permission prompt
- **THEN** an inline message explains the permission is off and points
  to map picking / pasting a link

## MODIFIED Requirements

### Requirement: Submission form with location pick

The submission form SHALL collect a shelter name (required, ≤ 200 chars), an optional description
(≤ 2000 chars), an optional capacity (1–100 000), and a location captured by one of five
capture modes that all write to a single shared location state: a smart text input (coordinate
strings, DMS, long-form map URLs, with reversed lng/lat auto-swap), a maps.app.goo.gl short link
resolved by POST /api/geo/resolve, a "Use my location" geolocation button, map click/drag
picking, and an Estonia address search (client-side Nominatim geocoding). The manual numeric
latitude/longitude entry is REMOVED — the smart text input replaces it, and the resolved
coordinates are shown read-only (a display of the shared state, not a capture mode). The location
SHALL be pre-checked client-side against the Estonia bounding box for instant feedback; the
backend re-checks and rejects out-of-bounds points.

#### Scenario: Form fields and bounds

- **WHEN** a verified user fills the form with valid values inside Estonia
- **THEN** submission is enabled and no validation errors are shown

#### Scenario: Client-side Estonia pre-check

- **WHEN** a user picks a location outside Estonia
- **THEN** an immediate inline validation error is shown before the request is sent

#### Scenario: Out-of-range capacity

- **WHEN** capacity is outside 1–100 000 or negative
- **THEN** the form shows an inline validation error and does not submit

## ADDED Requirements (capability: location-resolution)

### Requirement: The backend SHALL expose POST /api/geo/resolve

A JWT-protected `POST /api/geo/resolve` endpoint SHALL accept
`{"url": string}`, rate-limit per client IP to 5 requests per minute,
and return `{"latitude": number, "longitude": number}` on success.

#### Scenario: Successful resolution

- **WHEN** an authenticated caller posts a `maps.app.goo.gl` URL whose
  redirect chain ends at a URL containing an in-Estonia pair
- **THEN** the response is 200 with `latitude` and `longitude`

#### Scenario: Rate limit exceeded

- **WHEN** a client IP exceeds 5 requests within a minute
- **THEN** the response is 429

#### Scenario: Unauthenticated

- **WHEN** the request has no valid JWT
- **THEN** the response is 401
