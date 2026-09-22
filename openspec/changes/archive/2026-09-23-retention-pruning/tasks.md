# Tasks — retention-pruning

## Phase 1 — schema + domain

- [x] V24 migration: `users.last_activity_at` (NOT NULL, DEFAULT
      now(), index) backfilled from `user_credentials.created_at`
      (creation fallback for credential-less rows) + `retention_runs`
      table
- [x] `User.lastActivityAt` (the `suspendedAt` domain-field idiom,
      `markActive(Instant)`), `UserEntity` + `UserMapper` round-trip
- [x] `UserRepository.markActive` + `findInactiveBefore` seams,
      Spring Data + JPA impls, in-memory fake
- [x] `JpaUserRepository.save` backstops a null stamp with the
      injected `Clock` (no row ever written NULL)

## Phase 2 — stamping the existing auth paths

- [x] register (AuthService) + admin provisioning (AdminSeeder) stamp
      at creation
- [x] login (AuthService) + refresh rotation (JwtTokenService) stamp
      on success (failed logins do not count)

## Phase 3 — the config-gated job

- [x] `RetentionProperties` (`app.retention.*`; env
      `RETENTION_ENABLED` default false,
      `RETENTION_INACTIVE_ACCOUNT_MONTHS` / `RETENTION_AUDIT_MONTHS`
      default 24, cron + zone) + `application.yml` dev config
      (disabled) + `SecurityConfig` registration
- [x] `RetentionService.prune`: disabled no-op (no rows, no log, no
      run row); REGISTERED-kind candidates only + domain-kind double
      gate against ADMIN; `AccountService.deleteAccount` per account
      in its own transaction; bulk `moderation_actions` prune;
      OK/FAILED run rows + one log line
- [x] `RetentionScheduler` — `@Scheduled` cron (03:30 Europe/Tallinn),
      `@ConditionalOnProperty(havingValue = "true", matchIfMissing =
      false)`, injected `Clock`
- [x] run audit: `RetentionRunLog` seam + `retention_runs` entity /
      repository / JPA impl + in-memory fake

## Phase 4 — tests (fixed clock / fixed date 2026-09-16)

- [x] unit: 25-month idle erased via the erasure seam / 23-month
      kept; admin (60 months) never pruned; audit 25-month pruned /
      1-month kept; disabled no-op (zero seam calls, no row, no log);
      FAILED run row with the partial count
- [x] integration: prune against Testcontainers Postgres (rows,
      orphaned public shelters, cascaded credentials, `retention_runs`
      counts); backfill against a real V1→V23 legacy schema (no NULL,
      creation-stamp values, NOT NULL refuses an explicit NULL);
      scheduler bean gating on/off; disabled-by-default app context
- [x] stamping tests: register, login, and refresh each advance
      `lastActivityAt`
- [x] privacy page: decided horizons stated, rule vs
      deployment-gated mechanism, spec updated (never deleted)

## Phase 5 — owner-owed follow-ups (NOT in this change's scope)

- [x] Spec sync: the archived `legal-recovery` spec's "Legal pages" requirement still
      stated "retention is for the life of the account with no automatic deletion of
      inactive accounts yet" — superseded by this decision and updated in place
- [x] README/docs sync: the `DocumentationFactsTest` Flyway-range
      guard now expects `V1`–`V24` in README.md (this change adds
      V24; the README update is owner-owed)
- [ ] enabling the job in a real deployment (set
      `RETENTION_ENABLED=true` there; consider a first-run review of
      the `retention_runs` rows)
