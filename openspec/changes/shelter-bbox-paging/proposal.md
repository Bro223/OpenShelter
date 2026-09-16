# Change: shelter-bbox-paging

## Why

`GET /api/shelters` filters by `source` / `hasCapacity` / `provenance` but
returns the WHOLE ACTIVE list, so the map page loads every shelter into
the browser and filters client-side. The controller's javadoc records this
as a deliberate deferral ("nearest/bbox queries need GeoService + PostGIS
GIST index; paging (limit/offset) — Estonia-scale data is small. TODO: add
when it grows."). The "when" has arrived: the frontend needs to ask for
only what the current map viewport shows, and to page through the list in
stable chunks. This is the one genuinely unbuilt backend capability —
built here, minimally and backward compatibly: two new OPTIONAL parameter
groups on the existing endpoint. No new endpoints, no new response shape,
no dependencies, no database extensions.

## What Changes

- **Viewport filter** on `GET /api/shelters`: four optional query
  parameters — `minLat`, `minLng`, `maxLat`, `maxLng` — that keep the rows
  whose coordinates fall inside the box, **inclusive** of the edges (a row
  exactly on an edge is returned). The box is all-or-nothing: a request
  carrying any one edge must carry all four (a partial box is a 400). The
  edges are validated as finite WGS84 coordinates (latitude −90…90,
  longitude −180…180, `minLat ≤ maxLat`, `minLng ≤ maxLng`); a partial,
  non-finite, out-of-range or inverted box answers **400 with the API's
  uniform error body** — the same 400 vocabulary the POST/PUT Estonia
  bbox check already uses on this endpoint.
- **Paging**: optional `limit` (1…200) and `offset` (≥ 0). The page is cut
  from the list's EXISTING stable id-ascending order — the order is total
  (ids are unique), so paging over it is deterministic: repeating a page
  request returns the same page, and consecutive `limit`-sized steps tile
  the list without overlap or skipped rows. The existing filters
  (`source`, `hasCapacity`, `provenance`) apply BEFORE the slice, so a
  page never contains a row a filter would drop. An `offset` past the end
  answers 200 with `[]`, not an error.
- **Backward compatible by construction**: omitting all six parameters
  answers the exact same query, order and body as today — the no-viewport
  repository query is untouched, and no existing caller or test changes.
  The response remains a bare JSON array (no envelope, no total count).
- **An index, not an extension** (design decision D3): no PostGIS, no
  spatial extension, no GeoService. A plain composite B-tree index on
  `shelters (latitude, longitude)` added by the Flyway migration
  `V23.1__shelter_bbox_index.sql` (dotted version — it applies after
  V23 and keeps the README range guard green while README.md itself
  stays with the docs lane), plus the bounding-box range predicate, is
  enough at Estonia scale (a few hundred rows), and the deployment stays
  single-database with no extensions. `design.md` records the trade-off
  honestly — including what would change at a much larger scale (GIST /
  geohash, keyset paging) — and notes that "nearest shelter" search stays
  client-side by design (the map ranks the loaded list).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `map-browse`: the list-endpoint contract (`GET /api/shelters`) gains the
  optional viewport and paging parameters. The map page's own consumption
  of them (viewport tracking, incremental paging) is a follow-up frontend
  change — this change is backend-only and deliberately does not touch
  `frontend/**`.

## Impact

- Affected specs: `map-browse` (one ADDED requirement for the endpoint
  contract).
- Affected code — backend: `V23.1__shelter_bbox_index.sql` (index-only —
  `ddl-auto=validate` unaffected); new `domain/BoundingBox.java`
  (self-validating record); `app/ShelterRepository` +
  `persistence/JpaShelterRepository` + `persistence/SpringDataShelterRepository`
  (one new derived query — the existing list query stays untouched, so the
  no-viewport path executes exactly today's SQL); `api/ShelterQueryService`
  (a new `findAll` overload + the deterministic slice; the 3-arg method
  stays a delegating overload); `api/ShelterController` (the six
  parameters + validation, reusing `InvalidShelterException` → the
  existing 400 mapping — no new exception class, no `ApiErrorHandler`
  change).
- Affected code — tests: new `api/ShelterBboxPagingIT` (Testcontainers
  Postgres, MockMvc, hand-written seeding — no Mockito); new unit tests in
  `api/ShelterQueryServiceTest`; the new port method implemented in
  `app/InMemoryShelterRepository`.
- Docs sync: `docs/api/openapi.json` regenerated the repo's sanctioned way
  (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`), kept green
  by the snapshot gate.
- No config changes, no new dependencies, no frontend changes, no
  breaking API change: every route and response shape is unchanged, and
  every new parameter is optional.
