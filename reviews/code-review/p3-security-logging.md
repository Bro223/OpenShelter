# P3-SECURITY-LOGGING — P3-B (backend security) + P3-C (API/logging polish)

**Branch:** `code-review` · **Baseline:** 1364 tests (DOCS-ITERATE gate, `git archive`-clean) · **Skills:** `clean-code`, `code-review`, `security-review` (from `docs/skills/`)

**Scope rule applied:** behaviour changes only where the finding requires one (the
throttle, which turned out to already exist); everything I changed is logging,
comment or exception-mapping consolidation. No guard, no migration, no frontend file
touched. Per-finding verdicts below, each with evidence against the CURRENT tree
(the codebase moved a lot between the sweep and this lane — two of the eight items
were already fixed by the time I started).

**Files for the parent's commit (7):**
- `src/main/java/ee/sheltermap/auth/AdminSeeder.java`
- `src/main/java/ee/sheltermap/auth/AdminSeederTest.java` (+1 test)
- `src/main/java/ee/sheltermap/api/AdminSiteTextController.java`
- `src/main/java/ee/sheltermap/api/ApiErrorHandler.java`
- `src/main/java/ee/sheltermap/config/SecurityConfig.java`
- `src/test/java/ee/sheltermap/auth/SessionLifecycleThrottleRetryAfterIT.java` (new)
- `reviews/code-review/p3-security-logging.md` (this report) + the `CODE-REVIEW-NOTES.md` board lines

---

## P3-B — Backend security (5 items)

### P3-B.1 — F6: `/auth/refresh` + `/auth/logout` the only unthrottled DB-touching unauthenticated endpoints → **ALREADY FIXED** (before this lane)

The sweep (agent 4 F6, `reviews/04-backend-security.md`) found neither handler called
`requireRate(...)`. Both now do, since commit `e137331` ("…and the auth hardening"):

- `auth/AuthController.java:159` (refresh) and `:171` (logout):
  `requireRate(sessionRateLimiter, clientIp(http))` — per-IP, via the same
  `ClientIps.resolve` trusted-proxy rule as every sibling (the throttle fires
  BEFORE the token is looked up, so a hammer pays 429 without touching the DB).
- `config/SecurityConfig.java:138` — the `sessionRateLimiter` bean (row 91 of the
  limiter table: "token rotation/revocation hammering (unauthenticated, DB-touching)"),
  one of the nine verified token buckets.
- `application.yml:233-235` — the limit: `session-capacity: 30`,
  `session-refill-per-second: 0.5` (burst 30, ~30/min), with the rationale comment:
  "Generous for a legitimate session (a few refreshes + a logout per resume) but
  bounds a rotation/revocation DoS". **The limit is a conservative choice and I kept
  it as the project's established value**: refresh is the one routine
  session-lifecycle call a legitimate client makes on every resume, so the bucket is
  deliberately looser than login (5) / reset (3) / confirm (10) — but it still bounds
  a single IP to ~30/min sustained, versus unbounded before. No change made.
- Existing pin: `auth/SessionLifecycleThrottleIT` — pins a capacity-2 / refill-0
  bucket and asserts: first two calls pass, the third is 429 (uniform body,
  `$.status == 429`), and **logout shares the same per-IP bucket**. Because that IT
  uses refill = 0, it pins the *other* half of the contract: with a never-refilling
  bucket the 429 carries **no** `Retry-After` (no honest countdown — the documented
  token-bucket rule in `TokenBucketRateLimiter.Bucket.tryAcquire`).

**What this lane added:** the task requires a test proving the limit is enforced as a
**429 WITH `Retry-After`** — no existing test covered the positive-refill half (the
production configuration has refill 0.5 > 0, so a real 429 DOES carry the countdown;
the existing IT's refill-0 pin leaves that unverified). New
`src/test/java/ee/sheltermap/auth/SessionLifecycleThrottleRetryAfterIT` (1 test,
+1 to the suite): capacity 1 at a tiny 0.001/s refill so a slow CI machine cannot
refill the bucket between calls; asserts call 1 acquires (bogus token 401s *after*
the acquire), call 2 is **429 with a `Retry-After` header that is a whole number of
seconds in [1, 1000]** (1000 = 1/refill bound), and logout on the drained shared
bucket is 429. No register/login needed (no row written to the shared Postgres, no
shared-bucket pollution of other ITs). Green on first run: 1/1.

**Verdict: already fixed (throttle + limit + one IT); the missing Retry-After proof
added by this lane.**

### P3-B.2 — F7: committed `docs/api/openapi.json` publishes the whole `/admin/*` surface → **STILL REAL (factual) — by design, out of scope, filed**

- Verified today: the committed snapshot still lists **26 `/admin/*` paths** (of 55
  total) — `python3 json.load` count, unchanged in kind since the sweep.
- No runtime exposure, as the finding itself measured: `ApiDocsGuard` refuses the
  boot when the docs flags are enabled on a non-dev/test profile, and
  `SecurityConfig` keeps `/v3/api-docs*` + `/swagger-ui*` behind
  `anyRequest().authenticated()` outside dev/test.
- Both of the finding's suggested fixes cross my lane's boundaries:
  (a) "say so where the guard is justified" edits `ApiDocsGuard` — **guards are
  off-limits in my brief**; (b) "generate a public-subset document for the committed
  file" breaks the file's other job (the frontend contract read by the FE contract
  specs + `OpenApiSnapshotIT`) — a contract change, not logging/consistency.
- **Verdict: still real as a fact, accepted trade-off (Low, report-only). Filed on
  the board for the owner; no change made.**

### P3-B.3 — F9: loopback `X-Forwarded-For` trust on by default, guard warns only → **STILL REAL (documented residual) — out of scope, filed**

- Verified today: `application.yml:239` `trust-loopback: ${RATELIMIT_TRUST_LOOPBACK:true}`;
  the same `true` default in the five `@Value` bindings (`AuthController`,
  `AccountController`, `VerificationController`, `LocationController`,
  `SecurityConfig:203`). `config/LoopbackXffTrustGuard` still warns (never refuses)
  on a non-dev/test deploy — and its javadoc says that is deliberate: "left to the
  operator … never refused: refusing would break the documented dev workflow the
  default exists for" (the local Angular proxy runs on loopback).
- The finding's two proposed fixes both cross my boundaries: (a) a hard cap/LRU bound
  on `TokenBucketRateLimiter.buckets` is a **behaviour change to the limiter
  infrastructure shared by all nine buckets** (my brief allows exactly one behaviour
  change — the throttle, which exists); (b) the memory-consequence sentence belongs
  in the guard's text — **guards off-limits**.
- Partial mitigation already in the tree since the sweep: the bucket map is swept
  (1024-entry threshold, 1 h idle expiry — `TokenBucketRateLimiter.maybeSweep`), but
  an attacker rotating fresh keys every <1 h still outruns the sweep, so the residual
  stands as documented.
- **Verdict: still real, by design. Filed on the board; no change made.**

### P3-B.4 — F10: the HEAD-answers-like-GET comment overstates what it does → **STILL REAL (mildly) — FIXED (comment-only)**

- The fix itself (media-only HEAD permit, `3bad79b`) is unchanged: the HEAD matcher
  exists only for `/api/media/**` (`SecurityConfig.java:275-276`); `HEAD /api/shelters`
  and `HEAD /api/guidance` still fall to `anyRequest().authenticated()` → 401
  anonymous — deny-by-default, the safe direction, and the behaviour is PINNED by
  `security/GuidanceAuthorizationIT.thePublicMediaRouteAnswersHeadLikeGet` ("every
  protected route still reject an anonymous HEAD with 401").
- The comment, however, was unchanged since `3bad79b` (verified:
  `git diff 3bad79b..HEAD -- SecurityConfig.java` shows no HEAD-context changes) and
  carried the overstatement the finding named — the principle sentence
  "a public, permit-all asset must answer HEAD the way GET does" reads as a general
  rule while only the media path gets it.
- **Fix applied (comment-only, behaviour untouched):** the comment now states the
  media path is "the ONE public surface that answers HEAD the way GET does … the
  other public GETs are deny-by-default, answering HEAD with 401" — exactly what
  `GuidanceAuthorizationIT` pins (`SecurityConfig.java:266-274`). Same pass: removed
  the duplicated "pages are / pages are" words in the adjacent guidance comment
  (a leftover of `3bad79b`'s re-wrap, `:261-262`). The one doc anchor in the file
  (`SecurityConfig.java:183-188`, the `setExposedHeaders` clause) sits ABOVE the
  edit — no anchor shift owed.
- **Verdict: fixed (the finding's "narrow the comment" option; the behaviour option
  — extending HEAD to other public GETs — is a behaviour change the task does not
  require and the deny-by-default direction is the safe one, left alone).**

### P3-B.5 — F11: `AdminSeeder` logs the env-provisioned admin's FULL e-mail at INFO on every boot → **STILL REAL — FIXED (logging)**

- Verified still present at the exact lines the finding named:
  `AdminSeeder.java:96` ("Admin e-mail {} already in use — seeder is a no-op") and
  `:110` ("Seeded admin account {}") — both interpolating the full address, which is
  a live login contact (the account's only credential door), written to whatever log
  sink the deployment uses on every boot.
- **Fix applied:** both lines now pass `maskEmail(email)` — first character + `***`
  + full domain (`jane.doe@example.com` → `j***@example.com`), the same mask rule
  (and the same PII rationale in the javadoc) as the sender classes
  (`SmtpPulseSmtpSender.maskEmail`, `TwilioSmsSender.maskPhone` keep their local
  copies; consolidating the three is the recorded P2-4 duplication item for a
  dedicated lane). New helper: `AdminSeeder.java:113-128`. An @-less misconfigured
  address logs the fixed placeholder `***`, never the raw value.
- I did NOT take the finding's secondary suggestion (WARN for the no-op branch):
  that branch means "the admin already exists from a previous boot" — the steady
  state hit on every subsequent boot — so WARN there would be boot noise, and the
  "no admin at all" case (`:83`, provisioning disabled) is a different,
  operator-intended state.
- No test pinned the log text (verified by grep); the seeder suites pass
  unmodified: `AdminSeederTest` 7/7 → now **8/8** (+1, see below), `AdminSeederIT` 5/5.
- New pin: `AdminSeederTest.anAtLessConfiguredAddressIsStillSeeded` — exercises the
  mask's @-less branch through the public path (the seeder seeds what it is given;
  the log argument evaluates to the placeholder) so the branch is covered, not just
  present. The earlier draft of the helper had an additional null branch that was
  unreachable (the `run()` blank-guard runs first) — removed rather than left as
  dead defensive code (run rule: delete what is dead).

---

## P3-C — Backend API/logging polish (3 items)

### P3-C.1 — Finding 12: nine `log.error` sites pass `e.getMessage()`/`e.toString()` instead of the throwable → **ALREADY FIXED** (before this lane)

All nine named sites now pass the throwable as the final argument (stack trace
preserved). `grep -rn 'log.error' src/main/java` — 14 sites total, and
`grep -rn 'log\.\(warn\|error\|info\|debug\)' src/main | grep -E '\.(getMessage|toString)\(\)'`
→ **0 hits**:

| Finding's site | Current state |
|---|---|
| `FileVerificationSendLog.java:117,138,158` | `:106, :127, :147` — all pass `e` |
| `ShelterImportService.java:136,218` | `:114` — passes `e`; `:259-260` — passes `e` (the multi-line audit-row catch) |
| `RetentionService.java:112` (`e.toString()`) | `:112` — passes `e` |
| `TwilioSmsSender.java:102` | `:101` — passes `ex` (masked phone as the format arg) |
| `SmtpPulseSmtpSender.java:61` | `:60` — passes `ex` (masked e-mail as the format arg) |
| `SmsTestController` (dev test controller) | `:86` — passes `ex` |
| `EmailTestController` (dev test controller) | `:89` — passes `ex` |

(Line numbers drifted because the lanes rewrote these classes after the sweep; the
sites are the same statements in the same classes.) `operations.md:197`'s
alert-on-ERROR-volume workflow now gets real stack traces from all of them.
**Verdict: already fixed — no change made.**

### P3-C.2 — Finding 13: the one `@ExceptionHandler` outside the advice duplicates the error-body builder (and had an unused parameter) → **STILL REAL (the handler half) — FIXED (consistency)**

- The "unused parameter" half was already fixed by the SIMPLIFY-ADMIN-CTRL lane
  (board entry: dead `HttpServletRequest servletRequest` deleted from `update`).
- The handler duplication was still real: `AdminSiteTextController` carried a local
  `@ExceptionHandler(SiteTextValidationException.class)` that hand-built the
  `ErrorResponse` from an injected `Clock`, so a change to the shared builder would
  not reach it — and (as the finding put it) a future caller of
  `SiteTextsService.update` outside this controller would get a 500.
- **Fix applied (finding's suggested fix, verbatim in spirit):** the mapping moved
  into the shared advice's plain-400 family — `ApiErrorHandler.java:40` (import),
  `:160-164` (javadoc bullet), `:174` (`SiteTextValidationException.class` in the
  `badRequest` set, next to `InvalidShelterException`'s slot). The local handler and
  the now-dead `Clock` injection (field, constructor param, three imports) are
  deleted from `AdminSiteTextController` (now 53 lines, zero `@ExceptionHandler`
  — verified `grep -c ExceptionHandler` → 0).
- **Behaviour-preserving proof:** the shared `error(...)` builder produces
  `ErrorResponse(clock.instant(), 400, "Bad Request", ex.getMessage(),
  request.getRequestURI())` — field-for-field the same as the deleted local builder
  (same injected `Clock` bean, same message from the exception, same URI on a direct
  dispatch). The 400s are status-pinned, not message-pinned, and green unmodified:
  `SiteTextsApiIT` 8/8. No OpenAPI annotation was touched →
  `OpenApiSnapshotIT` 1/1, snapshot byte-identical. `ApiErrorHandlerTest` 12/12.

### P3-C.3 — Finding 8: the "malformed request" family answers a bare "Malformed request" naming nothing → **STILL REAL — NOT FIXED (API-message contract change; filed)**

- Verified still real: `ApiErrorHandler.java:97-102` — `MethodArgumentTypeMismatchException`,
  `MissingServletRequestParameterException`, `HttpMessageNotReadableException`,
  `ConstraintViolationException`, `MissingServletRequestPartException` all collapse
  to the fixed string `"Malformed request"`, so `?limit=abc` and
  `?source=PAASETEAMET` still get the same unhelpful 400.
- Why I did not fix it: the finding's fix (interpolate the parameter name,
  e.g. `"Malformed request: source"`) changes **response bodies** — an API contract
  change, not logging/consistency. The string is pinned in three backend test files
  (`ApiErrorHandlerTest:123`, `ApiErrorHandlerClientErrorsMvcTest:87`,
  `AdminMediaClientErrorsIT:116`) and documented as the contract in the frontend
  (`frontend/src/app/shared/error-copy.ts:69`: "the malformed-body 400s say
  'Malformed request' (no field prefix)") — i.e. fixing it touches the frontend
  contract my brief freezes. My brief allows exactly one behaviour change (the
  throttle); this is a second one.
- **Verdict: still real, Low, filed on the board for the owner (one decision:
  name the parameter or keep the uniform vocabulary).**

---

## Gate

Command (per run rule 2/7, detached, exit file read):
`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`

- **Attempt 1 — shared working tree:** exit 1. **Tests: 1365 run, 0 failures, 0
  errors, 0 skipped** (baseline 1364 + 1 my new IT test). The ONLY failure:
  `jacoco:check` — "lines covered ratio is 0.92, but expected minimum is 0.93" —
  accompanied by jacoco's own warning **"Classes in bundle 'shelter-map' do not
  match with execution data"** for exactly four classes:
  `auth/PasswordResetService`, `auth/PasswordResetService$ResetDecision`,
  `auth/PasswordResetToken`, `app/ReporterTrustEvaluator` — **none of which I
  touched**. This is the rule-7 interference class (a concurrent build in the shared
  repo invalidated the execution data of in-flight classes mid-gate; the four
  classes' sources were concurrently modified in the shared working tree by a
  parallel lane — `git status` shows `PasswordResetService.java`,
  `PasswordResetToken.java`, `ReporterTrustEvaluator.java` modified by it, and a
  sibling P3 lane was gating concurrently on the same flock). The 0.93→0.92 drop is
  arithmetically consistent with those four classes' coverage being voided
  (~130 executable lines out of the bundle), not with my diff.
- **Attempt 2 — pristine copy gate (authoritative for this lane):** HEAD
  (`git archive 2a7ef62`) + my six files only, at `/tmp/p3-sec-log-gate` (the same
  copy-gate pattern the sibling P3 lanes use; verified by `diff -r` that the ONLY
  deltas vs the live tree are other lanes' in-flight files, all excluded).
  Result: see §Result below.

### Result

**Authoritative gate (attempt 2, pristine copy): exit 0 — Tests run: 1366,
Failures: 0, Errors: 0, Skipped: 0; PMD `pmd:check` clean (failOnViolation,
priority ≤ 2); jacoco 0.93 line-coverage floor met; `BUILD SUCCESS` in 2:20 min
(finished 2026-09-27T23:05:42+03:00; log `/tmp/p3-sec-log-gate.log`, exit file
`/tmp/p3-sec-log-gate.exit`).** No missing-class wall, no foreign failures — the
copy contains only HEAD + this lane's six files, so the run attributes cleanly.

The pristine gate also re-confirms every pin in the live tree: my new IT 1/1,
`AdminSeederTest` 8/8 (incl. the new @-less-address pin), `SessionLifecycleThrottleIT`
1/1 unmodified, `SiteTextsApiIT` 8/8, `OpenApiSnapshotIT` 1/1, `ApiErrorHandlerTest`
12/12, `DocumentationFactsTest` green (the `SecurityConfig.java:183-188` anchor is
above my comment edit — no shift).

**Test count: 1364 → 1366** (+2, both additive, nothing deleted or weakened):
(1) `SessionLifecycleThrottleRetryAfterIT.aDrainedSessionBucket429sWithARetryAfterCountdown`
(the P3-B.1 Retry-After proof); (2) `AdminSeederTest.anAtLessConfiguredAddressIsStillSeeded`
(the P3-B.5 mask-branch pin). Note: attempt 1's tree ran 1365 = 1364 + only the new
IT — the `AdminSeederTest` case landed after that run's compile.

---

## Unverified / out of scope (named)

1. **F7 / F9 / Finding-8 fixes** — deliberately not made (both suggested fixes each
   cross the guard/behaviour/contract boundaries of this brief); filed on the board
   with the file:line so the owner can assign them.
2. **Live HTTP 429 with Retry-After** — the new IT is MockMvc-level, like every
   other throttle IT in the suite (house style; no live-server IT layer exists).
3. **The shared-tree interference** — mechanism proven (concurrent in-flight classes
   vs jacoco execution data; the four classes named), the other lane's identity not
   (its build was in-flight in the shared tree; a sibling lane's gate was observed
   running concurrently on the same flock from a `/tmp` copy). If the parent sees
   the same jacoco voiding on other lanes' gates, the culprit is whatever rebuilds
   the shared `target/` outside the flock.
4. **`DevSmsSender`/`DevSmtpSender` log full contact + message body at INFO**
   (`verification/DevSmsSender.java:25`, `DevSmtpSender.java:25`) — the same PII
   class as F11, but dev-profile-only senders whose full output is the point (the
   "[DEV …]" prefix IS the local delivery surface), and outside the finding's named
   sites. Reported, not touched.
5. The `@-less admin e-mail` seeding behaviour pinned by my new
   `AdminSeederTest` case (the seeder never validates the address format) — a
   pre-existing contract I pinned to cover the mask branch, not a change.
