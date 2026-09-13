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

| Type             | Kind                                                                                                       | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterGateway` | service (`gateways/`)                                                                                      | `list(provenance: ProvenanceFilter, trust?: ShelterTrustFilter): ShelterDto[]` → `GET /api/shelters?provenance=…` (**M6, shelter-provenance-taxonomy**: the provenance filter replaces the old `?source=` chips — `ALL` omits the param entirely; the backend keeps `source` for compat) + optional `reviewed` / `minRating` / `hasCapacity` trust filters — absent fields are omitted from the query string entirely; `get(id)` → `GET /api/shelters/{id}` → `ShelterDetailDto` (the list DTO + `yourOccupancyBand`; used by M5 too).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `LeafletService` | service (`shared/` — moved there from `features/map/` in the 2026-09-08 arch pass; it has no feature deps) | thin wrapper around the `leaflet` npm package. Owns one map instance per page: `create(el, center, zoom)`, `renderShelters(ShelterDto[])` (replaces markers), `setFilter`, `flyTo(lat, lng, zoom?)` (keeps the current zoom unless `zoom` is given), `showShelter(shelter \| null)` (single static pin — the detail page's Location map), `destroy()`. Exposes a `markerClick` callback/event. **No ngx-leaflet** — the wrapper stays ~1 release behind Angular majors, we call leaflet directly.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `MapPage`        | component (route `/map`, public, default route)                                                            | Layout: Leaflet map + sidebar list. Loads `ShelterGateway.list('ALL')` on init; **provenance filter chips (M6; M7 wording: All / Official / Partner / Community / Proposed — replacing the old source chips, which the finer taxonomy supersedes)** refetch with the server-side `provenance` param. Trust filters (shelter-trust-and-reports D6) below the provenance chips, composing with it — every change is the same SERVER refetch + list rebuild, never client-side filtering: a `Reviewed` toggle chip (`reviewed=true`), a `Has capacity` toggle chip (`hasCapacity=true`), and a `Rating` select ("Any rating" / "1★+" … "5★+" → `minRating`, the first option sends nothing). Renders markers toned by the server-derived `provenance` (M6: OFFICIAL blue, PARTNER_VERIFIED yellow, COMMUNITY_REPORTED green, UNDER_REVIEW amber); the reported state (D1) OVERRIDES the provenance colour — any shelter with `nonexistentReports > 0` gets the single orange marker (`--color-reported`); the legend shows the five public-map entries (Official / Partner / Community / Proposed / Reported) — the grey (REPORTED_INACTIVE) and red (REJECTED) tones exist for the detail page's static pin only. Row badges (single-sourced in `shared/shelter-copy.ts`): the provenance badge (`provenanceText`/`provenanceBadgeClass` — the server value, never re-derived), the "Reported" badge, `statusFlagText` ("Reported closed" / "Confirmed open") and `occupancyText` (firm or hedged band + recency) — rendered only when the DTO carries the state, never client-derived. Clicking a marker or list row → select + zoom the map to street level (`SHELTER_ZOOM` 16) and **stay on /map**; the selected row shows a "View details" link that navigates to `/shelters/{id}` (the explicit navigation step). The list scrolls freely — deliberately NO scroll-snap (proximity snap made Chrome swallow fast wheel input; the mandatory one-row carousel was rejected; full measured rationale in `map-page.scss`). |

## Key decisions

1. **Server-side filtering, not client-side.** The backend supports `?source=ALL|REGISTRY|USER`
   (compat; the FE no longer sends it) + **`?provenance=` (M6)** plus the trust filters
   `reviewed` / `minRating` / `hasCapacity` (all composable); always refetch on any filter
   change. Keeps the UI dumb and the data honest.
2. **Estonia-scale fetch-all.** The backend has no paging by design (hundreds of rows). Load once,
   replace markers on filter change — no clustering lib needed at this scale (revisit if >5k).
3. **Leaflet directly.** `npm i leaflet` (+ its types). CSS: import `leaflet/dist/leaflet.css`.
   Marker icons: fix the classic icon-asset path issue (Leaflet's default icons break under
   bundlers — set `L.Icon.Default` paths or use `L.divIcon`). Use `divIcon` markers colored by
   source (REGISTRY = blue, USER = green) — avoids the asset pitfall entirely and looks clean.
4. **Map hygiene.** Destroy the map instance in `ngOnDestroy` (zoneless Angular has no
   change-detection crutch to hide leaks). Don't fight zoneless: leaflet is DOM-event driven, so
   its callbacks work fine; just update signals inside `ngZone`-free handlers.
5. **Provenance is visible (M6).** A small legend explains the marker palette: blue = official
   (Päästeamet registry), yellow = partner-verified (municipal/partner rows), green =
   community-reported, amber = proposed (unconfirmed community), orange = reported
   (`--color-reported` — the reported state overrides the provenance colour). The grey
   (reported-inactive) and red (rejected) tones are hidden-row states — the detail page's
   static pin only. (No moderator — user rows are trusted into the map and governed by
   reviews and reports.)
6. **Status filtering is a backend concern** — the public list is ACTIVE rows only (auto-hidden
   shelters are absent); do not add status UI.

## UI details

- Sidebar: name + address + source badge + rating (averageRating null → "no ratings yet") +
  the trust badges ("Reported" when `nonexistentReports > 0`, the status-flag text, the
  occupancy text — all from the shared helpers).
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
- Models: `ShelterDto` from `02-CONTEXT-API.md` — `averageRating: number | null`, `source`,
  `status`, `description`/`capacity` nullable, plus the trust fields (`submitterVerified`,
  `nonexistentReports`, `statusFlag`, `occupancy`).
