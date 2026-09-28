# SPLIT-QUERY — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** `src/main/java/ee/sheltermap/api/ShelterQueryService.java` (1002 lines) + the
two classes extracted from it + the tests pinning them. Nothing else touched by this lane.

The earlier lane (`simplify-query`) flattened the pipelines and named the steps but left the
class the second largest in the tree. Following the guidance lane's shape (`GuidanceOrderingService`
and `HeroSaveResolver`: a plain class, **not** a Spring bean, constructed inside the service's
frozen constructor; the service keeps its public surface and delegates), I judged which seams
are real and extracted the two that are.

## Seams judged REAL and extracted

Both are plain classes in `ee.sheltermap.api`, deliberately NOT Spring beans, constructed in
`ShelterQueryService`'s constructor (same idiom as the guidance lane's collaborators). The
service's ten-argument constructor keeps its exact public signature (the frozen suite constructs
it unmodified in `CommunityPulseTest`, `ShelterQueryServiceTest`, `AdminModerationServiceTest`,
`ShelterControllerDetailReadTest`); the collaborators take SUBSETS of the service's dependencies.

| Seam | New home | What moved (bodies verbatim) | Deps taken |
| --- | --- | --- | --- |
| Community pulse (detail-only report aggregation UI) | `CommunityPulseAggregator` (new, 184 L) | `communityPulse` (renamed `pulseFor`), `deriveOpenClosedPulse`, `deriveOccupancyPulse`, `deriveRecentReports`, `weightOf`, `RECENT_REPORTS_CAP` | openStatusRepository, occupancyRepository, trustEvaluator, clock |
| Batched per-shelter trust lookups (the no-N+1 engine) | `ShelterTrustBatch` (new, 313 L) | `batchedLookupsFor` (renamed `lookup`, the `Projection` param replaced by the two flags it reads), the `Batches` record, `creatorsFor`, `reportCountsFor`, `freshOccupancyFor`, `freshOpenStatusFor`, `lastVerifiedFor`, `importVerifiedAtFor`, `latestCommunityVerification`, `infoRequestersFor`, `deriveOccupancy`, `deriveOpenStatus` | userRepository, reportRepository, occupancyRepository, openStatusRepository, dataImportLog, moderationAudit, infoRequests, clock + `CommunityPulseAggregator` (for the detail pulse map) |

The service re-points its three read paths to the batch collaborator — `toDtos`, `findById`,
`toAdminDtos` now call `trustBatch.lookup(shelters, <includeInfoRequests>, <includeCommunityPulse>)`
(the two booleans read from the same `Projection` factory that the old `batchedLookupsFor` read),
and the two row mappers take `ShelterTrustBatch.Batches`. The pulse is still computed inside the
batch pass exactly as before (`lookup` runs the detail pulse map via the aggregator when the
projection asks for it).

**Frozen test seam (the guidance-lane delegate idiom).** `CommunityPulseTest` references
`ShelterQueryService.RECENT_REPORTS_CAP` and the three `derive*` statics **as
`ShelterQueryService.<member>`**, and that test must stay unmodified. So the service keeps:
`public static final int RECENT_REPORTS_CAP = CommunityPulseAggregator.RECENT_REPORTS_CAP;`
(a value delegate, exactly like the guidance lane's `MAX_TITLE_LENGTH` / `MAX_HERO_IMPORT_URL_LENGTH`
delegates) and three one-line delegating statics (`deriveOpenClosedPulse` / `deriveOccupancyPulse` /
`deriveRecentReports` → the aggregator). The real logic is cohesive in the aggregator; the service
stubs exist only to keep the frozen seam compiling.

## Seams judged and REJECTED (say so rather than doing it)

- **The DTO mapping (`toDto` / `toAdminDto` + `reviewNoteFor` / `toInfoRequest` /
  `toAdminInfoRequest`) as a third collaborator.** Rejected — it is shared by all four reads, reads
  the service's own read vocabulary (`Projection.callerOwnsEveryRow`, `CallerView`), and consumes the
  batch collaborator's `Batches`; `toDto`'s 27-arg `ShelterDto` construction is another lane's DTO.
  A mapper coupled to the batch output type plus two service records is more machinery than it
  removes — the service is the natural home for "map shelter + batches + caller → DTO".
- **The `Projection` / `CallerView` records.** Rejected — they are the service's read vocabulary
  (which of the four reads; the caller's own taps). The batch collaborator takes only the two boolean
  flags it reads, so no record ownership needs to move; moving them would force both the service's
  read dispatch and its DTO mapping to reference a collaborator's record.
- **The admin list read/mapping as its own collaborator.** Rejected as a standalone seam —
  `toAdminDtos` needs the batch engine's `Batches`; extracting just the admin surface would either
  drag in the batch engine (already extracted — so the admin methods now simply call
  `trustBatch.lookup` and stay in the service) or pass `Batches` in as a parameter, adding
  indirection for a rename. No new boundary, no duplication removed.
- **Splitting the community pulse into "fetch" (collaborator) + "derive" (left in the service,
  test-pinned).** Rejected — the three derives + cap are pinned to `ShelterQueryService` by
  `CommunityPulseTest`; moving only the orchestrator would split one cohesive concept across two
  classes while the frozen seam forces the statics to stay. One aggregator + three thin delegates is
  the cleaner single-home shape.
- **Moving `OCCUPANCY_FRESHNESS_WINDOW` into a collaborator.** Rejected — it is a `public` constant
  on the service (public API surface; no external reference today, but relocating it is a
  public-surface change). It stays the single source of truth; both collaborators reference
  `ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW` (a shared-domain-constant reference, not a data
  clump or an object reach-in).

**Transaction boundary:** the class carries no `@Transactional` (verified — zero occurrences), so
there is no boundary to keep or split; the reads are non-transactional before and after.

## Behaviour preservation

- No public signature changed. The ten-argument constructor is byte-identical in signature; Spring
  DI is unaffected (one public constructor, same params). The six public read methods
  (`findAll`×2, `findById`×2, `findByCreatedBy`, `findAllForAdmin`) keep their signatures and the
  same logic, now delegated to the collaborators.
- The batch engine's statement order is preserved verbatim inside `lookup` — the pinned cost model
  (`ShelterPagingCostIT`: same two statements for any page size, the index scan + one batched read)
  sees the same statement multiset and order.
- The projection flags map 1:1 onto the old `Projection` combinations (public list = all-false,
  detail = pulse-only, /mine = info+own, admin = info-only). The pulse delegates return exactly what
  the test-pinned statics returned; `RECENT_REPORTS_CAP` is the same compile-time constant (10).
- No migration, guard, frontend, or `AdminModerationService` change.

## Line counts (before → after)

| File | Before | After |
| --- | --- | --- |
| `ShelterQueryService.java` | 1002 | 675 |
| `ShelterTrustBatch.java` | — | 313 |
| `CommunityPulseAggregator.java` | — | 184 |

The class drops from the second-largest in the tree (1002) to 675 — below the guidance service's
post-extraction 822 — with the two data-engine concerns now in self-named files. The remainder is
the read orchestration, the `Projection`/`CallerView`/`ProvenancePushdown` records, the public-list
and admin-list surfaces, the shared row mapping, and the frozen pulse-test seam.

## Evidence the suite passed unmodified

- `git status` / `git diff` confirm this lane changed only the three files above; **zero test files
  edited** (the only other working-tree changes are concurrent sibling lanes' guidance
  javadoc re-points and the shared notes board — outside this lane, non-Java for the Maven gate).
- Focused pins, all untouched and green in the gate: `CommunityPulseTest` 17/17 (the frozen
  `ShelterQueryService.derive*` / `RECENT_REPORTS_CAP` references resolve through the new delegates),
  `ShelterQueryServiceTest` 55/55, `ShelterPagingCostIT` 5/5, `ShelterBboxPagingIT` 10/10,
  `ProvenanceApiIT` 8/8, `LastVerifiedApiIT` 5/5.
- Full gate (flock, detached, exit file): **exit 0 — Tests run: 1362, Failures: 0, Errors: 0,
  Skipped: 0, BUILD SUCCESS** (log `/tmp/splitq-gate.log`). The `ERROR` lines in the log are
  expected test-scenario output (SMTP/`forced mid-transaction failure` / `ApiDocsGuard`
  "REFUSING TO START" cases exercising error paths) — the summary line is `Failures: 0`.
- Baseline (pre-change, same tree, flock, detached): **exit 0 — 1362/1362** (`/tmp/splitq-baseline.log`).
- **Test count: 1362 → 1362 (unchanged)** — no test added, deleted, or weakened.

## Anchor (rule 6) — verified STABLE, no shift to record

`docs/agent/00-CURRENT-STATE.md:128` cites `ShelterQueryService.java:413-415` (the orphan-serving
read — the `SubmitterVerification submitterVerification = author == null ? … : …` block inside
`toDto`). `toDto` is **not** moved (it stays in the service) and sits **above** both extracted
sections, so only the lines added above it matter. The net delta above the anchor is exactly zero
(nine imports removed, offset by the +2 collaborator fields, +5 constructor lines, +1 in
`findById`, +1 in `toDtos`). Verified empirically: `git show HEAD:…ShelterQueryService.java` and the
working tree are byte-identical at lines 411-418, so the `413-415` citation still points at the same
three lines. **No shift, no document edit.** `DocumentationFactsTest` ran 21/21 green in the gate.

## Gate

- `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  (detached per run rule 2) → **exit 0** — 1362/1362, PMD check clean, JaCoCo 0.93 floor met,
  `BUILD SUCCESS`.
- Coverage: bundle instruction **0.9425** (floor 0.93); `CommunityPulseAggregator` **100.00%**
  (326/326), `ShelterTrustBatch` **100.00%** (485/485), `ShelterQueryService` **94.13%**
  (882/937).

## Unverified / residual

- The app was not run end-to-end after the change (the gate is the verification, per the run rules).
- The three one-line pulse-derive delegates and the `RECENT_REPORTS_CAP` value delegate in the
  service are a deliberate frozen-test-seam, not dead code: they keep `CommunityPulseTest`
  unmodified. A future non-frozen pass could point that test directly at `CommunityPulseAggregator`
  and delete the four stubs (a one-line-per-stub cleanup, behaviour-neutral).
- Both collaborators reference `ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW` — a deliberate
  single-source choice to preserve the public API (documented above).
- Cross-lane: none. No public signature changed, no state-doc anchor moved, no other lane's file
  touched — nothing to file on the notes board.
