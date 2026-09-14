# Change: remove-shelter-reviews

## Why

The owner removed the community review and star-rating model: V21 drops
`shelter_reviews` and `review_reports`, the backend carries no review
endpoint or field (`src/main/java` has zero `reviews` references), and the
detail page documents the model as gone (`shelter-detail-page.ts:100`).
The community moderation channel is the shelter REPORT system
(`shelter_reports`, V9), which stays.

The removal shipped, but the OpenSpec record did not: no change directory
(current or archive) documented it, `openspec/specs/shelter-detail-reviews/`
still described the removed feature as current, and three other current
specs still pinned review/rating behaviour (`map-browse` row rating
summary + "no ratings" scenario, `app-polish` happy-path journey and
README-scope requirement, `user-contributions` cross-shelter "my reviews"
listing and review cascade). Specs are declared the source of truth, so
the drift is a correctness problem, not a cosmetic one.

## What Changes

- **Record the removal**: this change directory (proposal / design / tasks
  / spec deltas) is the missing trace of the V21 removal.
- **Sync the current specs** (performed as part of this change, because
  every requirement here is already satisfied by shipped code):
  - `shelter-detail-reviews` — the four review/rating requirements are
    REMOVED (community review list, review upsert, review delete, rating
    presentation); the surviving `Shelter detail page` requirement is
    MODIFIED to drop the rating summary and the review list.
  - `map-browse` — `Load and render shelters` drops "its rating summary";
    the `Shelter has no ratings` scenario goes with it.
  - `app-polish` — the happy-path journey ends at "submit" (there is no
    review step); the documentation requirement stops calling the
    per-shelter `reviews/mine` endpoint a deferral and
    `GET /account/reviews/mine` a shipped feature.
  - `user-contributions` — the cross-shelter "my reviews" requirement is
    REMOVED; the shelter-delete requirement drops the review cascade; the
    contributions panel is shelters-only.
- **No code changes**: the code is already the post-V21 state; this
  change is spec/record truth only.

## Impact

- Specs: `openspec/specs/shelter-detail-reviews` (content replaced),
  `openspec/specs/map-browse`, `openspec/specs/app-polish`,
  `openspec/specs/user-contributions`; the deltas live in this change
  directory.
- Evidence: `src/main/resources/db/migration/V21__drop_reviews.sql`
  (audit-row erasure + both table drops), `AdminController` (no
  review-report routes), `shelter-detail-page.ts:100-104` (no review
  list/form; the practical info block replaces the Reviews section).
- Reported, deliberately out of scope (still stale, each its own change):
  `openspec/changes/admin-moderation/specs/admin-moderation/spec.md`
  still requires the removed admin review-report queue and review counts;
  `frontend/src/app/features/admin/admin-page.ts` still documents a
  "REVIEW REPORTS" tab and "seven tabs"; `remove-national-id` still
  carries an unsynced `account-profile` delta (same repo-wide pattern).
