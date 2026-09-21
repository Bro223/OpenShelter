# Agent 11 — Integration (FE↔BE) and DevOps (setup) review

Read-only review. The only file I created is this report. Everything below was verified against **both** sides of
the contract and, where the running app allowed, against the live backend on `:8080` and a live `ng serve` on `:5198`.

## Review

**Versions detected (baseline for the judgement).**

| Side | Version | Source |
| --- | --- | --- |
| Java / Maven | 21 (property) — local Temurin 21.0.7, Maven 3.9.16 | `pom.xml:20`, local toolchain |
| Spring Boot | **3.3.13** | `pom.xml:12` |
| springdoc / jjwt / jsoup / bcprov / testcontainers / twilio | 2.6.0 / 0.12.7 / 1.23.2 / 1.78.1 / 2.0.5 / 10.9.2 | `pom.xml:25-34,95,105,150` |
| Angular | 22.1.x (core 22.1.5 installed, CLI/build 22.1.7, `@angular/build` engines `node ^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0`) | `frontend/package.json:13-19`, `frontend/node_modules/@angular/build/package.json` |
| TypeScript / rxjs / Leaflet | 6.0.3 (`>=6.0 <6.1` peer) / 7.8.2 / 1.9.4 | installed vs `frontend/node_modules/@angular/compiler-cli/package.json` |
| FE test stack | Vitest 4.1.11 + jsdom 28.1.0, `@angular/build:unit-test`, no e2e framework | `frontend/package.json:24-28`, `frontend/angular.json:80-85` |
| Node / npm | local Node v26.8.2, npm 11.19.1 (`packageManager: npm@11.19.0`) | local toolchain, `frontend/package.json:11` |

**Generation/tooling baseline verified.** `docs/api/openapi.json` is the committed snapshot; I ran
`flock /tmp/openshelter-mvn.lock mvn -Dtest=OpenApiSnapshotIT test` on this working tree → **Tests run: 1, Failures: 0**
(`target/surefire-reports/ee.sheltermap.api.OpenApiSnapshotIT.txt`). So the snapshot the frontend gates against is in
sync with the current (uncommitted) sources, and every field comparison below is valid for this tree. The prior full
run in `target/surefire-reports/` reports **1098 tests / 0 failures / 0 errors / 0 skipped**; the frontend suite I ran
(`CI=true npx ng test --watch=false`) reports **56 test files / 1263 tests passed**. Both suites are green *and both
miss the drift in F1/F2* — nothing in either suite compares the two contracts field by field.

**Working tree note.** 12 modified files from other lanes (backend + docs + two frontend files). I reviewed the tree as
it stands; none of my findings is caused by those edits (F1/F2/F5/F10 are properties of committed code).

---

## Correct (areas I checked and found clean)

1. **FE → BE URL **and verb** contract — clean.** I extracted every `api.get/post/put/delete('/…')` literal from
   `frontend/src/app/gateways/*-gateway.ts` with the same normalisation the committed gate uses and compared verb+path
   against `docs/api/openapi.json`: **54/54 pairs exist with the matching HTTP method, 0 mismatches**. No frontend call
   hits a non-existent endpoint. (The committed gate — `frontend/src/app/gateways/api-contract.spec.ts` — only compares
   *paths*, so a verb drift would slip through it; there is none today.)
2. **Request-body DTOs — field-for-field clean.** Every frontend request interface matches its backend record 1:1 in
   name and JSON type, with no renames/reshapes: `RegisterRequest`, `LoginRequest`, `RefreshRequest`,
   `PasswordResetRequest(+Confirm)`, `VerifyRequest(+Confirm)`, `ChangeEmailRequest`, `ChangePhoneRequest`,
   `ConfirmChangeRequest`, `ProfileUpdateRequest` (`models.ts:74-124` vs `src/main/java/ee/sheltermap/auth/*.java`),
   `CreateShelterRequest`, `UpdateShelterRequest`, `ReportShelterRequest`, `ReportOccupancyRequest`,
   `PutOpenStatusRequest`, `InfoRequestReplyRequest`, `ReviewShelterRequest`, `ReorderGuidanceRequest`,
   `Create/UpdateGuidancePostRequest`, `LocationResolved`, `SiteTextEntryDto` (`models.ts` vs `src/main/java/ee/sheltermap/api/*.java`,
   `sitetexts/SiteTextEntry.java:1`). Also verified live: `POST /api/shelters`, the report/occupancy/open-status bodies all
   bind.
3. **Enums typed as string unions — clean.** Every frontend union equals the backend enum members:
   `VerificationLevel` (`models.ts:27` / `domain/VerificationLevel.java:4`), `ShelterStatus`, `ReviewStatus`,
   `LocationKind`, `ShelterSource`, `ShelterSourceFilter` (`api/ShelterSourceFilter.java:6`), `OccupancyBand`,
   `ShelterReportType`, `OpenState` (`domain/OpenStatusState.java:4`), `GuidanceStatus`, `AdminUserDto.kind`
   (`persistence/UserKind.java:3`), `AdminAlertKind` (kebab-case strings equal `alerts/ThrottleAlert.java:21-27`, pinned
   by `src/test/java/ee/sheltermap/api/AdminAlertsIT.java:228,247,277`), `AdminAuditAction` (the 14 live values equal
   `app/ModerationAuditLog.java:25-52`; the two extra `REVIEW_HIDE`/`REVIEW_RESTORE` are deliberate, documented
   vocabulary kept only for the label map, `models.ts:625-627`), and `CommunityPulseRecentReport.kind`
   (`OPEN/CLOSED` = `OpenStatusState.name()`, `SPACE/GETTING_FULL/FULL` = `OccupancyBand.name()`,
   `api/ShelterQueryService.java:720-722`).
4. **The uniform error shape — consistent on both sides.** `ErrorResponse{timestamp,status,error,message,path}`
   (`api/ErrorResponse.java:15`) is exactly `ErrorResponseBody` (`frontend/src/app/core/api-error.ts:7-13`); the frontend
   re-validates the five fields and degrades gracefully for any non-uniform body
   (`frontend/src/app/core/api-error.ts:47-58,113-134`). Verified live: `GET /account/me` answers
   `401 {"timestamp":"2026-09-20T21:20:34.056551059Z","status":401,"error":"Unauthorized","message":"Authentication
   required","path":"/account/me"}`, and the running app's 400/413/500 bodies all have this shape (timestamp as an ISO
   string, which is what the FE's `typeof string` check requires).
5. **Validation constants duplicated in both layers — all consistent today.** I compared each frontend bound with its
   bean-validation counterpart: name 200 (`CreateShelterRequest.java:8` vs `submit-shelter-page.ts:163`), description
   2000 (`:11` vs `:171`), report detail 500 (`ShelterReportRequest.java:7` vs `shelter-detail-page.ts:368`), capacity
   1…100 000 (`:12` vs `shared/form-helpers.ts:15-16`), reject reason 500 / info-request 2000
   (`AdminShelterReviewRequest.java:8`, `InfoRequestReplyRequest.java:7` vs `admin-page.ts:82,86`) or `FormControlType`
   min 8 (`PasswordResetConfirmRequest.java`), e-mail 255 / phone 64 (`account-page.ts:132,144`), guidance title 255 /
   slug 200 / locale 5 / hero alt 300 / import url 2048 (`CreateGuidancePostRequest.java:4-11` vs `guidance-editor.ts:591-626`).
   No mismatch found — this is a *risk* (see F12), not a defect.
6. **`.gitignore` — clean.** No tracked build artefacts (`git ls-files` has no `target/`, `node_modules/`, `dist/`,
   `.angular/` entry; the only vendored `dist` is the deliberately committed Quill 2.0.3 asset), `.env` is **not**
   tracked (`git ls-files .env` → empty) and is ignored (`.gitignore:38-40`), `data/`, `.pi/`, `.vitest/`, `.attach_pid*`,
   IDE dirs and both `node_modules` levels are covered. No untracked file that should be ignored, and no ignored file
   that should be tracked. No secrets in `frontend/src/environments/*.ts` (public-only `production`/`apiUrl`).
7. **Setup asset that works:** `dev-start.sh` (profile pinning, Postgres pre-flight with an actionable message) and
   `docker-compose.yml` (postgres:16 + healthcheck) are correct and the README's steps 1/4/6 correspond to them.
   `GET /actuator/health`, `/api/shelters`, `/api/guidance`, `/admin/shelters` all answer as documented on the running
   instance.

---

## Fixed

**None — read-only review.** No source file was modified; only this report was created.

---

## Findings

### High

#### F1 — Admin shelter list: the occupancy timestamp field is wrong, so the admin's recency column always reads "just now"
* **Where.** FE type `frontend/src/app/core/models.ts:511-515` declares `AdminOccupancy.reportedAt`; it is consumed at
  `frontend/src/app/features/admin/admin-page.ts:426-435` (`lastReportedAt: occ.reportedAt`) and rendered through
  `frontend/src/app/shared/shelter-copy.ts:283-289` → `recencyText` (`shelter-copy.ts:266-275`).
* **Backend truth.** `AdminShelterDto.occupancy` is typed `ShelterDto.Occupancy` (`api/AdminShelterDto.java:62`), which is
  `record Occupancy(OccupancyBand band, int reportCount, Instant lastReportedAt)` (`api/ShelterDto.java:198-201`),
  populated from the same batched map as the public list (`api/ShelterQueryService.java:524` ← `:574`). The committed
  snapshot agrees: `docs/api/openapi.json` → `AdminShelterDto.properties.occupancy → $ref Occupancy`, whose only timestamp
  property is **`lastReportedAt`**; a backend IT pins the same key on the public list
  (`src/test/java/ee/sheltermap/api/ShelterReportIT.java:541`, `jsonPath("$[0].occupancy.lastReportedAt")`). Live
  `GET /admin/shelters` (307 rows, admin JWT) confirms the row shape carries `occupancy` and has no `reportedAt` key.
* **Why it matters.** `occ.reportedAt` is `undefined` at runtime, `Date.parse(undefined)` → `NaN`, so `recencyText`
  returns the literal **"just now"**. A fresh-occupancy report from 1 h 55 m ago is displayed to the moderator as
  "just now" — the one signal that tells an admin whether the occupancy claim is still live. No test catches it: the
  fixtures encode the same wrong field (`frontend/src/app/gateways/admin-gateway.spec.ts:21`,
  `frontend/src/app/features/admin/admin-page.spec.ts:80`) and the assertion passes against them
  (`admin-page.spec.ts:491` expects `'Full · 12 min ago'` from a fixture that supplies `reportedAt`).
* **Fix (minimal).** Rename the field to `lastReportedAt` in `models.ts:514`, drop the shim in `admin-page.ts:426-435`
  (or keep the shim one-directional), and update the three fixtures. Better: extend the contract gate (F11) so a field
  rename on either side fails a test.

#### F2 — Bilingual guidance: two contract fields and five endpoints exist only in the backend; a fallback-language post renders as if it were the reader's language
* **Where (BE).** `api/GuidancePostDto.java:38-39` (`alternates`, `localeFallback`), populated by
  `api/GuidanceController.java:145-162` and `guidance/GuidanceService.java:315-328`; the contract explicitly says the map
  is "the field the frontend language switcher follows" (`domain/PublicGuidanceView.java:16-25`,
  `api/GuidanceController.java:43`). Live proof: `GET /api/guidance?locale=en` (detail) returns
  `alternates={"en":…,"et":"nadal-omal-joul-…","ru":"…-ru"}, localeFallback=false`, and a post with no translation in the
  asked locale is served **200** in the default locale with `localeFallback=true` (`GuidanceService.java:316-323`).
* **Where (FE).** `frontend/src/app/core/models.ts:792-810` `GuidancePostDto` has neither field; a whole-`src` grep for
  `alternates`, `localeFallback` and `translations` returns **zero** non-spec hits. `frontend/src/app/features/guidance/guidance-detail-page.html`
  renders only title/hero/body/date, and the gateway's doc still claims a cross-locale slug 404s
  (`frontend/src/app/gateways/guidance-gateway.ts:17,44,47-52`), which is **false** for the detail endpoint.
* **Where (endpoints).** `POST/GET /admin/guidance/{id}/translations`, `PUT/DELETE /admin/guidance/{id}/translations/{locale}`
  and `POST /admin/guidance/{id}/translations/attach` (`api/AdminGuidanceController.java:426-528`) appear in the snapshot
  and are called by **nothing** in `frontend/src`. A post gets exactly one translation row (its own locale) at creation
  (`GuidanceService.java:404-406` `saveOwnTranslation`), so second languages can only be created through those five
  endpoints — i.e. multilingual guidance is unreachable through the product UI.
* **Why it matters.** (a) An English reader opening an Estonian-only link silently gets Estonian prose under the English
  chrome, and switching language appears to do nothing — with the API already telling the FE that a fallback happened.
  (b) A shipped backend feature (plus the V26 migration, the `sortOrder`-per-locale reorder work and the audit actions
  `GUIDANCE_*`) has no consumer, so it cannot be exercised end to end and will rot.
* **Fix.** Either consume the contract — a language switcher over `alternates` and a "shown in Estonian (not available
  in English)" notice keyed on `localeFallback`, plus the admin translation editor — or delete the fields/endpoints and
  make the public reads 404 a post that has no requested-locale translation (which is what the FE already assumes).

#### F3 — `DELETE /account` is not proxied by the dev server: account erasure never reaches Spring in the documented local setup
* **Where.** `frontend/proxy.conf.json:4` maps `"/account/"`; Vite matches a string context with
  `url.startsWith(context)` (`frontend/node_modules/vite/dist/node/chunks/node.js`, `doesProxyContextMatchUrl`), and
  Angular hands the object through unchanged (`frontend/node_modules/@angular/build/src/utils/load-proxy-config.js:99-115`
  only rewrites glob patterns). `/account` therefore does not match `"/account/"`. The caller is
  `frontend/src/app/gateways/account-gateway.ts:80-82` (`api.delete('/account')`); the README repeats the same proxy
  list (`README.md:491`), so the docs confirm a configuration that does not work.
* **Live repro.** Against a real `ng serve` with this `proxy.conf.json`:

  ```text
  curl -X DELETE -H 'Accept: application/json' http://localhost:5198/account
    -> 404 text/html  "Cannot DELETE /account"      # never reaches the backend
  curl -H 'Accept: application/json' http://localhost:5198/account/me
    -> 401 application/json  {"status":401,…,"path":"/account/me"}   # backend reached
  ```
  I also reproduced the non-match on a minimal Vite server loaded with the same object (only `DELETE /account` fails;
  `/account/me`, `/verify/request`, `/admin/shelters`, `/api/shelters/1` all proxy).
* **Why it matters.** The GDPR/legal-recovery erasure flow is broken in the only environment a developer or reviewer
  uses; the failure is invisible to `api-contract.spec.ts`, which compares paths (not the proxy table) and correctly
  finds `/account` in the snapshot. A production same-origin reverse proxy built from this list would break it too.
* **Fix.** Change the key to `"/account"` (which also covers `/account/…` via `startsWith`) or add a distinct
  `"/account"` entry, and correct `README.md:491`.

### Medium

#### F4 — Uploads above the servlet cap answer **500**, not the documented 413; the frontend's 413 branch is dead code
* **Where.** `src/main/resources/application.yml:33-40` raises the container cap to `max-file-size: 6MB` while the app's
  own cap is `app.media.max-bytes: 5242880` (`application.yml:292`); `api/ApiErrorHandler.java` has **no** handler for
  `MaxUploadSizeExceededException`/`MultipartException` (grep: zero hits, the only `Multipart`-related handling is the
  app-level `MediaTooLargeException`), so the catch-all at `api/ApiErrorHandler.java:469-472` maps it to 500 and logs a
  stack trace as ERROR. The frontend branches on 413 at `frontend/src/app/features/admin/guidance-editor.ts:1167`.
* **Live repro** (`POST /admin/media`, admin JWT, on the running backend):

  ```text
  7 000 000 B  -> 500  {"status":500,"error":"Internal Server Error","message":"Internal server error","path":"/admin/media"}
  5 600 000 B  -> 413  {"status":413,"error":"Payload Too Large","message":"The uploaded file exceeds the maximum size of 5242880 bytes"}
  ```
* **Why it matters.** The 413 copy path the frontend implements can never fire for the 6 MB+ band: the admin sees
  "internal server error" for a plain "file too large", a routine user mistake is logged as an unhandled exception, and
  the API lies about the resource state (500 vs 413). Same applies to the hero-image import upload band.
* **Fix.** Add `@ExceptionHandler(MaxUploadSizeExceededException.class)` returning `HttpStatus.PAYLOAD_TOO_LARGE` with the
  uniform body (reuse the existing message), keeping the container cap above the app cap as documented.

#### F5 — The test-profile `application.yml` is not the mirror it claims; four silent drifts, one of them behavioural
* **Where.** `src/test/resources/application.yml:5-9` states the file is "a mirror, not an overlay … the ONLY additions
  are: 1. `spring.profiles.active: test` … 2. nothing else". `diff` against `src/main/resources/application.yml`
  (comment-stripped) shows, in addition to the profile line:
  * `app.retention.*` (6 keys, main `application.yml:262-271`) — **absent** from the test file (grep: no `retention:` in
    the test file at all); tests therefore run the annotation/Java defaults (`RetentionScheduler.java:26,37`), not the
    documented values.
  * `app.media.import-connect-timeout/-read-timeout/-budget/-max-side` (main `application.yml:296,299,303,308`) —
    **absent**; the Java defaults happen to coincide today (`JdkHeroImageFetchClient.java:71-72`,
    `HeroImageImportService.java:117-118`).
  * `app.ratelimit.reset-confirm-capacity/-refill-per-second` = **5 / 0.084** in tests vs **10 / 0.2** in main
    (`application.yml:182-183`); the production default is never exercised (both ITs override:
    `auth/AuthApiIT.java:39-40`, `security/PasswordRecoveryFlowIT.java:44-45`).
  * `app.limits.otp-per-contact-max` = **100** in tests vs **5** in main (`application.yml:221`) — the per-contact OTP
    cap is effectively disabled in every test that does not override it (only `auth/OtpContactCapIT.java:45` and
    `api/AdminAlertsIT.java:62` do).
  * (`app.admin.email/password` are pinned to empty literals instead of `${ADMIN_EMAIL:}`/`${ADMIN_PASSWORD:}`.)
* **Why it matters.** Because the test-classpath file **shadows** the main one rather than merging, any new `app.*` key
  added to main is silently missing in tests; nothing asserts the two files agree, and two rate limits already differ.
  A future change to the retention horizons or the OTP cap cannot be validated by the suite.
* **Fix.** Keep only the profile activation in the test resource (rename it `application-test.yml`, activate it via
  `@ActiveProfiles("test")`/surefire so it overlays instead of shadowing), and/or add a test that parses both files and
  asserts identical key sets and values; where a test-only override is genuinely intended, add it on the test class
  (`@TestPropertySource`) with a comment — as `AuthApiIT` already does.

#### F6 — DTO media URLs are origin-relative, so the README's own cross-origin deployment breaks every image
* **Where.** `guidance/MediaService.java:52` `MEDIA_URL_PREFIX = "/api/media/"`, delivered as `MediaAssetDto.url`
  (`api/AdminMediaController.java:164`), `GuidancePostDto.heroImageUrl` (`api/GuidanceController.java:161`) and
  `AdminGuidancePostDto.heroImageUrl` (`api/AdminGuidanceController.java:602`). The frontend binds them straight into
  `[src]` (`frontend/src/app/features/guidance/guidance-detail-page.html:27`,
  `frontend/src/app/features/admin/guidance-editor.html:127,175`); only `ApiClient` prefixes the configured API origin
  (`frontend/src/app/core/api-client.ts:22,41`).
* **Why it matters.** `frontend/src/environments/environment.ts:8-25` and `frontend/README.md:120-123` instruct a
  deployment whose API is on another origin to set `apiUrl` to that origin. In exactly that (documented) configuration
  every JSON call works while **every hero image and admin thumbnail 404s** against the SPA's origin — a silent,
  image-only failure that no test covers (the FE never prefixes these strings and the BE never makes them absolute).
* **Fix.** Prefix the three media fields in one place on the FE (a small mapper used where DTOs are adopted) or return
  absolute URLs from the backend via a configured public base; alternatively document that same-origin is mandatory and
  remove the cross-origin instruction.

#### F7 — There is no profile-specific Spring configuration: dev defaults ride the production code path
* **Where.** The backend has exactly one config file, `src/main/resources/application.yml` (plus the test-classpath copy in
  F5). Its first line calls itself "local development configuration", yet it also carries the production-shape values:
  the published dev JWT default (`application.yml:155-157`), `smtp-pulse.com` as `spring.mail.host`
  (`application.yml:20`) and `jdbc:postgresql://localhost:5432/sheltermap` with `sheltermap/sheltermap`
  (`application.yml:6-9`). Every profile — `dev`, `test`, `production` (`config/ApiDocsProdClosureIT.java:50`) — boots
  from this one file.
* **Why it matters.** A deploy that forgets `DB_URL`/`SMTP_HOST` silently points at localhost or at the dev SMTP relay;
  the boot guards cover the JWT secret and the dev diagnostics/springdoc only. The README acknowledges this residual
  (`README.md:767-772`), but there is no structural guard — no `application-prod.yml`, no required-property binding that
  makes the omission fatal. setup/production boundary is enforced by discipline, not configuration.
* **Fix.** Add `application-prod.yml` and/or `@Validated @ConfigurationProperties` with no defaults for `DB_URL`,
  `SMTP_HOST` (`MAIL_PROVIDER=smtp-pulse`), so a prod boot with dev values fails closed like `PiiKeys` does.

#### F8 — The README quickstart cannot be completed by a new developer as written
* **Where.** `README.md:462-494`. Two concrete blockers:
  1. **No Node requirement.** The stated requirements are "JDK 21, Maven 3.9+, Docker (Compose)" (`README.md:464`), but
     step 6 is `cd frontend && npm install && npm start`, and Angular 22.1.7 requires
     `node ^22.22.3 || ^24.15.0 || >=26.0.0` (`frontend/node_modules/@angular/build/package.json` engines). A developer
     on the still-widely-installed Node 20 or 22.12–22.21 gets a cryptic install/run failure, and `frontend/package.json`
     declares no `engines` field to fail fast.
  2. **No `.env` step.** `PiiKeys` throws when `PII_AES_KEY`/`PII_HMAC_KEY` are blank in **every** profile
     (`security/PiiKeys.java:34-35,46-51`; `application.yml:92-93` sets them from `${PII_AES_KEY:}`), so step 4
     (`./dev-start.sh`) cannot boot on a fresh clone; the repo ships no `.env.example`/template (the README only reserves
     "a `*.env.example` naming convention", `README.md:539`). The variables are documented 40 lines further down in the
     configuration table and in the "PII at rest" section, but the quickstart never points there.
* **Why it matters.** "Can a new developer run this from the README?" — not without reverse-engineering a `.env` from a
  different section and guessing a supported Node version. Everything else about the quickstart (dev-start.sh, the
  health check, the fail-closed guards, the proxy note) is unusually good.
* **Fix.** Add `.env.example` with `openssl rand -base64 32` placeholders for `PII_AES_KEY`/`PII_HMAC_KEY`, `JWT_SECRET`
  and `ADMIN_*`; make it step 0 and reference it from step 4; add `Node.js 22.22+ (or 24/26)` to the requirements line
  and an `engines` field to `frontend/package.json`.

### Low

#### F9 — No CI and no application image: the green suites are only green on this machine
* **Where.** No `Dockerfile` for the app and no CI configuration anywhere in the tree (searched: `Dockerfile*`,
  `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, `*.tf`, `Procfile` → none). The only container is the dev database
  (`docker-compose.yml:4-24`), and `README.md:716-772` is a manual deployment checklist whose frontend step is "serve
  `dist/frontend/browser/` from any static host".
* **Why it matters.** Nothing runs `mvn test` (1098 tests, incl. Testcontainers ITs) or `ng test` (1263 tests) on a
  change; nothing pins JDK/Maven/Node for a build; a production image has to be invented from scratch, with the
  fail-closed guards (the JWT/PII/dev-endpoint guards) as the only protection against a misconfigured deploy (F7).
* **Fix.** Add a minimal CI job (`mvn -B -ntp test` + `npm ci && npx ng test --watch=false`, the latter needs the
  regenerated snapshot step the api-contract spec documents) and a multi-stage Dockerfile (JDK 21 build → JRE 21 run,
  `SPRING_PROFILES_ACTIVE=prod`, no `.env` copied — per `README.md:768-772`).

#### F10 — Dead contract surface: `provenance` (two DTOs) and `MediaAssetDto.sourceUrl` have no consumer, and the FE never sends the bbox/paging/provenance query params
* **Where.** `provenance` is on every shelter row (`api/ShelterDto.java:207-215`, `api/AdminShelterDto.java:75-80`,
  computed by `Provenance.of(...)` at `api/ShelterQueryService.java:530`) and documented as the single source of truth
  ("The UI never re-derives it"); `frontend/src` contains **no** `provenance` reference. Live `GET /api/shelters/1` and
  `GET /admin/shelters` both return the key. The frontend instead derives its labels from `source` + `reviewStatus`
  (`frontend/src/app/shared/shelter-copy.ts:42-52,63-77`), which cannot express `REPORTED_INACTIVE` or a
  `nonexistentReports`-driven state.
  `MediaAssetDto.sourceUrl` (`api/MediaAssetDto.java:15,29`) is absent from the FE type (`models.ts:881-901`).
  `GET /api/shelters`'s `provenance`, `minLat/minLng/maxLat/maxLng`, `limit`, `offset` (`api/ShelterController.java:182-213`)
  are never sent: the FE builds only `source` + `hasCapacity` (`frontend/src/app/gateways/shelter-gateway.ts:127-137`),
  although `README.md:795-807` and `frontend/README.md:167-173` describe viewport filtering + paging as shipped and
  imply the list uses it.
* **Why it matters.** Two vocabularies for "where does this row come from" now exist (server `Provenance` vs client
  labels), so a change of precedence in `Provenance.of` would not change a single pixel while the docs say the server
  decides; and the README overstates the shipped viewport/paging feature.
* **Fix.** Pick one: consume `provenance` in the badge logic (and delete the duplicated label derivation), or drop the
  field; same for `sourceUrl`. Either use the bbox/paging params or correct the README/frontend README wording.

#### F11 — The contract gate is URL-only, which is exactly the blind spot F1–F3 live in
* **Where.** `frontend/src/app/gateways/api-contract.spec.ts:100-125` compares gateway URL literals to the snapshot's
  `paths` keys only — not fields, types, nullability, enum members, query parameters, HTTP verbs, or the dev proxy table.
  It is the only cross-stack test; the backend's own gates (`config/DocumentationFactsTest`, `api/OpenApiSnapshotIT`,
  which I ran green) pin the README table and the snapshot, so the *snapshot* is trustworthy while the *frontend's use
  of it* is unchecked.
* **Why it matters.** F1 (field name), F2 (two fields + five endpoints), F3 (proxy table) and F6 (relative media URLs)
  are all invisible to the current gate while the suite reports 1263 passing tests.
* **Fix.** Extend the spec: (1) parse `frontend/src/app/core/models.ts` and assert each interface's field set is a subset
  of the matching OpenAPI schema with matching JSON types/nullability; (2) assert enum unions equal schema `enum` values;
  (3) assert each gateway literal's verb exists at its snapshot path; (4) assert every context key in
  `frontend/proxy.conf.json` matches every gateway literal that starts with it. All four are feasible with the file
  reads the spec already does (the sub-set assertion must allow the documented intentional extras).

#### F12 — Cross-stack vocabularies that must be edited in two places by hand (drift risk, no defect today)
* **Where.** The locale set and default are duplicated three times: `frontend/src/app/core/i18n/locale.ts:9-12`
  (`'en' | 'et' | 'ru'`, default `en`), `sitetexts/SiteTextKeys.java:69` (`LOCALES = Set.of("en","et","ru")`) and
  `application.yml:313` (`app.guidance.default-locale: ${GUIDANCE_DEFAULT_LOCALE:en}`); `README.md:313` itself notes the
  flip "means changing BOTH places". A locale added only in the FE is accepted by the chrome but rejected with 400 by
  `PUT /admin/site-texts` (`sitetexts/SiteTextsService.java` key/locale validation) and yields an empty public guidance
  index (`GuidanceService.listPublic` → `findPublishedInLocale`).
* **Why it matters.** Small but real: the vocabulary has three owners and no test ties them together; the failure mode is
  a 400 on the admin settings save, not a compile error.
* **Fix.** Have the FE derive its locale list from a single place that is asserted against the backend (e.g. an
  `/api/site-texts`/health payload or an added entry in the contract gate), or at minimum add a test asserting the three
  lists agree.

---

## Merge verdict

**OK with notes.** The integration is materially better than average: the differential risks that usually break FE/BE
pairs (URLs, verbs, request bodies, enums, error shape) are all consistent and mostly *gated* by
`api-contract.spec.ts` + `OpenApiSnapshotIT`, and both suites are green on this tree. But two real defects sit in the
gate's blind spot — **F1** (the admin occupancy recency is always "just now" because the FE reads `reportedAt` where the
API sends `lastReportedAt`) and **F3** (`DELETE /account` is unreachable in the dev setup, reproduced live) — plus **F2**
(a shipped bilingual-guidance contract with no consumer, where a foreign-language post renders with no notice). I would
merge F1/F3 fixes with the release and treat F2, F4, F5, F6, F7, F8 as the follow-up batch (F8 and F9 are the ones that
cost a new contributor an afternoon). No P0/blocker: nothing here corrupts data or leaks anything, and every finding has
a small, local fix.

---

## Top 5 findings

1. **F1 — `AdminOccupancy.reportedAt` should be `lastReportedAt`** (`frontend/src/app/core/models.ts:514` vs
   `api/ShelterDto.java:198-201`): the admin occupancy column always renders "just now"; the fixtures encode the same
   wrong field, so 1263 green FE tests hide it. One-line fix (plus fixtures) or a field-level gate.
2. **F3 — `DELETE /account` is not proxied in dev** (`frontend/proxy.conf.json:4` uses `"/account/"`, Vite matches with
   `startsWith`): account erasure never reaches Spring; reproduced live (`404 text/html "Cannot DELETE /account"` while
   `/account/me` proxies). Fix the key and `README.md:491`.
3. **F2 — Bilingual guidance: `alternates`/`localeFallback` and the five `/admin/guidance/{id}/translations*` endpoints
   have zero frontend consumers** (`api/GuidancePostDto.java:38-39`, `api/AdminGuidanceController.java:426-528`, live
   responses carry both fields): a foreign-language post renders with no notice and no switcher, and translations cannot
   be authored from the UI at all.
4. **F4 — Oversized uploads answer 500 instead of 413** (`application.yml:33-40` + missing
   `MaxUploadSizeExceededException` handler → `api/ApiErrorHandler.java:469-472`; live: 7 MB → 500, 5.6 MB → 413):
   the FE's 413 copy is unreachable and routine input is logged as an unhandled exception.
5. **F5 + F8/F9 — the setup story has holes** (`src/test/resources/application.yml:5-9` is not the mirror it claims:
   retention keys absent, reset-confirm 5/0.084 vs 10/0.2, per-contact OTP cap 100 vs 5; README's `Running locally`
   omits the required `.env`/PII keys and any Node version; no CI, no app Dockerfile). Both backends and the frontend
   build and test reproducibly only on the machine they were written on.
