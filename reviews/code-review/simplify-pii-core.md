# SIMPLIFY-PII-CORE — PII crypto / key handling / code hashing readability pass

**Lane:** SIMPLIFY-PII-CORE · **Branch:** `code-review` (HEAD `4d101d0`)
**Scope (exclusive):** `src/main/java/ee/sheltermap/security/**` (`PiiCrypto` 184, `PiiKeys` 68, `Contacts` 35) + `src/main/java/ee/sheltermap/auth/Codes.java` (38) + `Hashes.java` (24) = 349 lines, plus the pinning tests (read-only pins — **zero** test files touched).
**Mode:** behaviour-preserving readability pass. No constant, algorithm, key format, error message, public/package API, or control flow changed. No test deleted, weakened or modified.
**Gate:** post-change **exit 0** — 1349/1349, PMD clean, "All coverage checks have been met". Detail §6.

---

## 1. What the target was

The security primitives: the AES-256-GCM PII envelope + HMAC-SHA256 blind index (`PiiCrypto`), the fail-closed key loading/validation (`PiiKeys`), the single contact-normalisation source (`Contacts`), one-time code generation (`Codes`), and the thin auth-side delegate to the one code/token hash implementation (`Hashes` → `verification.CodeHashes`). The keyed `v2:` code hash changed today has two homes: `PiiCrypto.codeHash`/`CODE_HASH_PREFIX` (mine) and the legacy-accepting compare in `CodeHashes.matches` (verification package — foreign lane, already passed by SIMPLIFY-VERIFICATION; read here for context only).

## 2. What changed (3 of 5 files, all comment-only)

| File | Lines (before → after) | Change |
| --- | ---: | --- |
| `PiiCrypto.java` | 184 → 186 | `canonicalEmail` javadoc: extraction-history ("this two-liner was inlined HERE and separately in the limiter/recorder/auth consumers") → the constraint (it must equal what registration/login normalize; drift splits the uniqueness check from the blind-index lookup) |
| `Contacts.java` | 35 → 30 | class javadoc: the 9-line "Before this extraction… per-class copies are gone" history (which class used to hold a private copy) → the constraint (every consumer calls through `normalize`; a drift in any of them silently splits one human into two identities) |
| `Codes.java` | 38 → 38 | the `01-TASK.md §4 dependency rule` pointer cut — ambiguous (two `01-TASK.md` exist: `context-and-tasks/agent/` and `frontend/docs/agent/`, neither the docs-of-record path) — the dependency constraint is now stated directly |
| `PiiKeys.java` | 68 → 68 | unchanged — `requireBytes` is already flat early-throw with pinned messages; every name says what the guarantee is |
| `Hashes.java` | 24 → 24 | unchanged — a 2-method delegate whose one-spelling rationale is already stated |

Total 349 → 346 (−3). **No flattening was possible or needed:** every method in the five files is already flat (early throws/returns, no nesting, no multi-idea functions) — they were hardened and pinned by the earlier test-quality and simplify-verification lanes. **No renames were possible or needed:** every name is pinned by callers or tests outside this lane (`encrypt`/`decrypt`/`unwrapForHash`/`blindIndex`/`codeHash`/`canonicalEmail`/`CODE_HASH_PREFIX`/`DOMAIN_*`, `aesKey`/`hmacKey`, `normalize`, `sixDigitCode`/`randomToken`, `sha256Hex`/`constantTimeEquals`), and all already say what the guarantee is.

One attempted change, reverted in-lane: `encrypt`'s two `System.arraycopy` envelope-build lines were replaced with `Arrays.concatenate(nonce, ciphertext)` — **no such JDK API exists** (compile error, verified against `javap java.base java.util.Arrays` on JDK 21: absent). The original two arraycopies are back; the committed diff does not contain that change.

## 3. Evidence every guarantee still holds (tests passed UNMODIFIED in the post-change gate)

| Pinned guarantee | Pinning tests (all green, unmodified) |
| --- | --- |
| `v1:` envelope format (prefix, base64url, 12-byte nonce ‖ ct+tag) + a fresh nonce per call | `PiiCryptoTest`: `encryptThenDecryptRoundTrips`, `encryptionIsRandomizedPerCall` |
| GCM integrity: a tampered envelope fails with "decryption failed"; truncated envelope rejected | `PiiCryptoTest.aTamperedEnvelopeFailsTheGcmTag` (flip + truncation); `PiiAtRestIT` at-rest round-trips |
| Fail-closed decrypt (plaintext row, foreign version, null, bad base64) | `PiiCryptoTest.decryptFailsClosedOnPlaintextOrForeignVersion` |
| Key validation: missing/blank → `PII_AES_KEY is not set`, non-base64 → `not valid base64`, 16 bytes → `exactly 32 bytes` — the `openssl rand -base64 32` recipe in the messages | `PiiCryptoTest.missingKeyFailsClosedAtConstruction`, `malformedOrWrongSizedKeyFailsClosed` |
| Blind index: deterministic 64-hex, domain-separated, keyed (different HMAC key ⇒ different index) | `PiiCryptoTest.theBlindIndexIsDeterministicHex64` / `…IsDomainSeparated` / `…IsKeyed`; `PiiAtRestIT` (stored `email_hash` == `blindIndex(DOMAIN_USER_EMAIL, canonical)`) |
| Contact normalisation: trim + ROOT lower-case (Turkish-locale pin), E.164 verbatim, null → NPE `"contact"` | `ContactsTest` (4/4, incl. `usesTheRootLocaleNotTheDefaultLocale`) |
| Keyed `v2:` code hash at rest: 3-char prefix + 64-hex = 67 chars, never plaintext | `ContactChangeServiceTest:126-127` (`startsWith(CODE_HASH_PREFIX)`, `hasSize(67)`); the confirm flows in `PasswordResetServiceTest` (19) / `ContactChangeServiceTest` (13) |
| Legacy unkeyed SHA-256 accepted until expiry | `PendingVerificationDuplicateIT` (2 — rows stored as bare `sha256Hex`, confirm succeeds); `EmailVerificationProviderTest` (7) / `PhoneVerificationProviderTest` (8) seed legacy `sha256Hex` rows and confirm them |
| 6-digit code format, leading zeros, single SecureRandom | `ContactChangeServiceTest:29,65` (`code: (\d{6})` from the captured SMS), `PasswordResetServiceTest` (captured code round-trips), `AuthApiIT:272` |
| Timing-equalised compare | `verification.CodeHashes.constantTimeEquals` (foreign file, unchanged) — pinned per the TEST-QUALITY-AUTH audit (timing-equaliser mutation killed) |

Gate per-class results (post-change run): `PiiCryptoTest` 12/12 · `ContactsTest` 4/4 · `PiiAtRestIT` 6/6 · `ContactChangeServiceTest` 13/13 · `PasswordResetServiceTest` 19/19 · `EmailVerificationProviderTest` 7/7 · `PhoneVerificationProviderTest` 8/8 · `PendingVerificationDuplicateIT` 2/2 · `PasswordRecoveryFlowIT` 7/7 · `AuthApiIT` 18/18 · `AccountControllerIT` 16/16 · `DocumentationFactsTest` 21/21.

**Unmodified proof:** `git diff --name-only -- src/test` → 0 lines. The working tree's only main-source changes are the three files above.

## 4. Security finding — reported, NOT fixed (owner call)

**Latent domain-separation weakness in `PiiCrypto.blindIndex` (and therefore in `codeHash`): the domain and the value are framed by raw concatenation, not by a separator.** The HMAC input is built as `domain || value` (two back-to-back `mac.update` calls, no delimiter, no length prefix). Domain separation holds today **only because the six fixed domain tags happen to be prefix-free** — no tag is a prefix of another (checked pairwise: `users.*` diverge at char 6; the four `otp.*` tags diverge at chars 4–5). A cross-domain collision `tag_A ‖ value_A == tag_B ‖ value_B` requires one tag to be a prefix of the other; if a future domain addition breaks that invariant, collisions become reachable — e.g. with a tag `users` alongside `users.email`: `blindIndex("users", "emailmari@x.com") == blindIndex("users.email", "mari@x.com")` (a normalised e-mail can be any trimmed lower-case string). Same construction for the `v2:` code hashes — currently safe for a stronger reason too (the values are exactly six digits), but the fragility is the same. The pin `theBlindIndexIsDomainSeparated` covers only the present `users.email` vs `users.phone` pair and cannot catch a prefix-related future domain. **Not exploitable today** (the tag set is a closed constant set in this file; adding a tag is a code change a reviewer can see) — but it is a footgun for exactly the future the slot-tag design anticipates. The fix is small (frame the message, e.g. a fixed-width 2-byte big-endian length prefix on the domain before the value) but changes every stored index/hash, so it belongs to a future key-slot rotation decision. **Left untouched; filed on the notes board.**

**Reviewed and judged as-intended (no finding):**
- The legacy fallback in `CodeHashes.matches` (foreign file) accepts exactly what it intends: an un-prefixed stored value verifies only against the recomputed `sha256Hex(code)` of the PRESENTED code, and the acceptance window is the code's TTL (rows expire; the design doc calls this "natural expiry, not a data migration"). Nothing more than intended is accepted.
- **No key material is logged anywhere**: zero logging calls in all five files; `PiiKeys` error messages carry the env var NAME, never a value (message texts are pinned). The `PII_AES_KEY`/`PII_HMAC_KEY` names in the messages match the real `${PII_AES_KEY:}`/`${PII_HMAC_KEY:}` bindings in `application.yml` — verified, so the fail-closed recipe is not pointing at a non-existent variable. The gate log's failure-path test lines also show masked contacts (`m***@example.ee`, `+372****67`) — PII masking holds at the senders.
- Constant-time compares: `MessageDigest.isEqual` (constant-time over content; its length pre-check reveals only the 64-vs-67 slot form, which is not secret — both sides are our own fixed-format digests).
- GCM usage: 12-byte random nonce + 128-bit tag, decrypt fails closed on every malformed form; random-96-bit-nonce reuse probability is negligible at this application's per-key message volume (RFC 5116 practice) — noted, not a finding.
- `Codes` draws are uniform: `Random.nextInt(n)` over the exact range (no modulo bias), leading zeros preserved, one static `SecureRandom`.

## 5. Anchor shifts

**None owed.** `docs/agent/00-CURRENT-STATE.md` (330 lines) cites no file of this lane — grep-verified, 0 hits for `PiiCrypto|PiiKeys|Contacts|Codes|Hashes|pii|aes|hmac|blind|openssl` case-insensitively (the only `normalize` hit is a frontend paging clause). No anchor pass is owed; `DocumentationFactsTest` (21/21) stayed green inside the gate.

## 6. Gate (under `flock /tmp/openshelter-mvn.lock`, detached, exit file read)

| Gate | Command | Result |
| --- | --- | --- |
| Pre-flight (fast feedback, targeted) | `flock … mvn -B -ntp test -Dtest='PiiCryptoTest,ContactsTest'` | exit 0 — 16/16 (first attempt failed on the reverted `Arrays.concatenate` mistake, §2; reverted before any gate) |
| Post-change (the sanctioned gate) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — **1349/1349, 0 failures / 0 errors / 0 skipped** (baseline count matched exactly), PMD check passed with no new findings, "All coverage checks have been met". 23:31:25 → 23:34:40; log + exit file in `/tmp/simplify-pii-core/` |

No wall of missing-class errors — the unlocked-build hazard (rule 7) did not materialize. Concurrent in-flight state: 3 modified frontend files + 2 uncommitted sibling review reports (other lanes) — neither is in the Maven build. A sibling lane wrote `domain/*.java` at 23:33:12 and 23:36:08 — AFTER this gate's compile phase finished (compile started 23:31:27; Spring test contexts already up at 23:32:07) — so the gate measured HEAD's domain files + my three files, a clean snapshot; the sibling's backend state is for their own gate.

## 7. Anything unverified / filed

1. **The domain-separation finding (§4)** — reported on the notes board for the owner, not fixed.
2. **No mutation pass in this lane.** The change is comment-only over a suite two test-quality lanes had just mutation-audited (TEST-QUALITY-AUTH: GCM-integrity, timing-equaliser, single-use and other mutations all killed); I claim the pin suite's green, not a fresh red-proof.
3. **`Codes` has no dedicated unit pin** (no test calls `sixDigitCode`/`randomToken` directly) — the format is pinned indirectly by the flow tests in §3. Pre-existing gap, not widened by this lane; noted, not fixed (adding tests is out of this lane's brief).
4. Timing behaviour was not measured (side-channel measurement is out of scope); the compare primitive is the pinned one from the verification lane.

## 8. Files for the parent's commit

`src/main/java/ee/sheltermap/security/PiiCrypto.java`, `src/main/java/ee/sheltermap/security/Contacts.java`, `src/main/java/ee/sheltermap/auth/Codes.java` (3) + `docs/autopilot/CODE-REVIEW-NOTES.md` (1 appended entry) + this report.
