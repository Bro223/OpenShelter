-- Shelter Map — V26 (guidance-translation-linking): the per-locale
-- translation rows that let ONE guidance post carry its content in several
-- languages, and let the public surface answer "the same page in another
-- language".
--
-- The content model (bilingual-guidance): a guidance post is a logical
-- article. It carries ONE translation row per locale in this table — each
-- row owns its own locale, slug, title, body_html and hero_image_alt. The
-- post row (guidance_posts) keeps its lifecycle (status, pinned, hero_image_id,
-- published_at, created_by) and its HOME-locale content columns (locale, slug,
-- title, body_html, hero_image_alt) — those columns stay readable and are NOT
-- dropped (the existing public reads, the admin form and the 825 green tests
-- keep working). The post's own-locale translation row is kept in sync with
-- those columns by the service, so after this migration EVERY post has at
-- least one translation row: its own.
--
-- WHY a table and not just the post's locale column: a post in one language
-- and its counterpart in another are separate guidance_posts rows with nothing
-- linking them, so a reader who switches language on a post gets a 404 — the
-- client cannot resolve "the same page in another language". A post's
-- translations live under the SAME post_id, so the public detail can expose
-- an "alternates" map (locale -> slug) that the frontend switcher follows.
--
-- Public reads now key off THIS table: a post is public in locale L iff it is
-- PUBLISHED and has a translation row in L. The post's hero image (hero_image_id)
-- stays post-level — one hero shared by every translation, with a per-locale
-- alt (hero_image_alt lives here, not on the post).
--
-- Uniqueness, in the V23 constraint style:
--   * (post_id, locale) — a post has AT MOST one translation per locale;
--   * (locale, slug)    — a slug is unique WITHIN a locale (the V23 global
--     UNIQUE(slug) on guidance_posts is relaxed per-locale here, so an EN and
--     an ET translation may share a slug, but two EN translations may not).
--
-- post_id CASCADEs: a hard delete of the post erases its translation rows
-- (the post's media assets and audit rows are untouched, as before — the D8/D12
-- rules are unchanged).
--
-- No pairing is done here. The twelve imported posts (six EN + six ET) are
-- each backfilled into their OWN translation row; which EN matches which ET is
-- established LATER by the admin linking API, by hand. Nothing in this
-- migration guesses a pairing by order, title or timestamp.
--
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE guidance_post_translations (
    id BIGSERIAL PRIMARY KEY,
    -- the owning post; a hard delete of the post erases its translations
    post_id BIGINT NOT NULL REFERENCES guidance_posts (id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL,
    -- the URL segment for THIS translation, in the post's locale; unique
    -- within the locale (the V23 shape — generated or admin-overridden)
    slug VARCHAR(200) NOT NULL,
    title VARCHAR(255) NOT NULL,
    -- the server-sanitized body for this locale (crisis-guidance D2)
    body_html TEXT NOT NULL,
    -- the per-locale alt for the post's shared hero; NULL when the post has
    -- no hero (the post-level hero_image_id is the authority for the image)
    hero_image_alt VARCHAR(300) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guidance_post_translations_post_locale UNIQUE (
        post_id, locale
    ),
    CONSTRAINT uq_guidance_post_translations_locale_slug UNIQUE (locale, slug)
);
-- the per-post listing (admin detail / alternates) and the per-locale public
-- reads (index + slug resolution)
CREATE INDEX idx_guidance_post_translations_post ON guidance_post_translations (
    post_id
);
CREATE INDEX idx_guidance_post_translations_locale ON guidance_post_translations (
    locale
);

-- BACKFILL: every existing guidance_posts row becomes the OWNER of its own
-- translation row — its current locale, slug, title, body_html and hero alt.
-- The public reads key off this table from this migration on, so the backfill
-- is what keeps every already-published post public in its own locale:
-- nothing changes behaviour on deploy. guidance_posts.slug is UNIQUE (V23), so
-- the (locale, slug) uniqueness holds across the whole backfilled set.
INSERT INTO guidance_post_translations (
    post_id,
    locale,
    slug,
    title,
    body_html,
    hero_image_alt,
    created_at,
    updated_at
)
SELECT
    id,
    locale,
    slug,
    title,
    body_html,
    hero_image_alt,
    created_at,
    updated_at
FROM guidance_posts;
