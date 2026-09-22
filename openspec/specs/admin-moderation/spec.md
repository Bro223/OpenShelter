# admin-moderation Specification

## Purpose
TBD - created by archiving change admin-moderation. Update Purpose after archive.

## Requirements

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

- **WHEN** the app restarts with the same env vars and the admin row
  already exists
- **THEN** the seeder changes nothing (no re-hash, no kind or claim
  changes) and the admin logs in with the password the row holds —
  set from ADMIN_PASSWORD at creation; the account's password is
  env-managed (the in-app reset flow is refused for it with 403)

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
rendered only for admins. The page SHALL have nine tabs — Unconfirmed
(the community review queue), Shelters (table with inline Hide/Activate
and Delete-with-confirm on user rows; registry rows read-only; text
search), Shelter reports (queue with dismiss; hidden-shelter rows
highlighted), Alerts, Users, Guidance, Media library, Settings and Audit
log — built on the existing design
tokens with 48px minimum action targets. The account page SHALL show an
"Admin" badge for the admin account.

#### Scenario: Admin sees the panel

- **WHEN** the admin is logged in and opens the app
- **THEN** the nav offers "Admin" and `/admin` renders the nine tabs

#### Scenario: Regular user never sees it

- **WHEN** a non-admin user is logged in
- **THEN** there is no Admin nav item and visiting `/admin` redirects to
  the map page

### Requirement: User suspension (admin)

The admin API SHALL expose `GET /admin/users` returning every
REGISTERED and ADMIN account (id, name, email, kind, suspendedAt) in
batched form, `POST /admin/users/{id}/suspend` and `POST
/admin/users/{id}/unsuspend` (204, idempotent — re-acting on an
already-suspended / already-active user is a no-op that records no
audit row). Only `kind = REGISTERED` accounts may be suspended;
ADMIN targets answer 403 (the environment-provisioned administrator
is the deployment's access path — disabling it is a lockout vector, so
it cannot be disabled at all), GUEST targets answer 409 (no
credentials to stop), unknown ids 404. A suspension
SHALL set `users.suspended_at` and record a `USER_SUSPEND` row in the
moderation audit trail (subject = the suspended account); the
unsuspend records `USER_UNSUSPEND` and clears the timestamp. A
suspended account's shelters SHALL remain on the map unchanged —
suspension stops the account, not its content.

#### Scenario: Admin suspends a registered user

- **WHEN** an admin posts `/admin/users/{id}/suspend` for a REGISTERED user
- **THEN** the response is 204, `users.suspended_at` is set, and the audit trail gains a `USER_SUSPEND` row with the account as subject

#### Scenario: Suspension is idempotent

- **WHEN** an admin suspends an already-suspended user
- **THEN** the response is 204, the timestamp is unchanged, and no audit row is written

#### Scenario: The provisioned admin cannot be suspended

- **WHEN** an admin posts suspend (or unsuspend) for the ADMIN row
- **THEN** the response is 403 naming the environment provisioning and nothing changes — no suspension stamp, no audit row

#### Scenario: Guest accounts cannot be suspended

- **WHEN** an admin posts suspend for a GUEST row
- **THEN** the response is 409 with a plain-spoken message and nothing changes

### Requirement: Suspension enforcement at the credential doors

A suspended account SHALL be refused at login (403, AFTER the
password verification — the refusal must not leak suspension state to
an unauthenticated caller), at refresh rotation (403, no new token
pair issued), and on every protected route: the JWT filter SHALL
re-check the suspension on a fresh user lookup per token-bearing
request and leave the user unauthenticated (401) while suspended.
The effect SHALL be immediate (no token-claim caching) and SHALL
persist across backend restarts (the flag is a column, not memory).

#### Scenario: Login of a suspended account is refused

- **WHEN** a suspended user submits correct credentials
- **THEN** the login answers 403 with a suspension message and no tokens are issued

#### Scenario: In-flight tokens die immediately

- **WHEN** a user is suspended while holding a valid access token
- **THEN** the user's next protected request answers 401 and a refresh attempt answers 403

#### Scenario: Unsuspend restores access

- **WHEN** an admin unsuspends the account
- **THEN** the same credentials log in successfully again

### Requirement: Shelter edit history (admin viewer)

The system SHALL append an immutable `shelter_history` row in the
same transaction as each USER-shelter lifecycle event: CREATED on
submission, EDITED on an owner PUT that changes at least one of
name/description/capacity/latitude/longitude/locationKind (a no-op
PUT records nothing; the row stores a `{"field": [old, new]}` JSON of
exactly the moved fields), and DELETED on a user or admin hard
delete. The row SHALL snapshot the shelter name and name the actor
(submitter or moderating admin); `shelter_id` SHALL carry no FK (a
referential action cannot keep the delete's own row findable by the
shelter id — SET NULL would orphan it, NO ACTION would block the
delete; the id dangles legally, the V11 moderation_actions convention)
and `actor_user_id` SHALL carry no FK, so the history of a
deleted shelter and of a deleted account survives. `GET
/admin/shelters/{id}/history` SHALL return a row's events ascending
with batched actor names and server-parsed field changes; it SHALL
answer 404 only when the shelter is absent AND no history exists.
Registry import rows SHALL not create history rows (the import keeps
its own `data_imports` audit).

#### Scenario: Owner edit is recorded as a diff

- **WHEN** a submitter PUTs a change to name and capacity of their shelter
- **THEN** the history gains an EDITED row whose changes contain exactly `name` and `capacity` with old/new values, attributed to the submitter

#### Scenario: No-op PUT records nothing

- **WHEN** a submitter PUTs the same values back
- **THEN** no history row is written

#### Scenario: History of a deleted shelter survives

- **WHEN** an admin hard-deletes a shelter that has history
- **THEN** the history endpoint for that id still returns the events (snapshot name, DELETED last), 404 only for an id with neither shelter nor history

### Requirement: Information request to the submitter (admin)

The admin API SHALL expose `POST /admin/shelters/{id}/request-info
{message}` (USER rows only, 409 registry) storing a
moderator→submitter information request on the shelter, and the
submitter SHALL see the pending request on their own shelter rows
and answer ONCE via `POST /api/shelters/{id}/info-request/reply
{message}` (author only). The request row SHALL be kept after the
reply (audit posture) and SHALL be visible to the admin together
with the reply.

#### Scenario: Moderator requests details

- **WHEN** an admin posts a request-info with a message for a USER shelter
- **THEN** the submitter's list of own rows shows the request and the admin can see it with the reply once given

#### Scenario: The submitter answers once

- **WHEN** the author replies to an open request
- **THEN** the reply is stored and a second reply is refused (409)

### Requirement: Mark a shelter inaccurate (admin)

The admin API SHALL expose `POST /admin/shelters/{id}/mark-inaccurate
{reason?}` and `POST /admin/shelters/{id}/clear-inaccurate` (USER
rows only, 409 registry, idempotent, audited). A marked shelter
SHALL remain visible (status and provenance untouched) but SHALL
carry `inaccurate: true` on its public DTOs and render the
single-sourced warning "Reported inaccurate — details may be wrong"
on the surfaces that render the unverified treatment (map row,
detail header, my rows, admin list).

#### Scenario: Marking keeps the row visible

- **WHEN** an admin marks a shelter inaccurate
- **THEN** the shelter stays ACTIVE on the public list with `inaccurate: true` and the FE surfaces the warning text

#### Scenario: Clearing removes the mark

- **WHEN** an admin clears the mark
- **THEN** `inaccurate` is false again and the warning disappears

### Requirement: Audit trail renders user-scoped subjects

The moderation audit trail SHALL support rows without a shelter:
`moderation_actions.shelter_id` SHALL be nullable and a new
`subject_user_id` (no FK) SHALL name the target account for
user-scoped actions. The admin audit projection SHALL resolve the
subject in a batched lookup and render "Account: name (email)"
("Deleted account" after erasure) in the shelter-name slot; the
frontend audit tab SHALL label the column "Subject" and SHALL show
"User suspended" / "User unsuspended" for the new actions.

#### Scenario: Suspension appears in the audit trail

- **WHEN** an admin opens the audit tab after suspending a user
- **THEN** the newest rows include the suspension with the account rendered as subject and the moderator named
