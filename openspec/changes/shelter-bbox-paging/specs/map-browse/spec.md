# Spec Delta: map-browse (shelter-bbox-paging)

## ADDED Requirements

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
