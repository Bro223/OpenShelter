# Change: remove-national-id

## Why

Registration collects a "national ID code" that is never used for anything:
it is stored in plaintext, never checksum-validated, never displayed in a
meaningful way, never queried, and not consumed by any verification channel
(the SMART_ID level is a stub whose future flow proves identity externally
via PKI and stores no code). Holding a national personal identity number at
rest with no functionality is pure liability. The owner-approved roadmap
(M1) removes the collection, purges the field end to end, and keeps the
SMART_ID claim level grantable later through an external flow that stores
no code.

## What Changes

- V12 migration: `ALTER TABLE users DROP COLUMN national_id_code`.
  Existing rows simply lose the column — the value is read by nothing.
- Registration: `POST /auth/register` no longer accepts `nationalIdCode`
  (name / email / phone / password only); the register form drops the
  field.
- Profile: `PUT /account/profile` becomes a name-only, password-confirmed
  edit; `GET /account/me` no longer returns `nationalIdCode`; the account
  page drops the national-ID display row and its edit input.
- Domain + persistence: the field is purged from `UserData`,
  `RegisteredUser`, `AdminUser`, `UserEntity`, `UserMapper` and every DTO
  that carried it.
- SMART_ID: the level stays in `VerificationLevel`, stays rejected with
  400 by the verification controller (stub), and stays hidden on the
  frontend verify page. When it lands, it lands as an external session
  - poll flow where the provider proves identity itself — no stored code,
  nothing in this change blocks it.
- Provisioned admin: the pre-set SMART_ID claim's `external_ref` uses the
  admin's e-mail (the account's real contact, as the PHONE claim already
  does) instead of the former empty ID-code string.

## Impact

- Backend: V12 migration; domain (UserData, RegisteredUser, AdminUser);
  persistence (UserEntity, UserMapper); auth (RegisterRequest,
  ProfileUpdateRequest, MeResponse, AuthService, UserService,
  AccountService, AdminSeeder); ITs and unit tests updated.
- Frontend: models, register page (component + template + spec), account
  page (component + template + spec), auth-store (+ spec), gateways
  (+ specs), shell/interceptor fixtures.
- Specs/docs: account-profile spec delta in this change directory (main
  spec syncs at archive, repo convention); context docs + README synced.
