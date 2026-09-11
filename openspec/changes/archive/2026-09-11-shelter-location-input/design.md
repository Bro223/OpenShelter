# Design — shelter-location-input

## Context

`SubmitShelterPage` currently: manual lat/lng text inputs + mini-map picker
(page-scoped `LeafletService`), group validator `locationValidator`
(both present + inside Estonia bbox). Coordinates flow into
`ShelterCreateRequest` → `GeoPoint.inEstonia` (57.5–59.7 / 21.5–28.2).
No geocoding, no URL parsing, no geolocation anywhere yet.

## Decisions

1. **One shared pure parser, one location state.** `shared/location-input.ts`
   exports `parseLocationInput(text): ParseLocationResult` — pure,
   dependency-free, the single client-side authority for "text →
   coordinates". The page holds ONE location signal (lat/lng + a
   `source` label: typed / link / geolocation / map-pick); every capture
   mode writes it, the map marker + read-only display read it.
2. **Parse order (deterministic, tested):**
   a. if text looks like an http(s) URL → extract the first coordinate
   pair from known patterns (`q|ll|daddr|saddr=`, `!3d…!4d…`,
   `/@lat,lng`, `ll=`), else generic: first decimal pair in the URL
   b. else if it contains DMS markers (`°` or `N/S/E/W` letters) → DMS parse
   c. else two-decimals fallback (`,`/` `/`;` separators, optional labels
   like `lat:`/`lng:` stripped first)
   d. bbox gate on (a,b); if outside but (b,a) inside → use (b,a) and flag
   `swapped: true` (shown as a hint, not an error)
   e. all failures return a specific `reason` (not-a-pair / out-of-bounds /
   invalid) → page renders the matching inline message
3. **Short links go to the backend.** Client detects
   `maps.app.goo.gl` and calls `POST /api/geo/resolve` (new
   `geo-gateway.ts` — kept separate from `shelter-gateway.ts`: it maps to
   its own controller group). Long-form URLs never hit the network.
   Rationale: short-link redirects are opaque client-side (CORS); the
   backend is the only place that can read the `Location` header.
4. **Backend resolver is deliberately narrow.** Host whitelist
   (`maps.app.goo.gl` only — the only host the client ever sends),
   ≤3 redirect hops, 3 s/5 s timeouts, no JS, no cookies, UA set
   (`OpenShelter/1.0 (location resolver)`). Coordinate extraction on the
   final URL reuses the same pattern list as the frontend (a small
   `MapsUrlCoordinates` helper in `app/`, unit-tested with the same case
   table as the frontend spec — same fixtures, both sides must pass).
   One generic 400 message for all not-found/outside cases (no
   enumeration). Per-IP token bucket 5/min registered in SecurityConfig
   like the existing auth buckets.
5. **Geolocation UX.** Button calls
   `getCurrentPosition({ enableHighAccuracy: true, timeout: 10000,
maximumAge: 0 })`. Success → sets location (source=geolocation) +
   accuracy hint ("accuracy ~40 m — drag the pin if needed"). Error codes
   mapped 1:1 to messages (permission denied / unavailable / timeout).
   No location is stored or sent anywhere except as the form coordinates.
6. **No server-side geocoding in this change.** Name→coordinates
   (address search) is the separate `shelter-address-search` change,
   built on the same location state.

## Risks

- Nominatim/Google URL formats drift → parser is pattern-based with the
  bbox gate as the safety net; unparseable input degrades to the inline
  error telling the user to use map picking or geolocation (never a
  silent wrong pin).
- Geolocation requires a secure context (https or localhost) — dev runs
  on localhost:5173 (OK); production behind https (OK). Documented in the
  UI error copy for non-secure contexts.
- Two parsers (FE + BE) duplicating the URL patterns → shared fixture
  table in both test suites keeps them honest; BE table is a copy,
  acceptable at this size.
