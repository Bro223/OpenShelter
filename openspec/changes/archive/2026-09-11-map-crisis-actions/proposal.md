# Change: Map crisis actions and contribution entry points

## Why

The app's primary job in a crisis is to get a person from "I need a shelter"
to a shelter and to their phone's navigation in as few actions as possible.
Today the map page offers browsing only: no "where is the nearest one", no
one-tap start of navigation, no way to contribute a missing shelter unless
the user already knows the /submit route exists (the only in-app link is the
contributions panel's empty state). The recommendation is grounded in
kriis.ee's crisis UX and verified against real map apps (Organic Maps adds a
"Nearby" button on a blank canvas; OSM's web editor exposes its only add-data
action as a prominent toolbar item; Google's map puts "Add a missing place"
in the same contextual location; Waze's contribution entry is buried and its
contributor base suffers — the counter-example).

## What Changes

- A prominent "Nearest shelter" action on the map page (single-use safety
  orange, new `--color-cta` token) that uses browser geolocation to find and
  pan to the closest shelter, with per-state copy (locating / found / no
  shelters / per-error denial-timeout-unsupported).
- A "Navigate" action on the shelter detail page that opens the user's phone
  navigation (Google Maps walking deep link; Apple Maps fallback), no
  in-app navigation.
- "Add shelter" entry point on the map sidebar for authenticated users (the
  route guards handle unverified redirect), and the contributions-panel
  action ("Submit a shelter") rendered unconditionally, not only in the
  empty state.
- Touch targets: 48px minimum height for buttons and list-row buttons.
- `font-variant-numeric: tabular-nums` for coordinate/numeric readouts.

## Impact

- Affected specs: map-browse (nearest + navigate), shelter-submission
  (entry points), app-polish (targets/numerics).
- Affected code: frontend only — `features/map/` (map page + scss),
  `features/shelter/shelter-detail-page.*`, `features/account/
  contributions-panel.*`, `styles.scss` (one new token), specs.
- No backend changes. No changes to the existing click-to-zoom model, the
  filter chips, the legend, or the list.
