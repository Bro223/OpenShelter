# FAMILY-INVESTIGATE — the four admin-family names vs the vocabulary guard

**Branch:** `polish-work` @ `41cc03a` (same commit as `feature/frontend`; both checked
at 41cc03ac, tree clean). **Lane: read-only** — no code/test/doc edits, no commit;
the one build action was running the guard test under the shared flock (writes
`target/` only).

**Question:** `admin-tab-persist`, `admin-page-size`, `admin-guidance-search`,
`guidance-index-paging` are cited in the tree and the guard classifies them as
legitimate. Is the guard right, or does it have a hole?

**Short answer: the guard has a hole — a known, documented one, and this family is
a second observed instance of it.** None of the four names is in either refused
set, so the guard never even searches for them; "accepted" is absence from the
candidate list, not a positive "legitimate concept" verdict. All four are
working/planning names for work that shipped without ever being filed as an
openspec change — exactly the dead-by-construction class the never-made check
was built for `bilingual-guidance`. Per-name verdicts in §3. One correction to
the assignment: only **two** of the four are cited in the Java tree;
`admin-tab-persist` and `admin-page-size` are cited **only in the frontend**,
which neither name check walks.

---

## 1. Per-name evidence

Method, per name: live dir? archive dir? `git log --all` dir history? any spelling
in any spec / task list / archived change? first appearance in history? full
current-tree citation census (comment vs code, per tree)?

Common to all four:

- **Live dir:** none — `openspec/changes/` holds `archive/` + `community-review-queue` only.
- **Archive dir:** none — all 37 dated archive dirs checked by name; none matches
  or slugs to any of the four.
- **Dir history:** `git log --all -- 'openspec/changes/<name>' 'openspec/changes/archive/*<name>*'`
  is **empty for all four** — no directory ever existed on any branch.
- **openspec/ history:** `git log --all -S'<name>' -- openspec/` is **empty for
  all four** — the names never appeared in any spec, task list or archived change,
  in any commit, on any branch.
- **Variant spellings:** kebab-partial (`tab-persist`, `admin-tab`, `index-paging`,
  `guidance-search`, `page-size`) and space-spelled (`tab persist`, `index paging`,
  `guidance search`, `page size`) grep over the whole `openspec/` tree: **zero**
  real hits (one false positive, "Admin tables", `mobile-responsive-polish`
  tasks.md:12). In `docs/` the only space-spelled relatives are the prose heads
  "Admin guidance search (q)" / "Admin guidance search (server-side)" in
  `docs/autopilot/list-page-paging/{ADMIN-LANE-SPEC,ADMIN-LANE-REPORT}.md`.

### 1.1 `admin-tab-persist` — 2 citations, both frontend comments, 0 Java

| file:line | kind |
|---|---|
| `frontend/src/app/shared/admin-tab.ts:2` | module javadoc: "The admin page's active-tab URL vocabulary (admin-tab-persist)." |
| `frontend/src/app/features/admin/admin-page.spec.ts:3905` | section comment (byte-pinned spec) |

- **First appearance:** `49953ad` (2026-09-23, "feat(admin): keep the active tab
  in the URL…") — introduced in 6 comment/title sites in `admin-page.ts`,
  `admin-tab.ts`, `architecture.spec.ts`, `admin-page.spec.ts`. Feature work, not a proposal.
- **What it actually refers to:** a live, shipped capability — the active admin
  tab URL-backed in the `tab` query param (`shared/admin-tab.ts`,
  `ADMIN_TAB_DEFAULT`, the architecture-guard union, the pinned spec suite).
- **Doc target:** none. No file in the tree other than these two comments uses the name.

### 1.2 `admin-page-size` — 8 citations, all frontend comments, 0 Java

| file:line | kind |
|---|---|
| `frontend/src/app/gateways/admin-gateway.ts:268` | javadoc (co-cites `admin-guidance-search`) |
| `frontend/src/app/shared/paging.ts:2` | module header (co-cites `list-page-paging`) |
| `frontend/src/app/features/admin/admin-page.spec.ts:3210` | section comment (byte-pinned spec; co-cites `admin-guidance-search`) |
| `frontend/src/app/features/admin/guidance-order-list.html:31` | HTML comment |
| `frontend/src/app/features/admin/guidance-order-list.spec.ts:282` | section comment |
| `frontend/src/app/features/admin/guidance-order-list.ts:45` | input javadoc |
| `frontend/src/app/features/admin/guidance-panel.html:134` | HTML comment |
| `frontend/src/app/features/admin/guidance-panel.html:167` | HTML comment |

- **First appearance:** `b598f3b` (2026-09-22, "feat(ui): pagination, warnings and
  styles from the review sweep"), in `admin-gateway.ts`'s javadoc.
- **What it actually refers to:** a live, shipped capability — the admin size
  selector + paged lists (namespaced `guidancePage`/`guidanceSize` params, shared
  `<app-pagination>`, the interaction rule that disables reorder on multi-page
  scopes). It is Feature 2 of `docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md`
  ("Admin guidance list: size selector + paging") — but that spec doc names it in
  prose, not with the kebab token.
- **Doc target:** none carrying the token itself.

### 1.3 `admin-guidance-search` — 16 citations: 7 Java comments, 5 frontend
comments, 4 frontend code

Java (all comment/javadoc — the guarded tree):

| file:line | kind |
|---|---|
| `src/main/java/ee/sheltermap/guidance/GuidanceSearch.java:10` | class javadoc: "The admin guidance search match (admin-guidance-search)…" |
| `src/main/java/ee/sheltermap/guidance/GuidanceSearch.java:38` | `requireSearch` javadoc |
| `src/main/java/ee/sheltermap/guidance/GuidanceService.java:130` | `searchableBody` delegate javadoc |
| `src/main/java/ee/sheltermap/guidance/GuidanceService.java:139` | `matchesSearch` delegate javadoc |
| `src/test/java/ee/sheltermap/api/AdminGuidanceSearchPagingIT.java:28` | class javadoc |
| `src/test/java/ee/sheltermap/guidance/GuidanceSearchTest.java:67` | line comment |
| `src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java:1570` | section comment |

Frontend comments: `admin-gateway.ts:268`, `admin-page.spec.ts:3210` (byte-pinned
spec), `guidance-order-list.html:9`, `guidance-order-list.ts:41`,
`guidance-panel.html:19`. Frontend **code** (not comments — the guard's
documented non-target in both trees): `guidance-panel.html:24`
(`class="admin-search admin-guidance-search"`, a live CSS class) and the three
matching spec selector strings `admin-page.spec.ts:3245,3405,3495`
(`querySelector('.admin-guidance-search')`).

- **First appearance:** `d247007` (2026-09-21, "fix: the guidance controller
  imports, the admin split's lost styles…") — entered as comments in
  `AdminGuidanceController`/`GuidanceService` plus the new `GuidancePaginationIT`.
- **What it actually refers to:** a live, shipped capability — Feature 1 of
  ADMIN-LANE-SPEC, "Admin guidance search (`q`)": `GET /admin/guidance?q`,
  submit-based, locale-scoped, tag-stripped substring, page-reset on submit;
  pinned by `AdminGuidanceSearchPagingIT` and the admin spec suite.
- **Doc target:** none carrying the token (the spec names the feature in prose).

### 1.4 `guidance-index-paging` — 7 citations in src + 1 in docs: 4 Java
comments, 2 frontend comments, 0 code

| file:line | kind |
|---|---|
| `src/main/java/ee/sheltermap/api/GuidanceController.java:82` | javadoc: "Paging (guidance-index-paging): the optional limit (1..200)…" |
| `src/main/java/ee/sheltermap/api/GuidanceController.java:141` | line comment |
| `src/test/java/ee/sheltermap/api/GuidancePaginationIT.java:30` | class javadoc |
| `src/test/java/ee/sheltermap/guidance/GuidanceServiceTest.java:1518` | section comment |
| `frontend/src/app/gateways/guidance-gateway.ts:47` | javadoc |
| `frontend/src/app/features/guidance/guidance-list-page.spec.ts:542` | section comment (co-cites `list-page-paging`) |
| `docs/autopilot/list-page-paging/ADMIN-LANE-SPEC.md:4` | **the planning spec itself uses the token**: "Owner requirement folded into the `list-page-paging` / `guardance-index-paging`…" — i.e. "`list-page-paging` / `guidance-index-paging` work" |

- **First appearance:** `197ae58` (2026-09-21, "feat(lists): pagination with a
  10-100 page size, plus the admin lane's spec") — the commit that added
  ADMIN-LANE-SPEC.md **and** the public-index paging; the name entered in 9 sites
  in one commit, doc included.
- **What it actually refers to:** a live, shipped capability — paging of the
  public `/blog` index (`GET /api/guidance?limit&offset` + `X-Total-Count`,
  `GuidanceController`, pinned by `GuidancePaginationIT`).
- **Doc target:** **yes — the only one of the four.** A reader following the name
  finds ADMIN-LANE-SPEC.md line 4, which uses it, in a docs dir whose sibling
  token `list-page-paging` resolves to an openable directory
  (`docs/autopilot/list-page-paging/`). front-names classified `list-page-paging`
  on exactly that basis ("Resolves — a citation the reader can open").

---

## 2. Why the guard accepts them — the exact code path

The guard has **no positive "legitimate" classification**. A name passes because
it is **absent from both refused sets**; token matching and the exemptions are
only ever evaluated for names that are in a set. No exemption accepted any of
these four.

**Archived-name check** (`sourceCommentsContainNoArchivedChangeNames`):
`archivedChangeNames(root)` → `archivedDirectoryNames(root)` lists
`openspec/changes/archive/`, keeps entries matching `\d{4}-\d{2}-\d{2}-.+`,
adds each full name + its date-stripped slug → the 74-name set, minus the live
entries (`community-review-queue`). The floor (74 ≥ 70) guards the derivation.
None of the four names is among the 74 (§1, archive checked by name), so none is
in `refusedNames`.

**Never-made check** (`sourceCommentsContainNoNeverMadeChangeNames`):
`NEVER_MADE_CHANGE_NAMES = List.of("bilingual-guidance")`; the floor (1 ≥ 1)
passes; `staleNeverMadeNames` finds the one entry still resolves to nothing, so
no staleness failure. The walked name list is that single entry.

**The shared matcher** (`walkTreeForRefusedNames` → `refusedNameHits` →
`commentTextByLine` → `findRefusedName`): `findRefusedName(commentLine, names)`
iterates `for (String name : names)` and calls `commentLine.indexOf(name)`.
`isWholeKebabToken` and `isPathToken` run **only after** a listed name is found
as a substring. For our four names the loop body never executes — `indexOf` is
never called for them in either walk. The Java trees are walked (both name
checks loop `List.of("src/main/java", "src/test/java")`, test file :284 and
:337), the comment state machine extracts the cited comment text verbatim — the
names sit in it, plain — and are still not searched, because the name list never
contains them.

**Id-shape check** (`sourceContainsNoUnresolvableIdReferences`, the only one of
the three that walks `frontend/src` — `SCANNED_ROOTS`, :133): its
`FORBIDDEN_PATTERNS` are digit-bearing shapes (`ORCH-\d+`, `wave-\d+`,
`\bN\d+\b`, `\bD\d+\b`, `\bM\d+[a-z]?\b`, `\bP\d+-\d+\b`, `SW-C\d+`, …). No four-
word, digit-free kebab token can match any of them, so the frontend comments are
checked against id shapes only, and the Java comments against id shapes plus the
two refused-name sets.

**Observed state:** on `41cc03a` the guard runs **green — 3/3**
(`flock … mvn -B -ntp test -Dtest=SourceVocabularyTest -Ddependency-check.skip=true`,
BUILD SUCCESS), with all 11 Java comment citations in place.

**The "legitimate concept name" label** (front-names §3) is a de-facto reading
of the green gate, not a verdict the guard renders: nothing in the guard
affirms these names. And the guard's own javadoc doctrine says the opposite of
"legitimate": the never-made check's class is "the deadest of dead references —
the reader cannot open a proposal, because none was ever written." For
`guidance-index-paging` the doctrine is arguably overstated (a doc line carries
the name, §1.4); for the other three there is nothing to open, anywhere.

**One more precision, had they been listed:** no exemption would have saved any
site. Every citation is a whole kebab token, and none sits in a whitespace-
delimited token containing `/` (e.g. `(guidance-index-paging / list-page-paging)`
— the parens/slash keep the tokens apart, so the path-token exemption does not
apply). Listed ⇒ all 11 Java sites refused.

---

## 3. Verdicts

**As change names, all four are dead — none was ever a change, and the guard's
"acceptance" is structural blindness, not a finding of legitimacy.** The
inconsistency front-names flagged is real and is the run's own: SIMPLIFY-ADMINPAGE
removed `admin-tab-persist` / `admin-page-size` / `admin-guidance-search` from
`admin-page.ts`/`.html` calling them **"planning ids"**
(reviews/code-review/simplify-adminpage.md:34), while SIMPLIFY-GUIDANCE §4 left
`admin-guidance-search` as a **"feature name … a reader can resolve them"** —
but a reader has no directory, spec or doc to open for any of the four (one doc
line for `guidance-index-paging`, §1.4). The guard never adjudicated; it simply
passed, in both cases.

Per name:

- **`admin-tab-persist` — genuinely dead reference.** Live capability,
  unresolvable name, cited only from the frontend. Doubly invisible: not in
  `NEVER_MADE_CHANGE_NAMES`, and the name checks don't walk the frontend — so
  adding it to the list would turn the gate red on **zero** existing sites.
- **`admin-page-size` — same.** Live capability, unresolvable name, frontend-only
  citations (8), zero Java sites; list-entry alone would enforce nothing on the
  current tree.
- **`admin-guidance-search` — dead reference, enforceable today.** 7 Java comment
  sites would go red on a list entry (rewordable exactly like the six
  `bilingual-guidance` lines: keep the constraint, drop the name). The CSS class
  + 3 spec selector strings are code — the guard's documented non-target, same
  class as the 38 DOM-id occurrences already filed for owner decision; renaming
  the class is a selector-contract change, not a comment sweep.
- **`guidance-index-paging` — same class, weakest dead case.** It is the
  planning spec's own working name (ADMIN-LANE-SPEC.md:4) and its sibling
  `list-page-paging` resolves to an openable docs dir. Still never a filed
  change; the guard's doctrine would refuse it, but it is the one name where a
  reader can follow the thread. If the owner wants "documented concept" to be a
  legitimate class, that is a **design decision** (teach the resolver a third
  source — `docs/autopilot/` dirs/spec lines), not a mechanical list edit; the
  cheapest compliant rewording is to cite the spec by path
  (`docs/autopilot/list-page-paging/…`), which the path-token exemption keeps legal.

**Recommendation on the guard:** the hole is the one LAST-NAMES §7 already
conceded in print — the never-made list is maintained, and "detection of this
dead-reference class starts from a report." This family is the second observed
instance (4 names, 11 Java + 17 frontend comment sites) passing silently. If the
owner rules the family dead (the run's settled precedent for the class:
LAST-NAMES §3, the SIMPLIFY-* sweeps, DEAD-NAMES-CLEAN), a lane can execute:
add the four to `NEVER_MADE_CHANGE_NAMES` (raising
`MIN_NEVER_MADE_CHANGE_NAMES` to 5 deliberately, with the reason, per the guard's
own floor discipline), reword the 11 Java comment lines, and leave the frontend
citations to the existing frontend-extension hand-off (§4). The staleness check
makes this safe forward: if any same-named change is ever filed or archived, the
entry goes red and the archive-derived check takes ownership. If the owner rules
"legitimate concept names," the decision should be recorded against the guard's
javadoc doctrine, which currently defines never-filed names as dead — leaving it
unrecorded leaves the class report-driven and the two lanes' contradictory
treatment of the same tokens unreconciled on the record.

---

## 4. The documented asymmetry

**Record correction first:** on this branch the asymmetry as stated does not
exist. **Both** refused-name checks walk the Java trees only — the archived-name
check at test file :284 and the never-made check at :337, both
`for (String javaRoot : List.of("src/main/java", "src/test/java"))`; the
never-made check's javadoc says "Scope is the same as the archived-name check:
both Java trees' comment text only." The only check that walks the frontend is
the **id-shape** check (`SCANNED_ROOTS`, :133, includes `frontend/src`;
`.ts/.html/.scss`). front-names §5 recommended extending both name checks to the
frontend; that was a recommendation, and the landing commit (5747d59) was
comment rewordings only. No exemption, flag or config extends the name checks to
the frontend.

**What the real asymmetry (name checks Java-only; id-shape check includes
frontend) can miss:**

- Any refused name — archived or never-made — cited in a **frontend comment**.
  Demonstrated at scale: `bilingual-guidance` sat in 27 frontend sites invisible
  to the guard (that invisibility is why the sweep needed a human lane); 6 lines
  remain today in the two byte-pinned specs, still unguarded. And the whole
  investigated family: 17 of its 28 comment sites are frontend, all invisible —
  including **every** `admin-tab-persist` and `admin-page-size` citation, so a
  dead name whose citations are all frontend is **permanently** invisible to
  both name checks, no list entry included.
- A future never-made name cited only in frontend comments: undetectable by the
  guard by construction (report-driven detection is the only path), in the tree
  whose comment style most often cites concepts by working name (front-names'
  census: 1 444 distinct kebab tokens in FE comments).

**What it cannot miss (i.e. is not blinded by the asymmetry):**

- Java-tree citations of the same names — 11 family sites are in Java and would
  be caught the moment the names are listed.
- Planning-id *shapes* in the frontend (`Wave N`, `D#`, `M#`, bare `N#`,
  `P#-#`, `ORCH-`, `SW-C#`…) — still caught by the id-shape check, which does
  walk `frontend/src`. The frontend is not ungoverned; only the kebab-case
  change-name class escapes.
- Code occurrences (string literals, DOM ids, CSS classes, test titles, OpenAPI
  strings): exempt by design in **both** trees in every check; the asymmetry
  changes nothing there.
- The derivation mechanics (archive floor, live-change subtraction, staleness
  check, path-token exemption, whole-kebab-token matching) behave identically
  regardless of which tree is walked.

(If the owner's stated shape — never-made check walking the frontend — had been
the code, the `admin-tab-persist`/`admin-page-size` blind spot would have closed
and the family's 17 FE comment sites would have been catchable on list entry. It
was not the code; the analysis above is for what is.)

**Is closing it worth a lane? It depends on the family verdict, and the cost is
front-names §5(c), still accurate:** (a) one-time, then frozen — a
TS/SCSS/HTML-aware comment extractor with red-proof probes (a `//` in a template
literal or URL string is not a comment → porting the Java state machine would
false-positive a refused name inside a string and swallow code; `<!-- -->` is
invisible to it → false-negative the real HTML-comment citations; `${}`
interpolation nests states the Java machine doesn't have); (b) standing
collision surface +2 names per archived change against a house style that cites
concepts by name in comments (the already-observable case: archived slugs
`shelter-address-search`/`shelter-location-input` are live DOM ids — code is
exempt, but the next comment citing them trips the gate); (c) frozen-spec
coupling — the 6 remaining `bilingual-guidance` lines in the two byte-pinned
specs (and, if the family is ruled dead, the family's two admin-page.spec.ts
comment sites) become a hard gate dependency until the owner authorises the
comment-only rewording — already an open board item ("frozen pinned-spec
prose/titles"). **If the owner rules the family dead: yes, close it in the same
wave** — otherwise two of the four new list entries (`admin-tab-persist`,
`admin-page-size`) are placeholders that enforce nothing, which is worse than
useless: the list would *look* guarded and guard nothing for the only two names
cited nowhere in Java. **If the owner rules "legitimate concepts":** the
extension's remaining value is the 6 frozen `bilingual-guidance` lines plus
future dead names — worth doing, lower urgency, and the "documented concept"
exception (docs/autopilot as a third resolution source) should be decided first,
since it changes what the extended walk would refuse.

---

## 5. Could not establish

- Whether any of the four names ever appeared in an **uncommitted or deleted
  planning doc** outside git (e.g. a local task file): history shows no committed
  doc carrying the tokens except ADMIN-LANE-SPEC.md:4 (`guidance-index-paging`);
  uncommitted working files are not recoverable. `admin-tab-persist` and
  `admin-page-size` first appear in feature commits as comments — their minting
  site (an era task doc, if any) is not in the tree.
- I could not confirm the owner's statement that the never-made check walks the
  frontend on any branch I can see — on `41cc03a` (and identically on
  `feature/frontend`, same commit) it does not. If it exists elsewhere, it is not
  in this worktree's local or remote refs.
- No full frontend/backend gate was run (read-only lane, no diff to gate); the
  single-test guard run (3/3 green) is the guard-state evidence.
- front-names §3's per-name counts (2/3/5/2) were a snapshot on `code-review-2`
  with rows abbreviated ("…"); the current-tree census in §1 supersedes it —
  the Java-tree citations of `admin-guidance-search` in the two later-extracted
  test files (`GuidanceSearchTest`, `AdminGuidanceSearchPagingIT`) post-date that
  measurement.
