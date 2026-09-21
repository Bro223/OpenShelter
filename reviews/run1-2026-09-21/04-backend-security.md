# OpenShelter — Backend Security Review (agent 4)

## Scope and method

- **Read-only.** No source file was modified; this report is the only file created.
- **Reviewed state:** the working tree at `HEAD` (`b4afb80d`) **plus the uncommitted lanes** that are
  present in the tree (`git status` = 41 modified files): the verification send-order change
  (`VerificationService`, `*SmsSender`/`*SmtpSender` boolean returns, `CodeSendFailedException`,
  `ThrottleAlertRecorder.codeSendFailure`), the column-only caller read
  (`ShelterQueryService.findById(long, Long)`, `UserRepository.existsById`), the removal of the
  legacy `PaasteametRegistryClient` with a fail-closed registry-client check, and docs.
- **Verification rule applied:** every claim below comes from reading the code (and, where cheap,
  from running the build). I did not take any statement from `README.md`, `docs/security/*` or
  `qa/security-checklist.md` on trust; where those documents disagree with the code, that
  disagreement is itself reported.
- **Build evidence:** `mvn -o test-compile` → exit 0 (main + test sources compile). Tests were not
  executed (the suite needs Testcontainers/Docker and belongs to agent 3); the one test I cite is
  cited for what it *asserts*, which I read directly.
- **Versions detected** (from `pom.xml` + `mvn -o dependency:list`, i.e. the resolved versions, not
  the declared ones): Java 21 (`pom.xml:21`), Maven via `spring-boot-starter-parent` 3.3.13
  (`pom.xml:10`), Spring Boot 3.3.13, Spring Framework 6.1.21, Spring Security 6.3.10, embedded
  Tomcat 10.1.42, Hibernate 6.5.3.Final, Jakarta Validation 3.0.2 / Hibernate Validator 8.0.2,
  Flyway 10.10.0, PostgreSQL JDBC 42.7.7, jjwt 0.12.7, jsoup 1.23.2, springdoc 2.6.0, Twilio SDK
  10.9.2, BouncyCastle 1.78.1, proj4j 1.3.0, spring-dotenv 4.0.0; tests: JUnit 5.10.5, Mockito
  5.11.0, AssertJ 3.25.3, Testcontainers 2.0.5. No Gradle; no Dockerfile. Generated/vendor folders
  (`target/`, `frontend/node_modules`, `.angular`) were ignored.

---

## Findings

### F1 — High — the public shelter detail read leaks the moderator's REJECT note (`reviewNote`) to anonymous callers

**Location**
- `src/main/java/ee/sheltermap/config/SecurityConfig.java:216` — `GET /api/shelters/**` is `permitAll`.
- `src/main/java/ee/sheltermap/api/ShelterController.java:233-234` — `get(@PathVariable long id)` delegates to
  `queryService.findById(id, callerIdOrNull())`, i.e. the caller may be `null` (anonymous).
- `src/main/java/ee/sheltermap/api/ShelterQueryService.java:429` (`toDto`, the projection shared by the
  **public list and detail** and by `findById`) sets the field unconditionally:
  **line 459 `shelter.getReviewNote(),`**. There is no caller/owner check anywhere on the path.
- `src/main/java/ee/sheltermap/api/AdminModerationService.java:366-369` — the note is written by the admin
  REJECT decision (`review_status = REJECTED`, `status = INACTIVE`, `reviewNote = reason`), reason ≤ 500 chars
  (`api/AdminShelterReviewRequest.java:17`).
- `src/main/java/ee/sheltermap/api/ShelterDto.java:129-131` documents this field as
  *"The admin's REJECT reason … **Owner-scoped on the public surfaces**"* — the code does not do that.
- The frontend contract says the same: `frontend/src/app/gateways/shelter-gateway.ts:74`
  *"only reviewNote + infoRequest are owner-scoped"* (`ShelterDetailDto` does not even declare the field —
  `frontend/src/app/core/models.ts:425-446`).
- Jackson default: no `@JsonInclude(NON_NULL)` and no `spring.jackson.default-property-inclusion` anywhere
  (`grep` over `src/main` + `application.yml`), so the field is serialized with its value.

**Why it matters.** A REJECTED row stays readable by id *by design* ("the detail stays readable by id like any
INACTIVE row", `ShelterController.java:210-213`) and ids are sequential `BIGSERIAL` values. Anyone can walk
`GET /api/shelters/{id}` unauthenticated and read the moderator's internal free-text reason — exactly the kind of
text that contains personal or operational detail about a submitter. It also breaks the documented API contract
(public DTO vs owner-only field), so the frontend types and the OpenAPI schema are wrong about a field that is
in fact public.

**Proof it is not covered by the suite.** `src/test/java/ee/sheltermap/api/CommunityReviewIT.java:315-331`
exercises exactly this case: the anonymous detail read (line 320, no `Authorization` header) asserts
`$.status == INACTIVE` and `$.reviewStatus == REJECTED` (lines 321-322), then `/mine` asserts
`$[0].reviewNote == "Pole varjend"` (line 330) — i.e. the note is on the row and is serialized. The only
`reviewNote` `doesNotExist()` assertions in the whole test tree are lines 174/194, on a **NEW** (never rejected)
row, so they cannot catch this.

**Minimal fix.** Gate the field on the caller in the shared projection, e.g. in
`ShelterQueryService.toDto(...)` pass `callerId` through and emit
`reviewNote` only when `callerId != null && callerId.equals(shelter.getCreatedBy())` (the admin projection
`toAdminDto` keeps returning it, and the existing `updatePlace`/owner path is unaffected), or add a
`withOwnerFields` flag to the `toDtos` overloads the way `withInfoRequests`/`withPulse` are already threaded.
Regression test: add `.andExpect(jsonPath("$.reviewNote").doesNotExist())` to the anonymous detail read at
`CommunityReviewIT.java:320` — it currently fails.

---

### F2 — Medium — `POST /dev/sms-test` now always answers `sent: true`: the change made the diagnostic blind to delivery failures

**Location.** `src/main/java/ee/sheltermap/api/SmsTestController.java:77-81`

```java
activeSmsSender.send(request.to(), request.message());          // returned boolean DISCARDED
return new SmsTestResult(provider, request.to(), toE164, true, null);   // hardcoded true
...
} catch (RuntimeException ex) { ... return new SmsTestResult(..., false, ex.getMessage()); }
```

**Cause (this is a regression introduced by the uncommitted change, not pre-existing).** The
`SmsSender.send` contract changed from *"throws on failure"* to *"returns `false` on failure, never throws"*
(`src/main/java/ee/sheltermap/verification/SmsSender.java:13-24`), and `TwilioSmsSender` now swallows every
failure into `return false` (`TwilioSmsSender.java:84-99`). `SmsTestController` was not updated, so the catch
block is unreachable for the production sender and `sent` is always `true`.

**Why it matters.** The endpoint's entire reason to exist is truthful delivery reporting — its sibling says so
explicitly: *"A test endpoint must NOT do that: `sent:false` + the relay error is exactly the diagnostic you
need"* (`api/EmailTestController.java:30-34`), and `EmailTestController` still gets it right because it calls
`mailSender.send(...)` directly (line 91). So `POST /dev/sms-test` now reports success when Twilio refused the
message, and the two "mirror" endpoints disagree. Severity is Medium rather than High because the surface is
feature-flagged off by default and additionally guarded (`app.dev-sms-test.enabled` + JWT + recipient allowlist +
`DevEndpointsGuard` refuses to boot outside dev/test), but the documented Twilio-channel verification workflow
is exactly what silently stops working.

**Proof.** `src/test/java/ee/sheltermap/api/SmsTestControllerIT.java:56-80` ("sendsTestSmsAndReportsTruthfully")
only exercises `DevSmsSender`, which returns `true` unconditionally — no test covers a `false` return, which is
why this passed review-by-test.

**Minimal fix.** `boolean sent = activeSmsSender.send(request.to(), request.message()); return new SmsTestResult(provider, request.to(), toE164, sent, sent ? null : "the sms channel did not accept the message");`
and add a test with a `SmsSender` returning `false`.

---

### F3 — Medium — the whole Spring stack is pinned to the OSS-EOL Spring Boot 3.3.x line, so transitive security fixes have stopped arriving

**Location / evidence.** `pom.xml:7-12` pins `spring-boot-starter-parent` **3.3.13**; nothing else pins the
Spring-managed artifacts, so `mvn -o dependency:list` shows the frozen set:
`tomcat-embed-core 10.1.42`, `spring-security-core/web/config/crypto 6.3.10`, `spring-web/webmvc 6.1.21`,
`jackson-databind/core 2.17.3`, `postgresql 42.7.7`, `commons-lang3 3.14.0`, `springdoc-openapi-* 2.6.0`.

Spring's own release note for 3.3.13 states it *"marks the end of open source support for Spring Boot 3.3.x"*
(OSS EOL 2025-06-30; the current machine date is 2026-09-20, ~15 months past EOL). The codebase's own comment
already treats this as frozen (`pom.xml:24-27`, springdoc 2.6.0 "do not bump without review", and
`pom.xml:46-48` "NO springdoc-openapi-starter-actuator"), which is correct for those two artifacts but is not a
security posture for the container/security/framework set.

Concrete fixes that exist upstream but cannot reach this build while the line stays pinned (I checked each
advisory; **reachability varies**, which is why this is a policy finding and not a proven exploit):

| Artifact (resolved) | Advisory | Fixed in | Reachability here |
| --- | --- | --- | --- |
| `tomcat-embed-core` 10.1.42 | CVE-2025-53506 (HTTP/2 uncontrolled resource consumption) | 10.1.43 | HTTP/2 is off in Boot by default (`server.http2.enabled` unset) |
| `tomcat-embed-core` 10.1.42 | CVE-2025-48989 ("made you reset", CWE-404) | 10.1.44 | as above |
| `org.postgresql:postgresql` 42.7.7 | CVE-2026-42198 (unbounded PBKDF2 iterations → CPU DoS during SCRAM), `>=42.2.0,<42.7.11` | 42.7.11 | needs a hostile DB server; the DB is operator-controlled |
| `org.postgresql:postgresql` 42.7.7 | CVE-2026-54291 (`channelBinding=require` silently downgraded), `>=42.7.4,<42.7.12` | 42.7.12 | needs `channelBinding=require` (not configured) + an intercepting MITM |
| `commons-lang3` 3.14.0 | CVE-2025-48924 (`ClassUtils.getClass` recursion → `StackOverflowError`), `<3.18.0` | 3.18.0 | needs attacker-controlled class names; none found on a user-input path |
| `jackson-databind` 2.17.3 | CVE-2026-54512 (`PolymorphicTypeValidator` bypass), `<=2.18.7` | 2.18.8 | needs default typing enabled; this app never enables it |
| `spring-security-*` 6.3.10 | 6.3 line EOL; e.g. CVE-2026-41003 (`RelyingPartyRegistration` HTML-form injection) affects `<=6.3.16` | 6.4.x/6.5.x | SAML is not used here — not reachable |

**Why it matters.** Outside dev/test the fail-closed boot guards are strong about *configuration*, but no guard
can compensate for a dependency line that no longer receives patches: every future fix in Tomcat, Spring
Security, Spring Framework, Jackson and the JDBC driver is unavailable by construction. The one artifact that
matters most for this app's threat model — **jsoup** (the sanitizer behind stored admin HTML) — is *not* affected:
1.23.2 is the current release and CVE-2026-71497 (`<=1.22.2`, fixed 1.23.1) additionally requires a custom
`Safelist` that permits raw-text elements, which `BodySanitizer`'s allowlist does not.

**Minimal fix.** Move to a supported Boot minor (3.5.x, or 4.0.x if the Framework-7 jump is acceptable) — the
Springdoc comment at `pom.xml:24-27` already flags the springdoc bump that comes with it. If the jump cannot
happen now, override just the reachable managed versions (`tomcat.version`, `postgresql.version`,
`commons-lang3.version`) as an interim measure, and record the decision.

---

### F4 — Low — the verification throttle is no longer atomic: the cooldown/daily cap can be amplified by a concurrent burst

**Location.** `src/main/java/ee/sheltermap/verification/VerificationService.java:112-125` (read-only decision from
`sendLog.lastSentAt` / `sendLog.countToday`), `:154` (`provider.request(user)` → the real send), `:169`
(`sendLog.record(...)` — only *after* a channel-accepted send). The previous implementation was one atomic
check-and-record: `VerificationSendLog.tryRecord` (`FileVerificationSendLog.java:90-101`,
`synchronized`, "Check + record under ONE lock hold … so a burst cannot pass both reads before either records").

**What changed in effect.** `N` concurrent `POST /verify/request` calls for the same (user, level) can now all
observe "no recent send" and all send. The amplification is **bounded** by the still-atomic per-contact limiter
(`:143` `contactLimiter.tryAcquire("verify:" + contact)`, 5 events / 24 h by default) and the cooldown loss is
bounded by that same budget — so this is a real but small weakening of an already-defence-in-depth control, and
the new ordering is deliberate and documented in the method javadoc (not burning a daily slot on a refused send
is a genuine improvement). Reported for completeness, not as a blocker.

**Secondary (maintainability, same location).** `VerificationSendLog.tryRecord` is now **production-dead** — the
only callers are tests (`grep -rn tryRecord src/main` → declaration + javadoc only). The throttle rule is
therefore duplicated in two places (service + log) that the service's own comment claims are identical; they can
drift silently, and a future reader may wrongly assume `tryRecord` still guards the flow.

**Minimal fix.** Extract the decision into one shared helper (or delete `tryRecord` and keep the read-only API),
and add a concurrency IT pinning the bounded-overcount behaviour explicitly, so the accepted trade-off is an
asserted contract rather than a comment.

---

### F5 — Low — contact-change codes are persisted BEFORE the send, so a refused send arms the cooldown with a code nobody received

**Location.** `src/main/java/ee/sheltermap/auth/ContactChangeService.java:104-107`
(`replacePending(...)` at 104, then `smsSender.send(...)` at 106 — same order at `:168-171` for the phone change)
and `enforceCooldown` at `:222-234`, which anchors the cooldown on the pending row's `createdAt`.

**Why it matters.** If the channel refuses (`SmtpSender`/`SmsSender` now return `false`, both callers discard it)
or the code cannot be delivered, the row already exists: the user receives nothing, cannot complete the change,
and is throttled for `cooldown-seconds` (default 60 s, `application.yml:119`) before they can try again. The
verification flow was just changed to the opposite order for exactly this reason
(`VerificationService.java:150-176`), and the interface javadoc now documents the asymmetry
(`SmsSender.java:13-24`). Additionally, unlike verification, a refused contact-change send records **no**
operator alert (`ThrottleAlertRecorder.codeSendFailure` is only called from `VerificationService.java:161`), so
a channel outage on this path is invisible to the admin ring. **I agree with the P3 item a prior lane flagged
in this same file** — see the cross-check section.

**Minimal fix.** Create+send then persist the pending row on acceptance (or roll the row back and clear the
cooldown anchor when the send returns `false`), and route the refusal into
`ThrottleAlertRecorder.codeSendFailure(contact, channel)`.

---

### F6 — Low — `/auth/refresh` and `/auth/logout` are unauthenticated and unthrottled

**Location.** `SecurityConfig.java:210-212` (`permitAll` for both), `AuthController.java:147-165` (neither calls
`requireRate`, unlike `/auth/login`, `/auth/register`, `/auth/password-reset/*`). Each request reaches the DB:
`JwtTokenService.refresh` does a `findByTokenHash` + a conditional `UPDATE`
(`TokenService`/`JwtTokenService.java:83-101`), and `revoke` issues an `UPDATE`
(`SpringDataRefreshTokenRepository.java:17-22`).

**Why it matters.** No bypass: refresh tokens are 64 characters from a 62-symbol alphabet drawn from a
`SecureRandom` (`JwtTokenService.java:24,64`; `Tokens.java:12-15`; `Codes.java:70-87`) and only their SHA-256 is
stored, so guessing is infeasible. What is missing is purely the abuse valve: these are the only two
unauthenticated, DB-touching endpoints in the app, and the per-IP throttling that covers every sibling auth
endpoint has no analogue here.

**Minimal fix.** Add a small per-IP `RateLimiter` bucket (the existing `TokenBucketRateLimiter` and
`ClientIps` are already wired) to both handlers, or state explicitly in the threat model that they are
deliberately unlimited.

---

### F7 — Low — bearer-token and PII responses carry no `Cache-Control: no-store`

**Location.** The only `Cache-Control` in `src/main` is the public media serve
(`api/MediaController.java:97`, `public, max-age=31536000, immutable`). Nothing sets `no-store` on
`POST /auth/login` and `POST /auth/refresh` (they return the access + refresh tokens in the body,
`auth/TokenResponse.java`) or on `GET /account/me`, `GET /account/export` (decrypted name/e-mail/phone +
every authored shelter, `auth/AccountService.java:112-134`). `SecurityHeadersFilter` sets
`X-Content-Type-Options`/`X-Frame-Options`/`Referrer-Policy`/CSP/HSTS but no cache header
(`config/SecurityHeadersFilter.java:47-55`), and `<oauth2>`-style session caches are not in play (stateless
JWT, no cookie is ever set — asserted by `config/SecurityHeadersIT.java:38-50`).

**Why it matters.** Standard hardening for credential/PII responses: without an explicit `no-store`, a browser
or intermediary is free to retain them on disk. Low severity (no shared cache is configured, and the API is
JSON behind a bearer header), but it is a one-line control that the `.env`/PII posture of this project would
normally include.

**Minimal fix.** Add `Cache-Control: no-store` for `/auth/**`, `/account/**` and `/verify/**` — e.g. one extra
branch in `SecurityHeadersFilter` — and assert it in `SecurityHeadersIT`.

---

### F8 — Low — the committed OpenAPI document publishes the full admin surface, which is what `ApiDocsGuard` exists to prevent

**Location.** `docs/api/openapi.json` contains 26 `/admin/*` paths out of 55 (verified by parsing the file:
`/admin/alerts`, `/admin/audit`, `/admin/guidance/**`, `/admin/media/**`, `/admin/shelters/**`, `/admin/site-texts`,
`/admin/users/**`). `config/ApiDocsGuard.java:236-248` refuses to boot outside dev/test when either springdoc flag
is enabled specifically because *"the API document is a complete map of the attack surface — the admin endpoints
and their payload shapes included"*, and `SecurityConfig.java:255-259` keeps the docs URLs behind
`authenticated()` for the same reason.

**Why it matters.** The controls are consistent with each other (no runtime exposure), and the admin endpoints
themselves are properly protected (F1 aside) — but the stated rationale is partially undone by a 271 KB file that
ships the same map to anyone who can read the repository (the project's own User-Agent advertises a public
GitHub URL, `ingestion/CsvRegistryClient.java:72-73`). This is an acknowledged-trade-off question rather than a
hole; I report it because the guard's justification is stronger than the actual exposure control.

**Minimal fix.** Either state the trade-off where the guard is justified (the file is the frontend contract; the
guard is about runtime serving only), or generate a public-subset document for the committed artifact.

---

### F9 — Low — `MarkdownToHtml` is production-dead but is the one main-package HTML producer that bypasses `BodySanitizer`

**Location.** `src/main/java/ee/sheltermap/guidance/MarkdownToHtml.java` is referenced **nowhere** in
`src/main/java` other than its own javadoc; its only callers are
`src/test/java/ee/sheltermap/guidance/MarkdownMigrationDriver.java:266,303` (a one-off migration tool). The
documented invariant is the opposite: `BodySanitizer` is *"The single producer of a guidance post's
`body_html`"* (`guidance/BodySanitizer.java:12-20`), enforced because `GuidanceService` runs
`BodySanitizer.sanitize` on create **and** update (`GuidanceService.java:~430`, `sanitize(body)` in both paths).

**Why it matters.** Not a live vulnerability — it is unreachable dead code. But it is an HTML-producing utility
sitting in the production source tree next to the sanitizer, and the next author who needs markdown will find it
first and call it *without* the sanitizer, which is precisely the stored-XSS path the sanitizer exists to
prevent (the admin body is rendered to anonymous readers on `/blog`, `api/GuidanceController.java:112-145`).

**Minimal fix.** Move the converter to `src/test/java` (it is only a migration helper) or delete it now that the
migration is done; optionally add the mirror of the existing `SourceVocabularyTest`-style architecture test that
asserts no production class calls `MarkdownToHtml`.

---

### F10 — Low — committed dev default for the database password, with no fail-closed guard (unlike every other dev default)

**Location.** `src/main/resources/application.yml:7-9`
(`url: ${DB_URL:jdbc:postgresql://localhost:5432/sheltermap}`, `username: ${DB_USERNAME:sheltermap}`,
`password: ${DB_PASSWORD:sheltermap}`), and `docker-compose.yml:8-11` uses the same published values.

**Why it matters.** This project's established posture is that a *published* dev default must fail the boot
outside dev/test when the operator forgets the env var: `ProdJwtGuard` refuses to start if `app.jwt.secret` is
still the published dev value or shorter than 32 bytes (`config/ProdJwtGuard.java:56-70`), and `DevSenderGuard`
/ `DevEndpointsGuard` / `ApiDocsGuard` do the same for the dev senders and dev surfaces. The datasource
credentials are the one sensitive pair left without that treatment, so a deploy that forgets `DB_PASSWORD`
silently authenticates with a value that is in the public repository (and silently talks to
`localhost:5432`). `docs/security/operations.md:61` documents the *requirement* but nothing enforces it.
Low severity: a real deployment's database would have to actually accept those credentials.

**Minimal fix.** Extend the same profile-keyed guard (a `DataSourceCredentialGuard` in `config/`, using
`Profiles.isDevTestOnly`) to refuse the boot outside dev/test while `app.datasource`/`DB_PASSWORD` is still the
published default or blank.

---

## Areas found clean (checked, no issue)

Each of these was read in the source, not taken from the checklist:

1. **SQL / JPQL injection — clean.** Every `@Query` uses bound named parameters
   (`SpringDataUserRepository.java:37`, `SpringDataRefreshTokenRepository.java:17,21`,
   `SpringDataPasswordResetTokenRepository.java:21,26`, `SpringDataPendingContactChangeRepository.java:31`,
   `SpringDataShelterReportRepository.java:19-35`, `SpringDataModerationActionRepository.java:21-31`,
   `SpringDataVerificationClaimRepository.java:31`, `SpringDataGuidanceTranslationRepository.java:55`,
   `SpringDataShelterRepository.java:60`). The only two `nativeQuery = true` statements are static SQL with no
   parameters. No string-concatenated query, `EntityManager` escape hatch or `CriteriaBuilder` with raw input
   exists in `src/main`.
2. **Mass assignment — clean, and structurally impossible.** No controller binds an entity: all 33
   `@RequestBody` parameters are request records in `api`/`auth`, and the domain objects are constructed
   field-by-field from validated request fields (e.g. `ShelterController.java:246-266` and `:409-441`).
   Server-owned state (`status`, `source`, `reviewStatus`, `createdBy`, `createdAt`, `autoHideDisarmed`,
   `inaccurateMarked*`) is copied from the loaded row or overwritten by the service
   (`ShelterService.updatePlace`, `ShelterService.java:287-297`). `UserKind` has no client-settable path
   (`UserMapper.kindOf` keys off the class, `persistence/UserMapper.java:108-120`; `AdminUser` is only built by
   `AdminSeeder`).
3. **Validation coverage — clean.** All 33 `@RequestBody` sites are `@Valid` except
   `AdminSiteTextController.java:68`, whose `UpdateSiteTextRequest` deliberately carries no constraints and is
   fully validated in `SiteTextsService.update` (key allowlist, locale, `VALUE_MAX`, https-only link URLs). Field
   bounds mirror the DB columns (`RegisterRequest`, `CreateShelterRequest`/`UpdateShelterRequest`,
   `InfoRequestReplyRequest`, the guidance records), the Estonia bbox is re-checked server-side
   (`ShelterController.requireInsideEstonia`), the optional viewport rejects partial boxes and `NaN`
   (`ShelterController.requireBbox`), and `limit`/`offset` are bounded before use.
4. **Authorization coverage per endpoint — clean apart from F1.** I enumerated all 15 controllers and their
   mappings: every `/admin/**` handler calls the fresh per-request `requireAdmin()` (15/15 in `AdminController`,
   13/13 in `AdminGuidanceController`, 3/3 in `AdminMediaController`, plus `AdminSiteTextController`), the
   chain-level `.hasAuthority("ADMIN")` (`SecurityConfig.java:243`) is additive rather than the only check, and
   the authority comes from a column read per request, never a token claim
   (`config/JwtAuthenticationFilter.java:76-86`). The authenticated `/api/shelters/mine` matcher precedes the
   public `/api/shelters/**` matcher (`SecurityConfig.java:215-216`), so no ordering hole exists. Author-scoped
   shelter mutations require `source == USER` **and** `createdBy == caller` (404 vs 403 vocabulary,
   `ShelterController.requireOwnedShelter`), verification/report/occupancy gates re-check `canWrite()` and the
   request carries no contact, and `/account/**` resolves the user from the token only. I found no IDOR path.
5. **Authentication, JWT and session handling — clean.** HS256 with a ≥32-byte `SecretKey` built at
   construction (`JwtTokenService.java:44`), the published dev secret refused at boot outside dev/test
   (`ProdJwtGuard`), `sub = userId` with no role claim, `exp` enforced by jjwt's own validation.
   Invalid/expired tokens leave the request unauthenticated and the entry point answers 401; a **suspended**
   account's in-flight tokens die on the next request, and a **demoted admin** loses `/admin/**` on the next
   request (fresh `isSuspended`/`isAdmin` column reads, `JwtAuthenticationFilter.java:70-86`) — no revocation
   window. Login has the dummy-hash timing equalizer *and* the post-verify existence guard
   (`AuthService.login`), so neither latency nor the `"dummy"` password enumerates accounts. Refresh tokens
   rotate atomically through a conditional `UPDATE` that claims the row (`JwtTokenService.refresh`), and a
   successful password reset revokes every refresh token of the user.
6. **Password hashing and one-time codes — clean.** Argon2id via
   `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()` (`SecurityConfig.passwordEncoder`), BouncyCastle
   present for it. All codes/tokens come from `SecureRandom` (`Codes`, providers), are stored **hashed**
   (`Hashes.sha256Hex`, `PendingVerification.sha256`) and compared with `MessageDigest.isEqual`
   (constant-time) — three copies of the helper, but all correct. Failed-attempt lockouts are persisted
   correctly (the reset/contact-change confirm paths deliberately *return* the failure so the
   failed-attempt increment commits instead of rolling back — `PasswordResetService.reset`,
   `ContactChangeService.confirmEmailChange`), single-use, with TTLs (5 min SMS / 15 min e-mail / 15 min reset).
7. **CSRF — correctly disabled, on evidence.** `csrf.disable()` (`SecurityConfig.java:200`) is only sound
   because auth is a Bearer header with `SessionCreationPolicy.STATELESS` and the app never sets a cookie;
   `SecurityHeadersIT.java:38-65` asserts `Set-Cookie` is absent on the auth surface, so the justification holds
   as written in `docs/security/threat-model.md`.
8. **CORS — clean.** Explicit origins from `app.cors.allowed-origins` (defaults are the two local dev origins,
   no `*`), explicit methods, and `allowCredentials(true)` is safe *because* the origin list is explicit
   (`SecurityConfig.corsConfigurationSource`).
9. **Secrets and configuration hygiene — clean apart from F10.** Every credential is an env placeholder
   (SMTP, Twilio, PII keys, admin, JWT, DB); **no `.env` was ever tracked by git** (`git log --all --diff-filter=A`
   finds none; `.gitignore:54-55` covers it), no Dockerfile exists, and the four boot guards
   (`ProdJwtGuard`, `DevEndpointsGuard`, `DevSenderGuard`, `ApiDocsGuard`) all key off the *resolved* profile set
   with the correct "the whole set must be dev/test" rule (`config/Profiles.java:396-408` — a blank or mixed set
   arms the guard) and fail closed with a loud message.
10. **Logging — clean.** 38 log statements in `src/main`; none logs a request body, password, token, OTP or
    reset code. The real senders mask the recipient (`SmtpPulseSmtpSender.maskEmail`,
    `TwilioSmsSender.maskPhone`) and log only message length; the plaintext code appears only in the dev
    senders, which `DevSenderGuard` makes unbootable outside dev/test. `DevSmsSender`/`DevSmtpSender` are the
    documented dev exception. The file-backed send log deliberately stores **no** contact
    (`FileVerificationSendLog.java:80-87`, and legacy 4-field lines ignore the contact column at `:169-177`).
11. **Error responses — clean.** One `@RestControllerAdvice` maps every failure to the same `ErrorResponse`
    shape; no stack trace, SQL or schema detail is echoed (`DataIntegrityViolationException` →
    field-neutral 400 with the detail only in the server log, `ApiErrorHandler.java:326-329`), and the JWT
    exception deliberately wraps its cause without exposing it (`InvalidAccessTokenException.java:6-8`).
12. **Actuator / exposed surface — clean apart from F8.** `management.endpoints.web.exposure.include:
    health,info` with `show-details: when-authorized` and no `info` contributor
    (`application.yml:63-77`); springdoc is off by default, dev-gated at the chain level, and refused at boot
    outside dev/test; the `/dev/*` relays are feature-flagged, JWT-gated, allowlist-gated and boot-refused
    outside dev/test.
13. **File uploads and public media serving — clean.** Byte cap on the *received* bytes before anything touches
    disk, magic-byte sniffing (JPEG/PNG/WebP only — SVG included in the refusals), declared-type
    cross-check, server-generated 32-hex names with the client filename kept as display metadata only
    (`MediaService.upload`), and `MediaStorage.resolve`: no separator / NUL / `.`/`..`, plus the normalized
    parent-equality check (`MediaStorage.java:129-142`). The public serve endpoint additionally enforces
    `^[a-f0-9]{32}\.(jpg|png|webp)$` and takes `Content-Type` from the stored (sniffed) value
    (`api/MediaController.java:63,91-99`). No traversal, no stored-script-as-image path found.
14. **Stored-XSS in admin-authored guidance — clean.** `BodySanitizer` is a jsoup `Safelist` allowlist
    (`h2 h3 p br strong em ul ol li a blockquote`, only `a[href]`, only `http|https|mailto`) applied on both
    create and update paths, so the stored value is sanitizer output and every reader gets the same safe HTML.
    The library choice is also sound: jsoup 1.23.2 is current and the recent sanitizer CVE (CVE-2026-71497)
    requires a Safelist permitting raw-text elements, which this allowlist does not include.
15. **Outbound fetch (SSRF) — confirmed clean** (see the cross-check section for the accepted residual).
16. **No debug leftovers.** No `System.out`/`System.err`/`printStackTrace` in `src/main`.

---

## Cross-check against the earlier security pass

The brief said a prior pass covered SSRF on the two outbound fetch paths, PII crypto, the fail-closed boot
guards and the rate-limit design. Independent verification:

- **SSRF / hero image import — I confirm the controls, and I confirm the *correction* that landed in
  `docs/security/threat-model.md` (uncommitted diff).** `HeroAddressPolicy` classifies every resolved address
  (loopback, unspecified, link-local incl. `169.254.169.254`, RFC 1918, multicast, `fc00::/7` incl.
  `fd00:ec2::254`, and IPv4-mapped addresses unwrapped and re-classified), `HeroImageImportService` re-validates
  scheme/credentials/**address** on every redirect hop (3-hop cap, wall-clock budget), the client never
  auto-follows redirects and enforces the size cap *while reading* plus a stall watchdog with no whole-exchange
  timeout, and the stored name/type are server-generated/sniffed. The old threat-model text claimed the JDK
  client connects to the policy's resolved address — **it does not** (`JdkHeroImageFetchClient.fetch` passes the
  URI to `HttpClient`, which resolves the hostname again), so the resolve→connect TOCTOU is real and is now
  documented as an accepted, bounded residual (admin-only surface, capped read, sniffed content, no public
  entry point). **I agree with that correction and with the acceptance**; I do not re-report it as a finding, and
  I add only that the same argument is what makes F9 (`MarkdownToHtml`) worth removing rather than documenting.
- **Geo short-link resolver — confirm clean.** The entry host is pinned to `maps.app.goo.gl` with the default
  port, `http`→`https` normalization drops any pasted credentials, hops are limited to the Google host set with
  no scheme change, and the walk is budgeted — no SSRF path found.
- **PII crypto — confirm clean.** AES-256-GCM with a random 12-byte nonce per value and a `v1:` slot tag;
  `decrypt` fails closed on a non-envelope/plaintext/foreign version rather than passing it through; the blind
  index is HMAC-SHA256 over a domain-separated canonical value (so uniqueness and login lookups survive without
  plaintext, and a DB dump alone cannot be reversed); keys are validated at construction (boot failure on
  missing/malformed/wrong-size). Two details worth naming for agent 12 because they touch the "PII at rest"
  claim: the admin **alert ring** holds the normalized contact in plaintext in process memory and serves it via
  `GET /admin/alerts` (`AdminAlertDto.subject`, `ThrottleAlertRecorder.otpContactCap`/`codeSendFailure`) — admin-only
  and memory-only, so I accept it; and the alert's `code-send-failure` kind is new in this tree with, per the
  prior lane's hand-off, no frontend label yet (a frontend/integration loose end, not a backend finding).
- **Fail-closed boot guards — confirm clean**, including the subtlety that they read the *resolved* profile set
  (`Profiles.isDevTestOnly` rejects blank and mixed sets) rather than the raw property string. `LoopbackXffTrustGuard`
  is a warning, not a refusal, and its warning is accurate: with the loopback XFF trust default on a non-dev
  profile, a client that can reach the app's loopback interface can pick its own rate-limit bucket
  (`ClientIps.resolve` trusts `X-Forwarded-For` only from a trusted peer, but `trust-loopback: true` makes
  loopback a trusted peer). That is documented in the guard message and in the code; I confirm it as an
  operational decision, not a defect.
- **Rate-limit design — I partially contradict the prior pass's premise.** The design (per-contact rolling cap,
  per-(user, level) durable daily cap, per-IP buckets, alert ring) is sound and well-argued, but the
  **uncommitted change removed the atomicity** the argument rested on: `VerificationSendLog.tryRecord` was a
  single `synchronized` check-and-record, and `VerificationService` now performs a read-only check, sends, then
  records (F4). The per-contact limiter still bounds the loss, so I rate it Low — but the "exactly one send per
  cooldown window" property that the old code provided no longer holds, and the prior conclusion should be
  updated rather than repeated.
- **Agreement with the prior lane on `ContactChangeService`.** Independent of that hand-off I found the same
  persist-before-send family issue (F5); I confirm it and add the missing operator alert as part of the fix.

---

## Top 5 findings

1. **F1 (High) — `GET /api/shelters/{id}` leaks the moderator's REJECT note to anonymous callers.**
   `ShelterQueryService.java:459` in the shared public projection, reachable through
   `SecurityConfig.java:216` + `ShelterController.java:233`; contradicts `ShelterDto.java:129-131` and the
   frontend contract; uncaught by `CommunityReviewIT.java:315-331`. Fix: emit `reviewNote` only for the owner
   (and the admin projection), add the missing assertion.
2. **F2 (Medium) — `POST /dev/sms-test` reports `sent: true` even when the channel refused**, because
   `SmsTestController.java:77-78` discards the new boolean from `SmsSender.send`. The endpoint's whole purpose
   (truthful delivery reporting) is defeated by the uncommitted interface change; `EmailTestController` still
   behaves correctly, so the two mirrors now disagree.
3. **F3 (Medium) — dependencies are frozen on the OSS-EOL Spring Boot 3.3.13 line** (`pom.xml:10`), so the
   managed Tomcat 10.1.42 / Spring Security 6.3.10 / Spring Framework 6.1.21 / postgresql 42.7.7 /
   commons-lang3 3.14.0 / Jackson 2.17.3 set can no longer receive patches (Tomcat CVE-2025-53506 and
   CVE-2025-48989, pgjdbc CVE-2026-42198 and CVE-2026-54291, commons-lang3 CVE-2025-48924 are fixed upstream but
   unreachable here). Reachability of each individual CVE is limited — the finding is the pinning, not an
   exploit.
4. **F4 (Low) — the verification throttle lost its atomicity** (`VerificationService.java:112-125` + `:154` +
   `:169` replaced the single `synchronized` check-and-record of `FileVerificationSendLog.java:90`): a concurrent
   burst can send up to the per-contact cap inside one cooldown window and overcount the daily cap by the
   in-flight window. Bounded by the atomic per-contact limiter and documented; also leaves the now-dead,
   duplicated `tryRecord` rule in the tree as a drift hazard.
5. **F5 (Low) — contact-change codes are persisted before the send** (`ContactChangeService.java:104-107`,
   `:168-171`), so a refused delivery arms the cooldown with a code the user never got, and — unlike the
   verification path — records no operator alert. Same "persist before send" family as the issue a prior lane
   flagged in this file; confirmed here with the cooldown anchor (`:222-234`) as the impact path.

**Merge verdict: OK with notes.** No Critical issue, one High (F1) that is a small, local fix with an existing
test to extend, and no Finding that argues against shipping the uncommitted change — F2 and F4 are consequences
of that change and should be fixed *with* it (the `SmsTestController` one-liner and a shared throttle decision),
while F1/F3/F5–F10 are pre-existing or policy items. The backend's security engineering is otherwise unusually
strong for this size: authorization is per-request and DB-backed, the crypto and outbound-fetch boundaries are
explicit and tested, and secrets/hardening defaults fail closed.
