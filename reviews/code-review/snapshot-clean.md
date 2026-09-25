# Snapshot-clean — the seven pinned OpenAPI change-name strings + the dead `admin-locale-scope`

Lane: `SNAPSHOT-CLEAN` · branch `code-review` · 2026-09-25
Scope: `@Tag`/`@Operation`/`@Parameter`/`@Schema` **description text only** in six main-source
files + the sanctioned regeneration of `docs/api/openapi.json`. No commits (parent commits).
No renames, no `operationId` changes, no schema edits, no migrations, no services, no frontend,
no other guards.

## Job 1 — the seven strings, before and after

Each string cited an archived (or unresolvable) change name as a planning reference. The
surrounding sentence already states the constraint the name stood for, so the name was dropped
and the sentence kept — the same replacement pattern the change-name sweeps used in comments
(`reviews/code-review/change-name-sweep.md`). No description's *meaning* changed: same
endpoints, same parameters, same behaviour, same error contract — only the planning citation
left the wording.

| # | Location (annotation) | Before (the cited fragment) | After |
|---|---|---|---|
| 1 | `api/DataSourceController.java:23` (`@Tag` "Data source") | `"The public provenance read (official-dataset-csv): the map is built from the Päästeamet open-data shelter dataset, …"` | `"The public provenance read: the map is built from the Päästeamet open-data shelter dataset, …"` |
| 2 | `api/GuidanceController.java:52` (`@Tag` "Public guidance") | `"The public crisis-guidance reads — permit-all (no JWT): …"` | `"The public crisis guidance reads — permit-all (no JWT): …"` (two-word product term, matching the class javadoc's own wording) |
| 3 | `api/LocationController.java:44` (`@Tag` "Geo") | `"The short-link resolver (shelter-location-input). JWT-protected …"` | `"The short-link resolver. JWT-protected …"` |
| 4 | `api/ShelterController.java:153` (`@Operation` "The public shelter list") | `"...(same as source). Viewport (shelter-bbox-paging): minLat/minLng/maxLat/maxLng are ALL or NONE..."` | `"...(same as source). Viewport minLat/minLng/maxLat/maxLng are ALL or NONE..."` |
| 5 | `auth/RegisterRequest.java:20` (`@Schema` on the record) | `"Registration payload (03-auth.puml). No national ID code is collected (remove-national-id)."` | `"Registration payload (03-auth.puml). No national ID code is collected."` (the resolvable `03-auth.puml` path-citation stays) |
| 6 | `api/AdminGuidanceController.java:115` (`@Operation` "The admin guidance list") | `"Every post, drafts included, in the stored manual order. With ?locale= (admin-locale-scope) only the posts that have content in that locale are returned — …"` | `"Every post, drafts included, in the stored manual order. With ?locale= only the posts that have content in that locale are returned — …"` |
| 7 | `api/AdminGuidanceController.java:142` (`@Parameter` `locale`) | `"Optional: the active UI language (admin-locale-scope) — only the posts that have content in it are returned. Absent = every post (the legacy locale-blind list)."` | `"Optional: the active UI language — only the posts that have content in it are returned. Absent = every post (the legacy locale-blind list)."` |

`admin-locale-scope` (strings 6 and 7) is fixed as part of this pass: it resolves nowhere —
neither an archived change (37 archive directories, none named or dated 2026-09-13 as the main
sweep report claimed) nor a live one — so it is a dead name, not an archived-but-resolvable
citation. All the constraints those two strings stated (`?locale=` scopes to posts that have
content in that locale; absent = the legacy locale-blind list) remain word-for-word.

Source diff: six files, seven lines, all description text, all line-count neutral
(`git diff --numstat`: 1/1 each, AdminGuidanceController 2/2). None of the six files is cited
in `docs/agent/00-CURRENT-STATE.md` (grep-verified), so no anchor shift is owed.

## Job 2 — the regenerated snapshot, and what it contains

Regenerated with the sanctioned command (rule 7, under the lock):
`flock /tmp/openshelter-mvn.lock mvn -q -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`
→ exit 0, both runs.

**Diff summary (committed snapshot vs regenerated):** exactly the seven description strings,
mapped to their document locations:

| Document location | String |
|---|---|
| `$.components.schemas.RegisterRequest.description` | #5 |
| `$.paths./api/shelters.get.description` | #4 |
| `$.paths./admin/guidance.get.description` | #6 |
| `$.paths./admin/guidance.get.parameters[0].description` | #7 |
| `$.tags` — "Data source" entry | #1 |
| `$.tags` — "Geo" entry | #3 |
| `$.tags` — "Public guidance" entry | #2 |

Verified by structural deep-diff (HEAD snapshot vs regenerated): **no schema, no endpoint, no
parameter, no status code, no operationId, no security entry, no component, no header** —
nothing but those seven `description` values differs in content.

**One disclosed artifact — the `tags` array order moved, and it is explained:** the three tags
whose descriptions changed moved position within `$.tags` (Geo 4→0, Data source 0→11,
Public guidance 11→12); the ten untouched tags keep their exact relative order, the tag set is
identical, and the duplicate "Account & verification" entries are untouched. Mechanism:
springdoc 2.8.17 (no `TagsProvider` in the jar; the project configures none) derives the
top-level tag order from the tag content's hashing, so editing a tag description rehashes that
one entry and only that entry. This is not a new phenomenon in this repo — commit `33793ce`
changed the "Data source" description from `"(official-dataset-csv M5)"` to
`"(official-dataset-csv)"` and the same single tag moved (last→first) in that regeneration
while all other tags kept their relative order. The OpenAPI 3.0 spec states tag array order
is display-only and "SHALL NOT be used for semantic processing". So: the diff is exactly the
seven description strings in content; the moved lines are the same tag/name/description
triplets repositioned, nothing added, removed or renamed.

**Determinism:** the sanctioned command was run twice; both outputs are byte-identical
(md5 `ccacf100f643ab4613a8c3b630d75f48`), so the committed snapshot passes
`OpenApiSnapshotIT` reproducibly — the order is a stable function of the content, not a
per-run lottery.

## Job 3 — other dead change names in `docs/api/openapi.json` and the generating annotations

**None found.** The whole document was scanned (every string value in the JSON, not just
descriptions) against the full 74-name refused set derived from
`openspec/changes/archive/` (date-prefixed dirs + date-stripped slugs, minus the live change
`community-review-queue`) plus `admin-locale-scope`: the only hits were the seven above.
Paths, operationIds, parameter names, schema names and extensions are all clean. The main
tree was scanned the same way (whole-kebab-token match, non-comment lines): the same five
archived-name lines + the two `admin-locale-scope` lines, and nothing else.

**What was found beyond the seven (all outside this lane's write scope — reported, not touched):**

1. **`admin-locale-scope` and `admin-locale-split` are BOTH dead names** (neither is archived,
   neither is live; neither is in the guard's derived 74-name list, so the guard cannot refuse
   them). Residue the three sweeps left because the sweeps' refused sets didn't contain them:
   - test tree, 2 comment lines: `guidance/InMemoryGuidancePostRepository.java:41`,
     `guidance/GuidanceValidationTest.java:63` (both `admin-locale-scope`);
   - frontend, 11 files for `admin-locale-scope` (models.ts, admin-gateway.ts,
     guidance-editor.ts/.html/.scss, guidance-order-list.ts/.html/.scss,
     admin-page.spec.ts, guidance-panel.scss) and 5 files for `admin-locale-split`
     (i18n.spec.ts, guidance-editor.ts, guidance-order-list.html, admin-page.spec.ts,
     guidance-panel.html) — all comments or spec strings.
   Parent call, same class the main sweep left the seven snapshot strings for.
2. **`community-review-queue` (live again) is still cited by 24 comment lines in 14
   main-source files** — resolvable, so the guard correctly does not refuse it; unchanged from
   the sweep-tests lane's cross-lane report, still a parent call.
3. **The main sweep report's archive claim about `admin-locale-scope` is wrong** (it says
   "archived 2026-09-13"; no such archive directory exists) — the tests lane already reported
   this on the notes board; the cleaning itself (this lane) now supersedes it.

## GATE

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` →
**exit 0** (attempt 3, 02:35:31→02:40:49 EEST, /tmp/snapshot-clean-gate3.{log,exit}).

- `Tests run: 1347, Failures: 0, Errors: 0, Skipped: 0` — **zero failures and zero errors**;
  the total is 3 under the 1350 baseline, entirely foreign (below, named). PMD 3.27.0 check
  clean, `All coverage checks have been met`, BUILD SUCCESS.
- `OpenApiSnapshotIT` 1/1 green — it verified the regenerated `docs/api/openapi.json`
  against the live generated document (the pin this lane re-anchored).
- `SourceVocabularyTest` 2/2, `DocumentationFactsTest` 21/21.

**Foreign state, named (not failures of this lane's diff):**

1. **Test-count delta −3:** the shared working tree carries another lane's in-flight
   `verification/**` edits (files last written 02:19, uncommitted): `FileVerificationSendLogTest`
   has 9 test methods in its in-flight state vs 11 committed, `VerificationServiceTest` 16 vs 17.
   Same 153 test classes as the 1350-baseline gate; every test that ran passed. Once that lane
   commits, the count returns to its committed truth.
2. **Attempt 1 (02:15:30→02:19:40) exit 1 — the rule-7 phantom wall:** `target/test-classes`
   was wiped at 02:18:48 mid-run by a concurrent build (110 errors, all `ApplicationContext`
   load failures — `class path resource […IT.class] cannot be opened because it does not
   exist`, zero assertion failures; 1179 tests had run clean before the wall). `OpenApiSnapshotIT`
   died in the wall before it could verify the snapshot (attempt 3 now carries that proof).
3. **Attempt 2 (02:33:36→02:33:52) exit 1 — foreign compile break:** two then-on-disk, untracked
   test files from the in-flight blind-index-framing work referenced not-yet-existing main
   symbols — `src/test/java/ee/sheltermap/security/BlindIndexFramingIT.java` (missing
   `ee.sheltermap.migration.V34BlindIndexFramingMigration`, `PiiCrypto.legacyBlindIndex`)
   and `src/test/java/ee/sheltermap/verification/CodeHashesFramingFallbackTest.java` (missing
   `PiiCryptoTestKeys`, `PiiCrypto.legacyCodeHash`). Both files are no longer on disk — their
   lane rolled them back between attempts.
4. **Lock-discipline observation (for the parent):** a bare unlocked `mvn test -q` ran in this
   repo at ~02:20 (still active until ~02:23), and a dev `mvn spring-boot:run` (PID 2688197)
   has been sitting in this project directory since 2026-09-23 23:43. Neither is mine; the
   02:18:48 wipe that killed attempt 1 is the class of damage rule 7 warns about.

## Unverified

- The tag-order artifact is content-hash-derived (mechanism inferred from jar contents +
  behaviour, not read from springdoc source — no sources jar was installed). The empirical
  proofs stand on their own: (a) only the three edited tags moved, (b) `33793ce` shows the
  identical effect from an identical cause in this repo's own history, (c) the double
  regeneration is byte-identical.
- The seven rewordings were not separately red/green-proven: the snapshot test IS their
  pin (it compares the generated document), and the full gate covers everything else.
