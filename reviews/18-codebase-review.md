# 18 — Comprehensive codebase review (Wave 12)

**Reviewed.** `HEAD = 30ac931` (2026-09-22 23:56), clean tree. Whole codebase, not a theme:
structure/layering, dead code & duplication, correctness & concurrency, authorization & security,
query cost & performance, error handling & logging, migrations & data integrity, dependency &
tooling hygiene, accessibility, i18n completeness, and test quality — with a mutation-check of
every guard this report praises.

**Method.** Read-only against the live tree; the only file written is this report. A throwaway
`git archive HEAD` copy at `/tmp/review18-mut` (node_modules symlinked) carried all 14 mutations,
one production build, and the backend runs (targeted classes only — the full suites were not run,
per instruction). Live read-only probes of the running backend (`:8080`) and dev server (`:5173`)
are saved under `/tmp/review18/` (`live-*.json`, `live-guidance.headers`, `xml-probe.json`,
`ng-build-head.log`, `be-*.log`, `fe-*.log`, `ExifProbe.java`). No server was restarted or
stopped; no source, test or doc file in the real tree was touched.

**Relationship to the earlier sweeps.** This extends, not repeats: every 12-summary (run-2,
2026-09-21) and 15-audit (2026-09-22, `187e697..47d2ce8`) verdict below is marked **confirm**,
**supersede** or **contradict** against HEAD. Since 15's audit eleven more commits landed
(`ddb4cb9` … `30ac931`), including the six the owner named: save-time hero import + `V33`
(`9d81d4a`), EXIF orientation + save-first message (`c406f5c`), legend geometry/badges/palette
(`8cebe1e`, `8c3caef`), the 18-string copy pass (`9aff085` + the work it actually carried in
`c406f5c`), the admin search fix (`bd3a3c5`), and the absence-pin hardening (`1e7acf9`).

---

## Verdicts up front

| Question | Verdict |
|---|---|
| Is today's work sound? | **Yes, on every behaviour checked.** The save-time hero import, the trust snapshot, the three-confirmer path, the paging refactor, the legend-as-filter and the i18n guards all hold under mutation (14/14 red when their behaviour is removed). The one gap of consequence is a **verification** gap, not a behaviour gap: the tally crossing has no dedicated concurrency test (§3, F1). |
| Do the praised guards bite? | **14/14 went red** when their behaviour was removed in the throwaway copy. Zero hollow guards of any class found. One previously-proven escape hatch (15's M7b/M7c) is **fixed** — a nested re-addition now fails. |
| What is left open? | Registry re-import (owner action, still stale — live `lastImport` 07:54:44Z predates the 11:31 L-EST97 fix), the admin-page growth (2 535 lines), the W4-D plan staleness, one empty commit, two P3 guard-hardening seams, and the native-speaker i18n review. |
| False claims in documents? | **One, new**: `9aff085` is an **empty commit** whose message claims the 18-string copy pass and the i18n review packet — both of which actually landed in `c406f5c` (§5). |

---

## 1. Guard mutation table (the core deliverable)

Protocol, per the repo's own idiom: remove the behaviour, keep the guard untouched, does the guard
go red? Every mutation below was applied to the `/tmp/review18-mut` archive copy, the named spec
run, the file restored, and the restore byte-verified (`cmp`/`md5sum`). Baselines were green
first: backend `ShelterReportServiceTest` 37, `GuidanceServiceTest` 87, `ShelterQueryServiceTest`
55, `HeroImageImportServiceTest` 24, `HeroImageImportIT` 11 (27 s), `MediaDerivativesTest` 14,
`MediaImageInspectorTest` 18, `ShelterPagingCostIT` 2; frontend `design-tokens` 140,
`i18n-template-guard`, `catalog-identity`, `hero-geometry`, `map-page`, `leaflet-service`,
`admin-page`, `architecture`, `error-copy`, `consent-banner`, `accessibility-dialog`,
`privacy-policy-page`, `i18n.spec`, `submit-shelter-page-session` — all green.

| # | Guard (what it claims) | Mutation (behaviour removed, guard untouched) | Result | Verdict |
|---|---|---|---|---|
| B1 | `ShelterReportService.distinctConfirmers` excludes the submitter — "their own confirmation never verifies their own shelter, not even as the third" (`ShelterReportService.java:298-305`) | Deleted the submitter-exclusion block | **Red** — 1 failure in `ShelterReportServiceTest` (the self-confirmation test) | **Real** |
| B2 | Three distinct confirmers promote NEW→CONFIRMED at `AUTO_CONFIRM_THRESHOLD` (`ShelterReportService.java:283-291`) | `>=` changed to `>` | **Red** — 5 failures (threshold tests, mixed report+tap, dismiss-drop) | **Real** |
| B3 | "A failed import NEVER blocks the save" — the save-first contract (`GuidanceService.java:833-843`, `resolveHeroOnSave`) | Import failure now rethrows instead of falling back | **Red** — 5 errors in `GuidanceServiceTest` (create/update/updateInLocale failure paths) | **Real** |
| B4 | Trust snapshot survives author erasure — "the snapshot is the answer when present" (`ShelterQueryService.java:486-489`, `V31`, write at `ShelterService.java:219`) | Read ignores the snapshot, live-derives only | **Red** — 2 failures in `ShelterQueryServiceTest` (incl. `theV31SnapshotSurvivesAuthorErasure`) | **Real** |
| B5 | Hero-import guard 1: scheme allowlist, service-level (`HeroImageImportService.java:243-245`) | Allowlist loosened to also accept `file:` — run against `HeroImageImportIT` | **Green** (11/11) — the IT's `aFileUrlIsRefusedAtWriteTime` is refused earlier, at `normalizeImportUrl` | **Not proven at this layer** (see B5b) |
| B5b | same guard, run against its actual coverage `HeroImageImportServiceTest` | same mutation | **Red** — `nonHttpSchemesAreRefusedBeforeAnyIo` + `aRedirectToANonHttpSchemeIsRefusedAndNeverFetched` | **Real** (the IT row records a layering fact: the IT proves the 400 boundary, the unit test proves guard 1 — both are needed) |
| B6 | "The page pays for its page, not the corpus" — real SQL `LIMIT/OFFSET` (`JpaShelterRepository.java:227,254`) + the cost floor in `ShelterPagingCostIT` | Requested `limit` replaced by the cap 200 (page reads up to 200 rows for `limit=1`) | **Red** — `theAdminListPaysForItsPageNotTheCorpus`: `Expecting actual: 3200L to be between: [3001L, 3020L]` | **Real** (a second, cruder mutation — deleting the `LIMIT :limit OFFSET :offset` clauses — also red, via 500) |
| F1 | i18n template guard: "no hardcoded user-visible copy in ANY template" (`i18n-template-guard.spec.ts`) | Injected `<p>Review18 Probe Copy</p>` into `map-page.html` | **Red** — `map-page.html carries no hardcoded user-visible copy` | **Real** (re-confirms 15's M4) |
| F2 | Catalog identity: "ET/RU must not ship the EN value" (`catalog-identity.spec.ts`) | `ET['account.retry']` set to `'Retry'` (EN-identical, not on the allow-list) | **Red** — `ET["account.retry"] = "Retry"` flagged | **Real** |
| F3 | Absence pin: `.shelter-marker--new` "compiled back into the stylesheet" (`design-tokens.spec.ts:872-890`, hardened in `1e7acf9` to run against `sass.compile` output) | **Nested** re-addition: `.shelter-marker { &.shelter-marker--new { … } }` in `styles.scss` — exactly 15's M7b escape hatch | **Red** — `.shelter-marker.shelter-marker--new` found among compiled selector heads | **Real — and supersedes 15's U6**: the escape is closed |
| F4 | Legend-as-filter: "selecting a tone filters the markers AND the list (display-only, no refetch)" (`map-page.ts:461`, `map-page.spec.ts`) | Tone filter in `sorted()` replaced with `true` | **Red** — 6 failures (select/unselect/union/chip-combination/scroll cases) | **Real** |
| F5 | Reported OR: "EITHER report kind drives the reported state" (`leaflet-service.ts:78`) | `inaccurateReports` half of the OR deleted | **Red** — 4 failures (incl. "an open inaccurate-information report turns the pin reported") | **Real** |
| F6 | Tab-scoped search: "the term goes to the URL (`shelterQ`)… a hand-opened `/admin?shelterQ=…` pre-fills the input and loads the filtered scope" (`admin-page.ts:723`, `bd3a3c5`) | `shelterQ` param ignored in `syncSheltersFromParams` | **Red** — 5 failures (submit-writes-URL, hand-opened pre-fill, filtered empty state, chip+search AND) | **Real** |
| F7 | Hero geometry audit: "every fixed width+height rule on an image slot carries `object-fit: cover`" (`hero-geometry.spec.ts:302`) | Card hero's `object-fit: cover;` removed from `guidance-list-page.scss` | **Red** — `expected null to be 'cover'` | **Real** (text-level; nested-escape residual noted in §4, F9) |
| F8 | Architecture guard: "every feature directory is referenced by the routing table" (`architecture.spec.ts:109`) | Unreferenced `features/zghost/` added | **Red** — `features/zghost/ — add a route or delete the directory` | **Real** (re-confirms 15's M1) |

**Counter-checks that were run and came out clean** (reported so the record is honest):

* **EXIF double-rotation hypothesis — REFUTED.** CI runs Temurin **27** (`ci.yml:70,106`) while
  `pom.xml` targets 21; on JDK 23+ `ImageIO.read` was reported to auto-apply EXIF orientation,
  which would have double-rotated `MediaDerivatives.toVisualOrientation` (`MediaDerivatives.java:157-159`).
  A probe JPEG (400×300 + orientation 6) decoded to 400×300 on **both** JDK 21 and 27, and
  `ImageIO.setUseEXIFOrientation` does not exist on this JDK 27 build — so no auto-rotation, no
  double rotation. The pixel-level orientation tests then ran green on JDK 27 in the throwaway
  copy (14/14 `MediaDerivativesTest`). The EXIF work is correct on both runtimes.
* **The 18-string copy pass vs the literal-pinning specs — in sync.** The 18 rewritten EN values
  (plus the `account.identityCopy` removal) are rendered through the `t` pipe, so the catalog-driven
  specs track them; the five literal-pinning specs most likely to pin them
  (`error-copy`, `consent-banner`, `accessibility-dialog`, `privacy-policy-page`, `i18n.spec`)
  ran green against the rewritten catalog in the throwaway copy, and no spec or template references
  the removed key (0 hits repo-wide). The `docs/i18n-review.md` packet (committed in `c406f5c`)
  honestly lists the uncertain ET/RU values for native-speaker review.

**Historical context for the table.** The six earlier hollow guards (12-summary P1-1 paging clamp,
P1-8 `<td>`-class scan, P2-14 `tryRecord` certifying a production-dead path, P2-15's unasserted
"review queue is never paged", the quill-asset pin of P3-G, and the wrapped-token regression of the
red-suite incident) are all fixed or still open as noted in §6; none of the 14 guards praised here
belongs to that class.

---

## 2. What I confirmed, contradicted and superseded from the earlier sweeps

**Superseded by HEAD (was open in 12/15, now closed):**

| Earlier item | Status at HEAD | Counter-check |
|---|---|---|
| 15 **U6** — absence-pin escape hatch (nested/re-spaced re-addition passes 137/137) | **Closed** by `1e7acf9` | F3 above: the nested re-addition is now red against the compiled stylesheet |
| 15 **U7 / F2** — stale README budget numbers (610.01 measured vs README) | **Closed** by `66f7109`; fresh build at HEAD: **609.26 kB raw / 157.12 kB transfer**, 15 component-SCSS warnings, **no** initial-budget warning — matches the README's re-measured paragraph to the cent | `ng-build-head.log` (throwaway copy, `npm` production build, exit 0) |
| 15 **U3** — uncommitted doc-lane fix batch | **Closed** — landed as `ddb4cb9` (29 claims) + `1e7acf9` + `b048ced`/`66f7109` (the doc reviews 16/17) | `git log --stat` |
| 12 **P1-1** — 1-row page reads all 308 rows; client clamp untested | **Closed** | B6 red; `JpaShelterRepository.java:227,254` `LIMIT :limit OFFSET :offset`; `X-Total-Count` = `countAdminPage` (`ShelterQueryService.java:608`); client sequence guard `admin-page.ts:983` |
| 12 **P1-2** — per-row `findById` + whole-library media load on guidance lists | **Closed** | `GuidanceController.java:142-144` — "ONE batched read for the page's hero URLs (W2-A: the pre-change hero index loaded the WHOLE media library for every request)" (`heroIndex(page)`) |
| 12 **P1-3** — paging policy duplicated ×4 backend / ×2 frontend | **Closed** | One `api/Pagination.java` (one `PagingBoundsException`, one message, one `MAX_PAGE_SIZE=200`, one `slice`), called at `AdminController:146,312,346,458`, `AdminGuidanceController:162-163`, `GuidanceController:136-137` — bounds before the read in every case |
| 12 **P1-5** — dropped in-flight reload + missing shelters sequence guard | **Closed** | `syncSheltersFromParams` includes the in-flight window in its decision (`admin-page.ts:730-733`) and `shelterFetchSeq` drops superseded responses (`:983,992,999`); the search fix `bd3a3c5` makes the term URL-backed (F6 red) |
| 12 **P1-7a** — XML/XHTML served for JSON-only ops | **Closed for 13/16 controllers** | `produces = APPLICATION_JSON_VALUE` on `Auth`, `Verification`, `Account`, `Location`, `DataSource` + the rest; **live probe**: `GET /api/guidance` with `Accept: application/xml` now answers **406**, not `200 xhtml+xml` (`xml-probe.json`) |
| 12 **P1-6 / P2-16** — clean checkout red; no CI, no image, no gates | **Closed** | `ci.yml`: 4 jobs (backend JDK 27 `mvn verify` + PMD + JaCoCo floor + OWASP; clean-checkout from `git archive`; frontend test+build; docker build+healthcheck), `Dockerfile` multi-stage JRE-only |
| 12 **P2-7** — 429 promised `Retry-After` nobody sent; throttles logged nothing | **Closed** | `ApiErrorHandler.java:458-500` sends the bucket's exact countdown and logs a WARN per throttle kind |
| 12 **P2-10 / P2-11** — permanently-red budgets, eager auth routes, no `.env.example`, no `engines` | **Closed** | `angular.json:46` 741401b re-baseline (fresh build prints no initial warning); 12 `loadComponent` routes; `.env.example` present (3 key lines); `package.json:15-17` `engines` node `>=26`/npm `>=11` |
| 12 **P3-B** — `/auth/refresh`, `/auth/logout` unthrottled | **Closed** | `AuthController.java:155-171` — both take `requireRate(sessionRateLimiter, …)` |
| 12 **P3-C** — 9 `log.error` sites dropped the throwable | **Closed** | every `log.error` in `src/main` now carries the throwable as the last argument |
| 12 **P3-E** — EN-frozen admin copy constants, `listGuidancePosts` dead method, `readCoordinate` dead export | **Closed** | 0 non-spec references to `PRIVATE_LOCATION_BADGE`/`INACCURATE_BADGE`; `listGuidancePosts` (unpaged) gone; `readCoordinate` gone; `updateGuidanceTranslation` now has a production caller (`admin-page.ts:2012`) |
| 12 **QW6** — focus deviation landed on a public control | **Closed** | `styles.scss:456-461` — `a|button|input|textarea|select:focus-visible` + `.admin-table-wrap:focus-visible` |
| 12 **P2-12** — OTP codes unkeyed; tomcat/jackson/bcprov advisories; compose DB exposed | **Closed** | `V32__otp_code_hash_keyed_widen.sql` (keyed `v2:` hashes, verified by 15); `dependency-check-suppressions.xml` is now **empty** with a documented re-add policy (entries deleted after W3-C bumped commons-lang3 3.19.0, jackson-bom 2.21.7, tomcat 10.1.60, bcprov 1.86) |

**Confirmed still open from 15:**

* **U1 — registry re-import not run.** Live `GET /api/data-source`: `lastImport =
  2026-09-22T07:54:44Z`, i.e. before `2a3fe47` (L-EST97 axis-order fix, 11:31). The 302 served
  rows still carry transposed pins (Pärnu Hotell class). Owner action — **this is the one
  user-visible artefact of the day's work that has not landed.**
* **U4 — `BACKLOG-PLAN.md` W4-D staleness.** Lines 222-230 still commission "a distinct marker
  shape for NEW (a ring or notch)" — a shape that was commissioned (`7cfed66`), shipped and then
  **removed by owner decision** (`60e7cb9`), with its absence now spec-pinned (F3). No
  supersession note in the plan.
* **U8** — 7 `openspec/changes/` still unarchived (community-review-queue, crisis-guidance,
  guidance-hero-import, guidance-manual-order, i18n-ru, retention-pruning, shelter-meta-truth).

**Not contradicted.** Nothing in 12-summary or 15 that I re-checked was false at its revision.
The one numeric drift (15's 610.01 kB vs today's 609.26 kB) is legitimate tree drift between two
fresh builds, and the README's current numbers are the right ones (my build matches them exactly).

---

## 3. Findings — new at HEAD, by area

Severity per the 12-summary scale (P1 fix-before-release, P2 plan it, P3 report-only).

### Correctness & concurrency

**F1 — The three-distinct-confirmer tally crossing has no dedicated concurrency test, and its
race semantics are undocumented. (P2)**
`ShelterReportService.java:283-291` (`autoConfirmIfEligible`) + `:298-315`
(`distinctConfirmers`): the promotion reads a fresh report/tap tally but decides on the shelter
entity **as loaded at the top of the transaction** (`ShelterReportService.java:154`). Two
concurrent crossing reports interleave exactly like this: T1 and T2 both load the row NEW, both
insert, T1 commits (NEW→CONFIRMED, version v→v+1, one AUTO_CONFIRM row); T2's tally now reads 3
(it sees T1's committed report), T2 sets CONFIRMED again and saves — and the `@Version` on
`ShelterEntity.java:94` rejects T2 at commit. `ApiErrorHandler.java:393-399` maps that to
**409 "The resource changed under you; reload and retry"**, rolling back **T2's legitimate
report with it** (self-healing: the duplicate pre-check now passes on retry). The invariants hold
— at most one promotion, at most one AUTO_CONFIRM row, no double auto-hide — because
`shelters.version` is the actual guard, not the `reviewStatus == NEW` check on the stale
snapshot. What is missing: (a) **no test** exercises two concurrent crossing writers — the repo
has race ITs for the submission cap and refresh rotation (`ShelterSubmissionCapRaceIT`,
`RefreshRotationRaceIT`) and none for this crossing; the `CommunityReviewIT` crossing test
(`threeDistinctConfirmationsConfirmTheRowAndAuditTheCrossingOne`, `:223`) is strictly sequential;
(b) the javadoc never states the race outcome, so the "actor of record is the one whose action
crossed the threshold" wording is only true sequentially — under the race the recorded actor can
be a non-crosser and the true crossing report is the 409'd one.
*Counter-check:* `grep -rln "ExecutorService|CountDownLatch|CyclicBarrier" src/test/java` → 4
files, none on the report path; `CommunityReviewIT` sequential by construction. **Fix:** one
IT with a latch releasing two concurrent OPEN_CONFIRMED posts from distinct users (plus the
auto-hide twin), asserting exactly one promotion, one audit row, and that the losing report is
either stored or answered 409 (not 500, not silently dropped).
*This is the gap the lane reported today — confirmed real.*

**F2 — The auto-hide crossing writes no audit row (asymmetric with the positive side). (P3)**
`ShelterReportService.java:293-297` (`autoHideIfEligible`) sets INACTIVE and saves; the
auto-confirm mirror (`:286-290`) writes an `AUTO_CONFIRM` row. A moderator can see the row flip
and reconstruct the cause from the report queue (weights, dampening flags), but the audit trail
itself — whose stated invariant is "every action writes a row" — has no entry for the hide. The
spec (`openspec/specs/community-self-moderation/spec.md:35-49`) mandates the AUTO_CONFIRM row and
says nothing about the hide, so this is by-spec, not a spec violation. *Counter-check:*
`ModerationAuditLog` has no AUTO_HIDE action; `CommunityReviewIT` asserts INACTIVE at `:342,369`
without an audit assertion. **Fix:** one `audit.record` on the hide crossing, or a spec note that
the hide is evidenced by the queue.

### Structure & layering

**F3 — `admin-page.ts` grew to 2 535 lines in the lane that was supposed to shrink it. (P2)**
12-summary measured 2 072 (working tree, 2026-09-21); `5473b1c` extracted eight tab panels
(templates moved to `features/admin/*-panel.ts`), but the class keeps absorbing day work
(`bd3a3c5` +86, `8cebe1e` −41, search/translation wiring) and now sits at 2 535 lines — the
largest file in the frontend, against the project's own "components are thin shells, zero
business logic" rule (`frontend/docs/01-frontend-architecture.puml`). Three of today's commits
touch it; it is the highest-churn file in the repo. *Counter-check:* `wc -l` at HEAD. **Fix:**
continue the panel pattern for the remaining state (the shelters paged view + its search sync is
a natural next seam), and add the `architecture.spec.ts` floor that already exists for feature
dirs and AdminTab values — e.g. a line-count ceiling per admin file that fails with the same
"add a route or delete" idiom.

**Carried, unchanged:** the `api` vs `app` placement rule is still written down nowhere
(12-summary P3-A) — `ShelterQueryService`/`AdminModerationService` now sit in `api/`, the
horizontal/vertical boundary remains a guess. (P3)

### Dead code & duplication

Cleaner than run 2. The P3-D/P3-E items above are closed; remaining:
* `readCoordinate` — **gone** (was P3-E spec-only). 
* One spec-only surface left: none found in today's touched code. (The `api` package still
  carries two `@Service` classes, which is a layering note, not dead code.)
* **Duplication, minor:** the guidance lists (admin `AdminGuidanceController.java:188` and public
  `GuidanceController.java:141`) slice an in-memory list via `Pagination.slice` — correct and
  bounded (single-digit post counts, one batched hero read per page), but the same
  load-all-then-slice shape that P1-1 condemned for shelters would be a cost defect at 300 posts.
  Not a finding today; noted so the next scale-up knows where the line is. (P3)

### Authorization & security

No new surface changed beyond the hero import. Checked and holding:
* **Hero-import SSRF guards are real** (B5b): scheme allowlist at entry *and* re-validation on
  every redirect hop (`HeroImageImportService.java:243-245`, `:290-297`), address policy per hop,
  credential refusal; `HeroImageImportIT` pins the 127.0.0.1 redirect refusal and the
  oversized/pixel-cap refusals (baseline 11/11 in the throwaway copy).
* **V33's dropped CHECK is covered at the API boundary.** The "a page renders the hero only from
  a stored asset" property now holds by DTO construction: the public `GuidancePostDto`
  (`GuidancePostDto.java:38-47`) carries `heroImageUrl`/`heroImageAlt`/`heroImageSrcset` only —
  `heroImportUrl` appears **0 times** in the public DTO and 5 times in the OpenAPI snapshot
  (admin operations only), and `OpenApiSnapshotIT` fails the build if the public contract
  changes shape. There is no DB-level backstop (by design, per the V33 comment) — the guard is
  the snapshot IT plus the DTO. (Observation, not a finding.)
* The 12/15 security clean-list (admin re-checks, IDOR absence, PII crypto, media-serving
  hardening, fail-closed guards) is untouched by today's diff and stands.

### Query cost & performance

* **Real SQL paging holds** (B6): count query over the same filter+order
  (`ShelterQueryService.java:608`), batches over the page's ids only
  (`ShelterQueryService.java:328-340`). `ShelterPagingCostIT` ran green twice in the throwaway
  copy (39 s each) and red on the cost assertion when the page was made to read the corpus —
  **but** it measures `pg_stat_user_tables` deltas, and the day's own commit message concedes it
  "is the known pg-stat flake". Under CI load (shared Testcontainers host) that measurement can
  false-red the build. (P3 test-quality note: consider a statement-count or row-count probe as a
  secondary signal, or isolate the container for this IT.)
* Save-time hero import runs `REQUIRES_NEW` **across the network fetch** (bounded by the walk
  budget), holding a pooled connection for the fetch duration — admin-only, documented in
  `HeroImageImportService`'s javadoc as by-design (the shape P2-13 already accepted). Carried.
* **Idempotency edge:** `isHeroImportedFrom` (`GuidanceService.java:856-868`) compares the
  normalized URL to the asset's `source_url` by **string equality** — a case change, added
  trailing slash or percent-encoding variant re-imports the same image and orphans the previous
  asset (legal under D8, but it will happen to real admins). (P3 — normalize before compare,
  e.g. `URI.normalize()` + lowercased scheme/host.)

### Migrations & data integrity

* **V31 (trust snapshot)** — write (`ShelterService.java:219`), read (`ShelterQueryService.java:486-489`),
  erasure semantics and the pre-V31 NULL fallback all verified; B4 red. The "one-line UPDATE
  backfill for orphaned pre-V31 rows" is explicitly an owner decision, documented at the read
  site and in `ShelterQueryServiceTest.java:536`. Sound.
* **V32 (keyed OTP hashes)** — verified by 15; the column widening to VARCHAR(128) matches the
  `v2:` 67-char format. 
* **V33 (drop the pending-import CHECK)** — the constraint drop is a single statement
  (`V33__guidance_hero_import_on_save.sql:25`); the defended property is preserved at the DTO
  boundary (see security above) and the README migration list was updated in the same commit
  (`9d81d4a`, README:227-231). Sound, with the code-boundary caveat noted.
* Flyway chain V1–V33 + the dotted V23.1 verified present.

### Error handling & logging

Clean. One `@RestControllerAdvice` still covers the tree; the OLE→409 mapping
(`ApiErrorHandler.java:393-409`) now also catches the commit-time `StaleStateException` form with
a documented rationale; throttle 429s carry `Retry-After` and a WARN line; every `log.error`
passes the throwable. The `/error` dispatch is explicitly reasoned about in
`SecurityConfig.java:244-252` (12-summary P1-7b's half — the error re-entry must not be
authorised — is handled by the matcher design; I did not live-probe the 401-on-unsatisfiable-Accept
path itself, see §7).

### Dependency & tooling hygiene

CI (4 jobs), the clean-checkout job, the multi-stage JRE-only `Dockerfile`, the now-empty
suppressions file with a re-add policy, and the PMD ruleset are all in place and were added
since 12-summary. `pom.xml` targets Java 21 while **CI tests on Temurin 27** — a deliberate
two-runtime stance that the EXIF counter-check above shows is safe *today* (the orientation code
is runtime-identical on 21/27). Worth a one-line comment in `ci.yml` recording that the JDK gap
is intentional and what would break it. (P3)

### Accessibility

Legend entries are real `<button>`s with `aria-pressed`, `aria-describedby` to a translated
hint, `role="group"` with a translated `aria-label`, and `aria-hidden` swatches
(`map-page.html:26-136`); keyboard activation is explicit and single-fire (`map-page.ts:368-385`,
covered by `map-page.spec`). Focus rings are back on `select` and the admin table wraps
(`styles.scss:456-461`). The contrast suite (140 tests in `design-tokens.spec.ts`) is green in
the throwaway copy and its floors are non-vacuous (15's M6 re-confirmed). The high-contrast and
black-yellow theme layers are asserted colour-only by `hero-geometry.spec.ts:332-351`.
No new a11y findings.

### i18n completeness

* **Guards are real and layered:** template guard (F1) + catalog identity (F2) + key parity
  (`i18n.spec.ts`) + the allow-list staleness tests in each. The 18-string copy pass (`9aff085`'
  actual content, in `c406f5c`) is consistent with every literal-pinning spec (counter-checked
  green) and with the three-catalog key parity (the `account.identityCopy` removal is clean —
  TS-typed, 0 stray references).
* **Open, by design:** `docs/i18n-review.md` lists ~20 ET/RU values that await a native speaker
  (the packet's own words: "none of it has been verified by a native speaker"). This is the
  standing owner-queue item; the guard catches *untranslated* values but not *unidiomatic*
  ones — the packet is the compensating control and it is honest about its limits.
* **Stale count comment:** `i18n-template-guard.spec.ts:78-79` says "31 files" while
  `EXPECTED_TEMPLATES` holds **35** entries. The completeness pin makes this comment-only (the
  list itself is the authority), but it is the third generation of this exact staleness
  (12-summary P3-G: 23→26). (P3)

### Test quality

* The mutation table is the headline: **no hollow guard of the six-hollow class was found among
  the 14 guards praised here**, and the one previously-proven escape (15's M7b) is fixed (F3).
* **New and strong:** `submit-shelter-page-session.spec.ts` (351 lines, `8cebe1e`) drives the
  full auth stack (real interceptor + store + gateways + test HttpClient) to pin the 401 contract
  on the edit route — green in the throwaway copy. `hero-geometry.spec.ts` (351 lines,
  `c406f5c`) pins the no-stretch contract per slot with a non-vacuous app-wide scan (F7).
  `HeroImageImportIT`'s deadlock fix is a model repair: the cleanup moved `@BeforeEach` with a
  comment explaining the exact lock interaction and the 3-hour hang that exposed it
  (`9d81d4a`).
* **Residual:** `hero-geometry.spec.ts:302` scans raw SCSS text (like the pre-`1e7acf9`
  absence pin). A **nested** fixed-box rule (`.slot { &.hero { width:400px; height:300px } }`
  without `object-fit`) compiles to the forbidden shape and would not match a top-level
  balancedBlock scan. I did not mutation-probe this escape (it is the same *class* as the now-
  fixed M7b; the fix pattern — compile first, scan selector heads — already exists in
  `design-tokens.spec.ts:212-216`). (P3 — F9 below.)
* `ShelterPagingCostIT` flake risk (see query cost). Everything else sampled held.

---

## 4. Numbered finding list (for the batch tracker)

| # | Sev | Finding | Location |
|---|---|---|---|
| F1 | P2 | Tally-crossing (auto-confirm + auto-hide) race-safe only via `@Version`, with no dedicated concurrency test and undocumented race semantics (loser's report 409'd; actor attribution approximate) | `ShelterReportService.java:283-315` |
| F2 | P3 | Auto-hide crossing writes no audit row (asymmetric with AUTO_CONFIRM; spec-silent) | `ShelterReportService.java:293-297` |
| F3 | P2 | `admin-page.ts` at 2 535 lines and growing; no size/complexity guard in `architecture.spec.ts` | `frontend/src/app/features/admin/admin-page.ts` |
| F4 | P3 | `BACKLOG-PLAN.md` W4-D still commissions the removed NEW-ring shape (15's U4, open) | `docs/autopilot/BACKLOG-PLAN.md:222-230` |
| F5 | P2 (owner) | Registry re-import still not run — served rows predate the L-EST97 fix | `GET /api/data-source` (live) |
| F6 | P3 | `9aff085` is an empty commit; its claimed 18-string pass + i18n packet landed in `c406f5c` — the commit-message/diff truthfulness class of 15's F1, in a worse form | `git show 9aff085` (empty diff vs `c406f5c`) |
| F7 | P3 | `EXPECTED_TEMPLATES` comment "31 files" vs 35 entries | `i18n-template-guard.spec.ts:78-79` |
| F8 | P3 | `MediaController` (public) is the last non-dev controller without a `produces` pin — error bodies on the media paths can still negotiate | `MediaController.java:68-69` |
| F9 | P3 | `hero-geometry.spec.ts` app-wide stretch-box scan is text-level; a nested fixed box without `object-fit` escapes it (the fixed M7b class, unfixed twin) | `hero-geometry.spec.ts:292-330` |
| F10 | P3 | Hero-import idempotency is string equality on the URL — trivial variants re-import and orphan assets | `GuidanceService.java:856-868` |
| F11 | P3 | `ShelterPagingCostIT` measures `pg_stat` deltas — flake-prone under CI load (conceded in `9d81d4a`'s message) | `ShelterPagingCostIT.java` |
| F12 | P3 | CI tests on JDK 27 against a Java 21 target; the deliberate gap is unremarked (today's EXIF counter-check shows it is safe as of this tree) | `ci.yml:70,106` vs `pom.xml:21` |

---

## 5. False / unsupported claims

**F6 (the one new one) — `9aff085 "docs(copy): 18 strings rewritten to inform rather than
explain, drafts in the i18n review packet" is an empty commit.** `git diff c406f5c 9aff085` is
empty; the 18 rewritten EN values (a11y popup, consent, `submit.verifyHint`, account
subtitle/email/phone proof, delete-armed, verify subtitle, hero `importFailed` lead-in, legal
scope, …), the `account.identityCopy` removal and the `docs/i18n-review.md` packet all landed in
`c406f5c` — a commit whose own message names only the EXIF fix. The work is real and verified
(§1 counter-check); the commit that claims it carries none of it. This is the same process
defect 15's F1 documented for three commit messages ("wave-N reports" that were not in the
commits), now in its strongest form: a message describing a diff that does not exist anywhere in
the commit. **Recommendation:** the batch flow needs a mechanical check — refuse empty commits
and verify that every report file named in a message is in the diff (a two-line pre-commit
hook; the repo's guard idiom says it knows how to write these).

*Not false (checked):* the `9d81d4a` claim that `ShelterPagingCostIT` "0 failures in isolation"
(2 green runs here); the V33 README migration-list update; the `bd3a3c5` tab-scoping claims (F6
mutation); the `8cebe1e`/`8c3caef` legend/palette claims (F4/F5 mutations + green contrast suite);
the `c406f5c` EXIF claims (JDK 27 pixel tests); the `9aff085` *content* (verified in `c406f5c`).

---

## 6. What I did NOT examine (explicitly)

A review that implies total coverage it does not have is worse than a narrow honest one, so this
list is load-bearing:

1. **The full test suites.** Backend: I ran 8 targeted classes (248 tests) in the throwaway
   copy, not the ~1 150-test suite. Frontend: I ran ~13 targeted spec files, not the full
   ~1 500-test suite. "The suite is green" is the gating lane's claim, not mine.
2. **ET/RU translation quality.** The `docs/i18n-review.md` packet's ~20 uncertain values are
   not native-speaker-verified; I have no Estonian or Russian to adjudicate them. The
   mechanical guards (identity, parity, template) are verified; linguistic quality is not.
3. **The registry import path end-to-end.** `Lest97AxisOrder`'s fix and its test are in the
   tree (15 verified `Lest97AxisOrderTest` pins real live values), but the **served data has not
   been re-imported**, so I have not observed the corrected pins live. The CSV parser/ingestion
   internals beyond what 15 checked were not re-read.
4. **The live `/error` 401 path** (12-summary P1-7b): the `SecurityConfig.java:244-252` design
   is in place, but I did not probe the unsatisfiable-Accept 401 on a public endpoint myself
   (the `Accept: application/xml` 406 probe covers the negotiation half, not the error-dispatch
   half).
5. **Browser-rendered behaviour.** No Chromium: Leaflet marker rendering, the legend's small-
   screen layout (`8c3caef`'s "legend off the map"), the `hero-geometry.spec` "measured 0%
   stretch in Chromium 152" claim, focus-ring visibility, and the five browser-only flows
   (e2e remains deferred by documented decision) are unobserved in a real browser.
6. **Outbound senders** (Twilio/SMTP internals), **geo-resolve upstream** (Nominatim/OSM
   behaviour), **PII crypto internals** (clean per run 2, untouched today), **retention/erasure
   job internals** beyond the V7 ON DELETE SET NULL interplay verified through the snapshot,
   **Quill editor behaviour** beyond the vendored-stylesheet budget, and the **docker image
   build/healthcheck** (CI's job, not re-run here).
7. **The documentation reviews themselves** (16/17 — 275 files, 22 false claims, 9 rejected
   false positives): I read the load-bearing numbers they corrected (budget paragraph,
   migration list, three-confirmer wording) but did not audit their 275-file sweep.
8. **`openspec` spec contents beyond spot-checks** (the community-self-moderation audit
   requirements, the admin-moderation spec) — verified where a finding needed them, not in
   full.

---

## 7. Top five fixes, in priority order

1. **Write the tally-crossing concurrency IT (F1).** Two latched threads racing a NEW row across
   the three-distinct threshold (and the auto-hide twin): assert exactly one promotion, exactly
   one AUTO_CONFIRM row, and that the losing writer's report is either stored or answered 409 —
   never 500, never silently dropped; then document the race outcome in the
   `autoConfirmIfEligible` javadoc (the `@Version` is the guard; say so). *Why first:* it is the
   only major behaviour shipped today with zero race coverage, on the exact class of guard this
   repository has been hollow about six times. The code is safe *today* — the fix buys the proof,
   which is the repo's own standard. Effort: S (the race-IT scaffolding already exists twice).

2. **Re-run the registry import (F5 — owner action).** The 302 served rows predate the L-EST97
   axis-order fix by ~3.5 h; transposed pins are on the live map right now. Code and test are
   landed; the data is not. *Why second:* it is the only user-visible defect on the list and it
   costs one import run. Everything else on this list is latent.

3. **Keep shrinking `admin-page.ts` and guard it (F3).** Extract the shelters paged view +
   search sync next (the URL→state→load seam is already self-contained after `bd3a3c5`), then
   add a per-file ceiling to `architecture.spec.ts` with the repo's checked-floor idiom so the
   file can never silently re-cross 2 500. *Why third:* it is the highest-churn file, the
   biggest deviation from the project's own architecture rule, and the two most recent state
   bugs (P1-5) and the search fix all lived inside it — the extraction is where the next bug
   class gets caught at compile time instead of in review.

4. **Harden `hero-geometry.spec.ts` the way the absence pin was hardened (F9).** Compile the
   SCSS (the `sass.compile` + selector-heads machinery exists in `design-tokens.spec.ts:212-216`
   after `1e7acf9` closed the identical escape) and scan compiled selector heads for the
   fixed-box-without-cover shape, with a non-vacuous floor. *Why fourth:* the repo has now
   proven the escape class twice (M7b/M7c, and the pre-harden `<td>` scan); the twin scan is the
   last top-level text-level geometry guard left. Cheap, mechanical, same pattern twice built.

5. **Close the commit-truthfulness loop (F6 + 15's F1).** A pre-commit/CI check that (a)
   refuses empty commits with a descriptive message, and (b) verifies that any `reviews/`/
   report path named in a commit message is in the diff. *Why fifth (but do it this week):*
   this review culture runs on claims being checkable — 15 found three mislabelled messages,
   today added a fourth (an empty one). Every later audit pays a tax re-establishing which
   bytes belong to which commit; the tax is avoidable with a two-line hook. Fold F4 (the W4-D
   supersession note) and F7 (the 31→35 comment) into the same doc pass — they are one-line
   fixes that belong to the same "documented claims match reality" discipline.

**Deliberately not in the top five:** F2 (auto-hide audit row — spec-silent, one line, fold it
into fix 1's IT pass), F8 (MediaController `produces` — the 406 probe shows the error bodies on
JSON endpoints are pinned; the media error path is the last sliver, P3), F10 (URL-normalize the
idempotency compare — one line, do it whenever the editor code is touched), F11 (pg-stat flake
mitigation — the IT is the only cost guard for the repo's most-cited performance claim, so
treat any CI red on it as "run it in isolation" until a better signal is chosen), F12 (the
JDK-gap comment — a sentence in `ci.yml`).

---

## 8. Constraint compliance (audit transparency)

* Read-only against the real tree; the only write is this report. All mutations, the production
  build and the backend test runs happened in `/tmp/review18-mut` (a `git archive HEAD` copy);
  every mutation was restored and byte-verified.
* No servers restarted or stopped. Live probes were read-only HTTP (`GET` with an
  `Accept: application/xml` header on one endpoint — no state change).
* The full test suites were not run (per instruction); targeted classes/specs only, listed in
  §1 with baselines.
* Evidence index: `/tmp/review18/` — `live-shelters.json`, `live-guidance.json`,
  `live-guidance.headers`, `live-datasource.json`, `live-index.html`, `xml-probe.json`,
  `be-base.log` … `be-b6b.log`, `fe-f1.log` … `fe-f8.log` (in the step-by-step runs),
  `mut-exif-jdk27.log`, `ng-build-head.log`, `ExifProbe.java`.

**Bottom line.** The day's work is sound where it matters: every guard this review praises went
red when its behaviour was removed (14/14), the one previously-proven escape hatch is closed, the
EXIF double-rotation suspicion is refuted on both runtimes, and the save-time hero import, the
trust snapshot and the SQL paging all hold under mutation. What remains is verification, not
behaviour: one untested race (the tally crossing), one stale dataset (the re-import), one growing
file (the admin page), one text-level guard seam (the geometry audit), and one process wound
(empty commit with a true-sounding message). None of the open items hides a false behaviour
claim in the code — the one false claim found is in a commit message, not in the system.

---

## Parent correction (2026-09-22, after the review)

**The registry-import finding is refuted by measurement, and this file is corrected rather than left standing.**

The review read "confirmed open: registry re-import" from `lastImport = 07:54:44Z` being earlier than the L-EST97 fix commit. That is an inference from a timestamp, and it is the same inference the delivery audit made earlier today. The served data contradicts it:

```text
GET /api/shelters?limit=200  → 200 rows, 189 PAASETEAMET on page 1
lat range 57.6148–59.4702   lng range 22.0291–28.1965   (all inside the 57.5–59.7 / 21.5–28.2 bbox)
Pärnu Hotell LÄ23016 → 58.38523, 24.50676   (the coordinate the value-detected axis order computes)
```

An earlier lane reconciled all 302 restored rows against the live publisher CSV and found them bit-identical; this probe independently confirms a sample. **No re-import is required, and no transposed pin is being served.** The lesson matches the one this repository keeps relearning: a stale *timestamp* is not evidence of stale *data* (see the coordination board's rule about counter-checks).

Everything else in the review stands, including the empty-commit finding (`9aff085`), which is accurate and mine.
