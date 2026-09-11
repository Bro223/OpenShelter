# Tasks — shelter-location-input

## Frontend (one child)

- [x] `shared/location-input.ts`: `parseLocationInput` + `ParseLocationResult`
      (`{latitude, longitude, swapped?}` | `{reason: 'no-pair'|'out-of-bounds'|'invalid', detail?}`),
      Estonia bbox constants (mirror GeoPoint: 57.5–59.7 / 21.5–28.2),
      URL pattern extraction (Google q/ll/daddr/saddr, !3d/!4d, /@lat,lng,
      Apple ll=, Bing q=, generic decimal-pair fallback), DMS parsing,
      label stripping (lat:/lng:), order auto-swap
- [x] `shared/location-input.spec.ts`: ≥30 cases (every pattern, DMS,
      separators, labels, swap, out-of-bounds, garbage, empty)
- [x] `gateways/geo-gateway.ts` (+spec): `resolve(url): Promise<{latitude, longitude}>`
      → `POST /api/geo/resolve`, error via `ApiError`
- [x] `core/models.ts`: `LocationResolved { latitude, longitude }` (match
      backend field names exactly)
- [x] `submit-shelter-page.*`: location section rework — smart input +
      "Resolve" affordance (Enter key works), "Use my location" button,
      existing mini-map kept, read-only coordinates display, source hint
      (incl. swapped hint + geolocation accuracy hint), per-reason inline
      errors, all modes writing one location signal; manual lat/lng text
      inputs removed (replaced by the smart input); submit() unchanged in
      payload shape
- [x] geolocation: `navigator.geolocation.getCurrentPosition`
      (enableHighAccuracy, timeout 10000, maximumAge 0), error-code →
      message map (denied / unavailable / timeout / insecure context)
- [x] short-link detection (`maps.app.goo.gl`) routes through
      `geo-gateway.resolve()` with a pending state on the button
- [x] page spec updates: new capture modes, swap hint, error mapping,
      geolocation mock (vi.stubGlobal), short-link path mock
- [x] docs sync: `frontend/docs/agent/02-CONTEXT-API.md` (+ endpoint row +
      TS mirror), `06-CONTEXT-SHELTER.md` (location section reality),
      submission-flow puml if it exists (re-render via
      `frontend/docs/render.sh`), root README API table (+1 row)

## Backend (one child, parallel)

- [x] `api/LocationResolveRequest.java` (record, `@Size(max=2048) url`,
      must parse as http/https URL) + `api/LocationResolvedDto.java`
      (`latitude`, `longitude` — match FE model)
- [x] `app/MapsUrlCoordinates.java` — URL → pair extraction (same pattern
      list as FE; bbox via `GeoPoint.inEstonia`; same auto-swap rule)
- [x] `app/LocationResolveService.java` — host whitelist
      (`maps.app.goo.gl`), ≤3 redirect hops, 3 s/5 s timeouts, no
      cookies, UA `OpenShelter/1.0 (location resolver)`; result types:
      resolved / not-found (400 generic) / upstream-failure (502 generic)
- [x] `api/LocationController.java` — `POST /api/geo/resolve`, JWT
      (inside the existing authenticated set — verify SecurityConfig and
      add to it, NOT permitAll), status mapping
- [x] SecurityConfig: per-IP token bucket 5/60s for `/api/geo/resolve`
      (pattern of the existing buckets; property in application.yml)
- [x] tests: `MapsUrlCoordinatesTest` (same fixture table as the FE spec
      — copy the cases), `LocationResolveServiceTest` (whitelist, hop cap,
      timeout → 502, no-pair → 400 generic, outside bbox → 400 generic,
      swap), `LocationResolveIT` (401 unauthenticated, 200 with a stubbed
      upstream or mocked client, 429 after 6 calls)
- [x] docs sync: `context-and-tasks/agent/06-CONTEXT-API.md` (+ endpoint),
      `context-and-tasks/agent/01-TASK.md` layout note if the new package
      placement changes the table, root README API table (+1 row),
      `03-auth.puml` permitAll/limits note ONLY if the limiter set changed
      (it does — new bucket; re-render via the repo render script)

## Gates (orchestrator runs, not children)

- [x] `mvn -q test` · `cd frontend && npx ng test --watch=false` · both
      `tsc --noEmit` configs · prettier on touched files
      — GATE PASSED (commit 8686b99: "321 backend (was 302), 498 frontend
      (was 423), tsc clean (app+spec), prettier clean"); backend re-counted
      2026-09-11 pre-fix-wave from a surefire run: 321 green, 0 failures
- [x] live E2E: backend up (dev profile), submit page — paste coordinate
      string, paste Google long link, use-my-location, map drag, bad
      input; short link only if the user provides a real one (else unit
      coverage stands)
      — live check recorded in commit 8686b99 ("backend restarted,
      /api/geo/resolve 401-unauthenticated verified"); the interactive
      capture paths stand on the page-spec coverage (no real short link
      was provided)
