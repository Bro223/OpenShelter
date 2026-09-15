# Tasks: accessibility-and-provenance

## Backend

- [x] ShelterDto + boolean submitterVerified; ShelterQueryService.toDtos
      batch-loads creator verification (one In query); unit + IT tests
      (registry false, user+completed true, user+unverified false, no N+1)
- [x] gates: full `mvn test`

## Frontend

- [x] styles.scss: [data-theme="high-contrast"] token-override block
      (contrast ratios verified) + design-tokens.spec.ts allowance for
      theme values if needed
- [x] index.html: pre-paint theme script; page-shell toggle (aria-pressed,
      persisted); app.ts/theme helper
- [x] shelter type +submitterVerified; provenance badge in list rows +
      detail page (copy per design D4)
- [x] specs: theme (persistence + default), badge copy for all four
      provenance values
- [x] docs sync: frontend/docs/agent (01-TASK theme line, 06-CONTEXT-SHELTER
      badge), context-and-tasks/agent/01-TASK.md DTO line, 05-shelter-api.puml
      (submitterVerified field) + re-render
- [x] gates: tsc both + full ng test + prettier; no git add/commit
