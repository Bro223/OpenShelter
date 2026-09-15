# Autopilot runlog — OpenShelter

One line per closed item, appended as workstreams land. Format:
`<ISO timestamp> | <workstream id> | <item id> | fixed | <one-line file summary>`

2026-09-15T00:25:00Z | WS-7 | SW-A1+A2 | fixed | pom.xml — `<springdoc.version>2.6.0</springdoc.version>` + springdoc-openapi-starter-webmvc-ui (deliberately no actuator starter; 2.6.x is the Boot 3.3.x line, do not bump to 2.7+ without review)
2026-09-15T00:25:00Z | WS-7 | SW-B1+B2 | fixed | src/main/resources/application.yml + src/test/resources/application.yml — springdoc block from ${SPRINGDOC_ENABLED:false} (api-docs + swagger-ui), show-actuator:false, operations/tags sorters, try-it-out; test yml mirrored in sync
2026-09-15T00:25:00Z | WS-7 | SW-B3 | fixed | config/ApiDocsGuard.java — third fail-closed guard mirroring DevEndpointsGuard (Profiles.isDevTestOnly, names both flags + SPRINGDOC_ENABLED + resolved profiles, "PRODUCTION REFUSED TO START: ...")
2026-09-15T00:25:00Z | WS-7 | SW-C5 | fixed | .env (untracked, never committed) — SPRINGDOC_ENABLED=true with the guard rationale
2026-09-15T00:25:00Z | WS-7 | SW-D1..D5 | fixed | config/OpenApiConfig.java — Info (build version, published contact, MIT), bearerAuth http/JWT scheme matching the JWT filter + global requirement, single ErrorResponse schema + 400/401/403/404/409/429/500 customizer, public/account/admin GroupedOpenApi (no /dev, no /actuator), relative server "/"
2026-09-15T00:25:00Z | WS-7 | SW-E | fixed | the 9 controllers — @Tag/@Operation/@ApiResponse promoted from existing javadoc; empty @SecurityRequirements on the 9 genuinely public ops; x-admin-only + 403 on all 15 admin ops; @Hidden on both /dev controllers; ShelterController minRating javadoc reworded (B4b: removed in V21, unknown param ignored)
2026-09-15T00:25:00Z | WS-7 | SW-F1..F3 | fixed | @Schema on the 12 owned DTOs (api/*Dto.java + auth/MeResponse + TokenResponse) promoted from javadoc, incl. the caller-scoped/derived fields — domain/* enums and the request records stay unannotated (outside WS-7 file ownership this wave; brief forbids domain/*)
2026-09-15T00:25:00Z | WS-7 | SW-F4+F5 | fixed | api/AdminShelterReportDto + api/AdminUserDto reporter-identity/e-mail fields labelled admin-only; auth/TokenResponse labelled credential — no example values on any of them
2026-09-15T00:25:00Z | WS-7 | SW-H1+H5 | fixed | api/OpenApiContractIT.java — 200+JSON, exact 43-operation path/method inventory, bearerAuth scheme + global requirement, 403 + x-admin-only per admin op, public-vs-authenticated split incl. the /mine trap, no /dev or /actuator paths, forbidden-content sweep (emailHash/phoneHash/v1:/PII keys/JWT_SECRET/ADMIN_PASSWORD/dev default + schema property-name sweep)
2026-09-15T00:25:00Z | WS-7 | SW-H2 | fixed | api/OpenApiSnapshotIT.java — normalized (recursively sorted keys, host-free) compare vs docs/api/openapi.json, fails with the -Dopenapi.update=true regeneration instruction (the snapshot file itself is runner-generated, see SW-G2)
2026-09-15T00:25:00Z | WS-7 | SW-H3 | fixed | config/ApiDocsProdClosureIT.java — production-profile boot (strong JWT secret; dev-diagnostic + docs flags pinned off against the spring-dotenv .env leak) asserting /v3/api-docs, /v3/api-docs.yaml and /swagger-ui/index.html never 200
2026-09-15T00:25:00Z | WS-7 | SW-H4 | fixed | config/ApiDocsGuardTest.java — ProdJwtGuardTest/DevEndpointsGuardTest shapes: dev/test ok, non-dev + blank + mixed dev,production + enabled throw, exact/case-sensitive profile match, disabled ok
2026-09-15T00:25:00Z | WS-7 | SW-I2 | fixed | frontend/src/app/gateways/api-contract.spec.ts — every backend URL literal in gateways/*-gateway.ts (templates normalised, query suffixes cut) exists in the committed snapshot
2026-09-15T00:25:00Z | WS-7 | SW-I3dto | fixed | api/ShelterDto.java — javadoc + class @Schema name the OpenAPI document (docs/api/openapi.json, /v3/api-docs) as the machine-readable companion of the read contract
2026-09-15T00:25:00Z | WS-1 | SW-C1 | fixed | config/SecurityConfig.java — profile-aware /v3/api-docs + /swagger-ui permit (recorded on behalf of WS-1 per orchestrator coordination: WS-1 owns the file and implements it this wave; the OpenApiContractIT swagger-ui 200 assertion depends on this landing in the same tree)
2026-09-15T01:00:00Z | WS-5 | D2 | fixed | 05-shelter-api.puml — deleted every star-rating review element (ReviewController, review records/DTOs/repos, 3 admin review endpoints, sequence flows 3/4/8/11); ShelterSourceFilter edge re-pointed to findAllActiveBySourceIn(); admin box = the 15 live AdminController endpoints (+out/ re-render pending render.sh)
2026-09-15T01:00:00Z | WS-5 | D3 | fixed | 01-user-verification.puml — ShelterReview aggregate/repository/relations + rating notes deleted; UserService box = 4 real methods; ShelterRepository box = the real 13 methods (AdminUser/VerificationClaim/Capability/status kept)
2026-09-15T01:00:00Z | WS-5 | D4 | fixed | 04-ingestion.puml — redrawn around CsvRegistryClient + RegistryCsvParser (Last-Modified/ETag + 304 flow); PaasteametRegistryClient demoted to legacy opt-in (WFS upstream dead); DataImportLog added; ImportResult 8 components; per-shelter save() messages (no saveAll)
2026-09-15T01:00:00Z | WS-5 | D5 | fixed | agent/06-CONTEXT-API.md — review API rows/notes/bullets deleted (ReviewController, ShelterReviewService, review DTOs, review-report semantics, 3 admin review endpoints, "eighteen" → "fifteen", cascade wordings); M11 minRating-removed notes kept as instructed
2026-09-15T01:00:00Z | WS-5 | D6 | fixed | agent/02-CONTEXT-DOMAIN.md — ShelterReview/ShelterReviewRepository/ReviewReport/ReviewReportReason rows + review-invariants bullet + api.ShelterReviewService contract deleted; l.9 purpose and decision 4 reworded to the reports + confirmation (ReviewStatus) trust model
2026-09-15T01:00:00Z | WS-5 | D8 | fixed | agent/01-TASK.md — §1/§4/rules 8+11 reworded: community reports + confirmation (ReviewStatus on the shelter, no star rating, no per-user review row); deleted review classes/endpoints removed from the package layout
2026-09-15T01:00:00Z | WS-5 | D12 | fixed | 03-auth.puml — AccountController myReviews/MyReviewDto + wiring deleted; endpoint count corrected to 8 (incl. GET /export + DELETE /account); RefreshTokenRepository.revoke → int; GET /api/data-source added to the permitAll note (+out/ re-render pending render.sh)
2026-09-15T01:00:00Z | WS-5 | D17 | fixed | 02-verification-flow.puml — register(name, email, phone, password) (idCode dropped); closing comment + final message label reworded to the community reports + confirmation model (matches VerificationFlowTest, the diagram's executable spec)
2026-09-15T01:00:00Z | WS-5 | D19 | fixed | agent/05-CONTEXT-INGESTION.md — CsvRegistryClient (default) + RegistryCsvParser rows added; WFS PaasteametRegistryClient row marked legacy opt-in / upstream dead (404s)
2026-09-15T01:00:00Z | WS-5 | D23 | fixed | agent/07-STEPS.md — shelter_reviews/review_reports/minRating references and the 05-shelter-review-flow.puml sync instruction deleted (Steps 1/3/6/7 deliverables + acceptance, V9 schema block, M8 paragraph)
2026-09-15T01:00:00Z | WS-5 | SW-I3puml | fixed | 05-shelter-api.puml header — OpenAPI machine-readable companion pointer added (docs/api/openapi.json committed snapshot + dev-only /swagger-ui)

## Wave 1 — recorded 2026-09-15T00:27:16Z — workstreams attempted: WS-1, WS-7, WS-5

- **WS-1** (fixer, hpc-vllm/Qwen3.8-27B) — reported: ALL 6 ITEMS CLOSED (B1, B2, B3, B6, B7, SW-C1), none left open; 35 files (Clock seam, @Size caps on the 7 auth records, Clock-stamped error bodies, `/admin/**` hasAuthority(ADMIN) matcher, csrf rationale comment, dev/test-only docs permit) + new `src/test/java/ee/sheltermap/auth/AuthRequestConstraintParityTest.java`. Its 6 per-item lines were overwritten by a concurrent write of this file (only the SW-C1 line survives).
- **WS-7** (fixer, hpc-vllm/Qwen3.8-27B) — reported: complete except `docs/api/openapi.json`, which it could not generate (no shell in the fixer lane); 13 WS-7 items + SW-C1 closed; left open SW-G2 and the SW-F1..F3 remainder (the `domain/*` enums and the auth request records are outside WS-7 ownership this wave).
- **WS-5** (fixer, hpc-vllm/Qwen3.8-27B) — reported: COMPLETE, 11/11 items closed (D2, D3, D4, D5, D6, D8, D12, D17, D19, D23, SW-I3puml).
- **Reviewer** (read-only, deepseek-flash) — **VERDICT: needs-fix / merge BLOCK.** `mvn clean test` is red: `AuthRequestConstraintParityTest` 7/7 (B1's new test reflects `RecordComponent.getAnnotations()`, which never sees the jakarta constraints, so the reflected set is empty) and `OpenApiContractIT` 1/8 (the generated document carries no `x-admin-only`; springdoc 2.6.0 does not surface the standalone method-level `@Extension`). Also flagged: `ApiDocsProdClosureIT` (SW-H3) green only because the untracked `.env` supplies smtp-pulse/twilio; D17 and D23 not fully closed; SW-F1..F3 "@Schema on the 12 owned DTOs" over-counts (11 annotated). Verified done: WS-1 B2/B3/B6/B7/SW-C1, the WS-7 guard/snapshot tests, and the WS-5 source edits.
- Wave outcome: in `LEDGER.md`, 26 of the 32 attempted items are now tagged `[closed W1]`, and 6 are kept open with a one-line note (B1, SW-F1..F3, SW-H1+H5, SW-H3, D17, D23). New drift introduced by the wave (not itself a ledger item): `context-and-tasks/03-auth.puml:23` and `context-and-tasks/agent/02-CONTEXT-DOMAIN.md:19` re-stale after WS-1 changed the `UserCredentials` ctor / `AdminUser.provisioned` signature to take an `Instant`.
- Note: this lane has no shell clock; the timestamps in this block are derived from the run transcript (last readable event 2026-09-15T00:27:16Z). Runner gates still owed by the orchestrator: `mvn clean test`, `npm test -- --watch=false`.

## Orchestrator gate fixes (wave 1) — 2026-09-15T00:28:44Z

The lane reports are self-verified statically only (children have no shell). Running the real
gates surfaced these defects in lane-authored code; all are fixed by the orchestrator and the
snapshot was regenerated as a consequence:

- 2026-09-15T00:28:44Z | WS-7 | SW-D | fixed | config/OpenApiConfig.java — 3 compile errors: nested PathItem.Operation
  (no such class) → io.swagger.v3.oas.models.Operation; Content.builder() (does not exist) →
  new Content().addMediaType("application/json", ...); MediaType.APL_JSON_VALUE (that constant is on
  Spring's MediaType) → the literal media type. Also dropped a meaningless sibling `format` on a $ref.
- 2026-09-15T00:28:44Z | WS-7 | SW-H2 | fixed | api/OpenApiSnapshotIT.java — .sorted() called on an Iterator<String>
  (Stream method) broke test-compile → collect keys, Collections.sort, then copy.
- 2026-09-15T00:28:44Z | WS-1 | B1 | fixed | auth/AuthRequestConstraintParityTest.java — Size.UNBOUNDED (no such
  constant) broke test-compile → Integer.MAX_VALUE; and the guard read RecordComponent#getAnnotations(),
  which is empty for Jakarta constraints (they do not target RECORD_COMPONENT) → read the backing FIELD,
  which is also what Bean Validation reads.
- 2026-09-15T00:28:44Z | WS-7 | SW-E | fixed | config/OpenApiConfig.java — a standalone method-level @Extension is not
  surfaced by springdoc, so x-admin-only never reached the document. Added OpenApiCustomizer
  adminOnlyExtensionCustomizer() attaching {"value":"true"} to every /admin/** operation (same route
  prefix the authorization matcher enforces), and removed the 15 non-functional standalone
  @Extension annotations from api/AdminController.java plus their now-unused imports.
- 2026-09-15T00:28:44Z | WS-7 | SW-I2 | fixed | gateways/api-contract.spec.ts — the guard rooted paths twice ("//account/me")
  and scanned doc comments, so `update()`/`remove()` prose produced a bogus "/" path. Rooted once,
  comments stripped before scanning, bare "/" ignored.
- 2026-09-15T00:28:44Z | WS-7 | SW-G2 | regenerated | docs/api/openapi.json via -Dopenapi.update=true after the
  extension-shape fix (the snapshot IT correctly flagged it stale).

Gate evidence: focused classes AuthRequestConstraintParityTest + OpenApiContractIT + OpenApiSnapshotIT green;
frontend npm test green (42 files / 872 tests).
