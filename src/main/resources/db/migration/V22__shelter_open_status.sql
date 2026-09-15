-- Shelter Map — V22 (live open/closed state — same level as capacity).
-- The caller's live open/closed report for a shelter: one row per
-- (shelter, user), the latest tap wins (state replaced, created_at
-- refreshed). Display-only — never affects visibility, status or
-- filters.
-- Freshness (2 h on created_at) is checked at read time — no cleanup job.
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE shelter_open_status (
    id BIGSERIAL PRIMARY KEY,
    shelter_id BIGINT NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    state VARCHAR(10) NOT NULL CHECK (state IN ('OPEN', 'CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shelter_open_status_shelter_user UNIQUE (shelter_id, user_id)
);
CREATE INDEX idx_shelter_open_status_shelter ON shelter_open_status (
    shelter_id
);
CREATE INDEX idx_shelter_open_status_user ON shelter_open_status (
    user_id
);
