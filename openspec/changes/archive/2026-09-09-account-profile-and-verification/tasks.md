## 1. Backend: GET /account/me

- [x] 1.1 Add a `MeResponse` record (name, email, phone, nationalIdCode, levels — reuse the
  existing `VerificationLevel` enum) and implement `GET /account/me` on `AccountController`:
  resolve the authenticated `RegisteredUser` from the JWT (existing `currentUser`-style helper),
  map `UserData` + the user's real claims to the DTO; verify it compiles
- [x] 1.2 Unit/IT tests: authenticated call returns the stored profile + the REAL verified claim
  set (seed claims, assert they come back; seed none, assert empty); unauthenticated → 401;
  verify the new tests pass and the existing 216 stay green

## 2. Backend: PUT /account/profile

- [x] 2.1 Add `ProfileUpdateRequest` (name, nationalIdCode, currentPassword — mirrored
  registration validations: name @NotBlank, nationalIdCode @NotBlank; confirm the exact
  canonicalization registration applies to the national code and mirror it) and implement
  `PUT /account/profile`: verify `currentPassword` against the stored Argon2 hash (wrong →
  401), then persist the new name/nationalIdCode and return the fresh `MeResponse`; document in a
  comment that a future SMART-ID claim invalidate-on-code-change is a follow-up; verify it
  compiles
- [x] 2.2 Unit/IT tests: happy path persists + returns updated profile; wrong current password →
  401 with nothing updated; blank/whitespace name or blank nationalIdCode → 400; unauthenticated →
  401; verify new tests pass and the existing 216 stay green

## 3. Frontend: models + AccountGateway

- [x] 3.1 Add `MeResponse` and `ProfileUpdateRequest` types to `src/app/core/models.ts`
  (mirroring the existing register/change DTO style); add `AuthStore`-facing type if needed for
  levels reuse; verify it type-checks
- [x] 3.2 Extend `AccountGateway`: `me(): Promise<MeResponse>` (GET /account/me) and
  `updateProfile(req): Promise<MeResponse>` (PUT /account/profile) via the existing `ApiClient`
  (typed Promises, `ApiError` on failure); update its docstring (the "no GET /me — reported gap"
  note is now false); add gateway spec cases (me GETs; updateProfile PUTs + propagates 401/400 as
  ApiError); verify the spec passes

## 4. Frontend: AuthStore real profile

- [x] 4.1 Extend `AuthStore`: profile signals (`name`, `email`, `phone`, `nationalIdCode`) plus
  `refreshProfile(): Promise<void>` — single-flight, non-fatal on failure (session stays
  authenticated, profile null/empty; retry on next mid-session refresh or explicit call); wire
  `init()` (after silent-refresh success) and `login()` (after tokens stored) to fetch it; replace
  the optimistic `levels` writer path — after any claims-changing event the caller invokes
  `refreshProfile()`; keep `levels()`/`isVerified()` semantics so guards and pages compile;
  update the class docstring (optimistic-mirror rationale is gone); verify it type-checks
- [x] 4.2 Update/extend `auth-store.spec.ts`: boot with session → profile fetched; login → profile
  fetched; refreshProfile failure leaves session usable; levels reflect fetched claims; remove or
  re-point tests that asserted the old optimistic addLevel-after-confirm behaviour; verify the
  spec passes

## 5. Frontend: AccountPage (profile + verification labels)

- [x] 5.1 Rework `ContactChangePage` into `AccountPage` (same `/account` route, AuthGuard):
  identity card showing name + national ID with an inline password-confirmed edit form
  (`name`/`nationalIdCode` + current password; calls `AccountGateway.updateProfile` then
  `refreshProfile`); contact rows (email, phone) showing the real value + a verified label when the
  level is in the fetched claim set or a "Complete verification" action linking to `/verify`
  otherwise; the existing cross-channel email-change and phone-change panels ported onto the page;
  after a contact change also `refreshProfile()`; loading/error states with retry; update the class
  docstring (the "no GET /me, session-only current values" caveat is gone — real values now show);
  verify it type-checks
- [x] 5.2 Add/port `account-page.spec.ts` (adapt the old contact-change harness + fake
  AuthStore/AccountGateway shapes): renders name/email/phone/national ID from the fetched profile;
  per-contact verified labels vs "Complete verification" actions for each claim combination; wrong
  current password surfaces the inline error and does not update; successful profile edit updates
  the shown values; change-email/phone panels still work end-to-end (M3 behaviour preserved);
  refreshProfile invoked after edits; verify the spec passes

## 6. Frontend: nav, VerifyPage touch-ups, routes

- [x] 6.1 `page-shell.html`: remove the `!auth.isVerified() → Verify` top-nav item (Account stays;
  the /verify route is untouched); if the shell's spec asserted the Verify item, update it; verify
  the spec passes
- [x] 6.2 VerifyPage + VerifiedGuard compile against the store's real levels: after a confirm the
  page calls `refreshProfile()` (instead of optimistic addLevel) and the UI reflects the newly
  verified channel; update verify-page.spec.ts where it asserted the optimistic path; verify the
  spec passes

## 7. Routes + docs/puml sync (repo rule — never silently drift)

- [x] 7.1 Reconcile with the implemented reality: frontend agent docs `03-CONTEXT-CORE-AUTH.md` and
  `04-CONTEXT-ACCOUNT-VERIFY.md` (decision 3 "no GET /me" is reversed — profile fetch replaces the
  optimistic mirror; account page now shows real contact values), `07-STEPS.md` + `frontend/README.md`
  deferrals lists (remove the GET /me deferral line), backend `context-and-tasks/agent/04-CONTEXT-AUTH.md`
  (add the two new endpoints to the account surface); update puml `01-frontend-architecture.puml`
  (AccountPage + AuthStore profile fields + gateway edges) and `03-verification-account-flow.puml`
  (confirm → store refresh), re-render with `./render.sh`, and report exactly what changed
- [x] 7.2 Update the OpenSpec change task list to checked/complete as work lands (keep in sync)

## 8. Milestone acceptance

- [x] 8.1 Run `mvn -q test` (backend) — all green, note count; run `cd frontend && npx ng test
  --watch=false` + both `tsc --noEmit` configs — all green, note count delta
- [x] 8.2 Live check against the running backend on :8080 (frontend on :5173): register a new
  account (with an intentionally wrong-but-plausible national ID), verify EMAIL via the dev/email
  sender + printed code, log in fresh and confirm the account page shows the real profile + the
  email row verified; use the identity edit form (correct password) to fix the national ID and
  confirm the new value persists after reload; wrong-password edit is rejected; verify PHONE shows
  a "Complete verification" action; confirm the top nav has no Verify item but /verify still works
  when visited directly; report results (screenshots where possible)
