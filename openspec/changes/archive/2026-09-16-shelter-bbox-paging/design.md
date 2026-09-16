# Design: shelter-bbox-paging

## Context

The controller's javadoc records the deferral this change resolves:
"Deferred (06-CONTEXT-API.md decision 2, deliberately NOT built):
nearest/bbox queries need GeoService + PostGIS GIST index; paging
(limit/offset) — Estonia-scale data is small. TODO: add when it grows."
The "when" has arrived: the map wants viewport-scoped reads.

What already exists and this change leans on:

- **The list query** (`ShelterQueryService.findAll` →
  `ShelterRepository.findAllActiveBySourceIn`): ACTIVE-only, source-set
  filter, `ORDER BY id ASC` — the stable order chosen deliberately
  (B7a) so that two requests for the same thing return the same order.
- **The in-memory trust filters** (`hasCapacity`, `provenance`), applied
  over the projected DTO list — the documented Estonia-scale precedent.
- **The 400 vocabulary**: `InvalidShelterException` → the uniform
  `ErrorResponse` (already used for the POST/PUT Estonia bbox gate on the
  same controller), and Spring binding's 400 ("Malformed request") for
  non-numeric / out-of-enum values.
- **The conventions**: Flyway + `ddl-auto=validate`, derived Spring Data
  queries, hand-rolled in-memory fakes for unit tests, Testcontainers
  Postgres for the ITs, and `OpenApiSnapshotIT` pinning the committed
  `docs/api/openapi.json`.

## D1 — Parameters: all optional, bbox all-or-nothing, 400 on bad values

| Parameter | Type | Rules | Failure |
| --- | --- | --- | --- |
| `minLat` `minLng` `maxLat` `maxLng` | double | all four together or none; finite; latitude in −90…90, longitude in −180…180; `minLat ≤ maxLat`, `minLng ≤ maxLng` | 400, uniform body |
| `limit` | int | 1…200 (`ShelterQueryService.MAX_PAGE_SIZE`) | 400, uniform body |
| `offset` | int | ≥ 0 (no upper bound — past the end is an empty page) | 400, uniform body |

- **Partial box = 400.** A box is a rectangle; any subset of its four
  edges has no unambiguous meaning (which open side is unbounded?).
  All-or-nothing is the only contract a client cannot misread.
- **Inclusive edges.** The predicate is `minLat ≤ lat ≤ maxLat AND
  minLng ≤ lng ≤ maxLng` — SQL `BETWEEN` semantics, so a shelter exactly
  on an edge IS returned. Inclusive is the only choice under which a row
  sitting exactly on the viewport boundary is visible at all; the
  alternative (half-open) would silently drop it from one of two
  adjacent viewports, while a seam overlap costs the map nothing (it
  re-queries the viewport).
- **NaN / Infinity are rejected explicitly.** Spring binds the literal
  string `NaN` to `Double.NaN`, and every comparison against NaN is
  false — a range check alone would let it through and the SQL would
  answer an empty list that reads as "no shelters". Validation
  therefore requires `Double.isFinite` on all four edges.
- **Validation lives in the controller** (the thin-shell convention —
  parse, validate, delegate, map) and throws `InvalidShelterException`,
  the existing 400 mapping for the coordinate gate on the same endpoint.
  No new exception class, no `ApiErrorHandler` change. Non-numeric
  values never reach it: Spring binding already answers 400
  ("Malformed request") — exactly how the `source` / `provenance` enum
  parameters fail today.
- **`BoundingBox` is a self-validating domain record** (the compact
  constructor re-checks the four rules), so no future internal caller can
  build an inverted or out-of-range box. The friendly 400 messages come
  from the controller's earlier checks; the record's `IllegalArgumentException`
  is the defense in depth.

## D2 — Query path: bbox in SQL, trust filters in memory, slice LAST

```
SQL:      status = ACTIVE AND source IN (…) [AND lat/lng BETWEEN …]
          ORDER BY id ASC                      ← the stable order, unchanged
map:      batched DTO mapping (no N+1)         ← over exactly the SQL set
filter:   hasCapacity / provenance             ← in-memory, unchanged precedent
slice:    [offset, offset + limit)             ← LAST, over the filtered list
```

- **The bbox predicate runs in SQL.** A second port method
  (`findAllActiveBySourceInWithin`) backed by a derived query
  (`...AndLatitudeBetweenAndLongitudeBetweenOrderByIdAsc`); the existing
  method stays untouched, so a request without a viewport executes
  exactly today's SQL — backward compatibility is a property of the code,
  not of the tests.
- **`limit` / `offset` are applied in memory, after the trust filters.**
  Two honest reasons. (a) `provenance` is server-derived from the
  report-count batch — pushing "filters + LIMIT" into one SQL statement
  would mean a join this repo does not have, or a second SQL path with
  divergent semantics. (b) Estonia scale: the ACTIVE list is a few
  hundred rows, so the slice's cost is noise — while the two things that
  actually shrink DO shrink: the SQL read is bbox-scoped, and the
  response is limit-bounded.
- **Filter-before-slice is a correctness requirement, not a style
  choice.** A page must not contain a row the active filters would drop
  (that would make pages lie about the filtered list), and "page N of the
  filtered list" is the only semantics a client can reason about.
- **Paging without a stable order is meaningless** — which is why the
  slice runs over the `ORDER BY id ASC` answer and nowhere else. The id
  is unique, so the order is total: there is no tie-break to invent, and
  an offset/limit step over it (here a `subList` over the same order) is
  deterministic — the same request twice returns the same page, and
  `limit`-sized steps at `offset = 0, limit, 2·limit, …` tile the whole
  list without overlap or skipped rows (asserted by the IT).
- **The caveat, stated honestly:** offset paging is a snapshot per
  request. If a shelter is inserted between two page fetches, rows shift
  and the client may see a duplicate or a gap. That is the standard
  offset-paging property; for the map use case (re-query the viewport, do
  not cursor through it) it is acceptable, and the stable-order guarantee
  is what keeps the worst case bounded.

## D3 — No PostGIS: a B-tree on (latitude, longitude)

**Decision: no spatial extension, no GeoService, no nearest-search
endpoint.**

- **The scale argument.** The dataset is Estonia's public shelter
  register: a few hundred rows. A bbox predicate over that set is
  microseconds with or without an index. The cost of PostGIS is not
  query time — it is deployment surface: the extension must be created
  and allowed on the database, every environment (including the
  Testcontainers IT database) must enable it, and the schema must speak a
  geometry type — in exchange for nothing the scale requires.
- **What the migration adds.** `V23.1__shelter_bbox_index.sql` creates
  `idx_shelters_latitude_longitude ON shelters (latitude, longitude)` —
  a plain composite B-tree. The bbox read is a 2-D range; a composite
  B-tree prunes on the first column and filters on the second, which is
  the right trade at this scale (a sequential scan of a few hundred rows
  would also do — the index is cheap insurance, not a requirement).
  Index-only: no column change, `ddl-auto=validate` unaffected.
- **Why a dotted version (`V23.1`, not `V24`)** — recorded for honesty:
  `DocumentationFactsTest` pins the README's "`V1`–`V23`" range to the
  highest *integer* `V<N>` migration in the tree, and this change is not
  allowed to edit `README.md` (the docs lane owns it). A dotted version
  is native Flyway: it applies after `V23`, keeps the guard green, and
  the README range stays literally true until the docs sync bumps it.
  A plain `V24` would have failed the guard without a README edit.
- **What would change at a much larger scale** (recorded, not built):
  at tens of thousands of rows and up, the 2-D B-tree degrades (the
  longitude leg stops pruning) — the honest upgrades are PostGIS with a
  GIST index on a `geometry` column, or a geohash / quadtree column to
  keep a 1-D B-tree useful; offset paging itself gives way to keyset
  (cursor) paging over `(id)`; and the in-memory trust filters move into
  SQL (a provenance join). None of it is triggered today, and all of it
  is additive — the D1 parameter contract does not change for any of it.
- **"Nearest" stays client-side by design.** The map's "shelters around
  you" action ranks the already-loaded list by straight-line distance
  (the `map-browse` spec: "The action SHALL NOT add a backend call"). A
  server-side nearest endpoint is a different feature (ranking, not
  filtering) and needs the spatial machinery above; it stays deferred,
  and the controller's javadoc says so.

## D4 — API surface and the OpenAPI snapshot

- The six parameters are `@RequestParam(required = false)` with
  `@Parameter` descriptions; the operation's `@Operation` description
  gains the viewport/paging sentence, and the operation declares its 400
  response explicitly (the repo's style for operations with a specific
  validation failure — see `POST /api/shelters`).
- The committed `docs/api/openapi.json` is regenerated with the ONE
  sanctioned command (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT
  test`) — the snapshot IT pins the document, so regeneration is the only
  path that keeps doc and controllers in agreement.
- The response shape is unchanged: a bare `ShelterDto` array. No
  envelope, no `total`, no page metadata — a client that wants everything
  pages until it receives a short page, and adding `total` later is a
  deliberate response-shape change, not a parameter.

## Consequences

- **Backward compatible**: all six parameters omitted ⇒ the same SQL, the
  same order, the same body as before the change (the no-viewport port
  method is untouched; the 3-arg `findAll` stays a delegating overload,
  so existing callers and unit tests compile and pass unchanged).
- **Pages are deterministic over a static dataset**; over a concurrently
  mutating one they carry the standard offset-paging caveat (D2).
- **The response stays an array**, so no existing caller can break on
  shape; the only new behaviour a caller can opt into is a smaller,
  faster, viewport-scoped answer.
- **The 400 vocabulary grows by a few messages** (partial box, non-finite
  coordinate, out-of-range coordinate, inverted box, `limit`/`offset`
  bounds) — all on the existing `InvalidShelterException` → uniform
  `ErrorResponse` path; no handler change.
- **Deliberately out of scope** (each a follow-up, none blocks this):
  the map page's UI consumption of the parameters (viewport tracking,
  incremental paging); a nearest / GeoService endpoint; PostGIS and
  keyset paging at scale; a `total` / page-metadata envelope.
