# Design: remove-shelter-reviews

## Context

Reviews were a v1 feature (introduced by the archived
`frontend-m5-shelter-reviews` change, hardened by V8, extended by V11):
`shelter_reviews` (stars 1-5 + comment, one per user per shelter) with
`shelter_reports`-style per-review reports in `review_reports`, an admin
review-report queue, and a `minRating` list filter. V21 drops all of it:
the tables, the admin audit actions (`REVIEW_HIDE`/`REVIEW_RESTORE`) and
the `REVIEW_REPORT` throttle rows. What replaces it as the community
moderation channel is the shelter REPORT system (`shelter_reports` +
occupancy + open status), which this change leaves untouched.

The detail page itself survives: it keeps the shelter identity block, the
location map, the description/capacity section for community rows, the
occupancy and open-status report sections, and the derived display-status
info block that took the place of the old Reviews section.

## Decisions

- **D1 - The removal is recorded as a completed, archived change, not an
  open one.** Every requirement in this change is already satisfied by
  shipped code (V21 is applied; the surfaces are gone). Repo convention is
  that in-flight changes carry spec deltas and the main specs sync at
  archive time (`remove-national-id` design D5), so recording this as a
  long-lived in-flight change would reproduce exactly the drift being
  fixed: a spec tree that describes the removed feature as current.

- **D2 - The review/rating requirements are REMOVED, not rewritten.**
  There is nothing left to describe: no table, no endpoint, no DTO, no UI.
  A "modified" review requirement would only invent a replacement product
  decision.

- **D3 - The surviving detail-page requirement is MODIFIED in place.** It
  loses the rating summary, the review list and the "no reviews" scenario,
  and keeps the public route, the description/capacity scope for community
  submissions, the not-found state and the loading/error states. It stays
  in the `shelter-detail-reviews` capability path because moving it to a
  new capability is a directory rename (delete + create) that this worker
  cannot perform without shell access; the residual rename is recorded as
  an unchecked task (`git mv openspec/specs/shelter-detail-reviews
  openspec/specs/shelter-detail`) rather than silently left implicit.

- **D4 - The admin review-report surface belongs to the removal too.** V21
  erases the `REVIEW_HIDE`/`REVIEW_RESTORE` audit rows and the
  `REVIEW_REPORT` throttle rows precisely because the `Action` enum values
  are gone (an unknown value would break `/admin/audit` loading), and
  `AdminController` exposes no review-report routes. The in-flight
  `admin-moderation` delta that still requires that queue is therefore
  stale, but it is another change's artifact: this change reports it
  instead of editing it.

- **D5 - Reporting, occupancy and the shelter review-state stay.** The
  word "review" survives in this project in two unrelated senses: the
  admin/community shelter review-status (`reviewStatus`, `review_note`,
  `POST /admin/shelters/{id}/review`) and code review. Neither is touched
  by V21, and neither is touched here - only the shelter review/rating
  model is.

## Consequences

- A reader of `openspec/specs/` no longer sees any promise of shelter
  reviews or star ratings, while the detail page, the map browse, the
  account/contributions and the polish requirements stay covered.
- Two follow-ups need a shell (unavailable to this worker): the
  capability rename in D3, and `openspec validate --all`.
- Known remaining spec-drift backlog, reported not fixed:
  `admin-moderation`'s delta (D4), `admin-page.ts`'s stale tab docs, and
  the pre-existing unsynced deltas (`remove-national-id`).
