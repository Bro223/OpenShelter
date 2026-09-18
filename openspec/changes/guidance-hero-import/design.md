# Design: guidance-hero-import

## Context

The surfaces this change leans on, all shipped (crisis-guidance):

- **The media pipeline** (`MediaService` / `MediaStorage` /
  `MediaImageInspector`): uploads are sniffed, never trusted — the
  stored `content_type` comes from the magic bytes, the file name is
  a generated 32-hex slug (the admin's `originalFilename` is stored
  separately and never used to name the file), and a row failure
  removes the just-written file (no orphans). The import reuses this
  pipeline verbatim: a downloaded image is, to the store, an upload.
- **The redirect-walk discipline** (`LocationResolveService` +
  `HttpUrlRedirectClient`): bounded hops, per-hop re-validation, a
  wall-clock budget — the geo resolver's walk is the idiom this
  import copies, with two deliberate differences: the scheme MAY
  upgrade (http→https is legitimate for a CDN; the geo resolver's
  pinned-scheme rule serves its whitelist) and the target's
  ADDRESS, not just its shape, is re-checked every hop.
- **The JDK `HttpClient` idiom** (`CsvRegistryClient`): no new
  dependency, a fixed User-Agent that identifies the caller
  upstream, bounded timeouts, streaming reads.
- **The uniform error vocabulary** (`ApiErrorHandler`): each failure
  class maps to an existing status — no new response body shape.

Repo conventions: Flyway with `ddl-auto: validate` (every mapped
column exists with the same shape), domain + entity/mapper/
repository per aggregate, env-only configuration with safe
defaults, the admin guard (fresh per-request `UserKind.ADMIN`
lookup).

## Decisions

### D1 — The URL is a PENDING IMPORT, consumed at publish

The URL is NOT fetched at edit time. `guidance_posts.hero_import_url`
holds the admin's URL while the post is a draft. NOTHING is fetched
at create/update time — the write path stays offline and instant,
an admin can edit the URL without triggering remote I/O, and the
URL + alt pairing rule applies at write time exactly like the
asset id. The import runs at publish (the moment the hero becomes
public) and, on success, clears the URL and sets `hero_image_id`.
Consequences:

- the V25 CHECK `ck_guidance_posts_pending_import_only_draft`
  (`hero_import_url IS NULL OR status <> 'PUBLISHED'`) makes the
  invariant structural: a published post cannot carry a pending
  URL, so "set a URL on a live post" is a 400 (service) that the
  database would also refuse (belt and suspenders).
- a failed publish leaves the URL on the draft: fix the URL (or the
  upstream) and republish — no state to clean up, no retry
  machinery.

### D2 — The import runs INSIDE the publish transaction

The publish, the asset row and the hero link commit atomically — a
failure anywhere rolls back all three, so a post can never publish
with a half-written asset and no asset can appear without its post
state. The price is a network call while a DB transaction is held:
bounded by the walk budget (default 10s) and the publish is
admin-only (rate-limited surface), so the exposure is one admin's
publish pinning a connection for at most 10s — accepted, and
documented in the threat model. (The alternative — fetch before
the transaction — opens a window where the file is on disk but the
post is not published, the exact orphan the upload path already
avoids.)

### D3 — Two seams: address resolution and the single fetch

The real implementation is a JDK `HttpClient` (`JdkHeroImageFetchClient`)
that performs ONE request with `followRedirects(NEVER)` and returns
the status, `Location` and (for non-redirects) the body bytes —
redirects are the SERVICE's business, never the client's. Two
seams make the policy testable without a production DNS:

- `HeroAddressResolver` (default `DnsHeroAddressResolver` —
  `InetAddress.getAllByName`): the service resolves the host of
  the URL about to be fetched and classifies EVERY resolved
  address (`HeroAddressPolicy` — loopback, RFC 1918, link-local
  incl. 169.254.169.254, ULA fc00::/7 incl. fd00:ec2::254,
  multicast, unspecified, and IPv4-mapped smuggling). The tests
  script this map exactly as `LocationResolveIT` scripts its
  `RedirectClient` — the real classifier is unit-tested against
  real `InetAddress` literals instead.
- `HeroImageFetchClient`: the IT swaps the client for a
  host-rewrapping delegate around the REAL client, so the real
  streaming, cap, stall and redirect behaviour is exercised
  against a local `HttpServer` (a loopback test server cannot pass
  the real address policy — the policy would correctly refuse it).

### D4 — Error vocabulary: 400 policy, 502 upstream, 413 size

- **400 `HeroImportRefusedException`** — the input or the remote
  ANSWER is wrong: scheme, credentials, disallowed resolved
  address, disallowed redirect target, hop cap, empty body, remote
  4xx, not-a-readable-image, over the pixel cap (the last reuses
  `UnsupportedImageException` — same message family the upload
  path uses). The admin can act on these by editing the URL.
- **502 `HeroImportUnreachableException`** — upstream trouble,
  retryable: DNS failure, connect failure, connect/read timeout or
  stall, network reset, remote 5xx, the walk budget.
- **413 `MediaTooLargeException`** — the existing upload
  vocabulary; a downloaded image is an "uploaded" image from the
  admin's point of view, and the message names the cap.

All failures propagate to the controller and the publish's
transaction rolls back — the post stays a DRAFT with the URL
intact.

### D5 — The pixel cap is NEW and applies to the import path

`MediaImageInspector` sniffs the type and reads the declared
dimensions from the header (no decode), but nothing today caps
dimensions: a 33-byte file claiming 100001×1 passes the inspector
and would later pin a decoder (browser or tool) that trusts the
header. The import adds a configurable max side (default 10000
px) checked against the DECLARED dimensions — a decompression-bomb
guard. It is wired at the import (not the inspector) deliberately:
the manual upload path keeps its existing behaviour in this
change (the upload path's pixel-bomb exposure is the same and is
called out as residual risk in the threat model; capping uploads
is a follow-up).

### D6 — Size cap enforced WHILE READING (guard 4)

The client's body read is a reader thread + a progress watchdog:
each chunk updates a byte counter and a last-progress instant;
past `app.media.max-bytes` the stream is closed immediately (the
server sees the drop) and the 413 is raised — the buffer never
exceeds cap + one 8 KiB chunk. No bytes for `import-read-timeout`
closes the stream and fails the fetch (stall vocabulary). The
response HEAD is deadline-polled via `sendAsync` (the JDK's own
request `timeout()` is deliberately NOT used — it bounds the whole
exchange, which would kill a legitimate near-cap download and it
tears the stream down silently instead of failing it).

### D7 — `media_assets.source_url` (nullable) is cheap and worth it

One nullable `VARCHAR(2048)` + index-free column (never queried by
value). It records WHERE an imported image came from — the
takedown trail (D9 of crisis-guidance): if a pasted URL turns out
to be stolen content, the origin is one query away. Manual uploads
carry NULL. It is exposed on `AdminGuidancePostDto`/media read
paths only as part of the asset, never on the public surface.

## Alternatives Considered

- **Fetch at edit time, store immediately** (the URL becomes an
  asset id the moment it is saved): better UX (the admin sees the
  image) but makes every draft edit do remote I/O, turns a typo'd
  URL into a 400 on save instead of at publish, and orphans assets
  when the URL is re-edited. Rejected: the pending-import model
  keeps the write path offline and failures on the publish where
  the owner wanted them to fail.
- **Per-domain allowlist instead of an address policy**: an
  allowlist is configuration churn (every new image host is a
  deploy) and gives false comfort — the address policy is the
  actual SSRF guard. The allowlist question is a policy call for
  the owner, not a code one; if the owner wants one, it is a
  small addition in front of the resolver.
- **Async import with a post state machine (IMPORTING /
  IMPORT_FAILED)**: needed only if the publish surface were public
  or the walks unbounded. With a 10s budget on an admin-only
  endpoint, synchronous-in-transaction is simpler and atomic.

## Residual Risks (stated in the threat model, not papered over)

- **DNS rebinding / TOCTOU**: the address is checked at resolve
  time; a hostile DNS can answer public at check time and private
  at connect time. Mitigated in practice by the JDK client
  connecting to the resolved address of the SAME lookup the policy
  saw (no second lookup in between), NOT by re-resolving in the
  client — but a resolver-level rebinding attack remains possible
  in principle. Accepted and documented.
- **Third-party content trust**: an imported image is third-party
  bytes served from our origin to every visitor. The sniff + pixel
  cap bounds what it can BE; whether the content is appropriate is
  the admin's (the admin is the threat model's insider).
- **In-transaction network hold** (D2): one admin's publish can
  hold a DB connection for up to the walk budget.
