# NEXT-SPLIT-GUIDANCE — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** `src/main/java/ee/sheltermap/guidance/GuidanceService.java` (1084 lines) + the classes
extracted from it + the tests pinning them. Everything else filed to the notes board.

The earlier lane (`simplify-guidance`) collapsed the duplicated validation prologues and reported
that **the media/hero service, the translation CRUD, and the publish flow remain inside this
class — the obvious seams**. All three were judged real and extracted, following the shapes the
package already uses (`GuidanceOrderingService`: a plain component, not a Spring bean, constructed
inside the service's constructor — the frozen-constructor precedent; `GuidanceValidation` /
`GuidanceSearch`: static utilities; the established delegate idiom "the implementation lives in
X; this bean method keeps the `@Transactional` boundary and the public surface").

## Seams judged REAL and extracted

| Seam | New home | What moved |
|---|---|---|
| Save-time hero decision | `HeroSaveResolver` (new, 197 L, component) | `resolveHeroOnSave` + `HeroResolution`, `isHeroImportedFrom`, `requireHeroPairing`, `homeAltAfterHeroChange`, `normalizeImportUrl`, `MAX_HERO_IMPORT_URL_LENGTH` (2048). Moved **verbatim** — including the anchored phrase "A failed import NEVER blocks the save" and both doc-quoted tokens. |
| Translation rows | `GuidanceTranslationService` (new, 154 L, component) | `createTranslation`, `updateTranslation`, `deleteTranslation`, `listTranslations`, `attachExistingPostAsTranslation`, `saveOwnTranslation`. Bodies verbatim; the post's 404 (`requirePost`) and the attach same-id 400 stay in the service delegates, in their original order (same-id 400 → target 404 → source 404 → 409). |
| Lifecycle | `GuidanceLifecycleService` (new, 132 L, component) | `publish`, `unpublish`, `delete`, `auditLabel`, the audit rows (written in their original position — after the publish save, before the delete) and the confirm-gated 400. Bodies verbatim, including the no-op-writes-no-row idiom. |
| Write-time content rules (micro-seam) | `GuidanceValidation` (142 → 188 L) | `requireTitle`, `sanitize`, `cleanedContent`, the `CleanedContent` record and the `MAX_TITLE_LENGTH` value (255). The service's `MAX_TITLE_LENGTH` / `MAX_HERO_IMPORT_URL_LENGTH` become value delegates, exactly like the existing `MAX_LOCALE_LENGTH` / `searchableBody` / `matchesSearch` delegates — the frozen test seam (`GuidanceServiceTest:206`) keeps working. |

**What stays in `GuidanceService` (822 L, was 1084):** the 7-arg constructor (byte-identical
signature, same `requireNonNull` order), the `SavedPost` record, every read (incl. the locale-scoped
reads `translationsInLocale` / `translationsByPost` / `translationInLocale` / `listForAdmin(locale)`),
the post-level writes `create` / `update` / `updateInLocale` (call sites only re-pointed; statement
order untouched), `requirePost`, the two reorder delegates, the three lifecycle delegates, the five
translation delegates, and the class javadoc (opening, hero-import and audit paragraphs re-pointed
at the new collaborators).

## Seams judged and REJECTED

- **Moving the locale-scoped read helpers** (`translationsInLocale`, `translationsByPost`,
  `translationInLocale`, the scoped `listForAdmin`) into the translation component: they are reads
  serving the post-level surface (the admin list/detail), they hold the `@Transactional(readOnly =
  true)` boundary themselves, and the frozen suite constructs them through the service. No write
  seam, no duplication — extraction would only buy a rename.
- **Moving `requirePost` into a collaborator:** it is the post's 404 vocabulary, shared by the
  reads, the writes and the delegates; duplicating it into the components would fork the 404
  message. It stays single-sourced in the service (the lifecycle component carries its own
  private copy over the same `POST_NOT_FOUND_MESSAGE` constant — same message, one literal).
- **Routing `updateInLocale`'s inline translation-row write through the translation component:**
  the inline `translation.update(...)` there writes the edit-locale row inside the post-save flow
  (slug resolution against the edit locale, row resolved fail-first before any write). Wrapping it
  in a component method would add an indirection with no behaviour or size win — the row-write
  vocabulary it needs (`translation.update`, `translations.save`) is already the component's.
- **Splitting the reads further (public vs admin):** different queries, same two repositories, no
  shared invariants beyond the repository contract — not a seam.

## Behaviour preservation

- No public signature changed. Controllers in other packages call the same methods with the same
  parameters; the frozen 7-arg constructor is byte-identical (`GuidanceServiceTest:83` constructs
  it unmodified).
- Validation order is behaviour and is preserved verbatim per method (create: title → body → alt →
  locale → import-url → pairing → slug → hero import; update: 404 → title → body → alt → locale →
  import-url → pairing → slug → hero import; attach: same-id 400 → target 404 → source 404 → 409;
  delete: 404 → confirm 400 → audit row → translation rows → post row).
- Exception messages byte-identical (the frozen suite asserts on them).
- Transactions: the components are NOT Spring beans — they run inside the service's `@Transactional`
  methods, exactly as `GuidanceOrderingService` does; the audit row joins the same transaction as
  the action, a rolled-back action leaves no row, a no-op writes no row.
- No migration changes, no guard changes, no frontend changes.

## Line counts (before → after)

| File | Before | After |
|---|---|---|
| `GuidanceService.java` | 1084 | 822 |
| `HeroSaveResolver.java` | — | 197 |
| `GuidanceTranslationService.java` | — | 154 |
| `GuidanceLifecycleService.java` | — | 132 |
| `GuidanceValidation.java` | 142 | 188 |

## Evidence the suite passed unmodified

- `GuidanceServiceTest` (87 tests, the frozen constructor suite) — **unmodified**, green.
- Focused guidance-scope run (flock, `mvn -B -ntp test -Dtest='Guidance*'`): **176/176 green**
  (`GuidanceServiceTest`, `GuidanceValidationTest`, `GuidanceSearchTest`, the ordering unit tests,
  and every `Guidance*` IT end-to-end through the new delegates), 2026-09-28 04:11.
- Full gate (flock, detached, exit file): **exit 1 — Tests run: 1362, Failures: 1, Errors: 0**
  (log `/tmp/nextsplit-gate.log`). The single failure is
  `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode`, failing on exactly the
  five recorded hero-zone citations ("the file has 822 lines; the anchor outlived the code it
  points at") — the rule-6 consequence, not a code defect. Every other test green.
- Full scope minus `DocumentationFactsTest` (flock, detached, exit file): **exit 0 —
  1341/1341 (= 1362 − 21), PMD clean, JaCoCo 0.93 floor met, BUILD SUCCESS**
  (`/tmp/nextsplit-gate2.log`) — the static-analysis and coverage gates pass on the new code.

## Recorded anchor shifts (rule 6 — for the anchor pass)

The hero-zone code moved to `HeroSaveResolver.java`; all five `00-CURRENT-STATE.md` §5 citations
shift (clause text stays true — only file:line pairs move):

| Old (doc L259–278) | New (verified in-tree) |
|---|---|
| `GuidanceService.java:802-827` — the `resolveHeroOnSave` decision | `HeroSaveResolver.java:131-156` (javadoc → signature; token at 155) |
| `GuidanceService.java:831-835` — the no-re-fetch branch, the `isHeroImportedFrom` guard | `HeroSaveResolver.java:160-164` |
| `GuidanceService.java:839-850` — the catch with "A failed import NEVER blocks the save" | `HeroSaveResolver.java:168-180` (phrase at 170) |
| `GuidanceService.java:845-849` — the fallback assignment | `HeroSaveResolver.java:174-177` |
| `GuidanceService.java:853-860` — `isHeroImportedFrom` | `HeroSaveResolver.java:182-189` (signature at 189) |

## Filed rather than made

- `HeroImportRefusedException.java:10` + `HeroImportUnreachableException.java:11`: the javadocs
  still say "GuidanceService.resolveHeroOnSave catches it" — the catch now lives in
  `HeroSaveResolver.resolveHeroOnSave` (`HeroSaveResolver.java:168-179`). One-line javadoc
  re-point each; out of this lane's file scope (filed on the notes board).
- No signature change was filed: the public surface is intact by construction (delegates).

## Gate

- Baseline (pre-change, flock, detached): **exit 0 — 1359/1359** (2026-09-28, log
  `/tmp/nextsplit-baseline.log`).
- Post-change full gate: `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` → **exit 1** (1362 tests, the single failure is the five
  recorded doc citations — see Evidence above).
- Full scope minus `DocumentationFactsTest` → **exit 0** (1341/1341, PMD + JaCoCo clean).
- Test count: **1359 → 1362** (+3 new content pins in `GuidanceValidationTest`; nothing deleted
  or weakened).

## Unverified / residual

- The five doc citations are recorded but not re-derived (rule 6 — the anchor pass owns the doc);
  until it runs, `DocumentationFactsTest` §17 is red on exactly those five citations.
- The two exception javadoc re-points are filed, not done.
