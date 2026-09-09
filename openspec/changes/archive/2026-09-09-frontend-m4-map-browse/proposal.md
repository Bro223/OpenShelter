## Why

M4 is the product's heart: the public shelter map. Today `/map` is an M2 placeholder page; users
cannot browse shelters at all. This milestone ships the read-only browse experience (map + sidebar
list + source filter) on top of the already-complete backend (`GET /api/shelters`, green 216 tests).

## What Changes

- Add `leaflet` (+ types) as a dependency of `frontend/`.
- New `ShelterGateway` (`gateways/`) with `list(source)` and `get(id)` hitting the public read API.
- New `LeafletService` (`features/map/`): thin, direct wrapper around leaflet — owns one map
  instance per page (`create`, `renderShelters`, `destroy`, marker click events). No ngx-leaflet.
- Replace the `MapPage` placeholder with a real map: leaflet map + sidebar list of shelters,
  All/Registry/User source-filter chips (server-side `?source=` refetch), legend, loading/empty/
  error states, marker↔row selection sync.
- `/shelters/:id` navigation from markers/list rows lands on an M5 placeholder (route stub only).

## Capabilities

### New Capabilities

- `map-browse`: the public, read-only shelter map — loading shelters from the API, rendering them
  on a leaflet map and in a sidebar list, filtering by source, and handling loading/empty/error
  states without requiring authentication.

### Modified Capabilities

## Impact

- `frontend/package.json` — adds `leaflet` + `@types/leaflet`; `src/styles.scss` or component
  styles import `leaflet/dist/leaflet.css`.
- `frontend/src/app/core/models.ts` — already defines `ShelterDto`, `ShelterSource`,
  `ShelterSourceFilter`, `ShelterStatus` (no change expected).
- `frontend/src/app/core/api-client.ts` — reused as-is for typed GETs.
- New files: `src/app/gateways/shelter-gateway.ts` (+ spec), `src/app/features/map/leaflet-service.ts`
  (+ spec), rewritten `src/app/features/map/map-page.{ts,html,scss}` (+ spec), marker icon/legend
  helpers, M5 route stub.
- `src/app/app.routes.ts` — `/map` stays public/default; add `/shelters/:id` placeholder route.
- No backend changes. No auth changes. Detail pages + submission + reviews are M5 (out of scope).
