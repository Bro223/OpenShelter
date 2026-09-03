# Context — Shelter API (read + write + community reviews)

**Source diagram:** `docs/uml/05-shelter-api.puml` (class diagram + sequence diagram)
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
| `ShelterController` | class | `GET /api/shelters?source=REGISTRY\|USER\|ALL` (public), `GET /api/shelters/{id}` (public), `POST /api/shelters` (Bearer JWT + `canWrite()` check). |
| `ReviewController` | class | `GET /api/shelters/{id}/reviews` (public), `POST /api/shelters/{id}/reviews` (Bearer, verified), `PUT /api/shelters/{id}/reviews/mine` (author only), `DELETE /api/shelters/{id}/reviews/mine` (author only). |
| `ShelterQueryService` | class | `findAll(filter: ShelterSourceFilter): List<ShelterDto>`, `findById(id: Long): Optional<ShelterDto>`. Returns **DTOs only, never entities**. **Hardening:** rating aggregates are computed in ONE batched query (`findRatingAggregates(ids)`) — no N+1. |
| `ShelterReviewService` | class | `addReview(user, shelterId, rating, comment): SaveResult`, `updateReview(user, shelterId, rating, comment): void`, `deleteReview(user, shelterId): void`, `getReviews(shelterId): List<ShelterReviewDto>` (`getRatingSummary` removed in the review-fix pass — no endpoint consumed it; rating aggregates are served via `ShelterDto` + the batched `findRatingAggregates` query). **Hardening:** the find-then-insert upsert is concurrency-safe — a unique-constraint race is caught and retried as an update (no 500). |
| `ShelterDto` | record | `id, name, address, latitude, longitude, status: ShelterStatus, source: ShelterSource, averageRating: Double, reviewCount: int, createdAt: Instant, description: String, capacity: Integer`. **Lean projection** — the full registry record (county, municipality, data-as-of, attribution) stays in the DB but is not dumped to the UI. |
| `CreateShelterRequest` | record | `name, latitude, longitude, description: String, capacity: Integer` (validated at the boundary). **Hardening:** `description`/`capacity` are STORED (V3) — previously validated then silently dropped. |
| `ReviewRequest` | record | `rating: int (1..5), comment: String (≤500)`. |
| `ShelterReviewDto` | record | `id, authorName, rating, comment, createdAt`. |
| `RatingSummaryDto` | record | `average: Double, count: int`. `average` is `null` when there are no reviews — consistent with `ShelterDto.averageRating` (hardening). |
| `ErrorResponse` | record | `timestamp: Instant, status: int, error: String, message: String, path: String`. One uniform shape via `@RestControllerAdvice`. |
| `ShelterSourceFilter` | enum | `REGISTRY, USER, ALL`. Maps to repository query: `REGISTRY` → `{PAASETEAMET, MUNICIPALITY}`, `USER` → `{USER}`, `ALL` → everything. |

## Endpoint semantics (from the puml notes — do not silently change)

- `GET /api/shelters` and `GET /api/shelters/{id}` are **public** — the `VIEW_MAP` baseline in
  always true (an emergency map must be viewable without an account).
- `POST /api/shelters` requires a Bearer JWT; the service checks `user.canWrite()`; shelter is
  saved `status = ACTIVE`, `source = USER`; respond `201 + Location`.
- Reviews require an authenticated, **verified** account (any `VerificationClaim`). Without a
  claim → `403` (not verified). `updateReview`/`deleteReview` are **author-only** — compare
  `review.userId` with the authenticated user; mismatch → `403`.
- One review per user per shelter: `findByShelterIdAndUserId` → existing → update (re-rating),
  else create. Respond 200 (update) / 201 (create).
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
