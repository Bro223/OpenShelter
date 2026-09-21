# Agent 5 — Backend data access & performance review (run 2)

Repository: `/home/aleks/MyScripts/LocalRepos/OpenShelter`
Reviewed tree: `d247007` + 27 uncommitted files (the admin list lane: paging on
`GET /admin/shelters` and on the guidance lists).
Read-only review: no source file was modified; the only file written is this report.

**Method.** Everything below is judged against the current tree *and* against the
running instance. The running backend was compiled at 18:48 from sources last touched
at 18:47, i.e. `target/classes` **includes the uncommitted paging** — so the runtime
measurements describe the in-flight code. Read-only `GET`s were used; admin `GET`s
were authorised with a minted dev-secret JWT for the existing ADMIN row (id 64).
DB-side facts come from `pg_stat_user_tables` deltas around N identical requests with
10–15 s settle windows (two independent batches per measurement, identical results),
plus `pg_indexes` / `pg_constraint` dumps.

## Versions detected (judged against these)

| Component | Version | Source |
| --- | --- | --- |
| Java | 21 (toolchain ran on 27.0.0) | `pom.xml:16` |
| Spring Boot | 3.5.16 | `pom.xml:9` |
| Spring Framework / Data JPA / Hibernate | 6.2.19 / 3.5.13 / 6.6.53 | resolved deps of the running JVM |
| HikariCP | 6.3.3 | resolved deps |
| PostgreSQL / Flyway | 16 / 11.7.2 | `docker-compose.yml`, resolved deps |
| Tests | JUnit 5 + AssertJ + Testcontainers 2.0.5 | `pom.xml` |
| Angular frontend | (see agents 7–10) | `frontend/package.json` |

Schema state at review time: `flyway_schema_history` shows V1…V30 all `success`,
including V29 (users.version) and V30 (index cleanup + queue indexes).

## Correct — independently re-verified (not taken from the brief)

1. **No N+1 on the *shelter* list path — confirmed by counting statements.**
   `GET /admin/shelters` issues a fixed set of 13 statements per request (11 batched
   projection queries + 2 per-request auth reads), independent of row count:
   `shelters` ×1, `users` ×4 (`findByIds` authors, `findByIds` requesters,
   `isSuspended`, `isAdmin`), `shelter_reports` ×2 (`countByTypeForShelterIds`,
   `latestOpenConfirmedByShelterIds`), `shelter_occupancy_reports`,
   `shelter_open_status`, `moderation_actions` (`latestConfirmingByShelterIds`),
   `shelter_info_requests`, `verification_claims` (`findByUserIdIn`), `data_imports`
   (index scan). Measured, stable across two batches:
   `shelters seq +1.0/req, users seq +4.0/req, shelter_reports seq +2.0/req, …`
2. **Every index the batched lookups need exists.** Verified against `pg_indexes`:
   `idx_shelters_created_by` (V7), `uq_shelter_reports_shelter_user_type` +
   `idx_shelter_reports_shelter` (V9), `idx_shelter_occupancy_reports_shelter` (V9),
   `idx_shelter_open_status_shelter` (V22), `idx_moderation_actions_shelter` (V11),
   `idx_moderation_actions_moderator` (V30), `idx_moderation_actions_created` (V11),
   `shelter_info_requests_shelter_id_key` (V19),
   `idx_data_imports_source_time (source_name, imported_at DESC)` (V15),
   `idx_report_actions_user_time` (V9), `idx_shelter_history_shelter` (V18).
   **Precision note:** "index-backed" is true schema-wise, but the *plans* measured
   today are sequential scans, because the tables are tiny (308 shelters, 62 users,
   2 reports). That is the planner choosing correctly; it is not a defect, but the
   earlier sweep's "all index-backed" should not be read as "the plans use indexes".
3. **`@Version` → 409 in all three exception shapes** (earlier sweeps said two):
   `OptimisticLockException` + `OptimisticLockingFailureException` at
   `api/ApiErrorHandler.java:375-379`, and the commit-time
   `TransactionSystemException`→`StaleStateException` at `:395-402`. All map to
   "The resource changed under you; reload and retry" / 409.
4. **V29 landed and is wired end-to-end**: `ALTER TABLE users ADD COLUMN version
   BIGINT NOT NULL DEFAULT 0` (`V29__user_version.sql:26`), `@Version`
   (`persistence/UserEntity.java:88-90`), mapper round-trip + copy-back
   (`JpaUserRepository.save`, `user.setVersion(saved.getVersion())`).
5. **The report queue is bounded in SQL, index-backed** (was the earlier F3):
   `limit :limit` in the JPQL (`SpringDataShelterReportRepository.findLatest`
   /`findLatestByShelterId`) plus `idx_shelter_reports_created (created_at DESC,
   id DESC)` (V30:47). Measured `GET /admin/reports?limit=100`: 1 index scan,
   496 bytes, 2 rows.
6. **V30 both adds and drops correctly.** Added `idx_moderation_actions_moderator`
   and `idx_shelter_reports_created` exist in `pg_indexes`. Dropped
   `idx_shelters_county`, `idx_media_assets_source_url`, `idx_site_texts_key`,
   `idx_pending_contact_changes_user` are gone, and I re-checked the repo for the
   "no consumer" claim: `county` appears only as an entity/DTO/import field
   (no predicate anywhere in `main/`), `source_url` has no query, and the remaining
   two are leading-column-redundant with `uq_site_texts_key_locale (key, locale)`
   and `uq_pending_contact_change (user_id, type)` whose consumers
   (`findByKeyAndLocale`, `findByUserIdAndType`) match the composites.
7. **Write-path transaction boundaries are in place** (earlier F1):
   `app/ShelterService.java:128, 309, 378` are `@Transactional`, with the
   count-cap serialization at `:151` (`userRepository.lockForUpdate`);
   `verification/VerificationService.java:105, 241` are `@Transactional`.
8. **Sends really are outside the transaction** (earlier F2) — and I verified the
   *mechanism*, not just the ordering: `ContactChangeService.inTransaction`
   (`auth/ContactChangeService.java:107-160`) reads in one transaction, sends with
   no transaction, then writes in another; `VerificationService.requestVerification`
   performs the channel send before its first DB access (the send log is file-backed,
   the contact limiter in-memory). Decompiling
   `spring-orm-6.2.19 …/vendor/HibernateJpaDialect.beginTransaction` shows the
   physical connection is acquired at *begin* only when the isolation level is
   custom (I asked for) or `definition.isReadOnly()` is true — so a read-write
   `@Transactional` method with no statement before the send does **not** pin a
   pooled connection. The earlier fix does what it claims. (Caveat → F9.)
9. **Pool/JPA settings are explicit** (`application.yml:10-25`): Hikari
   `maximum-pool-size: 20`, `connection-timeout: 5000`; `ddl-auto: validate`;
   `open-in-view: false`. One config file for every profile (no
   `application-prod.yml`), so no profile can silently flip `ddl-auto`; the test
   overlay is a delta overlay guarded by `TestConfigOverlayTest`.
10. **Entity model is free of the usual JPA performance traps**: zero associations —
    `grep` for `@ManyToOne|@OneToMany|@OneToOne|@JoinColumn` in
    `src/main/java/ee/sheltermap/persistence/` returns nothing; every relation is a
    plain `Long` FK column with a DB-level `ON DELETE CASCADE/SET NULL`. Consequences:
    no lazy-loading N+1, no bidirectional-relation traps, no cascade bugs, no proxy
    identity issues. `equals`/`hashCode` are overridden on no entity and no domain
    class (verified) and no entity is used as a `Map`/`Set` key.
11. **Repository transaction flags are consistent**: I audited all 24 repository
    implementations (100+ methods). Every read is `@Transactional(readOnly = true)`,
    every write is read-write. The only unannotated repository methods are the ones
    that must join the caller's transaction by design
    (`JpaModerationAuditLog.record/recordLabeled/findLatest/countByModeratorAndAction`,
    `JpaShelterHistoryLog.record/findByShelterId`) — and their callers
    (`AdminModerationService.listAudit` `@Transactional(readOnly = true)`,
    `GuidanceService.*`) do open one.
12. **The new paging's bounds and ordering are correct and covered by tests.**
    All three paged endpoints use the same 1..200 / ≥ 0 vocabulary and answer 400
    through `ApiErrorHandler:156-167` (measured: `?limit=0` → 400, `?limit=201` → 400,
    `?offset=-1` → 400, `?limit=20&offset=99999` → 200 `[]`). The slice always runs
    over a *total* order: shelters by `id` (`ShelterQueryService.java:521`),
    admin guidance by `sort_order ASC, id DESC`
    (`findAllByOrderBySortOrderAscIdDesc`), public index by
    `pinned DESC, sort_order ASC, published_at DESC, id DESC` (native query in
    `SpringDataGuidanceTranslationRepository`), so consecutive pages tile without
    overlap. Covered by the new `AdminGuidanceSearchPagingIT` (tiling, total header,
    400 vocabulary) and `AdminModerationIT.theAdminListPagesTheFilteredOrderWithTheTotalHeader`.
    The argument orders of the two `slice(...)` helpers are used consistently
    (`slice(rows, offset, limit)`) at all four call sites — checked, no swap.
13. **No wasteful re-read inside the admin paging path**: unlike the guidance lists,
    the admin shelter path does not add a per-row lookup for the page.

## Fixed

Nothing — read-only review. No file other than this report was created or modified.

## Findings

### F1 — High (P1): the new `/admin/shelters` paging slices *after* the whole pipeline, so a one-row page costs exactly what the full list costs

* **Location:** `src/main/java/ee/sheltermap/api/AdminController.java:139-146`
  (`moderation.listShelters(...)` → `filtered.size()` → `GuidanceService.slice(...)`)
  feeding `src/main/java/ee/sheltermap/api/ShelterQueryService.java:516-527`
  (`shelterRepository.findAll()` + `batchesFor(shelters, true)` over **all** rows).
* **What is wrong:** `limit`/`offset` are applied in Java *after* (a) loading the
  entire `shelters` table as entities, (b) mapping every row to the domain object,
  (c) running all 11 batched trust/provenance lookups over every shelter id, and
  (d) building an `AdminShelterDto` for every row. Paging therefore reduces only the
  serialized bytes, never the work.
* **Evidence (measured, two independent batches, identical):**
  per request `GET /admin/shelters?limit=1&offset=0` →
  `shelters seq +1.0 tupr +308.0`, `users seq +4.0`, `shelter_reports seq +2.0`,
  `moderation_actions seq +1.0`, `shelter_occupancy_reports seq +1.0`,
  `shelter_open_status seq +1.0`, `shelter_info_requests seq +1.0`,
  `verification_claims seq +1.0`, `data_imports idx +1.0` — i.e. 13 statements and
  **308 shelter rows read for a 1-row page**. A batch of 10 **unpaged** requests
  produced the *byte-identical* delta table. Wall clock is 20–21 ms paged vs 20 ms
  unpaged (payload 7 080 B vs 109 410 B).
  The frontend now pages this endpoint at the default 20 rows
  (`GUIDANCE_PAGE_SIZE = 20`, `frontend/src/app/gateways/guidance-gateway.ts:25`;
  `admin-page.ts:240, 828-833`), so opening the Shelters tab and walking the 308-row
  list turns one full pipeline into **16 full pipelines**, and `loadQueue()`/
  `refreshShelters()` (`admin-page.ts:748-756, 840-862`) add another unpaged one.
* **Why it matters:** this is the lane whose stated purpose is to bound the admin
  list; as implemented, cost per *user-visible page* grows with table size while the
  response shrinks — the exact opposite of a paging win. The same shape exists on the
  public, **unauthenticated** `GET /api/shelters` (measured: 20× `?limit=5` and 20×
  unpaged both = `seq_scan +160`, `seq_tup_read +9 440`, i.e. identical), and that
  endpoint has no rate limit (`app.ratelimit.*` covers login/register/verify/change/
  geo-resolve only), so the per-request cost is attacker-addressable.
  Not a correctness bug — the dataset is 308 rows today, so this is a scaling cliff
  rather than an incident.
* **Suggested fix (minimal):** move the slice into SQL. `status`/`source` are plain
  column predicates and `q` is a `lower(name)/lower(address) LIKE`; add to
  `SpringDataShelterRepository` a `@Query` with `order by s.id asc` + `limit :limit
  offset :offset` (or a `Pageable`), plus a `count(*)` twin for the `X-Total-Count`
  contract (which stays exactly what it is now: the filter length without paging),
  and run `batchesFor(...)` over the page's ids only. If in-memory is kept
  deliberately, at least apply the source/status/`q` filters and the slice *before*
  `batchesFor` + DTO mapping, and document that the header then needs the count query.
* **Depends on unfinished work?** The javadoc/comments present the in-memory slice as
  the finished design ("the same Estonia-scale precedent as the trust filters",
  `ShelterQueryService.java:509-515`, `AdminController.java:141-143`), so this reads
  as done rather than in flight.

### F2 — Medium (P1): N+1 on the public guidance index (`GuidanceService.listPublic`)

* **Location:** `src/main/java/ee/sheltermap/guidance/GuidanceService.java:213-221`
  (`for (long id : postIds) { posts.findById(id)… }`); the javadoc immediately above
  (`:211-214`) claims "The posts are batch-loaded once … no per-row N+1".
* **What is wrong:** one `SELECT` per published post per request; there is no
  `findByIdIn`, so Hibernate cannot batch them. It runs **before** the `limit/offset`
  slice, so a 1-row page still reads every post.
* **Evidence:** 10 anonymous `GET /api/guidance?limit=1` →
  `guidance_posts seq +9.0/req, seq_tup_read +72.0/req` (9 statements × 8 rows =
  the 8 published posts in `en` + the join), while `guidance_post_translations` is
  read once (`+1.0/req`). A single-query alternative already exists and is **dead
  code**: `GuidancePostRepository.findPublished(String locale)` →
  `SpringDataGuidancePostRepository.findByStatusAndLocaleOrderByPinnedDescSortOrderAscPublishedAtDescIdDesc`
  has no production caller (only `InMemoryGuidancePostRepository` implements it).
* **Why it matters:** the public blog index is permit-all and unlimited in request
  rate; its cost grows linearly with posts per locale on every page view, and the
  new paging does not bound it.
* **Suggested fix:** add `List<GuidancePost> findByIdIn(Collection<Long> ids)` to the
  port + adapter and replace the loop with one call (the order already comes from
  `rows`); or wire the existing `findPublished(locale)` and drop the redundant read.
  Fix the comment either way.

### F3 — Medium (P2): both guidance list endpoints load the **entire** media library on every request

* **Location:** `src/main/java/ee/sheltermap/api/GuidanceController.java:133` +
  `:211-217` (`heroIndex()` → `mediaAssets.findAll()`), and
  `src/main/java/ee/sheltermap/api/AdminGuidanceController.java:165` + `:662-668`
  (same body; the `List<GuidancePost> posts` parameter is **never used**).
* **What is wrong:** the hero lookup is solved by loading every asset row and
  building a map, instead of the hero ids on the page. It happens before filtering and
  before the slice, so `limit=1` pays for the whole library.
* **Evidence:** 10 anonymous `GET /api/guidance?limit=1` →
  `media_assets seq +1.0/req, seq_tup_read +8.0/req` (the full 8-row library per
  request, page size irrelevant). `media_assets` is append-only and grows with
  admin uploads (5 MiB images, `GET /admin/media` also unpaged — see F4), so this
  scan grows without bound while the page stays 20 rows.
* **Suggested fix:** collect the distinct `heroImageId`s of the *page* (the slice
  already ran) and add a batched
  `MediaAssetRepository.findByIds(Collection<Long>)` (`findAllById` in the adapter) —
  one indexed `IN` query. The unused parameter on
  `AdminGuidanceController.heroIndex(List<GuidancePost>)` is the leftover of exactly
  that change, so the signature is already there.

### F4 — Low (P2): the remaining unpaged whole-table admin lists (users, media)

* **Location:** `AdminModerationService.java:530-535` (`users.findAll()`),
  `guidance/MediaService.java:93-97` (`mediaAssets.findAll()` via
  `AdminMediaController.java:75`); `AdminController.shelterHistory` is per-shelter and
  fine.
* **What is wrong:** with `/admin/shelters` and `/admin/guidance` now paged, the two
  neighbouring lists that grow without operator discipline — the media library, and
  the account table — are still unbounded reads, mapped entity-by-entity (the user
  path also decrypts PII for every row: `JpaUserRepository.findAll` → `UserMapper`
  AES-GCM-decrypts e-mail/phone and loads all claims).
* **Evidence:** 10× `GET /admin/users` → `users seq +4.0/req`, `verification_claims
  seq +1.0/req` (62 accounts, every row decrypted even though GUEST rows are dropped
  afterwards by the `email != null` filter on the decrypted value).
* **Suggested fix:** give `/admin/media` the same `limit/offset` + `X-Total-Count`
  treatment (its own `Pageable` read is trivial, `findAllByOrderByCreatedAtDescIdDesc`
  is already ordered), and either page `/admin/users` the same way or add a
  `kind`/`email_hash IS NOT NULL` predicate so GUEST rows are not decrypted and
  filtered in memory. Low because both are admin-only triage surfaces on small tables
  today.

### F5 — Low (P2): the public guidance permalink lookup has no usable index

* **Location:** `GuidanceService.getByPublicSlug` →
  `translations.findBySlug(slug)` →
  `SpringDataGuidanceTranslationRepository.findBySlugOrderByLocaleAscIdAsc`
  (`persistence/SpringDataGuidanceTranslationRepository.java:33-36`).
* **What is wrong:** the only index containing `slug` is
  `uq_guidance_post_translations_locale_slug (locale, slug)` (V26:65) whose *leading*
  column is `locale`; the query has no locale predicate, so it cannot use it. This is
  the one place in the tree where an index is genuinely missing rather than merely
  unused by the planner.
* **Evidence:** `pg_indexes` has no index whose first column is `slug` on
  `guidance_post_translations`; 10× `GET /api/guidance/{slug}` →
  `guidance_post_translations seq +2.0/req, seq_tup_read +40.0/req` (2 full scans of
  the 20-row table: `findBySlug` + `findAllByPostId`).
* **Why it matters:** it is the public `/blog/{slug}` path on every page view, and the
  table grows as posts × locales. Low severity today (20 rows).
* **Suggested fix:** one line in a follow-up migration —
  `CREATE INDEX idx_guidance_post_translations_slug ON guidance_post_translations (slug);`
  (or `(slug, locale)`).

### F6 — Low (P2): four `ON DELETE SET NULL` FK columns still have no index, so each account erasure scans their tables

* **Location:** `V19__shelter_info_requests.sql:30,33`
  (`requested_by`, `replied_by`), `V23__crisis_guidance.sql:40`
  (`media_assets.uploaded_by`), `V23__crisis_guidance.sql:68`
  (`guidance_posts.created_by`); exercised per account by the retention job's erasure
  loop (`retention/RetentionService.java:88-97` → `AccountService.deleteAccount`).
* **What is wrong:** V30 closed exactly this gap for `moderation_actions.moderator_id`
  (its own comment cites "erasing a user scans the whole table to find the child
  rows"), but the four columns added later by V19/V23 were not given the same
  treatment. `pg_constraint` confirms they are `confdeltype = 'n'` (SET NULL) with no
  matching index, while every other child FK on the erasure path is indexed
  (`shelters.created_by`, `moderation_actions.moderator_id`, and the
  `user_id` CASCADEs).
* **Why it matters:** the daily retention job erases accounts in a loop, so each
  erasure pays four extra sequential scans of tables that grow with content
  (the media library especially).
* **Suggested fix:** one migration adding the four single-column indexes (or one
  documented decision to accept the scans — the tables are small today).

### F7 — Low (P2): the new bound validation runs **after** the expensive read on all three paged endpoints

* **Location:** `AdminController.java:139-145` (`moderation.listShelters(...)` then
  `requireOffset`/`requireLimit`), `AdminGuidanceController.java:165-177`,
  `GuidanceController.java:131-134` (public, anonymous).
* **What is wrong:** a request with an invalid `limit`/`offset` performs the whole
  pipeline (F1: 13 statements + 308-row projection; F2/F3: the N+1 + full media
  library) before answering 400. Measured: `?limit=0` answers 400 *after* the same
  work as a valid request.
* **Suggested fix:** call `requireLimit`/`requireOffset` (and, on the guidance list,
  `requireSearch`) before the service call — a pure reordering, no behaviour change;
  the ITs assert the statuses, not the work done.

### F8 — Low (P2): `findLatest` goes through `PageRequest`, so a *full* page costs an extra `count(*)`

* **Location:** `persistence/JpaModerationAuditLog.java:72-79`
  (`actions.findAll(PageRequest.of(0, limit, …))` → `Page<…>`).
* **What is wrong:** Spring Data runs the count query when a full page is returned
  (`PageableExecutionUtils`: skipped only when `pageSize > content.size()`); the
  audit trail never uses the total.
* **Evidence:** 10× `GET /admin/audit?limit=1` → `moderation_actions seq +1.0/req`
  (the count) *and* `idx +1.0/req` (the ordered page), whereas 10×
  `?limit=200` (24 rows returned — not full) → `seq +0.0/req`, `idx +1.0/req`.
  With 57 audit rows and `limit=200` the count is simply never issued.
* **Suggested fix:** declare the call site as `List<ModerationActionEntity> findAll(Pageable)`
  (Spring Data then skips the count) or use a `@Query … order by … limit :limit`
  sibling of the queue read in `SpringDataShelterReportRepository`.

### F9 — Low (P2): a hero-import publish holds a pooled connection across the remote fetch

* **Location:** `guidance/GuidanceService.publish` (`:659-670`) — `requirePost(id)` is
  a DB statement, *then* `heroImport.importHero(...)`
  (`guidance/HeroImageImportService.java:169-195`, itself `@Transactional`), then the
  save.
* **What is wrong:** because the transaction is read-write, Spring's
  `HibernateJpaDialect.beginTransaction` does not acquire the connection at begin —
  but the `requirePost` statement acquires it lazily and Hibernate holds it until
  commit. The remote fetch (DNS + up to 3 redirect hops + up to 5 MiB body) therefore
  runs with a pooled connection pinned, bounded only by
  `app.media.import-budget: 10s`. The class comment acknowledges the bound
  ("also bounds how long the publish transaction is held").
* **Why it matters:** pool size is 20 and the connection timeout 5 s, so one slow
  publish can make a waiting request fail at 5 s. Admin-only and budget-bounded, so
  Low — but see the caveat under "Correct" #8: the earlier sweep's F2 fix holds for
  read-write transactions with no prior statement, **not** for this shape, and *not*
  for `@Transactional(readOnly = true)` methods, which do acquire the connection at
  begin.
* **Suggested fix:** move the import before the first statement of the publish
  (resolve/validate the URL, fetch and store, then run the publishing transaction),
  or clear the persistence context / split the fetch out of the transaction — the
  same "phase 1 / phase 2 / phase 3" shape `ContactChangeService` already uses.

### F10 — Low (P2): the "one slice semantics" is a copy, not a shared helper

* **Location:** `api/ShelterQueryService.java:188-195` (`static List<ShelterDto> slice`)
  vs `guidance/GuidanceService.java:243-250` (`public static <T> List<T> slice`).
* **What is wrong:** two verbatim implementations of the same paging semantics now
  coexist; three controllers call the guidance one while the shelter list keeps its
  own. `GuidanceService.slice`'s javadoc calls itself "the shelter list's slice
  semantics verbatim", so the single source of truth is a comment.
* **Suggested fix:** delete `ShelterQueryService.slice` and call
  `GuidanceService.slice(filtered, offset, limit)` (or move the helper to a neutral
  home used by both) — behaviour-identical, one place to change.

### F11 — Low (P2): registry import still does a read-modify-write per row

* **Location:** `ingestion/ShelterImportService.java:171-176` (`findByExternalId`
  followed by `save` per row, no `@Transactional` on the service, no JDBC batching).
* **Why it matters:** ~2+ round-trips per registry row (300 rows today) on the weekly
  sync. Not worth restructuring: `@GeneratedValue(strategy = IDENTITY)` on every
  entity makes JDBC insert batching impossible anyway, so the only real fix is a
  set-based upsert (`INSERT … ON CONFLICT (external_id) DO UPDATE`), which is a
  larger change than the benefit at this scale. Listed so it is not re-derived.

## Confirm / contradict the previous sweep's conclusions

| Earlier claim | Verdict here |
| --- | --- |
| No N+1 on the list path; batched creator/count/occupancy/stamp lookups | **Confirmed for the shelter lists** (13 statements, measured). **Contradicted for the guidance lists**: `listPublic` N+1 (F2) and a full media-library load per request (F3). "All index-backed" → true schema-wise; the measured plans are seq scans on today's tiny tables. |
| Repository `readOnly` flags consistent | **Confirmed** (all 24 impls audited). |
| `@Version` → 409 in both exception shapes | **Confirmed, and there are three shapes** (adds the commit-time `TransactionSystemException`/`StaleStateException` branch). |
| `ShelterService`/`VerificationService` lacked a transaction boundary | **Fixed in the current tree** (`ShelterService:128,309,378` + `lockForUpdate:151`; `VerificationService:105,241`). |
| Oldest user row lacked optimistic locking | **Fixed** (V29 applied; mapper round-trip + copy-back verified). |
| Sends inside transactional handlers + default Hikari settings | **Fixed, and the mechanism verified** at the Spring level; caveat: read-only transactions still pin a connection at begin (→ F9). |
| Admin report queue unbounded | **Fixed** (LIMIT in SQL + `idx_shelter_reports_created`; measured 1 index scan). |
| Index gaps + redundant indexes fixed in V30 | **Confirmed both directions**; the four remaining SET-NULL FK gaps are new (F6), and the translations-by-slug gap (F5) was not part of V30. |

## Areas found clean (explicit)

* **Entity/JPA model**: no associations at all, no lazy loading, no bidirectional
  relations, no JPA cascades, no `equals`/`hashCode` overrides on entities or
  aggregates.
* **Transaction hygiene**: readOnly flags consistent across every repository; write
  services (Shelter, Verification, Guidance, Moderation, PasswordReset, ContactChange)
  all own their boundaries; audit/history rows are written in the caller's transaction
  by design.
* **The shelter list projection**: no per-row queries, no duplicated lookups, correct
  id-ascending total order, and the two `findByIds` batches cover creators and
  requesters.
* **Index coverage for existing query shapes**: every read except F5 resolves against
  an index that exists in `pg_indexes` (verified table by table).
* **Migrations**: V1–V30 all applied; V29/V30 do exactly what their comments claim;
  the four dropped indexes really have no consumer in `main/`;
  `ddl-auto: validate` stays green against the new definitions.
* **Paging correctness** (as opposed to cost): bounds, 400s, empty past-the-end page,
  total-count semantics and the totality of the order are all implemented and tested
  by the new ITs; reorder is only offered when the filtered list fits one page
  (`guidanceReorderable`, `admin-page.ts:356-358`), so paging cannot feed a partial
  list to the reorder endpoint.
* **`ApiErrorHandler` 409 mapping** for optimistic locking, and the `limit` bounds
  mapping to 400 with a `message` body.

## Top 5 findings

1. **F1 (High / P1)** — `AdminController.java:139-146` + `ShelterQueryService.java:516-527`:
   the new `/admin/shelters` paging slices after the full pipeline — a 1-row page
   reads all 308 shelter rows and runs all 13 statements, byte-identical to the
   unpaged request (measured, two batches). The frontend pages this endpoint at 20
   rows, so a Shelters-tab walk multiplies the DB work by the page count. Fix: SQL
   `limit/offset` + a count query over the same filter and order.
2. **F2 (Medium / P1)** — `GuidanceService.java:213-221`: N+1 on the public guidance
   index (one `findById` per published post, before the slice) while the javadoc
   claims a batch; 9 scans / 72 rows read per anonymous `GET /api/guidance?limit=1`.
   Fix: `findByIdIn` batch (or the already-present, unused `findPublished(locale)`).
3. **F3 (Medium / P2)** — `GuidanceController.java:211-217` and
   `AdminGuidanceController.java:662-668`: the entire media library is loaded per
   guidance list request, page-size-independent, and the admin helper ignores its
   parameter. Fix: batched `findByIds` over the page's hero ids.
4. **F6 (Low / P2)** — V19/V23: four `ON DELETE SET NULL` FK columns still lack
   indexes that V30 gave `moderation_actions.moderator_id`, so each retention erasure
   adds four sequential scans. Fix: one migration with four single-column indexes.
5. **F5 (Low / P2)** — `SpringDataGuidanceTranslationRepository.java:33-36`:
   the public permalink lookup (`findBySlug`) has no index whose leading column is
   `slug` (the V26 unique is `(locale, slug)`), so every `/blog/{slug}` view scans the
   translations table twice. Fix: `CREATE INDEX … ON guidance_post_translations (slug)`.

**Merge verdict: OK with notes.** The lane's paging semantics are correct and
tested; the cost model is not (F1, F2, F3, F7 — all cheap reorderings or one batched
lookup each). Nothing here blocks a merge on correctness grounds: F1 is the one I
would fix before calling the paging feature done, since it is the feature's whole
point.
