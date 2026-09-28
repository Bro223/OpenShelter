# READABILITY-SWEEP — comments, names and structure in the unread main-source files

**Branch:** `polish-work` (the working tree as cut, 2 commits ahead of `feature/frontend` —
`2084c47` seams-unfreeze landing, `1e9850a` extractor restore; the gate baseline of 1365 tests
matches this tree exactly per `reviews/polish/seams-unfreeze.md`). No commit — the parent
commits. The tree also carried uncommitted sibling-lane work when this lane started
(`shelters-view.ts` / `unconfirmed-view.ts` comment rewordings) and during the lane a sibling
guidance/shelter lane was actively editing `submit-shelter-page.ts`, `location-capture-view.ts`
(new), the guidance admin files and `GuidanceController.java`/`GuidanceSearch.java` — none of
which this lane touched.

**Skills used:** `docs/skills/clean-code.md` (the readability standard),
`docs/skills/code-review.md` (Standards/Spec two-axis report discipline).

---

## 1. The unread-files map (evidence: what no report under `reviews/` names)

Method: every `.md` under `reviews/` (116 files, all lanes, all runs) was searched for each
main-source file's basename-with-extension as a whole word. A file is UNREAD iff no report
names it. `reviews/inventory.md` was excluded from the evidence — it is an assignment table
that names every file by construction and would collapse the set to zero.

Result: **164 of 531 main-source files are unread by any lane (7,647 lines)**:

| Area | Files |
|---|---|
| `src/main/java` outside `persistence/` | 100 |
| `src/main/java/ee/sheltermap/persistence/` | 41 |
| `frontend/src/app/features/` + `core/` | 15 |
| `frontend/src` shared / app root / `node-fs.d.ts` | 8 |

Cross-check: none of the 164 is cited by `docs/agent/00-CURRENT-STATE.md`, so no edit in this
lane owes an anchor re-derivation. Full list (with line counts) in Appendix A; the map's
machine form was kept at `/tmp/rs/final-map.json` (this path is session-local — the appendix
is the durable copy).

Packages covered: `app/` (exceptions, log seams, repositories), `api/` request/DTO records,
`auth/`, `config/`, `domain/`, `guidance/`, `ingestion/`, `persistence/` (all 41), `retention/`,
`sitetexts/`, `verification/`, plus the FE admin panels, legal pages, `auth-gateway.ts`,
`gauge-math.ts`, the shared SCSS and `app.scss`.

---

## 2. Defects found, with what the code actually does

### A. Dead change names split across a line wrap (8 dead-name occurrences, 1 live-name)

The dead names were written into comments as parentheticals, and the wrap broke the kebab
token across two lines — so a line-based whole-token scan never matches them. (This is the
gap the GUARD-WIRING report describes for the never-made check; it applies to the archived
names too, in both the Java extractor path and the FE id-shape path.)

Fixed in this lane (dead names, the adjudicated remove-the-parenthetical class):

| # | Occurrence | What the code actually does |
|---|---|---|
| A1 | `app/DuplicateReportException.java:5-6` — `(shelter-trust-and- and-reports the unique constraints…)` | 409 for a repeat `(shelter, user, type)` report; the `uq_shelter_reports_shelter_user_type` / occupancy unique constraints are the per-target abuse bound |
| A2 | `app/ReportActionLog.java:4-5` — `(shelter-trust-and- reports)` | one row per report-type action (any target/type); the per-user trailing-hour throttle counts these rows |
| A3 | `app/ShelterOccupancyRepository.java:10-11` — `(shelter-trust-and- reports)` | upsert seam: one live report per (shelter, user); a re-PUT updates the row (verified in `JpaShelterOccupancyReportRepository.save`) |
| A4 | `app/ShelterInfoRequestLog.java:10-11` — `(moderation-dashboard- completion)` | ONE row per shelter (UNIQUE `shelter_id`); the admin asks, the submitter answers once; the row is kept after the reply |
| A5 | `frontend/src/app/shared/leaflet-service.ts:51-52` — `(shelter-trust-and- reports, extended to EITHER report kind…)` | the marker tone class: an OPEN does-not-exist OR inaccurate-information report wins (the orange dot) |

File (not edited — the file is owned by a running sibling lane at the time of the sweep):

| # | Occurrence | Note |
|---|---|---|
| A6 | `frontend/src/app/gateways/admin-gateway.ts:384` — `(admin-locale- scope, `locale` given)` | the sibling guidance lane holds the file in-flight; the parenthetical reads "(admin-locale-scope, `locale` given)" — remove the dead name and reword as "SCOPED (a `locale` is given)" |

Live-name instance (reported, not touched — new instance of owner-pending item 17):

| # | Occurrence | Note |
|---|---|---|
| A7 | `frontend/src/app/core/models.ts:696` — `community-review-queue` split as `community-review-\nqueue` | the name is LIVE (the feature exists); only the wrap is wrong — un-wrap in the owner's 17 sweep |
| A8 | `frontend/src/app/features/admin/guidance-editor.ts:552` — `bilingual-guidance` split as `bilingual-\nguidance` | the never-made name, wrap-split so it is invisible to the line-based whole-token matcher; the file is a sibling lane's (FE-GODFILES) territory — file for the guard/owner pass |

### B. Stale hash wording (the keyed-`v2:` class, one more instance)

| # | Occurrence | What the code actually does |
|---|---|---|
| B1 | `auth/PendingContactChange.java:11` — "stored hashed (SHA-256)" | the code is stored via `piiCrypto.codeHash(PiiCrypto.DOMAIN_CODE_CONTACT_CHANGE, code)` (`ContactChangeService.java:161,241`) — the keyed `v2:` form, with legacy unkeyed SHA-256 readable through the transition (the same class already fixed in `PasswordResetToken.java`, `PendingVerification.java` by BOARD-SWEEP / SIMPLIFY-VERIFICATION) |

Filed, not edited (files named by earlier lanes — new instances of the same class):

| # | Occurrence | What the code actually does |
|---|---|---|
| B2 | `auth/ContactChangeService.java:43` — "code hashed (SHA-256) at rest" | same as B1 (verified at the same two call sites) |
| B3 | `auth/Hashes.java:6` — "(refresh/reset tokens are stored hashed)" — the "reset tokens" half | `Hashes.sha256Hex` is called only by `JwtTokenService` (refresh tokens, `:61,70,105`); reset codes go through `piiCrypto.codeHash` (`PasswordResetService.java:192`) |

### C. Unresolvable planning ids (the S1b/S1c class, one file left)

BOARD-SWEEP removed these ids from `PasswordResetService.java`; its sibling seam kept them:

| # | Occurrence | Fix applied |
|---|---|---|
| C1 | `auth/PasswordResetTokenRepository.java:27` — "(S1b, V8 `created_at`)" | "(the V8 `created_at` anchor)" — the house rewording from `PasswordResetService.java:44` |
| C2 | `:34` — "(S1b, V8)" | "(V8)" (V8 is a resolvable migration reference) |
| C3 | `:41` — "…active users (S1c):" | id dropped; sentence reads "Bounds table growth for active users:" |

### D. Edit remnant — duplicated phrase

| # | Occurrence | Fix applied |
|---|---|---|
| D1 | `guidance/GuidanceTranslationRepository.java:9-10` — "Implementations live / Implementations live in `ee.sheltermap.persistence`" | the duplicate line removed; javadoc now reads "…Implementations live in `ee.sheltermap.persistence`; tests use the in-memory fake in the test tree." |

### E. Verified claims left in place (checked against the code, accurate)

- `api/AdminMarkInaccurateRequest.java:8` — "a blank reason stores NULL on the audit row":
  `AdminModerationService.normalizeReason` (`:626-628`) maps null/blank → null before the
  `MARK_INACCURATE` audit row (`:254-256`). Accurate.
- `api/OccupancyReportRequest` — "a re-send updates the existing report":
  `JpaShelterOccupancyReportRepository.save` is a find-then-save upsert on the unique
  `(shelter_id, user_id)`; `applyFields` overwrites `band`/`updatedAt`. Accurate.
- `auth/TokenService.java:6` — "access = JWT, 15 min … refresh = 30 days": matches
  `application.yml` (`access-ttl: 15m`, `refresh-ttl: 30d`). Accurate.
- `auth/JpaRefreshTokenRepository.java:14` — "Tokens are stored hashed (SHA-256)": accurate —
  `JwtTokenService` uses unkeyed `Hashes.sha256Hex` for refresh tokens (high-entropy secrets;
  the keyed form is for low-entropy codes).
- `(03-auth.puml)` citations in `auth/` and `persistence/UserCredentialsEntity.java`: the
  file exists at `context-and-tasks/03-auth.puml` — resolvable, kept (house precedent for
  resolvable citations).
- "TIJ Ch 9" in `verification/VerificationProvider.java:7`: the Thinking-in-Java Bird/
  Pigeon/Penguin citation, recorded in `context-and-tasks/01-user-verification.puml` — a
  source reference, not a planning id (SIMPLIFY-DOMAIN's adjudication). Kept.
- Mechanical scans over all 164 files: history-tone comments (6 hits — all legitimate
  "since V9" migration anchors), duplicated string literals (none substantive),
  single-reference private members (none).

---

## 3. What this lane fixed (8 files, comments only)

| File | Change | Line delta |
|---|---|---|
| `src/main/java/ee/sheltermap/app/DuplicateReportException.java` | A1 — dead name removed, sentence repaired | 3/3 (preserving) |
| `src/main/java/ee/sheltermap/app/ReportActionLog.java` | A2 — dead name removed | 3/3 (preserving) |
| `src/main/java/ee/sheltermap/app/ShelterOccupancyRepository.java` | A3 — dead name removed | 2/3 |
| `src/main/java/ee/sheltermap/app/ShelterInfoRequestLog.java` | A4 — dead name removed | 3/3 (preserving) |
| `src/main/java/ee/sheltermap/auth/PendingContactChange.java` | B1 — keyed-`v2:` wording (mirrors the fixed `PendingVerification.java` javadoc) | 2/1 |
| `src/main/java/ee/sheltermap/auth/PasswordResetTokenRepository.java` | C1-C3 — S1b/S1c ids removed, house rewording | 7/7 (preserving) |
| `src/main/java/ee/sheltermap/guidance/GuidanceTranslationRepository.java` | D1 — duplicated "Implementations live" removed | 2/2 (preserving) |
| `frontend/src/app/shared/leaflet-service.ts` | A5 — dead name removed, rewrap | 3/3 (preserving — the doc anchor `leaflet-service.ts:50-91` in `00-CURRENT-STATE.md` stays valid, no shift owed) |

Zero code lines changed in any file; no user-visible string, translation, i18n key, CSS
class, DOM id, migration or test touched. No reformatting — every edit is a comment
replacement with the surrounding wrap kept where it was meaningful.

---

## 4. Filed for other lanes / the owner

1. **A6** — `admin-gateway.ts:384` dead-name parenthetical (sibling lane's in-flight file).
2. **A7** — `core/models.ts:696` wrap-split of the LIVE name `community-review-queue`
   (owner-pending item 17, new instance).
3. **A8** — `guidance-editor.ts:552` wrap-split of the never-made name `bilingual-guidance`
   (FE-GODFILES territory; invisible to the line-based matcher — the guard lane should know
   the wrap split evades both the Java and the FE id-shape paths).
4. **B2/B3** — `ContactChangeService.java:43` and `Hashes.java:6` stale hash wording
   (earlier-lane files, same class as B1 which this lane fixed).
5. **Guard gap** — line-based comment scanning misses kebab names broken across a line
   wrap; both `shelter-trust-and-reports`/`moderation-dashboard-completion` (archived) and
   `bilingual-guidance`/`community-review-queue` (never-made/live) have wrap-split
   occurrences in the tree as of this sweep.

---

## 5. Gates

- Backend `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true`:  
  **exit 0 — 1365/1365, 0 failures, 0 skipped, BUILD SUCCESS** (`/tmp/rs/be-gate.log`). The
  baseline's one known anchor-pin red is reconciled in-tree (the GUARD-WIRING lane's anchor
  re-derivation in `docs/agent/00-CURRENT-STATE.md` + `SourceVocabularyTest.java` landed
  before this gate ran), so the full suite is green — no exclusion needed.
- Frontend `npx ng test --watch=false` (required — this lane edited `leaflet-service.ts`):  
  first run **exit 1**, sibling-attributable — `submit-shelter-page.ts:102` TS2322
  (`Signal<ElementRef<HTMLElement> | undefined>` not assignable to
  `Signal<ElementRef<HTMLElement> | null>`), inside the guidance/shelter lane's in-flight
  `LocationCaptureView` refactor (the file + its untracked new view were mid-edit during the
  run). This lane's own file checked clean under the LSP probe after the edit (comment-only
  change, 3/3 line-preserving). Re-run after the sibling's refactor settled:  
  **exit 0 — 65 test files, 1583/1583 tests passed** (`/tmp/rs/fe-gate2.log`).

## 6. Unverified / caveats

- The tree was not lane-exclusive during this sweep: the guidance/shelter sibling lane wrote
  ~20 files mid-run (incl. `GuidanceController.java`, `GuidanceSearch.java` and four
  guidance test files). Any red in the backend gate localized to those files is
  sibling-attributable and will be annotated as such.
- `PiiKeys.java:20` cites the archive path `2026-09-16-pii-at-rest/design.md` — a path
  reference, not a change-name citation; the archive exists under
  `openspec/changes/archive/`. Left alone.
- `/tmp/rs/final-map.json` is session-local; the durable unread map is Appendix A.

---

## Appendix A — the unread map (164 files, as found before this lane edits)

| Lines | File |
|---|---|
| 22 | `src/main/java/ee/sheltermap/ShelterMapApplication.java` |
| 14 | `src/main/java/ee/sheltermap/api/AdminInfoRequestRequest.java` |
| 14 | `src/main/java/ee/sheltermap/api/AdminMarkInaccurateRequest.java` |
| 46 | `src/main/java/ee/sheltermap/api/AdminUserDto.java` |
| 25 | `src/main/java/ee/sheltermap/api/EmailTestResult.java` |
| 9 | `src/main/java/ee/sheltermap/api/InvalidShelterException.java` |
| 13 | `src/main/java/ee/sheltermap/api/OccupancyReportRequest.java` |
| 14 | `src/main/java/ee/sheltermap/api/OpenStatusReportRequest.java` |
| 20 | `src/main/java/ee/sheltermap/api/ReorderGuidanceRequest.java` |
| 68 | `src/main/java/ee/sheltermap/api/SiteTextController.java` |
| 25 | `src/main/java/ee/sheltermap/api/SmsTestRequest.java` |
| 32 | `src/main/java/ee/sheltermap/api/SmsTestResult.java` |
| 16 | `src/main/java/ee/sheltermap/api/UpdateSiteTextRequest.java` |
| 15 | `src/main/java/ee/sheltermap/app/AdminAccessException.java` |
| 27 | `src/main/java/ee/sheltermap/app/AppInfo.java` |
| 13 | `src/main/java/ee/sheltermap/app/DuplicateInfoRequestException.java` |
| 17 | `src/main/java/ee/sheltermap/app/DuplicateReportException.java` |
| 15 | `src/main/java/ee/sheltermap/app/ImportOwnedShelterException.java` |
| 13 | `src/main/java/ee/sheltermap/app/InfoRequestAlreadyAnsweredException.java` |
| 12 | `src/main/java/ee/sheltermap/app/InfoRequestNotFoundException.java` |
| 16 | `src/main/java/ee/sheltermap/app/NonSuspendableUserException.java` |
| 17 | `src/main/java/ee/sheltermap/app/NotAuthorException.java` |
| 9 | `src/main/java/ee/sheltermap/app/NotVerifiedException.java` |
| 28 | `src/main/java/ee/sheltermap/app/ProvisionedAdminProtectedException.java` |
| 39 | `src/main/java/ee/sheltermap/app/ReportActionLog.java` |
| 12 | `src/main/java/ee/sheltermap/app/ReportNotFoundException.java` |
| 18 | `src/main/java/ee/sheltermap/app/ReportProperties.java` |
| 70 | `src/main/java/ee/sheltermap/app/ShelterInfoRequestLog.java` |
| 16 | `src/main/java/ee/sheltermap/app/ShelterNotFoundException.java` |
| 32 | `src/main/java/ee/sheltermap/app/ShelterOccupancyRepository.java` |
| 41 | `src/main/java/ee/sheltermap/app/ShelterOpenStatusRepository.java` |
| 110 | `src/main/java/ee/sheltermap/app/ShelterReportRepository.java` |
| 42 | `src/main/java/ee/sheltermap/app/ShelterSubmissionThrottledException.java` |
| 13 | `src/main/java/ee/sheltermap/app/UserNotFoundException.java` |
| 34 | `src/main/java/ee/sheltermap/auth/Argon2PasswordHasher.java` |
| 14 | `src/main/java/ee/sheltermap/auth/ChangeEmailRequest.java` |
| 12 | `src/main/java/ee/sheltermap/auth/ChangePhoneRequest.java` |
| 23 | `src/main/java/ee/sheltermap/auth/CodeSentDto.java` |
| 15 | `src/main/java/ee/sheltermap/auth/ConfirmChangeRequest.java` |
| 21 | `src/main/java/ee/sheltermap/auth/ContactChangeProperties.java` |
| 30 | `src/main/java/ee/sheltermap/auth/ContactChangeResult.java` |
| 20 | `src/main/java/ee/sheltermap/auth/DuplicateAccountException.java` |
| 14 | `src/main/java/ee/sheltermap/auth/InvalidContactChangeException.java` |
| 13 | `src/main/java/ee/sheltermap/auth/InvalidCredentialsException.java` |
| 16 | `src/main/java/ee/sheltermap/auth/InvalidProfilePasswordException.java` |
| 10 | `src/main/java/ee/sheltermap/auth/InvalidRefreshTokenException.java` |
| 14 | `src/main/java/ee/sheltermap/auth/InvalidResetTokenException.java` |
| 15 | `src/main/java/ee/sheltermap/auth/JwtProperties.java` |
| 17 | `src/main/java/ee/sheltermap/auth/LoginRequest.java` |
| 14 | `src/main/java/ee/sheltermap/auth/PasswordHasher.java` |
| 9 | `src/main/java/ee/sheltermap/auth/PasswordResetRequest.java` |
| 47 | `src/main/java/ee/sheltermap/auth/PasswordResetTokenRepository.java` |
| 82 | `src/main/java/ee/sheltermap/auth/PendingContactChange.java` |
| 35 | `src/main/java/ee/sheltermap/auth/PendingContactChangeRepository.java` |
| 28 | `src/main/java/ee/sheltermap/auth/ProfileUpdateRequest.java` |
| 36 | `src/main/java/ee/sheltermap/auth/RateLimiter.java` |
| 14 | `src/main/java/ee/sheltermap/auth/RefreshRequest.java` |
| 11 | `src/main/java/ee/sheltermap/auth/RefreshTokenRecord.java` |
| 18 | `src/main/java/ee/sheltermap/auth/SuspendedAccountException.java` |
| 23 | `src/main/java/ee/sheltermap/auth/TokenService.java` |
| 33 | `src/main/java/ee/sheltermap/auth/Transactions.java` |
| 64 | `src/main/java/ee/sheltermap/auth/UserCredentials.java` |
| 17 | `src/main/java/ee/sheltermap/auth/UserCredentialsRepository.java` |
| 14 | `src/main/java/ee/sheltermap/auth/VerificationFailedException.java` |
| 22 | `src/main/java/ee/sheltermap/auth/VerifyConfirmRequest.java` |
| 13 | `src/main/java/ee/sheltermap/auth/VerifyRequest.java` |
| 25 | `src/main/java/ee/sheltermap/config/RegistryRunConfig.java` |
| 8 | `src/main/java/ee/sheltermap/domain/Capability.java` |
| 23 | `src/main/java/ee/sheltermap/domain/GuestUser.java` |
| 64 | `src/main/java/ee/sheltermap/domain/ShelterOpenStatusReport.java` |
| 13 | `src/main/java/ee/sheltermap/domain/ShelterSource.java` |
| 11 | `src/main/java/ee/sheltermap/domain/ShelterStatus.java` |
| 71 | `src/main/java/ee/sheltermap/domain/SiteText.java` |
| 18 | `src/main/java/ee/sheltermap/domain/UserData.java` |
| 84 | `src/main/java/ee/sheltermap/domain/VerificationClaim.java` |
| 20 | `src/main/java/ee/sheltermap/guidance/GuidanceNotFoundException.java` |
| 79 | `src/main/java/ee/sheltermap/guidance/GuidanceTranslationRepository.java` |
| 18 | `src/main/java/ee/sheltermap/guidance/GuidanceValidationException.java` |
| 100 | `src/main/java/ee/sheltermap/guidance/HeroAddressPolicy.java` |
| 36 | `src/main/java/ee/sheltermap/guidance/HeroAddressResolver.java` |
| 48 | `src/main/java/ee/sheltermap/guidance/HeroImageFetchClient.java` |
| 29 | `src/main/java/ee/sheltermap/guidance/MediaAssetInUseException.java` |
| 22 | `src/main/java/ee/sheltermap/guidance/MediaTooLargeException.java` |
| 24 | `src/main/java/ee/sheltermap/guidance/SlugAlreadyUsedException.java` |
| 24 | `src/main/java/ee/sheltermap/guidance/UnsupportedImageException.java` |
| 43 | `src/main/java/ee/sheltermap/ingestion/ImportResult.java` |
| 32 | `src/main/java/ee/sheltermap/ingestion/RegistryFetch.java` |
| 32 | `src/main/java/ee/sheltermap/ingestion/RegistryShelterDto.java` |
| 19 | `src/main/java/ee/sheltermap/ingestion/RegistryUnavailableException.java` |
| 20 | `src/main/java/ee/sheltermap/ingestion/ShelterParser.java` |
| 41 | `src/main/java/ee/sheltermap/ingestion/ShelterRegistryClient.java` |
| 103 | `src/main/java/ee/sheltermap/persistence/DataImportEntity.java` |
| 209 | `src/main/java/ee/sheltermap/persistence/GuidancePostEntity.java` |
| 48 | `src/main/java/ee/sheltermap/persistence/GuidancePostMapper.java` |
| 128 | `src/main/java/ee/sheltermap/persistence/GuidanceTranslationEntity.java` |
| 40 | `src/main/java/ee/sheltermap/persistence/GuidanceTranslationMapper.java` |
| 142 | `src/main/java/ee/sheltermap/persistence/JpaGuidanceTranslationRepository.java` |
| 124 | `src/main/java/ee/sheltermap/persistence/JpaMediaAssetRepository.java` |
| 95 | `src/main/java/ee/sheltermap/persistence/JpaPasswordResetTokenRepository.java` |
| 87 | `src/main/java/ee/sheltermap/persistence/JpaPendingContactChangeRepository.java` |
| 56 | `src/main/java/ee/sheltermap/persistence/JpaRefreshTokenRepository.java` |
| 86 | `src/main/java/ee/sheltermap/persistence/JpaShelterOccupancyReportRepository.java` |
| 93 | `src/main/java/ee/sheltermap/persistence/JpaShelterOpenStatusReportRepository.java` |
| 164 | `src/main/java/ee/sheltermap/persistence/JpaShelterReportRepository.java` |
| 73 | `src/main/java/ee/sheltermap/persistence/JpaSiteTextRepository.java` |
| 61 | `src/main/java/ee/sheltermap/persistence/JpaUserCredentialsRepository.java` |
| 139 | `src/main/java/ee/sheltermap/persistence/MediaAssetEntity.java` |
| 43 | `src/main/java/ee/sheltermap/persistence/MediaAssetMapper.java` |
| 157 | `src/main/java/ee/sheltermap/persistence/ModerationActionEntity.java` |
| 99 | `src/main/java/ee/sheltermap/persistence/PasswordResetTokenEntity.java` |
| 110 | `src/main/java/ee/sheltermap/persistence/PendingContactChangeEntity.java` |
| 99 | `src/main/java/ee/sheltermap/persistence/PendingVerificationEntity.java` |
| 83 | `src/main/java/ee/sheltermap/persistence/RefreshTokenEntity.java` |
| 71 | `src/main/java/ee/sheltermap/persistence/ReportActionEntity.java` |
| 76 | `src/main/java/ee/sheltermap/persistence/RetentionRunEntity.java` |
| 111 | `src/main/java/ee/sheltermap/persistence/ShelterHistoryEntity.java` |
| 114 | `src/main/java/ee/sheltermap/persistence/ShelterInfoRequestEntity.java` |
| 82 | `src/main/java/ee/sheltermap/persistence/ShelterOccupancyReportEntity.java` |
| 83 | `src/main/java/ee/sheltermap/persistence/ShelterOpenStatusReportEntity.java` |
| 117 | `src/main/java/ee/sheltermap/persistence/ShelterReportEntity.java` |
| 81 | `src/main/java/ee/sheltermap/persistence/SiteTextEntity.java` |
| 28 | `src/main/java/ee/sheltermap/persistence/SiteTextMapper.java` |
| 23 | `src/main/java/ee/sheltermap/persistence/SpringDataDataImportRepository.java` |
| 25 | `src/main/java/ee/sheltermap/persistence/SpringDataReportActionRepository.java` |
| 8 | `src/main/java/ee/sheltermap/persistence/SpringDataRetentionRunRepository.java` |
| 18 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterHistoryRepository.java` |
| 18 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterInfoRequestRepository.java` |
| 20 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterOccupancyReportRepository.java` |
| 30 | `src/main/java/ee/sheltermap/persistence/SpringDataShelterOpenStatusReportRepository.java` |
| 8 | `src/main/java/ee/sheltermap/persistence/SpringDataUserCredentialsRepository.java` |
| 64 | `src/main/java/ee/sheltermap/persistence/UserCredentialsEntity.java` |
| 103 | `src/main/java/ee/sheltermap/persistence/VerificationClaimEntity.java` |
| 23 | `src/main/java/ee/sheltermap/retention/RetentionProperties.java` |
| 33 | `src/main/java/ee/sheltermap/retention/RetentionRunLog.java` |
| 16 | `src/main/java/ee/sheltermap/sitetexts/SiteTextValidationException.java` |
| 24 | `src/main/java/ee/sheltermap/verification/AlreadyVerifiedException.java` |
| 23 | `src/main/java/ee/sheltermap/verification/CodeSendFailedException.java` |
| 26 | `src/main/java/ee/sheltermap/verification/PendingVerificationRepository.java` |
| 46 | `src/main/java/ee/sheltermap/verification/VerificationConfig.java` |
| 39 | `src/main/java/ee/sheltermap/verification/VerificationProvider.java` |
| 41 | `src/main/java/ee/sheltermap/verification/VerificationThrottledException.java` |
| 5 | `frontend/src/app/app.scss` |
| 39 | `frontend/src/app/features/admin/alerts-panel.html` |
| 6 | `frontend/src/app/features/admin/alerts-panel.scss` |
| 219 | `frontend/src/app/features/admin/guidance-panel.ts` |
| 121 | `frontend/src/app/features/admin/media-panel.ts` |
| 8 | `frontend/src/app/features/admin/reports-panel.scss` |
| 113 | `frontend/src/app/features/admin/unconfirmed-panel.html` |
| 6 | `frontend/src/app/features/admin/unconfirmed-panel.scss` |
| 92 | `frontend/src/app/features/admin/users-panel.ts` |
| 27 | `frontend/src/app/features/auth/login-page.scss` |
| 23 | `frontend/src/app/features/auth/register-page.scss` |
| 23 | `frontend/src/app/features/auth/reset-page.scss` |
| 257 | `frontend/src/app/features/legal/privacy-policy-page.html` |
| 54 | `frontend/src/app/features/legal/privacy-policy-page.scss` |
| 155 | `frontend/src/app/features/legal/terms-page.html` |
| 55 | `frontend/src/app/features/legal/terms-page.scss` |
| 69 | `frontend/src/app/gateways/auth-gateway.ts` |
| 55 | `frontend/src/app/shared/accessibility-dialog.component.html` |
| 33 | `frontend/src/app/shared/banner.component.scss` |
| 31 | `frontend/src/app/shared/gauge-math.ts` |
| 12 | `frontend/src/app/shared/loading-indicator.scss` |
| 94 | `frontend/src/app/shared/report-gauge.scss` |
| 15 | `frontend/src/node-fs.d.ts` |
