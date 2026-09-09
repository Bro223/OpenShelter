# Context — Shelter API (read + write + community reviews)

**Source diagram:** `../05-shelter-api.puml` (class diagram + sequence diagram)
**Used by steps:** 6 (create).
**Depends on contracts from:** `app.ShelterService`, `app.ShelterRepository`,
`app.ShelterReviewRepository`, `domain.Shelter`, `domain.ShelterReview`, `domain.RegisteredUser`.

## Purpose

The HTTP layer the frontend (Vue/Angular) talks to: read shelters, submit shelters, rate and
comment on shelters. **Controllers are thin shells** — parse, validate, delegate, map. All logic
lives in the services.

## Classes to create (all in `ee.sheltermap.api`)

| Type | Kind | Key members / notes |
|---|---|---|
| `ShelterController` | class | `GET /api/shelters?source=REGISTRY\|USER\|ALL` (public), `GET /api/shelters/{id}` (public), `POST /api/shelters` (Bearer JWT + `canWrite()` check). **M8 (user-contributions):** `GET /api/shelters/mine` (Bearer JWT — the caller's own shelters; NOT part of the public GETs), `PUT /api/shelters/{id}` (author-only update of the five writable fields), `DELETE /api/shelters/{id}` (author-only; reviews cascade via the DB). |
| `ReviewController` | class | `GET /api/shelters/{id}/reviews` (public), `POST /api/shelters/{id}/reviews` (Bearer, verified), `PUT /api/shelters/{id}/reviews/mine` (author only), `DELETE /api/shelters/{id}/reviews/mine` (author only). |
| `ShelterQueryService` | class | `findAll(filter: ShelterSourceFilter): List<ShelterDto>`, `findById(id: Long): Optional<ShelterDto>`, `findByCreatedBy(userId: long): List<ShelterDto>` (M8 — the author-scoped list, same lean DTO projection). Returns **DTOs only, never entities**. **Hardening:** rating aggregates are computed in ONE batched query (`findRatingAggregates(ids)`) — no N+1. |
| `ShelterReviewService` | class | `addReview(user, shelterId, rating, comment): SaveResult` (`(review, created)` — the upsert outcome the controller maps to 200/201), `updateReview(user, shelterId, rating, comment): ShelterReview`, `deleteReview(user, shelterId): void`, `getReviews(shelterId): List<ShelterReviewDto>` (`getRatingSummary` removed in the review-fix pass — no endpoint consumed it; rating aggregates are served via `ShelterDto` + the batched `findRatingAggregates` query; the `RatingSummaryDto` record was deleted in the 2026-09-08 campaign). **Hardening:** the find-then-insert upsert is concurrency-safe — a unique-constraint race is caught and retried as an update (no 500). |
| `ShelterDto` | record | `id, name, address, latitude, longitude, status: ShelterStatus, source: ShelterSource, averageRating: Double, reviewCount: int, createdAt: Instant, description: String, capacity: Integer`. **Lean projection** — the full registry record (county, municipality, data-as-of, attribution) stays in the DB but is not dumped to the UI. |
| `CreateShelterRequest` | record | `name, latitude, longitude, description: String, capacity: Integer` (validated at the boundary). **Hardening:** `description`/`capacity` are STORED (V3) — previously validated then silently dropped. |
| `UpdateShelterRequest` | record | M8: `name, latitude, longitude, description: String, capacity: Integer` — constraints **field-for-field identical** to `CreateShelterRequest`; the bbox gate is a small helper shared with `POST` so create/update cannot drift. Only these five fields are writable on an existing shelter (`status`/`source`/registry fields/`createdAt`/`createdBy` are never). |
| `MyReviewDto` | record | M8 (on `AccountController`, the `/account` group): `shelterId: long, shelterName: String, rating: int, comment: String, createdAt: Instant, updatedAt: Instant` — the caller's review of a shelter with the shelter's id + name for navigation. Shelter names resolve in ONE batched `findByIds` query (no N+1, mirroring the review list's batched author lookup); a review whose shelter was deleted cannot occur (shelter deletion cascades). |
| `ReviewRequest` | record | `rating: int (1..5), comment: String (≤500)`. |
| `ShelterReviewDto` | record | `id, authorName, rating, comment, createdAt`. |
| `ErrorResponse` | record | `timestamp: Instant, status: int, error: String, message: String, path: String`. One uniform shape via `@RestControllerAdvice`. |
| `ShelterSourceFilter` | enum | `REGISTRY, USER, ALL`. Maps to repository query: `REGISTRY` → `{PAASETEAMET, MUNICIPALITY}`, `USER` → `{USER}`, `ALL` → everything. |

## Endpoint semantics (from the puml notes — do not silently change)

- `GET /api/shelters` and `GET /api/shelters/{id}` are **public** — the `VIEW_MAP` baseline in
  always true (an emergency map must be viewable without an account).
- `POST /api/shelters` requires a Bearer JWT; the service checks `user.canWrite()`; shelter is
  saved `status = ACTIVE`, `source = USER`, `created_by = the submitting user` (V7); respond
  `201 + Location`.
- **Author-scoped shelters (M8):** `GET /api/shelters/mine` (Bearer JWT) returns only the
  caller's USER-source shelters. `PUT/DELETE /api/shelters/{id}` resolve the shelter (404 if
  absent), then `source == USER && createdBy != null && createdBy == me` (else **403** — via
  the existing `NotAuthorException` → `ApiErrorHandler` 403 mapping; registry rows and legacy
  `created_by`-NULL rows are unmanageable by anyone; shelter ids are public, so 403-vs-404
  leaks nothing). PUT re-checks the Estonia bbox (400) via the helper shared with POST, then
  replaces the five writable fields and returns the updated `ShelterDto` (200). DELETE answers
  204; the shelter's reviews cascade via the DB `ON DELETE CASCADE`. Note: `JpaShelterRepository
  .deleteById` flushes after the delete so the cascade is visible to in-transaction reads
  (the IT suite asserts it inside one transaction).
- Reviews require an authenticated, **verified** account (any `VerificationClaim`). Without a
  claim → `403` (not verified). `updateReview`/`deleteReview` are **author-only** — compare
  `review.userId` with the authenticated user; mismatch → `403`.
- One review per user per shelter: `findByShelterIdAndUserId` → existing → update (re-rating),
  else create. Respond 200 (update) / 201 (create).
- `GET /account/reviews/mine` (M8, on the `/account` group — a cross-shelter list has no
  per-shelter parent) returns the caller's reviews across ALL shelters as `MyReviewDto[]`
  (shelter names batched — no N+1); empty list when the user has no reviews.
- `ErrorResponse` for 400 (validation), 401 (unauthenticated), 403 (not verified / not author),
  404 (shelter not found), 429 (rate limited).

## Design decisions

1. **Community rating IS the moderation** — no moderator role anywhere in the system. Aggregates
   (`averageRating`, `reviewCount`) are computed in **one batched query per listing** (no N+1);
   denormalize onto `Shelter` or Redis-cache when traffic grows (SDI Ch 6).
2. **Deferred (documented, not built):** `GET /api/shelters/nearest` + bbox queries need
   `GeoService` + PostGIS GIST index; paging (limit/offset) — Estonia-scale data is small.
   Add notes/`TODO` in the controller, do not implement.
3. **DTO records are the versioned contract with the frontend** — the only thing the API dev and
   the frontend dev must agree on.

## Testing notes

- `ShelterQueryService`: filter mapping (REGISTRY/USER/ALL → source sets), DTO mapping never leaks
  the entity, `findById` → empty when missing.
- `ShelterReviewService`: verified user can add; unverified → 403; duplicate (shelterId, userId)
  updates instead of inserting; non-author update/delete → 403; rating bounds 1..5; comment ≤ 500.
- Controller tests (MockMvc): public GETs anonymous OK; POST without token → 401; POST with token
  but unverified → 403; error shape is always `ErrorResponse`.
- M8 (in `ShelterApiIT` + `ShelterServiceTest` + `ShelterRepositoryIT`): `addPlace` records the
  author; `GET /mine` returns only own shelters (multi-user); PUT by author updates the five
  fields (createdAt/status/source untouched) and bbox violation → 400; PUT by non-author /
  registry row / legacy row → 403 + unchanged; PUT on missing id → 404; DELETE by author removes
  the shelter + its reviews (cascade); DELETE by non-author → 403 + untouched; `GET
  /account/reviews/mine` lists only own reviews with batched shelter names, `[]` when none.
