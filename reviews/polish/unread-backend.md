# UNREAD-BACKEND — the 100 main-source backend files no lane had read

**Lane:** UNREAD-BACKEND · **Branch:** `feature/frontend` · **No commit** — the parent commits.
**Scope (exclusive):** the 100 `src/main/java` files of `reviews/polish/readability-sweep.md`
Appendix A that sit **outside** `persistence/` (that 41-file remainder is the UNREAD-PERSISTENCE
lane's). Worked from the appendix, not a guessed set.
**Skills used:** `docs/skills/clean-code.md`, `docs/skills/code-review.md` (two-axis reporting).
**Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` — rule 1 (behaviour-preserving), rule 6 (anchors),
rule 7 (Maven lock on every invocation).
**Prior lane read first (per task):** `reviews/polish/readability-sweep.md` — its defect classes
(the dead change-name parentheticals, the stale hash wordings, the unresolvable planning ids, the
edit remnants) are the lens for this lane.

**Bottom line:** five stale-comment defects found and fixed, **comments only, zero code lines**,
across five files (`AdminUserDto.java`, `NonSuspendableUserException.java`, `AppInfo.java`,
`Transactions.java`, `ShelterMapApplication.java`). The other 95 files are clean — every
load-bearing claim in them was verified against the code before sign-off (§5). **No new
never-filed change name found** — the six known guard names have 0 hits in the group, and a
full kebab-token census of all 100 files classified every distinct token as benign (§6). Four
findings filed for other lanes / the owner with `file:line` (§4), including one test-pinned
OpenAPI contract surface that this lane did not touch.

---

## 1. Method, and what pins this group

- Read all 100 files (2 829 lines) in package order; for every factual claim in a comment —
  status codes, column caps, migration anchors, config keys, exception families, query
  semantics, dependency directions — the claim was checked against the code it describes
  before the file was signed clean or a fix was made. The code is right; a comment that
  contradicts it is the defect (sweep discipline).
- **Anchors (rule 6):** a whole-name grep of all 100 basenames against
  `docs/agent/00-CURRENT-STATE.md` finds **zero citations** — the only hit is
  `ShelterReportRepository` as a substring of the cited `SpringDataShelterReportRepository`
  (a persistence file, not my group's `app/ShelterReportRepository`). So no edit in this
  lane owes an anchor re-derivation and no range shifted (the five edits are comment
  replacements; net tree delta of my diff: −1 line, inside a file no anchor cites).
- **Vocabulary guard:** `SourceVocabularyTest` (the known six never-made names + the
  archive-derived list + the wrap-join rule + the id-shape patterns) was read in full before
  any edit, so no fix could introduce a refused shape; the group's comment census is §6.
- **Test-pinned surfaces:** `OpenApiSnapshotIT` pins `docs/api/openapi.json` against the
  live `/v3/api-docs`. One of this lane's findings sits in such a surface — it is filed,
  not edited (§4 F1). No javadoc in the group is pinned by any test (grep-verified).
- No reformatting, no reflow, no renames, no migrations, no vendored files. Behaviour
  exactly preserved — the diff touches comment text only.

## 2. The 100 files, with a one-line verdict each

All paths under `src/main/java/ee/sheltermap/`. "Clean" = no edit warranted (comments
accurate or constraint-stating). "Sweep-fixed" = the readability-sweep lane already repaired
this file on this tree; its fixed state was re-verified and the remaining claims checked.
"FIXED" = edited in this lane (§3).

**`api/` (13):**

| File | Verdict |
|---|---|
| `AdminInfoRequestRequest.java` | Clean — the "V19 column bound" resolves (`V19__shelter_info_requests.sql`); @NotBlank/@Size(2000) match the documented contract. |
| `AdminMarkInaccurateRequest.java` | Clean — "a blank reason stores NULL on the audit row" re-verified at `AdminModerationService.normalizeReason` + the `MARK_INACCURATE` row (the sweep's E adjudication holds). |
| `AdminUserDto.java` | **FIXED (javadoc)** — `kind` value space listed GUEST although guests are excluded in the SQL (`JpaUserRepository.findAccountPage` limits to REGISTERED+ADMIN), and the admin-suspension refusal was "(409)" — the code answers **403** (`ProvisionedAdminProtectedException` in the ApiErrorHandler 403 family, `AdminUserModeration.requireSuspendableUser:130`). The twin @Schema descriptions + the pinned snapshot are filed, not touched (F1). |
| `EmailTestResult.java` | Clean — "the production senders swallow delivery failures for anti-enumeration" verified: both senders catch and `return false`, logging themselves (`TwilioSmsSender:96-102`, `SmtpPulseSmtpSender:55-61`). |
| `InvalidShelterException.java` | Clean — 400 vocabulary, no claim to check beyond the mapping (verified in the handler family). |
| `OccupancyReportRequest.java` | Clean — "re-sending updates the existing report" re-verified (`JpaShelterOccupancyReportRepository.save` upsert on the (shelter, user) unique). |
| `OpenStatusReportRequest.java` | Clean — "created_at refreshed" verified end-to-end: `putOpenStatus` passes `clock.instant()` → `ShelterOpenStatusReport.update` overwrites `createdAt` → the fresh query filters `CreatedAtAfter`. |
| `ReorderGuidanceRequest.java` | Clean — permutation-or-400, 1..N renumber in ONE transaction, 204: verified at `AdminGuidanceController:68,354` and `GuidanceOrderingService:55-59`. |
| `SiteTextController.java` | Clean — en/et/ru always present (`SiteTextKeys.LOCALES`), `url` only on the two footer source-link keys (`LINK_KEYS` = rescueBoard/ministry; V27 CHECK `https://%`). |
| `SmsTestRequest.java` | Clean — `DEFAULT_MESSAGE` is live in the compact constructor; the boundary caps stated as the shared record convention. |
| `SmsTestResult.java` | Clean — the boolean-propagation + fail-fast-constructor claims match the senders' actual contract. |
| `UpdateSiteTextRequest.java` | Clean — "an empty/absent batch is a no-op" verified at `SiteTextsService:63`. |

**`app/` (21):**

| File | Verdict |
|---|---|
| `AdminAccessException.java` | Clean — "a fresh kind lookup per request (never a JWT claim)" verified at `AdminAccess.requireAdmin` (`userRepository.isAdmin` on every request). |
| `AppInfo.java` | **FIXED** — "the dependency-free app layer … app imports only domain" is stale: `app/ShelterService` imports `api.SubmitterVerification` and `alerts.ThrottleAlertRecorder` (since `d0982c9`). The true invariant — app imports **neither** auth nor verification (0 direct imports, grep-verified) — is what keeps the brand placement acyclic for both importers, and that is now stated. |
| `DuplicateInfoRequestException.java` | Clean — 409 + the replied-row-is-kept rationale match the UNIQUE shelter_id and the handler family. |
| `DuplicateReportException.java` | Sweep-fixed (A1) — fixed state re-verified; the 409 + per-target abuse-bound wording accurate. |
| `ImportOwnedShelterException.java` | Clean — 409 + "rebuilds them as ACTIVE on every run" matches the importer's own javadoc and the handler's. |
| `InfoRequestAlreadyAnsweredException.java` | Clean — 409, answered-once, row kept. |
| `InfoRequestNotFoundException.java` | Clean — 404 vocabulary. |
| `NonSuspendableUserException.java` | **FIXED** — the javadoc attributed the ADMIN refusal to this 409 exception; the code refuses the provisioned admin **earlier** with the 403 `ProvisionedAdminProtectedException` (`AdminUserModeration:130`) and only GUEST reaches this 409 (`:133`, the single throw site in main). The exception's own javadoc and the handler's entry for it drifted the same way — handler filed (F2). |
| `NotAuthorException.java` | Clean — "the ownership rule itself now sits in ShelterService" verified (throw sites `:319`, `:377`); the app-layer placement rationale holds. |
| `NotVerifiedException.java` | Clean — 403 verified (forbidden family). |
| `ProvisionedAdminProtectedException.java` | Clean — all four protected operations verified at their throw sites: self-erasure (`AccountService:158`), suspend/unsuspend (`AdminUserModeration:130`), password reset (`PasswordResetService:209,262`), contact change (`ContactChangeService:286`); 403 family verified. |
| `ReportActionLog.java` | Sweep-fixed (A2) — fixed state re-verified; one-row-per-action, 409-records-nothing, and the atomic check-and-record contract are consistent with `JpaReportActionLog`. |
| `ReportNotFoundException.java` | Clean — 404. |
| `ReportProperties.java` | Clean — "0 disables the throttle" verified (`JpaReportActionLog:54-57` early-returns on `cap <= 0`). |
| `ShelterInfoRequestLog.java` | Sweep-fixed (A4) — fixed state re-verified; the guard-vocabulary statuses (409/404/409) match the handler families; the V14 no-FK convention resolves. |
| `ShelterNotFoundException.java` | Clean — 404; the concurrent-DELETE race example verified at `ShelterService.updatePlace:469-472`. |
| `ShelterOccupancyRepository.java` | Sweep-fixed (A3) — fixed state re-verified; the `updated_at`-after-freshSince claim matches the Spring Data query. |
| `ShelterOpenStatusRepository.java` | Clean — `created_at`-after-freshSince matches `findByShelterIdInAndCreatedAtAfter`; the distinct-user auto-confirm rationale matches the (shelter, user) unique. |
| `ShelterReportRepository.java` | Clean — all four "admin-dismissed excluded" claims verified in the Spring Data queries (`r.dismissedAt is null` on the reporter, count, confirmed and open-count reads); store-level paging and the single-COUNT rationale stated where the decision lives. |
| `ShelterSubmissionThrottledException.java` | Clean — 429 + `Retry-After` verified (`ApiErrorHandler:461`); `app.limits.daily-submissions-per-user` exists (yml:248, default 5). |
| `UserNotFoundException.java` | Clean — 404 (handler family `:404`). |

**`auth/` (32):**

| File | Verdict |
|---|---|
| `Argon2PasswordHasher.java` | Clean — the Argon2id claim matches `SecurityConfig:70` (`defaultsForSpringSecurity_v5_8`). |
| `ChangeEmailRequest.java` | Clean — the 255 cap mirrors `users.email VARCHAR(255)` (V1:9). |
| `ChangePhoneRequest.java` | Clean — the 64 cap mirrors `users.phone VARCHAR(64)` (V1:10). |
| `CodeSentDto.java` | Clean — the cooldown-ack contract; @Schema consistent with the javadoc. |
| `ConfirmChangeRequest.java` | Clean — the 6-digit cross-channel code. |
| `ContactChangeProperties.java` | Clean — the pending-row cooldown anchor and "0 disables" match the yml ("All 0 = disabled") and the service. |
| `ContactChangeResult.java` | Clean — the RETURN-instead-of-throw rationale (commit the failed-attempt increment) and the 5-attempt lockout (yml `max-attempts: 5`). |
| `DuplicateAccountException.java` | Clean — 409 + the V3 unique indexes (`V3__hardening.sql:15-16`). |
| `InvalidContactChangeException.java` | Clean — 400 vocabulary for the three refusal modes. |
| `InvalidCredentialsException.java` | Clean — the deliberately-generic anti-enumeration message; the timing-equalizer context lives in `AuthService`. |
| `InvalidProfilePasswordException.java` | Clean — 401 + the inline "current password is incorrect" copy (the class constant IS the message). |
| `InvalidRefreshTokenException.java` | Clean — no claim beyond the meaning. |
| `InvalidResetTokenException.java` | Clean — generic message, the brute-force + enumeration guard. |
| `JwtProperties.java` | Clean — `${JWT_SECRET:…}` dev-only default, 15m/30d all in the yml. |
| `LoginRequest.java` | Clean — either-contact login, caps match the columns. |
| `PasswordHasher.java` | Clean — the `03-auth.puml` citation resolves (sweep precedent); the null-safety contract is met by the Argon2 impl. |
| `PasswordResetRequest.java` | Clean — `03-auth.puml` citation, resolvable. |
| `PasswordResetTokenRepository.java` | Sweep-fixed (C1–C3) — fixed state re-verified; the rotation-protection anchors resolve to V8; the per-UTC-day cap semantics match the implementation. |
| `PendingContactChange.java` | Sweep-fixed (B1) — fixed state re-verified; the keyed-`v2:` wording matches `piiCrypto.codeHash` at the two `ContactChangeService` call sites. |
| `PendingContactChangeRepository.java` | Clean — "a single conditional UPDATE, not a read-modify-write" verified (`SpringDataPendingContactChangeRepository:31-33`, `WHERE attempts < :maxAttempts`). |
| `ProfileUpdateRequest.java` | Clean — name 255 mirrors V1:8; "no national ID code is collected anywhere" — the V12 migration dropped the column (resolvable). |
| `RateLimiter.java` | Clean — the `Result` shape mirrors `RollingContactOtpLimiter.Result` (exists, `verification:54`); the null-retryAfter convention. |
| `RefreshRequest.java` | Clean — `03-auth.puml`, resolvable. |
| `RefreshTokenRecord.java` | Clean — immutable view, `revokedAt` null-while-active. |
| `SuspendedAccountException.java` | Clean — "only ever thrown AFTER the password verify" verified at `AuthService:138→156` (verify → existence guard → suspension check). |
| `TokenService.java` | Clean — 15m/30d re-verified in the yml (the sweep's E adjudication holds). |
| `Transactions.java` | **FIXED** — "(send-first-then-commit, **reviews F2**)" carried a dangling review-line citation: no review's F2 is the send-first mechanism (F2 in `reviews/02-backend-clean-code.md` is the `slice` duplication; F2 in `reviews/04-backend-security.md` is HSTS; the mechanism is documented as **run-1 F5** in `reviews/04-backend-service-security.md` C5 and `reviews/code-review/be-recon.md` §5). The id was dropped; the mechanism wording (self-contained) stays. The seam itself is live — both services call `Transactions.in` (5 call sites). |
| `UserCredentials.java` | Clean — the separate-aggregate rationale; the caller-supplied-instant idiom. |
| `UserCredentialsRepository.java` | Clean — "stamps changedAt" verified at `JpaUserCredentialsRepository:48-54`. |
| `VerificationFailedException.java` | Clean — 400; the Smart-ID stub channel matches `VerificationLevel.SMART_ID`. |
| `VerifyConfirmRequest.java` | Clean — channel + code, @Schema consistent. |
| `VerifyRequest.java` | Clean — the target-from-authenticated-user, never-from-body rule. |

**`config/` (1):**

| File | Verdict |
|---|---|
| `RegistryRunConfig.java` | Clean — off-by-default + "the overlap guard lives there too" verified (`ShelterImportService` `AtomicBoolean running`, `:59,88-89`). |

**`domain/` (8):**

| File | Verdict |
|---|---|
| `Capability.java` | Clean — both values are live (baseline `VIEW_MAP` + granted `SUBMIT_SHELTER` in `VerificationRules:32-35`, consumed at `RegisteredUser:109`); no dead constant. |
| `GuestUser.java` | Clean — the Pigeon (TIJ) reference is the house precedent the sweep adjudicated resolvable. |
| `ShelterOpenStatusReport.java` | Clean — `update()` refreshes `createdAt` (the read-time 2 h freshness anchor); the never-a-new-row rule. |
| `ShelterSource.java` | Clean — "USER rows are sacred" matches the importer's own javadoc (`ShelterImportService:33`). |
| `ShelterStatus.java` | Clean — user submissions created ACTIVE verified (`ShelterService:181`). |
| `SiteText.java` | Clean — the V27 CHECK (https, `V27:28`), the two footer link keys, and the service pre-check for the readable 400 all verified. |
| `UserData.java` | Clean — immutable snapshot, defensive copy of the levels set. |
| `VerificationClaim.java` | Clean — email/phone/Smart-ID = the enum values; the caller-supplied revoke instant (no wall clock in the domain). |

**`guidance/` (10):**

| File | Verdict |
|---|---|
| `GuidanceNotFoundException.java` | Clean — draft/unknown indistinguishability (fixed constant) + the media-404 vehicle. |
| `GuidanceTranslationRepository.java` | Sweep-fixed (D1) — fixed state re-verified (no duplicated line); the ordering contract, the `existsBy*` pre-check → 409, and the multi-row-slug-refused-404 claims are consistent with the service. |
| `GuidanceValidationException.java` | Clean — one 400 vehicle per feature; the cross-field alt-text rule; "a 400 changes nothing". |
| `HeroAddressPolicy.java` | Clean — "guard 3 of the hero import" resolves against `HeroImageImportService`'s guard 1–5 list; the JDK-coverage + explicit `fc00::/7` + IPv4-mapped-unwrap claims are technically accurate. |
| `HeroAddressResolver.java` | Clean — `DnsHeroAddressResolver` is the production impl; the RedirectClient seam-discipline analogy resolves. |
| `HeroImageFetchClient.java` | Clean — "guard 4" resolves; the manual-redirect + read-while-capping contract. |
| `MediaAssetInUseException.java` | Clean — 409 confirm=true two-step; the message carries title+slug for the confirm dialog. |
| `MediaTooLargeException.java` | Clean — 413 handler (`ApiErrorHandler:286`); the 5 MiB default (yml:328). |
| `SlugAlreadyUsedException.java` | Clean — 409; the auto `-2`/`-3` suffix on generated collisions (`GuidanceService:387`); drafts reserve their slug. |
| `UnsupportedImageException.java` | Clean — 400; the magic-byte / Content-Type-contradiction / unreadable-header rejections, SVG rationale. |

**`ingestion/` (6):**

| File | Verdict |
|---|---|
| `ImportResult.java` | Clean — the `(0,0,0,0,0)` indistinguishability rationale; `failure`/`skipped` factories match the fields. |
| `RegistryFetch.java` | Clean — the 304 ⇒ no-apply (no delist over an empty set) rule; `rejectedExternalIds` keep-never-delist. |
| `RegistryShelterDto.java` | Clean — the anti-corruption boundary; the Estonian field names (MK/OV/ANDMESEIS/ALLIKAS) documented. |
| `RegistryUnavailableException.java` | Clean — "after retries" matches the client's transient-only retry (`CsvRegistryClient:140-147`). |
| `ShelterParser.java` | Clean — live (injected at `ShelterImportService:53`); skip-never-fatal, the caller derives the skipped count. |
| `ShelterRegistryClient.java` | Clean — the source-scoped delisting; the default `fetch()` wrap for version-less sources. |

**`retention/` (2):**

| File | Verdict |
|---|---|
| `RetentionProperties.java` | Clean — the env names, the 24/24 horizons, and OFF-by-default all match the yml (`:299-307`). |
| `RetentionRunLog.java` | Clean — the house pattern cites the existing `app.DataImportLog`; the PARTIAL-count-on-FAILED semantics. |

**`sitetexts/` (1):**

| File | Verdict |
|---|---|
| `SiteTextValidationException.java` | Clean — the five refusal modes; the closed allowlist; the uniform 400. |

**`verification/` (5):**

| File | Verdict |
|---|---|
| `AlreadyVerifiedException.java` | Clean — thrown at `VerificationService:122`, i.e. before the code send AND before the throttle gates (`:130-131`) record anything. |
| `CodeSendFailedException.java` | Clean — every clause verified at `VerificationService:135-143`: plain ack kept, no pending persisted, no daily slot consumed, alert-ring record. |
| `PendingVerificationRepository.java` | Clean — the caller-supplied-now convention. |
| `VerificationConfig.java` | Clean — the plain-service wiring; `FileVerificationSendLog` is file-backed (exists, survives restarts). |
| `VerificationProvider.java` | Clean — the provider codes "smtp"/"sms" verified at the two providers (the "sms" vendor-agnosticity comment); providers-never-touch-the-db; the TIJ Ch 9 citation is the sweep-adjudicated source reference. |

**root (1):**

| File | Verdict |
|---|---|
| `ShelterMapApplication.java` | **FIXED** — the javadoc enumerated seven packages as the application code; the tree has thirteen sub-packages (`alerts`, `config`, `guidance`, `retention`, `security`, `sitetexts` were missing from the list). The enumeration was replaced with the accurate "the application code lives in the sub-packages under this root". |

Tally: **95 clean** (9 of them sweep-fixed states re-verified) + **5 fixed**.

## 3. Fixes landed (5 files, comments only, zero code lines)

| File:line | Class | Change |
|---|---|---|
| `api/AdminUserDto.java:11-15` | stale status code + misleading value space | javadoc: `kind` value space `(GUEST \| REGISTERED \| ADMIN)` → `(REGISTERED \| ADMIN)` (guests are excluded in the SQL — `JpaUserRepository.findAccountPage` limits to `REGISTERED, ADMIN`), and "not suspendable (409)" → "not suspendable (403)" (`ProvisionedAdminProtectedException` is in the handler's 403 family, `ApiErrorHandler:393-399`). |
| `app/NonSuspendableUserException.java:4-8` | comment describing behaviour a refactor removed | the ADMIN attribution dropped — the provisioned admin is refused earlier with the 403 `ProvisionedAdminProtectedException` (`AdminUserModeration:130` precedes the `:133` throw, the exception's only throw site); the 409 is the GUEST refusal. |
| `app/AppInfo.java:7-10` | stale dependency-direction claim | "dependency-free … app imports only domain" → the true invariant: the `app` layer that both `auth` and `verification` import "imports neither of them back" (0 direct imports, grep-verified; the stale half — `app/ShelterService` → `api`/`alerts` — landed in `d0982c9`). |
| `auth/Transactions.java:16` | unresolvable planning reference (the S1b/S1c class) | "(send-first-then-commit, reviews F2)" → "(send-first-then-commit)" — no review's F2 names the mechanism (it is run-1 F5 / C5 in `reviews/04-backend-security.md` and be-recon §5); the mechanism wording is self-contained. |
| `ShelterMapApplication.java:10-11` | stale tree claim | the 7-of-13 package enumeration replaced with the accurate sub-packages description. |

Line deltas: `AdminUserDto` 15/15, `NonSuspendableUserException` 15/15, `Transactions` 33/33,
`ShelterMapApplication` 22/20 (−1, uncited file), `AppInfo` 27/26 (−1, uncited file). No anchor
cited in `docs/agent/00-CURRENT-STATE.md` points at any edited file — no shift owed.

## 4. Filed for other lanes / the owner (not edited — outside my scope or test-pinned)

- **F1 — `api/AdminUserDto.java:17-22, 29-31` + `docs/api/openapi.json:344, 355`** (owner /
  the OpenAPI surface). The class- and field-level `@Schema` descriptions carry the same two
  defects the javadoc did ("GUEST \| REGISTERED \| ADMIN" and "not suspendable (409)"), and
  `docs/api/openapi.json` — the committed snapshot `OpenApiSnapshotIT` pins against the live
  document — pins both strings. This lane touched neither (test-pinned contract surface).
  The fix when adjudicated: two-line @Schema edit + the sanctioned regeneration
  (`mvn -Dopenapi.update=true -Dtest=OpenApiSnapshotIT test`). Until then the javadoc and the
  pinned snapshot disagree (403 vs 409) — intentional, per the file-not-edit rule.
- **F2 — `api/ApiErrorHandler.java:255-257`** (an earlier-lane file, not in the appendix).
  The 409-family javadoc entry for `NonSuspendableUserException` still reads "an account kind
  that cannot be suspended (the ADMIN lockout vector; GUEST has no credentials)" — the same
  stale ADMIN attribution this lane fixed in the exception's own javadoc. Same one-line shape.
- **F3 — `src/test/java/ee/sheltermap/auth/PasswordResetServiceTest.java:64` and
  `ContactChangeServiceTest.java:133`** (test tree, another lane's). The same dangling
  "(reviews F2)" / "(reviews F2/F5)" citations the main-tree one carried — the copy-paste
  source of the `Transactions.java` one, evidently. The main-tree instance is fixed; the two
  test-tree instances are filed for their owner (test comments are pinned surfaces for the
  test lanes).
- **F4 — observation only, no action requested:** `app/ShelterService.java:3-4` (not in the
  appendix — a read lane's file) imports `api.SubmitterVerification`, the one app→api edge.
  The `NotAuthorException` javadoc states "an app-layer class must not depend on the api
  layer"; the edge is deliberate and green, but the stated rule and the tree disagree by
  exactly this import. Worth an owner look at some point; nothing to fix in this lane.

## 5. Verification ledger (the load-bearing claims checked against the code)

- **403/409 split for the provisioned admin:** `ApiErrorHandler` forbidden family `:393-399`
  (403) vs conflict family `:266-279` (409); throw sites `AdminUserModeration:130` (403) and
  `:133` (409, GUEST only); `findAccountPage` SQL-limited to REGISTERED+ADMIN.
- **Open-status freshness:** `putOpenStatus` → `update(state, now)` → `createdAt` overwrite;
  `findByShelterIdInAndCreatedAtAfter`; the occupancy twin uses `UpdatedAtAfter` (the two
  request records' differing claims are both accurate).
- **Dismissal exclusion:** `r.dismissedAt is null` in all four `SpringDataShelterReportRepository`
  reads (reporters, counts, confirmed, open-count).
- **Anti-enumeration families:** the senders' catch→false; `SuspendedAccountException` ordering
  after verify+existence (`AuthService:138→156`); `AlreadyVerifiedException` before throttle
  (`:122` before `:130`); `CodeSendFailedException` catch with no persist/no slot/alert
  (`:135-143`).
- **Column/migration/yml anchors:** V1 name/email/phone sizes (255/255/64), V3 unique
  indexes, V8/V14/V19/V27 migrations, `app.jwt` 15m/30d + `JWT_SECRET` default,
  `app.contact-change` (60/900/5, "All 0 = disabled"), `app.limits.daily-submissions-per-user`
  (5), `app.media.max-bytes` (5242880), `app.retention` (24/24, OFF, env names).
- **Dependency directions:** app→auth 0, app→verification 0, verification→auth 0,
  verification→app (AppInfo only), auth→app (6 classes incl. AppInfo) — the AppInfo rewording
  states only what is true.
- **Live seams, not dead code:** `ShelterParser` (injected), `Capability` (both values used),
  `Transactions.in` (5 call sites), `DEFAULT_MESSAGE`/`MESSAGE` constants (all in use).
- **Guard numbering:** hero-import "guard 1..5" resolves in `HeroImageImportService`'s javadoc;
  the guard's own known lists (six never-made names, the wrap-join rule, the id-shape
  patterns) were read before any edit so no fix could trip the walk.

## 6. New never-filed names: none found

- The six guard-list names (`bilingual-guidance`, `admin-tab-persist`, `admin-page-size`,
  `admin-guidance-search`, `guidance-index-paging`, `admin-locale-scope`): **0 hits** in all
  100 files, whole-token or wrap-split.
- A full census of every distinct kebab token in the 100 files (~230 tokens) classified each:
  English compounds ("plain-spoken", "read-time"), config keys resolvable in
  `application.yml` (`daily-submissions-per-user`, `max-bytes`, `run-on-startup`, …),
  endpoint/feature nouns (`password-reset`, `contact-change`, `sms-test`, `site-texts`), or
  documented mechanism terms. **No token is cited in the change-name citation shape**
  (the `(kebab-work, …)` parenthetical of the dead-name class).
- Considered and classified, not filed: **`send-first-then-commit`** (`Transactions.java:16`)
  — a mechanism term, not a change citation: it is documented as the three-phase transaction
  shape in `reviews/04-backend-security.md` C5 (run-1 F5) and `reviews/code-review/be-recon.md`
  §5, and no `openspec/changes/` directory ever carried it (it names a shape, not a work
  item). The dangling piece was the "reviews F2" citation beside it (fixed, §3).

## 7. Gates

- Backend `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` (rule 7 — under the lock, detached, exit file
  `/tmp/ub/gate.exit`): **exit 0 — Tests run: 1370, Failures: 0, Errors: 0,
  Skipped: 0** (the parent's stated baseline, exact), BUILD SUCCESS in 02:23.
  PMD ran clean; "All coverage checks have been met" (the 0.93 floor).
  Named guards in the run: `DocumentationFactsTest` 21/21 (no anchor rot from
  my comment edits) and `SourceVocabularyTest` 5/5 (the fixed comments
  introduce no refused id or name). No missing-class wall — the rule-7
  hazard did not present, and the run took the lock either way.
  Log: `/tmp/ub/gate.log` (session-local).
- Frontend gate not owed: this lane edited no `frontend/src` file, and the pom does not build
  the frontend tree.

## 8. Unverified / caveats

- The tree is not lane-exclusive: the working tree carried UNREAD-FRONTEND's in-flight edits
  (`frontend/src/app/gateways/auth-gateway.ts`, `frontend/src/node-fs.d.ts`) and both sibling
  lanes' `CODE-REVIEW-NOTES.md` lines when this lane started; none of that is mine and none of
  it is in my diff. Any gate signal attributable to those files is sibling-attributable.
- `persistence/` was read here only as EVIDENCE for claims in my group (the upsert, the
  dismissal filters, the conditional UPDATE, the `changedAt` stamp) — its own verdict belongs
  to UNREAD-PERSISTENCE, whose report I did not adjudicate.
- The five fixed files' javadocs were LSP-checked clean post-edit; the full compile + test +
  PMD + coverage proof is the gate.
