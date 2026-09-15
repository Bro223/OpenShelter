-- Shelter Map — V3.
-- 1) users.email / users.phone become UNIQUE — duplicate registration must be
--    impossible at the DB level (the API also pre-checks and answers 409).
-- 2) shelters gain description + capacity — validated at the boundary and
--    then stored.
-- 3) at most ONE ACTIVE verification claim per (user, level) — the invariant
--    that keeps concurrent confirms from producing duplicate active claims.
-- ddl-auto=validate must stay green against these definitions.

-- (1) Unique identity for login lookups.
-- The old plain indexes are superseded by the unique ones — drop them so the
-- table does not carry redundant indexes.
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_phone;
CREATE UNIQUE INDEX uq_users_email ON users (email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_users_phone ON users (phone) WHERE phone IS NOT NULL;

-- (2) User-submitted shelter details.
ALTER TABLE shelters
    ADD COLUMN description VARCHAR(2000),
    ADD COLUMN capacity    INT;

-- (3) One active claim per user per level (revoked history rows still allowed).
CREATE UNIQUE INDEX uq_verification_claims_user_level_active
    ON verification_claims (user_id, level) WHERE revoked_at IS NULL;
