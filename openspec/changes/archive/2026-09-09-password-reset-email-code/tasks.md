## 1. Backend: V6 migration + entity attempts

- [x] 1.1 Add `V6__password_reset_attempts.sql`: `ALTER TABLE password_reset_tokens ADD COLUMN attempts int NOT NULL DEFAULT 0;` — confirm the current table name/column names from `PasswordResetTokenEntity` + an existing migration's style; verify it applies cleanly (mvn test / flyway)
- [x] 1.2 Extend `PasswordResetTokenEntity` + the domain object the service uses with an `attempts` field (int, default 0), a getter, and `recordAttempt()`; ensure the JPA mapping picks up the new column; verify it compiles

## 2. Backend: PasswordResetService code flow

- [x] 2.1 `requestReset`: generate a 6-digit code (reuse/extract the `sixDigitCode()` pattern — move a shared helper or replicate with a SecureRandom-backed `String.format("%06d", …)`), send via `SmtpSender.send(email, "Shelter Map password reset code: <code> (valid 15 min)")`, invalidate any prior unexpired row for the user (new repository method like `deleteActiveByUserId`), persist `SHA-256(code)` with the 15-min TTL; remove the `resetUrlPrefix`/`frontendBaseUrl` construction (grep `app.frontend.base-url` for other consumers first — drop the constructor arg only if nothing else uses it); keep anti-enumeration (unknown email → silent no-op, still 200); verify it compiles
- [x] 2.2 `reset`: rename the param to `code`; hash the submitted code, find the row, and enforce in order — exists → not used → not expired → attempts < MAX_ATTEMPTS (= 5, mirroring `PendingVerification`) → hash match; a wrong-but-present code increments attempts (persisted); ANY failure → `InvalidResetTokenException` with one generic message ("invalid or expired reset code"); success: set password, mark used, revoke all refresh tokens (unchanged single transaction); update `AuthService` + `PasswordResetConfirmRequest` (field `token` → `code`, `@NotBlank`) + controller wiring; verify it compiles
- [x] 2.3 Unit tests (`PasswordResetServiceTest` + in-memory repo fake gains attempts/deleteActive): correct code resets + revokes refresh tokens + marks used; wrong code → generic 400-equivalent + one attempt recorded; attempts exceed MAX → rejected even with the correct code later; expired code rejected; already-used code rejected; second request invalidates the first (only latest works); unknown email request sends nothing but "succeeds"; verify tests pass

## 3. Backend: IT + repository tests

- [x] 3.1 `PasswordResetTokenRepositoryIT`: attempts column persists + `deleteActiveByUserId` removes only unexpired rows for one user; verify it passes
- [x] 3.2 `AuthApiIT`: full HTTP flow — request for a registered email → (capture the code from the fake/dev sender or a test seam) → confirm with code + new password → 200, old password no longer logs in, all refresh tokens revoked (old session 401s); wrong code → 400 generic; request for unknown email → 200 identical body; verify the suite stays green (223 + new)

## 4. Frontend: models + gateway

- [x] 4.1 `models.ts`: `PasswordResetConfirmRequest` becomes `{ email, code, newPassword }` (was `{ token, newPassword }`); verify it type-checks
- [x] 4.2 `AuthGateway`: `resetPassword(email, code, newPassword)` POSTs `{ email, code, newPassword }` to `/auth/password-reset/confirm`; update the docstring (code, not token); update any gateway spec case that asserts the old body; verify the spec passes

## 5. Frontend: ResetPage in-page code flow

- [x] 5.1 Rework `reset-page.ts`: drop the `ngOnInit` `?token=` parsing; modes `request` → `sent` → (in-page) code+password confirm; new form controls (code — 6-digit numeric validator mirroring the app's other code inputs; password + repeat with mismatch check); submit → `gateway.resetPassword(email, code, password)` → navigate `/login?reset=ok`; map a 400 to generic inline copy ("invalid or expired reset code…", never backend internals — check `error-copy.ts` for a reset key and adapt); verify it type-checks
- [x] 5.2 Rework `reset-page.html`: `request` state (email field + "we'll email a 6-digit code" subtitle + button), `sent` state (anti-enumeration copy: "If an account exists for that email, a 6-digit code has been sent to it." + code field + new password + repeat + submit + resend link) — or fold code entry into one view if cleaner; remove the `?token=` confirm branch; design tokens only
- [x] 5.3 Update `reset-page.spec.ts`: remove the "shows confirm form when a token is present" test; add — request sends email to the gateway; always same anti-enumeration message; invalid email not sent; code+password happy path navigates to /login?reset=ok; wrong code 400 shows generic banner and keeps the form usable; password mismatch blocks without calling the gateway; verify the suite stays green (300 + updated)

## 6. Docs/puml sync (repo rule — never silently drift)

- [x] 6.1 Reverse the URL-link reset everywhere it is documented: backend `context-and-tasks/agent/04-CONTEXT-AUTH.md` (request/confirm payload + flow), frontend agent `03-CONTEXT-CORE-AUTH.md` + `07-STEPS.md` (M2-era reset lines), `frontend/README.md` + root `README.md` deferral/flow lines that mention reset link or `?token=`; update puml `02-auth-flow.puml` (+ any reset lane in `03-verification-account-flow.puml`) to the code flow; re-render via `frontend/docs/render.sh` (Docker plantuml) and include regenerated PNG/SVG; report exactly what changed
- [x] 6.2 Update the OpenSpec change task list to checked/complete as work lands

## 7. Milestone acceptance

- [x] 7.1 Run `mvn -q test` (backend) — all green, note count; `cd frontend && npx ng test --watch=false` + both `tsc --noEmit` configs — all green, note count; `npx prettier --check` on every touched file (write if needed, but never reformat files you did not change)
- [x] 7.2 Live check against the running backend :8080 / frontend :5173: register an account, then use the reset page with a real email — to capture the emailed code either temporarily use the dev sender (restore the original `.env` right after, per M1 precedent) or exercise the API with a test seam; verify: request → code received → confirm with code + new password → old password rejected + new password logs in + prior sessions revoked; wrong code shows the generic banner; report exactly what you verified and how
