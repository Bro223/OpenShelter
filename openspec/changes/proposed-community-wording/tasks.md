# Tasks — proposed-community-wording (M7)

## Slice 1 — Copy rename (FE, single-sourced)

- [x] `shelter-copy.ts` — `provenanceText`: UNDER_REVIEW → "Proposed",
      COMMUNITY_REPORTED → "Community-reported"; doc comments updated
- [x] `map-page.html` — legend amber entry "New community" → "Proposed";
      subtitle "community-submitted" → "community-reported"
- [x] `map-page.ts` — UNDER_REVIEW chip label "New community" →
      "Proposed"
- [x] `submit-shelter-page.html` (+ .ts comment) — success copy:
      "marked as newly added" → "marked as proposed"
- [x] Comment-only refresh: `contributions-panel.html`,
      `admin-page.html`, `shelter-detail-page.html`, `models.ts`

## Slice 2 — Spec pins

- [x] `shelter-copy.spec.ts` — the two label pins
- [x] `map-page.spec.ts` — badge/legend/chip assertions + subtitle
- [x] `shelter-detail-page.spec.ts` — header badge assertions
- [x] `contributions-panel.spec.ts` — /mine badge assertions
- [x] `submit-shelter-page.spec.ts` — success-copy pin
- [x] `design-tokens.spec.ts` — comment pin

## Slice 3 — Docs

- [x] `frontend/docs/agent/05-CONTEXT-MAP.md` — MapPage row: chip list +
      legend list "New community" → "Proposed"

## Slice 4 — Gates

- [x] Gates green: FE `ng test` (full), BE `mvn -q test` (tree health —
      BE untouched)
