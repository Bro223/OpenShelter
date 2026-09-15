# Change: Address search for shelter submission

## Why

Even with link parsing and "use my location", a volunteer preparing a
submission at a desk (not on site) still needs: type "Tartu lossi 2" and
get a pin. Free OSM Nominatim geocoding (Estonia-restricted) covers this
with no API key.

## What Changes

Frontend only (no backend changes):

- Address search box in the submit form's location section:
  `GET https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=ee&q=…`
- submit-on-Enter or button (no free-typing autosuggest in v1 — keeps the
  Nominatim usage policy comfortable), results as a short list (name +
  type), click → place pin + optionally prefill the form's address field
  from `display_name` (street/city portion only, user-editable)
- client-side rate limit: ≥1000 ms between Nominatim requests (usage
  policy), 300 ms debounce not needed for button/Enter model
- error states: no results ("no Estonian address found — paste a link or
  use the map"), network failure, Nominatim 429 (back off, tell the user
  to wait a moment)
- required attribution next to the search: "Address data © OpenStreetMap
  contributors" (link to openstreetmap.org/copyright) — Nominatim usage
  policy requirement
- search requests carry `Referer`/`Accept-Language` defaults of the
  browser (Nominatim policy: identify the app via Referer — satisfied on
  https/localhost; noted in code comment)

## Impact

- Frontend: `submit-shelter-page.*` (location section), new
  `gateways/geocode-gateway.ts` (+spec, Nominatim client with
  `countrycodes=ee`, limit 5, jsonv2), `core/models.ts` (GeocodeResult),
  specs
- Backend: none
- Docs: `frontend/docs/agent/02-CONTEXT-API.md` (external dependency
  note), `06-CONTEXT-SHELTER.md`, root README (external services table)
- No new server dependency, no key, no DB
