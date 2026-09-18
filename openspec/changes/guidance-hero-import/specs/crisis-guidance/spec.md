# Spec Delta: crisis-guidance (guidance-hero-import)

## ADDED Requirements

### Requirement: Hero image import (admin)

The admin guidance endpoints SHALL accept an optional
`heroImportUrl` (a URL string, max 2048 chars) on
`POST /admin/guidance` and `PUT /admin/guidance/{id}`. On a DRAFT
post the URL is stored as a **pending import**: nothing is fetched
at write time, the URL participates in the hero-alt pairing rule
(a pending URL requires `heroImageAlt`, exactly as an asset id
does), and setting a pending URL on an already-PUBLISHED post
SHALL be refused with 400 (the workflow is unpublish → edit →
republish; the V25 CHECK
`ck_guidance_posts_pending_import_only_draft` enforces the
invariant structurally).

At publish time — `POST /admin/guidance/{id}/publish` and the
one-shot create-and-publish — the pending import SHALL run INSIDE
the publish transaction and, on success, SHALL store the image
through the existing media pipeline (generated 32-hex file name,
magic-byte-sniffed `content_type`, `media_assets.source_url`
recorded) and link it as the hero, superseding any `heroImageId`,
and clear the URL.

#### Scenario: A valid image URL is imported at publish

- **WHEN** an admin publishes a draft whose `heroImportUrl` points
  to a readable image over http(s)
- **THEN** the publish succeeds, the post is PUBLISHED with the
  imported asset as its hero, the `heroImportUrl` is cleared, and
  the asset row records the origin in `source_url`

#### Scenario: A failed import fails the publish

- **WHEN** the import is refused or the fetch fails at publish
- **THEN** the publish fails with a readable error (400 for
  policy/refusal, 502 for upstream trouble, 413 for over-cap) and
  the post STAYS a DRAFT with the URL intact — no asset row, no
  hero link, no audit row, nothing committed

#### Scenario: A pending URL on a published post is refused

- **WHEN** an admin updates an already-published post with a
  non-null `heroImportUrl`
- **THEN** the API answers 400 telling the admin to unpublish
  first, and the post is unchanged

### Requirement: Hero import SSRF guard set

The import SHALL enforce, in order, before and during the fetch:

1. **Scheme allowlist** — only `http` and `https`; `file:`,
   `data:`, `gopher:`, `javascript:` and every other scheme are
   refused with 400 before any I/O.
2. **No credentials** — a URL with `user:pass@` (userinfo) is
   refused with 400 before any I/O (the pasted credentials must
   never be transmitted to the remote host).
3. **SSRF address policy on the entry AND every redirect hop** —
   the host of the URL about to be fetched is resolved and EVERY
   resolved address classified; any loopback, RFC 1918 private,
   link-local (incl. the cloud-metadata 169.254.169.254 and
   fe80::/10), unique-local (fc00::/7, incl. fd00:ec2::254),
   multicast or unspecified address is refused with 400 and that
   URL is NEVER fetched. Redirects are followed by the service
   (never by the HTTP client), at most 3 hops, and EVERY hop
   target is re-validated (scheme, credentials, shape) and its
   ADDRESS re-checked the moment before it is fetched. A
   non-http(s) or malformed `Location` is refused with 400 and
   never fetched.
4. **Streaming size cap** — the body is read with the existing
   `app.media.max-bytes` cap enforced WHILE reading; past the cap
   the connection is aborted (not buffered) and the fetch fails
   with 413.
5. **Connect + read timeouts** — a connect timeout bounds the
   handshake; a no-progress read timeout bounds the head and the
   body (a stalled host is aborted, not awaited); a wall-clock
   budget bounds the whole walk.
6. **Magic-byte validation** — the stored type is the SNIFFED
   type (never the remote's Content-Type); bytes that are not a
   readable JPEG/PNG/WebP are refused with 400.
7. **Decompression-bomb pixel cap** — an image whose DECLARED
   dimensions exceed the configured max side (default 10000 px)
   is refused with 400 before anything is stored.

The residual risks (DNS rebinding / resolve-connect TOCTOU,
third-party content trust) are stated in
`docs/security/threat-model.md`.

#### Scenario: A public host redirects to 127.0.0.1

- **WHEN** the entry URL passes the address policy and its host
  answers a 302 with `Location: http://127.0.0.1/...`
- **THEN** the publish fails with 400 naming the refused address,
  and the loopback URL is NEVER fetched

#### Scenario: A non-http(s) or credentialed redirect target is refused

- **WHEN** a hop target's `Location` uses a non-http(s) scheme or
  carries `user:pass@`
- **THEN** the publish fails with 400 and the target is never
  fetched

#### Scenario: A host resolving to a disallowed address is never fetched

- **WHEN** the entry URL's host (or any hop's host) resolves to a
  loopback, private, link-local, unique-local, multicast or
  unspecified address
- **THEN** the publish fails with 400 and that URL is never
  fetched

#### Scenario: More than three redirects are refused

- **WHEN** the walk has followed 3 redirects and the response is
  still a redirect
- **THEN** the publish fails with 400 and the walk stops

#### Scenario: A text file served as image/png is refused

- **WHEN** the remote serves text bytes with
  `Content-Type: image/png`
- **THEN** the sniff refuses the bytes with 400, nothing is
  stored, and the post stays a DRAFT

#### Scenario: An image over the pixel cap is refused

- **WHEN** the fetched bytes are a valid PNG whose header claims a
  dimension over the configured max side
- **THEN** the publish fails with 400, nothing is stored, and the
  post stays a DRAFT

#### Scenario: A file: URL is refused at write time

- **WHEN** an admin sets `heroImportUrl` to a `file:///...` URL
- **THEN** the write is refused with 400 and nothing is fetched
