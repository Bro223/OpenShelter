# Spec Delta: crisis-guidance (guidance-hero-import)

> **Trigger reversal (2026-09-22, V33).** This delta originally
> specified the import at PUBLISH time, with the URL a pending
> import only DRAFT posts could carry ("a pending URL on a published
> post is refused") and the V25 CHECK
> `ck_guidance_posts_pending_import_only_draft` as its structural
> enforcement. The import moved to SAVE time (create and update,
> draft and published alike) and V33 DROPPED the CHECK — this delta
> is rewritten to the shipped truth, with the reversal stated
> rather than absorbed (see `proposal.md` for the record).

## ADDED Requirements

### Requirement: Hero image import at save (admin)

The admin guidance endpoints SHALL accept an optional
`heroImportUrl` (a URL string, max 2048 chars) on
`POST /admin/guidance` and `PUT /admin/guidance/{id}`. The URL SHALL
be shape-checked at write time — a parseable absolute http(s) URL
naming a host and carrying no `user:pass@` credentials — and a
malformed shape SHALL be refused with 400 BEFORE any I/O. The
`heroImageAlt` pairing rule applies to the URL exactly as to an
asset id.

The import runs AT SAVE — create and update, draft and published
alike (the Wave 9 trigger; this requirement's original publish-time
form was reversed on 2026-09-22, V33): the URL is fetched,
validated and stored in the save itself, in the import's OWN
transaction, so a failure cannot roll back the save. A successful
import SHALL store the image through the existing media pipeline
(generated 32-hex file name, magic-byte-sniffed `content_type`,
`media_assets.source_url` recorded) and link it as the hero,
superseding any `heroImageId`. The URL SHALL then STAY on the post
— as provenance of the stored hero (the asset's `source_url`
records the same origin), and as the retryable pending import after
a failure.

A failed import SHALL NEVER block the save: the write answers 200
with the post stored as requested, `heroImportError` in the
response body naming the failure, the URL kept for a retry on the
next save, and the hero falling back to the request's library
reference — or, on an update, to the post's existing hero (a live
post's hero is never lost to a failed fetch; a fresh post is
simply hero-less, which renders fine). Re-saving a post whose
current hero IS the import of the given URL (its asset's
`source_url` records it) SHALL NOT re-fetch (no duplicate asset); a
changed URL SHALL re-import, the new asset superseding the previous
hero and the replaced asset staying in the media library. Clearing
the URL (and the hero id) SHALL clear the hero.

Publishing SHALL NOT import: the publish step fetches nothing —
`POST /admin/guidance/{id}/publish` is a plain status flip, and in the
one-shot create-and-publish the import belongs to the SAVE step (the
create runs it like any other save; the publish that follows fetches
nothing). A post with a failed or unimported URL therefore publishes
exactly as stored, so no post is unpublishable because of an image
problem, and a failed import does not demote the one-shot's requested
status. A saved post may
therefore carry its import URL in EVERY state; the property the
dropped V25 CHECK (V33:
`ck_guidance_posts_pending_import_only_draft`) once defended is
preserved by construction — a page renders the hero ONLY from
`hero_image_id` (a validated stored asset or nothing), and the
import URL is never a rendering source, on any page, in any state.

#### Scenario: A valid image URL is imported at save

- **WHEN** an admin saves a post (create or update, draft or
  published) whose `heroImportUrl` points to a readable image over
  http(s)
- **THEN** the save succeeds, the post is stored with the imported
  asset as its hero, `heroImportError` is null, the URL stays on
  the post, and the asset row records the origin in `source_url`

#### Scenario: A failed import never blocks the save

- **WHEN** the import is refused or the fetch fails at save
- **THEN** the save still succeeds (200) with the post stored as
  requested and the URL intact for a retry, `heroImportError` in
  the response body names the failure, and no asset row and no
  hero link are written

#### Scenario: A published post takes an import URL at save

- **WHEN** an admin updates an already-published post with a
  `heroImportUrl`
- **THEN** the save succeeds and imports the URL — no unpublish
  first (the old 400 is gone with the V25 CHECK) — the hero is
  linked, and the URL stays on the published post as the stored
  hero's provenance

#### Scenario: A failed import does not demote a one-shot publish

- **WHEN** an admin creates a post with an explicit PUBLISHED
  status and the import fails
- **THEN** the post is stored PUBLISHED as asked, hero-less where
  the import failed, with `heroImportError` in the response and
  the URL kept for a retry

#### Scenario: A same-URL re-save is idempotent

- **WHEN** an admin re-saves a post whose current hero is exactly
  the import of the URL in the save
- **THEN** no fetch happens, no second asset is minted, and the
  post's hero is unchanged

#### Scenario: A changed URL re-imports

- **WHEN** an admin saves the post with a different
  `heroImportUrl`
- **THEN** the import runs again, the new asset supersedes the
  previous hero, and the replaced asset stays in the media library

#### Scenario: Publish does not fetch

- **WHEN** an admin publishes a post whose import previously
  failed
- **THEN** the publish succeeds without any fetch, the post
  publishes exactly as stored (hero-less where the import failed),
  and the URL stays for a retry on the next save

#### Scenario: A file: URL is refused at write time

- **WHEN** an admin sets `heroImportUrl` to a `file:///...` URL
- **THEN** the save is refused with 400 and nothing is fetched

### Requirement: Hero import SSRF guard set

The import SHALL enforce, in order, before and during the fetch:

1. **Scheme allowlist** — only `http` and `https`; `file:`,
   `data:`, `gopher:`, `javascript:` and every other scheme are
   refused before any I/O (the write-time shape check refuses them
   with 400; the import's own enforcement fails the import with the
   same family's message).
2. **No credentials** — a URL with `user:pass@` (userinfo) is
   refused before any I/O (the pasted credentials must never be
   transmitted to the remote host).
3. **SSRF address policy on the entry AND every redirect hop** —
   the host of the URL about to be fetched is resolved and EVERY
   resolved address classified; any loopback, RFC 1918 private,
   link-local (incl. the cloud-metadata 169.254.169.254 and
   fe80::/10), unique-local (fc00::/7, incl. fd00:ec2::254),
   multicast or unspecified address is refused and that URL is
   NEVER fetched. Redirects are followed by the service
   (never by the HTTP client), at most 3 hops, and EVERY hop
   target is re-validated (scheme, credentials, shape) and its
   ADDRESS re-checked the moment before it is fetched. A
   non-http(s) or malformed `Location` is refused and never
   fetched.
4. **Streaming size cap** — the body is read with the existing
   `app.media.max-bytes` cap enforced WHILE reading; past the cap
   the connection is aborted (not buffered) and the fetch fails
   with the over-cap vocabulary.
5. **Connect + read timeouts** — a connect timeout bounds the
   handshake; a no-progress read timeout bounds the head and the
   body (a stalled host is aborted, not awaited); a wall-clock
   budget bounds the whole walk.
6. **Magic-byte validation** — the stored type is the SNIFFED
   type (never the remote's Content-Type); bytes that are not a
   readable JPEG/PNG/WebP are refused.
7. **Decompression-bomb pixel cap** — an image whose DECLARED
   dimensions exceed the configured max side (default 10000 px)
   is refused before anything is stored.

A guard refusal or failure at save time fails the IMPORT, not the
SAVE — the write answers 200 with the post stored as requested,
`heroImportError` carrying the refusal/failure in the message
families above, and nothing stored (see the import requirement).
The write-time shape refusals (item 1's scheme and item 2's
credentials, on the URL as submitted) are the exception: they are
400s, before any I/O.

The residual risks (DNS rebinding / resolve-connect TOCTOU,
third-party content trust) are stated in
`docs/security/threat-model.md`.

#### Scenario: A public host redirects to 127.0.0.1

- **WHEN** the entry URL passes the address policy and its host
  answers a 302 with `Location: http://127.0.0.1/...`
- **THEN** the save succeeds with `heroImportError` naming the
  refused address, nothing is stored, the URL stays for a retry,
  and the loopback URL is NEVER fetched

#### Scenario: A non-http(s) or credentialed redirect target is refused

- **WHEN** a hop target's `Location` uses a non-http(s) scheme or
  carries `user:pass@`
- **THEN** the save succeeds with `heroImportError` and the target
  is never fetched

#### Scenario: A host resolving to a disallowed address is never fetched

- **WHEN** the entry URL's host (or any hop's host) resolves to a
  loopback, private, link-local, unique-local, multicast or
  unspecified address
- **THEN** the save succeeds with `heroImportError` naming the
  refused address family, and that URL is never fetched

#### Scenario: More than three redirects are refused

- **WHEN** the walk has followed 3 redirects and the response is
  still a redirect
- **THEN** the save succeeds with `heroImportError` naming the hop
  cap and the walk stops

#### Scenario: A text file served as image/png is refused

- **WHEN** the remote serves text bytes with
  `Content-Type: image/png`
- **THEN** the save succeeds with `heroImportError` (the
  readable-image refusal), nothing is stored, and the URL stays
  for a retry

#### Scenario: An image over the pixel cap is refused

- **WHEN** the fetched bytes are a valid PNG whose header claims a
  dimension over the configured max side
- **THEN** the save succeeds with `heroImportError` (the pixel-cap
  message), nothing is stored, and the URL stays for a retry

#### Scenario: A file: URL is refused at write time

- **WHEN** an admin sets `heroImportUrl` to a `file:///...` URL
- **THEN** the save is refused with 400 and nothing is fetched
