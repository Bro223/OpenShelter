# BE-RECON — backend readability reconnaissance (read-only)

**Lane:** BE-RECON (batch 1) · **Branch:** `code-review` · **Mode:** read-only — no code changed, no tests run.
**Scope:** `src/main/java/ee/sheltermap/**` (358 files, ~31.5k lines) plus the guard tests that pin it.
**Method:** full read of the ten largest service/API files, spot-reads of the remainder, an AST-style method-length scan, a package-import dependency scan, duplication scans, and cross-checks against the pinned anchors in `docs/agent/00-CURRENT-STATE.md` (107 anchors, content-checked by `src/test/java/ee/sheltermap/config/DocumentationFactsTest.java`) and the closing decisions in `docs/closing-decisions-2026-09-24.md`.

Everything below carries `file:line` evidence (paths relative to the repo root, `src/main/java/ee/sheltermap/` abbreviated as `ee/`). Findings that other lanes must act on are re-stated in §8 for the notes board.

**Headline:** the backend is in good structural shape. There is no layering collapse, no unbounded query in the public read paths, and no confirmed behavioural bug. The readability debt concentrates in five places: the `guidance` and `api` service classes (duplication of validation prologues and boolean-flag overload chains), one main-source class that is only exercised by tests (`guidance/MarkdownToHtml.java`), two admin-only full-table reads with PII decryption, and ~600 planning-id comment references the vocabulary guard does not catch.

---

## 1. Layering and dependency direction

**Overall: clean.** Measured package-import counts (main tree): `persistence → domain` (31), `api → domain` (25), `auth → domain` (16), `persistence → app` (15), `app → domain` (12), … `domain` imports **no** other package; `app`, `auth`, `verification` never import `api` or `persistence`. The one deliberate inversion is documented: service packages own the repository **interfaces** ("approach B"), `persistence` owns the JPA implementations — e.g. `persistence/JpaUserRepository.java:34` implements `app.UserRepository`; every `persistence → {app,auth,guidance,verification,retention}` import is one of these interface/record seams, never a service call. Treat this as an accepted convention, not a violation.

Findings:

1. **Service → web-layer import (the only reverse leak).** `guidance/MediaService.java:3` imports `ee.sheltermap.api.Pagination` to use the `Pagination.Paged` record. `api/Pagination.java:20-28` is a pure value object (bounds + `slice` + `Paged`) with no web dependency — it is in the wrong package, not misused. Fix direction: move `Pagination` out of `api` (to `app` or a small `paging` package). **Shared-file caveat:** `Pagination` is imported by many controllers; the move must be serialized across lanes (notes-board entry §8).
2. **A persistence-layer dependency on a formatting utility.** `persistence/UserMapper.java:10` and `persistence/JpaUserRepository.java:9` import `verification.PhoneNumbers` for E.164 canonicalization at the blind-index boundary. The utility does not belong to the verification flow; moving it to a neutral home (`domain` or `security`) deletes the `persistence → verification` edge without touching behaviour.
3. **The `api` package mixes two layers.** Two of the ten largest files are service classes living in `api`: `api/ShelterQueryService.java` (887 lines) and `api/AdminModerationService.java` (756). The `app` package holds the other services (`app/ShelterService.java`, `app/ShelterReportService.java`). There is no rule violated, but "api" should read as the HTTP surface; a reader cannot tell from the package alone that these two files carry business logic. Renaming/relocating is a big-diff, zero-behaviour job — recommend **not** doing it in this run (minimality); document instead.

## 2. God files and long methods

File size (main source, lines):

| File | Lines | Character |
|---|---|---|
| `guidance/GuidanceService.java` | 1063 | **genuine god class** — public reads + fallback resolution, admin reads, create/update/updateInLocale, publish/unpublish, delete, reorder, slug rules, hero-import decision, audit labels (62 methods) |
| `api/ShelterQueryService.java` | 887 | projection + batched trust lookups + community pulse + per-row DTO mapping (42 methods) |
| `api/AdminModerationService.java` | 756 | one moderation surface: report queue, user suspension, review, audit, info requests |
| `api/AdminGuidanceController.java` | 753 | mostly OpenAPI annotation volume; real logic is `matchesPost` + `toAdminDto` chain |
| `api/ShelterController.java` | 552 | HTTP surface; the `update` method carries real state-preservation logic |
| `api/ApiErrorHandler.java` | 515 | 20+ small `@ExceptionHandler` methods — big but declarative (table-shaped) |
| `app/ShelterService.java` | 509 | submission service + abuse caps + history |
| `api/AdminController.java` | 498 | HTTP surface for the moderation endpoints |
| `guidance/HeroImageImportService.java` | 449 | security-heavy fetch/validate/import |
| `guidance/MarkdownToHtml.java` | 411 | **main-source code referenced only by tests** (§2.2) |

### 2.1 Longest methods (measured, comments/strings stripped; lower bounds for wrapped signatures)

| Lines | Location | Note |
|---|---|---|
| 127 | `guidance/MarkdownToHtml.java:99` `convert` | hand-rolled markdown→HTML line loop |
| 99 | `config/SecurityConfig.java:204` `securityFilterChain` | declarative chain — leave as is |
| 88 | `guidance/MarkdownToHtml.java:245` `inline` | inline-markdown switch |
| 86 | `guidance/HeroImageImportService.java:322` `store` | the security boundary — do not split for its own sake |
| 79 | `app/ShelterService.java:150` `addPlace` | three abuse checks + snapshot + history; each block is coherent |
| 78 | `sitetexts/SiteTextsService.java:61` `update` | |
| 76 | `verification/VerificationService.java:106` `requestVerification` | |
| 74 | `api/ShelterQueryService.java:472` `toDto` | per-row mapper over the 8-field `Batches` |
| 62 | `guidance/GuidanceService.java:551` `updateInLocale` | |
| 51 | `api/ShelterQueryService.java:318` `batchesFor` | the shared aggregate pass |

Most of these are long **because they are honest** (each block does one thing with a heavy constraint comment). The ones worth attacking are where length is caused by *repetition* or *boolean plumbing* — see §3 and §7.

### 2.2 `guidance/MarkdownToHtml.java` — main-source code with no production callers

`grep -rl MarkdownToHtml src/main/java` returns only the class itself; the sole users are `src/test/java/ee/sheltermap/guidance/MarkdownToHtmlTest.java` and `src/test/java/ee/sheltermap/guidance/MarkdownMigrationDriver.java` (a one-shot data-migration driver). That is 411 lines of main source (plus `convert`/`inline`, the two longest methods in the tree) that the running product never executes. **This is an owner decision, not a lane decision:** the run's hard rule forbids deleting tests, and `MarkdownToHtmlTest` is a full test class. If the owner rules it dead, the class **and** both test files go together (notes-board entry §8); if it stays, its two 100-line methods are simplification targets, not the rest of the tree.

### 2.3 Where `GuidanceService` would split (if a lane takes it)

Natural seams, all currently private/public within one class:

- **Public read + fallback** — `listPublic` :214, `translationInLocale` :324, `getByPublicSlug` :347, `findByLocale` :390
- **Admin write family** — `create` :422, `update` :479, `updateInLocale` :551, `publish` :631, `unpublish` :654, `delete` :678, `reorder` :706, `reorderInLocale` :724, plus the translation CRUD :930-989
- **Hero decision** — `resolveHeroOnSave` :802, `requireHeroPairing` :777, `normalizeImportUrl` :878

The write family shares the duplicated prologue (§3.1), so extracting it is the cheap first step; a full class split is a multi-day job and should only start after the duplication inside it is gone.

## 3. Duplication that survived prior sweeps

1. **The guidance content-validation prologue — 5 copies.**
   `create` `guidance/GuidanceService.java:427-432`, `update` `:484-489`, `updateInLocale` `:582-586`, `createTranslation` `:935-936`, `updateTranslation` `:969-970` each re-run the same sequence: `requireTitle` → `sanitize` → (`normalizeImportUrl` + `requireHeroPairing` + `heroAlt` trim for the three post-level writes). One small value type (e.g. `CleanedContent`) built by one helper removes all five copies and makes the order of checks a single visible thing.
2. **`ShelterQueryService` boolean-flag overload chains.**
   `toDtos` has three overloads funneling into `(shelters, callerId, withInfoRequests, withPulse, ownSurface)` (`api/ShelterQueryService.java:269-297`); `batchesFor` has three more (`:310-320`) feeding an **8-field positional `Batches` record** (`:372`). This is exactly the "multi-dimensional variables" pattern the run doc names: a reader must track which boolean is which across 42 methods. The fix is a named options/projection type, not more overloads.
3. **`ContactChangeService` email/phone quadruple.**
   `requestEmailChange` `auth/ContactChangeService.java:130-170` vs `requestPhoneChange` `:214-250`: two ~40-line methods differing only in the normalizer, the channel sender, the equality message and the duplicate constant. `confirmEmailChange` `:180-210` vs `confirmPhoneChange` `:252-277` are the same story (re-check → apply → save-with-race-catch → delete pending). Parameterize on a small channel strategy; **the three-phase send-first-then-commit transaction shape is the mechanism that must survive** (§5).
4. **`JpaShelterRepository` page/count twins.**
   `findAdminPage` `persistence/JpaShelterRepository.java:238-258` and `countAdminPage` `:264-281` build the identical dynamic WHERE (sources IN / status / q LIKE) — the count twin even self-describes as "same dynamic where". One `adminWhere(...)` returning (fragment, params) removes ~18 duplicated lines. **Caveat:** the SQL is planner-sensitive (the comment at `:233-237` documents the traps) and the cost behaviour is pinned by `ShelterPagingCostIT` — the generated SQL must stay byte-identical.
5. **`EXTENSION_BY_TYPE` — identical maps in two classes.**
   `guidance/MediaService.java:65-69` and `guidance/HeroImageImportService.java:106-110` both declare `Map.of("image/jpeg","jpg","image/png","png","image/webp","webp")`. One shared constant in the guidance package (next to `MediaImageInspector`) is a 10-line fix.
6. **`AdminModerationService` DTO-mapping duplication + `kindName`/`UserKind`.**
   The `AdminUserDto.of(user.getData(), kindName(user), ...)` map appears in both `listUsers` branches (`api/AdminModerationService.java:645-647` and `:653-655`); `kindName` `:727-735` re-spells the three `persistence/UserKind.java:8-10` names as strings. The mapping is one expression to extract; `kindName` should read from `UserKind` (or the domain kind) instead of re-encoding it.
7. **`deriveOccupancy` / `deriveOpenStatus` structural twins.**
   `api/ShelterQueryService.java:695-716` and `:725-746` are the same algorithm (group by shelter → latest by timestamp+user-id tie-break → agreeing count → newest timestamp) over two entity types. A small generic helper is possible, but the semantics are documented twice in the Javadocs and pinned by tests — low payoff, do it only if the `ShelterQueryService` lane is already there.
8. **Rate-limiter client-IP trio in four controllers.**
   `auth/AuthController.java:236`, `auth/AccountController.java:260`, `auth/VerificationController.java:110`, `api/LocationController.java:97` each repeat `ClientIps.resolve(http, trustedProxies, trustLoopback)` with the same two `@Value` fields (`trustedProxies`, `trust-loopback`). One small component (the resolver + its two config values) would de-duplicate four constructor tails.

## 4. Naming and stale / history / task-id comments

1. **~600 planning-id references survive in main-source comments.** Counts (grep across `src/main/java`): `D4` ×97, `D3` ×68, `W2-A` ×60, `D2` ×58, `D1` ×51, `D7` ×39, `D8` ×32, `D5` ×32, `P2-9` ×30, `W3-A` ×27, `V23/V26/V27/V7/V8/…` ×90+, `Wave 9` ×11, `M9` ×8, `M5b` ×5. Heaviest files: `guidance/GuidanceService.java` (17), `api/ShelterQueryService.java` (14), `app/ShelterService.java` (11), `api/AdminModerationService.java` (9), `guidance/MediaService.java` (8).
2. **The vocabulary guard does not catch any of them — a live example of the §7.4 hollow-guard lesson.** `src/test/java/ee/sheltermap/config/SourceVocabularyTest.java:47-69` forbids `ORCH-\d+`, `de-slop A\d+`, `wave-\d+` (hyphenated, lowercase), `W\d+/W\d+` pairs, `reviewer [NF]\d+`, `N\d+ finding`, `SW-C\d+`, `[A-Z]\d+ (review|finding|pass)`, dated-review — but the codebase's actual ids (`Wave 9`, `W2-A`, `D4`, `M9`, `V26 invariant`, `M5b`) match none of those patterns, so the guard passes while the exact comment disease the run doc names ("comments that state the constraint, not the history or the task id") is the most common comment shape in the guidance and shelter code. **Two-part finding:** (a) the comments — e.g. `GuidanceService.java:409,436,465,493,574,621,793,802` all say "(the Wave 9 trigger)" when the constraint is simply "the import runs at save time"; (b) the guard's pattern list is stale relative to the ids actually in use. Extending the guard needs care: `V\d+` legitimately names applied migrations (do not ban migration names), so the fix is targeted (ban the wave/decision-id *forms* actually present, with the same anchored-syntax discipline the existing patterns use), and it belongs to the guard-owning lane.
3. **History phrasing:** 57 comment lines in main source use "previously / old(er) behaviour / before this" phrasing. Most are legitimate constraint statements (e.g. `ShelterController.java:126-129` documenting that the removed `minRating` param is *still accepted and ignored* — that is current behaviour, keep it). The ones where the code no longer does what the comment narrates should go; audit during file-touching lanes, not as a standalone sweep.
4. **Names that understate the shape:**
   - `Batches` (`api/ShelterQueryService.java:372`) — eight positional maps; the record field names carry the meaning, the constructor call sites do not. A `Projection` options type + named batch inputs fixes naming and plumbing together (§3.2).
   - Boolean params: `toDtos(..., boolean withInfoRequests, boolean withPulse, boolean ownSurface)` (`:286`), `matchesPost(..., boolean scoped, ...)` (`api/AdminGuidanceController.java:206`).
   - `api/AdminGuidanceController.java:685-720` — a four-link `toAdminDto` overload chain whose only difference is a trailing `heroImportError`; one method with a nullable/`Optional` error and a Javadoc sentence beats four overloads.
   - `kindName` (`api/AdminModerationService.java:727`) — returns the persistence enum's names as strings (§3.6).
5. **Dead parameter documented as dead.** `api/ShelterController.java:108` — the `ShelterRepository` constructor argument is "no longer assigned", retained "for the frozen constructor signature (the detail-read test seam)"; the sole constructor is `src/test/java/ee/sheltermap/api/ShelterControllerDetailReadTest.java`. A future maintainer will assume the parameter is used. Removing it is a one-line test-lane change (notes-board entry §8).

## 5. Verified mechanisms that must NOT be simplified (must-stay list)

These were built deliberately, are pinned by tests and/or by the current-state document's guarded anchors, and are **out of scope for simplification** (a lane may improve their *expression* only when it can prove behaviour identity):

1. **Paging vocabulary.** `api/Pagination.java:20-28` (bounds + single 400 vocabulary), `:33` `MAX_PAGE_SIZE`, `:50-74` `requireLimit`/`requireOffset`, `:102-122` `slice` + `X-Total-Count` = *filtered length without paging*. Pinned by current-state §4 and read on the frontend (`frontend/src/app/shared/paging.ts:71-79`).
2. **Trust ladder.** `api/SubmitterVerification.java:10-33` derive-on-read depth; the V31 write-time snapshot field `domain/Shelter.java:46-58` (erasure must not change standing — closing decision #6); the DTO contract `api/ShelterDto.java:126-134` (pinned anchor, OR-of-two-report-kinds); `domain/Provenance.java:59-80` derivation precedence; `app/ReporterTrustEvaluator.java` + `domain/ReporterTrust.java` damping weights.
3. **Report/verification rules.** Auto-confirm: 3 *distinct verified* confirmers, submitter excluded (`app/ShelterReportService.java:348-358`, `domain/ShelterReport.java:26-28,30`). Auto-hide: weighted sum ≥ 5 with damped duplicates at 0 (`app/ShelterReportService.java:276-280,309-314`, `domain/ShelterReport.java:41`). Dismissed exclusion lives in the store queries (`persistence/SpringDataShelterReportRepository.java:17-20,25-28,32-36`). Pinned by current-state §2-§3.
4. **Save-time hero import.** `REQUIRES_NEW`, never blocks the save, failed URL kept as retryable, idempotent same-URL re-save: `guidance/HeroImageImportService.java:24-33`, `guidance/GuidanceService.java:801-858`. Pinned by current-state §5.
5. **Registry import safety.** Value-based L-EST97 axis detection with loud per-row rejection (`ingestion/Lest97AxisOrder.java:7-62`), the Estonia bbox guard kept in two places (`domain/GeoPoint.java:7-24`, `ingestion/CsvRegistryClient.java:196-225`), skip-never-delist (`ingestion/CsvRegistryClient.java:138-146,202-209`), parser-loss logging (`:120-126`). Pinned by current-state §6; closing decision #9 keeps the bound.
6. **AuthN boundaries.** `config/JwtAuthenticationFilter.java:55-90` (fresh column-only `isSuspended`/`isAdmin` per request — never a token claim; the demoted-admin case), `api/AdminAccess.java:40-48` (the deliberate second line + audit actor), `config/SecurityConfig.java:192-196` (X-Total-Count exposed by name, never wildcard).
7. **Planner-sensitive SQL.** `persistence/JpaShelterRepository.java:200-232` — the dynamic WHERE exists because static `(:p IS NULL OR …)` shapes and full-domain IN lists seq-scan (documented traps, measured by `src/test/java/ee/sheltermap/api/ShelterPagingCostIT.java`). Any change must keep generated SQL byte-identical and the cost IT green.
8. **User persistence invariants.** `persistence/JpaUserRepository.java:55-110` — version copy-back (stale-stamp → 409, never silent revert), claim diff on (level, contact, revokedAt) with delete-before-insert (Hibernate flush-order + V3 partial unique index), HMAC blind-index canonicalization (`:150-180`), column-only fast paths.
9. **Contact-change transaction shape.** Send-first-then-commit (no pending row when the channel refuses) and commit-the-failed-attempt (`auth/ContactChangeService.java:129-210`) — the 5-attempt lockout only holds because the failed-attempt increment commits.
10. **Erasure semantics.** `auth/AccountService.java` — public rows orphaned to `created_by NULL`, private rows purged, provisioned-admin protection, JWT-stays-valid-until-expiry for deleted accounts. Pinned by closing decisions #6/#7 and the `legal-recovery` comments.
11. **The hand-written image parser.** `guidance/MediaImageInspector.java` — dependency-free JPEG/PNG/WebP header reads with EXIF orientation; every hostile/truncated header answers "normal, never an exception" (bounds-checked throughout; tested against fixture bytes). Do not swap in a library for readability.
12. **The guards themselves.** `DocumentationFactsTest` (107 anchored claims), `SourceVocabularyTest`, `ShelterPagingCostIT` and its `it.db.*` datasource seam (`src/test/java/ee/sheltermap/persistence/AbstractPersistenceIT.java`), `scripts/commit-truthfulness-check.sh`. A green guard proves the guard ran — changes to guarded anchors require the `docs/agent/00-CURRENT-STATE.md` anchor update in the same edit, which is outside any backend lane's write scope; flag instead.

## 6. Bugs and hazards (behavioural/performance, reported separately from style)

**No confirmed behavioural bug was found.** The items below are performance, PII-handling or latent-correctness hazards, ordered by exposure.

1. **`listUsers` unpaged path decrypts PII for every user, including GUESTs.** `api/AdminModerationService.java:643-647`: when both paging params are absent, `users.findAll()` loads and **domain-maps the whole `users` table** (e-mail/phone envelope decrypt + claims for GUEST rows included) and then discards the GUEST rows in memory. The paged branch (`:649-656`) does exactly the right thing — `findAccountPage` excludes GUESTs in SQL so "a page never loads — and never decrypts — the whole account population" (its own comment). The unpaged branch violates the codebase's own column-only discipline and scales with the account population. Fix: an unbounded SQL-filtered read (REGISTERED+ADMIN only) or always page. Admin-only surface, so this is cost + discipline, not a leak.
2. **`openReportCount` global scope loads every shelter.** `api/AdminModerationService.java:415-425`: for the global open-queue `X-Total-Count`, `shelters.findAll()` maps the entire shelters table into domain objects just to feed the id list to the grouped count. The sibling `openReportPage` (`:375-398`) was deliberately rebuilt in W2-A as bounded SQL pages — the count side kept the old full-load. A single `SELECT COUNT(*)` over reports with `dismissed_at IS NULL` (optionally restricted to the scope) would be the matching cost model. **Constraint:** the value is documented ("the X-Total-Count *is* the sum of the per-shelter open counts the pins read", current-state §3; `:311-315`) and must stay exactly equal.
3. **`MediaService.listPage` runs `countAll()` twice per paged request.** `guidance/MediaService.java:148` (synthesizing the limit when `limit == null`) and again `:150`/`:156` (the `Paged` total). Hoist one `long total = mediaAssets.countAll()` per call.
4. **`addPlace` asks `isAdmin` three times per submission.** `app/ShelterService.java:160,183,201` — three separate `SELECT` round-trips for the same column on the submit path (the hot abuse-throttled path). One `boolean admin = userRepository.isAdmin(user.getId());` up top is behaviour-identical (single transaction, no interleaving writer can change the column mid-request) and halves the method's DB chatter.
5. **Fragile field carry-over in the owner-edit path (latent correctness hazard).** `api/ShelterController.java:436-465`: the `PUT /{id}` handler hand-copies eight admin/trust-owned fields (`id`, `createdAt`, `createdBy`, `autoHideDisarmed`, `reviewNote`, `inaccurateMarkedAt`, `inaccurateMarkedBy`, `submitterVerifiedAtCreation`, plus the `locationKind` default) from the loaded row onto a **newly constructed 12-argument `Shelter`**. Any future admin-owned or write-time field added to `Shelter` will be silently zeroed by an owner edit until someone remembers this list. The carry-over belongs on the domain (`shelter.applyOwnerEdit(request)` or a repository update restricted to writable columns) so the "what an owner edit may touch" rule lives next to the fields it protects.
6. **Documented dead constructor parameter.** `api/ShelterController.java:108` — `ShelterRepository` "is no longer assigned", kept for the frozen test seam (`ShelterControllerDetailReadTest`). Not a bug; a trap for the next reader, and removable only with a test edit (§8).
7. **Guard-coverage gap (not a code bug, a guard bug).** §4.2: `SourceVocabularyTest.java:47-69`'s forbidden patterns miss every id form the codebase actually uses, so the "no unresolvable planning ids" rule passes vacuously for ~600 references — the same failure mode as current-state §7.4 ("a green guard proves the guard ran, not that the behaviour exists").
8. **Minor:** `AdminGuidanceController.java:142-198` — the unscoped search fetches *all* translations (`guidance.translationsByPost()`, :176) into memory for every unscoped admin list/search call; bounded by the library size (guidance posts are few) but it is the same W2-A pattern the paged hero index already fixed (`:190-194` comment). Watch item for a guidance lane.

## 7. Top ten readability targets, priority order

Priority = payoff per unit of risk, behaviour-preserving, cheapest first where payoffs tie. Each is one lane's job.

1. **GuidanceService: extract the 5-copy validation prologue** (`guidance/GuidanceService.java:427-432, 484-489, 582-586, 935-936, 969-970`) into one helper returning the cleaned/validated values. Largest file in the tree; removes the most repeated block in the backend; zero behaviour risk if the helper keeps the same call order and messages.
2. **ShelterQueryService: replace the boolean-flag overload chains + 8-field `Batches`** (`api/ShelterQueryService.java:269-320, 372`) with one named projection-options type and named batch inputs. This is the run doc's explicit "multi-dimensional variables" target. Risk: medium (heavily pinned) — the options type is an expression change; the batched queries and derivations stay byte-identical.
3. **`MarkdownToHtml`: get the owner decision** (dead main source — §2.2). If kept: simplify `convert`/`inline` (`guidance/MarkdownToHtml.java:99,245`, the two longest methods in the tree). If dead: delete class + the two test files together (owner sign-off, since tests are involved).
4. **ContactChangeService: parameterize the email/phone pair** (`auth/ContactChangeService.java:130-277`) on a small channel strategy (normalizer, sender, duplicate constant). Keep the three-phase transaction shape and the commit-the-failed-attempt rule verbatim (§5.9).
5. **ShelterController.update: move the field carry-over to the domain** (`api/ShelterController.java:436-465`) — kills the latent zero-out hazard (§6.5) and shrinks the controller's real logic. The M5b trust-reset semantics must remain observable-identical.
6. **AdminModerationService: fix the unpaged `listUsers` read** (`api/AdminModerationService.java:643-647`) to a SQL-filtered REGISTERED+ADMIN read (the paged branch's query without the LIMIT), and extract the duplicated DTO map while in the file. PII-decrypt + cost hazard, admin surface only.
7. **JpaShelterRepository: one `adminWhere` for the page/count twins** (`persistence/JpaShelterRepository.java:238-258, 264-281`). Generated SQL must stay byte-identical; `ShelterPagingCostIT` is the proof.
8. **`EXTENSION_BY_TYPE` to one shared constant** (`guidance/MediaService.java:65`, `guidance/HeroImageImportService.java:106`). Ten lines, near-zero risk.
9. **`openReportCount` global scope: store-level count** (`api/AdminModerationService.java:415-425`) replacing `shelters.findAll()`, with a test proving the sum equals the current per-shelter grouped-count sum (current-state §3 pins the value).
10. **`ShelterService.addPlace`: one `isAdmin` read** (`app/ShelterService.java:160,183,201`) into a local `boolean admin` — the exemption logic becomes readable as one decision instead of three identical guards.

**Secondary targets** (do when a lane is already in the file): `deriveOccupancy`/`deriveOpenStatus` generic helper (`api/ShelterQueryService.java:695-746`); the four-link `toAdminDto` chain (`api/AdminGuidanceController.java:685-720`); `MediaService.listPage` double `countAll` (`guidance/MediaService.java:148-156`); the rate-limiter client-IP trio in four controllers (§3.8); `kindName`/`UserKind` unification (§3.6); `Pagination` package move (§1.1); `PhoneNumbers` relocation (§1.2); the `GuidanceService` class split (§2.3 — only after target 1); `ApiErrorHandler` is big but declarative — leave it.

## 8. Cross-lane items (mirror to `docs/autopilot/CODE-REVIEW-NOTES.md`)

- `api/ShelterController.java:108` — dead `ShelterRepository` constructor param; removal needs the test seam in `src/test/java/ee/sheltermap/api/ShelterControllerDetailReadTest.java` (test lane).
- `guidance/MarkdownToHtml.java` — main source with no production callers; an owner decision is needed before any lane touches it (deletion would delete tests — currently forbidden).
- `api/Pagination.java` — proposed move out of `api` (target of `guidance/MediaService.java:3`); shared by many controllers, so serialize the move across lanes.
- `SourceVocabularyTest` — the planning-id guard misses the id forms actually in use (§4.2); the guard-owning lane should extend the patterns (migration-name forms stay legal).
- Any lane whose edit touches a file cited in `docs/agent/00-CURRENT-STATE.md` must update the anchor in the same edit — the doc is outside every lane's write scope here; report the needed anchor change instead.

## Unverified / not covered

- `ApiErrorHandler`, `VerificationService`, `PasswordResetService`, `LocationResolveService`, `JdkHeroImageFetchClient`, `GuidanceOrderingService` were spot-read, not line-by-line; no finding above is based on an unread region except where stated.
- No tests were run (read-only lane); all "pinned" claims were verified against the guard tests' *sources*, not by executing them.
- Frontend, migrations, `openspec/**`, `docs/skills/**`: untouched and out of scope per the run rules.
