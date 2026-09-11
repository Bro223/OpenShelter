# Tasks: map-crisis-actions

## Implementation (frontend only, one implementer)

- [ ] styles.scss: add `--color-cta` token (safety orange, white-text
      contrast verified) + `.num-tabular` class + 48px min-height rule for
      `.btn` (and row buttons in their components)
- [ ] map-page: "Nearest shelter" CTA + geolocation locate (Haversine
      nearest from loaded list, pan/zoom, row emphasis, per-error copy,
      empty-list state) + "Add shelter" sidebar CTA (authenticated only)
- [ ] shelter-detail-page: Navigate (Google Maps walking deep link) +
      Apple Maps fallback link
- [ ] contributions-panel: "Submit a shelter" action unconditional (keep
      empty-state list text)
- [ ] specs: map-page.spec (nearest found / denied / empty / CTA visibility),
      detail-page.spec (navigate links + href shape), contributions-panel
      spec (action visible with shelters present), 48px/tabular assertions
      where testable
- [ ] docs sync: frontend/docs/agent/01-TASK.md (tokens + map-page lines),
      06-CONTEXT-SHELTER.md (detail page actions), 02-CONTEXT-MAP.md if the
      page's behavior table changed
- [ ] gates: tsc both configs + full `ng test` + prettier; no git add/commit
