# UNREAD-PERSISTENCE — persistence package, the 41 files no lane had read

**Lane:** UNREAD-PERSISTENCE · **Branch:** `feature/frontend` · **No commit** — the parent commits.
**Scope (exclusive):** `src/main/java/ee/sheltermap/persistence/` (68 files). Primary targets:
the 41 persistence files in `reviews/polish/readability-sweep.md` Appendix A (no report under
`reviews/` names them).
**Skills used:** `docs/skills/clean-code.md`, `docs/skills/code-review.md` (two-axis reporting).
**Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` — rule 1 (behaviour-preserving), rule 6 (anchors),
rule 7 (Maven lock on every invocation).
**Prior lane read first (per task):** `reviews/code-review/simplify-persistence.md` — the lane
that flattened this package with the `adminWhere` filter builder and proved byte-identical SQL
over 24 filter combinations (proxy-`EntityManager` harness, `diff old.txt new.txt` = 0 lines).
Its §3 "deliberately LEFT" table is the adjudication baseline for every duplication I re-found.

**Bottom line:** the package is clean. **Zero edits landed** (one whitespace-only edit was made
and reverted as out of mandate — §3). **Zero correctness defects** found. Two
low-consequence observations filed for the owner (§4). Every load-bearing comment claim in the
41 files was verified against the code (§5).

---

## 1. Method, and what pins this package

These are the classes that build SQL. Before treating anything as fixable I established what
pins each query:

- `ShelterPagingCostIT` (5 tests) — statement-multiset + settled tuple bands for the admin
  list's two `shelters` statements (the count twin + the page read); green in the gate.
- `AdminModerationIT` (25) — exact row sets per filter combination, page order,
  X-Total-Count agreement (the page/total invariant the single `adminWhere` builder structurally
  guarantees).
- The `src/test/java/ee/sheltermap/persistence/` tree (10 ITs/tests) — repository behaviour
  pins, optimistic locking, the submission-cap race.
- The earlier lane's byte-identity harness result (its §2.1) for the admin builder.
- Anchor guard: `docs/agent/00-CURRENT-STATE.md` cites exactly ONE persistence file —
  `SpringDataShelterReportRepository.java` (three ranges, all inside its first 39 lines).
  `DocumentationFactsTest` 21/21 and `SourceVocabularyTest` 5/5 in the gate.

Readability-sweep discipline applied: the code is right when a comment contradicts it; nothing
a test or spec references gets renamed (none found); no reformatting; no migrations; every
duplicated literal fragment checked for genuine identity before any merge consideration (all
real duplicates in the package are the earlier lane's adjudicated-leave shapes — §5.3).

## 2. The 41 files, with a one-line verdict each

All paths under `src/main/java/ee/sheltermap/persistence/`. "Clean" = no edit warranted;
comments accurate or constraint-stating; SQL/ordering/named-parameters correct.

**Spring Data interfaces (8):**

| File | Verdict |
|---|---|
| `SpringDataDataImportRepository.java` | Clean — derived `...OrderByImportedAtDescIdDesc` triples are deterministic; the "OK / NOT_MODIFIED" comment verified against `DataImportLog.VERIFIED_STATUSES`. |
| `SpringDataReportActionRepository.java` | Clean — the explicit-`@Query` justification (derived `minCreatedAtByUserIdAndCreatedAtAfter` mis-parses) is stated where the decision lives; JPQL correct. |
| `SpringDataRetentionRunRepository.java` | Clean — deliberately empty `CrudRepository` (write-only ops audit, §5.6). |
| `SpringDataShelterHistoryRepository.java` | Clean — ascending id order + the dangling-`shelter_id` rationale stated accurately. |
| `SpringDataShelterInfoRequestRepository.java` | Clean — single-row UNIQUE + batched IN (no N+1); comments accurate. |
| `SpringDataShelterOccupancyReportRepository.java` | Clean — the 2 h freshness-window query is the batched projection input; comment accurate. |
| `SpringDataShelterOpenStatusReportRepository.java` | Clean — `distinct userId` by the (shelter, user) unique constraint; auto-confirm tally input, accurate. |
| `SpringDataUserCredentialsRepository.java` | Clean — deliberately empty `CrudRepository` (PK-is-userId, one row per user). |

**JPA implementations (10):**

| File | Verdict |
|---|---|
| `JpaGuidanceTranslationRepository.java` | Clean — house in-place-mutation idiom, Clock-stamped `updated_at` on update, domain-owned stamps on insert (verified, §5.5); **observation F1a** on `findAll` (:92). |
| `JpaMediaAssetRepository.java` | Clean — immutability stated and honoured (update path re-persists same values); batched group-by reference counts, no N+1; DELETE flush with the SET NULL cascade rationale. |
| `JpaPasswordResetTokenRepository.java` | Clean — keyed-`v2:` javadoc (the earlier lane's fix, present in tree); **observation F2** on the `createdAt` re-save rule (:80-83). |
| `JpaPendingContactChangeRepository.java` | Clean — PII encrypt/decrypt verified on both directions; the conditional-UPDATE atomic-increment comment matches the `@Modifying` query; the `toDomain` attempt-rebuild loop is safe (the method is a plain increment, §5.7). |
| `JpaRefreshTokenRepository.java` | Clean — "stored hashed (SHA-256)" verified accurate (unkeyed `sha256Hex`, the two prior lanes' adjudication + `token_hash` length 64); revoke-by-timestamp contract stated. |
| `JpaShelterOccupancyReportRepository.java` | Clean — upsert find-then-save on the unique (shelter, user); the "version discipline" comment is established house vocabulary for the in-place-mutation idiom (not a claim of a `@Version` column — §5.8). |
| `JpaShelterOpenStatusReportRepository.java` | Clean — mirror of the occupancy upsert with the `created_at` anchor; the "refreshed by every re-tap" claim verified at the sole caller (§5.4). |
| `JpaShelterReportRepository.java` | Clean — UPDATE-path in-place mutation with the identity-fields-immutable constraint stated; the dismissed/damped restore mapping is complete; `countAll`/`countOpen` distinction is the earlier lane's adjudicated non-twin. |
| `JpaSiteTextRepository.java` | Clean — (key, locale) uniqueness rationale, flush-on-write house idiom; **observation F1b** on `findAll` (:29). |
| `JpaUserCredentialsRepository.java` | Clean — PK-keyed upsert; insert stamps `createdAt`/`changedAt`, update overwrites only the mutable pair. |

**Mappers (4):**

| File | Verdict |
|---|---|
| `GuidancePostMapper.java` | Clean — deliberately excludes `id`/`updated_at` with the single-writer constraint stated. |
| `GuidanceTranslationMapper.java` | Clean — same discipline; the "stored stamp is the authority" comment matches the repository's behaviour. |
| `MediaAssetMapper.java` | Clean — round-trips through `MediaAsset.create` whose bounds the V23/V25 CHECKs guarantee. |
| `SiteTextMapper.java` | Clean — 1:1 field copy, no normalisation needed (stated). |

**Entities (19):**

| File | Verdict |
|---|---|
| `DataImportEntity.java` | Clean — V15 shape; status vocabulary comment (`OK \| FAILED \| NOT_MODIFIED \| SKIPPED`) matches the service's literals. |
| `GuidancePostEntity.java` | Clean — V23 shape; the `sort_order` non-unique-by-design constraint with the atomic-renumber rationale is the reference the admin builder points at. |
| `GuidanceTranslationEntity.java` | Clean — V26 shape; (post, locale) + (locale, slug) uniqueness and FK cascade stated accurately. |
| `MediaAssetEntity.java` | Clean — V23 shape; filename/display-metadata split and the dangling `uploaded_by` rationale accurate. |
| `ModerationActionEntity.java` | Clean — V11/V14/V17 nullable-evolution history stated as constraints (dangling ids, "Deleted shelter"/"Deleted account" rendering), not history tone. |
| `PasswordResetTokenEntity.java` | Clean — V8 `created_at` anchor ("rotation cooldown + daily cap") and the not-unique-since-V8 hash rationale accurate. |
| `PendingContactChangeEntity.java` | Clean — encrypted-target + code-hash columns match the repository's PII handling. |
| `PendingVerificationEntity.java` | Clean — V-shape accurate; the class the earlier verification lanes already swept. |
| `RefreshTokenEntity.java` | Clean — hashed token, unique, revoke-timestamp model; matches the repository's contract. |
| `ReportActionEntity.java` | Clean — V9 shape; the trailing-hour throttle anchor comment accurate. |
| `RetentionRunEntity.java` | Clean — V24 write-only audit row; getters have zero in-repo consumers (§5.6) but were left (house entity surface, prior-lane precedent). |
| `ShelterHistoryEntity.java` | Clean — V18 immutable-row convention; no-FK dangling-`shelter_id` rationale (the delete's own row outlives the cascade) accurate. |
| `ShelterInfoRequestEntity.java` | Clean — V19 one-row-per-shelter UNIQUE + kept-after-reply audit posture; SET NULL erasure convention stated. |
| `ShelterOccupancyReportEntity.java` | Clean — V9 unique (shelter, user); `updated_at` (not a creation time) anchors the 2 h window — matches the repository's `UpdatedAtAfter` query. |
| `ShelterOpenStatusReportEntity.java` | Clean — V22 unique (shelter, user); `created_at` refreshed per re-tap (verified, §5.4); column is deliberately updatable — matches `applyFields`. |
| `ShelterReportEntity.java` | Clean — V9 (shelter, user, type) uniqueness; `detail` NULL-for-non-OTHER, `dismissed_at` V10, `damped` V16 — all accurate. |
| `SiteTextEntity.java` | Clean — V27 CHECKs + (key, locale) uniqueness stated; key/locale/value/url shapes match. |
| `UserCredentialsEntity.java` | Clean — PK-is-`user_id`; the `03-auth.puml` citation is resolvable (house precedent, verified by the sweep). |
| `VerificationClaimEntity.java` | Clean — history-table model (revoked rows stay; re-verification inserts) — the FK cascade that the earlier lane's `findByIds` proof rests on. |

**Not re-reviewed (already read by earlier lanes, named in their reports — spot-checked
only):** the remaining 27 files, incl. `JpaShelterRepository` (the `adminWhere` builder —
present in tree, :265-284), `JpaUserRepository` (`toDomains` — present, :306),
`JpaGuidancePostRepository` (single-read `maxSortOrder`), `SpringDataShelterReportRepository`
(the anchored file), `JpaReportActionLog` (the `os-report-actions` advisory-lock key is a
functional string, not a name), `JpaRetentionRunLog` (write-only).

## 3. Fixes: zero (and the one reverted)

No comment, name or dead-code defect existed in the 41 files. Mechanical scans over all 68
package files found nothing to act on:

- Dead kebab change names: **0** (the only multi-segment kebab tokens are prose idioms —
  `find-then-save`, `read-check-write`, `delete-then-insert`, `stale-plus-fresh`,
  `check-and-record`, `page-and-total`, `sign-in-activity`, `image-free-safe` — and the
  functional advisory-lock key prefix `os-report-actions`).
- Unresolvable ledger/planning ids (`S1b`, `B7a`, …): **0**.
- History-tone comments (wave/refactor/TODO/FIXME): **0**.
- Stale hash wording: **0** (the one `(SHA-256)` claim is verified accurate, §5.9).
- Consecutive duplicate comment lines (the readability-sweep D1 class): **0**.
- Duplicated literal fragments: only the earlier lane's adjudicated-leave shapes (§5.3) —
  re-verified present, none newly shareable.

**Reverted mid-lane (transparency):** an early read of `JpaPasswordResetTokenRepository.java`
came back hypa-compressed and had dropped the `@Override` on `save` from view; I added it
(and a blank line), the first gate run then failed with
`java.lang.Override is not a repeatable annotation interface` — proving the annotation was
already there. Reverted via `git checkout`; the residual "missing blank line" was not re-applied
because it is whitespace-only reformatting, which the lane rules forbid. Net tree change:
**none** (`git status` clean at gate time, modulo a sibling lane's in-flight frontend files —
§7).

## 4. Correctness findings, ranked by consequence

**No defects found** — no predicate that misstates its comment, no missing bound, no
non-deterministic ordering with a consequence, no nullable column treated as non-null.
Two observations, both LOW, filed not fixed:

### F1 (LOW, informational) — two `findAll()` reads without `ORDER BY`

- `JpaGuidanceTranslationRepository.java:92-95` — `translations.findAll()` (no ORDER BY).
- `JpaSiteTextRepository.java:29-32` — `texts.findAll()` (no ORDER BY).

Evidence/consequence analysis: both consumers build maps keyed by a unique pair and do nothing
order-sensitive — `GuidanceService.translationsByPost()` (:281-286, sole consumer
`AdminGuidanceController:178`) feeds an order-insensitive "any row matches" search;
`SiteTextsService.getAll()` (:47-55) puts each (locale, key) into a `LinkedHashMap` — the rows
are unique per pair, so content is deterministic and only the JSON **key order** of the admin
site-texts response can vary. No test pins key order; the admin UI iterates its own fixed key
list. **No data-correctness impact.** Fix would be an `ORDER BY` on two Spring-Data-derived
queries (a query-builder change owed IT re-verification for a zero-visible-benefit); the
recommendation to the owner is **leave**.

### F2 (LOW, near-miss) — `created_at` re-save rule is caller-dependent

`JpaPasswordResetTokenRepository.java:80-83` — the comment says "carry the stored value on
re-save", but the code carries `token.getCreatedAt()` and stamps `clock.instant()` when it is
null. A re-save of a token whose domain `createdAt` is null would **rewrite `created_at` to
now**, breaking the V8 rotation-cooldown anchor. Verified unreachable today: the INSERT site
(`PasswordResetService:191`, 3-arg ctor → null → stamp, correct) and both re-save sites
(`:274`, `:281`) always pass a token loaded through `toDomain` (non-null `createdAt`).
Reported so the invariant is visible; no fix owed while the callers hold.

## 5. Claims verified against the code (the package's comments held up)

1. **`SpringDataDataImportRepository` "OK / NOT_MODIFIED"** — `DataImportLog.VERIFIED_STATUSES
   = List.of("OK", "NOT_MODIFIED")` (`app/DataImportLog.java:26`); the service emits exactly
   those literals (`ShelterImportService:105,111`).
2. **`JpaShelterOpenStatusReportRepository` / `ShelterOpenStatusReportEntity` "created_at
   refreshed by every re-tap"** — sole caller `ShelterReportService.putOpenStatus`
   (`:248-265`) passes a fresh `clock.instant()` to `update(...)` on every re-tap; the entity
   column is deliberately updatable and `applyFields` copies it unconditionally.
3. **`JpaPasswordResetTokenRepository` "carry the stored value on re-save"** — both re-save
   call sites load-then-save (§4 F2 for the boundary condition).
4. **`JpaGuidanceTranslationRepository` "forPost(...) sets createdAt = updatedAt = now"** —
   `GuidanceTranslation.forPost` :54-56 does exactly that; the INSERT path therefore writes
   non-null `updated_at` into the NOT NULL column.
5. **`JpaRefreshTokenRepository` "stored hashed (SHA-256)"** — unkeyed `Hashes.sha256Hex` via
   `JwtTokenService` (the two prior lanes' adjudication); `token_hash` length 64 = SHA-256 hex.
   Distinct from the reset/contact codes' keyed `v2:` form — the file does not conflate them.
6. **`JpaPendingContactChangeRepository` PII** — `piiCrypto.encrypt` on the write path,
   `decrypt` on the read path; the domain keeps the plain value, the entity the ciphertext
   (column length 1024 fits).
7. **`JpaPendingContactChangeRepository.toDomain` attempt rebuild** — the
   `for (i < attempts) registerFailedAttempt()` loop is safe: `registerFailedAttempt()` is a
   plain `attempts++` (`PendingContactChange:79-80`), no throw, no side channel.
8. **The "version discipline" upsert comments** (`JpaShelterOccupancyReportRepository:32`,
   `JpaShelterOpenStatusReportRepository:33`) — established house vocabulary for the
   in-place-managed-row idiom (`ShelterEntity`'s `@Version` javadoc names the same rule
   "mutating the managed row in place — never a fresh-entity merge"; the earlier lane's report
   calls it "the version-discipline mechanism"). These two tables have **no** `@Version` —
   last-write-wins on the same row, which is the intended upsert semantics. The comments were
   left as the earlier lane left them (adjudicated in its §3 "deliberately LEFT" table).
9. **`JpaRefreshTokenRepository` vs `JpaPasswordResetTokenRepository` hash wording** — no
   conflation: refresh = unkeyed (high-entropy secret), reset code = keyed `v2:` (low-entropy
   6-digit code). Both comments accurate at their respective abstraction level.
10. **`SpringDataReportActionRepository` `@Query` justification** — the derived-name
    mis-parse explanation matches Spring Data's property-splitting behaviour; the explicit JPQL
    is unambiguous and pinned by `UserCredentialsRepositoryIT`-adjacent throttle tests (green).

### 5.3 Duplication re-found and deliberately left (all pre-adjudicated)

- The paged-query fragment `order by X.createdAt desc, X.id desc offset :offset fetch first
  :limit rows only` — alias-dependent per interface, each pinned by its own IT (earlier lane
  §3 row 1).
- `" AND s.source IN (:sources)"` ×2 in `JpaShelterRepository` (:204 `findActivePage`, :269
  `adminWhere`) — different predicate sets; folding them is the boolean-flag plumbing the
  standard forbids (earlier lane §1.1).
- The upsert `save` twins (occupancy vs open-status) — different anchor fields
  (`updated_at` vs `created_at`), different pinning ITs (earlier lane §3 row 2).
- The in-place-managed-row idiom across the 6+ `save` methods — extracting it would split the
  constraint statement from the code it protects (earlier lane §3 row 5).
- The `SpringDataShelterReportRepository` FQN `ShelterReportType` ×3 — the anchored file; an
  import would shift every line and move the three cited ranges (rule 6).

### 5.6 Considered and left: `RetentionRunEntity`'s six unused getters

`getRanAt`/`getAccountsPruned`/`getAuditRowsPruned`/`getStatus`/`getErrorMessage`/`getId` have
zero in-repo consumers — the run-log is a write-only ops audit; `RetentionPruningIT:204,215`
reads the table back through raw JDBC by design. Left: entity accessors are standard JPA
surface in this package (every sibling entity keeps its full set, used or not), the earlier
persistence lane covered this file and left it, and deleting accessors from one entity only
would create an intra-package inconsistency. Recorded so the owner sees the census.

## 6. Filed

One board line appended to `docs/autopilot/CODE-REVIEW-NOTES.md` (lane-done + the F1 owner
decision with the leave recommendation). F2 is report-only (no other lane owns the invariant;
it rides on caller discipline already verified).

## 7. Gates

Command (rule 7, every invocation under the lock, detached, exit files read):
`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`

| Run | Result | Note |
|---|---|---|
| 1 (`/tmp/up/gate.log`) | **exit 1** | Self-inflicted, pre-fix: my first (reverted) edit had duplicated `@Override` on `save` (a compressed read hid the existing one); compile failed with `java.lang.Override is not a repeatable annotation interface` at `JpaPasswordResetTokenRepository.java:32`. Tree fixed by revert before run 2. |
| 2 (`/tmp/up/gate2.log`) | **exit 0** | **Tests run: 1370, Failures: 0, Errors: 0, Skipped: 0** — the parent's stated baseline exact. PMD clean, "All coverage checks have been met" (0.93 floor), BUILD SUCCESS in 02:28. No missing-class wall (0 hits — the rule-7 hazard absent). Timing caveat: this run started seconds before my whitespace revert; the two tree states differ by one blank line only (javac-inert, identical bytecode), so the run is a valid attestation of the final tree. |
| 3 (`/tmp/up/gate3.log`) | **exit 0** | Re-run started with the tree byte-identical to HEAD (verified `git status` clean in-scope) — unambiguous attestation: **Tests run: 1370, Failures: 0, Errors: 0, Skipped: 0**, BUILD SUCCESS. |

Named ITs from the gate log (the parent asked for paging-cost + persistence by name; I made no
query-builder change, so the full gate's inclusion is the proof, named here):
`ShelterPagingCostIT` 5/5 · `AdminModerationIT` 25/25 · `ShelterRepositoryIT` 7/7 ·
`ShelterOptimisticLockingIT` 2/2 · `ShelterSubmissionCapRaceIT` 1/1 ·
`PasswordResetTokenRepositoryIT` 6/6 · `PendingVerificationRepositoryIT` 3/3 ·
`RefreshTokenRepositoryIT` 4/4 · `UserCredentialsRepositoryIT` 3/3 · `UserRepositoryIT` 4/4 ·
`UserOptimisticLockingIT` 2/2 · `UserMapperBlankValueTest` 2/2 · `DocumentationFactsTest` 21/21 ·
`SourceVocabularyTest` 5/5.

**Frontend gate: not owed** — no frontend file in this lane's diff (verified by `git status`).

## 8. Unverified / caveats

- **Shared worktree, not lane-exclusive:** a sibling frontend lane wrote
  `frontend/src/app/gateways/auth-gateway.ts` (+15/−9 lines) and
  `frontend/src/node-fs.d.ts` (+6/−6) in-flight during this lane. Both are FE-group files from
  the sweep's unread map, outside my scope; the Maven build does not compile `frontend/src`
  (no frontend-maven-plugin in `pom.xml` — comments only), so the backend gate is unaffected.
  Left strictly alone.
- **Anchor state:** no anchor owed — zero in-scope edits landed; the only doc-cited
  persistence file (`SpringDataShelterReportRepository.java`) was not touched, and
  `DocumentationFactsTest` (21/21) + `SourceVocabularyTest` (5/5)
  green in both green gates.
- **F1/F2 are analysis-level verdicts** (consumer walks), not mutation-proofed — no change was
  made, so no red-proof was owed; the gate green covers the untouched code.
- **The plan-shape question** (does any un-ordered `findAll` get a plan the cost IT cares
  about?): `ShelterPagingCostIT` gates the admin `shelters` statements only; neither
  `guidance_post_translations` nor `site_texts` read appears in its statement multiset.
- **`/tmp/up/gate*.log`** — session-local gate logs for inspection.

## 9. Files for the parent's commit

None from `src/main` — the tree is byte-identical to the lane start (in-scope). Commit set:
`reviews/polish/unread-persistence.md` (this report) + the one
`docs/autopilot/CODE-REVIEW-NOTES.md` board line.
