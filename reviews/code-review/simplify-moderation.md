# SIMPLIFY-MODERATION — `AdminModerationService` hazards fixed, file flattened

Lane report for the `code-review` run. No commits (parent commits).

**Scope, as assigned:** `src/main/java/ee/sheltermap/api/AdminModerationService.java`
and its pinning tests, exactly. Job 1: the two recon-identified performance
hazards (§7.9 `listUsers` full-table PII read, §5.4 global open-queue
`findAll()`), each with a test that would have caught it; state the edge-behaviour
changes precisely; preserve the documented contracts; regenerate the OpenAPI
snapshot only if it changed. Job 2: readability (flattened nesting, early
returns, named steps) — behaviour may not change beyond job 1.

**Governing rules applied:** no other services, controllers, guards or
migrations touched — the single cross-lane exception is the mandated seam
method, filed as a note (§2.3); no test weakened or removed; the
`ShelterController.addPlace` `isAdmin` triple is filed, not fixed; anchor
shifts recorded, docs not edited; final gate = the sanctioned full command
detached.

---

## 0. The "before", measured (recon's numbers were stale)

Recon §7.9/§7.14 described a 605-line file with 35 nesting levels and 200–350-line
actions, measured against an earlier tree. The live file was **757 lines**,
max brace depth **5**, longest method 61 lines. The two hazards themselves were
real and in place; the readability target was the queue/audit/user trio plus the
nested-conditional methods.

| metric | before | after |
|---|---|---|
| lines | 757 | 804 (all growth is javadoc on the six extracted steps) |
| max brace depth | 5 (nested ternaries + the open-scope scan loop) | 5, now **only** in the documented bounded-scan loop |
| longest public action | 61 L (`openReportPage` incl. javadoc) | 42 L (`setShelterStatus` incl. javadoc) |
| longest private step | 39 L (inline stream blocks) | 48 L (`toAuditDtos` — one 11-arg DTO build) |
| nested ternaries | 2 (queue page + queue total) | 0 |

## 1. Job 1 — the two hazards, each RED first

### 1.1 `listUsers`: the unpaged path loaded and decrypted every account

**Root cause.** `AdminModerationService.listUsers` took the unpaged branch
(both `limit` and `offset` absent — the frontend's default call, per
`admin-gateway.ts`) into `users.findAll()`: every `EncryptedUserData` of the
whole account population — **guests included** — deserialized and decrypted,
only to be filtered out in memory (`email() != null`). A moderator opening the
tab once cost a full-table PII read.

**Fix.** The endpoint now pages like the other admin lists, unconditionally:
`Pagination.requireDefaultedLimit(limit, AUDIT_DEFAULT_LIMIT)` (default **100**,
the same default as the audit trail and the report queue) +
`users.findAccountPage(offset, size)` (REGISTERED + ADMIN kinds — the existing
SQL-level guest exclusion) + `users.countAccounts()` for the
`X-Total-Count`. The per-row mapping became the named `toUserDto`. No new
seam needed — the paged account read already existed (recon's "new seam"
concern did not materialise).

**Edge-behaviour change (stated precisely).**

| input | before | after |
|---|---|---|
| both params absent (the frontend default) | the ENTIRE account list, guests loaded+decrypted then filtered, `total` = that page's size | the DEFAULT page of 100 (newest-first, same order the SQL sort gives the paged path), `total` = the guest-excluded population |
| `limit` present, 1..200 | unchanged | unchanged |
| `limit` present, out of range | 400 (`PagingException`) | 400, identical message |
| `limit` null + `offset` present | paged, `size` = full population | paged, `size` = **100** (the default applies whenever `limit` is absent) |
| `offset` out of range | 400 | 400, identical message |
| response shape | `Paged<AdminUserDto>` + `X-Total-Count` | identical — same DTO, same header, same 400 vocabulary |

The one user-visible delta: an unpaged `GET /admin/users` returns page 1 of 100
instead of the whole table. That IS the fix (it stops loading PII it doesn't
need); the frontend already reads `X-Total-Count` and renders the page, so the
screen now shows the same triage data through the paging contract it uses
everywhere else.

**Test that would have caught it.** `AdminModerationServiceTest` →
"the unpaged default is the shared 100, and the read is the paged SQL":
fails while the unpaged branch calls `findAll()`; passes only when the answer
comes from `findAccountPage(0, 100)` with `countAccounts()`. Verified RED
before the fix (it failed naming `findAll()`), GREEN after.
`AdminModerationIT` → "an unpaged users call returns the bounded default page
with the population header": the real Spring stack must answer the default
call with ≤ 100 rows, a 4-digit total on the 171-row seed, the `X-Total-Count`
header, and zero guest rows.

### 1.2 `openReportCount` (global scope): the count read the whole shelter table

**Root cause.** The global open queue's `X-Total-Count` gathered
`shelters.findAll()` to collect every shelter id, then ran the grouped
non-dismissed count over those ids. A count — a `SELECT COUNT(*)` — paid a
full table read of the shelter column.

**Fix.** The global scope now asks the report table directly:
`shelterReports.countOpen()` — one `SELECT count(r) WHERE dismissed_at IS NULL`
(the table's established dismissed predicate; dismissed rows count in nothing,
this count included). The shelter scope keeps the grouped per-type count
over `List.of(shelterId)` — which is also what the pins read, so the queue
and the pins agree by construction (the documented invariant, now stated in
the method's javadoc as the constraint it protects). The `ids.isEmpty()`
guard died with the read: reports of deleted shelters cascade away with the
shelter, so the undismissed count covers the whole table by itself.

**Edge-behaviour change (stated precisely).** None for any input. Every
(scope, state) combination returns exactly the value it returned before:
the old code's grouped count over all shelter ids equals
`count(*) WHERE dismissed_at IS NULL` because the cascade makes
{all shelters' reports} = {the report table} and every query on that table
carries the same dismissed predicate. The only behaviour change is the
mechanism: COUNT instead of read.

**Test that would have caught it.** `AdminModerationServiceTest` →
"the global open queue total is the store count, not a shelter-table read":
seeds 4 shelters / 3 reports, asserts the queue total is 3 AND the counting
fake proves `shelters.findAll()` was never called. Verified RED before the
fix (`found no call to findAll()` — it *had* been called), GREEN after.
`AdminModerationIT` → "the open report queue renders only open rows and its
total is the open count": on real Postgres the open scope returns only
non-dismissed rows, `total` = open count, `X-Total-Count` header = open count,
and the unfiltered scope still renders everything (nothing hidden silently —
the documented invariant the recon pin protected).

### 1.3 The seam touch (cross-lane, filed as a note)

`countOpen()` is a NEW abstract method on `app/ShelterReportRepository` +
`JpaShelterReportRepository` (the derived count) +
`SpringDataShelterReportRepository` (the `@Query`) + the in-memory test fake
(same `dismissedAt == null` rule as its `findLatest` filter, so the fakes'
answers stay identical). No existing signature, query or behaviour of those
files changed. This is the cross-lane request the brief anticipated — filed on
the notes board for BE-APP-REPORTS and BE-PERSISTENCE-SHELTER, which own those
files.

### 1.4 Contract preservation — measured

- **OpenAPI snapshot: UNCHANGED.** No controller or DTO touched, so no
  regeneration was needed (rule: regenerate only if it changes).
  `OpenApiSnapshotIT` green on the new tree.
- **`DocumentationFactsTest` 21/21, `SourceVocabularyTest` green** — the
  old anchor ranges still carry content (structural-only citations), and the
  new comments carry no planning-id-like text.
- **The documented invariants the recon pinned are still pinned and now
  machine-checked:** dismissed = resolved (never deleted); the filtered list
  agrees with the counts; nothing hidden silently; audit rows join the
  transaction; batched name lookups, no N+1; no-op calls write no audit row.

## 2. Job 2 — readability, behaviour frozen

Six named steps extracted; five actions flattened to early returns:

| extracted / flattened | what it does now |
|---|---|
| `queuePage` / `queueTotal` | the queue's page and length without paging; the scope ternaries live once, in named methods, instead of two inline nested ternaries |
| `toReportDtos` | one page of reports → DTOs (the batched shelter + reporter lookups, moved verbatim) |
| `toAuditDtos` | the trail's rows → DTOs (the V14 dual-shape handling, moved verbatim with its comment) |
| `toHistoryDtos` | the history's events → DTOs |
| `toUserDto` | the admin-user tab row (static — no state touched) |
| `requireSuspendableUser` | the suspend guards (404 → provisioned-admin → non-registered), one read, shared by suspend/unsuspend |
| early returns | `setShelterStatus`, `markInaccurate`, `clearInaccurate`, `dismissReport`, `suspendUser`, `unsuspendUser` — the no-op case returns first, the happy path is top-level code |

Every extraction is a **verbatim move** — the moved code is unchanged
(verified by diff: no statement inside a moved block differs from the
original). Behaviour preservation is proven by the pinning tests: the
39-test unit suite (including the 17 idempotency/pinning tests that assert
"no audit row on no-op") and the 25-test IT (23 existing + 2 new) are green on
the flattened tree — same assertions, same values, real Postgres.

What I did NOT do (deliberate): the V14 dual-shape audit DTO build stays one
block (splitting the `previous instanceof Row ? ... : ...` is a
presentation-layer readability task with a real N+1 history behind it —
flagged, not touched); the bounded-scan loop in `openReportPage` keeps its
depth (the depth-5 spot — `while → for → if`) because it is the
documented mechanism of the open-scope filter, and its javadoc now states the
constraint that bounds it (append-only table, short-batch sentinel).

## 3. Gates

| command | result |
|---|---|
| `mvn test -Dtest=AdminModerationServiceTest` (job-1 RED proof) | 2 new tests FAIL for the intended reasons (both name the offending read) |
| `mvn test -Dtest=AdminModerationServiceTest` (job-1 GREEN) | 39/39 |
| `mvn test -Dtest=AdminModerationIT` | 25/25, exit 0 |
| `mvn test -Dtest='AdminModerationServiceTest,DocumentationFactsTest,SourceVocabularyTest,OpenApiSnapshotIT'` | 62/62, exit 0 |
| **`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`** (detached) | exit 0 — see §5 |

Log: `/tmp/sm-fullgate.log`; exit marker: `/tmp/sm-fullgate.exit`.

## 4. Notes board entries (appended to `docs/autopilot/CODE-REVIEW-NOTES.md`)

1. **SEAM TOUCH** (BE-APP-REPORTS + BE-PERSISTENCE-SHELTER): the `countOpen()`
   addition to the four report-repository files — the only cross-lane edit
   this lane made, parent-mandated, no existing signature changed.
2. **ADMIN-CTRL wording drift**: `AdminController`'s `listUsers`
   `@Operation`/`@Parameter` text still says "absent = the whole list" — now
   false (absent = default 100). That lane rewords the controller text (and
   the frontend's `admin-gateway.ts` javadoc the same way) and regenerates
   `docs/api/openapi.json` with the sanctioned command **only if** the text
   changes; until then the snapshot is truth (endpoint shape unchanged).
3. **DOC-LANE anchor shifts** (my file's three citations in
   `docs/agent/00-CURRENT-STATE.md`): `:382-406,408-425` → `:414-438,440-455`;
   `:311-315` → `:312-316`; `:382,415` → `:414,448`. Structural-only
   citations; old ranges still carry content so the guard stays green —
   precision drift, not a failing anchor. The same doc's factual sentence
   "The global open queue loads every shelter (to get its ids) then counts"
   is now false — it's a single COUNT that never reads the shelter table;
   the docs lane rewrites that clause too.
4. **filed-not-fixed** (BE-APP-SHELTER / parent): the
   `ShelterController.addPlace` triple `isAdmin` round-trip (recon §6.4) —
   per the brief, noted only; the fix is one `boolean admin =
   userRepository.isAdmin(user.getId());` at the top of the method,
   behaviour-identical (single transaction, no interleaving writer).

## 5. Residuals for the parent

- **Working tree is uncommitted** (this lane's 7 files: the service, the four
  seam files, the two test files — plus this report and the notes-board
  append). Commit per the run protocol once the lane gates are all green.
- The `AdminController`/`admin-gateway.ts` wording drift is a **live
  documentation lie** until the two lanes reword it; the OpenAPI snapshot is
  still truthful (endpoint contract unchanged).
- `docs/agent/00-CURRENT-STATE.md` carries two now-stale facts about this file
  (anchor ranges §4.3 + the "loads every shelter" sentence); both are filed,
  none are mine to edit.
