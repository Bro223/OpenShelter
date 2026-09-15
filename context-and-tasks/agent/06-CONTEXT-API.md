# Context — Shelter API (read + write)

**Source diagram:** `../05-shelter-api.puml` (class diagram + sequence diagram)
**Used by steps:** 6 (create).
**Depends on contracts from:** `app.ShelterService`, `app.ShelterRepository`,
`domain.Shelter`, `domain.RegisteredUser`,
plus the V9 trust seams (`app.ShelterReportService`, `app.ShelterReportRepository`,
`app.ShelterOccupancyRepository`, `app.ReportActionLog`) and the
admin seams (admin-moderation: `app.UserRepository.isAdmin`, `AdminModerationService`), plus the
V11 community-review-queue seams (`app.ModerationAuditLog` + `persistence.JpaModerationAuditLog`,
`domain.ReviewStatus`, `domain.LocationKind`).

## Purpose

The HTTP layer the frontend (Vue/Angular) talks to: read shelters, submit shelters, and report on
them (shelter reports + occupancy). **Controllers are thin shells** — parse, validate, delegate, map. All logic
lives in the services.

## Classes to create (all in `ee.sheltermap.api`)

| Type                     | Kind   | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShelterController`      | class  | `GET /api/shelters?source=REGISTRY\|USER\|ALL` (public — **ACTIVE rows only**, auto-hidden shelters are absent; V9 optional trust filter `hasCapacity` (M11: the `minRating` rating filter is gone — the rating is context, not a lever; a stray `minRating` param is ignored, not a 400); **M6 (shelter-provenance-taxonomy): optional `provenance=OFFICIAL|PARTNER_VERIFIED|COMMUNITY_REPORTED|UNDER_REVIEW|REPORTED_INACTIVE|REJECTED` filter** — in-memory over the projected list, composes with `source` + trust filters, the two hidden values filter to empty on this ACTIVE-only endpoint, invalid value → 400), `GET /api/shelters/{id}` (public — **all statuses**, incl. auto-hidden; the detail read additionally carries `yourOccupancyBand`),`POST /api/shelters` (Bearer JWT + `canWrite()` check; **409 when the caller already has 10 ACTIVE USER shelters** — deletions and auto-hidden rows free the cap, ADMIN kind exempt; **M3 slice 3: 409 near-duplicate** — an ACTIVE USER row with the same normalized name within `app.limits.duplicate-coord-meters` (100 m) haversine, message carries the existing row id, cross-user, ADMIN kind exempt). **M8 (user-contributions):** `GET /api/shelters/mine` (Bearer JWT — the caller's own shelters, **all statuses** incl. auto-hidden; NOT part of the public GETs), `PUT /api/shelters/{id}` (author-only update of the five writable fields), `DELETE /api/shelters/{id}` (author-only; reports and occupancy cascade via the DB). **V9 (shelter-trust-and-reports):** `POST /api/shelters/{id}/reports` (Bearer + verified — typed shelter report, 204; 404 unknown shelter, 409 duplicate (shelter, user, type), 429 report throttle; **M11: `detail` (≤ 500) is stored for the factual types CLOSED / WRONG_LOCATION / OTHER** — ignored for the binary types; the admin queue surfaces it) and `PUT /api/shelters/{id}/occupancy` (Bearer + verified — the caller's live band, 204 upsert; 404 unknown shelter, 429 report throttle; no 409, a re-send IS the update). **M10 slice 3 (moderation-dashboard-completion):** `POST /api/shelters/{id}/info-request/reply` body `InfoRequestReplyRequest` → 204 (the submitter's ONE-TIME answer to the admin's information request — Bearer + verified + author: 403 not the author, 404 the row has no request, 409 a second answer; the request row is KEPT after the reply). `GET /api/shelters/mine` additionally carries each row's `infoRequest` (the moderator's question + the reply once given — owner-scoped; null on the public list/detail reads). |
| `ShelterQueryService`    | class  | `findAll(source: ShelterSourceFilter, hasCapacity: Boolean): List<ShelterDto>` — the PUBLIC list: `status = ACTIVE` rows only (auto-hidden shelters disappear), the trust filters applied **in-memory over the projection** (no new SQL surface), `GET /api/shelters/{id}`'s `findById(id: Long, caller: User): Optional<ShelterDto>` (all statuses; the single-shelter read carries `yourOccupancyBand` — null for guests, anonymous callers and callers without a report), `findByCreatedBy(userId: long): List<ShelterDto>` (M8 — the author-scoped list, **all statuses**, same lean DTO projection). **`findAllForAdmin(status, source, q)` (admin-moderation D3)** — the ADMIN list: **every shelter, all statuses** (auto-hidden rows included), id-ordered, exact-match `status`/`source` filters + the case-insensitive name/address substring `q`, with the SAME batched trust derivations as the public list **plus the submitter's profile name** (reuses the same projection — no N+1). Returns **DTOs only, never entities**. **V9:** the trust derivations ride the SAME batched pass (no N+1) — per-shelter report counts by type (ONE query), fresh occupancy rows for the whole batch (ONE query, the 2 h window applied in SQL), then in-memory: `nonexistentReports` (0 when none), the `statusFlag` net, and the occupancy block (latest fresh band wins, agreeing count, newest timestamp). |
| `ShelterDto`             | record | `id, name, address, latitude, longitude, status: ShelterStatus, source: ShelterSource, createdAt: Instant, description: String, capacity: Integer, submitterVerified: boolean` (accessibility-and-provenance D3), **`nonexistentReports: int` (V9 — 0 when none; `> 0` is the UI's orange "Reported" affordance), `statusFlag: ShelterStatusFlag` (V9 — `REPORTED_CLOSED`/`CONFIRMED_OPEN`/null, display-only), `occupancy: Occupancy` (V9 — the fresh ≤ 2 h block, `null` when nothing fresh), `yourOccupancyBand: OccupancyBand` (V9 — the CALLER's own live band; detail read only, null for guests/anonymous/no report), `reviewStatus: ReviewStatus` (V11, community-review-queue v2 — the community trust state; NEW rows are public with the "Newly added" treatment), `reviewNote: String` (V11 — the admin's REJECT reason; **`/mine` and admin rows only**, `null` on the public projection), `locationKind: LocationKind` (V11 — the private-home declaration; the "Private location" badge)**; nested record `Occupancy(band, reportCount, lastReportedAt)` — `reportCount` 1 = hedged copy, 2+ = firm. **M10 slice 3 (moderation-dashboard-completion):** `infoRequest: InfoRequest(message, requestedAt, replyMessage, repliedAt)` — the moderator→submitter exchange, **set on the `/mine` projection ONLY** (null on the public list and detail reads — the exchange is private). **M10 slice 4 (moderation-dashboard-completion):** `inaccurate: boolean` — the moderator's "reported inaccurate" flag (server-derived from the V20 stamp on the row; a marked row stays visible with status and provenance untouched — the UI renders the single-sourced warning on the unverified-treatment surfaces). **Lean projection** — the full registry record (county, municipality, data-as-of, attribution) stays in the DB but is not dumped to the UI. All V9 derivations are computed server-side in the batched projection — never client-computed from raw report lists. |
| `CreateShelterRequest`   | record | `name, latitude, longitude, description: String, capacity: Integer` (validated at the boundary). **Hardening:** `description`/`capacity` are STORED (V3) — previously validated then silently dropped. **V11 (community-review-queue v2):** optional `locationKind: LocationKind` (default `PUBLIC` — the private-home declaration checkbox; the created row is `review_status = NEW` server-side, never caller-set). |
| `UpdateShelterRequest`   | record | M8: `name, latitude, longitude, description: String, capacity: Integer` — constraints **field-for-field identical** to `CreateShelterRequest`; the bbox gate is a small helper shared with `POST` so create/update cannot drift. Only these five fields are writable on an existing shelter (`status`/`source`/registry fields/`createdAt`/`createdBy` are never).                                                                                                                                                                                                                                                                                                                 |
| `ShelterReportRequest`   | record | V9: `type: ShelterReportType (@NotNull), detail: String (@Size(max = 500))` — `detail` is the free text of `OTHER` reports; accepted for any type, stored only for `OTHER` (otherwise ignored). |
| `OccupancyReportRequest` | record | V9: `band: OccupancyBand (@NotNull)` — one live report per user per shelter (upsert; latest band wins, `updated_at` refreshed). |
| `ErrorResponse`          | record | `timestamp: Instant, status: int, error: String, message: String, path: String`. One uniform shape via `@RestControllerAdvice`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `AdminController`        | class  | The admin moderation surface (admin-moderation D3) — thin shell: parse, validate, **authorize, delegate** to `AdminModerationService`. Authorization is a FRESH `UserRepository.isAdmin(userId)` kind lookup per request (D2 — never a JWT claim): anonymous → 401 (the security entry point answers first), authenticated non-admin → 403 (`AdminAccessException`). `GET /admin/shelters?status=&source=&q=` → `AdminShelterDto[]` (all statuses incl. hidden); `POST /admin/shelters/{id}/status` body `AdminShelterStatusRequest` → 204 (manual hide/restore — a restore DISARMS auto-hide); `DELETE /admin/shelters/{id}` → 204 (hard delete, cascade); `GET /admin/reports?shelterId=` → `AdminShelterReportDto[]` (shelter-report queue, newest first); `POST /admin/reports/{id}/dismiss` → 204 (idempotent). **V11 (community-review-queue v2):** `POST /admin/shelters/{id}/review` body `AdminShelterReviewRequest` → 204 (the rare manual review decision: CONFIRM / REJECT — REJECT requires a reason and also hides the row via `status = INACTIVE`; USER rows only, registry → 409) and `GET /admin/audit?limit=` → `AdminAuditDto[]` (the append-only moderation audit trail, newest first, newest 100 by default, limit 1..200; deleted shelters render "Deleted shelter"). **M3 slice 4 (abuse-limits):** `GET /admin/alerts?limit=` → `AdminAlertDto[]` (the in-memory throttle/abuse alert ring — daily submission cap 429s, per-contact OTP cap 429s, near-duplicate 409s — newest first, newest 50 by default, limit 1..200; W16: cleared on a backend restart). **M10 slice 1 (moderation-dashboard-completion):** `GET /admin/users` → `AdminUserDto[]` (every REGISTERED + ADMIN account: id, name, email, kind, `suspendedAt`; batched) and `POST /admin/users/{id}/suspend` / `POST /admin/users/{id}/unsuspend` → 204 (idempotent — re-acting is a no-op that audits nothing; REGISTERED only — ADMIN 409 (lockout vector), GUEST 409 (no credentials); unknown 404; a fresh act writes `USER_SUSPEND` / `USER_UNSUSPEND` with the account rendered as subject — enforced at login, refresh and the JWT-filter doors, the user's shelters stay on the map). **M10 slice 2 (moderation-dashboard-completion):** `GET /admin/shelters/{id}/history` → `AdminShelterHistoryDto[]` (the append-only `shelter_history` trail, ascending: CREATED / EDITED (server-parsed `field: old → new` of the moved fields — a no-op PUT records nothing) / DELETED; snapshot name per event; batched actor names, "Unknown" after erasure; 404 only when the shelter is absent AND has no history — a deleted shelter's history still serves; registry import rows answer empty, they keep their `data_imports` audit). **M10 slice 3 (moderation-dashboard-completion):** `POST /admin/shelters/{id}/request-info` body `AdminInfoRequestRequest` → 204 (the moderator→submitter information request on a USER shelter — the submitter sees it on their own row and answers once; USER rows only, registry → 409 import-owned, unknown → 404, a second request for the same row → 409 — one exchange per shelter, the replied row is kept; the admin reads the request WITH the reply via `AdminShelterDto.infoRequest` on the shelter list — no dedicated read endpoint). **M10 slice 4 (moderation-dashboard-completion):** `POST /admin/shelters/{id}/mark-inaccurate` body `AdminMarkInaccurateRequest` (`reason` optional, ≤ 500; blank/absent → NULL) → 204 (sets the public `inaccurate` flag on a USER shelter — the row STAYS visible, status and provenance untouched; USER rows only, registry → 409 import-owned, unknown → 404; **idempotent** — re-marking is a no-op that audits nothing; a fresh mark writes an audit row `MARK_INACCURATE` with the reason in the same transaction) and `POST /admin/shelters/{id}/clear-inaccurate` → 204 (clears the flag — idempotent; audited `CLEAR_INACCURATE`). All writes are single-row; no bulk endpoints; every unknown id → 404. Reporter identity is served from this API ONLY. |
| `AdminModerationService` | class  | Owns the admin guard rails (the controller authorizes, the service guards): **USER rows only** — `POST .../status` and `DELETE` on `source != USER` → **409** `ImportOwnedShelterException` ("Registry shelters are import-owned and cannot be moderated here" — D4: the registry import rebuilds its rows as `ACTIVE` on every run, so an admin edit would silently revert); a restore (`INACTIVE → ACTIVE`) is the manual status change that sets `autoHideDisarmed = true` (shelter-trust-and-reports D1 — later `NON_EXISTENT` reports never re-hide); `deleteShelter` hard-deletes (the DB cascades shelter reports, occupancy and open-status rows — all FKs `ON DELETE CASCADE`); `dismissReport` stamps `dismissedAt` ONCE (idempotent; the row is KEPT — dismissing records the resolution, it never deletes); every unknown id → 404 (`ShelterNotFoundException`/`ReportNotFoundException`). Queues resolve shelter names and reporter identity (profile name + email) in ONE batched lookup each (no N+1). **V11 (community-review-queue v2):** `reviewShelter(moderatorId, shelterId, action, reason)` — USER rows only (registry → 409); CONFIRM sets `review_status = CONFIRMED` and clears the note (it does NOT un-hide — visibility is the status endpoint's job); REJECT (reason required, else 400) sets `review_status = REJECTED` **AND** `status = INACTIVE` (the existing hide mechanism); both write their audit row (CONFIRM / REJECT) in the same transaction. `listAudit(moderatorId, limit)` — newest-first audit rows (default 100, 1..200) with read-time shelter/moderator name resolution ("Deleted shelter" for the dangling id after a delete). `setShelterStatus` additionally reverts a restored row's `review_status` from `REJECTED` to `NEW` (it starts over — a rejected row does not come back as CONFIRMED). |
| `AdminShelterDto`        | record | admin-moderation: `id, name, address, source, status` (ALL statuses), `nonexistentReports: int` (0 when none), `statusFlag: ShelterStatusFlag` (null = no flag), `occupancy: ShelterDto.Occupancy` (the fresh ≤ 2 h block, null when nothing fresh), `capacity: Integer`, `submitter: String` (the creator's profile name — `null` for registry rows and for creators whose account no longer exists). **V11 (community-review-queue v2):** `reviewStatus: ReviewStatus`, `reviewNote: String` (the REJECT reason — `null` while nothing is said), `locationKind: LocationKind` — the admin list (and the "Unconfirmed" tab: USER + `review_status = NEW` rows) carries the full review state. **M10 slice 3 (moderation-dashboard-completion):** `infoRequest: InfoRequest(message, requestedAt, requestedByName, replyMessage, repliedAt)` — the row's information request (null when none) with the requesting admin's profile name ("Unknown" after erasure — no FK) and the submitter's reply once given (the row is kept after the reply — audit posture). **M10 slice 4 (moderation-dashboard-completion):** `inaccurate: boolean` — the same moderator flag as on `ShelterDto`; the admin list is where the mark is managed (mark/clear below). |
| `AdminShelterReportDto`  | record | admin-moderation: one row of the shelter-report queue — `id, shelterId, shelterName, shelterStatus` (the shelter's LIVE status — drives the UI's restore shortcut), `type: ShelterReportType, detail, reporterName, reporterEmail` (admin-only data, never exposed outside `/admin/*`), `createdAt, dismissed: boolean` (the `dismissed_at != null` marker — dismissed rows stay in the queue, recorded as resolved). |
| `AdminShelterStatusRequest` | record | admin-moderation: `{status: ShelterStatus}` with `@NotNull` — the manual hide/restore body (`{"status": "ACTIVE" \| "INACTIVE"}`); a missing/unknown value is a 400 through the standard vocabulary. |
| `AdminShelterReviewRequest` | record | V11 (community-review-queue v2): `{action: CONFIRM \| REJECT, reason: String}` — `action` `@NotNull`; `reason` **required for REJECT** (missing/blank → 400), accepted-and-stored for CONFIRM (optional). The body of `POST /admin/shelters/{id}/review`. |
| `AdminAuditDto`        | record | V11 (community-review-queue v2): one row of `GET /admin/audit` — `id, shelterId, shelterName` (read-time join; a deleted shelter renders "Deleted shelter" — the dangling `shelter_id`), `moderatorName` (same read-time resolution), `action` (STATUS_CHANGE / DELETE / REPORT_DISMISS / CONFIRM / AUTO_CONFIRM / REJECT), `reason` (the REJECT note, when set), `previousStatus, newStatus` (the `review_status` around the action; DELETE: previous = the row's state, new = null), `createdAt` — newest first, the newest **100** (the `limit` query param, 1..200, default 100). |
| `AdminAlertDto`        | record | M3 slice 4 (abuse-limits): one row of `GET /admin/alerts` — `id` (ring-local monotonic sequence, resets on restart), `kind` (`submission-daily-cap` / `otp-contact-cap` / `near-duplicate` — the closed `ThrottleAlert` vocabulary), `subject` (`user:<id>` / `contact:<normalized>` — the flagged account or contact), `detail` (the plain-spoken event; the 409 names the existing row, `shelter #<id>`), `retryAfterSeconds: Integer` (non-null only for the 429 alerts), `at: Instant` — newest first, the newest **50** (the `limit` query param, 1..200, default 50). The ring is in-memory (W16): a triage view, not a durable log. |
| `ShelterSourceFilter`    | enum   | `REGISTRY, USER, ALL`. Maps to repository query: `REGISTRY` → `{PAASETEAMET, MUNICIPALITY}`, `USER` → `{USER}`, `ALL` → everything.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `LocationController`     | class  | shelter-location-input: `POST /api/geo/resolve` (Bearer JWT — inside the authenticated set, NOT permitAll) + per-IP token bucket 5/min (keys via `ClientIps`, same pattern as the auth endpoints). Thin shell: parse, validate, delegate to `app.LocationResolveService`, map the outcome.                                                                                                                                                                                                                                                                                                                                                                                         |
| `LocationResolveRequest` | record | `url: String` (`@NotBlank @Size(max = 2048)`) — a `maps.app.goo.gl` short link (host whitelist enforced service-side; anything else is the generic 400).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `LocationResolvedDto`    | record | `latitude: double, longitude: double` — field names are the contract with the frontend's `LocationResolved` model (do not rename).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

**V9 trust seams** (defined in the `app`/`persistence` packages — contracts only here, the
location-resolution style):

| Type                   | Kind   | Key members / notes |
| ---------------------- | ------ | ------------------- |
| `ShelterReportService` | class (app) | V9: `reportShelter(user, shelterId, type, detail): void` and `reportOccupancy(user, shelterId, band): void`. Every write requires a verified registered user (the same `canWrite()` gate as submissions — 403 "Reporting requires a verified account") and a known shelter (404). Shelter reports pass the per-target unique bound (409 on a repeat (shelter, user, type) **BEFORE any throttle budget is consumed**, mirroring the verification already-verified guard); a lost race on the unique constraint maps to the same 409. On the insert that brings the `NON_EXISTENT` count from 4 to 5, an `ACTIVE` shelter whose `autoHideDisarmed` is `false` becomes `INACTIVE` — the ONLY auto-hide path (see Endpoint semantics). Occupancy is an upsert — the existing row's band + `updatedAt` are refreshed (latest wins); the write never affects visibility, status or filters. |
| `ReportActionLog`      | interface (app) | V9: `record(userId, action: SHELTER_REPORT \| OCCUPANCY)` — check-and-record ONE report-type action (any target, any type; occupancy re-PUTs count, which is why the log is a separate table, not a count over the report tables — a re-PUT updates one row and would be uncountable). Counts the user's rows in the **trailing hour**; at the cap (`ReportProperties.maxActionsPerHour`, default **10**, `0` disables) the action is NOT recorded and `ReportThrottledException` (429, "Too many report requests") is thrown — a throttled decision must not extend itself; a rejected duplicate (409) records nothing. **The check-and-record is atomic per user** — the implementation (`persistence.JpaReportActionLog`) serializes it with a **transaction-scoped Postgres advisory lock** (`pg_advisory_xact_lock(hashtextextended('os-report-actions:' + userId, 0))`, released when the surrounding transaction commits — the exact critical section) so two concurrent report actions from the same user can never both read the pre-increment count. The durable `report_actions` rows (V9) survive restarts, unlike the file-based verification send log. |

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
  `UserRepository.isAdmin` — the seam the admin-moderation change builds on). **M3
  (abuse-limits):** `429` + `Retry-After` when the caller has already made
  `app.limits.daily-submissions-per-user` (5) USER submissions in the **rolling 24 h** window
  (ADMIN kind exempt); `409` **near-duplicate** (slice 3) when an ACTIVE USER row with the same
  normalized name lies within `app.limits.duplicate-coord-meters` (100 m) haversine —
  cross-user, INACTIVE rows don't match, ADMIN kind exempt; the 409 message carries the
  existing row id (`shelter #<id>`).
- **Author-scoped shelters (M8):** `GET /api/shelters/mine` (Bearer JWT) returns only the
  caller's USER-source shelters. `PUT/DELETE /api/shelters/{id}` resolve the shelter (404 if
  absent), then `source == USER && createdBy != null && createdBy == me` (else **403** — via
  the existing `NotAuthorException` → `ApiErrorHandler` 403 mapping; registry rows and legacy
  `created_by`-NULL rows are unmanageable by anyone; shelter ids are public, so 403-vs-404
  leaks nothing). PUT re-checks the Estonia bbox (400) via the helper shared with POST, then
  replaces the five writable fields and returns the updated `ShelterDto` (200). DELETE answers
  204; the shelter's reports and occupancy cascade via the DB `ON DELETE CASCADE`. Note: `JpaShelterRepository
.deleteById` flushes after the delete so the cascade is visible to in-transaction reads
  (the IT suite asserts it inside one transaction).
- **Trust filters on the public list (V9, D5; M11 rating demotion):** `GET /api/shelters`
  accepts the optional `hasCapacity` (bool — capacity data present; `false` is the
  negation), composable with `source`. (The `minRating` rating filter was REMOVED in M11 —
  the rating is context, not a lever; a stray `minRating` param is ignored, not an error.)
  It is applied **in-memory over the already-fetched projection** (Estonia-scale data —
  no new SQL surface).
- **Shelter reports (V9, D1):** `POST /api/shelters/{id}/reports` body
  `{"type": NON_EXISTENT|CLOSED|OPEN_CONFIRMED|WRONG_LOCATION|OTHER, "detail": optional ≤ 500
  (stored only for OTHER)}` → **204**. Check order (each an `ErrorResponse`): **401** no/invalid
  Bearer token (guests can't report) → **403** registered-but-unverified ("Reporting requires a
  verified account" — the same `canWrite()` gate + vocabulary as submissions) → **404** unknown
  shelter id → **400** malformed body (missing/invalid `type`, `detail` > 500) → **409** the
  caller already reported this (shelter, user, type) ("This report has already been
  submitted" — checked BEFORE any throttle budget is consumed, so a user cannot burn their own
  budget by resubmitting; a lost race on the unique constraint maps to the same 409) → **429**
  report throttle ("Too many report requests"). **V11 (community-review-queue v2):** an
  `OPEN_CONFIRMED` report on a USER row that is still `review_status = NEW` promotes it
  to `CONFIRMED` IN THE SAME TRANSACTION (audited `AUTO_CONFIRM`, the reporting user as
  actor) — the submitter's own positive report never promotes, and registry / already
  confirmed rows are untouched. The derived reported state appears on the next
  list/detail read (server-side projection — the client never computes it).
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
- **Report throttle (V9, D3):** ALL report-type actions — shelter reports and
  occupancy re-PUTs, any target, any type — count per user against a **rolling hour**, default
  cap **10** (`app.reports.max-actions-per-hour` / `REPORTS_MAX_ACTIONS_PER_HOUR`, `0`
  disables), **429** with the standard throttle error body above the cap — the same table
  family and window style as the verification and password-reset throttles. Backed by the
  durable `report_actions` log (one timestamped row per action); the check-and-record is
  serialized per user with a transaction-scoped Postgres advisory lock (see the `ReportActionLog`
  row) so concurrent actions from the same user can never both pass.
- **Auto-hide (V9, D1):** on the insert that brings a shelter's `NON_EXISTENT` count from
  exactly 4 to 5, an `ACTIVE` shelter whose `autoHideDisarmed` is still `false` becomes
  `INACTIVE` (soft auto-hide — the row and its reports are retained; it drops out of
  the public list and the map). The trigger fires **only on that one 4→5 insert**: after any
  manual status change (the admin restore — which sets the disarm flag — or the author's delete),
  the count is already past 4 (or the flag is set), so later reports increment it but never
  re-hide. No other path auto-hides; a 1–4 report state only flags (the orange "Reported" state
  on the still-active shelter).
- **Status flag net (V9, D1):** `CLOSED` and `OPEN_CONFIRMED` net to a **display-only** flag on
  `ShelterDto.statusFlag` (computed at read time, never stored, never status): `closed >
  confirmed` → `REPORTED_CLOSED`; `closed ≥ 1 && confirmed ≥ 1` → `CONFIRMED_OPEN` (**a tie
  counts as confirmed open** — the rule pinned in `ShelterQueryServiceTest`); otherwise no flag
  (so confirmed-only with zero closed reports carries no flag). Schools/daycares that are
  normally closed may stay visible with the flag.
- **Admin moderation (`/admin/*`, admin-moderation D3/D4)** — the trust layer's human lever.
  Every endpoint authorizes with the SAME fresh-lookup rule (D2): the JWT's userId is loaded
  on EVERY request and `UserKind.ADMIN` is required — no role claim in the token, so a
  demotion/deletion takes effect on the next request. Vocabulary: **401** anonymous (the
  security entry point — `/admin/**` is in the authenticated set) → **403** authenticated
  non-admin (`AdminAccessException`, "Admin access required") → **404** unknown id → **409**
  registry row under a write (`ImportOwnedShelterException` — import-owned, D4) → **400**
  malformed body (missing/unknown `status` or `action`). All list endpoints answer **200** with a JSON
  array; all writes answer **204** (no body) and are single-row transactions — no bulk
  endpoints. The fifteen endpoints:
  - `GET /admin/shelters?status=&source=&q=` — every shelter incl. hidden, id-ordered, with the
    batched trust fields + the submitter's name; `status`/`source` exact-match filters, `q` the
    case-insensitive name/address substring (server-side; the client never filters).
  - `POST /admin/shelters/{id}/status` `{"status": "ACTIVE" | "INACTIVE"}` — manual
    hide/restore of a USER row. A **restore sets `autoHideDisarmed = true`** — the manual-change
    marker that permanently disarms auto-hide for that shelter. Setting the status a shelter
    already has is a no-op. USER rows only (registry → 409); unknown → 404.
  - `DELETE /admin/shelters/{id}` — hard delete of a USER shelter; shelter reports, occupancy
    and open-status rows cascade (DB `ON DELETE CASCADE`). The ONLY path that
    deletes a USER row (the author's own `DELETE /api/shelters/{id}` remains; admin delete is
    the trust lever for spam). USER rows only (registry → 409); unknown → 404.
  - `GET /admin/shelters/{id}/history` (M10 slice 2, moderation-dashboard-completion) — the
    row's append-only lifecycle trail, ascending: **CREATED** (the submitter), **EDITED** (an
    owner PUT that moved at least one of name/description/capacity/latitude/longitude/
    locationKind — the changes arrive server-parsed as `field: old → new`; a no-op PUT records
    nothing), **DELETED** (the submitter's or an admin's hard delete). Each event snapshots
    the shelter name and names its actor (batched; "Unknown" after the account is erased —
    `shelter_id` and `actor_user_id` are deliberately FK-free, so the history of a deleted
    shelter AND of a deleted account survives). 404 only when the shelter is absent AND has
    no history rows (a deleted shelter's history still serves); registry import rows answer
    an empty list (the import keeps its own `data_imports` audit).
  - `GET /admin/reports?shelterId=` — the shelter-report queue, **newest first** (created_at
    desc, id desc tie-break); the optional `shelterId` narrows to one shelter (unknown shelter
    → 404). Rows carry the shelter's LIVE status and the reporter's profile name + email
    (admin-only data — never exposed outside `/admin/*`).
  - `POST /admin/reports/{id}/dismiss` — mark a shelter report resolved: stamps `dismissed_at`
    ONCE (**idempotent** — a re-dismiss is a no-op that still answers 204, never double-stamped). The
    row is KEPT — dismissing records the resolution, it never deletes. Unknown → 404.
  - `POST /admin/shelters/{id}/review` (V11, community-review-queue v2) — the rare manual
    review decision, body `{"action": "CONFIRM" | "REJECT", "reason": ...}`: **CONFIRM** sets
    `review_status = CONFIRMED` and clears the note (it does NOT un-hide an INACTIVE row —
    visibility is the status endpoint's job); **REJECT** requires a reason (missing/blank →
    400) and sets `review_status = REJECTED` **plus** `status = INACTIVE` (the existing hide
    mechanism). USER rows only (registry → 409); unknown → 404. Both write their audit row
    (CONFIRM / REJECT) in the same transaction.
  - `GET /admin/audit?limit=` (V11, community-review-queue v2) — the append-only
    `moderation_actions` trail, newest first; `limit` 1..200 (default 100, out of range →
    400). Rows: `id, shelterId, shelterName` (read-time join — a deleted shelter renders
    "Deleted shelter", the `shelter_id` is deliberately FK-free), `moderatorName`, `action`
    (STATUS_CHANGE / DELETE / REPORT_DISMISS / CONFIRM /
    AUTO_CONFIRM / REJECT / USER_SUSPEND / USER_UNSUSPEND (M10 slice 1, user-scoped rows
    carry a null `shelterId` + `subjectUserId`) / MARK_INACCURATE / CLEAR_INACCURATE
    (M10 slice 4)), `reason`, `previousStatus`, `newStatus`, `createdAt`.
  - `GET /admin/alerts?limit=` (M3 slice 4, abuse-limits) — the in-memory
    throttle/abuse alert ring, newest first; `limit` 1..200 (default 50,
    out of range → 400). Rows: `id` (ring-local sequence), `kind`
    (`submission-daily-cap` / `otp-contact-cap` / `near-duplicate`),
    `subject` (`user:<id>` / `contact:<normalized>`), `detail`,
    `retryAfterSeconds` (429 alerts only), `at`. The ring is process
    memory (W16 — cleared on a backend restart, N replicas see their own
    share): a triage view, not a durable log (the audit trail above stays
    the durable surface).
  - `POST /admin/shelters/{id}/request-info` (M10 slice 3, moderation-dashboard-completion)
    — body `{"message": required ≤ 2000}`: a moderator→submitter information request on a
    USER shelter. **One exchange per shelter** — a second request for the same row → 409; the
    request row is KEPT after the reply (audit posture — never deleted) and the admin reads
    it WITH the reply via `AdminShelterDto.infoRequest` on the shelter list (no dedicated
    read endpoint). The submitter answers ONCE via `POST
    /api/shelters/{id}/info-request/reply` (author only; 404 no request, 409 a second
    answer — see the `ShelterController` row). USER rows only (registry → 409); unknown →
    404; blank message → 400. Deliberately NOT written to the moderation audit trail — the
    request row itself is the record.
  - `POST /admin/shelters/{id}/mark-inaccurate` (M10 slice 4) — body
    `{"reason": optional ≤ 500}`: sets the moderator's "reported inaccurate"
    flag on a USER shelter (the V20 `shelters.inaccurate_marked_at` / `_by`
    stamp). The row STAYS visible — status and provenance are untouched; the
    public DTOs carry `inaccurate: true`. **Idempotent** — re-marking an
    already-marked row is a no-op that audits nothing; a fresh mark writes
    the `MARK_INACCURATE` audit row (with the reason) in the same
    transaction. USER rows only (registry → 409); unknown → 404; reason
    > 500 → 400.
  - `POST /admin/shelters/{id}/clear-inaccurate` (M10 slice 4) — clears the
    flag: **idempotent** (clearing an unmarked row is a no-op, no audit
    row); a fresh clear writes the `CLEAR_INACCURATE` audit row. Same
    404/409 guards as the mark.
  - `GET /admin/users` (M10 slice 1, moderation-dashboard-completion) — every REGISTERED +
    ADMIN account: `id, name, email, kind, suspendedAt` (batched — no per-row lookup; GUEST
    rows are absent — a guest has no credentials to stop).
  - `POST /admin/users/{id}/suspend` (M10 slice 1, moderation-dashboard-completion) — sets
    `users.suspended_at` and writes the `USER_SUSPEND` audit row with the account rendered as
    subject. **Idempotent** — suspending an already-suspended user is a no-op that audits
    nothing. Only `kind = REGISTERED` is suspendable: ADMIN → 409 (a lockout vector), GUEST →
    409 (no credentials to stop), unknown → 404. While suspended the account is refused at
    login (403, after the password verify — no state oracle), at refresh (403, no new pair)
    and on every protected route (401 — the JWT filter re-checks on a fresh lookup per
    request); the user's shelters stay on the map — suspension stops the account, not its
    content.
  - `POST /admin/users/{id}/unsuspend` (M10 slice 1, moderation-dashboard-completion) —
    clears the timestamp and writes the `USER_UNSUSPEND` audit row; same idempotency and
    guards as suspend.

  **Registry rows are read-only for admins (D4):** every shelter-scoped write (`POST
  .../status`, `POST .../request-info`, `POST .../mark-inaccurate` / `.../clear-inaccurate`
  and `DELETE`) on `source != USER` → **409** with the plain message — the registry import owns those rows'
  lifecycle and rebuilds them as `ACTIVE` on every run, so an admin edit would silently
  revert (provenance: "the registry published it, so it exists"). The admin UI offers no
  actions for registry rows at all; the lever for bad registry data is upstream (Päästeamet),
  not in-app.

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
- `ErrorResponse` for 400 (validation / malformed report body / malformed admin status body),
  401 (unauthenticated), 403 (not verified / not author / not an admin —
  admin-moderation), 404 (shelter or report not found), 409 (duplicate report,
  10-active-shelter cap, near-duplicate submission — M3 slice 3, message carries the existing
  row id, optimistic lock, import-owned registry row — admin-moderation), 429
  (rate limited — incl. the report throttle + the daily submission cap), 502 (geo-resolve upstream).

## Design decisions

1. **Community reports + confirmation IS the moderation** — no moderator role anywhere in the
   system, and no star rating. Rows publish as `NEW` and reach `CONFIRMED` automatically (an
   `OPEN_CONFIRMED` report from a user other than the submitter, audited `AUTO_CONFIRM`)
   or via the rare admin CONFIRM; admin REJECT (reason required) hides the row via
   `status = INACTIVE`.
2. **Deferred (documented, not built):** `GET /api/shelters/nearest` + bbox queries need
   `GeoService` + PostGIS GIST index; paging (limit/offset) — Estonia-scale data is small.
   Add notes/`TODO` in the controller, do not implement.
3. **DTO records are the versioned contract with the frontend** — the only thing the API dev and
   the frontend dev must agree on.
4. **Trust state is server-derived (V9, shelter-trust-and-reports)** — the reported state
   (`nonexistentReports`, the `statusFlag` net), the fresh occupancy block and the trust
   filters are all computed in the batched read projection (the established `submitterVerified`
   no-N+1 pattern — counts by type and fresh occupancy rows are each ONE query per listing). The client renders what the DTO carries and
   never derives trust state from raw report lists. The public list is ACTIVE-only; the owner
   list and the detail read keep all statuses; the ADMIN list (`findAllForAdmin`) keeps ALL
   statuses (admin-moderation D3). The state a report or an admin action WRITES: the auto-hide
   (exactly-once 4→5, D1) and the report's `dismissed_at` stamp (V10 — once, idempotent, never deletes) —
   plus, V11 (community-review-queue v2), the `shelters.review_status` transitions (the
   `OPEN_CONFIRMED` NEW→CONFIRMED promotion in the report's own transaction, admin
   CONFIRM/REJECT, the restore's REJECTED→NEW) and the matching `moderation_actions` audit
   row, written in the SAME transaction as each action (append-only; the UI's amber
   "Newly added" / green "Community-checked" badges and the map legend are pure renders of
   the DTO's `reviewStatus`/`statusFlag`/`nonexistentReports`).

## Testing notes

- `ShelterQueryService`: filter mapping (REGISTRY/USER/ALL → source sets), DTO mapping never leaks
  the entity, `findById` → empty when missing.
- Controller tests (MockMvc): public GETs anonymous OK; POST without token → 401; POST with token
  but unverified → 403; error shape is always `ErrorResponse`.
- M8 (in `ShelterApiIT` + `ShelterServiceTest` + `ShelterRepositoryIT`): `addPlace` records the
  author; `GET /mine` returns only own shelters (multi-user); PUT by author updates the five
  fields (createdAt/status/source untouched) and bbox violation → 400; PUT by non-author /
  registry row / legacy row → 403 + unchanged; PUT on missing id → 404; DELETE by author removes
  the shelter (reports + occupancy cascade); DELETE by non-author → 403 + untouched.
- V9 (in `ShelterReportServiceTest`, `ShelterQueryServiceTest`, `JpaReportActionLogTest` + the
  ITs): verified user reports; unverified → 403; unknown shelter → 404; duplicate (shelter, user,
  type) → 409 with no throttle budget consumed; the 4→5 NON_EXISTENT insert auto-hides (ACTIVE + not disarmed only) and fires exactly once
  (no re-hide after a manual restore / disarmed flag); the `statusFlag` net incl. the resolved
  tie (1-1 → `CONFIRMED_OPEN`); occupancy latest-band-wins + agreeing count + 2 h freshness
  (stale → silent); `hasCapacity` filter semantics (M11: the minRating filter is gone —
  the stray-param ignore is pinned in `ShelterReportIT`); the 10-active-shelter cap (409; ADMIN kind exempt; deleting or
  auto-hiding frees the cap); the throttle (default 10/rolling hour, at-cap rejects WITHOUT
  recording, 0 disables, atomic under concurrent same-user actions via the advisory lock).
- Admin-moderation (in `AdminModerationIT` + the `AdminSeeder` tests, see `04-CONTEXT-AUTH.md`):
  anonymous `/admin/*` → 401; verified non-admin → 403 with no data; a demotion takes effect on
  the NEXT request (still-valid JWT) — the fresh kind lookup; `GET /account/me` carries
  `isAdmin`; the admin list has all statuses + trust fields + the submitter and filters by
  status/source/q; hide/restore cycles work and a restore PERMANENTLY disarms auto-hide
  (later NON_EXISTENT reports never re-hide); registry rows → 409 on status/delete (import-
  owned); unknown shelter/report ids → 404, a missing/unknown `status` body → 400;
  delete cascades shelter reports, occupancy and open-status; the shelter-report
  queue is newest-first with reporter identity and the `dismissed` marker (a re-dismiss is a
  no-op, the row is kept).
- V11 community-review-queue (in `CommunityReviewIT` + `ShelterReportServiceTest` +
  `AdminModerationServiceTest`): a new USER row is public as `NEW`; a positive `OPEN_CONFIRMED`
  report by ANOTHER user promotes it to `CONFIRMED` + `AUTO_CONFIRM` audit row (in-transaction);
  the submitter's own positive report does NOT promote; admin CONFIRM promotes; REJECT hides
  (status INACTIVE) + stores the note; restore reverts `review_status` to NEW; the audit trail
  carries one row per action (status change, delete, report dismiss, CONFIRM, AUTO_CONFIRM, REJECT)
  with read-time name resolution ("Deleted shelter" after a hard delete); registry rows are untouched by review actions (409); `locationKind` round-
  trips from the submission payload (default PUBLIC, PRIVATE badge surfaces).
