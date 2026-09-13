# Context — Verification & Account Screens (M3)

**Source diagrams:** `01-frontend-architecture.puml` (`VerifyPage`, `AccountPage`,
`VerifyGateway`, `AccountGateway`, `/verify` + `/account` routes),
`03-verification-account-flow.puml` (sequences).
**Used by:** M3; reworked in M7 (account profile + per-contact verification).

## Purpose

Turn a fresh account into a trusted one and let users change their contacts **without weakening
the account**:

- **Verify EMAIL then PHONE** — proof of ownership via codes delivered out-of-band.
- **Change email** → proof via **SMS code to the current phone**.
- **Change phone** → proof via **email code to the current email**.

The cross-channel rule is the security core: stealing only the mailbox, or only the SIM, is never
enough to hijack the account. The UI must make the "which channel proves this change" step
unmistakable.

## Classes to create

| Type             | Kind                                                         | Key members / notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `VerifyGateway`  | service (`gateways/`)                                        | `request(level: VerificationLevel)`, `confirm(level, code)`. Paths `/verify/request`, `/verify/confirm` (JWT added by the interceptor).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `AccountGateway` | service (`gateways/`)                                        | `me()`, `updateProfile(request)`, `requestEmailChange(newEmail)`, `confirmEmailChange(code)`, `requestPhoneChange(newPhone)`, `confirmPhoneChange(code)`. Paths `/account/*`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `VerifyPage`     | component (`features/account/`, route `/verify`, AuthGuard)  | Shows each unverified level (EMAIL, PHONE; SMART_ID hidden — backend rejects with 400 "stub"). Per level: "send code" → "enter code" → success. Reads the REAL claim state from `AuthStore.levels()` (fetched from `GET /account/me`) and re-fetches the profile after a confirm (decision 3).                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `AccountPage`    | component (`features/account/`, route `/account`, AuthGuard) | The full profile page (M7): identity card (name — with the provenance-style **"Admin" badge next to it, rendered only when `AuthStore.isAdmin()` is true** (admin-moderation D5; the store's value comes from the fetched profile, so it's server state, and a failed profile fetch hides the badge fail-closed) — editable via the password-confirmed form (no national ID code — M1), contact rows (real email/phone value + Verified label / "Complete verification" CTA to `/verify`), and the two cross-channel change sections: change email, change phone. Each: show current value → enter new value → **"we sent a code to your current phone/email"** state → enter code → success. (M3 name: `ContactChangePage` — contact-only; replaced in M7.) |

## Key decisions

1. **Levels are a closed set, driven by the backend.** EMAIL and PHONE are offered; SMART_ID is
   hidden until the backend ships it. After a successful confirm the UI must re-read the user's
   claim state so the button disappears (backend: re-requesting a verified level → 409).
2. **Throttle UX.** Request endpoints are rate-limited (per IP) + 60 s cooldown + 5/day cap.
   On 429 show the backend message and a "wait before retrying" hint — never an auto-retry loop.
   Keep a visible countdown for the cooldown if cheap (nice-to-have, not required).
3. **Session/claim refresh (REVERSED in M7).** The backend now HAS `GET /account/me` —
   `AuthStore` fetches the real profile (name/email/phone + the REAL
   claim set) at boot (after the silent refresh) and after login, and
   `refreshProfile()` re-fetches it after every claims-changing event (verify-confirm,
   contact change, profile edit). The M3 optimistic `addLevel()` mirror is GONE —
   `levels()` is server state. A failed fetch is non-fatal: the session stays
   authenticated, the profile stays null (the account page offers a retry).
   The `/verify` 409 ("already verified") remains as the defensive net: the page
   re-fetches the profile and shows an info notice, never an error banner.
4. **Contact change messages must name the proof channel.** Copy like "code sent to your current
   phone (+372…) by SMS" and "code sent to your current email (m…@example.com)" — never vague
   "we sent a code". This is a security affordance: users notice if a code goes somewhere wrong.
5. **Duplicate / same-value handling.** 409 → inline error on the new value ("already in use").
   400 with "same as current" → explain that the new value must differ.
6. **Codes are single-purpose.** Email-change and phone-change codes are independent of
   verification codes; never reuse a code entry UI across purposes without clearing state.

## UI states per change flow

1. Idle — shows the REAL current email/phone (from the fetched profile) + the change form entry.
2. Form — new value + validation (email format; phone: accept local `5xxxxxxx` or `+372…` — the
   backend normalizes to E.164).
3. Awaiting proof — **channel-named message** + code input + resend (disabled during cooldown).
4. Success — the profile is re-fetched; the contact row shows the new server value; banner
   "your email/phone has been changed".

## Contracts with other contexts

- M2's `AuthStore` exposes the REAL profile (`name`/`email`/`phone`
  signals) and `levels()` (fetched claims) with
  `refreshProfile()` for re-fetch — used by `VerifyPage` and `AccountPage`.
  (M3's optimistic `addLevel()` was removed in M7.)
- M5's submit-shelter gate (`VerifiedGuard` on `/submit`) and review flows depend on the verified
  state this milestone makes reachable.
- Backend semantics (do not re-implement): cooldown/cap → 429; already-verified → 409; codes
  expire after 15 min / 5 attempts.
