## Why

User-submitted shelters are published immediately and trustfully: today
there is no way to signal that a shelter does not exist, is closed, or is
full, and no way to surface the shelters the community has already
confirmed. A flood of junk or stale submissions would go straight into the
map and the crisis flow. The app needs a trust layer — reports with
consequences, a community-confirmation filter, and a live "how full" signal
— before submissions can be trusted as a real data source.

## What Changes

- **Typed shelter reports** (verified users only, one report per user per
  shelter per type): `NON_EXISTENT`, `CLOSED`, `OPEN_CONFIRMED`,
  `WRONG_LOCATION`, `OTHER`. Reported shelters get an orange state on map
  and list; `NON_EXISTENT` reports that reach 5 auto-hide the shelter
  (status `INACTIVE`, restorable later only by an admin — the 5th report is
  the only trigger, and manual restores disarm auto-hide).
- **Closed/open counter-reports**: `CLOSED` vs `OPEN_CONFIRMED` net out to
  a display flag ("Reported closed" / "Confirmed open"); they never hide a
  shelter. Schools and daycares that are normally closed but may open in an
  emergency stay visible with the flag.
- **Review reports** (verified users only, one per user per review):
  `FALSY_DATA`, `NOT_RELEVANT`, `SPAM`, `OTHER` (free-text reason). 5
  reports hide the review: it disappears from the list, the average rating,
  the review count, and the "reviewed" filter; only an admin can restore it.
- **Occupancy reports** (verified users only, one live report per user per
  shelter, latest edit wins): bands `SPACE` / `GETTING_FULL` / `FULL`,
  displayed only while fresh (≤ 2 h). One fresh report shows hedged copy
  ("Reported full"); ≥ 2 agreeing fresh reports show "Full". Occupancy is
  display-only — it never hides a shelter and never changes marker colors.
- **Trust filters on the public list** (composable with the existing
  `source` filter): `reviewed=true` (≥ 1 visible review), `minRating=1..5`
  (minimum average, UI select), `hasCapacity=true`.
- **Spam floor**: a user may have at most 10 active shelters (409 above
  that); report endpoints reuse the existing throttle pattern.
- **Frontend**: filter chip row + rating select, orange reported-dot +
  "Reported closed"/"Full" badges in list and detail, "Report" actions on
  the detail page (shelter and per-review), and a "Report how full" band
  picker. `/mine` shows hidden status of the user's own shelters.

## Capabilities

### New Capabilities

- `shelter-reports`: report + occupancy reporting (schema, endpoints,
  auto-actions, thresholds, display derivations, throttling).

### Modified Capabilities

- `shelter-submission`: per-user active-shelter cap (10).
- `map-browse`: extended list query (`reviewed`, `minRating`,
  `hasCapacity`), reported/occupancy presentation in list + markers.
- `shelter-detail-reviews`: hidden reviews excluded from list, average and
  count; report action on review rows.
- `user-contributions`: own-shelters view shows hidden (auto-hidden) state.

## Impact

- Affected specs: `shelter-reports` (new), `shelter-submission`,
  `map-browse`, `shelter-detail-reviews`, `user-contributions`.
- Affected code: backend — Flyway V9 (`shelter_reports`,
  `shelter_occupancy_reports`, `review_reports`, `shelter_reviews.hidden_at`),
  `ShelterController`/services (report + occupancy endpoints, list filter
  params, cap check), `ShelterDto` (report flags, occupancy), review
  service (hidden exclusion, review-report endpoint), throttling.
  Frontend — `features/map/` (chips, select, badges),
  `features/shelter/shelter-detail-page.*` (report + occupancy UI),
  `features/account/contributions-panel.*` (hidden state), API client +
  gateways, specs.
- No breaking API changes: all new query params are optional and default
  to the current behavior.
- Docs sync: `context-and-tasks/agent/` + `frontend/docs/agent/` md packs,
  puml schema/flow diagrams re-rendered after implementation, README.
