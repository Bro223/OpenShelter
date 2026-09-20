-- ============================================================================
-- DEMO DATA CLEANUP: removes EXACTLY what qa/taltech-pulse-demo-insert.sql
-- created for the TalTech shelter (shelter id 311) community pulse demo —
-- and nothing else.
--
-- The demo rows are identified by the (shelter_id, user_id) pairs the insert
-- uses — (311, 5), (311, 6), (311, 7), (311, 8) in EACH of the two report
-- tables. Timestamps are not the marker (they move on every re-run of the
-- insert). The two tables have no free-text marker column; the pair set is
-- the marker.
--
-- NOTE: if a real community member tapped or banded shelter 311 as one of
-- these four accounts after the demo insert, that row shares the same
-- (shelter_id, user_id) pair and is removed too — the pair identity is what
-- makes the demo trivially removable (see the insert's header).
--
-- HOW TO RUN (run from the repository root)
--   PGPASSWORD=sheltermap psql -h localhost -U sheltermap -d sheltermap \
--     -f qa/taltech-pulse-demo-cleanup.sql
--
-- After this runs, GET /api/shelters/311 shows communityPulse with
-- openClosed: null, occupancy: null and recentReports: [] again (all rows
-- inside the 2-hour window are gone), and both report tables contain no
-- rows for these pairs. Shelter 311's status/provenance/verification are
-- untouched by design.
-- ============================================================================

BEGIN;

DELETE FROM shelter_open_status
WHERE shelter_id = 311
  AND user_id IN (5, 6, 7, 8);

DELETE FROM shelter_occupancy_reports
WHERE shelter_id = 311
  AND user_id IN (5, 6, 7, 8);

COMMIT;
