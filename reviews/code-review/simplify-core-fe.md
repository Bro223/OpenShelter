# SIMPLIFY-CORE-FE — `frontend/src/app/core/**` (except `core/models.ts`) + `session/auth-store.ts`

Branch `code-review`, lane of the code-review run (rules: `docs/autopilot/CODE-REVIEW-RUN.md`).
Skills applied: `clean-code`, `code-review` (smell baseline), `web-design-guidelines`
(fresh fetch of the Vercel guidelines from the URL in `docs/skills/web-design-guidelines.md`).

## 1. Scope

`frontend/src/app/core/**` minus `core/models.ts` (off-limits — findings filed, see §7),
plus `frontend/src/app/session/auth-store.ts` (named "the auth store" in the brief; it lives
outside `core/` by the documented `features → gateways → core` layering rule and is the only
auth-store in the tree). In scope: i18n service + catalog machinery (service, scanner, guard
specs, locale data module, translate pipe, the `Messages` contract, the site-texts allowlist),
theme store + tokens, api client/interceptor/error, guards, token store, consent store,
title guard, prepaint, and every spec in the directory. The catalog **data** files
(`en.ts`/`et.ts`/`ru.ts`) are translation data owned by the FE-I18N-CATALOGS lane per the
inventory — not edited; the one planning-id cleanup they need is filed in the notes board.

## 2. What changed — flattened / renamed / deleted (before → after, lines)

| File | Before | After | Δ | Change class |
|---|---|---|---|---|
| `core/i18n/i18n.service.ts` | 351 | 310 | −41 | code + comments |
| `core/i18n/locale.ts` | 26 | 24 | −2 | comments |
| `core/i18n/translate-pipe.ts` | 29 | 29 | 0 | comments |
| `core/i18n/i18n-template-guard-scanner.ts` | 253 | 253 | 0 | header comment |
| `core/i18n/i18n-template-guard.spec.ts` | 293 | 293 | 0 | header comments only |
| `core/i18n/catalog-identity.spec.ts` | 120 | 120 | 0 | header comments only |
| `core/i18n/messages.ts` | 1530 | 1530 | 0 | 13 comment lines |
| `core/theme-store.ts` | 112 | 108 | −4 | code + comments |
| `core/theme-tokens.ts` | 198 | 168 | −30 | header comments + 1 export |
| `core/api-client.ts` | 65 | 65 | 0 | comments |
| `core/api-interceptor.ts` | 105 | 105 | 0 | comments |
| `core/api-error.ts` | 172 | 172 | 0 | comments |
| `core/guards.ts` | 107 | 106 | −1 | comments |
| `core/title.ts` | 54 | 54 | 0 | comments |
| `core/token-store.ts` | 57 | 57 | 0 | comments |
| `core/title.spec.ts` | 115 | 115 | 0 | 3 comments + 1 it() title (non-pinned spec; assertions byte-identical) |
| `session/auth-store.ts` | 373 | 372 | −1 | comments |
| **total (16 changed files)** | **3845** | **3766** | **−79** | |

Unchanged on purpose: `site-texts.ts`, `consent-store.ts`, `prepaint.ts` (already plain, no
planning ids), the five pinned specs (§3), the four non-pinned specs with no ids
(`api-client.spec.ts`, `api-error.spec.ts`, `consent-store.spec.ts`, `guards.spec.ts`,
`token-store.spec.ts`), and all catalog data files.

**Code changes (all behaviour-preserving):**

1. `i18n.service.ts` — deleted the `EAGER_CATALOGS` map (3 lines): it duplicated
   `resolvedCatalogs`' eager `en: EN` entry. `ensureCatalog` now checks `resolvedCatalogs`
   first, which is the same value for `en` and `undefined` for the rest — identical
   outcomes for every locale (verified against the lazy-loading spec, §3).
2. `i18n.service.ts` — merged the two structurally identical localStorage readers
   (`storedLocale()` + `storedContentLocale(fallback)`) into one
   `storedLocale(key, fallback)`; both were module-private. One function instead of two
   copies of the same try/catch + `LOCALES.includes` shape.
3. `theme-store.ts` — flattened `applyTheme`: the old version used an early-return
   default branch + a nested if/else for the attribute *and* the tokens; it is now two
   independent two-way decisions (attribute on/off, tokens on/off) with no early return.
   Same three (theme → DOM) outcomes, verified against theme-store.spec.ts.
4. `theme-tokens.ts` — `ThemeStyleRoot` un-exported: it is used only by the two applier
   functions' signatures in the same file; a repo-wide grep found zero importers. The type
   itself stays (it is still the appliers' parameter type).

**Comments:** every planning id removed from the files above — `i18n-et-en`,
`bundle-lazy-i18n`, `admin-locale-split`, `admin-moderation`, `accessibility-dialog`,
`legal-i18n`, `submitter-verification-badge`, `01-TASK.md §4/§8`, `03-CONTEXT(-CORE-AUTH)`,
`N7 i18n-completeness / F3`, `W13`-class refs, "this wave", "widened 2026-09-21", "later
slices", the whitepaper quote. What stayed: resolvable references (the backend twin
`ee.sheltermap.sitetexts.SiteTextKeys`, `design-tokens.spec.ts`, the frontend README,
`site-texts.ts`, the `site_texts` table name) and the actual constraints (persistence-key
semantics, the zoneless tick re-render seam, the no-infinite-refresh invariant, the
private-mode degradation, the one-voice-yellow error rule, the card-by-border rule).

**The one deliberate data-structure simplification in `theme-tokens.ts`:** the 40-line
per-token contrast-ratio table in the header comment was deleted — the numbers it cited are
re-audited mechanically by `design-tokens.spec.ts` (same contrast math, name-set rule,
chrome-band pairs), so the comment duplicated the spec. The non-derivable constraints it
carried (cards distinguished by border, `--color-bg-surface` doubling as text-on-primary,
chrome band follows the theme, map not themed, one-voice yellow, underlined links) were
kept as a short "constraints the map must keep" list. The token map itself — all 46
entries, values and inline comments — is byte-identical (`design-tokens.spec.ts`'s quoted-key
regex + name-set test is the pin, and it passed).

## 3. Pinned mechanisms — evidence they still hold

All five pinned specs were **not edited** (`git diff --name-only` over them = 0 files) and
pass in the post-change gate:

| Pinned mechanism | Spec (untouched) | Post-change result |
|---|---|---|
| Lazy catalog loading (eager `en`, on-demand `et`/`ru`, cached promise, boot-path load, `t()` default-locale fallback, `onCatalogLoaded` once-only) | `core/i18n/i18n.spec.ts` — "lazy catalog loading" + "t()" describes | 1562/1562 pass |
| Site-texts overlay + declared key allowlist (override-first lookup, blank = absent, `url()` fallback chain, `setSiteTexts(null)` clear) | `core/i18n/i18n.spec.ts` — "site-text overlay" describe; allowlist itself is `site-texts.ts` (unedited) + the untouched template/catalog guards | 1562/1562 pass |
| Three accessibility-theme homes in lockstep (index.html inline script vs `core/prepaint.ts` vs `theme-tokens.ts` map, all 10 storage states, every token compared by name) | `core/prepaint.spec.ts` (page-vs-module lockstep matrix) + `core/theme-store.spec.ts` (store half + the index.html script assertions) | 1562/1562 pass |
| Api interceptor 401-refresh-and-retry (single refresh, retry with new token, refresh-failure redirect, post-refresh 401 no-loop redirect, business-401 passthrough, no-Bearer endpoints) | `core/api-interceptor.spec.ts` | 1562/1562 pass |
| Auth store session handling (boot silent refresh, single-flight refresh, cross-tab rotation retry, epoch identity generation, profile non-fatality, logout) | `session/auth-store.spec.ts` | 1562/1562 pass |

The two guard specs I *did* touch (`i18n-template-guard.spec.ts`, `catalog-identity.spec.ts`)
carry comment-only diffs (verified by `git diff` — no test line changed); both pass.
The guards themselves (the scanner state machine, the allow-list staleness test, the
template-set completeness pin) are untouched.

## 4. Signature changes

**None made.** No export name or public signature changed anywhere in scope; every importer
(feature/gateway directories) keeps working untouched — proven by the full
1562/1562 suite + green build on the changed tree. The only export-surface change is the
deletion of the *dead* `ThemeStyleRoot` export (§2.4, zero importers repo-wide) and the
private-only `storedLocale` merge — neither is visible to any importer. Consequently
**no notes-file signature request was needed** (the rule-2 escalation path was not
triggered). `HttpMethod` also has no external importers, but it names the `request()`
method's parameter and documents the allowed verbs — kept exported.

## 5. web-design-guidelines audit (fresh fetch)

Scope is services/stores — no templates or DOM in these files — so most rule groups
(aria, focus, forms, images, touch) have nothing to audit here. Applied rules and results:

- **Dark Mode & Theming** — `color-scheme: dark` is never set anywhere in the frontend
  tree (0 grep hits in `src/`) while the black-and-yellow theme renders a `#000000`
  background (and high-contrast is dark-navy): native scrollbars/form controls keep a
  light appearance under both. **Finding filed** in the notes board for the
  styles/theme lane (`styles.scss` + `index.html` are not in my write scope; no change made).
- **Locale & i18n** — "use `Intl.DateTimeFormat`, not hardcoded formats" is deliberately
  **not** satisfied by `locale.ts`'s `MONTH_ABBREVS`: the verification-stamp date
  (`shelter.recency.date`) is hand-formatted with locale-data month names, UTC-based, to
  stay deterministic across Node ICU versions and user time zones (stated in the comment,
  pinned by `shared/shelter-copy.spec.ts`). Recorded as an intentional, documented
  deviation rather than a violation. Language is detected from the stored
  user-preference (never IP) — compliant.
- **Content & Copy** — the copy itself lives in the catalog data files (FE-I18N-CATALOGS
  lane), not in this scope; the machinery guarantees translated copy, never raw keys
  (pinned by the lazy-loading spec).

No other guideline rule has an in-scope surface.

## 6. Anchor shifts recorded for the docs lane (run rule 6)

`theme-tokens.ts` header rewrite moves every cited line by exactly **−30**; the token map
itself is byte-identical, so the re-derivation is mechanical:

| Doc citation (`00-CURRENT-STATE.md`) | Old | New |
|---|---|---|
| L30 `theme-tokens.ts:82` (BLACK_AND_YELLOW_TOKENS) | 82 | **52** |
| L78 `theme-tokens.ts:127,128-129,133,169,170-171,172` | 127,128-129,133,169,170-171,172 | **97,98-99,103,139,140-141,142** |
| L80 `theme-tokens.ts:170-171` (unverified yellow) | 170-171 | **140-141** |
| L84 `theme-tokens.ts:128-129,133` (--color-new/--color-verified) | 128-129,133 | **98-99,103** |

Recorded in the notes board. No other file I touched is cited by the current-state
document (the `en.ts`/`et.ts`/`ru.ts` citations are untouched — I did not edit those
files).

## 7. Findings filed, not fixed (run rule 4)

All in `docs/autopilot/CODE-REVIEW-NOTES.md` under `SIMPLIFY-CORE-FE`:

- **FE-I18N-CATALOGS** — planning ids in the catalog data-file comments:
  `en.ts:4,176,321,981`, `et.ts:4-5,323`, `ru.ts:4,341` (`i18n-et-en`,
  `submitter-verification-badge`, `legal-i18n`, whitepaper mention).
- **FE-MODELS** — `core/models.ts:350,358,387,541` carry feature-slug ids
  (`admin-moderation`, `submitter-verification-badge`). Off-limits per my brief; filed only.
- **PARENT / styles lane** — the `color-scheme: dark` finding (§5).
- **PARENT** — the five pinned specs still carry planning ids in comments/titles
  (e.g. `bundle-lazy-i18n`, `W13`); none matches a `SourceVocabularyTest` pattern
  (verified 0 hits in my whole scope), so the id guard stays green — but a final id sweep
  needs explicit authorisation for them, as it did for `admin-page.spec.ts`.

## 8. Gate results

| Gate | Baseline (pre-edit, committed tree) | Final (my diff in tree) |
|---|---|---|
| `cd frontend && npx ng test --watch=false` | exit 0 — 1562/1562, 65 files | **exit 0 — 1562/1562, 65 files** (none deleted or weakened) |
| `cd frontend && npx ng build` | (not run pre-edit; tree committed green per earlier lanes) | **exit 0** |

Both run detached with exit files (`/tmp/scf-test-final.exit`, `/tmp/scf-build-final.exit`).
No Maven gate in this lane (frontend scope; no backend files touched by me).

## 9. Unverified / foreign

- **Foreign in-flight work in the shared worktree:** `git status` shows
  `src/test/java/ee/sheltermap/retention/{RetentionPruningIT,RetentionServiceTest}.java`
  and `src/test/java/ee/sheltermap/verification/FileVerificationSendLogTest.java` modified —
  not my files, not touched by me (another lane's uncommitted work).
- **`DocumentationFactsTest` (backend Maven gate, not mine)** will report the four
  `theme-tokens.ts` anchor clauses as stale until the docs lane re-derives them (§6) —
  expected, recorded, foreign to my change's correctness.
- The backend `SourceVocabularyTest` id guard was not run by me (Maven gate); my files
  were swept against its full pattern set and match none.
- `title.spec.ts` it() title rename: assertions byte-identical, test count unchanged
  (1562 both sides) — the only spec-text delta in this lane, made in a NON-pinned spec.
