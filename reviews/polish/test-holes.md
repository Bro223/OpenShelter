# TEST-HOLES — lane report

**Branch:** `polish` @ `5747d59` (no commit — parent commits)
**Scope:** find tests/guards that **cannot fail** — assertions no realistic
production mutation can turn red — in the areas the owner named
(authorization, erasure/trust snapshot, paging bounds, moderation
transitions, blind-index framing). Method: mutate production code the way a
real regression would, run only the claiming tests, keep the survivors,
explain them, close each with a strengthened or new test proven
red-then-green, and restore every mutation.

**Method notes**

- All mutation work ran in a detached worktree
  (`git worktree add --detach /tmp/test-holes/mutant 5747d59`), so the
  main tree's uncommitted state (other lanes' in-flight work) could never
  contaminate a mutation run. Every Maven invocation took the lock
  (rule 7): `flock /tmp/openshelter-mvn.lock mvn …`.
- Red-then-green contract: for every closed hole, the report shows
  (a) the mutation GREEN against the pre-fix suite (the hole),
  (b) the SAME mutation RED against the post-fix suite (exactly one new
  failure, the pin), (c) the mutation reverted GREEN (the pin is not
  accidentally red).
- No production behaviour changed anywhere in the main tree. All main-tree
  edits are test files (strengthened or added). The mutant worktree was
  left and deleted at the end; the main tree's production files are
  byte-clean vs `git` (verified by `git diff --stat` — only test paths).

## Summary — six holes found, six closed

| # | Mutation | Claiming suite result (pre-fix) | Why it survived | Closing pin | Red proof (post-fix, mutated) |
|---|---|---|---|---|---|
| 1 | `PiiCrypto.frameMessage` — drop the DOMAIN length prefix | 32/32 green | every test computed its expectation through the same `frameMessage`/`blindIndex`, or asserted only relative properties | `PiiCryptoFramingTest.theFramedIndexIsTheExactPinnedByteFormat` — pins the exact 64-hex output for three (domain, value) pairs | 1 failure, this test only |
| 2 | `PiiCrypto.frameMessage` — drop the VALUE length prefix | 32/32 green | same reason — the format is a **persisted data format** (blind indexes, `v2:` code hashes) and no test pinned its bytes | same pin (a different wrong byte order → different wrong hash) | 1 failure, this test only |
| 3 | `ShelterService.addPlace` — delete the write-time V35 depth-snapshot write | 114/114 green | the write's only consumer (the orphaned-row read) is always reached **after** the erasure re-freeze overwrites it — the re-freeze is well pinned, so the write is invisible | `ShelterServiceTest.addPlaceFreezesTheSubmitterDepthSnapshotAtWriteTime` — PHONE for one channel, FULL for two | 1 failure, this test only |
| 4 | `ShelterService` owner-edit — delete the depth-snapshot carry-over (the V31 boolean twin stays) | 59/59 green | the boolean twin IS pinned in the same method (`ShelterServiceOwnershipTest:152,172`); the depth column had no observer | `ShelterServiceOwnershipTest.anOwnerEditAppliesTheWritablesAndPreservesTheAdminOwnedState` extended with a `FULL` snapshot stamp + assert | 1 failure, this test only |
| 5 | `V34BlindIndexFramingMigration` — reframe e-mails from the RAW contact instead of the canonical one | 9/9 green | the IT seeded only already-canonical rows; V13 legitimately stores non-canonical raw envelopes, so a real DB has the shape the IT never had | `BlindIndexFramingIT.v34ReframesEveryStoredIndexAndLookupsStillResolve` — new non-canonical seed row (`Mixed.Case@Example.EE`, national-format phone) with canonical-form asserts | 1 failure, this test only |
| 6 | `AdminController.ALERTS_DEFAULT_LIMIT` 50 → 51 | 11/11 green | the IT has no fixture with 51+ alerts; the explicit-`limit=50` case passes either way (50 ∈ 1..200) | `AdminControllerAlertsTest` (new, unit-level) — 51 alerts in the ring, default response exactly 50, explicit 51/200 reach all 51 | 1 failure, the default test only |

Holes 1+2 are the same underlying gap (the framing byte format is a
persisted format, pinned only relative-to-itself); they are reported as two
rows because the two prefixes are independently removable and the red
proofs produce different wrong hashes.

## The holes in detail

### 1+2 — the blind-index framing byte format was unpinned

`frameMessage` (length-prefix framing, `uint16be(|domain|) ‖ domain ‖
uint16be(|value|) ‖ value`) is not a helper detail: its output is
**persisted** — `email_hash`/`phone_hash` after V34 and every `v2:` code
hash. A mutation that drops one prefix changes the bytes for every key but
every existing test stayed green, because each one either

- recomputed the expected index through the same mutated function
  (`BlindIndexFramingIT`, `PiiAtRestIT`), or
- asserted only properties the mutation preserves (determinism,
  domain-separation against the *other* framing, key-rotation isolation,
  `PiiCryptoFramingTest`/`PiiCryptoTest`).

**Survivors (pre-fix):**
- M-F1 (domain prefix dropped): `PiiCryptoFramingTest,
  CodeHashesFramingFallbackTest, BlindIndexFramingIT, PiiAtRestIT,
  PiiCryptoTest` → **32/32 green, exit 0**.
- M-F1b (value prefix dropped): same scope → **32/32 green, exit 0**.

**Closing pin** (`PiiCryptoFramingTest`, new test
`theFramedIndexIsTheExactPinnedByteFormat`):

```java
assertThat(pii.blindIndex("users.email", "mari@example.ee"))
        .isEqualTo("0751ce6d713d4a60c823f13e538ed487a91d5240b3cebd37837dacd2f19c359c");
assertThat(pii.blindIndex("users.phone", "+37250000001"))
        .isEqualTo("bc2f46a50bcd8d836eb967cfdb6cd75b874fe59569dbabd9b54e3032ca6ee66b");
assertThat(pii.codeHash("otp.password-reset", "123456"))
        .isEqualTo("v2:3e7b86b6c6b9c44b46d2a07d70567152b4979e0a1a16043313338446d68fc92c");
```

plus `theLegacyIndexIsTheExactPinnedRawConcatenation`, pinning
`legacyBlindIndex("users.email", "mari@example.ee")` to
`42a312eb6b0945b6faf98ea607c16602c634a731e95b5d7d7f25485dedcae8d9` — the
legacy raw-concat form is equally persisted (pre-V34 rows, the read
fallback), so both forms are pinned.

The constants were derived independently in two tools (Python `hmac` and
OpenSSL `dgst`) over the **raw 32-byte key** `PiiKeys` decodes from its
base64 form (byte `i` = `(12·(i+7)) mod 256` in the test profile) — not the
base64 text. The first draft of the pin used the base64 text as the key and
produced constants that were red on UNMUTATED code; the red run against the
mutant caught it (its actual `42a312eb…` matched the raw-key legacy
computation, proving the production method was right and my constants
wrong). Recomputed values were cross-checked Python↔OpenSSL on all four
before adoption.

**Red proofs:** under M-F1 → 8 run, 1 failure, `expected 0751ce6d… but was
32e41f63…`; under M-F1b → 8 run, 1 failure, `expected 0751ce6d… but was
4616d46f…`. The legacy pin stays green under both (the legacy method is
untouched by the mutations) — exactly one red each.

**Green proof:** mutations reverted, same five classes → **34/34 green,
exit 0** (32 pre-existing + 2 new).

### 3 — the V35 depth snapshot's write-time value was invisible

`addPlace` freezes `submitterVerificationSnapshot` at write time; the
erasure re-freezes it later. The re-freeze is well pinned
(`AccountErasureStandingIT`'s three pins, `AccountDeletionIT:246`), and
every test that ever reads the snapshot does so on an orphaned row — which
only exists after an erasure, i.e. after the re-freeze overwrote the
write-time value. The write itself had no observer.

Why it still matters: the V7 `created_by` `ON DELETE SET NULL` constraint
can orphan a row **without** the erasure re-freeze running (a raw DB-level
delete path), and a future non-erasure orphaning path would silently serve
a NULL snapshot (an unverified badge) instead of the row's true standing.
The write is the fallback the column exists to provide.

**Survivor (pre-fix):** M-V1 (both write lines deleted from
`ShelterService.addPlace`) → `ShelterServiceTest,
ShelterServiceOwnershipTest, AccountErasureStandingIT, AccountDeletionIT,
ShelterQueryServiceTest` → **114/114 green, exit 0**.

**Closing pin** (`ShelterServiceTest`, new test
`addPlaceFreezesTheSubmitterDepthSnapshotAtWriteTime`): a PHONE-verified
user's place reads `PHONE`; a two-channel user's reads `FULL` — right
after `addPlace`, before any erasure can re-freeze.

**Red proof:** M-V1 re-applied with the pin → 36 run in `ShelterServiceTest`,
1 failure, this test only (the other 114 stayed green).
**Green proof:** reverted → **115/115 green, exit 0**.

### 4 — the owner-edit carry-over of the depth snapshot (the boolean twin is pinned, the depth was not)

`ShelterService`'s owner edit rebuilds the entity and copies the admin-owned
state forward. The V31 boolean `submitterVerifiedAtCreation` carry-over is
pinned (`ShelterServiceOwnershipTest` stamps `true` and asserts it); the
V35 depth carry-over one line below had no observer. Forgotten, and every
owner edit would zero the row's frozen standing in preparation for a
future orphaning.

**Survivor (pre-fix):** M-V2 (carry-over line deleted, boolean kept) →
`ShelterServiceTest, ShelterServiceOwnershipTest, AccountErasureStandingIT,
AccountDeletionIT` → **59/59 green, exit 0**.

**Closing pin:** the existing `anOwnerEditAppliesTheWritablesAndPreservesTheAdminOwnedState`
now also stamps `submitterVerificationSnapshot = "FULL"` and asserts it
survives the edit.

**Red proof:** M-V2 re-applied with the pin → 15 run in
`ShelterServiceOwnershipTest`, 1 failure, this test only.
**Green proof:** reverted → included in the 115/115 above.

### 5 — V34 reframes from the RAW contact unless told otherwise

`V34BlindIndexFramingMigration` reframes every stored index through
`canonicalEmail`/`normalizeE164`. The claiming IT
(`BlindIndexFramingIT`) seeded rows whose contacts were **already
canonical** (`legacy@example.ee`, `+37250000001`), so the canonicalization
step was a no-op on every row it checked — dropping it changed nothing the
IT could see. Real databases have the other shape: V13 encrypted the RAW
contact into the envelope (`PiiAtRestIT.theV13MigrationFailsLoudlyOnCanonicalCollisions`
proves mixed-case and spaced e-mails reach storage), and the runtime
lookup path canonicalizes **before** computing the index. A V34 that
reframes from the raw value overwrites the row's only lookup path with an
index that matches neither the new (canonical) nor the old (legacy)
computation — the row stops being findable by e-mail, and the legacy
fallback is useless because the legacy index was just destroyed.

**Survivor (pre-fix):** M-V34 (`canonicalEmail(...)` wrapper removed) →
`BlindIndexFramingIT, PiiAtRestIT` → **9/9 green, exit 0**.

**Closing pin:** the IT now also seeds a `Mixed` row — envelope
`Mixed.Case@Example.EE` / `50000002` (national format), legacy indexes
computed from the canonical forms — and asserts the post-V34
`email_hash` equals `blindIndex(DOMAIN_USER_EMAIL, "mixed.case@example.ee")`
and `phone_hash` equals `blindIndex(DOMAIN_USER_PHONE, "+37250000002")`,
while the envelope keeps the raw value. The phone assert means the
`normalizeE164` twin is pinned by the same row.

**Red proof:** M-V34 re-applied with the pin → 3 run, 1 failure,
`expected 7412edab… but was 39fa6ba6…`, this test only.
**Green proof:** reverted → **3/3 green, exit 0**.

### 6 — the alerts default limit (50) had no value pin

`/admin/alerts` documents "1..200, default 50". The suite pinned the
bounds (0/201/`abc` → 400 verbatim) and an explicit `limit=50` — but no
test ever saw the DEFAULT kick in with a ring large enough to distinguish
50 from a neighbour. (The audit default of 100 IS pinned —
`AdminModerationIT` seeds >100 rows; the alerts IT never had 51 alerts.)

**Survivor (pre-fix):** M-A1 (`ALERTS_DEFAULT_LIMIT` 50 → 51) →
`AdminAlertsIT, ErrorDispatchPublicEndpointIT` → **11/11 green, exit 0**.

**Closing pin** (new `AdminControllerAlertsTest`, unit-level on the real
`ThrottleAlertRecorder` — 51 `submissionDailyCap` alerts in the ring, real
`AdminAccess` over an `InMemoryUserRepository` with a provisioned admin,
`SecurityContextHolder` principal per the
`ShelterControllerDetailReadTest` idiom):

```java
assertThat(controller.listAlerts(null)).hasSize(50);   // the default
assertThat(controller.listAlerts(51)).hasSize(51);     // explicit override
assertThat(controller.listAlerts(200)).hasSize(51);
```

**Red proof:** M-A1 re-applied with the pin → 2 run, 1 failure, the
default test only (the override tests stay green — the explicit limit is
independent of the constant).
**Green proof:** reverted → **2/2 green, exit 0**.

## Negative checks — mutations the suite DOES kill

Run to confirm the "well-pinned" claims, each against the claiming tests
only. All red, as expected:

| Mutation | Result |
|---|---|
| M-P2: `CodeHashes.matches` — disable the legacy `v2:` code-hash fallback (`return false`) | `CodeHashesFramingFallbackTest` 5 run, 1 failure |
| M-P3: `Pagination.requireOffset` — `offset < 0` → `offset < 1` (reject 0) | `ShelterBboxPagingIT` 10 run, 2 failures |
| M-P4: `Pagination.requireLimit` — `> MAX` → `>= MAX` (reject 200) | `ShelterBboxPagingIT` 10 run, 1 failure |
| M-C1: `ClientIps.resolve` — untrusted peers now honour `X-Forwarded-For` (the security-critical gate deleted) | `ClientIpsTest, ClientThrottleTest` 12 run, 4 failures |
| M-E1: `AccountService.purgePrivateHomesAndOrphanPublicRows` — the erasure re-freeze deleted | `AccountErasureStandingIT` 3 run, 1 failure |
| M-M1: `AdminUserModeration.suspend` — idempotency early-return deleted (re-suspend re-records) | `UserSuspensionIT` 6 run, 1 failure |
| M-M2: `AdminModerationService.setShelterStatus` — restore no longer resets `REJECTED → NEW` | `CommunityReviewIT` 14 run, 1 failure |

So the claims that held up: paging bounds (values AND the 200 edge), the
XFF trust gate, the erasure re-freeze, the code-hash fallback, suspension
idempotency, and the restore transition (pinned via the audit pair
`REJECTED->NEW` in `CommunityReviewIT:375`).

## Observations (not closed — nothing to close)

- **The 404 → 403 → 409 guard ORDER in `AdminUserModeration.requireSuspendableUser`
  is unobservable**, like the 404-first part: `AdminUser` is-a
  `RegisteredUser` and the GUEST/ADMIN sets are disjoint, so no user row
  can trip two guards at once — swapping the 403/409 checks changes no
  behaviour. What IS observable (each guard's status code and verbatim
  message) is pinned by `UserSuspensionIT`. The javadoc's "order" is
  documentation, not behaviour; no test can (or should) pin the priority.
- **`PiiAtRestIT` pins V13 canonicalization, not V34's** — the collision
  tests prove the V13-world invariant but say nothing about the V34
  reframe's inputs; hole 5 is the V34-side gap that pin now covers.

## Test count delta

Main-tree additions: **+5 tests** — 2 in `PiiCryptoFramingTest` (the framed
pin + the legacy pin), 1 in `ShelterServiceTest` (write-time depth), 2 in
the new `AdminControllerAlertsTest`. The `ShelterServiceOwnershipTest`
change extends an existing method (no new count); the
`BlindIndexFramingIT` change extends an existing method (no new count).

Note for the board: the final gate below runs on a tree that ALSO carries
the FE-GUARD lane's uncommitted work (the comment extractor + its 3-test
`FrontendCommentExtractorTest`, the `SourceVocabularyTest` extension —
comment-body only, same 3 tests, the six frontend comment rewordings —
`reviews/polish/fe-guard.md`) and the UX-implement lane's frontend edits
(`reviews/polish/ux-implement.md`). Those are other lanes' in-flight
deliverables in the shared worktree — not touched by this lane. The
pre-session baseline of 1363 predates those additions.

## Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true` → **exit 0 — BUILD SUCCESS, 1371 tests,
0 failures, 0 errors** (PMD + 0.93 coverage floor in the same build).

1371 = baseline 1363 + this lane's **+5** + the FE-GUARD lane's **+3**
(`FrontendCommentExtractorTest`, verified present in the gate log along
with `AdminControllerAlertsTest` 2/2, `PiiCryptoFramingTest` 8/8 and
`ShelterServiceTest` 36/36). The arithmetic closes exactly.

## Restored / unverified

- Every production mutation was applied ONLY in the mutant worktree and
  reverted there before each green proof; the mutant worktree was deleted
  at the end. `git diff` in the main tree shows **no production file** —
  only the test files listed above plus the other lanes' pre-existing
  uncommitted work.
- Unverified by construction: the pins assert the byte format under the
  TEST-profile key. A key-rotation change legitimately changes the pinned
  hex and must re-derive the constants (the pin's comment says so); that
  is the intended behaviour of a format pin, not a hole.
