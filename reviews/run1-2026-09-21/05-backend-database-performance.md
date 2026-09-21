# Agent 5 — Backend data access & performance review

Read-only review: no source file was modified; the only file written is this report. Scope:
`src/main/resources/db/migration/**` (V1–V28, incl. the Java migration V13), `src/main/java/ee/sheltermap/{persistence,app,api,auth,guidance,ingestion,retention,verification,sitetexts}/**`,
both `application.yml` files, and `pom.xml`. Generated/vendor folders (`target/`, `node_modules/`,
`frontend/dist/`, `.angular/`) excluded. Tree state: settled; every claim below was re-verified against
the current working-tree file contents.

**Method.** I derived the query shapes from the actual Spring Data repository methods and the service
call sites, then compared each shape against the indexes/constraints the Flyway files actually create
(index inventory: every `CREATE INDEX`/`CREATE UNIQUE INDEX`/`CONSTRAINT ... UNIQUE` in
`db/migration/*.sql`), and against the JPA/pool settings in the two yml files. Where the repo already
documents a decision (`openspec/specs/map-browse/spec.md`, migration headers), I cite it and do not
report the decision itself as a defect — see "Documented trade-offs".

## Versions detected (judged against these)

| Component | Version | Evidence |
|---|---|---|
| Java | 21 | `pom.xml:21` |
| Spring Boot | 3.3.13 (`spring-boot-starter-parent`) | `pom.xml:19` |
| Hibernate ORM | 6.5.3.Final | resolved dependency (`~/.m2/.../hibernate-core/6.5.3.Final`) |
| Flyway | 10.10.0 (`flyway-core` + `flyway-database-postgresql`) | `pom.xml:63-70`, resolved dependency |
| Connection pool | HikariCP 5.1.0 — **defaults only, nothing configured** | resolved dependency; no `hikari`/`maximum-pool-size` match anywhere in `src/main/resources` |
| JDBC driver / DB | PostgreSQL JDBC 42.7.7; PostgreSQL 16 | resolved dependency; `docker-compose.yml:5` (`image: postgres:16`) |
| Schema management | Flyway `classpath:db/migration`, `ddl-auto: validate`, `open-in-view: false` | `application.yml:10-14` |
| Data scale (for severity calibration) | "~300 shelters" | `README.md:518` |

---

## Correct — independently confirmed from the brief, with evidence

1. **The list path really is batched by design (one query per lookup kind, no per-row N+1).**
   `ShelterQueryService.batchesFor` (`api/ShelterQueryService.java:275-330`) issues exactly one call per
   kind: authors `userRepository.findByIds` (:284), report counts by type (:288),
   occupancy `findFreshByShelterIds` (:295), open-status (:300), last-verified (`:303` →
   `latestOpenConfirmedByShelterIds` + `latestConfirmationByShelterIds` + one
   `findLatestVerifiedBySource` per distinct registry source), info requests (:316).
   The underlying implementations are genuinely batched and index-backed:
   `JpaUserRepository.findByIds` (`persistence/JpaUserRepository.java:169-184`) does 2 queries
   (`findAllById` + one `findByUserIdIn` for claims), `countByTypeForShelterIds` is one grouped query
   (`persistence/SpringDataShelterReportRepository.java:27-29`), and each of these is served by an
   existing index (`idx_shelter_reports_shelter` V9:27, `idx_shelter_occupancy_reports_shelter` V9:42,
   `idx_shelter_open_status_shelter` V22:17, `uq_shelter_info_requests_shelter` V19:35, `pk` for
   `findAllById`). No `findByShelterId`-per-row call exists on the list paths.
2. **Repository-level `@Transactional` boundaries and the `readOnly` flag are applied consistently.**
   Every read on every `Jpa*Repository` is `@Transactional(readOnly = true)` and every write is
   `@Transactional` — e.g. `JpaShelterRepository.java:32,80,86,92,102,108,116,129,136,143,150,159,165,174`;
   same pattern in `JpaUserRepository`, `JpaGuidancePostRepository`, `JpaMediaAssetRepository`,
   `JpaShelterReportRepository`, `JpaShelterOccupancyReportRepository`,
   `JpaShelterOpenStatusReportRepository`, `JpaSiteTextRepository`, `Jpa*Repository` (tokens,
   verifications, pending changes). Service-level `readOnly` is set where a service method wraps reads
   (`api/AdminModerationService.java:140,279,389,449,518`, `guidance/GuidanceService.java:170,202,223,248,264,287,336`,
   `sitetexts/SiteTextsService.java:44`, `auth/AccountService.java:69,105`, `guidance/MediaService.java:94,103`).
   **Exception:** `app/ShelterService.java`, `api/ShelterQueryService.java`, `app/UserService.java` and
   `verification/VerificationService.java` contain no `@Transactional` at all — see F1/F6.
3. **`@Version` optimistic locking is present on `shelters` and mapped to 409.**
   `persistence/ShelterEntity.java:86-88` + `V8__review_hardening.sql:34` (column), and the mapping is
   in `api/ApiErrorHandler.java:337-342` (`OptimisticLockException`/`OptimisticLockingFailureException`
   → 409) plus the commit-time shape `:357-363` (`TransactionSystemException` wrapping
   `StaleStateException` → 409, cycle-safe walk `:366-371`). `JpaShelterRepository.save`
   (`:42-48`) mutates the managed row in place so the counter is preserved — the documented reason it
   is not a fresh-entity merge.
4. **No JPA associations anywhere → the N+1/lazy-loading/cascade class of problems does not exist
   here.** A repo-wide search for `@ManyToOne|@OneToMany|@OneToOne|@ManyToMany|@JoinColumn|
   @ElementCollection|FetchType|CascadeType|orphanRemoval` across `src/main/java` returns **zero**
   matches: every FK is a plain `Long` column and every join is done by an explicit batched query, with
   cascade behaviour delegated to DB `ON DELETE CASCADE`/`SET NULL` and justified per migration
   (e.g. `V19__shelter_info_requests.sql:8-16`, `V18__shelter_history.sql:11-18`). This is the reason
   `open-in-view: false` is safe, and it removes the whole first category in my brief. The only
   remaining cascade concern is index coverage on those FK columns — F5/F11.
5. **No `equals`/`hashCode` on entities or domain objects, and nothing depends on them.** A search over
   `persistence/` and `domain/` finds no `equals`/`hashCode` override; every cross-reference in the read
   services is keyed by `Long` id (`ShelterQueryService.java:284,288,437-467`; `AdminModerationService.java:286-290`).
   With flat entities and id keys this is correct rather than an oversight.
6. **`open-in-view: false` and `ddl-auto: validate` in every profile that exists.** There are exactly
   two config files (`src/main/resources/application.yml`, `src/test/resources/application.yml`, the
   latter a declared mirror); both set `open-in-view: false` (`:13` / `:28`) and
   `ddl-auto: validate` (`:12` / `:27`). No `application-dev.yml`/`-prod.yml` exists, so there is no
   non-dev profile with `create`/`update`/`none`, no `show-sql`, no second-level cache, and no
   dev-only JPA override. (Agent 1 flags a *content* drift between the two files as F2 — that is a
   config-maintenance issue, not a JPA-setting one: the two JPA blocks are identical.)
7. **The index that backs the viewport query is the index the query needs.**
   `JpaShelterRepository.findAllActiveBySourceInWithin` (`:117-126`) → derived query with
   `status = ACTIVE` + `latitude between` + `longitude between`, and
   `V23.1__shelter_bbox_index.sql:20-23` creates `(latitude, longitude)`; the shipped order
   (`ORDER BY id ASC`) is a total order so the read is deterministic.
8. **Migrations are honest about `ddl-auto=validate` and about ordering.** Every `V*.sql` ends with the
   validate note; `V23.1` is a Flyway-native dotted version that orders correctly between `V23` and
   `V24` and says so (`V23.1:13-16`); the `V13` gap is filled by a Spring-registered Java migration
   (`migration/PiiMigrationConfig.java:15-18`, `migration/V13PiiEncryptionMigration.java:58-71`
   declares version `13` itself, `canExecuteInTransaction() == true`), and that migration is what
   *replaces* the plaintext unique indexes with the hash-based ones the repository queries actually use
   (`V13:101-104` ↔ `SpringDataUserRepository.java:22-24` `findByEmailHash`/`findByPhoneHash`). The
   earlier case-sensitivity/index-usability nit recorded in `docs/code-review/2026-09-08-review-output.md`
   (N14: `findByEmailIgnoreCase` unable to use `(email)`) is resolved by that migration.
9. **Only two background jobs, both `@Scheduled` on the single default scheduler thread, both with
   their fetch/work boundaries documented** (`config/RegistryScheduler.java:35`,
   `retention/RetentionScheduler.java:37`); the registry import deliberately fetches *outside* the
   transaction (`ingestion/ShelterImportService.java:146-154`) and the retention run commits one
   account erasure per transaction (`retention/RetentionService.java:41-44,87-99`). The only raw
   `new Thread` in the codebase is the bounded read-stall watchdog in
   `guidance/JdkHeroImageFetchClient.java:176-210`, which closes/interrupts the stream on the deadline
   (`:204-206,126`) — correct, not a thread leak.

---

## Findings

### F1 — High (P1): two write services run with no transaction boundary — confirmed, plus the data-access consequences agent 1 did not spell out

**Also reported by agent 1 as F1** (see `reviews/01-architecture.md`). I independently confirmed it and
add the DB-side evidence, because the failure modes are data-access ones.

**Where**: `app/ShelterService.java:37-38` (`@Service`, zero `@Transactional` in the file),
`addPlace` (:115-173), `updatePlace` (:287-316), `deletePlace` (:352-357); and
`verification/VerificationService.java:35` (`@Service`, zero `@Transactional`),
`requestVerification` (:96-173, with `findActive…` :170 → `delete` :171 → `save` :172),
`confirmVerification` (:220-249, `save` :242 → `delete` :248).

**What is wrong (DB view)**:
- Each of those repository calls is its own transaction, so the multi-step writes are not atomic and a
  single logical write costs several connection check-outs + `BEGIN`/`COMMIT` rounds (e.g.
  `addPlace` = 2 count queries + a full `findAllActiveBySourceIn(USER)` scan + `save` + history
  `save` = 5 transactions; `deletePlace` = 2).
- The audit contract in `app/ShelterHistoryLog.java:9-13` and `db/migration/V18__shelter_history.sql:5-7`
  ("written in the SAME transaction as the event … a rolled-back or failed event leaves no row") is
  false for the three user-facing shelter endpoints: `deletePlace` commits the `DELETED` row first
  (`:353-355`) and only then deletes (`:356`), so a failed delete leaves an audit row for a shelter
  that still exists; `addPlace`/`updatePlace` commit the shelter first and the history row second, so a
  failure between them leaves an eventless row.
- The anti-abuse caps are read-check-write across transactions: the active cap
  (`countByCreatedByAndSourceAndStatus`, :126-130) and the daily cap (:135-147) can both be passed by
  two concurrent requests, and the near-duplicate scan (`findNearDuplicate`, :117-127) reads through
  its own transaction. Nothing at the DB level backs them either — the only relevant unique index is
  `uq_shelters_external_id` (`V1__schema.sql:48`); there is no constraint on
  `(created_by, name)` or on a per-user active count.
- `VerificationService.requestVerification` is the sharper failure: `pending_verifications` has a
  **non-unique** index on `(user_id, level)` (`V1__schema.sql:36`), the "one active code" invariant is
  enforced only by the delete-then-insert in three separate transactions, and the reader maps a single
  row through `Optional` (`SpringDataPendingVerificationRepository.java:117`, called from
  `JpaPendingVerificationRepository.java:44`). Two concurrent sends (double-submit; the cooldown check
  at `VerificationService.java:126-138` reads a log that is only written *after* the channel accepts,
  `:167`) therefore leave two unexpired rows, and the next
  `POST /verify/confirm` throws `IncorrectResultSizeDataAccessException`, which no handler maps
  (`api/ApiErrorHandler.java` has no case for it) → **500 instead of the documented generic
  false/400**. The same pattern is handled correctly one service over: `PasswordResetService.java:113`
  is `@Transactional` around `deleteActiveByUserId` + `save` (:142-144), and its repository uses
  `findFirst…` with an explicit comment about exactly this hazard
  (`SpringDataPasswordResetTokenRepository.java:83-87`).

**Why it matters**: it is the app's main mutation path; it breaks an invariant the code documents,
leaves the abuse caps racy, and turns a plausible concurrency interleaving on `/verify/confirm` into a
500 (the user's only recovery is to request a fresh code).

**Suggested fix (minimal)**: `@Transactional` on `ShelterService.addPlace/updatePlace/deletePlace`
(move the history write after the state change in `deletePlace`) and on
`VerificationService.requestVerification/confirmVerification`; switch the pending-verification read to
`findFirst…` (the `PasswordResetService` idiom) so a legacy duplicate degrades instead of 500-ing.
If the caps must hold *under* concurrency, add the matching DB constraint as well.

### F2 — Medium: blocking SMTP/SMS sends inside `@Transactional` handlers, on top of a default 10-connection pool

**Where**: `auth/PasswordResetService.java:113` (`@Transactional requestReset`) → `:145`
`smtpSender.send(...)`; `auth/ContactChangeService.java:90` → `:106` `smsSender.send(...)`, and `:154`
→ `:170` `smtpSender.send(...)`. Timeouts: `application.yml:27-28`
(`mail.smtp.connectiontimeout: 5000`, `mail.smtp.timeout: 5000`); the Twilio SDK call
(`verification/TwilioSmsSender.java:139-142`, `create()`) has no app-configured timeout at all.
Pool: `application.yml:6-9` configures url/username/password only — no `spring.datasource.hikari.*`
anywhere in the repo, so HikariCP 5.1.0 defaults apply (10 connections, 30 s connection timeout,
`minimumIdle = maximumPoolSize`) against Tomcat's default 200 request threads.

**What is wrong**: the DB transaction (and therefore a pooled connection, plus row locks on
`password_reset_tokens` / `pending_contact_changes`) is held across an unbounded-by-design network
conversation with a third party. `POST /auth/password-reset/request` is unauthenticated and
rate-limited per IP, so it is trivially reachable. Ten simultaneous slow SMTP/Twilio exchanges pin
every connection in the pool; every other endpoint then waits up to the 30 s pool timeout. The same
shape exists in the hero import (`guidance/HeroImageImportService.java:169-200`, a download inside the
publish transaction, bounded at 10 s by `app.media.import-budget`, `application.yml:303`) — that one
the code knows about and documents.

**Why it matters**: this is the most plausible way for the single instance to stop serving, and it
needs no unusual input — a slow SMTP provider plus ordinary traffic.

**Suggested fix**: keep the state write in the transaction and move the send after commit (the
`VerificationService` "throwaway-then-record" idiom already in the codebase, or a
`TransactionSynchronization`/outbox). Independently, set `spring.datasource.hikari.maximum-pool-size`
explicitly (e.g. 20–30 for a single instance) with a matching `connection-timeout`, and configure a
finite timeout for the Twilio client. Note the repo's own precedent for the "fetch outside the tx"
rule: `ShelterImportService.java:146-154`.

### F3 — Medium: `GET /admin/reports` is the only list endpoint with no bound, on an append-only table

**Where**: `api/AdminModerationService.java:279-285` (`listShelterReports(null)` →
`shelterReports.findAll()`), `persistence/SpringDataShelterReportRepository.java:44-45`
(`findAllByOrderByCreatedAtDescIdDesc()`), then two batch lookups over *every* referenced shelter and
user (`:286-290`) and a DTO per row (`:291-315`) including the reporter's decrypted e-mail.

**What is wrong**: `shelter_reports` is append-only (V9; nothing deletes rows except the shelter
cascade) and there is no `limit`, no keyset, and no default page — unlike the sibling audit endpoint,
which pins `1..200` (`AdminModerationService.java:81-82`, enforced at `:390-395`). Every call loads the
whole table, resolves every distinct shelter+user, AES-GCM-decrypts every reporter e-mail, and returns
one JSON object per report.

**Why it matters**: response size and heap grow linearly with the (unbounded) moderation backlog, and
the growth path is exactly "a busy deployment with unresolved reports". At ~300 shelters this is fine
today; there is no mechanism that keeps it fine.

**Suggested fix**: give it the audit endpoint's shape — an optional `shelterId` (already there) plus a
`limit` (default 100, max 200) applied in SQL, and order by `(created_at DESC, id DESC)` with the
`created_at` index from F9. Alternatively filter to undismissed rows only (a partial index then backs
it).

### F4 — Medium: `users` has no optimistic locking, and every user save is a whole-row merge from a request-time snapshot

**Where**: `persistence/UserEntity.java:27-29` (no `@Version`; the only `version` column in the schema
is `shelters.version`, `V8__review_hardening.sql:34`), `persistence/JpaUserRepository.java:63-66`
(`UserMapper.toEntity(user, …)` then `users.save(entity)` — a fresh detached entity carrying the id,
i.e. merge semantics, **no** re-read), `persistence/UserMapper.java:34-49` (writes `name`, re-encrypted
`email`/`phone`, `kind`, and `suspendedAt` :49, `lastActivityAt` :53), writers at
`auth/AccountService.java:92` (profile update), `auth/VerificationController.java:145`,
`auth/ContactChangeService.java:139,194`. The user object comes from a request-start read
(`api/ShelterController.java:597-607` `currentUser()` → `userRepository.findById`).

**What is wrong**: two concurrent writers silently lose one write (last-write-wins on every column).
The material case is suspension: `AdminModerationService.suspendUser` commits `suspended_at` inside its
own transaction (`:535-546`), and a user request that read the row *before* that commit writes the
whole row back from its snapshot — `suspendedAt = null` — silently un-suspending the account. The
narrower `last_activity_at` regression is the same mechanism (a stale snapshot overwrites a fresher
stamp; the codebase guards only against `null`, `JpaUserRepository.java:66-74`, and only via the
column-only path elsewhere).

**Why it matters**: an administrator's suspension (a security action) can be reverted by an ordinary
in-flight request from the user; the two writes are individually correct and the pair is not. Note the
codebase already avoids this shape on purpose where it noticed it: `markActive` is a column-only bulk
`UPDATE` (`SpringDataUserRepository.java:35-38`, `JpaUserRepository.markLastActivityById`) precisely so
a write does not round-trip stale state.

**Suggested fix**: either add `@Version` to `UserEntity` (+ a `V29` column, mapped through the existing
409 handler), or make the state-changing writes column-scoped/`@Modifying` (the `markActive` idiom) so
a profile save cannot rewrite `suspended_at`. The latter is the smaller change and matches the
existing precedent.

### F5 — Medium: `moderation_actions` has no index on `moderator_id` — a sequential scan on the shelter-detail read path and on every account erasure

**Where**: `persistence/SpringDataModerationActionRepository.java:134-135`
(`countByModeratorIdAndAction`), used by `api/ShelterQueryService.java:740-747` (`trustWeight`, called
once per distinct fresh reporter from `communityPulse`, `:625-648`) and by
`app/ShelterReportService.java` (auto-hide tally). The only indexes on the table are
`shelter_id`, `created_at`, `subject_user_id` (`V11__community_review.sql:60-61`,
`V17__user_suspension.sql:20`); `V14__account_deletion_moderator_fk.sql:11-13` changed the FK to
`ON DELETE SET NULL` without adding an index.

**What is wrong**: `count(*) … where moderator_id = ? and action = ?` cannot use any index → full scan.
The same missing index makes the FK's `SET NULL` action scan the child table, and the erasure path runs
that per account (`auth/AccountService.java:153-188` via `retention/RetentionService.java:87-99` loops
over every inactive account in one run).

**Why it matters**: it is the only per-reporter query on the public detail read
(`GET /api/shelters/{id}` → `communityPulse` → `trustWeight` × 2 queries per reporter), and the audit
table is only bounded by the 24-month retention horizon — it is designed to grow.

**Suggested fix**: `CREATE INDEX idx_moderation_actions_moderator ON moderation_actions (moderator_id, action);`
in a new migration (the `report_actions` idiom, `V9:92-94`).

### F6 — Low: read projections are not wrapped in a single read-only transaction (and the DTO set is assembled non-atomically)

**Where**: `api/ShelterQueryService.java:82-83` (`@Service`, no `@Transactional`), `findAll` (:165-175)
→ `batchesFor` (:275-330) → the 6–9 separate repository calls listed in "Correct" #1, each of which
opens and commits its own `readOnly` transaction (`Jpa*Repository`).

**What is wrong**: one `GET /api/shelters` performs ~8–10 transactions (each a connection check-out +
`BEGIN`/`COMMIT` + a fresh `EntityManager`), and the response is assembled from snapshots taken at
different points in time — a report/occupancy row committed between two of those calls appears in the
count but not in the shelter set, and vice versa. The sibling read services annotate the boundary
(`AdminModerationService.java:279`, `GuidanceService.java:170`), so this is an inconsistency rather
than a deliberate stance.

**Why it matters**: it multiplies connection churn on the hottest endpoint (relevant given F2's pool
head-room) and it is the non-obvious half of the "why is this 9 statements" question a future reader
will ask. Correctness impact today is cosmetic (stale-by-milliseconds trust numbers on a
read-only map), which is why this is Low.

**Suggested fix**: put `@Transactional(readOnly = true)` on `ShelterQueryService.findAll/findById/
findByCreatedBy/findAllForAdmin` — one transaction per request, one consistent snapshot, one
connection.

### F7 — Low: the community-pulse detail read has a per-reporter query loop

**Where**: `api/ShelterQueryService.java:324-326` (`shelters.stream().collect(toMap(id, shelter -> communityPulse(...)))`)
and `:625-648` (`communityPulse`: 2 queries per distinct reporter via `trustWeight`, `:740-747`; each
`trustWeight` runs `countByCreatedByAndSourceAndReviewStatus` **and** the unindexed
`countByModeratorAndAction` from F5).

**What is wrong**: on `GET /api/shelters/{id}` the number of statements is `2 + 2 × distinct fresh
reporters`; the parenthetical in `:322-324` ("no N+1") is true of the list/mine/admin reads only, not
of this one.

**Why it matters**: the fresh window is 2 h, so the reporter set is small today — but every reporter
adds two full scans of `moderation_actions` (F5) and two scans of the user's own submissions, and this
is a public endpoint. Fixing F5 alone removes most of the cost.

**Suggested fix**: batch both weight inputs for the whole fresh reporter set (one `IN` query each, the
`batchesFor` idiom already in this class), or at minimum fix F5.

### F8 — Low: the shelter list paths decrypt PII they never use

**Where**: `api/ShelterQueryService.java:284` (`userRepository.findByIds(authorIds)`) →
`persistence/JpaUserRepository.java:169-184` → `persistence/UserMapper.java:56-80`, which AES-GCM
decrypts `email` and `phone` per user (`:61-62`) and decrypts every claim's `external_ref` (`:79`).
The consumers need only `levels()` (`ShelterQueryService.java:436`, `submittedVerified`) and `name`
(`:526`, admin projection; `name` is not encrypted — V13 encrypts only
`users.email/phone`, `verification_claims.external_ref`, `pending_verifications.contact`,
`pending_contact_changes.target`, `V13PiiEncryptionMigration.java:81-85`).

**What is wrong**: the batched author lookup pays 2 AES-GCM decryptions + N claim decryptions per
author per list request for data that is discarded; the class that owns the shortcut documents the
correct pattern one screen below (`JpaUserRepository.java:167-190`: `isSuspended`/`existsById` are
"column-only on purpose … it must not pay the domain mapping (PII decrypt, claims load)").

**Why it matters**: CPU on the request thread grows with the author set, and it widens the blast radius
of any future decryption failure on a *public* read. Low because ~300 rows × ~2 decryptions is cheap.

**Suggested fix**: give the projection a narrow read (`id, name` + claim levels, or a
`Map<Long, Boolean> submitterVerified` batch) instead of `Map<Long, User>`; keep the full domain
mapping for the paths that actually render the contact (admin users/reports).

### F9 — Low: `shelter_reports` has no index on `created_at` although the admin queue orders by it

**Where**: `persistence/SpringDataShelterReportRepository.java:41-45`
(`findByShelterIdOrderByCreatedAtDescIdDesc`, `findAllByOrderByCreatedAtDescIdDesc`);
indexes created in `V9__shelter_trust_and_reports.sql:27-28` are `(shelter_id)` and `(user_id)` only.

**What is wrong**: the newest-first queue sorts the table (or, per shelter, sorts its slice). The
sibling "newest first" tables in the same schema do carry the index: `moderation_actions(created_at)`
(`V11:61`), `shelter_history(shelter_id, created_at)` (`V18:42-44`), `report_actions(user_id, created_at)`
(`V9:92-94`), `data_imports(source_name, imported_at DESC)` (`V15:23-25`).

**Why it matters**: small today; it becomes the sort cost behind F3's unbounded read. It is the kind of
inconsistency the schema otherwise avoids.

**Suggested fix**: `CREATE INDEX idx_shelter_reports_created ON shelter_reports (created_at DESC, id DESC);`
— or, better, make F3's default a partial index over undismissed rows.

### F10 — Low: the public guidance slug lookup has no usable index

**Where**: `persistence/SpringDataGuidanceTranslationRepository.java:85`
(`findBySlugOrderByLocaleAscIdAsc`, the "resolve a URL slug in ANY locale" read);
`V26__guidance_post_translations.sql:62-66` creates `UNIQUE (post_id, locale)` and
`UNIQUE (locale, slug)` — a B-tree whose leading column is `locale`, so a `slug = ?`-only predicate
cannot use it.

**What is wrong**: slug resolution (public detail, and the admin slug-uniqueness pre-check
`existsByLocaleAndSlug` is fine) falls back to a scan of the translations table.

**Why it matters**: the table is small (posts × locales), so this is a Low; it is listed only because
`V26`'s own comment claims "the per-locale public reads (index + slug resolution)" are index-served,
which is true for the locale filter and not for slug-only resolution.

**Suggested fix**: `CREATE INDEX idx_guidance_post_translations_slug ON guidance_post_translations (slug);`
(an `existsBySlug`-style read across locales then also becomes index-served).

### F11 — Low: FK columns with `ON DELETE SET NULL` have no index, so account erasure scans their tables

**Where**: `V23__crisis_guidance.sql:40` (`media_assets.uploaded_by`), `V23:68`
(`guidance_posts.created_by`), `V19__shelter_info_requests.sql:30,33` (`requested_by`, `replied_by`).
Contrast with the ones that do: `shelters.created_by` (`V7:8`), `guidance_posts.hero_image_id`
(`V23:87-89`).

**What is wrong**: the referential `SET NULL` action must find the child rows, and without an index on
the referencing column that is a full scan of the child table for every erased account.
`AccountService.deleteAccount` (`:153-188`, ending in `userRepository.delete` + `flush`) runs once per
account, and `RetentionService.prune` (`:87-99`) runs it in a loop over every inactive account in a
single pass.

**Why it matters**: bounded by the table sizes (media library, guidance posts, info requests are all
small), so Low — but the retention job exists precisely to run when those tables have accumulated for
24 months, and the loops make the cost additive.

**Suggested fix**: add the four indexes in a new migration (mirroring `V7:8`), or drop the loop's
per-account cost by pruning in one `DELETE`. Also worth stating explicitly in the migration comment
that the `SET NULL` columns are intentionally unindexed, if that is the decision.

### F12 — Low: unused and redundant indexes in the migration set (write cost + misleading comments)

| Index | Where | Evidence it is unused / redundant |
|---|---|---|
| `idx_shelters_county` | `V2__shelter_registry_fields.sql:14` | no query in `src/main/java` references `county` (only the entity field + DTO mapping) |
| `idx_media_assets_source_url` | `V25__guidance_hero_import.sql:39` | its comment claims it "backs that takedown lookup", but no repository method queries `source_url`; the only read is `findAllByOrderByCreatedAtDescIdDesc` (`SpringDataMediaAssetRepository.java:15`) |
| `idx_site_texts_key` | `V27__site_texts.sql:34` | redundant with `uq_site_texts_key_locale UNIQUE (key, locale)` (`V27:29`), which serves `findByKeyAndLocale` (`SpringDataSiteTextRepository.java:145`) |
| `idx_pending_contact_changes_user` | `V4__contact_change.sql:23` | redundant with `uq_pending_contact_change UNIQUE (user_id, type)` created three lines above (`V4:21`) |

**Why it matters**: each costs write amplification on every insert/update and (for `county`,
`source_url`) documents an intent the code does not implement, which is exactly the kind of comment a
future reader trusts. No correctness impact.

**Suggested fix**: drop the redundant pair in a new migration; for the two unused ones, either drop
them or add the query they were meant to serve (a county filter; a takedown lookup by `source_url`) —
pick one, and update the comment to match.

### F13 — Low: registry import does per-row read-modify-write with an extra `SELECT` inside `save`, and no JDBC batching

**Where**: `ingestion/ShelterImportService.java:171-184` (per row: `findByExternalId` → `save`) and
`persistence/JpaShelterRepository.java:42-44` (the update path re-reads the row inside `save` before
mutating it). No `spring.jpa.properties.hibernate.jdbc.batch_size` is set anywhere, and `@GeneratedValue(strategy = IDENTITY)`
(`persistence/ShelterEntity.java:25-27`) disables insert batching regardless.

**What is wrong**: the apply phase issues ~2–3 statements per registry row inside one long transaction;
the whole import also holds a single transaction for its duration (`:146-154`, documented).

**Why it matters**: for the Estonian registry (~300 rows, `README.md:518`) this is a few hundred ms of
extra round trips in a weekly background job — Low. It is listed because the value is now written
twice for the same reason (`findByExternalId` in the loop and `findById` in `save`) and because the
"insert" and "update" paths cannot be batched if the row count ever grows (the bbox index comment
already anticipates a larger scale, `V23.1:6-11`).

**Suggested fix**: reuse the already-loaded row (pass the existing entity/domain row into a
row-update path, or expose a `mergeInto` that skips the lookup). Leave batching alone unless the
dataset grows — the IDENTITY strategy makes it unattainable without a generator change.

---

## Documented trade-offs (verified — not defects, listed so they are not re-derived)

- **Full-list read with no SQL paging** (`ShelterQueryService.java:165-175`): `openspec/specs/map-browse/spec.md:36`
  requires the map page to load *all* shelters and `:219-247` defines paging as
  filters-then-slice, which cannot be pushed into SQL while `hasCapacity`/`provenance` are derived
  in memory (`applyTrustFilters`, `:758-767`). Consequence to be aware of: `limit=1` still loads,
  decorates and maps every ACTIVE row, so the parameter bounds the response body only. This is
  consistent with the spec and fine at ~300 rows; the natural thresholds are (a) paging must move into
  SQL (materialised `provenance`/`has_capacity` columns) or (b) the filters must become SQL predicates.
- **A plain B-tree on `(latitude, longitude)` instead of PostGIS** (`V23.1:6-11`): the index serves the
  latitude range and filters longitude per row; at Estonia scale the planner's choice is fine, and the
  comment states the replacement path (GiST/geohash). No action.
- **In-memory trust filters, duplicate scan and `finish`-time derivations** (`applyTrustFilters`
  `:758-767`, `ShelterService.findNearDuplicate` `:186-196` with its "the USER table is small" note,
  `deriveOccupancy`/`deriveOpenStatus` `:559-603`): each has a written scale justification and one
  indexed query per batch. No action at this scale.
- **No caching anywhere** (`@Cacheable`/`CacheManager`/`@EnableCaching`: zero matches; no cache starter
  in `pom.xml`): the cacheable reads are all tiny and indexed (`site_texts` full read with the
  documented "few dozen rows" note `V27:32-33`, `data_imports` latest-row lookup on
  `(source_name, imported_at DESC)`), and the app is single-instance. Adding a cache now would buy
  little and add invalidation risk; worth revisiting only if the read endpoints become hot.
- **Per-request `isSuspended` lookup on every token-bearing request**
  (`config/JwtAuthenticationFilter.java:69` → `JpaUserRepository.java:167-176`): one PK lookup, and
  deliberate (suspension must take effect immediately). No action.

## Areas found clean (explicitly)

- No N+1 from lazy loading or associations anywhere — there are no JPA associations to fetch
  (repo-wide search for `@ManyToOne|@OneToMany|@OneToOne|@ManyToMany|@JoinColumn|@ElementCollection|
  FetchType|CascadeType|orphanRemoval` = 0 matches). Cascade behaviour is DB-level and justified per
  migration.
- `readOnly` transaction flags: consistently set on every repository read and on every service read
  method that has a boundary at all (only the four files in F1/F6 lack a boundary).
- `open-in-view: false` and `ddl-auto: validate` in both existing config files; no non-dev profile with
  a destructive `ddl-auto`; no `show-sql`; no second-level cache; the datasource has no per-profile
  divergence to get wrong.
- Optimistic locking on `shelters` (`@Version`, `V8:34`) mapped to 409 in both exception shapes.
- `equals`/`hashCode`: absent from entities/domain and not relied upon; all cross-references are id-keyed.
- The batched list reads and their index support (authors, report counts, occupancy, open status,
  last-verified stamps, info requests) — one query per kind, index-backed, verified.
- Migration quality: versions V1–V28 with the V13 gap legitimately filled by a transactional
  Spring-registered Java migration; dotted `V23.1` orders correctly; every migration carries a
  validate-note and an explicit rationale for its DDL/DML; the PII migration replaces the plaintext
  unique indexes with the hash indexes the code actually queries.
- Background work: two `@Scheduled` jobs on the default single scheduler thread, with the registry
  fetch deliberately outside the transaction and per-account commits in the retention loop; the only
  raw thread is a correctly closed/interrupted read-stall watchdog.
- Pool/JPA settings are otherwise appropriate for a single-instance deployment — the only gap is the
  absence of any explicit Hikari sizing (F2).

## Top 5 findings

1. **F1 (High)** — `app/ShelterService.java:37-38,115-173,287-316,352-357` and
   `verification/VerificationService.java:96-173,220-249` have no transaction boundary: the
   documented same-transaction history/audit invariant is false, the submission caps are racy, and two
   concurrent verification sends lead to a duplicate pending code and a **500** on `/verify/confirm`
   (`SpringDataPendingVerificationRepository.java:117` maps one row through `Optional`).
   *(Also agent 1 F1; recorded here for the data-access consequences.)*
2. **F2 (Medium)** — blocking SMTP/Twilio sends inside `@Transactional` handlers
   (`auth/PasswordResetService.java:113,145`; `auth/ContactChangeService.java:90,106,154,170`) with no
   Hikari sizing anywhere (`application.yml:6-9`, defaults = 10 connections vs 200 Tomcat threads):
   the single most plausible way to take the instance down.
3. **F3 (Medium)** — `GET /admin/reports` loads the entire append-only `shelter_reports` table with no
   limit (`api/AdminModerationService.java:279-290`), while the sibling audit endpoint caps at 200
   (`:81-82,390-395`).
4. **F4 (Medium)** — `users` has no `@Version` and is written whole-row from a request snapshot
   (`persistence/UserEntity.java:27-29`, `JpaUserRepository.java:63-66`, `UserMapper.java:34-53`), so an
   in-flight user save can silently revert an admin suspension.
5. **F5 (Medium)** — `moderation_actions` has no index on `moderator_id`
   (`SpringDataModerationActionRepository.java:134-135`, used per reporter on the public detail read
   `ShelterQueryService.java:740-747` and by the `SET NULL` erasure cascade): one migration adds
   `(moderator_id, action)` and removes both scans.
