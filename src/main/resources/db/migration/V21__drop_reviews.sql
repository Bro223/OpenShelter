-- Shelter Map — V21 (star ratings dropped: the community review model goes
-- away entirely). The review model (shelter_reviews + review_reports, V1/V9)
-- is removed — the community moderation channel is the SHELTER REPORT system
-- (shelter_reports), which stays.
--
-- 1) Legacy audit rows for the deleted admin actions (REVIEW_HIDE /
--    REVIEW_RESTORE) are erased: the Action enum has no such
--    values, and moderation_actions rows load through the entity's enum
--    field (an unknown value would 500 /admin/audit).
-- 2) Legacy report-throttle rows of the deleted REVIEW_REPORT action type
--    are erased the same way (report_actions is otherwise never read back
--    into entities, but the row keeps no meaning once the action is gone).
-- 3) The tables drop in FK order (review_reports references shelter_reviews);
--    indexes and the uq_shelter_reviews_shelter_user / uq_review_reports_
--    review_user constraints go with their tables.
--
-- ddl-auto=validate must stay green against these definitions.

DELETE
FROM moderation_actions
WHERE action IN ('REVIEW_HIDE', 'REVIEW_RESTORE');
DELETE FROM report_actions
WHERE action = 'REVIEW_REPORT';
DROP TABLE review_reports;
DROP TABLE shelter_reviews;
