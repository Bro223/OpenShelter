# SIMPLIFY-DOMAIN — readability pass on `domain/**`

Branch `code-review`. Scope: `src/main/java/ee/sheltermap/domain/**` (33 files) + the four tests pinning them. Comment-only pass — **zero code lines changed, zero test files touched** (diff-analysis verified: 157 added / 148 removed lines, every one of them comment/javadoc).

## 1. What the pass did

The domain's code was already in the target shape: the trust derivations are flat (no nested derivation to flatten — verified below), the names are intention-revealing, and there was nothing to rename without breaking tests or API. The readability debt was in the **comments**: planning change-ids and dead planning references, plus three comments that described behaviour the code no longer has.

### 1.1 Planning change-ids removed (20 files, 0 residual)

Kebab-case change names from the planning ledger — dead references in the sense `SourceVocabularyTest`'s own javadoc defines ("the row they name lives outside this repository, so the comment states a conclusion without its reason"). Each sentence already states its reason in words, so the id dropped cleanly. The guard's pattern list does not catch these shapes (they are not `wave-N`/`D-N`/etc.), which is why they survived the id sweep — this pass is the sweep's follow-up for the domain package. Residual after the pass: **0** in `domain/**` (grep-verified over all 12 names).

Removed names: `shelter-provenance-taxonomy`, `community-review-queue v2` (×5), `shelter-trust-and-reports` (×4), `community-self-moderation` (×2), `admin-moderation` (×4), `moderation-dashboard-completion` (×2), `crisis-guidance` (×2), `guidance-hero-import` (×3), `guidance-manual-order` (×3), `bilingual-guidance` (×2), `shelter-bbox-paging`, `retention-pruning`, `remove-national-id`, `part 2 of the erasure fix`, `the 4→5 transition` (history, not constraint), `01-user-verification.puml` (dated-pack pointer), `later steps` / `the decision` / `later change` (dangling references).

Deliberately **kept**:
- **Flyway versions** (V7, V9, V10, V11, V20, V23–V27, V29, V31) — resolvable: the migration files exist in the tree, and the guard explicitly exempts bare `V<digits>`.
- **TIJ "Bird"/Pigeon/Penguin** (User, GuestUser, RegisteredUser, AdminUser) — a design citation from a published book (Thinking in Java), recorded in `context-and-tasks/01-user-verification.puml`; a source reference, not a planning id.
- **"same level as capacity"** (ShelterOpenStatusReport) — a genuine cross-reference to a sibling domain concept.
- **V10/V11/V31-era semantics** the comments state (backfill, SET NULL on erasure, disarm flag) — all still true against the migrations.

### 1.2 Stale comments fixed (three) — comment now matches the code

1. **`ShelterReportType` javadoc** (16 → 29 lines, the one real rewrite). It said `CLOSED`/`OPEN_CONFIRMED` "net out to a display flag only" and `WRONG_LOCATION`/`OTHER` have "no user-facing effect". Both are false today, verified against the code:
   - `OPEN_CONFIRMED` drives the auto-confirm: `ShelterReportService.java:186-188` (type branch → `autoConfirmIfEligible`), class javadoc `:56-64`.
   - The CLOSED display flag is retired: `ShelterDto.java:38-40` — "The CLOSED/OPEN_CONFIRMED report TYPES remain (historical rows, the auto-confirm path) — the retired display flag (statusFlag) is gone with them".
   - `WRONG_LOCATION`/`OTHER` DO have a user-facing effect: open reports of either kind turn the pin reported (`ShelterDto.java:127-134`, "EITHER report kind turns the pin red when open") and derive `REPORTED_INACTIVE` on a hidden row (`Provenance.java:65-69`).
   New comment is a per-type routing table with `{@link}` anchors to the two thresholds.
2. **`Shelter.setStatus` javadoc** — said "the only caller is the trust layer's auto-hide". Stale: `AdminModerationService.java:185` (admin hide/restore) and `:511` (admin REJECT) also call it. Now names all three writers and states why the setter stays plain (callers own the transition rules).
3. **`RegisteredUser.deleteAccount` comment** — "Service-level cascade (credentials, tokens) is later steps". The cascade exists: `AccountService.deleteAccount` (`auth/AccountService.java:148-170`) runs it. Now points at that method.

Plus one confusing sentence corrected: `Shelter` class javadoc listed "the trust layer's auto-hide, the community-report auto-hide" as if two auto-hides existed — there is one auto-hide path (`autoHideIfEligible`, `ShelterReportService.java:302-316`); the real three writers are the auto-hide, the admin hide/restore and the admin REJECT. The same rewrite states the cross-field constraint (a hide/restore never touches `reviewStatus`, except a restore of a REJECTED row starting over as NEW — `AdminModerationService.java:180-184`).

### 1.3 The trust derivation — checked for flattening, already flat

- `Provenance.of` (`Provenance.java:59-80`): a chain of early returns, first match wins, precedence documented as a numbered list with the reason per step. No nesting.
- `ReporterTrust.of` (`ReporterTrust.java:47-59`): flat accumulation, cap at the end.
- `VerificationPolicy.allows` (`VerificationPolicy.java:24-36`): one loop, one set union, one containment test.
- Threshold constants: domain-fact statements with the enforcing service named (`ShelterReport.java:20-30, 31-41`).
- Constraint comments now state the "what breaks": the REPORTED_INACTIVE branch's OR-semantics (either report kind, open reports only), the submitter-exclusion ("their own confirmation never verifies their own shelter, not even as the third"), the red-family reservation is a frontend concern (out of scope; its comment sits at `frontend/src/styles.scss:898-899`).

No code was changed, so there is nothing to re-verify at the bytecode level — the `git diff` contains no non-comment line (checked programmatically: 0 code lines added or removed).

## 2. Files changed (before → after line counts)

All 20 files, comment-only. Pinned files (★) kept their **exact** line counts:

| File | old | new | Δ |
|---|---:|---:|---:|
| ★ `Shelter.java` | 259 | 259 | 0 |
| ★ `ShelterReport.java` | 148 | 148 | 0 |
| ★ `ReviewStatus.java` | 24 | 24 | 0 |
| ★ `Provenance.java` | 81 | 81 | 0 |
| `AdminUser.java` | 58 | 58 | 0 |
| `BoundingBox.java` | 38 | 38 | 0 |
| `ContactChangeType.java` | 11 | 10 | −1 |
| `GuidancePost.java` | 320 | 319 | −1 |
| `GuidanceStatus.java` | 15 | 15 | 0 |
| `GuidanceTranslation.java` | 159 | 158 | −1 |
| `LocationKind.java` | 17 | 16 | −1 |
| `MediaAsset.java` | 134 | 134 | 0 |
| `OccupancyBand.java` | 12 | 12 | 0 |
| `PublicGuidanceView.java` | 149 | 149 | 0 |
| `RegisteredUser.java` | 124 | 124 | 0 |
| `ReporterTrust.java` | 63 | 63 | 0 |
| `ReviewDecision.java` | 14 | 15 | +1 |
| `ShelterOccupancyReport.java` | 63 | 63 | 0 |
| `ShelterReportType.java` | 16 | 29 | +13 |
| `User.java` | 135 | 134 | −1 |
| **total** | **1840** | **1849** | **+9** |

Untouched files in scope (read, judged already clean): `Capability`, `GeoPoint`, `GuestUser`, `OpenStatusState`, `ShelterOpenStatusReport`, `ShelterSource`, `ShelterStatus`, `TextValidation`, `UserData`, `VerificationClaim`, `VerificationLevel`, `VerificationPolicy`, `VerificationRules`, `SiteText`, and all four test files.

## 3. Evidence the trust model still holds (tests unmodified)

`git diff -- src/test/` is **empty** — no test file changed. The four pinning suites, run focused before the full gate (exit 0):

- `ProvenanceTest` — **17/17**: the full provenance decision table + precedence edges (REJECTED beats everything; reported-away is `REPORTED_INACTIVE` on either report kind; below-threshold falls through; admin-hidden without the count keeps its source value).
- `ReporterTrustTest` — **6/6**: baseline 1, +1 cross-verified, +1 two auto-confirms (one is not a pattern), cap 3, range rejection.
- `UserHierarchyTest` — **6/6**: guest can't write; levels reflect add/revoke; revoking the only claim disables write; `UserData` snapshot immutability; name edit; delete clears claims.
- `VerificationPolicyTest` — **3/3**: the capability × level-set matrix.

Guards over my comments, same focused run (exit 0):

- `SourceVocabularyTest` — **1/1**: no forbidden id shapes introduced, floor intact (136k-line walk).
- `DocumentationFactsTest` — **21/21**: all `00-CURRENT-STATE.md` anchors still resolve, including every citation into my scope.

## 4. Anchor check (rule 6) — no shifts

All seven citations the current-state doc points into my scope were kept **byte-stable** (the edits were made line-count-neutral exactly where an anchor lives):

| Citation | Pinned content | Verified at |
|---|---|---|
| `ReviewStatus.java:20-23` | `public enum ReviewStatus {` + NEW/CONFIRMED/REJECTED | line 20, token `ReviewStatus` present |
| `Shelter.java:74` | `private ReviewStatus reviewStatus = ReviewStatus.CONFIRMED;` | line 74 |
| `Provenance.java:59-80` | `of(...)` derivation | line 59, body intact |
| `Provenance.java:65-69` | REPORTED_INACTIVE branch | `return REPORTED_INACTIVE;` at 68 |
| `ShelterReport.java:26-28` | submitter-exclusion sentence | byte-identical (26-28) |
| `ShelterReport.java:30` | `AUTO_CONFIRM_THRESHOLD = 3` | line 30 |
| `ShelterReport.java:41` | `AUTO_HIDE_THRESHOLD = 5` | line 41 |
| `GeoPoint.java:7-10,22-24` | Estonia bbox constants + `inEstonia` | file untouched |

**No anchor shift to re-derive; nothing owed to the anchor pass from this lane.** (One mid-pass slip — the `AUTO_HIDE_THRESHOLD` javadoc first landed 11 lines and pushed the constant to :42 — was caught by the line check and corrected before any gate run.)

## 5. Duplication found — reported, not moved (rule 4)

- **`app/ReporterTrustEvaluator`'s javadoc duplicates `domain/ReporterTrust`'s** "the weight is NEVER stored: it is re-derived…" paragraph almost verbatim (`ReporterTrustEvaluator.java:13-17` vs `ReporterTrust.java:8-12`). The code itself is correctly de-duplicated — the evaluator calls `ReporterTrust.of(...)`. `app/` is another lane's file; filed in the notes board.
- **77 non-domain files still carry the same kebab-case change names** in comments (trust/moderation slugs in `app/`, `api/`, `persistence/`, `config/`, `auth/`; guidance slugs in `guidance/`, `api/`, `persistence/`). Same dead-reference class this pass removed from `domain/`; each belongs to its owning lane. Listed in the notes board.

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`, detached, exit file:

- **exit 0 — 1349/1349, 0 failures/skipped (baseline exact), PMD clean, jacoco 0.93 floor met, `DocumentationFactsTest` 21/21, `SourceVocabularyTest` 1/1, no missing-class wall.**

(The surefire log carries a JaCoCo "Unsupported class file major version 71" instrumentation warning on JDK 27 internals — a warning, not a failure; every other lane's green gate shows the same, and the current-state doc's *Unsettled* section already tracks the JDK 27 question.)

## 7. Unverified / owner calls

- Nothing left unverified in scope: every comment assertion I wrote was checked against the cited code (`ShelterReportService`, `AdminModerationService`, `AccountService`, `ShelterDto`), and the full gate is green.
- **Test-file comment residue (NOT touched, per rule 1 "tests must pass untouched"):** `ProvenanceTest` carries two "part 3:" planning prefixes (lines 44, 78) and its class javadoc the change name; `UserHierarchyTest`'s javadoc says "Bird-rule test (Step 1 acceptance)"; `VerificationPolicyTest` says "(Step 1 acceptance) … from the context testing notes". None matches a `SourceVocabularyTest` pattern (guard green), so this is cosmetic — but if the owner wants the domain *test* comments as clean as the domain comments, a one-line-per-test rewording is a follow-up that needs explicit authorisation to touch pinned tests.
- The `ShelterReportType` rewrite makes the routing claim in words the DTO contract already makes; if a future lane retires the `CLOSED` type or changes the reported-pin OR-rule, that javadoc is the second place to update (the `ShelterDto` contract is the first).
