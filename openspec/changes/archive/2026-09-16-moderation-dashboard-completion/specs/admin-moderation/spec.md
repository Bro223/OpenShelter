# Spec Delta: admin-moderation (moderation-dashboard-completion, M10)

## ADDED Requirements

### Requirement: User suspension (admin)

The admin API SHALL expose `GET /admin/users` returning every
REGISTERED and ADMIN account (id, name, email, kind, suspendedAt) in
batched form, `POST /admin/users/{id}/suspend` and `POST
/admin/users/{id}/unsuspend` (204, idempotent — re-acting on an
already-suspended / already-active user is a no-op that records no
audit row). Only `kind = REGISTERED` accounts may be suspended;
ADMIN and GUEST targets answer 409, unknown ids 404. A suspension
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

#### Scenario: Admin and guest accounts cannot be suspended

- **WHEN** an admin posts suspend for an ADMIN or GUEST row
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
