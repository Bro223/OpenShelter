# TEST-QUALITY-AUTH — read-pass + mutation pass over `src/test/java/ee/sheltermap/auth/**` and `src/test/java/ee/sheltermap/security/**`

**Lane:** TEST-QUALITY-AUTH · **Branch:** `code-review` (no commits) · **Scope (exclusive):** `src/test/java/ee/sheltermap/auth/**` (23 test classes + 11 doubles/utilities) and `src/test/java/ee/sheltermap/security/**` (6 test classes) — 40 files, 6455 LOC. `config/**` (owned by another lane), `persistence/**` base classes, main sources and the frontend excluded.
**Method:** full manual read-pass of all 40 files; a lexical comment-swallowing scanner (validated against both the unterminated-to-EOF and the closed-too-late shapes of the cb57d84 guidance defect); 15 mutation instances of significant auth/security behaviours in a throwaway worktree (detached at 58824ca, every mutation reverted, worktree removed after use — evidence logs kept) in `/tmp/test-quality-auth/*.log`.

---

## 1. Read-pass findings (file:line evidence)

### 1.1 Test name promises a tampered-token refusal the body never exercised (FIXED)

`auth/JwtTokenServiceTest.java` — `validateAccessTokenRejectsGarbageAndTamperedTokens`:

```java
assertThatThrownBy(() -> tokens.validateAccessToken("garbage"))
        .isInstanceOf(InvalidAccessTokenException.class);
```

The name pins **two** refusal families — garbage AND tampered — but the body only exercised
garbage. The tampered case (a structurally valid JWT whose `sub` claim was forged while
keeping the original signature) was never pinned. This matters precisely because
`JwtTokenService.validateAccessToken` wraps EVERY parse failure into the same
`InvalidAccessTokenException` (its `catch (RuntimeException)`): a regression that stopped
verifying the HMAC but kept the coarse wrapping would still throw the same exception type
for a forged token — a test asserting only the exception type cannot see it. Mutation M13
(remove `.verifyWith(key)`) confirms exactly that: the old garbage-only test stayed green
while the valid-token validations went red.

**Fix (strengthened, nothing removed):** the test now forges the `sub` claim in the payload
segment of a real issued token (surgical `"sub":"<id>"` replacement, re-encoded) and asserts
the refusal is a **signature mismatch** — `hasCauseInstanceOf(SignatureException.class)`
(jjwt 0.12.7). The cause pin is what the type pin cannot provide: with signature
verification removed, the cause is `UnsupportedJwtException` and the test goes red
(M13b). The forged-payload swap itself is asserted (`assertThat(forged).isNotEqualTo(payload)`)
so the fixture cannot silently stop tampering.

### 1.2 Access-token `exp` claim unverified at the service level (FIXED — new test)

No test in this tree validated that an access token past its 15-minute TTL is refused by
`validateAccessToken` itself (the HTTP-level pin `config/JwtAuthenticationFilterTest.expiredTokenLeavesTheRequestAnonymous` is in another lane's file; the refresh side was pinned by
`refreshWithExpiredTokenFails`, but the ACCESS side was not in this tree). New test
`validateAccessTokenRejectsExpiredTokens` reuses the class's existing later-clock idiom
(issued at `NOW`, validated at `NOW + 16 min`).

### 1.3 Hollow single-use step — the 400 came from `@Size(min=8)`, not the used code (FIXED, mutation-proven)

`auth/AuthApiIT.java` — `passwordResetWithEmailedCodeChangesPasswordAndRevokesSessions`,
tail step:

```java
// the code is single-use -> second confirm is 400
... .content("{\"email\":\"mari@example.ee\",\"code\":\"" + code + "\",\"newPassword\":\"again\"}")
        .andExpect(status().isBadRequest());
```

`"again"` is 5 characters — below the 8-character boundary minimum, so the 400 is produced
by `@Size(min=8)` validation on `newPassword` **before the service is ever reached**. The
single-use rule the comment names was never the reason. Mutation M4 (remove
`stored.markUsed(...)`) proves it: this step stayed green in `AuthApiIT` while every other
single-use pin in the run (`PasswordResetServiceTest.resetCodeIsSingleUse`,
`resetWithUsedCodeDoesNotCountAsAnAttempt`,
`resetWithValidCodeUpdatesPasswordMarksUsedAndRevokesAllSessions`,
`sixthReissueOnTheSameUtcDayIsSkippedButStillSucceeds`,
`PasswordRecoveryFlowIT.aUsedCodeCannotBeReused`) went red.

**Fix (strengthened, nothing removed):** the second confirm now uses a VALID-length
password (`"again-123"`, 9 chars) so the 400 can only be the used-code refusal; the comment
records the mutation proof. Re-verified red with M4 applied (M4b).

### 1.4 Shadowed clock helper — nested `MutableClock` duplicating the package-level one (FIXED, simplification)

`auth/ContactChangeServiceTest.java` defined a private nested `MutableClock extends Clock`
(25 lines: `advanceSeconds`) that shadowed the package-level `ee.sheltermap.auth.MutableClock`
(used by 6 sibling classes, `advance(Duration)`). A reader resolving `MutableClock` in this
file cannot tell which one compiles in. Simplified to the shared helper: nested class
deleted, the single call site became `clock.advance(Duration.ofSeconds(61))`, the now-unused
`Clock`/`ZoneId`/`ZoneOffset` imports removed. Behaviour-identical (same fixed instant,
same advance).

### 1.5 What the read-pass found NO evidence of

- **Comment-swallowing (the cb57d84/guidance defect class):** the lexical scanner
  (block-comment state machine flagging lines swallowed inside a comment and comments
  running to EOF; validated to catch BOTH the unterminated-javadoc and the
  closed-two-methods-too-late shapes on synthetic files) reports **0 findings** across the
  whole `src/test/java/ee/sheltermap` tree.
- **`@AfterEach`/`@BeforeEach` not compiling in or silently no-op:** all lifecycle hooks in
  the 29 test classes sit on real methods (the scanner proves no annotation line sits inside
  a comment); the only empty-cleanup candidate, `RefreshRotationRaceIT.cleanUpCommittedRaceRows`,
  is a real, scoped delete (and its `ownUserId` default-0 makes a pre-setup failure a
  no-op, not a wipe of other lanes' rows).
- **Vacuous `instanceof`/`isNotNull()`-style assertions:** the `isInstanceOf(AdminUser.class)`
  checks (`AdminSeederTest`, `AdminSeederIT`, `PiiAtRestIT`) are on variables statically
  typed `RegisteredUser`/`Object` where `AdminUser` is a REAL subclass — they fail when the
  seeder produces a plain registered row. The `isNotNull()` uses (`RefreshRotationRaceIT`
  winner token, `AccountControllerIT` stored user) guard values that can be null.
- **Stub-echo hollowness:** `StubTokenService.RESPONSE` is echoed in
  `AuthServiceTest.loginSuccessReturnsTokenResponse`, but the same test pins the delegation
  with `tokens.lastIssued().getId() == mariId()` — a hardcoded response would fail it.
  All hand-rolled fakes (`RecordingSmtpSender`/`RecordingSmsSender` with `refuseNext()`,
  the four in-memory repositories, `StubPasswordHasher` which deliberately mirrors the
  dummy-hash case so the equalizer path stays exercised) are CAPTURING doubles asserted on
  captured state. No Mockito, no `assume*`, no skipped tests in the scope.
- **Security assertions that pass with the protection removed:** the read pass found exactly
  the two in §1.1/§1.3 — both fixed and mutation-re-verified.

## 2. Mutation table (throwaway worktree detached at 58824ca, every mutation reverted)

15 instances of significant auth/security behaviours (16 rows — M13b and M15 are re-runs
proving the NEW pins from §1.1/§1.2, not new behaviours). "Killed by" = tests that went
red with the mutation applied (scoped runs under the shared maven lock; full logs in
`/tmp/test-quality-auth/`). M11's first attempt was a false kill (the `return;`-prefix
mutation was rejected by javac as an unreachable statement — no tests ran); M11b is the
corrected, compilable form.

| # | Mutation (production file) | Behaviour removed | Killed by |
|---|---|---|---|
| M1 | `auth/AuthService.login` — existence guard disabled (`if (false && user == null)`) | unknown contact + literal "dummy" refused with the generic 401 (pre-fix shape: NPE → 500, an account-existence oracle) | `AuthServiceTest.loginUnknownContactWithDummyPasswordThrowsSameGenericError`, `AuthApiIT.loginWithDummyPasswordIsIndistinguishableFromAWrongPassword` |
| M2 | `auth/AuthService.login` — dummy-hash verify skipped for absent user/hash | every login runs exactly ONE Argon2 verify (the timing equalizer) | `AuthServiceTest.loginRunsExactlyOneHashVerificationForUnknownAndKnownContacts` (verify count 0 instead of 1 after the ghost login) |
| M3 | `auth/PasswordResetService.reset` — attempts-lockout check disabled | the 5-wrong-guesses code lockout (even the correct code is then refused) | `PasswordResetServiceTest.resetFailsAfterMaxAttemptsEvenWithTheCorrectCode`, `AuthApiIT.passwordResetCodeIsLockedOutAfterFiveWrongAttempts`, `PasswordRecoveryFlowIT.fiveWrongCodesLockTheCodeEvenAgainstTheRightOne` |
| M4 | `auth/PasswordResetService.reset` — `markUsed()` removed | one-time-code single use | `PasswordResetServiceTest.resetCodeIsSingleUse` + 3 more unit pins, `PasswordRecoveryFlowIT.aUsedCodeCannotBeReused`. **SURVIVOR:** `AuthApiIT.passwordResetWithEmailedCodeChangesPasswordAndRevokesSessions` tail step — the hollow §1.3 assertion; fixed, then killed by M4b |
| M5 | `persistence/SpringDataRefreshTokenRepository.revokeByTokenHash` — `and r.revokedAt is null` dropped from the conditional UPDATE | the atomic single-claim of a racing double-refresh | `RefreshRotationRaceIT.concurrentDoubleRefreshRedeemsTheTokenExactlyOnce` (both racers redeem → `successes` 2 instead of 1). `JwtTokenServiceTest.refreshWithRevokedTokenFails` correctly stayed green (the sequential pre-check is a different line) |
| M6 | `auth/AccountService.deleteAccount` — private-home purge removed | declared PRIVATE homes purged on erasure | `AccountDeletionIT.deletionPurgesPrivateOrphansPublicAndCascadesTheAccount` (private row survived), `AccountServiceTest.deleteAccountPurgesPrivateHomesAndOrphansPublicOnesWithoutTouchingTrustState` |
| M7 | `auth/AccountService.deleteAccount` — provisioned-admin refusal disabled | the admin self-erasure 403 | `AccountDeletionIT.theProvisionedAdminCannotDeleteTheAccount`, `AccountServiceTest.deleteAccountForTheProvisionedAdminIsRefusedAndErasesNothing` |
| M8 | `security/PiiCrypto.decrypt` — AES/GCM → AES/CTR (integrity check gone) | tamper detection on stored envelopes | `PiiCryptoTest.aTamperedEnvelopeFailsTheGcmTag` + `encryptThenDecryptRoundTrips` + `encryptionIsRandomizedPerCall` + `unwrapForHashPassesPlaintextThroughAndDecryptsEnvelopes` (unauthenticated decryption breaks the round trip too) |
| M9 | `config/JwtAuthenticationFilter` — ADMIN authority granted to EVERY authenticated user + `api/AdminAccess.requireAdmin` — kind check disabled | the admin guard (both defence-in-depth lines at once — a single-line mutation survives by design) | `AdminAuthorizationIT.aRegisteredNonAdminGets403OnAdminEndpoints`, `GuidanceAuthorizationIT.aRegisteredNonAdminGets403OnEveryAdminGuidanceAndMediaRoute` (all 11 admin routes) |
| M10 | `auth/TokenBucketRateLimiter.Bucket.tryAcquire` — capacity check disabled (`if (true)`) | the per-IP token-bucket burst caps | 12 tests: `TokenBucketRateLimiterTest` (6), `AuthRateLimitIT` (4, incl. the spoofed-XFF separate-bucket test), `SessionLifecycleThrottleIT.refreshAndLogoutShareAPerIpBucketAnd429WhenDrained`, `VerificationThrottleIT.burstOfVerificationRequestsIsThrottledWith429` |
| M11b | `auth/ContactChangeService.enforceCooldown` — early return (cooldown removed) | the resend cooldown (429 + Retry-After until the anchor + 60 s) | `ContactChangeServiceTest.resendWithinCooldownIsThrottledAndReplacesAfterCooldown`, `AccountControllerIT.resendWithinCooldownReturns429` |
| M12 | `auth/AdminSeeder.run` — create-if-absent early return disabled | the never-touch-existing restart idempotency | `AdminSeederTest.preExistingUserWithSameEmailIsNeverTouched` + `caseVariantOfTheSameEmailIsTreatedAsExisting` + 5 `AdminSeederIT` tests (duplicate email_hash insert) |
| M13 | `auth/JwtTokenService.validateAccessToken` — `.verifyWith(key)` removed | HMAC signature verification (the old test set) | `JwtTokenServiceTest.issueReturnsAccessAndRefreshAndStoresRefreshHashed`, `refreshRotatesAndRevokesThePresentedToken` (the VALID-token validations die — the old garbage-only tamper-named test stayed green: the coarse wrapping masks the removal, exactly the §1.1 hole) |
| M13b | same as M13, with the §1.1/§1.2 fixed test file in place | same | `validateAccessTokenRejectsGarbageAndTamperedTokens` (forged-`sub` case: the cause is no longer `SignatureException` — the type-only pin would have stayed green) + the two M13 kills; `validateAccessTokenRejectsExpiredTokens` correctly stayed green (its killer is M15) |
| M14 | `verification/RollingContactOtpLimiter.tryAcquire` — window-full check disabled | the per-contact rolling OTP cap (the abuse-limits 429 + Retry-After) | `OtpContactCapIT.phoneCapThrottlesThirdRequestToTheSamePhone`, `emailCapThrottlesThirdRequestToTheSameEmail`, `registerEmailCapThrottlesRepeatedRegistration` (all 3, `expected:<429> but was:<202>`) |
| M15 | `auth/JwtTokenService.issue` — the `exp` claim no longer written on the access token | access-token expiry enforcement (the §1.2 new pin) | `JwtTokenServiceTest.validateAccessTokenRejectsExpiredTokens` (a never-expiring token now validates fine 16 min later — exactly the behaviour the new test forbids) |

**Not hollow by mutation:** after the §1.1/§1.3 fixes, 0 survivors across 15 instances.
Every sampled behaviour — authentication (existence guard, timing equalizer, signature
verification, expiry), one-time codes (lockout, single-use), throttling (bucket caps,
resend cooldown, rolling contact cap), account deletion (private purge, admin refusal),
authorization (admin guard, seeder idempotency) and PII at rest (GCM integrity) — is pinned
by at least one real assertion.

## 3. Fixes applied (3 test files, nothing else in scope)

| File | Change | Coverage effect |
|---|---|---|
| `auth/JwtTokenServiceTest.java` | `validateAccessTokenRejectsGarbageAndTamperedTokens` gains the forged-`sub` tampered case pinned to a `SignatureException` cause (§1.1); NEW `validateAccessTokenRejectsExpiredTokens` (§1.2) | strengthened + 1 new test |
| `auth/AuthApiIT.java` | single-use step's second confirm uses a valid-length password so the 400 can only be the used-code rule (§1.3) | strengthened |
| `auth/ContactChangeServiceTest.java` | nested shadowing `MutableClock` deleted in favour of the package-level helper; one call site migrated to `advance(Duration)` (§1.4) | simplification, behaviour-identical |

No assertion was weakened or deleted anywhere; no test was deleted. **No production code
was changed by this lane** (all mutations ran in the throwaway worktree and were reverted).

**Production bugs proven: none.** The two hollow pins were missing-test defects, not
production defects — the production code behaved correctly; the guard simply passed while
checking nothing (the §7 recurring hazard, both instances fixed and mutation-re-verified).

## 4. Gate

(run detached under `flock /tmp/openshelter-mvn.lock`; exit file read)

| Gate | Command | Result |
|---|---|---|
| 1 (full) | `mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — `Tests run: 1340, Failures: 0, Errors: 0, Skipped: 0`; PMD clean; `All coverage checks have been met` (0.93 floor); OpenApiSnapshotIT green. Ran on HEAD `25a6b9a` = `58824ca` + one frontend-only commit (zero Java-file delta, so the mutation worktree at `58824ca` and the scoped runs remain representative). No foreign failures at this HEAD (the `config/DocumentationFactsTest` paging.ts anchor failure other lanes' gates carried was closed by the 58824ca anchor commit). |

**Test count: 1339 (lane baseline) → 1340 = +1 this lane** — `JwtTokenServiceTest.validateAccessTokenRejectsExpiredTokens` (a new test method; the tampered case was folded into the existing method, the other changes are in-test).

## 5. Foreign / out-of-scope observations (named per run rule 4)

- `config/JwtAuthenticationFilterTest` (another lane's file) already pins the expired-access-token → 401 HTTP path; §1.2 adds the missing SERVICE-level pin in this lane's file, not a duplicate.
- `api/UserSuspensionIT` (another lane's file) pins the suspension → login 403 / in-flight-token death; no gap left in this lane's scope.
- `docs/autopilot/CODE-REVIEW-NOTES.md` — board entry appended by this lane at the end.

## 6. Unverified / residual

- The mutation sample is 15 instances of the scope's significant behaviours (deliberate
  subset per the brief). Read but not mutation-verified: the anti-enumeration uniformity
  bodies (`requestResetForUnknownEmailReturnsTheSame200AsAKnownEmail` byte-compares the
  acks — concrete by reading), the reissue cooldown + per-UTC-day cap (pinned by
  `PasswordResetServiceTest` assertions on row counts — concrete by reading), the
  blind-index lookup paths (pinned by `PiiAtRestIT` round-trips + `loginResolvesByBlindIndexCaseInsensitiveEmailAndPhone`), the V13 migration matrix, and the admin guidance/media
  lifecycle (every step status-pinned). None showed a red flag in the read-pass.
- M5 mutated the repository-level claim only; the service-level `revoke(...) == 0` check
  in `JwtTokenService.refresh` is pinned indirectly (M5's kill requires both lines to hold
  for the loser to see 0 rows — the race test asserts the observable "exactly one").
- All mutations reverted (verified by `git status --porcelain` after every step); the
  worktree was removed after the campaign. The evidence logs in `/tmp/test-quality-auth/`
  are the durable record (the tmp dir may be cleared before the parent reads them).
