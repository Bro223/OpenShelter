# Tasks — shelter-meta-truth (M8)

## Slice 1 — detail header: the two facts as two lines

- [x] `shared/shelter-copy.ts` — `lastVerifiedText` takes `source`;
      registry rows read "Last verified against the registry {ago}",
      community rows keep the plain "Last verified {ago}"; the
      not-yet-verified and no-record lines are unchanged
- [x] `shared/shelter-copy.ts` — `communityReportsText` reads
      "Community reports: N (total, all types)" (labeled lifetime
      total, never a live tally)
- [x] `shelter-detail-page.html` — the "·"-join is removed: two
      separate `<p>` lines (`.shelter-detail__verified` +
      `.shelter-detail__reports`), muted meta styling shared
- [x] spec pins: `shelter-copy.spec.ts` (new copy + source-aware
      variants), `shelter-detail-page.spec.ts` (two-line rendering,
      no splicing, community-row plain form)

## Slice 2 — dampening is visible, not silent

- [x] `shared/shelter-copy.ts` — `REPORT_SUBMITTED_DAMPED` says the
      report was recorded but WEIGHTED 0, why (own similar listing)
      and the consequence (does not count toward hiding the shelter)
- [x] spec pins: `shelter-copy.spec.ts`, the dampened-notice test in
      `shelter-detail-page.spec.ts`
- [x] backend untouched — the `{"damped": true|false}` response and
      the D3 rule are as contracted; no openapi.json regeneration

## Slice 3 — origin marker + legend

- [x] `shared/leaflet-service.ts` — `setAnchor` pin is a 12 px diamond
      (was a 14 px circle); `renderShelters` markers carry
      `zIndexOffset: 1000` so shelters always draw above the origin
      pin (both orderings covered)
- [x] `styles.scss` — `.shelter-marker--anchor`: diamond (rotate 45°,
      radius 2px) in the user-picked-spot teal; shape, not colour
      alone
- [x] `map-page.html` — legend gains the origin entry (same marker
      class as swatch; label reuses the existing `map.searched` key —
      dedicated `map.legend.anchor` key requested from the i18n lane:
      EN "Searched address" / ET "Otsitud aadress" / RU
      "Найденный адрес")
- [x] specs: `leaflet-service.spec.ts` (12 px size pin, z-order above
      the co-located shelter in both render orderings),
      `map-page.spec.ts` (five-entry legend with the anchor swatch)

## Slice 4 — distance rule documented

- [x] `frontend/docs/agent/05-CONTEXT-MAP.md` — new "Distance
      numbers" section: the two points (origin = geolocation fix or
      geocoded address; shelter = stored WGS84 coordinates), the
      formula (Haversine, r = 6371 km, `shared/geolocation.ts`,
      client-side only), the zooms (number is zoom-independent;
      origin camera 14, shelter selection 16), the meaning
      (straight-line approximation — never a route, never official)
- [x] `map-page.ts` — the `MapPage` doc comment carries the same
      section (cross-referenced to the doc) and `nearestShelterAt`
      points at it; the doc's legend entry count updated to five

## Slice 5 — verification (parent-owned commit)

- [x] `npx ng test --watch=false` + `npx ng build` green on the
      combined tree (at lane completion the shared tree was red from
      another lane's in-flight i18n WIP — messages.ts keys without
      et/ru values; verified green in an isolated copy of the tree
      with that WIP's stubs filled) — VERIFIED 2026-09-24 on the
      combined tree at HEAD: the i18n WIP landed (2026-09-23-i18n-ru
      archived, et/ru values in place) and a local re-run is green —
      `ng test` 1562/1562 over 65 files, production build exit 0
- [x] backend `mvn test` NOT required — no backend copy, DTO, or
      endpoint changed (verified: the change is FE copy + markers +
      docs + specs only)
