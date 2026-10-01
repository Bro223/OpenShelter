-- ONE-TIME FORCED BACKFILL — orphaned community pins (owner decision, applied 2026-10-02).
--
-- WHY THIS EXISTS
--   A pin whose submitter erased their account BEFORE the V35 depth-freeze existed
--   carries no standing at all: created_by IS NULL and submitter_verification_snapshot
--   IS NULL. Such a pin renders the plain community tone and matches NO tone filter,
--   while it is visible on the map — which is what the owner reported.
--   The submitter cannot be traced: the erasure nulled the author link and no
--   creation audit exists anywhere in the schema, so the standing cannot be derived.
--   The owner has ruled that these rows be FORCED to the single-channel (partial)
--   standing so they are classifiable and filterable.
--
-- SCOPE — narrowly the untraceable rows
--   source = 'USER'                (community pins; registry pins render blue regardless)
--   created_by IS NULL             (the author link was destroyed)
--   submitter_verification_snapshot IS NULL
--                                  (no standing was ever frozen)
--   Rows that already carry a frozen standing are NOT touched — that standing is
--   real history and must not be rewritten. Pins whose author still exists are NOT
--   touched — they are derived live.
--
-- THIS IS A FORCED VALUE, NOT EVIDENCE
--   'EMAIL' is used because it is the most common confirmed channel in this database,
--   and every single-channel level (EMAIL / PHONE / SMART_ID) renders the SAME pin
--   tone (partial / yellow). It asserts nothing about which channel was verified —
--   there is no evidence left to assert. The V31 boolean is set to TRUE alongside it
--   so the served `submitterVerified` flag cannot contradict the forced depth.
--
-- THIS IS NOT A RULE
--   It applies ONCE, to rows that predate the freeze. Pins created from now on follow
--   the agreed rule: a pin carries the HIGHEST verification depth its submitter ever
--   reached, and an erasure freezes exactly that standing onto the row.
--
-- RUN
--   PGPASSWORD=sheltermap psql -h localhost -U sheltermap -d sheltermap \
--     -f qa/orphan-pin-depth-backfill.sql
--
-- INSPECT BEFORE RUNNING
--   SELECT id, name, created_at FROM shelters
--    WHERE source = 'USER' AND created_by IS NULL
--      AND submitter_verification_snapshot IS NULL
--    ORDER BY id;

UPDATE shelters
   SET submitter_verification_snapshot = 'EMAIL',
       submitter_verified_at_creation  = TRUE
 WHERE source = 'USER'
   AND created_by IS NULL
   AND submitter_verification_snapshot IS NULL;
