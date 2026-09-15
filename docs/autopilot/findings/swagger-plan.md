# Swagger / OpenAPI implementation plan (executable)

Target repo: `/home/aleks/MyScripts/LocalRepos/OpenShelter` (branch `feature/frontend`).
Audience: an implementer agent with shell access. Every item is meant to be applied literally.

Verified facts this plan is built on:

- `pom.xml:9-12` — parent `spring-boot-starter-parent:3.3.13`; `pom.xml:22` — `<java.version>21</java.version>`.
- `pom.xml` — **no** `springdoc`/`springfox`/`openapi` dependency exists (grep: zero hits).
- `src/main/java/ee/sheltermap/config/SecurityConfig.java:203-213` — the authorization block: POST auth endpoints permit-all (`:203-204`), `GET /api/shelters/mine` authenticated (`:207`), `GET /api/shelters/**` permit-all (`:208`), `GET /api/data-source` permit-all (`:211`), `/actuator/health` + `/actuator/info` permit-all (`:212`), `.anyRequest().authenticated()` (`:213`).
- `src/main/java/ee/sheltermap/config/Profiles.java:38` — `isDevTestOnly(Environment)`: the single dev/test rule shared by the fail-closed guards.
- `src/main/java/ee/sheltermap/config/ProdJwtGuard.java:38,43,67` and `DevEndpointsGuard.java:41,59` — the fail-closed startup-guard pattern ("PRODUCTION REFUSED TO START: …"), both keyed on `Profiles.isDevTestOnly(env)`.
- `src/main/resources/application.yml:37-41` — actuator exposure is exactly `health,info`; `.env` (gitignored) is the dev value store, loaded by spring-dotenv.
- `src/test/resources/application.yml:8-13` — the suite runs `spring.profiles.active: test` and deliberately mirrors the main file (ITs override via `@TestPropertySource` / `@DynamicPropertySource`).
- Test harness in use: `@AutoConfigureMockMvc` + `MockMvc` (`src/test/java/ee/sheltermap/security/AdminAuthorizationIT.java:39,56`, `config/SecurityHeadersIT.java:27,31`, `security/PiiAtRestIT.java:48,63`, `api/SmsTestControllerAllowlistIT.java:27`) on top of `@SpringBootTest` (`src/test/java/ee/sheltermap/persistence/AbstractPersistenceIT.java:31`).

---

## A. Dependency

**A1 — `pom.xml:22-25` (the `<properties>` block): add a pinned version property.**
Observed: `jjwt.version` and `testcontainers.version` are the only pinned library versions; every third-party version in this POM is a named property.
Why it matters: the repo's convention is a single place to bump; a bare version on the dependency would break it.
Fix: add `<springdoc.version>2.6.0</springdoc.version>` next to the existing two.

**A2 — `pom.xml` dependencies: add one dependency.**

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>${springdoc.version}</version>
</dependency>
```

Why `2.6.0`: springdoc's 2.x line is version-aligned to Spring Boot minors — 2.6.x is the line for Boot 3.3.x and it supports Java 21. **Do not** use `springdoc-openapi-ui` (the v1 artifact) or `springdoc-openapi-starter-webflux-*` (this is a servlet app). **Do not** add `springdoc-openapi-starter-actuator` — the API document must not absorb actuator endpoints (`application.yml:37-41` exposes `health,info` only; publishing more would contradict that posture).
Verify (runner, required): `flock /tmp/openshelter-mvn.lock mvn -q dependency:get -Dartifact=org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0` → must resolve. If the environment's mirror only carries a later 2.6.x patch, take the highest `2.6.x` and record the substitution in the commit message; if only 2.7.x/2.8.x is available, that is a risk item, not a free choice (2.7+ targets Boot 3.4+ and can pull a newer spring-web/springdoc-mismatch) — report before using it.

**A3 — `pom.xml:build/plugins` surefire includes (`**/*Test.java`, `**/*IT.java`).**
Observed: ITs run inside `mvn test` (no failsafe).
Consequence for this change: the new doc tests must be named `…IT`/`…Test` and must run under `mvn test` — they will, no POM change needed. State this explicitly in the commit so nobody adds a failsafe plugin "to make the ITs run".

---

## B. Enablement (dev-only) + fail-closed guard

**B1 — `src/main/resources/application.yml`: add a `springdoc:` block near the `management:` block (`:37-41`), default OFF.**

```yaml
springdoc:
  # Dev-only API documentation (no springdoc dependency existed before this
  # change). Off by default and refused on non-dev/test profiles by
  # ApiDocsGuard — same fail-closed shape as ProdJwtGuard/DevEndpointsGuard.
  api-docs:
    enabled: ${SPRINGDOC_ENABLED:false}
  swagger-ui:
    enabled: ${SPRINGDOC_ENABLED:false}
    operations-sorter: method
    tags-sorter: alpha
    try-it-out-enabled: true
  show-actuator: false
```

Why: an OpenAPI document is a complete map of the attack surface plus (in this app) admin endpoints and their payload shapes. It must be opt-in exactly like the `/dev/*` diagnostics, and it must fail closed if a production deploy copies the dev `.env`.

**B2 — `src/test/resources/application.yml`: mirror the same block with the same defaults.**
Observed: `src/test/resources/application.yml:6-13` states the file must stay in sync with the main one (same defaults, same env placeholders). Mirroring keeps that contract true and gives the doc ITs a deterministic baseline (they enable it per-test with `@TestPropertySource`).

**B3 — NEW FILE `src/main/java/ee/sheltermap/config/ApiDocsGuard.java`: a third fail-closed guard.**
Shape it exactly like `DevEndpointsGuard.java` (constructor-injected `Environment` + the two flags, `Profiles.isDevTestOnly(env)` return, `log.error(...)` then `throw new IllegalStateException("PRODUCTION REFUSED TO START: OpenAPI documentation is enabled …")`).
Signature to use:

```java
public ApiDocsGuard(Environment env,
                    @Value("${springdoc.api-docs.enabled:false}") boolean apiDocsEnabled,
                    @Value("${springdoc.swagger-ui.enabled:false}") boolean uiEnabled)
```

Rule: if `Profiles.isDevTestOnly(env)` → return; else if either flag is true → refuse to boot. Message must name the flags, the resolved `Arrays.toString(env.getActiveProfiles())`, and how to fix it (`unset SPRINGDOC_ENABLED, or run with SPRING_PROFILES_ACTIVE=dev/test`) — copy the wording structure of `DevEndpointsGuard.java:65-70`.
Why: without it, the only thing standing between a copied dev `.env` and a published admin API map is the security permit (layer 1). The repo's existing posture is two layers for the `/dev/*` relays; the API map deserves the same.

**B4 — `src/main/java/ee/sheltermap/config/Profiles.java`: no change.**
Explicitly: reuse `isDevTestOnly` rather than re-implementing profile parsing. Any new local `Arrays.asList(env.getActiveProfiles()).contains("dev")` check would re-open the S3 defect documented at `Profiles.java:10-20` (profile groups / `spring.profiles.default` are invisible in the raw property).

---

## C. Security wiring (readable in dev, closed everywhere else)

**C1 — `SecurityConfig.java:160-214`: make the permit profile-aware, without touching the two existing guards.**
Observed: `securityFilterChain(HttpSecurity http, JwtTokenService tokenService, UserRepository userRepository, ObjectMapper objectMapper, CorsConfigurationSource corsConfigurationSource)`; the chain is built with an expression lambda `auth -> auth.…anyRequest().authenticated()` (`:203-213`), so there is currently **no** place to express a condition.
Fix: add `Environment env` to the method parameters, switch that lambda to a statement block, and register the docs matchers **only** in dev/test:

```java
.authorizeHttpRequests(auth -> {
    auth.requestMatchers(HttpMethod.POST, "/auth/register", /* … unchanged list … */).permitAll();
    auth.requestMatchers(HttpMethod.GET, "/api/shelters/mine").authenticated();
    auth.requestMatchers(HttpMethod.GET, "/api/shelters/**").permitAll();
    auth.requestMatchers(HttpMethod.GET, "/api/data-source").permitAll();
    auth.requestMatchers("/actuator/health", "/actuator/info").permitAll();
    if (Profiles.isDevTestOnly(env)) {
        // Dev/test only (see ApiDocsGuard): the API document + UI.
        auth.requestMatchers("/v3/api-docs/**", "/v3/api-docs.yaml",
                             "/swagger-ui/**", "/swagger-ui.html").permitAll();
    }
    auth.anyRequest().authenticated();
})
```

Order matters: this block must sit before `.anyRequest().authenticated()` and the existing matcher order must stay byte-identical (the `/api/shelters/mine` matcher must remain **before** `/api/shelters/**`).

**C2 — Why this does not weaken the existing guards.**
`ProdJwtGuard` keys only on `app.jwt.secret` and `DevEndpointsGuard` only on the two `app.dev-*-test.enabled` flags. Item C1 adds matchers and a profile read; it changes neither property, neither guard, nor the authentication entry point (`SecurityConfig.java:197-199`). No production behaviour changes except that `/v3/api-docs/**` + `/swagger-ui/**` stay `.anyRequest().authenticated()` — i.e. 401 unless the caller is authenticated, and additionally absent altogether because `SPRINGDOC_ENABLED` defaults to false outside dev.

**C3 — `SecurityConfig.java:198` (the 401 entry point) + `:200` (403 handler): no change needed.**
Observed: both write `ErrorResponse` via `writeError(...)`.
Consequence: a 401 for `/v3/api-docs` in a non-dev profile returns the same uniform error shape as every other endpoint — which the new prod-closure test asserts.

**C4 — `SecurityHeadersFilter` (registered at `SecurityConfig.java:158` before the JWT filter): keep it in front.**
Observed comment at `:150-157`: the headers must be present on the 401/403 bodies.
Consequence: Swagger UI assets may receive `X-Content-Type-Options`/frame-ancestors headers — expected, do not "fix" it, and assert the UI still returns 200 in the dev IT so a header-induced breakage is caught rather than discovered in a browser.

**C5 — `.env` (gitignored, repo root): add `SPRINGDOC_ENABLED=true` for local dev.**
Why here and not in `application.yml`: `.env` is the dev value store (`README`, "PII at rest" section, and `application.yml:111-123` use the same env-flag pattern).
Do **not** commit `.env`; do **not** set the flag in `src/main/resources/application.yml`.
Verify (runner, dev smoke): with the dev server running, `curl -s -o /tmp/apidocs.json -w '%{http_code}' http://localhost:8080/v3/api-docs` → 200, and `…/swagger-ui/index.html` → 200.

---

## D. Document metadata, error contract, security scheme

**D1 — NEW FILE `src/main/java/ee/sheltermap/config/OpenApiConfig.java`** (package `ee.sheltermap.config`, next to `SecurityConfig`) containing:

1. `@Bean OpenAPI openAPI()` with `Info`:
   - `title`: "OpenShelter API"
   - `version`: read from the build, not hand-typed — `@Value("${spring.application.version:0.0.1-SNAPSHOT}")` or the POM version via a filtered property. **Do not** hardcode a version that will drift.
   - `description`: 2–4 sentences naming the contract sources that already exist: `05-shelter-api.puml` (referenced by `ShelterDto`'s javadoc), the README API section, and `docs/whitepaper.md`. This is what keeps the human docs and the machine doc pointed at each other.
   - `license`/`contact`: only if already published in the repo (the whitepaper lists `aleks.bratsun@reaktiiv.com` for the external review channel — reuse that, do not invent a new one).
2. `@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")` — matches `JwtAuthenticationFilter.java:20,53-54` (`Authorization: Bearer <accessToken>`), so Swagger UI's Authorize box works.
3. A global security requirement for `bearerAuth`, **plus** an explicit per-operation opt-out for every public operation (section E). Do not rely on "no requirement = public" implicitly; the point of item H1 is that the public/authenticated split is asserted.

**D2 — The uniform error contract must be published once, not per-endpoint.**
Observed: `api/ErrorResponse.java` (5 fields: `timestamp, status, error, message, path`) + `api/ApiErrorHandler.java:56,63` (`@RestControllerAdvice`, "every error response is this record") + the two entry-point writers in `SecurityConfig`.
Fix: in `OpenApiConfig`, register a reusable `ErrorResponse` schema into `components.schemas` and add a reusable response per status — `400`, `401`, `403`, `404`, `409`, `429`, `500` — then attach them to every operation via an `OpenApiCustomizer` (skip an operation that already declares that code). Rationale: the app guarantees ONE error shape; the document must express exactly that, otherwise consumers guess.
Do **not** set `springdoc.override-with-generic-response=true` (it would fabricate responses that this app does not return).

**D3 — Grouped documents, so the admin map is explicit and the dev relays are absent.**
In `OpenApiConfig`, declare three `GroupedOpenApi` beans:

- `public` — `pathsToMatch("/api/shelters/**", "/api/data-source", "/auth/**")`
- `account` — `pathsToMatch("/account/**", "/verify/**")` plus `GET /api/shelters/mine` and `POST /api/geo/resolve`
- `admin` — `pathsToMatch("/admin/**")`
and match **no** group against `/dev/**` (`EmailTestController.java:43-44` `/dev/email-test`, `SmsTestController.java:35-36` `/dev/sms-test`) and none against `/actuator/**`.
Why: `/dev/*` are guarded relays (`DevEndpointsGuard.java:41`); documenting them would advertise a surface that is meant to be invisible, and `springdoc.show-actuator: false` (B1) keeps actuator out.

**D4 — Servers.** Emit a single relative server (`servers: [{url: "/"}]`) rather than an absolute `http://localhost:8080`. The frontend dev server proxies to the backend (`frontend/package.json` `start`: `ng serve --port 5173 --proxy-config proxy.conf.json`), so an absolute dev host is exactly the kind of value that silently rots in a committed snapshot (item G2/H2).

**D5 — Tag ordering/naming.** Give the tags in the document the same names as the grouping (`Public shelters`, `Account & verification`, `Admin moderation`, `Auth`, `Geo`). Tags come from `@Tag` on the controllers (section E); an `OpenApiCustomizer` can attach the descriptions so the annotation stays a one-liner in each controller.

---

## E. Annotation plan (per controller, file-specific)

Add `@Tag(name = …, description = …)` at class level and `@Operation(summary = …, description = …)` + `@ApiResponse(...)` at method level. Use the **existing javadoc sentences** as the summary/description source of truth — they are already precise about codes and edge cases (e.g. `ShelterController.java:190-202` documents 404/429, `AdminController.java:82` documents 204/404/409). Do not invent new prose; promote what is there.

| File | Class-level `@Tag` | Operations to annotate |
|---|---|---|
| `api/ShelterController.java:65-66` (`/api/shelters`) | `Public shelters` (+ document that the list/detail reads are anonymous) | `:115 GET ""` list (`source`, `hasCapacity`, `provenance` params), `:130 GET /{id}`, `:135 POST ""` (201; JWT + verified; 400/403), `:164 GET /mine` (JWT; caller-scoped), `:176 POST /{id}/info-request/reply` (204; author-only; 403/404), `:192 POST /{id}/reports` (409/429 documented in javadoc `:190-202`), `:204 PUT /{id}/occupancy` (204; 429), `:220 PUT /{id}/open-status` (204; registered), `:232 PUT /{id}` (author-only), `:273 DELETE /{id}` (204; author-only) |
| `api/AdminController.java:49-50` (`/admin`) | `Admin moderation` — description MUST state: *every operation requires an ADMIN-kind account, checked by a fresh per-request DB lookup; anonymous → 401, non-admin → 403* | `:74`, `:83`, `:91`, `:105`, `:119`, `:132`, `:141`, `:155`, `:169`, `:183`, `:197`, `:205`, `:215`, `:227`, `:234` — all with 401/403 attached, plus the per-endpoint codes already in the javadoc (204/404/409) |
| `auth/AuthController.java:33-34` (`/auth`) | `Auth` (public) | `:73 POST /register` (201), `:93 POST /login` (200; 401; **429** — rate-limited, see `README`/`SecurityConfig` buckets), `:103 POST /refresh`, `:108 POST /logout` (204), `:120 POST /password-reset/request` (documented "never reveals whether the e-mail exists" `:118`), `:127 POST /password-reset/confirm` |
| `auth/AccountController.java:59-60` (`/account`) | `Account & verification` (JWT) | `:91 GET /me`, `:100 PUT /profile`, `:105 POST /email-change/request` (202), `:113 POST /email-change/confirm`, `:125 POST /phone-change/request` (202), `:133 POST /phone-change/confirm`, `:149 GET /export`, `:163 DELETE ""` (204) |
| `auth/VerificationController.java:46-47` (`/verify`) | `Account & verification` (JWT) | `:79 POST /request` (202), `:96 POST /confirm` (200) |
| `api/LocationController.java:43-44` (`/api/geo`) | `Geo` | `:66 POST /resolve` — **mark as JWT-authenticated, NOT public**: the permit list (`SecurityConfig.java:203-212`) does not include it, and it is a per-IP rate-limited server-side fetch (`SecurityConfig` geo bucket). Document the 429 |
| `api/DataSourceController.java:15-16` (`/api/data-source`) | `Public shelters` or its own `Data source` tag | `:27 GET ""` (public; provenance read) |
| `api/EmailTestController.java:43-44` (`/dev/email-test`) | `@Hidden` | also `@Hidden` on `:72` — dev-only relay (see D3) |
| `api/SmsTestController.java:35-36` (`/dev/sms-test`) | `@Hidden` | also `@Hidden` on `:58` |

**E1 — Public-vs-authenticated is the easiest thing to get wrong here.** Public, and therefore to be marked with an empty `@SecurityRequirements` (opt-out of the global requirement): `GET /api/shelters`, `GET /api/shelters/{id}`, `GET /api/data-source`, and the six `/auth/**` operations. Everything else in the table is JWT. Note the trap: `GET /api/shelters/mine` **is** authenticated even though `/api/shelters/**` is public — the permit list deliberately splits them (`SecurityConfig.java:205-208` shows the explicit ordering), so the annotation must split them too.

**E2 — Admin operations need a machine-readable marker, not just prose.** `AdminController` enforces ADMIN via `requireAdmin()` inside each method (see `:78`, `:94`, `:107`, …), which springdoc cannot infer. Add `@Extension(name = "x-admin-only", properties = @ExtensionProperty(name = "value", value = "true"))` to each admin operation (or via the `admin` group customizer) so a consumer or a test can detect "admin required" without parsing English. Also attach the 403 response to every one of them.

**E3 — Request-body validation must be published.** The controllers use `@Valid @RequestBody` everywhere (e.g. `:136`, `:193`, `:206`). Document 400 with the `ErrorResponse` schema (D2) and annotate the request records' constraints in section F, otherwise the document shows required-ness that the server does not actually enforce.

---

## F. DTO `@Schema` plan + the never-publish list

**F1 — Annotate every type that appears in a controller signature.** From `src/main/java/ee/sheltermap/api` and `src/main/java/ee/sheltermap/auth`: `ShelterDto` (and its nested `OpenStatus`, `Occupancy`, `InfoRequest`), `DataSourceDto` (+ `LastImport`), `LocationResolvedDto`, `ErrorResponse`, `CreateShelterRequest`, `UpdateShelterRequest`, `ShelterReportRequest`, `ShelterReportResult`, `OccupancyReportRequest`, `OpenStatusReportRequest`, `InfoRequestReplyRequest`, `ShelterSourceFilter` (query enum), `AdminShelterDto`, `AdminUserDto`, `AdminAuditDto`, `AdminAlertDto`, `AdminShelterReportDto`, `AdminShelterHistoryDto`, `AdminShelterStatusRequest`, `AdminInfoRequestRequest`, `AdminMarkInaccurateRequest`, `AdminShelterReviewRequest`, `MeResponse`, `TokenResponse`, `CodeSentDto`, `DataExportResponse` (+ `ExportedProfile`, `ExportedShelter`), plus the auth request records used by `AuthController`/`AccountController`/`VerificationController` (`RegisterRequest`, `LoginRequest`, `RefreshRequest`, `PasswordResetRequest`, `PasswordResetConfirmRequest`, `VerifyRequest`, `VerifyConfirmRequest`, `ProfileUpdateRequest`, `ChangeEmailRequest`, `ChangePhoneRequest`, `ConfirmChangeRequest`).

**F2 — Highest-value `@Schema` work: the fields whose meaning is not self-evident.** These are the ones consumers get wrong today (all documented already in javadoc → move that text into `@Schema(description=…)`):

- `ShelterDto.yourOccupancyBand` / `.yourOpenStatus` / `.infoRequest` — caller-scoped and **detail-`/mine`-only**, null for guests/anonymous and null on public list/detail reads (`ShelterDto` javadoc, `InfoRequest` note: "null on the public list and detail reads").
- `ShelterDto.provenance` — server-derived, "the UI never re-derives it".
- `ShelterDto.reviewStatus` — NEW/CONFIRMED/REJECTED incl. the REJECTED "hidden except /mine + admin" rule.
- `ShelterDto.lastVerifiedAt` / `.reportCount` vs `.nonexistentReports` — the javadoc spells out the derivation and that `null` = never verified; this is the single most misreadable pair in the contract.
- `ShelterDto.submitterVerified` — true/false semantics incl. deleted creators.
- `DataSourceDto.lastImport` — null until the first import.
- `CodeSentDto.resendAvailableAfterSeconds` — 0 = no cooldown configured.

**F3 — Enums: document the values, not just the type.** `ShelterStatus`, `ShelterSource`, `ReviewStatus`, `LocationKind`, `Provenance`, `OccupancyBand`, `ShelterReportType`, `VerificationLevel` — one `@Schema(description=…)` per constant, keeping the existing javadoc wording (e.g. `Provenance`'s derivation precedence). An enum list without semantics is the most common source of client bugs.

**F4 — Third-party PII carriers are legitimate but must be labelled.** `AdminShelterReportDto` (`api/AdminShelterReportDto.java` — fields `reporterName`, `reporterEmail`) states in its own javadoc: *"the reporter's identity (profile name + email) is admin-only data, never exposed outside `/admin/*`"*. `AdminUserDto` (`api/AdminUserDto.java` — `email`) says *"E-mail is admin-only data, served from `/admin/*` only (the reporter-identity convention)"*.
Fix: `@Schema(description = "…admin-only: reporter identity, never exposed outside /admin/*")` on those properties, and **no `example` value on them at all** (see F6). Do not hide them — they are part of the admin contract — but make their sensitivity explicit in the published document so a reader cannot mistake them for a public field.

**F5 — `TokenResponse` (`auth/TokenResponse.java`: `accessToken`, `refreshToken`, `expiresIn`) is a credential response.** Add `@Schema(description = "Issued access JWT (credential — never log, never store in the document)")`, no `example`, and state in the `Auth` tag description that the response carries bearer credentials.

**F6 — Fields/values that must NEVER appear in the published document** (assert this in H5):

1. bind-index columns: `email_hash`, `phone_hash`, and any property named `*Hash` (`users.email_hash`/`phone_hash`; `V13PiiEncryptionMigration.java:95-96,130-137,152-157`);
2. PII ciphertext: any `v1:`-prefixed envelope value, and the envelope format itself (`security/PiiCrypto.java:21,65-69`);
3. secrets/config: `JWT_SECRET`, the published dev default (`config/ProdJwtGuard.java:43`), `PII_AES_KEY`, `PII_HMAC_KEY`, `ADMIN_PASSWORD`/`app.admin.password` (`auth/AdminSeeder.java:62`), DB credentials, SMTP/Twilio credentials (`Redis`-style env names in `application.yml`);
4. JPA entities: never let an entity type (`UserEntity`, `ShelterEntity`, `RefreshTokenEntity`, `PasswordResetTokenEntity`, `DataImportLog`, `ModerationAuditLog`, …) reach a controller signature or an `@Schema(implementation = …)`. If one ever does, springdoc will publish internal columns including the blind index; the H5 assertion is the tripwire;
5. `/dev/**` operations (`EmailTestController`, `SmsTestController`) — must be absent, not merely hidden in the UI (D3);
6. real credentials in examples: no real e-mail/phone/token in any `example`; use `example.ee` and `+37250000000` style placeholders only (the repo's own tests use `sec-admin@example.ee`, `Mari`).

**F7 — Do not add `@Schema` to domain/entity classes to "help" the document.** The annotate-the-DTO rule above is the boundary; annotating `domain/*` or `persistence/*` invites the F6-4 failure and couples the domain layer to the docs library.

---

## G. Build-time vs runtime document generation

**G1 — Generate at RUNTIME (default), not at build time.** The app already runs (dev servers on :8080/:5173) and the document is dev-gated; a build-time plugin would need a bootable app context at build time, i.e. the fail-closed guards satisfied during packaging — a deployment smell for this repo.
**G2 — Commit a generated snapshot for humans and for drift detection:** `docs/api/openapi.json`, produced *by a test*, not by hand (see H2). Reason: the repo's docs are reviewed in diffs, and a snapshot turns "docs silently drift" into a reviewable diff. The snapshot must be generated with normalized ordering (sorted paths, sorted schema properties, no server host — D4) so it is stable across machines.
**G3 — Feed the other docs.** Point `README.md`'s API section and `docs/whitepaper.md`'s API chapter at `/swagger-ui` (dev) + `docs/api/openapi.json` (committed), and let the external-review package reference the snapshot instead of hand-written tables. This closes the exact drift class that produced the README/API-table divergence fixed in the 2026-09-14 batch.

---

## H. Tests that stop the docs drifting (the enforcement, not documentation)

**H1 — NEW `src/test/java/ee/sheltermap/api/OpenApiContractIT.java`** (extends `AbstractPersistenceIT`, `@AutoConfigureMockMvc`, `MockMvc mvc`; enable docs with `@TestPropertySource(properties = {"springdoc.api-docs.enabled=true","springdoc.swagger-ui.enabled=true"})`).
Asserts, in one place:

1. `GET /v3/api-docs` → 200 and `application/json`;
2. **the exact path+method inventory** — a hardcoded expected set of every endpoint from section E (so adding/removing a controller method without touching the doc fails the build in *both* directions);
3. `components.securitySchemes.bearerAuth` exists with `type=http`, `scheme=bearer`, `bearerFormat=JWT`;
4. every `/admin/**` operation carries the 403 response (and the `x-admin-only` extension, E2);
5. `GET /api/shelters`, `GET /api/shelters/{id}`, `GET /api/data-source`, all six `/auth/**` operations have **no** security requirement, while `GET /api/shelters/mine`, `POST /api/geo/resolve`, `/account/**`, `/verify/**`, `/admin/**` all **do** (E1's trap, asserted);
6. no path under `/dev/` or `/actuator/` appears in any group.

**H2 — NEW `src/test/java/ee/sheltermap/api/OpenApiSnapshotIT.java`: the snapshot gate.**
Fetch `/v3/api-docs` (or each group), normalize (sort `paths`, sort each operation's keys, sort `components.schemas` properties, strip `servers`), serialize deterministically, and compare with `docs/api/openapi.json`; on mismatch fail with a diff summary and the instruction "re-run with `-Dopenapi.update=true` to regenerate". With that flag, write the file instead (the only sanctioned way to change the snapshot). This is what makes G2 real.

**H3 — NEW `src/test/java/ee/sheltermap/config/ApiDocsProdClosureIT.java`: prove the prod closure.**
`@AutoConfigureMockMvc` with a non-dev profile (`@ActiveProfiles("production")`) and `@TestPropertySource` supplying what the fail-closed guards require to boot: `app.jwt.secret` (≥32 bytes, not the published default), `app.pii.aes-key`, `app.pii.hmac-key` (base64, 32 bytes), and leaving `app.dev-email-test.enabled`/`app.dev-sms-test.enabled` false (otherwise `DevEndpointsGuard` refuses the context — that refusal is itself a valid assertion in a separate test).
Assert: the docs flag defaults to false there, so `GET /v3/api-docs` and `GET /swagger-ui/index.html` are **never** 200 — accept 401 (authenticated-required) or 404 (absent) but fail on 200. This is the test that makes "readable in dev WITHOUT weakening the guards" true by construction rather than by review.

**H4 — NEW `src/test/java/ee/sheltermap/config/ApiDocsGuardTest.java`** — a pure unit test mirroring `src/test/java/ee/sheltermap/config/ProdJwtGuardTest.java:32-91` (no Spring context, `Environment` stubs like `env("dev")`, `env("production")`, `env("dev","prod")`, blank):

- dev/test + enabled → no exception; non-dev + enabled → `IllegalStateException`; blank profile + enabled → throws; non-dev + disabled → no exception; mixed `dev,production` + enabled → throws (the M2 rule). Mirror the existing test names/shape so the guard family reads as one thing.

**H5 — Forbidden-content assertions (in H1, as one test method).**
Serialize the full document and assert it contains none of: `emailHash`, `phoneHash`, `email_hash`, `phone_hash`, `v1:`, `PII_AES_KEY`, `PII_HMAC_KEY`, `JWT_SECRET`, `ADMIN_PASSWORD`, `dev-only-secret-change-me` (the value from `ProdJwtGuard.java:43`), and that no `components.schemas.*.properties.*` key matches `/(?i)hash|ciphertext|secret|passwordhash/`. Keep the `password` **request** field of `LoginRequest`/`RegisterRequest` legal (it is an input), so scope the pattern to schema property names of *responses* only, or list the allowed exceptions explicitly in the test.

**H6 — Verification commands for the runner (in this order).**

```bash
cd /home/aleks/MyScripts/LocalRepos/OpenShelter
flock /tmp/openshelter-mvn.lock mvn -q dependency:get -Dartifact=org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0   # A2
flock /tmp/openshelter-mvn.lock mvn -q -DskipTests compile                                                              # wiring/A-B/D/E/F compile
flock /tmp/openshelter-mvn.lock mvn -q -Dtest='OpenApiContractIT,OpenApiSnapshotIT,ApiDocsProdClosureIT,ApiDocsGuardTest' test
flock /tmp/openshelter-mvn.lock mvn clean test                                                                          # full gate (679 today, grows by the new tests)
# dev smoke (server already running with .env SPRINGDOC_ENABLED=true):
curl -s -o /tmp/apidocs.json -w '%{http_code}\n' http://localhost:8080/v3/api-docs      # 200
curl -s -o /dev/null   -w '%{http_code}\n' http://localhost:8080/swagger-ui/index.html  # 200
```

The full `mvn clean test` is the gate; the doc tests alone are not sufficient evidence.

---

## I. Follow-ups that keep the other docs honest (do not block the implementation)

**I1 — `README.md` API section.** After the snapshot exists (G2), replace the hand-maintained endpoint table with a pointer to `/swagger-ui` + `docs/api/openapi.json`, or generate the table from the snapshot. Otherwise README will drift again exactly as it did before the 2026-09-14 batch.
**I2 — Frontend contract sync.** Add a frontend spec that reads the committed `docs/api/openapi.json` and asserts every URL string used in `frontend/src/app/gateways/*.ts` (`account-`, `admin-`, `auth-`, `data-source-`, `geo-`, `geocode-`, `shelter-`, `verify-gateway`) exists in the snapshot. This makes the FE/BE contract drift a test failure instead of a runtime 404.
**I3 — PUML link.** `ShelterDto`'s javadoc cites `05-shelter-api.puml` as the read contract; add the OpenAPI document as its machine-readable companion in the same comment and in `context-and-tasks/05-shelter-api.puml`'s header, so the diagram and the generated doc point at each other.
**I4 — `README.md` guard list.** The README documents `ProdJwtGuard` + `DevEndpointsGuard` as the two boot guards; adding `ApiDocsGuard` (B3) makes it three. Update that section in the same commit, or the README is immediately wrong.

---

## Risks / unknowns (verify, don't assume)

1. **Dependency availability** (A2): `2.6.0` must actually resolve in this environment; if only a newer minor is mirrored, do not silently upgrade — Boot 3.3 ↔ springdoc 2.6.x is the aligned pair (A2).
2. **`authorizeHttpRequests` lambda shape** (C1): the current expression lambda must become a statement block; keep matcher order identical or `/api/shelters/mine` can lose its authenticated rule.
3. **Swagger UI under the security headers filter** (C4): asserted by the dev IT (H1) so a header/asset interaction is caught in tests, not in the browser.
4. **Snapshot stability** (G2/H2): absolute hosts, map ordering and generated timestamps make snapshots flaky; normalize all three or the gate will be disabled out of frustration.
5. **Prod-closure test boot** (H3): the test profile file (`src/test/resources/application.yml:8-13`) pins `test`, so the prod-profile IT must override profile + secret + PII keys explicitly; if the context cannot be booted under a non-dev profile in this harness, say so and mark H3 as a documented gap rather than deleting the intent.

---

## Explicitly out of scope

- No `springdoc-openapi-starter-actuator`, no actuator documentation.
- No documenting the `/dev/*` relays (D3/E).
- No code-generation clients from the document, no FE type generation from it (I2 is an assertion, not generation).
- No changes to `ProdJwtGuard`/`DevEndpointsGuard`/`Profiles` semantics; `ApiDocsGuard` is additive.
- No `@Schema` on `domain/*` or `persistence/*` (F7).
