# Agent 1 — Architecture review

Repository: `/home/aleks/MyScripts/LocalRepos/OpenShelter`
Scope: overall architecture and structure — backend package structure + layering, business logic
placement, entity/DTO boundary, circular dependencies, injection style, configuration classes and
profiles; frontend folder structure, core/shared/feature separation, standalone-component
organisation, routing/lazy loading, circular imports.

## Versions detected (read from the build files, not assumed)

| | |
|---|---|
| Java | 21 (`pom.xml:18`) |
| Spring Boot | 3.3.13 (`pom.xml:11`, `spring-boot-starter-parent`) |
| Backend build | Maven (`pom.xml`); tests via surefire, JUnit 5 + AssertJ + Testcontainers 2.0.5 (`pom.xml:20`) |
| Backend layout | `src/main/java/ee/sheltermap/**` (491 Java files), Flyway V1–V28 + one Java migration (V13) |
| Frontend | Angular 22.1 standalone + zoneless, TypeScript ~6.0.2, RxJS 7.8, Leaflet 1.9 (`frontend/package.json`) |
| Frontend build/test | `@angular/build:application` + `@angular/build:unit-test` with **Vitest 4** (no Karma), jsdom |
| Auth | jjwt 0.12.7, Argon2 (`Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8`) |

Generated/vendor folders (`target/`, `frontend/dist/`, `node_modules/`, `.angular/`, `.vitest/`) were
excluded from review. `frontend/src/vendor/quill/**` is deliberately vendored first-party-by-decision
code and is treated as such (see "Accepted trade-offs").

**Tree state.** Several files are uncommitted/in flight while this review runs
(`src/main/java/ee/sheltermap/api/ShelterController.java`, `api/ShelterQueryService.java`,
`app/UserRepository.java`, `persistence/JpaUserRepository.java`, `ingestion/RegistryProperties.java`,
the deleted `ingestion/PaasteametRegistryClient.java`, both `application.yml` files, and four test
files). Their diffs are the removal of the dead legacy Päästeamet WFS client and the
`callerOrGuest()` → `callerIdOrNull()` refactor; nothing below depends on those edits, and where I cite
such a file I say so. `README.md` is also mid-edit (other agent). Nothing in this report treats those
in-flight states as defects.

---

## Correct — what is done well, with evidence

**Backend layering is genuinely clean (better than typical Spring projects).**
- `domain/` is framework-free: every file imports only `java.*` plus package-internal types — no
  Spring, no Jackson, no `jakarta.persistence` (verified by import scan over all 33 files).
- Persistence is an adapter behind ports: `persistence/Jpa*Repository` implements port interfaces that
  live with their feature (`app/ShelterRepository.java`, `guidance/GuidancePostRepository.java`,
  `auth/RefreshTokenRepository.java`, `sitetexts/SiteTextRepository.java`), and the API never sees an
  entity: `grep -rn "import ee.sheltermap.persistence" src/main/java/ee/sheltermap/api/` is **empty**,
  and no controller method (or service signature reachable from a controller) returns a `*Entity`.
  Every controller returns a record DTO (`ShelterDto`, `AdminShelterDto`, `MediaAssetDto`, …).
- Package dependency graph has **no cycles** (SCC analysis over all 491 classes + a package-level
  SCC pass): `domain ← app ← {auth, verification, guidance, ingestion, sitetexts} ← api`,
  `persistence →` inwards, `config` as the composition root. The only "cycles" the analysis flags are
  javadoc cross-references (e.g. `app/ShelterHistoryChanges.java:19` mentions
  `ShelterService#updatePlace`), not dependencies.
- Repositories contain no domain rules: `persistence/` has no thresholds or decisions (verified by
  scanning for constant/`>=` logic); the `autoHideDisarmed` occurrences there are pure field mapping.
- Injection style is uniformly constructor-based: the only four `@Autowired` in the whole backend are
  on **constructors** (`app/LocationResolveService.java:78`, `verification/TwilioSmsSender.java:46`,
  `ingestion/ShelterImportService.java:73`, `guidance/HeroImageImportService.java:110`), and all 45
  `@Value` annotations sit on constructor parameters — **zero field injection** (verified
  programmatically).
- Error handling is centralised in one `@RestControllerAdvice` (`api/ApiErrorHandler.java:71`) rather
  than per-controller handlers.
- Boot configuration is fail-closed and centralised: `config/Profiles.java:35-46` is the single
  dev/test rule, reused by all four guards (`ApiDocsGuard.java:56`, `DevEndpointsGuard.java:50`,
  `DevSenderGuard.java:52`, `ProdJwtGuard.java:53`) and by `SecurityConfig.java:250`; secrets are
  env-var placeholders only (`application.yml:23` SMTP, `:86` admin, `:92` PII keys, `:157` JWT; no
  committed credentials — `.env` is
  ignored per `.gitignore:54`); `ddl-auto: validate`, `open-in-view: false` (`application.yml:10-12`).
- The admin surface is gated twice on purpose and the reason is documented
  (`SecurityConfig.java:233-246`, `config/JwtAuthenticationFilter.java:70-81`).

**Frontend structure is consistent and modern.**
- All-standalone: no `@NgModule` anywhere in `frontend/src` (verified).
- Layering holds in practice: no cross-feature imports (`grep -rn "from '../../features/"` over
  `features/ shared/ core/ gateways/ session/` is empty), `HttpClient` appears only in
  `core/api-client.ts` (plus the documented external-Nominatim geocode gateway), and every typed
  backend call goes through `gateways/*`.
- **No circular imports**: SCC analysis over the TypeScript import graph of `frontend/src` returns 0
  cycles.
- Routing is coherent: one route table, `titleGuard` on every route, `**` fallback, and
  `loadComponent` lazy routes for the rare pages with the rationale written next to them
  (`app/app.routes.ts:74/81/92/102/112/125/137`).
- Test-worthiness of the structure is high: 23 000 lines of specs to 17 900 lines of source, and the
  i18n layer carries two mechanical guards (`core/i18n/catalog-identity.spec.ts`,
  `features/account/account-i18n-guard.spec.ts`).

**Accepted trade-offs (deliberate, documented — not defects).**
- `guidance/MediaService`/`ShelterQueryService`/`AdminModerationService` living in the `api` package:
  justified in place (`AdminModerationService.java:53-58` — the admin list must reuse the same batched
  trust projection, one SQL surface).
- Vendored Quill 2.0.3 (`frontend/src/vendor/quill/README.md`) — version, upstream tarball integrity,
  BSD-3-Clause licence and the omitted files are all recorded; the type shim is explicitly first-party.
- `SmartIdVerificationProvider` as a throwing stub with the controller rejecting `SMART_ID` first
  (`verification/SmartIdVerificationProvider.java:11-24`, `auth/VerificationController.java:117`) —
  the level map stays complete and the stub can never be mistaken for a working channel.

---

## Findings

### F1 — High (P1): the core shelter write path runs without a transaction boundary, contradicting a documented invariant

**Where**: `src/main/java/ee/sheltermap/app/ShelterService.java:37-38` (`@Service`, and the file
contains **no** `@Transactional`, no `TransactionTemplate`, no transaction manager at all — verified by
grep). Affected methods: `addPlace` (:115-171), `updatePlace` (:287-307), `deletePlace` (:352-356).
The conflicting claim: `src/main/java/ee/sheltermap/persistence/JpaShelterHistoryLog.java:11-13` —
*"a plain JPA save in the CALLER's transaction: every lifecycle event runs inside its
`@Transactional` service method, so the history row commits or rolls back with the event it records
(same-transaction write … no separate transaction, no async)"*.

**What is wrong**: with no service-level transaction, the repository-level `@Transactional` on
`JpaShelterRepository`/`JpaUserRepository` makes **each** repository call its own transaction, so the
multi-step write methods are not atomic:
- `deletePlace` records the `DELETED` history row at :354 and only then deletes the shelter at :356 —
  if the delete fails, the audit trail claims a deletion that never happened.
- `addPlace` performs two count queries (:126 active-cap, :137 daily-cap) plus the near-duplicate
  scan, then `save` (:167): a classic read-check-write race. Nothing at the DB level stops it either —
  `V1__schema.sql`/`V3__hardening.sql` create unique indexes only on `users(email|phone)` and
  `shelters(external_id)`; no constraint on `shelters(created_by, name)`.
- The `JpaShelterHistoryLog` contract above is false for exactly the lifecycle events it names, so any
  future reader (human or agent) will reason from a wrong invariant. `ShelterReportService` and
  `AdminModerationService` do carry `@Transactional` (`app/ShelterReportService.java`,
  `api/AdminModerationService.java:156/198/322/356`), which makes the omission in `ShelterService`
  look accidental rather than chosen.

**Why it matters**: this is the app's main mutation path (community submissions); it breaks an audit
contract the code documents and leaves the anti-abuse caps (10 active rows/user, 5 submissions/24 h,
100 m near-duplicate) racy under concurrency.

**Suggested fix (minimal)**: annotate `addPlace`/`updatePlace`/`deletePlace` with `@Transactional`
(and move the history write after the state change in `deletePlace`); if the caps must hold under
concurrency, add the missing DB-level uniqueness as well. Same class of gap, lower impact:
`verification/VerificationService.java:169-172` (`sendLog.record` / `delete` / `save` in three
transactions) and `retention/RetentionService` (per-row pruning).

### F2 — Medium (P1): the test configuration "mirror" has already drifted from the production file

**Where**: `src/test/resources/application.yml:193-194` (`reset-confirm-capacity: 5`,
`reset-confirm-refill-per-second: 0.084`) vs `src/main/resources/application.yml:182-183` (`10`,
`0.2`). The contract the test file states about itself
(`src/test/resources/application.yml:1-15`) is: *"a mirror, not an overlay. It must stay in sync with
the main file … the ONLY additions are: 1. `spring.profiles.active: test` … 2. nothing else"*, plus
*"Keep in sync with src/main/resources/application.yml"*.

**What is wrong**: the two files are 313 and 277 lines and already differ beyond the documented
exception. Non-comment diff of both files (committed state, `git show HEAD:`):
- `app.ratelimit.reset-confirm-*`: **5 / 0.084 in test vs 10 / 0.2 in main** — the stale side is the
  test copy, and it is *undocumented* (main's own comment at :175-181 explains why it was raised to
  10 / 0.2 ≈ 12/min).
- `app.limits.otp-per-contact-max: 100` in test (`:236`) vs `5` in main (`:164`) — deliberate and
  explained inline (`:232-235`), but it is precisely the kind of override the header forbids.
- blocks present in main and **absent** from the mirror: `app.retention.*` (`application.yml:293-298`)
  and `app.media.import-*` (`:307-312`) — they are harmless today only by accident of design: the
  retention scheduler is `@ConditionalOnProperty(matchIfMissing = false)`
  (`retention/RetentionScheduler.java:25-26`) so the unbound `RetentionProperties` record is never
  used, and the four media-import values carry `@Value` defaults
  (`guidance/HeroImageImportService.java:116-118`, `guidance/JdkHeroImageFetchClient.java:71-72`).

**Why it matters**: the same configuration exists twice, 590 lines of manual duplication, and the
"keep in sync" rule has already failed silently once. Every context-loading IT that does not pin the
reset-confirm bucket itself (only `auth/AuthApiIT.java:39-40` and `security/PasswordRecoveryFlowIT.java:44-45`
do) runs with half the production capacity, so a limit-related test can pass against a bucket that
production does not have.

**Suggested fix (minimal, in this repo's style)**: keep the mirror but add a guard test that compares
the non-comment lines of the two files against an explicit allow-list of the real deltas (the repo
already has this exact guard style in `config/DocumentationFactsTest`). Structural fix: turn the test
file into `application-test.yml` holding *only* the deltas and activate the profile from the build
(surefire `SPRING_PROFILES_ACTIVE=test`) instead of shadowing the main file.

### F3 — Medium (P1): `AdminPage` is a 3 471-line monolith over nine admin areas; only two were extracted

**Where**: `frontend/src/app/features/admin/admin-page.ts` 1654 lines / 77 members / 21 async
gateway-calling methods; `admin-page.html` 1284; `admin-page.scss` 533. `AdminTab` has nine values
(`admin-page.ts:69-78`: unconfirmed, shelters, reports, alerts, users, guidance, media, settings,
audit) and each tab's state, formatting helpers (`ageText`, `reportTypeLabel`, `auditChangeText`,
`historyChangeText`, …) and gateway calls live in that one class. The imports at `admin-page.ts:200-210`
show the split pattern exists but was applied twice: `GuidanceEditor` (`guidance-editor.ts`, 1257 lines)
and `SiteTextsPanel` (`site-texts-panel.ts`, 238 lines). Seven tabs remain inline.

**Why it matters**: this is the single largest file in the repository and the one the architecture
document's own rule targets (`frontend/docs/01-frontend-architecture.puml:8-9`: *"Components are thin
shells … Zero business logic"*). Every admin change (and every parallel review/agent edit, as this
sweep is currently demonstrating) touches it, so conflicts and regressions concentrate here. The same
pattern is visible but milder on `shelter-detail-page.ts` (815 + 539 lines) and `map-page.ts` (757 +
355).

**Suggested fix**: extract one panel component per remaining tab following the `GuidanceEditor`
precedent (Shelters, Reports, Alerts, Users, Audit, Media, Unconfirmed), leaving the tab shell and
cross-tab state in `AdminPage`.

### F4 — Medium (P1): i18n is half-adopted — a large block of user-facing copy bypasses the catalog and the banner helper silently falls back to English

**Where (a) — shelter copy lives outside the catalog**: `frontend/src/app/shared/shelter-copy.ts`
hardcodes English labels and derived sentences (e.g. `:27` `'Newly added'`, `:29`
`'Community-checked'`, `:31` `'Rejected'`, `:47` `'Päästeamet registry'`, `:50` `'Municipal registry'`,
`:87` `'Private home (declared)'`, `:120` `'Reported inaccurate — details may be wrong'`,
`:153-161` `'Reported closed' / 'Closed' / 'Open (no recent reports)'`, `:233` `'Your report was
submitted.'`, `:248-257` occupancy labels — ~36 user-facing literals). It is consumed by
`features/map/map-page.ts:220`, `features/shelter/shelter-detail-page.ts:181` and
`features/admin/admin-page.ts:415`. The *same* five labels **do** have translated keys in all three
catalogs (`core/i18n/en.ts:471-475`, `et.ts:477-481`, `ru.ts:490-494`), but only
`features/account/contributions-panel.ts:115` uses them.

**Where (b) — the error banner defaults to English**: `shared/error-copy.ts:114-120` makes the
`translate` callback optional and falls back to the legacy English constants declared at `:9` and
`:102-113`. Call sites that pass the callback: `account-page.ts:168`, `verify-page.ts:210`,
`contributions-panel.ts:203,209`. Call sites that do **not** (so they render English in ET/RU):
`features/auth/login-page.ts:63`, `register-page.ts:81`, `reset-page.ts:123,142,175`,
`map-page.ts:752`, `submit-shelter-page.ts:335,680`,
`shelter-detail-page.ts:554,676,720,809`, `admin-page.ts:595,632,648,693,722,788,839,860,888,924,941,967,982`.

**Why it matters**: the UI ships three languages; an Estonian or Russian visitor gets translated
chrome, an English shelter badge on the map/detail pages (while the same badge on `/account` is
translated), and an English rate-limit/authorization banner on `/login` and `/admin`. The doc that
describes the i18n wave (`docs/i18n-review.md`) claims the shared error-copy module "is now
catalog-driven" — the seam exists (`shared/error-copy.ts:9` the English constants, `:102-113`
`CLIENT_COPY`, `:114-120` the optional callback and its English fallback) but four call sites use it.

**Suggested fix**: make `translate` a required argument (or fail the build on a missing key), and route
`shelter-copy.ts` labels through the catalog (`shelter-copy.spec.ts` pins the English text, so the specs
move with it — it is already the "pinned copy" gate).

### F5 — Medium (P2): the maintained frontend architecture diagram no longer describes the shipped frontend

**Where**: `frontend/docs/01-frontend-architecture.puml` (441 lines, rendered and committed as
`frontend/docs/out/01-frontend-architecture.png|svg`), the file that states the project's structure
rules (`:5-25`).
- `features` package (`:265-305`) has no `guidance/` or `legal/` package although the shipped tree has
  `features/guidance/{guidance-list-page,guidance-detail-page}` and
  `features/legal/{privacy-policy-page,terms-page}`.
- `features/admin` (`:291-304`) documents "SIX tabs" and lists six; the code has nine
  (`admin-page.ts:69-78`) and two extracted components (`GuidanceEditor`, `SiteTextsPanel`) that the
  diagram does not contain.
- The route note (`:425-441`) lists no `/blog` or `/blog/:slug`, shipped at `app.routes.ts:98-116`.
- The word i18n/locale/translation appears **zero** times in the file, while `core/i18n` is a subsystem
  (`messages.ts` 1254 lines, `en/et/ru` catalogs ≈3 200 lines, `i18n.service.ts`, `translate-pipe.ts`,
  `site-texts.ts`) and the shell has a language switcher.

**Why it matters**: this diagram is the frontend's architecture contract and the file future
contributors/reviewers read first; the backend equivalent (README claims) is machine-guarded
(`config/DocumentationFactsTest`), the frontend one has no guard, so it drifts freely.

**Suggested fix**: update the three sections; optionally add the cheap guard — a spec that fails when a
`features/*` folder or an `AdminTab` value is missing from the puml (the repo already writes this kind
of guard).

### F6 — Low (P2): the admin authorization policy is copy-pasted into four controllers

**Where**: `requireAdmin()` is **byte-identical** (md5-verified) in `api/AdminController.java:381-391`,
`api/AdminGuidanceController.java:631-640`, `api/AdminMediaController.java:184-192`, plus the `void`
variant in `api/AdminSiteTextController.java:77-85`. The same policy is also materialised in
`config/JwtAuthenticationFilter.java:77-81` (grants `ADMIN`) and `config/SecurityConfig.java:246`
(`.requestMatchers("/admin/**").hasAuthority("ADMIN")`).

**Why it matters**: the second line of defence is deliberate — `SecurityConfig.java:233-238` says so —
but "fresh per-request kind lookup" now has five homes; a policy change (a second privileged kind, an
extra suspension rule) must be made in five places and only the chain-level rule has a test.

**Suggested fix**: one `AdminAccess` component (the fresh lookup + the exception vocabulary) injected by
the four controllers, keeping the chain-level rule as it is.

### F7 — Low (P2): trusted-proxy configuration is parsed by hand in four controllers although a `@ConfigurationProperties` record exists for the same yml block

**Where**: `config/RateLimitProperties.java:14-18` documents the split ("`app.ratelimit.trusted-proxies`
/ `trust-loopback` … are NOT part of this record: the four rate-limiting controllers parse them via
`@Value` directly"). The four identical 5-line parse blocks: `auth/VerificationController.java:76-86`,
`auth/AuthController.java:70-85`, `auth/AccountController.java:92-104`, `api/LocationController.java:65-74`,
each with `@Value("${app.ratelimit.trust-loopback:true}")` alongside.

**Why it matters**: the same two properties are read in two different ways in the same feature area; the
documented reason ("the bound components were never read") does not constrain the record — adding two
fields removes four copies and gives the pair one validated home.

**Suggested fix**: add `trustedProxies`/`trustLoopback` to `RateLimitProperties` and inject the record.

### F8 — Low (P2): three boot guards are the same fail-closed template, with the same helper duplicated

**Where**: `config/ApiDocsGuard.java:56-76`, `config/DevEndpointsGuard.java:50-72`,
`config/DevSenderGuard.java:52-75` — identical shape (dev/test-only short-circuit → flag names →
`log.error("REFUSING TO START …")` → `IllegalStateException("PRODUCTION REFUSED TO START …")`), and
`enabledFlagNames(boolean, boolean)` is duplicated verbatim in `ApiDocsGuard.java:71-76` and
`DevEndpointsGuard.java:66-72`. The shared rule itself is correctly extracted
(`config/Profiles.java:35-46`).

**Why it matters**: policy enforcement being copy-pasted is how guards drift apart (one gets a new
profile exemption, the others do not). Extracting the template keeps each guard's message and flag list.

### F9 — Low (P2): `@EnableScheduling` hangs off two conditionally-created components

**Where**: `config/RegistryScheduler.java:25` (`@EnableScheduling` +
`@ConditionalOnProperty(app.registry.schedule-enabled, matchIfMissing=true)`) and
`retention/RetentionScheduler.java:25` (`@EnableScheduling` +
`@ConditionalOnProperty(app.retention.enabled, matchIfMissing=false)`) are the only two
`@EnableScheduling` sites in `src/main`.

**Why it matters**: today every flag combination happens to leave at least one carrier present (registry
on by default, retention off by default), so no job is silently lost *right now*. But the scheduler
infrastructure is then a side effect of two unrelated feature flags: a third `@Scheduled` bean, or any
future combination that removes both carriers, disables scheduling with no error and no log.

**Suggested fix**: move `@EnableScheduling` to `ShelterMapApplication` (or a small `@Configuration`).

### F10 — Low (P2): `ShelterController` bypasses the service layer and assembles domain objects itself

**Where**: `api/ShelterController.java` injects both `ShelterRepository` and `UserRepository` (:101-118)
and runs its own lookups — `:474` (`shelterRepository.findById` in `requireOwnedShelter`), `:592`
(`userRepository.existsById` in `callerIdOrNull`), `:602` (`userRepository.findById` in `currentUser`) —
while its own javadoc claims *"Thin shell (01-TASK.md §7): parse, validate, delegate, map"* (`:57`).
The POST/PUT handlers build the aggregate positionally (:261-274 create with five trailing `null`s,
:421-453 a 15-field copy of the existing row) instead of delegating to a mapper, and validation placement is inconsistent within
the admin surface: `/admin/alerts` validates `limit` inline (`api/AdminController.java:289-291`) while
`/admin/audit` validates it in the service (`api/AdminModerationService.java:390-394`).

**Why it matters**: the author/source ownership rule now exists in the controller
(`requireOwnedShelter`) *and* in the service (`ShelterService.updatePlace`/`deletePlace`); the next
change to "who may edit a shelter" has two places to find. (The `existsById`/`isSuspended` column-only
shortcut is a legitimate performance motivation — see `JpaUserRepository.java:209-225` — the problem is
only that it is reached through a repository instead of a service method.)

**Suggested fix**: expose the two lookups as service methods (e.g. `Shelter requireOwnedBy(long id, long userId)`,
`Shelter assembleUpdate(Shelter current, UpdateShelterRequest req)`) and keep the column-only repository
calls behind them.

### F11 — Low (P2): component file naming is inconsistent in `shared/`

**Where**: three of the 24 component files keep the legacy `.component` suffix —
`shared/accessibility-dialog.component.ts`, `shared/banner.component.ts`,
`shared/consent-banner.component.ts` — while the other 21 (`shared/page-shell.ts`,
`shared/report-gauge.ts`, `shared/loading-indicator.ts`, all `features/**`, `app.ts`) drop it. Verified
by listing every file containing `@Component`/`@Directive`.

**Why it matters**: small, but it is the kind of inconsistency that makes "where does this component
live / what is it called" a per-file guess during navigation and review.

### F12 — Low (P2, shared with agent 7): TypeScript strict mode is off

**Where**: `frontend/tsconfig.json:5-20` enables `noImplicitOverride`,
`noPropertyAccessFromIndexSignature`, `noImplicitReturns`, `noFallthroughCasesInSwitch` but **not**
`strict`/`strictNullChecks`/`noImplicitAny`; `angularCompilerOptions` (`:18-21`) sets only
`strictInjectionParameters` and `strictInputAccessModifiers` (`:17-19`), so `strictTemplates` is absent as well
(the CLI's generated config ships `strict: true` by default).

**Why it matters**: the frontend's correctness story rests on typed DTOs and null-safe template
bindings (`yourOccupancyBand`/`openStatus` are nullable by contract); the compiler does not enforce
either, so a future nullable field or a mistyped template binding compiles. Today only 3 textual `any`
matches exist in non-spec source (all in comments/prose), i.e. the code is written as if strict — the
gap is latent, not visible.

---

## Areas found clean (explicitly)

- **Entities vs DTOs**: no JPA entity or `persistence.*` import anywhere in `api/`; every HTTP payload
  is a record DTO. Nothing to fix.
- **Circular dependencies**: none at class, package or frontend-module level (SCC analysis on both
  trees, 491 Java files / 125 TypeScript files).
- **Field injection**: none (4 `@Autowired`, all constructor; 45 `@Value`, all on constructor
  parameters).
- **Profiles**: the dev/test-only rule is centralised and fail-closed (`config/Profiles.java:35-46`
  + the four guards + `SecurityConfig:250`); no profile-specific `application-*.yml` exists, and none
  is needed — the dev profile is injected by `dev-start.sh` and the test profile by the test-classpath
  yml (the duplication of that yml is F2).
- **Repositories**: no business logic or thresholds; pure mapping (`JpaUserRepository`'s claim diffing
  and the last-activity backstop are mapping/persistence concerns with stated reasons, `:44-99`).
- **Routing/lazy loading**: coherent, every route has `titleGuard` + `data.title`, rare routes are
  `loadComponent`-lazy with the reason written down.
- **core/shared/feature separation**: no cross-feature imports; HTTP transport confined to
  `core/api-client.ts`; gateways are the only typed API layer.
- **Quill vendoring, Smart-ID stub, services in the `api` package**: deliberate and documented (see
  "Accepted trade-offs").

---

## Top 5 findings

1. **F1 (High)** — `ShelterService.addPlace/updatePlace/deletePlace` run with no transaction boundary
   (`app/ShelterService.java:37-38`, :115-171, :287-307, :352-356), which breaks the invariant
   documented in `persistence/JpaShelterHistoryLog.java:11-13` (delete history is written *before* the
   delete) and leaves the anti-abuse caps/dedupe racy; fix = `@Transactional` on the three methods.
2. **F2 (Medium)** — the test config mirror has silently drifted from production
   (`src/test/resources/application.yml:193-194` = 5/0.084 vs `src/main/resources/application.yml:182-183`
   = 10/0.2), while its own header forbids anything but the profile line; add a drift guard or switch
   to an `application-test.yml` overlay.
3. **F3 (Medium)** — `features/admin/admin-page.ts` is a 1654-line, 77-member, 21-gateway-call
   component (+1284-line template) covering nine tabs of which only two were extracted; split the
   remaining tabs after the `GuidanceEditor` pattern.
4. **F4 (Medium)** — i18n is half-adopted: `shared/shelter-copy.ts` hardcodes ~36 English labels used
   by map/detail/admin while the same labels are translated in the catalogs
   (`core/i18n/en.ts:471-475`, `et.ts:477-481`, `ru.ts:490-494`), and 24 `bannerMessage()` call sites
   omit the translate callback so banners stay English outside `/account` and `/verify`.
5. **F5 (Medium)** — `frontend/docs/01-frontend-architecture.puml` (the diagram that states the
   project's structure rules) no longer matches the code: six tabs vs nine, no `guidance/`/`legal/`
   features, no `/blog` routes, and no mention of the i18n subsystem at all.

## Merge verdict

**OK with notes.** No blocking defect was found in the structure itself: layering, the entity/DTO
boundary, dependency direction and injection style are all in good shape, and the two largest risks
(F1 transaction boundary; F2 test-config drift) are pre-existing and one-line-ish fixes rather than
design faults. I recommend treating F1 and F2 as release-blocking (P1) and F3–F5 as the next
maintainability tranche. Nothing in the currently in-flight edits (legacy WFS client removal,
`callerIdOrNull` refactor) was found defective.
