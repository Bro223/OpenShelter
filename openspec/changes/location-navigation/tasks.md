# Tasks — location-navigation (M12)

## Slice 0 — Verified already present (no code change)

- [x] Walking-route link: detail page "Navigate" (Google Maps
      walking deep link, `travelmode=walking`) + "Open in Apple Maps"
      (map-crisis-actions D3) — pinned in `shelter-detail-page.spec.ts`
- [x] Official-guidance link: app-wide footer "Official shelter
      information: Rescue Board / Maa-amet" + the M5 official
      open-data link — pinned in `page-shell.spec.ts` (both hrefs
      asserted)
- [x] Geolocation: map CTA "Show shelters around you" (client-side,
      no backend call, consent line) — map-crisis-actions D1/D2
- [x] Address search (capture context): /submit Nominatim search —
      shelter-address-search; `GeocodeGateway` is the only module
      that knows the URL (usage policy: 1 req/s, attribution)
- [x] Never IP geolocation: no IP-based location anywhere in
      `src/main` or `src` (locked decision — re-verified by grep at
      gate time)

## Slice 1 — Map page: address-search anchor (this pass)

- [x] `LeafletService.setAnchor(lat, lng | null)` — one
      non-interactive, NON-draggable marker (class
      `shelter-marker--anchor`, reusing the `--color-shelter-pick`
      tone), on its own field so shelter markers are never cleared;
      null removes it; `destroy()` clears it
- [x] `styles.scss`: `.shelter-marker--anchor` (the user-picked-spot
      family — the searched address, not a shelter)
- [x] `shelter-copy.ts`: `straightLineText` MOVED here from
      `map-page.ts` (pure formatter, now two consumers — the M8
      single-sourced-copy home); `map-page.ts` + its spec import
      from there
- [x] `map-page.ts`: `anchorQuery` / `anchorSearching` /
      `anchorResults` / `anchorError` / `anchor` signals;
      `startAnchorSearch()` (button + Enter; one pending, the
      gateway spaces 1 req/s; 429 → rate-limited copy, other
      failures → network copy, empty → no-results — the
      shelter-address-search state machine, mirrored copy with the
      map page's own trailing alternatives per W9/W15);
      `selectAnchorResult()` (supersedes the nearest emphasis, sets
      the anchor, `setAnchor` + `flyTo` at neighbourhood zoom 14 —
      the anchor is not a shelter; SHELTER_ZOOM 16 would hide the
      surroundings); `clearAnchor()`; `anchorDistance(shelter)`;
      `sorted()` — distance-sorted (name tiebreak) ONLY while an
      anchor is active, stable name sort otherwise
- [x] `map-page.html`: search input + button + ALWAYS-rendered
      attribution line (Nominatim policy) + results `<ul>` (≤5,
      display name + type) + inline error (role=alert for
      rate-limited/network) + the anchor line ("Searched: … ·
      Clear"); row meta gains the per-row straight-line distance
      span (num-tabular) while the anchor is active
- [x] `map-page.scss`: the search block, results list, anchor line,
      row distance span — existing tokens only

## Slice 2 — Detail page: distance from you (this pass)

- [x] `shelter-detail-page.ts`: `distancePending` / `distanceKm` /
      `distanceError` signals + `distanceFromMe()` — the map CTA's
      exact geolocation options + secure-context guard + per-error
      copy (mirrored `NEAREST_COPY` vocabulary, W9/W15 documented
      duplication); on success the straight-line km is stored and
      rendered via `straightLineText` + " from you" (D6 honesty —
      never a route claim)
- [x] `shelter-detail-page.html`: the "Distance from you" action in
      the navigate block (the only geolocation trigger on the page,
      next to the two deep links) + the result line (role=status,
      num-tabular) + the error line (role=alert)
- [x] `shelter-detail-page.scss`: the action + result/error lines
      (existing tokens; NOT the crisis orange)

## Slice 3 — Tests (this pass)

- [x] `leaflet-service.spec.ts`: setAnchor add / move / clear /
      destroy (5)
- [x] `map-page.spec.ts`: address-search describe (8): results
      render from the gateway; select → anchor line + flyTo(14) +
      per-row distances + distance-sorted order; clear → name sort
      restored + pin cleared; no-results / 429 / network inline
      states; Enter while pending ignored; attribution always
      rendered
- [x] `shelter-detail-page.spec.ts`: distance describe (4): success
      line ("≈ … straight line from you", 1-decimal km + whole-m
      below 1 km via the shared formatter), denied → per-error copy,
      unsupported browser, a failed locate leaves no result line
- [x] Existing pins: the straightLineText table now asserts through
      the shared home (map spec import path updated, table intact)

## Slice 4 — Docs sync (this pass)

- [x] `frontend/docs/agent/05-CONTEXT-MAP.md`: MapPage line gains the
      address-search anchor + distance sort; the stale M11 rating-
      select sentence corrected (the select is gone — M11 committed
      without touching this line)
- [x] `frontend/docs/agent/06-CONTEXT-SHELTER.md`: ShelterDetailPage
      line gains the Distance-from-you action
- [x] `frontend/docs/agent/02-CONTEXT-API.md`: the Nominatim
      external-service section now names /map as a second consumer
      (same gateway, same contract)
