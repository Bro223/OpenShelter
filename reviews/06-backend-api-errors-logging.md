# 06 — Backend API design, error handling and logging

Reviewer: agent 6 of 12 (sequential sweep). **Read-only review — this report is the only file
created; no source file was modified or reformatted.**

Versions judged against (detected from `pom.xml`, not assumed): **Java 21**, Spring Boot
**3.5.16** (Spring Framework **6.2.19**, Spring Security **6.5.11**, Tomcat 10.1.55), springdoc
**2.8.17**, jjwt 0.12.7, jsoup 1.23.2, Testcontainers 2.0.5, Maven + surefire (`**/*IT.java`),
JUnit 5 + AssertJ + MockMvc. Angular **22.1** on the client (only the three gateways that consume
the response headers were read here; the frontend itself is agents 7–11's scope).
Tree state: `d247007` + the uncommitted admin-list lane (25 modified / 4 untracked files).

## Scope and method

* `ApiErrorHandler` read in full: **38 handler methods covering 55 distinct exception types**
  (counted mechanically, not by eye). All 15 controllers in `ee.sheltermap.api`/`auth` read.
* Read in full or in the relevant part: `SecurityConfig` (chain + CORS + the filter-chain error
  writer), `OpenApiConfig`, `AdminController`, `AdminGuidanceController`, `GuidanceController`,
  `AccountController`, `VerificationController`, `ShelterController`, `AdminSiteTextController`,
  `AdminMediaController`, `PasswordResetService`, `AdminSeeder`, `GuidanceService.slice`,
  `ShelterQueryService.findAllForAdmin`, `ShelterSourceFilter`, plus every `catch (` site
  (33 sites) and every `log.*` site (42 statements, 20 loggers).
* Whole-repo greps: `@ExceptionHandler` (2 files: 38 + 1), `exposedHeaders|Access-Control-Expose`
  (**zero hits**), `produces=` (**zero hits** in `src/main/java`), `System.out|printStackTrace`
  (zero), `logging`/`contentnegotiation` config in `application*.yml` (none).
* **Runtime verification** against the live dev backend on :8080 (read-only probes; verified the
  running JVM has the uncommitted lane: `target/classes/.../AdminController.class` is newer than
  the source and older than the process start, and `/admin/shelters` answers the new
  `X-Total-Count`). Requests used an admin token obtained from `POST /auth/login` with the
  `.env`-provisioned admin credentials (values never printed). The app logs to `/tmp/backend.log`
  (`/proc/<pid>/fd/1`), which makes the logging claims below measurable rather than inferred.
* Cross-checks: `README.md` API table, `docs/api/openapi.json` (parsed with a script),
  `docs/security/operations.md`, `src/main/resources/application.yml`,
  `docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md`, and the new backend tests
  (`ApiErrorHandlerClientErrorsMvcTest`, `AdminMediaClientErrorsIT`,
  `AdminGuidanceSearchPagingIT`, `GuidancePaginationIT`, `AdminModerationIT`).

## Status of the earlier sweep's findings (confirm / correct / contradict)

| Earlier finding | Verdict against this tree |
|---|---|
| Catch-all flattened Spring's own 4xx to 500 | **Fixed.** `HttpMediaTypeNotSupportedException`, `HttpRequestMethodNotSupportedException`, `MissingServletRequestPartException`, `MaxUploadSizeExceededException` are now mapped (`ApiErrorHandler.java:93-134,215-232`), and it is **proven at runtime**: JSON body on `POST /admin/media` → **415**, multipart without the `file` part → **400**, `DELETE /admin/shelters/{id}/status` → **405**, all with the uniform body. Regression tests exist (`ApiErrorHandlerClientErrorsMvcTest`, `AdminMediaClientErrorsIT`). |
| "429 + `Retry-After`" promised on endpoints that never send it | **Confirmed, and re-proven at runtime** — see Finding 5. |
| Valid JWT + erased user row answers 400 on some paths, 401 on others | **Confirmed, only half-fixed** — the "no authentication" branch was moved to 401, the erased-row branch was not (Finding 6). |
| Zero log lines for 429s or auth failures | **Confirmed at runtime** — 7 throttled/unauthorised requests produced not one log line (Finding 7). |
| The 405 is absent from the contract | **Confirmed**, and the newly added **415** is absent too (Finding 9). |
| Non-uniform create semantics / two URL families / no version marker | **Confirmed** (documented, report-only — listed in "clean/report-only" below). |
| `log.error(e.getMessage())` drops stack traces | **Confirmed** (9 sites now, Finding 12). |
| The one controller-local `@ExceptionHandler` | **Confirmed** (Finding 13). |
| Dev relays log raw contacts while real senders mask | **Confirmed**, plus a new sibling site (Findings 11 and 14). |
| "`Accept: application/pdf` → 406, not affected" | **Contradicted at full-stack level.** Their probe used MockMvc standalone without the security chain; through the real chain an unsatisfiable `Accept` on a *public* endpoint answers **401 "Authentication required"** with `"path":"/error"` (Finding 2). |

## Findings

### Finding 1 — Medium (P1): the API silently negotiates XML / XHTML although every published operation declares only `application/json`

**Location**: no `produces` anywhere in `src/main/java` (grep: zero `produces=` hits); the
MediaType of every operation in `docs/api/openapi.json` is `application/json` only; root cause is
`jackson-dataformat-xml` on the classpath, pulled in transitively by
`springdoc-openapi-starter-webmvc-ui` (`pom.xml:53-57`, an **unconditional** dependency — the pom
has no `<profiles>` at all), and `src/main/resources/application*.yml` configures no
content negotiation. The api-error Mvc test even documents the side effect
(`ApiErrorHandlerClientErrorsMvcTest.java:70-73`: "the classpath also carries
jackson-dataformat-xml (via swagger-core)").

**What actually happens** (live probes, verbatim):

| request | declared in the contract | real answer |
|---|---|---|
| `GET /api/guidance` with a browser `Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8` | 200 `application/json` | **200 `Content-Type: application/xhtml+xml`**, body `<List><item><slug>my-new-post</slug>…` |
| `GET /api/shelters?limit=1` with `Accept: text/html,application/xhtml+xml` | 200 `application/json` | **200 `application/xhtml+xml`**, shelter rows as XML |
| `GET /api/guidance?limit=0` with `Accept: application/xml` | 400 `application/json` (ErrorResponse) | **400 `application/xml`**, `<ErrorResponse><status>400</status>…` |
| `GET /api/guidance/nope` with `Accept: application/xml` | 404 `application/json` | **404 `application/xml`** |

**Why it matters**: (a) the machine-readable contract is wrong for every one of the 64 operations
— content negotiation is part of the interface, and a client/cache/proxy generator coding against
`application/json` will be surprised; (b) the second serialisation also covers the *error* body, so
the "one uniform error shape" has a second wire form; (c) `application/xhtml+xml` is served on
endpoints that return user-submitted content (shelter names/addresses) — harmless here only
because `SecurityHeadersFilter` sets `X-Content-Type-Options: nosniff` (verified in the response
headers), which is a mitigation, not a reason to leave the type open. The SPA is unaffected
(Angular sends `Accept: application/json, text/plain, */*`, JSON wins), so this is a contract +
third-party-client defect, not an in-app breakage.

**Suggested fix**: pin the producible type — add `produces = MediaType.APPLICATION_JSON_VALUE` to
the controller mappings (or a small `WebMvcConfigurer` that narrows
`ContentNegotiationConfigurer.mediaTypes(...)` to `application/json`), which also removes
Finding 2's trigger. If XML is ever wanted, it must be declared per operation and covered by
`OpenApiContractIT` — today it is neither documented nor tested.

### Finding 2 — Medium (P1): a public endpoint can answer **401 "Authentication required"** with `"path":"/error"`

**Location**: `src/main/java/ee/sheltermap/config/SecurityConfig.java:200-202` (the entry point)
and `:241` (`.anyRequest().authenticated()`) — there is **no `/error` matcher** in the chain
(`grep -n error SecurityConfig.java` → none). Spring Security 6 authorises the ERROR dispatch by
default, so the servlet error page is behind the JWT wall.

**Evidence (live)**:

```text
GET /api/guidance   Accept: text/html                     -> 401  path "/error"   (public endpoint!)
GET /api/shelters   Accept: text/html                     -> 401  path "/error"
GET /api/guidance/{unknown}  Accept: text/html            -> 401  path "/error"
GET /error (anon)                                         -> 401  path "/error"
GET /api/guidance?locale=<4000 chars>  Accept: text/html  -> 401  path "/error"   (a container 414 becomes 401)
```

Body: `{"status":401,"error":"Unauthorized","message":"Authentication required","path":"/error"}`
with `Content-Type: application/json;charset=ISO-8859-1`.

**Why it matters**: (a) `GET /api/guidance`, `/api/shelters` and `/api/shelters/{id}` are
`permitAll` (`SecurityConfig:227-232`) — telling an anonymous caller of a *public* endpoint to
authenticate is a wrong status; (b) the uniform body's `path` is documented as "The request path
that failed" (`OpenApiConfig.java:97-100`) and reports the internal `/error` path instead, i.e. the
error envelope can leak an internal dispatcher path and is not self-describing; (c) the triggered
class is not exotic: any request whose `Accept` no converter satisfies, and any container-level
error (URI too long), lands here. This is the exact case the earlier sweep marked "not affected"
(406) — with the real security chain it is a 401.

**Suggested fix**: permit the error dispatch (`.requestMatchers("/error").permitAll()` **plus**
accepting that Spring's default error body then renders) is only half the fix; the primary fix is
Finding 1 (pin `application/json`) so no request can become un-renderable in the first place. If a
dedicated `/error` page is added, it must emit the uniform `ErrorResponse` itself, and the entry
point should use the original request URI (`jakarta.servlet.error.request_uri`) rather than the
dispatch URI.

### Finding 3 — Medium (P1): the new `X-Total-Count` header is not exposed through CORS, so the paging total is unreadable for a cross-origin client

**Location**: `SecurityConfig.java:167-177` (`corsConfigurationSource`: allowed origins, methods,
headers and `allowCredentials` are set — `setExposedHeaders` is **not**). Repo-wide grep for
`exposedHeaders|Access-Control-Expose` → **zero hits**, and there is **no CORS test** in `src/test`.

**Evidence**: live response for an allowed origin shows the allow headers but no expose header:

```text
GET /api/guidance  Origin: http://localhost:5173  ->
  Access-Control-Allow-Origin: http://localhost:5173
  Access-Control-Allow-Credentials: true
  X-Total-Count: 8
  (no Access-Control-Expose-Headers)
```

Consumers: `frontend/src/app/gateways/guidance-gateway.ts:84-91`,
`admin-gateway.ts:557-566` (`pagedResult`) and the admin page's three paged lists read exactly
`headers.get('X-Total-Count')`; on absence they **silently degrade** to `body.length`
(`admin-gateway.ts:561-565`: "A missing/blank header degrades to the page's own length"). The
in-flight lane advertises the header as **"always present"** (`AdminController.java:93-96,107-113`,
`docs/api/openapi.json`), and the deployment mode that needs CORS is the supported one —
`README.md:727` ("Set `CORS_ALLOWED_ORIGINS` to the exact public origin(s) of the frontend"),
`README.md:569`, `frontend/src/environments/environment.ts` ("Deployments with the API on another
origin must set this to that origin"), `application.yml:106-110`.

**Why it matters**: per the Fetch standard only safelisted response headers are readable
cross-origin, so in a two-origin deployment every paged list silently computes its page count from
the page length (308 shelters, size 20 → "Page 1 of 1", the out-of-range guard never fires, the
next-page affordance disappears). Same-origin (dev proxy, default prod proxy) is unaffected — that
is the exact boundary of this defect. Nothing in the test suite covers CORS, so no gate catches it.

**Suggested fix**: `config.setExposedHeaders(List.of("X-Total-Count"));` (list the name explicitly
— `*` is not honoured for credentialed responses), and add a `@WebMvcTest`/IT CORS assertion
(preflight + `Access-Control-Expose-Headers` on the paged GET) so the next header-based contract
cannot regress the same way.

### Finding 4 — Medium (P1): the in-flight `source` change breaks the vocabulary its own docs and the README still advertise, and the three documents that describe it now contradict each other

**Location**: `AdminController.java:89` (javadoc "`status`/`source` exact-match filters"),
`AdminController.java:100` (`@Operation` "status/source exact-match filters"),
`AdminModerationService.java:133-135` ("filterable by exact status/source"),
`README.md:391` ("`status`/`source` exact-match filters") — versus
`ShelterSourceFilter.java` (`REGISTRY → {PAASETEAMET, MUNICIPALITY}`) and
`AdminController.java:124-133` (whose `@Parameter` text *is* correct: "the same grouping as the
public list").

**Evidence (live, admin token)**:

```text
GET /admin/shelters?source=REGISTRY&limit=1     -> 200  X-Total-Count: 300
GET /admin/shelters?source=USER&limit=1         -> 200  X-Total-Count: 8
GET /admin/shelters?source=PAASETEAMET&limit=1  -> 400  {"message":"Malformed request"}
```

`PAASETEAMET` / `MUNICIPALITY` are the values the endpoint accepted before this lane
(`ShelterSource` was the parameter type) and the values the code comment still calls "exact match".

**Why it matters**: a client following the README (the human contract) or the two in-code
descriptions gets a bare `400 "Malformed request"` with no hint about the new vocabulary; and
within one file the javadoc/`@Operation` disagree with the `@Parameter` on the same parameter —
exactly the kind of drift that makes the README/OpenAPI pair untrustworthy. This is an
intentional product change (`ADMIN-LANE-SPEC.md` Feature 3, the lane report §3), so the defect is
the un-updated documentation, not the change.

**Suggested fix**: correct `AdminController.java:89,100`, `AdminModerationService.java:134` and
`README.md:391` to the grouping vocabulary (and add `limit`/`offset`/`X-Total-Count` to that README
row — see Finding 10). If external clients exist, accept the two legacy values as aliases with a
deprecation note, or call the break out in the release notes.

### Finding 5 — Medium (P1): "429 — `Retry-After` in seconds" is still published for endpoints that never send the header (earlier sweep confirmed at runtime)

**Location**: `OpenApiConfig.java:150` (blanket text attached to every operation that has no
per-operation 429 — 58 of 64 in the committed snapshot, plus 6 per-operation claims such as
`LocationController.java:92-93`, `AuthController.java:135,217`, `ShelterController.java:338`,
`README.md:341`). The only handlers that set the header are
`ApiErrorHandler.java:473-499` (`VerificationThrottledException`,
`ShelterSubmissionThrottledException`, both conditional on a computed countdown);
`ApiErrorHandler.java:439-452` (`RateLimitExceededException`, `ReportThrottledException`) set none,
and neither exception class carries a value (`RateLimitExceededException`, `ReportThrottledException`).

**Evidence (live)**: 7 calls to `POST /api/geo/resolve` (bucket 5) produced
call 6 and 7 = `429 {"message":"Too many requests"}` with **no `Retry-After` header at all**, while
that operation's own contract says "Per-IP rate limit exceeded — Retry-After in seconds". The same
applies to `/auth/login` (2 buckets), `/auth/register`, `/auth/password-reset/request|confirm`,
`/account/email-change|phone-change/request`, `/verify/request` (per-IP bucket) and
`POST /api/shelters/{id}/reports`.

**Why it matters**: the 429 body is not actionable ("Too many requests" names neither the kind nor
a wait), so the only machine-readable backoff signal the contract promises is missing exactly where
it is needed; the SPA fabricates a 60 s countdown when it finds none. This sweep regenerated the
snapshot (the lane did) and the false claim survived regeneration — nothing in
`OpenApiContractIT` asserts the error prose, so no gate will ever catch it.

**Suggested fix**: either expose the remaining wait on the token bucket
(`RateLimiter`/`TokenBucketRateLimiter` know it) and set the header in all four 429 handlers, or
delete "— Retry-After in seconds" from `OpenApiConfig.java:150`, the six per-operation claims and
`README.md:341`, and declare the header only on the two handlers that send it
(`@Header(name = "Retry-After")`). Regenerate with
`flock /tmp/openshelter-mvn.lock mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`.

### Finding 6 — Low (P2): a valid JWT whose row is gone still answers 400 on `/account/**` and `/verify/**`, 401 elsewhere

**Location**: `AccountController.java:276-279` (`InvalidContactChangeException("Account not found")`
→ 400 via `ApiErrorHandler.java:120-124`) and `VerificationController.java:166-169`
(`VerificationFailedException("Account not found")` → 400 via `ApiErrorHandler.java:111-115`),
versus `ShelterController.java:600-606` (`InvalidAccessTokenException("Unknown user")` → 401) and
`AdminController.java` / `AdminGuidanceController.java` (401/403). The earlier sweep's fix landed
only on the *no-principal* branch: `AccountController.java:270-275` now throws
`InvalidAccessTokenException` ("Matches the Shelter controller fallback convention", verbatim), so
the file contradicts itself two lines later.

**Why it matters**: 400 tells the client "your request was malformed". The erased-account case is
reachable in normal operation (`RetentionService` erases idle accounts; `DELETE /account` is
documented as an idempotent no-op on a repeat call), and the frontend's only session-recovery path
is keyed on 401 — a 400 is treated as a business error and, on the profile path, swallowed. Same
condition, three different statuses across the API.

**Suggested fix**: use `InvalidAccessTokenException` for the unknown/erased-user branch in both
controllers (the javadoc already documents that the JWT is the only credential left), or state the
400 deliberately in the controller javadoc so the three conventions stop contradicting each other.

### Finding 7 — Low (P2): 429s and auth failures still write no log line, though the ops doc tells operators to monitor them

**Location**: `ApiErrorHandler.java:439-505` — four 429 handlers, zero log statements; the class has
exactly two (`:362` WARN data-integrity, `:509` ERROR catch-all). No `log.` at all in
`AuthService`, `AccountService`, `ContactChangeService`, `ShelterService`, `ShelterReportService`,
`AdminModerationService` or `JwtAuthenticationFilter`.

**Evidence (live, `/tmp/backend.log`)**: after 7 `POST /api/geo/resolve` calls (two of them 429), a
failed login (401 "Invalid credentials") and two unknown-token 401s, the byte-for-byte log delta
was **empty**. The whole log is 87 lines, all boot lines.

**Why it matters**: `docs/security/operations.md:192-194` ("OTP/verification throttles: the `429`
responses with `Retry-After` … a burst means an abuse attempt"), `:218` ("identify the contact(s)
from **the 429 log lines**") and `:195` ("Reset re-issue skips (cooldown / per-day cap) are logged
at INFO" — the cooldown skip is **DEBUG**, `PasswordResetService.java:228`, only the per-day cap is
INFO at `:233`). An operator following the runbook looks for records that do not exist, and the
highest-volume auth abuse signal is below the default root level.

**Suggested fix**: one WARN per 429 handler (throttle kind + a masked/opaque key, never the raw
contact) and a WARN for `InvalidCredentialsException`/`InvalidAccessTokenException`/
`AdminAccessException` in the advice; flip `PasswordResetService.java:228` to INFO; or correct
`operations.md:192-196,218` to say the in-memory alert ring is the only source.

### Finding 8 — Low (P2): the whole "malformed request" family answers a bare "Malformed request" that names nothing, while the paging bounds next to it are precise

**Location**: `ApiErrorHandler.java:95-103` — `MethodArgumentTypeMismatchException`,
`MissingServletRequestParameterException`, `HttpMessageNotReadableException`,
`ConstraintViolationException` and `MissingServletRequestPartException` are collapsed into the
fixed string `"Malformed request"`, although the first two carry the parameter name
(`getName()`, `getParameterName()`). Same file, `:435-441`: the 404 group passes
`ex.getMessage()` straight through, so unknown paths return Spring's internal phrasing
("No static resource admin/alertz.").

**Evidence (live)**:

```text
GET /admin/shelters?limit=abc          -> 400 "Malformed request"
GET /admin/shelters?status=BOGUS       -> 400 "Malformed request"
GET /admin/shelters?source=PAASETEAMET -> 400 "Malformed request"
GET /admin/shelters?limit=0            -> 400 "limit must be between 1 and 200"
GET /admin/users?limit=0  (no such param) -> 200 (unknown query params are silently ignored)
```

**Why it matters**: two adjacent parameter mistakes on the same endpoint get two very different
levels of help, and the cryptic one is the type-mismatch path a client is most likely to hit
(wrong enum, non-numeric page size). It also made Finding 4 harder to diagnose from the outside
(the answer never names `source`).

**Suggested fix**: interpolate the parameter name for the type-mismatch/missing-parameter cases
(e.g. `"Malformed request: source"`), keep the generic text for the unreadable-body case where the
name is unavailable, and replace the raw `NoResourceFoundException` message with a fixed
"Not found" string.

### Finding 9 — Low (P2): the newly added 415 (and the existing 405) are absent from the published contract

**Location**: `ApiErrorHandler.java:103-113` (415) and `:117-131` (405) versus
`AdminMediaController.java:93-101` (declares 201/400/413/403) and `OpenApiConfig.java:139-152`.

**Evidence**: `grep -rn 'responseCode = "415"' src/main/java` → **zero hits**; the committed
snapshot has **no `415` on any operation** and **no `405`** (scripted check over all 64
operations); runtime returns 415 and 405 with the uniform body. The 400 declared for
`POST /admin/media` describes only image validation
(`AdminMediaController.java:99-101`), so the missing-part 400 ("Malformed request") is undocumented
as well.

**Why it matters**: the two handlers exist precisely to publish honest client-error statuses,
yet the contract — the artifact clients and generators read — omits them.

**Suggested fix**: `attachIfAbsent(operation, "415", …)` and `"405"` in
`uniformErrorResponseCustomizer` (or per-operation `@ApiResponse`), regenerate the snapshot; extend
`AdminMediaController`'s 400 description to mention the missing part.

### Finding 10 — Low (P2): the three paged endpoints document `limit`/`offset`/`X-Total-Count` in OpenAPI but not in the README API table

**Location**: `README.md:370` (`GET /api/guidance`), `:374` (`GET /admin/guidance`), `:391`
(`GET /admin/shelters`) — no `limit`, no `offset`, no `X-Total-Count`; the paging lane *did* update
`README.md:357` (`GET /api/shelters`, "`limit` (1…200) + `offset` (≥ 0) page the stable
id-ascending answer"), so the omission is inconsistent within the same table.

**Why it matters**: `README.md` is the human contract (`DocumentationFactsTest` only checks that
the *path* strings appear, so nothing fails); a reader of the README cannot know the total is
available, which is the whole point of the header.

**Suggested fix**: extend those three rows with the query parameters and the header, and regenerate
nothing (the README is hand-written).

### Finding 11 — Low (P2): the environment-provisioned admin's e-mail address is logged in clear text at every boot, while every other contact log site masks

**Location**: `AdminSeeder.java:96` ("Admin e-mail {} already in use — seeder is a no-op") and
`:110` ("Seeded admin account {}"), both INFO, both interpolating the full address — versus
`TwilioSmsSender.java:107` (`maskPhone`) and `SmtpPulseSmtpSender.java:72` (`maskEmail`), whose
javadoc states the policy ("Logs must not carry the full address (it is a login contact +
account-recovery channel)").

**Evidence (live)**: `/tmp/backend.log` line 81 —
`ee.sheltermap.auth.AdminSeeder : Admin e-mail admin@openshelter.ee already in use — seeder is a no-op`,
written on this boot; the value is the `ADMIN_EMAIL` from `.env`, i.e. a real login contact.

**Why it matters**: this is the same class of value the codebase deliberately masks elsewhere, and
it is written unconditionally at startup into whatever log sink the deployment uses (the `:96`
branch additionally means "the operator asked for an admin and there is none", which is a
configuration problem logged at INFO).

**Suggested fix**: reuse/extract the mask helper (or log only the domain, or "the configured admin
address"), and consider WARN for the "no-op" branch since a missing admin is an operational
surprise.

### Finding 12 — Low (P2): nine `log.error` sites still drop the stack trace

**Location**: `FileVerificationSendLog.java:117,138,158`, `ShelterImportService.java:136,218`,
`RetentionService.java:112` (`e.toString()`), `TwilioSmsSender.java:102`,
`SmtpPulseSmtpSender.java:61`, `SmsTestController.java:85`, `EmailTestController.java:88` — all
pass `e.getMessage()`/`e.toString()` as a formatting argument instead of the throwable.
(`ApiErrorHandler.java:362,509` get this right and do log stacks.)

**Why it matters**: `operations.md:197` asks operators to alert on ERROR volume, so these are the
records they will read; an `IOException` with only its message does not say which operation failed
or why. The two senders have a documented reason to stay quiet
(`TwilioSmsSender.java:96-101`), which deserves a comment rather than a lost stack.

**Suggested fix**: pass the throwable as the last argument (SLF4J keeps the message and appends the
stack) at the six non-sender sites; for the senders either do the same or state the intent inline.

### Finding 13 — Low (P2): the only exception mapped outside the advice, still duplicating the error-body builder

**Location**: `AdminSiteTextController.java:88-97` (with an unused `HttpServletRequest servletRequest`
parameter at `:68`). Grep: `@ExceptionHandler` appears in exactly two files — 38 in
`ApiErrorHandler`, 1 here.

**Evidence (live)**: the mapping works (`PUT /admin/site-texts` with a disallowed key →
`400 {"message":"Key is not in the allowlist: not.a.real.key"}`), but it constructs the
`ErrorResponse` by hand, so a change to the shared builder would not reach it, and a future caller
of `SiteTextsService.update` outside this controller would get a 500.

**Suggested fix**: move the mapping next to `invalidShelter(...)` in the advice and delete the
local handler and the unused parameter.

### Finding 14 — Low (P2): the in-flight paging code duplicates its bounds helpers and validates *after* the query

**Location**: `AdminController.java:141-160`, `AdminGuidanceController.list` and
`GuidanceController.list` each define a private `requireLimit`/`requireOffset` with the same two
sentences, all three throwing `ee.sheltermap.guidance.GuidanceValidationException` — a
*gudance-write* exception (`ApiErrorHandler.java:130-136`: "A rejected guidance/media write") used
for a query-parameter bound in the shelters controller — and all three calling
`GuidanceService.slice` (a guidance service) for shelter/admin-locale data.

**Evidence**: `/admin/shelters?limit=0` → 400 `"limit must be between 1 and 200"` arrives **after**
`moderation.listShelters(...)` has built the full 308-row DTO list
(`AdminController.java:143-148`: the filtered list is computed before `requireOffset/requireLimit`
are evaluated inside the `slice(...)` call arguments); the same ordering holds in
`GuidanceController.java:129-133` and `AdminGuidanceController.java:170-176`.

**Why it matters**: one paging vocabulary is now spelled out in three places with a cross-domain
exception type, so a change to the bound (or to the message) is a three-file edit; and a rejected
request still pays the full list query + DTO mapping. No client-visible bug today.

**Suggested fix**: one small `Pagination` helper (`bounds(offset, limit)` + `page(...)`) with a
`InvalidPageRequestException` mapped to 400 in the advice, called at the *top* of each handler
before the query.

## Areas verified clean (no issues found in this tree)

1. **One uniform error shape, no leakage, no stack traces or schema details in any client-facing
   message.** All 55 mapped exception types return the one `ErrorResponse` record; the
   filter-chain 401/403 use the same record and the injected `Clock`
   (`SecurityConfig.java:258-264`); `DataIntegrityViolationException` is deliberately field-neutral
   (`ApiErrorHandler.java:352-363`); the two `path` oddities are Findings 2/8, not leakage of
   SQL/constraints/class names. Exception→status mapping is mechanically complete: every
   request-reachable custom exception has a handler (`CodeSendFailedException` is caught inside
   `VerificationService`, `RegistryUnavailableException` never touches a request path).
2. **The catch-all fix is real, complete for the multipart endpoint and regression-tested** —
   verified at runtime (415 / 400 / 405) and in `ApiErrorHandlerClientErrorsMvcTest` +
   `AdminMediaClientErrorsIT`; the deliberate 405 handler is still there and correct.
3. **Catch-block quality.** All 33 `catch (` sites were read: they are typed narrowly except six
   deliberately broad ones, each documented at the site (`ShelterImportService.java:217`
   best-effort audit, `RetentionService.java:109` scheduler survival, `MediaService.java:170` and
   `HeroImageImportService.java:367` cleanup-then-rethrow, `JwtTokenService.java:116` any parse
   failure = invalid token, `EmailTestController.java:87`/`SmsTestController.java:84` diagnostic
   relays). No empty catch bodies except the two documented best-effort cases
   (`JwtAuthenticationFilter.java:83`, `JdkHeroImageFetchClient.java:250`). Interrupt flags are
   restored (`CsvRegistryClient.java:240`, `JdkHeroImageFetchClient.java:125,234`). No
   `System.out`, `printStackTrace` or `System.err` anywhere.
4. **SLF4J used consistently and correctly parameterised** — 20 loggers, 42 statements, no
   `System.out`, placeholder/argument counts match at every site (checked including the multi-line
   calls at `RetentionService.java:102-105` and `ShelterImportService.java:123-127`); the advice
   passes the throwable last so it logs with a stack.
5. **No secrets, tokens, passwords, reset/OTP codes or request bodies in any log statement** —
   grep over all 42 sites. The verification codes *are* printed by the dev console senders
   (`DevSmsSender.java:25`, `DevSmtpSender.java:25`), which is documented and boot-refused outside
   dev/test (`DevSenderGuard.java:50-75` throws at startup), and the production senders log masked
   contacts (`TwilioSmsSender.java:94`, `SmtpPulseSmtpSender.java:53`).
6. **No entity leakage and no mass assignment.** All 15 controllers return DTO records; request
   bodies are dedicated records and server-owned fields (trust state, `createdBy`, `source`) are
   absent by design.
7. **Validation is wired and answers 400 with the uniform body.** Every `@RequestBody` carries
   `@Valid` except `AdminSiteTextController.update` (validated in `SiteTextsService`, Finding 13);
   body errors land on 400, `limit`/`offset`/`locale` bounds answer precise 400 messages
   (`/api/guidance`, `/admin/guidance`, `/admin/shelters` all verified live).
8. **The in-flight paging REST shape itself is sound and matches its spec.** Verified live:
   `limit`/`offset` are optional and absent = un-paged (`X-Total-Count: 308` with no params),
   pages tile the filtered order without overlap (`?limit=1` → id 1, `?limit=1&offset=1` → id 2),
   past-the-end is an empty page (`?limit=1&offset=9999` → `200 []` + `X-Total-Count: 308`, never an
   error), the header reports the *filter* length (`source=REGISTRY` → 300, `source=USER` → 8),
   blank `q` = no filter (`/admin/guidance?q=`) and a non-matching `q` → `200 []` +
   `X-Total-Count: 0`, and out-of-range bounds answer the documented 400. The bounds 1..200 fully
   contain the UI's 10..100 selector run, as the lane spec requires, and the snapshot was
   regenerated for the in-flight change (all five parameters + the 200 header are in
   `docs/api/openapi.json`).
9. **Documented-but-deliberate oddities, re-confirmed and reported as such (not defects):** create
   semantics mix 200 and 201 + `Location` (`POST /api/shelters`, `POST /admin/media` = 201;
   `POST /admin/guidance`, its translation/attach variants and `POST /api/shelters/{id}/reports` =
   200); the URL surface mixes `/api/**` with `/auth`, `/account`, `/verify`, `/admin` and there is
   no version marker (`OpenApiConfig.java:181-210` mirrors the split); three "code sent" acks mix
   200 (`/auth/password-reset/request`) and 202 (`/verify/request`,
   `/account/*-change/request`) — each is consistent between README and OpenAPI, so they are
   documented choices; the blanket error-response customizer is a stated superset
   (`OpenApiConfig.java:139-146`).
10. **The `Retry-After` logic where it exists is correct** — set only when the thrower computed the
    countdown, omitted otherwise (`ApiErrorHandler.java:473-499`), and the 401-vs-403 split is
    deliberate and per-request fresh (`SecurityConfig.java:239` `hasAuthority("ADMIN")` plus the
    in-handler `requireAdmin()` re-checks).

## Merge verdict

**BLOCK (one P1 for the in-flight lane: Finding 3).** Findings 1 and 2 are pre-existing but are
P1-level contract/correctness defects in this area and are one small change away from being fixed
together (pinning `produces = application/json` removes Finding 1 and most of Finding 2's trigger).
Finding 4 is the in-flight lane's own documentation debt and should be fixed in that lane's commit.
Everything else is report-only.

## Top 5 findings

1. **Medium (P1) — the in-flight `X-Total-Count` is invisible to a cross-origin client**: the CORS
   config sets no `setExposedHeaders` (`SecurityConfig.java:167-177`; zero `exposedHeaders` hits
   repo-wide, no CORS test), proven live (no `Access-Control-Expose-Headers`), while
   `guidance-gateway.ts:84`, `admin-gateway.ts:557-566` read exactly that header and silently
   fall back to the page length — in the README-documented two-origin deployment
   (`README.md:727`) every paged list miscounts pages. Fix: expose the header + a CORS test.
2. **Medium (P1) — the API answers XML/XHTML though every operation declares
   `application/json`**: `GET /api/guidance` with a browser `Accept` → `200
   Content-Type: application/xhtml+xml`, XML body; errors come back as `<ErrorResponse>` too. Cause:
   `jackson-dataformat-xml` via springdoc, no `produces` anywhere. Fix: pin JSON.
3. **Medium (P1) — a public endpoint can answer `401 "Authentication required"` with
   `"path":"/error"`**: `/error` is behind `anyRequest().authenticated()`
   (`SecurityConfig.java:241`), proven live with an unsatisfiable `Accept` and with an over-long
   URI. Wrong status for a public endpoint plus an internal-path leak in the uniform body. Fix:
   pin JSON (2), permit `/error`, use the original request URI.
4. **Medium (P1) — the `source` filter change breaks its own documentation**: runtime
   `source=PAASETEAMET` → `400 "Malformed request"` while `README.md:391`,
   `AdminController.java:89,100` and `AdminModerationService.java:134` still say "exact-match";
   the `@Parameter` text two lines away says grouping. Fix: update the three texts (and the README
   row) in the lane's commit.
5. **Medium (P1) + Low (P2) — the 429/auth-failure evidence trail is still broken**: the live 429
   from `POST /api/geo/resolve` carries **no `Retry-After`** although its contract promises one
   (§Finding 5), and seven throttled/unauthorised requests wrote **zero** lines to
   `/tmp/backend.log` although `operations.md:192-218` tells operators to monitor exactly those
   lines (Finding 7); the reset-cooldown skip is still DEBUG. Fix: send the header or fix the
   wording, and add one WARN per throttle kind.
