# Spec Delta: account-profile (remove-national-id)

## REMOVED Requirements

### Requirement: Profile editing (name + national ID, password-confirmed)

**Reason:** The national ID code is no longer collected, stored, or
displayed. The edit feature existed to correct a registration typo in a
field that no longer exists; name editing survives as its own
requirement below.

**Migration:** Existing accounts keep their name; the previously stored
ID code is dropped by the V12 migration and read by nothing. The account
page's identity section offers the name-only password-confirmed edit.

## ADDED Requirements

### Requirement: Profile editing (name, password-confirmed)

The application SHALL let an authenticated user correct their NAME from
the account page. The edit SHALL be confirmed by the account's current
password so a stolen session cannot rewrite the identity anchor. Email,
phone and any identity code are NOT part of this form: email/phone stay
on the existing cross-channel proof flows, and no national ID code is
collected anywhere in the app.

#### Scenario: User corrects their name

- **WHEN** an authenticated user enters the current password plus a
  corrected name
- **THEN** the change is persisted and the account page shows the
  updated name

#### Scenario: Wrong current password

- **WHEN** the password does not match the account's stored hash
- **THEN** the change is rejected (401-style error surfaced inline) and
  nothing is updated

#### Scenario: Validation failure

- **WHEN** the new name is blank
- **THEN** the backend rejects the request with a 400 and the form shows
  the validation error

#### Scenario: Unauthenticated profile write

- **WHEN** no valid JWT is presented
- **THEN** the endpoint answers 401 and no data changes

## MODIFIED Requirements

### Requirement: Real profile fetch (GET /account/me)

The backend SHALL expose `GET /account/me` for an authenticated user
returning their profile — name, email, phone — together with the REAL
verification-claim set (the EMAIL/PHONE levels that are actually
verified, not an optimistic mirror) and an `isAdmin` boolean (true iff
the user's kind is `ADMIN`). The response SHALL NOT include any national
ID code. The frontend SHALL fetch this profile at boot (after silent
refresh) and after login, keep it in the session store, and re-fetch it
after a verify-confirm or a contact change so labels are always
truthful. The session store SHALL expose `isAdmin` for the nav item and
the `/admin` route guard.

#### Scenario: Authenticated user fetches their profile

- **WHEN** an authenticated user calls `GET /account/me`
- **THEN** the response contains the user's name, email, phone, the set
  of verification levels that are actually verified for this account,
  and `isAdmin` — and no national ID code

#### Scenario: Unauthenticated user calls GET /account/me

- **WHEN** no valid JWT is presented
- **THEN** the endpoint answers 401 and no profile data leaks

#### Scenario: Boot with an existing session

- **WHEN** the app boots with a valid refresh token (silent refresh
  succeeds)
- **THEN** the session store loads the real profile + verification
  claims + `isAdmin` so the UI shows the account's actual data without
  the user re-logging in

#### Scenario: Claims change (verify-confirm or contact change)

- **WHEN** the user completes a verification confirm or changes
  email/phone
- **THEN** the store re-fetches the profile so verification labels and
  contact values reflect the change immediately

### Requirement: Account page replaces contact-only page

The `/account` route SHALL render a full profile page — identity section
(name with the password-confirmed edit form; no national ID row),
contact rows with verification labels/actions (see the per-contact
label requirement), and the existing cross-channel email/phone change
panels — replacing the current contact-change-only page. The "Verify"
item SHALL be removed from the top navigation while the `/verify` route
itself stays for guard redirects and account-page CTAs.

#### Scenario: Authenticated user opens /account

- **WHEN** a logged-in user opens `/account`
- **THEN** they see their name, email and phone, verification state per
  contact, and the change-email / change-phone panels — and no national
  ID code row or input anywhere

#### Scenario: Top nav no longer advertises Verify

- **WHEN** an authenticated-but-unverified user looks at the top
  navigation
- **THEN** there is no standalone "Verify" item, and verification is
  reached through the account page contact rows (or guard redirects,
  which still work)

#### Scenario: Guard redirect still works

- **WHEN** an unverified user tries a verified-only action that redirects
  to `/verify?returnUrl=…`
- **THEN** the `/verify` route still renders and completes the flow,
  then returns to `returnUrl`
