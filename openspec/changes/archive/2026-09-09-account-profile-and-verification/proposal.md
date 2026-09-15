## Why

Today the account page (`/account`, M3-era `ContactChangePage`) can only change the email/phone via
cross-channel proof — it cannot show who the account belongs to. The backend stores the full
profile (name, email, phone, national ID code) and real verification claims, but exposes **no
`GET /me`**: the JWT carries only the user id, so the frontend keeps an *optimistic, session-only*
mirror of verification levels (`AuthStore.levels`), which resets on reload and can never show the
account's real name/email/phone/national ID.

The consequences the user hit:

1. A user cannot see their own name/email/phone/national ID anywhere after registering.
2. A registration typo in the national ID code is **permanent** — the user cannot correct it and
   would have to register a brand-new account (critical once SMART-ID verification exists, since
   SMART-ID matches the name + ID code against the state registry).
3. Verification is a separate nav page rather than a property of the contact (email/phone), so the
   UI gives no "this email is verified" / "verify this email" affordance next to the value.
4. The optimistic `levels()` mirror is a standing correctness debt — a reload hides real claims.

This milestone (of three — see Impact) delivers the **account profile page**: it shows the person's
data, lets them edit name + national ID (password-confirmed), shows verification as a per-contact
label with a "complete verification" action, and replaces the optimistic claims mirror with a real
`GET /me` fetch. Password-reset-by-email-OTP and contributions (my shelters/reviews, incl. the
shelter creator schema change) are separate following changes.

## What Changes

Backend (Spring Boot, new endpoints under `/account`, JWT-auth):

- `GET /account/me` — returns the authenticated user's profile: name, email, phone,
  nationalIdCode and the real verification-claim set (EMAIL/PHONE that are actually verified).
- `PUT /account/profile` — updates `name` and/or `nationalIdCode` for the authenticated user,
  confirmed by the account's current password (so a stolen session cannot rewrite the identity
  anchor). Validations mirror registration. Email/phone remain governed by the existing
  cross-channel change flows (unchanged).

Frontend (Angular):

- `AuthStore` fetches the real profile once at boot/login (`GET /account/me`) and keeps it in
  signals (`name`, `email`, `phone`, `nationalIdCode`, real `levels`), replacing the optimistic
  levels mirror; after a verify-confirm / contact-change it refetches so labels stay truthful.
- `/account` becomes a full profile page: identity section (name + national ID, editable with a
  password confirm), contact rows (email, phone) each showing a **verified/unverified label** and,
  when unverified, a **"Complete verification"** action linking to `/verify`; the existing
  cross-channel email/phone change panels move onto the same page.
- The "Verify" item is removed from the top nav; the `/verify` route itself stays (guard redirects
  and the account-page CTAs still deep-link to it).
- Docs/puml sync: the "no GET /me" decisions (frontend agent 04 decision 3, README deferrals list,
  03-CONTEXT-CORE-AUTH, backend context) are reversed and updated; diagrams re-rendered.

## Capabilities

### New Capabilities

- `account-profile`: the authenticated account page that shows the user's own profile, lets them
  edit name + national ID (password-confirmed), and shows verification as per-contact labels with a
  "complete verification" action — backed by a real `GET /account/me` profile fetch (no optimistic
  claims).

### Modified Capabilities

## Impact

- Backend: `AccountController` (new `GET /me` + `PUT /profile`), a `MeResponse`/`ProfileUpdate`
  DTO pair, `AuthService`/`AccountService` methods, unit + `@SpringBootTest` IT coverage; existing
  216 tests stay green.
- Frontend: `AuthStore` (real profile + refetch-after-change), `AccountGateway` (me/profile),
  `models.ts`, `ContactChangePage` → reworked `AccountPage` (+ spec), `VerifyPage` unchanged apart
  from reading real levels, `page-shell` nav (Verify item removed), plus specs.
- Docs: `frontend/docs/agent/00-README.md`, `03-CONTEXT-CORE-AUTH.md`, `04-CONTEXT-ACCOUNT-VERIFY.md`
  (decision 3 reversed), `frontend/README.md` deferrals, puml `01-frontend-architecture.puml` +
  `02-auth-flow.puml` + `03-verification-account-flow.puml` (rendered), backend
  `context-and-tasks/agent/04-CONTEXT-AUTH.md`.
- Follow-ups (NOT in this change): password reset by 6-digit email OTP; contributions (my
  shelters/reviews incl. shelter creator column migration).
