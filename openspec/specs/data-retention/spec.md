# data-retention Specification

## Purpose
Data retention for the shelter service: last-activity stamping on every
auth path, a config-gated job that erases accounts idle beyond the 24-month
horizon (admins never), bounded moderation-audit retention, and a retention
run audit row per run.

## Requirements

### Requirement: Last-activity stamping

The system SHALL record sign-in activity on every user row:
registration, a successful login, and a refresh-token rotation each
stamp `users.last_activity_at` with the current time (injected
`Clock`). The column SHALL be `NOT NULL`; the V24 migration SHALL
backfill every pre-existing row from the account-creation stamp
(`user_credentials.created_at`, falling back to the migration time for
rows without a credentials row) so that no row can read as
"inactive since forever".

#### Scenario: Registration stamps the first activity

- **WHEN** a user registers
- **THEN** the new user row carries `last_activity_at` equal to the
  registration time

#### Scenario: Login and refresh restart the idle clock

- **WHEN** an account registered long ago logs in or rotates a refresh
  token
- **THEN** `last_activity_at` is updated to that login/refresh time,
  while a failed login leaves it unchanged

#### Scenario: The backfill leaves no NULL

- **WHEN** V24 is applied to a database with pre-existing users
- **THEN** every user row carries a non-NULL `last_activity_at`
  (credentials-backed rows stamped at account creation, others at the
  migration time), and an explicit NULL insert is refused

### Requirement: Inactive-account retention

A scheduled job, OFF by default and enabled only via
`app.retention.enabled` (env `RETENTION_ENABLED`), SHALL prune
REGISTERED-kind accounts whose last sign-in activity is older than
`app.retention.inactive-account-months` (default 24), erasing each
through the `DELETE /account` erasure (private rows purged, public
rows orphaned, child rows cascaded) — never a raw `DELETE FROM users`.
An ADMIN account SHALL never be pruned, no matter how idle.

#### Scenario: An account idle beyond the horizon is erased

- **WHEN** the job runs and an account's last activity is 25 months
  old
- **THEN** the account is erased with the account-deletion semantics:
  its declared private shelters are removed, its public shelters
  remain with `created_by` NULL, and credentials/claims/tokens are
  gone

#### Scenario: An account inside the horizon is kept

- **WHEN** the job runs and an account's last activity is 23 months
  old
- **THEN** the account and all of its rows are untouched

#### Scenario: An admin is never pruned

- **WHEN** the job runs and an ADMIN account's last activity is
  arbitrarily old
- **THEN** the admin account is untouched while qualifying registered
  accounts in the same run are erased

#### Scenario: A disabled job prunes nothing and logs nothing

- **WHEN** `RETENTION_ENABLED` is false (the default in this
  repository's dev config)
- **THEN** the scheduler bean does not exist, a direct prune call is a
  no-op that touches no rows, and no run row or log line is produced

### Requirement: Moderation-audit retention

The job SHALL prune `moderation_actions` rows older than
`app.retention.audit-months` (default 24) in one bulk delete, keeping
newer rows.

#### Scenario: Old audit rows are pruned, newer ones survive

- **WHEN** the job runs with audit rows 25 months old and 1 month old
- **THEN** the 25-month row is deleted and the 1-month row remains

### Requirement: Retention run audit

Each run of the enabled job SHALL write one durable `retention_runs`
row (`ran_at`, `accounts_pruned`, `audit_rows_pruned`, `status` OK |
FAILED, `error_message`) and log one summary line. A run that fails
mid-way SHALL still leave a FAILED row carrying the partial account
count, and SHALL NOT propagate the failure to the scheduler.

#### Scenario: A successful run is recorded

- **WHEN** the job erases one account and prunes one audit row
- **THEN** a `retention_runs` row with `status OK` and both counts
  equal to 1 exists, and one log line summarizes the run

#### Scenario: A failed run is recorded with the partial count

- **WHEN** the account loop fails after one successful erasure
- **THEN** a `retention_runs` row with `status FAILED`, the partial
  account count, and the failure reason exists
