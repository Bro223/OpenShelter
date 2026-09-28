# FINISH-ODDS-ENDS — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** every board item recorded as filed-but-not-fixed that is a safe
comment/doc/test-title fix and does not need the owner; plus verification of the
filed items that later lanes may already have closed.
**Touched:** `ShelterQueryService`, `AdminModerationService` and the classes being
extracted from them: **not at all** (brief rule 3). At gate time (17:11 EEST) no
concurrent-lane file was present in the worktree — `git status` showed exactly my
three files before and after the gate.

## Fixed this lane (3 items, 3 files — all line-count preserving, comment/javadoc only)

| # | Item (board ref) | Fix | Evidence |
|---|---|---|---|
| 1 | Two hero-exception javadocs — `guidance/HeroImportRefusedException.java:10` (NEXT-SPLIT-GUIDANCE:155, "filed, not done") | `{@code GuidanceService.resolveHeroOnSave}` → `{@code HeroSaveResolver.resolveHeroOnSave}` (one line, in place) | The catch lives in `HeroSaveResolver.resolveHeroOnSave` (`HeroSaveResolver.java:155`, catch at `:168-179`); the service now only calls it (`GuidanceService.java:450,505,600` — all `heroResolver.`). Grep for `GuidanceService.resolveHeroOnSave` across `src/` + `qa/` → 0 hits after. No test or doc anchor pins the text (test grep for `catches it` → 0; no 00-CURRENT-STATE.md citation of either file). |
| 2 | `guidance/HeroImportUnreachableException.java:11` (same board entry) | Same one-line re-point | Same proof as #1. |
| 3 | `qa/check-guidance-bodies.sh:11-12` (DEAD-CODE:21, "reword when convenient — guard lane/parent") | The tripwire header named the deleted classes `MarkdownToHtml + MarkdownMigrationDriver`; reworded 4→4 lines to "a since-removed one-off migration converted them to the sanitizer's allow-listed HTML" | `MarkdownToHtml`/`MarkdownMigrationDriver` were deleted by DEAD-CODE (1 330 lines); after the reword the only remaining mentions are in the board's own history lines. No guard scans `qa/` (SourceVocabularyTest scans `src/main/java`, `src/test/java`, `frontend/src`); no doc anchor cites the script (grep 0). |

All three edits verified line-count preserving by `git diff --numstat`
(1/1, 1/1, 2/2) — no doc anchor is owed a re-derivation (none of the three files
is cited by `docs/agent/00-CURRENT-STATE.md`), and rule 6 is satisfied with zero
shifts.

## Filed items verified ALREADY FIXED in the current tree (no edit made)

| Item (board ref) | Proof in tree at 01a15c0 |
|---|---|
| `error-copy.ts:69` stale "Malformed request" quoted literal (FINISH-P3-BE:194, "one-line FE comment fix owed to the FE lane") | Fixed by commit 9795154 ("correct the malformed-body comment to the per-type contract"): `error-copy.ts:69` now reads "the malformed-body 400s are per-type sentences that all begin 'The' and never with a request-payload field name"; `grep -r "Malformed request" frontend/src` → 0 hits. |
| `color-scheme: dark` on the dark themes (SIMPLIFY-CORE-FE:82; BOARD-SWEEP owner item 4) | `styles.scss:930` sets `color-scheme: dark` on the `[data-theme='high-contrast'], [data-theme='black-and-yellow']` block, pinned by the new `design-tokens.spec.ts:497-505` test ("both dark themes declare color-scheme: dark"). **Owner item 4 is closed.** |
| Five §5 hero-zone doc citations (NEXT-SPLIT-GUIDANCE:154) | Re-derived by SWAGGER-BUMP (board:204) and committed: `00-CURRENT-STATE.md:259,266,272,277` now cite `HeroSaveResolver.java:131-156 / :168-180 / :174-177 / :182-189` (+ no-re-fetch `:160-164`). `DocumentationFactsTest` 21/21 in my gate. |
| `qa/security-checklist.md:57` + `qa/test-plan.md:70` (DEAD-TRYRECORD:130; BOARD-SWEEP owner item 18) | Already re-pointed at the surviving pins before BOARD-SWEEP (FINISH-COPY-GUARD verified commit a1d73e2); re-verified in tree: :57 cites `VerificationThrottleIT` / `VerificationDailyCapIT` / `FileVerificationSendLogTest.countsOnlySendsFromToday`, :70 cites `VerificationDailyCapIT.dailyCapThrottleCarriesRetryAfterUntilUtcMidnight` / `VerificationServiceTest.dailyCapBlocksFurtherSends`. All cited methods exist. |
| `AdminAlertDto` @Schema missing `code-send-failure` (SIMPLIFY-DTOS:94) | `AdminAlertDto.java:28-35` `kind` @Schema now lists all four ThrottleAlert kinds including code-send-failure (BOARD-SWEEP:163 verified; re-verified this lane). |
| CsvRegistryClient five-citation precision drift (SIMPLIFY-INGESTION:93-95) | The doc carries the NEW positions (`00-CURRENT-STATE.md:295,297,302` → `:118-126,182-189` / `:100-106` / `:176-179,199-205`) — re-derived during the docs pass. |
| listUsers "absent = the whole list" + OpenAPI snapshot (SIMPLIFY-MODERATION:23; BOARD-SWEEP item 6) | Reworded in `AdminController.java` and the snapshot regenerated (2-line diff) by BOARD-SWEEP; `OpenApiSnapshotIT` green in my gate. |
| requireRate/ClientIps 4-site dedup (SIMPLIFY-ACCOUNT-BE:99; BOARD-SWEEP owner item 9) | Done by FINISH-P3-BE: `auth/ClientThrottle.java` exists; the four controllers rewired (board:196). **Owner item 9 closed.** |
| Pagination move out of `api` (BE-RECON:3; BOARD-SWEEP owner item 10) | Done by FINISH-P3-BE: `app/Pagination.java` exists, `api/Pagination.java` gone; doc citations re-derived (board:195). **Owner item 10 closed.** |
| GuidanceSearch duplicate suites (SIMPLIFY-GUIDANCE-CTRL/TESTS; BOARD-SWEEP owner item 14) | Consolidated by FINISH-P3-BE: `api/AdminGuidanceSearchPolicyTest.java` deleted, assertions folded into `guidance/GuidanceSearchTest`. **Owner item 14 closed.** |
| Guard census extension WAVE/N\d+ (SIMPLIFY-GUIDANCE-TESTS + SIMPLIFY-SHARED:70; BOARD-SWEEP owner item 15) | Done by FINISH-COPY-GUARD (board:144); the extended patterns are in `SourceVocabularyTest` (2/2 in my gate). **Owner item 15 closed.** |
| DOMPurify 3.4.11 advisories on swagger-ui 5.32.7 (FINISH-CONFIG:136; BOARD-SWEEP owner item 20, half) | Closed by commit 01a15c0: swagger-ui bumped to 5.32.15 with the springdoc property so the served bundle carries DOMPurify 3.4.13. The below-7 Spring/spring-data-jpa findings in the same item remain an owner call. |
| F8 bare "Malformed request" (P3-SECURITY-LOGGING:149; BOARD-SWEEP owner item 22, F8) | Done by FINISH-P3-BE (per-type messages + 3 re-pinned tests, board:194); the owed `error-copy.ts:69` FE one-liner landed (row 1 above). **F8 closed.** |
| N3 trusted-proxy pair (P3-STRUCTURE-HYGIENE; BOARD-SWEEP owner item 23, N3) | Subsumed into FINISH-P3-BE's `ClientThrottle` (the 4 constructor signature changes it flagged). **N3 closed.** |
| Stale-hash javadocs, B7a id, ReporterTrustEvaluator javadoc dup, shelter-copy/geolocation/models.ts comment debt (SIMPLIFY-PERSISTENCE:87-88, SIMPLIFY-DOMAIN:73, DESIGN-REVIEW:105, DOCS-ITERATE:108, SIMPLIFY-CORE-FE:51-52) | All FIXED by BOARD-SWEEP (board:153-159) — spot-verified: `PasswordResetToken` javadoc now keyed `v2:` form, `ShelterHistoryLog:60` id-free, `shelter-copy.ts` hue-model wording, 0 tree-wide hits for the dead names. |
| tryRecord dead seam (SIMPLIFY-VERIFICATION:77) | Deleted by DEAD-TRYRECORD (board:128); grep 0 hits. |
| PiiCrypto.blindIndex unframed HMAC (SIMPLIFY-PII-CORE:71, security finding) | Resolved by BLIND-INDEX-FRAMING (length-prefix `frameMessage` + `CodeHashes.matches` dual acceptance) — BOARD-SWEEP:163 verified; V34 migration in tree. |

## Not a problem (verified, no action owed)

- **hero-geometry.spec.ts parentheticals** (SPEC-TITLE-CLEAN) — three, all naming live components; leave (BOARD-SWEEP:161).
- **Submit-page geolocation inline literal** (SIMPLIFY-SHARED:38) — intentional, spec-pinned at `submit-shelter-page.spec.ts:999-1004`; leave (BOARD-SWEEP:161).
- **`.env:43` admin-moderation ref** — untracked local file, not on the branch; leave (BOARD-SWEEP:161, owner item 19).
- **README dated build-log ids** — sanctioned home for history (BOARD-SWEEP:161, owner item 24).

## Owner list (still open — one line each)

Carried from BOARD-SWEEP §Owner items, minus the 10 closures verified above:

1. **how.sources ET/RU triangle copy** (`et.ts:94`, `ru.ts:99`) — native-review rewrite of user-visible copy still describing the removed yellow triangle (EN half done by FINISH-COPY-GUARD; values re-verified still stale in tree).
2. **ET `admin.reports.dismiss` "Arvelda"** (`et.ts:718`) — native review of the Estonian dismissal confirmation (re-verified in tree).
3. **Submit placeholders not ending "…"** (SIMPLIFY-SHELTER-FE) — native copy decision in en/et/ru.
4. **Hero `sizes="400px"` over-declaration** — accept the measured-layout pin (`guidance-hero-geometry.spec.ts:18-19`) or re-measure with a same-edit spec change.
5. **Submit button disabled while in flight** — app-wide convention change, pinned by the frozen submit spec's loading-state test; needs a spec edit.
6. **DESIGN-REVIEW:145 three proposals** — `.anchor-line__clear` ~19px target (`map-page.scss:387`), the 9×48px admin tab row, `.panel-title` missing `--font-weight-title` (`account-page.scss:26`).
7. **Limiter bean collapse** (SIMPLIFY-CONFIG) — authorise the controller-side `RateLimiters` record bean or accept the nine @Beans as irreducible.
8. **PhoneNumbers move** (SIMPLIFY-VERIFICATION:76 + SIMPLIFY-PERSISTENCE:122) — two APPLIED migrations import it; a legacy-package shim, an owner waiver, or keep (still at `verification/PhoneNumbers.java` — re-verified).
9. **Shelter.applyOwnerEdit domain method** (SIMPLIFY-SHELTER-CTRL; P3-STRUCTURE-HYGIENE N1) — the carry-over-list hazard's final home; a domain/ scope move.
10. **Persistence SQL-drift self-enforcing pin** (SIMPLIFY-PERSISTENCE:125) — optional; nothing red without it.
11. **Frozen pinned-spec prose/titles** (SIMPLIFY-CORE-FE:83, SIMPLIFY-DOMAIN:110, DEAD-NAMES-CLEAN:133, SIMPLIFY-GUIDANCE-FE) — authorise comment/title-only edits; guard-green today, cosmetic only.
12. **community-review-queue live-name citations** (CHANGE-NAME-SWEEP-TESTS:113) — still resolvable LIVE name cited by 6 main-tree files (down from 14 at filing); reword or accept as resolvable.
13. **Below-gate dependency-check advisories** (FINISH-CONFIG:136, remainder) — 7 below-7 Spring 6.2-line findings + spring-data-jpa (the DOMPurify half closed by 01a15c0).
14. **flock lock discipline** (SIMPLIFY-QUERY:39 et al.) — enforce the lock for every Maven invocation or stop the dev server during gates (this lane's own gate ran lock-clean; no wipe hit).
15. **P3-SECURITY-LOGGING F7** (26 /admin/* paths in the public OpenAPI doc) + **F9** (trust-loopback hard cap/LRU) — accept or authorise the cross-boundary changes.
16. **P3-STRUCTURE-HYGIENE N1, N2, N4** — api-resident service move; MAX_REDIRECT_HOPS unification (a behaviour change); retention IT harness trade.
17. **README dated build-log ids** — accept as dated history (recommendation) or add to the authorised sweep list.

## Board names in the do-not-touch zone — recorded for the parent (brief rule 3)

- `AdminModerationService.java` doc citations (SIMPLIFY-MODERATION:24, re-derived to
  `:415-439 / :312-327 / :415,449` by FINISH-P3-BE for the Pagination import):
  **already re-derived and green** (DocumentationFactsTest 21/21 in my gate) — no
  open item. If the in-flight AdminModerationService extraction shifts those lines
  again, that lane must record the shift per rule 6; the parent should expect a
  rule-6 row from it.
- `ShelterQueryService.java:412-414` (V35 orphan-serving read, cited at
  00-CURRENT-STATE.md:123-127) and `:413-415` (re-derived by FINISH-P3-BE): same
  status — no open item; any further shift is the extraction lane's rule-6 duty.
- No other board entry names a file in these two services or their extraction
  targets that is still unfixed.

## Gate

- `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  (detached, exit file `/tmp/finish-odds-gate.exit`, log `/tmp/finish-odds-gate.log`):
  **exit 0 — Tests run: 1362, Failures: 0, Errors: 0, Skipped: 0** (baseline exact —
  my diff adds/removes no tests), BUILD SUCCESS, PMD (failOnViolation) clean,
  JaCoCo 0.93 floor met, `DocumentationFactsTest` 21/21, `SourceVocabularyTest` 2/2,
  `OpenApiSnapshotIT` green. 17:09–17:11 EEST. Zero `[ERROR]` lines; no
  missing-class wall (no foreign build hit).
- Frontend gate: **not run** — this lane touched no frontend file (the three fixes
  are two backend javadocs and one qa/ shell script).

## Unverified / residual

- Nothing from this lane is unverified. The only caveat: the two concurrent
  extraction lanes (ShelterQueryService / AdminModerationService) had not written
  anything to this worktree at gate time; if their files land later and the
  combined tree is re-gated, their own rule-6 shift rows govern any anchor drift.
- The 17 owner items above stand as filed; none was touchable under this lane's
  mandate (translation values, user-visible copy, behaviour changes, or
  cross-lane structural moves).

## Files for the parent's commit (this lane)

- `src/main/java/ee/sheltermap/guidance/HeroImportRefusedException.java` (1 line, javadoc)
- `src/main/java/ee/sheltermap/guidance/HeroImportUnreachableException.java` (1 line, javadoc)
- `qa/check-guidance-bodies.sh` (3 lines reworded, 3 in place)
- `reviews/code-review/finish-odds-ends.md` (this report)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (my fate lines, appended)
