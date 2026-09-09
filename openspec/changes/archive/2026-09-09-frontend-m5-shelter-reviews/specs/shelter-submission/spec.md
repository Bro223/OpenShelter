## Purpose

Verified-user creation of community shelters: a guarded form with an Estonia-bounded location
pick, optional description and capacity, and navigation to the new shelter's detail page after
creation.

## ADDED Requirements

### Requirement: Verified-only submission route

The application SHALL expose a `/submit` route guarded so that only authenticated users who hold
at least one verification claim can reach the submission form; others are redirected or prompted
according to the same auth/verification rules used elsewhere.

#### Scenario: Anonymous user opens /submit

- **WHEN** a signed-out user navigates to `/submit`
- **THEN** they are redirected to log in, preserving `/submit` as the return destination

#### Scenario: Signed-in unverified user opens /submit

- **WHEN** an authenticated user without a verification claim navigates to `/submit`
- **THEN** they are directed to the verification flow instead of the form

#### Scenario: Verified user opens /submit

- **WHEN** a verified user navigates to `/submit`
- **THEN** the submission form is shown

### Requirement: Submission form with location pick

The submission form SHALL collect a shelter name (required, ≤ 200 chars), an optional description
(≤ 2000 chars), an optional capacity (1–100 000), and a location chosen by clicking on a map
(alongside numeric latitude/longitude entry). The location SHALL be pre-checked client-side
against the Estonia bounding box for instant feedback; the backend re-checks and rejects
out-of-bounds points.

#### Scenario: Form fields and bounds

- **WHEN** a verified user fills the form with valid values inside Estonia
- **THEN** submission is enabled and no validation errors are shown

#### Scenario: Client-side Estonia pre-check

- **WHEN** a user picks a location outside Estonia
- **THEN** an immediate inline validation error is shown before the request is sent

#### Scenario: Out-of-range capacity

- **WHEN** capacity is outside 1–100 000 or negative
- **THEN** the form shows an inline validation error and does not submit

### Requirement: Successful creation navigates to the detail page

When the backend accepts the submission (201 with Location), the application SHALL navigate the
user to the new shelter's detail page (`/shelters/{newId}`).

#### Scenario: Shelter created

- **WHEN** a verified user submits a valid shelter and the backend returns 201
- **THEN** the application navigates to that shelter's detail page showing the created community
  shelter (source USER, ACTIVE)

### Requirement: Server rejection surfaces as a banner

If the backend rejects the submission (401 anonymous, 403 no-longer-verified, 400 out-of-Estonia
or invalid), the application SHALL show the error message through the shared banner and keep the
user on the form with their input intact.

#### Scenario: Verification revoked between check and submit

- **WHEN** the backend rejects with 403 despite the guard passing
- **THEN** the user sees the 403 message with a path back to verification, and the form input is
  preserved
