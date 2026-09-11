-- Shelter Map — V9 (shelter-trust-and-reports, D1/D2/D4).
-- The trust layer: typed shelter reports, review reports, live occupancy
-- reports, and the durable action log behind the per-user report throttle.
-- ddl-auto=validate must stay green against these definitions.

-- D1: one report table, the TYPE routes the consequence.
--   NON_EXISTENT -> auto-hide at 5 (see shelters.auto_hide_disarmed below)
--   CLOSED / OPEN_CONFIRMED -> display flag only (never status)
--   WRONG_LOCATION / OTHER -> admin queue only (later change)
-- One report per (shelter, user, type): the per-target abuse bound.
CREATE TABLE shelter_reports (
    id BIGSERIAL PRIMARY KEY,
    shelter_id BIGINT NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type VARCHAR(
        16) NOT NULL CHECK (
        type IN
        ('NON_EXISTENT', 'CLOSED', 'OPEN_CONFIRMED', 'WRONG_LOCATION', 'OTHER')
    ),
    -- free text for OTHER, NULL otherwise
    detail VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shelter_reports_shelter_user_type UNIQUE (
        shelter_id, user_id, type
    )
);
CREATE INDEX idx_shelter_reports_shelter ON shelter_reports (shelter_id);
CREATE INDEX idx_shelter_reports_user ON shelter_reports (user_id);

-- D4: live occupancy (one row per user per shelter, latest edit wins).
-- Freshness (2 h on updated_at) is checked at read time — no cleanup job.
CREATE TABLE shelter_occupancy_reports (
    id BIGSERIAL PRIMARY KEY,
    shelter_id BIGINT NOT NULL REFERENCES shelters (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    band VARCHAR(16) NOT NULL CHECK (band IN ('SPACE', 'GETTING_FULL', 'FULL')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_shelter_occupancy_reports_shelter_user UNIQUE (
        shelter_id, user_id
    )
);
CREATE INDEX idx_shelter_occupancy_reports_shelter ON shelter_occupancy_reports (
    shelter_id
);
CREATE INDEX idx_shelter_occupancy_reports_user ON shelter_occupancy_reports (
    user_id
);

-- D2: review reports. One per (review, user); the 5th hides the review
-- (shelter_reviews.hidden_at below). Hidden is cleared only by admin
-- moderation (later change), never automatically.
CREATE TABLE review_reports (
    id BIGSERIAL PRIMARY KEY,
    review_id BIGINT NOT NULL REFERENCES shelter_reviews (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    reason VARCHAR(
        16) NOT NULL CHECK (
        reason IN
        ('FALSY_DATA', 'NOT_RELEVANT', 'SPAM', 'OTHER')
    ),
    -- free text for OTHER, NULL otherwise
    detail VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_review_reports_review_user UNIQUE (review_id, user_id)
);
CREATE INDEX idx_review_reports_review ON review_reports (review_id);
CREATE INDEX idx_review_reports_user ON review_reports (user_id);

-- D1: auto-hide disarm flag. FALSE while a shelter may still be auto-hidden
-- by the 5th NON_EXISTENT report; a manual admin restore sets it TRUE (the
-- admin-moderation change lands the write path — the condition is honoured
-- from day one).
ALTER TABLE shelters ADD COLUMN auto_hide_disarmed BOOLEAN NOT NULL DEFAULT FALSE;

-- D2: when a review is community-hidden (5th report). Set once, never
-- cleared automatically; NULL while visible.
ALTER TABLE shelter_reviews ADD COLUMN hidden_at TIMESTAMPTZ;

-- D3: durable log behind the report throttle — same table family and
-- window style as password_reset_tokens.created_at (reset-rotation guard)
-- and the verification send log: one timestamped row per report-type
-- action (any target, any type), counted over a trailing hour. A separate
-- log (not a count over the three report tables) because occupancy re-PUTs
-- update one row and would otherwise be uncountable.
CREATE TABLE report_actions (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    -- SHELTER_REPORT | REVIEW_REPORT | OCCUPANCY
    action VARCHAR(32) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_report_actions_user_time ON report_actions (
    user_id, created_at
);
