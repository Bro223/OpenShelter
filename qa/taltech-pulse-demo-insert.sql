-- ============================================================================
-- DEMO DATA (owner-requested): populate the TalTech shelter's (shelter id 311)
-- community pulse so the report gauges and the report log show real content
-- in the running dev app.
--
-- WHAT THIS INSERTS (and ONLY this)
--   shelter_open_status       4 rows: 3x OPEN (users 5, 6, 7), 1x CLOSED (8)
--   shelter_occupancy_reports 4 rows: 2x FULL (users 5, 6) + 1x GETTING_FULL
--                              (user 7) + 1x SPACE (user 8)
-- Reporters are EXISTING registered users (ids 5, 6, 7, 8 — kind REGISTERED,
-- active accounts with stored encrypted contacts; the schema cannot carry a
-- fabricated contact). None of them had any report row for shelter 311
-- before this insert, so every row below is demo-created.
--
-- WHY THESE USERS / SHAPES
--   * Both tables are UNIQUE (shelter_id, user_id) — one row per user per
--     shelter — so several bands need several DISTINCT users.
--   * All timestamps are staggered 3..30 minutes before run time, deep
--     inside the 2-hour freshness window (OCCUPANCY_FRESHNESS_WINDOW), so
--     the gauges (a read-time freshness tally) are populated whenever the
--     script runs. Re-running re-stamps them, so the demo never "decays".
--   * The expected gauge values (all four users carry the baseline trust
--     weight 1): open/closed = 3 open / 1 closed, share 0.75; occupancy =
--     1 space / 1 getting full / 2 full, position 0.625; the log lists the
--     8 rows newest-first (cap is 10, so nothing is clipped).
--   * The insert touches ONLY the two report tables. Shelter 311's status,
--     source, review status, provenance and verification are untouched.
--
-- IDENTITY OF THE DEMO ROWS
--   The tables have NO free-text marker column, so the demo is identified
--   by the (shelter_id, user_id) pairs this script uses: (311, 5), (311, 6),
--   (311, 7), (311, 8) in each table. Timestamps are deliberately NOT the
--   marker (they move on every re-run). The cleanup script deletes exactly
--   these pairs and nothing else.
--
-- HOW TO RUN (apply the demo to the running dev database)
--   PGPASSWORD=sheltermap psql -h localhost -U sheltermap -d sheltermap \
--     -f qa/taltech-pulse-demo-insert.sql
--
-- HOW TO REMOVE IT (the exact inverse — leaves nothing behind)
--   PGPASSWORD=sheltermap psql -h localhost -U sheltermap -d sheltermap \
--     -f qa/taltech-pulse-demo-cleanup.sql
--
-- IDEMPOTENT: delete-then-insert over the fixed pair set, so re-running
-- this script replaces the demo rows (fresh timestamps) instead of
-- failing on the unique constraints.
-- ============================================================================

BEGIN;

-- Delete any previous run's demo rows (the fixed pair set — see header).
DELETE FROM shelter_open_status
WHERE shelter_id = 311
  AND user_id IN (5, 6, 7, 8);

DELETE FROM shelter_occupancy_reports
WHERE shelter_id = 311
  AND user_id IN (5, 6, 7, 8);

-- Open/closed taps: 3 OPEN + 1 CLOSED, staggered inside the 2 h window.
INSERT INTO shelter_open_status (shelter_id, user_id, state, created_at)
VALUES
  (311, 5, 'OPEN',   now() - interval '5 minutes'),
  (311, 6, 'OPEN',   now() - interval '12 minutes'),
  (311, 7, 'OPEN',   now() - interval '20 minutes'),
  (311, 8, 'CLOSED', now() - interval '28 minutes');

-- How-full bands: 2 FULL + 1 GETTING_FULL + 1 SPACE, staggered likewise.
INSERT INTO shelter_occupancy_reports (shelter_id, user_id, band, updated_at)
VALUES
  (311, 5, 'FULL',         now() - interval '3 minutes'),
  (311, 6, 'FULL',         now() - interval '15 minutes'),
  (311, 7, 'GETTING_FULL', now() - interval '22 minutes'),
  (311, 8, 'SPACE',        now() - interval '30 minutes');

COMMIT;
