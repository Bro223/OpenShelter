-- Shelter Map — initial schema (Step 3).
-- snake_case, singular table names; all FK deletes cascade from users.
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    kind              VARCHAR(16)  NOT NULL,          -- GUEST | REGISTERED
    name              VARCHAR(255),
    email             VARCHAR(255),
    phone             VARCHAR(64),
    national_id_code  VARCHAR(32)
);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_phone ON users (phone);

CREATE TABLE verification_claims (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    level        VARCHAR(16)  NOT NULL,               -- EMAIL | PHONE | SMART_ID
    provider     VARCHAR(32)  NOT NULL,
    external_ref VARCHAR(255) NOT NULL,
    verified_at  TIMESTAMPTZ  NOT NULL,
    revoked_at   TIMESTAMPTZ                           -- NULL while active
);
CREATE INDEX idx_verification_claims_user ON verification_claims (user_id);

CREATE TABLE pending_verifications (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    level      VARCHAR(16) NOT NULL,
    contact    VARCHAR(255) NOT NULL,
    code_hash  VARCHAR(64) NOT NULL,                  -- SHA-256 hex, never plaintext
    attempts   INT         NOT NULL DEFAULT 0,
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_pending_verifications_user_level ON pending_verifications (user_id, level);

CREATE TABLE shelters (
    id          BIGSERIAL PRIMARY KEY,
    name        VARCHAR(255)    NOT NULL,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    status      VARCHAR(16)     NOT NULL,
    source      VARCHAR(32)     NOT NULL,
    external_id VARCHAR(128)                            -- NULL for USER submissions
);
CREATE INDEX idx_shelters_source_status ON shelters (source, status);
CREATE UNIQUE INDEX uq_shelters_external_id ON shelters (external_id) WHERE external_id IS NOT NULL;

CREATE TABLE shelter_reviews (
    id          BIGSERIAL PRIMARY KEY,
    shelter_id  BIGINT       NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id     BIGINT       NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    rating      INT          NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     VARCHAR(500) NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ  NOT NULL,
    updated_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_shelter_reviews_shelter_user UNIQUE (shelter_id, user_id)
);
CREATE INDEX idx_shelter_reviews_shelter ON shelter_reviews (shelter_id);

CREATE TABLE user_credentials (
    user_id       BIGINT       PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    password_hash VARCHAR(255) NOT NULL,               -- Argon2id (salt embedded in hash)
    created_at    TIMESTAMPTZ  NOT NULL,
    changed_at    TIMESTAMPTZ  NOT NULL
);

CREATE TABLE refresh_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,            -- SHA-256 hex, never plaintext
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ                              -- NULL while active
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);

CREATE TABLE password_reset_tokens (
    id         BIGSERIAL PRIMARY KEY,
    user_id    BIGINT      NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL UNIQUE,            -- SHA-256 hex, never plaintext
    expires_at TIMESTAMPTZ NOT NULL,
    used_at    TIMESTAMPTZ                              -- NULL while unused
);
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens (user_id);
