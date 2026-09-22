# Design: guidance-hero-import

> **Trigger reversal (2026-09-22, V33).** D1 and D2 below state the
> SHIPPED design (save-time import, own-transaction import, failure
> never blocks the save). The original design — publish-time import
> inside the publish transaction, the URL a draft-only pending state
> with the structural V25 CHECK — shipped on 2026-09-19 (9d6b294) and
> was reversed the same week it was written into this document
> (9d81d4a, V33). It is preserved under "Alternatives Considered" as
> the first alternative, with the reversal stated: that option was
> rejected IN DESIGN and then shipped anyway, and the option listed
> as rejected (fetch at save time) is what the code does. The V25
> migration header keeps the publish-time era's record; V33 records
> the reversal.

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
- **The uniform error vocabulary** (`ApiErrorHandler` + the
  `GuidanceValidationException` 400 family): a write-time shape
  refusal is an ordinary 400; an import's failure is NOT an HTTP
  error — it rides the write's 200 body as `heroImportError`, in
  the same message families the import's exception classes carry
  (`HeroImportRefusedException` / `HeroImportUnreachableException`
  / `MediaTooLargeException`). No new response body shape.

Repo conventions: Flyway with `ddl-auto: validate` (every mapped
column exists with the same shape), domain + entity/mapper/
repository per aggregate, env-only configuration with safe
defaults, the admin guard (fresh per-request `UserKind.ADMIN`
lookup).

## Decisions

### D1 — The import runs AT SAVE (the Wave 9 trigger)

The URL is fetched, validated and stored when the post is SAVED —
create and update, draft and published alike (`GuidanceService
.create`/`update` → `resolveHeroOnSave`, after every write-time
validation, so a doomed save never spends a network fetch). A
successful import links the asset as the hero (superseding any
`heroImageId`) and the URL STAYS on the post as the hero's
provenance (the asset's `source_url` records the same origin). A
failed import never blocks the save: the post is stored as
requested, the failure is named in the write response's
`heroImportError` (against the hero field), the URL is kept for a
retry on the next save, and the hero falls back to the request's
library reference — or, on an update, to the post's existing hero
(a live post's hero is never lost to a failed fetch; a fresh post
is simply hero-less, which renders fine).

Consequences:

- a saved post may carry its import URL in EVERY state — provenance
  after a success, a retryable pending import after a failure. The
  V25 CHECK `ck_guidance_posts_pending_import_only_draft`
  (`hero_import_url IS NULL OR status <> 'PUBLISHED'`) — which made
  "a published post carries no pending URL" structural — is DROPPED
  by V33; the "unpublish first" 400 for a URL on a live post is
  gone (the IT `aPublishedPostTakesAnImportUrlAtSave` pins the
  reverse).
- re-saving a post whose current hero IS the import of the given
  URL (its asset's `source_url` records it) does NOT re-fetch — no
  duplicate asset; a changed URL re-imports and the replaced asset
  stays in the library (crisis-guidance D8).
- publish no longer fetches, validates or stores anything — a post
  with a failed or unimported URL publishes exactly as stored, so
  publishing is never the moment an image can fail for the first
  time, and no post is unpublishable because of an image problem.
- the property the dropped CHECK defended is preserved by
  construction, not by constraint: a page renders the hero ONLY
  from `hero_image_id` (a validated stored asset or nothing) — the
  import URL is never a rendering source, on any page, in any
  state.

### D2 — The import runs in its OWN transaction (`REQUIRES_NEW`)

The import is `HeroImageImportService.importHero`,
`@Transactional(propagation = Propagation.REQUIRES_NEW)`: a failure
rolls back the asset row (the just-written file is removed by the
store step) and propagates to the save, which STORES THE POST
ANYWAY — the save and the import commit independently, so a failed
import can never roll back the post and a success commits the
library row before the caller links it as the hero. The price is a
network call while the admin's save request is held: bounded by the
walk budget (default 10s) and the save is admin-only
(rate-limited surface), so the exposure is one admin's save pinning
a connection for at most 10s — accepted, and documented in the
threat model. (The pre-reversal design ran the fetch INSIDE the
publish transaction for atomicity; the reversal makes atomicity
irrelevant — the save cannot fail on the import, so there is
nothing to roll back together, and a REQUIRES_NEW import also
cannot wedge the save's transaction behind a failed fetch.)

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

### D4 — Error vocabulary: 400 shape at write time, field error at save time

- **400 at write time** (the existing `GuidanceValidationException`
  vocabulary, before any I/O): a `heroImportUrl` that is not a
  parseable absolute http(s) URL, is over 2048 chars, names no
  host, or carries `user:pass@`. The admin can act on these by
  editing the URL.
- **`heroImportError` in the 200 write body** (NOT an HTTP error):
  the import ran and failed — `HeroImportRefusedException`
  (policy: disallowed resolved address, disallowed redirect target,
  hop cap, empty body, remote 4xx, not-a-readable-image, over the
  pixel cap — the last reusing `UnsupportedImageException`'s
  message family), `HeroImportUnreachableException` (upstream
  trouble, retryable: DNS failure, connect failure, connect/read
  timeout or stall, network reset, remote 5xx, the walk budget) or
  `MediaTooLargeException` (over `app.media.max-bytes`). The
  exception classes and their `ApiErrorHandler` mappings (400 /
  502 / 413) are KEPT — the message families are the vocabulary
  and the handlers stay defensive — but the guidance save path
  catches every one of them and surfaces the message as
  `heroImportError` against the hero field instead.

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
server sees the drop) and the 413 vocabulary is raised — the
buffer never exceeds cap + one 8 KiB chunk. No bytes for
`import-read-timeout` closes the stream and fails the fetch (stall
vocabulary). The response HEAD is deadline-polled via `sendAsync`
(the JDK's own request `timeout()` is deliberately NOT used — it
bounds the whole exchange, which would kill a legitimate near-cap
download and it tears the stream down silently instead of failing
it).

### D7 — `media_assets.source_url` (nullable) is cheap and worth it

One nullable `VARCHAR(2048)` + index-free column (never queried by
value). It records WHERE an imported image came from — the
takedown trail (D9 of crisis-guidance): if a pasted URL turns out
to be stolen content, the origin is one query away. It is ALSO the
idempotency key of the save-time model (D1): the re-save check
compares the URL against the current hero asset's `source_url`.
Manual uploads carry NULL. It is exposed on `AdminGuidancePostDto`/
media read paths only as part of the asset, never on the public
surface.

## Alternatives Considered

- **Fetch at PUBLISH time, the URL a draft-only pending import** —
  the FIRST design (this document's original D1/D2): nothing
  fetched at edit time, the import inside the publish transaction,
  the V25 CHECK making "a published post carries no pending URL"
  structural, a failed fetch failing the publish (post stays a
  DRAFT), and a URL on a live post a 400 ("unpublish first").
  SHIPPED 2026-09-19 (9d6b294, V25) — and then REVERSED on
  2026-09-22 (9d81d4a, V33), when the import moved to save time.
  The reversal: the owner edits see the hero right after saving
  (a draft's broken hero is invisible to readers anyway, and a
  published post with a failed import publishes hero-less instead
  of being stuck unpublishable); the "unpublish first" dance for a
  URL on a live post was the sharpest friction; and a save-time
  failure is a FIELD error (the admin sees it against the hero
  field), not a lifecycle failure. The design's own rejection
  rationale (below, the first item) was neutralised by the failure
  semantics: a save-time failure no longer 400s the write, so a
  typo'd URL is a field error the admin can fix and re-save, and
  the idempotency check (D1/D7) means re-editing the URL never
  mints orphan assets.
- **Fetch at edit time, store immediately** (the URL becomes an
  asset id the moment it is saved): better UX (the admin sees the
  image) but makes every draft edit do remote I/O, turns a typo'd
  URL into a 400 on save instead of at publish, and orphans assets
  when the URL is re-edited. Rejected in the original design — and
  it is what the code does, in save-time form (the URL stays on
  the post as provenance rather than becoming an asset id; the
  failure and orphan concerns above are exactly why the failure
  semantics had to change with the trigger).
- **Per-domain allowlist instead of an address policy**: an
  allowlist is configuration churn (every new image host is a
  deploy) and gives false comfort — the address policy is the
  actual SSRF guard. The allowlist question is a policy call for
  the owner, not a code one; if the owner wants one, it is a
  small addition in front of the resolver.
- **Async import with a post state machine (IMPORTING /
  IMPORT_FAILED)**: needed only if the save surface were public
  or the walks unbounded. With a 10s budget on an admin-only
  endpoint, synchronous-in-the-save is simpler and gives the admin
  immediate feedback.

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
- **In-request network hold** (D2): one admin's save can hold an
  HTTP request (and, for the import's own transaction, a
  connection) for up to the walk budget.
