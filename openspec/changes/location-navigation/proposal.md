# Change: Location & navigation (roadmap M12)

## Why

The roadmap M12 line — "geolocation + address search + distance +
walking-route link + official-guidance link; never IP geolocation" — is
partly satisfied already: the map's "Show shelters around you" CTA
(map-crisis-actions, client-side geolocation, no backend call), the
/submit address search (shelter-address-search, client-side Nominatim),
the detail page's "Navigate" (Google Maps walking deep link) +
"Open in Apple Maps" (map-crisis-actions D3), and the app-wide footer's
official guidance links (Rescue Board + Maa-amet, pinned in
`page-shell.spec.ts`) all exist. Two gaps remain on the decision
surfaces:

1. The map page has no way to find shelters around a KNOWN place. When
   geolocation is denied, times out, or unavailable (indoor, stressed
   user, no GPS), the "Show shelters around you" CTA dead-ends with an
   error and no fallback. The /submit page already has an Estonia
   address search (Nominatim) — the same capability, in the browse
   context, is the natural fallback for the same crisis job.
2. The detail page — where the go/don't-go decision happens — shows
   coordinates + Navigate links but never the distance from the user.
   The map's nearest line has it; the detail page doesn't.

## What Changes

- **Map page: address search as a browse anchor** — a search input +
  "Search" button (Enter submits) below the geolocation note, reusing
  the existing `GeocodeGateway` (client-side OSM Nominatim,
  Estonia-restricted, limit 5, no autosuggest, 1 req/s spacing,
  attribution line always rendered — the usage-policy contract of
  shelter-address-search). Selecting a result drops a non-interactive
  anchor pin (`LeafletService.setAnchor` — new, non-draggable, its own
  layer), flies the map to the point at neighbourhood scale, and
  renders the straight-line distance from that point on every list row
  (the same `straightLineText` honesty format — never a route claim).
  While an anchor is active the list sorts by distance (name as the
  tiebreak); clearing the anchor restores the stable name sort. A
  "Clear" action removes the anchor + pin. The anchor supersedes the
  nearest-shelter emphasis (the next-interaction-supersedes convention).
- **Detail page: distance from you** — a "Distance from you" action
  next to Navigate / Open in Apple Maps. On tap: high-accuracy browser
  geolocation (the exact options of the map CTA:
  `enableHighAccuracy, timeout 10000, maximumAge 0`), client-side
  Haversine, rendered as "≈ … straight line from you" (D6 distance
  honesty). Per-error copy mirrors the map CTA's vocabulary (the
  W9/W15 documented-duplication convention). No backend call, no IP
  geolocation — the locked decision.
- **`straightLineText` moves to `shared/shelter-copy.ts`** — it is a
  pure formatter consumed by two features; the shared copy module is
  the established single-sourced home (M8 convention). The map page
  keeps exporting its geolocation copy exactly as before (mirrored,
  not shared, per W9/W15).
- **Verified already present (no change, pinned in tasks):** walking-
  route link (Navigate + Apple Maps), official-guidance links (footer
  Rescue Board + Maa-amet + the M5 official open-data link), the map
  geolocation CTA, the /submit address search.

## Impact

- Affected specs: map-browse (address-search anchor; distance-from-you).
- Affected code: frontend only — `shared/leaflet-service.ts`
  (`setAnchor`), `shared/shelter-copy.ts` (`straightLineText` moved
  here), `features/map/map-page.{ts,html,scss,spec.ts}`,
  `features/shelter/shelter-detail-page.{ts,html,spec.ts}`,
  `styles.scss` (`.shelter-marker--anchor` tone, reusing the
  `--color-shelter-pick` token — the user-picked-spot family).
- No backend changes. No new endpoint (the D2 "no new endpoint"
  precedent — everything client-side). No IP geolocation (locked).
  No changes to the CTA, the provenance chips, the legend, or the
  Nominatim contract (same gateway, same params, same spacing).
