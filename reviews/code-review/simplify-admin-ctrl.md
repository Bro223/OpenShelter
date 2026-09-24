# SIMPLIFY-ADMIN-CTRL — admin list & action endpoints

**Lane:** SIMPLIFY-ADMIN-CTRL · **Branch:** `code-review` · **Mode:** behaviour-preserving readability pass.
**Scope (exclusive):** `src/main/java/ee/sheltermap/api/AdminController.java`, `AdminAccess.java`, `AdminSiteTextController.java`, `AdminMediaController.java` and the tests pinning them. `AdminModerationService` and `AdminGuidanceController` are NOT touched (other lanes own them).
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md`; skills `clean-code`, `code-review`, `test-driven-development` from `docs/skills/`.

---

## 1. What was already in good shape (and therefore mostly left alone)

- All three controllers are thin shells: parse → `adminAccess.requireAdmin()` → (bounds) → delegate to the service. No method in scope exceeded 13 body lines; no nested ternaries, no flag plumbing, no multi-dimensional parameters.
- The shared-guard extraction the recon asked to be reused was **already in effect** — see §3.
- 0 planning-id hits in all four files under the `SourceVocabularyTest` pattern set (grep-verified before editing); 0 history-phrasing comments. Feature-slug tags (`admin-moderation`, `community-review-queue v2`, `crisis-guidance`, `abuse-limits`, `site_texts`) were kept — they resolve to real `openspec/` paths, and the already-simplified sibling files (`AdminGuidanceController`, `ShelterController`, `SiteTextsService`) keep the same convention.

So the pass was small by design: four real readability defects, no gold-plating.

## 2. What changed (file:line, before → after)

**`AdminController.java` — 498 → 492 lines (−6)**

| Change | Before → after |
|---|---|
| New `private static <T> ResponseEntity<List<T>> pagedResponse(Pagination.Paged<T>)` (6 lines incl. Javadoc, placed after the constructor — the response idiom of 4 of the 5 endpoints) | new |
| `listShelters` body — the 4-line `paged` variable + `ResponseEntity.ok().header("X-Total-Count", …).body(…)` tail (duplicated 4×) → one `return pagedResponse(moderation.listShelters(…))` | body 11 → 8 lines |
| `listAudit` body — same extraction | 7 → 4 |
| `listShelterReports` body — same extraction (2-line call kept 2-line) | 7 → 4 |
| `listUsers` body — same extraction | 8 → 5 |
| `listShelters` "bounds before the read" comment tightened 5 → 4 lines, every constraint kept (rejected page pays no load; filters+slice in SQL; batches over the page's ids only; total = the count twin = filtered length WITHOUT paging; the paging ITs pin it) | 5 → 4 lines |
| `ALERTS_DEFAULT_LIMIT` — package-private `static final` → `private static final` (no reference outside the file, grep-verified) | line-preserving |

The four paged lists now read identically: guard → bounds → `return pagedResponse(service call)`. The one shared response mechanism (the pinned `X-Total-Count` = filtered length without paging, always present) is spelled in one place.

**`AdminSiteTextController.java` — 81 → 80 lines (−1)**

| Change | Before → after |
|---|---|
| `update(@RequestBody UpdateSiteTextRequest, HttpServletRequest servletRequest)` — the `servletRequest` parameter was never read (dead: the sibling `@ExceptionHandler` builds the 400 from its own request parameter). Deleted. | signature 2 → 1 line; `update` body 5 → 4 |

No runtime or contract impact: Spring injects only declared parameters, and servlet-request parameters are not part of the OpenAPI document.

**`AdminAccess.java` — 53 → 53 lines (±0, comment-only)**

| Change |
|---|
| Class Javadoc missing punctuation: "shared by every /admin/* controller the kind column is the truth" → "… /admin/* controller: the kind column is the truth" |
| Stale reference `{@code config/SecurityConfig#configure}` → `{@code config/SecurityConfig#securityFilterChain}` — `SecurityConfig` has no `configure` method; the defence-in-depth note the sentence points at sits at `SecurityConfig.java:276-282` inside `securityFilterChain`. |

`requireAdmin()` itself was left verbatim: it is already the flat early-return shape (401 via `CurrentCaller.requireUserId()`, 403 via the column-only `isAdmin` probe) and is the pinned second line of the authN boundary (recon §5.6).

**`AdminMediaController.java` — 202 → 203 lines (+1)**

| Change | Before → after |
|---|---|
| `upload` body: the `file.getBytes()` try/catch → `IllegalStateException("Could not read the uploaded file")` translation extracted to a new `private static byte[] uploadBytes(MultipartFile)` (7 lines incl. the moved constraint Javadoc "The ACTUAL bytes received — the service caps on bytes.length (never Content-Length)"). The endpoint body is now guard → `media.upload(requireAdmin(), uploadBytes(file), …)` → 201. | body 13 → 5 lines |

Same exception type, same message, thrown at the same point (the resolver-level 500 pin in `ApiErrorHandlerClientErrorsMvcTest` is the proof).

**Line counts:** before → after — `AdminController` 498 → 492 (−6), `AdminAccess` 53 → 53 (±0), `AdminSiteTextController` 81 → 80 (−1), `AdminMediaController` 202 → 203 (+1).

## 3. Duplicated-authorization finding (parent rule 2)

**Finding: none — the shared guard is in effect on every endpoint; nothing regressed to a local copy.**

Verified, not assumed:

- All **19** endpoints (15 in `AdminController`, 1 in `AdminSiteTextController`, 3 in `AdminMediaController`) call `adminAccess.requireAdmin()` exactly once — endpoint count and `requireAdmin` call count match 15/1, 1/1, 3/3 (grep).
- **Zero** `isAdmin`, `CurrentCaller` or `SecurityContextHolder` references in the three controllers; `AdminAccess` is the only place that pairs the JWT-principal read with the fresh kind check (matching its own Javadoc: "One implementation for the whole admin surface").
- Write endpoints consume the returned actor id for the moderation audit trail; read endpoints discard it — exactly the documented contract ("read endpoints ignore it").
- The 401-before-403 order and the anonymous-first convention are pinned unmodified: `AdminAuthorizationIT` 5/5 (anonymous → 401, verified non-admin → 403, admin → 200, hardening headers, no cookie), `SiteTextsApiIT` 401/403 legs, `AdminModerationIT.anonymousAdminRequestsAre401` / `aVerifiedNonAdminGets403AndNoData` / `aDemotionTakesEffectImmediatelyOnTheNextRequest`.

## 4. Evidence responses are unchanged

**Pinned suites, all unmodified, all green (focused run 148/148, exit 0):**

| Suite | Result | Pins |
|---|---|---|
| `AdminModerationIT` | 25/25 | the four paged lists: shape, id-order, `X-Total-Count` = filtered length WITHOUT paging (always present), consecutive pages tile without overlap/skips, offset-past-end = empty page + intact total, the uniform 400s with the verbatim messages ("limit must be between 1 and 200", "offset must be non-negative"); hide/restore, delete, review, audit, report queue (incl. `excludeDismissed` scope + open count), users list, dismiss idempotency |
| `UserSuspensionIT` | 6/6 | suspend/unsuspend: idempotent 204, provisioned-admin 403 with the pinned message, guest 409, unknown 404, login/refresh/JWT doors, audit rows newest-first |
| `SiteTextsApiIT` | 8/8 | site-text save: 401 anonymous, 403 non-admin, 204 round-trip through the public read, blank-reset, 400 on unknown key / non-https URL / URL on non-link key |
| `AdminMediaClientErrorsIT` | 4/4 | 415/400/413 client-error vocabulary with cap-named message, library paging + `X-Total-Count` stability across pages |
| `AdminAlertsIT` | 7/7 | the alerts list (default 50, `requireDefaultedLimit` 400s) |
| `AdminAuthorizationIT` | 5/5 | the 401/403/200 matrix over the real security chain |
| `OpenApiSnapshotIT` | 1/1 | **`docs/api/openapi.json` byte-identical** (live document vs committed snapshot) |
| `OpenApiContractIT` | 10/10 | exact path+method inventory, bearer scheme, `x-admin-only` + 403 on every admin operation |
| `ShelterPagingCostIT` | 5/5 | the planner-sensitive admin list SQL — cost behaviour unchanged |
| `CommunityReviewIT` | 14/14 | the review decisions (CONFIRM/REJECT vocabulary) |
| `MarkInaccurateIT` | 5/5 | mark/clear (optional body, idempotent 204) |
| `ShelterHistoryIT` | 4/4 | the edit-history read (dangling-shelter 200, absent 404) |
| `ShelterInfoRequestIT` | 6/6 | the info request (204/404/409-one-exchange) |
| `ProvenanceApiIT` | 8/8 | the admin list's provenance fields |
| `MediaDerivativeServingIT` | 2/2 | the media DTO's derivative/srcset fields |
| `ApiErrorHandlerTest` + `ApiErrorHandlerClientErrorsMvcTest` | 12 + 4 | the 4xx mapping the upload's resolver-level shape relies on |
| `DocumentationFactsTest` | 21/21 | the current-state anchors (incl. the one into my file — §5) |
| `SourceVocabularyTest` | 1/1 | the planning-id guard |

**Byte-level evidence:**

- `git diff docs/api/openapi.json` → **empty** (the snapshot is untouched), and `OpenApiSnapshotIT` green. No controller method was renamed (`operationId` values are pinned in the snapshot — `listShelters`, `listAudit`, `listShelterReports`, `listUsers`, `suspendUser`, `unsuspendUser`, `upload`, `list`, `delete`, `update`, … all kept) and no OpenAPI annotation text was touched — the diff is confined to method bodies, one private helper per file, one dead parameter, and two Javadoc lines.
- The 401/403/404 ordering and paging semantics (bounds before the read, clamped 1..200 / ≥0 sizes, totals) are unchanged by construction: the same `Pagination.requireLimit`/`requireOffset`/`requireDefaultedLimit` calls in the same order (their exceptions are thrown before the service read, exactly as before), and the header is built from the same `Paged.total()` value — the pinned tests above are the proof, unmodified.
- The full-suite gate adds the remaining 1,201 tests (other lanes' pins) — see §6.

## 5. Anchor status

One `docs/agent/00-CURRENT-STATE.md` citation lands in scope: `AdminController.java:397` — the `excludeDismissed` parameter of `listShelterReports` (the "hide dismissed" scope clause). **Kept byte-stable:** the net line delta before that line is exactly 0 (helper +7, `listShelters` body −3, its comment −1, `listAudit` body −3), verified post-edit: line 397 is still `@RequestParam(required = false) Boolean excludeDismissed,`. `DocumentationFactsTest` ran 21/21 green in both the focused run and the full gate — **no anchor shift, nothing owed to the anchor pass.** (Note: had the `pagedResponse` helper been appended at the bottom of the file per the details-last habit, the citation would have drifted to :391 and gone red; its placement after the constructor — the idiom of 4 of 5 endpoints — is what makes the delta net zero.)

## 6. Gate

- **Baseline (pristine tree, before the first write, under the lock):** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0** — 1349/1349, 0 failures/skipped, PMD check clean, jacoco "All coverage checks have been met" (0.93 floor), `DocumentationFactsTest` 21/21, `OpenApiSnapshotIT` green. Ran 22:31:37–22:34:24 (my first source write: 22:35:51 — pristine proven). Log/exit: `/tmp/simplify-admin-ctrl-baseline.{log,exit}`.
- **Focused pinning run (post-edit, under the lock):** 148/148, exit 0 — 22:38:04–22:39:58, `/tmp/simplify-admin-ctrl-focused.{log,exit}`.
- **Post-change full gate (under the lock):** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0** — **1349/1349, 0 failures/skipped** (baseline exact), BUILD SUCCESS with `pmd:check` (`failOnViolation`, priority ≤ 2) → PMD clean, jacoco "All coverage checks have been met", `DocumentationFactsTest` 21/21, `SourceVocabularyTest` 1/1, `OpenApiSnapshotIT` 1/1. Zero `class file does not exist` / `NoClassDefFound` lines (no unlocked-build hazard). Ran 22:40:48–22:43:40; all four of my files' last writes (22:35:51–22:36:59) predate it, and the only other in-tree diff (SIMPLIFY-ACCOUNT-BE's `auth/Account*`, last written 22:27:52) was stable and green in both gate windows — **no foreign failures**. Log/exit: `/tmp/simplify-admin-ctrl-gate.{log,exit}`.

## 7. Left deliberately, and why / unverified

Left as is:

- **OpenAPI annotation text** on every endpoint — the snapshot is byte-pinned; only Javadoc/inline comments were reworded.
- **All public method names** — `operationId`s are in the snapshot.
- **`AdminMediaController.list`'s inline 3-line response tail** — the file's only paged list, and its rows are DTO-mapped between the read and the response, so the `AdminController` helper's `Paged<T>` shape does not fit it; a single call site would make a shared helper speculative generality. (Same inline shape the already-simplified `AdminGuidanceController` keeps.)
- **`toDto`'s 12-argument positional construction** — the `MediaAssetDto` record shape is pinned by the snapshot; renaming/reordering fields is a contract change, not a readability one.
- **Constructor null-check asymmetry** (`AdminSiteTextController` uses `Objects.requireNonNull`, the others don't) — changing failure modes at startup is a behaviour change, not a readability one.
- **Feature-slug comment tags** — resolvable to `openspec/` (see §1).

Unverified: nothing in scope is left unverified — every in-scope behaviour is covered by the 148-test focused run and the full gate. One tree note: at both gate times the tree carried another lane's in-flight (uncommitted) `auth/AccountController.java` + `auth/AccountService.java` — not my files; they compiled and their suites ran green inside both gates (no foreign failures).
