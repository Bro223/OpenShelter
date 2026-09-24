# SIMPLIFY-VERIFICATION — verification core readability pass

**Lane:** SIMPLIFY-VERIFICATION · **Branch:** `code-review` (HEAD `7f5c5f1`)
**Scope (exclusive):** `src/main/java/ee/sheltermap/verification/**` (24 files, 1,665 lines) + `src/test/java/ee/sheltermap/verification/*` (12 files, 1,376 lines). `src/main/java/ee/sheltermap/auth/VerificationService.java` does not exist — the service lives in the verification package, as assumed by the brief.
**Mode:** behaviour-preserving. No threshold, cooldown, cap, check order, message, transaction boundary or public API changed. No test deleted, weakened or modified.
**Gates:** baseline **exit 0** (1342/1342) → post-change **exit 0** (1342/1342, PMD clean, jacoco 0.93 floor met). Detail §5.

---

## 1. What the target was

The verification core per the brief: one-time codes and their keyed hashes (`CodeHashes`, `PendingVerification`, the providers), the channel senders (`TwilioSmsSender`, `SmtpPulseSmtpSender`, dev fakes), cooldowns and daily caps (`VerificationSendLog`/`FileVerificationSendLog`, `VerificationProperties`), the rolling per-contact cap (`RollingContactOtpLimiter`), the anti-spam check order (the recon's "notable logic" in `VerificationService.requestVerification`), and the pruning of spent send-log entries (retention + prune in `FileVerificationSendLog`).

## 2. What changed (9 files, all in `src/main/java/ee/sheltermap/verification/`)

| File | Lines (before → after) | Change |
| --- | ---: | --- |
| `VerificationService.java` | 277 → 311 | `requestVerification` split into named steps (below); dead code removed; class javadoc now spells the check order; planning/history refs cut |
| `FileVerificationSendLog.java` | 181 → 187 | shared `(userId, level)` predicate extracted to `matches`; `java.time.Duration` FQCN → import; "(product decision)" → the constraint itself |
| `TwilioSmsSender.java` | 169 → 165 | catch comment deduplicated; SDK-timeout comment cut from 12 to 8 lines (constraint kept) |
| `SmtpPulseSmtpSender.java` | 82 → 81 | catch comment deduplicated |
| `CodeHashes.java` | 67 → 66 | class javadoc trimmed (the one-spelling constraint kept, section-number pointer cut) |
| `RollingContactOtpLimiter.java` | 140 → 140 | "(abuse-limits)" plan-section tag cut |
| `VerificationSendLog.java` | 54 → 54 | "(the same silent-skip rules as before)" → "(silent skip)" |
| `VerificationProperties.java` | 21 → 21 | "(Twilio plan + hardening)" cut |
| `PendingVerification.java` | 77 → 77 | **stale comment fixed**: "SHA-256 of the code" → "the one-way hash of the code (the keyed `v2:` form, or the legacy unkeyed SHA-256)" — the stored hash has been the keyed form since the `PiiCrypto.codeHash` migration; the old wording described behaviour the code no longer has |

File total 1,665 → 1,699 (+34): the growth is javadoc on the new named steps of `requestVerification` and the check-order list on the class — the constraints that were previously buried as inline comments in the one 76-line method are now attached to the step that enforces each one, stated once.

### 2.1 `VerificationService.requestVerification` — 76 → 33 lines (declaration to closing brace)

Before: one method holding the 409 guard, an inline if/else-if `SendDecision` computation, the contact-cap block with a 9-line comment, the send/record/persist tail — plus a 33-line javadoc carrying "(reviews F1)" review-history.

After, flat with early returns, each step named for what it enforces:

```java
public void requestVerification(RegisteredUser user, VerificationLevel level) {
    if (user.levels().contains(level)) {
        throw new AlreadyVerifiedException(level);            // 409, before any send/budget
    }
    VerificationProvider provider = providerFor(level);
    long userId = user.getId();
    Instant now = clock.instant();
    String contact = contactFor(user, level);

    requireUserThrottleAllows(userId, level, now);            // cooldown, then daily cap → 429
    requireContactCapAllows(contact);                         // rolling per-contact cap → 429 + alert

    PendingVerification pending;
    try {
        pending = provider.request(user);
    } catch (CodeSendFailedException channelRefused) {
        alerts.codeSendFailure(contact, provider.providerCode());
        return;                                               // no pending, no slot, plain ack
    }
    sendLog.record(userId, level, contact, now);              // slot consumed ONLY after acceptance
    replacePending(userId, level, now, pending);              // read-delete-save, one transaction
}
```

New named steps (all `private`, same package, no signature visible to callers):
- `requireUserThrottleAllows` + `userThrottleDecision` — the per-(user, level) gate; mirrors the send log's `tryRecord` decision shape (COOLDOWN → DAILY_CAP → OK) with the same silent-skip rules, `countToday` still evaluated lazily only when the cooldown passes.
- `requireContactCapAllows` — the `verify:`-namespaced rolling cap; alert-then-throw order preserved.
- `replacePending` — the read-delete-save tail, one transaction.

**One dead-code removal:** `Objects.requireNonNull(user, "user")` — unreachable (a null `user` NPEs at `user.levels()`, the method's first statement, in both the old and the new code). No other statement of the method was reordered, renamed or re-conditioned: same statements, same order, same arguments (including the single `clock.instant()` read feeding the checks, the record and the pending read), same catch type and alert call.

Also: the 409 guard's and the confirm guard's inline comments moved into the method javadocs (stated once, not twice); the "(reviews F1)" / "before it was three" review history is gone — the transaction-boundary constraint (send before any DB work; the read-delete-save is ONE transaction so a failure cannot leave the old code alive under the new one) is stated as a constraint.

### 2.2 `FileVerificationSendLog`

`countToday` and `lastSentAt` both filtered on the same `record.userId() == userId && record.level() == level` predicate — now one named `matches` helper (the log's key: one bucket per (userId, level)). The `startOfToday` expression, retention/prune constants, parsing (incl. the legacy 4-field form), the PII-no-persist rule and all IO behaviour are byte-identical.

### 2.3 What was deliberately left, and why

- **`VerificationSendLog.tryRecord`** — no production caller (the service deliberately uses read-only checks + record-after-accepts), but it is pinned by two tests (`VerificationServiceTest.tryRecordIsOneAtomicDecisionWithTheSameSilentSkipRules`, `FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` — a real 50-thread burst). Deleting it would delete tests: forbidden in this run. **Filed to the parent for an owner decision** (notes board).
- **`PendingVerificationDuplicateIT` legacy path** — the duplicate-read degradation (`findFirst` idiom) and the legacy unkeyed-hash acceptance it exercises were left exactly as pinned; only the javadoc's "pre-fix" history word was reworded to "a racy double send".
- **Senders' internals** — `TwilioSmsSender`/`SmtpPulseSmtpSender` touched for comment clarity only (allowed: "beyond readability"); the fail-fast credential check, the `TwilioApi` seam, timeout wiring, masking and the refuse→`false` contract are untouched.
- **`PhoneNumbers` relocation** (BE-RECON §1.2, would delete the `persistence → verification` edge) — the five importers outside my package make it a cross-lane move; filed on the notes board for the persistence/auth lanes, not done here.
- **The providers' `confirm` chains** — already flat early returns with the pinned order (level → expiry → attempts → keyed/legacy hash compare); nothing to split.
- **All 12 test files** — read in full, left byte-identical. They are the pins; none had planning-id comments or stale wording that needed a touch.

## 3. Evidence the pinned rules still hold (tests passed UNMODIFIED in the post-change gate)

| Pinned rule | Pinning tests (all green, unmodified) |
| --- | --- |
| 409-already-verified before any send/budget; idempotent re-confirm | `auth/VerificationControllerIT.reVerifyingAnAlreadyVerifiedLevelIsAConflictAndIdempotent` (end-to-end 409 + idempotent confirm); `api/ApiErrorHandlerMappingTest:84` (the 409 mapping); `VerificationServiceTest.confirmVerificationWithCorrectCodeAddsClaimAndDeletesPending` |
| Cooldown (per user+level) | `VerificationServiceTest.requestWithinCooldownIsThrottled`, `requestAfterCooldownElapsesSucceeds` (exactly 2 records after 61 s), `cooldownIsPerUserAndPerLevel` (cross-level and cross-user isolation, no log row on a throttled request) |
| Per-user daily cap + UTC-day boundary | `VerificationServiceTest.dailyCapBlocksFurtherSends`; `FileVerificationSendLogTest.countsOnlySendsFromToday` (yesterday-UTC send not counted); `tryRecordIsOneAtomicDecisionWithTheSameSilentSkipRules` (0/0 silent-skip, 0-cooldown skip, rejected decision records nothing) |
| Rolling per-contact cap (verify: namespace, honest Retry-After, nothing recorded on reject, disabled mode) | `VerificationServiceTest.perContactCapRejectsWithRetryAfterAndSendsNothing` (DEFAULT_MESSAGE + Retry-After = exactly 86 400 s + no second SMS); `RollingContactOtpLimiterTest` (8 tests: window expiry, contact isolation, key normalization, disabled ≤ 0, rejected acquire records nothing, sweep) |
| Check order: user gate before contact cap | `VerificationServiceTest` — with (0,0) properties the CONTACT cap alone fires (`perContactCapRejectsWithRetryAfterAndSendsNothing`); with the contact limiter disabled the user gate alone fires; a throttled user-gate request records nothing in the contact window (no second acquire visible: `sms.getMessages()` stays at 1) |
| Daily slot consumed ONLY after the channel accepts; a refused send never throws and never consumes a slot | `VerificationServiceTest.aSendTheChannelRefusedConsumesNoSlotPersistsNoPendingAndAlerts` (refused → no pending, `countToday` 0, `lastSentAt` null, alert-ring entry with `contact:+37250000000`, immediate free retry, exactly 1 slot once accepted); `aFailingChannelCannotBeUsedToBypassTheDailyCap` (10 refused attempts = 0 slots, cap still holds after recovery, `flaky.calls == 12`); sender-side `TwilioSmsSenderTest` (5) / `SmtpPulseSmtpSenderTest` (2) (refusal → `false`, never thrown) |
| Keyed code hashes with legacy acceptance until expiry | `EmailVerificationProviderTest` (7) / `PhoneVerificationProviderTest` (8) — stored hash via real `PiiCrypto.codeHash` (`v2:` keyed path, `TestPiiCrypto` does not override it), TTL 15 min / 5 min, attempts limit 5, expiry, level mismatch; the **legacy unkeyed SHA-256** path is pinned end-to-end by `PendingVerificationDuplicateIT` (2 ITs: rows stored as bare `sha256Hex`, confirm succeeds with the newest) |
| Pruning of the send log (retention + load-time prune + line cap) | `FileVerificationSendLogTest.survivesRestartAcrossInstances`, `ignoresCorruptedLines` (legacy 4-field form), `theContactIsNotPersistedInTheLogFile`, `fileIsCreatedOnFirstRecord` — see §6.1: the 2-day retention value itself has no dedicated pin (pre-existing) |
| One code at a time (invalidation pair, one transaction) | `VerificationServiceTest.requestVerificationTwiceKeepsOnlyOneActivePending`; `PendingVerificationDuplicateIT.twoActiveRowsForOneUserAndLevelReadAsOneInsteadOf500` (the duplicate-read degradation) |

Every one of these classes ran inside the full post-change gate (1342/1342) unmodified — `git status` shows zero changes under `src/test/`.

## 4. Anchor shifts

**None.** No citation in `docs/agent/00-CURRENT-STATE.md` references any file under `src/main/java/ee/sheltermap/verification/` or `src/test/java/ee/sheltermap/verification/` (grep-verified: 0 hits across the 90 anchored citations), and `DocumentationFactsTest` references none of them either — so no anchor pass is owed by this lane, and the guard stayed green (it is part of the 1342).

## 5. Gates (both under `flock /tmp/openshelter-mvn.lock`, detached, exit file read)

| Gate | Command | Result |
| --- | --- | --- |
| Baseline (pre-edit, pristine HEAD) | `mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — 1342/1342, coverage met (17:56:12→17:58:50; /tmp/simplify-verification/baseline.log) |
| Post-change (the sanctioned gate) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — **1342/1342, 0 failures**, PMD clean (no new high-severity findings), "All coverage checks have been met" (18:06:25→18:09:06; /tmp/simplify-verification/postgate.log) |

No wall of missing-class errors — the unlocked-build hazard (rule 7) did not materialize for this lane. One environment note: the concurrent SIMPLIFY-MEDIA lane was editing guidance files in the same checkout during my window. Their final writes (18:01:34) landed **before** my gate started (18:06:25) and their notes entry independently records my in-flight verification files as green at their 18:05:46 gate — the two gates agree on a stable tree. My diff is the 9 verification files + the notes board + this report; nothing guidance, api, auth, persistence or frontend.

## 6. Anything unverified / filed

1. **`RETENTION = 2 days` / `PRUNE_AFTER_LINES = 10 000` have no dedicated test** — no test feeds the file log an entry older than the retention window or a file past the line cap, so the prune arithmetic itself is not pinned (pre-existing gap; the logic is untouched by this lane). TEST-QUALITY-MISC already audited this suite (their notes entry records the one related finding, `InMemoryVerificationSendLog.countToday` counting all-time, as documented-and-inert).
2. **`tryRecord` production-dead but test-pinned** — filed to the parent on the notes board for an owner decision (keep as a documented seam or retire with its two tests).
3. **pi-lens ast-grep auxiliary scans** were deferred by the tooling throughout the session (coverage advisories only); the authoritative checks — Maven compile, PMD, the full test suite — are all green. The per-file LSP probes that did answer reported clean.
4. **No mutation pass in this lane.** The change is a pure expression refactor over a suite that two test-quality lanes had just mutation-audited (TEST-QUALITY-AUTH: OTP contact cap instance killed; TEST-QUALITY-MISC: 12/14 out of the box), and the pinned suite passed unmodified — but I claim the pin suite's green, not a fresh red-proof, as my evidence.
5. The baseline gate's tail (17:58:04/49) overlapped SIMPLIFY-MEDIA's last two guidance file writes; those writes post-dated the baseline's compile phase, so the baseline measured the compiled HEAD classes — and the post-change gate, which included their finished files, is green, so no signal was lost.

## 7. Files for the parent's commit

`src/main/java/ee/sheltermap/verification/{VerificationService, FileVerificationSendLog, TwilioSmsSender, SmtpPulseSmtpSender, CodeHashes, RollingContactOtpLimiter, VerificationSendLog, VerificationProperties, PendingVerification}.java` (9) + `docs/autopilot/CODE-REVIEW-NOTES.md` (3 appended entries) + this report.
