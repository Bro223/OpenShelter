# Tasks: factual-reports-rating-demotion (M11)

## Slice 1 — Factual report fields (BE)

- [x] `detailFor` stores `detail` for `CLOSED` + `WRONG_LOCATION` (plus
      `OTHER`); `NON_EXISTENT` / `OPEN_CONFIRMED` stay binary; javadocs
      (service, `ShelterReportRequest`, domain `ShelterReport`)
- [x] BE tests: unit — detail stored per type; IT — a CLOSED report's
      detail is visible on the admin report-queue row

## Slice 2 — Rating demotion (BE)

- [x] Remove `minRating`: `ShelterController` (param + 400 helper +
      javadoc), `ShelterQueryService.findAll` / `applyTrustFilters`
      (signature, filter, javadocs), every call site
- [x] BE tests: drop the minRating unit + IT tests; the trust-filter
      compose test loses the param

## Slice 3 — Rating demotion (FE)

- [x] Map: drop the "N★+" select (template, `RATING_FILTERS`,
      `minRating` signal, `setMinRating`, scss) + the gateway param +
      the `TrustFilters.minRating` model field; specs updated
- [x] Report dialog: detail field for `CLOSED` / `WRONG_LOCATION` /
      `OTHER` (per-type label + placeholder, submit validation for the
      new types); specs updated

## Slice 4 — Framing sync + gate

- [x] 06-CONTEXT-API: the list-endpoint row (no `minRating`), the report
      row (factual detail), the report throttles/notes if they mention
      the filter
- [x] 05-shelter-api.puml: the "Community rating IS the moderation" note
      retired to the post-M11 framing; re-render
- [x] Gate both + OpenSpec validate; commit `M11: ...`
