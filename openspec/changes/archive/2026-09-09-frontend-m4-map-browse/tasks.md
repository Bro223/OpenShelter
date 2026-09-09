## 1. Dependency & scaffold

- [x] 1.1 Add `leaflet` and `@types/leaflet` to `frontend/package.json` and run `npm install`; verify `leaflet/dist/leaflet.css` resolves on disk
- [x] 1.2 Import `leaflet/dist/leaflet.css` in `frontend/src/styles.scss`; verify `npx ng test` still boots (no import error)

## 2. Shelter gateway

- [x] 2.1 Implement `ShelterGateway` (`src/app/gateways/shelter-gateway.ts`) with `list(source: ShelterSourceFilter): Promise<ShelterDto[]>` → `GET /api/shelters?source=…` and `get(id: number): Promise<ShelterDto>` → `GET /api/shelters/{id}` using the existing `ApiClient`; verify it type-checks and follows the `AuthGateway` pattern
- [x] 2.2 Add `shelter-gateway.spec.ts` with hand-written `ApiClient` fakes: `list` sends the right query param and returns typed rows; `get` returns one row; non-2xx rejects with `ApiError`; verify the spec passes

## 3. Leaflet service

- [x] 3.1 Implement `LeafletService` (`src/app/features/map/leaflet-service.ts`): `create(el, center, zoom)` builds one `L.Map`; `renderShelters(ShelterDto[])` clears a marker layer group and adds `divIcon` markers (REGISTRY=blue, USER=green); expose `flyTo(lat,lng)`, `destroy()` (removes map + listeners), and a `markerClick` callback; verify it type-checks
- [x] 3.2 Add `leaflet-service.spec.ts` (jsdom/fake leaflet): marker count/colors follow input rows, `renderShelters` replaces (not duplicates) markers, `destroy` cleans up, marker click invokes the callback; verify the spec passes

## 4. Map page

- [x] 4.1 Rewrite `MapPage` (`src/app/features/map/map-page.ts` + html + scss): init `LeafletService`, load `ShelterGateway.list('ALL')` into a signal, sidebar rows (name, address-if-present, source badge, "no ratings yet" when null), source-filter chips (All/Registry/User) that refetch with the server-side param, loading/empty/error states via `BannerComponent`, marker↔row selection sync, refetch serialized against out-of-order responses; verify it type-checks
- [x] 4.2 Destroy the map in `ngOnDestroy` and guard against null container; verify with a component test that navigating away/back renders a fresh map without stale markers
- [x] 4.3 Add `map-page.spec.ts` with a mocked gateway: rows render as markers + list rows, filter chip refetch passes the right source, empty result shows empty state, gateway rejection shows the error banner with chrome intact, row click flies the map and marker click selects the row; verify the spec passes

## 5. Routing & legend

- [x] 5.1 Add the `/shelters/:id` placeholder route stub in `app.routes.ts` (public, "coming in M5" content); verify `RouterLink` from marker/row clicks reaches it
- [x] 5.2 Add a legend (registry vs user marker meaning) tied to the marker CSS classes; verify it renders on the map page and a manual `npm start` check shows the live backend shelter set with distinct markers, filters refetching, and empty/error states intact

## 6. Milestone acceptance

- [x] 6.1 Run `npx ng test` green across the suite (existing M1–M3 specs + new ones) and confirm no TypeScript errors (`ng build` type-check passes)
