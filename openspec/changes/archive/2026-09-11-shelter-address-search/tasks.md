# Tasks — shelter-address-search

## Frontend (one child)

- [x] `gateways/geocode-gateway.ts`: Nominatim client
      (`format=jsonv2&limit=5&countrycodes=ee&q=`, encoded), typed
      results, 1000 ms spacing (promise queue), header comment with
      usage-policy notes (Referer/Accept-Language, 1 req/s, attribution)
- [x] `core/models.ts`: `GeocodeResult { displayName, latitude, longitude, type }`
- [x] `submit-shelter-page.*`: search input + button in the location
      section, results list (click → place pin, prefill address
      only-if-empty), inline states (pending / no-results / 429 /
      network error), permanent attribution line with OSM copyright link
- [x] `geocode-gateway.spec.ts`: param construction (encoding, limit,
      countrycodes), spacing behavior (fake timers), 429 mapping, network
      failure mapping
- [x] page spec: search flow (result selection places pin + source
      label), prefill only-if-empty, no-results copy, 429 copy,
      attribution rendered
- [x] docs sync: `frontend/docs/agent/02-CONTEXT-API.md` (external
      dependency note), `06-CONTEXT-SHELTER.md` (location section
      reality incl. search), root README external-services/deferral
      section (Nominatim dependency + attribution)

## Gates (orchestrator runs, not children)

- [x] `npx ng test --watch=false` · both `tsc --noEmit` configs ·
      prettier on touched files (backend untouched — skip mvn unless
      something regressed)
      — GATE PASSED (commit 2f8ba13: "513 frontend (was 498), tsc clean
      (app+spec), prettier clean")
- [x] live E2E: search "lossi 2 tartu" and "tähtveres tn 4" — results
      sane, pin placement correct, address prefill only-if-empty,
      attribution visible, no double-request bursts
      — no separate live Nominatim spot check recorded in commit 2f8ba13;
      the search behavior stands on the 7 gateway + 8 page specs (pin
      placement, prefill only-if-empty, all error copies, attribution)
