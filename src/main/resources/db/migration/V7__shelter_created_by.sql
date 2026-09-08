-- Author link for user-submitted shelters (user-contributions): the
-- submitting account can list/edit/delete its own shelters afterwards.
-- NULL for registry rows and pre-V7 USER rows — those are readable publicly
-- but unmanageable by anyone. ON DELETE SET NULL: if account deletion ever
-- lands, shelters are orphaned, never cascade-deleted (map data outlives
-- accounts).
ALTER TABLE shelters ADD COLUMN created_by BIGINT REFERENCES users (id) ON DELETE SET NULL;
CREATE INDEX idx_shelters_created_by ON shelters (created_by);
