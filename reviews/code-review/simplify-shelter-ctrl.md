# SIMPLIFY-SHELTER-CTRL — shelter write path: one `isAdmin` read, service-owned carry-over

**Lane:** SIMPLIFY-SHELTER-CTRL · **Branch:** `code-review` · **Mode:** behaviour-preserving, except the sanctioned redundant-round-trip removal (job 1).
**Scope (exclusive):** `src/main/java/ee/sheltermap/api/ShelterController.java`, `src/main/java/ee/sheltermap/app/ShelterService.java` (the shelter write path lives in `app/`, confirmed — `api/` holds the query service), and the tests pinning them: `app/ShelterServiceTest.java`, `app/ShelterServiceOwnershipTest.java`, `api/ShelterControllerDetailReadTest.java`. Nothing else touched (diff verified: exactly these five files, backend only).

---

## 1. Job 1 — the triple `isAdmin` round-trip in `addPlace` (performance)

**Before** (`app/ShelterService.java`, `addPlace`, pre-change lines 160/183/201): three separate
`if (!userRepository.isAdmin(user.getId()))` guards — one ahead of the active cap, one ahead of the
daily cap, one ahead of the near-duplicate check. `JpaUserRepository.isAdmin` is a `users.kind`
column read, so every submission on the hot abuse-throttled path paid **three round-trips for the
same column**.

**After:** one `boolean admin = userRepository.isAdmin(user.getId());` after the two fail-first
validation guards (`canWrite()`, ACTIVE/USER-source), and the three guards read the local. The
guards keep their own constraint comments and their original order (active cap → daily cap →
duplicate, the order `theDailyCapPrecedesTheDuplicateCheck` pins). Placement after the validation
guards means a rejected submission pays **zero** `isAdmin` reads — exactly as before.

### The test that would have caught the repetition (counting fake, TDD red→green)

`app/ShelterServiceTest` gains a `CountingAdminUserRepository` (delegates to the in-memory fake,
counts `isAdmin` calls):

| Test | Before (RED) | After (GREEN) |
|---|---|---|
| `addPlaceAsksTheAdminKindOncePerSubmission` | `expected: 1 but was: 3` | 1 call, submission succeeds |
| `anAdminSubmissionAsksTheAdminKindOnceAndStaysExempt` | `expected: 11 but was: 33` (11 admin submissions) | 1 call per submission, all 11 saved (exemption re-pinned) |
| `aRejectedSubmissionPaysNoAdminKindRead` | green (0 calls — placement pin) | green (0 calls) |

RED evidence: `/tmp/ss-ctrl-red.log` — `Tests run: 35, Failures: 2`, both failures the exact
round-trip counts above (the first red attempt was a compile error — missing `AdminUser` import —
not a valid red; re-run after the import is the evidence). GREEN evidence: `/tmp/ss-ctrl-green.log`
— 35/35, exit 0.

**Round-trips before/after: 3 → 1 per submission** (non-admin and admin alike; rejected paths 0 → 0).

## 2. Job 2 — the write path, readable

### 2.1 The 8-field positional carry-over moves to the service

**Before** (`api/ShelterController.update`, pre-change lines 436-465, method body 51 lines): the
HTTP handler constructed a fresh `Shelter` with the 12-argument positional constructor and then
hand-copied eight admin/trust-owned fields (`id`, `createdAt`, `createdBy`, `autoHideDisarmed`,
`reviewNote`, `inaccurateMarkedAt`, `inaccurateMarkedBy`, `submitterVerifiedAtCreation`) plus the
`locationKind` absent-keeps-current default. Any future admin-owned field added to `Shelter` would
be silently zeroed by an owner edit — the recon §6.5 latent hazard — and the "what an owner edit
may touch" rule lived in the controller, far from the rows it protects.

**After:** the controller is flat — auth → `requireOwnedBy` (404/403 *before* the bbox 400, the
documented status-code order) → `requireInsideEstonia` → one service call → DTO read-back
(method body now 19 lines). The row build is the service's:

- `ShelterService.OwnerEdit` — a nested public record: `shelterId, name, latitude, longitude,
  description, capacity, locationKind`. The API request type does not leak into `app`
  (layering held: `app` still imports nothing from `ee.sheltermap.api`).
- `ShelterService.updateOwned(long userId, OwnerEdit edit)` — `@Transactional`, re-checks
  `requireOwnedBy` (the service-boundary guard the ownership test pins), builds the row, applies it
  through the untouched `updatePlace` (trust reset, diff, history, the concurrent-DELETE→404
  mapping all stay where they are).
- `ownerEditRow(Shelter current, OwnerEdit edit)` — private, named, one thing: the writable fields
  from the edit on the loaded row's values, with a javadoc naming every carried-over field and
  stating why `reviewStatus` is deliberately **not** copied (the owner-edit trust reset overwrites
  it in every case — an owner can never self-confirm by editing).

Read counts on the PUT path are unchanged (controller pre-read + service re-check + `updatePlace`'s
diff re-read — three, as before). `JpaShelterRepository.save` copies every domain field onto the
managed entity, so the persisted state is field-for-field the same instance the controller used to
build.

**Tests (written first; red state = compile failure against the not-yet-existing API; the
behaviour they pin was already green end-to-end via the ITs before the refactor):**
`app/ShelterServiceOwnershipTest` now has 15 tests (was 12): the two existing `updateOwned` tests
migrated to the new API (guard behaviour unchanged), plus three new pins:
`anOwnerEditAppliesTheWritablesAndPreservesTheAdminOwnedState` (stamps all four admin-owned fields
+ identity on the row, edits, asserts they ride through and only the writables move),
`anOwnerEditCarriesTheRequestedLocationKind`, `anEditOfAnUnknownShelterIsA404` (the 404 half of the
owner boundary, previously unpinned at unit level).

**Residual hazard (recorded, not fixable in scope):** the fragility now lives in one named helper
next to the save path, but a future admin-owned field added to `domain/Shelter.java` still has to
be added to `ownerEditRow`'s carry-over list. Recon §7.5's final home is a domain method
(`shelter.applyOwnerEdit`) — `domain/` is outside this lane's write scope; filed on the notes
board for the domain lane.

### 2.2 Dead `ShelterRepository` constructor parameter removed

Recon §4.4/§6.6: the parameter was documented "no longer assigned", retained only for "the frozen
constructor signature (the detail-read test seam)". The seam is
`ShelterControllerDetailReadTest` — a test this lane owns. Removed the parameter, its import, and
the stale field comment; updated the one direct constructor call (6 args → 5) in the same change.
No Spring wiring referenced the constructor (the sole `new ShelterController(` in the tree was the
test).

### 2.3 Deliberately left

- `create()`'s DTO→domain build: DTO mapping is the API layer's job, and a fresh row has no
  carry-over hazard.
- `updatePlace`'s body (diff, trust reset, history, the `IllegalStateException`→404 remap):
  recon §5 must-stay list, heavily pinned by `ShelterServiceTest`.
- Every endpoint annotation: untouched, so the OpenAPI contract is byte-identical.

## 3. Evidence the responses are unchanged

- **OpenAPI:** `OpenApiSnapshotIT` 1/1 green in the gate; `docs/api/openapi.json` md5
  `a7776d47436214fdd5f22aa81bebc768` identical before and after (file unmodified).
- **PUT matrix:** `ShelterApiIT` 20/20 green — `putByAuthorReplacesTheFiveFieldsAndKeepsTheRest`
  (id/status/source/createdAt never writable), `putOutsideEstoniaIs400AndChangesNothing`,
  `putWithInvalidBodyIs400AndChangesNothing`, `putByNonAuthorIs403AndChangesNothing`,
  `putOnRegistryAndLegacyRowsIs403ForEveryoneAndMissingIs404`, `putAnonymousIs401AndUnverifiedIs403`.
- **Unit pins:** `ShelterServiceTest` 35/35, `ShelterServiceOwnershipTest` 15/15,
  `ShelterControllerDetailReadTest` 3/3.
- **Whole suite in the gate:** 1338 run / 1337 pass — the one failure is foreign (§5). The
  submission-side ITs (`ShelterDailyLimitIT`, `ShelterDuplicateIT`, `ShelterSubmissionCapRaceIT`,
  `CommunityReviewIT`, `ShelterHistoryIT`, …) all pass, covering job 1's paths through real SQL.

## 4. Line counts (before → after)

| | before | after | Δ |
|---|---:|---:|---:|
| `api/ShelterController.java` | 552 | 517 | **−35** |
| `app/ShelterService.java` | 509 | 568 | **+59** |
| — `update()` body | 51 | 19 | **−32** |
| — `addPlace` body | 80 | 85 | +5 (one read + the 4-line constraint comment) |

diff numstat: controller +8/−43; service +70/−11; tests +61/−0 (ShelterServiceTest), +65/−8
(ShelterServiceOwnershipTest), +1/−1 (ShelterControllerDetailReadTest). The service grew because
the row build arrived with its documentation (the carry-over rules are now *written down once, in
the layer that owns the rows*); the controller shrank by the same logic minus the doc that moved.

## 5. Gate

Command on every run: `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
-Ddependency-check.skip=true`, detached, exit read from a file (run rule 2/7).

- **Gate 1 (full, 2026-09-24 ~07:59 EEST): exit 1 — 1338 tests / 1 failure** =
  `DocumentationFactsTest.theCurrentStateDocAnchorsStillPointAtTheCode`. All three drifts point at
  `frontend/src/app/shared/paging.ts`: `:20,24,27,31` now blank, `:68-70` no longer carries
  `clampPage`, `:71-79` outruns the file (working tree 78 lines vs 79 committed). **Foreign:**
  `paging.ts` is mid-edit by the frontend shared-files lane in this batch (git status: modified,
  2+/3−, untouched by me — my diff is the five backend files only; the committed HEAD's 79-line
  `paging.ts` satisfies the anchors, so the drift is the in-flight edit, same class as the
  map-page.ts anchor from the previous batch). The test-phase failure stopped the build before the
  PMD/jacoco verify checks, so gate 1 proves the suite but not those two gates.
- **Gate 2 (same command, excluding only that one foreign method, `-Dtest=!DocumentationFactsTest#theCurrentStateDocAnchorsStillPointAtTheCode`, 2026-09-24 08:03-08:07 EEST): exit 0** — **1337 tests, 0 failures, 0 errors**; `pmd:check` clean (no new violations); `jacoco:check` — "All coverage checks have been met" (0.93 LINE floor); `OpenApiSnapshotIT` green within it. This is the full scope of my tree: everything the run's gate checks, minus the single anchor method that the in-flight `paging.ts` rewrite pins broken. With the anchor re-derived by the docs lane, the unexcluded gate returns to exit 0 on this tree (no other test references the moved frontend lines).

## 6. Anchors (run rule 6)

`docs/agent/00-CURRENT-STATE.md` cites **neither** `api/ShelterController.java` **nor**
`app/ShelterService.java` (grep-verified: zero citations; `DocumentationFactsTest` references the
service file only for the `MAX_ACTIVE_SHELTERS_PER_USER` constant, which stays). **No anchor
shift is owed by this lane** — nothing to re-derive. The recon's cited lines (160/183/201,
436-465) were recon evidence, not guarded anchors.

## 7. Unverified / residual

- PMD + 0.93 coverage floor: **verified green** by gate 2 (§5) — `pmd:check` clean, "All
  coverage checks have been met" (0.93 LINE floor).
- The domain-home fix for the carry-over (§2.1 residual) — filed, not done (scope).
- The foreign `paging.ts` anchor — filed on the notes board for the frontend + docs lanes.
- No behaviour beyond job 1's removed round-trips: the only observable change is two fewer
  `users.kind` reads per submission; every status code, message, validation order, transaction
  boundary and response body is pinned green by the evidence in §3.
