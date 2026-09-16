-- Shelter Map — V17 (moderation-dashboard-completion M10, slice 1).
-- User suspension: one timestamp on the account (NULL = active; an
-- indefinite suspension the admin lifts manually — no expiry policy
-- exists). Suspension is enforced by fresh lookups at the three
-- credential doors (login, refresh, JWT filter), so the column is the
-- only state.

ALTER TABLE users ADD COLUMN suspended_at TIMESTAMPTZ NULL;

-- The moderation trail gains user-scoped rows (USER_SUSPEND /
-- USER_UNSUSPEND): the action has no shelter, so shelter_id drops NOT
-- NULL, and the new subject_user_id names the target account. No FK on
-- the subject — an account erasure must not erase the audit (the id
-- dangles and renders "Deleted account" at read time, the same
-- convention as the dangling shelter_id). Existing rows are untouched
-- (subject_user_id NULL = shelter-scoped action).

ALTER TABLE moderation_actions ALTER COLUMN shelter_id DROP NOT NULL;
ALTER TABLE moderation_actions ADD COLUMN subject_user_id BIGINT NULL;
CREATE INDEX idx_moderation_actions_subject ON moderation_actions (subject_user_id);
