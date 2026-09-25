# REMOVE-UNVERIFIED-PIN — the unverified pin state removed; the erasure invariant pinned — and a bug found

**Lane:** REMOVE-UNVERIFIED-PIN · **Branch:** `code-review` (no commits — parent commits) ·
**Scope:** the map's pin/legend surface (`leaflet-service.ts`, `styles.scss`, `theme-tokens.ts`, `legend-view.ts`, `map-page.{ts,html,spec.ts}`, `shelter-copy.ts`, `leaflet-service.spec.ts`, `design-tokens.spec.ts`) + one NEW backend test file. `index.html` needed no change (lockstep held). No production code changed anywhere; the i18n catalogs and `map-page.scss` are foreign-lane files — reported, not edited.

---

## 1. Job 1 — the distinct "unverified" pin state is gone

The owner decision: a community row whose submitter depth the API does not report renders the **plain default community marker** — the community-yellow circle, the base 2px surface edge, no verification affordance of its own. The verified depths are untouched: **partial** = the yellow circle (one confirmed channel), **full** = the green circle (two or more), **reported** = red-orange, **registry** = blue.

### 1.1 What changed, file by file

| File | Change | Line delta |
|---|---|---|
| `shared/leaflet-service.ts` | `markerTone()` still returns `'user'` for the no-depth USER row — the class contract is unchanged; its javadoc (L50–68) and the class javadoc (L106–109) now state the plain-circle semantics and the removal. Body L69–91 byte-identical. | 14+/14− (neutral) |
| `styles.scss` | The 48-line triangle rule (pseudo-element edge drawing) is replaced by the plain circle rule `background: var(--color-shelter-user)` — geometry (50% radius, edge, shadow) inherited from `.shelter-marker`. The 48-line slot is filled with the decision record (why no grey exists, why the class name and token are kept, what the legend does and does not carry, what was deleted). **The file stays exactly 920 lines — byte-aligned with every anchor (see §3).** | 43+/81−, net 0 |
| `core/theme-tokens.ts` | One comment reworded in place (L141): the unverified-triangle wording → the community-yellow-as-default-marker wording. All token values untouched. | 1+/1− (neutral) |
| `index.html` | **No change.** The prepaint carries no unverified-specific value — the three theme homes stay in lockstep with zero delta here. | — |
| `features/map/legend-view.ts` | `LEGEND_TONES` is now the four SELECTABLE tones `['registry','partial','full','reported']` (L11). The `user` tone is deliberately not a member — the default state has no filter entry (javadoc says so). | 5+/5− (neutral) |
| `features/map/map-page.ts` | Two-statement import (`import type { LegendTone }` + `import { LegendFilterView }`, house style); the filter composes through a new private `tonePasses(row, tones)` (L247–257): zero tones selected = everything shows, and a `user`-tone row passes **only while no tone is selected** (it is never a member of a selection). `showEmpty`/chip logic untouched. | 16+/4− (net +12, all below L95) |
| `features/map/map-page.html` | The user legend button block (18 lines) deleted; header comment "five pin-tone entries" → "four". Legend is now: registry, partial, full, reported (the fourth toggle at L82), the anchor diamond stays an inert sixth entry. | 1+/19− (all below L17) |
| `shared/shelter-copy.ts` | `verificationTone` javadoc L89–91 reworded (the "default circles" wording). No behaviour. | 3+/3− (neutral) |
| `shared/leaflet-service.spec.ts` | One 8-line history comment reworded: the recency-regression description no longer calls the no-depth tone "an unverified tone" (it is the plain community marker). Every render assertion untouched — the no-depth rows still render `.shelter-marker--user`, which is now the plain circle. | 7+/7− (neutral) |
| `design-tokens.spec.ts` | The contrast/meaning pins reworded (13 lines, all in-place, net 0): the marker-meaning pin (L949) now pins **four** pin meanings + the pick teal (`green=verified, yellow=community, blue=registry, red-orange=reported, teal=picked`) instead of five including the unverified triangle; the "no grey in the pin palette" claim survives verbatim in the tokens it checks (the plain circle uses the community yellow — still no grey). | 13+/13− (neutral) |
| `features/map/map-page.spec.ts` | The pins follow the decision (details §1.3). | 56+/40− |

**No dead token.** `--color-shelter-user` is still consumed by two rules in every theme home (the `--user` default marker and the `--partial` circle); `--color-shelter-pick`, `--color-verified`, `--color-reported`, `--color-shelter-registry` all keep their consumers. The only dead CSS was the triangle's pseudo-element pair and the foreign-lane `map-page.scss` swatch override (reported, §1.5).

### 1.2 The behaviour, precisely

- `markerTone()`: reported (either kind of open report) → `reported`; USER rows by depth — absent → **`user` (the plain default community marker)**, one channel → `partial`, two or more → `full`; everything else `registry`. No recency term (the "Newly added" badge, not the pin, says NEW).
- Legend = filter, display-only: four toggle entries, `?tones=` URL-only, no refetch. A row in the default `user` tone is **visible by default** and is excluded by any tone selection (it belongs to no selectable tone) — never hidden behind its own entry, because it has none.
- **Stale links**: `?tones=user` from a pre-change bookmark sanitizes to `/map` (unknown/removed tones drop, the URL normalizes in place) — pinned by a NEW test.

### 1.3 Spec changes (map-page.spec.ts)

1. **The legend test** (L452): six → five entries. The `--user` swatch assertion **flips to `toBeNull`**, `'Added by an unverified user'` flips to `not.toContain`, `.legend-item` count 6 → 5; the comment states the removal and its consequence (no legend entry for the plain default marker).
2. **The filtered-out marker-click test**: the scenario filter switches from the removed user toggle to the **full** toggle (the TALLINN registry row is still the filtered-out row).
3. **The chips-combine test**: rewritten around a new `PARTIAL_CELLAR` fixture (id 53, `USER`, `CONFIRMED`, `submitterVerification: 'PHONE'`) — selecting the partial tone shows exactly that row, and the refetch composition ends at `?tones=partial` (was `?tones=user` with the no-depth BASEMENT row).
4. **The describe header + TONE_ROWS comment**: "five pin-tone" → "four"; "sixth entry" → "fifth"; the TONE_ROWS comment now says the community row carries the plain default marker and is **not a selectable tone**.
5. **The a11y test**: 5 → 4 toggles with the labels `[Registry (Päästeamet), partially, fully, Reported]`; entries 6 → 5.
6. **NEW test**: `a stale link on the removed user tone sanitizes to no filter (the tone is gone)` — `?tones=user` → `/map`, all five TONE_ROWS rendered. (The only count change in the frontend suite: **1581 → 1582**.)

No frozen assertion was weakened: every flipped expectation is a direct consequence of the owner decision, and each new expectation pins a *stronger* fact (the swatch is absent, not merely restyled).

### 1.4 Catalog findings — reported, NOT edited (catalogs are a foreign lane's files)

1. **`map.legend.unverified` is now unused.** The key + its descriptive comments: `core/i18n/messages.ts:217–222`, `en.ts:181–185`, `ru.ts:195–199`, `et.ts:189–193`. Verified no spec enforces key *usage* (catalog-identity / i18n / template-guard all green with the key in place), so nothing is red until the catalog lane removes it — but it is dead copy describing a removed state.
2. **`how.sources` describes the removed shape.** `en.ts:85`: "an unverified submitter shows a **yellow triangle**, a partially verified submitter a yellow circle…" — the triangle no longer exists; the `ru.ts` / `et.ts` twins carry the same claim. The catalog lane should reword to the current model (default community marker / yellow circle / green circle) and remove the `map.legend.unverified` key in the same pass.

### 1.5 Foreign-lane request — `features/map/map-page.scss` (NOT edited)

That file carries another lane's uncommitted changes, so per run rule 3 I left it and filed the request on the board: inside `.legend-swatch` (L153–198) the comment block "The verification TRIANGLE (.shelter-marker--user in styles.scss)" (L164–170) documents the removed shape, the `• triangle` bullet of the inscription comment (L181–184) fits the deleted shape to the slot, and the override `&.shelter-marker--user { width: 10px; height: 10px; }` (L191–194) is now **dead** — no legend entry (or any other element) carries `.legend-swatch.shelter-marker--user` anymore (the triangle's 10px-element/14px-edge inscribing fit had one consumer, the deleted button). The `position: relative` containing-block rationale (L171) is likewise obsolete (no pseudo-elements remain on the swatch). Request: reword the comment to the plain-circle fit and drop the dead override.

---

## 2. Job 2 — the erasure invariant, pinned — **and it found a real bug**

**The owner rule:** when an account is deleted by its owner, the public shelters it submitted **keep the status they had while the account was active** — a fully verified row stays verified, a partially verified row stays partial, an unverified row stays unverified.

**The pin:** new `src/test/java/ee/sheltermap/auth/AccountErasureStandingIT.java` (3 tests; full-stack MockMvc + real Postgres via `AbstractPersistenceIT`, the same seam as `AccountDeletionIT`; no production code touched, persistence tree untouched). Each test establishes the row's standing **while the account is active** (the baseline), erases the account (`DELETE /account` → 204), re-reads the SAME row, and asserts the standing survived:

| Test | Setup (active-account baseline, asserted) | Post-erasure expectation |
|---|---|---|
| `aFullyVerifiedRowKeepsItsVerifiedStanding…` | author with EMAIL + PHONE confirmed → row reads `submitterVerified=true`, `submitterVerification=FULL`, `NEW` | same |
| `aPartiallyVerifiedRowKeepsItsPartialStanding…` | author with EMAIL only → `true`, `EMAIL`, `NEW` | same |
| `anUnverifiedRowStaysUnverified…` | author verifies EMAIL, submits, then the channel is revoked → row reads **no depth** (the boolean keeps the write-time snapshot — the pin's currency is the depth, asserted as absent) | still no depth, boolean unchanged |

**Result — the invariant fails in the exact direction the owner's rule forbids.** Focused run under the lock (`/tmp/erasure-it2.log`, 2026-09-25T22:10+03:00, after the register-bucket property below):

```text
Tests run: 3, Failures: 2, Errors: 0, Skipped: 0
  aFullyVerifiedRowKeepsItsVerifiedStandingAfterTheAuthorErasesTheAccount:155
      JSON path "$.submitterVerification" expected:<FULL> but was:<null>
  aPartiallyVerifiedRowKeepsItsPartialStandingAfterTheAuthorErasesTheAccount:185
      JSON path "$.submitterVerification" expected:<EMAIL> but was:<null>
  anUnverifiedRowStaysUnverifiedAfterTheAuthorErasesTheAccount          PASS
```

Both failures reproduce in the FULL suite as well (final `clean verify`: 1364 run / 2 failures = exactly these two, same assertions — `/tmp/fullgate2.log`). One setup detail, fixed and recorded: the class's `@TestPropertySource` overrides the per-IP **register** limiter (`register-capacity=1000, refill=0`) in addition to login — in the full suite the shared 127.0.0.1 bucket (yml default capacity 10) is exhausted by earlier IT classes in the shared context, and the first full-gate attempt failed the FULL test at SETUP with a 429 on register instead of on the invariant. The override gives the class its own context (fresh limiter ring) — the idiom every auth IT already uses for login; with it, the invariant assertion is the failure in every context.

### 2.1 The bug (reported — NOT fixed, per the lane brief)

The row's standing **degrades on erasure**: a FULL row reads `submitterVerification: null` (i.e. "unverified") after its author deletes the account, and the same for a PARTIAL row.

**Root cause, with the two facts that make it a bug rather than a design:**

1. The **boolean** is a write-time snapshot — `submitter_verified_at_creation` (V31; written at `ShelterService.java:225`) — and it **survives** the erasure: all three tests' `$.submitterVerified` assertions pass post-erasure. That column exists for exactly this scenario (a row's standing must not depend on the author's account).
2. The **depth** is **live-derived on every read** — `ShelterQueryService.java:408–410`: `submitterVerification` is computed from the author's *current active claims*, and `author == null → null`. Erasure deletes the author, so the derivation falls through to null.

So the snapshot the schema was designed to preserve is preserved only in the boolean; the depth — the field the frontend pin actually renders (and the field whose absence *is* the "unverified" state this lane just removed from the map) — silently reverts every orphaned FULL/PARTIAL row to unverified. The owner's rule is broken in the exact direction the snapshot was built to prevent: **erasure strips standing it never had the right to strip.**

**Why the existing suite did not catch it:** `AccountDeletionIT` pins the *opposite* assertion from the owner's rule — it asserts the depth is **absent** post-erasure (it treats "the depth can no longer derive" as the expected behaviour). That pin and the owner's rule cannot both be right; per the lane brief I left every existing test untouched and filed the conflict here for the parent.

**Direction of the fix (parent/owner call — a schema/derivation change, out of this lane's scope):** persist the depth alongside the boolean at write time (e.g. a V35 `submitter_verification_at_creation` snapshot of the confirmed levels), or make the read derive the depth from the snapshot whenever the author is null/erased. Either way `AccountDeletionIT`'s absent-depth pin must be revisited in the same change, since it pins today's (buggy) behaviour.

---

## 3. Anchors — kept valid, drift recorded

`DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode` — **21/21 GREEN on this tree** (live run, `/tmp/docfacts.log`):

- **`styles.scss` stays at exactly 920 lines.** The 48-line triangle slot (L820–867) now holds the plain-circle rule + the decision record, and every rule below it is back on its **original** lines — verified byte-identical by diff: full 869–881, partial 883–885, reported 887–895, pick 897–905, the "red is reserved" comment 898–899, anchor 907–920. The token-value anchors (91,102,115,171,182,187 / 388,393,398,430–432 / theme-tokens 97…142) were kept in place by the in-place comment rewrites.
- **`leaflet-service.ts`, `theme-tokens.ts`, `shelter-copy.ts`, `legend-view.ts`, `design-tokens.spec.ts`, `leaflet-service.spec.ts`** — all line-count-neutral (numstat-verified); every citation into them re-verified token-by-token against the new tree.
- **`map-page.ts`**: +12 lines, all below L95 — the `:94-95` clause ("The list always fetches ALL sources") is unchanged; the `:321-329` clause ("server-side `?hasCapacity=`") **stays valid** (the token `hasCapacity` now sits at L329) but is imprecise: `activeTrustFilter` moved 327 → **339** (javadoc 333–338), `toggleHasCapacity` 316 → **328**. Deltas recorded on the board.
- **`map-page.html`**: −18 lines, all below L17 — the `:16-17` clause is unchanged ("five"→"four" is an in-place word swap).

**Owed to the anchor pass (doc prose, NOT ranges):** `docs/agent/00-CURRENT-STATE.md` §1 "The trust ladder" still describes the removed state in prose — the table row "Unverified community … yellow **triangle**", the "the unverified triangle `.shelter-marker--user`" clause, and "unverified = triangle" in the shape-distinction bullet. All those **ranges are still in-bounds and token-valid** (the test is green); only the wording is stale, and the §"Trust ladder" rewording belongs to the anchor pass per the lane brief. Full delta table on the board.

---

## 4. Gates (all detached)

| Gate | Result |
|---|---|
| `npx ng test --watch=false` | **exit 0 — 1582/1582, 65 files** (baseline 1581 + 1 new test) — `/tmp/ngtest2.log` |
| `npx ng build` | **exit 0** — `/tmp/ngbuild.log` |
| `DocumentationFactsTest` (focused, under lock) | **exit 0 — 21/21** — `/tmp/docfacts.log` |
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 1 — 1364 run / 2 failures = EXACTLY the two Job-2 erasure tests, both on the invariant assertions** (baseline 1361 + 3 mine; every other test green). The red gate is the bug report, not a lane defect — the parent's call is the bug fix or a documented exception for these two pins. Log: `/tmp/fullgate2.log` (an earlier attempt `/tmp/fullgate.log` had the FULL test failing at setup with a 429 register — the shared limiter bucket; the property fix above makes the invariant assertion the failure in every context) |

The two red tests are **not** test bugs and were not touched after going red: they are the invariant the owner asked to pin, and they fail because the code violates the invariant. Per the brief, a failing invariant is a bug to report, not a test to fix. (The one change made after the first red — the register-limiter property override — changed HOW the setup fails in the full suite, not WHAT the tests assert; both red shapes are recorded in §2.)

## 5. Files for the parent's commit

`frontend/src/styles.scss`, `frontend/src/app/shared/{leaflet-service.ts,leaflet-service.spec.ts,shelter-copy.ts}`, `frontend/src/app/core/theme-tokens.ts`, `frontend/src/app/design-tokens.spec.ts`, `frontend/src/app/features/map/{legend-view.ts,map-page.ts,map-page.html,map-page.spec.ts}`, `src/test/java/ee/sheltermap/auth/AccountErasureStandingIT.java` (new), this report, `docs/autopilot/CODE-REVIEW-NOTES.md` (3 appended entries).
