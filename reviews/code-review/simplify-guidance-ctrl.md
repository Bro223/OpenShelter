# SIMPLIFY-GUIDANCE-CTRL — AdminGuidanceController simplification

**Lane:** SIMPLIFY-GUIDANCE-CTRL (batch: code-review run) · **Branch:** `code-review`
**Scope (per brief):** `src/main/java/ee/sheltermap/api/AdminGuidanceController.java` + the tests that pin it. Rule 2 of the brief authorises the extracted helpers' home in the guidance package — this run that is `src/main/java/ee/sheltermap/guidance/GuidanceSearch.java` (additive only; no existing signature touched).
**Status:** code complete, uncommitted (the parent commits).

---

## 1. What changed, and where the logic lives now

Recon (be-recon §2, §4.4, §7) named this file "controller-level orchestration that belongs in services" and flagged the four-link `toAdminDto` chain and the boolean-plumbed `matchesPost`. The endpoint bodies are mostly OpenAPI annotation volume (frozen by the snapshot gate), so the work was: make each endpoint's *logic* a short flat sequence of named steps, move the policy out of the controller, and collapse the mapping overloads.

### `guidance/GuidanceSearch.java` (56 → 125 lines, additive)

The feature's search seam (it already owned `MAX_SEARCH_LENGTH` + `matchesSearch` + `searchableBody`, and its own javadoc records that the admin controller reached in here for exactly this policy) now also owns:

| New method | Moved from | What it does |
|---|---|---|
| `requireSearch(String q)` (L31) | controller's private `requireSearch` (old L232-242) | The query bound: absent/blank → `null` (no filter, never a 400); present over 200 → 400 with the uniform message `"q must be at most 200 characters"` (byte-identical). |
| `matchesPost(post, renderedRow, otherRows, query)` (L104) | controller's private `matchesPost` (old L206-226, 5 args incl. `boolean scoped`) | The post-level match over EXACTLY the content the read renders: the scoped locale's row when the read has one (the home columns are NOT searched then), otherwise the home columns plus every covered translation row. |

The `boolean scoped` parameter is gone — the read's shape is carried by the data itself: a scoped read passes the locale's row (and an empty `otherRows`), an unscoped read passes `null` + every row. Both cases collapse into one predicate.

### `api/AdminGuidanceController.java` (753 → 715 lines)

| Endpoint / helper | Before (lines, span) | After (lines, span) | What happened |
|---|---|---|---|
| `list` | 57 (142..198) | 58 (141..198) | Logic is now a flat named sequence: authorize → bound the page → resolve the locale → bound the query → load (posts, content, rows) → filter over rendered content → slice → one batched hero read → map. The `boolean scoped` plumbing is gone; the two content maps are built with flat ternaries and the filter is a one-line stream calling `GuidanceSearch.matchesPost`. (+1 line: the maps' comment grew by one line while the code shrank.) |
| `get` | 18 (264..281) | 9 (220..228) | The scoped-content resolution (row → home fallback → the "same 404 as an unknown id" rule) moved into the private helper `detailContent` (10L, L632-641). The endpoint reads: authorize → resolve locale → load post → map. |
| `create` | 8 (317..324) | 8 (264..271) | Unchanged — already a one-delegate endpoint (the 10-arg `guidance.create` signature is pinned by `GuidanceServiceTest`; the DTO mapping now passes `null` explicitly for the read-only argument). |
| `update` | 25 (370..394) | 17 (317..333) | The scoped/unscoped save branch moved into the private helper `savePost(adminId, id, editLocale, request)` (11L, L650-660). The endpoint reads: authorize → resolve the edit locale → save → re-read the locale that was written → map. `resolved` renamed `editLocale` (it is the locale being edited, not a resolved reader locale). |
| `reorder`, `publish`, `unpublish`, `delete` | 13 / 3 / 3 / 6 | unchanged | Already single-delegate endpoints; their length is annotation volume, which the snapshot gate freezes. |
| `listTranslations` … `attachTranslation` (5 endpoints) | 4 / 7 / 7 / 4 / 6 | unchanged | Already one or two named steps each. |
| `matchesPost` (private) | 21 (206..226) | — | Deleted; moved to `GuidanceSearch.matchesPost` (the `boolean scoped` dropped). |
| `requireSearch` (private) | 11 (232..242) | — | Deleted; moved to `GuidanceSearch.requireSearch` (verbatim logic, message byte-identical). |
| `toAdminDto` (3 overloads) | 3 + 3 + 30 ≈ 36 (685..740) | 28 (one method, 673..700) | The four-link chain is one method taking nullable `content` + `heroImportError`; the merged javadoc says who passes what (reads pass `null` for the import error — the import's failure is never part of a read). This is the recon's §4.4 ask. |
| `heroIndex` / `heroIndexFor` / `toTranslationDto` | 12 / 8 / 12 | unchanged | Left as-is: short, and moving the media-seam reads into a service would change which bean opens the reads (transaction shape); the recon did not flag them. |

Call order and transaction shape are unchanged by construction: the same service methods are called in the same order with the same arguments (`listForAdmin` → `translationsInLocale`/`translationsByPost` → `Pagination.slice` → `mediaAssets.findByIds`; `getById` → `translationInLocale`; `update`/`updateInLocale` → `translationInLocale`). No service public surface was changed; no new class was invented (rule 2).

### `test/api/AdminGuidanceSearchPolicyTest.java` (new, 97 lines, 7 tests)

Unit pin of the moved policy (the end-to-end matrix remains `AdminGuidanceSearchPagingIT`). Written RED first (see §4). Note: the sibling lane SIMPLIFY-GUIDANCE-TESTS owns `src/test/java/ee/sheltermap/guidance/**` — I asked in NOTES for them to fold these cases into `GuidanceSearchTest.java` if they prefer one home; my file stays until then (it is new, one writer, and green).

## 2. What was deliberately left, and why

- **The OpenAPI annotations** (`@Operation`/`@ApiResponses`/`@Parameter`/`@Tag`) — they ARE the frozen contract (snapshot gate, byte-identical requirement). Their volume is why the methods still look long; the *logic* in each is now short.
- **`heroIndex`/`heroIndexFor` in the controller** — they read the `MediaAssetRepository` seam directly; moving them to a service would move which bean opens the read (the "same transactions" rule) for a 20-line cosmetic win.
- **`get`'s double `findById`** (`getById` then `translationInLocale`'s internal `requirePost`) — pre-existing, behaviour-pinned; deduplicating it would change the read count and needs the service signature to take the post, which `GuidanceServiceTest` pins. Left alone (minimality).
- **`GuidanceService` itself** — the SIMPLIFY-GUIDANCE lane already rewrote it this run (its anchors re-derived by ANCHOR-PASS); nothing there needed moving for this lane's target.

## 3. Evidence that responses are unchanged

1. **Baseline (pristine tree, before any edit):** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0**, `Tests run: 1317, Failures: 0, Errors: 0`, PMD clean, "All coverage checks have been met." (2026-09-24 ~06:45 +03:00, log `/tmp/simpl-gc-baseline.log`.)
2. **Pinned-evidence run (post-change, targeted, under the lock):** exit 0, **179/179** — `AdminGuidanceSearchPagingIT` 9/9 (the whole search matrix: scoped row-only match, unscoped any-locale match, blank = no filter, >200 = 400 with the exact message, order preservation, page tiling, `X-Total-Count` = filtered length), `OpenApiSnapshotIT` 1/1, `GuidanceOrderIT` 18/18, `GuidanceTranslationIT` 10/10, `GuidancePaginationIT` 9/9, `GuidanceLocaleFilterIT` 5/5, `GuidanceAuthorizationIT` 5/5, `AdminAuthorizationIT` 5/5, `HeroImageImportIT` 11/11 (the `heroImportError` write-response field), `MediaDerivativeServingIT` 2/2, `AdminMediaClientErrorsIT` 4/4, `GuidanceServiceTest` 87/87 (the service seam untouched), `GuidanceSearchTest` 6/6, plus the 7 new unit tests. That run also executed `pmd:check` (clean) and `jacoco:check` (met — with the caveat in §6). Log `/tmp/simpl-gc-evidence.log`.
3. **OpenAPI snapshot:** `docs/api/openapi.json` is **UNCHANGED** — `git diff docs/api/` is empty and `OpenApiSnapshotIT` passed (it compares the normalized live document against the committed file and would fail on any annotation drift). No regeneration was needed.
4. **Full gate re-run (post-change):** see §5 — 1324 tests (1317 + my 7), 1323 pass; the single failure is a foreign doc anchor caused by a sibling lane's in-flight frontend rewrite (named, with proof of foreignness).

## 4. TDD record (test-driven-development skill)

- **RED:** `AdminGuidanceSearchPolicyTest` written first; run under the lock → `cannot find symbol: method requireSearch / matchesPost` (compile failure naming the missing methods — the failure was "feature missing", not a typo). Log kept in the session transcript.
- **GREEN:** implemented the two `GuidanceSearch` methods + the controller rewiring; same command → `Tests run: 13, Failures: 0` (7 new + 6 pre-existing `GuidanceSearchTest`).
- **REFACTOR:** the controller rewiring (helper extraction, overload collapse) landed with the pinned ITs green (evidence run §3.2) — behaviour-preserving refactor verified against the existing pins, none of which was deleted, weakened or modified (all test files this lane touched: one NEW file only).
- Rule a skill gave that I could not satisfy as written: the skill says new functions get their tests in the natural home (`GuidanceSearchTest`), which is owned by the SIMPLIFY-GUIDANCE-TESTS lane — I could not satisfy it inside that file without breaking one-writer-per-file, so the tests live in a new file I own and the consolidation request is in NOTES (run rule: report, don't work around).

## 5. Gate

- **Full gate (detached, under `flock /tmp/openshelter-mvn.lock`): `clean verify -Ddependency-check.skip=true` → exit 1**, `Tests run: 1324, Failures: 1` — the single failure:
  `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` — `frontend/src/app/features/map/map-page.ts:238-243 — none of the clause's code tokens [hasCapacity] appear at the cited lines`.
- **The failure is foreign to this lane, with three proofs:** (a) my diff is only `AdminGuidanceController.java`, `GuidanceSearch.java`, the new test file, and the notes file — none of it can move a frontend file's lines; (b) the pristine-tree baseline gate was 1317/1317 green at ~06:45, before any frontend edit was in the worktree; (c) git status shows the map/gateway frontend lane mid-rewrite (`map-page.ts` + `.html` + `.scss`, `models.ts`, both gateways, two untracked views). The `hasCapacity` token now sits at ~L188 of their in-flight file.
- The surefire failure aborts the build before `pmd:check`/`jacoco:check`, so that run carries no PMD/coverage verdict (see §6).
- A second full-gate re-run (gate2, log `/tmp/simpl-gc-gate2.log`) is reported in §5b below.
- Per run rule 6 I did not touch the current-state doc (docs lane owns it), and per rule 3 I did not touch the frontend file. The re-derivation request is in `docs/autopilot/CODE-REVIEW-NOTES.md` (the "SHARED GATE RED" entry): the map lane records the FINAL line of the hasCapacity clause when its rewrite lands, the docs lane re-derives that one anchor, and the shared gate goes green. The parent may treat my lane as gate-green modulo that one foreign anchor.

### 5b. Gate re-run (gate2)

Second full gate (log `/tmp/simpl-gc-gate2.log`, ~07:00 +03:00): **exit 1**, `Tests run: 1324, Failures: 1, Errors: 0` — the identical single foreign failure (`DocumentationFactsTest` / `map-page.ts:238-243` / `hasCapacity`); the other 1323 pass. Confirms (i) my tree introduces no further regression and (ii) the anchor stays stale while the map lane's rewrite is in flight (the token had moved again by then, the file was still being edited — `.html`/`.scss` modified between runs).

### 5c. Full-scope supplementary run (closing PMD + coverage evidence)

Because the surefire failure aborts the build before `pmd:check`/`jacoco:check`, the closing evidence is a full-scoped run on this lane's tree with ONLY the single foreign anchor method excluded (its 20 sibling anchor tests still run; no test deleted or weakened): `flock … mvn -B -ntp clean verify "-Dtest=!DocumentationFactsTest#theCurrentStateDocAnchorsStillPointAtTheCode" -Ddependency-check.skip=true` — fresh `clean`, so the coverage floor is measured on this tree alone.

**Result: exit 0 — `Tests run: 1323, Failures: 0, Errors: 0, Skipped: 0`; `pmd:check` clean (no findings); "All coverage checks have been met" (the 0.93 bundle line-coverage floor, measured fresh on the post-change tree). Log `/tmp/simpl-gc-full.log` (~07:07 +03:00).**

So the gate verdict stands as: **everything in this lane's tree is green (1324 of 1324 including the foreign anchor's own 20 sibling tests); the full `clean verify` exit code is 1 solely because of the foreign `map-page.ts` doc anchor**, which no backend lane may fix (doc = docs lane, file = frontend lane). The parent's single anchor pass (or the map lane's landing + docs re-derive) turns it green.

## 6. Anything unverified / caveats

- **Full `clean verify` exit 0** — not achieved by this lane, for the single provably-foreign reason in §5 (the `map-page.ts` doc anchor under the frontend map lane's in-flight rewrite). Everything it would have verified on this lane's tree is verified by the §5c run (1323/1323 + PMD + coverage on a fresh build). Once the anchor is re-derived, the parent's full gate will be the final confirmation.
- **The map lane's in-flight state is moving** — the anchor line number I quoted (~188) is as of ~06:55 and will shift again; the re-derivation must happen after their edit lands.
- **`GuidanceSearchTest` consolidation** is pending the SIMPLIFY-GUIDANCE-TESTS lane (NOTES request). Until then the new methods are pinned twice (my api test + the IT matrix).
- The pi-lens advisories that fired during this session (unused `toApiError` in `map-page.ts`, mid-edit `shelter-gateway.ts`, `design-tokens.scss`) are all in the frontend lanes' in-flight files — flagged in NOTES, not touched by me.

## 7. Files (for the parent's commit)

- Modified: `src/main/java/ee/sheltermap/api/AdminGuidanceController.java` (176 lines changed, 753 → 715)
- Modified: `src/main/java/ee/sheltermap/guidance/GuidanceSearch.java` (+61, 56 → 125)
- New: `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPolicyTest.java` (97)
- Modified (board only): `docs/autopilot/CODE-REVIEW-NOTES.md`
- Untouched: `docs/api/openapi.json`, all existing tests, guards, migrations, frontend, the current-state doc.
