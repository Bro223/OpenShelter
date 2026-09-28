# WRAP-CLOSER — the wrap evasion in the never-made-name guard, closed

**Branch:** worked `polish-work` — see the branch note at the end (the task brief said
`feature/frontend`; the parent had checked it out at session start, but the lane's working
base only exists on `polish-work`). No commit — the parent commits.

**Skills:** `docs/skills/clean-code.md`, `docs/skills/code-review.md`.

---

## 1. The evasion's exact shape, per comment syntax

The never-made check (and the archived-name check) match each refused name per line: the
Java state machine and the `FrontendCommentExtractor` both emit **one comment-text entry per
source line**, and `findRefusedName` needs the name to appear as a contiguous whole-kebab
token **within one entry**. A name broken across a line boundary therefore appears as two
fragments on two lines and is invisible to `indexOf` — that is the whole evasion; no parser
bug, just a line-granularity boundary the name crosses.

Which syntaxes can carry the break (verified against the extractor's and the Java machine's
state models, and against all eight in-tree instances):

| Syntax | Can carry a wrap-split name | Why |
|---|---|---|
| Java `/* … */` (incl. javadoc `/** */`) | **yes** | the comment spans lines; the break lands inside the comment |
| TS `//` | **no** | a line comment ends at the line end — a name cannot split *inside* one. Two adjacent `//` comments can each hold a fragment, but that is two comments, not a wrapped name |
| TS `/* … */` | **yes** | as Java |
| HTML `<!-- … -->` | **yes** | as Java |
| SCSS `//` | **no** | as TS `//` |
| SCSS `/* … */` | **yes** | as Java |

The in-tree instances (the sweep's A1–A5 dead names, A6 `admin-locale-scope`, A8
`bilingual-guidance`, A7 the live `community-review-queue`) **all broke at a dash in the
name** — the line ends with a dash prefix of the name and the next line begins (after the
javadoc ` * ` lead-in or the wrap indent) with the remainder. A mid-word break
(`bilingu` / `al-guidance`) is possible in principle but does not occur in the tree; the fix
below deliberately does **not** join it (see the limits).

One more shape fact that a naive join gets wrong: in a javadoc-style comment the
continuation line's comment text starts with the ` * ` prefix — so the remainder is **not**
at position 0 of the next line's entry; it sits after a non-kebab lead-in (spaces, the
javadoc asterisk). The matcher must tolerate exactly that lead-in and nothing that contains
a word.

## 2. The matcher change, and its bounded limits

All in the test tree: `SourceVocabularyTest.java`, `FrontendCommentExtractor.java`,
`FrontendCommentExtractorTest.java`. No main code, no behaviour, no other check touched.

**What changed**

1. **The per-line entry gained the join permission.** `FrontendCommentExtractor`'s three
   entry points (`tsCommentLines` / `htmlCommentLines` / `scssCommentLines`, renamed from
   `*CommentTextByLine` — the return type changed) and the guard's Java machine
   `commentTextByLine` now return `List<CommentLine>` — a new package record
   `CommentLine(text, blockOpenAtLineEnd)`. The flag is true exactly when a **block-style
   comment is still open at the line's end**: in the extractor, the comment range at the
   split point spans the line end (a line comment's range ends at the line end, so it
   never sets it); in the Java machine, the state at the line end is `BLOCK_COMMENT`.
2. **The wrap-join rule** — `findRefusedNameWrapped(firstLineText, secondLineText, names)`,
   invoked by the shared hit collector `hitsForCommentLines` (used by **both** the
   never-made check — Java trees *and* frontend — and the archived-name check's Java walk,
   which was already line-based per the owner's Java-only ruling and now sees wrapped
   archived names too). A name is matched across the break between line *i* and *i*+1 iff
   **all five** hold:
   - a block comment is open at line *i*'s end (the permission flag — two adjacent line
     comments are two comments and never join; a line comment cannot carry a wrap at all);
   - the break is **the name's own dash**: line *i*'s text ends with a dash prefix of the
     name (names with several dashes are joined at any of their dashes);
   - line *i*+1's text, after its **leading run of non-kebab characters only** (the wrap
     indent, the javadoc asterisk), **starts** with the remainder as a whole kebab token
     (the next character, if any, is not a kebab character — so `guidancex` is not
     `guidance`);
   - the character before the name's start on line *i* is not a kebab character (a longer
     token like `xxbilingual-…` is a coincidental substring, not a citation — same rule as
     the single-line matcher, so punctuation like `(` still delimits, as it does on one
     line);
   - the spanning whitespace-delimited token contains no `/` (a path token split across the
     break still resolves — same exemption as single-line matches).
   The match is reported on the line where the name starts (the line ending in the dash
   prefix). The per-line match runs first and wins; one hit per line, as before.
3. **What it does NOT join** (the bounded limits, stated precisely):
   - **mid-word breaks** — the wrap landing inside a word (`bilingu` / `al-guidance`) is
     not joined. Rationale: a dash break is unambiguous (only a wrapped token ends a line
     on a hyphen mid-name), while a mid-word break is also what a hard wrap of an ordinary
     hyphen-free word looks like; the tree contains no mid-word instances of a listed name,
     so the narrower rule loses nothing today. A future mid-word wrap of a listed name is
     a documented miss — it would surface only if someone wraps a name inside a word, and
     the guard's per-line check still catches the un-wrapped form.
   - **more than one break** — a name split over two line boundaries (three fragments) is
     not joined; nothing in the tree looks like that, and multi-break joins widen the
     false-positive surface without a known instance.
   - **anything outside one block comment** — line comments, code, string/template
     literals (the extractor's literal exemption is unchanged; the flag is about comment
     ranges only).
   - **names not on the list** — the matcher stays name-list-driven; a wrapped live name
     (the real `community-review-queue` at `core/models.ts:696`) is joined and seen, then
     accepted because it is not a never-made name — that acceptance is proven by the green
     real-tree run, not by absence of the join.
   - **the id-shape check** (`FORBIDDEN_PATTERNS`) stays per-line. A wrap-split planning id
     is a different, unobserved evasion of a different check; joining there would let the
     numeric/hex patterns (with their adjacency exemptions) see invented adjacencies.
     Declared residual limit.

**Why the false-positive class is bounded.** A joined hit can only name one of the five
listed names, and only when line *i* ends with that name's own dash prefix and line *i*+1
immediately starts the name's remainder inside the same block comment. For a false
positive, an author would have to write, across one wrap of one block comment, the exact
fragments of a listed name with nothing in between that contains a word character. The
listed names are not English compounds (that is the family census's invariant), so the only
way to produce the shape is to cite the name — wrapped. The failure mode of any residual
error is a **visible refusal** that names the line, never a silent pass; that is the
extractor's standing design contract and it holds for the join.

## 3. The citations fixed (task 2), each verified against the code first

| Where | What the code actually does (verified) | Fix |
|---|---|---|
| `frontend/src/app/features/admin/guidance-editor.ts:552-554` | the wrap-split **never-made** name `bilingual-` / `guidance` (sweep A8) | parenthetical removed, 1:1 rewrap (3/3 lines): `The locale the post is getting a NEW translation in; null = the ordinary create/edit form. Non-null = translation-authoring mode (edit mode only): …` |
| `frontend/src/app/gateways/admin-gateway.ts:384-386` | the wrap-split dead name `admin-locale-` / `scope, `locale` given` (sweep A6) | per the sweep's adjudication: `SCOPED (a `locale` is given): the FULL ordered id list of the posts VISIBLE IN that locale — the slot-preserving algorithm: …` (3/3) |
| `src/main/java/ee/sheltermap/auth/ContactChangeService.java:43-47` | "code hashed (SHA-256) at rest" — stale: both store sites use `piiCrypto.codeHash(PiiCrypto.DOMAIN_CODE_CONTACT_CHANGE, code)` (`:161`, `:241`), the keyed `v2:` form with legacy unkeyed SHA-256 readable through the transition | house wording from the fixed `PendingVerification` / `PendingContactChange` javadocs: "code hashed at rest (the keyed `v2:` form, or the legacy unkeyed SHA-256)" (+1 line, file not doc-anchored) |
| `src/main/java/ee/sheltermap/auth/Hashes.java:5-9` | "(refresh/**reset** tokens are stored hashed)" — the "reset" half is false: `Hashes.sha256Hex` is called only by `JwtTokenService` (refresh tokens, `:61,70,105`); reset codes go through `piiCrypto.codeHash(PiiCrypto.DOMAIN_CODE_PASSWORD_RESET, …)` (`PasswordResetService.java:192`) | "(the refresh tokens are stored hashed; the reset codes use the keyed domain form)" (5/4) |
| `frontend/src/app/core/models.ts:696-697` | `community-review-` / `queue` — **LIVE**: `openspec/changes/community-review-queue/` exists on the tree (the only live change). Verified before doing anything. | **not reworded, reported** — per the task's ruling for a live name (the sweep's owner-pending item-17 class). The new wrap-aware matcher now *sees* the joined name and accepts it — proven by the green real-tree run with this citation in place. |
| `src/main/resources/db/migration/V26__guidance_post_translations.sql:5` | the never-made name in the applied migration's header comment (task 3b) | comment-only, one-line swap: `-- The content model: a guidance post is a logical`. The DDL below it is byte-identical (verified by diff). The guard does not scan `.sql`, so this stays a comment-sweep matter. |

**Filed, not edited — `admin-locale-scope` looks never-made.** Verified like the family:
no live `openspec/changes/admin-locale-scope/`, no archive directory (dated or slugged), and
`git log --all -S'admin-locale-scope' -- openspec/` is empty. It is therefore the same class
as the five listed names — but it is not on `NEVER_MADE_CHANGE_NAMES`, so the guard does not
own it. Adding a sixth entry (and the floor question that comes with it) is a wider decision
than this lane was authorised to make; the comment is fixed either way. One line on the
notes board for the owner.

## 4. The dead-branch confirmation (task 3a)

`ApiErrorHandler.malformedMessage` is called from exactly one place — the
`@ExceptionHandler` method `malformed` (`ApiErrorHandler.java:113`), which Spring's
`ExceptionHandlerMethodResolver` dispatches **only** for the five classes its annotation
declares (`ConstraintViolationException`, `HttpMessageNotReadableException`,
`MissingServletRequestParameterException`, `MissingServletRequestPartException`,
`MethodArgumentTypeMismatchException`) or a subclass of one. All five have an `instanceof`
branch that returns (a subclass is still an `instanceof` its declared class), so the final
`return "Malformed request"` is reachable by no exception the handler can receive. Cross
checks: no other caller of `malformedMessage` in main or test; no test or other file
references the string `"Malformed request"` anywhere; the one direct test call
(`ApiErrorHandlerTest:119`) passes a covered type. **Confirmed unreachable.**

The dead return is deleted. The method still needs a tail for the compiler, so the
unreachable path now fails loud — `throw new IllegalStateException("No malformed message
for <type>")` — which is behaviour-identical on every reachable input (for the one
impossible input, a 500 with a logged wiring-mistake message replaces a generic 400 string
the handler can never emit). The catch-all `internal` handler answers the client
"Internal server error" in that impossible case; the exception message goes to the log
only. `ApiErrorHandlerTest` 12/12 green after the change (7/1 lines — a comment plus the
throw replace the one dead line).

## 5. Mutation proofs — reproducible, exact commands

All runs from the module root; the focused command (the wiring lane's P2 shape) is:

```
flock /tmp/openshelter-mvn.lock mvn -B -ntp test -Dtest='SourceVocabularyTest,FrontendCommentExtractorTest' -Ddependency-check.skip=true
```

The guard's three files were sha256-pinned before the mutation phase
(`/tmp/wc-guard.sha`); the W3 restore verified against it (`sha256sum -c` — all OK).
Logs/exit files: `/tmp/wc-w1.log/.exit`, `/tmp/wc-w2.log/.exit`, `/tmp/wc-w3.log/.exit`.

**W1 — RED, a planted wrapped dead name in each comment shape.** Four temporary fixtures,
each with ONE wrapped citation of a listed name in the target shape **plus** the negative
controls that must stay silent (adjacent line-comment fragments spelling a listed name, a
mid-word break, a wrapped live name, and the full name in literal positions):

- `src/test/java/ee/sheltermap/config/WrapProofFixture.java` (Java block comment):
  ` * (bilingual-` / ` * guidance) rows` — cited; plus ` * (bilingu` / ` * al-guidance)`
  (mid-word — not cited) and `// the admin-` / `// page-size rows` (two line comments — not
  cited).
- `frontend/src/app/fe-wrap-fixtures/reject.ts` (TS block comment): `/* the (bilingual-` /
  ` * guidance) rows` — cited; plus the same two line comments, and the full name in a
  string literal and in a template-literal interpolation (not cited).
- `frontend/src/app/fe-wrap-fixtures/reject.html` (HTML comment): `<!-- the (admin-` /
  `page-size) control` — cited; plus `<!-- the community-review-` / `queue rows` — the
  **live** name wrapped, **not** refused; and the full name in an attribute URL (not cited).
- `frontend/src/app/fe-wrap-fixtures/reject.scss` (SCSS block comment): `/* the (guidance-index-` /
  `paging) clamp` — cited; plus the full name in a `content: '…'` string (not cited).

Result: **exit 1**, citing exactly the four wrapped citations and nothing else:

```
4 source comment(s) cite a change name that was never filed (5 name(s) listed in NEVER_MADE_CHANGE_NAMES):
  src/test/java/ee/sheltermap/config/WrapProofFixture.java:8: refused 'bilingual-guidance' — * (bilingual-
  frontend/src/app/fe-wrap-fixtures/reject.ts:4: refused 'bilingual-guidance' — /* the (bilingual-
  frontend/src/app/fe-wrap-fixtures/reject.html:3: refused 'admin-page-size' — <!-- the (admin-
  frontend/src/app/fe-wrap-fixtures/reject.scss:3: refused 'guidance-index-paging' — /* the (guidance-index-
```

Every negative control in all four fixtures stayed silent — the line-comment continuity
gate, the mid-word limit, the live-name acceptance and the literal/attribute exemptions all
held in one run. Fixtures deleted afterwards (the `fe-wrap-fixtures` directory no longer
exists; `git status` clean of them).

**W2 — GREEN on the real tree.** Same command after fixture deletion: **exit 0** —
`SourceVocabularyTest` 5/5 (3 walks + 2 new wrap tests), `FrontendCommentExtractorTest`
4/4. The real wrapped live name at `core/models.ts:696` is in the tree for this run — seen
joined, accepted. (Before the task-2 rewordings landed, this same command was red on
`guidance-editor.ts:552` with the wrapped citation — the matcher's real-tree detection was
observed live, not just on fixtures.)

**W3 — RED when the floor is emptied.** `NEVER_MADE_CHANGE_NAMES = List.of()` (the wiring
lane's P3 mutation, re-proven on the new matcher): **exit 1** —
`Only 0 never-made change name(s) are listed (the floor is 5) — the list is empty, and
this guard would pass silently.` The second failure in the same run was the new
`wrapJoinSeesTheDashBreakAndNothingElse` unit test, whose positive assertions read the list
— expected cascade, recorded for the record. Restored; sha-verified.

**New unit pins (the two directions that are hard to plant):**
`wrapJoinSeesTheDashBreakAndNothingElse` (dash break at both split points of a multi-dash
name is cited; longer-token on either side, an intervening word, a path-span, a mid-word
break and an unlisted live name are not) and
`onlyABlockCommentOpenAtTheLineEndPermitsTheWrapJoin` (the flag: true on the spanning
javadoc lines, false on the closing line, false on adjacent line comments, false on a
same-line block comment), plus `FrontendCommentExtractorTest.blockOpenAtLineEndMarksOnlyThe
SpanningBlockComment` (the flag in TS, HTML and SCSS).

## 6. Gates (detached, exit files)

- **Backend:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
  → **exit 0 — Tests run: 1368** (see below), `/tmp/wc-gate-be.log/.exit`.
- **Frontend:** `cd frontend && npx ng test --watch=false` → **exit 0 — 1583/1583, 65
  test files**, `/tmp/wc-gate-fe.log/.exit`. The baseline 1583 exact; both reworded frozen
  files' suites pass.
- **Frontend build (run rule 2):** `cd frontend && npx ng build` → **exit 0**,
  `/tmp/wc-gate-build.log/.exit`.

**Count change:** 1365 → **1368 = baseline 1365 + 3 new test methods**
(`SourceVocabularyTest.wrapJoinSeesTheDashBreakAndNothingElse`,
`SourceVocabularyTest.onlyABlockCommentOpenAtTheLineEndPermitsTheWrapJoin`,
`FrontendCommentExtractorTest.blockOpenAtLineEndMarksOnlyTheSpanningBlockComment`).
Nothing deleted or weakened; `ApiErrorHandlerTest` 12/12 unchanged in count.

## 7. What deliberately did not change

No behaviour change anywhere: the guard diff is test-tree only; the four comment
rewordings are comment-only; the V26 migration is comment-only (the applied DDL is
byte-identical by diff); the only main-code line is the unreachable tail of
`malformedMessage`, confirmed unreachable in §4 before deletion. No user-visible string,
translation value, i18n key, CSS class, DOM id or identifier touched. `models.ts:696` is
untouched (live name — reported, per the task). None of the touched files is cited in
`docs/agent/00-CURRENT-STATE.md` (grep-verified), so no anchor shift is owed and
`DocumentationFactsTest` owes no re-derivation; the two frontend rewraps are 1:1
line-count preserving anyway. `NEVER_MADE_CHANGE_NAMES` and all floors untouched; the
archived check's Java-only scope and the id-shape check untouched (both declared limits,
§2).

**Files for your commit:** `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java`
(wrap join + the two unit pins), `FrontendCommentExtractor.java` (`CommentLine` + the flag
+ the three renamed entry points), `FrontendCommentExtractorTest.java` (API update, all
shape probes kept + the flag probe), `frontend/src/app/features/admin/guidance-editor.ts`,
`frontend/src/app/gateways/admin-gateway.ts` (the two rewordings),
`src/main/java/ee/sheltermap/auth/ContactChangeService.java`,
`src/main/java/ee/sheltermap/auth/Hashes.java` (stale hash wording),
`src/main/java/ee/sheltermap/api/ApiErrorHandler.java` (dead return),
`src/main/resources/db/migration/V26__guidance_post_translations.sql` (header comment),
and this report. The three `submit-shelter-page.*` modifications in the working tree at
report time are the sibling FE-GODFILES lane's (§8), not this lane's.

## 8. Unverified / caveats

- **Branch note.** The brief said `feature/frontend`; at session start the parent had
  checked it out, but the READ-FIRST documents (`reviews/polish/readability-sweep.md`,
  `reviews/polish/guard-wiring.md`) and the wired-in extractor exist only on `polish-work`
  (`feature/frontend` + `1e9850a` + `2084c47` + `04affe0`). Worked `polish-work`; the tree
  was clean at the switch. If the parent intended the `feature/frontend` tip as the base,
  the guard work needs its three commits first — flagged, not resolved.
- **Shared tree.** The sibling FE-GODFILES lane wrote `submit-shelter-page.{ts,html,spec.ts}`
  at 23:13 (after my FE gate's build snapshot at 23:12:49). My FE gate therefore attests the
  tree as of ~23:12 including my two comment rewraps; if the sibling's later write lands
  broken, the re-gate is theirs to run. None of their files is in my diff.
- **`admin-locale-scope`** — verified never-filed (§3) but **not** added to
  `NEVER_MADE_CHANGE_NAMES` (wider decision; notes-board line filed).
- **Mid-word breaks and multi-break splits** are the declared limits of the join (§2) —
  no in-tree instance today; a future one is a visible miss at worst, and the un-wrapped
  form is still caught.
- **The id-shape check stays per-line** (§2) — a wrap-split planning id is out of scope for
  this lane; declared as the residual limit of "close the wrap evasion".
- The W1/W2/W3 runs were focused-test under the lock; the full `clean verify` ran after,
  on the restored tree, and is the standing proof.
