# Spec Delta: admin-moderation (admin-moderation)

## ADDED Requirements

### Requirement: Admin provisioning from environment

The system SHALL read `ADMIN_EMAIL` and `ADMIN_PASSWORD` from
environment configuration (empty defaults). When both are set, a startup
seeder SHALL create a user with that email if and only if no user with
the email already exists: kind `ADMIN`, all contact verification claims
pre-set (the account is fully writable without passing email/SMS
verification), password derived from `ADMIN_PASSWORD` with the standard
encoder. The seeder SHALL NEVER modify an existing user (no re-hashing,
no kind or claim changes). When either variable is unset, no admin user
SHALL be created and the application SHALL behave exactly as if this
capability were absent. The admin SHALL authenticate through the normal
`/auth/login` with no dedicated endpoint.

#### Scenario: First start with both vars set

- **WHEN** the app starts with `ADMIN_EMAIL` and `ADMIN_PASSWORD` set and
  no user has that email
- **THEN** an `ADMIN` user is created and can log in immediately without
  any verification step

#### Scenario: Restart never touches the existing admin

- **WHEN** the admin has changed their password in the app and the app
  restarts with the same env vars
- **THEN** the seeder changes nothing and the admin logs in with the new
  password

#### Scenario: Vars unset means no admin

- **WHEN** the app starts with `ADMIN_EMAIL` unset
- **THEN** no admin user is created, `/admin/*` answers 403 for every
  authenticated user, and no admin UI is offered

### Requirement: Admin authorization

Every `/admin/*` endpoint SHALL authorize by loading the caller's user
from the JWT principal and requiring `UserKind.ADMIN` (fresh lookup per
request; no role claim in the JWT). Anonymous callers SHALL receive 401;
authenticated non-admins 403. `GET /account/me` SHALL include
`isAdmin` (boolean) so the frontend can gate the admin route and nav
item.

#### Scenario: Non-admin is rejected

- **WHEN** a verified non-admin user calls any `/admin/*` endpoint
- **THEN** the request fails with 403 and no admin data is returned

#### Scenario: Demotion is immediate

- **WHEN** a user's kind is changed away from ADMIN
- **THEN** their next `/admin/*` request fails with 403 even if their
  JWT is still valid

### Requirement: Shelter moderation

`POST /admin/shelters/{id}/status` with body `{"status": "ACTIVE" |
"INACTIVE"}` SHALL set the shelter's status (manual hide/restore); a
restore SHALL count as the manual status change that disarms
auto-re-hide (per the shelter-reports spec). `DELETE /admin/shelters/{id}`
SHALL hard-delete the shelter with cascade (reports, occupancy rows).
Both SHALL accept only `source=USER` rows — registry rows SHALL
be rejected with 409 and carry no admin actions in the UI (the registry
import owns their lifecycle and rebuilds them as ACTIVE on every run).
`GET /admin/shelters` SHALL list every shelter including hidden ones,
with report counts, status flag, occupancy, and the submitter's profile
name, filterable by status/source and by name/address substring `q`.
Unknown ids SHALL answer 404.

#### Scenario: Admin restores an auto-hidden shelter

- **WHEN** the admin sets an auto-hidden user shelter to ACTIVE
- **THEN** the shelter reappears in the public list and later
  non-existence reports no longer auto-hide it

#### Scenario: Admin deletes a spam shelter

- **WHEN** the admin hard-deletes a user shelter
- **THEN** the shelter and its report rows are gone and the public
  list is clean

#### Scenario: Registry rows are not admin-manageable

- **WHEN** the admin attempts to change status or delete a registry row
- **THEN** the request fails with 409 explaining that registry rows are
  import-owned

### Requirement: Report queue moderation

`GET /admin/reports` SHALL return the shelter report queue (type,
shelter reference, reporter profile name and email, age) newest first.
`POST /admin/reports/{id}/dismiss` SHALL mark a report resolved
(idempotent). Unknown ids SHALL answer 404.

#### Scenario: Admin works through the queue

- **WHEN** the admin opens the report queue, dismisses a false
  `NON_EXISTENT` report, and later restores the auto-hidden shelter
- **THEN** the shelter is public again and the dismissed report stays
  recorded as resolved

### Requirement: Admin UI

The frontend SHALL provide a `/admin` route, reachable only for
`isAdmin` users (non-admin visit → redirect to `/`), with a nav item
rendered only for admins. The page SHALL have two tabs — Shelters
(table with inline Hide/Activate and Delete-with-confirm on user rows;
registry rows read-only; text search) and Shelter reports (queue with
dismiss; hidden-shelter rows highlighted) — built on the existing design
tokens with 48px minimum action targets. The account page SHALL show an
"Admin" badge for the admin account.

#### Scenario: Admin sees the panel

- **WHEN** the admin is logged in and opens the app
- **THEN** the nav offers "Admin" and `/admin` renders the two tabs

#### Scenario: Regular user never sees it

- **WHEN** a non-admin user is logged in
- **THEN** there is no Admin nav item and visiting `/admin` redirects to
  the map page
