# Tasks: shelter-trust-and-reports

## Phase 1 — Backend: schema + report/occupancy engine

- [x] Flyway V9: `shelter_reports` (UNIQUE shelter/user/type),
      `shelter_occupancy_reports` (UNIQUE shelter/user), `review_reports`
      (UNIQUE review/user), `shelter_reviews.hidden_at TIMESTAMPTZ NULL`
      (the two review tables are the V9-era review model — `V21__drop_reviews.sql`
      dropped `shelter_reviews` + `review_reports`) —
      FKs CASCADE per D1/D2/D4
- [x] Domain + JPA entities + repository methods for the three new tables
      (count by type, latest occupancy per shelter within window, reviews
      hidden flag — the review-side model is V9-era, dropped by
      `V21__drop_reviews.sql`)
- [x] Shelter report service + `POST /api/shelters/{id}/reports`:
      canWrite gate, 404 unknown shelter, 409 duplicate, auto-hide
      transition (exactly-on-5, disarm after manual status change)
- [x] Occupancy service + `PUT /api/shelters/{id}/occupancy` (upsert,
      canWrite gate) + read-time derivation (2 h window, hedged vs firm,
      agreeing-with-latest rule)
- [x] (V9-era review model — removed by `V21__drop_reviews.sql`) Review report service + `POST /api/shelters/{id}/reviews/
      {reviewId}/reports`: canWrite gate, 403 own review, 409 duplicate,
      5th report sets `hidden_at`; hide exclusion in review list +
      average/count projections
- [x] Report throttle (10/hour rolling, any target/type, 429 standard
      body — reuse the existing throttle pattern/table family)
- [x] `POST /api/shelters` cap: 409 at 10 active USER shelters (ADMIN
      kind exempt)
- [x] `ShelterDto` additions: `nonexistentReports`, `statusFlag`,
      occupancy block — batched in the list/detail projection (no N+1,
      same pattern as `submitterVerified`)
- [x] List endpoint: optional `reviewed`, `minRating` (1..5, 400 on
      invalid), `hasCapacity` applied in the projection (D5); `/mine`
      keeps hidden rows + counts
- [x] Backend tests: ITs for each scenario in the spec (duplicate 409,
      unverified 403, own-review 403, 5th-report hide, no re-hide after
      restore, closed/open net flips, hedge vs firm, 2 h staleness,
      throttle 429, cap 409, filter combinations, hidden review excluded
      from average — the review scenarios in this list are the V9-era review
      model, dropped by `V21__drop_reviews.sql`)

## Phase 2 — Frontend: filters, badges, report UI

- [x] API client + gateway: report/occupancy endpoints, new list params
      (reviewed/minRating — the rating params of the V9-era review model,
      removed by `V21__drop_reviews.sql`; hasCapacity), new DTO fields
- [x] map-page: `Reviewed` + `Has capacity` chips, rating `<select>`
      (Any/1-star-plus…5-star-plus — the Reviewed chip + rating select are
      the V9-era review/rating model, removed by `V21__drop_reviews.sql`),
      composable with source chips; refetch + rebuild
      pattern unchanged
- [x] map-page: orange reported marker + "Reported" row badge
      (`nonexistentReports > 0`), `statusFlag` badges (amber/green),
      neutral occupancy badge with recency; legend gains the orange
      "reported" entry; auto-hidden rows absent
- [x] shelter-detail-page: "Report" (shelter) picker incl. `OTHER` free
      text; per-review "Report" (non-own reviews, verified only) with
      reason + text; own hidden review marked "Hidden" (the per-review parts
      are the V9-era review model — `V21__drop_reviews.sql`); "Report how full"
      three-band picker (48px, pre-selected current band, one-tap upsert)
- [x] contributions-panel: hidden own shelters marked
      "Hidden — reported by the community (n reports)", no restore action
- [x] New `--color-reported` token in styles.scss, contrast-pinned in
      `design-tokens.spec.ts` like its siblings (reuse the CTA hue
      family; distinct from provenance colors)
- [x] Specs: map-page (chips/select/refetch params, badges, orange
      marker, legend), detail-page (report pickers, duplicate 409 copy,
      occupancy picker states, hidden-own-review — the review bits are the
      V9-era model, `V21__drop_reviews.sql`), contributions-panel
      (hidden row), design-tokens pin
- [x] Gate: tsc both configs + full `ng test` + prettier

## Phase 3 — Docs and diagrams sync

- [x] `context-and-tasks/agent/` backend pack: new tables in the schema
      doc, report/occupancy flow in the API/task doc, thresholds +
      auto-hide rule in the context doc
- [x] `frontend/docs/agent/`: filter + badge + report-UI lines in the
      map/shelter context docs
- [x] puml: schema diagram (V9 tables), report flow diagram, list-filter
      flow — re-rendered (PNG + SVG) after implementation
- [x] README: trust layer section (reports, auto-hide, occupancy,
      filters) in plain user terms
- [x] Gate: docs diff reviewed against implemented behavior line by line;
      no git add/commit by implementers
