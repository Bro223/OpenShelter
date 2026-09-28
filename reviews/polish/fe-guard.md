# FE-GUARD — lane report

**Branch:** `polish` (no commit — parent commits)
**Scope:** the owner-approved extension of the `SourceVocabularyTest`
never-filed-change-name check to `frontend/src`, via a purpose-built
frontend comment extractor; plus the six owner-ruled frozen-spec comment
rewordings. The id-shape check is untouched (it already walks
`frontend/src` line-wise); the archived-name check stays Java-only by
owner ruling. Every edit is comment/test-tree only — zero behaviour
change, no user-visible string, no translation value, no assertion
touched.

## 1. The extractor — design

**Files:** `src/test/java/ee/sheltermap/config/FrontendCommentExtractor.java`
(the machine) + `FrontendCommentExtractorTest.java` (the frozen shape
probes), both test-tree, package `ee.sheltermap.config`.

A correct frontend comment extractor has to handle three comment shapes
in three syntaxes, and it has to know what is *not* a comment:

| syntax | comments | non-comment hazards a naive port trips on |
|---|---|---|
| `.ts` | `//`, `/* */` (incl. `/** */`) | `//` or `/*` inside a string or **template literal** is text, not a comment (false-positive: a refused name in a URL string; and the scanner swallows the code after the fake comment start); a `${}` interpolation is **code again** — it nests strings, comments and further templates, with `{}` depth from object literals and blocks inside the expression |
| `.html` | `<!-- -->` only (plus JS/SCSS comments inside inline `<script>`/`<style>` bodies) | the Java machine is **blind** to `<!-- -->` (false-negative on the real HTML-comment citations); and `//` in an attribute value (`href="https://…"`) is text, not a comment (the Java machine's line-comment rule would false-positive it) |
| `.scss` | `//`, `/* */` (CSS-style) | `//` inside a string literal is text; a backtick in SCSS is an ordinary code character (SCSS has no template literals) |

Real-tree facts that fixed the design (all verified): `frontend/src/index.html`
carries **two inline pre-paint `<script>` blocks with real `//` and `/* */`
comments** — an HTML extractor that only saw `<!-- -->` would be blind to
them; 110 `.ts` files use template literals with `${}`; **no** regex literal
in the tree contains a comment-marker sequence; **no** HTML comment contains
a `<script>`/`<style>` start tag; no `<style>` tags exist (the support stays
in for the standard syntax); SCSS backticks occur only as inline-code marks
inside comments.

**Architecture** (mirrors the guard's Java machine, whose `findRefusedName`
/ `isWholeKebabToken` / `isPathToken` matching is reused unchanged, so the
matching semantics are identical in both trees):

- The machine walks one file and reports **comment ranges** `[start, end)`
  (delimiters excluded) instead of per-line text. For TS/SCSS it is a stack
  machine with four states — `CODE`, `INTERPOLATION` (with a brace depth so
  `${rows.map((r) => ({…r}))}` closes at the right `}`), `TEMPLATE`,
  `STRING(quote)` — where comments are consumed inline (a comment is opaque
  until its terminator, so it needs no state of its own). For HTML it
  composes: `<!-- -->` ranges in the markup (an unclosed one runs to EOF,
  like a browser), plus the TS/SCSS ranges of every inline `<script>` /
  `<style>` body offset to file coordinates (`<!--` inside an embedded body
  is script text, not an HTML comment).
- A shared splitter turns the sorted, disjoint ranges into **one entry per
  source line** (contract: content without a trailing line end → N entries
  for N lines; a block comment spanning lines contributes each line's
  slice), which is exactly the shape the guard's line-indexed hit rendering
  consumes.

**Why a separate class instead of a second `commentTextByLine` in the guard
file:** the machine is ~200 lines of lexical state mechanics; the guard test
stays policy (lists, floors, walks, failure messages) and the extractor gets
its own frozen shape probes (below). It is deliberately **not** a TS parser
— it tracks exactly the lexical state comment extraction needs, the same
stance as the guard's Java machine.

**Frozen shape probes** (`FrontendCommentExtractorTest`, 3 tests, +3 to the
gate count) — the red-proof the FRONT-NAMES report demanded, made permanent
so a regression of the extractor fails the gate:

- **TS:** name in a string → not comment text; name in a template literal →
  not comment text; name in the string of a `${}` interpolation → not, but
  a comment *inside* the interpolation → seen; name in a template nested
  inside an interpolation → not (the shape the FRONT-NAMES census machine
  would have gotten wrong); `<!--` in TS → not a comment; a plain regex
  literal → not a comment; `//` and `/* */` comments → seen, delimiters
  excluded.
- **HTML:** `<!-- -->` seen (incl. multi-line slicing); `//` in an attribute
  value → not a comment; the `<script>` body walked as TS (comment seen,
  string not); the `<style>` body walked as SCSS (string not, block comment
  seen).
- **SCSS:** `//` and `/* */` seen; `//` inside a string literal → not a
  comment; a URL string → not a comment.

The fixtures cite a synthetic name (`never-filed-change`), not a change
name — the guard's own list decides what is refused, and the real name's
behaviour is proven by the mutation proofs (§4).

### Limits — what the extractor cannot see

Each limit was checked against the tree; each failure mode is a **visible
refusal of a name in code** (a red gate a reader sees), never a silent
pass:

1. **TS regex literals are not disambiguated.** A regex body containing a
   `//` or `/*` sequence would be read as a comment. Verified: no such
   regex exists in the tree (no escaped-slash regex in any `.ts` file).
2. **HTML nesting:** an HTML comment containing a `<script>`/`<style>` start
   tag (or an attribute value with a `>` on such a tag) would be misread.
   Verified absent from the tree.
3. **An unterminated string literal** ends at its line end instead of
   swallowing the rest of the file (lenient, so one malformed literal
   cannot blind the walk).
4. **A name split across a line break never matches** — the same per-line
   semantics the Java scanner applies (a line-wrapped citation is
   consistently invisible to both machines, the FRONT-NAMES census's
   finding).

## 2. The checks extended

`SourceVocabularyTest.sourceCommentsContainNoNeverMadeChangeNames` now
walks, after its two Java trees:

- `frontend/src`, every `.ts` / `.html` / `.scss` file (same
  `SKIPPED_DIRECTORIES` as the id walk), comment text via
  `FrontendCommentExtractor`, whole-kebab-token matching with the path-token
  exemption — **reusing the guard's existing `findRefusedName`**, so a name
  in a string or template literal is exempt in the frontend exactly as a
  name in a Java string literal is exempt.
- **New floor `MIN_FRONTEND_NEVER_MADE_FILES = 180`** (measured **230** on a
  clean tree: 157 `.ts`, 36 `.html`, 37 `.scss` — the `dist/` skip swallows
  vendor's `quill.d.ts`). It is the same file set the id-shape walk floors
  at 180 under `frontend/src` (`ROOT_FLOORS`), so a re-rooted or pruned
  frontend tree cannot shrink the frontend half of this check to a silent
  pass. The floor discipline: `Only N frontend source files were scanned …
  (the floor is 180)`.

Deliberately **not** changed: `NEVER_MADE_CHANGE_NAMES` (still the one
entry, in the string literal on purpose — this file's own comments are
scanned), `MIN_NEVER_MADE_CHANGE_NAMES` (1), `MIN_ARCHIVED_CHANGE_NAMES`
(70), `ROOT_FLOORS`, `MIN_SCANNED_LINES`, the id-shape check (already walks
`frontend/src`), the archived-name check (stays Java-only; its javadoc now
records that the never-made check walks the frontend and that joining is a
separate owner decision). The class javadoc and the never-made check's
javadoc were updated to state the new scope.

## 3. The six frozen-spec rewordings (owner-ruled)

Comment-only, line-count preserving (each 1 line → 1 line), naming the
concept the sweep vocabulary already uses. No assertion depends on the
text (FRONT-NAMES §4.1 byte-pin verification stands: the only pins that
read file content parse `models.ts` field names — comments skipped — and
scan `*-gateway.ts` path literals — comments stripped).

| file:line | before | after |
|---|---|---|
| `admin-page.spec.ts:321` | `// The translations (bilingual-guidance): the post's per-locale rows —` | `// The translations: the post's per-locale rows —` |
| `admin-page.spec.ts:400` | `// The translations section (bilingual-guidance): open in the ordinary` | `// The translations section: open in the ordinary` |
| `admin-page.spec.ts:2345` | `// ---- translations (bilingual-guidance) ------…` | `// ---- translations (per-locale rows) ------…` (dash run length-compensated, line length 77 preserved) |
| `guidance-editor.spec.ts:131` | `/** The translation-authoring locale (bilingual-guidance); null = the` | `/** The translation-authoring locale (per-locale rows); null = the` |
| `guidance-editor.spec.ts:1748` | `// ---- translation authoring (bilingual-guidance) -----…` | `// ---- translation authoring (per-locale rows) -----…` (line length 81 preserved) |
| `guidance-editor.spec.ts:1839` | `// ---- translation editing (bilingual-guidance) -----…` | `// ---- translation editing (per-locale rows) -----…` (line length 80 preserved) |

**Diff proof:** `git diff --numstat` on the two spec files = `3 3` each —
exactly six comment lines changed in total, nothing else (full diff in the
commit record; the hunk contexts show assertion bodies untouched).
Line counts: 4093 and 2032, unchanged. Residual `bilingual-guidance` in
`frontend/src`: **0**.

**Before/after sha256:**

| file | before | after |
|---|---|---|
| `frontend/src/app/features/admin/admin-page.spec.ts` | `e1dc73672f1c8c227612b371943b59fe4ad419b8973d848f03f209e9eb284fec` | `d9b27bfc4eeaeca77353dec69ece33951599e79c5df24e058da407957f285bf1` |
| `frontend/src/app/features/admin/guidance-editor.spec.ts` | `59a4e7fe57a7b36563a811839707430390ca3a8442754dc89bc7c8b87af05f1a` | `9a10948cd85425d92f01eec0a198f97ec55ad66c84ba5edd8e7c8a41ba028e8b` |

## 4. The mutation proofs — five, both directions

All runs detached: `flock /tmp/openshelter-mvn.lock mvn -B -ntp test
-Dtest=… -Ddependency-check.skip=true`, logs `/tmp/fe-guard-r*.log`, exit
files alongside. Fixtures lived in `frontend/src/app/fe-guard-fixtures/`
(deleted after; the directory no longer exists).

| # | Mutation | Must | Result |
|---|---|---|---|
| P1 — **red, planted frontend comments** | `reject.ts` (`// reject fixture (bilingual-guidance)` + the name in a string literal), `reject.html` (`<!-- reject fixture (bilingual-guidance) -->` + the name in an attribute URL), `reject.scss` (`//` comment + the name in a string) | FAIL, citing exactly the three comment lines | **FAIL** — `3 source comment(s) cite a change name that was never filed (1 name(s) listed in NEVER_MADE_CHANGE_NAMES)`: `reject.ts:1`, `reject.html:1`, `reject.scss:1` — one per shape. The string-literal/attribute lines in all three files were **not** cited: the literal exemption holds in all three syntaxes. The other two guard tests green in the same run. Log `/tmp/fe-guard-r1.log`. |
| P2 — **green, real tree** | the tree after the six rewordings, no fixtures | PASS | **PASS** (guard 3/3). Log `/tmp/fe-guard-r3.log`. |
| P3 — **green, fixture citing a live change name** | `accept.ts`/`accept.html`/`accept.scss`: comments citing the live `community-review-queue`, an archive path token `openspec/changes/archive/2026-09-23-crisis-guidance` (path-token exemption), and an ordinary compound (`fail-closed`); the never-made name present only in a string, a template literal, a `${}` interpolation string and a URL string/attribute | PASS | **PASS — 6/6** (guard 3/3 + extractor 3/3), so the live name, the path token and the compound are legal and the dead name in literal positions is not refused. Log `/tmp/fe-guard-r2.log`. |
| P4 — **red, floor emptied** | `NEVER_MADE_CHANGE_NAMES = List.of()` | FAIL on the empty list | **FAIL** — `Only 0 never-made change name(s) are listed (the floor is 1) — the list is empty, and this guard would pass silently.` Restored. Log `/tmp/fe-guard-r4.log`. |
| P5 — **red, staleness** | `mkdir openspec/changes/bilingual-guidance` (fake live directory) | FAIL on the now-resolvable entry | **FAIL** — `Never-made list entry(ies) that now resolve: [bilingual-guidance] — a same-named change is live or archived … remove the stale entry from NEVER_MADE_CHANGE_NAMES.` `rmdir` verified: `openspec/changes/` back to `archive` + `community-review-queue`. Log `/tmp/fe-guard-r5.log`. |

Post-restoration sanity: both test classes re-run green on the restored
tree (the P2 run).

## 5. Test counts

- **Backend:** 1363 baseline → **1368** in the full gate = **+3 mine** (the
  three `FrontendCommentExtractorTest` shape probes — ran 3/3 in-gate) and
  **+2 from a sibling lane's** uncommitted `PiiCryptoFramingTest.java`
  additions (6 → 8 `@Test`, in the tree at gate time, not mine). The guard
  class keeps its three tests (the never-made check is one test now walking
  three trees); nothing deleted or weakened.
- **Frontend:** 1583 baseline → **1582/1583** in the full gate — the single
  failure is not mine, see §6.

## 6. Gates (detached, exit files)

- **Backend:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` → exit **0** — `Tests run: 1368,
  Failures: 0, Errors: 0, Skipped: 0` (count decomposition in §5), BUILD
  SUCCESS (PMD scope excludes test sources; JaCoCo floor met — no
  main-source change). Log: `/tmp/fe-guard-gate-be.log`, exit
  `/tmp/fe-guard-gate-be.exit`.
- **Frontend:** `cd frontend && npx ng test --watch=false` → exit **1** —
  **1582/1583**, 64/65 files. The single failure is
  `architecture.spec.ts > admin-page.ts stays at or under its measured line
  ceiling`: `admin-page.ts is 903 lines — the ceiling is 901`. **Attribution
  (verified, not mine):** the working tree carries a pre-existing
  owner prettier pass (mtime 18:49, present before this session started) that
  re-wraps the `patchUser` one-liner at `admin-page.ts:774-776` across three
  lines — HEAD's committed file is exactly 901 (the zero-slack ceiling
  SPLIT-ADMIN-PAGE set), the working copy is 903. My diff touches no line of
  `admin-page.ts` (numstat: `admin-page.spec.ts` 3/3,
  `guidance-editor.spec.ts` 3/3 — both spec files pass in the run). The
  UX-IMPLEMENT lane independently recorded the identical finding in
  `docs/autopilot/CODE-REVIEW-NOTES.md`: the committed 901-line version is
  prettier-DIRTY at printWidth 100, so reverting is not the fix — the commit
  carrying the re-wrap must raise `ADMIN_PAGE_MAX_LINES` 901 → 903 (the guard
  message's own remedy); owner/parent call. I left `architecture.spec.ts`
  alone (not my file). Log: `/tmp/fe-guard-gate-fe.log`.
- **Frontend build (run rule 2):** `npx ng build` → exit **0** (SCSS budget
  warnings only — several from sibling lanes' in-flight `.scss` work). Log:
  `/tmp/fe-guard-gate-build.log`.

**Note on the shared tree:** the gates ran while sibling polish lanes had
uncommitted work in the tree (`admin-page.ts` prettier re-wrap,
`map-page.html/.scss`, `shelter-detail-page.html/.scss`,
`PiiCryptoFramingTest.java`, `reviews/polish/ux-implement.md`). None of those files is mine; the backend
gate and `ng build` passed over the combined tree state, and the frontend
test run's single failure is attributable to that in-flight work as
recorded above and in the notes file.

## 7. Unverified / handed over

- **The frontend gate is red for a reason that is not this lane's diff** —
  the `admin-page.ts` ceiling pin (903 vs 901) on the owner's pre-existing
  prettier re-wrap; the `ADMIN_PAGE_MAX_LINES` 901 → 903 raise in
  `architecture.spec.ts` is the owner/parent call recorded by UX-IMPLEMENT
  and re-confirmed by me in the notes file. With that one line raised (or
  the re-wrap committed with it), the FE gate is 1583/1583 green — every
  other test, including both of my reworded spec files, passes as run.
- **The staleness proof (P5) exercised the live-directory branch**; the
  archived branch is the same union code (`archivedDirectoryNames`) and was
  not proven separately — same standing note as the LAST-NAMES lane.
- **The mutation-proof runs were single-test**
  (`-Dtest=SourceVocabularyTest[,FrontendCommentExtractorTest]`); the full
  gates ran afterwards on the restored tree.
- **The id-shape walk's frontend measurement comment is stale** — it says
  "measured … 224" and the walk now counts 230 files under `frontend/src`
  (later lanes added files); the floor (180) still holds with the same
  margin. I left the comment alone (different check, not free for my
  lane) — worth a one-word fix when someone next touches that constant.
- **The never-made list is, by definition, maintained** — a *future*
  never-filed name is invisible until someone reports it and adds the
  entry; the floor + staleness check keep the list honest (standing note
  from LAST-NAMES §7, now covering both trees).
- **The archived-name check still does not walk the frontend** — the
  owner's ruling extended the never-made check only. The mechanism to join
  it now exists (`FrontendCommentExtractor` + `walkFrontendTreeForRefusedNames`
  are name-agnostic); the FRONT-NAMES census measured 0 archived-name hits
  in frontend comments, so joining would be zero-cost today. Handed to the
  owner.
- The extractor's documented limits (§1) are verified-absent-today, not
  parser-complete: a future regex literal carrying a comment-marker
  sequence, or an HTML comment nesting a script tag, would surface as a
  visible false refusal — the run's settled fix (reword the comment, one
  line) or a one-clause extractor extension.

**Files for your commit:** `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java`,
`src/test/java/ee/sheltermap/config/FrontendCommentExtractor.java`,
`src/test/java/ee/sheltermap/config/FrontendCommentExtractorTest.java`,
`frontend/src/app/features/admin/admin-page.spec.ts`,
`frontend/src/app/features/admin/guidance-editor.spec.ts`,
plus this report and this board's FE-GUARD lines.
