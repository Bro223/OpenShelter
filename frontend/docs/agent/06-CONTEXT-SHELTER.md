# Context — Shelter Detail & Submission (M5–M6, M8 contributions)

**Source diagrams:** `01-frontend-architecture.puml` (`ShelterDetailPage`, `SubmitShelterPage`,
`/shelters/:id` + `/submit` routes),
`05-shelter-review-flow.puml` (sequence).
**Used by:** M5. M6 polish notes at the end.

## Purpose

- **Detail page** (public): one shelter with its trust badges and derived display status,
  description/capacity (USER rows), registry meta when present, and the trust report pickers.
- **Trust reports** (verified users; the report answers the dampening outcome, the occupancy
  upsert returns 204): **"Report this shelter"** (three radio types —
  NON_EXISTENT "It does not exist" / WRONG_LOCATION "The location is wrong" /
  OTHER "Something else" + an optional detail field for WRONG_LOCATION and
  OTHER (type-specific placeholders); closed/open is the separate two-state
  picker) and **"Report how full"** (three large band
  buttons — "Space available" / "Getting full" / "Full"; one live band per user, latest wins;
  pre-selected from the detail DTO's `yourOccupancyBand`). The server effects are the trust
  layer (auto-hide on the trust-weighted non-existence tally reaching 5
  points, the CONFIRMED promotion when three distinct non-submitter
  confirmations cross the threshold, display-only occupancy) — the UI renders what
  the DTO carries and never re-derives it.
- **Submission** (verified users): add a USER shelter with name, location, description,
  capacity. The location section (shelter-location-input + shelter-address-search) captures
  the point five ways — a smart text input (coordinate string / DMS / long-form map URL, parsed
  client-side by `shared/location-input.ts`), a "Use my location" geolocation button, a
  `maps.app.goo.gl` short link (resolved by `POST /api/geo/resolve`), an Estonia address search
  (client-side OSM Nominatim via `GeocodeGateway`), or the mini-map click/drag — all writing ONE
  shared location signal; resolved coordinates are shown read-only. Selecting a search result
  prefills the smart text input ONLY IF it is currently empty (prefill, never overwrite —
  stated in the UI help line). The backend enforces the Estonia bbox (400) and stores it
  ACTIVE immediately (no moderator — the report system is the moderation). The 11th ACTIVE
  USER shelter is rejected with 409 ("The limit of 10 active shelters has been reached") —
  surfaced as the row error in the contributions panel.

## Classes to create

| Type                | Kind                                                   | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterDetailPage` | component (route `/shelters/:id`, public)              | Fetches the shelter (`ShelterDetailDto` — the list DTO + `yourOccupancyBand`). Header: name, source/trust badge (`sourceTrustLabel` — see key decision 7) + the trust badges (the "Reported (n)" badge when an open report of either kind (`nonexistentReports` or `inaccurateReports`) is > 0, the `openStatusBadgeText` badge ("Reported closed" / "Closed"; no badge for a fresh OPEN), `occupancyText` — the same shared copy as the map rows), address, description/capacity when present. **Location section**: a small static map (page-scoped `LeafletService`, flown to the shelter at `SHELTER_ZOOM` 16, one non-interactive marker — no picking, no marker navigation). In place of the removed reviews section: a small practical info block — the newest last-reported open/closed and how-full rows with recency (existing row data only; a derived-status row is deliberately NOT rendered there — owner decision, see the template note; `shelterStatusText` still feeds the map's "Open" chip, the header badge and the admin-facing displays). Trust sections (verified viewers only — anonymous/unverified get the login/verify prompts in the existing vocabulary): **"Report this shelter"** — a "Report" button opens a form with the three radio types (NON_EXISTENT / WRONG_LOCATION / OTHER) + an optional detail textarea (for WRONG_LOCATION and OTHER, type-specific placeholders, ≤ 500 chars); a 409 duplicate shows the server message inline (`role=status`); success → close + refetch. **"Report how full"** — three large band buttons (one tap, latest-wins, `aria-pressed`), pre-selected from `yourOccupancyBand`, with the current aggregate + recency line (`occupancyText`) rendered only while fresh. Header also carries the navigate actions (map-crisis-actions D3): a coordinate line (5 decimals, `.num-tabular`) and two small secondary deep links near the name — "Navigate" (Google Maps walking) and "Open in Apple Maps" — `target="_blank" rel="noopener"`, no in-app navigation; beside them the **"Distance from you" action (location-navigation M12)** — the page's only geolocation trigger (high-accuracy, the map CTA's exact options, client-side Haversine — no backend call, no IP geolocation), rendering the straight-line honesty line "≈ … straight line from you" (the shared `straightLineText`) with the map CTA's mirrored per-error copy.                                      |
| `SubmitShelterPage` | component (route `/submit`, AuthGuard + VerifiedGuard) | Form: name (≤200), description (≤2000), capacity (1–100000, optional), location — ONE shared location signal written by FIVE capture modes (decision 5 is the authority): (1) smart text input (coordinate strings, DMS, labels, long-form map URLs — Google `q`/`ll`/`daddr`/`saddr`/`!3d…!4d…`/`/@lat,lng`, Apple `ll=`, Bing `q=` — parsed client-side by the pure `parseLocationInput` in `shared/location-input.ts`), (2) `maps.app.goo.gl` short link (resolved via `GeoGateway.resolve` → POST /api/geo/resolve with a pending "Resolving…" state), (3) "Use my location" geolocation (high accuracy, 10 s timeout, no cache; per-error-code inline messages + an https-only guard), (4) mini-map click/drag (page-scoped `LeafletService`), (5) **address search** (shelter-address-search): search input + button in the location section, Enter/button submit — NO autosuggest (Nominatim usage policy); results list (max 5, display name + type) rendered as a `<ul>` of buttons; click places the pin (source `address-search`) and prefills the smart text input ONLY IF it is currently empty (prefill, never overwrite — a help line near the field states this); inline states pending ("Searching…") / no-results / 429 ("please wait a moment") / network error (role="alert" for the two errors); a permanently-rendered attribution line ("© OpenStreetMap contributors" → openstreetmap.org/copyright) sits next to the search box. The geocoding call is client-side OSM Nominatim via `GeocodeGateway` (Estonia-restricted `countrycodes=ee`, limit 5, jsonv2; hard 1000 ms client-side request spacing — the page ignores extra presses while a search is pending, so at most one pending). A FAILED search NEVER touches the pin and never blocks submit; a failed CAPTURE (typed/link/geo) still clears the pin (never a silent stale pin). The Estonia bbox pre-check is instant inline feedback (backend re-checks). On 201 → navigate to the new shelter's detail page. The read-only coordinate readout (+ source/swapped/accuracy hints) is a DISPLAY of the shared signal — not a capture mode. |

## Key decisions

1. **The backend owns correctness; the UI owns clarity.** Duplicate/race 409s, 403s, bbox 400s
   surface as banners from the ApiError message. The form validates eagerly (lengths, bbox) but never hides a server rejection.
2. **Submission is verified-gated in the UI AND the backend.** `VerifiedGuard` on `/submit`
   mirrors the 403. If a 403 still arrives (claim expired), banner → `/verify`.
3. **USER vs REGISTRY rendering.** Registry rows: address + (eventually) county metadata; USER
   rows: description/capacity + "added by the community". (The map filter chip "User" is the
   short form for user-submitted rows — deliberate, chip space.) _(M8 supersedes the "never show a
   delete/flag UI on shelters in v1" caveat for the AUTHOR: their own USER-source shelters get
   edit/delete in the account page's contributions panel — registry rows stay read-only for
   everyone.)_
4. **After a trust report or a submit, refetch** the shelter — cheap at this scale and always
   consistent.
5. **Location: one shared state, one pure parser** (shelter-location-input +
   shelter-address-search). Every capture mode (typed / link / geolocation /
   map pick / address search) writes the single `location` signal; the marker and
   the read-only readout read it. `parseLocationInput` (shared) is pure + fixture-table-tested,
   the bbox gate is the safety net, and a failed CAPTURE clears the pin so the form can never
   submit a stale point (a failed address SEARCH never touches the pin — it is a separate
   inline state that never blocks submit). Short links are the ONLY BACKEND network path
   (backend resolves them); the address search is the ONLY client-side EXTERNAL call
   (Nominatim, Estonia-restricted, 1 req/s spaced, attribution always rendered);
   long-form URLs are never fetched client-side.
6. **Navigate actions are hand-rolled deep links, not a library** (map-crisis-actions D3).
   The detail header's "Navigate" opens
   `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=walking`
   and "Open in Apple Maps" opens `https://maps.apple.com/?daddr={lat},{lng}&q={encoded name}` —
   both `target="_blank" rel="noopener"`, coordinates at 5 decimals (the app-wide format),
   both rendered only when the coordinates are finite (mirroring the Location map's
   `pinShelter` guard). They sit near the name as small secondary links, deliberately not
   competing with the back link. The map page's nearest-row emphasis is a temporary
   highlight class — no new badge for now.
7. **Source and trust state are displayed plainly, not just colour-coded**
   (accessibility-and-provenance D4, updated by community-review-queue D5). List rows (map
   sidebar) and the detail-page header show a small chip next to the name —
   same visual weight as the existing source badge — with the single-sourced
   `sourceTrustLabel` / `communityBadgeClass` in `shared/shelter-copy.ts`:
   PAASETEAMET → "Päästeamet registry", MUNICIPALITY → "Municipal registry",
   USER rows carry their trust-state label — "Newly added" (NEW),
   "Community-checked" (CONFIRMED), and "Rejected" (REJECTED — the /mine +
   admin surfaces only, where hidden rows are visible). The label is read
   from the DTO's `source` + `reviewStatus` (backend fields — the UI NEVER
   re-derives trust state from raw report lists). The badge tone follows the
   marker trust palette (the yellow family for NEW — the light-tint + dark-amber text pair, the green family for
   CONFIRMED — the verified pair, the danger tone for REJECTED). The map legend + filter chip
   wording is the `map.legend.*` keys (the six current entries — 05-CONTEXT-MAP decision 5;
   the chips themselves are gone, wave 8).
8. **Trust reports are verified-gated client-side and server-enforced** (shelter-trust-and-
   reports). The detail-page trust pickers render for VERIFIED users only (anonymous/unverified
   get the login/verify prompts in the existing vocabulary);
   the API 403 remains the enforcement point (banner + link to /verify). A 409 duplicate shows
   the SERVER's message inline near the picker (`role=status`), not as an error banner; a 429
   throttle uses the generic "slow down" banner copy; after any successful report the shelter
   is refetched (the DTO may have changed — a badge appeared, the occupancy updated). The UI
   never re-derives trust state: badges, flags and occupancy all come from the DTO fields.

## M8 — My contributions (account page, `user-contributions`)

One new **panel on the account page** (`/account`), not a new route — the account stays the
single place for "what's mine" (M8 design decision 6). A dedicated `ContributionsPanel`
component is embedded in the account page template after the existing change panels;
`AccountPage` stays lean. _(2026-09-08 arch pass: the panel's files now live in
`features/account/` — the original `features/contributions/` folder was deleted to kill all
cross-feature imports.)_

| Type                 | Kind                                             | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterGateway`     | service (`gateways/`, extended)                  | M8 adds `mine()` (GET `/api/shelters/mine`), `update(id, request)` (PUT `/api/shelters/{id}`), `remove(id)` (DELETE `/api/shelters/{id}` → 204) alongside `list`/`get`/`create`. shelter-trust-and-reports adds `report(id, request)` (POST `/api/shelters/{id}/reports` → 200 `{"damped": bool}`) and `reportOccupancy(id, band)` (PUT `/api/shelters/{id}/occupancy` → 204 upsert) alongside those.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `AccountGateway`     | service (`gateways/`, extended)                  | M8's `myReviews()` is gone with the review model. Live methods: `me()` (GET `/account/me`), `updateProfile` (PUT `/account/profile`), the email/phone change request + confirm pairs, `export` (GET `/account/export`), `deleteAccount` (DELETE `/account` → 204).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `ContributionsPanel` | component (`features/account/` — see note above) | ONE list (the reviews list is gone with the review model), with its own loading/empty/error states: **shelters** (name + trust badge, created date, View → `/shelters/{id}`, inline-expanding edit form — name/description/capacity/lat/lng with client-side required + bounds mirroring the backend → `update`, two-step delete ("Delete this shelter permanently?") → `remove`). Empty shelter list: "You haven't submitted any shelters yet" + link to `/submit`; the "Submit a shelter" action additionally renders while shelters ARE present (map-crisis-actions — the entry is for every authenticated user, not only the empty state). Success updates the row in place from the response; 400/403/404 surface via the existing `bannerMessage` pattern with the row unchanged. Trust state: the owner's shelter list carries auto-hidden (INACTIVE) rows, each marked "Hidden — reported by the community (N reports)" (no restore action — restore is admin-only; suppressed for REJECTED rows, whose badge + the admin's REJECT note — `reviewNote` — carry the state), and a 409 shelter-cap on create surfaces the server message in the row error ("The limit of 10 active shelters has been reached"). OnPush + signals, design tokens only. |

## M6 polish notes (expanded in 07-STEPS)

- Design tokens (colors/type/spacing) applied consistently; responsive (map on desktop,
  stacked on mobile).
- Empty/loading/error states audited across all pages; favicon + `<title>` per route; language:
  English copy for v1 with an i18n seam if cheap.
- Prod build: `environment.ts` (production) gets the deployed API URL; `ng build` output goes to
  `dist/`; a deploy (nginx serving static + proxying `/api`) is a follow-up outside this pack.

## Contracts with other contexts

- Auth gating: `AuthStore.authenticated()/isVerified()` (M2), guards in `01 puml`.
- Public read endpoints and DTO fields: `02-CONTEXT-API.md`.
- Map (M4) reaches here via the selected row's "View details" link (a
  marker/row click itself only zooms the map and stays on /map); after submit,
  navigate to `/shelters/{id}`.
