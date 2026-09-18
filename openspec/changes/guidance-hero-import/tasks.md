# Tasks: guidance-hero-import

Next free Flyway version: **V25** — verified against the repo, not
assumed: `ls src/main/resources/db/migration | sort -V | tail` ends
at `V24__retention_pruning.sql`. New migration name:
`V25__guidance_hero_import.sql`.

## Phase 1 — Migration + domain

- [x] `V25__guidance_hero_import.sql`:
      `guidance_posts.hero_import_url VARCHAR(2048) NULL` + CHECK
      `ck_guidance_posts_pending_import_only_draft`
      (`hero_import_url IS NULL OR status <> 'PUBLISHED'`) and
      `media_assets.source_url VARCHAR(2048) NULL`; migration header
      comment in the repo's V22 style: WHY the URL is pending (not
      fetched at edit time), WHY the CHECK is structural, WHY
      `source_url` has no FK/index (takedown attribution, never
      queried by value), and the `ddl-auto=validate` note
- [x] Domain: `GuidancePost.heroImportUrl` (+ the pairing rule
      treating the URL like the asset id, + `linkImportedHero`),
      `MediaAsset.sourceUrl`; entities + mappers updated so
      `ddl-auto=validate` stays green
- [x] API records: `heroImportUrl` (`@Size(max = 2048)`) on
      `CreateGuidancePostRequest` / `UpdateGuidancePostRequest` and
      on `AdminGuidancePostDto` (null once consumed)

## Phase 2 — The import (guards 1–7)

- [x] `HeroAddressPolicy`: the static SSRF classifier over
      `InetAddress` (loopback, unspecified, link-local IPv4 incl.
      169.254.169.254 + fe80::/10, RFC 1918, multicast,
      fc00::/7 ULA incl. fd00:ec2::254, IPv4-mapped unwrap) —
      guard 3's address half
- [x] `HeroAddressResolver` + `DnsHeroAddressResolver` (the seam —
      guard 3)
- [x] `HeroImageFetchClient` + `JdkHeroImageFetchClient`: ONE
      request, `followRedirects(NEVER)`, fixed User-Agent, connect
      timeout (guard 5), head deadline via `sendAsync` polling,
      body read under a stall watchdog (guard 5), size cap
      enforced while reading with the 413 vocabulary (guard 4)
- [x] `HeroImageImportService`: entry validation (guards 1–2 —
      http/https only, no `user:pass@`), the ≤ 3-hop walk with the
      address policy re-checked on EVERY hop target BEFORE it is
      fetched, non-http(s) / malformed / credentialed redirect
      targets refused, the wall-clock budget, remote 4xx → 400 /
      5xx → 502, `MediaImageInspector` sniff (guard 6 — the served
      Content-Type comes from the sniff), the pixel cap (guard 7),
      store through `MediaStorage` + the row with `sourceUrl` and
      the orphan-file cleanup on row failure;
      `HeroImportRefusedException` (400) / `HeroImportUnreachableException`
      (502)
- [x] `GuidanceService`: import wired into publish and the one-shot
      create-and-publish (inside the publish transaction); setting
      a pending URL on an already-published post is a 400
      ("unpublish first"); the URL participates in the alt pairing
      rule; the import supersedes `heroImageId` at publish
- [x] `ApiErrorHandler`: the two new exception → 400 / 502
      handlers (no new response body shape)
- [x] `application.yml`: `app.media.import-connect-timeout` (3s),
      `import-read-timeout` (5s), `import-budget` (10s),
      `import-max-side` (10000 px)

## Phase 3 — Tests

- [x] `HeroAddressPolicyTest` — the classifier against real
      `InetAddress` literals: every refuse family (loopback,
      RFC 1918, link-local + metadata, ULA + the AWS metadata form,
      multicast, unspecified, IPv4-mapped smuggling) and the public
      allow cases
- [x] `JdkHeroImageFetchClientTest` — the REAL client against a
      local `HttpServer`: the User-Agent, the redirect passed
      through UNFOLLOWED, the cap enforced while reading (the
      wire-byte total never exceeds cap + one chunk; the 413
      vocabulary), the stall aborted at the read timeout, the
      deterministic status pass-through
- [x] `HeroImageImportServiceTest` — scripted seams: the entry
      refusals (file:, ftp:, data:, credentials — never fetched),
      the address refusals (loopback/metadata host — never
      fetched), the redirect walk (public hop followed; redirect to
      127.0.0.1 / private / non-http(s) / credentialed / malformed
      — refused and NEVER fetched), the hop cap, the budget, the
      remote 4xx/5xx split, the pixel cap (incl. configurable),
      the sniffing refusal of a lying host, the orphan cleanup
- [x] `GuidanceServiceTest` — the lifecycle: draft carries the
      pending URL (no asset yet), publish consumes it (asset
      linked, URL cleared, `sourceUrl` recorded, one audit row), a
      failed publish leaves the DRAFT with the URL and no asset
      and no audit row, the one-shot create-and-publish (stores
      nothing on failure), the published-post-URL 400, the URL in
      the alt pairing rule, malformed URLs refused at write time
- [x] `HeroImageImportIT` — full-stack MockMvc (admin JWT, the
      real security chain, the real fetch client, a local stub
      server): a valid PNG imported + linked + publicly served;
      text-as-image/png refused (400, draft stays); oversized body
      413 at the cap; redirect-to-127.0.0.1 refused and the secret
      route NEVER fetched; file: and credentialed URLs 400 at
      write time; over-pixel-cap 400; a failed fetch (404) leaves
      the DRAFT with a readable error; a public hop followed; a
      published post cannot take a pending URL
- [x] `MediaServiceTest` / `GuidanceServiceTest` call sites updated
      to the new `GuidancePost` factory arity

## Phase 4 — Docs + verification

- [x] `docs/security/threat-model.md`: the admin-import SSRF entry
      (the guard set, the failure vocabulary, the residual risks —
      DNS rebinding, TOCTOU, third-party content trust, the
      upload-path pixel-bomb residual, the in-transaction hold)
- [x] `README.md`: the Flyway range `V1`–`V25` and the
      `HERO_IMPORT_*` env rows
- [x] Regenerate `docs/api/openapi.json` (`-Dopenapi.update=true`
      — the new `heroImportUrl` parameters + `sourceUrl` on
      `MediaAssetDto`) and confirm `OpenApiSnapshotIT` passes
- [x] Full build: `flock /tmp/openshelter-mvn.lock mvn clean test`
      green — 910 tests, 0 failures, 0 errors
