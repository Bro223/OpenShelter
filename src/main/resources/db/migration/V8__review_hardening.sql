-- Shelter Map — V8 (2026-09-08 review hardening pass).
-- 1) password_reset_tokens.token_hash is no longer UNIQUE: the service keeps
--    ONE ACTIVE code per user (delete-then-insert), but USED and EXPIRED
--    history rows are pruned only opportunistically — the old unique
--    constraint served no security purpose (codes are random and hashed)
--    and would collide if two users ever draw the same 6-digit code.
--    (refresh_tokens.token_hash stays UNIQUE — a refresh token must be
--    redeemable exactly once by exactly one row.)
-- 2) password_reset_tokens.created_at: anchors the per-user reset-rotation
--    cooldown (>= 60 s) and the per-UTC-day reissue cap (5) — rotation
--    brute-force guard (S1b). Existing rows are backfilled with now() by
--    the column default.
-- 3) users.email uniqueness becomes case-insensitive (lower(email)): login
--    lookup is case-insensitive and registration lower-cases before the
--    uniqueness check, so a case-variant duplicate could bypass the
--    case-sensitive index and later break findByEmail (backend nit N14).
-- 4) shelters.version: optimistic-lock counter for concurrent author edits
--    (user-contributions PUT race -> 409 via OptimisticLockException).
-- ddl-auto=validate must stay green against these definitions.

-- (1) Drop the unique constraint on reset-code hashes (V1 inline UNIQUE).
ALTER TABLE password_reset_tokens
    DROP CONSTRAINT password_reset_tokens_token_hash_key;

-- (2) Creation time for rotation protection (S1b).
ALTER TABLE password_reset_tokens
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- (3) Case-insensitive unique email (replaces the V3 uq_users_email index).
DROP INDEX uq_users_email;
CREATE UNIQUE INDEX uq_users_email_ci ON users (lower(email)) WHERE email IS NOT NULL;

-- (4) Optimistic locking for shelters.
ALTER TABLE shelters ADD COLUMN version BIGINT NOT NULL DEFAULT 0;
