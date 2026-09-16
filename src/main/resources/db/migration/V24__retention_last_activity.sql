-- Shelter Map — V24 (retention-pruning): last-activity stamp on accounts.
--
-- The owner's retention decision (legal-recovery slice 4, decided
-- 2026-09-16): accounts with no sign-in activity for 24 months, and
-- moderation/audit records older than 24 months, are pruned by a daily
-- job. The job is config-gated (app.retention.enabled / RETENTION_ENABLED,
-- off by default) — whoever operates a deployment enables it.
--
-- The job compares users.last_activity_at against the horizon, so EVERY
-- existing row must carry a value: a NULL reads as "inactive since
-- forever", and the first run would delete every account. The backfill
-- below seeds every row from the account's creation stamp —
-- user_credentials.created_at (users itself has no created_at column; the
-- credentials row is written in the same transaction as the
-- registration, so it is the account-creation instant) — so an existing
-- account's 24-month idle clock starts at the moment the account was
-- created. Rows without a credentials row (legacy GUEST rows) fall back
-- to now(): they have never signed in, and the job only ever prunes
-- REGISTERED accounts (ADMIN is never a candidate), so the fallback can
-- never cause a wrongful erase.
--
-- NOT NULL + DEFAULT now(): the auth paths stamp the column explicitly
-- (register, login, refresh rotation, admin provisioning); the DB
-- default is the backstop so no other insert path can ever write a
-- NULL. The index backs the daily prune query.
ALTER TABLE users ADD COLUMN last_activity_at TIMESTAMPTZ;
UPDATE users u
    SET last_activity_at = c.created_at
    FROM user_credentials c
    WHERE c.user_id = u.id;
UPDATE users SET last_activity_at = now() WHERE last_activity_at IS NULL;
ALTER TABLE users ALTER COLUMN last_activity_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_activity_at SET DEFAULT now();
CREATE INDEX idx_users_last_activity_at ON users (last_activity_at);

-- One audit row per retention run — the durable background-mutation
-- audit pattern the registry import sets (data_imports): what the run
-- pruned, when, and whether it failed. The log line alone is not
-- durable (logs rotate); this row outlives the operator's session.
CREATE TABLE retention_runs (
    id                BIGSERIAL  PRIMARY KEY,
    ran_at            TIMESTAMPTZ NOT NULL,
    accounts_pruned   INT         NOT NULL,
    audit_rows_pruned INT         NOT NULL,
    status            VARCHAR(16) NOT NULL,            -- OK | FAILED
    error_message     VARCHAR(1000)                     -- failure reason for FAILED runs
);
