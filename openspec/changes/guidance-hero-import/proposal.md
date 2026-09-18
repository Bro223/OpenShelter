# Change: guidance-hero-import

## Why

A guidance post's hero image must today be a separate two-step
dance: upload the file to the media library first (multipart), then
point the post at the returned asset id. For the common admin
workflow — "I have this image on my own web host / in this URL" —
the library is a wall: the image would have to be downloaded by the
admin and re-uploaded. The owner's decision: let the admin paste an
image URL into the hero field, and have the SERVER fetch it when the
post is PUBLISHED, validate it like any upload, store it under a
generated name through the existing media pipeline, and link it as
the hero. A failed fetch or validation must FAIL the publish — the
post stays a DRAFT — so a published post can never carry a broken or
unvetted hero.

Because an admin-supplied URL that the server fetches is a classic
SSRF vector (the server is the client, and the target can be
`file:///etc/passwd`, `http://127.0.0.1/admin`, a redirect that
becomes `169.254.169.254`, or a 2 GiB body), the import carries a
full security guard set — scheme allowlist, no credentials, a
per-hop SSRF address policy (entry AND every redirect target),
streaming size cap, connect + read timeouts, magic-byte validation,
and a decompression-bomb pixel cap.

## What Changes

- **Pending import on the post** (`guidance_posts.hero_import_url`):
  `POST /admin/guidance` and `PUT /admin/guidance/{id}` accept an
  optional `heroImportUrl` (≤ 2048 chars) alongside the existing
  `heroImageId`/`heroImageAlt`. On a DRAFT it is stored as a
  **pending import** — nothing is fetched at write time. The
  `heroImageAlt` pairing rule applies to the URL exactly as to an
  asset id.
- **Import at publish**: `POST /admin/guidance/{id}/publish` (and the
  one-shot create-and-publish) runs the import INSIDE the publish
  transaction when a pending URL is set: the URL is re-validated,
  fetched over http/https with ≤ 3 redirect hops (every hop target
  re-validated AND its resolved address re-checked against the SSRF
  policy), size-capped while streaming, sniffed through the existing
  `MediaImageInspector`, stored via the existing `MediaStorage` under
  a generated 32-hex name, linked as the hero (superseding any
  `heroImageId`), and the URL is cleared. Success commits the hero
  link, the asset row and the publish atomically.
- **New media attribution column** (`media_assets.source_url`): the
  origin URL of imported images — the takedown trail (crisis-guidance
  D9: the stored file is ours to remove even if the origin is not).
- **V25 migration** (`V25__guidance_hero_import.sql`): both columns
  plus `ck_guidance_posts_pending_import_only_draft` — a PUBLISHED
  post carries no pending URL (so setting one on a live post is a
  400 "unpublish first", enforced structurally as well as by the
  service).
- **Error vocabulary (no new body shape)**: policy refusals (scheme,
  credentials, disallowed address, disallowed redirect, hop cap,
  remote 4xx, non-image, pixel cap) are 400; remote 5xx, DNS
  failure, connect/read timeout or stall, and the walk budget are
  502 (upstream trouble, retryable); over-cap is the existing 413
  `MediaTooLargeException`. Every failure leaves the post a DRAFT
  with the URL intact for a retry.
- **Configuration** (`app.media.import-*`): connect timeout (3s),
  no-progress read timeout (5s), whole-walk wall-clock budget (10s),
  max side in pixels (10000) — env-overridable, safe defaults.
- **Security documentation**: `docs/security/threat-model.md` gains
  the threat entry for the admin-import SSRF surface with its
  residual risks stated honestly (DNS rebinding, TOCTOU between
  resolve and connect, third-party content trust).
- **Tests**: unit tests for the address classifier, the real fetch
  client against a local HTTP server (cap abort, stall abort,
  redirect passthrough), the import walk (hop cap, redirect-to-
  private refused-and-never-fetched, budget), the service
  integration (draft/publish lifecycle, draft-kept-on-failure), and
  a full-stack endpoint IT (admin JWT, real security chain, local
  stub server).

## Non-Goals

- No frontend: the URL field in the admin editor is a follow-up
  change (the API is ready for it).
- No background/asynchronous import: the publish is admin-only and
  the walk is bounded (≤ 10s), so a synchronous import keeps the
  publish atomic. No retry machinery — a failed publish is retried
  by the admin republishing.
- No fetch of the image at EDIT time (no preview fetch): the
  pending URL is inert until publish.
- No change to the manual upload path (`POST /admin/media`) — it
  keeps its own 5 MiB cap and inspector; the pixel cap applies to
  imported images (see design.md, D5, for the honest residual).
- No per-domain allowlist: the address policy (not a domain list)
  is the guard, deliberately, so no configuration churn is needed
  for a new image host.
