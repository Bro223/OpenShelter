-- Shelter Map — V23 (crisis-guidance, D1 + D12).
-- The crisis-guidance content model: a media library (uploaded images,
-- stored under server-generated names in the configured upload directory)
-- and the guidance posts that reference their hero image.
--
-- A post stores hero_image_id — a REFERENCE, never an image URL and never
-- a copy of the image. The reference is always either a live asset or
-- NULL, so no broken image can reach a page: deleting an asset nulls the
-- reference (ON DELETE SET NULL) and a post with a NULL hero renders no
-- image element at all. Replacing a hero is a pointer move — the old
-- asset keeps its row and stays listed in the library.
--
-- media_assets.uploaded_by follows the moderation_actions.moderator_id
-- precedent: an account erasure must not erase the library row (SET NULL,
-- the reference dangles and renders "Unknown").
--
-- moderation_actions.subject_label (D12) is the human-readable subject
-- snapshot of a guidance/media audit row (e.g. Guidance post "…" (slug)).
-- It deliberately has NO FK to either new table: a deleted post or asset
-- must stay readable in the trail, exactly like a dangling shelter_id
-- renders "Deleted shelter". Every pre-V23 row has a NULL label, so
-- nothing about the existing trail changes.
--
-- ddl-auto=validate must stay green against these definitions.

CREATE TABLE media_assets (
    id BIGSERIAL PRIMARY KEY,
    -- server-generated, non-guessable (32 hex + the sniffed extension) —
    -- the public serving URL; never derived from the client's filename
    filename VARCHAR(40) NOT NULL,
    -- display metadata only; never part of a path
    original_filename VARCHAR(255),
    content_type VARCHAR(20) NOT NULL CHECK (
        content_type IN
        ('image/jpeg', 'image/png', 'image/webp')
    ),
    width INT NOT NULL CHECK (width > 0),
    height INT NOT NULL CHECK (height > 0),
    size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
    uploaded_by BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_media_assets_filename UNIQUE (filename)
);
CREATE INDEX idx_media_assets_created ON media_assets (
    created_at
);

CREATE TABLE guidance_posts (
    id BIGSERIAL PRIMARY KEY,
    -- generated from the title (Estonian letters transliterated),
    -- admin-overridable, unique across drafts and published posts alike
    slug VARCHAR(200) NOT NULL,
    title VARCHAR(255) NOT NULL,
    -- the server-sanitized body — the stored value is always the
    -- sanitizer's output (crisis-guidance D2)
    body_html TEXT NOT NULL,
    locale VARCHAR(5) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN
        ('DRAFT', 'PUBLISHED')
    ),
    pinned BOOLEAN NOT NULL DEFAULT false,
    -- the hero image is a REFERENCE, never a URL (see the header note)
    hero_image_id BIGINT NULL REFERENCES media_assets (id) ON DELETE SET NULL,
    hero_image_alt VARCHAR(300) NULL,
    published_at TIMESTAMPTZ NULL,
    -- V7 precedent: the author reference dangles after an erasure
    created_by BIGINT NULL REFERENCES users (id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_guidance_posts_slug UNIQUE (slug),
    -- alt text is mandatory iff a hero image is set (D10)
    CONSTRAINT ck_guidance_posts_hero_alt CHECK (
        hero_image_id IS NULL OR (hero_image_alt IS NOT NULL AND btrim(hero_image_alt) <> '')
    ),
    -- no draft may look published, and vice versa (D1/D4 pairing)
    CONSTRAINT ck_guidance_posts_published_pairing CHECK (
        (status = 'PUBLISHED') = (published_at IS NOT NULL)
    )
);
-- the public read order (pinned first, newest-published first); the id
-- tie-break rides in the query, not the index
CREATE INDEX idx_guidance_posts_published_order ON guidance_posts (
    pinned DESC, published_at DESC
) WHERE status = 'PUBLISHED';
-- the reused-by count and the in-use check (D8)
CREATE INDEX idx_guidance_posts_hero_image ON guidance_posts (
    hero_image_id
);

-- D12: the subject snapshot for guidance/media audit rows (no FK — see
-- the header note).
ALTER TABLE moderation_actions ADD COLUMN subject_label VARCHAR(300) NULL;
