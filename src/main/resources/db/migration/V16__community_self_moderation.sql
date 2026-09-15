-- Shelter Map — V16 (community-self-moderation, D3).
-- Dampening flag on shelter reports: a NON_EXISTENT report filed by a
-- reporter who holds their own other USER listing of the same place is
-- self-interested (the displaced rival / the edited-into-duplicate
-- vector) and is stored dampened — it still records and still shows in
-- the admin queue, it contributes 0 points to the weighted auto-hide
-- tally. Existing rows stay FALSE (nothing was dampened before this
-- rule existed). ddl-auto=validate must stay green against this.
ALTER TABLE shelter_reports ADD COLUMN damped BOOLEAN NOT NULL DEFAULT FALSE;
