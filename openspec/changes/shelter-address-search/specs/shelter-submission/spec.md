## ADDED Requirements

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
