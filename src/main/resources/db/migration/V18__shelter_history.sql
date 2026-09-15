-- Shelter Map — V18 (moderation-dashboard-completion).
-- The append-only shelter edit history: one row per USER-shelter
-- lifecycle event — CREATED on submission, EDITED on an owner PUT that moved
-- at least one editable field (name, description, capacity, latitude,
-- longitude, locationKind), DELETED on a user or admin hard delete — written
-- in the SAME transaction as the event (a rolled-back or failed event leaves
-- no row). Registry import rows are a different write path
-- (ShelterImportService) and keep their own data_imports audit; they create
-- no history rows.
--
-- shelter_id deliberately has NO FK — the moderation_actions convention
-- (V11): the delete appends its own DELETED row in the same transaction and
-- that row must stay findable by the shelter id AFTER the cascade. A
-- referential action cannot serve that (SET NULL would orphan the row from
-- its shelter, NO ACTION would block the delete). The app only ever writes
-- it for an existing shelter in the same transaction; after a delete the id
-- dangles and the endpoint still serves the row's events (404 only when the
-- shelter is absent AND no history exists).
--
-- shelter_name is a SNAPSHOT at event time (renames do not rewrite history);
-- actor_user_id has NO FK (an account erasure orphans the actor — it renders
-- "Unknown" at read time, the existing projection convention). changes is
-- compact JSON {"field": [old, new]} over exactly the fields that MOVED on
-- the PUT, in canonical field order; NULL for CREATED/DELETED.
--
-- ddl-auto=validate must stay green against these definitions.
CREATE TABLE shelter_history (
    id BIGSERIAL PRIMARY KEY,
    -- no FK on shelter_id — see the D4 note above (dangling id = deleted)
    shelter_id BIGINT NULL,
    -- snapshot of shelters.name (VARCHAR(255)) at event time
    shelter_name VARCHAR(255) NOT NULL,
    actor_user_id BIGINT NULL,
    action VARCHAR(20) NOT NULL CHECK (
        action IN ('CREATED', 'EDITED', 'DELETED')
    ),
    -- worst case ~4.7 KB (name + description old/new + the rest); 8000 is headroom
    changes VARCHAR(8000) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_shelter_history_shelter ON shelter_history (
    shelter_id, created_at
);
