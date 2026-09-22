# Change: guidance-hero-import

> **Trigger reversal (2026-09-22, V33) — read this first.** This change was
> originally specified with the import at **publish** time: the URL was a
> *pending import* only DRAFT posts could carry, a failed fetch FAILED the
> publish, and setting a URL on a live post was a 400 ("unpublish first")
> structurally enforced by the V25 CHECK
> `ck_guidance_posts_pending_import_only_draft`. That model shipped on
> 2026-09-19 (9d6b294, V25) — and was then REVERSED: the import moved to
> **SAVE** time (create and update, draft and published alike, Wave 9 —
> 9d81d4a, V33, which drops the CHECK; the failure copy settled in c406f5c).
> This proposal has been rewritten to the SHIPPED truth, and the reversal is
> stated here explicitly rather than absorbed. The rejected publish-time
> design is preserved in `design.md` ("Alternatives Considered") and in the
> V25 migration header, which records the era it shipped in.

## Why

A guidance post's hero image must today be a separate two-step
dance: upload the file to the media library first (multipart), then
point the post at the returned asset id. For the common admin
workflow — "I have this image on my own web host / in this URL" —
the library is a wall: the image would have to be downloaded by the
admin and re-uploaded. The owner's decision: let the admin paste an
image URL into the hero field, and have the SERVER fetch it when the
post is **saved** (draft or published, create or update), validate
it like any upload, store it under a generated name through the
existing media pipeline, and link it as the hero. A failed fetch or
validation never blocks the save — the post is stored anyway, the
failure is named against the hero field in the write response, and
the URL is kept for a retry on the next save.

Because an admin-supplied URL that the server fetches is a classic
SSRF vector (the server is the client, and the target can be
`file:///etc/passwd`, `http://127.0.0.1/admin`, a redirect that
becomes `169.254.169.254`, or a 2 GiB body), the import carries a
full security guard set — scheme allowlist, no credentials, a
per-hop SSRF address policy (entry AND every redirect target),
streaming size cap, connect + read timeouts, magic-byte validation,
and a decompression-bomb pixel cap.

## What Changes

- **Import at save** (`POST /admin/guidance` and
  `PUT /admin/guidance/{id}` — create and update, draft and
  published alike): an optional `heroImportUrl` (≤ 2048 chars) is
  accepted alongside the existing `heroImageId`/`heroImageAlt`. It
  is shape-checked at write time (a parseable absolute http(s) URL
  naming a host, no `user:pass@` — a malformed shape is 400 BEFORE
  any I/O) and then fetched, validated and stored IN THE SAVE
  ITSELF: the URL is re-validated, fetched over http/https with ≤ 3
  redirect hops (every hop target re-validated AND its resolved
  address re-checked against the SSRF policy), size-capped while
  streaming, sniffed through the existing `MediaImageInspector`,
  stored via the existing `MediaStorage` under a generated 32-hex
  name, and linked as the hero (superseding any `heroImageId`). The
  import runs in its OWN transaction (`REQUIRES_NEW`) so a failure
  cannot roll back the save. The `heroImageAlt` pairing rule
  applies to the URL exactly as to an asset id.
- **A failed import never blocks the save**: the write answers 200
  with the post stored AS REQUESTED and `heroImportError` in the
  response body naming the failure (policy/refusal, upstream
  trouble, over-cap — the same message families the import's
  exception classes carry); the URL stays on the post for a retry
  on the next save, and the hero falls back to the request's
  library reference — or, on an update, to the post's existing
  hero, so a live post's hero is never lost to a failed fetch and a
  fresh post is simply hero-less.
- **The stored URL is provenance, not a pending state**: after a
  successful import the URL stays on the post — it is where the
  hero came from (the asset's `source_url` records the same
  origin). Re-saving a post whose current hero IS the import of
  that URL is idempotent — no re-fetch, no duplicate asset; a
  CHANGED URL re-imports (the new asset supersedes the previous
  hero; the replaced asset stays in the library). Clearing the URL
  (and the hero id) clears the hero (the imported asset stays in
  the library).
- **Publish no longer imports**: the publish STEP fetches nothing —
  `POST /admin/guidance/{id}/publish` is a plain status flip. The
  one-shot create-and-publish imports at its SAVE step like any other
  save (the create runs the import; the publish that follows it
  fetches nothing), and a failed import does not demote the requested
  status — the post is stored as asked, hero-less where the import
  failed. A post with a failed or unimported URL therefore publishes
  exactly as stored (the URL stays for a retry), so publishing is
  never the moment an image can fail for the first time, and no post
  is unpublishable because of an image problem.
- **The V25 CHECK is dropped** (V33):
  `ck_guidance_posts_pending_import_only_draft`
  (`hero_import_url IS NULL OR status <> 'PUBLISHED'`) no longer
  holds — a saved post may legitimately carry its import URL in
  EVERY state (provenance after a success, a retryable pending
  import after a failure). V25 keeps its history (an applied
  migration is never amended); V33 drops the constraint. The
  property the CHECK defended is preserved by construction: a page
  renders the hero ONLY from `hero_image_id` (a validated stored
  asset or nothing) — the import URL is never a rendering source,
  on any page, in any state.
- **New media attribution column** (`media_assets.source_url`): the
  origin URL of imported images — the takedown trail (crisis-guidance
  D9: the stored file is ours to remove even if the origin is not).
- **Migrations**: `V25__guidance_hero_import.sql` adds both columns
  plus the CHECK (its header records the publish-time design as it
  shipped); `V33__guidance_hero_import_on_save.sql` drops the CHECK
  when the import moved to save time.
- **Error vocabulary (no new body shape)**: the write-time shape
  refusals are 400 in the existing validation vocabulary; an
  import's failure is NOT an HTTP error — it rides the write's 200
  body as `heroImportError` (the `HeroImportRefusedException` /
  `HeroImportUnreachableException` / `MediaTooLargeException`
  message families, unchanged).
- **Configuration** (`app.media.import-*`): connect timeout (3s),
  no-progress read timeout (5s), whole-walk wall-clock budget (10s),
  max side in pixels (10000) — env-overridable, safe defaults.
- **Security documentation**: `docs/security/threat-model.md`
  carries the threat entry for the admin-import SSRF surface with
  its residual risks stated honestly (DNS rebinding, TOCTOU between
  resolve and connect, third-party content trust).
- **Tests**: unit tests for the address classifier, the real fetch
  client against a local HTTP server (cap abort, stall abort,
  redirect passthrough), the import walk (hop cap, redirect-to-
  private refused-and-never-fetched, budget), the service
  integration (the save-time lifecycle: import-at-save,
  save-survives-failure, same-URL idempotency, changed-URL
  re-import, published-post-at-save), and a full-stack endpoint IT
  (admin JWT, real security chain, local stub server).

## Non-Goals

- No background/asynchronous import: the save is admin-only and the
  walk is bounded (≤ 10s), so a synchronous import inside the save
  keeps the admin's feedback immediate. No retry machinery — the
  next save IS the retry.
- No change to the manual upload path (`POST /admin/media`) — it
  keeps its own 5 MiB cap and inspector; the pixel cap applies to
  imported images (see design.md, D5, for the honest residual).
- No per-domain allowlist: the address policy (not a domain list)
  is the guard, deliberately, so no configuration churn is needed
  for a new image host.
