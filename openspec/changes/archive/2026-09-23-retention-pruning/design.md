# Design — retention-pruning

## D1 — The decision (owner product call, legal-recovery slice 4)

The owner decided the horizons on 2026-09-16:

1. Accounts with no sign-in activity for **24 months** are pruned.
2. Moderation/audit records older than **24 months** are pruned.
3. Data export and account erasure stay **immediate** — unchanged;
   nothing in this change touches `DELETE /account` or
   `GET /account/export`.

"Sign-in activity" is the app's existing credential use: registration,
a successful login, and a refresh-token rotation. Password-reset
attempts are deliberately not activity — a reset attempt on a dormant
account is exactly the signal the horizon exists to expire, and the
reset flow already revokes sessions.

## D2 — `users.last_activity_at`: why the backfill exists

The job prunes by comparing `last_activity_at` against the horizon. A
NULL there reads as "inactive since forever", so a single NULL would
make the **first enabled run delete that account** — and if a column
were ever written NULL in bulk, the first run would delete every
account. The migration therefore:

- adds `last_activity_at TIMESTAMPTZ`;
- backfills every existing row from the account-creation stamp —
  `user_credentials.created_at` (the `users` table has no `created_at`
  column; the credentials row is written in the same transaction as
  the registration, so it is the account-creation instant). An
  existing account's idle clock starts at creation, which is the only
  creation-time fact the schema keeps;
- falls back to `now()` for rows without a credentials row (legacy
  GUEST rows — they have never signed in and are never prune
  candidates, since only REGISTERED accounts qualify);
- makes the column `NOT NULL` with `DEFAULT now()` so no future insert
  path can smuggle a NULL in (the constraint is the durable guard; the
  app paths stamp explicitly).

The backfill is tested against a real V1→V23 legacy schema in
`RetentionBackfillIT` (throwaway Postgres, manual Flyway): every row
non-NULL, credentials rows stamped at creation time, the explicit-NULL
insert refused.

## D3 — Where activity is stamped

The existing auth paths, per the decision's "sign-in activity"
vocabulary:

- **register** — `AuthService.register` stamps after the atomic
  profile+credentials create (a fresh account must not start life
  "inactive");
- **login** — `AuthService.login` stamps after the credential +
  existence + suspension checks pass, before tokens are issued (a
  failed login is not activity);
- **refresh** — `JwtTokenService.refresh` stamps after the rotation
  claim succeeds and the suspension check passes;
- **admin provisioning** — `AdminSeeder` stamps at create time
  (administrative completeness; the admin is never a prune candidate).

The stamp is a **column-only write** (`UserRepository.markActive` →
bulk JPQL update), mirroring the `isSuspended` column-only convention:
login/refresh run on every credential use and must not pay a full
aggregate re-save (PII re-encryption, claim diff). The domain
`User.lastActivityAt` field (the `suspendedAt` idiom) round-trips
through the mapper so a profile save never clobbers the clock, and
`JpaUserRepository.save` backfills a null stamp with the injected
`Clock` as the last-resort guarantee that no row is ever written NULL
(the auth paths stamp explicitly; the backstop covers every other
save — test fixtures, future creation paths). All timestamps come from
the injected `Clock`; nothing in `src/main` reaches for the wall clock.

## D4 — Why the job is config-gated

A retention job is destructive, so it ships dark:

- `app.retention.enabled` / `RETENTION_ENABLED`, **default false**.
  The `RetentionScheduler` bean is
  `@ConditionalOnProperty(havingValue = "true", matchIfMissing = false)`
  — the inverted registry-sync idiom: off in this repository's dev
  config, and whoever operates a deployment opts in explicitly.
- Defense in depth: even a direct `RetentionService.prune(now)` call
  with the flag off is a no-op that reads nothing, writes nothing, and
  logs nothing — a disabled deployment must not trail a log line every
  day, and must not touch the database.
- Scheduling mirrors `RegistryScheduler`: Spring's built-in
  `@Scheduled` (single instance, no clustering/lock infrastructure),
  daily at 03:30 Europe/Tallinn — offset from the registry import's
  03:00 so the two background mutations never share a minute —
  overridable via `app.retention.cron` / `app.retention.zone`.

## D5 — Erasure reuses `DELETE /account`; the admin carve-out

Pruning an account calls `AccountService.deleteAccount(user)` — the
legal-recovery split rule (purge PRIVATE rows, orphan PUBLIC rows,
redact free-text audit reasons, erase the user row and let the DB
cascades do the rest). A raw `DELETE FROM users` is never issued: the
orphaned-public-rows guarantee and the audit-reason redaction would
both be lost. Each account erasure runs in its **own transaction**
(a failure on one account must not roll back the ones already
erased).

An ADMIN account is never pruned, enforced twice: the candidate query
selects `kind = REGISTERED` only (ADMIN and GUEST rows never come
back), and the service re-checks the domain kind
(`candidate instanceof AdminUser → skip`) — the domain class is the
kind truth (`UserMapper.kindOf`), so the second gate holds even if a
future query change lets an admin through the first.

## D6 — Which "moderation/audit records" are pruned

The owner's "moderation/audit records" maps to the append-only
moderation audit trail — `moderation_actions` — pruned in one bulk
delete (`created_at < cutoff`, its own transaction). The other logs
are deliberately out of scope:

- `report_actions` is a throttle ledger that also feeds the derived
  trust weight — pruning it changes trust math, not retention;
- `shelter_history` / `shelter_info_requests` are feature data (edit
  history, Q&A), not moderation audit;
- `data_imports` is import provenance — the CSV client's
  `If-Modified-Since` and the public "last import" read depend on it.

Known consequence, accepted with the horizon: a shelter whose only
CONFIRM/AUTO_CONFIRM row is older than 24 months loses its "last
verified" stamp when that row is pruned (the trail is pruned; nothing
re-derives the stamp from pruned rows).

## D7 — Run audit + log line (the background-mutation pattern)

The registry import's pattern for a background mutation: a durable
audit row per run + a logged result. Followed here:

- `retention_runs` (V24): `ran_at`, `accounts_pruned`,
  `audit_rows_pruned`, `status` (OK | FAILED), `error_message` — the
  `data_imports` shape. A FAILED run records the PARTIAL account count
  (the failure stops the loop mid-way; the audit prune has not run yet
  on a FAILED run, so `audit_rows_pruned` is 0).
- One `log.info` line summarizing the prune (and `log.error` on
  failure) — the run must not throw out of the scheduler.
- The `ThrottleAlertRecorder` ring is NOT the right home: it is an
  in-memory abuse-triage surface (429/409 events, process-local), and
  a job-run summary that survives restarts belongs in a table.
