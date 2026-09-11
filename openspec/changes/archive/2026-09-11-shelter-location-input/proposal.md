# Change: Smart location capture for shelter submission

## Why

Submitting a shelter today requires the user to know and type exact
latitude/longitude — a capability virtually no volunteer has. The mini-map
exists but finding a shelter's position by panning/zooming a blank map is
slow and error-prone. Users need ways that match how people actually know
a location: "I'm standing here", "here is the Google Maps link", or
"59.4370, 24.7535" copied from anywhere.

## What Changes

Frontend (submit-shelter-page + shared):

- One **smart location input** that accepts, in one field:
  - decimal coordinate strings: `59.4370, 24.7535` (comma/space/semicolon,
    with or without quotes/labels), DMS `59°26'13"N 24°45'12"E`
  - map URLs with embedded coordinates: Google (`?q=`, `?ll=`, `?daddr=`,
    `!3d…!4d…`, `/@lat,lng`), Apple (`maps.apple.com/?ll=`), Bing
    (`bing.com/maps?q=lat,lng`) — any http(s) URL containing a
    coordinate pair that lands inside the Estonia bounding box
  - order auto-swap: if (a,b) is outside Estonia but (b,a) is inside, use
    (b,a) (Google Maps share URLs sometimes present lng,lat)
- **"Use my location"** button: `navigator.geolocation.getCurrentPosition`
  (high accuracy), drops the pick marker, shows accuracy hint; permission /
  unavailable / timeout errors mapped to specific inline messages
- Google **short links** (`maps.app.goo.gl/…`) can't be resolved client-side
  (opaque redirects) → new backend endpoint resolves them (below)
- Existing drag/click map picking stays; every mode updates one shared
  location state; resolved coordinates displayed read-only under the map
- Pure `parseLocationInput(text): {latitude, longitude} | {reason}` helper
  in `shared/` (unit-tested, ≥30 cases), Estonia bbox = existing
  `GeoPoint` bounds (lat 57.5–59.7, lng 21.5–28.2) mirrored in the shared
  helper (frontend already mirrors bounds for validation)

Backend (new, additive):

- `POST /api/geo/resolve` — JWT-protected, per-IP rate-limited
  (5/min), body `{"url": "…"}`:
  - only `maps.app.goo.gl` is accepted as an unparseable host (long-form
    map URLs are parsed client-side and never reach this endpoint)
  - follows ≤3 HTTP redirects (3 s connect / 5 s read timeout), extracts
    the coordinate pair from the final URL with the same bbox rule
  - 200 `{"latitude":…, "longitude":…}` · 400 generic "could not find
    coordinates" (invalid input, no pair, outside Estonia — all one
    message: no enumeration) · 429 rate limit · 502 upstream failure
    (generic, no upstream detail leaked)

## Impact

- Frontend: `features/shelter/submit-shelter-page.*`, new
  `shared/location-input.ts` (+spec), `gateways/shelter-gateway.ts`
  (or `geo-gateway.ts`) + spec, `core/models.ts`, affected specs
- Backend: new `api/LocationController.java`, `app/LocationResolveService.java`,
  `api/LocationResolveRequest.java` (+ record), rate-limit bean in
  SecurityConfig, `application.yml` property, service + IT tests
- API contract: one new endpoint; no existing endpoint changes
- Docs: `frontend/docs/agent/02-CONTEXT-API.md`, `06-CONTEXT-SHELTER.md`,
  `05-shelter-review-flow.puml` (or the submission-flow puml), `06-CONTEXT-API.md`
  (backend), root README API table — updated by the implementing children
  (docs must never drift rule)
