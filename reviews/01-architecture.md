# Agent 1 — Architecture review (sweep 2, verifying sweep 1)

Repository: `/home/aleks/MyScripts/LocalRepos/OpenShelter`
Scope (agent 1): overall architecture and structure — backend package structure and layering,
business logic placement, entity/DTO boundary, circular dependencies, injection style, configuration
classes and profiles; frontend folder structure, core/shared/feature separation, standalone-component
organisation, routing and lazy loading, circular imports.

Method: read the source, then verified the structural claims mechanically rather than by sampling —
Tarjan SCC over the committed import graphs of **345 main Java files** and **128 frontend `.ts` files**,
a package-dependency scan, an injection-style scan, and one real production build
(`npx ng build --configuration production`, exit 0) for the routing/lazy-loading and budget evidence.
Every "unused"/"missing"/"not enforced" claim below was checked across the whole repo (tests, templates,
annotations) before being written down.

## Versions detected (from the build files, not assumed)

| | |
| --- | --- |
| Java | 21 (`pom.xml:21` `<java.version>21</java.version>`) |
| Spring Boot | **3.5.16** (`pom.xml:9-10`, `spring-boot-starter-parent`) — bumped from 3.3.13 by `4289189` |
| Backend build | Maven (`pom.xml`); surefire (`pom.xml:183`); **no JaCoCo** in the build (no coverage gate) |
| Backend tests | JUnit 5 + AssertJ + Mockito (`spring-boot-starter-test`), Testcontainers 2.0.5 (`pom.xml:23`) |
| Backend deps | jjwt 0.12.7, springdoc 2.8.17, jsoup 1.23.2, bouncycastle 1.78.1, proj4j 1.3.0, twilio 10.9.2, spring-dotenv 4.0.0 |
| Backend size | 345 main + 164 test Java files (28 442 / 32 456 lines); Flyway `V1`–`V28`-range + 30 files in `db/migration` incl. one Java migration |
| Frontend | Angular **22.1.5** (CLI 22.1.7), TypeScript **6.0.3**, RxJS 7.8, Leaflet 1.9.4, standalone + zoneless, no NgModules |
| Frontend build/test | `@angular/build:application`; **Vitest 4.0.8** + jsdom 28 (no Karma); Node 26.8.2 |

Generated/vendor folders (`target/`, `frontend/dist/`, `node_modules/`, `.angular/`, `.vitest/`) were
excluded; `frontend/src/vendor/quill/**` is deliberately vendored first-party-by-decision (see
"Accepted trade-offs").

## Tree state while reviewing (in flight — affects two findings)

`HEAD` is `d247007` with 23 dirty files. The brief flagged `features/admin/**`; the same lane is **also
mid-flight on the backend**, which matters here:

```diff
src/main/java/ee/sheltermap/api/AdminController.java        (+79/-6)  paging + X-Total-Count + source filter
src/main/java/ee/sheltermap/api/AdminModerationService.java (+1/-1)   ShelterSource → ShelterSourceFilter
src/main/java/ee/sheltermap/api/ShelterQueryService.java    (+6/-5)   same signature change
src/test/java/ee/sheltermap/api/AdminModerationIT.java      (+84)
src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java (+45)
frontend/** and docs/api/openapi.json
```

plus two untracked lane artefacts: `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPagingIT.java` and
`docs/autopilot/list-page-paging/ADMIN-LANE-REPORT.md`.

So `GET /admin/shelters?limit=&offset=` exists only as an uncommitted edit. Findings **A2** and **A14**
touch that code; both are marked in-flight and both are *patterns that already exist in committed code*
(the public shelter list and the guidance screens), so the conclusion holds whichever way the lane lands.

---

## Correct — verified clean (I re-derived these, not repeated them)

**Backend layering is genuinely clean — my own mechanical scan, not a sample.**
- **Zero cycles.** Tarjan SCC over the import graph of all 345 main Java classes: **0 class-level
  cycles**, and the package-level graph is acyclic too. The only cross-package direction is inward:
  `api → {app, domain, guidance, auth, verification, sitetexts, ingestion, alerts}`,
  `persistence → {domain, app, auth, verification, security, guidance, sitetexts, retention}`,
  `config` as the composition root.
- **The dependency-inversion boundary holds.** `grep -rl "import ee.sheltermap.persistence" src/main/java`
  outside `persistence/` is **empty** (only tests touch entities: 55 files, correctly `@DataJpaTest`/IT
  scope): no controller or service ever names an entity, `ShelterEntity`/`UserEntity`/… never appear in a
  non-`persistence` signature anywhere in the repo, and every controller returns a record DTO
  (`ShelterDto`, `AdminShelterDto`, `GuidancePostDto`, `SiteTextEntryDto`, `MediaAssetDto`, …) or `void`
  for a 204 — checked over every `public` method of all 16 controllers; the single non-record body is
  `MediaController.serve`'s binary `ResponseEntity<FileSystemResource>`.
- **`domain/` is framework-free,** verified by import scan over all 34 files: the only imports are 9
  distinct `java.*` types. No Spring, Jackson or `jakarta.persistence`.
- **Repositories contain no domain rules.** Scanning `persistence/**` for decisions yields only null/empty
  guards, id-presence checks and field mapping. The two exceptions are deliberate and documented: the
  public-list queries hardcode `ShelterStatus.ACTIVE` *under port names that say so*
  (`ShelterRepository.findAllActiveBySourceIn`, `JpaShelterRepository.java:110`), and the one-exchange
  rule lives at the *port* (`app/ShelterInfoRequestLog` javadoc names the guard vocabulary as the single
  source) with the JPA adapter (`persistence/JpaShelterInfoRequestLog.java:38-47`) and the test fake
  (`app/InMemoryShelterInfoRequestLog`) implementing the same contract.
- **Injection style: uniformly constructor-based.** 6 `@Autowired` — all on constructors
  (`app/LocationResolveService.java:78`, `verification/TwilioSmsSender.java:47`,
  `auth/PasswordResetService.java:101`, `auth/ContactChangeService.java:86`,
  `ingestion/ShelterImportService.java:73`, `guidance/HeroImageImportService.java:110`); 50 `@Value` —
  **none** field-level. Zero field injection in the whole backend.
- **Fail-closed profiles, one rule.** `config/Profiles.java:35-46` is the single dev/test rule
  (non-empty set, every entry exactly `dev`/`test`), consumed by `ApiDocsGuard`, `DevEndpointsGuard`,
  `DevSenderGuard`, `ProdJwtGuard` and `SoldierConfig`'s `.requestMatchers("/admin/**")`; **no `@Profile`
  annotation exists anywhere** and the only `application-*.yml` is the test overlay — the `dev` profile is
  pinned by `dev-start.sh:39`, `test` by the IT base class, and an unset profile set fails closed
  (verified in `Profiles.isDevTestOnly`). `ddl-auto: validate`, `open-in-view: false`,
  explicit Hikari sizing (`application.yml:10-12,16-17`).
- **Centralised error surface**: one `@RestControllerAdvice` (`api/ApiErrorHandler.java`) with one
  `ErrorResponse` shape.
- **Trust rules are single-sourced**: `Provenance.of(...)` in `domain/` is the only derivation, consumed
  by both the public and the admin projection (`api/ShelterQueryService.java:487,559`); `ReporterTrust.of`
  likewise (`app/ReporterTrustEvaluator.java:45`). The former leaked-moderator-note defect is fixed and
  correctly gated — `ShelterQueryService.java:464` returns `reviewNote` only for the owner surfaces.
- **Write-path transaction boundaries exist** where sweep 1 said they were missing:
  `app/ShelterService.java:38-48` (documented invariant), `@Transactional` at `:128` (`addPlace`),
  `:309` (`updatePlace`), `:378` (`deletePlace`), plus a per-user row lock for the read-check-write caps.

**Frontend structure.**
- **All standalone, no NgModules**: `grep -rn "@NgModule" src` → 0 hits; 0 `standalone: false`.
- **No cycles**: SCC over 128 `.ts` files → **0**.
- **core / shared / feature separation holds**: the only edges that cross a zone are `app.routes.ts →
  features/*` (the route table — legitimate). Zero `features/A → features/B` imports, templates cannot
  import, and the check includes specs.
- **HTTP transport is confined**: `HttpClient` appears only in `core/api-client.ts` (+ the provider in
  `app.config.ts`); `admin-gateway.ts` uses `ApiClient` throughout and only imports the `HttpHeaders`
  *type*. `App` is three providers and an `OnPush` shell (`app.config.ts`, `app.ts`).
- **Routing is coherent**: one table, `titleGuard` + `data.title` on every route, `**` fallback.

## Agreement and disagreement with sweep 1 (run1-2026-09-21/01-architecture.md)

Confirmed by my own evidence: the layering/clean claims (above), **F1 fixed**, **F2 fixed — and better
than asked**: the `src/test/resources/application.yml` mirror is *gone*, replaced by an overlay
`src/test/resources/application-test.yml` whose header documents the model and whose deltas are
enforced by `config/TestConfigOverlayTest`, **F6 fixed** (`api/AdminAccess.java` — one fresh per-request
kind check, injected by all four admin controllers; the md5-identical copies are gone), **F7/F8/F9/F11
still open** (A6–A9 below), **F3 not fixed — worse** (A3 below).

Where I disagree:

1. **F12 (TypeScript strictness) is wrong for this toolchain, in both halves.** run1 wrote that
   "`strictTemplates` is absent as well … the compiler does not enforce either" null-safety or
   implicit-`any`. In Angular 22 `strictTemplates` is **on by default**: the installed
   `@angular/compiler-cli` (22.1.5) contains
   `/** strictTemplate is 'true' by default. Explicit opt-out is required to disable strictness */`
   followed by `get strictTemplates() { return this.options.strictTemplates !== false; }`
   (`node_modules/@angular/compiler-cli/bundles/chunk-72QPVCG5.js:4906-4910`). And TypeScript 6.0.3's
   defaults enable the strict family when `strict` is absent — reproduced with the repo's *own*
   `tsconfig.json` as the base:
   `TS7006` implicit `any`, `TS2322` `null` not assignable, `TS2564` uninitialised property,
   `TS18046` `catch` variable `unknown` — all fire, and all disappear when `"strict": false` is written.
   So the residual gap is only that `"strict": true` is **not written down** (the posture silently
   depends on the compiler default across upgrades) — a Low documentation/robustness note, *not* "the
   compiler does not enforce this".
2. **F10 overstates the ownership duplication.** run1 said the author/source ownership rule exists "in the
   controller (`requireOwnedShelter`)**and** in the service (`ShelterService.updatePlace`/`deletePlace`)".
   It does not: `NotAuthorException` has exactly **one throw site in the repo**
   (`api/ShelterController.java:480`), and neither service method checks ownership — `updatePlace(Shelter)`
   writes whatever aggregate it is handed and `deletePlace(id, actor)` deletes unconditionally. The real
   shape of the problem is the mirror image of run1's claim (see A10): the guard exists **only** at the
   call sites, and there are already two of them with two different rules.
3. **F4 is largely fixed**, not open as written: `shared/error-copy.ts:126-132`'s `translate` callback is
   now passed by the auth/map/detail/submit/verify call sites (18 of 55 calls, by my count), the three
   locale catalogs now load **lazily** (`core/i18n/i18n.service.ts:63-64` dynamic `import()`, and the
   build emits `et`/`ru` as lazy chunks — only EN is in the initial bundle), and `shelter-copy.ts` is
   catalogue-keyed (`EN['shelter.privateBadge']` etc.) rather than hardcoded prose. What remains is the
   **admin** surface (A13), which the code itself documents as deferred copy work.
4. **The 560 kB bundle warning is not a defect** — it is a documented, accepted decision
   (`frontend/README.md:133-145`: "Leaflet must stay in the initial bundle", "Trimming the initial bundle …
   is open work"), already filed by agent 10/13. My measurement today is **720.40 kB initial**
   (349.90 kB `main` + 352.62 kB catalog/leaflet chunk + 17.87 kB CSS) — i.e. **160.40 kB over the warning
   budget**, ~3.5 kB more than the 716.94 kB the delivery audit measured on `ce4cd3f`. The README's
   documented number (670.83 kB, 2026-09-18, "four component SCSS budgets warn") is now stale: the fresh
   build warns for **nine** component stylesheets (map-page 8.29 kB, admin-page 6.68, shelter-detail 6.08,
   page-shell 4.87, guidance-editor 4.27, submit-shelter 4.11, guidance-translations 4.08,
   guidance-order-list 4.04 vs the 4 kB warning). I am **not** re-filing the budget; I am recording the
   drift of the numbers that document it.

---

## Findings

### A1 — Medium (P1): `api` mixes controllers with services, and there is no stated rule for where a new file goes

**Where.** `src/main/java/ee/sheltermap/api/` holds 57 files: 16 controllers **and** two `@Service`
classes — `api/ShelterQueryService.java:82` (780 lines) and `api/AdminModerationService.java:72-73`
(647 lines) — plus an enum-shaped request type (`ShelterSourceFilter`) and `AdminAccess`.
Meanwhile `app/` is the residual bucket: 18 `*Exception` classes, services (`ShelterService`,
`ShelterReportService`, `UserService`, `LocationResolveService`), the port interfaces
(`ShelterRepository`, `UserRepository`, `ShelterReportRepository`, …), property records, helpers
(`TextTruncation`, `CommaSeparated`, `MapsUrlCoordinates`, `ShelterHistoryChanges`, `AppInfo`) **and a
Spring infrastructure adapter**: `app/HttpUrlRedirectClient.java:30` (`@Component`, `java.net` HTTP,
implements the co-located `RedirectClient` port) — i.e. an adapter in the same package as the domain
services, while every other adapter lives in its own home (`persistence/Jpa*`,
`guidance/JdkHeroImageFetchClient`, `verification/SmtpPulseSmtpSender`, `ingestion/CsvRegistryClient`).

**What is wrong / why it matters.** There are two organising principles in one tree — horizontal layers
(`api`/`app`/`domain`/`persistence`) and vertical feature slices (`auth`, `guidance`, `verification`,
`sitetexts`, `retention`, `ingestion`) — and the rule for choosing between them is nowhere written. The
consequence is already visible: services live in 6 different packages, so "where does the new service
go?" is a guess, and a new reviewer cannot tell whether `app/HttpUrlRedirectClient` is deliberate or
left over. Sweep 1 called the two `api` services an *accepted trade-off* because
`AdminModerationService.java:53-58` documents its reason (the admin list must reuse the same batched
trust projection) — I agree that the *placement* is justified for those two; the finding is that the
**rule** the placement follows is not stated anywhere, so the next author has nothing to follow.

**Suggested fix (S).** Write the rule down where the structure is declared (the backend package note in
`README.md`, and/or a package-info.java per root package): "feature slice = its own package
(`auth`, `guidance`, …); shared shelter read/write path = `app` + `api`; adapters implementing a port
live next to the port **only if** they are pure IO shims — otherwise they are named
(`persistence`, `XxxClient`)". Then move `app/HttpUrlRedirectClient` to a named home
(e.g. `app/http/` or `ingestion/`-style slice) as the one concrete instance of the ambiguity.
This is documentation + one move, not a restructure.

### A2 — Medium (P1): the paging contract is implemented four times, in two exception vocabularies, and borrowed across features

**Where (all verified by grep over the whole repo).**

- `requireLimit`/`requireOffset` exist **4×**, near-identical: `api/ShelterController.java:530,541`,
  `api/GuidanceController.java:144,155`, `api/AdminGuidanceController.java:231,242`, and (in flight)
  `api/AdminController.java:153,164`.
- Two error vocabularies for the same rule: `GuidanceValidationException` ("limit must be between 1 and
  200") in the three guidance/admin copies vs `InvalidShelterException` + the
  `ShelterQueryService.MAX_PAGE_SIZE` constant in `ShelterController`. Both map to 400
  (`ApiErrorHandler.java:145,156`), and `GuidanceValidationException`'s own javadoc
  (`ApiErrorHandler.java:150-155`) says it is "a rejected guidance/media **write**" — a *shelter read*
  bound now throws it.
- The slice is implemented **twice**: `api/ShelterQueryService.java:188` (static, package-private) and
  `guidance/GuidanceService.java:243` (public static, generic). The guidance one is imported across
  features purely as a list utility: `api/GuidanceController.java:130`,
  `api/AdminGuidanceController.java:175`, and — in flight — `api/AdminController.java:144-146` (with
  `import ee.sheltermap.guidance.GuidanceService; import ee.sheltermap.guidance.GuidanceValidationException;`
  added to a *shelter* controller at `AdminController.java:6-7`). Same pattern for search:
  `AdminGuidanceController.java:200-206` calls `GuidanceService.matchesSearch`.

**What is wrong / why it matters.** Paging is a cross-cutting API convention (it is the same
`1..200` + non-negative offset on four endpoints, and `X-Total-Count` now on three). Today a change to
the bound means four edits, and a shelter controller has a compile-time dependency on the guidance
feature — the first edge that makes the package graph look accidental rather than layered. The
in-flight lane copied the guidance implementation verbatim, which is how a duplication becomes a
convention.

**Suggested fix (S).** One small non-feature home, e.g. `app/PageRequest.java`
(`record PageRequest(Integer limit, Integer offset)` with a static `of(...)` that throws one shared
400 exception) plus `app/Paging.slice(...)`; or keep `slice` where it is but make the *bounds* one
helper. The three guidance call sites and the shelter controllers then share one rule and one message.

### A3 — Medium (P1): `AdminPage` grew instead of shrinking — still the repo's largest file, against the frontend's own written rule

**Where.** `frontend/src/app/features/admin/admin-page.ts` — **2 072 lines in the working tree**
(1 640 committed, so the in-flight lane is *adding* 432), **88 methods + 52 signal/inject fields ≈ 140
members**, 26 gateway calls; `admin-page.html` 1 223 lines; `admin-page.scss` 282 → **≈ 3 577 lines total**.
One `AdminTab` union with nine values (`admin-page.ts:84-93`: unconfirmed, shelters, reports, alerts,
users, guidance, media, settings, audit). Only three panels have been extracted
(`guidance-editor.ts` 1 319, `site-texts-panel.ts`, `guidance-order-list.ts`).

**What is wrong / why it matters.** `frontend/docs/01-frontend-architecture.puml:8-9` — the file that
declares this project's structure rules — says "Components are thin shells … **Zero business logic**",
and the same diagram (`:291-304`, "SIX tabs") describes an admin page three tabs smaller than the one
that ships. Every admin change (including this sweep's parallel lane) edits this one file: the
in-flight diff already touches `admin-page.ts` + `.html` + `.scss` + `.spec.ts` together. This is the
single largest maintenance hazard in the frontend, and the extraction pattern that would fix it is
already proven in the same directory.

**Suggested fix (M).** Extract one panel component per remaining tab following the `GuidanceEditor`
precedent (Shelters, Reports, Alerts, Users, Audit, Media, Unconfirmed), leaving the tab shell and
cross-tab state in `AdminPage`; move the label/derivation helpers (`ageText`, `reportTypeLabel`,
`auditChangeText`, `historyChangeText`, …) into `shared/` next to `shelter-copy.ts`. In-flight caveat:
the lane is editing this file right now, so this should land after it.

### A4 — Medium (P1): `GuidanceService` is a 1 290-line god-service whose static helpers are the cross-feature utility home

**Where.** `src/main/java/ee/sheltermap/guidance/GuidanceService.java` — 1 290 lines, **26 public
methods**, **7 constructor dependencies** (`:172-181`: posts, mediaAssets, audit, clock, defaultLocale,
heroImport, translations), 22 `@Transactional` methods. It covers at least four responsibilities:
post lifecycle (create/update/publish/unpublish/delete), translations & locale scope
(`translationsInLocale`, `translationInLocale`, `updateInLocale`, `reorderInLocale`,
`attachExistingPostAsTranslation`, `optionalAdminLocale`), ordering (`reorder`, `reorderInLocale`) and
**generic list utilities** (`searchableBody` `:129`, `matchesSearch` `:144`, `slice` `:243`) that other
features import (see A2).

**What is wrong / why it matters.** The class is the only place in the codebase where unrelated
features couple to each other, and the coupling is via *static helpers on a feature service* — the
hardest kind to move later. It also makes the guidance feature the default owner of every future
"render text and page a list" need. Sweep 1 flagged the size; the architectural cost is the utility
surface, not the line count.

**Suggested fix (M).** Split by responsibility: `GuidanceTranslationService` (translations, locale
scope, scoped reorder), keep `GuidanceService` for the post lifecycle, and move `slice`/`matchesSearch`/
`searchableBody` to a neutral home (`app/TextSearch.java`, `app/Paging.java`) — which is also the fix
for A2's cross-feature import. No endpoint or contract changes.

### A5 — Low (P2): caller-identity resolution is copy-pasted into three controllers while `AdminAccess` exists as the precedent

**Where.** Four independent implementations of "read the principal, require a `Long` userId, load the
user, else 401": `api/ShelterController.java:590-596` (`callerIdOrNull`) and `:598-606` (`currentUser`),
`auth/AccountController.java:245-252` (inline) and `:267-282` (`currentUser`),
`auth/VerificationController.java:160-171` (`currentUser`), and `api/AdminAccess.java:47-56`. The
exception *vocabulary* differs per controller (`InvalidAccessTokenException`,
`InvalidContactChangeException`, `VerificationFailedException`) and the `canWrite()` gate is then
re-checked per handler (`ShelterController.java:552-566`, `:569-575`).

**What is wrong / why it matters.** The admin half of this exact problem was fixed deliberately in
`101dbe4` ("one admin check") — the shared `AdminAccess` component exists and is used by all four admin
controllers. The *non-admin* half still has three copies, so "who is the caller and are they allowed"
has to be changed in three places, and each copy carries a subtly different failure mode (Account returns
`InvalidContactChangeException("Account not found")`, Shelter returns `InvalidAccessTokenException("Unknown
user")`). The asymmetry also invites a future handler to invent a fifth copy.

**Suggested fix (S).** Add `api/CurrentCaller.java` (or `app/` — see A1) with
`Long callerIdOrNull()`, `User requireUser()`, `RegisteredUser requireVerified()` used by
`ShelterController`, `AccountController`, `VerificationController`, mirroring `AdminAccess`'s shape; keep
each controller's exception type as a parameter where the current status mapping needs it.

### A6 — Low (P2): the boot guards are the same fail-closed template three times, with one helper duplicated (sweep-1 F8, still open)

**Where.** `config/ApiDocsGuard.java:56-68`, `config/DevEndpointsGuard.java:50-63`,
`config/DevSenderGuard.java:52-69`, plus `config/ProdJwtGuard.java:53-70` — same shape (dev/test
short-circuit → flag names → `log.error("REFUSING TO START …")` → `IllegalStateException("PRODUCTION
REFUSED TO START …")`), and `enabledFlagNames(boolean, boolean)` is duplicated verbatim at
`ApiDocsGuard.java:71` and `DevEndpointsGuard.java:66`. The shared *rule* is correctly extracted
(`config/Profiles.java:35-46`).

**Why it matters / fix.** Fail-closed policy copied four times drifts one guard at a time (a new profile
exemption lands in one file). Extract a small `FailClosedGuard` template that takes the flag list and the
two messages; each guard keeps its wording. **S.**

### A7 — Low (P2): the trusted-proxy pair is parsed by hand in four controllers although the properties record documents the same yml block (sweep-1 F7, still open)

**Where.** `auth/VerificationController.java:75-82`, `auth/AuthController.java:69-80`,
`auth/AccountController.java:90-98`, `api/LocationController.java:64-69` — each with an identical
`@Value("${app.ratelimit.trusted-proxies:}") String` → `CommaSeparated.parseSet(...)` +
`@Value("${app.ratelimit.trust-loopback:true}") boolean` pair, while
`config/RateLimitProperties.java:11-15` states these two keys "live in the same yml block but are NOT
part of this record: the four rate-limiting controllers parse them via `@Value` directly".

**Why it matters / fix.** The same two properties on the same yml prefix have two access paths and no
validated home; a typo in one controller's key silently changes the IP trust rule for one endpoint.
Add `trustedProxies`/`trustLoopback` to the record and inject it. **S.**

### A8 — Low (P2): `@EnableScheduling` hangs off two feature-flagged components (sweep-1 F9, still open)

**Where.** `config/RegistryScheduler.java:25-26` (`@EnableScheduling` +
`@ConditionalOnProperty(app.registry.schedule-enabled, matchIfMissing = true)`) and
`retention/RetentionScheduler.java:25-26` (`@EnableScheduling` +
`@ConditionalOnProperty(app.retention.enabled, matchIfMissing = false)`). These are the only two
`@EnableScheduling` sites in `src/main`; each carries exactly one `@Scheduled` method
(`RegistryScheduler.java:35`, `RetentionScheduler.java:37`).

**Why it matters / fix.** Scheduling infrastructure is a side effect of two unrelated feature flags: any
future third `@Scheduled` bean, or a config that removes both carriers, silently disables scheduling with
no error. Move `@EnableScheduling` to `ShelterMapApplication` (or a tiny `@Configuration`). **S.**

### A9 — Low (P2): `ShelterController` reaches past the service layer, and "who may delete a shelter" now lives at two call sites with two different rules

**Where.** `api/ShelterController.java` injects repository ports directly (`:99-101`, `UserRepository` +
`ShelterRepository`) and runs its own lookups at `:475` (`shelterRepository.findById` in
`requireOwnedShelter`), `:593` (`userRepository.existsById`), `:603` (`userRepository.findById`), while
its own javadoc says "Thin shell (01-TASK.md §7): parse, validate, delegate, map" (`:57`). It also
assembles aggregates positionally — `new Shelter(...)` with five trailing `null`s at `:259`, and a
15-field copy of the existing row at `:419-447`, including the admin-state fields
(`setAutoHideDisarmed`, `setReviewNote`, `setInaccurateMarkedAt/By`). Ownership:
**`NotAuthorException` has exactly one throw site in the whole repo — `ShelterController.java:480`** —
and `ShelterService.updatePlace`/`deletePlace` (`app/ShelterService.java:309-341`, `:378-386`) perform no
author check at all; the admin path enforces a *different* rule at its own call site
(`api/AdminModerationService.java:199-202` + `:642 requireUserOwned`). (This corrects sweep 1's F10, which
claimed the rule also exists in the service.)

**Why it matters.** The service will write or delete any row it is handed, so the authorization property
currently rests on "every caller remembers" — and there are already two callers with two rules and no test
that asserts the invariant at the service boundary. Anyone adding a third caller (a scheduled cleanup, an
admin bulk path) inherits no protection and no signal that protection was needed. The `existsById`
column-only shortcut the controller uses is a legitimate performance motivation
(`persistence/JpaUserRepository.java:209-225`) — the problem is only that it is reached through a
repository from a controller.

**Suggested fix (S).** Move the scope into the service as the callers already shape it:
`ShelterService.requireOwnedBy(long id, long userId)` and `ShelterService.updateOwned(long id, long userId,
UpdateShelterRequest)` (or an `assembleUpdate` mapper), and a dedicated admin entry point
(`deletePlaceByAdmin`) for the moderator path — then ownership has one home per policy and the controller
goes back to parse/validate/map. A spec asserting "the service refuses a non-author" is the guard.

### A10 — Low (P2): the frontend architecture contract (`01-frontend-architecture.puml`) no longer describes the shipped frontend, and nothing guards it

**Where.** `frontend/docs/01-frontend-architecture.puml` (441 lines, rendered into
`frontend/docs/out/`), which declares the structure rules at `:5-25`. Concretely, checked by grep over the
file: the word **"guidance" appears 0 times** and **"i18n"/"locale" 0 times**, although `features/guidance`
(2 pages), `core/i18n` (`messages.ts` 1 459 lines + three catalogs ≈ 3 535 lines + `i18n.service.ts` +
`translate-pipe.ts`) and the language switcher all ship; the `features` package block (`:265-305`) has no
`guidance/` or `legal/` package (the `legal` hits are only the route notes at `:435-436`); the route note
(`:424-440`) lists no `/blog` or `/blog/:slug`; `features/admin` says "**SIX tabs**" (`:294`) against the
nine `AdminTab` values (`admin-page.ts:84-93`) and does not contain the three extracted panels; the
`/admin/shelters?status=&source=&q=` contract note (`:209`) has no `limit`/`offset`/`X-Total-Count` (the
in-flight lane); and the gateway rule ("one gateway per backend resource group … auth, shelter, verify,
account, geo, admin", `:14-18`) undercounts the ten gateways in the tree.

**Why it matters.** This file *is* the frontend's declared architecture, and it is the first thing a new
contributor or reviewing agent reads. The backend equivalent is machine-guarded —
`config/DocumentationFactsTest` fails the build when a controller mapping is missing from `README.md` or a
cited path does not exist — while the frontend has no equivalent guard (`app/design-tokens.spec.ts` and
the i18n guard specs cover other things), so it drifts freely and silently.

> **Addendum (added after agent 3's report landed, verified by me).** The backend guard is the right
> *model* but it is not currently green: `DocumentationFactsTest.everyRepositoryPathCitedInTheReadmeExists`
> asserts `Files.exists` for every backticked path in `README.md`, and `README.md:645` cites
> `docs/code-review/2026-09-08-review-output.md`, which `docs/code-review/.gitignore:5` deliberately
> ignores — `git ls-files docs/code-review/` does not contain it, so the test **fails on a fresh clone or
> CI while passing on this working tree** (the file exists only locally). So "the backend has a doc guard"
> is true, "copy that guard to the frontend" is still the cheapest fix here, but the guard must be
> repointed at a tracked document at the same time (one-line change at `README.md:645`). Raised as a HIGH
> finding in `reviews/03-backend-tests.md` (agent 3); my cross-check of the citation, the `.gitignore` line
> and the tracked-file list confirms it.

**Suggested fix (S/M).** Bring the three sections current, then add the cheap guard the repo already
knows how to write: a spec that fails when a `features/*` directory or an `AdminTab` value has no
counterpart in the puml (the i18n `catalog-identity.spec.ts` is the local idiom for "keep two things in
lockstep").

### A11 — Low (P2): component file naming is inconsistent in `shared/`

**Where.** Three of the 24 non-spec components keep the legacy suffix
(`shared/accessibility-dialog.component.ts`, `shared/banner.component.ts`,
`shared/consent-banner.component.ts`) while the other 21 drop it (`shared/page-shell.ts`,
`shared/loading-indicator.ts`, `shared/pagination.ts`, `shared/report-gauge.ts`, every `features/**` page,
`app.ts`) — verified by listing every file containing `@Component`. Sweep 1's F11, unchanged.

**Why it matters / fix.** "Where is the banner component" is a per-file guess for navigation and for
grep-based work. Rename the three (their class names are already suffix-free: `BannerComponent`,
`ConsentBanner`, `AccessibilityDialog`). **S.**

### A12 — Low (P2): the admin surface still renders English banners and one hardcoded badge in a three-language UI

**Where.** `features/admin/admin-page.ts` has **29** calls of the exact form
`bannerMessage(error, 'shelter')` (e.g. `:773`, `:810`) with no third argument, plus one in
`features/account/account-page.ts` — `shared/error-copy.ts:126-132` then falls back to the English
`CLIENT_COPY` table. `shared/shelter-copy.ts:178` still hardcodes `INACCURATE_BADGE = 'Inaccurate'`,
which the adjacent comment documents as deliberate ("the admin surface is the other lane's copy work").

**Why it matters / fix.** An Estonian or Russian moderator reads English rate-limit/authorization banners
and one English badge while the rest of the admin UI is translated. Sweep 1's F4 said this was
repo-wide; it is not — the guest-facing and account paths now pass the callback. Fix: pass
`(key) => this.i18n.t(key)` at those 30 call sites (mechanical), and key the badge once the admin copy
wave lands. **S.**

### A13 — Low (P2): "paging" in the admin shelter list does not bound the read (in flight)

**Where.** In-flight `api/AdminController.java:140-150` — `moderation.listShelters(...)` (the whole
filtered projection) then `GuidanceService.slice(...)` over the result; the committed precedent is the
public list, `api/ShelterQueryService.java:168-177`, which loads every ACTIVE row of the source set,
DTO-maps all of them, applies the in-memory trust filters and only then slices.

**Why it matters.** The endpoint now advertises `limit`/`offset` + `X-Total-Count`, so a client
reasonably assumes paging bounds server work; it bounds only the response body. The decision is
documented as a scale choice ("Estonia-scale data", `ShelterQueryService.java:146-166`), and the
counts/perf angle belongs to agent 5 — the architecture point is that the *API contract* now promises
something the structure does not provide, and `X-Total-Count` requires the full filtered list anyway.

**Suggested fix (S/M).** Either push the slice into the repository query (`findAllActiveBySourceIn(...,
limit, offset)` plus a `countBy…` for the header) for the two filters that are expressible in SQL, or
state in the endpoint contract that the list is materialised server-side at this scale. **In-flight
note:** the lane's diff is uncommitted; the same shape is already committed for `GET /api/shelters`.

---

## Areas found clean (explicitly, with the check I ran)

- **No cycles anywhere**: 0 class-level and 0 package-level cycles over 345 main Java files; 0 cycles
  over 128 frontend `.ts` files.
- **Entity/DTO boundary**: no `persistence` import outside `persistence/` in `src/main`; no entity type
  in any non-persistence signature; all controller returns are records (one binary `FileSystemResource`).
- **Framework-free domain**: 34 files, only `java.*` imports.
- **Injection style**: 6 `@Autowired`, all constructor; 50 `@Value`, none on a field; no `@Inject`.
- **Repositories**: no thresholds/decisions beyond mapping and the documented port-level rules.
- **Profiles/config**: one dev/test rule, four fail-closed guards, no `@Profile`, no production
  `application-*.yml`, `ddl-auto: validate`, `open-in-view: false`, secrets as env-var placeholders only.
- **Frontend module organisation**: all standalone, no NgModules, route table the only cross-feature edge,
  HTTP confined to `core/api-client.ts`, gateways typed and page-facing.
- **Routing**: every route has `titleGuard` + `data.title`, `**` fallback, deliberate `loadComponent`
  laziness with the reason written next to it (`app.routes.ts`).
- **Trust/authorization single-sourcing** where it was fixed (`AdminAccess`, `Provenance.of`,
  `ReporterTrust.of`, owner-scoped `reviewNote`).

## Accepted trade-offs (documented decisions, not defects)

- `guidance/MediaService`, `api/ShelterQueryService`, `api/AdminModerationService` in the `api` package
  (`AdminModerationService.java:53-58` gives the reason) — A1 is about the missing *rule*, not these.
- In-memory trust filters and slicing over Estonia-scale data (`ShelterQueryService.java:146-166`).
- `config/SecurityConfig.java:262` writing the 401/403 body with the API's `ErrorResponse` — the
  composition root deliberately keeps one error shape instead of duplicating it.
- Initial-bundle budget overrun and component-style warnings: measured and accepted
  (`frontend/README.md:133-145`); recorded above only because the documented numbers are stale.
- Vendored Quill 2.0.3, the `SmartIdVerificationProvider` throwing stub, `spring-dotenv` loading `.env`.

## Top 5 findings

1. **A3 — `features/admin/admin-page.ts` is 2 072 lines / ~140 members over nine tabs (1 640 committed;
   the in-flight lane adds 432), against the frontend's own "thin shells, zero business logic" rule
   (`01-frontend-architecture.puml:8-9`, which itself still says "SIX tabs").** Extract the remaining
   seven panels after the `GuidanceEditor` precedent. (Medium)
2. **A2 — the paging contract is implemented four times in two exception vocabularies, and a shelter
   controller now imports `GuidanceService`/`GuidanceValidationException` for a list utility
   (`AdminController.java:144-146` + `:6-7`, in flight; committed twins in `GuidanceController`,
   `AdminGuidanceController`, `ShelterController`).** One `PageRequest`/`Paging` home + one 400
   exception. (Medium)
3. **A4 — `GuidanceService` is a 1 290-line, 26-method, 7-dependency god-service whose static helpers
   (`slice`, `matchesSearch`, `searchableBody`) are the de-facto cross-feature utility API.** Split
   translations/locale out and move the statics to a neutral home. (Medium)
4. **A1 — no written rule for where a new backend file belongs, so `api` mixes controllers with services
   and `app` is the residual bucket (18 exception classes, ports, helpers, and an HTTP adapter at
   `app/HttpUrlRedirectClient.java:30`).** Write the rule; give adapters a named home. (Medium)
5. **A9 — `ShelterController` reaches past the service layer (repository injection at `:99-101`, aggregate
   assembly at `:259`/`:419-447`) and the "who may modify a shelter" policy has exactly one enforcement
   point — the controller (`NotAuthorException`'s only throw site, `:480`) — with the admin path
   enforcing a different rule at its own call site.** Move ownership into the service. (Low)

Runner-up worth the cheap fix: **A10** (the frontend architecture diagram is the project's structure
contract, has drifted in five places, and has no guard — the backend's `DocumentationFactsTest` shows how
cheap the guard is).

### Out-of-band owner report handled during this run

**Owner-reported copy defect (fixed, verified).** `frontend/src/app/core/i18n/et.ts:328-329` shipped the
non-Estonian word `otsekirjo` in both distance strings (`shelter.distance.meters` / `.kilometers`), while
the EN twin reads `straight line` (`en.ts:322-323`) and the RU twin `по прямой` (`ru.ts:343-344`). Fixed in
place to the owner's wording: `≈ {distance} m|km otse minnes`. Verified with the full frontend suite
(`ng test --watch=false`: 59 files / 1395 tests pass), which includes the catalog-parity guards
(`core/i18n/catalog-identity.spec.ts`, `core/i18n/i18n-template-guard.spec.ts`) and
`shared/shelter-copy.spec.ts:591-602` (it interpolates the ET string from the catalogue and pins only the EN
fallback, so no spec change was needed). A scan of `et.ts` for 18 further Finnish-only word forms found no
other instance. Noted for agent 7/12: this is the one i18n defect the agent pipeline did **not** find — it
came from the owner.

**Owner-reported focus-ring defect (fixed, verified).** The shell focuses `main#main[tabindex="-1"]` on
**every** route change (`shared/page-shell.ts:169` `focusMainOnRouteChange`; markup at
`shared/page-shell.html:111-118`), and no rule anywhere styled that container's focus — so Chromium's
default ring traced a page-wide rectangle after each navigation that vanished on the next click (the
"stray black border"). `--color-primary` was not involved; it is `#1769aa`. Fixed in
`shared/page-shell.scss` with `#main:focus, #main:focus-visible { outline: none; }` plus its rationale
(WCAG 2.4.7/2.4.11 owe no indicator to a non-operable programmatic focus target, and BOTH pseudo-classes
are needed because Chromium matches `:focus-visible` for a script `focus()` call). Pinned by a new
assertion in `shared/page-shell.spec.ts`, using the repo's existing CSS-pinning idiom. Verified: full
frontend suite **59 files / 1396 tests pass**, production build clean, and the emitted rule is present in
the initial chunk as `#main[_ngcontent-%COMP%]:focus`. The skip link, header and footer rings are
untouched (their specs still pass).

**Owner-decided global focus-ring suppression (landed, verified).** Following the two targeted
suppressions above, the owner asked for the blanket form and accepted the accessibility cost
(recorded, not silent): `src/styles.scss` now carries `*:focus { outline: none; }` with a comment
recording the decision, the specificity reasoning (author rule beats the UA stylesheet; `*:focus` is
(0,1,0) while the token rings are `(0,1,1)`+), and the deviation. Effect: every browser-default ring
is gone (the containers the shell focuses programmatically, the seven `tabindex="0"` admin table scroll
regions, the two `<select>` controls), while the project's own token rings are untouched. (Count
corrected: agent 10 counted the evidence and found seven regions, not the six I first wrote — see
`reviews/10-frontend-security-perf-a11y.md`.) This is a
deliberate **WCAG 2.4.7 (Focus Visible, AA) deviation** — the first accessibility deviation I found in
this tree that was *introduced*, not merely reported. Documented in `qa/accessibility-checklist.md` §3
(status changed from VERIFIED to "VERIFIED — with one documented WCAG 2.4.7 deviation"), in
`frontend/README.md` next to the focus-visible claim it qualifies, and pinned by a new
`design-tokens.spec.ts` assertion that fails if either half drifts. Verified: full frontend suite
**59 files / 1398 tests pass**, production build clean, rule present in the shipped global stylesheet
as `*:focus{outline:none}`.

**…and the deviation was retired in the same session (QW6 of `reviews/12-summary.md`).** Agent 10's
corrective half: `select:focus-visible` and `.admin-table-wrap:focus-visible` were added to the global
token ring (`frontend/src/styles.scss:418-419`), so every keyboard-OPERABLE control has a visible
indicator again — including the seven admin table scroll regions and the two `<select>`s, one of which
is on the public `/blog` page. What `*:focus` still suppresses is only the two containers the shell
focuses PROGRAMMATICALLY (a route change, a dialog open): non-operable, so no indicator is owed. No
WCAG 2.4.7 deviation remains; the standing rule for new controls is now written into
`qa/accessibility-checklist.md` §3 ("anything focusable must be added to the token-ring selector
list"), this report, and `frontend/README.md`, and the `design-tokens.spec.ts` pin asserts the wider
ring so the retirement cannot silently regress.

## Merge verdict

**OK with notes.** Nothing in the structure blocks a merge: layering, the entity/DTO boundary, dependency
direction, injection style and profile handling are all in good shape (re-verified mechanically, not
inherited from sweep 1), and the only two correctness-level items sweep 1 raised — the shelter write-path
transaction boundary and the leaked moderator note — are fixed, as is the test-config drift and the
copy-pasted admin guard. My findings are maintainability and drift issues: two oversized files that grew
rather than shrank (A3, A4), a cross-feature coupling that the in-flight lane just copied (A2), and one
missing written rule (A1). I disagree with sweep 1 on two points — F12 (both halves are enforced by the
pinned Angular 22 / TS 6.0 defaults) and F10's claim that the ownership rule also lives in the service
(it does not) — and I record that F4 is largely fixed rather than open. I would not block on the bundle
warning: it is a documented, accepted decision, though the numbers documenting it are now stale.
