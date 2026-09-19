# password-reset-code Specification

## Purpose

Password reset confirmed by a one-time 6-digit code emailed to the account address — request
(anti-enumeration), emailed code, in-page code + new-password confirmation with expiry, attempts
and single-use enforcement, and full session revocation on success.

## Requirements

### Requirement: Request a reset code by email

The application SHALL let a signed-out user request a password reset by entering their email. The
backend SHALL send a 6-digit numeric code to that address (no URL link) when an account exists, and
SHALL answer identically (always 200) whether or not the email is registered so the endpoint never
reveals account existence — with ONE exception: the environment-provisioned administrator's email
SHALL be refused with 403 naming the environment provisioning (its password is set by the
deployment environment, not an in-app credential), and a confirm for that email is refused the
same way. Only one active, unexpired code may exist per user at a time — a new
request invalidates the previous one. Re-issues are additionally throttled per user: at most one
code per 60 seconds and at most five per UTC day; a request inside the cooldown or beyond the
daily cap is a silent no-op (still 200 — anti-enumeration preserved) that leaves the current
active code in place.

#### Scenario: Account exists

- **WHEN** a user requests a reset for a registered email
- **THEN** the backend emails a 6-digit code to that address, stores only its SHA-256 hash with a
  15-minute TTL, and answers 200

#### Scenario: Unknown email (anti-enumeration)

- **WHEN** a user requests a reset for an email that is not registered
- **THEN** the backend answers 200 with the same response as a known email and no code is sent —
  the UI cannot tell the two apart

#### Scenario: The provisioned admin's email is refused

- **WHEN** a reset is requested for the environment-provisioned administrator's email
- **THEN** the backend answers 403 naming the environment provisioning, sends nothing and stores
  no code, and a confirm for that email is refused with the same 403

#### Scenario: Second request invalidates the first

- **WHEN** a user requests a reset, then requests again before using the first code
- **THEN** the first code stops working and only the latest code is valid

#### Scenario: Re-issue inside the cooldown

- **WHEN** a user requests a reset again within 60 seconds of the previous issue
- **THEN** the backend answers 200, sends nothing, and the previously issued code stays the active
  one

#### Scenario: Daily cap reached

- **WHEN** a user has already had five reset codes issued within the current UTC day and requests
  another
- **THEN** the backend answers 200, sends nothing, and the current active code is unchanged

### Requirement: Confirm the reset with code + new password

The application SHALL let the user complete the reset by submitting the account email plus the
emailed code plus a new password to the confirm endpoint. The backend SHALL look up the account's
active code, validate the code hash, its expiry, its single-use status and its attempt limit —
so a 6-digit code cannot be brute-forced. A wrong, expired, over-limit or already-used code (and
an email that was never used in a request) SHALL be rejected with a generic 400 that never
discloses which check failed. On success the password SHALL be changed and every refresh token of
the user SHALL be revoked (all other sessions die).

#### Scenario: Correct code

- **WHEN** the user submits the request email, the active code and a new password within the TTL
- **THEN** the password is changed, the code is marked used, all refresh tokens are revoked, and
  the request succeeds

#### Scenario: Wrong code

- **WHEN** the user submits a code that does not match the stored hash
- **THEN** the backend rejects the request with a generic 400 and records one failed attempt

#### Scenario: Too many failed attempts

- **WHEN** more than the attempt limit of wrong codes has been submitted for one pending reset
- **THEN** the code is rejected with the same generic 400 and can no longer be used, even if the
  correct code is submitted later

#### Scenario: Expired or already-used code

- **WHEN** the code's 15-minute TTL has passed, or the code was already used
- **THEN** the request is rejected with the same generic 400 and the password is unchanged

### Requirement: In-page reset UI (no emailed link)

The reset page SHALL implement the whole flow without a URL token: enter email → the page shows
anti-enumeration copy and asks for the 6-digit code from the email → enter code + new password +
repeat → submit (the email from the request step is included in the confirm) → on success navigate
to the login page with a success hint. A rejected code SHALL surface as an inline banner using
generic copy that never echoes backend internals. The page SHALL no longer read a `token` query
parameter.

#### Scenario: Full happy path

- **WHEN** a user enters a registered email, receives the code, and submits email + code + matching
  new password
- **THEN** the reset succeeds and the user lands on `/login` with a "password reset" success state

#### Scenario: Invalid or expired code

- **WHEN** the user submits a wrong, expired or over-limit code
- **THEN** an inline banner explains the code is invalid or expired without echoing backend
  internals, and the form stays usable for another attempt

#### Scenario: Password mismatch

- **WHEN** the two password fields do not match
- **THEN** the form blocks submission and shows a mismatch error without calling the backend
