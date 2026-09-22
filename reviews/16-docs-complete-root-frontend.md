# 16 — Complete documents review, lane 1/3: root + frontend document sets

**Reviewer:** DOCS-COMPLETE-1 (Wave 11, root+frontend lane)
**Tree:** `8cebe1e` (clean at start; `git status` re-verified clean before the build measurement)
**Scope:** `README.md`, `frontend/README.md`, `frontend/docs/**`, and every other markdown at the repository root or under `frontend/`. No CHANGELOG-style files exist anywhere in the repo (checked `find -iname "*changelog*"` — none), so there is nothing to review there.
**Out of scope (other lanes):** guidance hero templates/styles, i18n catalogs, `docs/**`, `context-and-tasks/**`, `openspec/**`, `qa/**`, `reviews/**`.
**Read-only:** only this file was written. No commits, no server start/stop.

## Inventory (complete)

| # | File | Lines | Purpose (one line) |
|---|------|-------|--------------------|
| 1 | `README.md` | 876 | Backend product doc: features, API table, run/configure/deploy, security posture |
| 2 | `frontend/README.md` | 238 | Angular SPA doc: stack, quick start, build/budget, token storage, deferrals |
| 3 | `frontend/docs/rich-text-editor.md` | 267 | The admin Quill 2.0.3 vendored editor: contract, wiring, re-vendor procedure |
| 4 | `frontend/docs/agent/00-README.md` | 102 | Frontend agent build-pack index + dated milestone status log |
| 5 | `frontend/docs/agent/01-TASK.md` | 139 | Frontend task contract: scope, stack, layout, non-negotiable rules |
| 6 | `frontend/docs/agent/02-CONTEXT-API.md` | 444 | Backend API contract as the frontend consumes it (endpoints, TS mirrors) |
| 7 | `frontend/docs/agent/03-CONTEXT-CORE-AUTH.md` | 75 | Core layer + auth store/guards context (M1–M2) |
| 8 | `frontend/docs/agent/04-CONTEXT-ACCOUNT-VERIFY.md` | 73 | Verification + cross-channel contact change context (M3) |
| 9 | `frontend/docs/agent/05-CONTEXT-MAP.md` | 141 | Map & browse context (M4): Leaflet wrapper, filters, legend, distances |
| 10 | `frontend/docs/agent/06-CONTEXT-SHELTER.md` | 131 | Shelter detail & submission context (M5) + M8 contributions |
| 11 | `frontend/docs/agent/07-STEPS.md` | 312 | Ordered milestone build plan M0–M6 + post-M6 wave records |
| 12 | `frontend/src/vendor/quill/README.md` | 143 | Vendored Quill 2.0.3 provenance, integrity, re-vendor procedure (third-party bytes doc) |

**12 files, 2,941 lines.** (Root markdown: `README.md` is the only tracked `.md` at the repo root; `LICENSE` is not markdown. `.pi/` and `.agent-orchestration/` dot-directories are tooling artifacts, not project documents.)

## Method — what a reader would run, run by this lane

- `DocumentationFactsTest` (targeted, not the full suite): **4/4 green** on this tree (`flock /tmp/openshelter-mvn.lock mvn -q test -Dtest=DocumentationFactsTest`, exit 0; surefire: `tests=4 failures=0`). Pins the Flyway range, every controller mapping → README presence, cited repo paths, and the no-bare-test-counts rule over both READMEs.
- **22 live API probes** against the running dev server (`:8080`), outputs saved under `/tmp/osh-docs-1/out/*.json` (never to console): health, shelters list/box/limit-0/limit-201, detail 200/404, data-source, site-texts, guidance + `X-Total-Count: 7`, media 404 + HEAD (200, `Cache-Control: … immutable`, Content-Type/Length), mine/admin 401, register 400, login generic 401, reset-request 200-for-unknown, v3/api-docs 200, dev/email-test 401.
- **Fresh `ng build`** (production) to `/tmp/osh-docs-1/dist` (tree untouched): initial total, per-component SCSS budget warnings, dist sanity (assets, favicon, `3rdpartylicenses.txt`, `index.html`, vendor copy).
- **Targeted specs only** (full suites are lane-gated): `design-tokens.spec.ts` **140/140**, `guidance-editor.spec.ts` **82/82**.
- **`npm pack quill@2.0.3`** in /tmp: shasum + integrity recomputed, all four vendored files byte-compared against the tarball.
- Code grep/inspection for every class, constant, migration, token, config default, route, guard, deep-link format quoted in the docs; `docker compose ps` (db healthy), docker network inspection, git history checks (`git show` for the 2026-09-15 tab count, `git log -S` for the bundle numbers, bounded secret-pattern scan of all 226 commits).
- **Not run (deliberately):** the full backend/frontend test suites (other lanes are gating), a second app boot (the documented boot-refusal is code-verified only), any write to the live dev DB, any live e-mail/SMS send.

Verdict key: **V** = verified against code or a measured value this lane produced · **H** = historical, dated and correctly scoped as a record · **F** = false or stale, with the contradiction · **U** = unverifiable in this environment (listed, not softened).

## File-by-file table

### 1. `README.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Identity/scope: frontend Angular 22, task-pack links, puml SoT | V | `frontend/` exists, Angular 22 (`package.json` core ^22.1.0); `context-and-tasks/agent/01-TASK.md`, `07-STEPS.md`, root `.puml` files all exist |
| Status entries (dated wave log; "both suites green on this tree — run … to see the counts") | H / U | Every count self-dates with the guard's accepted markers ("at the time of", "pre-fix-wave", "— historical" — the exact phrases `DocumentationFactsTest` codifies). "Green on this tree" is a pointer claim; full suites were lane-gated, not re-run here (U5) |
| Features: auth (Argon2id, 15 min/30 d, rate limits), verification, cross-channel change, profile, anti-spam, SMS/e-mail channels, ingestion, shelter API, trust layer, contributions, crisis guidance, uniform errors, admin | V | `access-ttl: 15m`/`refresh-ttl: 30d` (application.yml); cooldown 60 / max-per-day 5 / TTL 900 / attempts 5 (yml + `CodePolicy.MAX_ATTEMPTS=5`, `EmailVerificationProvider` `TTL = Duration.ofMinutes(15)`); `MAX_ACTIVE_SHELTERS_PER_USER = 10`, 5-per-24 h (`ShelterService`, `daily-submissions-per-user: 5`); 10/hour report throttle (`REPORTS_MAX_ACTIONS_PER_HOUR:10`); 3-confirmer rule = `ShelterReport.AUTO_CONFIRM_THRESHOLD (3) distinct confirmers`, auto-hide at 5 points (`AUTO_HIDE_THRESHOLD`); restore disarms auto-hide (`ShelterReportService:52`); conditional sender beans ("exactly one"); all five fail-closed guards exist with the `PRODUCTION REFUSED TO START` messages; `V21__drop_reviews.sql` exists and drops the review model |
| Stack: Java 21, Boot 3.5.x, jjwt 0.12.x, Testcontainers 2.0.x, postgres:16, no Lombok | V | pom: `java.version 21`, spring-boot 3.5.16, jjwt 0.12.7, testcontainers 2.0.5; `docker-compose.yml` `postgres:16` + `sheltermap/sheltermap`; zero lombok references |
| Package layout table (root `ee.sheltermap`) | **F** | 44/45 named classes verified in exactly the claimed packages. **False:** the `guidance` row (line 250) lists `GuidanceSlug` — no such class exists anywhere in the repo; the slug logic is `SlugFactory` + `SlugAlreadyUsedException` (`src/main/java/ee/sheltermap/guidance/`) |
| Documentation map ("200-plus markdown files", link targets) | V | 306 tracked `.md` files; every named target exists (`docs/whitepaper.md`, `docs/api/openapi.json`, `qa/*`, `docs/autopilot/{LEDGER,RUNLOG,AUTOPILOT-REPORT-2026-09-15}.md`, `.agent-orchestration/*`, `openspec/specs|changes`, `docs/code-review/*`) |
| Data flow (CsvRegistryClient → LEst97Transformer → ShelterImportService; weekly cron) | V | Classes exist; `cron: 0 0 3 * * MON` + `zone: Europe/Tallinn` (application.yml:287); `If-Modified-Since` + backoff + politeness `Thread.sleep` + identifying `User-Agent` in `CsvRegistryClient` |
| External services table (Nominatim contract) | V | `geocode-gateway.ts` is the only module holding the URL; `format=jsonv2&limit=5&countrycodes=ee`, `MIN_SPACING_MS = 1000`; CORS default `http://localhost:5173,http://localhost:3000` (yml) |
| API table (53 rows) + "seven paged reads always carry X-Total-Count" | **F (one row)** | `DocumentationFactsTest` (every mapping present) + 22 live probes: uniform `ErrorResponse` shape, generic `Invalid credentials` 401, reset-request 200 for unknown e-mail, partial box 400 ("minLat, minLng, maxLat and maxLng must be given together"), `limit must be between 1 and 200`, detail all-statuses 200/404, `X-Total-Count: 7` on `/api/guidance`, media HEAD immutable; `X-Total-Count` present in all seven paged controllers (Guidance, AdminGuidance, AdminMedia, AdminController ×4). **False:** the `GET /admin/shelters` row (line 393) claims rows carry `openStatus` — `AdminShelterDto` has no such field (full record: id, name, address, source, status, nonexistentReports, inaccurateReports, occupancy, capacity, submitter, reviewStatus, reviewNote, locationKind, provenance, inaccurate, infoRequest); absent from `AdminController`/`AdminModerationService` and from the FE admin panel |
| SMTP/SMS diagnostic endpoints | V | `EmailTestController`/`SmsTestController` + `EmailTestResult`; `DEV_EMAIL_TEST_ENABLED`/`DEV_SMS_TEST_ENABLED` default `false` (yml:161,169); live 401 anonymous (not an open relay) |
| Running locally (quickstart) | V | `docker compose ps` → `sheltermap-db Up (healthy)`; `.env.example` exists with placeholder-only values; `dev-start.sh` pins `SPRING_PROFILES_ACTIVE=dev`, supports `--run-registry`, prints actionable Postgres preflight; live `curl /actuator/health` → `{"status":"UP"}`; `:5173` serving (ng serve); `proxy.conf.js` proxies `/api /auth /account(bypass) /verify/ /admin/`; boot-refusal on bare `spring-boot:run` is code-verified (guards) but not boot-exercised (U4) |
| Configuration env-var table (40 rows) + `.env.example` claim | **F (one claim)** | Every default verified against `application.yml` (60/5, 900/5, 10, 5242880, 3s/5s/10s/10000, 24/24, `en`, `csv`, rescue.ee fallback — the live `/api/data-source` answers with exactly that fallback URL). **False:** line 562 "` .env.example` … lists the variable names this app reads" — the template omits ~25 documented vars it "reads": `REGISTRY_CLIENT`, `REGISTRY_BASE_URL`, `REGISTRY_OFFICIAL_URL`, `VERIFICATION_COOLDOWN_SECONDS`, `VERIFICATION_MAX_PER_DAY`, `VERIFICATION_SEND_LOG_PATH`, `CONTACT_CHANGE_*` (3), `RATELIMIT_TRUSTED_PROXIES`, `CORS_ALLOWED_ORIGINS`, `MEDIA_UPLOAD_DIR`, `MEDIA_MAX_BYTES`, `HERO_IMPORT_*` (3), `GUIDANCE_DEFAULT_LOCALE`, `RETENTION_*` (3), `SERVER_PORT`, `DEV_*_ALLOW_ANY` (2) |
| Hardening pass + 2026-09-08 campaign | H | Dated pass records; current-state residue checked and true: `canWatch`/`PUBLISH_INSTANTLY`/`ShelterReviewService` really gone, `ShelterStatus` = ACTIVE/INACTIVE only, `V3` unique indexes, `V10` `dismissed_at`, `V12` national-id drop. Caveat: "remaining hierarchy is `User` → `GuestUser`/`RegisteredUser` only" is superseded by `AdminUser` (admin-moderation wave) — the package-layout table correctly notes this |
| PII at rest (M2) | V | `PiiCrypto` `PREFIX = "v1:"`; `uq_users_email_hash`/`uq_users_phone_hash` created by the Java V13 migration (lines 103–104); JWT carries only a user-id subject (`JwtTokenService`: `.subject(String.valueOf(user.getId()))` — no e-mail/phone claims) |
| Production deployment checklist | V / U | Guards, CORS, provider fail-fast, single-instance in-memory limits, `.env`-in-prod hazard all code-verified. U3: "Live delivery is confirmed" (e-mail) / "live delivery to a handset is confirmed" (SMS) — real sends not exercised in this lane |
| Security section + Current state & gaps + License | V | `docs/security/threat-model.md` + `operations.md` exist; `PasswordRecoveryFlowIT` + `AdminAuthorizationIT` exist (`src/test/java/ee/sheltermap/security/`); client-side nearest = `findNearest` in `map-page.ts:624` + Haversine; `SecurityHeadersFilter` exists; `LICENSE` is MIT. U1/U2: "every request to the WFS now answers 404" and "the publisher states no licence" are external-service claims (probe blocked here) |

### 2. `frontend/README.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Identity/scope + M8 contributions panel | V | `ContributionsPanel` in `features/account/`; backend endpoints live-probed |
| Stack: Angular 22 standalone/zoneless/signals, TS strict, Leaflet 1.9, Vitest via `@angular/build:unit-test`, no state lib/UI kit/e2e | V | `@angular/core ^22.1.0`, leaflet ^1.9.4, test builder `@angular/build:unit-test`; no `zone.js` in deps; no e2e project (`angular.json` projects: `['frontend']`); zero `fakeAsync` occurrences in `src/app` (the "fakeAsync-free" claim) |
| Quick start + dev proxy + Docker-container access | V | scripts match the doc (`ng serve --port 5173 [--host 0.0.0.0] --proxy-config proxy.conf.js`); the `.js`-not-`.json` rationale block matches the file; `apiUrl: ''` in both environments; `172.18.0.1` is in fact the `odysseus_default` bridge gateway (measured via `docker network inspect`) |
| Project layout (routes, folders) | **F (one citation)** | `app.routes.ts`: exactly 13 component routes + 2 redirects (`''`, `**`) ✓; exactly 12 `loadComponent`-lazy routes, matching the named list ✓; layout tree matches the tree. **False/stale:** line 101 cites the high-contrast block as `styles.scss:162-255` — the block is now at **lines 279–434** (measured). Also omits the third theme (black-and-yellow, runtime tokens via `ThemeStore`) |
| Design tokens + focus-ring regime | V | `design-tokens.spec.ts` 140/140; `*:focus { outline: none }` at `styles.scss:487-488`; token rings on `a, button, input, textarea, select, .admin-table-wrap` (456–461); the spec asserts both suppression and ring (spec lines 1333–1335) |
| Production build + bundle budget | **F (stale numbers)** | `angular.json`: initial `maximumWarning: 741401b` ✓, `maximumError: 1MB` ✓, `anyComponentStyle` 4kB/10kB ✓, quill asset entry ✓, global styles quill-free ✓, postbuild hook ✓. **False:** "Measured initial total on a fresh build (2026-09-22 …): **610.08 kB raw / 157.31 kB transfer**" — a fresh build at the SAME commit `8cebe1e` (clean tree) measures **609.93 kB / 157.25 kB**. In the 15-entry SCSS list: map-page **7.42 → measured 7.63**, submit-shelter-page **4.11 → measured 4.38** (rest match or round within 0.01). The numbers were measured at `1e7acf9` ("measured README numbers") and styles changed after (`map-page.scss` +172-line churn, `submit-shelter-page.scss` +19, `styles.scss` 210) without re-measure. The 15-file warning set and "no initial-budget warning" both reproduce exactly |
| dist sanity (M6) | V | Measured on the fresh /tmp build: `3rdpartylicenses.txt` present; Leaflet marker icons under `media/` (`marker-icon-*.png`, `layers-*.png`); `favicon.ico` + `favicon.svg`; `index.html` `<base href="/">` + relative asset paths; `vendor/quill/2.0.3/dist/quill.snow.css` copied verbatim |
| Token-storage tradeoff | V | `TokenStore`: access = in-memory signal, refresh = localStorage; comments match the documented tradeoff |
| Deferrals (6 bullets) | **F (one bullet)** | Server-side nearest deferred ✓ (client-side Haversine), MapLibre deferred ✓ (leaflet 1.9.4), httpOnly deferred ✓ (localStorage), SSR ✓ (SPA), e2e ✓ (none). **False:** "Still English-only: the account page, the contributions panel, the verify page, the admin panel and the legal page bodies" — contradicted by the tree: ET and RU catalogs each carry 99 `account.*`, 32 `verify.*`, 282 `admin.*`, 190 legal keys; the templates carry 79/25/22 t-pipes (account/contributions/verify), 54+39+… (admin panels/editor), 130/77 (privacy/terms) |
| Docs section links | V | `docs/agent/`, 5 `.puml` files + `render.sh`, `rich-text-editor.md`, `openspec/changes/` all exist |

### 3. `frontend/docs/rich-text-editor.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Vendoring rationale + trade-off | V | `quill` absent from `package.json` deps and devDeps; the vendor README cross-references resolve |
| Why snow theme / standard toolbar / `userOnly` / custom link handler | V | `theme: 'snow'`, `modules.toolbar` config form, `history: { userOnly: true }` (`guidance-editor.ts:864`); `guidance-editor.spec.ts` 82/82 green |
| `formats` contract vs `BodySanitizer` | V | `BodySanitizer.java`: `addTags("h2","h3","p","br","strong","em","ul","ol","li","a","blockquote")` + `addProtocols("a","href","http","https","mailto")` — exactly the documented allowlist; `BODY_EDITOR_FORMATS`/`BODY_EDITOR_FORMAT_TAGS` exist; the cited test "the editor formats list is a subset of the BodySanitizer allowlist (durable guard)" exists (spec:1576) and is green |
| Save path / empty-document rule / link protocol guard | V | `ALLOWED_LINK_PROTOCOL = /^(https?|mailto):/i` (line 170, verbatim); cited tests exist and pass ("initialising the editor loads the snow stylesheet (one versioned link, never global)" :1432, "a javascript: link is refused…" :1505, empty-editor blank rule :1336/:1366) |
| The one a11y deviation (48 px, focus ring) | V | "THE ONE DEVIATION" block at `guidance-editor.scss:245`; four `48px` rules |
| Stylesheet loading (versioned asset, not global, not inlined) | V | `SNOW_THEME_HREF = '/vendor/quill/2.0.3/dist/quill.snow.css'` (versioned ✓); `angular.json` assets entry `src/vendor/quill → /vendor/quill` ✓; global styles = `src/styles.scss` only ✓; built dist contains `vendor/quill/2.0.3/dist/quill.snow.css` ✓; both pin tests exist |
| "GuidanceEditor is the one component in the repo that uses `ViewEncapsulation.None`" (line 202) | **F** | `src/app/shared/accessibility-dialog.component.ts:57` also sets `encapsulation: ViewEncapsulation.None` (black-and-yellow theme page-wide rules) — there are two such components |
| "the component's own styles are ~3.7 kB, under the warning" (line 216) | **F** | Measured build: `guidance-editor.scss` **4.27 kB — it IS one of the 15 that exceed the 4 kB warning** (and the raw file is 9,773 B). Directly contradicted by the fresh build and by `frontend/README.md`'s own warning list |
| esbuild dynamic-import rejection ("30-byte stub") | H | Empirical past experiment, recorded as rejected-with-rationale; not re-produced here (would require an experimental build) — scoped as history, consistent with the surviving link-based wiring |
| Toolbar procedure + re-vendor procedure + "not covered" section | V / H | Procedural; version references current; "spec'd in guidance-editor.spec.ts" contracts exist (hero/alt/draft/serverError tests present in the 82 passing tests) |

### 4. `frontend/docs/agent/00-README.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| What-this-is + folder map | V | All eight pack files exist with the stated roles |
| Source-of-truth UML (5 pumls + `render.sh`) | V | `01…05-*.puml` + `frontend/docs/render.sh` exist |
| How to run / hard rule | V (procedural) | n/a to measure |
| M0 status ("dev proxy … via `proxy.conf.json`") | **F** | `package.json` start scripts use `--proxy-config proxy.conf.js`; the `.js` file's own header documents why it is `.js` and not `.json`. `proxy.conf.json` still exists as an **unused sibling** (committed in `670f43d`) |
| M1–M6 status entries | H | Dated DONE records; M6's "initial 530.5 kB → 560 kB warning" is correctly scoped as the M6 (2026-09-09) state — the later re-baseline to 741401 b is documented in `frontend/README.md` (the current authority) |
| Trust wave + admin wave status (657/35 @ 2026-09-11; "eight tabs", 953/45 @ 2026-09-15) | H | Dated counts; the "eight tabs" figure is historically accurate — `git show` of the last pre-2026-09-16 `admin-page.ts` shows exactly 8 tabs (unconfirmed/shelters/reports/alerts/users/guidance/media/audit); `settings` was added later (current = 9) |

### 5. `frontend/docs/agent/01-TASK.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Project scope: cross-channel proof, trust rules (5-point auto-hide, shared 10/h throttle, untapped-throttle open/closed) | V | Matches backend exactly (`AUTO_HIDE_THRESHOLD`, `REPORTS_MAX_ACTIONS_PER_HOUR`, open-status "not throttled" in controller) |
| "backend complete and green (788 tests … 2026-09-15; 464 was the 2026-09-12 count)" | H | Self-dated; consistent with `07-STEPS.md` ("464 tests green, counted 2026-09-12") |
| Tech stack (line 53: `--proxy-config proxy.conf.json`) | **F** | Same contradiction as 00-README: the dev server loads `proxy.conf.js` |
| Stack: TS ~6.0 strict, jsdom, port 5173, `--color-cta` CTA-only, `--color-reported` light `#c2410c` / HC `#ffa94d` | V | typescript ~6.0.2; jsdom ^28; `var(--color-cta)` used in exactly one place (`map-page.scss:258`, the Nearest CTA); `--color-reported` values at `styles.scss:91/388` unchanged |
| Layout table — `features/map` cell: "filter chips … compose with the source chips"; "community rows one unified yellow tone" | **F (two stale sub-claims)** | Source chips are **gone** — `8c3caef` "source chips … removed"; `map-page.html:290` "the source-kind chips are gone"; the page always fetches `ALL` sources. Palette is now unverified-yellow / verified-green (`--color-shelter-user` vs `--color-verified = --color-new = #237a57`); "one unified yellow tone" no longer describes community rows (the `--color-new == --color-verified` equality itself still holds — both green) |
| "ONE persisted `[data-theme='high-contrast']` override block on `<html>`" (line ~30) | F (incomplete) | A third theme (black-and-yellow) exists — runtime tokens applied by `ThemeStore`, page-wide rules in `accessibility-dialog` |
| Non-negotiable rules + environment notes | V | Single-flight refresh, 401-once interceptor, in-memory access token, `httpOnly` deferral, guard redirect targets — all match `guards.ts`/`api-interceptor.ts`/`TokenStore`; `npx ng`/5173 notes match |

### 6. `frontend/docs/agent/02-CONTEXT-API.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Base URL & CORS (line 14: "proxies `/api`, `/auth`, `/account`, `/verify` (`proxy.conf.json`)") | **F (minor, two sub-claims)** | Proxy list omits `/admin/` (it is proxied — `proxy.conf.js`); the file name is `.js`, not `.json` |
| Error shape + status semantics table | V | Live: uniform body `{timestamp,status,error,message,path}`; generic login 401; reset 200 anti-enumeration; 400/404 bodies as documented |
| Public read endpoints (source filter, ACTIVE-only, all-statuses detail, viewport box 400s, `minRating` ignored) | V | Live probes (list 200 × 313 rows, box 400, limit 400, detail 200/404); "the map page sends no viewport/paging params" — `map-page.ts` calls `gateway.list('ALL')` only ✓ |
| `/api/geo/resolve` (JWT, 5/min, one generic 400, 502) | V | `LocationController` rate-limited; error copy in code; (throttle not live-exercised) |
| OSM Nominatim contract | V | `geocode-gateway.ts` is the only holder of the URL; params + 1000 ms spacing verbatim; attribution rendered in templates |
| Shelter writes & author-scoped (201/409/429; cap message) | V | `ShelterLimitExceededException.MESSAGE` = "The limit of 10 active shelters has been reached" (built from the cap constant); `CreateShelterRequest` bounds ✓ |
| Trust reports (damped 200, duplicate 409, occupancy 204 no-409, open-status not throttled, 10/h shared throttle) | V | `DuplicateReportException.MESSAGE` = "This report has already been submitted" (verbatim as quoted); controller semantics match |
| Auth six-public + five token buckets | V | `ratelimit` keys: login, login-ip, register, reset, reset-confirm (the sixth key, `verify`, belongs to `/verify`); live 201-empty register contract in `AuthController` (`@ResponseStatus(CREATED)`, "empty body") |
| Verify / contact-change / profile (202, `CodeSentDto`, 15 min/5 attempts, cross-channel) | V | `CodeSentDto(resendAvailableAfterSeconds)` verbatim; re-confirm idempotent 200 while request-on-verified → 409 (`VerificationService:108/244`) |
| Admin table + TS mirrors ("field-for-field") | **F (stale/omissive)** | All 15 admin mappings verified present and matching. **Stale:** the table predates paging — it omits `limit`/`offset` + `X-Total-Count` on `/admin/shelters`, `/admin/reports`, `/admin/audit`, `/admin/users`, `/admin/media`, and `excludeDismissed` on `/admin/reports` (all present in code + root README); the `ShelterDto` TS mirror omits `communityPulse`, `infoRequest`, `reviewNote` that the live DTO (and the FE model) carry; the `AdminShelterReportDto` mirror matches. The header's "complete, current endpoint inventory" overstates the table; the guidance/media/site-texts endpoint groups are covered only partially (the addendum covers ordering only) |
| Addendum (guidance-manual-order) | V | `reorderGuidanceOrder` in `admin-gateway.ts:393`; 204 no-op + `GUIDANCE_REORDER` audit row; `admin-copy.ts:49` `GUIDANCE_REORDER: 'Guidance order changed'` verbatim; i18n keys `admin.guidance.order.hint` / `move.*` / `success.reordered` present in `en.ts` |

### 7. `frontend/docs/agent/03-CONTEXT-CORE-AUTH.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Core classes: `ApiClient` sole HttpClient door, `TokenStore`, `AuthStore` (single-flight refresh, fail-closed `isAdmin`), interceptor (skip `/auth/login` + `/auth/refresh`, retry-once, `/login?session=expired`) | V | `api-interceptor.ts` (skip list, single-flight, redirect verbatim), `app.config.ts` `provideHttpClient(withInterceptors([apiInterceptor]))`, `TokenStore` in-memory access/localStorage refresh |
| Guards (`AuthGuard` → `/login?returnUrl`, `GuestGuard` → `/map`, `VerifiedGuard` → `/verify`, `AdminGuard` → home for anon AND non-admin) | V | `guards.ts` matches all four redirect semantics, including the deliberate no-`/login`-offer |
| Key decisions + "M3 optimistic `addLevel()` is GONE" + no national ID | V | Zero `addLevel` occurrences in `src/app`; `RegisterRequest` = name/email/phone/password ("No national ID" in its schema) |

### 8. `frontend/docs/agent/04-CONTEXT-ACCOUNT-VERIFY.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Cross-channel rule (email change ← SMS, phone change ← e-mail) | V | `ContactChangeService` + yml block; API table rows in root README (live 202/200 semantics code-verified) |
| Code discipline ("codes expire after 15 min / 5 attempts"), 409/429 semantics, channel-named copy contract | V | `TTL = Duration.ofMinutes(15)` + `CodePolicy.MAX_ATTEMPTS = 5`; `CONTACT_CHANGE_*` defaults 60/900/5 |

### 9. `frontend/docs/agent/05-CONTEXT-MAP.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Purpose + auto-hidden absence + gateway/service contracts (`get`, `flyTo`, `showShelter`, no ngx-leaflet) | V | `LeafletService` API matches; public list ACTIVE-only (live probe) |
| MapPage cell: "the three source chips (All / Registry / User) refetch with the server-side `source` param"; "community rows one unified yellow tone"; legend entry list | **F (stale, three sub-claims)** | Chips removed (`8c3caef`; `map-page.html:290` "the source-kind chips are gone"; `map-page.ts:243` "the `?source=` refetch went with the chips"). Palette: unverified = yellow `--color-shelter-user`, verified = green (`--color-verified = --color-new = #237a57`); the legend's second entry is now an explicit **unverified** entry (legend keys: `registry, unverified, partialVerified, fullVerified, reported, anchor` — still six entries, so the count holds) |
| Key decisions 1–6 (server-side filtering, fetch-all, divIcon, hygiene, palette, ACTIVE-only) | **F (decisions 1 & 5 partially)** | Decisions 3, 4, 6 verified (`SHELTER_ZOOM = 16`, `ESTONIA_ZOOM = 7`, center `[58.6, 25.0]`, bbox 57.5–59.7 / 21.5–28.2 in `leaflet-service.ts`; `?tones=` URL state, five selectable tones, display-only filter all in `map-page.ts`). Decision 1's "source chips refetch" is stale (above); decision 5's legend/palette description stale as above |
| Distance numbers (M8): origin points, Haversine client-side, zoom semantics, straight-line honesty | V | `haversineKm` in `shared/geolocation.ts`; `ANCHOR_ZOOM = 14` / `AROUND_ZOOM = 14` / `SHELTER_ZOOM = 16`; 14 px circle (`map-page.scss:153-162`) and 12 px diamond anchor (`leaflet-service.ts:338` `iconSize: [12, 12]`) in teal `--color-shelter-pick #0f6e6e`/`#4dd0c4`; no-snap rationale present in `map-page.scss:229-235` |
| UI details + contracts (crisis CTAs, no top-nav submit, "FE DTO carries NO `provenance` field") | V | CTA block in sidebar, auth-only Add-shelter; FE `ShelterDto` (models.ts) indeed has no `provenance` (it does carry `communityPulse` — see 02 finding); `sourceTrustLabel`/badge helpers in `shelter-copy.ts` |

### 10. `frontend/docs/agent/06-CONTEXT-SHELTER.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Detail page: badges, static Location map, report pickers (3 radio types + detail, 3 bands, open/closed 2-state, pre-select from `yourOccupancyBand`/`yourOpenStatus`), navigate actions | V | `shelter-detail-page.ts`: `navigateUrl` = `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}&travelmode=walking`, `appleMapsUrl` = `https://maps.apple.com/?daddr={lat},{lng}&q={encoded name}`, both `toFixed(5)` — verbatim as documented |
| Submission: five capture modes, one shared signal, Nominatim search (no autosuggest, 5 results, attribution, failed search never blocks), bbox pre-check, 201 → detail, cap 409 message | V | `submit-shelter-page.ts` (5 modes; `{ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }`); `CreateShelterRequest` name ≤200 / description ≤2000 / capacity 1–100000; cap message exact (see above) |
| Key decisions 1–8 + M8 contributions panel + M6 polish notes | V / H | Decisions verified in code (verified-gating, refetch-after-write, `REJECT_REASON_MAX = 500`, `INFO_REQUEST_MAX = 2000`, contributions panel in `features/account/`). Stale sub-note: decision 7's "badge tone … the unified yellow family for NEW and CONFIRMED" (line 88) no longer matches the verified-green palette. M6 notes = dated history |

### 11. `frontend/docs/agent/07-STEPS.md`

| Claim group | Verdict | Evidence |
|---|---|---|
| Whole file: M0–M6 build records + trust-wave + admin-wave records (acceptance criteria, dated test counts: 657/35 @ 2026-09-11, 723/38 @ 2026-09-12, "M6 verified 2026-09-06", "initial 530.5 kB → 560 kB warning", "16/16 journey steps, zero console errors") | H | Every figure is self-dated in the text; they are records of what shipped at each milestone, and the current state is documented elsewhere (bundle re-baseline in `frontend/README.md`, 9 tabs in `01-TASK.md`). No present-tense claim found that the tree contradicts. (The M4 acceptance line "clicking a marker … navigates" is explicitly superseded in-file by the M5+ records.) |

### 12. `frontend/src/vendor/quill/README.md` (vendored third-party doc)

| Claim group | Verdict | Evidence |
|---|---|---|
| Provenance table: version 2.0.3, shasum, integrity, fetch command, BSD-3-Clause | V | Re-ran `npm pack quill@2.0.3` in /tmp: shasum `752765a31d5a535cdc5717dc49d4e50099365eb1` **exact match**; recomputed `sha512-xEYQBqfYx/sfb33VJiKnSJp8ehloavImQ2A6564GAbqG55PGw1dAWUn1MUbQB62t0azawUS2CZZhWCjO8gRvTw==` **exact match**; tarball `package.json` = `"license": "BSD-3-Clause"`, version 2.0.3 |
| Files copied verbatim (sizes table) + not-copied list | V | All four files **byte-identical** to the tarball (`cmp`); sizes match to the byte (1,561 / 209,274 / 159 / 24,606 / 5,960 first-party shim); `quill.js.map` in tarball = 879,120 B as claimed; bubble/core variants + ESM tree present as described |
| "The dist bundle its own dependencies" (single `require("util")` behind a guard) | V | `grep -c 'require("util")'` = 1; `typeof module` guard present |
| Wiring (JS import, versioned CSS asset, `ViewEncapsulation.None`, design-tokens skip of `src/vendor/**`) | V | Import + `SNOW_THEME_HREF` in `guidance-editor.ts`; `angular.json` assets entry; built dist serves `vendor/quill/2.0.3/dist/quill.snow.css`; `design-tokens.spec.ts` skips vendor (green run) |
| Re-vendor procedure + trade-off statement | V (procedural) | Steps executable as written (pack/extract/compare all re-usable); watch-target claim (GitHub Security Advisories for `slab/quill`) is a process pointer |

## Verdict distribution

75 claim groups across 12 files:

| Verdict | Groups |
|---|---|
| **Verified** (code or measured value cited) | **53** |
| **Historical** (dated, correctly scoped) | **8** |
| **False / stale** | **14** |
| (of which "otherwise-verified group with one stale sub-claim") | 8 |

File-level: `README.md` 11 V / 2 H / 3 F · `frontend/README.md` 7 V / 0 H / 3 F · `rich-text-editor.md` 8 V / 1 H / 2 F · `00-README` 2 V / 3 H / 1 F · `01-TASK` 3 V / 1 H / 2 F · `02-CONTEXT-API` 10 V / 0 H / 1 F · `03` 2 V · `04` 2 V · `05-CONTEXT-MAP` 3 V / 0 H / 2 F · `06-CONTEXT-SHELTER` 2 V (one stale sub-note) · `07-STEPS` 1 H · vendor quill README 3 V.

## The false claims, with their contradictions

| # | Where | Claim | Contradiction (measured/observed) |
|---|-------|-------|-----------------------------------|
| F1 | `README.md:250` | Package-layout `guidance` row lists `GuidanceSlug` | No `GuidanceSlug` class exists anywhere in `src/` (whole-repo grep: only the README mentions it). The slug logic is `SlugFactory` + `SlugAlreadyUsedException` in the same package |
| F2 | `README.md:393` (API table, `GET /admin/shelters` row) | Rows carry "…`nonexistentReports`, `inaccurateReports`, `openStatus`, fresh `occupancy`…" | `AdminShelterDto` has **no `openStatus` field** (full 16-field record enumerated above); absent from `AdminController`/`AdminModerationService`; the FE admin panel renders no open-status column |
| F3 | `README.md:562` | "`.env.example` in the repository root lists the variable names this app reads" | The template lists ~25 vars but omits ~25 more the app demonstrably reads (`REGISTRY_CLIENT`, `VERIFICATION_*`, `CONTACT_CHANGE_*`, `CORS_ALLOWED_ORIGINS`, `MEDIA_*`, `HERO_IMPORT_*`, `RETENTION_*`, `RATELIMIT_TRUSTED_PROXIES`, `GUIDANCE_DEFAULT_LOCALE`, `SERVER_PORT`, `DEV_*_ALLOW_ANY`, `REGISTRY_BASE_URL`, `REGISTRY_OFFICIAL_URL`, `VERIFICATION_SEND_LOG_PATH`) — all with `${VAR:default}` bindings in `application.yml` |
| F4 | `frontend/README.md:163-169` | "Measured initial total on a fresh build (2026-09-22, re-measured …): **610.08 kB raw / 157.31 kB transfer**"; SCSS list "map-page 7.42 kB … submit-shelter-page 4.11 kB" | Fresh `ng build` at the same commit `8cebe1e` (clean tree, `/tmp` output): **609.93 kB / 157.25 kB**; map-page **7.63 kB**, submit-shelter-page **4.38 kB** (guidance-translations 4.87, guidance-panel 4.64 — rounding deltas). Numbers were measured at `1e7acf9`; `map-page.scss`/`submit-shelter-page.scss`/`styles.scss` changed in later commits without re-measure |
| F5 | `frontend/README.md` (Deferrals → i18n bullet) | "Still English-only: the account page, the contributions panel, the verify page, the admin panel and the legal page bodies" | ET and RU catalogs each contain 99 `account.*` / 32 `verify.*` / 282 `admin.*` / 190 legal keys; the templates carry 79 / 22 / 25 / 54+ / 130+ `t`-pipes respectively. The listed surfaces are translated |
| F6 | `frontend/README.md:101` (also `01-TASK.md` layout note) | HC override block "at `styles.scss:162-255`" | The `[data-theme='high-contrast']` block is at **lines 279–434** (measured); line 162 is inside the `:root` token block. The black-and-yellow theme (runtime tokens) is not mentioned |
| F7 | `frontend/docs/rich-text-editor.md:202` | "`GuidanceEditor` is the one component in the repo that uses `ViewEncapsulation.None`" | `src/app/shared/accessibility-dialog.component.ts:57` sets `encapsulation: ViewEncapsulation.None` too — two components |
| F8 | `frontend/docs/rich-text-editor.md:216` | "the component's own styles are ~3.7 kB, under the warning" | Build measures **4.27 kB — above the 4 kB warning, and it is in the 15-warning list** (also listed as such in `frontend/README.md`); raw file is 9,773 B |
| F9 | `00-README.md:61`, `01-TASK.md:53`, `02-CONTEXT-API.md:14` | dev proxy config is `proxy.conf.json` | The start scripts load `proxy.conf.js` (whose header explains why it is not `.json`); `proxy.conf.json` is an unused sibling file |
| F10 | `01-TASK.md:76`, `02-CONTEXT-API.md:14` area, `05-CONTEXT-MAP.md:20,22,26,29` | "the three source chips (All / Registry / User) refetch with the server-side `source` param" / "compose with the source chips" / "the FE ships the three source chips" | Source chips removed in `8c3caef`; `map-page.html:290` "the source-kind chips are gone"; `map-page.ts` always fetches `ALL` sources; the trust chips stand alone |
| F11 | `01-TASK.md` (MapPage cell + `:root` note), `05-CONTEXT-MAP.md:22,41`, `06-CONTEXT-SHELTER.md:88` | "community rows one unified yellow tone … NEW and CONFIRMED share it" / "the unified yellow family for NEW and CONFIRMED" | Current palette: **unverified = yellow** (`--color-shelter-user`), **verified = green** (`--color-verified = --color-new = #237a57`, HC `#7fd49a`); legend has an explicit unverified entry. (The `--color-new == --color-verified` equality itself still holds — both are green now.) |
| F12 | `02-CONTEXT-API.md` (Admin table + TS mirrors, header "complete, current endpoint inventory") | Admin endpoints without paging params; `ShelterDto` mirror "field-for-field" | Code + root README have `limit`/`offset` + `X-Total-Count` on `/admin/shelters`, `/admin/reports` (+ `excludeDismissed`), `/admin/audit`, `/admin/users`, `/admin/media`; the live `ShelterDto` carries `communityPulse`, `infoRequest`, `reviewNote` (and the FE model does too) — the mirror omits them |

**Note on guard coverage:** `DocumentationFactsTest` would have caught none of F1–F12. It pins controller-mapping *presence*, the Flyway range, cited repo *paths*, and bare test counts. It does not check: package-layout class names (F1), documented per-row API *field lists* (F2), `.env.example` completeness (F3), measured build numbers (F4/F8), or the agent pack's current-state cells (F9–F12). Extending the guard (Wave 11 acceptance) should add at least: (a) layout-table class existence, (b) a `.env.example` ⊇ documented-variables check, (c) a bundle-figure re-measure step in CI with the README numbers regenerated or asserted, (d) DTO-field-list assertions for the two admin rows it already parses.

## Unverifiable (marked, not softened)

| # | Claim (file) | Why it can't be verified here |
|---|---|---|
| U1 | `README.md`: "The old Maa-amet WFS layer (`VARJEKOHT`) is no longer published — every request to it now answers 404" | External service; the outbound probe was blocked in this environment. Corroborated (not proven) by the in-tree comment in `CsvRegistryClient.java:29` |
| U2 | `README.md`: "The publisher states no licence for the dataset" | External dataset-page statement; not re-checked against the live page |
| U3 | `README.md`: "Live delivery is confirmed" (smtp-pulse e-mail) and "live delivery to a handset is confirmed" (Twilio) | Requires real sends from the gitignored `.env` credentials; deliberately not exercised |
| U4 | `README.md`: "A plain `mvn spring-boot:run` with no profile set therefore exits at startup with `PRODUCTION REFUSED TO START`" | Code-verified (all five guards carry that exact message, `dev`/`test` exemptions) but not boot-exercised — a second instance cannot be launched against the live dev DB in this lane |
| U5 | `README.md` Status: "Both suites are green on this tree" | Pointer-style claim; the full suites are lane-gated (backend `mvn -q test`, frontend `ng test --watch=false`) and were not re-run here. `DocumentationFactsTest` 4/4 + the two targeted specs (140/140, 82/82) are the suite evidence this lane produced |
| U6 | `rich-text-editor.md`: esbuild "compiles `import('…/quill.snow.css')` to a 30-byte stub … the build is GREEN but the theme never loads" | Recorded empirical experiment; re-producing it means an experimental build with a deliberately-broken wiring — not done |
| U7 | `05-CONTEXT-MAP.md`: "proximity snap made Chrome swallow fast wheel input" | Historical rationale; the no-snap decision + its rationale comment exist in `map-page.scss:229-235`, but the Chrome behavior itself was not re-measured |
| U8 | `00-README.md` / `07-STEPS.md`: manual E2E journeys ("zero console errors", "16/16 journey steps") | Dated manual-verification records; not re-performed (would require driving the live dev app) |

Bounded supporting re-checks that WERE possible and clean: the 2026-09-09 secret-scan note — all 226 commits scanned for Twilio account-SID (`AC`+32-hex) and auth-token (`SG`+32-hex) patterns: zero hits; the `a5e83db` commit ("…tested with live twilio credentials") exists with that exact message and its diff carries no credentials.

## The three I would fix first

1. **Re-measure and re-commit the bundle figures** (`frontend/README.md:163-169` + `rich-text-editor.md:216`). They are presented as "a fresh build" numbers and are directly reproducible by any reader — and they currently fail their own reproduction: 610.08/157.31 → 609.93/157.25, map-page 7.42 → 7.63, submit-shelter 4.11 → 4.38, and "guidance-editor ~3.7 kB, under the warning" → 4.27 kB, **warning**. Best fixed with a CI re-measure step (regenerate or assert) rather than by hand, since the palette lane keeps moving these bytes.
2. **Fix the two root-README contract facts and close the guard gap that let them ship**: delete `openStatus` from the `/admin/shelters` row (`README.md:393` — or, if the field was intended, that is a code change, not a doc one), replace `GuidanceSlug` with `SlugFactory` (`README.md:250`), and extend `DocumentationFactsTest` to cover package-layout class names, documented DTO field lists, and `.env.example` completeness — three of the 12 false groups (F1, F2, F3) are machine-checkable today and none of them is pinned.
3. **Sync the frontend docs to the shipped map reality** — one coordinated edit across `frontend/README.md` (deferrals i18n bullet F5, `styles.scss:162-255` → `279-434` F6, add the black-and-yellow theme) and the agent pack (`01-TASK`/`05-CONTEXT-MAP`/`06-CONTEXT-SHELTER` unified-yellow → unverified-yellow/verified-green, source chips removed; `00-README`/`01-TASK`/`02-CONTEXT-API` `proxy.conf.json` → `proxy.conf.js`; `02-CONTEXT-API` admin table paging + mirror fields). These are the groups a new agent or developer will trust as current state, and three separate waves (chips removal, palette change, i18n completeness, admin paging) each left them behind.

---
*Evidence artifacts: `/tmp/osh-docs-1/` — `out/*.json` (22 API probe outputs + headers), `build.log` (fresh production build), `facts-test.log` (DocumentationFactsTest), `dt-spec.log` (design-tokens 140), `ge-spec.log` (guidance-editor 82), `quill-2.0.3.tgz` + `package/` (provenance re-verification). Tree left clean; no files touched except this report.*
