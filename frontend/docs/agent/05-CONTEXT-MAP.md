# Context — Map & Browse (M4)

**Source diagrams:** `01-frontend-architecture.puml` (`MapPage`, `LeafletService`,
`ShelterGateway`, `/map` route), `04-map-browse-flow.puml` (sequence).
**Used by:** M4.

## Purpose

The heart of the product: a **public, read-only map** of Estonia with every shelter
(registry + user-submitted), a sidebar list, and a source filter. No login required. Detail pages
and submission come in M5 — this milestone keeps the map read-only.

## Classes to create

| Type             | Kind                                                                                                       | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterGateway` | service (`gateways/`)                                                                                      | `list(source: ShelterSourceFilter): ShelterDto[]` → `GET /api/shelters?source=…`; `get(id)` → `GET /api/shelters/{id}` (used by M5 too).                                                                                                                                                                                                                                                                                                                                                                          |
| `LeafletService` | service (`shared/` — moved there from `features/map/` in the 2026-09-08 arch pass; it has no feature deps) | thin wrapper around the `leaflet` npm package. Owns one map instance per page: `create(el, center, zoom)`, `renderShelters(ShelterDto[])` (replaces markers), `setFilter`, `flyTo(lat, lng, zoom?)` (keeps the current zoom unless `zoom` is given), `showShelter(shelter \| null)` (single static pin — the detail page's Location map), `destroy()`. Exposes a `markerClick` callback/event. **No ngx-leaflet** — the wrapper stays ~1 release behind Angular majors, we call leaflet directly.                 |
| `MapPage`        | component (route `/map`, public, default route)                                                            | Layout: Leaflet map + sidebar list. Loads `ShelterGateway.list('ALL')` on init; source filter chips (All / Registry / User) refetch with the server-side `source` param. Renders markers with distinct icons per source. Empty state + network-error banner (see M1 error rules). Clicking a marker or list row → select + zoom the map to street level (`SHELTER_ZOOM` 16) and **stay on /map**; the selected row shows a "View details" link that navigates to `/shelters/{id}` (the explicit navigation step). |

## Key decisions

1. **Server-side filtering, not client-side.** The backend supports `?source=ALL|REGISTRY|USER`;
   always refetch on filter change. Keeps the UI dumb and the data honest.
2. **Estonia-scale fetch-all.** The backend has no paging by design (hundreds of rows). Load once,
   replace markers on filter change — no clustering lib needed at this scale (revisit if >5k).
3. **Leaflet directly.** `npm i leaflet` (+ its types). CSS: import `leaflet/dist/leaflet.css`.
   Marker icons: fix the classic icon-asset path issue (Leaflet's default icons break under
   bundlers — set `L.Icon.Default` paths or use `L.divIcon`). Use `divIcon` markers colored by
   source (REGISTRY = blue, USER = green) — avoids the asset pitfall entirely and looks clean.
4. **Map hygiene.** Destroy the map instance in `ngOnDestroy` (zoneless Angular has no
   change-detection crutch to hide leaks). Don't fight zoneless: leaflet is DOM-event driven, so
   its callbacks work fine; just update signals inside `ngZone`-free handlers.
5. **Registry vs USER distinction is visible.** A small legend explains: blue = Päästeamet /
   municipality registry, green = user-submitted. (No moderator — user rows are trusted into the
   map and governed by reviews from M5.)
6. **Status filtering is a backend concern** — v1 lists ACTIVE rows; do not add status UI.

## UI details

- Sidebar: name + address + source badge + rating (averageRating null → "no ratings yet").
  Sorting: by name (stable) — nearest-by-location is a documented deferral.
- Map bounds: Estonia (~lat 57.5–59.7, lng 21.5–28.2 — `GeoPoint` bbox constants; default view centered ~(58.6, 25.0) zoom 7).
- Selection sync: clicking a list row OR a marker selects the shelter, zooms the
  map to street level (`SHELTER_ZOOM` = 16) and stays on /map — the zoom is the
  payoff of the click, not a navigation. The selected row grows a "View
  details" link: the only sidebar element that navigates to `/shelters/{id}`.
  The detail page itself shows a small static Location map of the shelter.
- Loading state while fetching; error banner if the backend is down (still show the page chrome).

## Contracts with other contexts

- M1 `ApiError`/banner conventions apply to the error state.
- M5 adds the detail route (`/shelters/:id`) — reached via the selected row's
  "View details" link (the detail page shows a static Location map of the
  shelter) — plus the
  "+ Add shelter" entry (visible to verified users only) — M4 can leave a disabled tooltip stub
  or hide it.
- Models: `ShelterDto` from `02-CONTEXT-API.md` — `averageRating: number | null`, `source`,
  `status`, `description`/`capacity` nullable.
