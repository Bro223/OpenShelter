# Spec Delta: crisis-guidance (crisis-guidance)

## ADDED Requirements

### Requirement: Public guidance index

The backend SHALL provide `GET /api/guidance` as a permit-all (no JWT)
endpoint returning the PUBLISHED guidance posts as JSON — each with its
`slug`, `title`, `pinned` flag, `locale`, `publishedAt`, `updatedAt` and its
hero image reference (`url` + `alt`, or `null`) — ordered **pinned posts
first, then `publishedAt` descending**, with the row id descending as the
stable tie-break. Draft posts SHALL NOT appear in the response in any form.
The endpoint SHALL NOT expose the post body. An empty result SHALL be `200`
with `[]`, never an error.

#### Scenario: Published posts are listed pinned-first

- **WHEN** an anonymous caller requests `GET /api/guidance` and three posts
  are published — the oldest one pinned
- **THEN** the API answers 200 with all three, the pinned post first and the
  remaining two ordered by `publishedAt` descending

#### Scenario: Drafts are invisible

- **WHEN** a draft post exists alongside published posts
- **THEN** the draft does not appear in the index, and its title and slug are
  absent from the response body

#### Scenario: Nothing published yet

- **WHEN** every post is a draft (or none exist)
- **THEN** the API answers 200 with an empty array and no error

#### Scenario: Same publication instant

- **WHEN** two published posts carry the same `publishedAt`
- **THEN** their relative order is the row id descending, and repeated calls
  return the same order

### Requirement: Public guidance detail

The backend SHALL provide `GET /api/guidance/{slug}` as a permit-all
endpoint returning one PUBLISHED post: `slug`, `title`, `locale`, `pinned`,
`publishedAt`, `updatedAt`, the stored sanitized `bodyHtml`, and the hero
image reference (`url` + `alt`, or `null`). A slug belonging to a draft SHALL
answer exactly the same `404` as an unknown slug — the response SHALL NOT
reveal that a draft exists. The endpoint SHALL NOT accept an id.

#### Scenario: Reading a published post

- **WHEN** an anonymous caller requests the slug of a published post
- **THEN** the API answers 200 with the post's title, sanitized `bodyHtml`
  and hero image reference

#### Scenario: A draft slug is indistinguishable from an unknown slug

- **WHEN** an anonymous caller requests the slug of a DRAFT post and then the
  slug of a nonexistent post
- **THEN** both requests answer 404 with the same error shape and no field
  that distinguishes the two cases

#### Scenario: Unpublishing removes the public page

- **WHEN** a published post is unpublished (moved back to draft)
- **THEN** `GET /api/guidance/{slug}` answers 404 for it and the index no
  longer lists it

### Requirement: Public guidance pages

The frontend SHALL provide a public guidance index at `/blog` and a detail
route at `/blog/{slug}` (both lazily loaded, both public — no auth guard),
with a nav entry visible to every visitor and per-route document titles
resolved from the i18n catalogs (the en/et key-parity guard makes a
one-sided key a failing test). The index SHALL render the posts in the order
the API returns, each with its title, its publication date and its hero
thumbnail **when it has one**; the detail SHALL render the post title as the
page's single `h1` and the stored body HTML. Both pages SHALL have loading,
empty and error/not-found states, SHALL render the body through the
framework's own sanitizer (`[innerHTML]`) and SHALL NOT bypass it. Both
SHALL be usable at a 360px-wide viewport with no horizontal scrolling and
with the standard 48px action targets.

#### Scenario: Index renders the published posts

- **WHEN** an anonymous visitor opens `/blog` and the API returns three
  published posts
- **THEN** the page lists all three in the returned order with their titles,
  dates and — for the posts that have one — a hero thumbnail

#### Scenario: Empty index

- **WHEN** the API returns no published posts
- **THEN** the page renders an empty state explaining that there is no
  guidance yet, and no error banner

#### Scenario: Detail renders the sanitized body

- **WHEN** a visitor opens the detail page of a published post whose body
  contains an `h2`, a paragraph, a bullet list and a link
- **THEN** the page renders those elements inside the post body and the post
  title is the page's only `h1`

#### Scenario: Unknown or draft slug on the detail route

- **WHEN** a visitor opens `/blog/{slug}` for a slug the API answers 404 for
- **THEN** the page renders a not-found state (no crash, no blank page) and
  offers the way back to the index

#### Scenario: A hostile body cannot execute in the page

- **WHEN** the stored body HTML arrives containing a `script` element and an
  inline event-handler attribute (a payload that predates the sanitizer or a
  hand-edited row)
- **THEN** the rendered document contains no `script` node from the body and
  the handler attribute is not present in the DOM

#### Scenario: 360px layout

- **WHEN** the index and a detail page are rendered at a 360px-wide viewport
- **THEN** neither page scrolls horizontally and every action target is at
  least 48px tall

### Requirement: Optional hero image

A post's hero image SHALL be optional: whenever a post has no hero image the
public index and detail SHALL render **no image element at all** — no
placeholder, no spacer, no `img` with an empty `src`. Clearing a post's hero
image SHALL leave the post fully renderable (200, body and title intact).
Whenever a hero image IS set, a non-empty alt text SHALL be required: a write
that sets a hero image without alt text SHALL be rejected with a 400, and the
database SHALL carry the same rule as a CHECK constraint. The rendered `img`
SHALL always carry the stored alt text, and the index thumbnails SHALL be
lazily loaded with an asynchronous decoder and a reserved aspect box.

#### Scenario: Post with no hero image

- **WHEN** a published post has no hero image
- **THEN** its index entry and its detail page contain no `img` element, and
  the page shows no broken-image icon or empty placeholder

#### Scenario: Removing the hero image from a post

- **WHEN** the admin clears the hero image field of a published post and
  saves
- **THEN** the post still renders at its URL with its title and body and no
  image element, and the previously used asset is untouched in the media
  library

#### Scenario: Hero image without alt text is refused

- **WHEN** an admin submits a post with a hero image and a blank or missing
  alt text
- **THEN** the API answers 400 naming the alt-text requirement and stores
  nothing

#### Scenario: Hero image with alt text

- **WHEN** a published post has a hero image with alt text
- **THEN** the rendered `img` carries exactly that alt text and an
  `img` element is present

### Requirement: Constrained rich text and server-authoritative sanitization

Guidance bodies SHALL be limited to a constrained rich-text vocabulary:
headings `h2` and `h3`, paragraphs, line breaks, bold (`strong`), italic
(`em`), bullet lists, numbered lists, links (`a`) and blockquotes. Inline
images inside the body, `h1`, tables, `iframe`, `svg`, `script`, `style` and
custom styles SHALL NOT be storable. Only the `href` attribute SHALL be
allowed, on `a` elements, with the protocol allowlist `http`, `https` and
`mailto`; event-handler attributes and inline `style` SHALL never survive.
The SERVER SHALL be the authority: every write (create and update) SHALL be
run through a strict server-side allowlist sanitizer and the **sanitized
output** SHALL be what is stored, so that a payload posted by any client
(including a direct API call that never touched the frontend editor) cannot
persist. The sanitizer SHALL be idempotent. Client-side constraints in the
admin editor SHALL be defence in depth only and SHALL NOT be relied on for
safety.

#### Scenario: Script and event handlers are stripped

- **WHEN** a write submits a body containing `<script>alert(1)</script>` and
  `<p onclick="alert(1)">text</p>`
- **THEN** the stored body contains no `script` element and no `onclick`
  attribute, and the surrounding text is preserved

#### Scenario: Disallowed containers are removed

- **WHEN** a write submits a body containing an `iframe`, an `svg`, a
  `table`, a `style` block and an inline `style` attribute
- **THEN** none of them survives into the stored body

#### Scenario: Images are hero-only

- **WHEN** a write submits a body containing an `img` element
- **THEN** the stored body contains no `img` element (the hero image is set
  through the post's own field instead)

#### Scenario: Link protocol allowlist

- **WHEN** a write submits links with `javascript:`, `data:` and
  `https://www.paasteamet.ee` targets plus a `mailto:` link
- **THEN** the stored body keeps the `https` and `mailto` hrefs and carries
  no `javascript:` or `data:` href

#### Scenario: Sanitization runs on update too

- **WHEN** a post that was already stored is updated with a body containing a
  `script` element
- **THEN** the stored body after the update contains no `script` element

#### Scenario: Sanitizing twice changes nothing

- **WHEN** an already-sanitized stored body is submitted again through the
  API unchanged
- **THEN** the stored output is byte-identical (sanitization is idempotent),
  so re-saving a post cannot degrade its content

### Requirement: Admin authoring API and authorization

The backend SHALL provide the admin authoring surface —
`GET /admin/guidance` (every post, drafts included, newest-updated first),
`GET /admin/guidance/{id}`, `POST /admin/guidance`, `PUT /admin/guidance/{id}`,
`POST /admin/guidance/{id}/publish`,
`POST /admin/guidance/{id}/unpublish` and
`DELETE /admin/guidance/{id}` — behind the existing ADMIN-kind
authorization: a fresh per-request user lookup requiring `UserKind.ADMIN`,
with no role claim in the JWT. Anonymous callers SHALL receive 401 and
authenticated non-admins 403, with no guidance data in the response. Unknown
ids SHALL answer 404. Title and body SHALL be required on create and update,
and the stored slug SHALL be returned on both.

#### Scenario: Anonymous authoring attempt

- **WHEN** `POST /admin/guidance` arrives without a valid JWT
- **THEN** the API answers 401 and no post is created

#### Scenario: Non-admin authoring attempt

- **WHEN** a verified non-admin account calls any `/admin/guidance` endpoint
- **THEN** the request fails with 403 and no post is created, changed or
  deleted

#### Scenario: Draft listing is admin-only

- **WHEN** the admin requests `GET /admin/guidance`
- **THEN** the response contains drafts as well as published posts, each with
  its status, and no such draft is reachable through the public endpoints

#### Scenario: Unknown id

- **WHEN** the admin updates or publishes an id that does not exist
- **THEN** the API answers 404

### Requirement: Post lifecycle and prominence

Every post SHALL carry a status of `DRAFT` or `PUBLISHED`, a nullable
`publishedAt`, an `updatedAt` and a boolean pinned flag. A post SHALL be
created as a DRAFT unless the create request explicitly asks for
`PUBLISHED`. Publishing SHALL set `publishedAt`; unpublishing SHALL return
the post to DRAFT and clear `publishedAt`; republishing SHALL set a fresh
`publishedAt`. Publish and unpublish SHALL be idempotent — re-publishing a
published post or unpublishing a draft SHALL be a no-op. Drafts SHALL never
be public. Hard delete SHALL be supported and SHALL require an explicit
confirmation (`confirm=true`), answering 400 without it; the delete SHALL
NOT delete the post's media assets and SHALL NOT remove its audit rows.

#### Scenario: Create a draft

- **WHEN** the admin creates a post with a title and a body and no status
- **THEN** the post is stored as DRAFT, the public index does not list it and
  its detail slug answers 404

#### Scenario: Publish stamps the time

- **WHEN** the admin publishes a draft
- **THEN** the post becomes PUBLISHED with `publishedAt` set to the moment of
  the publish call, appears in the public index and answers 200 on its slug

#### Scenario: Unpublish returns it to draft

- **WHEN** the admin unpublishes a published post
- **THEN** the post is a DRAFT again, `publishedAt` is cleared and the public
  surface no longer exposes it

#### Scenario: Publishing twice is a no-op

- **WHEN** the admin publishes an already-published post
- **THEN** the API answers success, `publishedAt` keeps its earlier value and
  no second audit row is written

#### Scenario: Pinning floats a post to the top

- **WHEN** an older published post is pinned and a newer one is not
- **THEN** the public index lists the pinned post first

#### Scenario: Delete requires confirmation

- **WHEN** the admin calls `DELETE /admin/guidance/{id}` without
  `confirm=true`
- **THEN** the API answers 400 and the post still exists

#### Scenario: Confirmed delete

- **WHEN** the admin calls `DELETE /admin/guidance/{id}?confirm=true`
- **THEN** the post is gone (404 from both the admin and public endpoints),
  its hero image asset is still listed in the media library, and the audit
  row for the deletion remains readable

### Requirement: Slug generation, override and uniqueness

A post SHALL have a unique slug. When the create or update request does not
supply one, the server SHALL generate it from the title: lower-cased, with
the Estonian letters `õ ä ö ü š ž` transliterated to `o a o u s z`, every
other non-alphanumeric run collapsed to a single `-`, leading and trailing
`-` trimmed, and the result bounded to the column width; an empty result
SHALL fall back to a fixed default. Uniqueness SHALL be enforced by a
database constraint and SHALL hold across drafts and published posts alike; a
generated collision SHALL be resolved by appending a numeric suffix. An
admin-supplied slug SHALL be validated to the same shape and SHALL be used
exactly as given — on collision the API SHALL answer 409 naming the slug
rather than silently rewriting it. `PUT` SHALL leave the slug unchanged when
the request omits it.

#### Scenario: Estonian title becomes a readable slug

- **WHEN** a post is created with the title "Varjumine droonirünnaku ajal"
  and no slug
- **THEN** the stored slug is `varjumine-droonirunnaku-ajal` and its public
  URL is `/blog/varjumine-droonirunnaku-ajal`

#### Scenario: Generated collision gets a suffix

- **WHEN** a second post with the same title is created
- **THEN** its slug is `varjumine-droonirunnaku-ajal-2` and the first post's
  slug is unchanged

#### Scenario: Diacritics and symbol-only titles

- **WHEN** titles "Õhk-häire: mida teha?" and "!!!" are stored without a slug
- **THEN** their slugs contain no diacritics or symbols, and the symbol-only
  title still receives a non-empty fallback slug

#### Scenario: A draft reserves its slug

- **WHEN** a draft holds a slug and another post with the same generated slug
  is created
- **THEN** the second post receives the numeric suffix — the draft's slug is
  never reused

#### Scenario: Admin-supplied collision is refused

- **WHEN** the admin submits a slug that another post already holds
- **THEN** the API answers 409 naming that slug, and neither post is changed

### Requirement: Admin authoring UI

The admin page SHALL gain a **Guidance** tab listing every post (title, slug,
status badge, pinned flag, publication date, last-updated moment) with, per
row, the publish/unpublish action and delete-with-confirm, plus a create
action. The create/edit form SHALL collect the title, the slug (with the
server-generated value shown once the title is set and editable), the locale,
the pinned flag, the status, the hero image (chosen from the media library,
with a REQUIRED alt-text field that is only meaningful — and only accepted —
when a hero image is set) and the post body in a constrained rich-text
editor. The editor's toolbar SHALL be keyboard-operable (every action
reachable by Tab, activated by Enter or Space, with visible focus), SHALL be
limited to the vocabulary in the sanitization requirement, SHALL paste plain
text only, and SHALL be built without adding an npm dependency. The saved
editor content SHALL be replaced by the HTML the server stored after each
successful save, so the admin sees what was actually persisted. The tab and
the editor SHALL work at a 360px-wide viewport with no horizontal scrolling
and 48px action targets.

#### Scenario: Creating a post through the UI

- **WHEN** the admin fills in a title and a body and saves
- **THEN** the new draft appears in the tab's list with a DRAFT badge and its
  generated slug

#### Scenario: Keyboard-only authoring

- **WHEN** the admin works through the form using the keyboard alone
- **THEN** every toolbar action, the hero picker, the alt field and the save
  and publish controls are reachable and activatable without a pointer

#### Scenario: Alt text is demanded with an image

- **WHEN** the admin picks a hero image and leaves the alt field empty
- **THEN** the form blocks the save with a message naming the alt-text
  requirement, and no request that would fail server-side is silently sent

#### Scenario: Editor content is replaced by what was stored

- **WHEN** the admin saves a body containing markup outside the allowed
  vocabulary
- **THEN** the editor shows the sanitized body afterwards, matching what a
  public reader sees

#### Scenario: The tab at 360px

- **WHEN** the Guidance tab is rendered at a 360px-wide viewport
- **THEN** the toolbar and the form wrap without horizontal scrolling and
  every action target is at least 48px tall

### Requirement: Guidance audit rows

Publishing, unpublishing and deleting a guidance post SHALL each write one
row to the existing moderation audit trail (`GET /admin/audit`) in the SAME
transaction as the action, with the acting admin as the actor and a
human-readable subject label naming the post (title and slug). The row SHALL
remain readable after the post is deleted (a label snapshot, no foreign key
to guidance posts). A no-op call (re-publishing a published post,
unpublishing a draft) SHALL write no row. The audit read SHALL NOT label a
guidance row as a deleted account or a deleted shelter.

#### Scenario: Publishing leaves a trace

- **WHEN** the admin publishes a post and then reads `GET /admin/audit`
- **THEN** the newest row carries the publish action, the acting admin and a
  subject label containing the post's title

#### Scenario: Deleting a post keeps its audit row readable

- **WHEN** the admin deletes a post and then reads the audit trail
- **THEN** the deletion row is present with the post's title in its subject
  label, and it is not rendered as "Deleted account"

#### Scenario: A no-op writes nothing

- **WHEN** the admin calls publish on an already-published post and the audit
  trail is read afterwards
- **THEN** no new row appears for that call

### Requirement: Post locale (v1: stored, no translation workflow)

Every post SHALL carry a `locale` (the app's primary language by default,
editable by the admin) that the API returns on both the index and the
detail. Version 1 SHALL NOT implement a translation workflow: there are no
per-locale variants of a post, the public endpoints SHALL NOT filter by
locale, and no `Accept-Language` negotiation SHALL take place — posts in
different locales are all returned by the index. The follow-up (a translation
workflow that turns this field into per-locale variants and a locale-aware
list) SHALL be documented as a v1 deferral rather than implied to exist.

#### Scenario: Default locale

- **WHEN** the admin creates a post without choosing a locale
- **THEN** the stored locale is the configured primary language and it is
  returned by the public endpoints

#### Scenario: Mixed locales are all listed

- **WHEN** two published posts carry different locales
- **THEN** the public index returns both, with each post's own locale in its
  payload and no filtering by the caller's language preference

#### Scenario: The deferral is documented

- **WHEN** the README and whitepaper describe the guidance section
- **THEN** they state that v1 stores the locale but has no translation
  workflow (no per-locale variants, no locale filtering) as an explicit
  deferral
