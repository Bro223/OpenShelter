# Design — shelter-address-search

## Context

`shelter-location-input` gives the form one location signal with capture
modes (text/link/geolocation/map). Address search is a fifth capture
source. Nominatim (OSM) is the only free geocoder without an API key that
supports CORS and country restriction.

## Decisions

1. **External call stays in a gateway.** `geocode-gateway.ts` is the only
   module that knows the Nominatim URL/params; returns typed
   `GeocodeResult[] { displayName, latitude, longitude, type }`. The page
   renders results and writes the chosen one into the shared location
   signal (source=address-search) — same path as every other mode.
2. **Button/Enter submit, not autosuggest.** One request per deliberate
   search: respects Nominatim's 1 req/s policy with zero user friction at
   this app's scale, and avoids a typeahead component for v1.
3. **Hard client-side 1000 ms spacing** between consecutive Nominatim
   calls (ignore/queue a second search within the window — show the
   button pending until the window allows).
4. **Prefill, never overwrite.** Choosing a result sets the location AND
   fills the address field ONLY IF it is currently empty (or the user
   just cleared it — v1: only-if-empty, stated in the UI help text).
5. **Estonia-only results** (`countrycodes=ee`) — consistent with the
   app's bbox rule; a user searching a foreign address gets "no Estonian
   address found", which is the honest answer for this app.
6. **Attribution is mandatory** (Nominatim policy + OSM license): visible
   "© OpenStreetMap contributors" link next to the search box, always
   rendered (not just on success).

## Risks

- Nominatim availability/latency → search is optional; every other capture
  mode works without it; failures show a message, never block submit.
- CORS: Nominatim sends `Access-Control-Allow-Origin: *` (current
  behavior); if that ever changes, the gateway fails with the standard
  network error copy — no silent breakage.
- Usage-policy compliance at scale: the app has no traffic to threaten
  1 req/s; the button model + spacing + Estonia restriction + attribution
  keep us well inside policy. Documented in the gateway file header.
