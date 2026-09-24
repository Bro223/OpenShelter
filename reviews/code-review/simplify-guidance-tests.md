# SIMPLIFY-GUIDANCE-TESTS — report

**Mandate:** determine whether the guidance tests have the run's recurring defect
(guards/tests that pass while checking nothing), and make them fail when they
should. Scope: `src/test/java/ee/sheltermap/guidance/**`, the guidance ITs
(`api/`: GuidanceOrderIT, GuidancePaginationIT, GuidanceTranslationIT,
GuidanceLocaleFilterIT, AdminGuidanceSearchPagingIT, HeroImageImportIT,
MediaDerivativeServingIT, AdminMediaClientErrorsIT; `security/GuidanceAuthorizationIT`),
`GuidanceServiceTest` (it lives in `guidance/`, not `api/`), plus
`guidance/GuidanceOrderBackfillIT`. Excluded: `DocumentationFactsTest`,
`SourceVocabularyTest` (other lanes).

**Verdict up front:** the suite is NOT hollow. A mutation campaign of 21 instances — 19 distinct behaviours, M7 and M19 each measured twice (§2) — killed every mutated behaviour; no test that stays green was found by mutation. One genuine dead-code defect was found by reading instead: the
`HeroImageImportIT` final media-asset cleanup sweep was swallowed into an
unterminated javadoc and never ran (§3). Readability work in §4, added coverage
in §5, gate in §6.

## 1. Method

Mutation protocol (throwaway worktree, shared tree never touched during the
campaign):

1. `git worktree add /tmp/os-mut HEAD` (detached at `44567c0`, baseline
   `test-compile` green) — a pristine copy where mutations are applied and
   reverted (`git checkout -- .`), so no mutation ever leaked into the shared
   tree.
2. Each mutation = a surgical break of ONE named production behaviour (disable
   a guard, invert a condition, remove a step) with the exact anchor text
   verified unique before application.
3. Target test classes run per batch under `flock /tmp/openshelter-mvn.lock`
   with `mvn -B -ntp test -Dtest=<classes> -DfailIfNoSpecifiedTests=false`
   (the pom runs `*IT.java` in the `test` phase, so ITs run the same way).
4. Every red test attributed to the mutation that names its behaviour; a test
   that survives the mutation of the behaviour it names would be a hollow
   finding.

Batches: A = 8 unit mutations (one run + one top-up run), B = 7 unit mutations
(one run), C = 5 IT mutations over the real persistence/HTTP chain (one
detached run). Logs: `/tmp/os-mut-{A,A2,B,C}.log`.

## 2. Mutation table

Every instance was KILLED (at least one test went red). "Killed by" lists the
tests that failed; a cross-class kill (the same behaviour pinned in two
suites) is a bonus, marked ↗.

### Batch A — unit (one run; M7 top-up in the A2 run)

| # | Mutation (file) | Behaviour removed | Killed by |
|---|---|---|---|
| M1 | `publish` no-op guard disabled (`GuidanceService`) | re-publish must be a no-op (no re-stamp, no audit row) | `GuidanceServiceTest.publishStampsFromTheClockAndIsIdempotentWithoutAuditOnNoop` |
| M2 | `"script"` added to the sanitizer allowlist (`BodySanitizer`) | script element + content dropped | `BodySanitizerTest.xssKitYieldsNoScriptNodeAndNoHandlerAttribute`, `disallowedElementsDoNotSurvive` ↗ `GuidanceServiceTest.createStoresTheSanitizedBody`, `updateIsAFullReplaceReSanitizesAndKeepsTheSlugWhenOmitted`, `anUpdatedTranslationBodyIsReSanitizedLikeEveryOtherWrite` |
| M3 | both reorder no-op detections disabled (`GuidanceOrderingService`) | resubmitting the current order writes NO audit row | `GuidanceOrderingServiceTest.resubmittingTheCurrentOrderChangesNothingAndWritesNoAuditRow`, `aLocaleScopedResubmissionIsANoopWithoutAudit`, `anEmptyListIsA400WhilePostsExistAndANoopWhenNone`, `aLocaleScopedEmptyListIsA400WhileVisiblePostsExistAndANoopWhenNone` ↗ `GuidanceServiceTest.resubmittingTheCurrentOrderIsANoopWithoutAnAuditRow`, `aScopedReorderResubmittingTheCurrentVisibleOrderIsANoopWithoutAnAuditRow`, `reorderWithAnEmptyListAndNoPostsIsANoop`, `aScopedReorderWithAnEmptyListIsRefusedWhileVisiblePostsExist` (the no-op half of the two-part test) |
| M4 | link-local check disabled (`HeroAddressPolicy`) | 169.254.0.0/16 (incl. 169.254.169.254) + fe80::/10 refused | `HeroAddressPolicyTest.aDisallowedAddressYieldsAReason[10-13, 23]` (incl. the IPv4-mapped metadata form) ↗ `HeroImageImportServiceTest.aHostResolvingToTheMetadataAddressIsRefused` |
| M5 | 3xx no longer reported as redirect (`JdkHeroImageFetchClient`) | the client reports, the service re-validates and fetches itself | `JdkHeroImageFetchClientTest.aRedirectIsReportedNotFollowed` |
| M6 | no-upscale rule disabled (`MediaDerivatives`) | a derivative is only rendered strictly below the source width | `MediaDerivativesTest.neverUpscales`, `theNoUpscaleRuleRunsOnTheVisualWidth`, `rendersJpegDerivativesStrictlyBelowTheSourceWidth`, `rendersPngDerivativesInPngFormat`, `aLandscapeOriginalWithoutExifRendersUnrotated` ↗ `MediaServiceTest.anUploadStoresTheThumbnailDerivativesBesideTheOriginal`, `deletingAnAssetRemovesItsDerivativesToo`, `theSrcsetListsExactlyTheDerivativesOnDisk` ↗ `HeroImageImportServiceTest.anImportStoresTheDerivativesBesideTheOriginal` |
| M7 | EXIF 5–8 dimension swap disabled (`MediaImageInspector`) | the reader reports VISUAL dimensions | `MediaImageInspectorTest.jpegWithExifOrientation6ReportsVisualDimensions`, `exifOrientations5To8SwapWidthAndHeight` (A2 run) ↗ `MediaDerivativesTest.exifRotatedOriginalRendersDerivativesInVisualOrientation`, `exifOrientations5To8AllRenderInVisualOrientation` (pixel-verified) |
| M8 | `searchableBody` no longer strips tags (`GuidanceSearch`) | the search runs over the reader's text, never the markup | `GuidanceSearchTest.searchableBodyStripsEveryTagAndCollapsesWhitespace`, `matchesSearchIsACaseInsensitiveSubstringOverTitleAndStrippedBody` ↗ `GuidanceServiceTest.searchableBodyStripsEveryTagAndCollapsesWhitespace`, `matchesSearchIsACaseInsensitiveSubstringOverTitleAndStrippedBody` |

### Batch B — unit

| # | Mutation (file) | Behaviour removed | Killed by |
|---|---|---|---|
| M9 | locale bound 5 → 10 (`GuidanceValidation`) | the VARCHAR(5) column bound | `GuidanceValidationTest.theLocaleBoundIsTheColumnWidth`, `requireLocaleRequiresTrimAndBoundsAtTheColumnWidth`, `resolveLocaleDefaultsNullToTheConfiguredLocale`, `optionalAdminLocalePassesNullThroughAndValidatesTheRest` ↗ `GuidanceServiceTest.blankOrOverlongLocalesAre400OnIndexAndDetail`, `updatingATranslationRefusesABlankTitleAndAnOverlongLocale`, `aBlankOrOverlongAdminLocaleIs400AndAnAbsentOneStaysUnscoped`, `aScopedReorderRefusesABlankOrOverlongLocale` |
| M10 | separator + parent-equality guards disabled (`MediaStorage.resolve`) | path-traversal refusal | `MediaStorageTest.resolveRejectsTraversalAndAbsoluteNames` |
| M11 | same-URL idempotency check disabled (`GuidanceService`) | a same-URL re-save does not re-fetch | `GuidanceServiceTest.aChangedUrlRefetchesAndASameUrlResaveDoesNot` |
| M12 | collision check disabled (`GuidanceValidation.resolveSuppliedSlug`) | an admin-supplied slug collision is a 409 naming the slug | `GuidanceValidationTest.aCollisionIsA409NamingTheSlug` ↗ `GuidanceServiceTest.anAdminSuppliedCollisionIsRefusedNamingTheSlug`, `updateCanKeepItsOwnSlugAndRefusesAForeignCollision`, `updatingATranslationToASlugHeldByAnotherRowInTheLocaleIs409` |
| M13 | default-locale fallback removed (`GuidanceService.getByPublicSlug`) | a locale without a row falls back to the default (200 + flag, never a dead-end 404) | `GuidanceServiceTest.theDetailFallsBackToTheDefaultLocaleWhenThePostLacksTheRequestedOne` |
| M14 | slot values replaced by dense `i + 1` (`GuidanceOrderingService.reorderInLocale`) | a scoped reorder rewrites the visible posts into THEIR slots; invisible posts keep their values | `GuidanceServiceTest.aScopedReorderWritesTheSubmittedOrderIntoTheGlobalSlotsAndLeavesInvisiblePostsAlone` (drives the real ordering service through the fake repos; the `GuidanceOrderingServiceTest` twin was not in this batch's run list — the behaviour is pinned either way, and the IT re-pins it over real SQL) |
| M19 | import-failure catch removed, rethrown (`GuidanceService`) | a failed import NEVER blocks the save (error in the write response, URL kept for retry) | `GuidanceServiceTest.publishingNoLongerFetchesForTheFirstTime`, `aFailedImportOnAnUpdateKeepsThePreviouslyStoredHero`, `aFailedImportKeepsTheHeroTheRequestNamed`, `aFailedImportNeverBlocksTheSaveAndKeepsTheUrlForRetry`, `aOneShotCreateAndPublishWithAFailedImportStillStoresThePost` |

### Batch C — real persistence + HTTP (one detached run)

| # | Mutation (file) | Behaviour removed | Killed by |
|---|---|---|---|
| M15 | `p.pinned DESC` removed from the native index query (`SpringDataGuidanceTranslationRepository.findPublishedInLocale`) | pinned posts lead the public index | `GuidanceOrderIT.thePinnedPostWithTheLargestSortOrderStillLeadsTheIndex` ↗ `GuidancePaginationIT.thePinnedPostLeadsTheFirstPage` |
| M16 | `X-Total-Count` computed from the paged result (`AdminGuidanceController.list`) | the header is the FILTERED, un-paged length | `AdminGuidanceSearchPagingIT.pagesTileTheStoredManualOrderWithoutOverlapOrSkips` (header 2 instead of 7), `theSliceRunsAfterTheSearchAndTheHeaderCountsTheFilter` (4 instead of 6). The PUBLIC index's total is a separate code path (untouched by this mutation) and is pinned independently: `GuidancePaginationIT.pagesTileTheStableOrderWithoutOverlapOrSkips` asserts `X-Total-Count = EN_POSTS` under `limit`/`offset` |
| M17 | `@Transactional` removed from `reorder` (`GuidanceService`) | the full-list reorder is all-or-nothing | `GuidanceOrderIT.aForcedMidTransactionFailureRenamesNothing` (a partial renumber becomes observable: expected 1, was 2) |
| M18 | derivative branch resolves the BASE name (`MediaController.serve`) | a derivative URL serves the rendered derivative, not the original | `MediaDerivativeServingIT.theDerivativeUrlsServeTheRenderedThumbnails` (pixel dimensions mismatch), `aWebpUploadHasNoDerivativesAndItsDerivativeUrls404` (the missing-derivative 404 becomes a 200 serving the original) |
| M19 | (same as Batch B, IT side) | a failed import never blocks the save | `HeroImageImportIT.aTextFileServedAsImagePngIsRefusedButTheSaveStillSucceeds`, `aRedirectTo127001IsRefusedAndNeverFetched`, `aFailedFetchLeavesTheDraftWithAReadableError`, `anOversizedBodyIsRefusedAtTheCapAndAborted`, `anImageOverThePixelCapIsRefused` |

**Not hollow by mutation.** 21 mutation instances (19 distinct behaviours), 0 survivors. The behaviours
the run's previous six hollow guards covered (draft invisibility, no-op audit
absence, sanitization, ordering atomicity, paging totals, import safety) are
all pinned for real — several by two independent suites (↗).

One hypothesis the campaign DISPROVED: I suspected the locale-bound behaviour
tests in `GuidanceServiceTest` derived their over-long value from the constant
under test (which would survive a bound drift). M9 showed they use literals —
they go red when the bound moves. The bound is also pinned directly by
`GuidanceValidationTest.theLocaleBoundIsTheColumnWidth` (the constant IS 5).

## 3. The one hollow finding — `HeroImageImportIT`'s dead final sweep

Found by reading (a mutation cannot prove a missing test), proven dead by the
parser, not by assumption:

- **What:** the javadoc opening above `removeLeakedImportedAssets()` (the
  `@AfterAll` that deletes this class' leaked imported media assets on a
  raw auto-commit connection) was never closed — the comment swallowed the
  `@AfterAll` annotation AND the method, closing only at the `*/` after the
  method body. The documented final sweep was dead code: the last successful
  `REQUIRES_NEW` import leaked its `media_assets` row after the class
  finished. The per-test `@BeforeEach` sweep masks it within the class, and
  the suite was green only because no later-running IT asserts absolute
  media-asset counts (ordering luck) — a live landmine for exactly the
  cross-IT leak the comment warns about.
- **Proof it was dead:** `javac`/surefire treated lines 311–314 as comment
  text (the method was absent from the compiled class); the class' own
  `@TestInstance(PER_CLASS)` + the comment's 2026-09-22 deadlock post-mortem
  show the `@AfterAll` placement was the intended, deadlock-free design.
- **Fix:** inserted the missing `*/` before the annotation (one line). No
  other change.
- **Verification:** `HeroImageImportIT` 11/11 green with the sweep live
  (the class completes — the `@AfterAll` DELETE waits on nothing, as the
  design requires). The "later ITs see a clean table" property is exercised
  by the full gate (§6): with the sweep live, no imported asset outlives the
  class.

No production bug: every mutation was killed without the suite ever catching
a behaviour divergence, and the one defect found is in the test tree itself.

## 4. Readability work (tests are documentation — same standard)

1. **`guidance/GuidanceServiceTest`** — removed two planning-id comments
   ("WAVE 9 RED-PROOF …") that named the run's internal vocabulary instead of
   the constraint; the javadocs now state what each test pins. (Side note:
   the all-caps `WAVE \d+` form slips past `SourceVocabularyTest`'s `Wave \d+`
   pattern — flagged to the GUARD-GAP lane in NOTES.) Also: the one
   fully-qualified `org.junit.jupiter.api.Assertions.assertDoesNotThrow`
   became a static import, consistent with the file's other static imports.
2. **`guidance/GuidanceSearchTest`** — `theSearchTermBoundIsTwenty` →
   `theSearchTermBoundIsTwoHundred`: the name asserted a bound of twenty while
   the test pins two hundred (a reader would mis-cite the vocabulary).
3. **`security/GuidanceAuthorizationIT`** — `performAdminRoute` (401) and
   `performAdminRoute403` were ~30 nearly-identical lines each (the whole
   route-builder duplicated); consolidated into one
   `adminRouteRequest(method, path)` + two thin status-specific wrappers.
   Also parenthesized the `A && B || C` condition that compiled by operator
   precedence but read as `(A && B) || C` only to those who remembered the
   precedence table.
4. **PNG fixture deduplicated** — four byte-identical 33-byte header-only PNG
   builders (`GuidanceServiceTest.png`, `HeroImageImportServiceTest.png`,
   `MediaServiceTest.png`, `HeroImageImportIT.pngWithDimensions`) now live
   once in the new `guidance/PngFixtures.java`; call sites unchanged
   (static import; the IT's `pngWithDimensions` renamed at its single use).
   `MediaImageInspectorTest` keeps its own builder — it shares `putUInt` with
   its WebP/JPEG fixtures, so extracting half would be artificial.
5. **Reviewed and deliberately left:** `HeroImageImportIT`'s
   `Thread.sleep(100)` after the refused-fetch assertions (guards async
   completion of the import attempt — the fetch is synchronous within the
   save, the sleep is belt-and-braces, removing it risks a flake);
   `MediaDerivativeServingIT`'s `Content-Length isNotBlank` line (the real
   pin is the pixel-inspected bytes; the header line is a cheap sanity check,
   and no production mutation can corrupt the length Spring derives from the
   body).

No test was deleted, merged or weakened. No assertion was loosened.

## 5. Added coverage (responding to SIMPLIFY-GUIDANCE-CTRL's NOTES request)

`GuidanceSearchTest` gained 8 tests (6 → 14) for the two methods CTRL moved
verbatim from `AdminGuidanceController` into `GuidanceSearch`:

- `requireSearch`: absent/blank → `null` (no filter, never a 400); trims;
  exactly-200 passes; 201 → 400 with the literal message
  "q must be at most 200 characters".
- `matchesPost`: null AND blank term matches everything; a scoped read with a
  rendered row searches ONLY the row (a home-only term does NOT match — the
  match is what you see); a no-row read searches the home columns; an unscoped
  read covers every translation row; the match is over the stripped body, not
  the markup.

Cross-checked case-by-case against CTRL's `AdminGuidanceSearchPolicyTest`
(their 7 cover the same contract; the only gap was blank-non-null on
`matchesPost`, closed here). Both suites are green; per their NOTES
("my file stays until then") I did not touch their file — dedup is the
parent's call at commit time (flagged in NOTES).

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true` (detached, log `/tmp/os-gate1.log`) — done;
results in §6b.

Expected interference, proven foreign in advance: the SIMPLIFY-GUIDANCE-CTRL
lane's full gate failed with exactly ONE test —
`DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode`
(`map-page.ts:238-243` / token `hasCapacity`) — caused by the SIMPLIFY-MAP
lane's in-flight frontend rewrite (its §5 proves foreignness; the file was
still moving between their two gate runs). `DocumentationFactsTest` is
explicitly outside my scope; if my gate shows that same single failure and
nothing else, I report it identically and add a closing full-scope run
excluding only that one foreign method (the CTRL §5c idiom), per run rule 6
(report, don't work around).

**Gate result (appended after the run):** see §6b.

### 6b. Gate result

*Gate 1 (full):* `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, log `/tmp/os-gate1.log`) → **exit 1, `Tests run: 1332, Failures: 1, Errors: 0`** — exactly the predicted single foreign failure: `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` (`map-page.ts:238-243` / token `hasCapacity`, the SIMPLIFY-MAP lane's in-flight frontend rewrite — identical to the SHARED GATE RED entry, proven foreign by the CTRL lane's §5/§5b). Everything else green: the full guidance IT matrix, `HeroImageImportIT 11/11` **with the restored `@AfterAll` sweep live in the full-suite context** (no deadlock, no later IT broken by a leaked asset), `GuidanceAuthorizationIT 5/5` with the refactored helper, `GuidanceSearchTest 14/14` including the 8 new tests.

*Test count vs the 1317 baseline: **1332 = 1317 + 7** (SIMPLIFY-GUIDANCE-CTRL's new `AdminGuidanceSearchPolicyTest`, landed in the shared tree before my gate) **+ 8** (my new `GuidanceSearchTest` tests, §5). No test deleted or weakened anywhere in my diff.*

*Gate 2 (closing full-scope run, CTRL §5c idiom):* same tree, only the single foreign anchor method excluded (its 20 sibling anchor tests still run; fresh `clean`, so the coverage floor is measured on this tree): `flock … mvn -B -ntp clean verify "-Dtest=!DocumentationFactsTest#theCurrentStateDocAnchorsStillPointAtTheCode" -Ddependency-check.skip=true` (log `/tmp/os-gate2.log`) →

**Gate 2 result: exit 0 — `Tests run: 1331, Failures: 0, Errors: 0, Skipped: 0`; `pmd:check` clean; "All coverage checks have been met" (the 0.93 bundle line-coverage floor, measured fresh on this tree).** So the gate verdict stands exactly as for the CTRL lane: everything in this tree is green (1332/1332 including the foreign anchor's own 20 sibling tests); the full `clean verify` exit code is 1 solely because of the foreign `map-page.ts` doc anchor, which no backend lane may fix (doc = docs lane, file = frontend lane).

## 7. Files (for the parent's commit)

- Modified: `src/test/java/ee/sheltermap/api/HeroImageImportIT.java` (the
  `*/` fix + PNG fixture dedup)
- Modified: `src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java`
  (comment rewrites, static import, PNG fixture dedup)
- Modified: `src/test/java/ee/sheltermap/guidance/GuidanceSearchTest.java`
  (8 new tests, one rename)
- Modified: `src/test/java/ee/sheltermap/guidance/HeroImageImportServiceTest.java`
  (PNG fixture dedup)
- Modified: `src/test/java/ee/sheltermap/guidance/MediaServiceTest.java`
  (PNG fixture dedup)
- Modified: `src/test/java/ee/sheltermap/security/GuidanceAuthorizationIT.java`
  (route-builder consolidation)
- New: `src/test/java/ee/sheltermap/guidance/PngFixtures.java`
- Modified (board only): `docs/autopilot/CODE-REVIEW-NOTES.md` (2 entries)

Untouched: all production code (no proven production bug — §3), all other
test files, migrations, the current-state doc, `docs/api/openapi.json`,
frontend, and every file another lane claimed.

## 8. Anything unverified

- The mutation campaign ran against the **HEAD worktree** (`44567c0`), not
  the in-flight shared tree: CTRL's `AdminGuidanceController`/`GuidanceSearch`
  refactor was not in the worktree. The admin-list search behaviour moved by
  that refactor is pinned by (a) CTRL's `AdminGuidanceSearchPagingIT` 9/9
  (their report §3.2, run on their tree) and (b) my new `GuidanceSearchTest`
  14/14 (run on the shared tree) — the two views agree.
- `GuidanceOrderIT`'s real-SQL slot-preservation twin of M14 was not in batch
  B's run list (see M14 row) — pinned by the unit twin + the IT's own
  scoped-reorder tests, which ran green in CTRL's evidence matrix.
- The restored `@AfterAll` sweep is verified not to deadlock and not to break
  its own class (11/11); the cross-IT cleanliness property it protects
  (imported assets never outlive the class) is only observable in the full
  suite — the gate is that observation.
