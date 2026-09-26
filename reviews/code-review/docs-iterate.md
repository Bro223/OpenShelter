# DOCS-ITERATE — `docs/agent/00-CURRENT-STATE.md` brought to match the code

Lane: DOCS-ITERATE (branch `code-review`, no commits — parent commits).
Scope: `docs/**` only — `docs/agent/00-CURRENT-STATE.md` (the one doc edited),
this report, and one appended board entry in `docs/autopilot/CODE-REVIEW-NOTES.md`.
No code, test, frontend or openspec file touched.

Method: every cited `file:line` in the doc was re-derived against the working
tree with numbered line dumps (not grep-and-trust); a local mirror of the
`DocumentationFactsTest` anchor rules (`/tmp/docs-iterate/check_anchors.py`) was
used for fast iteration; the authoritative check is the pristine
`git archive HEAD` overlay + the guard itself (§6).

The design lane (DESIGN-REVIEW) restructured §1 in the same area while this
lane was running (mtime 02:34:36). Per the parent's instruction the file was
re-read from disk before every edit and reconciled, not overwritten: their
rewording of the removed unverified-pin state is kept verbatim; this lane
fixed anchor precision inside their wording only. Where the two covered the
same claim, their wording was the more accurate one everywhere except the
anchor ranges listed in §2, which this lane re-derived from the code.

## 1. The removed unverified pin state — verified gone, prose/table/shape aligned

The doc's trust-ladder table has five rows (Community (no depth) / Partial /
Full / Reported / Registry) + the Picked/anchor UI row; the plain-yellow-circle
row is cited to the plain-circle rule + owner-decision record at
`styles.scss:820-867`. Verified against the code: `markerTone`
(`leaflet-service.ts:50-91`) resolves reported → USER depth → registry with no
unverified branch; `verificationTone` (`shelter-copy.ts:84-101`) returns
`'partial' | 'full' | null` — no triangle anywhere; the marker CSS family
(`styles.scss:810-920`) has no triangle rule; `LEGEND_TONES`
(`legend-view.ts:4-11`) is the four selectable tones with the plain `user`
tone and the anchor both deliberately excluded; the legend template comment
(`map-page.html:16-17`) says "the four pin-tone entries". No residual
triangle/unverified wording remains in the doc. The RU/ET MACHINE DRAFT
entries (`ru.ts:196-198`, `et.ts:190-192`) remain flagged in *Unsettled*,
untouched.

## 2. Corrections applied (before → after, all re-derived from the code)

| # | Claim | Before | After | Why |
|---|-------|--------|-------|-----|
| 1 | §1 pick pin is `setPick` | `leaflet-service.ts:288,285` | `:288,299` | 288 = the signature ✓ but 285 is a setPick-javadoc line ("Null args remove the"); the pick marker's `shelter-marker--pick` className is at 299. |
| 2 | §1 depth bullet — the orphaned-row half of the V35 claim carried no anchor | only `SubmitterVerification.java:10-13,26-33` | + `ShelterQueryService.java:412-414` (the orphan-serving read) | Anchor discipline: every claim needs its code. 412-414 is `author == null ? SubmitterVerification.stored(snapshot) : SubmitterVerification.of(levels)`. |
| 3 | §2 `requireVerified` gate (403) | `ShelterReportService.java:161,213,250-252` | `:161,212,249-251` | reportOccupancy's gate is at 212 (213 is the `requireShelter` line); the `putOpenStatus` canWrite gate block is 249-251 (252 is the `requireShelter` line). |
| 4 | §2 hide tally `hideTally` | `ShelterReportService.java:269-280` | `:268-279` | The javadoc starts at 268 and the method closes at 279; the old range started mid-javadoc and ended on the trailing blank line. |
| 5 | §4 the six `{list}Page`/`{list}Size` checks | `admin-page.ts:453-468` | `:453-467` | The six `check(...)` calls are 453-467; 468 is the first line of the separate `source`-chip comment. |
| 6 | §4 the two remaining chips | `map-page.ts:321-329` | `:318-331` | The claim covers BOTH chips: `toggleOpen` javadoc+method is 318-325, `toggleHasCapacity` 327-331. The old range started mid-javadoc and ended mid-method. |
| 7 | §5 no-re-fetch guard | `GuidanceService.java:826-834` | `:831-835` | The `isHeroImportedFrom` guard branch is 831-335 (the `}` at 335 closes it); 826-827 is the signature, 828-830 is the different no-URL branch. |
| 8 | §4 planning vocabulary | "(wave 7)" / "(wave 8)" parentheticals | removed | The doc's standing rule puts history in dated records; wave numbers are unanchored planning ids. (Not a guard necessity — `SourceVocabularyTest` scans `src/`+`frontend/src` only, not `docs/` — a discipline fix.) |
| 9 | §5 planning vocabulary | "(Wave 9 moved it from publish to save)" | removed | Redundant — the same bullet already anchors the trigger move to `V33__guidance_hero_import_on_save.sql:4-5`, whose header carries the publish→save history. |
| 10 | Layout — Flyway head | absent (HEAD stops at V33 in §5) | new Migrations bullet: V35 + V34 + V33 | See §3 — the filed V34/V35 staleness. |
| 11 | §1/§4/§5 rewordings from the design lane | their 02:34:36 version | kept unchanged | Reconciliation, not override. |

One edit I made and then reversed in-iteration: I first re-pointed
`LEGEND_TONES` from `:4-11` to `:4-12` assuming a two-line declaration; the
current declaration is one line (11), so `:4-11` (comment + declaration) was
already exact. Reverted before the final overlay.

## 3. The filed Flyway staleness (V34/V35) — resolved, with a correction to the old claim

- **HEAD's doc** has no V34 or V35 mention anywhere — its last Flyway
  reference is V33 in §5. The tree's migration head is
  `V35__shelter_submitter_verification_snapshot.sql`, with
  `V34BlindIndexFramingMigration` (Java) before it.
- **The pre-restructure working tree** carried a Flyway bullet naming
  `V34__user_login_tracking.sql` "(last/first login columns + the 11-month
  index)". **No such file exists in the tree, and the description is wrong**:
  V34 is the Java migration `src/main/java/ee/sheltermap/migration/
  V34BlindIndexFramingMigration.java` — it recomputes every stored user
  blind index under the unambiguous length-prefix framing
  (`uint16be(len) ‖ part` for domain AND value), and is Java because the
  recomputation needs the app's env key, which SQL cannot hold
  (class javadoc 14-20; declaration 52). No migration in the tree adds
  login columns.
- The design lane's 02:34 restructure dropped the whole Flyway bullet, which
  would have left the doc with no V34/V35 coverage at all. The new Layout
  bullet restores the head correctly: V35 cited to
  `V35__shelter_submitter_verification_snapshot.sql:1-8` (the decision header:
  depth twin of the V31 boolean snapshot, frozen at submission, re-frozen at
  erasure) + V34 cited to the Java migration + V33 cross-referenced to §5.

## 4. The V35 depth clause — verified accurate as reworded

The doc's §1 now says: depth is derived on every read for rows with a live
author (a one-channel row upgrades itself when the second channel is
confirmed); an orphaned row serves the depth frozen onto it at erasure (V35).
Verified against the code: the live-derivation javadoc
(`SubmitterVerification.java:10-13`), the enum (`:26-33`), the orphan-serving
read (`ShelterQueryService.java:412-414`), the `stored()` seam
(`SubmitterVerification.java:55-64` via the Layout bullet), and the V35
migration header (`:1-8`). The `ShelterDto` `@Schema` text (115-121) matches
the same semantics. No "nothing is stored on the shelter"-style clause
survives in the doc — the stale absolute statement is gone (it was invalidated
by the V35 write-time snapshot + erasure re-freeze).

## 5. The two catalog translation findings — status confirmed, not edited

- **`map.legend.unverified` unused** (filed by REMOVE-UNVERIFIED-PIN, board
  line 120): **no longer outstanding** — DESIGN-REVIEW removed the key from
  all four catalogs as board-requested (board line 142; `grep -rn
  "legend.unverified" frontend/src` → 0 hits per their entry). Nothing to do
  in the doc: no doc line references the key.
- **`how.sources` triangle wording** (board lines 120/142/145): **still
  pending native review, recorded on the board** ("stands as filed";
  "Proposal, NOT applied (owner call)"). No catalog file was touched by this
  lane; the doc's *Unsettled* section is unchanged.

## 6. Gates

- **Pr pristine overlay:** `git archive HEAD (d0982c9)` extracted to
  `/tmp/x`, working tree overlaid (`--exclude=.git --exclude=target
  --exclude=node_modules`).
- **`DocumentationFactsTest`** in the overlay under `flock
  /tmp/openshelter-mvn.lock`: **exit 0 — Tests run: 21, Failures: 0, Errors:
  0, Skipped: 0** (log `/tmp/docs-iterate/guard-out.txt`). Note: a JaCoCo
  "Unsupported class file major version 71" instrumentation warning is logged
  on this JDK-27 environment but is non-fatal (exit 0).
- **Local anchor mirror** (same rules as the guard): 114 citations (floor
  107), 72 tokened (floor 26), 40 cited files (floor 35), 7 bare paths (floor
  4); all range and token checks pass on the final tree.
- **Full Maven gate** (`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean
  verify -Ddependency-check.skip=true`, detached, log
  `/tmp/docs-iterate/fullgate.log`, exit file `fullgate.exit`): launched
  against the same overlay — result recorded in §8.

## 7. Iteration count and what each iteration caught

1. **Pass 1 — line-by-line verification sweep** of every cited span (all nine
   doc sections + Layout + Unsettled): found the six range imprecisions (#1,
   #3, #4, #5, #6, #7), the missing V34/V35 coverage (§3), and the
   unanchored orphan-snapshot half of the §1 depth bullet (#2). Applied all
   edits.
2. **Pass 2 — mirror re-run:** caught the V34 citation failing the
   tokened-check (the window's only backticked identifier,
   `V34BlindIndexFramingMigration`, was not in the cited lines — my line
   count for the class declaration was off: it is at 52, not 39). Fixed to
   `:14-20,52`; mirror green.
3. **Pass 3 — overlay guard:** first-run green (21/21).
4. **Pass 4 — final reconciliation re-read:** caught my own `:4-12`
   LEGEND_TONES over-reach (§2 #11 note) — reverted to `:4-11` (the exact
   comment+declaration span), mirror re-run green.
5. **Pass 5 — full gate** (detached).

So: 5 iterations; 2 self-caught errors (the V34 line count, the LEGEND_TONES
range), both fixed before the final gate.

## 8. Full gate result

- **Full Maven gate** on the pristine overlay (HEAD `d0982c9` + working tree,
  `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true`, detached): **exit 0 — BUILD SUCCESS,
  Tests run: 1364, Failures: 0, Errors: 0, Skipped: 0** — exactly the
  expected post-V35 baseline (log `/tmp/docs-iterate/fullgate.log`, exit
  file `fullgate.exit`).
- The gated tree was built before the final `:4-12 → :4-11` two-character
  doc revert; the overlay was rebuilt with the final tree and
  `DocumentationFactsTest` re-run there: **exit 0 — Tests run: 21,
  Failures: 0, Errors: 0, Skipped: 0** (`/tmp/docs-iterate/guard-final.txt`).
  A doc-citation two-character change cannot affect the 1364-test backend
  tally (backend content in the overlay = HEAD, unchanged).

## 9. Extra findings (filed on the board, not fixed — outside docs/** scope)

1. **`shelter-copy.ts:87-91` stale javadoc** — "The SHAPE carries the depth so
   the distinction never rests on colour alone (WCAG 1.4.1)… the colour
   family … is a second cue, not the only one" is no longer true after the
   triangle removal: partial and full are the SAME circle shape, hue is the
   only visual cue (words beside the pin carry the rest). Same class of stale
   comment as `styles.scss:873-875` ("Shape + hue carry the depth"), which
   DESIGN-REVIEW already filed (board line 143) with a proposed
   line-count-preserving rewording. The shelter-copy twin was not on the
   board; appended.
2. **`styles.scss:873-875`** "Shape + hue carry the depth" — already filed
   (board line 143, DESIGN-REVIEW), still outstanding, confirmed present in
   the current tree. Left as-is (frontend file, not docs).

## 10. Deliberate omissions

- No edits to `map-page.scss`, any i18n catalog, or any other frontend file —
  the two catalog findings and the stale code comments above are board items
  for the owning lanes/owner.
- No changes to the doc's structure or claims beyond anchor precision and the
  V34/V35 restoration — the design lane's rewording stands.
- The bare `ShelterReport.java:30` / `:41` table cells in §2 were left as-is:
  they resolve against the last full citation per the guard's relative-path
  rule, the guard passes them, and re-pointing them would be churn without a
  correctness gain.
- `AdminModerationService.java:311-326` (X-Total-Count clause) kept as a
  whole method-head citation (javadoc 311-321 + signature 322-326): it fully
  contains the claimed sentence (315-317) and is the stable shape; the
  board's earlier `:311-315 → :312-316` delta described a different, older
  citation that no longer exists in the doc.

## 11. Unverified / residual risk

- The full gate runs on the overlay built before the final two-character
  `:4-11` revert; the doc guard is re-run on the final tree in §8.
- The JaCoCo/JDK-27 instrumentation warning in the guard log is environmental
  (non-fatal, exit 0) — consistent with the 2026-09-21 JDK-27 finding the
  doc's *Unsettled* section already carries; not re-adjudicated here.
- `how.sources` native-review outcome and the RU/ET MACHINE DRAFT review are
  open items outside this lane (board + *Unsettled* section).
