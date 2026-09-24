# ANCHOR-CONVERT — symbol-anchoring the current-state doc

**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` (rule 6)
**Scope:** `docs/agent/00-CURRENT-STATE.md` — the only file I edit (plus this report).
No guard, code, or other doc touched. No commits — the parent commits.

## 0. Method

The guard (`DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode`)
extracts a backticked identifier (≥ 4 letters) or a verbatim quoted phrase from the
clause window before each `file:lines` citation and requires it at the cited lines.
A citation whose clause names no machine-derivable token is checked **structurally
only** (range inside the file, cited lines carry letters) — a wrong-but-lettered
range passes. That blind spot is what this pass closes for the files the refactoring
lanes touch: `frontend/src/app/shared/**`, `features/map/**`, `features/admin/**`,
`core/**`, and the backend services/controllers the lanes rewrote — plus the
`styles.scss` marker cluster (a serialized shared stylesheet, touched in this run by
33793ce).

Two checks per citation, not one:
1. **Structural + token** — the guard's own logic, ported faithfully to
   `/tmp/cs_prescan2.py` (extends the previous pass's `/tmp/cs_prescan.py`), run
   before and after every edit.
2. **Semantic** — each converted range read against the code it cites; the clause
   must still say something true of those lines, and the symbol must be the unit
   that implements the claim.

Window rule (from the guard source, not the report that preceded it): the clause
window starts at the later of the previous line break and the previous citation's
closing backtick, and extends one wrapped line at a time **only while the segment
between the window start and the citation is empty or punctuation-only**
(`[();,\s\`]*`). Consequence: a token/phrase must sit on the citation's own line
(or be reachable through pure-punctuation continuation lines) — a symbol two
wrapped lines above the citation is invisible to the guard. This is why several
conversions rewrap the sentence so the symbol and its citation share a line.

## 1. Baseline (HEAD = b971648, clean tree)

Prescan of the committed doc: **107 citations / 26 tokened / 35 files / 6 bare
paths — all four exactly at the guard floors** (107/26/35/4), 0 failing. So any
edit that drops a citation, a file, or a tokened count to the floor-minus-one fails
the guard; my conversions keep every citation (only re-pointing / enriching them)
and net-increase the tokened count.

The baseline also shows **81 structural-only citations** — the "bare line-range"
population this task converts where the file is lane-touched.

## 2. Drift found beyond what was filed

The notes board filed drift for: paging.ts (×3), admin-page.ts (×3), map-page.ts
(`?hasCapacity` clause), SecurityConfig, AdminModerationService (×3), GuidanceService
(×5, "still PASS — re-derive optionally"). Beyond that, my semantic pass found:

### 2.1 The styles.scss marker cluster points at the badge rules (verified, fixed)

The marker-region citations in §1 were re-derived at a time when the region was ~24
lines higher; the marker comments have since grown (triangle clip-path rationale,
reported-state, pick and anchor pins). Every marker citation now lands in the
**badge** block above the markers, or mid-triangle-rule. The guard stayed green
because the whole cluster is structural-only. Mapping (doc claim → cited → actual):

| Doc claim | Cited (before) | Actually cited | Actual unit (now cited) |
| --- | --- | --- | --- |
| base circle, shared 2px edge | `:786-789` | blank + `.badge.badge--closed` 787-791 | `.shelter-marker` **810-814** |
| registry | `:792-794` | `.badge.badge--occupancy` 793-797 | `.shelter-marker--registry` **816-818** |
| unverified triangle | `:809-848` | marker header comment + base + registry + triangle comment + rule cut mid-body (rule ends 867) | comment + rule **820-867** |
| full green circle | `:855-857` | inside the `--user` triangle rule (`&::before`) | comment + rule **869-881** |
| partial yellow circle | `:859-861` | inside the `--user` triangle rule | rule **883-885** |
| reported | `:869-871` | the "Submitter verification depth" comment start | comment + rule **887-895** |
| pick pin | `:878-880` | comment tail + `.shelter-marker--full` 879-881 | comment + rule **897-905** |
| anchor diamond | `:891-896` | reported comment tail + `.shelter-marker--reported` 893-895 | comment + rule **907-920** |
| legend swatches reuse the classes | `:782-785` | `.badge.badge--reported` rule | section comment **806-809** |
| "red is reserved" statement | `:874-875` | submitter-depth comment body | pick comment statement **898-899** |
| shape-carrying-depth statements | `:796-798,842-854` | badge--occupancy tail + triangle rule interior | **820-822,873-874** |

`styles.scss:915-920` (the "not a circle — the shape IS the distinction" phrase
quote) was already correct — it re-derives exactly onto the `.shelter-marker--anchor`
rule, which is why the one tokened citation in the cluster survived the shift.

Provenance: the marker region sat at 810-920 as of 43bebe7 (pre-run) — the drift is
**inherited**, not caused by this run's reflows; the last anchor passes only
re-derived the eight anchors the lanes had filed, and a structural-only citation
cannot fail, so the cluster was never flagged.

### 2.2 core/i18n + theme-tokens shifted by the formatter reflow (b971648), unfixed by the lanes

- `en.ts` legend copy `:177,179-180,185-186,190` → the six entries moved −2:
  now **175, 177-178, 183-184, 188** (old range now spans partialVerified + two
  comment lines + the geoNote value — wrong lines, still letters).
- `en.ts` "no grey" `:181-184` → the comment block is now **179-182**.
- `theme-tokens.ts:71` (the token map) → the export is **`BLACK_AND_YELLOW_TOKENS`
  at 82**; 71 is a javadoc line about the chrome band.
- `theme-tokens.ts:116,117-118,122,151-154` (bny token values) → now
  **127,128-129,133,169,170-171,172** (reported/new/verified/registry/user/pick).
- `theme-tokens.ts:152-153` (the shared `#ffd400`) → now **170-171** (152-153 is
  the `--color-info` pair).
- `theme-tokens.ts:117-118,122` (`--color-new` unification) → now **128-129,133**.
- `ru.ts:198-204` (RU machine-draft legend copy) → the two draft-marked comment
  blocks + their values are **195-203** (old range starts mid-comment, ends on the
  non-draft geoNote).
- `et.ts:87-88` (ET machine-draft legend copy) → pointed at the `how.sources`
  string (a different, also-draft, non-legend entry); the legend draft blocks are
  **182-190**.

### 2.3 The map legend/filter citations lost their code to the view extraction (cb57d84)

Five of the six `map-page.ts` citations in §4 pointed at code that the map lane's
view extraction moved into `legend-view.ts`; the ranges now land on the class
javadoc's distance/filters paragraphs and the `sorted()`/`onMarkerClick`/error
regions. The previous anchor pass verified them "in range and token/phrase-valid"
(structurally) and recorded "no edit owed" — semantically they point at code that
no longer implements the claims:

| Doc claim | Cited (before) | Actually cited | New home |
| --- | --- | --- | --- |
| `tones` param "SINGLE source of truth (URL-only…)" | `map-page.ts:330-336` | `selectShelter` javadoc | `LegendFilterView` javadoc, `legend-view.ts:54-68` (the old quoted phrase no longer exists verbatim in the code — re-quoted from the new wording) |
| sanitize + `replaceUrl` normalize | `map-page.ts:80-95,504-505` | class-javadoc distance/filter paragraphs + a 429 error comment | `syncFromParams`, `legend-view.ts:120-156` |
| five tone entries are toggle buttons; display-only, no refetch | `map-page.ts:62-76,231-241,350-371` | `ANCHOR_ZOOM` + class javadoc; `sorted()` haversine body; `onMarkerClick` + a search-selection javadoc | `LEGEND_TONES` + `LegendFilterView`, `legend-view.ts:4-11,54-68`; the toggle buttons themselves: `map-page.html:16-17` (new citation) |
| sixth entry (anchor diamond) is not a filter | `map-page.ts:66-68` | class-javadoc marker-tone description | `LEGEND_TONES` javadoc tail, `legend-view.ts:8-11` |
| source chips gone; list always fetches all sources | `map-page.ts:70-75,242-244` | class-javadoc shell paragraph; `sorted()` haversine lines | class javadoc statement, `map-page.ts:94-95` |

`map-page.ts:321-329` (`activeTrustFilter`) re-verified correct, unchanged.

### 2.4 design-tokens.spec.ts (pinned guard spec — ranges only, not converted)

b971648 reflowed the spec (15 lines); three citations drifted:

| Doc claim | Cited (before) | Actually cited | Now |
| --- | --- | --- | --- |
| color-mix audit blind spot | `:813-817` | an HC chrome exemption entry | the MIXED_PAIRS comment block **855-865** (the quoted sentence is at 858) |
| `--color-new` unification pin | `:871` | a MIXED_PAIRS entry line | the it() title **913** |
| marker-meaning pin (red-orange = reported) | `:907` | the BNY name-set parity test | the it() title **949** |

`:64-66,73-88` (the line-by-line loops) verified still correct — kept.

## 3. Conversions (symbol + short range, the earlier passes' pattern)

Pattern: the clause window (text after the previous citation, before this
citation's opening backtick) names the symbol; the cited range covers the symbol's
javadoc + signature (whole unit for short units). Verified per citation by the
prescan: token/phrase present at the cited lines, clause still true.

### Frontend `shared/**`
- `leaflet-service.ts:69-91` → `:50-91` — whole `markerTone` incl. its javadoc
  (symbol already named in the clause).
- `:78-79` — added the field pair `nonexistentReports`/`inaccurateReports` to the
  clause; tokens verified at 78-79.
- `:80-89` → `:81-89` — the `USER` branch only (80 was the previous branch's `}`);
  `USER` token already in the clause.
- `:90` — kept: a bare `return 'registry';`, no symbol (rule 4: anchored at the
  file, recorded here).
- `:86-88` — the no-recency comment; anchored on the code's own words "the badge
  says NEW, not the pin" (quoted in the clause; verified at 86-87).
- `:317,338` → `:317,327,338` with `setAnchor` named (signature at 327 joins the
  shape sentence at 317 and the class line at 338); `:285` → `:274,285` with
  `setPick` named.
- `shelter-copy.ts:93-101` → `:84-101` — whole `verificationTone` incl. javadoc
  (tokens already present).
- `list-state.ts:16-20` — kept: the routing-idiom claim sits in the component's
  class javadoc; no method symbol carries it (recorded).
- `paging.ts`: `:1-13` → `:1-16` (the whole module javadoc; no symbol — recorded);
  `:19,23,26,30` with the `PAGE_SIZE_` constants named; `:41-56` → `:39-56`
  (whole `parsePage` + `parseSize` javadocs + bodies); `:60-62` → `:58-62` (whole
  `lastPage`); `:67-69` → `:64-69` (whole `clampPage`); `:70-78` → `:71-78` with
  `parseTotal` named (whole unit incl. javadoc).

### `features/map/**` + `features/admin/**` + `core/**`
- `map-page.ts` cluster — see §2.3 (five re-pointed, one verified-kept, one new
  template citation added).
- `admin-page.ts:368` — kept (phrase-anchored "the view IS the URL", verified at
  368); `:419-509` — range kept (whole `normalizeListParams`, javadoc 419-424 →
  closing 509, verified), symbol named in the clause; `:453-468` — kept (the six
  `check(...)` calls, already tokened by the param names).
- `theme-tokens.ts` — see §2.2; `:71` → `:82` with `BLACK_AND_YELLOW_TOKENS`
  named; the three value lists re-pointed (no symbol: each line is a self-naming
  `--token: value` declaration — recorded).
- `core/i18n/en.ts` — see §2.2; "no grey" anchored on the code's own words
  (quoted phrase); legend-copy list with the `map.legend.` keys named.
- `core/i18n/ru.ts` / `et.ts` — re-pointed + each anchored on the `MACHINE DRAFT`
  marker in its legend comment blocks (the full sentence would not fit the
  one-line quoted-phrase rule; the 13-char token does the pinning).

### Backend services / controllers (lane-touched)
- `ShelterReportService.java`: `:348-358` kept + `autoConfirmIfEligible` named;
  `:351` kept + the threshold expression named; `:375-379` → `:360-385` (whole
  `distinctConfirmers`); `:264-266` kept + `autoConfirmIfEligible` named;
  `:380-383` kept (the inline submitter removal — no symbol, recorded);
  `:161,213,250-252` kept + `requireVerified` named; `:276-280` → `:269-280`
  (whole `hideTally`, `NON_EXISTENT` token already in the clause).
- `AdminModerationService.java` (the filed, never-re-derived drift):
  `:382-406,408-425` → `:414-438` (`openReportPage`); `:311-315` → `:311-326`
  (the `excludeDismissed` overload's javadoc + signature, the X-Total-Count
  sentence at 316-317) with `listShelterReports` named; `:382,415` → `:414,448`
  (`openReportPage`/`openReportCount` starts).
- `AdminController.java:397` — kept (verified: the `excludeDismissed`
  `@RequestParam`; already tokened).
- `GuidanceService.java`: `:802-807` → `:802-827` (whole `resolveHeroOnSave`
  javadoc + signature); `:839-850` kept + anchored on the catch's own words
  "A failed import NEVER blocks the save"; `:845-849` kept (inline fallback in
  the catch — no symbol, recorded); `:826-834,853-860` split into two citations,
  `:853-860` (the `isHeroImportedFrom` unit, tokened) and `:826-34` (the
  no-re-fetch branch, tokened by the guard-name).
- `HeroImageImportService.java`: `:24-27` → `:23-26` (the SAVE-time sentence; was
  cut at a blank line); `:28-33` → `:28-35` (the whole REQUIRES_NEW paragraph —
  the old range ended mid-sentence). Both are class-javadoc statements — no
  symbol, recorded.
- `Pagination.java`: `:20-28` → `:20-30` + `Pagination` named (class declaration
  joins the rule paragraph); `:112-122` → `:112-123` + `Paged` named (record
  declaration); `:50-58`/`:66-74`/`:102-110` extended to their javadoc starts
  (symbols already named in the clause); `:33` kept.
- `ShelterDto.java:127-134` — kept (phrase-anchored, verified); `:126,134` with
  the two field names named in the clause.
- `SecurityConfig.java:183-188` — range kept (verified: the exposed-by-name
  comment + `setExposedHeaders` call), symbol named in the clause (the
  ANCHOR-PASS report had flagged this exact one for a future pass).
- `SpringDataShelterReportRepository.java` (touched by SIMPLIFY-MODERATION's
  `countOpen()` seam add): `:17-20` (×2) → `:16-22` (whole
  `reportersByShelterAndType` query unit) with the method named; `:25-28` →
  `:24-29` (`countByTypeForShelterIds`, named); `:32-36` → `:31-39`
  (`latestByShelterAndUserForShelterIdsAndType`; the "last verified" phrase
  already in the clause).

## 4. Deliberately left alone (and why)

- **`domain/**` (ReviewStatus:20-23, Shelter:74, ShelterReport:26-28/:30/:41,
  Provenance:59-80/:65-69, GeoPoint:7-10,22-24)** — the domain layer: small
  records/enums, no lane rewrote them this run (only line-count-preserving comment
  rewordings), and the tokened ones are already pinned. Spot-verified the bare
  ones against the code (all still true). Converting five stable enums/records
  would be churn the run's "smallest correct change" rule forbids.
- **`ingestion/**` (CsvRegistryClient ×3, Lest97AxisOrder ×2)** — untouched by
  this run (verified absent from the 43bebe7..HEAD diff); anchors re-derived
  against exactly this code in the pre-run pass.
- **`api/SubmitterVerification.java:10-13,26-33`** — untouched by this run
  (absent from the diff); spot-verified the two ranges still carry the
  derive-on-read statement and the four constants.
- **`design-tokens.spec.ts:64-66,73-88`** — a pinned guard spec (a verified
  mechanism, run rule "keep the verified mechanisms alone"); the ranges verified
  correct. The three drifted spec citations (§2.4) got range fixes only — the
  spec itself is not converted to a new citation style.
- **`styles.scss` token-value lists (`:3`, `:279`, `:91,102,115,171,182,187`,
  `:388,393,398,430-432`, `:182,431`, `:102,115`, `:393,398`)** — verified
  still correct (the reflow growth was in the marker region, not the token
  blocks). No symbol: each cited line is a self-naming `--token: value`
  declaration whose name is already in the state table above the bullet.
- **`styles.scss:33-36` (hazard 3)** — the one-line-rule comment; comment anchor,
  verified, no symbol.
- **Migrations (`V33__…sql:4-5,13-20`)** — applied migrations are untouchable
  (rule 5); verified the statements still match the claims.
- **`frontend/package.json:6`, `frontend/proxy.conf.js:7-16`** — stable config,
  verified.
- **Dated records (`reviews/…`, `docs/autopilot/findings/LEDGER.md:265`)** — by
  definition stable history.

## 5. Result tally

Final prescan of the edited doc: **110 citations / 72 tokened / 37 files / 6 bare
paths — floors 107/26/35/4, 0 failing** (guard-logic port; the real guard runs in
§6). Baseline was 107/26/35. Delta, per citation instance:

- **55 re-pointed or re-scoped** — 4 of them to a different file (the §2.3
  `legend-view.ts` moves), 11 of them the §2.1 `styles.scss` marker cluster, the
  rest reflow shifts (core/i18n, theme-tokens, the spec) or whole-unit extensions
  (javadoc + signature).
- **3 added** — `map-page.html:16-17` (the toggle buttons' own lines),
  `ShelterDto.java:126,134` (the two count fields), `:826-834` (the split of the
  idempotency citation).
- **52 left at their committed ranges** — every one re-verified against the
  current code (the §4 list); where the clause carried no machine-derivable
  token, a symbol or the code's own words was named in-window without moving the
  range (e.g. `setExposedHeaders`, `requireVerified`, `hideTally`,
  `autoConfirmIfEligible`, the `nonexistentReports`/`inaccurateReports` pair).

Tokened count rose 26 → 72: the conversions moved each citation from
structural-only to symbol- or phrase-pinned, except the 38 deliberately
structural ones (the §4 population + the four `styles.scss` value lists, the
module-javadoc cite, the it()-title pins, the frozen SQL, the dated records).

## 6. Gate evidence

(both gates run detached under `flock /tmp/openshelter-mvn.lock`, rule 7; exit
files read after completion)

| Gate | Tree | Command | Result |
| --- | --- | --- | --- |
| A — full | working tree | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** — 1339 run / 0 failure, PMD clean, "All coverage checks have been met", BUILD SUCCESS (`/tmp/gateA.log`, `/tmp/anchorgateA.exit`) |
| B — the commit tree | `git archive HEAD \| tar -x -C /tmp/x` + `tar -cf - --exclude=.git --exclude=target --exclude=node_modules . \| tar -xf - -C /tmp/x` (rebuilt from the final tree; doc + report diff-verified in sync) | `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean test -Dtest=DocumentationFactsTest -Ddependency-check.skip=true` | **exit 0** — 21/21 (`/tmp/gateB3.log`, `/tmp/anchorgateB3.exit`) |

Gate B invocation note: the task wording said `verify`; the first run used it
and exited 1 on **jacoco's coverage floor** ("lines covered ratio is 0.00, but
expected minimum is 0.93") — a mechanical consequence of `-Dtest=` running one
of 1339 test classes, not a doc failure (`DocumentationFactsTest` itself was
21/21 in that run too). The repository's established single-test protocol
(`reviews/code-review/anchor-pass.md`, the previous anchor lanes) uses the
`test` goal so the jacoco check never engages; the re-run above follows that
protocol and is the reported result. Both invocations' logs are on disk for
the parent.

## 7. Unverified / for the parent

- The doc carries planning-id mentions in prose: "(wave 7)", "(wave 8)" (§4) and
  "(Wave 9 moved it from publish to save)" (§5). The id-vocabulary guard does not
  scan `docs/agent/` (this tree is green with them present), so they are
  guard-invisible — but they are history in a current-state file, against the
  file's own standing rule ("history lives in dated records"). I did not reword
  them: that is a content edit outside anchor scope.
- `docs/agent/00-CURRENT-STATE.md` and `reviews/code-review/anchor-convert.md` are
  my two edits; nothing else in the working tree is mine.
