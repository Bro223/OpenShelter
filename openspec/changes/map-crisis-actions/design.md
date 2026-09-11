# Design: map-crisis-actions

## D1 — One safety-orange CTA, one token

`--color-cta: #e8590c` (safety orange, ≥4.5:1 on white text verified by the
implementer; the palette otherwise stays exactly as-is). Used ONLY for the
"Nearest shelter" button. Everything else keeps the functional blue
(`--color-primary`) — the orange is the crisis affordance and must not
become a general accent.

## D2 — Geolocation locate reuses the submit-page pattern

Same high-accuracy flow, same per-error copy map (denied / timeout /
unsupported / unavailable) as `submit-shelter-page.ts` — extracted or
duplicated per the codebase's existing W9/W15 duplication convention
(documented, not shared across features). Result: nearest shelter computed
client-side from the already-loaded list (Haversine, no new endpoint), map
pans/zooms to it, the matching list row is highlighted (existing row style +
a temporary emphasis class) and the row's "View details" stays the navigator
to the detail page. If the shelter list is empty → "No shelters near you
yet. You can add the first one." (links to /submit for authenticated users).

## D3 — Navigate deep link, no JS library

Detail page: `<a target="_blank" rel="noopener">` (or window.open) to
`https://www.google.com/maps/dir/?api=1&destination=lat,lng&travelmode=walking`
with `&dir_action=navigate` omitted (walking default is fine; the phone opens
its own navigation app choice). Apple fallback link for iOS ("Open in Apple
Maps", `maps://?daddr=lat,lng&q=name`). Both links labeled clearly; no
third-party navigation library.

## D4 — Entry points: CTA + action, no nav item

- Map sidebar (above the list, authenticated users only): an "Add shelter"
  button (ghost style, not orange) → /submit. Unauthenticated users see
  nothing here (login is already in the header).
- contributions-panel: the "Submit a shelter" action renders whenever the
  user is authenticated and verified (the panel is already auth-gated by
  the route), removing the `shelterRows().length === 0` condition on the
  action (the empty-state list text may stay).
- No top-nav item: navigation is for places, not actions (research
  conclusion; the Account page keeps the "Your shelters" section).

## D5 — 48px targets

`.btn` and list-row buttons get `min-height: 48px` (global in styles.scss
where `.btn` lives; row buttons in their component). Existing padding-based
heights that already meet 48px are left alone. No visual redesign of the
buttons beyond the minimum.

## D6 — tabular-nums

`font-variant-numeric: tabular-nums` on the coordinate readout
(submit page) and any place coordinates are rendered (list row distance
numbers if shown; detail page coordinate line). Token-free, one class
`.num-tabular` in styles.scss.
