-- Shelter Map — V28 (guidance-manual-order, D1).
-- The stored manual order of the crisis-guidance posts: the owner wants a
-- post to sit where they put it (say, third on the /blog index), so the
-- order stops being a side-effect of the publication timestamp and becomes
-- a stored, admin-mutable value.
--
-- WHY the backfill is EXACTLY the pre-change public order (a visible no-op
-- on deploy): before this migration the public index read
-- pinned DESC, published_at DESC, id DESC over the PUBLISHED rows. The
-- backfill ranks EVERY row with
--   row_number() OVER (ORDER BY pinned DESC, published_at DESC NULLS LAST,
--                      id DESC)
-- so the published rows hold 1..k in exactly that order (the pinned block
-- first, in its current relative order, then the non-pinned block) and the
-- rows not visible today (drafts — NULL published_at, ranked NULLS LAST)
-- take the tail in id DESC. The instant this migration commits, the new
-- public order (pinned DESC, sort_order ASC, published_at DESC, id DESC)
-- returns the same rows in the same order: deploying changes nothing
-- visible.
--
-- WHY no UNIQUE constraint: the reorder endpoint renumbers every post to
-- 1..N in ONE pass inside a single transaction — with a UNIQUE index, row A
-- taking value 2 would collide with row B while B still holds 2, forcing a
-- two-phase (offset) update plan. The value is unique in practice (create
-- appends max + 1, a reorder is a strict permutation) and a duplicate, if it
-- could ever exist, is HARMLESS: the public order contract totals on the
-- published_at / id tie-breakers for any row state. Uniqueness is a property
-- the writers guarantee; the index does not enforce a property only the
-- writers can break.
--
-- The V23 partial index is REPLACED by one matching the new order (the
-- published_at / id columns ride in the index because the ORDER BY names
-- them as tie-breakers), so the public read stays index-served.
--
-- ddl-auto=validate must stay green against these definitions.

-- Add nullable first, backfill, then enforce NOT NULL (every existing row
-- is assigned a position by the single backfill statement below).
ALTER TABLE guidance_posts ADD COLUMN sort_order INT NULL;

UPDATE guidance_posts gp
SET sort_order = ordered.n
FROM (
    SELECT id,
           row_number() OVER (
               ORDER BY pinned DESC,
                        published_at DESC NULLS LAST,
                        id DESC
           ) AS n
    FROM guidance_posts
) ordered
WHERE gp.id = ordered.id;

ALTER TABLE guidance_posts ALTER COLUMN sort_order SET NOT NULL;

DROP INDEX idx_guidance_posts_published_order;
CREATE INDEX idx_guidance_posts_published_order ON guidance_posts (
    pinned DESC, sort_order ASC, published_at DESC, id DESC
) WHERE status = 'PUBLISHED';
