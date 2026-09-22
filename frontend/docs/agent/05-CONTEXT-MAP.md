# Context — Map & Browse (M4)

**Source diagrams:** `01-frontend-architecture.puml` (`MapPage`, `LeafletService`,
`ShelterGateway`, `/map` route), `04-map-browse-flow.puml` (sequence).
**Used by:** M4.

## Purpose

The heart of the product: a **public, read-only map** of Estonia with every ACTIVE shelter
(registry + user-submitted), a sidebar list, and the source filter. No login required. Detail
pages and submission come in M5 — this milestone keeps the map read-only. (shelter-trust-and-
reports: auto-hidden shelters are simply absent from the public list — the backend lists
ACTIVE rows only — and the map gains the trust filters, the reported marker and the row
trust badges, all documented below.)

## Classes to create

| Type             | Kind                                                                                                       | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterGateway` | service (`gateways/`)                                                                                      | `list(source: ShelterSourceFilter, trust?: ShelterTrustFilter): ShelterDto[]` → `GET /api/shelters?source=…` (`ALL` \| `REGISTRY` \| `USER`, server-side; the FE ships the three source chips and does NOT wire the backend's `?provenance=` taxonomy filter) + the optional `hasCapacity` trust filter — absent fields are omitted from the query string entirely; `get(id)` → `GET /api/shelters/{id}` → `ShelterDetailDto` (the list DTO + `yourOccupancyBand`; used by M5 too). Every row also carries `reportCount` + `lastVerifiedAt` (**M8, entry-verification-meta**: the total community-report count and the server-derived verification stamp — registry rows: newest OK/NOT_MODIFIED import of their source; community rows: newest non-submitter OPEN_CONFIRMED check or confirming moderation action; null = never verified).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `LeafletService` | service (`shared/` — moved there from `features/map/` in the 2026-09-08 arch pass; it has no feature deps) | thin wrapper around the `leaflet` npm package. Owns one map instance per page: `create(el, center, zoom)`, `renderShelters(ShelterDto[])` (replaces markers), `setFilter`, `flyTo(lat, lng, zoom?)` (keeps the current zoom unless `zoom` is given), `showShelter(shelter \| null)` (single static pin — the detail page's Location map), `destroy()`. Exposes a `markerClick` callback/event. **No ngx-leaflet** — the wrapper stays ~1 release behind Angular majors, we call leaflet directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `MapPage`        | component (route `/map`, public, default route)                                                            | Layout: Leaflet map + sidebar list. Loads `ShelterGateway.list('ALL')` on init; **the three source chips (All / Registry / User — `map.filter.*` keys)** refetch with the server-side `source` param. Trust filters (shelter-trust-and-reports D6) below the source chips, composing with them — every change is the same SERVER refetch + list rebuild, never client-side filtering: a `Open` toggle chip (CLIENT-SIDE — the backend has no open/closed param) and a `Has capacity` toggle chip (`hasCapacity=true`) — no rating control of any kind (the rating model was removed with V21: no star summary, no `minRating`). Renders markers toned by `markerTone()` (`shared/leaflet-service.ts`: registry rows blue, community rows one unified yellow tone (`--color-new` == `--color-verified`, one value per theme) with the submitter's verification depth carried by marker SHAPE — a triangle at exactly one confirmed channel, a circle at two or more — when the API reports it; NEW is not a marker tone, the "Newly added" badge says NEW, never the pin); the reported state (D1, W2-B: either open report kind) OVERRIDES the trust colour — any shelter with an open report of either kind (`nonexistentReports` or `inaccurateReports` > 0) gets the single orange marker (`--color-reported`); the legend renders the six shipped entries (Registry / Confirmed by community (the community tone) / Added by a partially verified user (triangle) / Added by a fully verified user (circle) / Reported / Searched address) — the five shelter-tone entries are the pin-tone FILTER (wave 7: toggle buttons, `?tones=` URL state, display-only — see decision 5; the searched-address entry is the browse reference point, not a tone, and stays inert). Row badges (single-sourced in `shared/shelter-copy.ts`): the source/trust badge (`sourceTrustLabel` + `communityBadgeClass` — registry rows name their registry, USER rows their trust state, never re-derived), the "Reported (n)" badge (`reportedBadgeText`: n = the open trust-report total — `nonexistentReports` + `inaccurateReports`, the same OR that drives the marker), `openStatusBadgeText` ("Reported closed" / "Closed") and `occupancyText` (firm or hedged band + recency) — rendered only when the DTO carries the state, never client-derived. Clicking a marker or list row → select + zoom the map to street level (`SHELTER_ZOOM` 16) and **stay on /map**; the selected row shows a "View details" link that navigates to `/shelters/{id}` (the explicit navigation step). **Address-search anchor (location-navigation M12)** — the browse fallback for the geolocation CTA: an input + "Search" button (Enter submits) below the consent note reuses the `GeocodeGateway` (the /submit address search's gateway + usage-policy contract: no autosuggest, 1 req/s, attribution always rendered); selecting a result (≤5, display name + type) drops a fixed, non-interactive anchor pin (`LeafletService.setAnchor` — its own marker field, never the shelter layer), flies to the point at neighbourhood zoom 14, renders each row's straight-line distance from the point (`straightLineText` honesty format, shared from `shared/shelter-copy.ts`) and sorts the list by that distance (name tiebreak) — Clear removes the pin + distances and restores the stable name sort. The list scrolls freely — deliberately NO scroll-snap (proximity snap made Chrome swallow fast wheel input; the mandatory one-row carousel was rejected; full measured rationale in `map-page.scss`). |

## Key decisions

1. **Server-side filtering, not client-side.** The source chips refetch through
   `?source=ALL|REGISTRY|USER` and `Has capacity` through `?hasCapacity=true` (composable);
   always refetch on any filter change. Keeps the UI dumb and the data honest. (The backend's
   `?provenance=` taxonomy filter is deliberately NOT wired in the FE — the source chips are the
   shipped taxonomy. `Open` is the one client-side chip: the BE has no open/closed param.)
2. **Estonia-scale fetch-all.** The backend has no paging by design (hundreds of rows). Load once,
   replace markers on filter change — no clustering lib needed at this scale (revisit if >5k).
3. **Leaflet directly.** `npm i leaflet` (+ its types). CSS: import `leaflet/dist/leaflet.css`.
   Marker icons: fix the classic icon-asset path issue (Leaflet's default icons break under
   bundlers — set `L.Icon.Default` paths or use `L.divIcon`). Use `divIcon` markers (the
   tone/shape rule is decision 5) — avoids the asset pitfall entirely and looks clean.
4. **Map hygiene.** Destroy the map instance in `ngOnDestroy` (zoneless Angular has no
   change-detection crutch to hide leaks). Don't fight zoneless: leaflet is DOM-event driven, so
   its callbacks work fine; just update signals inside `ngZone`-free handlers.
5. **The trust palette is visible (M6 / community-review-queue D5).** A small legend explains
   the marker palette: blue = registry (Päästeamet + municipal rows), the unified yellow
   community tone for USER rows (`--color-new` == `--color-verified`, one value per theme —
   NEW and CONFIRMED share it; NEW is not a marker tone, the "Newly added" badge says NEW,
   never the pin; the submitter's verification depth rides on marker SHAPE when the API
   reports it — a triangle at exactly one confirmed channel, a circle at two or more),
   orange = reported (either open report kind, W2-B — `--color-reported`, the reported state
   overrides the trust colour), teal diamond = the searched-address ORIGIN (M8 — the
   address-search anchor point the per-row distances are measured from; distinct from shelter
   markers on SHAPE, not colour alone — shelters are 14 px circles, the origin is a 12 px
   diamond; shelters outrank the pin in z-order so a co-located shelter is never obscured).
   Hidden rows never reach the public map; the detail page's static pin renders with the same
   `markerTone()` as the map. (No moderator — user rows are trusted into the map and governed by
   community reports.) **The legend IS the pin-tone filter (wave 7):** the five shelter-tone
   entries (registry / community tone / partial-verified triangle / full-verified circle /
   reported) are toggle buttons — click (or Enter/Space) selects/unselects, the selection is
   the URL's `?tones=registry,user,partial,full,reported` param (URL-only, no localStorage;
   absent = no filter; hand-typed values clamp to the legal vocabulary with replaceUrl
   normalization, the paging/filter discipline), and it is DISPLAY-ONLY (the loaded list is
   filtered through the same `markerTone()` the map draws with and the markers re-render from
   the shared `sorted()` view — no refetch, never alters the data; an empty result gets the
   shared empty state). The sixth entry (the anchor diamond) is the browse reference point,
   not a shelter tone — it stays an inert legend entry. The affordance line ("Click to select
   or unselect", `map.legend.hint`) is the entries' accessible description; the pressed state
   is `aria-pressed` (selection is never a colour cue).
6. **Status filtering is a backend concern** — the public list is ACTIVE rows only (auto-hidden
   shelters are absent); do not add status UI.

## Distance numbers (M8 — the "≈ N m / km straight line" figures)

Where the "around 222 m"-style figures on /map come from — the rule in one
place, for future developers:

- **Which two points.** Every figure is a straight line between an ORIGIN
  and a SHELTER's stored coordinates (WGS84 decimal degrees, the DTO's
  `latitude`/`longitude`):
  1. **Around-you CTA** ("Show shelters around you"): the origin is the
     user's one-shot high-accuracy browser geolocation fix
     (`shared/geolocation.ts`). The one-line result measures to the
     NEAREST loaded row; the list sorts by the same distance.
  2. **Address anchor** ("Find shelters near an address"): the origin is
     the GEODECODED address point (the selected Nominatim result). Every
     row's "≈ N m straight line" figure is anchor → that row. The origin
     carries its own marker — the teal diamond (`.shelter-marker--anchor`,
     accessible name "Searched address", legend entry) — so "N m from
     what" is answerable at a glance.
- **Which formula.** Haversine great-circle distance, Earth radius 6371 km
  (`haversineKm` in `shared/geolocation.ts`), computed CLIENT-SIDE over the
  already-loaded rows — no backend call, no IP geolocation, the points
  never leave the device.
- **Which zoom.** The number is a property of the two points, not of the
  view — it does not change with zoom. The camera flies to the ORIGIN at
  neighbourhood scale (AROUND_ZOOM / ANCHOR_ZOOM 14), never to a shelter;
  selecting a row is the separate step that flies to that shelter at
  SHELTER_ZOOM 16.
- **What it means to the user.** An approximate STRAIGHT LINE over the
  earth's surface — never a walking/driving route, never an official
  distance (D6 distance honesty). The "≈" is the honesty marker; at a few
  hundred metres the route-vs-line difference is negligible, but the copy
  never claims a route.

## UI details

- Sidebar: name + address + the source/trust badge (`sourceTrustLabel` + `communityBadgeClass`)
  - the trust badges ("Reported (n)" when an open report of either kind (`nonexistentReports`
    or `inaccurateReports`) is > 0, the fresh-CLOSED open/closed
    badge, the occupancy text — all from the shared helpers).
    Sorting: by name (stable). Nearest-by-location is available as the **"Nearest shelter" CTA**
    (map-crisis-actions): high-accuracy geolocation (the submit page's options, 10 s timeout),
    Haversine nearest computed client-side over the loaded list (no backend call), fly to
    `SHELTER_ZOOM` + a TEMPORARY row-emphasis class (badge-less for now; cleared on the next
    interaction or filter change), the one-line "Nearest: {name}" state, and per-error copy in the
    submit page's vocabulary (denied / timeout / unsupported / unavailable). Empty loaded list →
    "No shelters near you yet." with a /submit link for authenticated users. While locating the
    button reads "Finding your location…" and is disabled. The legend stays untouched.
- Crisis entry points (map-crisis-actions D4): the sidebar CTA block (Nearest shelter + the
  authenticated-only ghost "Add shelter" → /submit) sits at the TOP of the sidebar, above the
  filter chips; there is NO top-nav item for submission (the /submit route guards — AuthGuard +
  VerifiedGuard — remain the single enforcement point).
- Map bounds: Estonia (~lat 57.5–59.7, lng 21.5–28.2 — `GeoPoint` bbox constants; default view centered ~(58.6, 25.0) zoom 7).
- Selection sync: clicking a list row OR a marker selects the shelter, zooms the
  map to street level (`SHELTER_ZOOM` = 16) and stays on /map — the zoom is the
  payoff of the click, not a navigation. The selected row grows a "View
  details" link: the only sidebar element that navigates to `/shelters/{id}`.
  A marker click or a nearest-shelter success also scrolls the accented row
  into view in the sidebar (`scrollIntoView({ block: 'nearest' })` — a no-op
  when already visible). The detail page itself shows a small static Location map of the shelter.
- Loading state while fetching; error banner if the backend is down (still show the page chrome).

## Contracts with other contexts

- M1 `ApiError`/banner conventions apply to the error state.
- M5 adds the detail route (`/shelters/:id`) — reached via the selected row's
  "View details" link (the detail page shows a static Location map of the
  shelter) — plus the
  "+ Add shelter" entry. _(BUILT, map-crisis-actions: the ghost "Add shelter"
  CTA in the map sidebar, visible to AUTHENTICATED users — the /submit route
  guards handle the verified redirect, so unverified users land on /verify.)_
- Models: `ShelterDto` from `02-CONTEXT-API.md` — `source`, `status`, `description`/`capacity`
  nullable, plus the trust fields (`submitterVerified`, `nonexistentReports`, `openStatus`,
  `occupancy`, `reviewStatus`, `locationKind`, `reportCount`, `lastVerifiedAt`, `inaccurate`).
  The FE DTO carries NO `provenance` field — the FE badge reads `source` + `reviewStatus`.
