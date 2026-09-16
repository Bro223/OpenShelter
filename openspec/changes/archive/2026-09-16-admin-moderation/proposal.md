## Why

There is no way today to manage the trust layer this sibling change
introduces: user submissions are only editable by their own submitter,
auto-hidden shelters have no one who can restore them, and report queues
(shelter and review) would accumulate with no one able to see or act on
them. The app needs a single admin, provisioned from environment config
(the admin mailbox does not exist and can never pass email verification),
with a moderation panel covering user shelters, shelter reports, and
review reports.

## What Changes

- **Env-provisioned admin**: new env vars `ADMIN_EMAIL` and
  `ADMIN_PASSWORD` (both optional, no defaults — unset means "no admin
  exists" and the app runs exactly as today). On startup an idempotent
  seeder creates the admin user (kind `ADMIN`, all contact claims
  pre-verified so no email/SMS verification is needed) **only if a user
  with that email does not already exist** — it never overwrites an
  existing user, so an in-app password change survives restarts and
  deployments. The admin logs in through the normal `/auth/login`.
- **Admin detection**: `GET /account/me` gains `isAdmin`; admin
  authorization is a fresh `UserKind` lookup per `/admin/*` request
  (no role claim in the JWT, so de-provisioning takes effect immediately).
- **Admin API** (`/admin/*`, 403 for non-admins, 404 for unknown ids):
  - `GET /admin/shelters` — every shelter incl. hidden, with report
    counts, occupancy, and source
  - `POST /admin/shelters/{id}/status` — `ACTIVE`/`INACTIVE` (manual
    hide/restore; restore disarms auto-hide per the reports change)
  - `DELETE /admin/shelters/{id}` — hard delete of a user shelter
    (cascade), the only path for a USER row
  - `GET /admin/reports` — shelter report queue (type, shelter, reporter
    identity, age)
  - `POST /admin/reports/{id}/dismiss` — mark a shelter report resolved
    (keeps the row, records the dismissal)
- **Registry rows are read-only for admins** (`POST .../status` and
  `DELETE` on registry rows → 409): the registry import owns their
  lifecycle and rebuilds them as `ACTIVE` on every run, so admin edits
  would silently revert — the provenance story stays intact.
- **Admin UX**: a new `/admin` route (nav item visible only when
  `isAdmin`), three tabs — Shelters (table with inline activate/hide/
  delete), Shelter reports (queue with dismiss) — built on the existing tokens and 48px target
  rules.
- **Exemptions**: the admin is exempt from the 10-shelter submission cap
  (the reports change already scopes this); admin accounts cannot be
  created or deleted through any user-facing endpoint.

## Capabilities

### New Capabilities

- `admin-moderation`: admin provisioning from env, admin authorization,
  the moderation API surface, and the admin UI.

### Modified Capabilities

- `account-profile`: `GET /account/me` response gains `isAdmin`.

## Impact

- Affected specs: `admin-moderation` (new), `account-profile`.
- Affected code: backend — `AdminSeeder` (ApplicationRunner, idempotent),
  `AdminController` + service, `AccountDto` (+`isAdmin`), authorization
  guard. Frontend — `/admin` feature (route guard, three tabs), nav item,
  account session store field, API client. Config — `.env` dev values
  (`ADMIN_EMAIL=admin@openshelter.ee`, `ADMIN_PASSWORD=admin`),
  application.yml env declarations (empty defaults).
- No breaking API changes; all `/admin/*` routes are additive and gated.
- Docs sync: backend agent pack (admin section, seeder semantics,
  endpoint table), frontend agent pack (/admin page), puml admin flow +
  user-kind diagram update, README env table row.
