## Why

M5 delivers the write side of the product on top of M4's public browse: per-shelter detail with
community reviews, and verified-user shelter submission. Today `/shelters/:id` is an M4 stub and
users can read but not contribute. The backend contract is complete and green (216 tests) — this
change is frontend-only, mirroring the same milestone discipline M1–M4 used.

## What Changes

- `ShelterPlaceholderPage` (M4 stub) is replaced by the real public `ShelterDetailPage` at
  `/shelters/:id`: shelter header + rating summary + description/capacity (USER rows) + the
  community review list.
- New `ReviewGateway` (`gateways/`): list/add/update-mine/delete-mine against the review API.
- Reviews for verified users: one per user per shelter, backend **upserts** (POST → 201 new /
  200 updated); `PUT /mine` and `DELETE /mine` are author-only, server-enforced.
- "My review" UX branches by session state: anonymous → login prompt with `returnUrl`;
  unverified → verify banner + link; verified → `RatingStars` picker + `ReviewForm`
  (1–5 stars, comment ≤ 500 chars).
- New public `SubmitShelterPage` at `/submit` (AuthGuard + new `VerifiedGuard`): name,
  description, capacity, and a location picked on a mini map (LeafletService reuse) with a
  client-side Estonia bbox pre-check; on 201 → navigate to the new shelter's detail.
- Refetch shelter after any review/submit write so the rating summary stays consistent.

## Capabilities

### New Capabilities

- `shelter-detail-reviews`: the public detail view of one shelter and the community review
  surface — reading a shelter + its reviews, and adding/updating/deleting your own review with
  auth/verification gating and backend upsert semantics.
- `shelter-submission`: verified-user creation of a community shelter — the `/submit` form with
  Estonia-bounded location, description/capacity, and post-create navigation to the detail page.

### Modified Capabilities

## Impact

- `frontend/src/app/gateways/review-gateway.ts` (+ spec) — new; follows `ShelterGateway`.
- `frontend/src/app/features/shelter/shelter-detail-page.{ts,html,scss}` (+ spec) — replaces the
  M4 placeholder at the same route.
- `frontend/src/app/features/shelter/submit-shelter-page.{ts,html,scss}` (+ spec) — new;
  reuses `LeafletService` for the mini-map location pick.
- `frontend/src/app/features/shelter/rating-stars.{ts,html,scss}` (+ spec), `review-form` (+ spec).
- `frontend/src/app/core/guards.ts` — adds `VerifiedGuard` (mirrors backend 403 semantics).
- `frontend/src/app/app.routes.ts` — `/shelters/:id` now the real detail page; add `/submit`.
- AuthStore already exposes `authenticated()/isVerified()/levels()` — no store change expected.
- No backend changes. No puml contract changes expected; puml/docs stay in sync if a deviation
  surfaces (report rather than silently drift).
