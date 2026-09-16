# Tasks: shelter-bbox-paging

Next free Flyway version: **V23.1** — verified against the repo, not
assumed: `ls src/main/resources/db/migration | sort -V | tail` ends at
`V23__crisis_guidance.sql`. The new migration takes the dotted
`V23.1__shelter_bbox_index.sql` (Flyway-native): it applies after V23,
and the README range guard (`DocumentationFactsTest` — README.md is
owned by the docs lane, out of scope here) tracks integer `V<N>`
versions, so the README's "V1–V23" range stays true until the docs
sync bumps it. (A plain `V24` would fail that guard without a README
edit this change is not allowed to make.)

Baseline gate (before touching code): `flock /tmp/openshelter-mvn.lock
mvn clean test` — the suite is green before the change (791 tests /
0 failures / 0 errors).

## Phase 1 — Migration (D3)

- [x] `V23.1__shelter_bbox_index.sql`: `CREATE INDEX
      idx_shelters_latitude_longitude ON shelters (latitude, longitude)`
      with the repo's header comment (what it backs, WHY no PostGIS, the
      scale caveat) — index-only, so `ddl-auto=validate` is unaffected

## Phase 2 — Query path (D2)

- [x] `domain/BoundingBox.java`: self-validating record
      (`minLat, minLng, maxLat, maxLng` — finite, WGS84 ranges,
      `min ≤ max`) + the inclusive `contains(lat, lng)` predicate
- [x] `app/ShelterRepository`: `findAllActiveBySourceInWithin(sources,
      bbox)` — the ACTIVE-only, bbox-scoped, id-ascending projection; the
      existing method untouched
- [x] `persistence/SpringDataShelterRepository`: derived query
      `findAllBySourceInAndStatusAndLatitudeBetweenAndLongitudeBetweenOrderByIdAsc`
      (inclusive BETWEEN, stable id order); `persistence/
      JpaShelterRepository`: the port implementation
- [x] `app/InMemoryShelterRepository` (the hand-written test fake):
      implement the new method with the same inclusive predicate and
      id-ascending order — no Mockito, per the repo convention

## Phase 3 — Service (D2)

- [x] `ShelterQueryService.MAX_PAGE_SIZE = 200`
- [x] `findAll(source, hasCapacity, provenance, bbox, limit, offset)`:
      SQL (status / source / bbox, id ASC) → batched DTO mapping →
      in-memory trust filters → offset/limit slice LAST
- [x] The 3-arg `findAll` stays a delegating overload (no bbox, no
      paging) — existing callers and unit tests compile and pass
      unchanged
- [x] The slice helper: nulls = "no paging", an offset past the end =
      empty list, never an error

## Phase 4 — Controller + OpenAPI (D1, D4)

- [x] `ShelterController.list`: the six optional `@RequestParam`s with
      `@Parameter` descriptions; the `@Operation` description gains the
      viewport/paging sentence; the operation declares its 400 response
- [x] Validation: partial box / non-finite / out-of-range / inverted
      box / `limit` outside 1…200 / negative `offset` →
      `InvalidShelterException` (the existing 400 mapping — the same
      vocabulary as the POST/PUT Estonia bbox gate); non-numeric values
      stay on Spring binding's 400
- [x] The class javadoc's "Deferred" paragraph updated: bbox + paging
      ARE built now; nearest search stays client-side (the honest
      remainder)

## Phase 5 — Tests (behaviour, not just wiring)

- [x] `ShelterBboxPagingIT` (Testcontainers Postgres, MockMvc, the
      `ShelterApiIT` style): omitted parameters answer the full list in
      id order (backward compatibility, asserted byte-identical against
      the parameterless call); the bbox keeps inside + on-edge rows and
      excludes outside rows (the boundary cases); `limit=3` pages over
      seven rows tile without overlap or skips and a repeated page is
      deterministic; offset past the end = 200 `[]`; the bbox combines
      with `source` and `hasCapacity` (filter-before-page asserted);
      every 400 case carries the uniform error body
- [x] `ShelterQueryServiceTest`: unit coverage of the new overload — the
      bbox predicate over the fake, the slice (limit truncation, offset
      past the end, filter-before-slice), and the 3-arg delegate
- [x] `flock /tmp/openshelter-mvn.lock mvn clean test` — the whole suite
      green on top of the 791-test baseline; no existing test weakened

## Phase 6 — Snapshot + validation

- [x] Regenerate `docs/api/openapi.json` the sanctioned way
      (`flock /tmp/openshelter-mvn.lock mvn -Dopenapi.update=true
      -Dtest=OpenApiSnapshotIT test`) and let the snapshot gate pass
- [x] `openspec validate --all` green (no previously-valid change
      regressed)
