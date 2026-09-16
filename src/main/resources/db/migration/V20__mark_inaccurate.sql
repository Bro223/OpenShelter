-- Shelter Map — V20 (moderation-dashboard-completion M10, slice 4).
-- "Mark inaccurate": a moderator flag on a USER shelter row. The row stays
-- VISIBLE — status and provenance are untouched; the mark only drives the
-- public `inaccurate` flag and the single-sourced warning on the
-- unverified-treatment surfaces (map row, detail header, my rows, admin
-- list). Registry rows can never be marked (the admin writes answer 409
-- import-owned), so no registry row ever carries the stamp.
--
-- One timestamp + one actor id; NULL = not marked. The mark/clear pair is
-- idempotent (the stamp is set/cleared once; a no-op records no audit row,
-- the moderation-action idiom) and the mark's reason rides on the audit
-- row, not here — the mark is a boolean state, the trail is the record.
--
-- inaccurate_marked_by has NO FK (the moderation_actions.moderator_id
-- convention, V11/V14): an account erasure must not rewrite the mark —
-- the id dangles. The mark itself is read-time state only: the projections
-- render the boolean, the audit trail renders the actor name.
--
-- ddl-auto=validate must stay green against these definitions.

ALTER TABLE shelters ADD COLUMN inaccurate_marked_at TIMESTAMPTZ NULL;
ALTER TABLE shelters ADD COLUMN inaccurate_marked_by BIGINT NULL;
