# FINISH-P3-BE — report

Lane FINISH-P3-BE, branch `code-review`, baseline `017d4d5` (clean tree at start).
Owner-authorised items, all backend: (1) the bare "Malformed request" body
(P3-C.3 / P3-SECURITY-LOGGING F8), (2) `Pagination` moved out of `api`,
(3) `requireRate`/`ClientIps` 4-site dedup, (4) the duplicate `GuidanceSearch`
test suites. Behaviour changes only for item 1 (and the message text is the
only thing changing there). Nothing committed (parent commits).

## Item 1 — the bare "Malformed request" body — **FIXED (the only behaviour change)**

**Verified still real at start:** `api/ApiErrorHandler.java` `malformed(...)`
mapped five exception types to the fixed string `"Malformed request"`, pinned
in three backend test files and documented in
`frontend/src/app/shared/error-copy.ts:69`.

**Change** — `src/main/java/ee/sheltermap/api/ApiErrorHandler.java`:

- `malformed` (now `:97-117`) delegates the message to a new private
  `malformedMessage(Exception)` helper (`:119-141`) — the message now says
  what was malformed, per exception type:
  | Exception | New 400 message |
  |---|---|
  | `HttpMessageNotReadableException` | `The request body is not valid JSON` |
  | `MissingServletRequestParameterException` | `The request is missing the required parameter <name>` |
  | `MissingServletRequestPartException` | `The request is missing the required part <name>` |
  | `MethodArgumentTypeMismatchException` | `The parameter <name> has an invalid value` |
  | `ConstraintViolationException` | `The value of <propertyPath> is invalid` (fallback `The request contains an invalid value`) |
- Status (400), body shape (`ErrorResponse`), and handler set unchanged. The
  five live examples that motivated the finding (`?limit=abc`,
  `?source=PAASETEAMET` — both `MethodArgumentTypeMismatch`) now answer
  `The parameter limit has an invalid value` /
  `The parameter source has an invalid value`.
- **Anti-enumeration contract preserved:** no new message starts with a
  request-payload field name (`email `/`code `/`newPassword `/`level `), so
  the frontend's `isFieldValidation400` field-prefix rule still keeps the
  reset/verify flows on their generic copy for every malformed 400. The
  javadoc on the handler states that constraint.
- The `ConstraintViolationException` arm is defensive (no `@Validated`
  controller parameter exists in the tree — grep-verified); the fallback arm
  is unreachable (the handler is registered for exactly those five types).

**Pins updated (the change stated, per the authorisation):** all three pins
exercise the SAME case — a multipart body without the required `file` part
(`MissingServletRequestPartException("file")`) — so all three move from
`"Malformed request"` to `"The request is missing the required part file"`:

- `src/test/java/ee/sheltermap/api/ApiErrorHandlerTest.java` —
  `missingMultipartPartMapsTo400Not500` (direct handler call with
  `MissingServletRequestPartException("file")`).
- `src/test/java/ee/sheltermap/api/ApiErrorHandlerClientErrorsMvcTest.java` —
  `aMultipartBodyWithoutTheFilePartAnswers400Not500` (MockMvc multipart with
  only an `other` part on the multipart-consumes stub).
- `src/test/java/ee/sheltermap/api/AdminMediaClientErrorsIT.java` —
  `aMultipartBodyWithoutTheFilePartAnswers400Not500` (full stack: multipart
  with only a `renamed` part on `POST /admin/media`).

**Why the new expectation is the correct one:** the part name `file` is the
controller's own `@RequestParam("file")` contract (`AdminMediaController`),
so naming it is the endpoint's documented vocabulary, not new information;
the message is the same one the `uploadSizeExceeded` handler uses to name the
cap — the house style of "400/413 names the concrete defect". No other test
or frontend spec asserts the old string (grep: the only other tree reference
was the `error-copy.ts:69` comment).

**OpenAPI snapshot:** `grep "Malformed request" docs/api/openapi.json` → 0
hits before the change; no `@Operation`/`@ApiResponse` description moved, so
no sanctioned regeneration was needed. `OpenApiSnapshotIT` 1/1 +
`OpenApiContractIT` 10/10 in the focused run confirm the generated document
is byte-identical to the committed snapshot.

**Frontend contract note (not touched, per the brief):**
`frontend/src/app/shared/error-copy.ts:69` still quotes the old string
("the malformed-body 400s say 'Malformed request' (no field prefix)"). The
INVARIANT it encodes (no field prefix) still holds — only the quoted literal
is stale. One-line comment fix for the FE lane; no FE behaviour change
(fallback branches already echo any 400 message as-is for the
profile/shelter kinds and keep the generic copy for reset/verify).

## Item 2 — `Pagination` out of `api` — **FIXED**

**Verified still real at start:** `Pagination` lived in `ee.sheltermap.api`
while `guidance/MediaService`, `guidance/MediaAssetRepository`,
`app/ShelterRepository` and `app/UserRepository` reached across the layer
boundary for it (the reverse import the board filed, BE-RECON:3).

**Neutral home:** `ee.sheltermap.app` — the README's "Where new code goes"
placement rule names `app` as the home of "cross-feature application
services, the shared repository interfaces and shared exceptions"; the
paging vocabulary is exactly that shape (used by the `api` controllers, the
`app` repository interfaces, and the `guidance` service).

**Moved:**

- `src/main/java/ee/sheltermap/api/Pagination.java` →
  `src/main/java/ee/sheltermap/app/Pagination.java` — package line only;
  every other line byte-identical (line numbers of every member preserved,
  so the doc's line anchors stay valid at the new path).
- `src/main/java/ee/sheltermap/api/PagingBoundsException.java` →
  `src/main/java/ee/sheltermap/app/PagingBoundsException.java` — **moved with
  it, not left behind:** `Pagination` throws it, and the README's dependency
  rule (`api`/`auth`/`ingestion` → `app`/`verification` → `domain`) forbids
  `app` from depending on `api`. Leaving the exception in `api` would have
  re-created the reverse edge this item exists to remove. The README's
  placement rule already puts shared exceptions in `app`. Zero behaviour
  change (same class, same messages, same throw sites).

**Every importer updated (same lane):**

| File | Change |
|---|---|
| `api/AdminController.java` | + `import ee.sheltermap.app.Pagination;` |
| `api/AdminGuidanceController.java` | + import |
| `api/AdminMediaController.java` | + import |
| `api/AdminModerationService.java` | + import |
| `api/ApiErrorHandler.java` | + imports `Pagination` (javadoc `{@link}`) + `PagingBoundsException` (the plain-400 family handler) |
| `api/GuidanceController.java` | + import |
| `api/ShelterController.java` | + import |
| `api/ShelterQueryService.java` | + import |
| `app/ShelterRepository.java:59` | javadoc FQCN `ee.sheltermap.api.Pagination` → `ee.sheltermap.app.Pagination` |
| `app/UserRepository.java:93` | same |
| `guidance/MediaAssetRepository.java:42` | same |
| `guidance/MediaService.java` | `import ee.sheltermap.api.Pagination` → `ee.sheltermap.app.Pagination` (**the reverse import is gone — `guidance` now depends on `app` only**) |
| `test/api/AdminModerationServiceTest.java` | + imports `Pagination`, `PagingBoundsException` |
| `test/api/ApiErrorHandlerMappingTest.java` | + import `PagingBoundsException` |
| `test/guidance/GuidanceServiceTest.java` | import `api` → `app` |

No test logic touched; every import is a pure spelling change. Verified
tree-wide: `grep 'ee.sheltermap.api.Pagination\|ee.sheltermap.api.PagingBounds'
src` → 0 hits.

**Anchor re-derivation (rule 6 — recorded here and in the notes file):** the
move necessarily shifts the doc's anchors — two citations named the file's
OLD path, and the five body ranges in three `api` files sit below the one
import line each gained. I re-derived them surgically in
`docs/agent/00-CURRENT-STATE.md` (mechanical path/range update, zero prose
change) so the lane's gate can be green — the single-doc-owner rule exists to
stop 49 lanes churning the doc; this is the owner-authorised structural move
executing its own 7-line re-derivation. Old → new:

| Citation | Old | New |
|---|---|---|
| `00-CURRENT-STATE.md` Pagination path (×2) | `src/main/java/ee/sheltermap/api/Pagination.java:20-30` / `:112-123` | `src/main/java/ee/sheltermap/app/Pagination.java:20-30` / `:112-123` (line numbers preserved — package line only) |
| `ShelterQueryService.java` orphan-serving read | `:412-414` | `:413-415` |
| `AdminController.java` `excludeDismissed` | `:397` | `:398` |
| `AdminModerationService.java` `openReportPage` | `:414-438` | `:415-439` |
| `AdminModerationService.java` `listShelterReports`(+`excludeDismissed`) | `:311-326` | `:312-327` |
| `AdminModerationService.java` `openReportPage`/`openReportCount` | `:414,448` | `:415,449` |

Each new range was verified against the moved/shifted code (token present at
the cited lines); `DocumentationFactsTest` passes on my hunks (the only red
anchors in the combined tree are a sibling lane's in-flight
`design-tokens.spec.ts` shifts — see Concurrency).

## Item 3 — `requireRate`/`ClientIps` 4-site dedup — **FIXED**

**Verified still real at start:** all four throttled controllers bound
`app.ratelimit.trusted-proxies` / `app.ratelimit.trust-loopback` via
`@Value`, parsed with `CommaSeparated.parseSet`, resolved the key with
`ClientIps.resolve(...)`, and carried the identical
`tryAcquire → throw RateLimitExceededException(retryAfter)` path
(`AuthController` `clientIp`/`requireRate` pair, `AccountController.requireRate`,
inline blocks in `VerificationController.request` and
`LocationController.resolve`).

**Change:**

- **New** `src/main/java/ee/sheltermap/auth/ClientThrottle.java` — one
  `@Component` (the `@Component`+`@Value` constructor pattern is the
  established idiom — `AdminSeeder`) holding the three shared pieces:
  the proxy pair bound and parsed **once**; `clientIp(HttpServletRequest)`
  delegating to `ClientIps.resolve` (the keying rule itself, hop-by-hop
  trust, XFF walk — is unchanged); and `requireRate(RateLimiter, …)` (both
  the per-client IP form and the composite-key form) throwing
  `RateLimitExceededException(result.retryAfterSeconds())` exactly as the
  four sites did.
- **Four controllers rewired** — each loses the two `@Value` params, the two
  fields, the `parseSet` call and its local resolve/throw code; each gains
  the one `ClientThrottle` injection:
  - `auth/AuthController` — six limiter call sites: register/session×2 now
    `clientThrottle.requireRate(limiter, http)`; login uses
    `clientThrottle.clientIp(http)` for the per-IP aggregate + the
    `ip + "|" + normalizedContact(…)` composite; reset-request/confirm build
    `ip + "|" + Contacts.normalize(…)` the same way.
  - `auth/AccountController` — `clientThrottle.requireRate(changeRequestRateLimiter, http)`
    on both change-request endpoints; the private `requireRate` is gone.
  - `auth/VerificationController` — the inline 3-line acquire-or-throw in
    `request` is now `clientThrottle.requireRate(verifyRateLimiter, http)`.
  - `api/LocationController` — the inline 4-line block in `resolve` is now
    `clientThrottle.requireRate(geoResolveRateLimiter, http)`.
- `config/RateLimitProperties` javadoc: the "the four controllers parse them
  via `@Value` directly" sentence (now false) points at `ClientThrottle`.
- `config/SecurityConfig` deliberately NOT touched: its `@Value` pair serves
  the HSTS `SecurityHeadersFilter` (`ClientIps.peerIsTrusted` — a different
  consumer, not the rate-limit keying), and the nine limiter beans are
  unchanged (`SecurityConfigRateLimiterWiringTest` 2/2 unmodified).

**Behaviour preservation (the brief's three invariants):**

- *Same bucket keys* — the key expression at every site is byte-identical
  (`ClientIps.resolve(http, trustedProxies, trustLoopback)`; the composites
  keep the same `ip + "|" + contact` construction from the same
  `clientIp`/normalize calls).
- *Same limits* — the nine `TokenBucketRateLimiter` beans, their names and
  their yml-bound capacities/refills are untouched (wiring test green
  unmodified).
- *Same 429 + Retry-After* — same `RateLimitExceededException(retryAfter)`
  throw, same advice mapping (429 + exact `Retry-After` seconds, WARN line);
  `SessionLifecycleThrottleRetryAfterIT` (the positive-refill 429 pin) and
  `AuthRateLimitIT` (trusted-proxy/trust-loopback keying) pass unmodified.

**Not a behaviour risk but noted:** the four constructor signatures changed
(2 `@Value` params out, 1 component in) — the change P3-STRUCTURE-HYGIENE
flagged as needing owner authorisation (board owner item 9). Grep-verified:
no test constructs any of the four controllers directly; they are wired only
by the Spring context (ITs boot the full app).

## Item 4 — duplicate `GuidanceSearch` suites — **FIXED (consolidated)**

**Verified still real at start (with a correction to the board's counts):**
`guidance/GuidanceSearchTest` carries **14** unit tests (the board said 8 —
pre-extraction count) and `api/AdminGuidanceSearchPolicyTest` **7**; both pin
the same `GuidanceSearch` policy from two packages (the api one self-describes
as "the unit-level pin of the moved policy").

**Consolidation:** the `guidance` suite — the natural home, next to the class
under test — absorbs every assertion of the api suite, which is then
retired: **deleted `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPolicyTest.java`**.
The api suite's seven tests map into the merged suite (file: the merged file
is `src/test/java/ee/sheltermap/guidance/GuidanceSearchTest.java`):

| Retired api test | Merged into | What was preserved |
|---|---|---|
| `theQueryBoundAnswersNullForNoFilterAndTrimsTheTerm` | `requireSearchReturnsNullForAbsentAndBlank` / `requireSearchTrimsAndPassesThroughWithinTheBound` | null/blank → null already covered; the `  kelder  ` → `kelder` trim data point added beside the existing `  water  ` one |
| `anOverLongQueryIsA400WithTheUniformMessage` | `requireSearchRefusesAValueOverTheBoundWithTheUniform400` | the `"x".repeat(201)` throw + the constant-built message (`"q must be at most " + MAX_SEARCH_LENGTH + " characters"`) added beside the existing literal-message arm |
| `theQueryBoundAcceptsExactlyTheBound` | `requireSearchTrimsAndPassesThroughWithinTheBound` | `requireSearch("x".repeat(MAX)).hasSize(MAX)` added beside the existing 200-char equality |
| `aNullOrBlankTermMatchesEverything` | `matchesPostMatchesEverythingForANullOrBlankQuery` | the `post("T","<p>b</p>")` null + blank data points added beside the existing three |
| `aScopedReadWithARowMatchesOnlyTheRow` | `matchesPostWithARenderedRowSearchesOnlyTheRow` | the Estonian-scenario pair (`keldri` TRUE — the row **title** is searchable, a facet the old guidance suite never asserted — and home-term `Estonian` FALSE) |
| `aScopedReadWithoutARowFallsBackToTheHomeColumns` | `matchesPostWithoutARenderedRowSearchesTheHomeColumns` | the Estonian home's `Estonian` TRUE / `en body` TRUE / `keldri` FALSE |
| `anUnscopedReadMatchesTheHomeColumnsOrAnyCoveredRow` | `matchesPostWithoutARenderedRowCoversEveryOtherRow` (+ the no-rows `en body` case folded into the home-columns test) | the covered row's title match, the home-content match, the `absent word` negative |

Every assertion that ran before still runs (the merged tests check both
data sets — per the authorisation, "a merged test that checks both is fine");
zero assertions deleted. The class javadoc now states that this suite is also
the unit-level pin of the admin list's delegated search policy and keeps the
pointer to the end-to-end matrix (`AdminGuidanceSearchPagingIT`). A 3-arg
`row(locale, title, bodyHtml)` helper was added (the existing 1-arg helper is
byte-identical).

**Test-count consequence:** 1366 → **1359** (−7 = the retired suite's
method count; the merged suite keeps its original 14 methods). This is the
only count change and it is the consolidation itself — reported per the gate
instruction.

## Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true` — run DETACHED (exit file
`/tmp/finish-p3-be-gate.exit`, log `/tmp/finish-p3-be-gate.log`), after both
sibling lanes reported done, against the settled combined tree:

**exit 0 — BUILD SUCCESS — Tests run: 1359, Failures: 0, Errors: 0,
Skipped: 0.**

Count vs the 1366 baseline: **1359 = 1366 − 7** — the 7 are exactly the tests
of the deleted duplicate suite (item 4); every one of them is preserved in
the guidance package's suite (its 14 tests green in the same run). No other
lane added or removed backend tests (FINISH-P3-FE: frontend files + one new
frontend pin; FINISH-COPY-GUARD: `SourceVocabularyTest` patterns only, no new
test methods).

Guard-suite results from the same run: `DocumentationFactsTest` 21/21 (the 7
re-derived anchors + the one cross-lane citation hold), `SourceVocabularyTest`
(COPY-GUARD's extended census) 2/2, `SecurityConfigRateLimiterWiringTest`
2/2, `OpenApiSnapshotIT` 1/1 / `OpenApiContractIT` 10/10 — snapshot
UNCHANGED, confirming no description regeneration was needed, `GuidanceSearchTest`
14/14 / `GuidanceServiceTest` 87/87, `AdminMediaClientErrorsIT` 4/4,
`SessionLifecycleThrottleIT` 1/1 / `SessionLifecycleThrottleRetryAfterIT`
1/1, `VerificationThrottleIT` 1/1 / `VerificationControllerIT` 2/2 /
`AccountControllerIT` 16/16, `LocationResolveIT` 3/3, `AuthRateLimitIT` 4/4,
`SecurityHeadersIT` 6/6.

PMD (`pmd:check`) verified clean standalone (exit 0) — the one javadoc-only
`ClientIps` import left in `LocationController` is counted as used
(javadoc `{@link}`).

**Pre-gate focused run** (flock, surefire+failsafe, 425 tests, exit 0):
`ApiErrorHandlerTest` 12/12, `ApiErrorHandlerClientErrorsMvcTest` 4/4,
`ApiErrorHandlerMappingTest` 2/2, `AdminMediaClientErrorsIT` 4/4,
`AdminModerationServiceTest` 39/39, `GuidanceSearchTest` 14/14,
`GuidanceServiceTest` 87/87, `GuidancePaginationIT` 9/9,
`SecurityConfigRateLimiterWiringTest` 2/2, `AuthRateLimitIT` 4/4,
`SessionLifecycleThrottleIT` 1/1, `SessionLifecycleThrottleRetryAfterIT` 1/1,
`VerificationThrottleIT` 1/1, `VerificationControllerIT` 2/2,
`AccountControllerIT` 16/16, `LocationResolveIT` 3/3, `SecurityHeadersIT`
6/6, `OpenApiSnapshotIT` 1/1, `OpenApiContractIT` 10/10,
`SourceVocabularyTest` green — zero failures attributable to my files.
(Log: `/tmp/finish-p3-be-focused.log`.)

## Concurrency note (shared worktree)

Two sibling FINISH lanes were live in this same worktree during my run
(same pattern the board-sweep recorded): **FINISH-P3-FE** (frontend: the
owner items 1/3/4/5/6 copy + frozen-spec prose sweep + `color-scheme` + i18n
guard comment — 33+ frontend files in flight, e.g. `en.ts`
`how.sources` triangle copy) and **FINISH-COPY-GUARD** (the owner item 15
guard census: `\bN\d+\b`, `\bWAVE \d+`, `\bWAVE-\d+` added to
`SourceVocabularyTest` — verified red by them, probes cleaned). I touched no
file they own. Consequences for my gate, stated up front:

- **Cross-lane red resolved before the gate.** The drifting anchors were
  FINISH-P3-FE's in-flight `frontend/src/app/design-tokens.spec.ts` — the
  lane's +11-line `color-scheme` pin (inserted mid-file at 497-507) shifted
  the "Computed mix pairs" comment block that `:855-865` points at, and the
  lane closed without re-deriving the citation (its "append, cannot shift
  any anchored line" covers the styles.scss append only). I edited neither
  that spec nor its citations while it was in flight; with the lane done and
  the doc the single shared file, I re-derived the ONE still-failing
  citation (`:855-865` → `:866-876`, the quoted phrase verified at 869-870)
  so the combined gate could be green — attributed in the notes file.
  `DocumentationFactsTest` 21/21 in the gate run.
- The extended `SourceVocabularyTest` (their change) passes on my tree —
  none of my new comments carries a bare `N\d+`/`WAVE n` token.

## Unverified

- **None on this lane's own surface** — the full gate is green (above).
- One stale quote remains in a FRONTEND file frozen for this lane:
  `frontend/src/app/shared/error-copy.ts:69` still documents the old literal
  as `"Malformed request"`. No test checks that comment, so the gate is green
  with it; the line is owed to an anchor pass / the FE lane, same as the
  stale `:684` the P3-F report already flagged.
- The FE lane's other two doc citations of `design-tokens.spec.ts` (`:913`,
  `:949`) now sit on shifted-but-structurally-valid lines: their clauses
  carry no machine-derivable token (`--color-*` fails the guard's identifier
  regex), so the check degrades to structural and passes. Left untouched;
  owed to a future anchor pass (noted in the notes file).

## Files for the parent's commit (this lane)

- `src/main/java/ee/sheltermap/api/ApiErrorHandler.java` (item 1 + item 2 imports)
- `src/main/java/ee/sheltermap/app/Pagination.java` (moved from `api/`)
- `src/main/java/ee/sheltermap/app/PagingBoundsException.java` (moved from `api/`)
- `src/main/java/ee/sheltermap/auth/ClientThrottle.java` (new, item 3)
- `src/main/java/ee/sheltermap/auth/AuthController.java` (item 3)
- `src/main/java/ee/sheltermap/auth/AccountController.java` (item 3)
- `src/main/java/ee/sheltermap/auth/VerificationController.java` (item 3)
- `src/main/java/ee/sheltermap/api/LocationController.java` (item 3)
- `src/main/java/ee/sheltermap/config/RateLimitProperties.java` (javadoc)
- `src/main/java/ee/sheltermap/api/{AdminController,AdminGuidanceController,AdminMediaController,AdminModerationService,ApiErrorHandler,GuidanceController,ShelterController,ShelterQueryService}.java` (item 2 imports)
- `src/main/java/ee/sheltermap/app/{ShelterRepository,UserRepository}.java` (item 2 javadoc FQCN)
- `src/main/java/ee/sheltermap/guidance/{MediaAssetRepository,MediaService}.java` (item 2 import)
- `src/test/java/ee/sheltermap/api/{ApiErrorHandlerTest,ApiErrorHandlerClientErrorsMvcTest,AdminMediaClientErrorsIT}.java` (item 1 pins)
- `src/test/java/ee/sheltermap/api/{AdminModerationServiceTest,ApiErrorHandlerMappingTest}.java` (item 2 imports)
- `src/test/java/ee/sheltermap/guidance/{GuidanceSearchTest,GuidanceServiceTest}.java` (item 4 merge + item 2 import)
- `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPolicyTest.java` (deleted — item 4)
- `docs/agent/00-CURRENT-STATE.md` (7 mechanical anchor re-derivations for the move)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (my fate lines)
- `reviews/code-review/finish-p3-be.md` (this report)
