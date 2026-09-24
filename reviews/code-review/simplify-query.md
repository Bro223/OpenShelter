# SIMPLIFY-QUERY — public shelter query service, readability pass

**Lane:** SIMPLIFY-QUERY (BE-SHELTER-QUERY) · **Branch:** `code-review` · **Mode:** behaviour-preserving refactor, single file.
**Scope touched:** `src/main/java/ee/sheltermap/api/ShelterQueryService.java` (887 → 997 lines). No other file changed by this lane — the repository seam (app interfaces + persistence interfaces) needed no modification, and every test in the lane's 8-file set passed untouched (zero test edits).

**Target (recon §7.2, third-ranked problem):** the nested `ProvenanceFilter` type, the `batchesFor`/`callerBands` multi-stage pipelines and the boolean-flag overload chains feeding the 8-field positional `Batches` record.

## 1. What was flattened

| Before (HEAD) | After (this change) | What it removes |
|---|---|---|
| `findAll(6)` 21 code lines with both paging modes inline (`ShelterQueryService.java:165-186`) | 5-line dispatch (`:194-201`) into `publicListUnpaged` (`:210`) / `publicListPaged` (`:230`) | one method holding two complete pipelines; each mode is now a named step with its own constraint javadoc |
| `findAllForAdmin` 44 code lines, batch+map block duplicated across the paging branches (`:576-622`) | 9-line dispatch (`:725-735`) into `adminListUnpaged` (`:737`) / `adminListPaged` (`:758`), both mapping through one shared `toAdminDtos` (`:774`); `adminQFilter` → `applyAdminSearch` (`:785`, early return for the absent needle) | the duplicated batches-for-admin + map + needle-filter block (Duplicated Code) |
| `batchesFor` ×3 overloads, the 51-code-line aggregate pass (`:310-371`) | `batchedLookupsFor(shelters, projection)` (`:477`) — a 20-line named-step table; each lookup is its own named method in order: `creatorsFor` (`:519`), `reportCountsFor` (`:528`), `freshOccupancyFor` (`:539`), `freshOpenStatusFor` (`:549`), `lastVerifiedFor` (`:567`), `infoRequestersFor` (`:635`), plus the extracted `importVerifiedAtFor` (`:595`) | the reader no longer tracks which boolean gates which lookup inside one long method; the pass is followable one named step at a time |
| `toDtos` ×3 overloads funneling `(withInfoRequests, withPulse, ownSurface)` booleans (`:269-308`) | one `toDtos(shelters, projection)` (`:365`); the booleans are the named `Projection` record (`:135`) with exactly the four readers as factories: `publicList()` `:138`, `detail()` `:143`, `mine()` `:148`, `admin()` `:153` | 5 funnel methods (2 `toDtos` + 3 `batchesFor` overloads) deleted; the "multi-dimensional variables" pattern the run doc names |
| `callerBands` + `callerOpenStatuses` (`:449-471`) — two 1-entry `Map<Long,…>`s built per read and `.get()`-ed per row in the stream | `callerView(shelterId, callerId)` (`:328`) returning the `CallerView` record (`:164`: caller id + the caller's own two live taps, `ANONYMOUS` `:167` for list projections); computed once in the detail read (`:312-325`) | the 1-entry-map plumbing; the `shelters.size() != 1` guard; the two detail-only lookups are now one visible named step of the detail read, and the row mapper does no DB work |
| `toDto` 6 positional args incl. `ownSurface` boolean (`:472-545`) | `toDto(shelter, batches, caller, projection)` (`:384`); the owner-scoping of `reviewNote` is extracted to `reviewNoteFor` (`:456`) carrying the constraint javadoc | a boolean argument; the enumeration-risk rule now reads as one named expression |

## 2. What was renamed (recon-flagged names)

| Before | After | Why |
|---|---|---|
| `record ProvenanceFilter` (`:197`), `provenanceFilterFor` (`:205`) | `record ProvenancePushdown` (`:279`), `pushdownForProvenance` (`:264`); fields `provenanceSource`/`provenanceReviewStatus` → `source`/`reviewStatus` | it is the (source, review_status) **column pair pushed into the SQL** for the paged read — the repo's own "column-pair pushdown" vocabulary, not a filter |
| `batchesFor` | `batchedLookupsFor` | names what the batches are: the batched side-lookups a projection reads |
| `callerBands` / `callerOpenStatuses` | `callerView` + `CallerView` | names the reader (the caller id) together with their own live taps — the three values travel into the row mapper as one clump, so they get one small named structure |
| `pulses` (Batches component) | `communityPulse` | matches the DTO field it feeds |
| `adminQFilter` | `applyAdminSearch` | says what is applied (the search needle), incl. the absent-needle no-op |
| `Batches` | kept | single construction site over named locals mirroring the record order; the accessors at every use site are already named — a builder/8-step alternative is more machinery, not less (task item 3: only if simpler — judged not simpler) |

Comments: planning/history ids removed from this file (`V21` minRating note, `pre-V7 legacy row` ×2, `written after V31`/`pre-V31` ×3, the feature-branch parentheticals) — each reworded to the durable constraint ("rows from before the trust-snapshot column exists", "an unknown minRating is ignored for API compatibility"). Guard scan of the new file: 0 hits for every forbidden form (`Wave N`, `W\d+-[A-Z]`, `\bD\d+\b`, `\bM\d+[a-z]?\b`, `P\d+-\d+`, `Wave-\d+`) and 0 V-ids. Constraint comments (freshness window, owner-scoping/sequential-id risk, tie-break determinism, the second-line-of-defence re-application) are kept.

## 3. Before/after

- Lines: **887 → 997** (+110: ten new named-step methods/records with javadocs; the growth is navigation, not logic — no statement was added).
- Method decls: 30 methods + 2 records → 38 methods + 4 records (5 funnel overloads deleted).
- Longest flagged methods (code lines, comments stripped, per recon's measure): `toDto` 74 → ~70 (the remainder is the 27-arg `ShelterDto` construction — `ShelterDto` is lane-12-owned, so the positional construction stays); `batchesFor` 51 → 20 (`batchedLookupsFor`) + six 9–17-line named steps; `callerBands`+`callerOpenStatuses` 23 → 15 (`callerView`).
- Max brace depth unchanged (5 in both — the recon's "30 levels" counted control-flow nesting across the pipelines; the per-method flow is the part that flattened).

## 4. Behaviour-preservation evidence

1. **Mechanical:** whitespace-stripped diff of all DB-bound call sites old vs new — the call multiset is identical (14 distinct calls: `findActivePage`, `findAdminPage`, `countAdminPage`, `findAllActiveBySourceIn[Within]`, `findAll`, `findByCreatedBy`, `findById`, `countByTypeForShelterIds`, `latestOpenConfirmedByShelterIds`, `findFreshByShelterIds` ×2 repos, `findByShelterIdAndUserId` ×2 repos, `findByIds` ×2, `findLatestVerifiedBySource`, `latestConfirmationByShelterIds`, `findByShelterIds`, `trustEvaluator.weight`), with the same conditionals (info-request lookups still fetched only for /mine+admin; pulse only for detail; caller taps only when there is a caller). The four projection booleans map 1:1 onto the old overload combinations (verified against every call site: public list = all-false, detail = pulse-only, /mine = info+own, admin = info-only).
2. **Pinned tests, all untouched and green** (the only file this lane changed is the service; `git status` confirms zero test edits):
   - `ShelterQueryServiceTest` (868 L, 55 tests) — source-filter mapping, DTO mapping/no-entity-leak, report counts + dismissal, occupancy/open-status derivations, trust filters, /mine info request + reviewNote scoping, submitter-verification snapshot vs live, provenance, last-verified, viewport/paging slice order.
   - `CommunityPulseTest` (359 L) — the three static derives called directly (`deriveOpenClosedPulse`/`deriveOccupancyPulse`/`deriveRecentReports` signatures kept byte-identical) + `RECENT_REPORTS_CAP`.
   - `ShelterBboxPagingIT` (332 L) — public-list viewport + paging semantics over HTTP (tile-without-overlap, filters-before-slice, 400s).
   - `ProvenanceApiIT` (298 L) — the four visible provenance values, hidden values on detail, `provenanceFilterKeepsOnlyMatchingRows`, `hiddenProvenanceValuesFilterToEmptyOnThePublicList` (the null-pushdown empty-page path), source-filter composition.
   - `LastVerifiedApiIT` (217 L) — the last-verified stamp semantics.
   - `ShelterPagingCostIT` (572 L) — the cost model: the admin list runs the same two statements for any page size, pages cost the index scan + one batched read (this is what pins the statement multiset/order above against real Postgres).
   - `CommunityPulseIT` (304 L) — the pulse over HTTP.
   - Cross-lane consumers of the public API (`ShelterApiIT`, `CommunityReviewIT`, `AdminModerationIT`, `ShelterControllerDetailReadTest`, `AdminController` ITs) also ran green in the same suite — the public API surface (10-arg constructor, `findAll`×2, `findById`×2, `findByCreatedBy`, `findAllForAdmin`, both constants) is byte-identical in signature.

## 5. Anchor shift

**None.** `docs/agent/00-CURRENT-STATE.md` cites none of this lane's eight files (0 references to `ShelterQueryService` or any of the seven test files, verified by grep before and after). The only cited persistence file in the seam, `SpringDataShelterReportRepository.java:17-20, 25-28`, was **not touched by this lane** (the in-flight `countOpen()` addition from SIMPLIFY-MODERATION appends at the file's end, line 66+ — no shift). `DocumentationFactsTest` passes in the post-change gate. Nothing to re-derive.

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`, detached per run rule 2:

- **Post-change: exit 0** — `Tests run: 1317, Failures: 0, Errors: 0, Skipped: 0`, `BUILD SUCCESS` (PMD check + JaCoCo check both executed). Bundle line coverage **0.9356** (floor 0.93; measured from `target/site/jacoco/jacoco.csv`); `ShelterQueryService` itself **0.9768** (337/345).
- **Baseline (pre-change, same tree): exit 0** — 1317/1317, BUILD SUCCESS. The suite is 1317, not the run's nominal 1356, because the DEAD-CODE lane's in-flight `MarkdownToHtml` deletion (43 tests) is uncommitted in the shared worktree.
- 365× JaCoCo "Unsupported class file major version 71" warnings appear in every gate on this box (lane shells run Maven under mise's JDK 27 via `JAVA_HOME` while the suite targets 21) — non-fatal environmental noise, identical in baseline and post-change.

## 7. Unverified / notes

- **First baseline attempt failed (exit 1, 117 errors) for environmental reasons, not code:** mid-run, every later-loaded IT class file vanished from `target/test-classes` (`class path resource [ee/sheltermap/api/ShelterReportIT.class] … does not exist`, 91×; the single "failure" was the same missing-class error in `PiiAtRestIT$1`). Zero assertion failures. A concurrent non-flock build's `clean` is the only mechanism that fits (no locked mvn can run in parallel; a `mvn spring-boot:run` has sat running since Sep 23 but does not touch test classes). The re-run on the identical tree was green. Flagged on the notes board for the parent.
- Not run: the app end-to-end after the change (the gate is the verification, per the run rules).
- Considered and rejected: deduplicating the `deriveOccupancy`/`deriveOpenStatus` twins (recon §3.7) — a generic helper needs three or four functional parameters to bridge the differing timestamp fields and result types; that is the "clever construct" the run's priority order refuses, and the recon rates it low-payoff. Left as two honestly-named statics.
- The 8-field `Batches` record stays positional: it has exactly one construction site (`batchedLookupsFor`), built from locals named after its components; the alternative (builder/named-arg) is more code for one call site.
