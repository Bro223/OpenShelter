# OpenShelter — Backend Security Review (agent 4, sweep 2)

## Scope, method and evidence

- **Read-only.** No source file was modified, deleted or reformatted; this report is the only file created.
- **Tree state:** `HEAD` = `d247007` plus 26 uncommitted entries. Backend-relevant in-flight work (the
  admin list lane): `api/AdminController.java` (list gains `limit`/`offset` + `X-Total-Count`, `source`
  retyped `ShelterSource` → `ShelterSourceFilter`), `api/AdminModerationService.java`,
  `api/ShelterQueryService.java` (`findAllForAdmin` takes the filter enum), plus a new untracked
  `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPagingIT.java`. Frontend/i18n/openapi edits are
  outside my area. Everything below was read in the working tree as it stands.
- **Live, read-only probes against the running instance** (`:8080`, profile `dev` — `/v3/api-docs` answers
  200 because the dev `.env` enables springdoc, which `ApiDocsGuard` permits only on dev/test). No state
  was written: GET/HEAD/OPTIONS only, no login, no POST that creates data. The dev Postgres was queried
  `SELECT`-only to look for a REJECTED row (there are none: `count(*) where review_note is not null` = 0,
  `count(*) where review_status = 'REJECTED'` = 0 — so the `reviewNote` gate is verified by code, not live).
- **Versions detected from `pom.xml`, then resolved** (offline `maven-dependency-plugin:3.7.0:list`, i.e.
  the actual resolved set, not the declared one): Java 21, `spring-boot-starter-parent` **3.5.16** →
  Spring Framework **6.2.19**, Spring Security **6.5.11**, embedded Tomcat **10.1.55**, Hibernate
  **6.6.53.Final**, Hibernate Validator 8.0.3, Jackson **2.21.4**, PostgreSQL JDBC **42.7.11**,
  Flyway **11.7.2**, Logback 1.5.34, snakeyaml 2.4, commons-lang3 **3.17.0**, jsoup **1.23.2**,
  jjwt **0.12.7**, springdoc **2.8.17**, BouncyCastle **1.78.1**, Twilio **10.9.2**,
  spring-dotenv **4.0.0** (+ its transitives, incl. `httpclient 4.5.13`, `commons-io 2.14.0`,
  `gson 2.13.2`, `auth0 java-jwt 4.4.0`); tests JUnit 5 / Mockito / AssertJ / Testcontainers 2.0.5.
  Generated/vendor folders (`target/`, `node_modules/`, `.angular/`, `dist/`) ignored.
- I did not take any claim from `README.md`, `docs/security/*` or `qa/security-checklist.md` on trust;
  where a document disagrees with the code, the disagreement is reported (F2, F3).

---

## Confirmations, corrections and contradictions of the earlier sweeps

Each claim was re-checked in the current tree; I report only what the evidence supports.

**C1 — the leaked moderator `reviewNote` (sweep 1) is fixed, and the gate holds in every projection.**
`ShelterQueryService.java:464-466` emits the note only when
`ownSurface || (callerId != null && callerId.equals(createdById))`. The three reachable paths are all
correct: the public list passes `null` (`:174 toDtos(shelters, null)`), the public/owner detail read passes
only the caller id (`:229`; `ShelterController.java:232` supplies it via `callerIdOrNull()`), the `/mine`
list passes `ownSurface = true` (`:239`, every row is the caller's own), and the admin projection keeps it
deliberately (`:557`, admin-only DTO). The list cannot leak it at all (`infoRequestRows`/`withInfoRequests`
are also empty there). No other projection of `Shelter.getReviewNote()` exists in `src/main`
(`grep -rn getReviewNote src/main` → the three sites above).

**C2 — `POST /dev/sms-test` now reports the truth (run-1 F2 fixed).**
`api/SmsTestController.java:79-86` propagates `activeSmsSender.send(...)`'s boolean and returns
`sent:false` with a reason; the catch block remains for a throwing sender. The interface contract
(`verification/SmsSender.java:13-24`) matches.

**C3 — run-1 F3 (an OSS-EOL Spring Boot 3.3.x line) no longer applies.** `pom.xml:10` pins **3.5.16**, a
supported line, and the previously unreachable fixes are now in the build: pgjdbc **42.7.11** is exactly
the fix release for CVE-2026-42198 (unbounded PBKDF2 in SCRAM), and Spring Security **6.5.11** is above
the 6.5.9 ceiling of CVE-2026-22751 (authorization bypass). The residual is F4 below.

**C4 — run-1 F7 ("bearer-token and PII responses carry no `Cache-Control: no-store`") is wrong, and I
contradict it with a live probe.** Spring Security's default header writer already emits
`Cache-Control: no-cache, no-store, max-age=0, must-revalidate`, `Pragma: no-cache`, `Expires: 0` on every
response that passes the chain. Measured on the running instance:

```text
GET /api/shelters/1   200  Cache-Control: no-cache, no-store, max-age=0, must-revalidate / Pragma: no-cache / Expires: 0
GET /admin/shelters   401  Cache-Control: no-cache, no-store, max-age=0, must-revalidate / Pragma: no-cache / Expires: 0
GET /actuator/health  200  same
GET /api/media/<valid>.jpg 200  Cache-Control: max-age=31536000, public, immutable   (no no-store)
```

`SecurityConfig.java` never customizes `.headers(...)`, so the default writer is on for `/auth/**`,
`/account/**` and `/verify/**` too, i.e. the token-returning and PII-returning endpoints already carry
`no-store`. The single response that is deliberately *not* `no-store` is the public hero image
(`MediaController.java:97`), where the controller's own `ResponseEntity` header replaces the writer's —
the intended immutable cache. **No action needed; the finding should be dropped from the merged list.**

**C5 — run-1 F5 (contact-change code persisted *before* the send) is fixed.** The send now precedes the
pending-row write: `auth/ContactChangeService.java:154-171` (e-mail) and `:236-250` (phone) send first and
`return` on a refused send without writing the row, so a refused delivery neither arms the cooldown (the
row *is* the anchor, `enforceCooldown`) nor persists a code nobody received. **Still open from that
finding:** a refused contact-change send (and a refused password-reset send,
`auth/PasswordResetService.java:192`) is only logged — unlike verification, which records
`alerts.codeSendFailure(...)` (`verification/VerificationService.java:171`). A channel outage on those two
paths is invisible to `GET /admin/alerts`. That is operator visibility, not a vulnerability — noted, not
scored as a finding.

**C6 — the earlier disagreement about the rate-limit property: the current code supports agent 4's
position (the old atomic check-and-record is off the production path).** Evidence, current tree:
`verification/VerificationService.java:121` reads `sendLog.lastSentAt(...)` (and `countToday`), `:163` sends,
`:178` records — three steps with no lock across them; `FileVerificationSendLog.java:90`
(`public synchronized SendDecision tryRecord(...)`) has **no production caller**: `grep -rn tryRecord
src/main` returns the interface declaration (`VerificationSendLog.java:52`), this implementation, and one
comment. The only callers are tests (`VerificationServiceTest.java:328-345`,
`FileVerificationSendLogTest.java:147` and the 50-thread test the other sweep praised). So the property
"exactly one send per cooldown window" is no longer enforced by the send log on the shipped path; the
burst bound that remains is the atomic `RollingContactOtpLimiter` acquire at
`VerificationService.java:143`. Both sweeps were describing different objects (test quality vs production
call graph) — agent 4's reading is the one that matches the code, so `FileVerificationSendLogTest`'s
concurrency test now gives false confidence about production.

**C7 — SSRF, geo resolver, PII crypto, boot guards, CSRF, CORS, SQL, media HEAD: confirmed clean**, see
the clean-areas section; I re-read each rather than trusting the prior reports. Two refinements: (a) the
HEAD permission the previous fix added exists **only** for `/api/media/**` (see F10); (b) the
resolve→connect DNS-rebinding TOCTOU on the hero import is real and correctly documented as an accepted
residual (`docs/security/threat-model.md:448-463`) — I confirm both the residual and the acceptance.

---

## Findings

### F1 — Low — one-time codes are protected at rest by an *unkeyed* single-round SHA-256, which a 6-digit space makes decorative

**Location.** `auth/PasswordResetService.java:199` and `:278` (`Hashes.sha256Hex(code)`),
`auth/ContactChangeService.java:169`, `:248`, `:350`, `verification/PhoneVerificationProvider.java:51-62`
(6-digit OTP) and `:78` (`CodeHashes.sha256Hex(code)`), the shared primitive
`verification/CodeHashes.java:33-41`. The code space is 10⁶ by construction
(`auth/Codes.java:26-28 sixDigitCode()`, `PhoneVerificationProvider.OTP_DIGITS = 6`).
`docs/security/threat-model.md:164` presents "the 6-digit reset code is stored SHA-256-hashed" as the
mitigation.

**What is wrong.** The stored value (`password_reset_tokens.token_hash`, `pending_contact_changes.code_hash`,
`pending_verifications.code_hash`) is an unsalted, unkeyed, single-round SHA-256 of a 6-digit secret. An
attacker who obtains the table — a dump, a backup, a read-only replica credential, a stray `SELECT` —
enumerates all 10⁶ candidates in well under a second per row and recovers the live code, exactly the
offline case the rest of the "PII at rest" design is built to defeat. The project's own boundary for the
*neighbouring* secret is stronger: contacts are AES-256-GCM under an env-only key with a **keyed**,
domain-separated HMAC blind index (`security/PiiCrypto.java:52-80, 126-140`, keys validated and fail-closed
in `security/PiiKeys.java:44-62`), and `pending_contact_changes.target` / `pending_verifications.contact`
are encrypted — yet the codes that unlock the same accounts are not. Impact path: recover a live
`password_reset_tokens` row (15-min TTL) and POST `/auth/password-reset/confirm` with the victim's e-mail
and the recovered code → password replacement → full account takeover; or recover a
`pending_contact_changes` code (default TTL 900 s) → change the account's e-mail/phone. The confirm
endpoints' own defences (5-attempt lockout `CodePolicy.MAX_ATTEMPTS`, single-use, per-(IP,e-mail) bucket)
are *online* controls and do not apply to an offline attacker. Why not higher than Low: the dump alone does
not link e-mail → `user_id` (both are encrypted/blind-indexed), so a *targeted* takeover also needs the
victim's id-name link (plaintext `users.name`/shelters make that linkable) and the attacker must act inside
the token TTL. Why not lower: it silently voids the project's own stated at-rest guarantee for a
credential-bearing table, and the fix uses a primitive the codebase already has.

**Suggested fix.** Store `HMAC-SHA256(PII_HMAC_KEY, "reset-code:" + code)` — i.e. the exact
`PiiCrypto.blindIndex(domain, value)` primitive already in the tree — instead of the unkeyed digest; add a
`v2:` slot tag (the `PiiCrypto` envelope's own idiom, `:36`) so the old rows stay readable, and keep
`constantTimeEquals`. Argon2 is also already a dependency if a slow KDF is preferred. A `PiiAtRestIT` case
asserting that a dumped `code_hash` does not equal `sha256Hex(code)` would pin it.

### F2 — Low — HSTS is never sent in the deployment shape the ops doc describes (TLS terminated at the edge)

**Location.** `config/SecurityHeadersFilter.java:47-49` — `if (request.isSecure())` sets
`Strict-Transport-Security`. Nothing configures forward-header handling: `grep -rn -i forward-headers
--include='*.yml' --include='*.properties' --include='*.env' --include='Dockerfile*' .` finds nothing (the
only hit is the unrelated `trusted-proxies` comment), and there is no `server.forward-headers-strategy`,
no `server.tomcat.remoteip.*` and no `WebServerFactoryCustomizer`/valve anywhere in `src/main`. Live probe
on the running instance: `GET /actuator/health -H 'X-Forwarded-Proto: https'` returns the four always-on
headers and **no** `Strict-Transport-Security` (and none without the header either), i.e.
`request.isSecure()` stays false for a proxy-terminated request.

**Why it matters.** `docs/security/operations.md:101-103` states: *"Terminate TLS in front of the app; the
app sends `Strict-Transport-Security` only on secure requests (`SecurityHeadersFilter`), so HSTS is live
exactly when the edge is."* With the documented shape (edge terminates TLS, forwards plain HTTP to the
app), the app never sees a secure request, so HSTS is never emitted and the header is *not* live — the
stated hardening silently does not apply. `SecurityHeadersIT.java:75-83` cannot catch it: it pins the code
path with `request.setScheme("https")` on MockMvc, not the proxy behaviour. Severity is Low (HSTS is
browser-side defence-in-depth; nothing else depends on it), but it is a documented control that is off in
production.

**Suggested fix.** Either emit HSTS when a *trusted* peer sent `X-Forwarded-Proto: https` — reusing the
trust decision that already exists (`auth/ClientIps.java:52-61`, `app.ratelimit.trusted-proxies` /
`trust-loopback`) — or add the header at the edge and correct `operations.md`. **Do not** simply set
`server.forward-headers-strategy: framework`: that filter trusts every client's `X-Forwarded-*` and would
rewrite `getRemoteAddr()`, defeating `ClientIps`' spoofing protection (the per-IP buckets) at the same time.

### F3 — Low — the guidance body has no length bound although the code and the error vocabulary promise one

**Location.** `api/CreateGuidancePostRequest.java:29` and `api/UpdateGuidancePostRequest.java:24`
(`@NotBlank String body`, no `@Size`), `api/CreateGuidanceTranslationRequest.java:21` /
`UpdateGuidanceTranslationRequest.java:17` (same), `guidance/GuidanceService.java:982-987`
(`sanitize()` rejects null/blank only), the column is `body_html TEXT NOT NULL`
(`db/migration/V23__crisis_guidance.sql`). The declared contract says otherwise:
`GuidanceService`'s own javadoc (`:426`, `:1139`) and `api/ApiErrorHandler.java:150-154` describe a
400 for a *"missing/oversized title or body"*.

**Why it matters.** An admin (or a stolen admin token) can store a body of arbitrary size — the request
is `application/json`, so neither `spring.servlet.multipart.max-request-size: 6MB` nor Tomcat's form-post
limit applies. The body is then rendered on the public `/blog` page, so the cost lands on anonymous
readers and on DB size/backup, and the documented 400 does not exist. Low because the surface is
ADMIN-only; reported because validation gaps are exactly what a review should not leave as "documented".

**Suggested fix.** Add `MAX_BODY_LENGTH` to `GuidanceService` (mirroring `MAX_TITLE_LENGTH`, `:114`) and
check it in `sanitize()`, with a matching `@Size(max = …)` on all four request records so the 400 arrives
from bean validation as well.

### F4 — Low — three artifacts are one patch behind on reachable-by-configuration-only advisories (Tomcat, Jackson, BouncyCastle)

**Location and evidence (resolved versions, `pom.xml:10` = Boot 3.5.16).**

| Artifact (resolved) | Advisory | Fixed in | Reachability in this app |
| --- | --- | --- | --- |
| `tomcat-embed-core` **10.1.55** | CVE-2026-55956 — default-servlet security constraints ignore method/method omission | 10.1.56 | No security constraints are declared (Spring Security is programmatic); no `server.tomcat.*` config, no `WebServerFactoryCustomizer`, no valve in `src/main` |
| `tomcat-embed-core` 10.1.55 | CVE-2026-55955 — replay against the cluster `EncryptionInterceptor` | 10.1.56 | No Tomcat cluster is configured |
| `tomcat-embed-core` 10.1.55 | CVE-2026-59083 — RewriteValve hex-encoding security-constraint bypass | 10.1.57 | No `RewriteValve` / rewrite config anywhere in the repo |
| `jackson-databind` **2.21.4** | CVE-2026-59889 — `@JsonView` bypass for `@JsonUnwrapped` properties | 2.21.5 | `grep -rn 'JsonView\|JsonUnwrapped\|JsonTypeInfo\|activateDefaultTyping' src/` → no hits |
| `bcprov-jdk18on` **1.78.1** (`pom.xml:104`) | e.g. CVE-2026-12185 (BKS/UBER keystore length handling < 1.85), CVE-2026-59638 (JSSE hostname verification < 1.85) | 1.85+ | No BC JCE provider is ever registered (`grep -rn addProvider src/main` → none); BC is used only as a library by Spring Security's `Argon2PasswordEncoder` (`SecurityConfig.java:64`) |

**Why it matters.** None of these is exploitable as the code stands (I checked each reachability column
in the tree rather than assuming), so this is hygiene, not a hole — but the app's only evidence that they
stay unreachable is a human reading the config, and a future `RewriteValve`, cluster or `@JsonView` would
silently arm a known CVE. BouncyCastle is the one *directly pinned* dependency (1.78.1 is several releases
behind the current line).

**Suggested fix.** Override the two managed versions as properties — `<tomcat.version>10.1.57</tomcat.version>`
and `<jackson-bom.version>2.21.5</jackson-bom.version>` — and bump `bcprov-jdk18on` to the current 1.85+
line; then add a dependency-vulnerability gate (OWASP dependency-check or a Dependabot/Renovate rule) to CI
so this class of finding does not depend on a manual sweep. Related positive note: `jsoup 1.23.2` is above
the CVE-2026-71497 fix (1.23.1), and that advisory additionally requires a Safelist permitting raw-text
elements, which `BodySanitizer`'s allowlist does not include.

### F5 — Low — the verification throttle's atomicity is gone and the old atomic helper is production-dead

Covered as C6 above; listed here so it survives into the merged list. **Location.**
`verification/VerificationService.java:121` (read) → `:163` (send) → `:178` (record);
`FileVerificationSendLog.java:90` `tryRecord` has no production caller; the remaining burst bound is the
atomic `RollingContactOtpLimiter` acquire at `:143`. **Why it matters.** A concurrent burst of
`POST /verify/request` for one (user, level) can all pass the cooldown read and all send; the daily cap can
be overcounted by the in-flight window. Deliberate (a refused send must not burn a slot) and bounded by the
per-contact cap, so Low — but the rule now exists in two places (`VerificationService` and the dead
`tryRecord`), the drift hazard is real, and the suite's strongest concurrency test now certifies a path that
is not shipped. **Suggested fix.** Delete or `@Deprecated`-annotate `tryRecord` (keeping the read-only API)
and add a concurrency IT that asserts the bounded overcount explicitly, so the accepted trade-off is a test,
not a comment.

### F6 — Low — `/auth/refresh` and `/auth/logout` remain the only unauthenticated, DB-touching, unthrottled endpoints

**Location.** `config/SecurityConfig.java:208` (`permitAll` for both) and
`auth/AuthController.java:143-160` — neither handler calls `requireRate(...)`, unlike every sibling
(`:100` register, `:138-139` login, `:189` reset request, `:219` reset confirm). **Why it matters.** No
credential bypass exists (refresh tokens are 64 chars of `SecureRandom` and only their digest is stored —
`JwtTokenService.java:64-66`, `auth/Tokens.java`), but each call reaches the DB (`findByTokenHash` + a
conditional `UPDATE`), so this is the only unauthenticated unbounded-cost pair on the surface.
**Suggested fix.** Add a small per-IP `TokenBucketRateLimiter` bucket to both (the `ClientIps` +
`TokenBucketRateLimiter` wiring already exists), or state the unlimited decision in the threat model.

### F7 — Low — the committed OpenAPI document publishes the whole admin surface that `ApiDocsGuard` exists to withhold

**Location.** `docs/api/openapi.json` (a tracked file; the in-flight lane edits it) contains the `/admin/*`
paths; `config/ApiDocsGuard.java` refuses to boot outside dev/test precisely because *"the API document is
a complete map of the attack surface — the admin endpoints and their payload shapes included"*, and
`SecurityConfig.java:246-249` keeps the docs URLs behind a dev/test-only profile. **Why it matters.** No
runtime exposure (verified: `/v3/api-docs` is 401 on a non-dev profile by construction, 200 here only
because this instance runs `dev`) — but the stated rationale is partly undone by a tracked artifact anyone
who can read the repository receives. It is a trade-off (the file is also the frontend contract), so Low.
**Suggested fix.** Say so where the guard is justified, or generate a public-subset document for the
committed file.

### F8 — Low — the published dev DB credentials have no fail-closed guard, and `docker-compose.yml` publishes 5432 on every interface

**Location.** `src/main/resources/application.yml:7-9` (`${DB_URL:…localhost:5432/sheltermap}`,
`${DB_USERNAME:sheltermap}`, `${DB_PASSWORD:sheltermap}`) and `docker-compose.yml:13` (`"5432:5432"`).
Every other sensitive dev default in this project fails the boot outside dev/test (`config/ProdJwtGuard`,
`DevSenderGuard`, `DevEndpointsGuard`, `ApiDocsGuard`, and `security/PiiKeys` refuses to start without
32-byte keys); the datasource pair is the one left unchecked, and `docs/security/operations.md:90-92` only
documents the requirement. **Why it matters.** On a shared machine or a cloud VM the compose port publishes
the database — which holds the ciphertext, the blind-index hashes and the code hashes — to the whole
network under credentials that are in the public repository, and an operator who forgets `DB_PASSWORD`
silently connects with them. Low: a real database would have to accept those credentials.
**Suggested fix.** Bind the compose port to loopback (`127.0.0.1:5432:5432`) and add a
`DataSourceCredentialGuard` (the `Profiles.isDevTestOnly` idiom) that refuses the boot outside dev/test
while the published default is still in use.

### F9 — Low — loopback `X-Forwarded-For` trust is on by default and the guard only warns; the bucket map then grows on attacker-chosen keys

**Location.** `application.yml:221-226` (`trust-loopback: ${RATELIMIT_TRUST_LOOPBACK:true}`),
`auth/ClientIps.java:52-61` (a loopback peer is trusted, so its `X-Forwarded-For` becomes the returned
client IP), `config/LoopbackXffTrustGuard.java:36-49` (warns, never refuses, on a non-dev/test profile —
deliberate, because dev parity needs the default), and `auth/TokenBucketRateLimiter.java:34-42` — the
bucket key is that value verbatim, the map is a `ConcurrentHashMap` swept only when it exceeds 1024 entries
*and* an entry has been idle for an hour. **Why it matters.** Any process that can reach the app on
loopback can rotate self-declared IPs, evading every per-IP throttle (login, register, verify,
contact-change, geo-resolve) *and* inserting an unbounded number of bucket keys → process memory growth,
which is a new consequence beyond the eviction-of-throttles the guard message names. This is the documented
residual (run-1's cross-check accepted it as an operational decision); it is re-reported only because the
memory consequence is not in the guard text. **Suggested fix.** Add a hard cap (or LRU bound) on the
bucket map, and extend the guard message with the memory consequence; keep the default for dev parity.

### F10 — Low — the HEAD-answers-like-GET rule that was just added for `/api/media/**` was not applied to the other public GETs

**Location.** `config/SecurityConfig.java:227-235` explicitly permits `GET` **and** `HEAD` for
`/api/media/**`, with the rationale *"a public, permit-all asset must answer HEAD the way GET does"*;
`HttpMethod.GET` does not match HEAD, so the other public reads fall to `anyRequest().authenticated()`
(`:251`). Measured: `HEAD /api/media/<valid>.jpg` → **200**, `HEAD /api/shelters` → **401**, `HEAD
/api/guidance` → 401. **Why it matters.** Not a leak — the direction is deny-by-default, and no data is
exposed by a 401 — but the same class of caller the media fix was made for (proxies, CDNs, uptime probes,
`curl -I`) gets inconsistent answers per endpoint, and the fix's own comment now overstates what the config
does. **Suggested fix.** Either add `HttpMethod.HEAD` alongside the GET matchers for
`/api/shelters/**` (minus `/mine`), `/api/guidance/**`, `/api/site-texts` and `/api/data-source`, or narrow
the comment to the media path.

---

## Areas found clean (each read in the source, not taken from a checklist)

1. **Authorization, per endpoint (32 admin handlers + 18 public/authenticated handlers).** I enumerated
   every mapping in all 16 controllers. **All 32 `/admin/**` handlers** call the fresh per-request
   `AdminAccess.requireAdmin()` (`api/AdminController.java` 15/15 — lines 138, 182, 192, 216, 239, 257,
   268, 289, 316, 346, 379, 389, 405, 426, 438; `api/AdminGuidanceController.java` 13/13;
   `api/AdminMediaController.java` 3/3; `api/AdminSiteTextController.java` 1/1), *and* the chain rule
   `requestMatchers("/admin/**").hasAuthority("ADMIN")` (`SecurityConfig.java:243`) is additive, *and* the
   authority comes from a column read per request (`config/JwtAuthenticationFilter.java:75-86`), never a
   token claim — so a demoted admin loses `/admin/**` on the next request. There is no method security to
   drift (`grep EnableMethodSecurity|PreAuthorize|Secured` → none), which is consistent because
   `AdminAccess` is the one implementation. **Non-admin mutations:** `POST /api/shelters` (verified +
   `canWrite()`, `ShelterController.java:246-263`), `PUT /{id}` / `DELETE /{id}` (verified **and**
   author-scoped via `requireOwnedShelter`, `:432-441` → 404/403), `POST /{id}/info-request/reply`
   (verified + author, `:298-305`), `POST /{id}/reports` (verified inside `ShelterReportService:131-137`),
   `PUT /{id}/occupancy` (verified, `:183`), `PUT /{id}/open-status` (registered + `canWrite()`, `:218-219`).
   **Reads:** `/api/shelters/mine` is `authenticated()` *and* its matcher precedes the public wildcard
   (`SecurityConfig.java:212-213`; live: 401 anonymous), `/account/*` resolves the user from the token only
   (`AccountController.java:237-250`), `GET /account/export` reads only `findByCreatedBy(me)`
   (`AccountService.java:165`). **I found no IDOR and no unguarded mutation** (the one F1-class defect the
   first sweep found is fixed, C1).
2. **Validation coverage.** All 32 `@RequestBody` sites are `@Valid` except `AdminSiteTextController.java:68`,
   whose record deliberately carries no constraints and is fully validated in `SiteTextsService.update`
   (key allowlist, locale, `VALUE_MAX`, `MAX_ENTRIES_PER_REQUEST`, https-only link URLs, "URL only on link
   keys/locale en"). Field bounds mirror the columns; the Estonia bbox is re-checked server-side;
   `requireBbox` rejects partial boxes, `NaN`/infinities and inverted edges; `limit`/`offset` are bounded
   before use in both the shelter and the guidance/admin lists. The only gap is the guidance body (F3).
3. **Authentication, JWT and session handling.** HS256 with a ≥32-byte `SecretKey` built at construction
   (`JwtTokenService.java:44`), dev secret refused at boot outside dev/test (`ProdJwtGuard`),
   `sub = userId` with **no role claim**, `exp` validated with the injected `Clock`,
   `verifyWith(key)` pinning the algorithm to HMAC (no alg-confusion surface). Suspended accounts lose
   authentication on the next request; refresh rotation is an atomic conditional `UPDATE`
   (`:83-101`); a successful reset revokes every refresh token. `AuthService.login:119-149` keeps the
   Argon2 dummy-hash timing equalizer **and** the post-verify existence guard; the admin account cannot be
   self-deleted or password-reset (`ProvisionedAdminProtectedException`), and `AdminSeeder:97-101` is
   create-if-absent (no silent re-keying from the environment on every boot).
4. **Password hashing and one-time-code handling on the *live* path.** Argon2id via
   `Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()` (`SecurityConfig.java:64`), all codes/tokens
   from `SecureRandom`, compared with `MessageDigest.isEqual` in one shared primitive
   (`CodeHashes.constantTimeEquals`), single-use, expiring, 5-attempt lockout persisted across requests
   (`CodePolicy.MAX_ATTEMPTS`, `PendingVerification.recordAttempt`, `PasswordResetService:249-280`,
   `ContactChangeService:328-356`). The at-rest weakness is F1; the online defences are correct, and the
   "return the failure instead of throwing" shape (so the failed-attempt increment commits) is right.
5. **SQL / JPQL injection.** All 22 `@Query` statements use bound named parameters; the two
   `nativeQuery = true` statements are static SQL with no parameters
   (`SpringDataGuidancePostRepository.java:31-33`, and the advisory-lock call is a bound `?`,
   `persistence/JpaReportActionLog.java:61`). No concatenated query, no `EntityManager` escape hatch.
6. **Mass assignment.** No controller binds an entity; every `@RequestBody` is a request record in
   `api/`/`auth/`, and the domain objects are constructed field-by-field. Server-owned state (`status`,
   `source`, `createdBy`, `createdAt`, `reviewStatus`, `autoHideDisarmed`, `inaccurateMarked*`) is copied
   from the loaded row or overwritten by the service — the owner's `PUT /api/shelters/{id}` cannot set
   `reviewStatus`, and `kind` has no client path.
7. **Secrets and configuration hygiene.** Every credential is an env placeholder; **no `.env` is tracked**
   (`git ls-files | grep -i env` → only the two frontend `environment*.ts`), and `.gitignore:54-63` covers
   `.env*`, keys, `data/`. PII keys are validated (32 bytes, base64, fail-closed, no default,
   `security/PiiKeys.java:44-62`). The four boot guards read the *resolved* profile set
   (`Profiles.isDevTestOnly` — blank or mixed sets arm the guard). F8 is the one exception.
8. **What reaches the logs.** 38 log statements in `src/main`; I read every one. None logs a request body,
   password, token, OTP or code: the real senders mask the recipient and log only the message length
   (`SmtpPulseSmtpSender`, `TwilioSmsSender`), the auth/reset/contact-change paths log only `userId` or a
   refusal with no contact, `ApiErrorHandler` logs method + URI (no query string, no body) and returns a
   field-neutral message for `DataIntegrityViolationException` (`:360-364`), and the one place a contact is
   logged is the dev senders (`DevSmsSender`/`DevSmtpSender`), which `DevSenderGuard` makes unbootable
   outside dev/test. The plaintext recipient in `EmailTestController:78`/`SmsTestController:66` is behind
   that same guard plus an allowlist. No `System.out`/`printStackTrace`. No Logback config, no
   `logging.*` overrides, `show-sql` unset, `open-in-view: false`.
9. **Error responses.** One `@RestControllerAdvice`; no stack trace, SQL, column or constraint name is
   echoed (the JWT exception wraps its cause without exposing it; `MethodArgumentNotValidException` emits
   only the first `field + message`).
10. **Exposed surface.** Actuator exposes `health,info` only, `show-details: when-authorized`, empty `info`;
    live: `/actuator/health` → `{"status":"UP"}` anonymously, `/actuator/env` and `/actuator/beans` → 401.
    springdoc is off by default, dev-gated at the chain level and boot-refused elsewhere; `/dev/*` is
    flag-gated + JWT + allowlist + boot-refused. CORS is an explicit origin list, verified live: a preflight
    from `http://evil.example` gets **403 with no `Access-Control-Allow-Origin`**, the configured origin
    gets the header with `Allow-Credentials: true` (safe because the origin list is explicit and auth is a
    bearer header, not a cookie — no `Set-Cookie` on any probe). CSRF stays correctly disabled for a
    stateless bearer API. Unknown paths answer 401 (anyRequest), `/error` is not exempt, TRACE is refused
    (400).
11. **File upload and public media serving.** Byte cap on the received bytes before disk
    (`MediaService.java:132`), magic-byte sniffing, declared-vs-sniffed type cross-check, server-generated
    UUID names with the client filename kept as display metadata, `MediaStorage.resolve` refusing
    separators/NUL and re-checking parent equality, and the public serve endpoint enforcing
    `^[a-f0-9]{32}\.(jpg|png|webp)$` with the `Content-Type` taken from the *stored* (sniffed) type
    (`api/MediaController.java:60-97`). Verified live: a well-formed-but-unknown name is a uniform 404, HEAD
    behaves like GET (F10 for the other endpoints), and the public cache header is the immutable one.
12. **Stored XSS in admin-authored guidance.** `BodySanitizer` is a jsoup `Safelist` allowlist on both
    create and update (`GuidanceService.java:443, 501, 1153, 1185`), so the stored column is sanitizer
    output and every reader gets the same HTML; the pinned library version is above the recent sanitizer
    CVE and that CVE additionally needs a raw-text-permitting Safelist.
13. **Outbound fetches (SSRF).** Hero import: scheme allowlist, no `user:pass@`, per-hop address policy on
    **every** hop (`HeroAddressPolicy` classifies loopback/unspecified/link-local incl. `169.254.169.254`/
    RFC1918/multicast/`fc00::/7` incl. `fd00:ec2::254` and unwraps IPv4-mapped forms), redirects never
    auto-followed, size cap enforced *while reading*, stall watchdog + head deadline + walk budget, and the
    stored name/type generated/sniffed. Geo resolver: entry host pinned to `maps.app.goo.gl` with the
    default port, https normalization that drops credentials, hops restricted to the Google host set with
    no scheme change, budgeted — no SSRF path. The resolve→connect TOCTOU is an accepted, documented
    residual (`threat-model.md:448-463`), confirmed.
14. **PII crypto.** AES-256-GCM, random 12-byte nonce per value, `v1:` slot tag, fail-closed decrypt on a
    non-envelope/foreign version, and a **keyed, domain-separated** HMAC-SHA256 blind index for
    e-mail/phone with the same canonicalization the login path uses (`security/PiiCrypto.java`,
    `JpaUserRepository.java:161-203`); the pending verification/contact-change targets and the SMART_ID
    external ref are encrypted too. F1 is the gap in the same story, not a contradiction of this one.

---

## Top 5 findings

1. **F1 (Low) — 6-digit one-time codes are stored as an unkeyed single-round SHA-256**
   (`PasswordResetService.java:199`, `ContactChangeService.java:169/248`,
   `PhoneVerificationProvider.java:62`): 10⁶ candidates are recovered instantly from a dump/backup, turning
   `password_reset_tokens`/`pending_contact_changes` read access into targeted account takeover inside the
   token TTL — while the *neighbouring* secrets (contacts) are AES-GCM under an env-only key with a keyed
   blind index. Fix: the keyed HMAC already in the tree (`PiiCrypto.blindIndex`) + a `v2:` slot tag.
2. **F2 (Low) — HSTS never fires in the documented deploy shape** (`SecurityHeadersFilter.java:47-49` gates
   on `request.isSecure()`, no forward-header handling is configured, and the ops doc
   (`operations.md:101-103`) claims the opposite). Verified live with `X-Forwarded-Proto: https` → no HSTS.
   Fix: honour `X-Forwarded-Proto` from *trusted* peers only (or set the header at the edge) — not
   `forward-headers-strategy: framework`, which would defeat `ClientIps`.
3. **F4 (Low) — three artifacts are behind on advisories that only configuration keeps unreachable**:
   `tomcat-embed-core 10.1.55` (CVE-2026-55956 / CVE-2026-55955 fixed in 10.1.56, CVE-2026-59083 in
   10.1.57), `jackson-databind 2.21.4` (CVE-2026-59889, fixed 2.21.5, needs `@JsonView`+`@JsonUnwrapped` —
   absent), `bcprov-jdk18on 1.78.1` (`pom.xml:104`; keystore/JSSE advisories fixed only in 1.85+ — no BC
   provider is registered). Fix: two version properties + a bcprov bump, plus a CI vulnerability gate.
4. **F3 (Low) — the guidance body has no length bound** (`CreateGuidancePostRequest.java:29`,
   `GuidanceService.java:982`; `body_html TEXT`) although the service javadoc and the error vocabulary
   promise an "oversized body" 400 — an admin-token holder can store an arbitrary body that anonymous
   readers then download.
5. **F5 (Low) — the verification throttle's atomicity is gone and its old atomic helper is production-dead**
   (`VerificationService.java:121/163/178`; `FileVerificationSendLog.tryRecord` called only by tests), which
   also settles the sweep disagreement in favour of the run-1 reading; plus the smaller Low items F6
   (refresh/logout unthrottled), F8 (published dev DB credentials with no guard + `5432:5432`), F9 (loopback
   XFF trust default and the unbounded bucket map), F7 (committed admin OpenAPI paths) and F10 (HEAD
   inconsistency on the other public GETs).

**Merge verdict: OK with notes** (no Critical, no High, no P0/P1). The in-flight admin list lane adds no
security-relevant regression: the new `limit`/`offset` bounds are validated before use
(`AdminController.java:157-172`), the list stays behind `requireAdmin()` + the `ADMIN` chain rule, the
filter enum change is consistent end to end (frontend sends `REGISTRY`/`USER`, matching
`ShelterSourceFilter`), the search term is bounded at 200 chars and matched with `String.contains` (no
regex), and `X-Total-Count` carries only a count the caller can already compute from the unpaged list.
Backend security engineering remains unusually disciplined for this size: authorization is per-request and
DB-backed, crypto and outbound-fetch boundaries are explicit, and the config defaults fail closed. The
items worth doing before a release are F1 (keyed code hashing), F4 (version bumps) and F2 (either fix the
header or fix the doc); the rest are hygiene.
