-- Shelter Map — V11 (community-review-queue v2, D1/D2/D3/D7).
-- The community trust lifecycle WITHOUT a blocking queue: community rows
-- publish immediately as NEW and move to CONFIRMED automatically (a
-- positive community report from a non-submitter) or via the rare
-- admin CONFIRM; REJECT (admin) hides via status INACTIVE. Plus the
-- submitter's private-home declaration and the append-only moderation
-- audit trail. Registry rows: value CONFIRMED, behaviour unchanged.
-- ddl-auto=validate must stay green against these definitions.

-- D1/D2: the community trust state. NOT NULL DEFAULT 'NEW' (new community
-- rows are created NEW by the submission service); the backfill below is
-- the authority for EXISTING rows (D3): community rows have no
-- confirmation evidence yet -> NEW (the honest "just added" treatment);
-- registry rows -> CONFIRMED (official data; informational for them).
ALTER TABLE shelters ADD COLUMN review_status VARCHAR(20) NOT NULL DEFAULT 'NEW'
CHECK (review_status IN ('NEW', 'CONFIRMED', 'REJECTED'));
UPDATE shelters SET review_status = CASE
    WHEN source = 'USER' THEN 'NEW'
    ELSE 'CONFIRMED'
END;
-- the admin's note (the REJECT reason), shown to the submitter in /mine;
-- NULL while nothing is said
ALTER TABLE shelters ADD COLUMN review_note VARCHAR(500) NULL;

-- D7: private-home declaration — the submitter declares the location a
-- private home / private shelter (checkbox); private rows are NOT hidden
-- or demoted, every surface shows the "Private location" badge instead.
ALTER TABLE shelters ADD COLUMN location_kind VARCHAR(
    10
) NOT NULL DEFAULT 'PUBLIC'
CHECK (location_kind IN ('PUBLIC', 'PRIVATE'));

-- D4: the append-only moderation audit trail — one row per moderation-
-- relevant action (admin status change, hard delete, shelter-report
-- dismiss, review hide/restore, admin CONFIRM/REJECT, and the automatic
-- AUTO_CONFIRM promotion), written in the SAME transaction as the action
-- it records (no separate call, no async). moderator_id is the acting
-- user (the reporting user for AUTO_CONFIRM). previous_status/new_status
-- hold the review_status values around the action (for DELETE: previous
-- = the row's review_status, new = NULL). shelter_id deliberately has NO
-- FK: a delete records its audit row in the same transaction, and a
-- referential action cannot both keep the audit row (SET NULL/NO ACTION
-- either null out or block the delete; CASCADE erases the delete's own
-- audit row) — so the id dangles after the delete and the name join at
-- read time renders "Deleted shelter" for it (D4). The app only ever
-- writes it for an existing shelter in the same transaction.
CREATE TABLE moderation_actions (
    id BIGSERIAL PRIMARY KEY,
    -- no FK on shelter_id — see the D4 note above (dangling id = "deleted")
    shelter_id BIGINT NOT NULL,
    moderator_id BIGINT NOT NULL REFERENCES users (id),
    -- STATUS_CHANGE | DELETE | REPORT_DISMISS | REVIEW_HIDE |
    -- REVIEW_RESTORE | CONFIRM | AUTO_CONFIRM | REJECT
    action VARCHAR(40) NOT NULL,
    reason VARCHAR(500) NULL,
    previous_status VARCHAR(20) NULL,
    new_status VARCHAR(20) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_moderation_actions_shelter ON moderation_actions (shelter_id);
CREATE INDEX idx_moderation_actions_created ON moderation_actions (created_at);
