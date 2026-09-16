# Spec Delta: account-profile (admin-moderation)

## MODIFIED Requirements

### Requirement: Real profile fetch (GET /account/me)

The backend SHALL expose `GET /account/me` for an authenticated user returning their profile —
name, email, phone, nationalIdCode — together with the REAL verification-claim set (the
EMAIL/PHONE levels that are actually verified, not an optimistic mirror) and an `isAdmin`
boolean (true iff the user's kind is `ADMIN`). The frontend SHALL fetch this profile at boot
(after silent refresh) and after login, keep it in the session store, and re-fetch it after a
verify-confirm or a contact change so labels are always truthful. The session store SHALL
expose `isAdmin` for the nav item and the `/admin` route guard.

#### Scenario: Authenticated user fetches their profile

- **WHEN** an authenticated user calls `GET /account/me`
- **THEN** the response contains the user's name, email, phone, national ID code, the set of
  verification levels that are actually verified for this account, and `isAdmin`

#### Scenario: Unauthenticated user calls GET /account/me

- **WHEN** no valid JWT is presented
- **THEN** the endpoint answers 401 and no profile data leaks

#### Scenario: Boot with an existing session

- **WHEN** the app boots with a valid refresh token (silent refresh succeeds)
- **THEN** the session store loads the real profile + verification claims + `isAdmin` so the UI
  shows the account's actual data without the user re-logging in

#### Scenario: Claims change (verify-confirm or contact change)

- **WHEN** the user completes a verification confirm or changes email/phone
- **THEN** the store re-fetches the profile so verification labels and contact values reflect the
  change immediately
