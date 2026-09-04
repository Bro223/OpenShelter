# Context — Verification & Account Screens (M3)

**Source diagrams:** `01-frontend-architecture.puml` (`VerifyPage`, `ContactChangePage`,
`VerifyGateway`, `AccountGateway`, `/verify` + `/account` routes),
`03-verification-account-flow.puml` (sequences).
**Used by:** M3.

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

| Type | Kind | Key members / notes |
|---|---|---|
| `VerifyGateway` | service (`gateways/`) | `request(level: VerificationLevel)`, `confirm(level, code)`. Paths `/verify/request`, `/verify/confirm` (JWT added by the interceptor). |
| `AccountGateway` | service (`gateways/`) | `requestEmailChange(newEmail)`, `confirmEmailChange(code)`, `requestPhoneChange(newPhone)`, `confirmPhoneChange(code)`. Paths `/account/*`. |
| `VerifyPage` | component (`features/account/`, route `/verify`, AuthGuard) | Shows each unverified level (EMAIL, PHONE; SMART_ID hidden — backend rejects with 400 "stub"). Per level: "send code" → "enter code" → success. Reads current state from `AuthStore.levels()` (needs a way to refresh levels after confirm — see decision 3). |
| `ContactChangePage` | component (`features/account/`, route `/account`, AuthGuard) | Two sections: change email, change phone. Each: show current value → enter new value → **"we sent a code to your current phone/email"** state → enter code → success. |

## Key decisions

1. **Levels are a closed set, driven by the backend.** EMAIL and PHONE are offered; SMART_ID is
   hidden until the backend ships it. After a successful confirm the UI must re-read the user's
   claim state so the button disappears (backend: re-requesting a verified level → 409).
2. **Throttle UX.** Request endpoints are rate-limited (per IP) + 60 s cooldown + 5/day cap.
   On 429 show the backend message and a "wait before retrying" hint — never an auto-retry loop.
   Keep a visible countdown for the cooldown if cheap (nice-to-have, not required).
3. **Session/claim refresh.** The backend has no `GET /me` profile endpoint in v1 — after a
   confirm the UI knows the level became verified locally; reflect it optimistically in
   `AuthStore` (add the level to `levels()`), and on next app boot re-derive from login state.
   (Note for the human: a `GET /me` endpoint is a candidate backend follow-up; not needed for M3.)
4. **Contact change messages must name the proof channel.** Copy like "code sent to your current
   phone (+372…) by SMS" and "code sent to your current email (m…@example.com)" — never vague
   "we sent a code". This is a security affordance: users notice if a code goes somewhere wrong.
5. **Duplicate / same-value handling.** 409 → inline error on the new value ("already in use").
   400 with "same as current" → explain that the new value must differ.
6. **Codes are single-purpose.** Email-change and phone-change codes are independent of
   verification codes; never reuse a code entry UI across purposes without clearing state.

## UI states per change flow

1. Idle — shows current email/phone + "change" button.
2. Form — new value + validation (email format; phone: accept local `5xxxxxxx` or `+372…` — the
   backend normalizes to E.164).
3. Awaiting proof — **channel-named message** + code input + resend (disabled during cooldown).
4. Success — updated value shown; banner "your email/phone has been changed".

## Contracts with other contexts

- M2's `AuthStore` exposes `levels()` and an `addLevel()` (optimistic) used by `VerifyPage`.
- M5's submit-shelter gate (`VerifiedGuard` on `/submit`) and review flows depend on the verified
  state this milestone makes reachable.
- Backend semantics (do not re-implement): cooldown/cap → 429; already-verified → 409; codes
  expire after 15 min / 5 attempts.
