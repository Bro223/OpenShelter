# shelter-submission Specification

## Purpose

Verified-user creation of community shelters: a guarded form with an Estonia-bounded location
pick, optional description and capacity, and navigation to the new shelter's detail page after
creation.

## Requirements

### Requirement: Verified-only submission route

The application SHALL expose a `/submit` route guarded so that only authenticated users who hold
at least one verification claim can reach the submission form; others are redirected or prompted
according to the same auth/verification rules used elsewhere.

#### Scenario: Anonymous user opens /submit

- **WHEN** a signed-out user navigates to `/submit`
- **THEN** they are redirected to log in, preserving `/submit` as the return destination

#### Scenario: Signed-in unverified user opens /submit

- **WHEN** an authenticated user without a verification claim navigates to `/submit`
- **THEN** they are directed to the verification flow instead of the form

#### Scenario: Verified user opens /submit

- **WHEN** a verified user navigates to `/submit`
- **THEN** the submission form is shown

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

### Requirement: Successful creation navigates to the detail page

When the backend accepts the submission (201 with Location), the application SHALL navigate the
user to the new shelter's detail page (`/shelters/{newId}`).

#### Scenario: Shelter created

- **WHEN** a verified user submits a valid shelter and the backend returns 201
- **THEN** the application navigates to that shelter's detail page showing the created community
  shelter (source USER, ACTIVE)

### Requirement: Server rejection surfaces as a banner

If the backend rejects the submission (401 anonymous, 403 no-longer-verified, 400 out-of-Estonia
or invalid), the application SHALL show the error message through the shared banner and keep the
user on the form with their input intact.

#### Scenario: Verification revoked between check and submit

- **WHEN** the backend rejects with 403 despite the guard passing
- **THEN** the user sees the 403 message with a path back to verification, and the form input is
  preserved

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

### Requirement: The submit form SHALL offer Estonia address search

The location section SHALL include an address search input that queries
OpenStreetMap Nominatim restricted to Estonia (`countrycodes=ee`, limit 5)
on Enter or search-button press, and lists results (display name +
type). Selecting a result SHALL place the shared location pin and, only
if the form's address field is empty, prefill it from the result's
display name.

#### Scenario: Search finds addresses

- **WHEN** the user types "lossi 2, tartu" and presses Enter
- **THEN** up to 5 Estonian results are listed and selecting one places
  the pin at its coordinates and marks the location source as
  address search

#### Scenario: Prefill only when empty

- **WHEN** the user selects a result while the address field already has
  user-typed text
- **THEN** the address field is left unchanged and the pin is placed

#### Scenario: No Estonian results

- **WHEN** the query matches nothing in Estonia
- **THEN** an inline message says no Estonian address was found and
  suggests the link/map/geolocation modes

### Requirement: Address search SHALL respect the geocoding service limits

Consecutive search requests SHALL be spaced at least 1000 ms apart
(client-side). A 429 from the service SHALL produce a "please wait a
moment" message. A network failure SHALL produce the generic network
error copy and never block form submission.

#### Scenario: Rapid searches

- **WHEN** the user triggers a second search within 1000 ms of the first
- **THEN** the second request waits until the spacing window allows it

#### Scenario: Service throttles

- **WHEN** Nominatim returns 429
- **THEN** the form shows a wait message and no pin changes

### Requirement: Address search SHALL credit OpenStreetMap

The location section SHALL always display an attribution
"© OpenStreetMap contributors" with a link to the OSM copyright page,
independent of search success or failure.

#### Scenario: Attribution visible before any search

- **WHEN** the form is rendered
- **THEN** the attribution line is visible next to the search input

### Requirement: Submission entry points

The application SHALL make shelter submission reachable from the map page
sidebar (authenticated users) and from the account contributions panel for
all authenticated users, not only when the user has no shelters yet. The
route guards on /submit (authentication, then verification redirect) remain
the single enforcement point.

#### Scenario: contributions panel always offers the action

- **WHEN** an authenticated user with existing shelters opens the
  contributions panel
- **THEN** a "Submit a shelter" action is visible

### Requirement: Shelter provenance display

ShelterDto SHALL expose `submitterVerified` — true when the shelter's
creator exists and has a completed verification, false otherwise (registry
shelters are false). List rows and the detail page SHALL display the
provenance plainly: "Paasteamet registry", "Municipal registry",
"Verified user", or "User-submitted".

#### Scenario: verified user shelter

- **WHEN** a shelter was submitted by a user with completed verification
- **THEN** its row and detail page show "Verified user"

#### Scenario: registry shelter

- **WHEN** a shelter came from the Paasteamet registry
- **THEN** its row and detail page show "Paasteamet registry"
