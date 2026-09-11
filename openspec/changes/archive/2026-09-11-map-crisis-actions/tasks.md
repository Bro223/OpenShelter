# Tasks: map-crisis-actions

## Implementation (frontend only, one implementer)

- [x] styles.scss: add `--color-cta` token (safety orange, white-text
      contrast verified) + `.num-tabular` class + 48px min-height rule for
      `.btn` (and row buttons in their components)
- [x] map-page: "Nearest shelter" CTA + geolocation locate (Haversine
      nearest from loaded list, pan/zoom, row emphasis, per-error copy,
      empty-list state) + "Add shelter" sidebar CTA (authenticated only)
- [x] shelter-detail-page: Navigate (Google Maps walking deep link) +
      Apple Maps fallback link
- [x] contributions-panel: "Submit a shelter" action unconditional (keep
      empty-state list text)
- [x] specs: map-page.spec (nearest found / denied / empty / CTA visibility),
      detail-page.spec (navigate links + href shape), contributions-panel
      spec (action visible with shelters present), 48px/tabular assertions
      where testable
- [x] docs sync: frontend/docs/agent/01-TASK.md (tokens + map-page lines),
      06-CONTEXT-SHELTER.md (detail page actions), 02-CONTEXT-MAP.md if the
      page's behavior table changed
- [x] gates: tsc both configs + full `ng test` + prettier; no git add/commit
