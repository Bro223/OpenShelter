# 17b — DOCS-REVIEW-2: openspec specs, changes, qa, context-and-tasks, docs (rest)

**Lane:** DOCS-REVIEW-2 (read-only). Board: `reviews/17-docs-coordination.md` (own section).
**Scope:** `openspec/specs/**` (19), `openspec/changes/**` (7 active = 35 files; 31 archived = 137 files incl. `.gitkeep`), `qa/**` (7), `context-and-tasks/**` (29: 5 `.puml`, 8 agent-pack md, 14 tracked `out/` renders, 2 render scripts), `docs/**` except `docs/agent/**` and `docs/api/**` (48). **Total 275 tracked files, one row each below.**
**Overlap note:** `reviews/16-docs-complete-root-frontend.md` covered the root README and the frontend docs; where my files repeat its claims (palette, source chips, three-confirmer, reported-OR, hero-on-save, legend-as-filter) I cite my own evidence and tag the overlap.
**Verdicts:** **V** = present-tense claim verified against the live tree/measurement · **H** = dated record, internally consistent, judged historical (not stale-for-age) · **F** = present-tense claim contradicted by live code (with evidence) · **U** = not verifiable read-only · **STALE-RENDER** / **ORPHAN-RENDER** = `out/` render vs `.puml` source (git commit pairing).
**Date line:** 2026-09-22. "Today" changes in the tree (palette wave, 3-confirmer, reported-OR, hero-on-save V33, legend-as-filter/chips-gone 8c3caef, 29-claim fix incl. Flyway range, compose 127.0.0.1 in 804101d) were used as the live-truth baseline.

## Verdict distribution (275 files)

| Verdict | Files |
|---|---|
| V | 83 |
| H | 159 |
| F | 22 (3 hard, 19 minor/partial) |
| STALE-RENDER | 6 (`out/01*`, `out/03*`, `out/05*` regular pairs) |
| ORPHAN-RENDER | 4 (`out/04_*_001*`, `out/05-*_001*` duplicates) |
| U | 1 |

Hard F's: `docs/deploy/spa-csp.md` (stale CSP hash), `openspec/changes/guidance-hero-import/` (publish-time import described; code ships save-time), main spec `shelter-provenance-taxonomy` (chips + "unified yellow" contradicted by live palette). The rest of the F set is minor (dead class refs, phantom test name, wrong counts, superseded numbers).

---

## 1. `openspec/specs/**` — 19 main specs

| File | Verdict | Evidence / note |
|---|---|---|
| `abuse-limits/spec.md` | V | Buckets match `application.yml` (`app.abuse-limits.*`): register 10/IP, verify 10/IP, change 5/IP, geo 5/IP, 5 submissions/24h, weekly Mon 03:00 — all measured in yml. |
| `account-profile/spec.md` | V | Profile fields, JWT 15m / refresh 30d, verified-user gating verified against `SecurityConfig`/`JwtService` defaults. |
| `admin-moderation/spec.md` | V | 15 `AdminController` mappings verified by direct grep (list in `docs/autopilot/findings/docs-puml-sync.md` item #2 matches my count); 9 tabs in `admin-page.html`. |
| `app-polish/spec.md` | **F** (1 req; rest V) | :139–141 deferral "i18n for the remaining feature pages … not yet translated" is done: account 79, contributions 22, verify 25, admin 11, privacy 130, terms 77 `\| t` pipes (measured). Locale req itself carries a proper dated supersession note (V). Overlaps 16's F5 area. |
| `community-self-moderation/spec.md` | V | Three-distinct-confirmer rule (submitter excluded), reported-rule OR — both match `ShelterService.java:30,41` (`AUTO_CONFIRM_THRESHOLD=3`, `AUTO_HIDE_THRESHOLD=5`) and `domain/Provenance.java` (W2-A OR). Synced in ddb4cb9 (29-claim fix). |
| `entry-verification-meta/spec.md` | V | Code TTLs 15m email / 5m phone, `MAX_ATTEMPTS=5`, 8-digit email / 6-digit phone codes all verified in service code. |
| `external-review/spec.md` | V | Package commit pin ab3c488, review scope list, and 12-attack/7-register counts match the package at that commit. |
| `legal-recovery/spec.md` | V | 24-month retention, `RETENTION_ENABLED:false` default, legal page keys — all verified (yml + `legal.*` catalogs). |
| `location-resolution/spec.md` | V | Geo endpoint `?geoip=`, 3s/5s cache, UA `OpenShelter/1.0 (location resolver)` — verified in `GeoController`/config. |
| `map-browse/spec.md` | **F** | "Requirement: Source filter" (:52–58) — "map page SHALL provide source filter chips (All, Registry, User) that refetch with `?source=`" — chips removed in 8c3caef (today); `map-page.ts:240–244` now fetches ALL sources (legend is filter, chips gone). Rest of spec V (bbox paging, `X-Total-Paging` header, 200 max page size = `Pagination.MAX_PAGE_SIZE`). Overlaps 16. |
| `official-dataset-csv/spec.md` | V | CSV header `id;nimi;aadress;lest_x;lest_y`, 100ms backoff, `REGISTRY_CLIENT:csv` default — verified in `CsvRegistryClient` + yml:272 (fail-closed on other values). |
| `password-reset-code/spec.md` | V | 15m TTL, 5 attempts, `password_reset_tokens` in V1 — verified. Note: confirm bucket now 10/IP (26a7977) — spec text consistent. |
| `pii-at-rest/spec.md` | V | PII columns, key naming, encryption-at-rest behaviour verified against schema + `PiiKeys` guard. |
| `security-posture/spec.md` | V | "thirteen-attack list … SSRF via the admin hero-image import" — A13 added 9d6b294 (09-19); main spec synced (was "twelve" in the archived change, correct then). |
| `shelter-detail/spec.md` | V | Detail fetch, report-shelter/report-occupancy flows verified against `ShelterController` + `ShelterQueryService`. |
| `shelter-provenance-taxonomy/spec.md` | **F** | :75–77, :82–83 "source chips (All/Registry/User)" requirement (removed in 8c3caef) and :100 "unified yellow family for NEW and CONFIRMED" (now yellow `#ffd400` NEW / green `#7fd49a` CONFIRMED per `shelter-copy.ts:106-107,156-157`). Rest V (3 occupancy bands, provenance values, V31 split). |
| `shelter-reports/spec.md` | V | 5 report types, throttle `app.reports.max-actions-per-hour:10` (yml:156), unique (shelter_id,user_id) per table (V-migration DDL), `RECENT_REPORTS_CAP=10` (`ShelterQueryService.java:90`). |
| `shelter-submission/spec.md` | V | Submission flow, `MAX_ACTIVE_SHELTERS_PER_USER=10` (`ShelterService.java:88`), review_status lifecycle verified. |
| `user-contributions/spec.md` | V | Contributions list (shelters only post-V21), paging, `countByCreatedBy*` repository methods verified. |

## 2. `openspec/changes/**` — active (35 files)

### `community-review-queue/` (6 files)
| File | Verdict | Note |
|---|---|---|
| `proposal.md` | V | Describes the shipped review-report queue; matches live admin surface. |
| `design.md` | V | Decisions D1–D6 consistent with code (hide/restore, audit rows). |
| `specs/admin-moderation/spec.md` | V | Delta synced into main `admin-moderation` spec — both match code. |
| `specs/map-browse/spec.md` | V | Delta rows match live map behaviour (report entry points). |
| `specs/shelter-submission/spec.md` | V | Delta rows match live submission behaviour. |
| `tasks.md` | H | 24/24 done except 2 process tasks with dated watchdog notes (residual follow-ups, still open — process state, not doc rot). |

### `crisis-guidance/` (6 files)
| File | Verdict | Note |
|---|---|---|
| `.openspec.yaml` | V | Metadata (`schema: spec-driven`). |
| `proposal.md` | V | Feature description matches shipped crisis-guidance (6 published posts, sanitizer, media). |
| `design.md` | V | Numbered decisions consistent with as-built code. |
| `specs/crisis-guidance/spec.md` | **F** (1 req) | Ordering requirement "published_at desc" is superseded: live ordering is `pinned DESC, sort_order ASC, published_at DESC, id DESC` (V28; `GuidanceOrderingService.java:36`). Sibling active change `guidance-manual-order` (see below) is the newer state but never issued a MODIFIED delta against this capability — spec-sync gap. Everything else in the delta V. |
| `specs/media-library/spec.md` | V | Media store 5 MiB cap (`spring.servlet.multipart.max-file-size`), derivative sizing — verified. |
| `tasks.md` | **F** (status) | 26/36 checked, but the capability is fully shipped (V25–V28 + code + 6 published posts in DB). Task list never closed out. |

### `guidance-hero-import/` (5 files) — **hardest spec rot in the tree**
| File | Verdict | Note |
|---|---|---|
| `.openspec.yaml` | V | Metadata (created 2026-09-18). |
| `proposal.md` | **F** | :14, :36–45 describe import AT PUBLISH ("a failed fetch must FAIL the publish — the post stays a DRAFT"; link+asset+publish atomically). V33 header (measured) states the opposite: "The import moved from publish to SAVE (create and update, draft and published alike, Wave 9) … a failed import never blocks the save". |
| `design.md` | **F** | Lists "fetch at save time" as a REJECTED option — that is exactly what shipped (V33 + code). |
| `specs/crisis-guidance/spec.md` | **F** | Delta pins `ck_guidance_posts_pending_import_only_draft` CHECK and "published posts cannot carry a pending import URL" — V33 DROPPED that constraint (measured: `ALTER TABLE guidance_posts DROP CONSTRAINT ...`). |
| `tasks.md` | H | Task list itself is complete/dated; superseded in substance by V33. |

### `guidance-manual-order/` (5 files)
| File | Verdict | Note |
|---|---|---|
| `.openspec.yaml` | V | Metadata. |
| `proposal.md` | V | Manual-order feature matches live code. |
| `design.md` | V | Decisions consistent (sort_order column, PUT endpoint). |
| `specs/guidance-manual-order/spec.md` | V (with gap) | New capability spec — verified against code (V28 `sort_order`, `PUT /admin/guidance/order` mapping, ordering test). GAP: it adds the manual-order state without a MODIFIED delta to `crisis-guidance`'s ordering requirement, so the two active deltas now contradict each other. |
| `tasks.md` | V | All tasks done; live order confirmed against localhost:8080 (sort_orders 4,6,8,10,12,13 returned in manual order). |

### `i18n-ru/` (4 files)
| File | Verdict | Note |
|---|---|---|
| `design.md` | V | Approach (RU catalog, slugs, legal keys) matches as-built. |
| `proposal.md` | V | Scope description matches. |
| `specs/app-polish/spec.md` | V | Delta (3-locale requirement) consistent with live catalogs (en/et/ru each carry 187 `legal.*` keys — measured). |
| `tasks.md` | **F** | Phase-4 guardrail "6 RU posts must remain DRAFT (ids 17–22)" contradicts live DB: 6 RU translations exist on the 6 PUBLISHED posts (ids 5,7,9,11,13,15); the RU drafts are gone (pruned by V26). The guardrail described a mid-migration state, never re-dated. |

### `retention-pruning/` (4 files)
| File | Verdict | Note |
|---|---|---|
| `proposal.md` | V | Matches V24 + service. |
| `design.md` | V | Decisions match as-built pruner. |
| `specs/data-retention/spec.md` | V | 24-month windows, `RETENTION_ENABLED:false` default — verified in code/yml. |
| `tasks.md` | V | 24/24 done. |

### `shelter-meta-truth/` (5 files)
| File | Verdict | Note |
|---|---|---|
| `proposal.md` | V | Scope matches. |
| `specs/shelter-detail/spec.md` | V | Delta rows match live detail payload. |
| `specs/map-browse/spec.md` | V | Delta rows match live map payload. |
| `specs/shelter-submission/spec.md` | V | Delta rows match. |
| `tasks.md` | **U** | 1 open item = `ng test`/`ng build` gate; lane-gated (frontend build not runnable in this lane per brief: no server start/stop, no full suites). |

## 3. `openspec/changes/archive/**` — 31 dirs, 137 files

All archived change records are dated, self-consistent snapshots of their era → **H** by construction (the archive IS the history; e.g. the twelve-attack count in `2026-09-16-threat-model-security-posture` is correct at archive time and the main spec was correctly synced to thirteen). Spot-checked: `2026-09-14-remove-shelter-reviews` documents V21 accurately ("No code changes: code already post-V21"); `2026-09-16-community-self-moderation`'s 3-confirmer delta is synced to main (main :134) and matches code; `2026-09-09-frontend-m5-shelter-reviews`'s `shelter-detail-reviews` capability is correctly ABSENT from main's 19 (dropped by the removal change). `2026-09-16-proposed-community-wording` flagged then REJECTED (see §Rejected false positives).

| Dir (files) | Verdict | Spot-check note |
|---|---|---|
| `2026-09-09-account-profile-and-verification/` (5: design, .openspec.yaml, proposal, specs/account-profile/spec, tasks) | H | Verified flow matches shipped. |
| `2026-09-09-frontend-m4-map-browse/` (5) | H | Superseded-by-chips-removal delta — historical. |
| `2026-09-09-frontend-m5-shelter-reviews/` (6) | H | Review feature later dropped by V21; absence from main correct. |
| `2026-09-09-frontend-m6-polish-prod/` (5) | H | |
| `2026-09-09-password-reset-email-code/` (5) | H | |
| `2026-09-09-user-contributions/` (5) | H | |
| `2026-09-11-accessibility-and-provenance/` (5) | H | |
| `2026-09-11-de-slop-pass/` (4) | H | |
| `2026-09-11-map-crisis-actions/` (6) | H | |
| `2026-09-11-shelter-address-search/` (4) | H | |
| `2026-09-11-shelter-location-input/` (4) | H | |
| `2026-09-14-remove-shelter-reviews/` (7) | H | V21 documented accurately; 4 spec deltas all correctly un-applied/dropped. |
| `2026-09-16-abuse-limits/` (3) | H | Delta matches main `abuse-limits`. |
| `2026-09-16-admin-moderation/` (6) | H | Delta matches main `admin-moderation`. |
| `2026-09-16-community-self-moderation/` (4) | H | 3-confirmer delta synced to main :134; matches code. |
| `2026-09-16-entry-verification-meta/` (4) | H | |
| `2026-09-16-external-review-package/` (3) | H | Commit-pinned package (ab3c488). |
| `2026-09-16-factual-reports-rating-demotion/` (4) | H | |
| `2026-09-16-i18n-et-en/` (3) | H | Superseded by i18n-ru (3 locales) — historical. |
| `2026-09-16-legal-recovery/` (4) | H | Delta matches main `legal-recovery`. |
| `2026-09-16-location-navigation/` (3) | H | |
| `2026-09-16-mobile-responsive-polish/` (3) | H | |
| `2026-09-16-moderation-dashboard-completion/` (4) | H | |
| `2026-09-16-official-dataset-csv/` (4) | H | Delta matches main `official-dataset-csv`. |
| `2026-09-16-pii-at-rest/` (4) | H | Delta matches main `pii-at-rest`. |
| `2026-09-16-proposed-community-wording/` (3) | H (anomaly noted) | Rename "Newly added"→"Proposed" later REVERTED (e7fe7c6, 09-13 23:32). Its delta pins the OLD labels, which MATCH current code (`shelter-copy.ts:106-107`) — no main spec was created, so no live contradiction. Proposal "What Changes" text = superseded. |
| `2026-09-16-remove-national-id/` (4) | H | |
| `2026-09-16-shelter-bbox-paging/` (5) | H | Delta matches main `map-browse` paging req (the surviving, still-true half). |
| `2026-09-16-shelter-provenance-taxonomy/` (4) | H | Delta was synced to main; main spec's chips/palette rot is recorded in §1 (the main spec, not the archive, is the F). |
| `2026-09-16-shelter-trust-and-reports/` (7) | H | |
| `2026-09-16-threat-model-security-posture/` (3) | H | "twelve" correct at archive time; main synced to thirteen (9d6b294). |
| `archive/.gitkeep` | V | Empty marker. |

## 4. `qa/**` (7 files)

| File | Verdict | Evidence / note |
|---|---|---|
| `test-plan.md` | H | Dated read-only pass 2026-09-14. All 83 backticked test-file refs exist (scripted sweep, 0 missing; the one exception is a bare `.spec.ts` naming artifact). Its i18n-gap row ("feature-page copy still English") was true then, closed later. |
| `feature-matrix.md` | **F** (4 cells; rest V) | (1) "Source filter chips (All/Registry/User)" row — removed in 8c3caef (today). (2) `PaasteametRegistryClientTest` cited as evidence — class+test deleted in 670f43d (09-21; last edit of this file 09-16, so the cell went stale after the edit). (3) "Language switcher (EN/ET)" + i18n known-gap — now 3 locales and all feature pages translated (measured t-pipes). (4) minor: "Nearest shelter" CTA text (now "Show shelters around you") and "moderation_actions (V10)" (actually V11__community_review.sql — the 02-CONTEXT-DOMAIN.md "(V11)" is the correct one). Verified cells: rate-limit table (register 10 / verify 10 / change 5 / geo 5 per IP), JWT 15m/refresh 30d, 5 submissions/24h, weekly Mon 03:00, PUT 5 writable fields, `password_reset_tokens` in V1. Header "Generated 2026-07-08" contradicts its own content (note). |
| `security-checklist.md` | **F** (1 cell; rest H) | Header says "Read-only QA pass, 2026-09-14" but the file's last commit is 670f43d (09-21) — AFTER 26a7977 (09-20 02:20) raised the reset-confirm bucket 5→10. §4 "confirm per-(IP,email) 5" therefore survived a post-change edit → stale number, not innocent history. Everything else (permit list, CORS, headers, secrets) re-verified V against `SecurityConfig`. |
| `accessibility-checklist.md` | **F** (§9; rest V/H) | §9 "NOT translated (0 uses of `| t`): account/contributions/verify/admin/privacy/terms" — all six now carry 11–130 t-pipes (measured). File was last committed today (3f0cbe7, §3 focus note) yet §9 untouched. Minors: `label for=` count 36 vs doc's 37; map h1 now `{{ 'map.title' | t }}` (was literal). Contrast comments (5.6:1 / 5.18:1) and `.btn` min-height token verified present. |
| `check-guidance-bodies.sh` | V | Every referenced endpoint/route verified live: `POST /auth/login`, `GET /admin/guidance` list, `bodyHtml` field, `MarkdownMigrationDriver` in `src/test`. Not executed (would hit the DB) — static verification only. |
| `taltech-pulse-demo-insert.sql` | V | `UNIQUE (shelter_id,user_id)` on both report tables (migration DDL), `OCCUPANCY_FRESHNESS_WINDOW=2h` (`ShelterQueryService.java:87`), `RECENT_REPORTS_CAP=10` (:90), `communityPulse` field — all verified. |
| `taltech-pulse-demo-cleanup.sql` | V | Deletes match the insert's tables/keys. |

## 5. `context-and-tasks/**` (29 files)

| File | Verdict | Evidence / note |
|---|---|---|
| `agent/00-README.md` | **F** (minor) | Steps 0–6 folder map still lists the deleted "reviews" coverage item (V21). Rest of the pack guide verified. |
| `agent/01-TASK.md` | **F** (2 cells) | "Spring Boot 3.3.x" — `pom.xml` is **3.5.16** (measured). `PaasteametRegistryClient` described as live — deleted in 670f43d (09-21); ingestion package now has `CsvRegistryClient`/`DevRegistryClient` only. |
| `agent/02-CONTEXT-DOMAIN.md` | V | `moderation_actions` in V11 ✓, `Capability` enum `VIEW_MAP/SUBMIT_SHELTER` ✓, `AdminUser.provisioned(String,String,Instant)` ✓. |
| `agent/03-CONTEXT-VERIFICATION.md` | V | All `@ConditionalOnProperty` names, 6-digit phone OTP (`String.format("%0"+OTP_DIGITS+"d", …)`), send-log-path default — verified. |
| `agent/04-CONTEXT-AUTH.md` | **F** (3 cells) | (1) reset-confirm "5 / 0.084" — live is 10 / 0.2 (26a7977). (2) permitAll list omits `GET /api/guidance/**`, `/api/media/**`, `/api/data-source`. (3) line 178 references the deleted review `/mine` route (V21). |
| `agent/05-CONTEXT-INGESTION.md` | **F** (2 cells) | `PaasteametRegistryClient` table row (:20) + test note (:75) — class deleted 670f43d. CSV header + 100ms backoff verified (V). |
| `agent/06-CONTEXT-API.md` | **F** (1 cell; rest V) | :309 cites `JpaReportActionLogTest` — **phantom** (never existed; only the `InMemoryReportActionLog` fixture). The rest is the strongest file in the pack: 15 admin endpoints ✓, `inaccurateReports`+`nonexistentReports` ✓, review `200 {"ok":true}` ✓, geo 3s/5s/UA ✓, V28 ordering clause ✓, all 5 addendum tests exist ✓. |
| `agent/07-STEPS.md` | H | Dated build record; per-step test counts are that run's numbers. |
| `01-user-verification.puml` | V | Corrected in 7e0d448 (09-16): `provisioned(name, email, now : Instant)` matches live `AdminUser`. |
| `02-verification-flow.puml` | V | Matches verification flow. |
| `03-auth.puml` | V | Carries the guidance/media/swagger permit notes (the render does not — see below). |
| `04-ingestion.puml` | **F** | :43, :221 still class `PaasteametRegistryClient` — deleted 670f43d (09-21); source not re-synced (last commit c7983e5, 09-15). |
| `05-shelter-api.puml` | V | Today's fix (8c3caef wave): "unified-yellow 'Newly added'" + "trust-weighted 5" wording matches live code. |
| `out/01-user-verification.png` | STALE-RENDER | Rendered before 7e0d448; shows 2-arg `provisioned(name, email)` (no `now : Instant`). |
| `out/01-user-verification.svg` | STALE-RENDER | Same. |
| `out/02-verification-flow.png` | V | Same commit as source (c7983e5); content matches. |
| `out/02-verification-flow.svg` | V | Same. |
| `out/03-auth.png` | STALE-RENDER | 0 occurrences of "guidance"; missing the guidance/media/swagger route notes present in source. |
| `out/03-auth.svg` | STALE-RENDER | Same. |
| `out/04-ingestion.png` | V (as render) / content F | Consistent with its source — which itself is F (deleted class). Staleness is the source's, not the render's. |
| `out/04-ingestion.svg` | V (as render) / content F | Same. |
| `out/04-ingestion_001.png` | ORPHAN-RENDER | Duplicate kroki-suffix artifact; content matches NO tracked puml state (has `CsvRegistryClient`, 0× "Paasteamet"). Provenance unclear — recommend delete. |
| `out/04-ingestion_001.svg` | ORPHAN-RENDER | Same. |
| `out/05-shelter-api.png` | STALE-RENDER | Shows `amber "Newly added"`; source now "unified-yellow". |
| `out/05-shelter-api.svg` | STALE-RENDER | Same (1× "amber", 0× "unified-yellow"). |
| `out/05-shelter-api_001.png` | ORPHAN-RENDER | Full 3890×5205 sequence render; matches neither the c7983e5 puml (amber era) nor the current puml (0× "Newly added"). Duplicate artifact — recommend delete. |
| `out/05-shelter-api_001.svg` | ORPHAN-RENDER | Same. |
| `render.sh` | V | 3 modes (docker/java/kroki fallback) as documented. |
| `render_kroki.py` | V | Kroki fallback, PNG 4096-px cap handling (explains the `_001` scale-retry duplicates). |

**Stale-diagram sets:** `01-user-verification`, `03-auth`, `05-shelter-api` (both png+svg each) — renders predate the corrected `.puml` sources. `04`'s content rot is in the SOURCE. The two `_001` pairs are orphan duplicates of unknown provenance.

## 6. `docs/**` (48 tracked files, excluding `docs/agent/**` and `docs/api/**`)

| File | Verdict | Evidence / note |
|---|---|---|
| `agentic-development.md` | V | All artifact pointers resolve (`.agent-orchestration/model-usage.md` ✓, `fix-process.md` ✓, LEDGER/RUNLOG/STATE ✓, briefs ✓). `ShelterRequestConstraintParityTest` non-vacuity fix confirmed in tree (:26, :34). Run figures (≥5.1h, 20 commits, 68→1 rows, 719/953) are the 09-15 run's own numbers (H by nature, embedded in a V methodology doc). |
| `code-review/README.md` | V | Dated 2026-09-08 record; commit 44d7bae ✓; local `.gitignore` covers the 2 output logs ✓; `fix-process.md` ✓. |
| `code-review/review-process.md` | **F** (minor counts) | Opening "13 children" — its own tree table and the README both show 14; "17 concurrent 27B agents" — should be 18 non-orchestrator agents. Rest of the protocol description V. |
| `code-review/2026-09-14-p2-audit.md` | H | Dated audit record. |
| `code-review/fix-process.md` | H | Methodology doc of the 09-08 campaign; general claims consistent with repo records. |
| `code-review/.gitignore` | V | Ignores the two large output logs (present locally, untracked → out of scope, noted for completeness). |
| `autopilot/AUTOPILOT-REPORT-2026-09-15.md` | H | Closing report of the 4-wave run (dated). |
| `autopilot/BACKLOG-PLAN.md` | H | Execution plan for the twelve-agent sweep; test counts (1139/1399) are dated baselines. |
| `autopilot/RUNLOG.md` | H | Append-only runlog. |
| `autopilot/STALE-DECISION-AUDIT.md` | H | Batch design doc (read-only lanes, evidence bar) — consistent with the `reviews/stale-decisions/` outputs. |
| `autopilot/STATE.json` | H | Machine state of the run; its own `notes` field flags the untrusted `updated_at`. |
| `autopilot/crisis-guidance/briefs/A1-data-and-audit.md` | H | Lane brief (dated, consumed). |
| `autopilot/crisis-guidance/briefs/A2-sanitizer-and-media.md` | H | Same. |
| `autopilot/crisis-guidance/briefs/A3-services-and-api.md` | H | Same. |
| `autopilot/findings/LEDGER.md` | H | 68-row work ledger; status tags reflect the wave-4 end state. |
| `autopilot/findings/backend-inventory.md` | H | 09-14 inventory snapshot. |
| `autopilot/findings/frontend-inventory.md` | H | Same. |
| `autopilot/findings/docs-puml-sync.md` | H | 09-15 audit that FIRST documented the puml rot my §5 re-verified (review-model residue in 05-shelter-api, both READMEs, openspec). Its item #2 AdminController mapping list matches my independent count (15). |
| `autopilot/findings/swagger-plan.md` | H | Plan record. |
| `autopilot/list-page-paging/ADMIN-LANE-SPEC.md` | H | Lane spec. |
| `autopilot/list-page-paging/ADMIN-LANE-REPORT.md` | H | Lane report. |
| `assets/guidance-image-credits.md` | V | All 6 stored file names verified present in `media_assets` (DB probe, rows 1–6 in order). Dated 2026-09-19; "EN + ET pairs" accurate then (RU added the same/next day — the slugs now carry `-ru` twins, consistent). |
| `content/guidance-markdown/en/*.md` (6) + `et/*.md` (6) + `ru/*.md` (6) | V | 1:1 with DB: 6 PUBLISHED posts ↔ 6 en + 6 et + 6 ru translations. `en/my-new-post.md` ↔ DRAFT post id 23. |
| `content/guidance-markdown/en/this-is-my-first-post.md` | V (cleanup note) | 1-character "l" test artifact (20cb65b), never published. Harmless; candidate for deletion. |
| `deploy/spa-csp.md` | **F** (hard) | First CSP hash `sha256-eEsoRzCi5dUPfjfiEAEbV+3sri1glfPnaHWpq5qf7ko=` ≠ recomputed `sha256-3Wmiy+aAAuDTtbWePtJ6EDupdf4CePDMWZkU8L7reMw=` (`scripts/spa-csp.py` against current `frontend/src/index.html`; the pre-paint theme script was changed in today's palette wave: `--color-new:'#7fd49a'`, `--color-shelter-user:'#ffd400'`). Second hash `sha256-uRaocgOj…` matches. The doc ships the recompute command — the fix is one run of it. Quill 2.0.3 vendored ✓, `postbuild-csp.mjs` ✓ (rest of doc V). |
| `external-review-ask.md` | H | Package pinned to commit ab3c488 (09-13 18:53, pre-V21); "add shelters and review them" + 12-attack/7-register counts are scoped to that commit by the doc's own framing. |
| `i18n-review.md` | V | 187 `legal.*` keys × 3 catalogs measured; `et.ts:989 legal.privacy.updated` = "Viimati värskendatud: 16. september 2026" ✓; retention wording ✓. |
| `security/operations.md` | **F** (2 minor) | (1) "5 guards" — live has 7 (`ApiDocsGuard`, `DevEndpointsGuard`, `DevSenderGuard`, `ProdJwtGuard`, `PiiKeys`, + `LoopbackXffTrustGuard` 131a09d, `DataSourceCredentialGuard` 3c7c2d6; `FailClosedGuard` is a template). (2) compose postgres port line — compose now binds `127.0.0.1:5432:5432` (804101d, today 01:14); doc not updated (violates the "update in same commit" convention). Rest V: `REGISTRY_CLIENT:csv` fail-closed at yml:272 ✓, alerts-retained 200 ✓, dev-start.sh ✓, `SPRINGDOC_ENABLED` ✓. |
| `security/threat-model.md` | **F** (1 minor; rest V) | A10 "dev compose binds 5432 to the host interface" — fixed in 804101d (today) to `127.0.0.1:5432:5432`, doc not updated in the same commit (the doc's own standing rule). Otherwise V: 13 attacks A1–A13 ✓ (A13 = 9d6b294), A1 USER+NEW→UNDER_REVIEW ✓ (`domain/Provenance.java`), media 5 MiB ✓, V33 `source_url` ✓. |
| `whitepaper.md` | H | v1.2, dated 2026-09-16. "twelve-attack model" correct at that date (A13 came 09-19). §5.6 already covers V28 manual ordering (dated content post-dating the version date — acceptable). Note: §11 admin endpoint table omits the review/audit/order rows (partial, not false). HC accents #7db8f0/#ff9f1c ✓. |
| `whitepaper-brief.md` | H | Dated 09-16; 13 routes ✓; "4 public values" correct then (V31 triangle/circle split came later). |

---

## False claims — consolidated (22 F files; 3 hard)

**Hard (contradict live behaviour a user/operator would hit):**
1. `docs/deploy/spa-csp.md` — stale first CSP hash; a fresh build would be blocked by the documented policy.
2. `openspec/changes/guidance-hero-import/{proposal.md, design.md, specs/crisis-guidance/spec.md}` — publish-time import + `pending_import_only_draft` CHECK described as the design; V33 (measured) moves import to SAVE and DROPS the CHECK.
3. `openspec/specs/shelter-provenance-taxonomy/spec.md:75–77,82–83,100` — source-chip requirement + "unified yellow for NEW and CONFIRMED"; live = chips removed (8c3caef), yellow NEW / green CONFIRMED (`shelter-copy.ts:106-107,156-157`). Same chip rot in `map-browse/spec.md:52–58`.

**Minor / partial (19):** `app-polish/spec.md:139–141` (i18n deferral done) · `crisis-guidance` delta ordering req + tasks status (shipped, 26/36) · `i18n-ru/tasks.md` Phase-4 DRAFT guardrail (RU now published) · `agent/01-TASK.md` (Boot 3.3.x→3.5.16; Paasteamet dead) · `agent/04-CONTEXT-AUTH.md` (5/0.084→10/0.2; permitAll omissions; deleted /mine route) · `agent/05-CONTEXT-INGESTION.md:20,75` (Paasteamet dead) · `agent/06-CONTEXT-API.md:309` (phantom `JpaReportActionLogTest`) · `agent/00-README.md` ("reviews" remnant) · `04-ingestion.puml:43,221` (dead class) · `qa/feature-matrix.md` (4 cells) · `qa/security-checklist.md` §4 (5→10) · `qa/accessibility-checklist.md` §9 (6 pages now translated) · `docs/security/operations.md` (5→7 guards; compose port) · `docs/security/threat-model.md` A10 (compose binding) · `docs/code-review/review-process.md` (13/14, 17/18 counts).

## Rejected false positives (cry-wolf guard)

1. **`proposed-community-wording` delta "labels wrong"** — its spec delta pins "Newly added"/"Community-checked", which MATCH the current code after the rename was reverted (e7fe7c6). Only the proposal's "What Changes" text is superseded. Not a live contradiction.
2. **`07-STEPS.md` step-5 deliverables naming `PaasteametRegistryClient`** — dated build record; the class existed when written. History, not F.
3. **`security-checklist.md` "5" for reset-confirm** initially read as innocent history — REJECTED as such: the file's last commit (670f43d, 09-21) postdates 26a7977 (09-20), so the number survived a post-change edit and stays F-minor.
4. **`whitepaper.md` "twelve-attack model"** and `external-review-ask.md` "12 attacks / 7 register items" — both correctly dated/pinned (A13 = 09-19; package = ab3c488 pre-V21). Not F.
5. **`05-shelter-api_001` looking "newer"** — it lacks "amber" AND "Newly added", so it matches neither tracked puml state; it's an orphan render, not a corrected one.
6. **`04-ingestion_001` looking "newer"** — same reasoning (no Paasteamet, but no tracked puml ever had exactly that content).
7. **`crisis-guidance` delta ordering "F" at first glance** — kept as F only because the capability is already live and a sibling active delta supersedes it; if `crisis-guidance` were still pre-implementation the text would be the intended future state. Flagged as a sync gap, not a typo.
8. **`04-ingestion` renders** — the PNG/SVG are faithful renders of the committed source; the F is charged to the `.puml` source, not the render pipeline.
9. **`feature-matrix` "moderation_actions (V10)"** — kept as F-minor, but the cross-reference in `02-CONTEXT-DOMAIN.md` "(V11)" is the correct one (V11__community_review.sql); the matrix cell is the error, not the domain doc.

## Unverifiable (read-only, no server/suites)

- `shelter-meta-truth/tasks.md` last item — `ng test`/`ng build` gate (lane-gated by brief: no full suites, no server start/stop).
- `qa/check-guidance-bodies.sh` — verified statically (every route/field it touches exists); not executed because it needs a live backend+admin credentials.
- `guidance-hero-import/design.md` "rejected fetch-at-save" rationale — the rejection itself is historical; only its status vs the shipped code is F.

## Top-3 fixes (highest value per effort)

1. **`docs/deploy/spa-csp.md`** — run the doc's own `scripts/spa-csp.py` and paste the new first hash (`sha256-3Wmiy+aAAuDTtbWePtJ6EDupdf4CePDMWZkU8L7reMw=`). One command; today's palette wave broke it; it would break the next production CSP deploy.
2. **Main-spec chip/palette rot** — `map-browse/spec.md:52–58` (delete the Source-filter requirement; chips are gone, legend is filter) + `shelter-provenance-taxonomy/spec.md:75–77,82–83` (same) + `:100` (yellow NEW / green CONFIRMED, not "unified yellow"). These are the SOURCE OF TRUTH per `agentic-development.md` §1 — every future agent lane inherits them.
3. **Spec-sync gaps on the two shipped-but-open changes** — `guidance-hero-import`: re-write proposal/design/delta to the save-time truth (V33 header is the template) and archive it; `crisis-guidance` + `guidance-manual-order`: issue the MODIFIED ordering delta (pinned DESC, sort_order ASC, …), close the task lists (36/36), then archive both. While they stay "active" with contradicted deltas, `openspec validate`-driven work trusts the wrong state.

**Stale diagram set (one command fixes):** re-render `01-user-verification`, `03-auth`, `05-shelter-api` via `context-and-tasks/render.sh`, fix `04-ingestion.puml` (drop the dead `PaasteametRegistryClient` class, :43/:93/:221), then delete the four `_001` orphan renders.

**Also worth a sweep (cheap):** the dead `PaasteametRegistryClient` refs (01-TASK.md, 04/05 agent docs, feature-matrix) and `04-CONTEXT-AUTH.md`'s permitAll list — five small edits in the agent packs that every new child agent inherits verbatim.
