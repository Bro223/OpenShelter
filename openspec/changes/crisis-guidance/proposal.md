# Change: crisis-guidance

## Why

The app answers "where is the nearest shelter" and nothing else. It has no
place to hold emergency instructions — the owner's "where to hide during a
drone attack" — which change with the threat picture and must be editable
without a deploy. The three content surfaces that exist today cannot carry
them: shelter rows are structured, community-owned data; the legal pages are
compiled into the frontend (`features/legal/` — a code change per sentence);
the footer notices are hardcoded copy in `shared/page-shell.html`.

This change adds the missing surface: an admin-authored **public guidance
section** (posts of constrained rich text with an OPTIONAL hero image,
published at `/blog`) plus the **media library** that backs those images.
The owner's 14 validated decisions are encoded decision-by-decision in
`design.md` (D1–D13) and requirement-by-requirement in the two deltas,
including the deliberate non-goals (no inline body images, no translation
workflow, no tables/iframes/raw HTML/custom styles).

## What Changes

- **Public guidance read surface** (permit-all, no JWT): `GET /api/guidance`
  (index) and `GET /api/guidance/{slug}` (detail) return **PUBLISHED posts
  only**, ordered **pinned first, then `published_at` descending**. Drafts
  are invisible to everyone but the admin — absent from the index and 404
  on the detail (D3, D4, D6).
- **Post shape**: `title`, generated-or-overridden `slug`, server-sanitized
  `body_html`, `locale`, `status` (`DRAFT`/`PUBLISHED`), `pinned` flag,
  `published_at` + `updated_at`, and an OPTIONAL hero image
  (`hero_image_id` + mandatory `hero_image_alt`). A post with no hero image
  renders with **no image element** — no placeholder, no broken `<img>`
  (D1, D4).
- **Constrained rich text, sanitized server-side** (D2): the body is
  headings (`h2`/`h3`), paragraphs, bold/italic, bullet and numbered lists,
  links and blockquotes — nothing else. Every write (create and update) is
  re-validated through a strict **allowlist** sanitizer (element +
  attribute allowlist; `href` protocol allowlist `http`/`https`/`mailto`;
  no `script`/`style`/event handler/`iframe`/`svg`) and the **sanitized
  output is what gets stored**. The client-side constrained editor is
  defence in depth only; the public page renders the stored HTML through
  the framework's own sanitizer and never bypasses it.
- **Admin authoring** (behind the existing ADMIN-kind authorization — fresh
  per-request DB lookup, 401 anonymous / 403 non-admin): `GET/POST
  /admin/guidance`, `GET/PUT /admin/guidance/{id}`,
  `POST /admin/guidance/{id}/publish|unpublish`,
  `DELETE /admin/guidance/{id}?confirm=true` (D3, D4).
- **Lifecycle** (D4): `DRAFT` ⇄ `PUBLISHED` with `published_at` stamped on
  publish and cleared on unpublish; drafts are never public; hard delete
  exists and requires an explicit `confirm=true` (400 without it — the UI
  confirms in a dialog as well).
- **Prominence** (D6): a `pinned` flag, so a crisis instruction can be
  forced to the top of the list; default order is pinned-first, then
  `published_at` descending (id descending as the stable tie-break).
- **Slugs** (D5): unique, generated from the title with Estonian diacritics
  transliterated (`õ ä ö ü š ž`), admin-overridable, uniqueness enforced by
  a DB constraint; public URL `/blog/{slug}`, index at `/blog`.
- **Media library** (D7, D8): uploads are stored server-side under a
  configurable directory with generated (non-guessable) filenames,
  **magic-byte** content-type validation (`jpg`/`png`/`webp` only — an SVG
  is rejected), a size cap, and serving from a dedicated path with the
  correct `Content-Type` and no directory traversal; the upload directory
  is gitignored. `GET /admin/media` lists every asset (thumbnail, filename,
  dimensions, size, upload date, reused-by-post count) and `DELETE
  /admin/media/{id}` removes it — an asset still referenced by a post is
  deletable **after a confirm that names the affected posts**; the post
  then renders with no image. **Uploads and post references are
  independent**: replacing a post's hero image NEVER deletes the previous
  file, which stays in the library; no broken image can ever reach a page.
- **Frontend (public)** (D9, D10): `/blog` (list, hero thumbnails, pinned
  first, empty state) and `/blog/{slug}` (hero + sanitized body, not-found
  state), a nav entry, route titles, WCAG AA and a working 360px layout.
- **Frontend (admin)**: two new tabs on the existing `/admin` page —
  **Guidance** (list + create/edit form + publish/unpublish + delete with
  confirm) and **Media library** (grid/table + delete with the
  affected-posts confirm) — with a **hand-rolled, keyboard-operable**
  editor toolbar and **no new npm dependency** (`frontend/package.json`
  keeps its current 17 deps).
- **Audit** (D12): publish, unpublish, post delete and media delete write
  rows to the existing admin audit trail (`GET /admin/audit`) in the same
  transaction as the action, exactly like the admin-moderation actions.
- **Localization (v1, deliberately minimal)** (D11): posts carry a `locale`
  field defaulting to the app's primary language. There is **no translation
  workflow** in v1 — no per-locale variants, no locale filtering, no
  `Accept-Language` negotiation. Flagged as a follow-up, not as scope.

## Capabilities

### New Capabilities

- `crisis-guidance`: the public guidance read surface and pages, the post
  model and lifecycle (draft/publish/unpublish/pin), slug generation,
  server-side sanitization of post bodies, admin authoring API + UI, and the
  guidance audit rows.
- `media-library`: the admin-managed image library — upload with magic-byte
  validation and generated names, listing with usage counts, in-use-aware
  deletion, serving from a dedicated path, and the Media-library tab.

### Modified Capabilities

- None as a delta. Two existing surfaces are extended, and both live in
  **in-flight, unarchived** changes whose main specs do not exist yet in
  `openspec/specs/`:
  `ModerationAuditLog.Action` gains four values and the admin audit read
  gains the subject-label resolution (owned by the in-flight
  `admin-moderation` change), and the `/admin` page's tab set (owned by the
  same change, whose delta still says "three tabs" while
  `frontend/src/app/features/admin/admin-page.ts:50` already defines six).
  Rather than add a second MODIFIED-delta against a capability with no main
  spec — the duplicate-delta drift the archived `remove-shelter-reviews`
  change reported — the extensions are specified **inside the two new
  capabilities** and the sync item is recorded in Impact below.

## Impact

- Affected specs: `crisis-guidance` (new), `media-library` (new); reported
  for later sync, not edited here: `admin-moderation` (the in-flight delta's
  tab list and audit vocabulary).
- Affected code — backend: new `db/migration/V23__crisis_guidance.sql`
  (`guidance_posts`, `media_assets`, and the `moderation_actions
  .subject_label` column the audit rows need); new `domain/GuidancePost.java`
  and `domain/MediaAsset.java`, their entities/mappers/repositories, a
  `GuidanceService`, a `MediaStorage`/service pair, `ApiErrorHandler`
  mappings, `GuidanceController` (public) + `AdminGuidanceController` and
  `AdminMediaController` (or the existing `AdminController` group) with the
  ADMIN-kind guard, `SecurityConfig` permit-all entries for
  `GET /api/guidance/**` and `GET /api/media/**`, `ModerationAuditLog`
  (+`Action` values + one labeled-record overload), and the sanitizer unit.
  `pom.xml` gains exactly one dependency (jsoup, D2); application.yml gains
  the `app.media.*` block and the multipart limits (D13).
- Affected code — frontend: new `features/guidance/` (public list + detail,
  own folder — the no-cross-feature-imports rule holds) and its gateway;
  `features/admin/` gains the Guidance and Media library tabs (+ editor);
  `core/models.ts` (DTOs + the `AdminAuditAction` union), `app.routes.ts`
  (`/blog`, `/blog/:slug`), `core/i18n/{messages,en,et}.ts`
  (`nav.guidance`, `title.guidance`, `title.guidanceDetail` — the en/et
  key-parity guard makes a one-sided key a failing test), and
  `shared/page-shell.html` (nav entry). No `proxy.conf.json` change: media
  is served under `/api/media/**`, already covered by the `/api` proxy rule.
- Config: `app.media.upload-dir` (`MEDIA_UPLOAD_DIR`, default `data/media` —
  already covered by the repo's `data/` ignore rule), `app.media.max-bytes`
  (`MEDIA_MAX_BYTES`), `app.guidance.default-locale`
  (`GUIDANCE_DEFAULT_LOCALE`, mirroring the frontend's `DEFAULT_LOCALE`).
- Docs sync: `README.md` (features + API table + env table + a short
  "Crisis guidance" section stating where sanitization happens),
  `docs/whitepaper.md` (the guidance + media-library paragraph and the two
  honest v1 deferrals), the backend agent pack
  (`context-and-tasks/agent/06-CONTEXT-API.md`) and the frontend one
  (`frontend/docs/agent/02-CONTEXT-API.md`, plus the `frontend/README.md`
  deferrals line).
- Deliberately not touched: the UML pack in `context-and-tasks/*.puml` — the
  guidance surface introduces no new actor or flow beyond the admin CRUD the
  diagrams already draw, and re-rendering needs the Kroki tooling; `qa/*`
  (no change in this repo has ever updated it).
- No breaking API change: every route is additive; the two public prefixes
  are new, and the audit-trail additions are backward compatible.
