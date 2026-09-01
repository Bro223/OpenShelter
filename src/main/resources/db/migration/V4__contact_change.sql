-- Cross-channel contact changes (email <-> phone).
--
-- Changing the email requires verification by an SMS code sent to the
-- current phone; changing the phone requires an email code sent to the
-- current email. A stolen email OR a lost phone alone is not enough to
-- hijack the account.
--
-- One pending change per user per type (a new request replaces the old);
-- code_hash is SHA-256, never plaintext; attempts are brute-force limited;
-- expires_at bounds the validity window.

CREATE TABLE pending_contact_changes (
    id         BIGSERIAL    PRIMARY KEY,
    user_id    BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type       VARCHAR(20)  NOT NULL,                  -- EMAIL_CHANGE | PHONE_CHANGE
    target     VARCHAR(255) NOT NULL,                  -- new email or new phone (E.164)
    code_hash  VARCHAR(64)  NOT NULL,                  -- SHA-256 hex, never plaintext
    attempts   INT          NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ  NOT NULL,
    created_at TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_pending_contact_change UNIQUE (user_id, type)
);
CREATE INDEX idx_pending_contact_changes_user ON pending_contact_changes (user_id);
