-- Keyed one-time-code hashes (W3-C, agent-4 / P2-12): the stored 6-digit
-- reset / contact-change / phone / e-mail codes switch from an unkeyed
-- single-round SHA-256 to a keyed, domain-separated HMAC under the active
-- `v2:` slot. A 6-digit code is a 10^6 space, so the unkeyed hash is
-- reversible from a DB dump in under a second per row; the keyed form is
-- not. The `v2:` prefix makes a keyed hash 3 + 64 = 67 chars, which no
-- longer fits VARCHAR(64) — widen to VARCHAR(128) (margin for a future
-- slot).
--
-- refresh_tokens.token_hash is INTENTIONALLY left at VARCHAR(64): refresh
-- tokens are 256-bit random (64 hex chars, not brute-forceable), so they
-- stay unkeyed. Keying them would change the stored form of every
-- outstanding session and force a rotation of all live tokens — a behavior
-- change the keyed-slot work deliberately avoids (the migration path for
-- already-issued OTP codes is a natural expiry, not a data rewrite: the
-- confirm path accepts both the `v2:` keyed form and the legacy unkeyed
-- hex until each code's TTL).
ALTER TABLE password_reset_tokens
    ALTER COLUMN token_hash TYPE VARCHAR(128);

ALTER TABLE pending_contact_changes
    ALTER COLUMN code_hash TYPE VARCHAR(128);

ALTER TABLE pending_verifications
    ALTER COLUMN code_hash TYPE VARCHAR(128);
