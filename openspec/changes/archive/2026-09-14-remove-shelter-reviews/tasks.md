# Tasks: remove-shelter-reviews

## Phase 1 — Removal (shipped in V21)

- [x] V21 `drop_reviews`: `DELETE` the legacy `REVIEW_HIDE` /
      `REVIEW_RESTORE` moderation-audit rows and the `REVIEW_REPORT`
      throttle rows, then `DROP TABLE review_reports` and
      `DROP TABLE shelter_reviews` in FK order —
      `src/main/resources/db/migration/V21__drop_reviews.sql`
- [x] Backend purge: no `reviews` reference remains under
      `src/main/java`; `AdminController` exposes no review-report,
      review-hide or review-restore route (its full mapping list: shelters
      list/status/delete/history/request-info/mark-inaccurate/
      clear-inaccurate/review, audit, alerts, reports, reports dismiss,
      users, suspend, unsuspend)
- [x] Frontend purge: the detail page renders no review list, no review
      form and no per-review report; the old Reviews section is replaced
      by the practical info block (`shelter-detail-page.ts:100-104`)
- [x] Admin UI: the tab set is `unconfirmed | shelters | reports | alerts
      | users | audit` — no review-report tab (`admin-page.ts:50`)

## Phase 2 — OpenSpec record (this change)

- [x] Deltas written for the four affected capabilities (this directory):
      `shelter-detail-reviews`, `map-browse`, `app-polish`,
      `user-contributions`
- [x] Current specs synced from those deltas: removed the review/rating
      requirements, reworded the detail-page requirement, dropped the map
      row's rating summary + "no ratings" scenario, fixed the polish
      journey and README-scope wording, dropped the contributions
      review half
- [x] Evidence cited in the deltas (V21 migration, the code surfaces)

## Phase 3 — Validation (needs a shell this worker does not have)

- [ ] `openspec validate --all` — NOT RUN here; must pass (previously
      27/27)
- [ ] `git mv openspec/specs/shelter-detail-reviews
      openspec/specs/shelter-detail` — the surviving requirement is the
      detail page; the capability name still says "reviews"

## Phase 4 — Reported, out of scope for this change

- [ ] `openspec/changes/admin-moderation/specs/admin-moderation/spec.md`
      still requires the removed admin review-report queue
      (`GET /admin/review-reports`,
      `POST /admin/reviews/{id}/hide|restore`, the Review-reports tab),
      review counts in `GET /admin/shelters`, and the review cascade in
      the hard delete — all removed by V21
- [ ] `frontend/src/app/features/admin/admin-page.ts` (lines 47-50, 106,
      122-124, 332) still documents a "REVIEW REPORTS" tab and "seven
      moderation tabs" that no longer exist
