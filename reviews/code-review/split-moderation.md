# SPLIT-MODERATION — `AdminModerationService` split by seam

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** `src/main/java/ee/sheltermap/api/AdminModerationService.java` (804 lines) + the two
classes extracted from it + the tests pinning them. Everything else filed to the notes board
(nothing to file: zero cross-lane touch).

The earlier lane (`simplify-moderation`) fixed the two recon hazards (`listUsers` full-table
PII read, the global open-queue `findAll()` count) and flattened the nesting (max depth 5,
longest public action 42 L, no nested ternaries). What remained was not method shape but
**class shape**: 804 lines holding FOUR distinct admin surfaces — the shelter write actions,
the report queue, the audit-trail / history read projections, and the account (Users tab)
administration. Applying the code-review skill's smell baseline, that is one
Divergent-Change file: the V23 subject-label rule, the suspension-guard rule, the open-scope
scan rule and the review-decision rule are four independent reasons to edit one file, and the
class javadoc only named two of the four.

Following the shape the sibling lane just used (`HeroSaveResolver` / `GuidanceLifecycleService`
/ `GuidanceTranslationService`: a plain class, **not** a Spring bean, constructed inside the
service's frozen constructor; the service keeps its public surface and delegates — "the
implementation lives in X; this bean method keeps the `@Transactional` boundary and the public
surface"), I judged which seams are real and extracted the two that are.

## Seams judged REAL and extracted

| Seam | New home | What moved |
|---|---|---|
| Moderation audit trail + shelter edit history | `AdminAuditTrail` (new, 200 L, component) | `listAudit`, `shelterHistory` and the three mapping steps `toAuditDtos` / `toHistoryDtos` / `auditSubjectName`, VERBATIM (the V14 null-moderator guard comment and the V23 subjectLabel fall-through comment travel with them); the `DELETED_SHELTER_NAME` / `DELETED_ACCOUNT_NAME` values become the class's home constants. The bean delegates keep the `@Transactional(readOnly = true)` boundary, the `AUDIT_DEFAULT_LIMIT` paging normalization (the 400 vocabulary runs BEFORE the read, at the bean edge, exactly as before) and the full endpoint javadoc. |
| Account (Users tab) administration | `AdminUserModeration` (new, 166 L, component) | `listUsers`, `suspendUser` → `suspend`, `unsuspendUser` → `unsuspend` (renames only — the class name now carries the noun), `toUserDto`, the guard chain `requireSuspendableUser` / `requireUser` / `isRegistered` / `kindName`, VERBATIM (guard order 404 → 403 → 409, idempotency, the no-op-writes-no-row idiom, the shelterless audit row all unchanged); the two suspension-message values become the class's home constants. |

Both components take their collaborators from the service's already-validated parameters
(`new AdminAuditTrail(audit, shelters, users, history)`, `new AdminUserModeration(users,
clock, audit)`), constructed at the end of the frozen 9-arg constructor — the constructor
signature is byte-identical (`AdminModerationServiceTest:100` constructs it unmodified), and
the nine `requireNonNull` checks keep their order.

**Constants (the frozen test pins respected):** `AdminModerationServiceTest:302,343,476`
asserts `AdminModerationService.DELETED_SHELTER_NAME` / `DELETED_ACCOUNT_NAME`, `:406,417,
:434,:437` the two suspension messages, `:577` + `AdminModerationIT:994`
`AUDIT_DEFAULT_LIMIT`; `UserSuspensionIT:177,184` references
`AdminModerationService.PROVISIONED_ADMIN_SUSPENSION_MESSAGE`. Following the guidance lane's
precedent (`GuidanceService.MAX_TITLE_LENGTH = GuidanceValidation.MAX_TITLE_LENGTH`), the two
extracted pairs became **value delegates** on the service (the home moves to the component,
the service keeps the one-line pinned constant — the frozen suites read the same value from
the same name). `AUDIT_DEFAULT_LIMIT` and `UNKNOWN_NAME` stay true homes on the service:
`AUDIT_DEFAULT_LIMIT` because the paging normalization runs in the delegates, `UNKNOWN_NAME`
because it is still used by the staying `toReportDtos` AND by `ShelterQueryService:854`
(another lane's file) — its "one shared home" javadoc stays true.

## Seams judged and REJECTED

- **The report queue** (`listShelterReports` ×2, `dismissReport`, `queuePage` / `queueTotal`
  / `toReportDtos` / `openReportPage` / `openReportCount`, `reviewStatusOf`): by cohesion it
  IS a real seam (own paging, own DTO, own documented open-scope scan), but it is (a) the
  class's namesake core — the javadoc's "the two report queues with their single-row
  moderation actions" — and (b) the **anchored zone**: all three `00-CURRENT-STATE.md`
  citations into this file sit in it (§3: `:415-439` `openReportPage`, `:312-327`
  `listShelterReports` with `excludeDismissed`, `:415,449` `openReportPage` /
  `openReportCount`), guarded by `DocumentationFactsTest`. Moving the code would have broken
  the anchor test (the gate would be exit 1) or forced a doc edit this lane does not own.
  Left in place, byte-stable at the cited lines.
- **The five shelter write actions** (`setShelterStatus` / `deleteShelter` / `requestInfo` /
  `markInaccurate` / `clearInaccurate`): a real seam by cohesion (same two-guard prologue,
  same save + audit idiom), but it sits ABOVE the anchored zone — the delegates are shorter
  than the originals, so extracting it shifts the queue code up ~50+ lines and breaks all
  three citations; padding to compensate would be code-shaping to the doc (rot in reverse).
  Additionally they ARE the class (the name is `AdminModerationService` — these are the
  moderation), and they are already flat (≤ 42 L each, single-level early returns).
- **`reviewShelter` alone into a one-method component:** below the anchored zone, so movable,
  but a one-method component with its four sibling actions staying in the service would split
  the shelter-decision cluster across two files — file-shuffling, not a seam. Stays, with
  its `normalizeReason` / `auditAction` helpers.
- **`listShelters`:** a one-line delegate into `ShelterQueryService` (another lane's file,
  explicitly out of scope) — nothing to extract.
- **Splitting the queue reads further** (default scope vs open scope): same repositories,
  same DTO, one documented mechanism — the guidance lane rejected this same split for
  GuidanceService.

## Behaviour preservation

- **No public signature changed.** The controller's 14 call sites (`AdminController:155-490`)
  hit the same methods with the same parameters; the 9-arg constructor is byte-identical in
  signature.
- **Transactions:** the components are NOT Spring beans (no new context beans — the IT's
  context is unchanged); they run inside the bean's `@Transactional` /
  `@Transactional(readOnly = true)` delegates, so the audit row joins the same transaction
  as the action, a rolled-back action leaves no row, a no-op writes no row.
- **Statement order verbatim per method:** `listAudit` = `findLatest` then `countAll` (the
  paging 400 still throws in the delegate, BEFORE either read); `listUsers` =
  `findAccountPage` then `countAccounts`; `shelterHistory` = `findByShelterId` then
  `findById` (the 404 condition unchanged); `suspend` / `unsuspend` = guard chain →
  no-op check → `suspend`/`unsuspend` stamp → `save` → `audit.record`.
- **Exception messages byte-identical:** the two home constants are the same literals; the
  `UserNotFoundException` / `ProvisionedAdminProtectedException` /
  `NonSuspendableUserException` / `ReportNotFoundException` / `ShelterNotFoundException`
  throws are the same constructions in the same order.
- **Moved bodies are spliced, not retyped:** the extraction was built by a script that cut
  the original lines out of the file and asserted each re-point (three
  `UNKNOWN_NAME` → `AdminModerationService.UNKNOWN_NAME` references in
  `AdminAuditTrail`, one `AdminModerationService::toUserDto` →
  `AdminUserModeration::toUserDto` method reference, one `{@link #suspendUser}` →
  `{@link #suspend}` in the moved javadoc) happened exactly once. Every other moved line is
  byte-identical to the original.
- **No migration changes, no guard changes, no frontend changes, no controller changes, no
  DTO changes** → the OpenAPI snapshot is unchanged by construction (no controller or DTO
  touched).

## Line counts (before → after)

| File | Before | After |
|---|---|---|
| `AdminModerationService.java` | 804 | 649 (−155; the queue zone 307–449 and every shelter action sit at their original line numbers) |
| `AdminAuditTrail.java` | — | 200 |
| `AdminUserModeration.java` | — | 166 |

The service is now a readable map of the admin surface: the five shelter actions, the report
queue (its namesake core), `reviewShelter`, and five short delegates whose javadoc each says
where the implementation lives.

## Anchor (rule 6) — verified STABLE, no shift to record

The three `00-CURRENT-STATE.md` citations into this file (`:312-327`, `:415-439`, `:415,449`)
are **byte-stable**: the header rebuild (−6 imports, −7 constant lines, +4 fields/ctor,
+9 javadoc) nets to exactly zero above line 312, and nothing between 312 and 456 was
touched. Verified in-tree after the edit: `openReportPage` signature at 415, `openReportCount`
signature at 449, `listShelterReports` / `excludeDismissed` inside 312–327, all cited lines
carrying content. The kept mid region (136–522) and tail (785–804) are byte-identical to
HEAD (diff-verified by the builder). No document edit, no re-derivation owed.

## Evidence the suite passed unmodified

- `AdminModerationServiceTest` (39 tests, the frozen constructor suite — `:100` builds the
  bean with the same nine collaborators and asserts on the moved constants through
  `AdminModerationService.*`) — **unmodified**, green.
- `AdminModerationIT` (25 tests), `UserSuspensionIT` (6), `CommunityReviewIT` (14) —
  **unmodified**, green through the real Spring stack, through the new delegates, on real
  Postgres.
- `DocumentationFactsTest` 21/21 (the anchor zone held) and `SourceVocabularyTest` 2/2 —
  no planning-id-shaped text introduced.
- `OpenApiSnapshotIT` 1/1 — the public API surface is byte-stable.
- **Focused scope (pre-gate): 107/107 green, exit 0** (/tmp/splitmod-focused.log), 17:37.

## Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`
(detached, exit file /tmp/splitmod-gate.exit): **exit 0 — Tests run: 1362, Failures: 0,
Errors: 0, Skipped: 0** — the 1362-test baseline EXACT (nothing added or removed, as
expected: no test was touched). DocumentationFactsTest 21/21, SourceVocabularyTest 2/2,
OpenApiSnapshotIT 1/1, PMD clean, JaCoCo "All coverage checks have been met", BUILD SUCCESS,
17:39–17:41 EEST. The gate ran on the combined tree (the sibling SPLIT-QUERY lane's landed
`ShelterQueryService` extraction — its own anchor verified stable at `ShelterQueryService.java:
413-415` — and the FINISH-ODDS-ENDS lane's three comment fixes); zero failures attributable
here, and none observed at all.

## Unverified / residual

- Nothing behaviour-level. The only residual is cosmetic: the `AdminAuditTrail.shelterHistory`
  javadoc keeps the endpoint prefix "GET /admin/shelters/{id}/history —" from the verbatim
  move (the delegate carries the same javadoc — harmless duplication, kept verbatim on
  purpose).
- The two value-delegate constants on the service carry one-line javadoc ("home:
  {@link …}") instead of the full explanatory text — the full text now lives in the
  components' home constants.
