# docs + PUML sync audit — every document checked against the shipped code

Scope: 10 `.puml` diagrams, both READMEs, `docs/*.md`, `context-and-tasks/agent/*.md`,
`frontend/docs/agent/*.md`, `openspec/`. Method: read-only (read/grep/find/ls — no shell, no test run).
Every claim below is evidenced by a code location; where a document is **correct** it is named in
§"Verified correct" so nobody "fixes" it by mistake.

Root cause of almost everything below: **migration `V21__drop_reviews.sql` deleted the community
review/star-rating model** (`src/main/resources/db/migration/V21__drop_reviews.sql:24` `DROP TABLE review_reports;`
and the preceding `DROP TABLE shelter_reviews`). `grep -rl 'ShelterReview\|ReviewController\|MyReviewDto\|review_reports' src/main/java`
returns **0 files**; `grep -rl 'ReviewGateway\|ReviewForm\|MyReviewDto\|reviews/mine\|RatingStars' frontend/src`
returns **0 files**. Diagrams and prose written before V21 were never re-synced.

---

## P0 — whole documents describe the deleted feature (a reader is actively misled)

### 1. `frontend/docs/05-shelter-review-flow.puml` — ENTIRE FILE documents the removed review model

**Claims:** participants `ReviewGateway` (l.31) and `ReviewForm` (l.26); `GET /api/shelters/123/reviews` (l.33-36);
`POST /api/shelters/123/reviews` (l.63-64); `PUT`/`DELETE /api/shelters/123/reviews/mine` (l.86-91, 100-105);
`POST .../reviews/{reviewId}/reports` (l.125-150); `GET /account/reviews/mine` + `MyReviewDto` (l.190-197);
the `ContributionsPanel` "reviews list" with edit/delete review rows (l.200-215); "rating summary" (l.36, l.68).
**Code:** none of it exists — `grep -rl 'ReviewGateway\|ReviewForm\|MyReviewDto\|myReviews\|reviews/mine' frontend/src` → 0 matches;
no `ReviewController`/`ShelterReviewDto`/`ShelterReviewService` in `src/main/java`;
`frontend/src/app/gateways/` holds account/admin/auth/data-source/geo/geocode/shelter/verify gateways only.
**Fix:** rewrite as the as-built detail flow, keeping only the sections that are still true: shelter detail read
(l.20-41, minus the review fetch), report-shelter, report-occupancy, submit-shelter, and "manage my contributions"
(shelters list only — the reviews list half must go). Delete the `ReviewGateway`/`ReviewForm` participants, the
upsert/edit/delete/report-review sections and the `MyReviewDto` section. Alternative if time-boxed: delete the file
and fold the surviving sections into `04-map-browse-flow.puml` (nothing else references it except `07-STEPS.md`, see #21).

### 2. `context-and-tasks/05-shelter-api.puml` — largest single source of stale truth (API contract diagram)

**Claims:** `ReviewController` with 5 endpoints (l.~19-25 of the class box); `ShelterReviewService` (4 methods + 2 notes);
records `ReviewRequest`, `ShelterReviewDto`, `MyReviewDto`, `ReviewReportRequest`; `ReviewReportRepository`;
`AdminReviewReportDto` + `/admin/review-reports` + `/admin/reviews/{id}/hide|restore` in the `AdminController` box;
the trust-layer paragraph's `review_reports (UNIQUE review_id, user_id)` and `shelter_reviews.hidden_at`; sequence
flows 3, 4, 8 and 11 (reviews); `ShelterSourceFilter ..> ShelterRepository : ?source= maps to findAllBySourceIn()`.
**Code:** no review classes at all (grep above). Real `AdminController` mappings (`src/main/java/ee/sheltermap/api/AdminController.java`):
`/admin/shelters` (74), `/shelters/{id}/status` (83), `DELETE /shelters/{id}` (91), `/shelters/{id}/history` (105),
`/shelters/{id}/request-info` (119), `/shelters/{id}/mark-inaccurate` (132), `/shelters/{id}/clear-inaccurate` (141),
`/shelters/{id}/review` (155), `/audit` (169), `/alerts` (183), `/reports` (197), `/reports/{id}/dismiss` (205),
`/users` (215), `/users/{id}/suspend` (227), `/users/{id}/unsuspend` (234) — **no `/review-reports`, no `/reviews/{id}/hide|restore`**.
`ShelterRepository` (`src/main/java/ee/sheltermap/app/ShelterRepository.java:19-72`) has `save, findByExternalId, findById,
deleteBySourceAndExternalIdNotIn, findAll, findAllActiveBySourceIn, countByCreatedByAndSourceAndStatus,
countByCreatedByAndSourceAndCreatedAtAfter, countByCreatedByAndSourceAndReviewStatus,
findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc, findByCreatedBy, findByIds, deleteById` —
**no `findAllBySourceIn`, no `saveAll`**.
**Fix:** delete every review class/record/flow. In the `AdminController` box **only three things are wrong** —
`GET /admin/review-reports`, `POST /admin/reviews/{id}/hide` and `POST /admin/reviews/{id}/restore` plus their
`AdminReviewReportDto` record: the box's other 15 endpoints (including history, request-info, mark/clear-inaccurate,
users, suspend/unsuspend, alerts, audit) **do** match `AdminController` — leave them. Also remove the
`AdminModerationService` note lines for `listReviewReports`/`hideReview`/`restoreReview` and the "cascades reviews"
wording in `deleteShelter`. Then replace the `ShelterSourceFilter` edge with `→ findAllActiveBySourceIn()` and correct
the `ShelterRepository` box to the real 13-method list, and drop `hidden_at`/`review_reports` from the trust-layer
paragraph (keep `shelters.review_status`/`review_note`/`moderation_actions` — those are live).

### 3. `context-and-tasks/01-user-verification.puml` — domain diagram still shows a deleted aggregate

**Claims:** `class ShelterReview { id, shelterId, userId, rating, comment, createdAt, updatedAt }` (+ the `note bottom of
ShelterReview` "Community rating IS the moderation — one review per user per shelter … Re-rating = update, not insert");
`interface ShelterReviewRepository` (5 methods); relations `RegisteredUser "1" *-- "many" ShelterReview` and
`ShelterReview --> Shelter`; `note bottom of Shelter` "Quality is governed by community ratings (ShelterReview) instead";
`UserService + getData() : UserData`; `ShelterRepository + saveAll(...) + findAllBySourceIn(...)`.
**Code:** all removed. `src/main/java/ee/sheltermap/app/UserService.java:26-52` = `register, findByEmailOrPhone, findByEmail,
findByPhone` (`getData` deleted); `ShelterRepository.java:19-72` (list above); no `ShelterReview` anywhere in `src/main/java`.
**Fix:** delete the `ShelterReview` class, `ShelterReviewRepository`, both relations and both review notes; replace the
`UserService` box with its 4 real methods (or drop it — it is only a contract here); correct the `ShelterRepository` box.
Keep the rest (AdminUser/`provisioned`, `VerificationClaim`, `Capability`, `ShelterStatus` ACTIVE/INACTIVE) — verified correct.

### 4. `context-and-tasks/04-ingestion.puml` — documents the WFS pipeline; the shipped default is the official CSV

**Claims:** `PaasteametRegistryClient` is *the* client — "WFS GetFeature client: typeName=VARJEKOHT, outputFormat=geojson,
startIndex pagination" (l.~22); `note right of ShelterImportService` "today only Päästeamet has a fetcher";
sequence uses `REPO : saveAll(updated)` / `saveAll(created)`; `ImportResult` with 6 components.
**Code:** the default client is `CsvRegistryClient` — `src/main/java/ee/sheltermap/ingestion/CsvRegistryClient.java:25-31`
("Bulk-CSV client for the official Päästeamet shelter dataset … The old Maa-amet WFS layer (`1pdl2oh`) no longer publishes
a service ('Ei ole saadaval' — every WFS request 404s), so the official source is the open-data CSV at
`https://opendata.smit.ee/gis/varjumiskohad.csv`"), `:45` `@ConditionalOnProperty(name="app.registry.client", havingValue="csv")`;
`RegistryProperties.java:14,34,46` (client default `csv`, CSV baseUrl); `RegistryCsvParser.java:7-30` is a real class the
diagram omits; `ImportResult.java:22-23` has **8** components `(created, updated, removed, skipped, failed, at, overlapSkipped,
sourceVersion)`; `saveAll` no longer exists on `ShelterRepository`.
**Fix:** redraw with `CsvRegistryClient` + `RegistryCsvParser` as the primary path (Last-Modified/304 `RegistryFetch` flow),
demote `PaasteametRegistryClient` to a documented legacy opt-in (`havingValue="paasteamet"`,
`PaasteametRegistryClient.java:39-43`), add `DataImportLog`, correct `ImportResult` to 8 components and replace the
`saveAll(...)` messages with `save(...)`.

### 5. `context-and-tasks/agent/06-CONTEXT-API.md` — the written API contract repeats the removed review API

**Claims:** file title "Shelter API (read + write + community reviews)" (l.1); rows for `ReviewController` (l.24),
`ShelterReviewService` (l.26), `MyReviewDto` (l.30), `ReviewRequest` (l.31), `ShelterReviewDto` (l.35),
`AdminReviewReportDto` (l.41); review flow notes (l.91), review-report note (l.115).
**Code:** as #2 — no review classes/endpoints exist.
**Fix:** delete those 6 table rows + the review notes (and the `AdminReviewReportDto` row l.41 + its two endpoints).
The rest of the admin row set matches `AdminController` — keep it. Note l.23/93-97 are already correct about the
`minRating` removal — keep them.

### 6. `context-and-tasks/agent/02-CONTEXT-DOMAIN.md` — domain contract repeats the deleted aggregate

**Claims:** purpose mentions "reviews" (l.9); `ShelterReview` row with `hiddenAt` + the `POST /admin/reviews/{id}/restore`
reference (l.38); `ShelterReviewRepository` row incl. `findRatingAggregates` (l.39); "community rating (reviews) governs" (l.61);
review invariants (l.108).
**Code:** no `ShelterReview`; no `/admin/reviews/*` endpoint (AdminController list above).
**Fix:** delete both rows + the review invariants bullet; reword l.9 (`users, verification claims, shelters, reports, provenance`)
and l.61 (reports/community confirmation govern quality).

### 7. `frontend/docs/agent/02-CONTEXT-API.md` — frontend API contract still ships the review endpoints

**Claims:** `GET /api/shelters/{id}/reviews` (l.42); `POST`/`PUT`/`DELETE .../reviews[/mine]` (l.92-94);
`POST .../reviews/{reviewId}/reports` (l.109); `GET /admin/review-reports` (l.178) + `/admin/reviews/{id}/hide|restore` (l.179-180);
`GET /account/reviews/mine` (l.182); `MyReviewDto` field list (l.335); and **"minRating = 1..5 (else 400)"** (l.40).
**Code:** none of those endpoints exist; and `minRating` is not validated at all — `ShelterController.list(...)` takes only
`source, hasCapacity, provenance` (`src/main/java/ee/sheltermap/api/ShelterController.java:115-119`), so an unknown
`minRating` param is ignored (never a 400).
**Fix:** delete the review rows; correct l.40's filter list to `source`, `hasCapacity`, `provenance` (with the enum values);
keep the 403/404/409 vocabulary rows minus the "own review" wording (l.23-25).

### 8. `context-and-tasks/agent/01-TASK.md` — the task contract still says the rating system is the moderation

**Claims:** l.10 "user-submitted shelters with **community ratings** (no moderator — the rating system IS the moderation)";
l.93-94 "governed by community ratings. One review per user per shelter (unique `shelterId + userId`); re-rating = update, not insert".
**Code:** V21 removed the rating model; quality is governed by community reports + confirmation (`ReviewStatus` on the *shelter*,
never a star rating).
**Fix:** reword l.10 and replace the l.93-94 block with the report-based trust model (reports + auto-confirm/reject).

### 9. `frontend/docs/agent/05-CONTEXT-MAP.md` — documents filters that no longer exist

**Claims:** `reviewed` / `minRating` / `hasCapacity` trust filters (l.20, l.28); sidebar shows "rating (averageRating null →
'no ratings yet')" (l.51); "reviews and reports" (l.45).
**Code:** `frontend/src/app/features/map/map-page.ts:388` — "(The `reviewed` param is gone with the review model; …)";
`frontend/src/app/gateways/shelter-gateway.ts:46` — "the `reviewed` filter is gone with the review model";
the shipped chips are `open` + `hasCapacity` (`map-page.spec.ts:1527`), and there is no rating select.
**Fix:** drop `reviewed`/`minRating` from both mentions; replace the rating sentence with the trust badges that the map rows
actually render (`nonexistentReports`, `statusFlag`, `occupancy`, `provenance`).

---

## P1 — single substantive errors in otherwise-live documents

### 10. `frontend/docs/01-frontend-architecture.puml` — four removed things + a wrong admin description

**Claims:** `class ReviewGateway` + `ReviewGateway ..> ApiClient` (l.184-185, 349) and `AccountGateway.myReviews()` (l.197);
`class ReviewForm` in `features/shelter` + `ShelterDetailPage --> ReviewForm` + `ReviewForm --> RatingStars` (l.276, 378, 385);
`class RatingStars` in `shared/` + `ShelterDetailPage --> RatingStars` (l.300-301, 378);
`ContributionsPanel --> ReviewGateway` (l.380); `AdminGateway` methods `listReviewReports/hideReview/restoreReview` (l.220-225)
and the `AdminPage` note "three tabs … Review reports (queue + Hide/Restore + hidden badge)" (l.~290);
the routes note lists 9 routes and omits `/privacy` + `/terms`.
**Code:** `grep -rl 'ReviewGateway\|ReviewForm\|RatingStars' frontend/src` → 0 matches (RatingStars was deleted with the review model);
`AdminTab = 'unconfirmed' | 'shelters' | 'reports' | 'alerts' | 'users' | 'audit'` — **six** tabs,
`frontend/src/app/features/admin/admin-page.ts:50`; `/privacy` and `/terms` are real routes
(`frontend/src/app/app.routes.ts:64,71`).
**Fix:** delete `ReviewGateway`, `ReviewForm`, `RatingStars`, `myReviews`, `ContributionsPanel --> ReviewGateway` and the
three review-report gateway methods; rewrite the AdminPage note to the six real tabs; add `/privacy` + `/terms` to the
routes note (and `/admin` is already there).

### 11. `frontend/docs/04-map-browse-flow.puml` — documents the removed rating/reviewed filters

**Claims:** l.54-55 the trust row has a "Reviewed" toggle (`reviewed=true`) and a "Rating select ('Any rating' = no param /
'1+'..'5+' = minRating 1..5)"; l.64-66 the example call `GET /api/shelters?reviewed=true&minRating=4`; l.97 "detail and reviews
arrive in M5".
**Code:** `reviewed` and `minRating` are gone (`map-page.ts:388`, `shelter-gateway.ts:46`; chips are `open` + `hasCapacity`).
**Fix:** replace l.54-66 with the shipped trust row (`Open` + `Has capacity`, both server-side, composing with the provenance
filter) and drop "reviews" from l.97. Everything else in this diagram (map/sidebar/markers/source+provenance chips,
detail navigation) is verified correct.

### 12. `context-and-tasks/03-auth.puml` — three interface drifts + a missing permitAll route

**Claims:** `AccountController.myReviews() : List<MyReviewDto>` and `AccountService.myReviews(...)` + the
`MyReviewDto` record + `AccountController --> AccountService : me / profile / myReviews` (class box + wiring); the
`AccountController` note "All 7 endpoints require JWT"; `PasswordResetTokenRepository + findByTokenHash + markUsed(id)`;
`RefreshTokenRepository + void revoke(tokenHash)`; the `AuthController` note "permitAll = exactly these 6 POST /auth/*
endpoints … GET /api/shelters/** (except /mine) + actuator health/info are the only other open routes".
**Code:** `AccountController` (`src/main/java/ee/sheltermap/auth/AccountController.java:91,100,105,113,125,133,149,163`) =
`/me`, `/profile`, `/email-change/request|confirm`, `/phone-change/request|confirm`, `/export`, `DELETE /account` — **8 endpoints,
no reviews**; `PasswordResetTokenRepository` = `save, findActiveByUserId, deleteActiveByUserId, findLatestCreatedAtByUserId,
countCreatedOnUtcDayByUserId, deleteExpiredByUserId` (**no `markUsed`, no `findByTokenHash`**);
`RefreshTokenRepository.java:26` = `int revoke(String tokenHash)`; `SecurityConfig.java:203-212` also permits
`GET /api/data-source` (shipped M5) — the note omits it.
**Fix:** delete the `myReviews`/`MyReviewDto` members + wiring; correct the endpoint count to 8 and add `/export` +
`DELETE /account`; delete the two password-reset seam methods and fix `revoke`'s signature to `int`; add
`GET /api/data-source` to the permitAll note.

### 13. `docs/whitepaper.md` — the maintained whitepaper still advertises the removed review layer

**Claims:** l.13 "reviews, and ratings on top of the combined data"; l.54 "ratings, reviews"; l.107 `api (shelters, reviews)`;
l.129 "and/or reviews existing shelters → ratings"; l.190 "batched rating aggregates"; l.200 "report reviews (the fifth hides
the review)"; l.216-218 "Community reviews: verified users only; one review per user per shelter … the rating filter was
demoted (not removed)"; l.224 "with rating (read-only), reviews, occupancy"; l.327 "reviews, reports and live";
l.360 `POST /api/shelters/{id}/reviews/{reviewId}/reports`; l.361 the whole "Reviews" API-table row; l.363
`GET /admin/review-reports`, `POST /admin/reviews/{id}/hide|restore`; l.375 "rating demotion".
**Code:** every listed endpoint is gone (#2/#12). The "demoted, not removed" claim is wrong twice over: the review endpoints,
the star display (`ShelterReviewDto`, `RatingStars`) and the `minRating` filter are all absent — `grep -rl 'RatingStars|
ShelterReviewDto' frontend/src src/main/java` → 0.
**Fix:** rewrite the review/rating sentences as the report-based trust model; delete the "Reviews" API row and the
review-report endpoints from l.360/363; reword l.216-218 and l.375 (no star layer remains). The admin row's other
endpoints match `AdminController` — keep them; only the three review-report ones go.

### 14. `docs/whitepaper-brief.md` — same drift in the one-page mirror

**Claims:** l.23 "list of all your reviews"; l.39 "capacity, description, provenance badge, average rating (read-only) and
review"; l.59 "**Rate & review** — one review per user per shelter (re-rating updates), author-only".
**Code:** none of it exists.
**Fix:** delete the "Rate & review" bullet, drop "list of all your reviews" and the rating/review fragment in l.39
(the brief must stay a mirror of the whitepaper, so apply #13 first).

### 15. `docs/security/threat-model.md` — a threat row and a mitigation are about a deleted surface

**Claims:** l.79 "### A2. Brigading / fake reviews (and fake reports)"; l.90-91 "ratings are demoted to read-only context
(M11 — the `minRating` filter is gone, **star display stays**)"; l.332 A2 row "Brigading / fake reviews".
**Code:** there is no star display or rating to brigade — `shelter_reviews`/`review_reports` are dropped (V21) and no rating
is rendered (`RatingStars` deleted). The **test names cited in the same tables are correct** — `CommunityReviewIT` is the
*shelter* trust lifecycle (`src/test/java/ee/sheltermap/api/CommunityReviewIT.java:73`), not the removed review model.
**Fix:** retitle A2 to "Brigading / fake reports" and delete the "star display stays" clause; leave every `CommunityReviewIT`
citation alone (it is a live test).

### 16. `openspec/changes/shelter-trust-and-reports/specs/shelter-detail-reviews/spec.md` — delta can no longer be archived

**Claims:** l.5 `### Requirement: Community review list` declared `MODIFIED`.
**Code/effect:** the current spec no longer contains that requirement (removed and recorded in
`openspec/changes/archive/2026-09-14-remove-shelter-reviews/`), so `openspec validate --all` reports
`ℹ shelter-detail-reviews/spec.md: Archive would refuse this delta: shelter-detail-reviews MODIFIED failed for header
"### Requirement: Community review list" - not found`. `openspec/changes/legal-recovery/tasks.md:13,30` has the same class of
rot (it cites the removed `/account/reviews/mine` + a `myReviews` refactor).
**Fix:** drop the `Community review list` delta from `shelter-trust-and-reports` (it is a shipped change; the requirement it
modified no longer exists), and reword the two `legal-recovery` task/proposal lines to name a surviving endpoint.

---

## P2/P3 — smaller or documented drift

### 17. `context-and-tasks/02-verification-flow.puml` — `idCode` argument + a review-model closing comment

**Claims:** l.~35 `Person -> US : register(name, email, phone, idCode, password)`; l.125
"No moderator: quality governed by ShelterReview ratings (see 05-shelter-api.puml)".
**Code:** `grep -rn 'idCode\|nationalId\|isikukood' src/main/java` → **0 matches** (national-ID removal);
`UserService.register(String name, String email, String phone)` (`UserService.java:26`).
**Fix:** drop `idCode` from the message; rewrite the closing comment (no rating layer).

### 18. `frontend/docs/agent/03-CONTEXT-CORE-AUTH.md:63` and `04-CONTEXT-ACCOUNT-VERIFY.md:70` — "review flows" as the reason for verification

**Claims:** "submitting shelters/reviews requires a verified account"; "M5's submit-shelter gate … and review flows depend on the verified".
**Code:** verification now gates shelter submission + reports (`Capability.SUBMIT_SHELTER`; report endpoints are JWT+verified) — there is no review flow.
**Fix:** replace "reviews" with "reports" in both sentences.

### 19. `context-and-tasks/agent/05-CONTEXT-INGESTION.md:18` — WFS described as the real client

**Claims:** "`PaasteametRegistryClient` | class | Real HTTP client for the **Maa-amet WFS** (`service=WFS&request=GetFeature&typeName=VARJEKOHT&outputFormat=geojson`)…".
**Code:** the CSV client is the default and the WFS layer is dead upstream (`CsvRegistryClient.java:25-31`); the WFS class
remains only as an explicit opt-in (`PaasteametRegistryClient.java:39-43`).
**Fix:** add the `CsvRegistryClient`/`RegistryCsvParser` rows, mark the WFS row "legacy, opt-in (`app.registry.client=paasteamet`), upstream no longer publishes a service".

### 20. `frontend/src/app/app.routes.ts:80` — stale code comment (docs-adjacent)

**Claims:** "Lazy (M6 bundle budget): the detail page + review form are only needed …".
**Code:** there is no review form (`grep -rl ReviewForm frontend/src` → 0).
**Fix:** delete "+ review form" from the comment.

### 21. `openspec/specs/shelter-detail-reviews/` — capability directory name still says "reviews" (known, self-documented)

**Claims:** the spec itself notes the rename follow-up: `git mv openspec/specs/shelter-detail-reviews openspec/specs/shelter-detail`
(`openspec/specs/shelter-detail-reviews/spec.md:13-14`).
**Code:** the capability's surviving content is the detail page only.
**Fix:** perform the rename **only together with** the delta references — `openspec/changes/shelter-trust-and-reports/specs/shelter-detail-reviews/`
(#16) and the archive entry reference it by path; renaming without #16 leaves a dangling delta.

### 22. `qa/` and `.agent-orchestration/` — unreferenced artifact sets (owner decision needed)

**Observed:** `qa/{test-plan.md,feature-matrix.md,security-checklist.md}` and
`.agent-orchestration/{task-ledger.md,audit-report.md,checkout-checkpoint-log.md}` exist at the repo root and are not linked
from `README.md` or `docs/` (spot-checked). They cite real code (`qa/feature-matrix.md` references
`api/AdminController.java:155`, `qa/test-plan.md` references `api/CommunityReviewIT.*`) and their
`CommunityReviewIT`/`review_status` references are the *live* shelter lifecycle, so they are not stale — but they are
orphaned and will rot silently.
**Fix (pick one):** link them from `README.md`'s documentation index, or move them under `docs/` (e.g. `docs/qa/`,
`docs/orchestration/`). Do **not** delete without owner confirmation — they are the only QA coverage map of this repo.

---

## Verified correct — do NOT "fix" these

- `frontend/docs/02-auth-flow.puml` — checked against `AuthController` (register 201 `:73-74`, login `:93`, refresh `:103`,
  logout `:108`, reset request/confirm `:120,127`) and the reset note (one active code, SHA-256, 5 attempts, all refresh
  tokens revoked). **No divergence found.** Risk: it will go stale silently if the auth throttle copy or the admin login
  path changes (it never mentions the admin flows — acceptable, it is an M1-M2 diagram).
- `frontend/docs/03-verification-account-flow.puml` — matches `VerificationController` (`/verify/request` `:79`,
  `/verify/confirm` `:96`) and `AccountController`'s four contact-change endpoints + `GET /account/me`. Correct.
  *Known omission (not an error):* it predates the shipped `GET /account/export` + `DELETE /account` (data export + erasure),
  so the account surface has grown past it — worth a one-line note in the diagram.
- `context-and-tasks/03-auth.puml` — correct apart from #12 (it documents `ClientIps`/`Hashes`/`Codes`/`TokenBucketRateLimiter`
  and the 6-bucket rate-limit note accurately).
- `README.md` — the 2026-09-14 P2 pass holds up: `grep -n 'review-reports\|/admin/reviews\|reviews/mine\|/reviews' README.md` → no matches;
  the API table's filter claim is true (`ShelterController.list(source, hasCapacity, provenance)` — `provenance` exists as `Provenance`);
  migrations stated as V1–V22 + the Java V13 and counts as 679/870 are consistent with the tree.
- `frontend/README.md:85` — "11 component routes + 2 redirects" is **correct** (`app.routes.ts`: 11 component paths + `''` and `'**'`).
- `openspec/specs/*` (other than #21) — clean: a grep for `rating|review` across `openspec/specs` returns only
  `shelter-detail-reviews/spec.md` (which is the deliberate removal record).
- `docs/code-review/*` — dated historical logs (`2026-09-08-fix-log.md`, `2026-09-14-p2-audit.md`, `fix-process.md`).
  Their review references are historically accurate; do not "sync" them.
- `src/test/java/ee/sheltermap/VerificationFlowTest.java:41` — names `02-verification-flow.puml` as its executable spec;
  the comment is correct today, but it is a **linkage**: fix #17 and re-read that comment so the pair stays honest.

## Linkage + render caveats the fixer must respect

1. **Rendered images are checked in.** `context-and-tasks/{render.sh,render_kroki.py}` exist, plus `context-and-tasks/out/`
   and `frontend/docs/{out/,render.sh,render_kroki.py}`. Any `.puml` edit must be followed by a re-render of that diagram's
   `out/` PNG+SVG, otherwise the images (what people actually look at) stay stale while the source says otherwise.
2. **Cross-references by filename** — if a diagram is deleted, fix its references:
   `context-and-tasks/agent/06-CONTEXT-API.md:3` ("Source diagram: `../05-shelter-api.puml`"),
   `context-and-tasks/agent/07-STEPS.md:330-331` (names `05-shelter-api.puml` **and** frontend `05-shelter-review-flow.puml`
   as required-sync artifacts — that instruction itself is now obsolete),
   `context-and-tasks/agent/00-README.md:34`, `05-CONTEXT-INGESTION.md:3`, `03-CONTEXT-VERIFICATION.md:3`,
   `frontend/README.md:168` (lists `frontend/docs/*.puml` as source-of-truth UML).
3. **Diagram-authority note:** several diagrams are described as "source of truth"/contracts
   (`frontend/README.md:168`, `07-STEPS.md`, `06-CONTEXT-API.md:3`). That is why #1-#3 are P0: they are not decorative.

## Suggested execution order (one commit per group)

1. P0 diagrams/contracts that describe deleted features: #1, #2, #3, #5, #6, #7, #8, #9 → then re-render (#caveat 1).
2. P1 single-substance errors: #10, #11, #12 (diagrams → re-render) and #13, #14, #15 (prose mirrors of each other).
3. P2/P3 + linkage: #16 (+ then #21's rename), #17, #18, #19, #20, #22.
4. Re-run `openspec validate --all` (expect ≥28/28 with no `Archive would refuse` INFO for #16).
