-- Shelter Map — V25 (guidance-hero-import): the pending hero-import URL on
-- posts, and the origin URL on imported media assets.
--
-- A guidance post's hero may be given as a REMOTE URL (the admin pastes
-- https://example.com/photo.png into the hero field) instead of picking a
-- stored asset. The URL is a PENDING IMPORT, never a published reference:
-- the post publishes with it only when the import succeeds. The publish
-- transaction downloads the image (bounded wall-clock budget, ≤3 redirect
-- hops with the address policy RE-checked at every hop — loopback, private,
-- link-local, unique-local, multicast and cloud-metadata addresses are
-- refused), enforces the same size cap as uploads (413), validates the
-- bytes with the magic-byte inspector (400 for anything that is not a
-- readable JPEG/PNG/WebP, 400 for a header claiming more than the pixel
-- cap), stores them under a generated name in the media library, and links
-- the resulting asset as the hero. A failed fetch or validation fails the
-- publish with a readable error and the post stays a DRAFT with the URL
-- intact — a post is never published with a hero the server has not
-- fetched and validated itself.
--
-- The CHECK makes "a published post carries no pending import" structural,
-- in the V23 CHECK style: a published post's hero is always either a live
-- media asset or NULL, so no page can ever render from a URL the server
-- has not validated. (Setting a URL on an already-published post is a 400
-- at the service — unpublish first — so the CHECK can never be the one to
-- reject a legitimate write.)
--
-- media_assets.source_url records WHERE an imported asset came from
-- (NULL for a plain upload): attribution and takedown — given a URL under
-- complaint, the operator finds every asset imported from it. Metadata
-- only: the app never re-fetches it (the import is one-shot, at publish
-- time), and it is never part of a filesystem path. The index backs that
-- takedown lookup.

ALTER TABLE guidance_posts ADD COLUMN hero_import_url VARCHAR(2048) NULL;
ALTER TABLE guidance_posts ADD constraint CK_GUIDANCE_POSTS_PENDING_IMPORT_ONLY_DRAFT
CHECK (status <> 'PUBLISHED' OR hero_import_url IS NULL);

ALTER TABLE media_assets ADD COLUMN source_url VARCHAR(2048) NULL;
CREATE INDEX idx_media_assets_source_url ON media_assets (source_url);
