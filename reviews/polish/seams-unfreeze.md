# SEAMS-UNFREEZE — the frozen-seam delegates, unfrozen

**Branch:** `polish-work` (cut from the merged `feature/frontend` tip, 41cc03a). No commit —
the parent commits.

**Owner's ruling:** clean up the frozen-seam delegates, updating the tests. Several extraction
lanes left one-line delegating members (three delegating statics + a value delegate on
`ShelterQueryService`, value delegates for the moved constants on `AdminModerationService`,
the guidance extraction's value/static delegates, and the admin-page spec re-exposures) so the
existing tests would stay unmodified. This lane deletes them and points the pinning tests at
the new home. Production behaviour is unchanged; a test was moved (or, once, removed — §4),
never deleted or weakened.

**Skills used:** `docs/skills/clean-code.md` (the readability standard), `docs/skills/code-review.md`
(review/report discipline), `docs/skills/refactor.md` (behaviour-preserving refactor rules).
(The task brief named these by name; they live under `docs/skills/`, the run's authoritative
skill index, and were followed there.)

---

## 1. Inventory (verified against the code, not the reports)

Every member that exists only to keep a test's original access path working. Each was
grep-verified: production callers = 0 (a production caller would make it real API, not a
seam), test callers = the listed pins.

### A. `ShelterQueryService` → `CommunityPulseAggregator` (split-query's seam)

| # | Member (delegate) | file:line | New home | Pinning test(s) |
|---|---|---|---|---|
| A1 | `RECENT_REPORTS_CAP` value delegate | `ShelterQueryService.java:77-78` | `CommunityPulseAggregator.java:50` (= 10) | `CommunityPulseTest.theLogCapsAtTenNewestEntries` (`:171`) |
| A2 | `deriveOpenClosedPulse` static delegate | `ShelterQueryService.java:629-637` | `CommunityPulseAggregator.deriveOpenClosedPulse` | `CommunityPulseTest.theOpenClosedDerivationAnswersNullOnZeroData` (`:315`), `.theOpenClosedDerivationMapsTheSplitsToShares` (`:324-328`) |
| A3 | `deriveOccupancyPulse` static delegate | `ShelterQueryService.java:639-647` | `CommunityPulseAggregator.deriveOccupancyPulse` | `CommunityPulseTest.theOccupancyDerivationScoresGettingFullAtHalfAndNullsOnZeroData` (`:334-343`) |
| A4 | `deriveRecentReports` static delegate | `ShelterQueryService.java:649-657` | `CommunityPulseAggregator.deriveRecentReports` | `CommunityPulseTest.theRecentReportDerivationOrdersNewestFirstWithADeterministicTieBreak` (`:350-351`) |

### B. `AdminModerationService` → `AdminAuditTrail` / `AdminUserModeration` (split-moderation's seams)

| # | Member (value delegate) | file:line | New home | Pinning test(s) |
|---|---|---|---|---|
| B1 | `DELETED_SHELTER_NAME` | `AdminModerationService.java:81-82` | `AdminAuditTrail.java:50` ("Deleted shelter") | `AdminModerationServiceTest.theAuditListIsNewestFirstWithReadTimeNameResolution` (`:302`) |
| B2 | `DELETED_ACCOUNT_NAME` | `AdminModerationService.java:84-85` | `AdminAuditTrail.java:53` ("Deleted account") | `AdminModerationServiceTest.anErasedActorRendersAsUnknownInsteadOfFailingTheRead` (`:343`), `.theAuditListRendersADeletedAccountSubject` (`:476`) |
| B3 | `NON_REGISTERED_SUSPENSION_MESSAGE` | `AdminModerationService.java:96-97` | `AdminUserModeration.java:42-43` | `AdminModerationServiceTest.suspendingAGuestAccountStillAnswers409` (`:434,437`) |
| B4 | `PROVISIONED_ADMIN_SUSPENSION_MESSAGE` | `AdminModerationService.java:99-100` | `AdminUserModeration.java:45-51` | `AdminModerationServiceTest.suspendingAnAdminAccountIsRefusedWith403` (`:406`), `.unsuspendingAnAdminAccountIsRefusedWith403` (`:417`); `UserSuspensionIT.suspendingIsIdempotentAndOnlyRegisteredAccountsAreSuspendable` (`:177,184`) |

### C. `GuidanceService` → `GuidanceValidation` / `GuidanceSearch` / `HeroSaveResolver` (next-split-guidance's seams + the two pre-extraction siblings of the same idiom)

| # | Member (delegate) | file:line | New home | Pinning test(s) |
|---|---|---|---|---|
| C1 | `MAX_TITLE_LENGTH` value delegate | `GuidanceService.java:118-119` | `GuidanceValidation.MAX_TITLE_LENGTH` (= 255, package-private) | `GuidanceServiceTest.missingTitleOrBodyAreRefusedAndNothingIsStored` (`:206`) |
| C2 | `MAX_LOCALE_LENGTH` value delegate (pre-extraction idiom, same class of seam) | `GuidanceService.java:121-127` | `GuidanceValidation.MAX_LOCALE_LENGTH` (= 5, package-private) | `GuidanceServiceTest.blankOrOverlongLocalesAre400OnIndexAndDetail` (`:808`), `.aBlankOrOverlongAdminLocaleIs400AndAnAbsentOneStaysUnscoped` (`:909`), `.aScopedReorderRefusesABlankOrOverlongLocale` (`:1240`) |
| C3 | `searchableBody` static delegate (pre-extraction idiom) | `GuidanceService.java:129-136` | `GuidanceSearch.searchableBody` | `GuidanceServiceTest.searchableBodyStripsEveryTagAndCollapsesWhitespace` (`:1572-1583`); `GuidanceSearchTest.theServiceDelegateIsTheSamePolicy` (`:200-201`) |
| C4 | `matchesSearch` static delegate (pre-extraction idiom) | `GuidanceService.java:138-145` | `GuidanceSearch.matchesSearch` | `GuidanceServiceTest.matchesSearchIsACaseInsensitiveSubstringOverTitleAndStrippedBody` (`:1586-1596`), `.aBlankOrAbsentNeedleIsNoFilter` (`:1599-1605`), `.matchesSearchIsNullSafeOnTheRow` (`:1608-1613`); `GuidanceSearchTest.theServiceDelegateIsTheSamePolicy` (`:202-203`) |
| C5 | `MAX_HERO_IMPORT_URL_LENGTH` value delegate | `GuidanceService.java:147-148` | `HeroSaveResolver.MAX_HERO_IMPORT_URL_LENGTH` (= 2048) | **none** — zero test references and zero production references (grep-verified across `src/`, `frontend/`, `docs/`). The left-behind twin of C1; removed as the extraction's residue. Nothing to move — see §4. |

### D. `admin-page.ts` → `SheltersView` / `UnconfirmedView` (split-admin-page's + the previous split's seams)

| # | Member (re-exposure) | file:line | New home | Pinning test(s) |
|---|---|---|---|---|
| D1 | `get rejectReason()` | `admin-page.ts:198-202` | `UnconfirmedView.rejectReason` (`unconfirmed-view.ts:71`) | `admin-page.spec.ts` "Reject requires a reason…" (`:1213`, `:1238`) |
| D2 | `get searchQuery()` | `admin-page.ts:213-217` | `SheltersView.searchQuery` (`shelters-view.ts:107`) | `admin-page.spec.ts` "submitting the search box re-queries…" (`:974`), "…search composes WITH the chip" (`:3535`) |
| D3 | `get requestMessage()` | `admin-page.ts:218-222` | `SheltersView.requestMessage` (`shelters-view.ts:136`) | `admin-page.spec.ts` "a blank question does not POST…" (`:783`) |
| D4 | `async rejectRow(row)` | `admin-page.ts:627-632` | `UnconfirmedView.rejectRow` (`unconfirmed-view.ts:128`) | `admin-page.spec.ts` "Reject requires a reason…" (`:1217`) |

### Kept (not a seam — verified, with reasons)

- `ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW` (`:75`) — a true home constant (not a
  delegate); `ShelterTrustBatch` and `CommunityPulseAggregator` reference it (production
  cross-references). Public surface, not a seam.
- `AdminModerationService.AUDIT_DEFAULT_LIMIT` (`:79`) — true home; used by the service's own
  paging normalization in the bean delegates.
- `AdminModerationService.UNKNOWN_NAME` — true home; used by the staying `toReportDtos` and by
  `ShelterQueryService` (production cross-reference).
- `GuidanceService.POST_NOT_FOUND_MESSAGE` — true home, used by the service's 404s.
- **Every `@Transactional` bean delegate** on `AdminModerationService` (`listAudit`,
  `shelterHistory`, `listUsers`, `suspendUser`, `unsuspendUser`, …), on `GuidanceService`
  (the reorder / lifecycle / translation delegates) and `AdminModerationService.listShelters` —
  these are called by the controllers (production callers) and carry the transaction boundary;
  a public surface is not a seam. Grep-verified the controllers hit them.
- The `unconfirmed` / `shelters` view fields stay `protected` on the page — the spec reaches
  them through one narrow typed cast (§3), not by widening the page's public surface.

**Sweep completeness:** the inventory was not taken on trust from the four reports — every
claim was re-verified in-tree, and a repo-wide sweep for the delegate shapes (value delegates
`= <collaborator>.CONSTANT`, one-line `return <collaborator>.<method>(…)` statics, and
page-level re-exposure getters) found exactly the set above; nothing else in the tree pins a
test's old access path.

## 2. What was removed, and where the test moved

All moves are reference re-points: same assertion, same strength, same instance, new
qualified name. No assertion was loosened anywhere; no new abstraction was added to justify
a removal (the one test-side addition is the `views()` typed accessor in the spec — §3).

- **A1–A4:** `CommunityPulseTest` now drives `CommunityPulseAggregator.RECENT_REPORTS_CAP`
  and the three `CommunityPulseAggregator.derive*` statics directly (9 re-points, `:171,
  :315-358`). The service lost the value delegate (`:77-78`) and the three delegating statics
  with their section header (`:627-658`, 35 lines total). `ShelterQueryService` 675 → 640 L.
- **B1–B4:** `AdminModerationServiceTest` (7 re-points: `:302, :343, :406, :417, :434, :437,
  :476`) and `UserSuspensionIT` (2 re-points: `:177, :184`) now read the constants from
  `AdminAuditTrail.*` / `AdminUserModeration.*`. The service lost the four value delegates
  (12 lines). 649 → 637 L. The `listAudit` javadoc's `{@link #DELETED_SHELTER_NAME}` was
  re-pointed to `{@link AdminAuditTrail#DELETED_SHELTER_NAME}` (line-count preserving).
- **C1–C4:** `GuidanceServiceTest` (18 re-points: `:206` → `GuidanceValidation.MAX_TITLE_LENGTH`;
  `:808, :909, :1240` → `GuidanceValidation.MAX_LOCALE_LENGTH`; the four `searchableBody` and
  ten `matchesSearch` calls in `:1572-1613` → `GuidanceSearch.*`) now drives the homes.
  The service lost all five seam members (32 lines). 822 → 790 L. `GuidanceSearch`'s class
  javadoc dropped its "remain as delegates" paragraph (dead comment — the delegates no longer
  exist). No doc anchor cites any `GuidanceService.java` line, so this file owes no anchor
  shift.
- **C5:** removed; no test or production code referenced it (the only consumers of
  `MAX_HERO_IMPORT_URL_LENGTH` are inside `HeroSaveResolver` itself, `:106-108`).
- **D1–D4:** `admin-page.ts` lost the three re-exposure getters + their section headers and
  the `rejectRow` delegate (29 lines) plus the now-unused `FormControl` (type-only) and
  `AdminShelterDto` imports. 901 → 872 L — still under the `architecture.spec.ts` ceiling
  (903, a `<=` assertion). `admin-page.spec.ts` now drives the views through a narrow typed
  cast — see §3. The template needed no change (it already binds `unconfirmed.*` /
  `shelters.*`). The three "page re-exposes it" comments in the two views were reworded
  (line-count preserving).
- **Test counts:** backend 1363 → **1362** (−1 = the removed delegate test, §4); frontend
  1583 → 1583 (no `it` added, removed, or retitled).

## 3. How the spec reaches the views (D1–D4 move mechanics)

The page's `shelters` / `unconfirmed` fields are `protected`, and the spec's `page` is typed
`AdminPage` in the two spots that needed the views. Widening the page's public surface for
the spec's convenience would be the same rot as the delegates, so the spec uses the codebase's
existing idiom for reaching protected members (`page-shell.spec.ts:504` — "reach it via a
narrow cast … without depending on internals") — one typed accessor, defined once:

```ts
function views(page: AdminPage): { shelters: SheltersView; unconfirmed: UnconfirmedView } {
  return page as unknown as { shelters: SheltersView; unconfirmed: UnconfirmedView };
}
```

The six moved accesses (`:783, :974, :1213, :1217, :1238, :3535`) now read
`views(page).shelters.requestMessage`, `views(page).shelters.searchQuery`,
`views(page).unconfirmed.rejectReason` / `.rejectRow` — the SAME control instances and the
same-arity method as before (the getters returned exactly those), so every assertion is
unchanged and as strict as before. The cast is compile-time-checked at one boundary instead
of five untyped `any` accesses — the move is strictly stronger on type-safety.

## 4. The one test removal (flagged, per the rules)

`GuidanceSearchTest.theServiceDelegateIsTheSamePolicy` (`:197-204`, 2 assertions) is the one
test this lane removed, because its SUBJECT — the `GuidanceService` delegates — no longer
exists. Its assertions were `delegate(x) isEqualTo home(x)` for the two inputs: they pinned
the SEAM, not the behaviour. There is no new home to which a "delegate ≡ home" assertion can
move. The behaviour it touched is pinned, at least as strictly, at the home:
`GuidanceSearchTest.searchableBodyStripsEveryTagAndCollapsesWhitespace` and
`…matchesSearchIsACaseInsensitiveSubstring…` (same file, the same inputs and more) and the
moved `GuidanceServiceTest` suite (§2, C3/C4). No behavioural coverage was lost.

Everything else is a move, not a deletion: 9 + 7 + 2 + 18 + 6 = **42 test references re-pointed,
zero assertions changed, zero `it`/`@Test` methods deleted** (the one method above excepted).

## 5. Mutation proof per removal

Method: after the removals, mutate the NEW HOME (invert a value / change a constant usage /
break the mapping) and confirm the moved test goes red. Every mutation was reverted after its
run; `git diff` is empty on every mutated file post-revert. All runs under
`flock /tmp/openshelter-mvn.lock`.

| Seam | Mutation of the new home | Red result (moved test) |
|---|---|---|
| A1 (cap) | `CommunityPulseAggregator.deriveRecentReports` caps at `RECENT_REPORTS_CAP - 1` (production ignores the home constant) | `CommunityPulseTest.theLogCapsAtTenNewestEntries` RED — "Expected size: 10 but was: 9" at the moved `:171` assertion |
| A2 (open/closed share) | `deriveOpenClosedPulse` returns the CLOSED-weighted share | `CommunityPulseTest.theOpenClosedDerivationMapsTheSplitsToShares` RED (expected 1.0, was 0.0); plus the three production-path share tests RED (the home is what they pin) |
| A3 (occupancy share) | `deriveOccupancyPulse` scores GETTING_FULL at 1.0 instead of 0.5 | `CommunityPulseTest.theOccupancyDerivationScoresGettingFullAtHalfAndNullsOnZeroData` RED (expected 0.5, was 1.0) |
| A4 (recent-log order) | `deriveRecentReports` tie-breaks kind in REVERSE order | `CommunityPulseTest.theRecentReportDerivationOrdersNewestFirstWithADeterministicTieBreak` RED (expected CLOSED/FULL/OPEN, was OPEN/FULL/CLOSED) |
| B1 (deleted shelter) | `AdminAuditTrail.auditSubjectName` renders a gone shelter as a different literal | `AdminModerationServiceTest.theAuditListIsNewestFirstWithReadTimeNameResolution` RED (expected "Deleted shelter", was the mutation literal) |
| B2 (deleted account) | `AdminAuditTrail.auditSubjectName` renders a gone account as a different literal | `AdminModerationServiceTest.anErasedActorRendersAsUnknownInsteadOfFailingTheRead` + `.theAuditListRendersADeletedAccountSubject` RED |
| B3 (guest 409) | `AdminUserModeration.requireSuspendableUser` throws a different guest message | `AdminModerationServiceTest.suspendingAGuestAccountStillAnswers409` RED |
| B4 (admin 403) | `AdminUserModeration.requireSuspendableUser` throws a different admin message | `AdminModerationServiceTest.suspendingAnAdminAccountIsRefusedWith403` + `.unsuspendingAnAdminAccountIsRefusedWith403` RED; **and through the real stack** `UserSuspensionIT.suspendingIsIdempotentAndOnlyRegisteredAccountsAreSuspendable` RED — JSON `$.message` "expected: The environment-provisioned administrator account cannot be suspended or unsuspended / but was: (mutation)" at the moved `:177` pin |
| C1 (title bound) | `GuidanceValidation.requireTitle` doubles the bound | `GuidanceServiceTest.missingTitleOrBodyAreRefusedAndNothingIsStored` RED (the moved `:206` arm — the 256-char title no longer throws); + the home's own pin in `GuidanceValidationTest` RED |
| C2 (locale bound) | `GuidanceValidation.requireLocaleLength` allows 10 chars | `GuidanceServiceTest.blankOrOverlongLocalesAre400OnIndexAndDetail` + `.aBlankOrOverlongAdminLocaleIs400AndAnAbsentOneStaysUnscoped` + `.aScopedReorderRefusesABlankOrOverlongLocale` (+ the translation-locale pin) RED — all four moved pins; + `GuidanceValidationTest` 4 home pins RED |
| C3 (searchable body) | `GuidanceSearch.searchableBody` stops stripping markup | `GuidanceServiceTest.searchableBodyStripsEveryTagAndCollapsesWhitespace` RED (expected "hello", was "<p>hello</p>"); + `GuidanceSearchTest` home pin RED |
| C4 (search match) | `GuidanceSearch.matchesSearch` goes case-SENSITIVE | `GuidanceServiceTest.matchesSearchIsACaseInsensitiveSubstringOverTitleAndStrippedBody` RED; + `GuidanceSearchTest` home pins RED |
| C5 (hero URL bound) | none owed — zero references existed to prove; the removal is reference-free (build-green is the proof) | — |
| D1 (reject control) | `UnconfirmedView.rejectReason` loses its blank validator | spec "Reject requires a reason…" RED at the moved access (`:1223` drives the control; `:1225` `expect(rejectButton?.disabled).toBe(true)` → false) |
| D2 (search control) | the Shelters view's search pipeline stops trimming (submit + `syncFromParams` + `load`) | spec "submitting the search box re-queries with the q filter" RED — the API call carries the un-trimmed term, failing the moved-access test's `q: 'kelder'` pin (driven via `views(page).shelters.searchQuery`); + the URL-shape pin RED |
| D3 (info-request control) | `SheltersView.requestMessage` loses its blank validator | spec "a blank question does not POST and shows the field error" RED at the moved `:783` access (Send button no longer disabled) |
| D4 (reject action) | `UnconfirmedView.rejectRow` drops the blank-reason guard | spec "Reject requires a reason…" RED — `expect(admin.reviewShelter).not.toHaveBeenCalled()` → called once (driven via the moved `unconfirmed.rejectRow(row7())` call) |

D1–D4 were mutation-proven in one focused spec run (each red on its own assertion), with D1
and D4 proven in separate mutation states so neither masks the other.

## 6. Anchor shifts (rule 6) — recorded for the single anchor pass

`docs/agent/00-CURRENT-STATE.md` is not edited by this lane. The deletions sit ABOVE
cited ranges in three files, so seven citations drift (clause text stays true; only the
file:line pairs move). Old → new, each NEW range verified in-tree after the edit:

| Doc line | Citation (old) | New (verified) |
|---|---|---|
| `:128` | `ShelterQueryService.java:413-415` (orphan-serving read) | `:410-412` (`SubmitterVerification submitterVerification` at :410) |
| `:194` | `AdminModerationService.java:415-439` (`openReportPage`) | `:403-427` (signature at :403) |
| `:197` | `AdminModerationService.java:312-327` (`listShelterReports` with `excludeDismissed`) | `:300-315` (4-arg javadoc opener → signature close) |
| `:200` | `AdminModerationService.java:415,449` (`openReportPage` / `openReportCount`) | `:403,437` |
| `:208` | `admin-page.ts:371` ("the view IS the URL", querySub doc) | `:352` |
| `:215` | `admin-page.ts:422-512` (`normalizeListParams`) | `:403-493` (javadoc opener → method close; signature at :409) |
| `:219` | `admin-page.ts:456-470` (the namespaced `{list}Page/{list}Size` `check(` calls) | `:437-451` |

No other citation touches the five edited files (grep-verified: `GuidanceService.java` has no
citations at all — its hero-zone citations already sit in `HeroSaveResolver`).

## 7. Gates

- **Baseline (pre-change, flock, detached):** `clean verify` **exit 0 — Tests run: 1363,
  Failures: 0** (/tmp/seams-baseline.log) on the tree as cut (41cc03a). The task brief stated a
  1371 baseline at the merged tip; the measured baseline on this tree is **1363** (surefire runs
  all 157 test classes; no failsafe phase exists). The 1371 figure is unverified against the tree.
- **Full gate (flock, detached, `/tmp/seams-gate.log`):** **exit 1 — Tests run: 1365,
  Failures: 1, Errors: 0, Skipped: 0** — the single failure is
  `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` on exactly the seven
  recorded citations (§6; rule 6: the single anchor pass re-derives them). **No other test in
  the full scope fails.**
- **Full scope minus the anchor pin (flock, detached, `/tmp/seams-gate2.log`,
  `-Dtest='!DocumentationFactsTest'`):** **exit 0, BUILD SUCCESS — Tests run: 1344,
  Failures: 0, Errors: 0, Skipped: 0**. 1344 = 1365 − 21, and `DocumentationFactsTest` has
  exactly 21 `@Test` methods — the excluded class is the only delta, so the full scope is green
  except the recorded anchor pin.
- **Count reconciliation (1365 = 1363 + 3 − 1):** the parent landed commit `1e9850a`
  (`FrontendCommentExtractorTest`, +3 tests) on this branch mid-lane at 21:44; this lane removes
  1 test (the `GuidanceSearchTest` delegate pin, §4). 1363 + 3 − 1 = 1365 ✓.
- **Frontend gates (detached, exit files):** `npx ng test --watch=false` **exit 0 — 1583/1583
  across 65 files, the baseline count exact**; `npx ng build` **exit 0**.
- **Focused pre-gate (flock):** the four moved backend unit suites green (156/156:
  `AdminModerationServiceTest` 39, `CommunityPulseTest` 17, `GuidanceServiceTest` 87,
  `GuidanceSearchTest` 13); `UserSuspensionIT` 6/6 green (its moved pin exercised red in the
  B4 mutation run, green again in the full gate).

## 8. Unverified / residual

- The seven anchor re-derivations are OWED to the anchor pass (recorded on the notes board
  with old → new ranges, §6); until it runs, `DocumentationFactsTest` is red on exactly those
  seven citations and nothing else.
- `GuidanceServiceTest` still constructs `GuidanceService` and drives the public surface; the
  two `@Transactional`-bound delegate families on the three services remain (real API — §1
  "Kept").
- The app was not run end-to-end (the gate is the verification, per the run rules).
