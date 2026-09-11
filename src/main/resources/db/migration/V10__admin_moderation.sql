-- Shelter Map — V10 (admin-moderation, D3).
-- Dismissal state for the shelter report queue: one stamp per report row,
-- set once by admin moderation (POST /admin/reports/{id}/dismiss —
-- idempotent, a re-dismiss is a no-op); NULL while unresolved. Dismissing
-- never deletes the row — the report stays recorded as resolved.
-- ddl-auto=validate must stay green against these definitions.

ALTER TABLE shelter_reports ADD COLUMN dismissed_at TIMESTAMPTZ NULL;
