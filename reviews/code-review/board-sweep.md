# BOARD-SWEEP — report

Lane BOARD-SWEEP, branch `code-review`, baseline `2a7ef62` (worktree carried the two
in-flight P3 lanes' uncommitted files — both report lane-done; see §Concurrency).
Task: triage every entry of `docs/autopilot/CODE-REVIEW-NOTES.md` into
already-fixed / yours-to-fix / owner / not-a-problem; fix the yours bucket
(comment + spec-title changes only, per the run rules); one line per entry on the
board; record every verdict here with evidence. Nothing committed (parent commits).

## Verdicts for every actionable entry

Legend: **FIXED** = I edited it this lane · **already-fixed** = verified done in
the current tree · **owner** = one decision needed (listed in §Owner items) ·
**not-a-problem** = verified no action owed.

### Fixed this lane (9 items, 12 files)

| # | Entry (board ref) | Verdict | Evidence |
|---|---|---|---|
| 1 | `map-crisis-actions` spec title — `contributions-panel.spec.ts:113` | **FIXED** | `(map-crisis-actions regression pin)` dropped from the it() title; the inline comment below it already states the intent. Same pure drop as the SPEC-TITLE-CLEAN renames. Title strings are not asserted by any test (specs assert on DOM, not on titles). |
| 2 | Stale "the SHAPE carries the depth" — `shelter-copy.ts` (filed by DESIGN-REVIEW:143 + DOCS-ITERATE:146) | **FIXED** | Three spots, not two: `:74` (submitterVerificationKey doc), `:87-91` (verificationTone doc), `:110` (trust-state doc). All reworded to the current model: the tone's **hue** carries the depth; the legend's labels and the row badge say it in words (WCAG 1.4.1); the anchor diamond is the shape-based case. Line-count preserving — the doc-cited `shelter-copy.ts:84-101` range (00-CURRENT-STATE.md:76) stays intact. |
| 3 | Stale "Shape + hue carry the depth" — `styles.scss:869-878` (DESIGN-REVIEW:143) | **FIXED** | Reworded to "Hue carries the depth — the legend's labels and the row badge say it in words, so the pin is never colour-alone (WCAG 1.4.1)…". Exactly 10→10 lines: the file stays **exactly 920 lines**, `.shelter-marker--full` still at `:879`, the doc-cited `869-881` range intact (all rules below byte-aligned). pi-lens CSS check clean. |
| 4 | Stale `SHA-256` javadoc — `auth/PasswordResetToken.java:10` (SIMPLIFY-PERSISTENCE:123) | **FIXED** | Javadoc now says the keyed `v2:` form via `PiiCrypto.codeHash`, legacy unkeyed SHA-256 readable through the transition — matching the code (`PasswordResetService:191` → `PiiCrypto.codeHash`, verified). Same class in its service: `PasswordResetService.java:29` (class javadoc "stored SHA-256-hashed") and `:128` (requestReset "stores its SHA-256 hash") reworded to the keyed `v2:` form. |
| 5 | Unresolvable `B7a` id — `app/ShelterHistoryLog.java:60` (SIMPLIFY-PERSISTENCE:124) | **FIXED** | "the stable-order discipline, B7a" → "the stable-order discipline". Same class swept from `PasswordResetService.java` (not filed — found by this sweep): `(S1b, V8 …)` → `(the V8 created_at anchor)` (`:44`), `at the controller (S1a)` → `at the controller` (`:48`), `(S1b)` ×2 field comments (`:56,:59`), `(S1b)` requestReset (`:137`), `(reviews F2)` (`:139`), `(S1c — …)` decide() (`:212`). S1a/S1b/S1c/reviews-F2 are outside the guard's pattern set (like B7a) and resolve nowhere. Comment-only. |
| 6 | `listUsers` "absent = the whole list" — `AdminController.java` (SIMPLIFY-MODERATION + SIMPLIFY-MODELS; regen assigned by P3-STRUCTURE-HYGIENE) | **FIXED** | Verified the service defaults to 100 (`AdminModerationService.listUsers` → `requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT=100)`), so the rewording matches the other three admin lists' house style. Three spots: javadoc `:423`, @Operation `:432-434`, @Parameter `:447-448` → "1..200, default 100" / "Rows to return, 1..200 (default 100; anything else 400)". `docs/api/openapi.json` regenerated with the sanctioned locked command — **the diff is exactly the two listUsers description strings** (verified by diff). This also closes the P3-STRUCTURE-HYGIENE "yours to close" and ERASURE-DEPTH-FIX:138 openapi asks (the V35 @Schema string was already in the committed snapshot). |
| 7 | Planning-id comments — `pom.xml:24,34,55,68,273,332,382,385` (SIMPLIFY-ADMIN-CTRL:102 class — the guard scans only src/main/java, src/test/java, frontend/src, so pom ids pass silently) | **FIXED** | 8 lines: `W2-C` ×4, `W3-C` ×2, `P2-16` ×3, `SW-A1` ×1. Ids dropped, the constraint each stood for kept, comment-only. (The jsoup `D2` from SIMPLIFY-ADMIN-CTRL:102 was already swept by FINISH-CONFIG:134.) |
| 8 | Dead `submitter-verification-badge` names — `models.ts:358,387` (SIMPLIFY-CORE-FE:81) + `map-page.spec.ts:469,1745` (found by this sweep) | **FIXED** | The filed four spots: L358 + L387 carried the dead name (fixed); the filed L350/L541 `admin-moderation` spots are **already clean** in the current tree (grep: 0 hits tree-wide). The L387-393 `ShelterDto.submitterVerification` javadoc was also pre-V35 stale ("nothing is stored on the row, so the badge cannot go stale") — reworded to the frozen-snapshot semantics (live rows derived on read; orphaned rows serve the depth frozen at erasure), mirroring the current-state doc's V35 bullet. `map-page.spec.ts:469-471` "the SHAPE carries it" → "the TONE carries it" + dead name dropped; `:1745` dead name dropped. Neither file is doc-cited (grep 0 hits) — no anchor owed. Comment/title-only. |
| 9 | Stale header — `frontend/src/app/shared/geolocation.ts:8-13` (found by this sweep) | **FIXED** | Claimed the detail page uses "plain copy (its DISTANCE_COPY)". Both pages now map failures to their OWN i18n keys — verified `NEAREST_KEY` in `map-page.ts` and `DISTANCE_KEY` in `shelter-detail-page.ts:75,639`. Reworded; the file is not doc-cited. |

Also fixed (filed by SIMPLIFY-DOMAIN:109, same comment-only class):
`app/ReporterTrustEvaluator.java` — the class javadoc's near-verbatim repeat of
`ReporterTrust`'s "the weight is NEVER stored" paragraph collapsed to a
`{@link ReporterTrust}` pointer (the domain record is the canonical home, as filed).

### Already fixed before this lane (verified in the current tree, not assumed)

| Entry | Proof |
|---|---|
| Dead `ShelterRepository` constructor param (BE-RECON) | `git log` + code: removed by SIMPLIFY-SHELTER-CTRL (constructor now takes the live deps only; test seam updated). |
| `MarkdownToHtml` 411-line dead class (BE-RECON) | File + both test-tree companions deleted by DEAD-CODE; 0 references (grep). |
| Triple `isAdmin` round-trip (SIMPLIFY-MODERATION:33) | `ShelterService:166` reads it once; counting-fake pins 3→1. |
| `tryRecord` dead seam (SIMPLIFY-VERIFICATION:77) | Deleted by DEAD-TRYRECORD:128 (interface + 2 impls + 3 pins); grep 0 hits. |
| `map.legend.unverified` key (REMOVE-UNVERIFIED-PIN:120) | Removed from all four catalogs by DESIGN-REVIEW:142; grep 0 hits. |
| i18n-catalog planning ids (SIMPLIFY-CORE-FE:80) | Swept by SIMPLIFY-CATALOGS (its lane-done line); grep for the filed ids in `frontend/src/app/core/i18n/` → 0 hits. |
| `mapCenter`/`useMapCenter` + `focusFirstInvalidField` + `role="status"` (UX-A11Y findings) | All present in the tree (`leaflet-service.ts:219-233`, `form-helpers.ts:40-62`, submit page wiring) — UX-A11Y-FIXES:106. |
| spellcheck attributes (SIMPLIFY-ACCOUNT-FE:88) | `spellcheck="false"` present on the code/delete-arming inputs (verified in account-page.html). |
| BLIND-INDEX-FRAMING throwaway probe spec (116) | `frontend/src/app/features/guidance/__race-probe.spec.ts` no longer exists. |
| `AdminAlertDto` @Schema missing the 4th kind (SIMPLIFY-DTOS:131) | `kind` @Schema now lists all four ThrottleAlert kinds incl. `code-send-failure` (verified at AdminAlertDto.java:30-33). |
| `PiiCrypto.blindIndex` unframed index (owner security finding) | Resolved by BLIND-INDEX-FRAMING: length-prefix `frameMessage` + `CodeHashes.matches` dual-accepts keyed `v2:` + legacy (verified in code). |
| V35 depth snapshot + orphan-snapshot read (ERASURE-DEPTH-FIX) | `submitterVerificationSnapshot` plumbed end-to-end; orphan read at `ShelterQueryService.java:412-414`; doc bullet updated (00-CURRENT-STATE.md:123-127). |
| All anchor-drift lines (SIMPLIFY-CONFIG:20, SIMPLIFY-GUIDANCE, ANCHOR-PASS, SIMPLIFY-SHARED:72, SIMPLIFY-CATALOGS:90, UX-A11Y-FIXES:104, DOCS-ITERATE) | Re-derived by ANCHOR-PASS + DOCS-ITERATE (their gates: DocumentationFactsTest 21/21). The doc I verified spot-checks live: `shelter-copy.ts:84-101`, `styles.scss:869-881`, `leaflet-service.ts` cites all resolve. |
| All in-flight LSP/template flags (SIMPLIFY-CONFIG:5, SIMPLIFY-GUIDANCE:8, SIMPLIFY-GUIDANCE-CTRL:43-45, SIMPLIFY-MODELS:48) | The mid-edit states landed and were committed by the parent (worktree at `2a7ef62` is clean of them; my frontend gate re-proves the tree). |

### Not a problem (verified)

| Entry | Why |
|---|---|
| hero-geometry parentheticals (SPEC-TITLE-CLEAN) | There are **three** (not two), and all three name LIVE components — `guidance-detail-page`, `guidance-list-page`, `guidance-editor` — whose files exist and which the spec literally reads. SPEC-TITLE-CLEAN §2 already decided to leave them; the citation is resolvable, so the guard correctly allows it. **Leave.** |
| Submit-page geolocation inline literal (SIMPLIFY-SHARED:69) | Documented as intentional in the module's own doc: the /submit page inlines the same shape and its spec pins the literal (`submit-shelter-page.spec.ts:999-1004`). Single-sourcing would break the pin. **Leave.** |
| `.env:43` admin-moderation ref (FINISH-CONFIG:135) | The file is **untracked** (`git ls-files .env` empty; `.gitignore`d; `.env.example` clean) — it is not on the branch, outside the guard's surface. My recommendation: leave (board says reword-or-leave per owner). |
| README dated build-log ids (`W2-A part 2`, `M1`/`M2`) | They sit in the DATED build log ("per-wave numbers further down are historical snapshots", README:28-38) — the doc's sanctioned home for history (the standing rule DOCS-ITERATE applied: history lives in dated records). Pre-existing, pre-run. **Accept as dated history** (or add to the authorised sweep list — owner line below). |
| `focusFirstInvalidField` "partial application" | Not partial: the helper is wired to login/register/reset/submit (the four filed forms); the other forms are the a11y lane's later scope. |

### Owner items (one line each — the exact decision required)

1. **how.sources triangle copy (en/ru/et)** — native-review rewrite of user-visible copy still describing the removed yellow triangle (REMOVE-UNVERIFIED-PIN:120, stands as filed).
2. **ET `admin.reports.dismiss` "Arvelda"** — native review of the Estonian dismissal confirmation (user-visible copy).
3. **Submit placeholders not ending "…"** (SIMPLIFY-SHELTER-FE) — native copy decision on the "e.g. …" convention in en/et/ru.
4. **`color-scheme: dark`** (SIMPLIFY-CORE-FE:82) — set it on the dark/high-contrast theme blocks or at runtime with the theme attribute, or accept the native-controls light residue.
5. **Hero `sizes="400px"` over-declaration** (SIMPLIFY-GUIDANCE-FE + UX-A11Y-FIXES:105) — accept the measured-layout pin (`guidance-hero-geometry.spec.ts:18-19`) or re-measure with a same-edit spec change.
6. **Submit button disabled while in flight** (SIMPLIFY-SHELTER-FE) — app-wide convention change (guideline: stay enabled + spinner); pinned by the frozen submit spec, needs a spec edit.
7. **DESIGN-REVIEW:145 three proposals** — apply or dismiss each: `.anchor-line__clear` ~19px target (map-page.scss:387), the 9×48px admin tab row, `.panel-title` missing `--font-weight-title` (account-page.scss:26).
8. **Limiter bean collapse** (SIMPLIFY-CONFIG) — authorise the controller-side `RateLimiters` record/map bean for the full ~100-line SecurityConfig collapse, or accept the nine @Beans as the irredeclarative surface.
9. **`requireRate`/`ClientIps` 4-site dedup** (SIMPLIFY-ACCOUNT-BE:99) — a shared resolver component spans four controllers owned by different lanes; needs a serial parent pass or acceptance of the duplication.
10. **Pagination move out of `api`** (BE-RECON:3) — the move + the one reverse import (`guidance/MediaService.java:3`); a serial structural change.
11. **`PhoneNumbers` move** (SIMPLIFY-VERIFICATION:76 + SIMPLIFY-PERSISTENCE:122) — two APPLIED programmatic migrations import it and rule 5 forbids touching them: a legacy-package shim, an owner waiver, or keep it.
12. **`Shelter.applyOwnerEdit` domain method** (SIMPLIFY-SHELTER-CTRL; P3-STRUCTURE-HYGIENE N1) — the carry-over-list hazard's final home; a domain/ scope move that travels with the anchor-pinned doc re-derivation.
13. **Persistence SQL-drift self-enforcing pin** (SIMPLIFY-PERSISTENCE:125) — optional permanent pin (query listener asserting page/count SQL share the WHERE fragment); nothing is red without it.
14. **GuidanceSearch duplicate suites** (SIMPLIFY-GUIDANCE-CTRL/TESTS) — `GuidanceSearchTest` (8) and `AdminGuidanceSearchPolicyTest` (7) pin the same policy from two packages: retire the api one or keep both.
15. **Guard census extension** (SIMPLIFY-GUIDANCE-TESTS + SIMPLIFY-SHARED:70) — add all-caps `WAVE \d+` and bare `N\d+` spec-title tokens to SourceVocabularyTest; the guard is off-limits to lanes.
16. **Frozen pinned-spec prose/titles** (SIMPLIFY-CORE-FE:83, SIMPLIFY-DOMAIN:110, DEAD-NAMES-CLEAN:133, SIMPLIFY-GUIDANCE-FE, SIMPLIFY-SHARED:70) — authorise comment/title-only edits across the five core specs, four domain test files, seven admin-page it-titles, six guidance spec lines, the bare `N\d+` titles. Guard-green today; cosmetic only.
17. **`community-review-queue` live-name citations** (CHANGE-NAME-SWEEP-TESTS:113) — 24 comment lines in 14 main files cite the LIVE (resolvable) name: reword to the constraint or accept as resolvable.
18. **qa/security-checklist.md:57 + qa/test-plan.md:70** (DEAD-TRYRECORD:130) — point both citations at the surviving pins (`VerificationDailyCapIT`, `VerificationThrottleIT`, `OtpContactCapIT`); doc-lane one-liner, nothing red.
19. **`.env:43`** (FINISH-CONFIG:135) — untracked local file: reword the local comment or leave (my recommendation: leave).
20. **Below-gate dependency-check advisories** (FINISH-CONFIG:136) — advisory-lane bump call: 7 below-7 Spring findings + spring-data-jpa + the NEW DOMPurify 3.4.11 advisories on the exact pinned fix release (CVE-2026-66010/75838).
21. **flock lock discipline** (SIMPLIFY-QUERY:39, SNAPSHOT-CLEAN:115, DEAD-TRYRECORD:129, P3 lanes) — 4+ gates killed by UNLOCKED builds (latest pid on record in SIMPLIFY-REPORTS); a dev `mvn spring-boot:run` (PID 2688197) has run since 2026-09-23. Enforce the lock for every Maven invocation (incl. focused `-Dtest=`) or stop the dev server during gates.
22. **P3-SECURITY-LOGGING F7/F8/F9** — accept the documented residuals or authorise the cross-boundary changes: F7 the 26 /admin/* paths in the public OpenAPI document; F8 the bare "Malformed request" family message (3 BE test files + `error-copy.ts:69`); F9 a hard cap/LRU on the shared limiter bucket (behaviour change to all nine buckets).
23. **P3-STRUCTURE-HYGIENE N1-N4** — one decision each (report `reviews/code-review/p3-structure-hygiene.md`): N1 the api-resident service move; N2 `MAX_REDIRECT_HOPS` unification (the two hop semantics genuinely diverge — `<3` vs `<=3`); N3 the trusted-proxy pair (4 constructor signature changes); N4 the retention IT harness trade.
24. **README dated build-log ids** (`W2-A part 2`, `M1`/`M2`) — accept as dated history (my recommendation) or add them to the authorised sweep list.

## Gates (detached, exit files) — ALL GREEN

- `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` — **exit 0** — **Tests run: 1366, Failures: 0, Errors: 0, Skipped: 0**, BUILD SUCCESS (158 test classes, 76 IT classes; DocumentationFactsTest 21/21, OpenApiSnapshotIT green, SourceVocabularyTest green; `/tmp/board-sweep-be.log`, exit file `/tmp/board-sweep-be.exit`). 1366 = the 1365 combined-tree count P3-STRUCTURE-HYGIENE measured + 1 from the two P3 lanes' final file states (their AdminSeederTest/AdminModerationIT diff — my diff adds zero test methods: comment + one title rename only). Zero failures attributable to my files.
- `cd frontend && npx ng test --watch=false` — **exit 0** — **1582 passed (1582), 65 files** — exactly the post-DESIGN-REVIEW baseline (`/tmp/board-sweep-fe-test.log`).
- `cd frontend && npx ng build` — **exit 0** — bundle complete (`/tmp/board-sweep-fe-build.log`); the 15 budget warnings are the pre-existing scss budget warnings other lanes already logged (map-page.scss, admin/submit/page-shell), none on my files.

Log/exit-file summary: `/tmp/board-sweep-be.{log,exit}`, `/tmp/board-sweep-fe-test.log`, `/tmp/board-sweep-fe-build.log`, `/tmp/board-sweep-fe.exit` (`test=0 build=0`).

## Concurrency note

Two lanes (P3-SECURITY-LOGGING, P3-STRUCTURE-HYGIENE) completed in this same
worktree mid-session (writes 22:45–23:01; both board lane-done lines present).
Their files (SchedulingConfig, AdminSeeder, SecurityConfig, ApiErrorHandler,
AdminSiteTextController, AdminModerationIT, AdminSeederTest, README, the new IT)
do not overlap my edit set — verified by `git status`/`git diff --numstat`
(file-level, no shared hunks except this board, to which I append after their
lines). My gates therefore run on the **combined** tree; any foreign failure
would be attributed from the failing class, not my files.

## Files for the parent's commit (this lane)

- `src/main/java/ee/sheltermap/auth/PasswordResetToken.java` (comment)
- `src/main/java/ee/sheltermap/auth/PasswordResetService.java` (comment)
- `src/main/java/ee/sheltermap/app/ShelterHistoryLog.java` (comment)
- `src/main/java/ee/sheltermap/app/ReporterTrustEvaluator.java` (comment)
- `src/main/java/ee/sheltermap/api/AdminController.java` (comment + @Operation/@Parameter description)
- `pom.xml` (comments)
- `frontend/src/app/shared/shelter-copy.ts` (comments)
- `frontend/src/styles.scss` (comment, line-count preserving)
- `frontend/src/app/shared/geolocation.ts` (comment)
- `frontend/src/app/core/models.ts` (comments)
- `frontend/src/app/features/account/contributions-panel.spec.ts` (one it() title)
- `frontend/src/app/features/map/map-page.spec.ts` (comments)
- `docs/api/openapi.json` (regenerated — 2-line diff, the listUsers strings)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (my fate lines)
- `reviews/code-review/board-sweep.md` (this report)
