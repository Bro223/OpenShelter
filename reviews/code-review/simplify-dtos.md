# SIMPLIFY-DTOS — the api/ DTO and request/response records

**Lane:** SIMPLIFY-DTOS · **Branch:** `code-review` · **Mode:** behaviour-preserving —
**javadoc/comment-only**, zero code lines (line-classification proof in §4).
**Scope (exclusive):** the `*Dto` / `*Request` / `*Response` / `*Result` records in
`src/main/java/ee/sheltermap/api/` not covered by other lanes. Excluded per the brief:
`ShelterDto.java` (another lane owns it and its citation), the controllers,
`GuidancePostDto.java` / `AdminGuidancePostDto.java` (touched by the hero lane), and
`LocationResolveRequest.java` / `LocationResolvedDto.java` (SIMPLIFY-LOCATION's, per
their board entry).
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md`; skills `clean-code`, `code-review`,
`test-driven-development` from `docs/skills/`.

**The target (brief):** these records are the contract every client reads. The
frontend lane (SIMPLIFY-MODELS) documented that several FE mirrors carry a deliberate
"absent reads as default" idiom — the same optionality now has to be visible on the
backend side of the contract: what each non-obvious field is, when it may be absent,
and what an absent value implies.

---

## 1. Scope census — 32 files, 21 touched, 11 left as found

| Touched (21) | Left as found (11) — why |
|---|---|
| see §2 | `AdminInfoRequestRequest` (constraint-only, already complete); `AdminMarkInaccurateRequest` (complete); `AdminShelterHistoryDto` (complete); `AdminUserDto` (complete; its `of` factory is a flat one-liner whose call sites sit in `AdminModerationService` — out of scope, so the signature is untouched); `EmailTestResult` (complete); `OccupancyReportRequest`, `OpenStatusReportRequest`, `ReorderGuidanceRequest` (one-field bodies, already documented); `SmsTestRequest`, `SmsTestResult` (complete); `UpdateSiteTextRequest` (complete — the empty/absent no-op claim verified against `SiteTextsService.update`) |

No nested construction helpers existed in scope to flatten: the only factory in the
set is `AdminUserDto.of` (one line, no nesting). Rule 3 was therefore satisfied by
verification, not by change.

## 2. What changed, file by file (before → after lines, all javadoc)

| File | B→A | What the contract now says that it did not |
|---|---:|---|
| `AdminAlertDto.java` | 33 → 41 | **Stale-vocabulary fix:** `kind` named 3 of the 4 `ThrottleAlert` kinds — `code-send-failure` (channel-refused code delivery; no HTTP error at all) was missing. Now all four kinds with their 429/409/no-error mapping; `retryAfterSeconds` present only for the 429 kinds; `detail` = the plain-spoken event; `id` documented as ring-local monotonic (resets on restart — a row key for this view, not a durable id). Facts verified against `alerts/ThrottleAlert.java` + `ThrottleAlertRecorder`. |
| `AdminAuditDto.java` | 47 → 52 | `shelterName` is the row's **subject slot**: shelter rows render the name (read-time; "Deleted shelter" after cascade), USER_SUSPEND/USER_UNSUSPEND rows render "Account: name (email)" ("Deleted account" after erasure), guidance/media rows their stored label snapshot — and for all non-shelter rows `shelterId` **and** the review-status fields are null (verified: `audit.record(null, userId, …, null, null, null)` at `AdminModerationService.java:716,735`; `recordLabeled` sets no status, `JpaModerationAuditLog.java:50-63`). Dropped the `community-review-queue` task id. |
| `AdminShelterDto.java` | 111 → 112 | `capacity` was the only undocumented field — now: null when unknown (never submitted or set). `nonexistentReports` now states the derivation the `inaccurateReports` @Schema already carried: **open (not dismissed)** count (verified: the batched per-type counts exclude dismissed, `ShelterQueryService.java:379-380`). Dropped the `community-review-queue v2` and "Provenance taxonomy" task ids. |
| `AdminShelterReportDto.java` | 47 → 52 | Gone-shelter/erased-reporter fallbacks documented: `shelterName` "Unknown" + `shelterStatus` null; `reporterName` "Unknown" + `reporterEmail` null (verified at the `toReportDtos` construction, `AdminModerationService.java:377-396`). `damped` derivation: **only NON_EXISTENT reports can be damped** (verified: `ShelterReportService.reportShelter:166-168`). |
| `AdminShelterReviewRequest.java` | 18 → 18 | Dropped the task id; "standard vocabulary" → "the uniform error shape" (the term the rest of the tree uses). |
| `AdminShelterStatusRequest.java` | 13 → 13 | Same wording fix. |
| `AttachGuidanceTranslationRequest.java` | 19 → 18 | Dropped the unresolvable `bilingual-guidance` name tag (not in the openspec archive — the guard cannot refuse it; the `V26` uniqueness pointer in the body is kept — resolvable Flyway). |
| `CreateGuidancePostRequest.java` | 38 → 38 | Typo fix: stray space before the period in "write and publish". |
| `CreateGuidanceTranslationRequest.java` | 23 → 23 | Dropped the `bilingual-guidance, V26` tag. |
| `CreateShelterRequest.java` | 30 → 32 | The absent-means-default idiom made explicit: absent/null `description` leaves the shelter with none; absent/null `capacity` leaves capacity unknown. Dropped the `community-review-queue v2` tag (the `05-shelter-api.puml` pointer kept — resolvable at `context-and-tasks/`). |
| `DataSourceDto.java` | 35 → 46 | `LastImport` gained its contract: `at` = when the run FINISHED; `status` vocabulary **OK \| FAILED \| NOT_MODIFIED \| SKIPPED** with the derivation that only OK and NOT_MODIFIED VERIFY the source's rows (the last-verified-meta rule); `sourceVersion` = upstream Last-Modified/ETag or null, and the feed for the next run's If-Modified-Since (all verified against `app/DataImportLog.java`). |
| `EmailTestRequest.java` | 28 → 29 | Compact-constructor behaviour made visible: a provided `subject` is trimmed, a provided `message` is used as given (only a blank one takes the default) — the asymmetry is now a stated constraint. |
| `ErrorResponse.java` | 16 → 16 | Dropped the ambiguous `01-TASK.md §8` pointer (two such files exist in the repo — the pattern SIMPLIFY-PII-CORE already flagged); the constraint stands on its own. |
| `GuidanceTranslationDto.java` | 22 → 22 | Dropped the `bilingual-guidance, V26` tag. |
| `MediaAssetDto.java` | 35 → 36 | History phrasing → constraint: "a pre-feature upload" → "an upload stored before derivatives existed" (the absence meaning of `srcset`). |
| `ShelterReportRequest.java` | 16 → 18 | "the binary types" → the two one-tap kinds named (`NON_EXISTENT` / `OPEN_CONFIRMED`, "where the type alone is the claim") — verified against `detailFor`, `ShelterReportService.java:409-413`. |
| `ShelterReportResult.java` | 12 → 13 | `damped` derivation: only NON_EXISTENT reports can be damped. |
| `SiteTextEntryDto.java` | 13 → 16 | Two wrong claims corrected against `SiteTextsService`/`SiteTextController`: a key absent from the response means **no row** (the FE falls back to the catalog default) — the old text implied the DTO itself could carry the shipped default; `url` null = no stored link (or cleared), not "the stored URL is the shipped default" (there is no such mechanism — a cleared URL is stored as null). |
| `UpdateGuidancePostRequest.java` | 32 → 32 | Dropped the "(the trigger)" planning residue; "AT SAVE" kept as the constraint. |
| `UpdateGuidanceTranslationRequest.java` | 19 → 18 | Dropped the `bilingual-guidance, V26` tag. |
| `UpdateShelterRequest.java` | 34 → 36 | The full-replace contract made explicit (it was never stated): an owner PUT CLEARS an absent/null `description`/`capacity` (verified: `ownerEditRow` passes the edit fields straight to the new row, `ShelterService.java:489-500`); the one kept-when-absent field is `locationKind`. Dropped the task id. |
| **Total (21 files)** | **641 → 681** | **+40 javadoc lines, 0 code lines** |

## 3. What was deliberately left

- **Every `@Schema` / `@Operation` / `@Parameter` string** — byte-pinned in
  `docs/api/openapi.json` by `OpenApiSnapshotIT`; the one stale string I found is
  reported, not fixed (§4, board entry).
- **`AdminUserDto.of`** — the call sites sit in `AdminModerationService` (service,
  rule 4); the factory itself is flat and one line.
- **Flyway references** (`V19`, `V26`) — resolvable in the tree, legal per the guard's
  own exemption list; kept.
- **`AdminShelterReportDto`'s `damped` @Schema** carries "(community self-moderation)"
  — a change name inside a snapshot-pinned string; the SNAPSHOT-CLEAN lane's domain,
  not mine.

## 4. Findings not fixed (reported, owner/board call)

1. **`AdminAlertDto.kind` @Schema description is stale** — it names 3 of the 4 kinds;
   `code-send-failure` is missing from the frozen snapshot string. Fixed on the
   javadoc side only. Board entry appended to `CODE-REVIEW-NOTES.md`.
2. **Live change-name residue in files I do not own** — e.g. the
   `JpaModerationAuditLog.recordLabeled` comment "Crisis-guidance a guidance/media row"
   (persistence lane). Part of the 24-line live-name batch CHANGE-NAME-SWEEP-TESTS
   already filed as a parent call; no new board entry.

## 5. Contract-unchanged evidence

- **`git diff docs/api/openapi.json` → EMPTY** (checked after all edits; no annotation
  string touched — every changed line is javadoc, §6).
- **Line classification of `git diff -U0` over my 21 files: 152 changed lines, 0 of
  them code** — every `+`/`−` line is a `*` javadoc line. Behaviour preservation is
  structural: no spec pin's input changed.
- **Frontend contract spec green:** `npx vitest run --globals
  src/app/core/models-contract.spec.ts` → **3/3 passed** (03:38 EEST) — the spec that
  compares the committed snapshot against the FE mirrors in both directions, run
  against a byte-identical snapshot.
- **In the Maven gate:** `OpenApiSnapshotIT` (snapshot vs live annotations) and
  `OpenApiContractIT` (endpoint contract) run unmodified — results in §7.

## 6. TDD-skill note

The skill's iron law binds production code; this change contains **none** (proof above
is the line classification, not an assertion). The empirical backstop is the full
suite run green unmodified — §7.

## 7. Anchors and gate

- **Anchors:** none of the 32 in-scope files is cited in
  `docs/agent/00-CURRENT-STATE.md` (grep-verified, all 32 names) — **no anchor shift
  owed**, `DocumentationFactsTest` unaffected by my diff (21/21 in gate).
- **Gate:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` (detached, exit file read) → **exit 0 —
  `Tests run: 1361, Failures: 0, Errors: 0, Skipped: 0` (baseline exact), PMD check
  clean, `All coverage checks have been met` (0.93 floor), 0
  "class file does not exist" (no rule-7 wall)**. In gate: `OpenApiSnapshotIT` 1/1,
  `OpenApiContractIT` 10/10, `DocumentationFactsTest` 21/21, `SourceVocabularyTest`
  2/2 (my new comments pass the id guard). Log: `/tmp/simplify-dtos-gate.log`, exit:
  `/tmp/simplify-dtos-gate.exit`. **`git diff docs/api/openapi.json` → 0 bytes** after
  all edits and after the gate.

## 8. Unverified / out of reach

- The in-scope javadoc claims I did **not** rewrite (the 11 untouched files) were
  read and fact-checked where cheap, but not exhaustively re-derived against every
  consumer.
- The dev-test endpoints' `@Hidden` status means `EmailTest*`/`SmsTest*` shapes never
  appear in the snapshot — their contract is the javadoc alone, which is exactly what
  this pass hardened.
- Gate tree carried foreign in-flight files (named in §7) — their failures, if any,
  are not mine.
