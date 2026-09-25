# BLIND-INDEX-FRAMING — length-prefix framing for the blind index (+ V34 reframe migration)

**Lane:** BLIND-INDEX-FRAMING · **Branch:** `code-review`
**Fixes:** `simplify-pii-core.md` §4 (latent domain-separation weakness in `PiiCrypto.blindIndex`, reported not fixed — owner call; this lane is that call's follow-through).
**Gate:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` — see §6 (detached, exit file read).

---

## 1. Scope

| File | Change |
| --- | --- |
| `src/main/java/ee/sheltermap/security/PiiCrypto.java` | `blindIndex` now frames the HMAC message with length prefixes (§2); new transitional `legacyBlindIndex` (the old raw-concat format, for the read fallback and the migration tests) and `legacyCodeHash` (the `v2:`-prefixed legacy form, for the confirm fallback); shared private `frameMessage` / `hmacHex`. HMAC algorithm, key handling, `v1:` envelope, key validation, all error messages: **untouched**. |
| `src/main/java/ee/sheltermap/migration/V34BlindIndexFramingMigration.java` (NEW) | Append-only Java migration V34 — recomputes every stored `email_hash` / `phone_hash` under the framed message (§3). Same bean-registration pattern as V13. |
| `src/main/java/ee/sheltermap/migration/PiiMigrationConfig.java` | +1 bean (registers V34 with the env-keyed `PiiCrypto` — the established V13 pattern; a plain classpath scan cannot inject it). |
| `src/main/java/ee/sheltermap/persistence/JpaUserRepository.java` | `findByEmail` / `findByPhone`: framed-index lookup first, legacy-index lookup second (the bounded read fallback). **These two methods are the index's read path — the task's "reads work during the migration" requirement lands here and nowhere else in `persistence` is touched.** |
| `src/main/java/ee/sheltermap/verification/CodeHashes.java` | `matches` `v2:` branch: framed recompute first, legacy-framed recompute second (bounded confirm fallback, §3.3). The unkeyed legacy SHA-256 acceptance branch is **byte-identical** (the "legacy code-hash acceptance" the rules protect). |
| Tests (all NEW files, zero existing tests touched) | `security/PiiCryptoFramingTest` (6), `security/BlindIndexFramingIT` (3), `verification/CodeHashesFramingFallbackTest` (5). |

**Scope-interpretation note for the parent:** "do not touch … other packages" was read as *packages outside the blind-index lane*. The two read methods in `persistence` and the one `v2:` branch in `verification` are the index's consumers — the task's §2 (reads must work during migration) cannot be met without the persistence change, and without the `CodeHashes` change every in-flight v2: code dies at deploy (the finding §4 explicitly names `codeHash` as carrying the same framing). Everything else in those packages is byte-identical. If the parent intended a stricter reading, the reversible delta is exactly: the two fallback `.or(...)` clauses and the one extra `constantTimeEquals` line.

**Not touched:** AES envelope, `PiiKeys`, the unkeyed-legacy confirm branch, V13 (applied migration — append-only rule), `UserMapper` (write path — it calls `blindIndex`, so it picks up the framing with zero changes), guards, frontend, any other package.

## 2. The framing, and why it is unambiguous

HMAC message = `uint16be(len(domain)) ‖ domain ‖ uint16be(len(value)) ‖ value`, lengths in UTF-8 bytes, then the existing keyed HMAC-SHA256 (same key, same algorithm).

- **Unambiguous:** the first two bytes of the message *are* the domain length, so the domain is recovered exactly, then the next two bytes give the value length. Parsing yields exactly one (domain, value) pair ⇒ the mapping (domain, value) → message is injective ⇒ two pairs can never share an index. No property of the tag set (prefix-freeness or any other) is needed anymore — a future `users`-alongside-`users.email` world cannot collide, by construction.
- **Both parts prefixed** (task requirement): the value prefix is symmetric with the domain prefix and keeps the framing total even if a consumer ever truncates or reuses the message; cost is 4 fixed bytes.
- **Bounded and fail-closed:** each part must fit in 65535 bytes; anything larger throws `IllegalArgumentException` ("…exceeds the 65535-byte framing limit") instead of wrapping the prefix. Realistic parts are ≤255 bytes (e-mails), ~20 (E.164), 6 (codes) — the guard is a foot-gun tripwire, not an operating constraint.
- **Why not a separator char:** a fixed separator (e.g. `\0`) re-introduces a value-dependent ambiguity unless values are guaranteed separator-free — the length prefix needs no such invariant.

The exact collision from the finding, red-proven (§5): with tags `users` ⊂ `users.email`, the legacy framing made `("users", ".emailmari@x.com")` and `("users.email", "mari@x.com")` frame to the identical byte string `users.emailmari@x.com` — one HMAC message, one index (`019736c1…` in the red run; `.emailmari@x.com` is legal canonical input — canonicalisation is trim + lower-case only, no structural e-mail validation).

**Correction to the filed example, on the record:** `simplify-pii-core.md` §4 writes the colliding value as `emailmari@x.com`. That specific string does *not* collide — the value on the shorter tag's side must start with the full difference between the tags, **`.email` including the dot** (`"users" + ".emailmari@x.com"` == `"users.email" + "mari@x.com"`; `"users" + "emailmari@x.com"` == `usersemailmari@x.com` ≠ the other side). The structural weakness is exactly as filed (and the red run proves it); only the example's string was off by one dot.

## 3. Migration path — how reads stay correct throughout

### 3.1 V34 reframe migration

The index is **derived** (HMAC over the canonical contact), not secret state — so it is recomputed, not converted: for every row with a non-blank contact, V34 decrypts the `v1:` envelope with the **existing** key, canonicalises (the same `canonicalEmail` / `normalizeE164` the app uses), recomputes the framed index and writes it back. **Envelopes are byte-identical before/after** (asserted in the IT), keys are unchanged, no new column, no DDL.

- **Idempotent:** a row whose stored value already equals the framed recomputation is skipped → a failed-then-`flyway repair`-ed rerun is safe (V13 idiom).
- **Transactional** (`canExecuteInTransaction = true`, Postgres DDL/DML atomic): V34 is all-or-nothing per startup. Either the whole table is reframed or none of it is — and the app serves no traffic while Flyway runs (it migrates at context start, before the web server binds), so there is no externally visible half-mixed state.
- **Uniqueness is guarded by the existing V13 unique indexes** throughout: a reframe landing on another row's index fails the UPDATE, the transaction rolls back, and Flyway marks the migration failed → loud, no data change. A true duplicate is only reachable if two rows already canonicalised to the same contact — impossible while the legacy unique index was live (same canonical ⇒ same legacy index ⇒ the index already refused the second row). Hence V34 carries no separate collision guard (dead code — the index *is* the guard); this is documented in the migration javadoc.
- **Fail-loud tripwire:** a non-blank but un-encrypted contact (V13 never ran on the row — not a real state, but not V34's job to guess) aborts the migration with the row id.
- **Java, not SQL:** same reason as V13 — the recompute needs the app's env key.

### 3.2 Read fallback (the bounded window)

While any row still holds a **legacy** index, `findByEmail` / `findByPhone` compute **both** indexes and look up framed-first, legacy-second (two point lookups on unique indexes — trivially cheap). The window is bounded because: (a) V34 rewrites every existing row at the startup that runs it; (b) only old code instances can *write* legacy indexes, and once every instance runs the framed code no new legacy rows can appear.

**The version marker is V34 itself** (its `flyway_schema_history` row): an opaque HMAC carries no in-value marker, and a per-row version column would be heavier than the problem. "Retire deliberately" = after the operator confirms V34 applied on every database AND every instance runs the framed code (one release later is sufficient in practice — see §3.4), a follow-up change deletes the `.or(...)` fallback, `legacyBlindIndex`, and the legacy seed path from tests. Until then the fallback is inert for a fully-migrated DB (framed lookup hits first).

What the fallback covers, concretely:
- **Stop-the-world deploy (this app's model — single instance):** the window is structurally zero — V34 finishes before the server accepts a request. The fallback is a no-op safety net.
- **Rolling deploy:** new instances read legacy rows written by old instances (and vice versa only in the reverse direction — old code cannot read framed rows; that direction is intrinsic to any index-format cutover and is an ops constraint: do this cutover as a stop-the-world or blue/green deploy, not a rolling one — flagged in §7).
- **Failed/partial external migration runs:** the transactional migration leaves either the pre- or the post-state, never a mix.

### 3.3 In-flight one-time codes (the `v2:` slot)

`codeHash` delegates to `blindIndex`, so the framing fix changes `v2:` outputs too. A code **issued before the cutover** and presented after it would otherwise die at deploy. Following the codebase's own slot-transition idiom (the pre-v2 unkeyed codes are dual-accepted "until their TTL — natural expiry, not a data migration"), the `v2:` confirm branch now accepts the legacy-framed recompute as well. Security is not downgraded: the accepted value is still the keyed HMAC-SHA256 under the same key — only the (unproven-for-a-closed-tag-set) domain framing is weaker, and within one slot's domain the values are exactly six digits, so no cross-domain ambiguity exists for codes regardless. **The unkeyed SHA-256 acceptance branch is byte-identical.** Code rows are ephemeral (TTL) and the code is unrecoverable from its hash — they cannot be migrated, only bridged.

### 3.4 Retirement conditions (deliberate, named)

| Fallback | Retire when | Mechanism |
| --- | --- | --- |
| Read fallback (`JpaUserRepository`) | V34 applied on every DB **and** every instance runs framed code (no legacy rows can be read or written) | delete the two `.or(...)` clauses + `legacyBlindIndex` |
| Confirm fallback (`CodeHashes`) | one code TTL after every instance runs the framed slot (no in-flight legacy-framed `v2:` code can exist) | delete the second `constantTimeEquals` + `legacyCodeHash` |

Both are dead-code deletions with no behaviour change at retirement time; both methods carry "delete with the fallback" javadoc so the follow-up lane finds them.

## 4. Files for the parent's commit

Main: `security/PiiCrypto.java`, `migration/V34BlindIndexFramingMigration.java` (new), `migration/PiiMigrationConfig.java`, `persistence/JpaUserRepository.java`, `verification/CodeHashes.java`.
Tests (new): `security/PiiCryptoFramingTest.java`, `security/BlindIndexFramingIT.java`, `verification/CodeHashesFramingFallbackTest.java`.
Docs: this report + 2 appended lines in `docs/autopilot/CODE-REVIEW-NOTES.md` (the frontend probe-spec reminder + the scope-interpretation note).

## 5. The three required tests — with red-proofs

All reds run under the lock, logs in `/tmp/blind-index-framing/`.

| # | Test | Red proof (pre-fix) | Green |
| --- | --- | --- | --- |
| 1 | `PiiCryptoFramingTest.aPrefixRelatedDomainPairCannotCollide` — the two prefix-related pairs must index differently | `red1.log`, EXIT=1: `Expecting actual: "019736c16b10b5bbb010084656e19ac4e0dc6117ea4e6c2f1112f706576d1d3d" not to be equal to: "019736c1…" ` — **the two pairs produced the identical index under the old framing**; failure reason is the collision itself (not a typo). Note: the first red attempt used the finding's verbatim pair and PASSED — that pair is not a collision (dot missing, §2); the corrected pair is the one pinned. | `green1b.log`: 6/6 framing unit tests + 12/12 pre-existing `PiiCryptoTest` (unmodified). |
| 2 | `BlindIndexFramingIT.v34ReframesEveryStoredIndexAndLookupsStillResolve` — a throwaway DB in the post-V13 world (v1: envelopes + legacy-framed indexes, full V1–V33 schema) reframes every row; the framed lookup resolves; envelopes byte-identical; rerun is a no-op | `red3.log`, EXIT=1: `cannot find symbol: class V34BlindIndexFramingMigration` (feature absent — compile-level red, the class did not exist). | `green3.log`: 3/3 in `BlindIndexFramingIT`. Companion red for the read half: `red2.log`, EXIT=1 — `aLegacyFramedRowStillResolvesDuringTheFallbackWindow`: `Expecting actual not to be null` (the legacy-framed row was **unfindable** through `findByEmail` before the fallback — the exact "unable to find a record" failure mode). |
| 3 | `BlindIndexFramingIT.aLegacyFramedRowStillResolvesDuringTheFallbackWindow` — legacy-framed row + framed row + unknown contact, through the real `UserRepository` on the Spring context | `red2.log` (above) | `green2.log`/`green3.log`: 1/1 then 3/3. |

Extra pins (written in the green phases after the behavioural reds — honest note: their red would have been "method does not exist"; the behavioural reds above are the load-bearing ones): framed ≠ legacy index (proves the migration is forced), framed stays deterministic hex-64, existing domain tags still separate, oversized part fails closed, `legacyBlindIndex` reproduces the old message exactly (including its collision), `V34` fails loud on a non-blank un-encrypted contact.

**CodeHashes fallback** (supporting test #3's sibling, in-flight codes): `CodeHashesFramingFallbackTest` — red `red3c.log` EXIT=1: 4/5 pass, `anInFlightV2CodeIssuedUnderTheLegacyFramingStillConfirms` fails `Expecting value to be true but was false` (the in-flight v2: code died at the cutover without the bridge); green `green3.log` 5/5, incl. `theUnkeyedLegacyAcceptanceIsUntouched` (the protected branch still verifies, wrong code still fails) and `aV2CodeFromAnotherDomainFailsUnderBothFramings` (slot separation holds under both framings).

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`, detached (`nohup`, exit file), run after the foreign unlocked build had exited (§7.4).

| Gate | Result |
| --- | --- |
| Post-change (sanctioned) | **exit 0** — `gate.exit` = 0, BUILD SUCCESS. **1361/1361, 0 failures / 0 errors / 0 skipped** (measured baseline 1347 + 14 new tests: 6 + 3 + 5 — count exact). PMD passed with no new findings. "All coverage checks have been met" (0.93 floor). Log: `/tmp/blind-index-framing/gate.log`; zero `[ERROR]` lines in it. |
| V34 in the IT contexts | `Successfully applied 35 migrations … now at version v34` on context start — the Java bean registered and ran on every IT database, no-op on the (then empty) users table, then the app served with the framed code. |
| Pre-change baseline | exit 0 — 1347/1347, PMD clean, coverage floor met (`baseline.log`/`baseline.exit`). Two earlier baseline attempts died on the rule-7 concurrent-build hazard before/at test phase — not code (§7.4). |

Pin suite green UNMODIFIED inside the gate: `PiiAtRestIT` 6/6 (envelope, blind-index lookups, 409s, V13 idiom), `PendingVerificationDuplicateIT` 2/2 (unkeyed legacy code acceptance), `PiiCryptoTest` 12/12, `ContactsTest` 4/4, plus the auth/verification flow suites (`PasswordResetServiceTest`, `ContactChangeServiceTest`, `Email/PhoneVerificationProviderTest`, `AuthApiIT`, `AccountControllerIT` …) — 0 assertion failures anywhere. **No foreign failure to name: the gate is all-green.** `DocumentationFactsTest` 21/21 in-gate; no anchor shifts owed (00-CURRENT-STATE.md cites none of the touched files — grep-verified; the only `blind` hit is an unrelated CSS note).

## 7. Anything unverified / deliberately left

1. **Rolling-deploy reverse direction:** an *old* instance cannot read a reframed row (it only computes the legacy index). Intrinsic to any index-format cutover — the cutover must be stop-the-world or blue/green; for this app's documented single-instance deployment the window is zero. Ops note, not a code gap.
2. **The `CodeHashes` v2: fallback widens acceptance for the window** (a legacy-framed keyed hash is additionally accepted). It is still keyed, still constant-time, still slot-domain-separated for 6-digit values — no unkeyed or cross-slot value is ever accepted — but it *is* a new acceptance path, deliberately, per the codebase's slot idiom (§3.3). If the parent's "do not change legacy code-hash acceptance" was meant to forbid even this, the one-line removal is named in §1; the cost is in-flight v2: codes dying at deploy (bounded by the code TTL).
3. **Baseline count:** task said 1350; the measured green baseline on current HEAD before my change was **1347/1347** (exit 0). The −3 is a known in-flight state already noted on the board by SNAPSHOT-CLEAN (uncommitted verification-lane edits: `FileVerificationSendLogTest` 9 vs 11 committed methods, `VerificationServiceTest` 16 vs 17). My gate is compared against the 1347 measurement, plus my +14 new tests.
4. **Two concurrent-lane interferences during my runs** (rule 7, recorded not mine): an unlocked sibling `mvn test -q` (~02:20–02:30) wiped `target/` mid-gate twice — first attempt died at test-compile with a wall of `cannot access <main class>`, second with `NoClassDefFoundError: PiiAtRestIT$1` mid-suite. Both re-runs under the lock are the evidence; the final gate was run after the foreign build exited. Also an untracked throwaway `frontend/src/app/features/guidance/__race-probe.spec.ts` (frontend lane) — reminded on the notes board, backend-unaffected.
5. **`legacyBlindIndex` / `legacyCodeHash` are transitional public API** — pinned by tests, javadoc marks them for deletion with the fallbacks (§3.4). A PMD/coverage gate run is the final check that the window code stays inside the floor.
6. **Not verified:** no mutation pass (no mutation tooling in this lane's kit); timing side-channels unmeasured (the fallback adds one constant-time compare on the confirm path — length profile unchanged, both operands fixed-format); the 65535-byte guard's message text is pinned by my unit test but no production path can realistically reach it.
