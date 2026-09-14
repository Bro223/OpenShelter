# Tasks: crisis-guidance

Next free Flyway version: **V23** — verified against the repo, not assumed:
`ls src/main/resources/db/migration | sort -V | tail` ends at
`V22__shelter_open_status.sql`. New migration name:
`V23__crisis_guidance.sql`.

## Phase 1 — Migration + domain

- [ ] `V23__crisis_guidance.sql` (D1): `media_assets` (`filename` UNIQUE,
      `original_filename`, `content_type` CHECK in image/jpeg|image/png|
      image/webp, `width`/`height`/`size_bytes` CHECK > 0, `uploaded_by`
      REFERENCES users ON DELETE SET NULL, `created_at`) and
      `guidance_posts` (`slug` UNIQUE, `title`, `body_html`, `locale`
      NOT NULL, `status` CHECK in DRAFT|PUBLISHED, `pinned` NOT NULL DEFAULT
      false, `hero_image_id` REFERENCES media_assets ON DELETE SET NULL,
      `hero_image_alt`, `published_at`, `created_by`, `created_at`,
      `updated_at`) with the two CHECKs — alt mandatory iff a hero image is
      set, and `(status = 'PUBLISHED') = (published_at IS NOT NULL)` — plus
      the partial index `(pinned DESC, published_at DESC) WHERE status =
      'PUBLISHED'`, `guidance_posts (hero_image_id)` and
      `media_assets (created_at)`; and `ALTER TABLE moderation_actions ADD
      COLUMN subject_label VARCHAR(300) NULL` (D12)
- [ ] Migration header comment in the repo's V22 style: what the tables are,
      WHY the hero reference is an id (never a URL), WHY `subject_label` has
      no FK, and the `ddl-auto=validate` note
- [ ] Domain: `GuidancePost` + `MediaAsset` (`domain/`), their entities +
      mappers + Spring Data repositories (`persistence/`) — every mapped
      column present in V23 with the same shape, so `ddl-auto=validate`
      stays green
- [ ] `ModerationAuditLog`: four new `Action` values (`GUIDANCE_PUBLISH`,
      `GUIDANCE_UNPUBLISH`, `GUIDANCE_DELETE`, `MEDIA_DELETE`) + the
      `Row.subjectLabel` field, and ONE new overload `recordLabeled(long
      moderatorId, Action action, String subjectLabel, String reason)`
      implemented in `JpaModerationAuditLog` — the existing 7-parameter
      `record(...)` and every call site untouched (D12)
- [ ] `AdminModerationService.auditSubjectName`: resolve `subjectLabel` FIRST,
      falling back to the existing shelter/account resolution when it is
      null (D12) — no existing row changes behaviour

## Phase 2 — Sanitizer (D2)

- [ ] `pom.xml`: add `org.jsoup:jsoup` with an explicit `<version>` (the
      `proj4j`/`twilio` convention) and a comment naming WHY the sanitizer is
      a library rather than hand-rolled (parser differentials) — the ONLY new
      dependency; no npm change anywhere
- [ ] `BodySanitizer` (single unit, only producer of `body_html`): element
      allowlist `h2 h3 p br strong em ul ol li a blockquote`, attribute
      allowlist exactly `a[href]`, href protocol allowlist
      `http`/`https`/`mailto`, no `target`; returns the sanitized HTML string
- [ ] Sanitizer tests (the specification of the sanitizer, not just a smoke
      test): allowlist elements survive; `h1`, `img`, `table`, `iframe`,
      `svg`, `style` and `script` do not; event-handler attributes
      (`onclick`, `onerror`, `onload`) and inline `style` do not; `href`
      protocols — `javascript:`/`data:` dropped, `http`/`https`/`mailto`
      kept; malformed/unclosed markup handled; **idempotence**
      (`sanitize(sanitize(x)) == sanitize(x)`); a payload built from the
      usual XSS kit (`<img src=x onerror=…>`, `<svg/onload=…>`,
      `<ScRiPt>`, `javascript:` in an uppercased attribute name,
      entity-encoded `<`) produces output with no script node and no
      handler attribute

## Phase 3 — Guidance service (D3, D4, D5, D6, D11)

- [ ] `SlugFactory` (D5): lowercase → explicit Estonian transliteration
      (`õ ä ö ü š ž`) → non-alphanumeric runs to single `-` → trim →
      bound to the column width → `post` fallback; plus the
      `^[a-z0-9]+(-[a-z0-9]+)*$` validator for admin-supplied slugs
- [ ] `GuidanceService`: create (`DRAFT` by default, `PUBLISHED` on explicit
      request), update (full replace, slug unchanged when omitted), publish
      (stamps `publishedAt` from the injected `Clock`), unpublish (clears
      it), pin/unpin, listing for the admin (drafts included,
      newest-updated first), public list (PUBLISHED, pinned-first), public
      by-slug (PUBLISHED only, 404 otherwise), delete (`confirm` required)
- [ ] Every body write runs through `BodySanitizer` (create AND update) —
      the stored value is sanitizer output; the admin read returns the
      stored HTML
- [ ] Auto-generated slug collisions take `-2`, `-3`, …; an admin-supplied
      collision answers 409 naming the slug (never silently rewritten);
      uniqueness spans drafts and published posts
- [ ] Validation: title required and bounded, body required, alt mandatory
      iff a hero image is set (400 otherwise), alt supplied without a hero
      image → 400, locale defaults from `app.guidance.default-locale` (D11),
      unknown id → 404
- [ ] Audit wiring (D12): publish / unpublish / delete call `recordLabeled`
      inside the same `@Transactional` method with the label
      `Guidance post "<title>" (<slug>)`; a no-op publish/unpublish writes
      NO row

## Phase 4 — Media storage (D7, D8, D13)

- [ ] `application.yml`: `app.media.upload-dir` (`MEDIA_UPLOAD_DIR`, default
      `data/media`), `app.media.max-bytes` (`MEDIA_MAX_BYTES`, default
      5242880), `app.guidance.default-locale` (`GUIDANCE_DEFAULT_LOCALE`,
      default `en`) — env-only, values never committed, each with the WHY
      comment the file's other keys carry; plus
      `spring.servlet.multipart.max-file-size`/`max-request-size` at 6MB so
      our own cap produces the documented 413 instead of the servlet
      container's 1MB default rejection
- [ ] `MediaImageInspector`: magic-byte sniffing (JPEG, PNG, WebP) + header
      dimension reader (PNG `IHDR`, JPEG `SOFn`, WebP `VP8`/`VP8L`/`VP8X`)
      — `ImageIO` has no WebP reader and the listing needs dimensions, so
      this stays dependency-free with fixture byte arrays in its tests
- [ ] `.gitignore`: explicit `data/media/` entry (the default dir is already
      under the ignored `data/` tree — verified with
      `git check-ignore -v data/media/x.jpg`)
- [ ] `MediaStorage`: create the configured directory at startup when
      missing, fail the boot with a clear message when it cannot be created
      or written, generate the stored filename (32 hex + sniffed extension),
      write the file, delete the file on asset deletion
- [ ] Upload validation order: actual byte count against the cap (413) →
      magic bytes (400) → sniffed type must equal the declared part type
      (400) → dimensions readable (400); the original filename is metadata
      only and never part of a path
- [ ] `MediaService`: upload, the library listing with the reused-by count
      (ONE batched query, no N+1), deletion (D8) — unreferenced: delete row +
      file; referenced without `confirm=true`: 409 naming the affected posts;
      referenced with `confirm=true`: delete in the same transaction and
      clear both `hero_image_id` and `hero_image_alt` on every referencing
      post
- [ ] Media delete writes its audit row (`MEDIA_DELETE`,
      `Media asset "<original>" (<stored>)`) in the same transaction; a
      refused deletion writes nothing

## Phase 5 — Controllers + authorization (D3)

- [ ] `SecurityConfig`: permit-all GET for `/api/guidance/**` and
      `/api/media/**` (the public pages need them anonymously); the
      `/admin/**` rules already cover the write side, with the per-request
      `UserKind.ADMIN` check reused unchanged
- [ ] `GuidanceController` (public): `GET /api/guidance` and
      `GET /api/guidance/{slug}` — PUBLISHED-only filters live in the query,
      not in the mapping layer; draft and unknown slug answer the SAME 404
- [ ] `MediaController`: `GET /api/media/{filename}` — name matched against
      `^[a-f0-9]{32}\.(jpg|png|webp)$`, resolved under the upload directory
      with a parent-equality check, `Content-Type` from the stored type,
      `Cache-Control: public, max-age=31536000, immutable`, 404 otherwise
- [ ] `AdminGuidanceController`: list / get / create / update / publish /
      unpublish / delete (`confirm=true` required, 400 without it)
- [ ] `AdminMediaController`: list / upload (multipart) / delete
      (`confirm=true` semantics per D8)
- [ ] DTOs (`GuidancePostDto` public + admin shapes, `MediaAssetDto`) and the
      `ApiErrorHandler` mappings for the new failures (400 validation, 409
      slug collision, 409 in-use asset + affected posts, 413 oversize), all
      in the existing `ErrorResponse` shape
- [ ] Backend endpoint tests: anonymous 401 and non-admin 403 on every
      `/admin/guidance/*` and `/admin/media/*` route; anonymous 200 on both
      `/api/guidance` routes and on `/api/media/{filename}`

## Phase 6 — Backend tests (behaviour, not just wiring)

- [ ] Draft invisibility: a draft is absent from `GET /api/guidance`, its
      slug answers 404 with the same body as an unknown slug, and it IS
      listed by `GET /admin/guidance`
- [ ] Lifecycle: create → DRAFT; publish stamps `publishedAt` and a fresh
      stamp after unpublish→publish; unpublish makes the detail 404;
      publish/unpublish twice are no-ops that write NO audit row; delete
      without `confirm` is 400 and changes nothing
- [ ] Ordering: pinned-first, then `publishedAt` descending, id descending
      tie-break — asserted with same-instant rows
- [ ] Slug: `"Varjumine droonirünnaku ajal"` →
      `varjumine-droonirunnaku-ajal`; collision → `…-2`; a draft's slug is
      never reused; an admin-supplied collision → 409; the DB unique
      constraint is exercised directly
- [ ] Hero image cases (D1/D8): a post with no hero renders (DTO `null` +
      frontend assertion in phase 9); setting a hero without alt → 400; alt
      without a hero → 400; replacing the hero leaves the old asset in the
      library with the count decremented; deleting an in-use asset → both
      `hero_image_id` and `hero_image_alt` cleared, the post still 200 on its
      slug, and the referenced file gone
- [ ] Upload validation: wrong magic bytes (text named `.jpg`) → 400; SVG →
      400; oversize → 413 with no partial file; declared type contradicting
      the bytes → 400; generated filename matches `^[a-f0-9]{32}\.(jpg|png|
      webp)$`; a supplied filename with `/`, `..` or an absolute path is
      ignored (metadata only)
- [ ] Serving: traversal (`../../etc/passwd`, encoded variants, absolute
      paths) → 404 with nothing outside the directory read; unknown name →
      404; `Content-Type` comes from the stored type
- [ ] Audit (D12): publish/unpublish/delete of a post and delete of an asset
      each add exactly one row with the actor and the label; a deleted post's
      row stays readable and is NOT labelled "Deleted account"; a no-op call
      adds no row
- [ ] Migration check: the app boots against V23 with `ddl-auto=validate`
      green (the existing Testcontainers context-load test proves it), and
      `media_assets`/`guidance_posts` match their entity mappings

## Phase 7 — Public frontend pages (D10, D11)

- [ ] `features/guidance/` (own folder — no cross-feature imports): guidance
      list page and detail page + their gateway (`core` API client, the
      existing gateway conventions)
- [ ] `app.routes.ts`: `/blog` and `/blog/:slug`, both lazy
      (`loadComponent`, the bundle-budget reason the rare routes already
      use), both public, with `title.guidance` / `title.guidanceDetail` and
      a comment stating WHY the URL says "blog" while the feature says
      guidance (D5)
- [ ] `core/i18n/{messages,en,et}.ts`: `nav.guidance`, `title.guidance`,
      `title.guidanceDetail` in BOTH catalogs (the parity guard makes a
      one-sided key a failing test); `shared/page-shell.html`: the nav entry,
      visible to anonymous and authenticated visitors alike
- [ ] Index page: posts in API order, each with title, publication date and —
      only when present — a hero thumbnail (`loading="lazy"`,
      `decoding="async"`, reserved aspect box); loading, empty and error
      states
- [ ] Detail page: title as the page's single `h1`, hero `<img>` with the
      stored alt (or NO image element at all), body rendered with
      `[innerHTML]` and never `bypassSecurityTrustHtml`, not-found state for
      a 404 slug with a link back to the index
- [ ] 360px: both pages reflow with no horizontal scrolling; 48px action
      targets; focus states on the existing tokens

## Phase 8 — Admin editor + media library UI (D8, D9, D10)

- [ ] Admin tab set: add `guidance` and `media` to `AdminTab`
      (`features/admin/admin-page.ts`) with their labels; the audit tab's
      action labels gain the four new values, and `core/models.ts` gains the
      DTOs + the four `AdminAuditAction` members (a type error until it does)
- [ ] `admin-gateway.ts`: the thirteen new endpoints, 1:1, in the existing
      documented-list style
- [ ] **Guidance tab**: post list (title, slug, status badge, pinned,
      published, updated) with publish/unpublish + delete-with-confirm per
      row and a create action; the create/edit form (title, slug with the
      generated value shown, locale, pinned, status, hero picker + mandatory
      alt, body editor)
- [ ] **Editor** (D9): `contenteditable` region with an accessible name +
      a `role="toolbar"` of native buttons (h2, h3, bold, italic, bullet
      list, numbered list, blockquote, link, clear formatting); plain-text
      paste handler; link dialog with the `http`/`https`/`mailto` prefix
      check; **no new npm dependency**; content replaced by the server's
      stored HTML after a successful save
- [ ] **Media library tab**: asset grid/table (thumbnail with the original
      filename as alt, filename, dimensions, size, uploaded date, reused-by
      count), upload control with the server's errors surfaced, delete action
      — where the in-use 409 answer opens the confirm dialog naming the
      affected posts and stating that those posts will render without an
      image
- [ ] 360px + keyboard pass on both tabs (toolbar wraps, grid single-column,
      tables in `overflow-x: auto` wrappers, 48px targets, every control
      reachable by Tab)

## Phase 9 — Frontend tests

- [ ] Public list: renders the returned posts in order; pinned post first;
      empty state; error state; hero thumbnail present only for posts that
      have one
- [ ] Public detail: title is the only `h1`; a post WITHOUT a hero renders no
      `img` element (asserted on the DOM, not on a class); a post WITH a hero
      renders an `img` carrying the stored alt; a 404 slug renders the
      not-found state; a stored body containing `script`/`onerror` renders no
      script node and no handler attribute (no sanitizer bypass)
- [ ] Admin guidance tab: form validation (alt mandatory with a hero, alt
      without a hero refused), the generated slug is shown, publish and
      unpublish call the right endpoints and refresh the list, delete opens a
      confirm dialog and only proceeds on confirm, the editor shows the
      server's sanitized body after save, toolbar actions are keyboard
      activatable
- [ ] Admin media tab: rows show thumbnail/filename/dimensions/size/date/
      reused-by; an unreferenced delete proceeds without a dialog; an in-use
      delete renders the confirm dialog naming the affected posts and retries
      with `confirm=true`; a rejected upload surfaces the server message
- [ ] Shell/spec: the nav entry renders for anonymous AND authenticated
      visitors in both locales; `title.spec.ts` covers the two new routes;
      `i18n.spec.ts` parity passes with the new keys
- [ ] 360px assertions for the new pages/tabs (the M13 pattern: no
      page-level horizontal overflow) and 48px target assertions for the new
      actions
- [ ] Gate: `tsc` (both configs) + full `ng test` + prettier clean

## Phase 10 — Docs, whitepaper, validation

- [ ] `README.md`: features entry; API table rows (`GET /api/guidance`,
      `GET /api/guidance/{slug}`, `GET /api/media/{filename}`,
      `/admin/guidance*`, `/admin/media*`); env-table rows
      (`MEDIA_UPLOAD_DIR`, `MEDIA_MAX_BYTES`, `GUIDANCE_DEFAULT_LOCALE`);
      a short "Crisis guidance" section stating WHERE sanitization happens
      (server, on every write, allowlist, stored sanitized) and the media
      directory/boot behaviour; the refreshed test counts once run
- [ ] `docs/whitepaper.md`: the guidance + media-library paragraph (public
      pinned-first guidance, admin authoring with server-sanitized rich
      text, the media library) and the two honest v1 deferrals (no inline
      body images; locale stored but no translation workflow), plus the
      derivative/thumbnail-pipeline follow-up
- [ ] Backend agent pack `context-and-tasks/agent/06-CONTEXT-API.md`: the new
      endpoint group + the sanitizer and media-storage rules
- [ ] Frontend agent pack `frontend/docs/agent/02-CONTEXT-API.md`: the new
      gateway surface and the `/blog` routes; `frontend/README.md`: the
      deferrals line
- [ ] `openspec validate crisis-guidance --strict` passes, then
      `openspec validate --all` (no previously-valid change regressed), and
      the two reported spec-sync items for the in-flight `admin-moderation`
      delta are re-stated in the archive notes (do NOT edit that change's
      artifacts here)
- [ ] Confirm no upload ever becomes repo content: `git check-ignore -v
      data/media/<file>` and `git status --short` show no media files
