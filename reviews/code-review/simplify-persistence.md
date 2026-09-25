# SIMPLIFY-PERSISTENCE — persistence lane

**Lane:** SIMPLIFY-PERSISTENCE · **Branch:** `code-review` · **Mode:** behaviour-preserving simplification, no commit (parent commits).
**Scope (exclusive):** `src/main/java/ee/sheltermap/persistence/**` (60 files, 5,782 lines at start) — repository interfaces' JPA/Spring-Data implementations, entities and mappers. NOT `AbstractPersistenceIT` or the test base classes (BE-PERSISTENCE-TESTS), NOT `domain/**` (SIMPLIFY-DOMAIN).
**Standard applied:** `docs/autopilot/CODE-REVIEW-RUN.md` (rule 1 behaviour-preserving, rule 6 anchors, rule 7 the Maven lock, the readability standard), skills `clean-code`, `code-review`, `test-driven-development` from `docs/skills/` (plus the index's persistence-applicable `sql-code-review`/`refactor` guidance), targets from `reviews/code-review/be-recon.md` (§3.4 the page/count twins, §5.3-§5.8 must-stay mechanisms).

---

## 1. What was unified and renamed

### 1.1 `JpaShelterRepository.java` — 332 → 335 lines — the recon's prime target (be-recon §3.4, §7.7)

`findAdminPage` (L231) and `countAdminPage` (L245) each carried a **copy of the same dynamic WHERE builder** (sources-IN / status / q-LIKE, identical order, identical param names) — the count twin's own comment admitted it ("same dynamic where"). That is the duplication that lets a page and its total drift.

Now both call one builder, and the constraint that makes it mandatory is stated once, where the decision lives:

| Member | Before (lines, signature→close) | After |
|---|---|---|
| `findAdminPage` | 24 | **10** (L233-242) |
| `countAdminPage` | 21 | **9** (L246-254, comment now states the page/total constraint) |
| `adminWhere(status, sources, qPattern)` (new, private static) | — | 17 (L263-279) + 7-line javadoc (L256-262) |
| `AdminWhere(fragment, params)` (new private record) | — | 3 (L281-283) |

- The builder is a **verbatim extraction**: same predicates, same order, same param names, same ` WHERE 1 = 1` head — not a re-derivation. The record is the "small named structure" the run doc's standard calls for instead of passing a `StringBuilder` + a map side-by-side.
- `findActivePage`'s dynamic WHERE was **not** folded in: its predicate set differs (fixed `status = 'ACTIVE'` head, bbox BETWEENs, capacity, provenance pair) and its planner-trap javadoc is the reference the admin builder now points at ("the planner traps documented there apply verbatim"). Forcing one builder over both shapes would mean boolean-flag plumbing — the anti-pattern the standard forbids.
- The `countAdminPage` comment now states the constraint instead of describing the twin: the X-Total-Count is the filtered length without paging, so it must run the page's WHERE *unmodified*.

### 1.2 `JpaUserRepository.java` — 328 → 315 lines (−13) — a 4× copy the recon did not name

`findByIds`, `findAll`, `findAccountPage` and `findInactiveBefore` each carried the **same two-step mapping**: a batched `claims.findByUserIdIn(…)` grouped by user, then `UserMapper.toDomain` with `getOrDefault` — the "one batched claims query, no per-user N+1" idiom, four times, each copy self-describing as "the X idiom". Now one helper:

| Member | Before (lines, signature→close) | After |
|---|---|---|
| `toDomains(List<UserEntity>)` (new, private) | — | 13 (L302-314, javadoc + 9) |
| `findByIds` | 12 | **11** (L186-196) |
| `findAll` | 12 | **3** (L251-253) |
| `findAccountPage` | 15 | **7** (L257-263, the GUEST-excluded-in-SQL constraint comment kept verbatim) |
| `findInactiveBefore` | 15 | **6** (L295-300, the REGISTERED-only prune-candidate constraint kept verbatim) |

One deliberate, provably-inert statement change in `findByIds`: the claims lookup now runs over the **loaded** ids instead of the **requested** ids (the other three sites already did). Provably the same result set: `verification_claims.user_id REFERENCES users(id) ON DELETE CASCADE` (`V1__schema.sql:18`) — an id with no user row can have no claim rows, so the grouped map the mapping reads is identical. Bonus: an all-missed request no longer issues a claims query over phantom ids (one fewer statement, identical empty result). The proof is in the method comment.

### 1.3 `JpaGuidancePostRepository.java` — 141 → 147 lines — a double query

`maxSortOrder()` called `posts.maxSortOrder()` **twice** (null-check + value — two identical `select max(sort_order)` statements per call). One read now, with the constraint that makes one read enough stated: a concurrent append landing on the same position is harmless because the public order tie-breaks duplicate `sort_order` (the `GuidancePostEntity.sortOrder` constraint — non-unique by design, V28). Also: `java.util.Collection` FQN → import (the one FQN in the file).

**Rule 2 compliance:** every public repository method keeps its name and signature — the only new symbols are three private members (`adminWhere`, the `AdminWhere` record, `toDomains`). No service, controller, interface or test file was touched.

## 2. The equivalence evidence (rule 1)

The unification had to be proven, not asserted:

1. **Byte-identical generated SQL, old vs new build.** A throwaway harness (kept at `/tmp/persist-sql/`, outside the repo) drives the *real* `JpaShelterRepository` code with a proxy `EntityManager` that captures the exact SQL string and every named parameter. Run against the pre-edit classes and the post-edit classes over **all 24 combinations** of (sources: ∅ / {USER} / {PAASETEAMET, MUNICIPALITY} / full domain) × (status: null / ACTIVE / INACTIVE) × (q: null / pattern) — 48 statements (page + count each): **`diff old.txt new.txt` = 0 lines**. Same SQL text, same params, same values. The harness is the red-proof discipline: any reordering, rewording or param rename in the extraction would have shown up as a diff.
2. **Tests on the resulting rows (existing pins, green UNMODIFIED in the gate):**
   - `AdminModerationIT.theAdminListFiltersByStatusSourceAndQuery` — the exact row sets for each filter combination (status INACTIVE/ACTIVE, source REGISTRY-side/USER, q case-insensitive name+address, composed source+q).
   - `AdminModerationIT.theAdminListPagesTheFilteredOrderWithTheTotalHeader` — page rows, id-ascending order, and `X-Total-Count` = the filtered length without paging (this is the page/total-agreement pin — the very invariant the single builder now structurally guarantees).
   - `AdminModerationIT` 25/25, `AdminAuthorizationIT` 5/5.
3. **SQL-shape/cost pin (existing, green):** `ShelterPagingCostIT` 5/5 — the admin list must run exactly the two `shelters` statements (the count twin + the page read, the `windowSettled` scans==2 shape gate) with the settled tuple bands at limit=1 vs limit=100. The unified builder cannot change that shape: it produces the same two statements, byte-identical.
4. **User-mapping extraction:** `UserRepositoryIT` 4/4, `UserOptimisticLockingIT` 2/2, `UserMapperBlankValueTest` 2/2, plus the FK-cascade proof for the loaded-vs-requested id change (§1.2).
5. **Full gate:** 1361/1361 (§5) — every consumer of every touched repository (guidance ordering, moderation queue, media library, reports queue, auth, retention) green unmodified.

## 3. Duplication found and deliberately LEFT, with reasons

| Shape | Where | Why left |
|---|---|---|
| `…order by X.createdAt desc, X.id desc offset :offset fetch first :limit rows only` in 5 paged queries | `SpringDataShelterReportRepository` ×2, `SpringDataModerationActionRepository`, `SpringDataMediaAssetRepository`, `SpringDataUserRepository` | Alias-dependent (`r`/`a`/`u`), so no fragment is shareable verbatim; each query is pinned by its own IT (newest-first, id tie-break, the V30 index-scan note) and each page has its own explicit count twin on the same table — there is no cross-table drift risk of the admin-twins kind. A shared constant needs a new cross-interface type to de-duplicate one literal line; the run standard says stop when the code is plain. |
| The upsert `save` twins (find-by-(shelter,user) → set id → mutate-managed-row-or-insert) | `JpaShelterOccupancyReportRepository.save` vs `JpaShelterOpenStatusReportRepository.save` | Two different entities/tables with different anchor fields (`updated_at` vs `created_at`) and different pinning ITs; a generic helper across Spring-Data interfaces would add indirection to remove no drift risk. Each 20-line body is flat and commented. |
| `findByEmail`/`findByPhone` twins (V34 framed/legacy dual lookup) | `JpaUserRepository` L157-199 | They differ in the canonicalizer (lower-case e-mail vs E.164 phone) — the difference is exactly what a merged helper would have to parameterize, and the V34 fallback comments are the BLIND-INDEX-FRAMING lane's scoped-in transition (retire deliberately, per that lane's board entry). Merging would trade clarity for terseness. |
| Inline FQN `ee.sheltermap.domain.ShelterReportType` ×3 | `SpringDataShelterReportRepository` L21,29,37 | Importing it would shift **every** line of the file down 1 — the file carries the run's guarded anchors (`00-CURRENT-STATE.md` cites :16-22, :24-29, :31-39). Run rule 6: where you can keep a cited range stable, do. Cosmetic gain < anchor-churn cost. |
| The "house idiom" in-place-managed-row save pattern in 6+ `save` methods | `JpaShelterRepository`, `JpaGuidancePostRepository`, `JpaGuidanceTranslationRepository`, `JpaMediaAssetRepository`, `JpaSiteTextRepository`, `JpaShelterReportRepository`, … | It is the version-discipline mechanism (recon §5 must-stay: in-place mutation is what makes the @Version UPDATE fail instead of clobber). Each site's comment states its own constraint (which fields are immutable, which stamps move); extracting a shared "idiom" would split the constraint statement from the code it protects. |
| `countByShelterId` (no dismiss filter) vs `countOpen` (dismiss filter) | `SpringDataShelterReportRepository` | Not a drift twin: the admin queue's *list* shows dismissed rows dimmed, so the queue total must count them, while the *open-scope* total must not (be-recon §5.3, current-state §3). The two comments spell the distinction. |

## 4. Comment pass (constraint-not-history, per the run standard)

Comment-only, zero behaviour change; `SourceVocabularyTest` 2/2 green on the result:

- **9 kebab-case change names removed** (the residue SIMPLIFY-DOMAIN and CHANGE-NAME-SWEEP-TESTS handed to my files): `community-review-queue` ×4 (`ShelterEntity` ×2, `JpaModerationAuditLog`, `ModerationActionEntity`), `bilingual-guidance` ×3 (`SpringDataGuidanceTranslationRepository`, `GuidanceTranslationEntity`, `JpaGuidanceTranslationRepository`), `moderation-dashboard-completion` ×2 (`JpaShelterInfoRequestLog`, `JpaShelterHistoryLog`) — each replaced with the version + the constraint, nothing else lost.
- **8 unresolvable ledger ids removed** (a class the guard's patterns miss, be-recon §4.2): `B7a` ×3 (`SpringDataShelterRepository`, `SpringDataShelterHistoryRepository`, `JpaModerationAuditLog`), `B7b` ×1 (`JpaShelterRepository.save`), `S1b` ×3, `S1c` ×1 (`SpringDataPasswordResetTokenRepository`, `PasswordResetTokenEntity`). The constraint each stated ("stable order", "anchors the rotation cooldown + daily cap") is kept; the id is gone.
- **Broken sentence fixed:** `JpaModerationAuditLog.recordLabeled` — "Crisis-guidance a guidance/media row" (a change name had eaten the article) → "A guidance/media row".
- **Stale claim corrected:** `JpaPasswordResetTokenRepository` class javadoc "Codes are stored hashed (SHA-256)" → the keyed `v2:` form — verified against `PasswordResetService.java:191` (`piiCrypto.codeHash(DOMAIN_CODE_PASSWORD_RESET, …)`) and `PiiCrypto.codeHash` (`CODE_HASH_PREFIX = "v2:"`). The `JpaRefreshTokenRepository` twin was checked and is **correct as written** (refresh tokens really use unkeyed `sha256Hex`, `JwtTokenService:61`).
- **Orphaned javadoc relocated:** `SpringDataShelterReportRepository` carried a 2-line block ("The report table's row count without paging … the inherited CrudRepository.count is the one COUNT") floating between declarations after its method became the inherited `count`. The sentence now lives on `JpaShelterReportRepository.countAll()`, where the behaviour is.
- **FQN cleanups** (import instead): `SpringDataShelterRepository` (`java.time.Instant` ×2, `java.util.Optional`), `JpaGuidancePostRepository` (`java.util.Collection`).

## 5. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0** (detached, exit file read; window 21:21:05–21:24:01 after a lock wait — every Maven invocation this lane ran, including the two harness compiles and the focused run, took the lock per rule 7).

- **1361 tests, 0 failures, 0 errors, 0 skipped** — the baseline exact (1361 baseline + 0 new + 0 removed).
- PMD `check` clean (no violations), **"All coverage checks have been met"** (the 0.93 floor).
- No missing-class wall (the rule-7 hazard) — and none observed in the log.
- Focused pre-run (before the gate): `AdminModerationIT` 25, `ShelterPagingCostIT` 5, `UserRepositoryIT` 4, `UserOptimisticLockingIT` 2, `UserMapperBlankValueTest` 2, `ShelterRepositoryIT` 7, `ShelterOptimisticLockingIT` 2, `ShelterSubmissionCapRaceIT` 1, `AdminAuthorizationIT` 5, `CommunityReviewIT` 14, `MarkInaccurateIT` 5, `PasswordResetTokenRepositoryIT` 6, `ShelterBboxPagingIT` 10, `DocumentationFactsTest` 21, `SourceVocabularyTest` 2 → **111/111, exit 0**.

## 6. Anchor shifts (rule 6)

**None owed.** The only in-scope file cited by `docs/agent/00-CURRENT-STATE.md` is `SpringDataShelterReportRepository.java` (:16-22 `reportersByShelterAndType`, :24-29 `countByTypeForShelterIds`, :31-39 the "last verified" query). My sole edit to that file (deleting the 3-line orphaned block at L71-73) sits **below** all three cited ranges — the cited lines are byte-stable at their cited lines. `DocumentationFactsTest` ran 21/21 both in the focused run and inside the gate. Every other in-scope edit either kept its file line-neutral or is in an uncited file (grep-verified: no other `persistence/` citation exists in the document).

## 7. Cross-lane (on the notes board)

1. **Reply to SIMPLIFY-VERIFICATION (PhoneNumbers move):** standby confirmed; the move has not landed. **Blocker filed:** two APPLIED programmatic migrations import `PhoneNumbers` (`V13PiiEncryptionMigration.java:4`, `V34BlindIndexFramingMigration.java:4`) and rule 5 forbids editing applied migrations — the move as scoped cannot compile without a parent decision or a legacy-package shim. My two importers for the record: `UserMapper.java:10`, `JpaUserRepository.java:9`.
2. **auth lane:** `auth/PasswordResetToken.java:10` carries the same stale "(SHA-256)" claim I fixed in my twin — comment-only reword.
3. **app lane:** `app/ShelterHistoryLog.java:60` still carries one unresolvable `B7a` id (the other four `B7a` references were in my in-scope persistence tree and are gone — five files carried the id).
4. **BE-PERSISTENCE-TESTS (optional):** a permanent SQL-shape pin for the admin page/count pair — a query-listener IT asserting the page SQL and count SQL share the same WHERE fragment across the filter matrix. The byte-identity harness (§2.1) is the proof today; the pin would make the invariant self-enforcing.

## 8. Unverified / not covered

- **Plan-shape equivalence:** proven at the SQL-text + params level (byte-identical) and pinned at the execution level by `ShelterPagingCostIT` in the gate; I did not take an `EXPLAIN` diff myself (the cost IT is the repo's own plan-shape authority, and the text identity makes the plan-input identity follow).
- **`maxSortOrder` single-read:** equivalence under a *concurrent* append rests on the documented duplicate-harmlessness of `sort_order` (entity javadoc + the public order contract's tie-breakers); sequential behaviour is identical and the whole guidance suite is green in the gate. No test pins the exact statement count of this method.
- **`findByIds` loaded-vs-requested ids:** proven by the FK cascade, not by a new test (the persistence test tree is another lane's; the optional pin request above covers the adjacent shape).
- **Frontend gate:** not run — no frontend file in my diff (verified by `git status`). Post-gate observation, for the parent only: `frontend/src/app/features/map/{map-page.ts,legend-view.ts}` are being actively edited by a concurrent frontend lane (mid-rename between `markerTone`/`LegendTone` and `tonePasses`, mtime 21:33 — after my gate window 21:21:05–21:24:01, which therefore does not cover that state and was green). Not my scope; left strictly alone.
- **Harness:** `/tmp/persist-sql/{SqlShapeHarness.java,old.txt,new.txt,*.txt,*.log}` remains for inspection; it is outside the repo and commits nothing.
- The jacoco "Unsupported class file major version 71" warnings in the gate log are the pre-existing instrumenter noise (jacoco 0.8.13 vs newer-JDK classes) present in prior lanes' green gates — the build, the test count and the coverage check all passed; no class in my diff is implicated.

## 9. Files for the parent's commit

18 files under `src/main/java/ee/sheltermap/persistence/` (numstat: +81/−85, net −4 lines over the package), `reviews/code-review/simplify-persistence.md`, and the five `docs/autopilot/CODE-REVIEW-NOTES.md` lines (a concurrent lane's three FINISH-CONFIG lines also landed on the board during my run — not mine). No test files. No `target/`, docs, migrations, services, controllers or frontend files. (The concurrent `pom.xml` / `dependency-check-suppressions.xml` edits in the shared worktree are the dependency-check lane's, not mine — excluded from my commit.)
