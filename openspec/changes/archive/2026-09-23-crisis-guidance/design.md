# Design: crisis-guidance

## Context

The surfaces this change leans on, all shipped:

- **ADMIN-kind authorization** (`admin-moderation` D2): a fresh
  `UserKind.ADMIN` lookup per `/admin/*` request — no role claim in the JWT,
  so de-provisioning is immediate. 401 anonymous / 403 non-admin. The
  guidance and media admin routes reuse that idiom unchanged.
- **The moderation audit trail** (`community-review-queue` D4):
  `moderation_actions` + `ModerationAuditLog`, written in the SAME JPA
  transaction as the action it records, read back through
  `GET /admin/audit`. Extended here (D12).
- **The locale layer** (`i18n-et-en` slice 1): `Locale = 'en' | 'et'` with
  `DEFAULT_LOCALE = 'en'` in `core/i18n/i18n.service.ts`, the typed `Messages`
  catalog (a key missing from either catalog is a compile error) and the
  en/et key-parity guard in `i18n.spec.ts`. New chrome keys must go through
  it.
- **Narrow-width discipline** (`mobile-responsive-polish` M13): 360px with no
  page-level horizontal overflow, 48px action targets, `overflow-x: auto`
  wrappers around tables, wrapping tab strips.

Repo conventions this plan follows: Flyway migrations with
`ddl-auto: validate` staying green (so every column the entities map must
exist with the same shape); domain objects plus entity/mapper/repository per
aggregate under `persistence/`; env-only configuration with safe defaults and
no committed values; `SecurityConfig` carrying the explicit permit-all list;
Testcontainers-backed backend tests and vitest frontend tests.

Nothing in the repo can hold admin-authored rich text today: shelter rows are
structured and community-owned, `features/legal/` pages are compiled into the
frontend, and the footer notices are hardcoded in `shared/page-shell.html`.

## D1 — Two tables, one FK: the hero image is a REFERENCE, not a copy

`V23__crisis_guidance.sql` creates `media_assets` and `guidance_posts`
(plus one audit column, D12):

- `media_assets`: `id`, `filename` (server-generated, UNIQUE),
  `original_filename` (display metadata only), `content_type` (CHECK in
  `image/jpeg`, `image/png`, `image/webp`), `width`, `height`, `size_bytes`
  (all CHECK > 0), `uploaded_by` (`REFERENCES users (id) ON DELETE SET NULL`
  — the `moderation_actions.moderator_id` precedent: an account erasure must
  not erase the library row), `created_at`.
- `guidance_posts`: `id`, `slug` (UNIQUE), `title`, `body_html`, `locale`,
  `status` (CHECK in `DRAFT`, `PUBLISHED`),
  `pinned BOOLEAN NOT NULL DEFAULT false`, `hero_image_id BIGINT NULL
  REFERENCES media_assets (id) ON DELETE SET NULL`, `hero_image_alt
  VARCHAR(300) NULL`, `published_at`, `created_by`, `created_at`,
  `updated_at`, and two CHECKs:
  `(hero_image_id IS NULL OR (hero_image_alt IS NOT NULL AND
  btrim(hero_image_alt) <> ''))` and
  `((status = 'PUBLISHED') = (published_at IS NOT NULL))`.
- Indexes: a partial index for the public read
  (`(pinned DESC, published_at DESC) WHERE status = 'PUBLISHED'`), one on
  `guidance_posts (hero_image_id)` for the reused-by count and the in-use
  check, and an index on `media_assets (created_at)` for the library listing.

**A post stores `hero_image_id`, never an image URL.** That single choice is
what makes four of the owner's decisions hold structurally instead of by
service discipline:

| Decision | How the FK delivers it |
| --- | --- |
| Hero image optional, no placeholder when absent | the column is nullable; the public DTO carries `heroImage: null` and the page renders no `img` |
| Replacing a hero never deletes the old file | replacing is a pointer move; the old asset keeps its row and stays listed |
| Deleting an in-use asset is allowed and the post falls back to no image | `ON DELETE SET NULL` (plus the explicit alt clear, D8) |
| No broken image can ever reach a page | there is no state in which a post holds a URL pointing at a deleted file — the reference is always either a live asset or NULL |

Uniqueness of the slug is a DB constraint, not a service convention (D5).

## D2 — Sanitization: server-side, allowlist-only, on EVERY write

**Where.** One unit — `BodySanitizer`, a plain class with static methods —
is the only code that produces `body_html`. `GuidanceService` calls it on
create AND on update; nothing else writes the column, and there is no
"trusted" path for the FE to bypass. The admin read returns the stored
(sanitized) HTML so the editor round-trips what is actually stored.

**What.** An allowlist, expressed as a jsoup `Safelist`:

- elements: `h2`, `h3`, `p`, `br`, `strong`, `em`, `ul`, `ol`, `li`, `a`,
  `blockquote` — and nothing else. No inline `img` (images are hero-only), no
  `h1` (the page owns the single `h1`), no table, no `iframe`, no `svg`, no
  `style`, no `script`;
- attributes: exactly `a[href]`. No `class`, no `style`, no `id`, no
  `target`, no `on*` (an event handler is an attribute, so the attribute
  allowlist removes it — there is no separate event-handler rule to get
  wrong);
- `href` protocols: `http`, `https`, `mailto`. A `javascript:` or `data:`
  href is dropped;
- links stay in the same tab (no `target`), so no `rel="noopener"` obligation
  is created.

The exact treatment of disallowed markup (unwrapping an unknown element and
keeping its text, discarding `script`/`style` content outright) is **pinned
by tests rather than asserted here** — the tests are the specification of the
sanitizer (D2 tests in `tasks.md` phase 2).

**Why a library and not a hand-rolled parser.** This repo hand-rolls a lot
(the token-bucket limiter, the redirect client, coordinate parsing) and that
habit is right for small deterministic rules. An HTML sanitizer is the
opposite case: sanitizer bypasses come from parser differentials between what
the sanitizer sees and what the browser executes, so the safe move is a
maintained parser plus a declarative allowlist. jsoup is one small Maven jar
(`org.jsoup:jsoup`, an explicit `<version>` like `proj4j`/`twilio`), no npm
change at all. The runtime path stays tiny: `Safelist.clean(html)` then store.

**Why sanitize on write and store the result** rather than sanitize on read:
the stored value is the same value every future reader gets, so there is no
second chance for a rendering path to skip the sanitizer; and the column
becomes safe by inspection (`SELECT body_html` cannot show a payload). The
cost — a later allowlist change does not retroactively clean old rows — is
accepted and noted in Consequences.

**The client is never the boundary.** The constrained editor (D9) only
constrains what a cooperative browser produces; the API accepts HTML from
any client, so the same sanitizer runs on the same path for a `curl` request
as for the editor. The public page renders the stored HTML through Angular's
own sanitizer (`[innerHTML]`) and never calls
`bypassSecurityTrustHtml` — a frontend test asserts a payload with a
`<script>` element renders no script node.

## D3 — API surface and authorization

| Endpoint | Auth | Notes |
| --- | --- | --- |
| `GET /api/guidance` | permitAll | PUBLISHED only, pinned-first order (D6); 200 `[]` when there is nothing published |
| `GET /api/guidance/{slug}` | permitAll | PUBLISHED only; a draft slug and an unknown slug answer the SAME 404 |
| `GET /api/media/{filename}` | permitAll | the public pages' images (D7); 404 for anything unknown |
| `GET /admin/guidance` | ADMIN | every post incl. drafts, newest-updated first |
| `GET /admin/guidance/{id}` | ADMIN | id-keyed (a draft has a slug, but the admin form edits by id) |
| `POST /admin/guidance` | ADMIN | create, DRAFT by default (an explicit `status` may publish in one call) |
| `PUT /admin/guidance/{id}` | ADMIN | full replace of the editable fields; re-sanitizes (D2) |
| `POST /admin/guidance/{id}/publish` | ADMIN | idempotent: already published → 204 no-op, NO audit row |
| `POST /admin/guidance/{id}/unpublish` | ADMIN | idempotent: already a draft → 204 no-op, NO audit row |
| `DELETE /admin/guidance/{id}?confirm=true` | ADMIN | 400 without `confirm=true` (D4) |
| `GET /admin/media` | ADMIN | the library listing (D8) |
| `POST /admin/media` | ADMIN | multipart upload (D7) |
| `DELETE /admin/media/{id}` | ADMIN | 200 deleted, 409 (naming the posts) when in use without `?confirm=true` (D8) |

Unknown ids answer 404, validation failures 400, all with the existing
`ApiErrorHandler`/`ErrorResponse` shape. `SecurityConfig` gains two
permit-all GET matchers (`/api/guidance/**`, `/api/media/**`) — everything
under `/admin/**` is already `authenticated()` with the per-request kind
check, so no new security rule is needed for the write side beyond the
existing framework.

## D4 — Lifecycle: draft, publish, unpublish, delete

- A post is created `DRAFT` (or `PUBLISHED` when the admin explicitly asks in
  the create call, so a one-shot "write and publish" is possible).
- **Publish** stamps `published_at` from the injected `Clock`. **Unpublish**
  clears it — the CHECK in D1 enforces the pairing, so no state can exist
  with a draft that looks published or vice versa. Re-publishing therefore
  stamps a FRESH instant and the post re-enters the list at the top of the
  non-pinned order. That is deliberate for the use case: an instruction
  re-issued today should outrank last week's text, not sit where the old
  timestamp left it.
- `updated_at` moves on every write (`created_at` on create). `updated_at` is
  visible in the admin list only — it does not affect the public order.
- **Drafts are never public**: the two public endpoints filter
  `status = 'PUBLISHED'` in the query itself, so no code path can leak one by
  forgetting a check in the mapping layer.
- **Hard delete** requires `confirm=true` (400 without it; the admin UI also
  shows a confirm dialog). Deleting a post does NOT touch media assets — they
  belong to the library (D8) — and it does NOT delete its audit rows, which
  keep their label snapshot (D12).

## D5 — Slug: generated from the title, admin-overridable, DB-unique

`SlugFactory.of(title)`:

1. lowercase, then transliterate the Estonian letters explicitly
   (`õ`→`o`, `ä`→`a`, `ö`→`o`, `ü`→`u`, `š`→`s`, `ž`→`z`) — an explicit map
   rather than an NFD-strip, because those six are the letters Estonian
   actually uses and a silent strip would produce `rnnaku` instead of
   `runnaku` for `rünnaku`;
2. every other non-`[a-z0-9]` run becomes a single `-`;
3. trim leading/trailing `-`, collapse repeats, truncate to 200 characters
   (the column width) and re-trim;
4. an empty result falls back to `post` (a title of `!!!` still gets a URL).

Uniqueness: `slug` has a UNIQUE constraint, and uniqueness is enforced
across drafts and published posts alike (a draft reserves its slug — the
alternative would let publishing fail later on a collision the admin never
saw). Collision handling depends on who chose the slug:

- **auto-generated** (`slug` absent from the request): the service appends
  `-2`, `-3`, … and takes the first free value;
- **admin-supplied** (an explicit `slug` in the request): a collision is a
  409 naming the slug. The admin asked for that exact URL; silently
  rewriting it would be the wrong kind of helpful.

Validation of an admin-supplied slug: `^[a-z0-9]+(-[a-z0-9]+)*$`, length
1..200 — the same shape the generator produces, so a hand-written slug and a
generated one are indistinguishable in the URL. Public URL `/blog/{slug}`.

`/blog/{slug}` is the ONE place the word "blog" appears: the capability, the
tables, the API path (`/api/guidance`) and the frontend feature folder
(`features/guidance/`) all say guidance. The route string is fixed by the
owner's contract, and `app.routes.ts` documents why the two words differ.

## D6 — Prominence and ordering

Every query that lists posts for reading orders
`pinned DESC, published_at DESC, id DESC`. The `id` tie-break is the repo's
stable-order discipline (same-timestamp rows must not reorder between calls).
Pinning is a boolean, deliberately not a numeric priority: the owner's
requirement is "force the crisis instruction to the top", and a rank column
would be a richer model than the ask.

## D7 — Media storage: directory, generated names, magic bytes, serving

- **Config** (D13): `app.media.upload-dir` default `data/media`,
  `app.media.max-bytes` default 5 MiB. `spring.servlet.multipart
  .max-file-size`/`max-request-size` are set slightly ABOVE our cap (6 MB),
  because Spring's own default is 1 MB — without that, a 4 MB photo would be
  rejected by the servlet container before our validation ran, and the admin
  would get an opaque container error instead of the documented 413.
- **Filename**: generated by the server as 32 hex characters from a UUID plus
  the extension implied by the SNIFFED type (`.jpg` / `.png` / `.webp`). The
  client's filename is stored as `original_filename` for display only and is
  never part of a path. Non-guessable names are the access control on the
  public serving path (an upload is public once its URL is known — that is
  what the feature needs: posts show them to everyone).
- **Validation order** (each step's failure is a 400 except the size cap,
  which is a 413): byte count of what was actually received (never
  `Content-Length`) → magic bytes → the sniffed type must equal the
  multipart part's declared `Content-Type` (a `.jpg`-named text file and a
  PNG declared as `image/jpeg` both fail) → dimensions must be readable. SVG
  is rejected twice over: it is not in the allowlist, and its content is XML
  text, so it fails the magic-byte step.
- **Inspector**: one small unit sniffs the magic bytes and reads the header
  dimensions for PNG (`IHDR`), JPEG (`SOFn`) and WebP (`VP8`, `VP8L`,
  `VP8X`). Java's `ImageIO` understands JPEG and PNG but has no WebP reader,
  and the listing must show dimensions; a ~150-line header reader tested
  against fixture byte arrays is less risk than a second Maven dependency
  for one format.
- **Serving**: `GET /api/media/{filename}` with `filename` matched against
  `^[a-f0-9]{32}\.(jpg|png|webp)$` and then resolved under the configured
  directory with a parent-equality check — the regex alone already forbids
  traversal, and the resolved-path check is the belt to its braces. The
  response sets `Content-Type` from the STORED type (never re-derived from
  the extension or the request), `Cache-Control: public, max-age=31536000,
  immutable` (generated names are never reused, so a cached entry can never
  be stale), and everything unknown answers 404. `X-Content-Type-Options:
  nosniff` is already global (`SecurityHeadersFilter`).
- **The path sits under `/api/`** on purpose: `frontend/proxy.conf.json`
  already proxies `/api`, so the public pages and the admin thumbnails load
  in the dev environment with no proxy change — the M13 defect was exactly a
  missing prefix.
- **Gitignore**: the default directory is `data/media`, already covered by
  the repo's `data/` rule (verified with `git check-ignore -v`); the task
  list also adds an explicit `data/media/` line so that a future change to
  the ignore structure cannot silently start committing uploads.
- **No derivative pipeline in v1**: the "thumbnail" in the listing and on the
  index is the stored image rendered at a fixed box (CSS), not a generated
  file. Downscaling on upload or a derivative pipeline is a follow-up, not
  scope.

## D8 — Deleting an asset that is still referenced

Allowed, and it does not delete, unpublish or otherwise touch the post:

1. `DELETE /admin/media/{id}` with no references → the row and the file are
   removed (200).
2. Still referenced → **409** whose message names the affected posts
   (title + slug). The admin UI turns that answer straight into the confirm
   dialog that decision 3 requires ("this image is used by: …").
3. The same call with `?confirm=true` → the asset and the file are removed
   and, in the SAME transaction, every referencing post gets `hero_image_id
   = NULL` **and** `hero_image_alt = NULL`. The FK's `ON DELETE SET NULL`
   is the structural guarantee; the explicit update exists because a single
   `SET NULL` cannot reach the alt column, and leaving a stale alt behind
   would be a small lie in the data.

Rationale for the probe-then-confirm flow (two calls, no extra endpoint):
the set of affected posts is computed by the authority at the moment of the
confirm, so the dialog can never show a stale list — and the UI needs no
second "what would this break?" endpoint to disagree with.

After the delete the post renders with NO image element, its detail still
answers 200, and the index shows it without a thumbnail: decision 1, reached
from the other direction. "No broken image may ever reach the page" is
therefore a property of the data model, not of a render guard.

## D9 — The editor: hand-rolled, keyboard-operable, no new npm dependency

`frontend/package.json` carries 17 dependencies and the project hand-rolls
its components (no UI kit, no rich-text library). The editor is therefore:

- a `contenteditable` region with an accessible name, holding the post body;
- a `role="toolbar"` strip of native `<button>`s (Tab-reachable,
  Enter/Space-activated, `aria-pressed` for bold/italic) that apply `h2`,
  `h3`, bold, italic, bullet list, numbered list, blockquote and link
  around the current selection, plus a plain "remove formatting" action;
- a `paste` handler that inserts `text/plain` only — which is what makes
  "no raw HTML paste" true on the client at all;
- a link dialog that prefixes-check the URL (`http`/`https`/`mailto`) before
  inserting; the server re-checks it regardless.

`document.execCommand` is deprecated-but-universally-implemented and is
acceptable here **only because the browser is not the security boundary**
(D2): a mangled or hostile result is sanitized server-side on the way in, and
the value the admin sees after a save is the sanitized value the server
stored (the editor content is replaced from the response, so any divergence
between what was typed and what is published is visible immediately).

The exact toolbar/selection implementation is an implementation-phase detail;
what is fixed here is: no new npm dependency, keyboard-operable, constrained
to the D2 vocabulary, and the server as the authority.

## D10 — Accessibility and narrow width (project standard: WCAG AA, 360px)

- **Alt text is mandatory whenever a hero image is set** — enforced by the
  D1 CHECK and a 400 in the service. A published post therefore always has a
  non-empty `alt` on its `img`; a post WITHOUT a hero has no `img` element at
  all (nothing to describe, no placeholder, no empty `alt`).
- **Heading order**: the body allowlist contains only `h2`/`h3`, and the page
  renders the post title as the single `h1`; a body cannot contain an `h1`,
  and `h2`/`h3` are the only levels it can add. The editor's default block
  is a paragraph, so a fresh post starts with prose.
- **Keyboard**: the editor toolbar is Tab-reachable with visible focus
  (`:focus-visible` tokens), every action is a native button with an
  accessible name, and the media-library and guidance lists use real buttons
  and links rather than div-click handlers (the pattern the rest of the app
  uses).
- **360px**: the toolbar wraps, the media grid collapses to one column, and
  the admin tables stay inside `overflow-x: auto` wrappers (the documented
  M13 pattern). Every action target is ≥48px (the global `.btn` rule and the
  list-row rule), and the new pages are audited at 360px in both themes like
  the M13 pass did.
- Images in the index carry `loading="lazy"` and `decoding="async"`, and the
  hero box has a fixed aspect ratio so the layout does not shift while the
  image loads.

## D11 — Locale: a stored attribute, not a translation workflow

`locale VARCHAR(5) NOT NULL`, its value defaulted by the service from
`app.guidance.default-locale` (default `en`), which is documented as
mirroring the frontend's `DEFAULT_LOCALE` — the "app's primary language" the
owner's decision names. Flipping the app's default language later means
changing both places, and the README says so.

What v1 deliberately does NOT do (this is what "no translation workflow"
means concretely): no per-locale variants of a post, no locale filter on the
public endpoints, no `Accept-Language` negotiation, no fallback chain. The
field is stored, returned by the API and editable in the admin form — the
data a later translation workflow needs, without pretending the workflow
exists. The follow-up is recorded in Consequences.

Frontend copy: the new CHROME strings (nav label, route titles) go through
the `t` pipe and both catalogs, because the en/et parity guard makes a
one-sided key a failing test. The new feature pages' own copy follows the
current convention for feature pages — `i18n-et-en` slice 1 explicitly left
feature-page copy in English. The post CONTENT is admin-authored and
independent of the chrome language either way.

## D12 — Audit rows for guidance and media

Four new `ModerationAuditLog.Action` values — `GUIDANCE_PUBLISH`,
`GUIDANCE_UNPUBLISH`, `GUIDANCE_DELETE`, `MEDIA_DELETE` — written in the same
transaction as the action, through ONE new overload:

```java
void recordLabeled(long moderatorId, Action action, String subjectLabel, String reason);
```

The existing 7-parameter `record(...)` and all of its call sites stay
untouched.

Why a separate overload rather than the existing method: that method is
shelter/account-shaped (`shelterId`, `subjectUserId`), and a row with both
ids null currently renders as `DELETED_ACCOUNT_NAME`
(`AdminModerationService.auditSubjectName` falls through the shelter branch
to the subject branch) — a guidance row would appear in the admin audit tab
labelled as a deleted account. V23 therefore adds
`moderation_actions.subject_label VARCHAR(300) NULL`, and the audit read
resolves that label FIRST, falling back to the existing shelter/account
resolution when it is null. Every existing row has a null label, so nothing
about the current trail changes.

The label is a snapshot — `Guidance post "Varjumine droonirünnaku ajal"
(varjumine-droonirunnaku-ajal)`, `Media asset "varjumine.jpg"
(a1b2…jpg)` — and the column deliberately has NO FK to either new table: a
deleted post must stay readable in the trail, exactly like a dangling
`shelter_id` renders as "Deleted shelter". `reason` stays free text for a
note when one is given.

Two consequences worth stating: idempotent no-op calls (re-publishing a
published post) write NO audit row — the suspension idiom — and the
department-facing audit vocabulary grows by four values, so the frontend's
`AdminAuditAction` union and its label map gain the same four (a type error
until they do).

## D13 — Configuration and defaults

```yaml
app:
  media:
    upload-dir: ${MEDIA_UPLOAD_DIR:data/media}
    max-bytes: ${MEDIA_MAX_BYTES:5242880}
  guidance:
    default-locale: ${GUIDANCE_DEFAULT_LOCALE:en}

spring:
  servlet:
    multipart:
      max-file-size: 6MB
      max-request-size: 6MB
```

Env-only names with safe defaults, values never committed — the repo's
convention (`DB_URL`, `SMTP_HOST`, `VERIFICATION_SEND_LOG_PATH`), with the
comment block that the file already uses explaining WHY each value exists.
The upload directory is created at startup when missing; a directory that
cannot be created or written FAILS THE BOOT with a clear message, so a
misconfigured deployment is discovered at deploy time rather than on the
first upload (the fail-closed habit of `PiiKeys`/`ProdJwtGuard`).

## Consequences

- **A guidance page can never show a broken image**: posts reference assets by
  id, deletion nulls the reference (D1, D8), and the renderer omits the `img`
  element entirely when the reference is null (D10). There is no state to
  guard against at render time.
- **Stored HTML is safe by construction, and visible as such**: the column
  holds only sanitizer output (D2), so reviewers and readers of the DB see
  what the browser will execute. The known cost: a future allowlist change
  does not retroactively clean rows already stored — a re-save of the post
  (which re-sanitizes) or a one-off backfill is the remedy.
- **The admin learns immediately when the editor and the server disagree**:
  the editor's content is replaced by the stored (sanitized) HTML after each
  save (D9).
- **Uploads are inventory, not garbage**: nothing is deleted implicitly — not
  by a post edit, not by a post delete. The library grows until an admin
  deletes an asset, which is the owner's decision (D8).
- **Follow-ups, explicitly out of scope** (each additive, none blocks this
  change): inline images inside the body; a real translation workflow
  (per-locale variants + a locale-aware public list, i.e. the data D11
  already stores); a derivative/thumbnail pipeline with server-side
  downscaling; replacing `document.execCommand` with a structured block
  editor; automatic cleanup of long-unreferenced assets.
- **Spec-sync items, reported and not edited here** (the
  `remove-shelter-reviews` D4 convention): the in-flight `admin-moderation`
  delta still says the `/admin` page has three tabs while
  `frontend/src/app/features/admin/admin-page.ts:50` defines six today and
  this change takes it to eight; and its audit vocabulary (`GET /admin/audit`)
  does not yet mention the four new action values. Sync those when that
  change archives.
