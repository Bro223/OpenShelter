# TEST-QUALITY-MISC — test-quality audit + mutation pass

Lane: TEST-QUALITY-MISC (code-review branch, uncommitted)
Scope: backend test classes under `src/test/java/ee/sheltermap/**` not covered by the
TEST-QUALITY-API / TEST-QUALITY-AUTH / TEST-QUALITY-GUIDANCE / TEST-QUALITY-CONFIG lanes and
the persistence base class `AbstractPersistenceIT` — i.e. `alerts/`, `app/`, `domain/`,
`ingestion/`, the non-base `persistence/` classes, `retention/`, `sitetexts/`, `testutil/`,
`verification/`, and root `VerificationFlowTest.java`.
Method: read every in-scope test file in full + the production classes they pin; structural
scans (comment swallowing, vacuous assertion patterns, Mockito/assumes, disabled tests);
mutation pass on significant behaviours in a throwaway copy.

## 1. Read-pass verdict

The tree is strong overall. Every hand-rolled fake in scope is a capturing double whose
captured state gets asserted; every guard test asserts both sides of the guard; no
`@Disabled`, no JUnit `assum*`, no Mockito, no `assertTrue(true)`, no swallowed methods
(scanner + compile check — the earlier awk heuristic false-positived on `{@code}` javadoc,
the definitive checks are clean). Specific pins verified as real:

- **PII** — `EmailVerificationProviderTest`/`PhoneVerificationProviderTest` recompute
  `pii.codeHash` through the same `TestPiiCrypto` instance and assert the stored hash plus
  the exact code column; `FileVerificationSendLogTest` asserts the contact/phone code is
  **absent from the log file text**; `UserMapperBlankValueTest` pins blank→null on
  verification claims.
- **Retention/erasure semantics** — `AccountService.deleteAccount` erasure (credentials,
  refresh tokens, pending verifications, send log, shelter history, ownership transfer,
  orphan delete, report-submitter rebind) is pinned in the ITs; the "exploding
  repository" failure path is exercised for real (the fake's `findByCreatedBy` throws).
- **Ingestion** — axis order, parse errors, drop counters, keep-list semantics, client
  rejection handling all verified against the production source before mutation.
- **Abuse guards** (report rate/duplicate/daily cap, confirm tally, owner-edit trust
  reset) — see mutation table.

## 2. Mutation table (14 instances, throwaway copy at /tmp/test-quality-misc/mutant)

Every mutation removed/loosened exactly one behaviour a test names; verdict = the named
test(s) went red.

| # | Behaviour removed (file) | Named test(s) | Verdict |
|---|---|---|---|
| M1 | retention: `instanceof AdminUser` second gate (`RetentionService`) | `RetentionServiceTest` (6/6) + `RetentionPruningIT` (6/6) | **SURVIVED → defect** (both gates pinned only in combination; fixed, see §3) |
| M2 | retention: `markLastActivityById` backstop for null stamp (`JpaUserRepository`) | `UserRepositoryIT.markLastActivityByIdOverwrites…` | KILLED (NOT NULL violation propagates) |
| M3 | retention: FAILED run-row recording (`RetentionService`) | `RetentionServiceTest.failingPrune…` | KILLED |
| M4 | retention: `AccountService.deleteAccount` call (`RetentionService`) | `RetentionPruningIT.prunesTheIdleAccount…` | KILLED |
| M5 | ingestion: L-EST97 axis transposition (`Lest97AxisOrder`) | `Lest97AxisOrderTest` | KILLED |
| M6 | ingestion: client-side Estonia bbox guard (`CsvRegistryClient`) | `CsvRegistryClientTest` | KILLED |
| M7 | ingestion: CSV drop-counter increment (`RegistryCsvParser`) | `RegistryCsvParserTest` | KILLED |
| M8 | ingestion: service-side empty-keep-list guard (`ShelterImportService`) | `ShelterImportServiceTest` | SURVIVED — not a defect: no-blind-wipe is pinned at the repository layer (fake mirror + `ShelterRepositoryIT.emptyKeepListRefusesBlindWipe`); the service branch is redundant defense-in-depth, left as-is |
| M9 | ingestion: client-rejected ids entering the keep-list (`ShelterImportService`) | `ShelterImportServiceTest` | KILLED |
| M10 | app: submitter counted in the confirm tally (`ShelterReportService`) | `ShelterReportServiceTest` | KILLED |
| M11 | app: duplicate-report dampening (`ShelterReportService`) | `ShelterReportServiceTest` | KILLED |
| M12 | app: daily submission cap (`ShelterService`) | `ShelterServiceTest` | KILLED |
| M13 | app: owner-edit trust reset (`ShelterService`) | `ShelterServiceOwnershipTest` | KILLED |
| M14 | persistence: candidate query's kind filter (`JpaUserRepository`, simulated first-gate regression) | `RetentionPruningIT.theCandidateQueryLeavesAdminRowsOut` (new) | KILLED (new pin, see §3) |

**12/14 killed out of the box; the 2 survivors both relate to the one real defect**
(the combined pin M1 and the new first-gate pin M14, which by design only exists after
the fix). Zero production bugs proven — all surviving behaviours had a second pin or were
intentional defense-in-depth.

## 3. The one defect: the admin carve-out was pinned only in combination

`RetentionService.prune` protects admins with **two gates**: (1) the candidate query is
`UserKind.REGISTERED`-only, (2) the service re-checks `instanceof AdminUser` before
erasure. The existing tests only ever exercised both gates together, so **removing
either single gate left the whole suite green** (M1: removing gate 2 survived 12/12
retention tests; the first M14 variant confirmed gate 1 the same way). Since
`AdminUser extends RegisteredUser`, gate 2 alone is what would stop an admin erasure if
the query regressed — that safety net had no pin.

Fixed by pinning each gate individually (no production change, tests only):

- `RetentionServiceTest.anAdminLeakingIntoTheCandidateQueryIsNeverErased` (new) — a
  candidate query that ignores the kind filter (simulated regression); the service must
  still skip the admin, erase the idle registered user, and keep the report counts right.
  **Red-proven:** with gate 2 removed it is the single red test
  (`expected not null but was null`, 7-run class, 1 failure) — log `red-M1.log`.
- `RetentionPruningIT.theCandidateQueryLeavesAdminRowsOut` (new) — asserts the real JPA
  candidate query returns no admin row no matter how idle the admin is. **Red-proven:**
  with the kind filter removed it is the single red test while
  `neverPrunesAnAdminNoMatterHowIdle` stays green (gate 2 holds) — log `red-M14b.log`.
  (An earlier Java-side variant of M14 was invalid as a mutation — an unflushed-column
  read against the persistence context; the faithful SQL-side variant is the one proven.)
- **Green:** both classes 7/7 + 7/7 with production unmodified — log `green.log`.

## 4. Observed, not changed (reported for the parent)

- `SiteTextsServiceTest.theAllowlistIsTheFrontendSet` is weaker than its name: it pins
  sizes (10/9/12), the dotted key shape and `LINK_KEYS` membership, but not the actual
  key names against `frontend/src/app/core/i18n/site-texts.ts`. Pinning key names would
  couple the backend suite to the frontend file (cross-lane design decision — filed in
  CODE-REVIEW-NOTES.md).
- `InMemoryVerificationSendLog.countToday` counts all records rather than day-filtered
  (documented in its javadoc; no test crosses midnight, so it is inert).
- `ShelterOptimisticLockingIT:77` / `UserOptimisticLockingIT`-style
  `assertThat(entity.getVersion()).isNotNull()` on a schema-guaranteed non-null column is
  vacuous as an IT pin; the real version pins (isZero→1, optimistic-failure) sit right
  next to them and carry the weight. Left untouched (removal would only delete a line).
- Several `assertThat(user.getId()).isNotNull()` right after `save(...)` are real
  identity-assignment pins in the unit context (a `save` that doesn't assign an id
  fails them) but weak in the IT context where the DB guarantees the id. Supplementary
  only; not defects.

## 5. Gate status

- Baseline (before my edits): full `clean verify` exit 0 — **1340 tests, 0 failures**
  (2:36) — `/tmp/test-quality-misc/baseline-gate.log|.exit`.
- Final: full `clean verify` exit **0** — **1342 tests, 0 failures** (+2 = the two new
  retention pins), PMD clean, jacoco 0.93 floor met — `/tmp/test-quality-misc/final-gate.log|.exit`.
  No foreign failures; the foreign `DocumentationFactsTest` doc-anchor reds seen by other
  lanes are not present on this tree at gate time (their in-flight rewrites had landed).

## 6. Production bugs proven

None. All 14 mutations either killed or were explained (M8 redundancy; M1/M14 the
test-side defect fixed in §3). No production code changed by this lane.

## 7. Files for the parent's commit (tests only + this report + the notes file)

- `src/test/java/ee/sheltermap/retention/RetentionServiceTest.java` (+1 test)
- `src/test/java/ee/sheltermap/retention/RetentionPruningIT.java` (+1 test, +1 import)
- `reviews/code-review/test-quality-misc.md` (this file)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (lane entry)

## 8. Not verified / limits

- Mutations targeted the significant behaviours (retention, ingestion, abuse guards);
  not every trivial line in the 37 audited files was mutation-tested — the read pass
  covers the rest.
- The `sitetexts` key-name lockstep against the frontend file was deliberately not
  pinned (cross-lane coupling); reported, not fixed.
- Throwaway copy kept at `/tmp/test-quality-misc/mutant` with all mutations reverted
  (clean vs baseline except the two synced test files); logs in `/tmp/test-quality-misc/`.
