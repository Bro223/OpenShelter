## Context

- Backend already stores the full profile: `UserEntity` has name, email, phone, nationalIdCode;
  verification claims live in `VerificationClaimEntity`; `RegisteredUser.getData()` → `UserData`
  already returns name/email/phone/nationalIdCode/levels. What is missing is only the HTTP surface:
  no `GET /me` endpoint, so the frontend cannot read any of it (documented gap, frontend agent
  04 decision 3 + README deferrals + 03-CONTEXT-CORE-AUTH).
- `AuthController` sits at `/auth` (register/login/refresh/logout/password-reset), `AccountController`
  at `/account` (email-change + phone-change cross-channel). The new profile endpoints belong on
  `AccountController` (`/account/me`, `/account/profile`) — same controller group, same JWT auth
  rule, same rate-limit/service conventions.
- Frontend session store `AuthStore` (03-CONTEXT-CORE-AUTH) currently keeps ONLY `levels()` as an
  optimistic, session-lifetime mirror (starts empty, grows on local confirm/409, resets on
  login/logout, never persisted). It holds no name/email/phone. `TokenStore` holds tokens.
  `AccountGateway` has the four cross-channel change calls. `ContactChangePage` at `/account` is
  the contact-only page being replaced. `VerifyPage` at `/verify` (AuthGuard) reads
  `AuthStore.levels()` and calls `/verify/request|confirm` per channel.
- Backend verification: `VerificationController` (`POST /verify/request`, `POST /verify/confirm`);
  claim levels EMAIL/PHONE stored per user; SMART_ID rejected with 400 (stub). Email codes go out
  via the dev/smtp sender; the dev harness prints codes for manual E2E (email allowlist test
  controller). 216 backend tests green; 290 frontend tests green (27 files) at the last milestone.
- Shell nav (`page-shell.html`): shows "Verify" only when authenticated && !verified — removing it
  changes that conditional (no standalone item; Account remains).

## Goals / Non-Goals

**Goals:**

- One real profile read (`GET /account/me`) that kills the optimistic-claims debt: store fetches
  it at boot + login and after every claims-changing event (verify confirm, contact change), and
  the account page + verify page read the same store signals.
- Profile edit confined to identity data (name + national ID), password-confirmed server-side;
  email/phone keep their stronger cross-channel proof — do NOT weaken them.
- Verification presented as a property of each contact (label + CTA), with `/verify` de-emphasized
  from nav but fully functional via route.
- Keep all 216 backend + 290 frontend tests green; add real coverage for the new surface.
- Keep puml/docs in sync (repo rule): reverse the documented "no GET /me" decisions everywhere
  they appear; re-render diagrams; report deviations.

**Non-Goals (this change):**

- No password change/reset UI here (separate milestone: email-OTP reset).
- No "my shelters / my reviews" contributions page (separate milestone incl. shelter creator
  migration).
- No SMART-ID enablement (stays a 400 stub) — but the national-ID edit is designed so that once
  SMART-ID exists, a corrected code can be verified without a new account.
- No account deletion, no email/phone display masking toggle.
- No backend changes to the existing cross-channel change flows.

## Decisions

1. **`GET /account/me` returns a `MeResponse` DTO.** Fields: `name`, `email`, `phone`,
   `nationalIdCode`, `levels: VerificationLevel[]` (real, from the user's stored claims). Shape
   mirrors the frontend's existing `VerificationLevel` union (EMAIL/PHONE). The JWT stays
   id-only — this endpoint is the profile read, rate-limited like other authed reads are not
   needed to be but kept cheap (no code issuance, so no bucket; standard auth).
   Rationale: single source of truth replaces both the optimistic mirror AND the contact-change
   page's "we can't show current values" limitation (its emailLast/phoneLast session-only hack can
   go away).
   Alternative considered: stuff profile into the JWT — rejected: claims would be stale the moment
   a contact changes or a level verifies; also bloats the token.

2. **`PUT /account/profile` with `{ name, nationalIdCode, currentPassword }`.**
   - `currentPassword` is verified against the stored Argon2 hash BEFORE any update → wrong
     password answers 401 (surfaced inline as "current password is incorrect", never "wrong
     password" wording per existing security-copy rule — reuse `COPY`).
   - Validations mirror registration: name @NotBlank (whitespace-trimmed, ≤ 200), nationalIdCode
     @NotBlank with the same canonicalization registration uses (trim; no checksum re-invention —
     registration doesn't checksum-validate today, so editing must not be stricter).
   - Updating `nationalIdCode` does NOT clear or add verification claims (SMART-ID is a stub; when
     it lands, a code change may need to invalidate a pending/active SMART-ID claim — document as a
     follow-up note in the method comment).
   - Returns the fresh `MeResponse` so the UI can adopt it in one round trip.
   Rationale: identity is the one field class with no cross-channel second factor, so proof-of-
   possession of the password is the honest minimum; it matches how Estonian self-service portals
   gate identity edits.
   Alternative considered: cross-channel SMS/email confirm for ID edits — rejected: the ID is the
   anchor that would let an attacker re-route both channels; password possession is the weaker but
   correct v1 gate, and SMART-ID re-verification is the real fix later.

3. **AuthStore gains a real profile + drops the optimistic mirror.**
   - New signals: `name`, `email`, `phone`, `nationalIdCode` (all `string | null`) and `levels`
     now backed by the fetched `MeResponse`. `levels()` semantics stay (EMAIL/PHONE array) so
     `isVerified()`/guards/VerifyPage keep compiling.
   - `init()` (boot): after a successful silent refresh, fire `GET /account/me` (non-fatal — if it
     fails, session stays authenticated but profile is null/empty; a mid-session 401 refresh
     retries later).
   - `login()`: after tokens are stored, fetch the profile the same way.
   - New `refreshProfile(): Promise<void>` — idempotent/single-flight like the rest of the store —
     called by VerifyPage after a confirm and by the account page after contact change / profile
     edit.
   - `addLevel` (the optimistic writer) is removed or reduced to a local echo that is immediately
     superseded by `refreshProfile()` — decide in code: the confirm already returns success, so
     calling `refreshProfile()` after confirm makes addLevel unnecessary. Tests must be updated
     where they asserted optimistic behavior.
   Rationale: this is the correctness fix the change exists for; a real fetch is ~1 round trip and
   removes an entire class of stale-UI bugs (documented "self-healing via 409" hack goes away).

4. **`/account` becomes `AccountPage`; Verify leaves the nav.**
   - Rework `ContactChangePage` → `AccountPage` (route stays `/account`, AuthGuard): header + an
     identity card (name + national ID shown, "Edit" opens the password-confirmed form inline),
     contact rows (email, phone) with verified label / "Complete verification" CTA (deep link
     `/verify?returnUrl=/account` or plain `/verify`), then the existing email-change and
     phone-change panels (reuse the M3 logic — port, don't re-architect; keep their specs passing
     by adapting the harness to the new page).
   - `page-shell.html`: remove the `!isVerified() → Verify` item. Guards that redirect to `/verify`
     keep working (route unchanged).
   - After a successful profile edit or contact change, call `refreshProfile()` (also fixes the
     old "we don't know the current email/phone until you change it" gap — show real values).
   - Empty/anonymous states: AuthGuard prevents anonymous access; if profile is still null after
     init (backend hiccup), show the error banner with chrome intact (shared convention), and a
     "retry" affordance that calls `refreshProfile()`.
   Rationale: mirrors how the contact-change UI already reads; keeps `/verify` as the single
   code-entry surface (SMART_ID/EMAIL/PHONE channel flow unchanged).

5. **VerifyPage/guards keep compiling via store, minor edits only.** `VerifyPage` reads
   `levels()` for which channels to offer — with real data, a verified channel shows as done on
   arrival (no false "verify again"); a 409 path stays as a defensive net. `VerifiedGuard`/
   `authGuard` unchanged. If VerifyPage's tests asserted the old optimistic "addLevel after
   confirm" behaviour, update them to assert `refreshProfile()` is invoked instead.

6. **Docs are part of the diff (repo rule).** Every place that documents "no GET /me" or the
   optimistic mirror is reversed: frontend agent `03-CONTEXT-CORE-AUTH.md`, `04-CONTEXT-ACCOUNT-VERIFY.md`
   (decision 3), `07-STEPS.md` (deferral lines), `frontend/README.md` (deferrals list), backend
   `context-and-tasks/agent/04-CONTEXT-AUTH.md`; puml `01-frontend-architecture.puml` (AccountPage +
   profile read edges), `03-verification-account-flow.puml` (verify after confirm → store refresh),
   re-rendered via `./render.sh`. Never silently drift.

## Risks / Open Questions

- **Backend email delivery for manual E2E**: profile fetch needs no email; but verifying claims to
  test labels does — use the existing dev/allowlist email sender + printed codes exactly as M3
  manual E2E did.
- **Test-count coupling**: frontend specs that construct `AuthStore` fakes (login/verify/account
  pages, guards) may need the new signals added to the fake shape — expect a mechanical ripple;
  keep fakes hand-written.
- **`nationalIdCode` canonical form**: confirm what registration does (trim/lowercase/numeric
  filter) and mirror exactly; do not add a checksum validator registration lacks (would block
  existing users' codes).
