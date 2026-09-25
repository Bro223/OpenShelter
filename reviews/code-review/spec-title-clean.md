# SPEC-TITLE-CLEAN — the remaining spec titles that cite unresolvable or archived names

Lane: `SPEC-TITLE-CLEAN` · branch `code-review` (HEAD `cdd5346` at start — FINAL-CLEANUPS committed) · 2026-09-25

Scope: the owner-authorised renames that FINAL-CLEANUPS §3 "Found and reported, not fixed"
filed for the parent — eleven spec titles citing names a reader cannot resolve, or
archived change names. **Spec title text only**: no bodies, no assertions, no other byte.
Method, per the FINAL-CLEANUPS lane's eight renames: drop the citation and let the title
say what the test verifies — verified per title against its body, not guessed from the
old name. No commits (the parent commits). No `@DisplayName` concept exists here
(Angular/Vitest — the title string IS the name); nothing beyond title text was touched.

---

## 1. The eleven renames (spec title text only)

### 1a. Unresolvable names (FINAL-CLEANUPS's "dead names" third instances)

| File:line | Before | After |
|---|---|---|
| `admin-page.spec.ts:2353` | `describe('translations (bilingual-guidance)')` | `describe('translations')` |
| `guidance-editor.spec.ts:1755` | `describe('translation authoring (bilingual-guidance)')` | `describe('translation authoring')` |
| `guidance-editor.spec.ts:1858` | `describe('translation editing (bilingual-guidance)')` | `describe('translation editing')` |
| `guidance-detail-page.spec.ts:724` | `describe('locale fallback (bilingual-guidance)')` | `describe('locale fallback')` |
| `i18n.spec.ts:142` | `describe('site-text overlay (site_texts)')` | `describe('site-text overlay')` |
| `i18n.spec.ts:242` | `describe('lazy catalog loading (bundle-lazy-i18n)')` | `describe('lazy catalog loading')` |

### 1b. Archived change names (resolvable — the guard's own exemption admits them; renamed per the owner's authorisation)

| File:line | Before | After | Archive dir |
|---|---|---|---|
| `i18n.spec.ts:23` | `describe('I18nService (i18n-et-en)')` | `describe('I18nService')` | `2026-09-16-i18n-et-en` |
| `page-shell.spec.ts:855` | `describe('language switcher (i18n-et-en)')` | `describe('language switcher')` | `2026-09-16-i18n-et-en` |
| `design-tokens.spec.ts:1709` | `it('the /submit private-home checkbox keeps its native glyph size (mobile-responsive-polish)')` | `it('the /submit private-home checkbox keeps its native glyph size')` | `2026-09-16-mobile-responsive-polish` |
| `shelter-detail-page.spec.ts:927` | `describe('trust layer (shelter-trust-and-reports)')` | `describe('trust layer')` | `2026-09-16-shelter-trust-and-reports` |
| `page-shell.spec.ts:982` | `describe('data provenance line (official-dataset-csv)')` | `describe('data provenance line')` | `2026-09-16-official-dataset-csv` |

All four archive dirs verified present (37 archived dirs listed; only live change is
`community-review-queue`, untouched). `git diff --stat` after: exactly 7 spec files,
11 title lines, 11 insertions / 11 deletions — no other byte.

**Read-correctness, per title** (each body read in full before renaming):

- `translations` (admin-page) — the block's section comment (`:2345`) states the area
  (the open post's per-locale rows under the editor); the UI section heading the tests
  assert is literally `Translations`; the six `it` titles are complete sentences naming
  the behaviour (loading/empty states, missing-locale offer, CREATE-vs-update, two-tap
  delete). The bare noun names the section, matching this file's own describe style
  (`editor reveal (…)`, `AdminPage paged list view state`).
- `translation authoring` / `translation editing` (guidance-editor) — the editor's
  third and fourth modes; the production code uses exactly these terms
  (`guidance-editor.ts:113` "Translation authoring … is a third shape", `:128-132`
  "Translation-edit mode"), so the names stay searchable. Bodies pin the prefill, the
  slug rule, and the create- vs update-translation payload in each mode.
- `locale fallback` (guidance-detail-page) — the block comment (`:718`) states the
  contract (served in the default locale with the flag; the link only when
  `alternates` carries the reader's locale); the model field is `localeFallback`.
- `site-text overlay` (i18n) — the block's comment (`:138`, retained) states the
  override semantics; the service API is `siteTexts()/setSiteTexts()`. Nuance, reported
  not hidden: FINAL-CLEANUPS filed `site_texts` as unresolvable (as a change name it
  is), but it **also** resolves as the live DB table (`V27__site_texts.sql:20
  CREATE TABLE site_texts`), referenced intentionally across the codebase and the
  generated OpenAPI contract. The rename is authorised and loses nothing — the
  adjacent comment keeps the table reference — but a future sweep should not treat
  the other `site_texts` occurrences as dead.
- `lazy catalog loading` (i18n) — the block pins `ensureCatalog`/`isCatalogLoaded`
  on-demand chunk loading (default eager, et/ru on demand + cached, the boot path,
  `onCatalogLoaded` once).
- `I18nService` (i18n top-level) — the service class under test; the block doc comment
  above the `describe` states the three areas (mechanism / seam / guard).
- `language switcher` (page-shell) — the `.shell-lang` group; the comment block
  (`:848-854`) states the contract (offers only the switchable locales, persists,
  flips `<html lang>` + chrome).
- `the /submit private-home checkbox keeps its native glyph size` (design-tokens) —
  already a complete declarative sentence; the comment below pins the regression
  (18×18 + `flex-shrink: 0` against the global `.field input { width: 100% }`).
- `trust layer` (shelter-detail-page) — the block comment (`:919-925`) names exactly
  what the block covers (header badges · shelter report · "report how full" picker).
- `data provenance line` (page-shell) — the footer line; the two `it` titles name the
  behaviour (resolves → publisher/last import/official link; loading/failed → hidden).

No title's subject was unclear from its body, so none was left or re-invented — every
rename is a pure drop of the citation.

## 2. The three `hero-geometry` parentheticals — inspected, decision: **leave all three**

FINAL-CLEANUPS flagged `hero-geometry.spec.ts:92/130/159` as ambiguous between a
component reference and a change name. Inspected directly (the whole file, plus the
archive and live-change cross-check):

| Line | Title | What the block does |
|---|---|---|
| `:92` | `detail hero (guidance-detail-page) — natural size` | reads `features/guidance/guidance-detail-page.scss` + `.html` as its first two statements and pins the `.guidance-detail__hero` contract |
| `:130` | `list card hero (guidance-list-page) — fixed 4/3 box, cover` | reads `features/guidance/guidance-list-page.scss` + `.html`, pins `.guidance-post__hero` |
| `:159` | `admin editor hero slots (guidance-editor) — fixed squares, cover` | reads `features/admin/guidance-editor.scss` + `.html`, pins `.guidance-editor__hero-thumb` + `.hero-picker__item` |

Decision: **leave all three as-is**, for three independently verified reasons:

1. **They are resolvable.** All three names are live component/file names in the tree
   (`guidance-detail-page.ts/.html/.scss`, `guidance-list-page.ts/.html/.scss`,
   `guidance-editor.ts/.html/.scss` all exist), and each block literally loads the
   named component's stylesheet and template — the parenthetical points at the very
   files the test reads. A reader resolves them on the next line.
2. **They are not change names.** The full 37-dir archive was listed and cross-checked:
   no archived or live change is named `guidance-detail-page`, `guidance-list-page`
   or `guidance-editor`. The ambiguity the reporting lane saw is real only until this
   cross-check is done; done, it resolves to component reference.
3. **Rewording would lose information.** The names are searchable exactly to the
   component (the clean-code standard: searchable, intention-revealing names), and the
   `— <contract>` tail already says what the block verifies. A reworded title would
   name the behaviour twice and drop the file pointer.

The reporting lane's tentative classification is therefore confirmed by inspection, not
inherited. If a future pattern-based sweep flags them (kebab-case in parentheses), the
answer to re-check is: component reference, verified resolvable — this report.

## 3. Residual census

Measured with explicit-path `rg` over `frontend/src src docs` (no pathless invocations).
**Spec-title hits: zero for all seven names** — verified by grepping every
`it(`/`describe(` title line in `frontend/src/**\/*.spec.ts` against all seven names
(0 matches).

| Name | Spec titles | Frontend residual | Backend residual | Docs residual | Nature of every residual hit |
|---|---|---|---|---|---|
| `bilingual-guidance` | **0** | 27 (8 in spec files, 19 in production files) | 9 | 2 | all comments (Javadoc/`//`/section headers; e.g. `models.ts`, `guidance-editor.ts`, `guidance-gateway.ts`, `V26__guidance_post_translations.sql:6`, `GuidanceService.java:915`) + note-board records |
| `site_texts` | **0** | 22 (2 spec comments) | 26 | 3 | **live DB-table name** (`V27__site_texts.sql:20`), intentional references in code, the admin UI copy, the generated contract (`docs/api/openapi.json:9625,9631` endpoint descriptions) + 1 record line |
| `bundle-lazy-i18n` | **0** | 17 (16 spec-comment lines `// bundle-lazy-i18n: …`, 1 at `index.html:98`) | 0 | 1 | all explanatory comments + 1 note-board record |
| `i18n-et-en` | **0** | **0** | **0** | 4 | records only (`docs/i18n-review.md:3`, `CODE-REVIEW-NOTES.md` ×3) |
| `mobile-responsive-polish` | **0** | **0** | **0** | **0** | fully gone from the tree |
| `shelter-trust-and-reports` | **0** | **0** | 2 | 10 | `application.yml:160` comment, `V9__shelter_trust_and_reports.sql:1` comment (applied migration — untouchable, rule 5), RUNLOG/LEDGER/notes records |
| `official-dataset-csv` | **0** | **0** | 2 | 0 | `application.yml:267` comment, `V15__data_imports.sql:1` comment (applied migration) |

Left-as-is, with reasons:

- **All comment-line residuals** (spec and production) — the authorisation covers spec
  titles only; bodies and comments are out of scope, and the SIMPLIFY-DOMAIN/SIMPLIFY-CORE-FE
  note-board lines already file the same class for their owning lanes.
- **`application.yml:160/:267`** — backend config comments, not spec titles; filed here
  for the parent to route to the owning lane if it wants them.
- **Migration SQL comments** (`V9`, `V15`) — applied migrations are forbidden to touch (rule 5).
- **`site_texts` everywhere** — a live table name, not a dead citation; only the one
  spec-title parenthetical was in scope, and the adjacent `i18n.spec.ts:138` comment
  keeps the reference.
- **`docs/` records** (RUNLOG, LEDGER, CODE-REVIEW-NOTES, findings, i18n-review) — records
  of what was done, left as-is by every prior sweep.

No doc, test-plan or other file cites any of the eleven titles verbatim (grep-verified
against the old title strings before editing), so nothing external needed moving.

## 4. GATE

Both runs detached (`nohup … ; echo $? > /tmp/…exit`), exit files read; no Maven
invocation occurred (frontend-only lane).

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0** (`/tmp/spec-title-clean-ngtest.exit`) — **Test Files 65 passed (65), Tests 1581 passed (1581)** — exactly the stated baseline (log `/tmp/spec-title-clean-ngtest.log`, 0 "failed" lines) |
| `cd frontend && npx ng build` | **exit 0** (`/tmp/spec-title-clean-ngbuild.exit`) — `Application bundle generation complete` (log `/tmp/spec-title-clean-ngbuild.log`) |

Test counts unchanged from baseline (1581 / 65) — expected: renames touch no test.
Line count is unchanged (11 in-place line replacements), so no anchor shift is owed to
any document (nothing I touched is cited by range; the anchors pin backend lines).

## 5. Unverified

- The three `hero-geometry` parentheticals: verified by reading all three blocks and
  cross-checking archive + live change, but not by reading every consumer of that spec
  (it has none — the file is a self-contained stylesheet/template audit importing no
  app component).
- One pi-lens advisory ("opengrep deferred — diagnostics incomplete") fired on
  `page-shell.spec.ts` after the edit; the change is a two-character-class string edit
  in a title and the in-gate `ng test` compile+run covers it; the deferred findings
  were not independently reviewed.
- No concurrent writer was active in the shared tree during the run (`git status`
  before and after shows exactly my seven files); if one appears, the parent's commit
  should stage by the file list below, not by directory.
- Backend gate not run — no backend file was touched; nothing here changes any Java
  line, anchor, or the OpenAPI snapshot.

**Files for the parent's commit (this lane, 7 + this report):**
`frontend/src/app/features/admin/admin-page.spec.ts` (1 title line),
`frontend/src/app/features/admin/guidance-editor.spec.ts` (2 title lines),
`frontend/src/app/features/guidance/guidance-detail-page.spec.ts` (1 title line),
`frontend/src/app/core/i18n/i18n.spec.ts` (3 title lines),
`frontend/src/app/shared/page-shell.spec.ts` (2 title lines),
`frontend/src/app/design-tokens.spec.ts` (1 title line),
`frontend/src/app/features/shelter/shelter-detail-page.spec.ts` (1 title line).
