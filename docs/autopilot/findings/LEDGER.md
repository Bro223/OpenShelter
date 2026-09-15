# Autopilot work ledger — OpenShelter (2026-09-15)

Deduplicated, ranked work list produced from the four read-only inventories:
`backend-inventory.md`, `frontend-inventory.md`, `docs-puml-sync.md`, `swagger-plan.md`.

Source IDs are preserved (`B*` backend, `F-*` frontend, `D*` docs/PUML, `SW-*` swagger) so every row
traces back to the evidence in those files. Nothing here is new work: each row restates a finding
that one of the four inventories evidenced with a code location.

## How to use this ledger

- **One writer per workstream.** Files are assigned to exactly one workstream (column `WS`), so two
  fixers can never touch the same file. Run workstreams in parallel, never two fixers inside one.
- **No shell in fixer lanes.** Fixers edit; the orchestrator runs `mvn`/`npm`/`openspec` gates and commits.
- **Do not touch the verified-correct list** at the end of this file — those claims were checked and hold.
- **Re-render after any `.puml` edit** (`context-and-tasks/render.sh`, `frontend/docs/render.sh`), or the
  checked-in `out/` PNG+SVG stay stale while the source claims otherwise.
- **Status tags** appended to the item ID by the wave-state lane: `[closed W1]` = the wave-1 reviewer
  marked the item done; `[open W1: …]` = attempted but flagged partial/wrong, the bracket text is the
  remaining work. Untagged rows were not attempted in wave 1.

## Totals

| Measure | Count |
|---|---|
| Actionable rows (this run) | **68** |
| P0 | 9 |
| P1 | 7 |
| P2 | 33 |
| P3 | 19 |
| HUMAN (decision needed, not fixable by a lane) | 2 |
| Deferred to a later wave (ownership collision) | 2 |
| Workstreams | 7 |

## WS-1 — backend: validation bounds, clock seam, authorization hardening (6 rows)

Files owned: `src/main/java/ee/sheltermap/auth/{LoginRequest,RegisterRequest,ProfileUpdateRequest,PasswordResetConfirmRequest,ConfirmChangeRequest,VerifyConfirmRequest,RefreshRequest}.java`,
`src/main/java/ee/sheltermap/app/ShelterService.java`, `src/main/java/ee/sheltermap/domain/AdminUser.java`,
`src/main/java/ee/sheltermap/domain/ShelterReport.java`, `src/main/java/ee/sheltermap/auth/UserCredentials.java`,
`src/main/java/ee/sheltermap/persistence/JpaUserCredentialsRepository.java`,
`src/main/java/ee/sheltermap/persistence/JpaPasswordResetTokenRepository.java`,
`src/main/java/ee/sheltermap/api/ApiErrorHandler.java`, `src/main/java/ee/sheltermap/config/SecurityConfig.java`,
new `src/test/java/ee/sheltermap/auth/AuthRequestConstraintParityTest.java`.
Note: `SecurityConfig.java` is owned here, which is why `SW-C1` (swagger's permit change) lives here too.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| B1 [open W1: @Size caps landed and reviewer-verified, but the new AuthRequestConstraintParityTest fails 7/7 — it reflects RecordComponent.getAnnotations(), which never sees the jakarta constraints; reflect over getDeclaredFields()/ctor params] | P2 | backend | the 7 auth request records (all lines with `@NotBlank`) | Auth payloads are unbounded while every `api` DTO mirrors its column size; a multi-MB password reaches Argon2 before the per-IP limiter (it counts requests, not bytes) | Add `@Size(max=…)` — email/emailOrPhone 255, password 200, code 16, refreshToken 512 — and a constraint-parity test modelled on `api/ShelterRequestConstraintParityTest` | WS-1 |
| B2 [closed W1] | P2 | backend | `app/ShelterService.java:131,223`; `domain/AdminUser.java:48`; `domain/ShelterReport.java:50`; `auth/UserCredentials.java:24,58`; `persistence/JpaUserCredentialsRepository.java:50`; `persistence/JpaPasswordResetTokenRepository.java:79` | Wall-clock `Instant.now()` in 7 sites while 25+ classes inject `Clock` (documented convention: "the caller owns the time source"); the two `ShelterService` sites are business rules (daily cap window, `Retry-After`) that cannot be pinned | Inject `Clock` and use `clock.instant()`; convert `AdminUser.provisioned`, the `ShelterReport` convenience constructor and `UserCredentials` mutators to take an `Instant` from the caller (as `PasswordResetToken.markUsed(Instant)` does) | WS-1 |
| B3 [closed W1] | P3 | backend | `api/ApiErrorHandler.java:335,355,370`; `config/SecurityConfig.java:224` | Error-body timestamps are the only ones in the app that bypass the clock seam, so they cannot be pinned in a test | Inject `Clock` into `ApiErrorHandler`; pass the existing `Clock` bean into `securityFilterChain(...)` | WS-1 |
| B6 [closed W1] | P3 | backend | `config/SecurityConfig.java:203-213` | `/admin/**` is protected only by per-method `requireAdmin()` discipline — all 15 handlers are guarded today, but one forgotten call in a new method exposes the surface | Add `.requestMatchers("/admin/**").hasAuthority("ADMIN")` next to the permit list, keeping `requireAdmin()` as the fresh-DB re-check | WS-1 |
| B7 [closed W1] | P3 | backend | `config/SecurityConfig.java:193` | `csrf.disable()` is the one deviation in that file with no rationale, while every other deviation is documented | One comment naming the reason (stateless `Authorization: Bearer`, no cookie session) + pointer to `docs/security/threat-model.md` (that doc edit is owned by WS-6) | WS-1 |
| SW-C1 [closed W1] | P2 | backend | `config/SecurityConfig.java:160-214` | The docs permit needs a profile-aware matcher; the chain is an expression lambda with no place for a condition | Add `Environment env`, switch the lambda to a statement block, register `/v3/api-docs/**`, `/v3/api-docs.yaml`, `/swagger-ui/**`, `/swagger-ui.html` as `permitAll()` **only** when `Profiles.isDevTestOnly(env)`, before `anyRequest().authenticated()`, preserving matcher order (`/api/shelters/mine` before `/api/shelters/**`) | WS-1 |

## WS-2 — backend: test gaps and small residue (5 rows)

Files owned: `src/main/java/ee/sheltermap/api/ShelterQueryService.java`,
`src/main/java/ee/sheltermap/api/EmailTestRequest.java`, `src/main/java/ee/sheltermap/api/SmsTestRequest.java`,
`src/main/java/ee/sheltermap/ingestion/PaasteametRegistryClient.java`,
new `src/test/java/ee/sheltermap/auth/AccountServiceTest.java`,
new `src/test/java/ee/sheltermap/config/JwtAuthenticationFilterTest.java`.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| B4a | P3 | backend | `api/ShelterQueryService.java:56-58,116-117` | Javadoc still explains `minRating` / "the rating is context, not a lever" for a model V21 removed | Reword to the surviving truth: an unknown `minRating` param is ignored for API compatibility (field removed in V21) | WS-2 |
| B5 | P3 | backend | `api/EmailTestRequest.java:10-12`; `api/SmsTestRequest.java:10-12` | The only unbounded strings handed to outbound senders (SMTP subject/body, SMS body); dev/test-only and guard-protected, so not exploitable | `@Size(max=255)` on `to`/`subject`, `@Size(max=1000)` on `message` | WS-2 |
| B9 | P3 | backend | `ingestion/PaasteametRegistryClient.java:39` | The class activates only when explicitly selected, but nothing in it says so (csv is the default, WFS upstream is dead) | One javadoc line recording the legacy opt-in decision | WS-2 |
| TG1 | P2 | backend | new `src/test/java/ee/sheltermap/auth/AccountServiceTest.java` | `AccountService` (erasure/export orchestration: purge private homes, redact audit reasons, null-out authorship without touching trust state) has no direct unit test while its peer services do | Add a fake-based unit test for the orchestration paths | WS-2 |
| TG2 | P2 | backend | new `src/test/java/ee/sheltermap/config/JwtAuthenticationFilterTest.java` | The JWT filter has no test file; parse/accept/reject is covered only indirectly by authenticated ITs | Unit test: valid token → principal `Long`; expired/malformed/absent header → anonymous (401 entry point) | WS-2 |

## WS-3 — frontend: accessibility defects + style-token truth (9 rows)

Files owned: `frontend/src/app/shared/page-shell.html`, `frontend/src/app/shared/page-shell.ts`,
`frontend/src/styles.scss`, `frontend/src/app/features/admin/admin-page.html`,
`frontend/src/app/features/admin/admin-page.ts`, `frontend/src/app/features/admin/admin-page.scss`,
`frontend/src/app/features/account/contributions-panel.html`,
`frontend/src/app/features/account/contributions-panel.ts`,
`frontend/src/app/features/account/account-page.ts`, `frontend/src/app/app.ts`,
new `frontend/src/app/shared/confirm-action.ts` (+ the specs those files already have).

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| F-01 [closed W2; residual ORCH-6: the skip-link text is hardcoded English (no nav.skip key)] | P2 | frontend | `shared/page-shell.html`; `shared/page-shell.ts`; `styles.scss` | No skip-to-content link anywhere (WCAG 2.4.1 A); every route forces a keyboard/SR user through the whole nav | First element becomes a visually-hidden-until-focused `<a class="skip-link" href="#main">`, outlet container gets `id="main" tabindex="-1"`, `.skip-link` rule on `:focus-visible` | WS-3 |
| F-02 [closed W2] | P2 | frontend | `features/admin/admin-page.scss:53-56`; `features/admin/admin-page.html:379` | A 9-column table inside `overflow-x:auto` has no keyboard handle (WCAG 2.1.1) | `tabindex="0" role="region" aria-label` + visible focus ring, or stacked cards below the 900px breakpoint | WS-3 |
| F-03 [closed W2] | P2 | frontend | `features/admin/admin-page.html:13-66`; `features/admin/admin-page.ts:50` | `role="tablist"/"tab"/aria-selected` are declared but there is no `tabpanel`/`aria-controls` and no arrow-key handling — announced as a tab widget that does not behave like one | Complete the pattern (ids, `aria-controls`, `role="tabpanel"`, roving `tabindex`, Arrow/Home/End) or drop `role="tab*"` for plain `aria-pressed` buttons | WS-3 |
| F-04 [open W2: the armed-confirm half landed (role="status" strips + focus on arm/cancel via ConfirmAction), but route changes still never move focus (shared/page-shell.ts:80-85) — reviewer partial] | P2 | frontend | `features/admin/admin-page.html:341-368`; `features/account/contributions-panel.html:95-125` | Destructive confirms swap the button for a prompt with no focus move and no announcement (focus falls to `<body>`); route changes also never move focus | Move focus to Confirm when arming, restore to the trigger on cancel, `role="status"` on the prompt | WS-3 |
| F-05 [closed W2] | P2 | frontend | `styles.scss:71-78,81` | `--color-error`'s note justifies the token by the removed M5 review form; the only live consumer is `admin-page.scss:210-211` | Restate the note around the real consumer (admin reject-reason error), or collapse onto `--color-danger` if the contrast split is no longer wanted | WS-3 |
| F-08 [closed W2] | P2 | frontend | `features/admin/admin-page.scss:272` | Comment still names a "review reports" queue that no longer exists | Delete `+ review reports`; keep the `:183-189` comments (that "review" is the live shelter `review_status` queue) | WS-3 |
| F-09 [closed W2] | P2 | frontend | `styles.scss:458` | `.btn--danger`'s comment narrows a shared class to one consumer ("armed danger button … contributions panel") while the admin tables use it too | Describe it as the shared danger button; drop the armed/panel claim | WS-3 |
| F-12 [closed W2] | P3 | frontend | `features/admin/admin-page.ts:236,248,499-510`; `features/account/contributions-panel.ts:242-252`; `features/account/account-page.ts:358` | The two-tap destructive confirm is implemented four times and none of the copies owns focus/announcement | One shared confirm primitive owning the state machine *and* the a11y behaviour; adopt at all four sites (pairs with F-04) | WS-3 |
| F-15 [closed W2] | P3 | frontend | `app.ts:11-15` | Root component is the only production component without `OnPush` | Add `ChangeDetectionStrategy.OnPush` | WS-3 |

## WS-4 — frontend: stale comments, coverage holes, duplication (7 rows)

Files owned: `frontend/src/app/design-tokens.spec.ts`, `frontend/src/app/app.routes.ts`,
new `frontend/src/app/shared/form-helpers.spec.ts`, `frontend/src/index.html`,
new `frontend/src/app/core/prepaint.ts`, `frontend/src/app/features/map/map-page.ts`,
`frontend/src/app/features/shelter/shelter-detail-page.ts`,
`frontend/src/app/features/shelter/submit-shelter-page.ts`,
`frontend/src/app/features/account/verify-page.ts`, `frontend/src/app/features/account/reset-page.ts`,
`frontend/src/app/core/models.ts`, new `frontend/src/app/shared/geolocation.ts`.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| F-06 [closed W2] | P2 | frontend | `design-tokens.spec.ts:201-202` | Contrast assertion is commented with the removed review form | Update the comment to name the admin editor error; keep the assertion (the pair is real) | WS-4 |
| F-07 [closed W2] | P2 | frontend | `app.routes.ts:21,76-77,80-81` | Three comments describe review controls and a review-form lazy chunk that no longer exist; the bundle-budget rationale is explained by a dead form | Reword to auth/verification branching and marker/row-click lazy load (same fix as docs-report D20 — apply once) | WS-4 |
| F-10 [closed W2] | P2 | frontend | new `shared/form-helpers.spec.ts` | The only `shared/*` module without a spec, though all four exports are production-used (`CODE_SIX_DIGITS`, `readCoordinate`, `capacityValidator`, `nameBlankValidator`) | Table-driven spec per validator (valid/invalid/empty/boundary) | WS-4 |
| F-11 [closed W2] | P2 | frontend | `index.html:14-40`; new `core/prepaint.ts` | The two pre-paint boot scripts encode the theme and `<html lang>` guarantees and are never executed by the suite, so a regression ships green | Extract the logic into an exported module + unit spec (or a spec that evaluates the script source) | WS-4 |
| F-14 [closed W2] | P3 | frontend | `features/map/map-page.ts`; `features/shelter/shelter-detail-page.ts` | The geolocation mechanism (+ error mapping + Haversine) is duplicated across two pages (the *copy* mirroring is deliberate and stays) | Extract a typed `GeolocationService`; keep the divergent copy per feature | WS-4 |
| F-16 [open W2: not attempted this wave - no fixer report line; the "migrate as touched" takeUntilDestroyed/DestroyRef subscription cleanup is still outstanding in its five files] | P3 | frontend | `features/map/map-page.ts`; `features/shelter/shelter-detail-page.ts`; `features/shelter/submit-shelter-page.ts`; `features/account/verify-page.ts`; `features/account/reset-page.ts` | Manual `ngOnDestroy` unsubscribes everywhere; `takeUntilDestroyed`/`DestroyRef` unused (0 matches) | Migrate the subscriptions in these files as they are touched. `page-shell.ts`, `account-page.ts`, `contributions-panel.ts` are owned by WS-3 → deferred | WS-4 |
| MODELS-JSDOC [closed W2] | P2 | frontend | `core/models.ts:636-646` | The `AdminAuditRow` doc claims `REVIEW_HIDE`/`REVIEW_RESTORE` "persist in historical rows", but V21 deletes exactly those rows and the enums no longer declare the values | Drop the persist claim (the audit tab can never render them) | WS-4 |

## WS-5 — docs: `context-and-tasks` diagrams + written contracts (11 rows)

Files owned: `context-and-tasks/01-user-verification.puml`, `context-and-tasks/02-verification-flow.puml`,
`context-and-tasks/03-auth.puml`, `context-and-tasks/04-ingestion.puml`,
`context-and-tasks/05-shelter-api.puml`, `context-and-tasks/out/**` (re-rendered),
`context-and-tasks/agent/{01-TASK,02-CONTEXT-DOMAIN,05-CONTEXT-INGESTION,06-CONTEXT-API,07-STEPS}.md`.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| D2 [closed W1; caveat: the ShelterController box still lists 8 of the 10 live ops — pre-existing gap noted by the reviewer, not introduced by D2] | P0 | docs-puml | `context-and-tasks/05-shelter-api.puml` (+`out/`) | Largest stale-truth source: 5 review endpoints, review records/repos, `/admin/review-reports` + hide/restore, review sequence flows 3/4/8/11, and `findAllBySourceIn`/`saveAll` that no longer exist | Delete every review element; in the admin box fix **only** the 3 wrong endpoints (the other 15 match `AdminController`); re-point `ShelterSourceFilter` → `findAllActiveBySourceIn()`; correct the `ShelterRepository` box to the real 13 methods; drop `review_reports`/`hidden_at` from the trust paragraph | WS-5 |
| D3 [closed W1] | P0 | docs-puml | `context-and-tasks/01-user-verification.puml` (+`out/`) | Domain diagram still shows the `ShelterReview` aggregate, its repository, two relations, "community rating IS the moderation" notes and the removed `UserService.getData`/`saveAll`/`findAllBySourceIn` | Delete the aggregate/repo/relations/notes; correct the `UserService` (4 methods) and `ShelterRepository` boxes; keep `AdminUser`/`VerificationClaim`/`Capability`/status (verified correct) | WS-5 |
| D4 [closed W1] | P0 | docs-puml | `context-and-tasks/04-ingestion.puml` (+`out/`) | Documents the dead Maa-amet WFS pipeline as *the* client; the shipped default is `CsvRegistryClient`, `ImportResult` has 8 components, `saveAll` is gone | Redraw around `CsvRegistryClient` + `RegistryCsvParser` (Last-Modified/304 flow), demote `PaasteametRegistryClient` to documented legacy opt-in, add `DataImportLog`, fix the component count and `save(...)` messages | WS-5 |
| D5 [closed W1] | P0 | docs | `context-and-tasks/agent/06-CONTEXT-API.md:1,24,26,30,31,35,41,91,115` | The written API contract repeats the removed review API | Delete those rows/notes; keep the rest of the admin row set (it matches) and the already-correct `minRating` notes | WS-5 |
| D6 [closed W1; caveat: file re-staled at :19 by WS-1's B2 change (AdminUser.provisioned now takes an Instant) — needs a one-line re-sync] | P0 | docs | `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:9,38,39,61,108` | Domain contract repeats the deleted aggregate and a `/admin/reviews/{id}/restore` reference | Delete both rows + the review invariants; reword l.9/l.61 to the report/confirmation trust model | WS-5 |
| D8 [closed W1] | P0 | docs | `context-and-tasks/agent/01-TASK.md:10,93-94` | The task contract still says "the rating system IS the moderation" with one-review-per-user rules | Reword to community reports + confirmation (`ReviewStatus` on the shelter, no star rating) | WS-5 |
| D12 [closed W1; caveat: file re-staled at :23 by WS-1's B2 change (UserCredentials ctor now takes an Instant) — needs a one-line re-sync] | P1 | docs-puml | `context-and-tasks/03-auth.puml` (+`out/`) | `AccountController.myReviews`/`MyReviewDto` + wiring, the removed password-reset seam methods, a wrong `revoke` signature, and a permitAll note missing `GET /api/data-source` | Delete `myReviews`/`MyReviewDto`; correct the endpoint count to 8 (+`/export`, `DELETE /account`); `revoke` → `int`; add `/api/data-source` to the permit note | WS-5 |
| D17 [closed W2] | P2 | docs-puml | `context-and-tasks/02-verification-flow.puml` (+`out/`) | `register(name, email, phone, idCode, password)` still carries the removed national-ID argument, and a closing comment cites the deleted rating model | Drop `idCode`; rewrite the closing comment. Re-read `src/test/java/ee/sheltermap/VerificationFlowTest.java:41`, which names this diagram as its executable spec | WS-5 |
| D19 [closed W1] | P2 | docs | `context-and-tasks/agent/05-CONTEXT-INGESTION.md:18` | `PaasteametRegistryClient` described as the real HTTP client for the dead WFS | Add `CsvRegistryClient`/`RegistryCsvParser` rows; mark the WFS row legacy opt-in / upstream dead | WS-5 |
| D23 [closed W2] | P1 | docs | `context-and-tasks/agent/07-STEPS.md:103-104,330-331,358,373,382` | Still documents `shelter_reviews`/`review_reports`/`minRating` and instructs syncing the deleted frontend review-flow diagram | Delete the review-model references and the obsolete sync instruction (WS-6 is removing that file) | WS-5 |
| SW-I3puml [closed W1] | P3 | docs-puml | `context-and-tasks/05-shelter-api.puml` (header) | The read contract has no machine-readable companion pointer | Add the OpenAPI document (`docs/api/openapi.json`, `/swagger-ui`) to the header (the `ShelterDto` javadoc half is WS-7's `SW-I3dto`) | WS-5 |

## WS-6 — docs: frontend diagrams, prose mirrors, OpenSpec (15 rows)

Files owned: `frontend/docs/05-shelter-review-flow.puml`, `frontend/docs/01-frontend-architecture.puml`,
`frontend/docs/04-map-browse-flow.puml`, `frontend/docs/out/**` (re-rendered),
`frontend/docs/agent/{02-CONTEXT-API,03-CONTEXT-CORE-AUTH,04-CONTEXT-ACCOUNT-VERIFY,05-CONTEXT-MAP}.md`,
`frontend/README.md`, `docs/whitepaper.md`, `docs/whitepaper-brief.md`, `docs/security/threat-model.md`,
`README.md`, `qa/feature-matrix.md`,
`openspec/changes/shelter-trust-and-reports/specs/shelter-detail-reviews/spec.md`,
`openspec/changes/legal-recovery/tasks.md`, `openspec/specs/shelter-detail-reviews/**`.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| D1 [closed W2] | P0 | docs-puml | `frontend/docs/05-shelter-review-flow.puml` (+`out/`) | The **entire file** documents the removed review model: `ReviewGateway`/`ReviewForm` participants, 6 endpoints, `MyReviewDto`, the contributions review list, rating summary | Rewrite as the as-built detail flow (detail read minus the review fetch, report-shelter, report-occupancy, submit-shelter, contributions shelters-only) **or** delete it and fold the survivors into `04-map-browse-flow.puml`; then fix every filename cross-reference | WS-6 |
| D7 [closed W2] | P0 | docs | `frontend/docs/agent/02-CONTEXT-API.md:40,42,92-94,109,178-180,182,335` | FE API contract ships removed review endpoints and claims `minRating = 1..5 (else 400)` — never validated, the param is ignored | Delete the review rows; correct the filter list to `source`/`hasCapacity`/`provenance`; keep the 403/404/409 vocabulary minus "own review" | WS-6 |
| D9 [open W2: removals landed, but frontend/docs/agent/05-CONTEXT-MAP.md:20,22,26-27,40-41,50,86 still describe a FE provenance filter/badges that do not exist (no ProvenanceFilter in core/models.ts; shelter-gateway.ts sends ?source=&hasCapacity=true) — reviewer partial] | P0 | docs | `frontend/docs/agent/05-CONTEXT-MAP.md:20,28,45,51` | Documents `reviewed`/`minRating` trust filters and a rating select that were removed | Drop both filters; replace the rating sentence with the trust badges the rows actually render (`nonexistentReports`, `statusFlag`, `occupancy`, `provenance`) | WS-6 |
| D10 [closed W2] | P1 | docs-puml | `frontend/docs/01-frontend-architecture.puml` (+`out/`) | `ReviewGateway`/`ReviewForm`/`RatingStars` + `myReviews` + three review-report gateway methods; admin note says "three tabs … Review reports" (real: six tabs); route note lists 9 routes and omits `/privacy`,`/terms` | Delete the removed classes/methods/edges; rewrite the AdminPage note to the six real tabs; add the two routes | WS-6 |
| D11 [closed W2] | P1 | docs-puml | `frontend/docs/04-map-browse-flow.puml` (+`out/`) | Trust row still shows a "Reviewed" toggle and a "Rating select", with a `?reviewed=true&minRating=4` example | Replace with the shipped trust row (`Open` + `Has capacity`) and drop "reviews" from the M5 note | WS-6 |
| D18 [closed W2] | P2 | docs | `frontend/docs/agent/03-CONTEXT-CORE-AUTH.md:63`; `frontend/docs/agent/04-CONTEXT-ACCOUNT-VERIFY.md:70` | "submitting shelters/reviews" and "review flows depend on verification" — there is no review flow | Replace "reviews" with "reports" in both | WS-6 |
| D25 [closed W2] | P3 | docs | `frontend/README.md:168` (and `:85`) | README lists `frontend/docs/*.puml` as source-of-truth UML; if D1's file is deleted the reference dangles (`:85`'s route count is correct — keep it) | Update the listed files to match D1's outcome | WS-6 |
| D13 [closed W2] | P1 | docs | `docs/whitepaper.md:13,54,107,129,190,200,216-218,224,327,360,361,363,375` | The maintained whitepaper advertises the removed review layer, including "the rating filter was demoted (not removed)" and four dead API rows | Rewrite as the report-based trust model; delete the Reviews row and the review-report endpoints; reword the demotion claims (nothing star-related remains) | WS-6 |
| D14 [closed W2] | P1 | docs | `docs/whitepaper-brief.md:23,39,59` | The one-page mirror repeats "Rate & review", "list of all your reviews", average rating | Apply D13 first, then mirror it: delete the Rate & review bullet and the rating/review fragments | WS-6 |
| D15 [closed W2] | P1 | docs | `docs/security/threat-model.md:79,90-91,332` | A2 "Brigading / fake reviews" and the "star display stays" mitigation describe a deleted surface; the CSRF rationale from B7 also needs a home here | Retitle A2 to fake reports, delete the star clause, keep every `CommunityReviewIT` citation (live test), record the stateless-Bearer CSRF rationale if absent | WS-6 |
| D16 [closed W2; caveat: the dropped trust delta file now carries no delta — runner may git rm it if openspec insists] | P2 | openspec | `openspec/changes/shelter-trust-and-reports/specs/shelter-detail-reviews/spec.md:5`; `openspec/changes/legal-recovery/tasks.md:13,30` (and its proposal) | The trust change MODIFIES a requirement the removal deleted, so `openspec validate --all` reports "Archive would refuse this delta"; legal-recovery cites the removed `/account/reviews/mine` | Drop the `Community review list` delta; reword the legal-recovery lines to a surviving endpoint | WS-6 |
| D21 [open W2: still needs `git mv openspec/specs/shelter-detail-reviews openspec/specs/shelter-detail` (no shell in the lane); reviewer confirmed correctly not-touched] | P3 | openspec | `openspec/specs/shelter-detail-reviews/**` → `openspec/specs/shelter-detail/**` | The capability directory still says "reviews" though only the detail page survives (the spec self-documents this follow-up) | `git mv` **after** D16 lands (the archive entry and the trust delta reference the path), then re-run `openspec validate --all` | WS-6 |
| D24 [closed W2] | P3 | docs | `qa/feature-matrix.md:16` | Lists `review_reports` as a live V9 table (dropped by V21) | Correct/remove the row | WS-6 |
| SW-I1 [closed W2] | P3 | docs | `README.md` (API section) | The hand-maintained endpoint table is the exact drift source the 2026-09-14 batch had to repair | Point it at `/swagger-ui` (dev) + the committed `docs/api/openapi.json` once `SW-G2` lands | WS-6 |
| SW-I4 [closed W2] | P3 | docs | `README.md` (guard list) | README documents exactly two boot guards; `SW-B3` adds a third | Document `ApiDocsGuard` alongside `ProdJwtGuard`/`DevEndpointsGuard` in the same commit as `SW-B3` | WS-6 |

## WS-7 — swagger / OpenAPI (15 rows)

Files owned: `pom.xml`, `src/main/resources/application.yml`, `src/test/resources/application.yml`,
new `src/main/java/ee/sheltermap/config/ApiDocsGuard.java`,
new `src/main/java/ee/sheltermap/config/OpenApiConfig.java`,
`src/main/java/ee/sheltermap/api/{ShelterController,AdminController,LocationController,DataSourceController,EmailTestController,SmsTestController}.java`,
`src/main/java/ee/sheltermap/auth/{AuthController,AccountController,VerificationController}.java`,
the DTOs under `src/main/java/ee/sheltermap/api/*Dto.java` + `auth/{MeResponse,TokenResponse}.java`,
the documented enums, `src/main/java/ee/sheltermap/api/ShelterDto.java` (javadoc),
new `docs/api/openapi.json`,
new `src/test/java/ee/sheltermap/api/{OpenApiContractIT,OpenApiSnapshotIT}.java`,
new `src/test/java/ee/sheltermap/config/{ApiDocsProdClosureIT,ApiDocsGuardTest}.java`,
new `frontend/src/app/gateways/api-contract.spec.ts`, and the untracked dev-only `.env`.

| ID | Sev | Area | File(s) + lines | Problem | Required fix | WS |
|---|---|---|---|---|---|---|
| SW-A1+A2 [closed W1] | P2 | swagger | `pom.xml:22-25` + dependencies | No springdoc/openapi dependency exists at all; the POM's convention is a named version property, not an inline version | Add `<springdoc.version>2.6.0</springdoc.version>` and `springdoc-openapi-starter-webmvc-ui`. 2.6.x is the line aligned to Boot 3.3.x/Java 21. Not the v1 artifact, not the webflux starter, not the actuator starter. If the mirror carries no 2.6.x, stop and report (2.7+ targets Boot 3.4+) | WS-7 |
| SW-B1+B2 [closed W1] | P2 | swagger | `src/main/resources/application.yml` (near `:37-41`); `src/test/resources/application.yml:6-13` | The API document is a complete map of the attack surface (admin endpoints included) and must be opt-in; no springdoc config block exists | Add `springdoc.api-docs.enabled`/`swagger-ui.enabled` from `${SPRINGDOC_ENABLED:false}`, `show-actuator: false`, sorters + try-it-out; mirror the block in the test yml (that file must stay in sync) | WS-7 |
| SW-B3 [closed W1] | P2 | swagger | new `src/main/java/ee/sheltermap/config/ApiDocsGuard.java` | Without a guard, a copied dev `.env` publishes the admin API map | Third fail-closed guard mirroring `DevEndpointsGuard`: on a non-dev/test profile with either flag true → `IllegalStateException("PRODUCTION REFUSED TO START: …")` naming the flags and resolved profiles. Reuse `Profiles.isDevTestOnly`, never re-implement profile parsing | WS-7 |
| SW-C5 [closed W1] | P3 | swagger | `.env` (gitignored, repo root) | Local dev needs the flag without committing a value | Add `SPRINGDOC_ENABLED=true` to the untracked `.env` only — never commit it, never set it in `application.yml` | WS-7 |
| SW-D1..D5 [closed W1] | P2 | swagger | new `src/main/java/ee/sheltermap/config/OpenApiConfig.java` | The document needs metadata, the bearer scheme, the single uniform error contract, and grouping that does not leak `/dev` or actuator | `Info` (version read from the build, description naming the existing contract sources), `@SecurityScheme bearerAuth` matching the JWT filter header + global requirement, `ErrorResponse` schema with reusable 400/401/403/404/409/429/500 attached via customizer, three `GroupedOpenApi` beans (public/account/admin) matching no `/dev` or `/actuator` path, relative server `"/"`, tag names matching the groups | WS-7 |
| SW-E [closed W1] | P2 | swagger | `api/ShelterController.java:65-66,103-105,115,130,135,164,176,192,204,220,232,273`; `api/AdminController.java:49-50,74-234`; `auth/AuthController.java:33-34,73,93,103,108,120,127`; `auth/AccountController.java:59-60,91,100,105,113,125,133,149,163`; `auth/VerificationController.java:46-47,79,96`; `api/LocationController.java:43-44,66`; `api/DataSourceController.java:15-16,27`; `api/EmailTestController.java:43-44,72`; `api/SmsTestController.java:35-36,58` | No controller carries `@Tag`/`@Operation`, so no usable document exists. Three traps: `GET /api/shelters/mine` **is** authenticated though `/api/shelters/**` is public; `POST /api/geo/resolve` is authenticated (absent from the permit list); admin-only-ness is invisible to springdoc | Promote existing javadoc into `@Tag`/`@Operation`/`@ApiResponse` (no new prose); empty `@SecurityRequirements` on the genuinely public operations; `x-admin-only` extension + 403 on every admin operation; `@Hidden` on both `/dev` controllers; also reword the `ShelterController` `minRating` javadoc (`B4b`) | WS-7 |
| SW-F1..F3 [open W1: reviewer counted 11 annotated files, not 12 (the RUNLOG line over-counts); auth/CodeSentDto and the 8 domain/* enums remain unannotated — the enums were outside ownership this wave] | P2 | swagger | `api/*Dto.java` (+ nested types), `auth/{MeResponse,TokenResponse}.java`, enums `ShelterStatus`, `ShelterSource`, `ReviewStatus`, `LocationKind`, `Provenance`, `OccupancyBand`, `ShelterReportType`, `VerificationLevel` | Consumers misread the derived/caller-scoped fields (`yourOccupancyBand`, `yourOpenStatus`, `infoRequest`, `provenance`, `lastVerifiedAt` vs `reportCount` vs `nonexistentReports`) and enum values carry no semantics | `@Schema` descriptions promoted from the existing javadoc (including one per enum constant). Never annotate `domain/*` or `persistence/*` | WS-7 |
| SW-F4+F5 [closed W1] | P2 | swagger | `api/AdminShelterReportDto.java`; `api/AdminUserDto.java`; `auth/TokenResponse.java` | Admin-only PII carriers and the credential response would look like ordinary published fields | Label them admin-only / credential in `@Schema`, with no example values on them | WS-7 |
| SW-H1+H5 [open W1: OpenApiContractIT 7/8 — the generated document carries no x-admin-only because springdoc 2.6.0 drops the standalone method-level @Extension; move it into @Operation(extensions=…) and regenerate the snapshot] | P2 | swagger | new `src/test/java/ee/sheltermap/api/OpenApiContractIT.java` | Nothing prevents the document drifting from the controllers, and nothing asserts that secrets, blind-index columns or PII never appear in it | Assert 200 + JSON, the exact path+method inventory, the `bearerAuth` scheme, 403 on every admin op, the public-vs-authenticated split (including the `/mine` trap), absence of `/dev` and `/actuator` paths, plus a forbidden-content sweep (`emailHash`, `phoneHash`, `v1:`, `PII_AES_KEY`, `PII_HMAC_KEY`, `JWT_SECRET`, `ADMIN_PASSWORD`, the published dev default) | WS-7 |
| SW-H2 [closed W1] | P2 | swagger | new `src/test/java/ee/sheltermap/api/OpenApiSnapshotIT.java`; new `docs/api/openapi.json` | A committed snapshot only stays useful if a test regenerates and compares it deterministically | Normalize (sorted paths/properties, no servers or timestamps), compare against the snapshot, fail with a diff and the `-Dopenapi.update=true` regeneration instruction | WS-7 |
| SW-H3 [open W1: ApiDocsProdClosureIT is green only because the untracked .env supplies MAIL_PROVIDER/SMS_PROVIDER; pin app.mail.provider=smtp-pulse + app.sms.provider=twilio in its @TestPropertySource] | P2 | swagger | new `src/test/java/ee/sheltermap/config/ApiDocsProdClosureIT.java` | "Readable in dev without weakening the guards" must be proven, not reviewed | Boot under a non-dev profile with the guard-required properties and assert `/v3/api-docs` + `/swagger-ui/index.html` are never 200 (401/404 acceptable). If this harness cannot boot non-dev, stop and record a documented gap rather than deleting the intent | WS-7 |
| SW-H4 [closed W1] | P2 | swagger | new `src/test/java/ee/sheltermap/config/ApiDocsGuardTest.java` | The new guard needs the same unit coverage as its two siblings | Mirror `ProdJwtGuardTest` shapes: dev/test + enabled ok; non-dev + enabled throws; blank profile + enabled throws; mixed `dev,production` + enabled throws | WS-7 |
| SW-G2 [closed W1: docs/api/openapi.json now exists in the tree (43 paths, generated after the fixer lane ended)] | P2 | swagger | new `docs/api/openapi.json` | Docs drift because no generated artifact exists to diff | Generate it from `SW-H2` (normalized) and reference it from the docs | WS-7 |
| SW-I2 [closed W1] | P3 | swagger | new `frontend/src/app/gateways/api-contract.spec.ts` | The FE/BE contract can drift silently into runtime 404s | Spec: every URL string in `frontend/src/app/gateways/*.ts` exists in the committed snapshot | WS-7 |
| SW-I3dto [closed W1] | P3 | swagger | `src/main/java/ee/sheltermap/api/ShelterDto.java` (javadoc) | The read contract cites only the PUML diagram | Add the OpenAPI document as its machine-readable companion (the diagram header half is `SW-I3puml`, WS-5) | WS-7 |

## HUMAN — needs a decision, no lane should guess

| ID | Sev | Area | File(s) + lines | Problem | Decision needed | WS |
|---|---|---|---|---|---|---|
| H-B8 | P3 | backend | `api/ShelterController.java:57`; `src/main/resources/application.yml:215` | Two tracked TODOs: nearest/bbox queries need GeoService + a PostGIS GIST index and paging; the shelter-licence wording stays unasserted until the publisher's explainer PDF is readable | Fold into the roadmap explicitly, or keep tracked as-is. No code change without the owner's call | HUMAN |
| H-D22 | P3 | docs | `qa/{test-plan.md,feature-matrix.md,security-checklist.md}`; `.agent-orchestration/{task-ledger.md,audit-report.md,checkout-checkpoint-log.md}` | Both directories are orphaned (unlinked from README/docs) but not stale, and `qa/` is the only QA coverage map in the repo | Choose: link them from README's documentation index, or move under `docs/`. **Do not delete** | HUMAN |

## Deferred to a later wave (ownership collision, not dropped)

| ID | Sev | Area | File(s) | Why deferred | Next step | WS |
|---|---|---|---|---|---|---|
| F-13 | P3 | frontend | `core/guards.spec.ts`, `map-page.spec.ts`, `account-page.spec.ts`, `submit-shelter-page.spec.ts`, `login-page.spec.ts` | A shared `testing/` harness refactor touches specs that WS-3 is editing this wave | Run after WS-3 closes | WS-4 (wave 2) |
| SW-F1b | P2 | swagger | the 7 auth request records | Those files are owned by WS-1 this wave (`B1`) and a file must have exactly one writer | Add the `@Schema` annotations after `B1` lands | WS-7 (wave 2) |

## Verified correct — do not "fix" these

Checked by the inventories and confirmed against code; touching them would be a regression:

- `frontend/docs/02-auth-flow.puml` and `03-verification-account-flow.puml` — match `AuthController`/`VerificationController`/`AccountController`. (Known omission, not an error: they predate `GET /account/export` + `DELETE /account`.)
- `context-and-tasks/03-auth.puml` — accurate apart from `D12`.
- `README.md` — the 2026-09-14 P2 pass holds: no removed review endpoint is cited, the filter claim is true, migrations V1–V22 + Java V13 and counts 679/870 match the tree.
- `frontend/README.md:85` — "11 component routes + 2 redirects" is correct.
- `openspec/specs/*` other than `D21` — clean; `shelter-detail-reviews/spec.md` is the deliberate removal record.
- `docs/code-review/*` — dated historical logs; their review references are historically accurate.
- `qa/*` and `.agent-orchestration/*` content — not stale (only orphaned → `H-D22`).
- Backend: no secrets in logs; entity boundary holds (zero `persistence.*` imports outside the package); SMART_ID stub cannot 500; the location-resolver SSRF posture matches its docs; the security chain is default-deny with a commented allow-list; error handling is uniform (~30 typed handlers); every previous dead seam stays removed (0 references).
- Frontend: no dead components/services, no HTTP outside the `api-client` seam, no `*ngIf`/`*ngFor`, no `any`, no review-model symbol/token/i18n key, no animations/transitions (so no reduced-motion gap), consent-banner focus trap is the correct pattern, live-region discipline is good.
- `openspec/changes/shelter-trust-and-reports` — the change itself is legitimately un-archived; only its stale delta needs `D16`.

## Linkage caveats the fixers must respect

1. **Rendered images are checked in**: `context-and-tasks/{render.sh,render_kroki.py}` + `out/`, and `frontend/docs/{out/,render.sh,render_kroki.py}`. Every `.puml` edit must be followed by re-rendering that diagram, or the images people actually read stay stale.
2. **Cross-references by filename**: `context-and-tasks/agent/06-CONTEXT-API.md:3`, `07-STEPS.md:330-331`, `00-README.md:34`, `05-CONTEXT-INGESTION.md:3`, `03-CONTEXT-VERIFICATION.md:3`, `frontend/README.md:168`. If a diagram is deleted, fix its referrers.
3. **Diagram authority**: several diagrams are described as source-of-truth contracts, which is why the P0 rows are P0.
4. **Gate after each wave** (orchestrator, not fixers): `mvn clean test` (679 today, growing with the new tests), `npm test -- --watch=false` (870 today), `openspec validate --all` (28/28 today, and no "Archive would refuse" INFO once `D16` lands).

## WAVE 1 RECOMMENDATION

Start **WS-1, WS-2, WS-3 and WS-7** in parallel; hold **WS-4, WS-5 and WS-6** for wave 2.

Why these four:

1. **They are the only rows that need the executable gates.** WS-1 changes backend semantics (validation bounds, the `Clock` seam, a new `/admin/**` matcher and the docs permit), WS-3 changes user-visible accessibility behaviour, WS-7 adds a dependency plus four new test classes. These are the changes where `mvn clean test` + `npm test` are the real acceptance criteria — exactly the verification the orchestrator (not the lanes) owns.
2. **WS-1 and WS-7 must land together.** `SW-C1` (the profile-aware docs permit) is the only thing that makes `/v3/api-docs` reachable in dev, and it lives in `SecurityConfig.java`, which WS-1 owns — so the swagger tests (`SW-H1`/`SW-H3`) can only be green once WS-1's edit is in the same wave. Splitting them would leave a half-wired security chain.
3. **WS-2 is cheap and closes real coverage holes** (`AccountService`, `JwtAuthenticationFilter`) — the two named P2 test gaps, both worth having green before any refactor wave.
4. **Wave 2 is then pure truth-sync with no semantic risk**: WS-4 (frontend comments/coverage/duplication), WS-5 and WS-6 (diagrams, agent contracts, whitepaper, threat model, OpenSpec). Their gates are `openspec validate --all`, the PUML re-renders and the frontend suite — and `SW-I1`/`SW-I4` in WS-6 explicitly depend on `SW-G2`/`SW-B3` from WS-7, so they cannot be honest before wave 1 lands.

Sequencing inside a workstream matters in two places: `D16` before `D21` (the rename needs the delta fixed first), and `B1` before `SW-F1b` (deferred for exactly that reason).

## Orchestrator additions (wave 1 gate findings) — 2026-09-15T00:28:44Z

| ID | Sev | Area | File(s) | Problem | Required fix | Owner |
|---|---|---|---|---|---|---|
| ORCH-1 [open W2: rows rewritten to the surviving API, but :41 still claims account deletion is not in the product contract while DELETE /account ships (AccountController.java:223-234) — reviewer partial] | P2 | docs | `context-and-tasks/agent/03-CONTEXT-VERIFICATION.md:41,44,45,79` | Still lists removed seams/types (`UserService.getData`, `ShelterRepository.saveAll`, `findAllBySourceIn`, `ShelterReviewRepository`, `api.ShelterReviewService`). It appeared in **no** workstream's ownership list, so it stayed stale after WS-5. | Rewrite those rows to the surviving API (`ShelterQueryService`, `UserRepository`, the real repository interfaces) and drop the removed-type rows. | WS-6 (or a new WS-8 docs sweep) |
| ORCH-2 [open W2: only partly swept — see the D9 finding and the new ORCH-10 (frontend/docs/agent/{01-TASK,06-CONTEXT-SHELTER,07-STEPS}.md review-model residue)] | P3 | docs | `frontend/docs/agent/06-CONTEXT-SHELTER.md:42-45`, `frontend/docs/01-frontend-architecture.puml:182-385`, `frontend/docs/04-map-browse-flow.puml:55-66`, `docs/security/threat-model.md:91`, `qa/feature-matrix.md:16`, `README.md:466-467` | Remaining review-model prose/diagram residue (confirmed by the wave-1 reviewer). | Already covered by WS-6 rows; keep them in scope so the sweep is complete. | WS-6 |

| ORCH-3 [closed W2] | P2 | docs | `context-and-tasks/03-auth.puml:23`, `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:19` | Wave 1's own B2 change (UserCredentials ctor / AdminUser.provisioned now take a caller-supplied Instant) re-staled these two rows immediately after WS-5 had cleaned them. | Update both rows to the new signatures and re-render `03-auth.puml` to out/. | WS-6 / next docs wave |
| ORCH-4 | P3 | test-env | `config/ApiDocsProdClosureIT` (SW-H3) | Passes only because the untracked dev `.env` supplies smtp-pulse/twilio; per the ledger's own caveat it would fail with the documented .env values. | Pin the sender/provider flags in the test profile the way the other config ITs do, so the closure proof does not depend on an untracked file. | WS-7 follow-up |

## Orchestrator reconciliation after wave 1 — 2026-09-15T00:29:16Z

The wave-1 state-writer closed rows from the reviewer's verdict. The orchestrator has since fixed
two of the reviewer's P0 blockers and regenerated the snapshot, so these rows are reconciled here:

| ID | Was | Now | Evidence |
|---|---|---|---|
| B1 | `[open W1]` | **closed** | `AuthRequestConstraintParityTest` now reads the backing FIELD (Jakarta constraints do not target RECORD_COMPONENT); focused run green. |
| SW-H1+H5 | `[open W1]` | **closed** | `x-admin-only` reaches the document via `adminOnlyExtensionCustomizer()` (standalone `@Extension` is not surfaced by springdoc); the 15 dead annotations were removed; `OpenApiContractIT` green. |
| SW-G2 | `[open W1]` | **closed** | `docs/api/openapi.json` regenerated with `-Dopenapi.update=true` after the extension-shape fix; `OpenApiSnapshotIT` green. |
| SW-H3 | `[open W1]` | stays open | Green only because the untracked `.env` supplies smtp-pulse/twilio — see ORCH-4. |

| ORCH-5 | P2 | test-quality | `src/test/java/ee/sheltermap/api/ShelterRequestConstraintParityTest.java:30-36` | Uses the same `RecordComponent::getAnnotations()` technique as the fixed B1 test, so it has ALWAYS reflected an empty constraint set and passes vacuously - it never guarded the `api` request bounds it was written for. | Switch it to the backing-field read (as `AuthRequestConstraintParityTest` now does) and replace its expectations with the real hard-coded constraint sets of the api request records, so removing a bound fails the guard. | next backend wave |

| ORCH-6 | P2 | frontend-i18n | `frontend/src/app/shared/page-shell.html` (skip link), `frontend/src/app/core/i18n/en.ts`, `et.ts` | Wave 2's skip-to-content link is hardcoded English; the i18n catalogs were outside WS-3's file ownership and the parity spec requires en/et in lockstep, so no `nav.skip` key was added. An Estonian user now sees English chrome. | Add a `nav.skip` key to BOTH catalogs and bind the skip link to it, then run the i18n parity spec. | next frontend wave |
| ORCH-7 | P3 | er-verification | `frontend/src/app/shared/confirm-action.ts` | The destroy-confirm focus deferral uses `setTimeout(0)`; deterministic only because the arming signal write schedules Angular's tick first. No automated test covers real keyboard focus movement (skip link -> page, Delete -> Confirm -> Cancel -> focus returns to Delete). | Manual keyboard pass in a browser, then either assert focus explicitly in the spec or replace the timer with an after-render hook. | next frontend wave |

| ORCH-8 | P2 | openspec | openspec/changes/factual-reports-rating-demotion/specs/shelter-reports/spec.md ; openspec/changes/remove-national-id/specs/account-profile/spec.md | Two PRE-EXISTING deltas would be refused at archive time (INFO only; validation is 28/28 after the D16 fix): the first MODIFIES a capability whose base spec does not exist (only ADDED is allowed for a new spec), the second MODIFIES the header "Profile editing (name, password-confirmed)" which no longer exists in the base spec. | Flip the first delta to ADDED Requirements, and re-point or drop the second's MODIFIED block against the live account-profile spec; re-run openspec validate --all and confirm no 'Archive would refuse' INFO remains. | next docs wave |
| ORCH-9 | P3 | docs | frontend/docs/agent/05-CONTEXT-MAP.md ; context-and-tasks/agent/02-CONTEXT-DOMAIN.md:27 ; openspec/changes/legal-recovery/ (specs + design) | Residual drift found by WS-6 outside its rows: the map context doc claims a provenance query param and provenance chips (code sends source chips + hasCapacity; the FE has no provenance field), the domain doc still lists the removed ShelterStatusFlag enum (live type is OpenStatusState), and the legal-recovery change still describes the export as carrying the user's reviews. | Correct all three against the current code and specs. | next docs wave |

| ORCH-10 | P1 | docs | frontend/docs/agent/01-TASK.md ; frontend/docs/agent/06-CONTEXT-SHELTER.md ; frontend/docs/agent/07-STEPS.md | Wave-2 reviewer: these still document the REMOVED review model (ReviewGateway, RatingStars, AdminReviewReportDto, a "Review reports" admin tab) and are owned by NO ledger row - the same never-owned-file class as ORCH-1. They are the last whole-document instances of the deleted feature in the frontend build pack. | Rewrite the review-model rows/sections in all three against the shipped surface (trust reports + confirmation ReviewStatus, the six real admin tabs), then grep the pack for the removed identifiers. | next docs wave |
| ORCH-11 | P3 | docs-process | docs/autopilot/findings/LEDGER.md (WS-5/WS-6 rows) | The ledger still says "out/ re-render pending" for rows whose renders the orchestrator has since regenerated (reviewer content-verified: Trust Reports in 05-shelter-review-flow.svg, now : Instant in 03-auth.svg). | Tick the re-render notes as done. | orchestrator/state-writer |

## ORCHESTRATOR PRIORITY NOTE — 2026-09-15T00:54:34Z

Read this before choosing a wave. Wave 3 (WS-6, WS-3, WS-7) covers the *partial/open* rows of workstreams
already worked twice; **WS-2 has five rows that have never been attempted**, and one of them is the most
valuable single row left in the ledger:

- **ORCH-5**: `api/ShelterRequestConstraintParityTest` reflects `RecordComponent::getAnnotations()`, which is
  always empty for Jakarta constraints - so this guard has NEVER asserted anything real. Switch it to the
  backing-field read (the pattern `AuthRequestConstraintParityTest` now uses) and replace its expectations
  with the real hard-coded bound sets, so removing a bound fails the test.
- **WS-2's rows**: backend test gaps (`auth/AccountService` orchestration, `config/JwtAuthenticationFilter`,
  `RateLimitProperties`) plus the two small residue items (unbounded dev-only test-send inputs,
  `PaasteametRegistryClient` dead-by-default note).

DISPATCH WS-2 IN THE NEXT WAVE (it is file-disjoint from everything already closed: no frontend, no docs).

## Orchestrator additions (v4 wave findings) — 2026-09-15T03:40:00Z (timestamp derived; this lane has no shell clock)

The orphan v4 wave (WS-6, WS-5, WS-4) ran and was stopped by the orchestrator before its state lane
ran, so its reviewer findings were never written down. These rows capture them:

| ID | Sev | Area | File(s) | Problem | Required fix | Owner |
|---|---|---|---|---|---|---|
| ORCH-12 | P1 | openspec | `openspec/changes/shelter-trust-and-reports/specs/map-browse/spec.md:10-50`; `openspec/changes/shelter-trust-and-reports/specs/shelter-reports/spec.md:86-114` | These surviving deltas still specify the removed review/rating model, so archiving that change would re-introduce spec text for a removed endpoint and a dropped table | Strip the review/rating requirements from both deltas (keep the trust/report ones) and re-run `openspec validate --all` | next openspec wave |
| ORCH-13 [closed W2: resolved by this record] | P2 | docs-process | `docs/autopilot/findings/LEDGER.md` (WS-4 rows) | The WS-4 rows were untagged, so STATE.json `open_items` was not traceable for that workstream | Resolved by this record — the 7 WS-4 rows now carry `[closed W2]` (F-06, F-07, F-10, F-11, F-14, MODELS-JSDOC) and `[open W2]` (F-16), so `open_items` traces to the tags | state-writer |
| ORCH-16 | P2 | docs-puml | `context-and-tasks/05-shelter-api.puml` (ShelterController box) | WS-5 partial (the D2 caveat, still open in the v4 review): the box lists 8 of the 10 live controller operations | Complete the box to the 10 live ops and re-render `context-and-tasks/out/` | next docs wave |
| ORCH-17 | P3 | docs | `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:27` | WS-5 partial (the D6 residual, still open in the v4 review): still lists the removed `ShelterStatusFlag` enum; the live type is `OpenStatusState` (overlaps ORCH-9) | Replace the row with the live enum | next docs wave |

| ORCH-14 | P3 | swagger | docs/api/openapi.json, the 8 domain enums | SW-F1..F3's enum half is closed by ruling (A): the 8 enums live in domain/, and the row's own hard rule forbids annotating domain/* - 'domain is pure Java' is a verified invariant, so a swagger-annotations dependency there would trade that invariant for cosmetic prose. Enum values are machine-readable in the document already; only per-constant prose is missing. | If per-value prose is ever wanted, add it WITHOUT touching domain: either a springdoc ModelConverter driven by an external description map, or DTO-field @Schema(allowableValues/description). | future swagger wave |

| ORCH-18 | P2 | docs-puml | context-and-tasks/05-shelter-api.puml:10-22 | The v4 reviewer's caveat: the diagram's ShelterController box lists only 8 of the controller's 10 live operations - `POST /{id}/info-request/reply` and `PUT /{id}/open-status` are missing (verified against ShelterController.java:130,166,184,228,246,268,298,318,337,389). The wave-1 record closed D2 with the 8-op box, so this survived unnoticed. | Add the two missing operations to the box and re-render context-and-tasks/out/. | next docs wave |
