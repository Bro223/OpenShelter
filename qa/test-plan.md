# OpenShelter — QA Test Plan (mapped to existing automation)

Read-only QA pass, 2026-09-14. For every feature in `feature-matrix.md`: positive (+) and
negative (−) cases, the role(s) to run under, and the existing test file(s) that already cover
the case. Cases with **no** existing automated test are marked **NEEDS MANUAL TEST**.

Roles: **A** = anonymous · **R** = registered-unverified · **V** = verified · **AD** = admin.
Paths are relative to the repo root (`frontend/` for `.spec.ts`, `src/test/java/...` for Java).

Conventions:

- "IT" files are Spring Boot integration tests (MockMvc/Testcontainers-style, per their package: `api`, `auth`, `security`, `persistence`, `ingestion`).
- FE spec files run under Vitest with mocked gateways; they verify request shape, state machines and copy, not a live backend.

---

## 1. Register (`/register`, `POST /auth/register`)

| Case | Role | Coverage |
|---|---|---|
| + valid email+phone+name+password → 201, no session | A | `auth/AuthApiIT.registerThenLoginRoundTrip`, `auth/AuthServiceTest.registerPersistsUserAndHashedCredentials`; FE `features/auth/register-page.spec.ts` (success view), `session/auth-store.spec.ts` |
| + E.164 normalization of local phone on later login | A | `auth/AuthApiIT.loginWithLocalFormatPhoneNormalizesAndSucceeds`, `verification/PhoneNumbersTest` |
| − duplicate email → 409 inline field error | A | `auth/AuthApiIT.duplicateRegistrationReturns409` (+ case-variant); FE `register-page.spec.ts` (N16 inline 409) |
| − duplicate phone (different email) → 409 | A | `auth/AuthApiIT.registerCaseVariantEmailOrPhoneReturns409`; FE `register-page.spec.ts` |
| − oversize field → 400 (distinct from 409) | A | `auth/AuthApiIT.oversizedRegisterFieldReturns400WhileDuplicateReturns409` |
| − empty/whitespace fields → client-side required errors, no request | A | FE `register-page.spec.ts` (does not submit an empty form) |
| − per-IP rate limit burst → 429 | A | `auth/AuthRateLimitIT.registerBurstOverCapacityReturns429`; FE 429 slow-down copy |
| − per-contact OTP cap (6th event in 24 h in prod; the IT runs cap 2, so its 3rd request throttles) → 429 | A | `auth/OtpContactCapIT.registerEmailCapThrottlesRepeatedRegistration` |
| − PII stored as ciphertext + blind index at register | A | `security/PiiAtRestIT.aRegisteredUserIsStoredAsCiphertextWithBlindIndex` |
| − real first-code delivery end-to-end | A | **NEEDS MANUAL TEST** (tests use `RecordingSmtpSender`/`RecordingSmsSender`) |

## 2. Login (`/login`, `POST /auth/login`)

| Case | Role | Coverage |
|---|---|---|
| + correct email+password → token pair, session | A→V | `auth/AuthApiIT.registerThenLoginRoundTrip`, `auth/AuthServiceTest.loginSuccessReturnsTokenResponse`; FE `login-page.spec.ts`, `session/auth-store.spec.ts` |
| + login by phone (local +372 format) | A | `auth/AuthApiIT.loginWithLocalFormatPhoneNormalizesAndSucceeds` |
| + silent session restore on reload (refresh rotation at boot) | any authed | `session/auth-store.spec.ts` (valid refresh token → silent refresh), `auth/AuthApiIT` |
| + honored safe `returnUrl` after login | A | FE `login-page.spec.ts` (honours a safe returnUrl; never sends to external returnUrl) |
| − wrong password → generic 401 | A | `auth/AuthApiIT.loginWithDummyPasswordIsIndistinguishableFromAWrongPassword`, `auth/AuthServiceTest.loginWrongPasswordThrowsSameGenericError`; FE generic banner test |
| − unknown contact → same generic 401 (anti-enumeration, 1 hash verify) | A | `auth/AuthServiceTest.loginUnknownContactWithDummyPasswordThrowsSameGenericError`, `loginRunsExactlyOneHashVerificationForUnknownAndKnownContacts` |
| − suspended account with correct credentials → 401 | R (suspended) | `api/UserSuspensionIT.aSuspendedUserCannotLogInWithCorrectCredentials` |
| − per-(IP,contact) + per-IP aggregate burst → 429 | A | `auth/AuthRateLimitIT.loginBurstOverCapacityReturns429`, `auth/ClientIpsTest` (XFF trust matrix) |
| − FE `?session=expired` note on bounce | any | FE `login-page.spec.ts` |
| − credential-stuffing load (many accounts from one IP) | A | covered at bucket level by `AuthRateLimitIT` + `loginIpRateLimiter`; **NEEDS MANUAL TEST** as a sustained load scenario |

## 3. Logout + session refresh/rotation

| Case | Role | Coverage |
|---|---|---|
| + logout revokes refresh, clears local state | any authed | `auth/AuthApiIT.logoutRevokesRefreshToken`, `auth/JwtTokenServiceTest`; FE `session/auth-store.spec.ts` |
| + refresh rotates: old refresh rejected after use | any authed | `auth/JwtTokenServiceTest.refreshRotatesAndRevokesThePresentedToken`, `persistence/RefreshTokenRepositoryIT` |
| + concurrent double-refresh redeems exactly once (row lock) | any authed | `auth/RefreshRotationRaceIT.concurrentDoubleRefreshRedeemsTheTokenExactlyOnce` |
| − reuse of revoked/unknown/expired refresh → 401 → `/login?session=expired` | any authed | `auth/JwtTokenServiceTest.refreshWithRevokedTokenFails` etc.; FE `core/api-interceptor.spec.ts` (refresh failure → redirect, no loop) |
| − mid-session 401 → one refresh + retry, then surface 401 | any authed | FE `core/api-interceptor.spec.ts` |
| − two tabs: cross-tab rotation retry (F4) | any authed | FE `session/auth-store.spec.ts` (retries once with rotated token; clears only on final 401) |
| − logout in one tab while another tab is in flight | any authed | FE `session/auth-store.spec.ts` (in-flight me() not adopted after identity switch, F1/N1) |

## 4. Email + phone verification (`/verify`, `POST /verify/request|confirm`)

| Case | Role | Coverage |
|---|---|---|
| + request email code → 202 + cooldown; confirm → EMAIL claim, write path unlocks | R | `auth/VerificationControllerIT.verificationIsReachableOverHttpAndUnlocksTheWritePath`, `verification/EmailVerificationProviderTest`, `verification/VerificationFlowTest.fullHappyPathRegisterVerifyThenWrite`; FE `verify-page.spec.ts` |
| + request phone code (E.164) → confirm → PHONE claim | R | `verification/PhoneVerificationProviderTest`; FE `verify-page.spec.ts` (PHONE panel) |
| + already-verified level → 409, idempotent, FE re-fetches without error | V | `auth/VerificationControllerIT.reVerifyingAnAlreadyVerifiedLevelIsAConflictAndIdempotent`; FE 409 test |
| − wrong code → 400 generic; 5th wrong locks out even with correct code | R | `verification/EmailVerificationProviderTest.confirmAfterAttemptsExhaustedFailsEvenWithCorrectToken`, `verification/PhoneVerificationProviderTest`; FE `verify-page.spec.ts` (generic copy, never backend text) |
| − expired code → 400 | R | `verification/EmailVerificationProviderTest.confirmExpiredPendingReturnsFalse` |
| − SMART_ID level → 400 "eID not available yet" (stub) | R | `verification/VerificationServiceTest.smartIdProviderIsStubAndThrows`; FE `verify-page.spec.ts` (SMART_ID hidden) |
| − resend within 60 s cooldown → 429 + Retry-After countdown | R | `auth/VerificationThrottleIT.burstOfVerificationRequestsIsThrottledWith429` (per-IP), `verification/VerificationServiceTest.requestWithinCooldownIsThrottled`; FE countdown tests |
| − 6th send same UTC day (per user+level cap, durable file log) → 429 until midnight | R | `auth/VerificationDailyCapIT.dailyCapThrottleCarriesRetryAfterUntilUtcMidnight`, `verification/FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` |
| − per-contact OTP cap (email/phone shared, across users) | R | `auth/OtpContactCapIT.phoneCapThrottlesThirdRequestToTheSamePhone` (+email) |
| − malformed 6-digit code blocked client-side before gateway | R | FE `verify-page.spec.ts` |
| − real SMS/SMTP delivery + code expiry timing | R | **NEEDS MANUAL TEST** |

## 5. Password reset (`/reset`, `POST /auth/password-reset/*`)

| Case | Role | Coverage |
|---|---|---|
| + request → code emailed (no link); confirm → password changed + **all** sessions revoked | A | `security/PasswordRecoveryFlowIT.aSuccessfulResetRevokesEveryRefreshToken`, `auth/PasswordResetServiceTest.resetPasswordWithValidCodeUpdatesPasswordMarksUsedAndRevokesAllSessions`; FE `reset-page.spec.ts` (→ `/login?reset=ok`) |
| + unknown email request → identical 200, nothing sent (anti-enumeration) | A | `security/PasswordRecoveryFlowIT.unknownEmailRequestIsUniformAndSendsNothing`, `auth/PasswordResetServiceTest.requestForUnknownEmailIsSilentSuccess`, `auth/AuthApiIT.requestResetForUnknownEmailReturnsTheSame200AsAKnownEmail` |
| + resend within cooldown → silent skip, same ack body | A | `security/PasswordRecoveryFlowIT.reissueWithinCooldownIsSilent`, `auth/PasswordResetServiceTest.reissueWithinCooldownKeepsTheOriginalCodeValid` |
| − wrong code → generic 400, attempt counted | A | `security/PasswordRecoveryFlowIT.fiveWrongCodesLockTheCodeEvenAgainstTheRightOne`, `auth/AuthApiIT.passwordResetConfirmWithWrongCodeReturnsGeneric400AndCountsAttempt` |
| − 5 wrong codes lock the code (even correct one after) | A | `security/PasswordRecoveryFlowIT`, `auth/PasswordResetServiceTest.resetFailsAfterMaxAttemptsEvenWithTheCorrectCode` |
| − code reuse → refused | A | `security/PasswordRecoveryFlowIT.aUsedCodeCannotBeReused`, `auth/PasswordResetServiceTest.resetCodeIsSingleUse` |
| − expired code → refused, not counted as attempt | A | `security/PasswordRecoveryFlowIT.anExpiredCodeIsRefused`, `auth/PasswordResetServiceTest.resetWithExpiredCodeDoesNotCountAsAnAttempt` |
| − confirm per-(IP,email) bucket burst → 429 | A | `auth/AuthRateLimitIT.resetRequestBurstOverCapacityReturns429` (+ confirm bucket in `SecurityConfig.java`) |
| − empty/invalid email, non-6-digit code, mismatched passwords → client-side block | A | FE `reset-page.spec.ts` |
| − real delivery + 15-min expiry boundary | A | **NEEDS MANUAL TEST** |

## 6. Contact change (email ↔ phone, `/account`)

| Case | Role | Coverage |
|---|---|---|
| + email change: SMS code to current phone → confirm → new email, claims survive | R | `auth/AccountControllerIT.emailChangeIsVerifiedBySmsToCurrentPhone`, `verificationClaimsSurviveAnEmailChange`; FE `account-page.spec.ts` |
| + phone change: email code to current email → confirm (E.164) → new phone | R | `auth/AccountControllerIT.phoneChangeIsVerifiedByEmailToCurrentEmail`; FE phone-flow test |
| − wrong code ×5 → atomic lockout, persisted attempts | R | `auth/AccountControllerIT.wrongCodesLockOutTheConfirmEndpointAndPersistAttempts`, `auth/ContactChangeServiceTest.incrementAttemptsIsStoreAtomicAndStopsAtTheCap` |
| − target contact already claimed by another account → 409 | R | `auth/AccountControllerIT.confirmChangeReturns409WhenTheTargetWasClaimedInTheMeantime` |
| − same-as-current / duplicate pending request → 400 | R | `auth/AccountControllerIT.changeRequestRejectsSameAsCurrentAndDuplicate` |
| − resend within 60 s cooldown → 429 | R | `auth/AccountControllerIT.resendWithinCooldownReturns429`, `auth/ContactChangeServiceTest.resendWithinCooldownIsThrottledAndReplacesAfterCooldown` |
| − confirm with no pending change → 400 | R | `auth/AccountControllerIT.confirmWithoutPendingChangeReturns400` |
| − over-length new email (256)/phone (65) rejected inline, request never sent | R | FE `account-page.spec.ts` (M6 boundary tests) |
| − per-IP change-request spray → 429 | R | limiter bean `SecurityConfig.java`; IT-level: **NEEDS MANUAL TEST** (unit-level cooldown covered) |
| − real SMS leg of email change | R | **NEEDS MANUAL TEST** |

## 7. Account profile (`GET /account/me`, `PUT /account/profile`)

| Case | Role | Coverage |
|---|---|---|
| + me returns decrypted contacts + per-contact verification labels + isAdmin | R/V/AD | `auth/AccountControllerIT.meReturnsTheStoredProfileWithRealClaims`, `security/PiiAtRestIT.accountMeStillReturnsPlaintextContacts`; FE `account-page.spec.ts` (identity card, Admin badge) |
| + name edit persists, claims untouched | R | `auth/AccountControllerIT.profileNameChangeDoesNotClearVerificationClaims`; FE edit tests |
| + password change with correct current password | R | `auth/AccountControllerIT.profileUpdatePersistsNameAndReturnsTheFreshProfile` (password path); FE |
| − anonymous me → 401 | A | `auth/AccountControllerIT.profileUpdateWithoutTokenIs401` (+ SecurityConfig authenticated rule) |
| − wrong current password → 401, nothing changes | R | `auth/AccountControllerIT.profileUpdateWithWrongCurrentPasswordIs401AndChangesNothing`; FE inline-error test |
| − blank name → 400 | R | `auth/AccountControllerIT.profileUpdateRejectsBlankNameWith400` |
| − suspended user fetch/403 paths | R (suspended) | `api/UserSuspensionIT` (tokens die on next request) |

## 8. Data export (`GET /account/export`)

| Case | Role | Coverage |
|---|---|---|
| + export carries decrypted profile + own shelters (author-scoped) | R/V | `auth/AccountDataExportIT.theExportCarriesDecryptedProfileAndOwnShelters`, `theExportIsAuthorScoped_otherUsersRowsStayOut` |
| + user with no contributions → empty lists | R | `auth/AccountDataExportIT.aUserWithoutContributionsGetsEmptyLists` |
| − anonymous export → 401 | A | `auth/AccountDataExportIT.anonymousExportIs401` |
| + FE downloads JSON file; failure → banner, no download | R | FE `account-page.spec.ts` (export tests) |
| − export after deletion yields no user data | R | `auth/AccountDeletionIT.anExportAfterDeletionYieldsNoUserData` |
| − manual content spot-check (fresh account, real PII) | R | **NEEDS MANUAL TEST** |

## 9. Account deletion (`DELETE /account`)

| Case | Role | Coverage |
|---|---|---|
| + verified user deletes → purges PII, orphans public shelters, cascades, idempotent 2nd call | V | `auth/AccountDeletionIT.deletionPurgesPrivateOrphansPublicAndCascadesTheAccount`, `aSecondDeletionIsAnIdempotentNoOp` |
| − anonymous → 401 | A | `auth/AccountDeletionIT.anonymousDeletionIs401` |
| − unverified user → 403 | R | `auth/AccountDeletionIT.anUnverifiedUserCannotDelete` |
| − untyped DELETE confirm → no request, no logout | R | FE `account-page.spec.ts` (delete stays disarmed; untyped confirm is a no-op) |
| − failed delete → banner, session kept | R | FE `account-page.spec.ts` |
| − verify orphans keep public shelters visible on map after deletion | V | partial in `AccountDeletionIT`; full visual check: **NEEDS MANUAL TEST** |

## 10. Shelter list / map (`/map`, `GET /api/shelters`)

| Case | Role | Coverage |
|---|---|---|
| + public list (all sources, ACTIVE only) + USER-only filter | A | `api/ShelterApiIT.getSheltersDefaultsToAllAndIsPublic`, `getSheltersSourceUserReturnsOnlyUserRows`, `api/ShelterQueryServiceTest.filter*` |
| + provenance filter (4 visible values; hidden values → empty; invalid → 400) | A | `api/ProvenanceApiIT` (10) |
| + hasCapacity filter | A | `api/ShelterQueryServiceTest.hasCapacityFilterKeepsSheltersWithCapacityData`, `api/ShelterReportIT.hasCapacityFilter...` |
| + occupancy hedged (1) vs firm (2+) vs stale-expiry derivation | A | `api/ShelterQueryServiceTest` (occupancy cases), `api/ShelterReportIT.occupancy*` |
| + open-status latest-wins + agreeing-taps-count derivation | A | `api/ShelterQueryServiceTest` (open-status cases), `api/ShelterReportIT.openStatus*` |
| + INACTIVE row absent from public list, present in /mine | V | `api/ShelterReportIT.inactiveShelterIsAbsentFromPublicListButPresentInMine` |
| + last-verified stamp (registry import / community cross-check) | A | `api/LastVerifiedApiIT` (5), `api/ShelterQueryServiceTest` (verification stamp cases) |
| − unknown id → uniform 404 | A | `api/ShelterApiIT.getMissingShelterReturnsUniform404`, `errorShapeIsUniformAcrossAllPaths` |
| − backend down → banner, chrome intact; 429 filter-refetch shared copy | A | FE `map-page.spec.ts` (N8/N9 tests) |
| + FE markers/legend/badges/trust palette, marker↔row sync, zoom behavior | A | FE `map-page.spec.ts` (61), `shared/leaflet-service.spec.ts` (24) |
| − real tile outage / large registry import data volume | A | **NEEDS MANUAL TEST** |

## 11. Shelter detail (`/shelters/:id`)

| Case | Role | Coverage |
|---|---|---|
| + public detail incl. yourOccupancyBand/yourOpenStatus for caller | A/R/V | `api/ShelterQueryServiceTest.detailCarriesTheCallersOwn*`, `api/ShelterApiIT.getShelterByIdIsPublic` |
| + hidden-by-report row still readable by id | A | `api/ShelterQueryServiceTest` (hidden derivation), FE detail spec (INACTIVE lifecycle cases) |
| + deep links (Google/Apple, 5 decimals), navigate + distance line | A | FE `shelter-detail-page.spec.ts` (navigate group tests) |
| + manual URL id switch re-loads; stale pin cleared | A | FE detail spec (N7, F9, M4 lifecycle tests) |
| − unknown id → not-found state, no error storm; non-numeric id no API call | A | FE detail spec (not-found tests) |
| − backend down → error banner, chrome intact, map container mounted | A | FE detail spec |

## 12. Shelter submit (`/submit`, `POST /api/shelters`)

| Case | Role | Coverage |
|---|---|---|
| + verified user submits → 201, ACTIVE USER row, history CREATED, success panel | V | `api/ShelterApiIT.postShelterVerifiedCreates201WithLocation`, `app/ShelterServiceTest.addPlaceRecordsCreatedHistoryAttributedToTheSubmitter`; FE `submit-shelter-page.spec.ts` |
| + private-home declaration (locationKind PRIVATE) round-trips | V | FE submit spec (checkbox), `api/CommunityReviewIT.aPrivateDeclarationRoundTripsOnEverySurface` |
| + description/capacity optional fields | V | FE submit spec (sends description and capacity) |
| − anonymous → 401; unverified → 403 (route redirects to /verify first) | A/R | `api/ShelterApiIT.postShelterAnonymousIs401WithErrorShape`, `postShelterUnverifiedIs403WithErrorShape`, `app/ShelterServiceTest.guestCannotAddPlace`; FE `core/guards.spec.ts` (verifiedGuard) |
| − outside Estonia bbox → 400, nothing persisted | V | `api/ShelterApiIT.putOutsideEstoniaIs400AndChangesNothing` (create path shares `requireInsideEstonia`, `ShelterController.java`); FE out-of-Estonia inline test |
| − blank/oversize name, oversize description, out-of-range capacity → 400 | V | `api/ShelterApiIT.postShelterWithBlankNameIs400WithErrorShape`, `api/ShelterRequestConstraintParityTest`; FE inline validators |
| − 11th active shelter → 409; delete frees slot; ADMIN exempt | V | `api/ShelterReportIT.eleventhActiveShelterIs409AndDeletingFreesTheCap`, `app/ShelterServiceTest` (cap cases) |
| − 6th submission in 24 h → 429 + Retry-After; delete frees slot; ADMIN exempt | V | `api/ShelterDailyLimitIT` (4) |
| − near-duplicate (same name, ≤100 m, cross-user) → 409 with existing row id; different name OK; ADMIN exempt | V | `api/ShelterDuplicateIT` (7), `app/ShelterServiceTest` (duplicate cases) |
| + location via map pick / typed coords / DMS / reversed pair auto-swap / decimal-comma message | V | FE `submit-shelter-page.spec.ts` (location-input cases), `shared/location-input.spec.ts` (30 named cases) |
| + Google short link via `POST /api/geo/resolve` (incl. bare host normalization, 400/429/502/401/502 copies) | V | `api/LocationResolveIT`, `app/LocationResolveServiceTest` (28), FE submit spec (short-link cases), `gateways/geo-gateway.spec.ts` |
| + address search via Nominatim (results, prefill, no-results, 429, network, attribution) | V | FE `submit-shelter-page.spec.ts` (address search cases), `gateways/geocode-gateway.spec.ts` (7) |
| − live Nominatim / live short-link behavior | V | **NEEDS MANUAL TEST** (mocked in FE specs; IT uses fake redirect client) |

## 13. Shelter edit / delete (own rows)

| Case | Role | Coverage |
|---|---|---|
| + author PUT replaces 5 fields, keeps identity/source/status | V | `api/ShelterApiIT.putByAuthorReplacesTheFiveFieldsAndKeepsTheRest`; FE `contributions-panel.spec.ts` |
| + owner edit records EDITED history with exactly the moved fields; no-op PUT records nothing | V | `api/ShelterHistoryIT` (3) |
| + owner DELETE removes row + cascades reports; DELETED history row | V | `api/ShelterApiIT.deleteByAuthorRemovesTheShelterAndItsReportsCascade`, `api/ShelterHistoryIT` |
| − non-author PUT/DELETE → 403, row untouched | V (other user) | `api/ShelterApiIT.putByNonAuthorIs403AndChangesNothing`, `deleteByNonAuthorIs403AndUntouchedAndMissingIs404` |
| − registry/legacy row PUT/DELETE → 403 for everyone | V/AD | `api/ShelterApiIT.putOnRegistryAndLegacyRowsIs403ForEveryoneAndMissingIs404`, `deleteOnRegistryAndLegacyRows...` |
| − anonymous PUT → 401; unverified → 403 | A/R | `api/ShelterApiIT.putAnonymousIs401AndUnverifiedIs403` |
| − concurrent edit (optimistic lock) → 409 "resource changed under you" | V | `persistence/ShelterOptimisticLockingIT`, `api/ApiErrorHandlerTest` (stale-state mapping) |
| − owner PUT cannot reset admin state (review_status/note/autoHideDisarmed) | V | `api/ShelterController.java` (server copies admin state); FE: covered indirectly by `CommunityReviewIT` (review state on rows) — explicit negative: **NEEDS MANUAL TEST** (assert a self-edit of a NEW row doesn't confirm it) |
| − two-step delete cancel in FE | V | FE `contributions-panel.spec.ts` |

## 14. Shelter reports / occupancy / open-status

| Case | Role | Coverage |
|---|---|---|
| + verified user report stored; derived state on next list | V | `api/ShelterReportIT.verifiedUserReportIsStoredAndDerivedStateShowsOnNextList` |
| + 5 undismissed NON_EXISTENT → auto-hide + removed from public list; 1–4 only flag | V | `api/ShelterReportIT.fifthNonExistentReportHides...`, `oneToFourNonExistentReportsOnlyFlag` |
| + rival "dampened" report counts zero in hide tally | V | `api/ShelterReportIT.aDampenedRivalReportCountsZeroInTheHideTally`, `app/ShelterReportServiceTest` (damp cases) |
| + trusted reporter reaches 5-point tally with fewer reports | V | `api/ShelterReportIT.trustedReportersReachTheFivePointTallyWithFewerReports`, `domain/ReporterTrustTest` |
| + manual restore disarms auto-hide permanently; no re-hide | AD | `api/ShelterReportIT.noReHideAfterAManualRestore`, `api/AdminModerationIT.aRestoreDisarmsAutoHidePermanently` |
| − duplicate (shelter,user,type) → 409, count stays 1, budget not consumed | V | `api/ShelterReportIT.duplicateReportIs409AndCountStaysOne`, `app/ShelterReportServiceTest.duplicateShelterReportIsRejectedWithoutConsumingBudget` |
| − unverified report → 403 | R | `api/ShelterReportIT.unverifiedUsersCannotReport`, `app/ShelterReportServiceTest.guestAndUnverifiedCannotReport` |
| − unknown shelter → 404; bad body → 400 | V | `api/ShelterReportIT.reportForUnknownShelterIs404`, `reportBodyValidationIs400` |
| − 11th report-type action/hour → 429; rolling window expiry; per-user; OPEN taps not throttled | V | `api/ReportThrottleIT` (5) |
| + occupancy upsert one row/user; detail carries your band; never hides | V | `api/ShelterReportIT.occupancyUpsertsOneRowPerUserAndDetailCarriesYourBand`, `occupancyNeverHides` |
| + open-status upsert; latest tap wins; auto-confirm NEW row by other-user OPEN tap | V | `api/ShelterReportIT.openStatus*`, `app/ShelterReportServiceTest.anOpenTapFromAnotherUserAutoConfirmsANewRow` |
| − FE: picker gating by role (anonymous login prompt / unverified verify prompt / verified picker), 48 px band buttons, 409 duplicate copy, dampened notice | A/R/V | FE `shelter-detail-page.spec.ts` (report/occupancy/open-status sections) |

## 15. Address search (map) & nearest location

| Case | Role | Coverage |
|---|---|---|
| + Nominatim search (jsonv2, countrycodes=ee, ≤5, 1 req/s spacing, encoded q) | A | FE `geocode-gateway.spec.ts` (7) |
| + anchor: pin + fly-to + per-row distances + distance sort; clear removes all | A | FE `map-page.spec.ts` (anchor tests) |
| − empty results state; 429 rate-limited state (role=alert); network unavailable state | A | FE `map-page.spec.ts` (anchor error states) |
| + nearest: locate → fly to position + nearest line + distance sort + unverified/inaccurate warnings | A | FE `map-page.spec.ts` (nearest tests) |
| − geolocation permission denied / unsupported / non-secure context (https) → specific copies, list untouched | A | FE `map-page.spec.ts` |
| + retry after failure clears stale success state (F1) | A | FE `map-page.spec.ts` |
| − real browser geolocation on mobile (permission UX, accuracy) | A | **NEEDS MANUAL TEST** |
| − live Nominatim 429 under real traffic | A | **NEEDS MANUAL TEST** |

## 16. Admin moderation (`/admin`)

All admin cases: also run each with **A** and **R** to re-verify 401/403 (`security/AdminAuthorizationIT`, `api/AdminAlertsIT.anonymousGets401`/`nonAdminGets403`).

| Case | Role | Coverage |
|---|---|---|
| + queue lists every shelter incl. hidden with counts/status/trust/submitter; filters status/source/q | AD | `api/AdminModerationIT.theAdminListHasAllStatusesTrustFieldsAndTheSubmitter`, `theAdminListFiltersByStatusSourceAndQuery`; FE `admin-page.spec.ts` |
| + hide/restore cycle; restore disarms auto-hide | AD | `api/AdminModerationIT.hideAndRestoreACycle`, `aRestoreDisarmsAutoHidePermanently` |
| + admin hard delete cascades reports/occupancy/open-status | AD | `api/AdminModerationIT.aDeleteCascadesReportsOccupancyAndOpenStatus` |
| + unknown ids 404, bad bodies 400 | AD | `api/AdminModerationIT.unknownShelterIdsAre404AndBadBodiesAre400` |
| − registry rows import-owned → 409 (status/delete/review/request/mark) | AD | `api/AdminModerationIT.registryRowsAreImportOwned`, `api/CommunityReviewIT.registryRowsAreImportOwnedAndReviewIs409`, `api/MarkInaccurateIT.theMarkGuardsRegistryRows...` |
| + history: CREATED/EDITED(deltas)/DELETED, survives deletion, admin-only | AD | `api/ShelterHistoryIT` (4), `api/AdminModerationServiceTest.history*` |
| + info request: admin question → submitter /mine → one-time reply → admin sees reply; never on public reads | AD/V | `api/ShelterInfoRequestIT` (8); FE `admin-page.spec.ts` + `contributions-panel.spec.ts` |
| − second request / second answer → 409 both sides | AD/V | `api/ShelterInfoRequestIT.aSecondAnswerAndASecondRequestAreBothConflicts` |
| + mark-inaccurate sets public flag w/o touching status; clear removes; idempotent; audit with reason | AD | `api/MarkInaccurateIT` (7) |
| + community review: CONFIRM (no reason) / REJECT (reason required); restore of rejected reverts to NEW | AD | `api/CommunityReviewIT` (9), `api/AdminModerationServiceTest` (review cases); FE admin spec (Unconfirmed tab) |
| + community auto-confirm: other-user positive report / OPEN tap confirms NEW row; submitter's own never confirms | V | `api/CommunityReviewIT.aPositiveReportFromAnotherUserConfirmsTheRowAndAuditsIt`, `theSubmittersOwnPositiveReportDoesNotConfirm`, `app/ShelterReportServiceTest` (auto-confirm cases) |
| + audit trail: newest-first, right transitions per action, deleted-account subject renders | AD | `api/AdminModerationIT` (audit), `api/CommunityReviewIT.everyActionWritesAnAuditRowWithTheRightTransition`, `api/AdminModerationServiceTest.theAuditList*` |
| + alerts ring: daily-cap throttle, near-duplicate, OTP-contact-cap events; newest-first; limit clamp 400 | AD | `api/AdminAlertsIT` (8), `alerts/ThrottleAlertRecorderTest` (7) |
| + report queue: shape/order/reporter identity; factual details present, binary drop detail | AD | `api/AdminModerationIT.theShelterReportQueueHasTheShapeOrderAndReporterIdentity`, `factualReportDetailsReachTheAdminQueueAndBinaryTypesDropThem` |
| + dismiss idempotent, keeps row, stops counting in tally | AD | `api/AdminModerationIT.aDismissIsIdempotentAndKeepsTheRow`, `aDismissedNonExistentReportStopsCountingInTallyAndDisplay` |
| + user list (REGISTERED+ADMIN, no guests); suspend/unsuspend idempotent; ADMIN 409 | AD | `api/UserSuspensionIT` (7), `api/AdminModerationServiceTest.suspend*` |
| + suspension kills login + in-flight tokens + refresh rotation; unsuspend restores | AD/R | `api/UserSuspensionIT.inFlightTokensDieOnTheNextRequestAndTheRefreshRotationIsRefused`, `anUnsuspendedUserLogsInAgainAndTheAuditShowsTheExchange` |
| − FE two-tap confirms (delete, suspend), empty states per tab, lazy tab loads, 409 surfacing | AD | FE `admin-page.spec.ts` (45) |
| − admin demotion takes effect on next request (kind re-lookup per request) | AD | `api/AdminModerationIT.aDemotionTakesEffectImmediatelyOnTheNextRequest` |
| − alerts ring persistence across app restart (by-design missing, W16) | AD | **NEEDS MANUAL TEST** (verify knowingly + note in release notes) |

## 17. Admin provisioning (env)

| Case | Role | Coverage |
|---|---|---|
| + ADMIN_EMAIL/ADMIN_PASSWORD set at boot → admin created with ADMIN kind + all claims; idempotent 2nd run | ops | `auth/AdminSeederIT` (6), `auth/AdminSeederTest` (6) |
| + seeded admin logs in through normal login endpoint | AD | `auth/AdminSeederIT.theSeededAdminLogsInThroughTheNormalLoginEndpoint` |
| − either var empty → no admin, app behaves without the capability | ops | `auth/AdminSeederTest.noOpWhenEitherVarIsEmpty` |
| − pre-existing user with same email never touched (case-variant) | ops | `auth/AdminSeederTest.preExistingUserWithSameEmailIsNeverTouched`, `caseVariantOfTheSameEmailIsTreatedAsExisting` |

## 18. Registry import (official dataset)

| Case | Role | Coverage |
|---|---|---|
| + CSV import creates registry rows; malformed rows skipped+counted; LEst97→WGS84 | ops | `ingestion/RegistryImportIT`, `ingestion/RegistryCsvParserTest` (8), `ingestion/LEst97TransformerTest`, `ingestion/RegistryShelterParserTest` (10) |
| + re-import upserts existing, delists removed, never touches USER rows | ops | `ingestion/ShelterImportServiceTest` (17) |
| + ETag/If-Modified-Since → 304 = not-modified, nothing applied | ops | `ingestion/CsvRegistryClientTest.300FourMeansUnchangedNotFailure`, `ingestion/ShelterImportServiceTest.notModifiedRunAppliesNothingAndWritesNotModified` |
| + audit row per run (ok/failed/not-modified/skipped-overlap) | ops | `api/DataSourceApiIT.importRunWritesAnAuditRowAndTheEndpointSurfacesIt`, `ingestion/ShelterImportServiceTest` |
| − registry down → failed result, no crash, no blind wipe | ops | `ingestion/ShelterImportServiceTest.registryDownYieldsFailedResultWithoutCrashing`, `emptyFetchDoesNotBlindlyWipeTheSource` |
| + scheduled weekly run invokes import; failure swallowed | ops | `config/RegistrySchedulerTest` |
| − live opendata.smit.ee cron import in a running env | ops | **NEEDS MANUAL TEST** |

## 19. App chrome: consent, legal pages, i18n, theme

| Case | Role | Coverage |
|---|---|---|
| + consent: undecided first paint → acknowledge → hidden + persisted | A | `shared/consent-banner.component.spec.ts` (5), `core/consent-store.spec.ts` (5) |
| − stale consent version → re-prompt; corrupt stored value → no crash | A | `core/consent-store.spec.ts` |
| + privacy page: sections, GDPR rights, geolocation scoping, placeholders | A | `features/legal/privacy-policy-page.spec.ts` (9) |
| + terms page: safety framing, limits honesty, verified-gap pinning | A | `features/legal/terms-page.spec.ts` (8) |
| + i18n: default en, stored pref honored, invalid → en, catalog parity, no empty values, `<html lang>` | A | `core/i18n/i18n.spec.ts` (10), `core/title.spec.ts` (4) |
| + switcher flips chrome + titles + persists both directions | A | `shared/page-shell.spec.ts` (switcher tests) |
| − **known gap: some feature-page copy still English** (shelter detail + submit are translated — 33 and 36 `| t` uses; account, contributions, verify, admin and legal are not; only chrome + auth pages + consent + parts of map are translated) | A | partial automation: `i18n.spec.ts` en/et parity is catalog-only. Full Estonian UI pass over feature pages: **NEEDS MANUAL TEST** |
| + high-contrast toggle: attribute + persistence + reload survival + pre-paint script | A | `core/theme-store.spec.ts` (7), `shared/page-shell.spec.ts`, `design-tokens.spec.ts` |
| + contrast: text pairs ≥ 4.5:1, borders ≥ 3:1 in both themes; HC block overrides same token set | A | `design-tokens.spec.ts` (contrast + HC coverage tests) |
| − visual audit of every page under high-contrast (real browser) | A | **NEEDS MANUAL TEST** |
| − screen-reader pass (NVDA/VoiceOver) on /map, /account, /admin | A | **NEEDS MANUAL TEST** |

## 20. Security hardening cross-cuts

| Case | Role | Coverage |
|---|---|---|
| + hardening headers on success, 401, 404, 4xx; no cookie; HSTS only on secure | A | `config/SecurityHeadersIT` (4) |
| + fail-closed boot: dev JWT secret / dev senders / dev test endpoints in prod profile | ops | `config/ProdJwtGuardTest` (6), `config/DevSenderGuardTest` (5), `config/DevEndpointsGuardTest` (7), `security/PiiCryptoTest.missingKeyFailsClosedAtConstruction` |
| + PII at rest: ciphertext + blind index login (case-insensitive email, phone), 409 duplicate, V13 in-place migration + collision fail-loud | A | `security/PiiAtRestIT` (6), `security/PiiCryptoTest` (11) |
| + dev test endpoints: allowlisted recipients only (email+SMS), off by default | R | `api/EmailTestControllerAllowlistIT`, `api/SmsTestControllerAllowlistIT`, `api/EmailTestControllerIT`, `api/SmsTestControllerIT` |
| + X-Forwarded-For trust matrix (spoofed XFF from untrusted peer ignored) | A | `auth/ClientIpsTest` (13), `auth/AuthRateLimitIT.spoofedXffFromTrustedLoopbackYieldsSeparateBuckets` |
| + SSRF guards on /api/geo/resolve (host allowlist, scheme rules, IP hops) | R/V | `app/LocationResolveServiceTest` (28 incl. cloud-metadata/loopback hops) |
| + health endpoint public without details | A | `src/main/resources/application.yml` (`show-details: when-authorized`) — IT: **NEEDS MANUAL TEST** (assert detail suppression for anonymous vs authorized) |

---

### Manual-test backlog (consolidated)

1. Real SMTP (smtp-pulse) + Twilio delivery end-to-end (verification, reset, contact change).
2. Live Nominatim rate limiting + live `maps.app.goo.gl` links.
3. Real browser geolocation on mobile (permission UX, accuracy, non-secure-context).
4. Full Estonian UI pass over untranslated feature pages (known i18n gap).
5. High-contrast visual audit of every page + screen-reader pass (NVDA/VoiceOver).
6. Admin alerts ring loss across restart (by design — confirm acceptance in release notes).
7. Owner self-edit must not self-confirm a NEW community row (explicit negative).
8. Actuator health details suppression (anonymous vs authorized).
9. Sustained credential-stuffing load (bucket math already unit/IT-covered).
10. Weekly registry cron import against live opendata.smit.ee.
