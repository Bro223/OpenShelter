# GUARD-GAP — the no-unresolvable-ids guard was checking nothing

Lane report for the `code-review` run. Owns `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java` only. No commits.

## Mandate

BE-RECON (`reviews/code-review/be-recon.md` §4.1–4.2, §6.7; notes-board entry) flagged that
`SourceVocabularyTest` was supposed to fail when a source comment carries a planning id a reader
cannot resolve (`Wave 9`, `W2-A`, `M9`, …) but its forbidden-pattern list matched almost nothing
in the live tree — so the rule passed vacuously. This lane: (1) proved the gap empirically before
touching anything, (2) widened the guard deliberately, (3) cleaned every file it owns, (4) left
owned files alone and filed notes-board entries for them, (5) proved the widened guard can fail,
(6) ran the detached gate.

## 1. The gap, measured before any change

Census over the guard's actual scan tree (`src/main/java`, `src/test/java`, `frontend/src`;
`.java`/`.ts`/`.html`/`.scss`; skipping `target`, `node_modules`, `.angular`, `dist`):

| Measure | Value |
|---|---|
| Files scanned | 766 |
| Lines scanned | 136 518 |
| Lines hit by the guard's EXISTING patterns | **0** |
| Lines hit by the candidate new shapes | **1 210** (all 1 210 match nothing the old patterns catch) |

Line hits per new shape: `D\d+` 715 · `M\d+[a-z]?` 180 · `W\d+-[A-Z]` 179 · `P\d+-\d+` 62 ·
`Wave \d+` 48 · `wave \d+` 33. Top token census: `D4` ×160, `W2` ×117, `D1` ×110, `D2` ×109,
`D3` ×106, `D5` ×87, `D6` ×81, `D8` ×70, `D7` ×65, `P2` ×59, `W3` ×46 — and `V26` ×45, which is a
Flyway migration name and must stay legal.

Baseline run of the old guard on the live tree: **exit 0** (green on a tree that contains the ids).
The gap is real: the guard scanned the whole tree and found nothing.

## 2. What was widened, and why exactly these shapes

Six patterns added to the existing list (migration names `V\d+__*.sql`, i18n dotted keys, spec
paths, class names, standards like `WGS84`/`E164`/`SHA256`, hex literals all stay legal):

| Pattern | What it is | Why it is safe |
|---|---|---|
| `\bWave \d+` / `\bwave \d+` | a rollout wave cited in prose | no English sentence or code token pairs the word "wave" with a bare number |
| `\bW\d+-[A-Z]\b` | a wave-task id (`W2-A`, `W3-B`) | a W-digit-dash-letter token is not a code identifier |
| `\bD\d+\b` | a decision id | no identifier in the tree is a bare D + digits |
| `\bM\d+[a-z]?\b` | a milestone id (`M5b`) | same; a fixture that carries this shape is a local name to rename, not an allow-list |
| `\bP\d+-\d+\b` | a plan-row id (`P2-9`) | digit-dash-digit after P is not a version (versions have no dash) |

Deliberately **not** forbidden, each for a measured reason: bare `W\d+` (1 hit, ambiguous),
`N\d+` (legitimate test data: N users in ITs), `F\d+`/`A\d+`/`B\d+` (batch letters, standards,
`B2..B11` i18n batch markers that resolve to key blocks in-tree), `H\d+`, `K\d+`, `T\d+` (collide
with test data and standard letters), `U\d+`. The one collision found in the census — the JPEG
start-of-image byte pair written in prose as `FF D8` — was resolved at the source: the only
occurrence (`MediaImageInspector.java:118`, guidance lane's file) now reads the hex literal
`0xFFD8`, where the word boundaries refuse to match.

## 3. The matched-count floor (reformat resistance)

A vocabulary guard that passes by shrinking its walk is as hollow as one that passes by matching
nothing. The test now also fails if the walk degrades:

- `src/main/java` ≥ 300 files (measured 358)
- `src/test/java` ≥ 150 files (measured 184)
- `frontend/src` ≥ 180 files (measured 224)
- total scanned lines ≥ 110 000 (measured 136 518)

Floors sit below measurement so ordinary churn stays green; a move, rename or skip-list change
that would let the guard check nothing goes red with a per-root message.

## 4. The fallout, handled honestly

With the widened guard the live tree was red at **1 118 lines / 282 files** (the tree moved under
me — sibling lanes edit concurrently — so I always re-measured).

**Cleaned by this lane: 242 files, ~965 comment/annotation lines** — every scanned file outside
another lane's ownership. The transform rewords the comment to state the constraint (or points at
the durable spec path, e.g. `(admin-moderation)` stays, `D3` goes) and preserves line counts
(`DocumentationFactsTest` pins ranges by line). Durable names that DO resolve were kept: OpenSpec
change names (`crisis-guidance`, `community-review-queue v2`, `legal-i18n`, …), the `v2`
spec-version, review-pass numbers that are cited in `reviews/` (`backend review 06 F9 / 11`).

Two behaviour-adjacent strings needed care, both handled:

- **OpenAPI annotation strings** (7 lines across `AdminController`, `AdminShelterDto`,
  `DataSourceController`, `ShelterController`, `ShelterDto`, `RegisterRequest`) feed
  `docs/api/openapi.json`, which is byte-pinned by `OpenApiSnapshotIT`. I reworded the
  descriptions and **regenerated the snapshot** (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT
  test` → 18-line diff, exit 0). The doc-quoted phrase pinned by `DocumentationFactsTest`
  ("EITHER report kind turns the pin red when open", `ShelterDto`) was preserved verbatim —
  verified by the facts test itself.
- **`CommunityReviewIT`** used `M5b …` as test-data shelter names; renamed consistently on both
  sides of every assertion (`"M5b varjend"` → `"varjend"`, payload + `jsonPath` expectation), so
  the test logic is untouched.

**Left alone (owned files) — filed on the notes board with file:line:**

| Owner | Files (lines, as of guard run 2026-09-24T04:29+03:00) |
|---|---|
| SIMPLIFY-CONFIG | `config/{ApiDocsGuard:62, DevEndpointsGuard:57, DevSenderGuard:65, FailClosedGuard:6, JwtAuthenticationFilter:39, MediaConfig:11, OpenApiConfig:78,124,174,215,259, ProdJwtGuard:63}.java`; `test/config/{DocumentationFactsTest:46,121,155,442, FailClosedGuardTest:15, JwtAuthenticationFilterTest:102}.java` |
| SIMPLIFY-ADMINPAGE | `admin-page.ts:53,76,88,102,110,121,132,226,831`; `admin-page.html:8,122,219,272`; `admin-page.spec.ts:85,150,412,519,1075,1386,1631,2184,2231,2865,2999,3140,3714,3716,3832,3836,3894` (in-flight rewrite — treat as shapes to sweep) |
| PARENT — FE guard specs | `design-tokens.spec.ts` (27 lines, e.g. :16 `Wave 15`), `architecture.spec.ts:4,24,51`, `hero-geometry.spec.ts:2,116` |
| PARENT — forbidden tree | `persistence/ShelterRepositoryIT.java:49,61` (run rule 3 forbids every lane the persistence test tree) |

`guidance/**` (SIMPLIFY-GUIDANCE) and `ApiErrorHandler.java` (SIMPLIFY-CONFIG) were **already
cleaned by their lanes while running** — their sweep predates my guard run, so they appear in no
residual list.

## 5. Proofs the guard can fail

1. **Red proof.** A throwaway unowned file `src/main/java/ee/sheltermap/GuardGapRedProof.java`
   carrying `Wave 9` in a comment: the guard failed, naming
   `GuardGapRedProof.java:5` and the exact line. File deleted afterwards.
2. **Floor proof.** The compiled guard run from a throwaway module (`/tmp/floor-test`) containing
   2 files under `src/main/java`, 1 under `src/test/java` and no `frontend/src`: it failed with
   the per-root floor messages ("only 2 source files were scanned under src/main/java (the floor
   is 300) … this guard would check nothing"), not with violations. A reformat cannot shrink the
   walk into silence.

## 6. Final guard state

Widened guard on the tree as of my last run: **red, on owned files only** — 164 violation lines
across the 18 files in the table above, **zero violations in any file this lane could own**. That
red is the intended finding: the minimal cleanup set is exactly that table, and the owning lanes
have been told on the notes board.

## 7. Gates

- Old guard, live tree (baseline): exit 0 — proved vacuous.
- Widened guard, pre-cleanup: exit 1 — proved it bites.
- Widened guard, post-cleanup: exit 1 on owned files only (section 6).
- `OpenApiSnapshotIT` with `-Dopenapi.update=true` (snapshot regen): exit 0.
- Detached full `mvn -B -ntp test` (`/tmp/guard-gap/gate.log`, `/tmp/guard-gap/gate.exit`):
  **exit 1 — 1356 tests, 2 failures, 0 errors.** Both failures are accounted for:
  1. `SourceVocabularyTest.sourceContainsNoUnresolvableIdReferences` — this guard, red on
     owned files only (section 6). That red IS the finding; it clears as the owning lanes sweep
     their 18 files.
  2. `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` — the two
     `admin-page.ts` anchors (:515, :603-618) drifted under SIMPLIFY-GUIDANCE's in-flight
     rewrite; that lane's notes-board entry says the shared gate stays red until it re-derives
     them. Not caused by this lane (all my edits were line-count-preserving).
  Everything else — including `OpenApiSnapshotIT` (snapshot regen coherent) and every test around
  the 242 files this lane cleaned — passes.

## 8. Unverified / caveats

- Frontend type-check was not run by this lane: my frontend edits are comments, HTML comments,
  SCSS comments and spec-title strings only; the FE lanes' own ng gate plus the parent's full gate
  cover them.
- Line counts in section 4/6 are snapshots: SIMPLIFY-ADMINPAGE is mid-rewrite, so its numbers
  drift until that lane lands. The notes entry tells it to sweep the id *shapes*, not the line list.
- `docs/agent/00-CURRENT-STATE.md` anchor drift from this lane's comment edits: none introduced —
  every edit was line-count-preserving, and no cited clause carries a removed id token.
