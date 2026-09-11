# Context — Shelter API (read + write + community reviews)

**Source diagram:** `../05-shelter-api.puml` (class diagram + sequence diagram)
**Used by steps:** 6 (create).
**Depends on contracts from:** `app.ShelterService`, `app.ShelterRepository`,
`app.ShelterReviewRepository`, `domain.Shelter`, `domain.ShelterReview`, `domain.RegisteredUser`,
plus the V9 trust seams (`app.ShelterReportService`, `app.ShelterReportRepository`,
`app.ShelterOccupancyRepository`, `app.ReviewReportRepository`, `app.ReportActionLog`).

## Purpose

The HTTP layer the frontend (Vue/Angular) talks to: read shelters, submit shelters, rate and
comment on shelters. **Controllers are thin shells** — parse, validate, delegate, map. All logic
lives in the services.

## Classes to create (all in `ee.sheltermap.api`)

| Type                     | Kind   | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterController`      | class  | `GET /api/shelters?source=REGISTRY\|USER\|ALL` (public — **ACTIVE rows only**, auto-hidden shelters are absent; V9 optional trust filters `reviewed`, `minRating` 1..5, `hasCapacity` — anything outside 1..5 → 400), `GET /api/shelters/{id}` (public — **all statuses**, incl. auto-hidden; the detail read additionally carries `yourOccupancyBand`), `POST /api/shelters` (Bearer JWT + `canWrite()` check; **409 when the caller already has 10 ACTIVE USER shelters** — deletions and auto-hidden rows free the cap, ADMIN kind exempt). **M8 (user-contributions):** `GET /api/shelters/mine` (Bearer JWT — the caller's own shelters, **all statuses** incl. auto-hidden; NOT part of the public GETs), `PUT /api/shelters/{id}` (author-only update of the five writable fields), `DELETE /api/shelters/{id}` (author-only; reviews cascade via the DB). **V9 (shelter-trust-and-reports):** `POST /api/shelters/{id}/reports` (Bearer + verified — typed shelter report, 204; 404 unknown shelter, 409 duplicate (shelter, user, type), 429 report throttle) and `PUT /api/shelters/{id}/occupancy` (Bearer + verified — the caller's live band, 204 upsert; 404 unknown shelter, 429 report throttle; no 409, a re-send IS the update). |
| `ReviewController`       | class  | `GET /api/shelters/{id}/reviews` (public — hidden reviews excluded for everyone except the author, who gets their own marked `hidden`), `POST /api/shelters/{id}/reviews` (Bearer, verified), `PUT /api/shelters/{id}/reviews/mine` (author only), `DELETE /api/shelters/{id}/reviews/mine` (author only). **V9:** `POST /api/shelters/{id}/reviews/{reviewId}/reports` (Bearer + verified — 204; 403 the caller's own review, 404 unknown review or a review not of this shelter, 409 duplicate (review, user), 429 report throttle). |
| `ShelterQueryService`    | class  | `findAll(source: ShelterSourceFilter, reviewed: Boolean, minRating: Integer, hasCapacity: Boolean): List<ShelterDto>` — the PUBLIC list: `status = ACTIVE` rows only (auto-hidden shelters disappear), the trust filters applied **in-memory over the projection** (no new SQL surface), `GET /api/shelters/{id}`'s `findById(id: Long, caller: User): Optional<ShelterDto>` (all statuses; the single-shelter read carries `yourOccupancyBand` — null for guests, anonymous callers and callers without a report), `findByCreatedBy(userId: long): List<ShelterDto>` (M8 — the author-scoped list, **all statuses**, same lean DTO projection). Returns **DTOs only, never entities**. **Hardening:** rating aggregates are computed in ONE batched query (`findRatingAggregates(ids)`, visible reviews only — V9). **V9:** the trust derivations ride the SAME batched pass (no N+1) — per-shelter report counts by type (ONE query), fresh occupancy rows for the whole batch (ONE query, the 2 h window applied in SQL), then in-memory: `nonexistentReports` (0 when none), the `statusFlag` net, and the occupancy block (latest fresh band wins, agreeing count, newest timestamp). |
| `ShelterReviewService`   | class  | `addReview(user, shelterId, rating, comment): SaveResult` (`(review, created)` — the upsert outcome the controller maps to 200/201), `updateReview(user, shelterId, rating, comment): ShelterReview`, `deleteReview(user, shelterId): void`, `getReviews(shelterId, caller): List<ShelterReviewDto>` (`getRatingSummary` removed in the review-fix pass — no endpoint consumed it; rating aggregates are served via `ShelterDto` + the batched `findRatingAggregates` query; the `RatingSummaryDto` record was deleted in the 2026-09-08 campaign). **V9:** `reportReview(caller, shelterId, reviewId, reason, detail): void` — verified-only (403 "Reviews require a verified account"), 404 unknown shelter or unknown/mismatched review, **403 the caller's own review** (`OwnReviewReportException` — own content is edited or deleted, not reported), 409 duplicate (checked BEFORE the throttle budget is consumed), 429 throttle; the 5th report sets `hiddenAt` (once, never cleared automatically; hiding never deletes the row). **Hardening:** the find-then-insert upsert is concurrency-safe — a unique-constraint race is caught and retried as an update (no 500). |
| `ShelterDto`             | record | `id, name, address, latitude, longitude, status: ShelterStatus, source: ShelterSource, averageRating: Double, reviewCount: int, createdAt: Instant, description: String, capacity: Integer, submitterVerified: boolean` (accessibility-and-provenance D3), **`nonexistentReports: int` (V9 — 0 when none; `> 0` is the UI's orange "Reported" affordance), `statusFlag: ShelterStatusFlag` (V9 — `REPORTED_CLOSED`/`CONFIRMED_OPEN`/null, display-only), `occupancy: Occupancy` (V9 — the fresh ≤ 2 h block, `null` when nothing fresh), `yourOccupancyBand: OccupancyBand` (V9 — the CALLER's own live band; detail read only, null for guests/anonymous/no report)**; nested record `Occupancy(band, reportCount, lastReportedAt)` — `reportCount` 1 = hedged copy, 2+ = firm. **Lean projection** — the full registry record (county, municipality, data-as-of, attribution) stays in the DB but is not dumped to the UI. All V9 derivations are computed server-side in the batched projection — never client-computed from raw report lists. |
| `CreateShelterRequest`   | record | `name, latitude, longitude, description: String, capacity: Integer` (validated at the boundary). **Hardening:** `description`/`capacity` are STORED (V3) — previously validated then silently dropped.                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `UpdateShelterRequest`   | record | M8: `name, latitude, longitude, description: String, capacity: Integer` — constraints **field-for-field identical** to `CreateShelterRequest`; the bbox gate is a small helper shared with `POST` so create/update cannot drift. Only these five fields are writable on an existing shelter (`status`/`source`/registry fields/`createdAt`/`createdBy` are never).                                                                                                                                                                                                                                                                                                                 |
| `MyReviewDto`            | record | M8 (on `AccountController`, the `/account` group): `shelterId: long, shelterName: String, rating: int, comment: String, createdAt: Instant, updatedAt: Instant` — the caller's review of a shelter with the shelter's id + name for navigation. Shelter names resolve in ONE batched `findByIds` query (no N+1, mirroring the review list's batched author lookup); a review whose shelter was deleted cannot occur (shelter deletion cascades).                                                                                                                                                                                                                                   |
| `ReviewRequest`          | record | `rating: int (1..5), comment: String (≤500)`. |
| `ShelterReportRequest`   | record | V9: `type: ShelterReportType (@NotNull), detail: String (@Size(max = 500))` — `detail` is the free text of `OTHER` reports; accepted for any type, stored only for `OTHER` (otherwise ignored). |
| `ReviewReportRequest`    | record | V9: `reason: ReviewReportReason (@NotNull), detail: String (@Size(max = 500))` — same free-text-for-`OTHER` rule. |
| `OccupancyReportRequest` | record | V9: `band: OccupancyBand (@NotNull)` — one live report per user per shelter (upsert; latest band wins, `updated_at` refreshed). |
| `ShelterReviewDto`       | record | `id, authorName, rating, comment, createdAt, hidden: boolean` (V9 — `true` marks a community-hidden review; hidden rows are NEVER returned to non-authors, only the author receives their own, with this flag, to mark it). |
| `ErrorResponse`          | record | `timestamp: Instant, status: int, error: String, message: String, path: String`. One uniform shape via `@RestControllerAdvice`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `ShelterSourceFilter`    | enum   | `REGISTRY, USER, ALL`. Maps to repository query: `REGISTRY` → `{PAASETEAMET, MUNICIPALITY}`, `USER` → `{USER}`, `ALL` → everything.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `LocationController`     | class  | shelter-location-input: `POST /api/geo/resolve` (Bearer JWT — inside the authenticated set, NOT permitAll) + per-IP token bucket 5/min (keys via `ClientIps`, same pattern as the auth endpoints). Thin shell: parse, validate, delegate to `app.LocationResolveService`, map the outcome.                                                                                                                                                                                                                                                                                                                                                                                         |
| `LocationResolveRequest` | record | `url: String` (`@NotBlank @Size(max = 2048)`) — a `maps.app.goo.gl` short link (host whitelist enforced service-side; anything else is the generic 400).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `LocationResolvedDto`    | record | `latitude: double, longitude: double` — field names are the contract with the frontend's `LocationResolved` model (do not rename).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**V9 trust seams** (defined in the `app`/`persistence` packages — contracts only here, the
location-resolution style):

| Type                   | Kind   | Key members / notes |
| ---------------------- | ------ | ------------------- |
| `ShelterReportService` | class (app) | V9: `reportShelter(user, shelterId, type, detail): void` and `reportOccupancy(user, shelterId, band): void`. Every write requires a verified registered user (the same `canWrite()` gate as submissions — 403 "Reporting requires a verified account") and a known shelter (404). Shelter reports pass the per-target unique bound (409 on a repeat (shelter, user, type) **BEFORE any throttle budget is consumed**, mirroring the verification already-verified guard); a lost race on the unique constraint maps to the same 409. On the insert that brings the `NON_EXISTENT` count from 4 to 5, an `ACTIVE` shelter whose `autoHideDisarmed` is `false` becomes `INACTIVE` — the ONLY auto-hide path (see Endpoint semantics). Occupancy is an upsert — the existing row's band + `updatedAt` are refreshed (latest wins); the write never affects visibility, status or filters. |
| `ReportActionLog`      | interface (app) | V9: `record(userId, action: SHELTER_REPORT \| REVIEW_REPORT \| OCCUPANCY)` — check-and-record ONE report-type action (any target, any type; occupancy re-PUTs count, which is why the log is a separate table, not a count over the report tables — a re-PUT updates one row and would be uncountable). Counts the user's rows in the **trailing hour**; at the cap (`ReportProperties.maxActionsPerHour`, default **10**, `0` disables) the action is NOT recorded and `ReportThrottledException` (429, "Too many report requests") is thrown — a throttled decision must not extend itself; a rejected duplicate (409) records nothing. **The check-and-record is atomic per user** — the implementation (`persistence.JpaReportActionLog`) serializes it with a **transaction-scoped Postgres advisory lock** (`pg_advisory_xact_lock(hashtextextended('os-report-actions:' + userId, 0))`, released when the surrounding transaction commits — the exact critical section) so two concurrent report actions from the same user can never both read the pre-increment count. The durable `report_actions` rows (V9) survive restarts, unlike the file-based verification send log. |

## Endpoint semantics (from the puml notes — do not silently change)

- `GET /api/shelters` and `GET /api/shelters/{id}` are **public** — the `VIEW_MAP` baseline in
  always true (an emergency map must be viewable without an account). **V9:** the public LIST is
  `status = ACTIVE` rows only (auto-hidden shelters disappear from the map and list); the
  single-shelter read and `GET /api/shelters/mine` keep **all statuses** (the owner list carries
  the hidden rows so the UI can mark them; the detail read stays available to anyone by id).
- `POST /api/shelters` requires a Bearer JWT; the service checks `user.canWrite()`; shelter is
  saved `status = ACTIVE`, `source = USER`, `created_by = the submitting user` (V7); respond
  `201 + Location`. **V9:** `409` ("The limit of 10 active shelters has been reached") when the
  caller already has **10** shelters with `source = USER` and `status = ACTIVE` — deletions and
  auto-hidden shelters free the cap; users of `ADMIN` kind are exempt (checked via
  `UserRepository.isAdmin` — the seam the admin-moderation change builds on).
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
- **Trust filters on the public list (V9, D5):** `GET /api/shelters` accepts optional
  `reviewed` (bool — keeps shelters with at least one VISIBLE review; `false` is the
  negation), `minRating` (int 1..5 — anything else is **400** "minRating must be between 1
  and 5"; a shelter with 0 reviews never matches, its average is `null`) and `hasCapacity`
  (bool — capacity data present; `false` is the negation), composable with `source`. All
  three are applied **in-memory over the already-fetched projection** (Estonia-scale data;
  the ratings/counts are computed there anyway — no new SQL surface).
- **Shelter reports (V9, D1):** `POST /api/shelters/{id}/reports` body
  `{"type": NON_EXISTENT|CLOSED|OPEN_CONFIRMED|WRONG_LOCATION|OTHER, "detail": optional ≤ 500
  (stored only for OTHER)}` → **204**. Check order (each an `ErrorResponse`): **401** no/invalid
  Bearer token (guests can't report) → **403** registered-but-unverified ("Reporting requires a
  verified account" — the same `canWrite()` gate + vocabulary as submissions) → **404** unknown
  shelter id → **400** malformed body (missing/invalid `type`, `detail` > 500) → **409** the
  caller already reported this (shelter, user, type) ("This report has already been
  submitted" — checked BEFORE any throttle budget is consumed, so a user cannot burn their own
  budget by resubmitting; a lost race on the unique constraint maps to the same 409) → **429**
  report throttle ("Too many report requests"). The derived reported state appears on the next
  list/detail read (server-side projection — the client never computes it).
- **Review reports (V9, D2):** `POST /api/shelters/{shelterId}/reviews/{reviewId}/reports` body
  `{"reason": FALSY_DATA|NOT_RELEVANT|SPAM|OTHER, "detail": optional ≤ 500 (stored only for
  OTHER)}` → **204**. Check order: **401** unauthenticated → **403** unverified ("Reviews
  require a verified account") → **404** unknown shelter or unknown review / a review that does
  not belong to this shelter → **403** the caller's OWN review ("You cannot report your own
  review" — own content is edited or deleted, not reported) → **400** malformed body → **409**
  the caller already reported this (review, user) → **429** report throttle. The **5th** report
  sets `shelter_reviews.hidden_at` (once, never cleared automatically; hiding never deletes the
  row). Hidden reviews are excluded from the review list (except the author, who sees their own
  marked `hidden`), the rating aggregate + review count, and the `reviewed` filter; only the
  admin moderation API (change: admin-moderation) can clear `hidden_at`.
- **Occupancy (V9, D4):** `PUT /api/shelters/{id}/occupancy` body `{"band": SPACE|
  GETTING_FULL|FULL}` → **204** upsert — one live report per user per shelter; re-sending
  updates the existing row (latest band wins, `updated_at` refreshed) and refreshes the
  freshness window. Check order: **401** → **403** unverified → **404** unknown shelter →
  **400** invalid `band` → **429** report throttle (re-PUTs count against the budget). There is
  no 409 — a repeat IS the update. Display derivation at read time over the **last 2 h** of
  `updated_at` (checked in SQL; no cleanup job): the most recent fresh report's band wins (ties
  broken by user id so the output is deterministic), `reportCount` = fresh reports agreeing
  with that band (**1 = the UI hedges** "Reported full"; **2+ = firm** "Full"), `lastReportedAt`
  = the newest fresh report's time; nothing fresh → `occupancy: null` (silent). Occupancy
  NEVER affects visibility, status, marker color or filters.
- **Report throttle (V9, D3):** ALL report-type actions — shelter reports, review reports and
  occupancy re-PUTs, any target, any type — count per user against a **rolling hour**, default
  cap **10** (`app.reports.max-actions-per-hour` / `REPORTS_MAX_ACTIONS_PER_HOUR`, `0`
  disables), **429** with the standard throttle error body above the cap — the same table
  family and window style as the verification and password-reset throttles. Backed by the
  durable `report_actions` log (one timestamped row per action); the check-and-record is
  serialized per user with a transaction-scoped Postgres advisory lock (see the `ReportActionLog`
  row) so concurrent actions from the same user can never both pass.
- **Auto-hide (V9, D1):** on the insert that brings a shelter's `NON_EXISTENT` count from
  exactly 4 to 5, an `ACTIVE` shelter whose `autoHideDisarmed` is still `false` becomes
  `INACTIVE` (soft auto-hide — the row and its reports/reviews are retained; it drops out of
  the public list and the map). The trigger fires **only on that one 4→5 insert**: after any
  manual status change (admin restore — which sets the disarm flag — or the author's delete),
  the count is already past 4 (or the flag is set), so later reports increment it but never
  re-hide. No other path auto-hides; a 1–4 report state only flags (the orange "Reported" state
  on the still-active shelter).
- **Status flag net (V9, D1):** `CLOSED` and `OPEN_CONFIRMED` net to a **display-only** flag on
  `ShelterDto.statusFlag` (computed at read time, never stored, never status): `closed >
  confirmed` → `REPORTED_CLOSED`; `closed ≥ 1 && confirmed ≥ 1` → `CONFIRMED_OPEN` (**a tie
  counts as confirmed open** — the rule pinned in `ShelterQueryServiceTest`); otherwise no flag
  (so confirmed-only with zero closed reports carries no flag). Schools/daycares that are
  normally closed may stay visible with the flag.
- `GET /account/reviews/mine` (M8, on the `/account` group — a cross-shelter list has no
  per-shelter parent) returns the caller's reviews across ALL shelters as `MyReviewDto[]`
  (shelter names batched — no N+1); empty list when the user has no reviews.
- `POST /api/geo/resolve` (shelter-location-input): Bearer JWT (authenticated set) +
  per-IP token bucket **5 requests/minute** (429). Body `{"url": string}` — only the
  whitelisted host `maps.app.goo.gl` is ever fetched (anything else is 400 without a
  fetch). The backend follows **≤3 redirect hops manually** (it reads each `Location`
  header itself; 3 s connect / 5 s read timeouts, no cookies, UA
  `OpenShelter/1.0 (location resolver)`) and extracts the pair from the final URL with
  the SAME pattern list + Estonia-bbox auto-swap as the frontend
  (`app.MapsUrlCoordinates`). `200 {"latitude": number, "longitude": number}`; **400 ONE
  generic message** for invalid input / non-whitelisted host / no extractable pair /
  outside Estonia (no enumeration); **502 ONE generic retry-later** for upstream
  timeout / network / server failure (no upstream detail).
- `ErrorResponse` for 400 (validation / malformed report body), 401 (unauthenticated), 403
  (not verified / not author / own review), 404 (shelter or review not found), 409 (duplicate
  report, 10-active-shelter cap, optimistic lock), 429 (rate limited — incl. the report
  throttle), 502 (geo-resolve upstream).

## Design decisions

1. **Community rating IS the moderation** — no moderator role anywhere in the system. Aggregates
   (`averageRating`, `reviewCount`) are computed in **one batched query per listing** (no N+1);
   denormalize onto `Shelter` or Redis-cache when traffic grows (SDI Ch 6).
2. **Deferred (documented, not built):** `GET /api/shelters/nearest` + bbox queries need
   `GeoService` + PostGIS GIST index; paging (limit/offset) — Estonia-scale data is small.
   Add notes/`TODO` in the controller, do not implement.
3. **DTO records are the versioned contract with the frontend** — the only thing the API dev and
   the frontend dev must agree on.
4. **Trust state is server-derived (V9, shelter-trust-and-reports)** — the reported state
   (`nonexistentReports`, the `statusFlag` net), the fresh occupancy block, the hidden-review
   exclusion and the trust filters are all computed in the batched read projection (the
   established `submitterVerified`/`averageRating` no-N+1 pattern — counts by type and fresh
   occupancy rows are each ONE query per listing). The client renders what the DTO carries and
   never derives trust state from raw report lists. The public list is ACTIVE-only; the owner
   list and the detail read keep all statuses. The only state a report WRITES: the auto-hide
   (exactly-once 4→5, D1) and `shelter_reviews.hidden_at` (once, D2).

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
- V9 (in `ShelterReportServiceTest`, `ShelterQueryServiceTest`, `JpaReportActionLogTest` + the
  ITs): verified user reports; unverified → 403; unknown shelter → 404; duplicate (shelter,
  user, type) and (review, user) → 409 with no throttle budget consumed; own review → 403;
  the 4→5 NON_EXISTENT insert auto-hides (ACTIVE + not disarmed only) and fires exactly once
  (no re-hide after a manual restore / disarmed flag); the `statusFlag` net incl. the resolved
  tie (1-1 → `CONFIRMED_OPEN`); occupancy latest-band-wins + agreeing count + 2 h freshness
  (stale → silent); `reviewed`/`minRating` (bounds → 400)/`hasCapacity` filter semantics incl.
  visible-only review counting; the 10-active-shelter cap (409; ADMIN kind exempt; deleting or
  auto-hiding frees the cap); the throttle (default 10/rolling hour, at-cap rejects WITHOUT
  recording, 0 disables, atomic under concurrent same-user actions via the advisory lock).
