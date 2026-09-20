# 06 — Backend API design, error handling and logging

Reviewer: agent 6 of 12. **Read-only review — no source file was modified; this report is the only file created.**

Versions reviewed (from `pom.xml`): Java 21, Spring Boot **3.3.13** (Spring Framework **6.1.21**),
springdoc-openapi **2.6.0**, jjwt 0.12.7, jsoup 1.23.2, Testcontainers 2.0.5, Maven with
surefire including `**/*IT.java`, JUnit 5 + AssertJ + MockMvc.

## Scope and how the claims below were verified

* All **15 controllers** read in full (`ee.sheltermap.api.*`, `ee.sheltermap.auth.*`).
* `ApiErrorHandler` read in full: **36 handler methods covering 52 exception types**, 34 call the
  shared `error(...)` body builder, 2 set `Retry-After` (counted mechanically, not by eye).
* Whole-repo greps: `@ExceptionHandler`/`@ControllerAdvice` (2 files), `catch (` (all 30 sites),
  `log.*` (18 loggers, 38 statements), `System.out|printStackTrace|System.err` (zero),
  `@RequestBody` without `@Valid` (1), `LoggerFactory` (18).
* Cross-checks against `README.md` (API table), `docs/api/openapi.json` (parsed with a script),
  `src/main/resources/application.yml`, `docs/security/operations.md`,
  and the frontend's error contract (`frontend/src/app/core/api-error.ts`,
  `api-interceptor.ts`, `gateways/verify-gateway.ts`, `session/auth-store.ts`).
* **Runtime verification**: Spring Framework 6.1.21 sources were read from the local
  `~/.m2/repository`, and a throwaway probe was compiled and run **outside the repository**
  (`/tmp/probe/Probe.java`) that wires the **real `ee.sheltermap.api.ApiErrorHandler`** as a
  controller advice into `MockMvcBuilders.standaloneSetup(...)` next to a stub controller that
  mirrors `AdminMediaController.upload` (`consumes = multipart/form-data`, `@RequestParam("file") MultipartFile`).
  Raw results are quoted in Finding 1; the probe is not part of the tree.

## Verdict

| # | Severity | Finding |
|---|---|---|
| 1 | **High (P1)** | MVC failures raised outside the handler body (415 / 400-missing-part / 413) are flattened to **500** by the advice's catch-all |
| 2 | **Medium (P1)** | "429 — `Retry-After` in seconds" is promised in OpenAPI/README/javadoc for 9 endpoints that never send the header |
| 3 | **Medium (P1)** | The same condition (valid JWT, user row gone) answers **401**, **400** or **403** depending on the endpoint |
| 4 | **Low (P2)** | 429s and auth failures produce **no log line at all**, though `docs/security/operations.md` tells the operator to monitor exactly those |
| 5 | **Low (P2)** | OpenAPI completeness: the deliberately implemented **405** is absent from the contract |
| 6 | **Low (P2)** | Non-uniform create semantics (200 vs 201) and two URL conventions (`/api/**` vs `/auth`, `/account`, `/verify`, `/admin`), no version marker |
| 7 | **Low (P2)** | Several `log.error` sites log `e.getMessage()`/`e.toString()` only, losing the stack trace |
| 8 | **Low (P2)** | One controller-local `@ExceptionHandler` duplicates the advice's body construction (the only mapping outside the advice) |
| 9 | **Low (P2)** | The two dev-only relays log the raw recipient while the real senders mask it |

Verdict for the merge gate of this area: **BLOCK (one P1 bug: Finding 1)**; everything else is
report-only. Areas found clean are listed explicitly further down.

---

## Finding 1 — High (P1): the catch-all turns plain client mistakes into 500s and ERROR-log noise

**Location**: `src/main/java/ee/sheltermap/api/ApiErrorHandler.java:469-473` (the catch-all), with
`:92-99` (the `malformed(...)` group) and `:108-113` (the deliberately added 405 handler) as the
contrast; endpoint under test `src/main/java/ee/sheltermap/api/AdminMediaController.java:92-111`.

**What is wrong**: `@ExceptionHandler(Exception.class)` matches *every* exception, and a
`@RestControllerAdvice` outranks Spring's own `HandlerExceptionResolver`s
(`ExceptionHandlerExceptionResolver` is first in `DispatcherServlet.properties`; the advice has no
`basePackages`/`assignableTypes` selectors, and `HandlerTypePredicate.test(null)` returns `true`
in 6.1.21, so it is consulted even for exceptions thrown **before a handler is resolved**).
Spring's default mappings for those cases are therefore unreachable — including the Spring 6
`ErrorResponse` branch at `DefaultHandlerExceptionResolver.java:188` (verified in the 6.1.21
sources in `~/.m2`). The author was aware of the mechanism and fixed exactly one case (405, with
the comment *"without this handler the catch-all below would turn a plain client mistake into a
500"*); the same-family cases below were missed, and no test covers them
(no test in the tree uses `MockMultipartFile`/`multipart(...)`, grep-verified).

**Evidence — runtime probe with the project's real `ApiErrorHandler` (MockMvc standalone, stub controller mirroring `AdminMediaController.upload`)**:

| request | Spring's default chain | **with the real `ApiErrorHandler`** |
|---|---|---|
| `POST` JSON body to a `consumes=multipart/form-data` endpoint | **415** | **500** `{"status":500,"message":"Internal server error"}` |
| multipart body, part named `other` (the `file` part missing) | **400** | **500** `{"status":500,"message":"Internal server error"}` |
| `MaxUploadSizeExceededException` (what the container/multipart resolver throws over the 6 MB cap) | **413** | **500** `{"status":500,"message":"Internal server error"}` |
| `Accept: application/pdf` on a JSON endpoint | 406 | 406 — **not** affected (the nested error-body write fails the same `Accept`, the resolver returns `null`, the default chain answers 406). Listed so the boundary of the bug is explicit. |

Each of the three affected cases also logs a full stack trace at ERROR via
`ApiErrorHandler.java:471` (`log.error("Unhandled exception on {} ({})", ...)`).

**Why it matters**: `POST /admin/media` is the one endpoint with `consumes=`
(`AdminMediaController.java:92`), so a wrong `Content-Type` — a normal client bug — answers
"Internal server error" and is logged as an application fault. `@RequestParam("file") MultipartFile`
(`:111`) means a renamed/lost part answers 500 where Spring's contract is 400. And
`application.yml:34-40` states the multipart cap was raised above `app.media.max-bytes` **precisely
so the admin gets the documented 413** instead of an "opaque container error" — for a body over
6 MB that intent still does not hold (`README.md` and `openapi.json` document 413 for
`POST /admin/media`). `docs/security/operations.md:197` tells operators to alert on ERROR volume,
so client bugs inflate the signal operators are told to watch.

**Suggested fix** (minimal, same shape as the existing 405 handler): add to `ApiErrorHandler`
`MissingServletRequestPartException` (→ 400, extend the `malformed(...)` group at `:92-99`), or a
`handleErrorResponse`-style passthrough for any exception implementing
`org.springframework.web.ErrorResponse` (which yields the correct 415/413/406/400 without
hand-listing them), or at minimum explicit handlers for `HttpMediaTypeNotSupportedException` (415),
`MaxUploadSizeExceededException`/`MultipartException` (413, reusing the `MediaTooLargeException`
vocabulary) and `MissingServletRequestPartException` (400). Add the regression cases to a MockMvc
`@WebMvcTest`/IT — the four probe rows above are the test matrix.

## Finding 2 — Medium (P1): "429 + `Retry-After`" is documented on 9 endpoints that never send the header

**Location**: `src/main/java/ee/sheltermap/config/OpenApiConfig.java:150` (blanket description
attached to **all 64 operations**) and the per-operation claims at
`AuthController.java:132-136` (login), `:96-100` + `:108` (register), `:214-218`
(password-reset confirm), `LocationController.java:90-93` (geo resolve),
`ShelterController.java:333-338` (shelter reports), `VerificationController.java:107-110`;
`README.md:341` (register row). The handlers that actually set the header are
`ApiErrorHandler.java:435-450` and `:454-466`.

**What is wrong**: the header is written **only** for `VerificationThrottledException` and
`ShelterSubmissionThrottledException` when the thrower computed a countdown. The 429 handler used
by every token-bucket limit and by the report throttle — `ApiErrorHandler.java:401-405`
(`RateLimitExceededException`) and `:412-415` (`ReportThrottledException`) — returns the body with
**no** `Retry-After`, and neither exception class carries the value
(`RateLimitExceededException.java:4-8`, `ReportThrottledException.java:9-14`;
`RateLimiter`/`TokenBucketRateLimiter` expose only `boolean tryAcquire(String)`).
So the header is promised and absent on nine endpoints — `POST /auth/login` (both buckets),
`/auth/register` (per-IP bucket), `/auth/password-reset/request`, `/auth/password-reset/confirm`,
`/api/geo/resolve`, `/verify/request` (per-IP bucket), `/account/email-change/request`,
`/account/phone-change/request` and `POST /api/shelters/{id}/reports`.
`docs/api/openapi.json` carries the phrase 65 times (39 of them the blanket text applied to every
operation, which is a superset by design — the defect is the wording, not the superset).

**Why it matters**: the machine-readable contract is wrong in a way clients code against. The
frontend already depends on it: `frontend/src/app/features/auth/reset-page.ts:149-155` starts a
countdown from `api.retryAfterSeconds ?? 60`, so a token-bucket 429 (e.g. the register bucket
refills at 0.01/s ≈ 100 s per token, `application.yml`) shows a fabricated 60 s countdown; and
`frontend/src/app/gateways/verify-gateway.ts:15-16` states a third, different story ("not the 5/day
cap … carries a Retry-After header") while `VerificationService.java:126-131` *does* set a
countdown for the daily cap. Three artifacts disagree about one contract.

**Suggested fix**: either implement the header (expose the bucket's wait time on `RateLimiter` and
have `rateLimit(...)`/`reportThrottled(...)` set it) or correct the wording — drop
"— Retry-After in seconds" from `OpenApiConfig.java:150`, from the four controller claims and from
`README.md:341`, and declare the header object explicitly (`headers = @Header(name="Retry-After")`)
only on the two handlers that send it. Note the snapshot must be regenerated with the sanctioned
`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`; `OpenApiContractIT` does not assert the
error prose, so a correct fix is not blocked by the gate.

## Finding 3 — Medium (P1): one condition, three status codes (erased account keeps a valid token)

**Location**: `src/main/java/ee/sheltermap/auth/AccountController.java:272-284` (throws
`InvalidContactChangeException("Account not found")` → **400** via `ApiErrorHandler.java:124-127`)
and `src/main/java/ee/sheltermap/auth/VerificationController.java:166-173`
(`VerificationFailedException("Account not found")` → **400** via `:119-122`), versus
`src/main/java/ee/sheltermap/api/ShelterController.java:596-605` (`InvalidAccessTokenException`
→ **401**) and `AdminController.java:380-390` (401 then 403).

**What is wrong**: `JwtAuthenticationFilter.java:57-70` deliberately keeps a *deleted* account's
token authenticating at the chain level ("unknown ids answer false, the JWT stays valid until
expiry" — the legal-recovery erasure contract, `:38-44`). The controller then re-resolves the user
and reports failure with whichever exception its own local fallback convention picked. So
`GET /account/me`, `PUT /account/profile`, `GET /account/export` and the four change/verify
handlers answer **400 "Account not found"** for a token whose account no longer exists, while
`GET /api/shelters/mine` answers **401** for the same token.

**Why it matters**: 400 tells the client "your request was malformed". The frontend's single
session-recovery path is keyed on 401 (`frontend/src/app/core/api-error.ts:22,79`,
`api-interceptor.ts` → refresh → `/login?session=expired`), so a 400 is treated as a business error
and, in the profile path, is even swallowed entirely
(`frontend/src/app/session/auth-store.ts:305-322` — "NON-fatal on purpose … any failure is
swallowed"): the user stays in an authenticated shell with a null profile and no redirect. This is
reachable in normal operation — `RetentionService` erases idle accounts
(`application.yml` `app.retention`), and `DELETE /account` is documented as an idempotent no-op for
a repeat call (`AccountController.java:205-241`) while `/account/me` with the same token is a 400.

**Suggested fix**: use `InvalidAccessTokenException` (401) in `AccountController.currentUser()`
and `VerificationController.currentUser()` for the unknown/erased-user branch — the same
"In a deleted case the row is gone" comment already documents that the JWT is the only credential
left — and let the erased-session flow reach the existing 401 handler. If a 400 is intentional for
these two groups, say so in the controller javadoc; today each controller documents its own
fallback and they contradict each other.

## Finding 4 — Low (P2): no log record for 429 throttles or auth failures, though the ops doc monitors them

**Location**: `ApiErrorHandler.java:399-466` (four 429 handlers, zero log statements; the class has
exactly two: `:327` WARN for data-integrity, `:471` ERROR for the catch-all) and the whole
request-path service layer — greps show **0** `log.` statements in `AuthService`,
`AccountService`, `ContactChangeService`, `ShelterService`, `ShelterReportService`,
`AdminModerationService` and `JwtAuthenticationFilter`.

**What is wrong**: this is a documentation/behaviour conflict, not an opinion:
`docs/security/operations.md:192-194` — "Logs … OTP/verification throttles: the `429` responses
with `Retry-After` (per-contact cap, daily caps) — a burst means an abuse attempt"; `:218` — "identify
the contact(s) from **the 429 log lines** + the admin alert ring". Those lines do not exist: a
login/reset/geo/register/report/verify 429 writes nothing to the log, and only three of the
throttle kinds reach the in-memory alert ring (`ThrottleAlertRecorder` callers:
`ShelterService:143`, `AuthController:114`, `VerificationService:147,162`), which
`operations.md:202-206` itself says clears on restart. Failed logins, invalid/expired tokens and
403 admin denials are likewise invisible. `operations.md:195` also claims "Reset re-issue skips
(cooldown / per-day cap) are logged at INFO", but the cooldown skip is **DEBUG**
(`PasswordResetService.java:134`) and only the per-day cap is INFO (`:139`) — the cooldown-skip
spike the doc calls an abuse signal is below the default root level.

**Why it matters**: an operator following the runbook looks for records that are never written;
the 60 s cooldown is the highest-volume auth abuse signal and it is DEBUG-only.

**Suggested fix**: log at WARN in the four 429 handler methods (throttle kind + a masked/opaque key,
no contact in clear text), flip `PasswordResetService.java:134` to INFO, and log a WARN for
`InvalidCredentialsException` / `InvalidAccessTokenException` / `AdminAccessException` in the
advice; or correct `operations.md:192-196,218` to say the alerts ring is the only source.

## Finding 5 — Low (P2): the implemented 405 is missing from the published contract

**Location**: `ApiErrorHandler.java:108-113` (+ its comment) and
`src/test/java/ee/sheltermap/api/ApiErrorHandlerTest.java:78-88` versus
`docs/api/openapi.json` / `OpenApiConfig.java:139-152`.

**What is wrong**: the customizer publishes 400/401/403/404/409/429/500 on every operation
(verified by parsing the snapshot: 64 operations, 64× each), but **405 appears nowhere** — while
the advice implements it on purpose and a test locks it. No `@ApiResponse(responseCode="405")`
exists either.

**Why it matters**: the contract is the machine-readable map of the API; a reflected 405 is a
documented behaviour of this API that a client generator cannot see. The blanket superset itself is
a stated, accepted trade-off (`OpenApiConfig.java:139-146` "Deliberately a superset"), and the
impossible codes it adds (e.g. 404/409 on public GETs) are not reported here as defects.

**Suggested fix**: add `attachIfAbsent(operation, "405", "Method not allowed on a mapped path — the uniform error body.")`
in `uniformErrorResponseCustomizer` and regenerate the snapshot.

## Finding 6 — Low (P2): non-uniform create semantics and two URL conventions

**Location / evidence** (all verified by reading the mappings):
`POST /api/shelters` → **201 + `Location`** (`ShelterController.java:281-286`),
`POST /admin/media` → **201** (`AdminMediaController.java:118-120`), but
`POST /admin/guidance` → **200** (`AdminGuidanceController.java:192-214`),
`POST /admin/guidance/{id}/translations` → **200** (`:444-465`), its `/attach` variant → **200**
(`:521-545`), and `POST /api/shelters/{id}/reports` → **200** with a result body
(`ShelterController.java:322-342`).
URL surface: `@RequestMapping` prefixes are `/api/shelters`, `/api/guidance`, `/api/media`,
`/api/site-texts`, `/api/data-source`, `/api/geo`, `/dev/*` for some domains but `/auth`,
`/account`, `/verify`, `/admin` for others — and there is **no version marker anywhere** (no
`/v1`, no `@RequestMapping(version=…)`), which the OpenAPI group split mirrors
(`OpenApiConfig.java:181-210`).

**Why it matters**: a client cannot apply one rule for "resource created" (200 vs 201 + Location),
and the two prefix families are baked into five frontend dev-proxy entries (`README.md:491`), so a
future v2 is a hard path cut with no seam. Both are documented, hence report-only.

**Suggested fix**: pick one create convention (201 + `Location` is the one already used where the
resource has a canonical URL) and state the prefix rule in the README API section (or move the four
non-`/api` groups under `/api/` when a v2 is cut).

## Finding 7 — Low (P2): ERROR logs that drop the stack trace

**Location**: `verification/FileVerificationSendLog.java:117,138,158`,
`ingestion/ShelterImportService.java:136,218`, `retention/RetentionService.java:111`,
`verification/TwilioSmsSender.java:96`, `verification/SmtpPulseSmtpSender.java:61`.

**What is wrong**: these pass `e.getMessage()` / `e.toString()` as the formatted argument instead of
the throwable, so SLF4J logs no stack. All are ERROR-level (senders also have a documented reason
to avoid noise: `TwilioSmsSender.java:90-95`), but the file-backed verification send log failing to
append/read/rewrite (`FileVerificationSendLog`) and a failed registry import
(`ShelterImportService.java:136`) are exactly the events an operator must diagnose — and
`operations.md:197` asks them to alert on ERROR volume.

**Why it matters**: an `IOException` with only its message ("…/data/verification-send.log") does
not say which operation, from where, or why.

**Suggested fix**: pass `e` as the last argument (SLF4J keeps the message and adds the stack) for
these five files; if a sender deliberately avoids a stack, add a short comment saying so.

## Finding 8 — Low (P2): the only exception mapped outside the advice

**Location**: `src/main/java/ee/sheltermap/api/AdminSiteTextController.java:89-97`, with an unused
`HttpServletRequest servletRequest` parameter in the caller (`:68-69`).

**What is wrong**: this is the *only* controller-local `@ExceptionHandler` in the tree
(grep-verified: 36 in `ApiErrorHandler`, 1 here) and the only mapping for
`SiteTextValidationException` (thrown 7× in `SiteTextsService`, nowhere else — grep-verified). It
hand-rolls the `ErrorResponse` body the advice already builds (`ApiErrorHandler.java:475-482`),
duplicating the shape contract in a second place; the advice's javadoc claim
(`ApiErrorHandler.java:66-67`, "the one global `@RestControllerAdvice`") is therefore only true for
local-handler precedence. Today no second throw path exists, so this is a latent trap rather than a
live bug: a future caller of `SiteTextsService.update` outside this controller would get a 500.

**Why it matters**: two error-body construction sites can drift (the local one would not pick up a
change to the shared builder), and the controller-local scope silently limits the mapping.

**Suggested fix**: move the mapping into `ApiErrorHandler` next to `invalidShelter(...)` (400) and
delete the local handler plus the unused parameter.

## Finding 9 — Low (P2): the dev relays log the recipient in clear text while the real senders mask it

**Location**: `api/EmailTestController.java:81,84,94` and `api/SmsTestController.java:72,75`
versus `verification/TwilioSmsSender.java:88,96` (`maskPhone`) and
`verification/SmtpPulseSmtpSender.java:53,61` (`maskEmail`).

**What is wrong / mitigation**: the two dev-only diagnostic relays log the raw e-mail address and
phone number at INFO/WARN; the real channels deliberately mask the same value. Mitigations are real
and were verified: `DevEndpointsGuard` refuses to boot a non-dev/test profile with
`app.dev-*.enabled=true`, the endpoints need a valid JWT and (unless `allow-any=true`) an allow-listed
recipient, and the recipient is already in the response body — so the exposure is "the same value
lands in log aggregation". Reported for completeness of the "sensitive data in logs" question, at
the lowest severity.

**Suggested fix**: extract the two existing private mask helpers
(`TwilioSmsSender.java:107` `maskPhone`, `SmtpPulseSmtpSender.java:72` `maskEmail`) into one shared
helper and use it in the three log statements — or follow the cheaper precedent of
`PasswordResetService.java:134,139`, which logs only `userId`.

---

## Areas verified clean (no issues found)

1. **One uniform error shape, no leakage.** All 36 handler methods return the same `ErrorResponse`
   record (`ApiErrorHandler.java`), and the filter-chain 401/403 written outside the advice use the
   same record and the injected `Clock` (`SecurityConfig.java:253-260`). No message carries a stack
   trace, a class name, a SQL/constraint detail or an internal path: the
   `DataIntegrityViolationException` mapping is deliberately field-neutral
   (`ApiErrorHandler.java:318-331`, verified against its javadoc) and the shelter-duplicate message
   exposes only the row id the caller is allowed to see (public ids, documented at
   `ShelterController.java:66-71`). `NoResourceFoundException` → 404 gives the uniform body for
   unknown paths.
2. **Every custom exception reachable from a request is mapped.** A mechanical sweep of all
   `extends RuntimeException|Exception` classes against the advice found exactly three outside it:
   `CodeSendFailedException` (caught in `VerificationService`, anti-enumeration),
   `RegistryUnavailableException` (import thread only, never a request path) and
   `SiteTextValidationException` (Finding 8). No unmapped request-reachable exception exists.
3. **Catch-block quality.** All 30 `catch` sites were read: they are narrow, and the two broad ones
   are documented and justified (`EmailTestController.java:88-93` states why a test relay must not
   swallow delivery failure; `VerificationService.java:155-165` is the anti-enumeration swallow).
   Interrupt handling restores the flag (`JdkHeroImageFetchClient.java:125-127,234-236`), file
   writes are cleaned up before rethrow (`MediaService.java:172-178`,
   `HeroImageImportService.java:367-373`), and the only empty bodies are the two documented
   best-effort cases (`JwtAuthenticationFilter.java:83-85`, `JdkHeroImageFetchClient.java:250-253`).
   No `System.out`, `printStackTrace` or `System.err` anywhere (grep: zero hits).
4. **SLF4J used consistently, correctly parameterized.** 18 `LoggerFactory` loggers, 38 log
   statements, all SLF4J; the advice passes the throwable as the last argument
   (`:327`, `:471`) so it logs with a stack; placeholder counts and argument counts match at every
   site (checked, including the multi-line calls at `RetentionService.java:102-105` and
   `ShelterImportService.java:123-127`).
5. **No secrets, tokens or codes in logs.** Nothing logs `Authorization`, an access/refresh token,
   a password, a reset/OTP code or a request body (grep over all 38 sites). The verification codes
   *are* printed by the dev console senders, which is documented and boot-refused outside dev/test
   by `DevSenderGuard.java:58-72`; production senders log masked contacts and never the code
   (`TwilioSmsSender.java:88` logs a char count, `SmtpPulseSmtpSender.java:53` a subject).
6. **No entity leakage into the API and no mass assignment through body binding.** All 15
   controllers return DTO records or maps (`ShelterDto`, `AdminGuidancePostDto`,
   `GuidanceTranslationDto`, `MeResponse`, `MediaAssetDto`, …); request bodies are dedicated DTO
   records (`ee.sheltermap.api.*Request`) and server-owned fields (trust state, `createdBy`,
   `source`) are absent from them by design (`UpdateShelterRequest.java:20-31`).
7. **Validation is wired and answers 400 with the uniform body.** Every `@RequestBody` carries
   `@Valid` except `AdminSiteTextController.update` (`:68`), whose `UpdateSiteTextRequest` has no
   constraints — that case is validated in `SiteTextsService.update` and answers through the local
   handler as a 400 (Finding 8). Body/param errors land on 400 (enum values in bodies →
   `HttpMessageNotReadableException` at `ApiErrorHandler.java:92-99`; enum query params →
   `MethodArgumentTypeMismatchException`; missing required body fields → `@NotNull/@NotBlank` +
   `MethodArgumentNotValidException` at `:83-90`, which composes `"<field> <constraint message>"`).
8. **The `Retry-After` logic where implemented is correct**: set only when the thrower computed it,
   omitted otherwise (`ApiErrorHandler.java:435-450,454-466`), and `VerificationService`
   provides it for cooldown, daily cap and per-contact cap (`:126-147`), `ShelterService` for the
   submission cap (`:140-144`). 401 vs 403 is deliberate and consistent per controller (fresh
   per-request kind read, never a token claim: `AdminController.java:376-390`,
   `AdminGuidanceController.java:625-635`, `AdminMediaController.java:175-185`,
   `AdminSiteTextController.java:75-85`) and reinforced by the `/admin/**` chain guard
   (`SecurityConfig.java:224`), which matches the 500-idiom-free behaviour asserted in the
   controller javadocs.
9. **Per-endpoint status codes match the README's readable table** (spot-checked against the code
   for ~20 rows, incl. `/admin/reports?shelterId=` → 404 for an unknown shelter
   (`AdminModerationService.java:280-283`), `/verify/confirm` idempotent 200
   (`VerificationService.java:224-230`), `limit` 1..200 → 400 in both audit and alert lists
   (`AdminModerationService.java:390-394`, `AdminController.java:288-295`), the 405/404/429
   families, the geo resolver's 400/429/502, media 404, guidance 404-vs-400). The only prose drift
   found is Finding 2's `Retry-After` claim — not a code defect.

## Top 5 findings

1. **High** — `ApiErrorHandler`'s catch-all flattens Spring's own client-error statuses to 500:
   a JSON body on `POST /admin/media` (415), a renamed/missing `file` part (400) and an upload over
   the 6 MB container cap (413 — the status `application.yml:34-40` says the admin should see) all
   answer `500 "Internal server error"` and log an ERROR stack
   (`ApiErrorHandler.java:469-473`; probed with the real class). Add the three mappings and a test
   matrix; the 405 handler at `:108-113` is the pattern to copy.
2. **Medium** — "429 — `Retry-After` in seconds" is published for 9 endpoints that never send it
   (`OpenApiConfig.java:150` × 64 operations, `AuthController.java:135,217`,
   `LocationController.java:93`, `ShelterController.java:338`, `README.md:341`) because
   `RateLimitExceededException`/`ReportThrottledException` carry no countdown
   (`ApiErrorHandler.java:401-415`); the SPA already counts down a fabricated 60 s
   (`reset-page.ts:155`) and the gateway comment tells a third story
   (`verify-gateway.ts:15-16`). Either send the header or fix four artifacts.
3. **Medium** — a valid JWT whose user row is gone answers **400 "Account not found"** on
   `/account/**` and `/verify/**` (`AccountController.java:283`, `VerificationController.java:172`)
   but **401** on `/api/shelters/mine` (`ShelterController.java:604`); the frontend's only
   session-expiry path is keyed on 401, and the profile fetch swallows the 400
   (`auth-store.ts:305-322`). Use 401 in both controllers.
4. **Low** — no log line is written for any 429 or auth failure, although
   `docs/security/operations.md:192-194,218` tells operators to monitor "the 429 log lines", and the
   reset cooldown skip — the volume signal the doc names — is DEBUG
   (`PasswordResetService.java:134` vs the doc's "logged at INFO"). Add one WARN per throttle kind
   (masked key) and flip the cooldown skip to INFO.
5. **Low** — documentation/consistency debt that will otherwise rot: the deliberately implemented
   405 is absent from the OpenAPI contract (Finding 5); create semantics mix 200 and 201 + Location
   and the URL surface mixes `/api/**` with `/auth`, `/account`, `/verify`, `/admin` with no version
   marker (Finding 6); and the only exception mapped outside the advice is a controller-local
   handler duplicating the shared body builder (`AdminSiteTextController.java:89-97`, Finding 8).
