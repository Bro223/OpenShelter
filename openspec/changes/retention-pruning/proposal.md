# retention-pruning proposal

## Why

The legal-recovery change shipped data export and immediate account
erasure, but its last open task — the retention rules — was an owner
product call (logged 2026-09-13, undecided): whether to run any
calendar-based retention at all. The owner has now decided: accounts
with no sign-in activity for 24 months are pruned, moderation/audit
records older than 24 months are pruned, and data export and account
erasure stay immediate (unchanged). This change implements that
decision.

## What Changes

- V24 migration: `users.last_activity_at` (TIMESTAMPTZ, NOT NULL,
  backfilled from the account-creation stamp so no row is ever NULL,
  `DEFAULT now()` backstop, index) plus the `retention_runs` audit
  table.
- Activity is stamped on the existing auth paths: register, login, and
  refresh rotation (admin provisioning stamps too); a persistence
  backstop guarantees no user row is ever written NULL.
- A daily scheduled prune (Spring `@Scheduled`, mirroring the registry
  sync), OFF by default behind `app.retention.enabled` /
  `RETENTION_ENABLED`; horizons via `RETENTION_INACTIVE_ACCOUNT_MONTHS`
  (24) and `RETENTION_AUDIT_MONTHS` (24).
- The prune reuses the `DELETE /account` erasure (purge private rows,
  orphan public rows, cascade the rest) — never a raw
  `DELETE FROM users`; an ADMIN account is never pruned (query +
  domain-kind double gate).
- One durable run row (`retention_runs`) + one log line per run — the
  registry import's background-mutation audit pattern.
- The privacy page states the decided horizons and distinguishes the
  rule (app policy) from the mechanism (deployment-gated job).

## Capabilities

### New Capabilities

- `data-retention`: the retention horizons, the last-activity stamp,
  the config-gated prune job, its erasure semantics, and its audit.

### Modified Capabilities

- (none — legal-recovery's export and immediate-erasure behavior is
  unchanged)

## Impact

- Code: new `ee.sheltermap.retention` package (properties, service,
  scheduler, run-log seam); `lastActivityAt` on the `User` domain /
  `UserEntity` + mapper; `UserRepository` + `ModerationAuditLog` seam
  methods; auth-path stamps (`AuthService`, `JwtTokenService`,
  `AdminSeeder`); `JpaUserRepository` NULL backstop.
- Schema: V24 (new column + backfill + index, new table). No other
  migration touched.
- Config: `app.retention.*` keys (env `RETENTION_ENABLED`,
  `RETENTION_INACTIVE_ACCOUNT_MONTHS`, `RETENTION_AUDIT_MONTHS`).
- Docs: privacy page retention section (this change); the README/docs
  sync — including the Flyway range guard that tracks the new V24 — is
  owner-owed and out of scope here.
