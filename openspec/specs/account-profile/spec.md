# account-profile Specification

## Purpose

The authenticated account page that shows the user their own profile — name, email, phone and
national ID code — lets them correct their name (password-confirmed), and shows
verification as a per-contact label ("Verified" next to a verified email/phone, "Complete
verification" next to an unverified one) — all backed by a real `GET /account/me` profile fetch so
the UI is never guessing claims.

## Requirements

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

### Requirement: Verification as a per-contact label

The account page SHALL show, next to each contact (email and phone), its verification state: a
"verified" indication when the corresponding level is in the real claim set, and a "Complete
verification" action when it is not. The action links to the existing `/verify` route (which
remains reachable but is removed from the top-level navigation — see account page + shell nav
changes).

#### Scenario: Email verified, phone not

- **WHEN** the fetched profile says EMAIL is verified and PHONE is not
- **THEN** the email row shows a verified label and the phone row shows a "Complete verification"
  action

#### Scenario: No verified levels (fresh account)

- **WHEN** a freshly registered account has no verified claims
- **THEN** both contact rows show their "Complete verification" action

#### Scenario: All contacts verified

- **WHEN** both EMAIL and PHONE are verified
- **THEN** no "Complete verification" actions appear; both rows show verified labels

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

### Requirement: Provisioned admin — delete controls absent with explanation

For the ADMIN-kind account (`GET /account/me` `isAdmin: true` — the
env-provisioned administrator), the account page SHALL NOT render the
delete-account controls (the type-DELETE-to-confirm input and the
delete button) and SHALL show a short explanation instead: the account
is provisioned by the deployment environment, de-provisioning is an
operator action (removing the ADMIN_EMAIL / ADMIN_PASSWORD environment
variables), and the server refuses the deletion either way. The
explanation exists so the operator understands why the controls are
absent. The enforcement is server-side regardless of the UI: `DELETE
/account` for the ADMIN-kind account answers 403. For a REGISTERED
account the type-to-confirm delete flow SHALL render unchanged.

#### Scenario: The provisioned admin sees no delete controls

- **WHEN** the provisioned admin opens `/account`
- **THEN** the Delete account section contains only the explanation —
  no confirm input, no delete button

#### Scenario: An ordinary account keeps the delete flow

- **WHEN** a REGISTERED user opens `/account`
- **THEN** the type-DELETE-to-confirm input and the delete button
  render, and no provisioning explanation is shown
