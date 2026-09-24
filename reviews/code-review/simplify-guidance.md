# SIMPLIFY-GUIDANCE lane report

Scope (exclusive): `src/main/java/ee/sheltermap/guidance/**` and the tests that pin
those classes (`src/test/java/ee/sheltermap/guidance/**`). Primary target:
`GuidanceService.java`, the backend's top readability problem (god class,
duplicated validation prologues, history-toned comments, planning ids).

## 1. `GuidanceService.java` — 1063 → 1084 lines, behaviour identical

Extracted cohesive pieces (all private; the pinned public surface —
constructor argument list, public methods, constants, static delegates,
`SavedPost`, exception messages — is byte-for-byte the same):

| Extraction | New location | Replaced |
| --- | --- | --- |
| `CleanedContent` record + `cleanedContent(title, body, alt)` | L1077, L1080 | the FIVE duplicated validation prologues in `create` (L423), `update` (L477), `updateInLocale` (L546), `createTranslation` (L933), `updateTranslation` (L964) — each did require-title → sanitize-body → trim-alt inline |
| `requirePublishedPostForSlug(slug)` | L371 | the empty-list / multi-row / post-gone / draft 404 ladder in `getByPublicSlug` (L341) |
| `slugsByLocale(rows)` | L387 | the slug-map build in `getByPublicSlug` |
| `homeAltAfterHeroChange(oldAlt, hasHero, requestAlt)` | L783 | the nested ternary in `updateInLocale` (used at L584) |
| flattened fallback in `resolveHeroOnSave` | L845-846 | `req != null ? req : (post == null ? null : post.getHeroImageId())` |

Flattened/renamed locals in the touched methods (`editL` → `validatedEditLocale`,
`cleanTitle/cleanBody/heroAlt` → `content.title()/content.bodyHtml()/content.heroAlt()`).
Removed two unused imports (`java.util.Locale`, `java.util.function.Predicate`).
Comments rewritten to state the constraint instead of citing the planning pass;
validation order, transaction boundaries, audit rows and every exception message
are unchanged — `GuidanceServiceTest` 87/87 green.

**Anchor pin (rule 6):** the rewrite moved the hero region 798-858 → 799-865.
All five cited clauses in `docs/agent/00-CURRENT-STATE.md` still pass on the new
tree (verified against `DocumentationFactsTest`): record at 799,
`resolveHeroOnSave` at 826, catch at 839-840, fallback at 845-846,
`isHeroImportedFrom` javadoc at 852-858 with `source_url` at 855. Shift recorded
in `docs/autopilot/CODE-REVIEW-NOTES.md` for the final anchor pass. The doc was
not edited (one lane owns it).

## 2. Comment sweep across the guidance package (19 files, comments only)

Planning ids and history wording removed, reasoning preserved, in:
`BodySanitizer`, `GuidanceNotFoundException`, `GuidanceOrderingService`,
`GuidancePostRepository`, `GuidanceSearch`, `GuidanceTranslationRepository`,
`GuidanceValidation`, `GuidanceValidationException`, `MediaAssetInUseException`,
`MediaAssetRepository`, `MediaDerivatives`, `MediaImageInspector`,
`MediaService`, `MediaStorage`, `MediaTooLargeException`,
`SlugAlreadyUsedException`, `SlugFactory`, `UnsupportedImageException`, and
`HeroImageImportService` (L82+ only — its cited lines 24-33 are untouched).

Forms removed: `crisis-guidance Dn`, `bilingual-guidance`, `guidance-manual-order Dn`,
`admin-locale-scope`, `admin-guidance-search`, `guidance-index N+1`, `W2-A`, `W3-A`,
`P2-9`, `Dn`, `Dn+Dn`, `Wave 13`, `V23/V26 constraint` (where it meant the id, not
the migration). `HeroImageImportService` also had "the plan's acceptance rule"
rewritten as "the acceptance rule".

## 3. Behaviour-adjacent changes (forced by the new `SourceVocabularyTest` guard)

The guard lane's extended vocabulary guard (gate run 1, 04:16) now flags ids in
string literals and in comments, with the explicit instruction "replace each id
with the reason it stood for". My scope's three remaining hits:

- `MediaStorage.java` L70, L76 — removed `(crisis-guidance D7)` from the two
  `init()` exception messages. Verified no test asserts these strings. Message
  semantics otherwise unchanged (same text, same exception type, same trigger).
- `MediaImageInspector.java` L118 — `// skip the SOI (FF D8)` → `(0xFFD8)`; the
  guard's own javadoc mandates the byte stay a hex literal.

## 4. Deliberately left

- **Feature names** (`crisis-guidance`, `bilingual-guidance`, `admin-locale-scope`,
  `admin-guidance-search`, `guidance-index`): these name features, not planning
  rows; the guard does not forbid them and a reader can resolve them.
- **Bare `V23`/`V26`/`V28`**: Flyway version numbers, explicitly legal (the
  migration files exist in the tree).
- **No structural split of `GuidanceService` into several services.** Its
  seven-argument constructor is frozen by `GuidanceServiceTest` and the
  controllers (other lanes' files) call its public surface; private-helper
  extraction removes the god-class duplication without touching the pinned seam.
- **`MarkdownToHtml.java`** — see dead code below.

## 5. Dead code (reported, NOT deleted)

- `MarkdownToHtml.java` (230 lines) + `MarkdownToHtmlTest` (43 tests) +
  test-scoped driver `MarkdownMigrationDriver.java`: zero references from
  `src/main/java`. It is the one-shot engine of the 2026-07 content migration
  (raw-Markdown bodies in the DB were converted once; the converter's javadoc
  says so itself). Deletion means removing its driver + 43-test suite — owner
  decision, not this lane's to take.

## 6. Gate

Command: `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true`, run detached, exit file read afterwards.

- **Run 1 (04:14-04:16): exit 1.** 1356 tests, 2 failures:
  - `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` —
    stale ONLY on two `frontend/src/app/features/admin/admin-page.ts` anchors
    (:515, :603-618), moved by the FRONTEND lane's in-flight rewrite of that
    file (diagnostics in that file changed between every check of mine — live
    editing). My GuidanceService anchors all pass. Recorded in the notes board.
  - `SourceVocabularyTest` — the extended guard, ~515 hits tree-wide; 46 in the
    guidance package. My main-scope share: 3 (fixed, §3). The guidance
    test-file share (43 hits) was already cleaned in-tree by that tree's own
    lane between runs — my scope scans 0 hits now (verified against the guard's
    current pattern set).
- **Lane unit tier:** 190/190 green (all guidance-package tests incl. the 87
  `GuidanceServiceTest`, plus `DocumentationFactsTest`'s non-anchor tests).
- **Run 2 (relaunched after the §3 fixes): see exit code below.**

- **Run 2 (04:26-04:28, after the §3 fixes): exit 1.** 1356 tests, the SAME
  two failures, now confirmed out of my scope:
  - `DocumentationFactsTest` — stale anchors are ONLY `admin-page.ts:515` and
    `:603-618` (frontend lane's in-flight rewrite; my anchors all pass).
  - `SourceVocabularyTest` — down from ~515 to 21 unique hits tree-wide as the
    other lanes land their cleanups; **0 in the guidance package**.

Residual shared-gate red (all out of my scope, all in the notes board):
the two `admin-page.ts` doc anchors until the frontend edit lands, and the
~469 out-of-package `SourceVocabularyTest` hits belonging to their file
lanes.

## 7. Unverified / residual risk

- A full-green gate is currently impossible from my lane alone: it depends on
  the frontend lane's in-flight `admin-page.ts` rewrite and on the other lanes'
  vocabulary cleanups landing first. My scope is green in isolation (unit tier)
  and clean under the guard's pattern set.
- `SourceVocabularyTest`'s pattern set changed during the run (the guard lane
  is iterating); the final post-merge gate is authoritative.
- The two `MediaStorage` message edits are the only non-comment changes outside
  `GuidanceService`; flagged here so the owner can veto if message text was
  meant to stay frozen.
