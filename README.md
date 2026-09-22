# OpenShelter

Backend for an Estonia public-shelter map: verified user registration, password auth with
JWT sessions, shelter data ingested automatically from the official registry, and
user-submitted shelters that the community verifies — a submission lands as NEW and is
promoted to CONFIRMED by community confirmation (there is no star-rating review model: that
layer was removed by `V21__drop_reviews.sql`, so nothing rates a row).
Users manage their own contributions — list/edit/delete their own shelters from the account
page (M8, `user-contributions`). On top, a community trust layer (shelter-trust-and-reports)
keeps the map honest without a moderator: users report shelters that no longer exist (the
accumulated "does not exist" weight — five baseline reporters, trusted reporters weigh more —
takes the shelter off the public map), report the live open/closed state, and
report how full a shelter is right now (shown to everyone while fresh). A single
env-provisioned admin (admin-moderation) works the trust layer's queues — restore/delete user
shelters, triage shelter reports, suspend accounts, mark listings inaccurate, review the
audit trail — from a moderation panel that is invisible to everyone else.

**Frontend in [`frontend/`](frontend/)** — Angular 22 SPA (map browse with trust filters,
auth, verification, shelter submission, community reports); run/build docs in
[frontend/README.md](frontend/README.md).

> Built step by step from the task pack in [`context-and-tasks/agent/`](context-and-tasks/agent/):
> `01-TASK.md` is the contract, `07-STEPS.md` the build plan, the puml files in
> [`context-and-tasks/`](context-and-tasks/) the source-of-truth UML.

## Status

> Dated build log. The review/rating model that the earlier waves below mention was later
> removed (`V21__drop_reviews.sql`) — **Features** and **API** describe the current surface.

- **Crisis guidance + shelter-list viewport/paging (crisis-guidance, shelter-bbox-paging)** —
  the crisis-guidance wave (public `/blog` index + detail pages, the admin Guidance authoring
  tab + media library, `V23__crisis_guidance.sql`) and the shelter-list viewport filter +
  `limit`/`offset` paging (the index-only `V23.1__shelter_bbox_index.sql` — no PostGIS;
  "nearest" stays client-side) — see [Features](#features) and the [API](#api) table.
  Both suites are green on this tree — run `flock /tmp/openshelter-mvn.lock mvn -q test`
  and `cd frontend && npx ng test --watch=false` to see the current counts (the
  per-wave numbers further down are historical snapshots).
- **Admin moderation (admin-moderation)** — the env-provisioned admin + moderation API:
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` provision one ADMIN-kind account at startup (create-if-absent,
  never re-hashed, no-op when either var is unset; login through the normal `/auth/login`),
  fresh `UserKind.ADMIN` lookup per `/admin/*` request (no JWT role claim — 401 anonymous /
  403 non-admin, a demotion takes effect on the next request), the `/admin/*` surface
  (all-shelters list incl. hidden + search, user-shelter hide/restore — a restore disarms
  auto-hide — and hard delete, the shelter-report queue with idempotent dismiss; registry rows
  are import-owned → 409), `isAdmin` on `GET /account/me`, `V10__admin_moderation.sql`
  (`shelter_reports.dismissed_at`) — the frontend `/admin` page (guard + admin-only nav item,
  tabs, account-page badge, `AdminGateway`) ships with it.
- **Trust & reports (shelter-trust-and-reports)** — community trust layer: shelter
  reports (the accumulated "does not exist" weight auto-hides the shelter from the public list/map —
  five baseline reporters, trusted reporters weigh more), live
  occupancy bands (display-only, 2 h freshness), trust filters on the public list
  (`hasCapacity` / `provenance`), the 10-active-shelter submission cap, a durable per-user
  report throttle (10 report-type actions / rolling hour, advisory-locked check-and-record)
  and `V9__shelter_trust_and_reports.sql` — **433 backend tests green at the time of that
  wave**, plus the frontend trust wave (trust filter chips + rating select, the orange
  reported marker + legend, the badge set, detail-page report pickers, the "Report how full"
  3-band picker, the contributions-panel hidden state, the `--color-reported` token) at
  **657 frontend tests across 35 spec files** (both counted 2026-09-11 — historical
  snapshots, all green at the time).
- **Steps 0–6 complete + verification HTTP surface + hardening pass + Twilio SMS plan** —
  backend functional end-to-end, **321 tests green** (counted 2026-09-11, pre-fix-wave) —
  2026-09-11 post-review-wave: 360 backend / 588 frontend, all green.
- **2026-09-08 code-review fix campaign** — a 4-lead/14-child review found P0 security
  issues (reset-code brute force, XFF rate-limit spoofing, fail-open dev JWT secret) plus
  backend/frontend/architecture findings; all in-scope findings were fixed over 3 waves with
  tests (the per-issue fix log is gitignored and stays local-only — see
  [docs/code-review/README.md](docs/code-review/README.md)).
  Frontend: **513 tests green across 33 spec files** (counted 2026-09-10, pre-fix-wave) —
  2026-09-11 post-review-wave: 360 backend / 588 frontend, all green.
- **Live data source wired** — real shelter data is fetched from the Päästeamet open-data CSV
  (`https://opendata.smit.ee/gis/varjumiskohad.csv`, EPSG:3301), transformed and stored in the
  local DB. The old Maa-amet WFS layer (`VARJEKOHT`) is no longer published — every request to it
  now answers 404. The publisher states no licence for the dataset, so the app names none: it
  credits Päästeamet / Siseministeerium, links the dataset, and the footer notes that the
  coordinates are transformed (EPSG:3301 → WGS84).
- **Verification reachable over HTTP** — `POST /verify/request` + `POST /verify/confirm`
  (email/phone), so the full loop works: register → verify → add shelter → report.
- **Anti-spam throttle on verification** — resend cooldown + per-user daily cap (file-backed,
  survives restarts) + per-IP bucket → 429.
- **Real SMS channel** — Twilio Programmable Messaging implemented (send-only; OTP logic stays
  on our side), E.164 normalization, swappable via `app.sms.provider`.
- **Hardening pass (code review)** — duplicate registration → 409, unique email/phone +
  one-active-claim constraints (V3), register rate limiting, X-Forwarded-For-aware buckets,
  atomic password reset + import, no-N+1 trust aggregates, stored `description`/`capacity`,
  CORS, SMTP delivery failures never surface as 500s. See [Hardening](#hardening-pass).
- **Integrations** (see [Current state](#current-state--known-gaps)): e-mail and SMS are live —
  `SmtpPulseSmtpSender` and `TwilioSmsSender` are wired through `MAIL_PROVIDER`/`SMS_PROVIDER`
  and their credentials in the gitignored `.env`, with the dev console senders only as the
  unset fallback. Smart-ID remains a stub (rejected with 400 up front).

## Features

- **Auth**: register, login (Argon2id hashing), JWT access (15 min) + refresh (30 days, hashed
  at rest, rotated on refresh), logout revokes sessions, password reset (emailed 6-digit code
  — always "succeeds", single-use code, 5-attempt limit, 60 s re-issue cooldown + 5/UTC-day cap
  per user, revokes all sessions). Rate limiting (token buckets, keys resolved via
  `ClientIps` — `X-Forwarded-For` honored only from trusted proxies, peeled right-to-left):
  login per (IP, normalized contact) **and** a per-IP aggregate bucket (credential-stuffing
  guard), register per IP, reset-request per (IP, email), and reset-**confirm** its own
  per-(IP, email) anti-guess bucket.
- **Verification over HTTP**: `POST /verify/request` / `POST /verify/confirm` (JWT required)
  for email OTP and phone OTP; Smart-ID stub rejected up front; codes hashed, expiring,
  attempt-limited. Verified users gain `canWrite()` (submit shelters, report, answer an
  information request).
- **Cross-channel contact change**: `POST /account/email-change/request` + `/confirm` and
  `POST /account/phone-change/request` + `/confirm` (JWT required). Changing the email is
  verified by an SMS code to the current phone; changing the phone by an email code to the
  current email — stealing only one channel is not enough to hijack an account. One pending
  change per (user, type), 60 s resend cooldown, 15-min code TTL, 5-attempt limit, duplicate
  target → 409, per-IP rate limit on the request endpoints.
- **Account profile**: `GET /account/me` (the user's REAL profile + REAL verified claims — the
  frontend's single source of truth) and `PUT /account/profile` (password-confirmed edit of the
  name; wrong current password → 401, nothing updated). No national ID code is collected or
  stored (M1 — the SMART_ID level stays a stub until an external PKI flow lands).
- **Anti-spam throttle (verification)**: resend cooldown (`app.verification.cooldown-seconds`),
  per-user daily cap (`app.verification.max-per-day`) backed by a file-based send log
  (`app.verification.send-log-path`, survives restarts), and a per-IP token bucket on
  `/verify/request` — violations return 429 with the uniform `ErrorResponse`.
- **SMS channels**: `DevSmsSender` (console, default, `app.sms.provider=dev`) and
  `TwilioSmsSender` (real Twilio Programmable Messaging, `app.sms.provider=twilio`,
  credentials from `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` + `TWILIO_MESSAGING_SERVICE_SID`
  or `TWILIO_FROM` env vars) — exactly one bean at runtime. Twilio is send-only: OTP
  generation, retry/cooldown and verification logic live on the OpenShelter side
  (`PhoneVerificationProvider` + `VerificationService`), so the provider stays swappable.
  Phone numbers are normalized to E.164 at the channel boundary (`PhoneNumbers`).
- **E-mail channels**: `DevSmtpSender` (console, default, `app.mail.provider=dev`) and
  `SmtpPulseSmtpSender` (real SMTP via `spring-boot-starter-mail`, `app.mail.provider=smtp-pulse`,
  credentials from `SMTP_USERNAME`/`SMTP_PASSWORD` env vars only) — exactly one bean at runtime.
- **Shelter ingestion**: weekly automatic sync (Mon 03:00 Europe/Tallinn) from the official
  **Päästeamet open-data CSV** (`https://opendata.smit.ee/gis/varjumiskohad.csv`, semicolon-
  separated `id;nimi;aadress;lest_x;lest_y`), EPSG:3301 → WGS84 transformation via proj4j,
  `If-Modified-Since` revalidation + retry/backoff + politeness delay,
  **registry rows only** — user-submitted rows are never touched by the importer.
  (`REGISTRY_CLIENT=paasteamet` is the legacy Maa-amet WFS alternate — that
  service no longer publishes the layer; see *Deploy* step 5.)
- **Shelter API**: public read endpoints with source, capacity and provenance filters, the
  optional viewport box (`minLat`/`minLng`/`maxLat`/`maxLng` — all four together or none) and
  `limit`/`offset` paging over the stable id-ascending order (shelter-bbox-paging: a
  composite B-tree on the coordinate columns, no PostGIS) — the public list is ACTIVE-only
  (auto-hidden shelters are absent) and carries the server-computed
  trust state (report counts, community review status, provenance, last-verified stamp, fresh
  occupancy and open state); the detail read is public for all statuses and adds the caller's
  own occupancy band and open state; adding a shelter requires an authenticated, verified user.
  There is no star rating/review — that layer was removed by `V21__drop_reviews.sql`.
- **Trust & reports (shelter-trust-and-reports)** — the community keeps the map honest, no
  moderator. Verified users report a shelter ("it does not exist" / "it is closed" / "it is
  open" / wrong location / other — one report per user per type) and the **accumulated "does not
  exist" report weight automatically hides the shelter from the public list and map** (five
  baseline reporters; trust weights count and dampened reports count zero; the owner
  still sees it, marked hidden; restoring is admin-only — later reports never re-hide). Closed
  vs open taps derive the display-only `openStatus` state (the latest fresh tap wins:
  "Reported closed" at one agreeing tap, "Closed" at two+; a fresh OPEN renders no
  badge) that never hides. Anyone verified can report how full a shelter is right now (three bands,
  one live report per user, latest wins — shown to everyone while fresh: 2 h window, latest
  fresh band wins, hedged "Reported full" at one agreeing report, firm at two+; display-only,
  it never hides or filters). All report endpoints share one durable per-user throttle — 10
  report-type actions per rolling hour, check-and-record made atomic per user with a
  transaction-scoped Postgres advisory lock (a duplicate 409 consumes no budget; at the cap
  nothing is recorded). Submissions are capped at 10 ACTIVE USER shelters (409; ADMIN kind
  exempt).
- **User contributions (M8)**: submitting users can list, edit and delete their OWN
  USER-source shelters (`GET /api/shelters/mine`, `PUT`/`DELETE /api/shelters/{id}`) and
  answer the admin's information request on their own row
  (`POST /api/shelters/{id}/info-request/reply`). `shelters.created_by`
  (V7, nullable — registry/legacy rows have no author) links a submission to its author;
  404 if the shelter is absent, 403 if it exists but is not the caller's (registry and
  legacy rows are unmanageable by anyone); deleting a shelter cascades to its reports and
  occupancy.
- **Crisis guidance (crisis-guidance)** — admin-authored crisis content the public reads
  without an account: the `/blog` index (published posts only, pinned first, then the
  admin's manual order) and the
  `/blog/:slug` detail pages (`frontend/src/app/features/guidance/`, both lazy, both
  public), the admin **Guidance** tab (post list with publish/unpublish +
  delete-with-confirm, manual ordering — the keyboard-reachable 48px move-to-top/up/down
  buttons and the native drag & drop both submit the same full ordered list to
  `PUT /admin/guidance/order`, `V28__guidance_manual_order.sql` —, the create/edit form
  with the hero picker and the mandatory-alt
  rule) and the admin **Media library** tab (upload JPEG/PNG/WebP; delete — a
  still-referenced asset's 409 names the affected posts and the confirm re-deletes with
  `confirm=true`, clearing the hero from them) in `frontend/src/app/features/admin/`. The
  body is admin-authored HTML sanitized server-side on every write (jsoup allowlist —
  `BodySanitizer`) and re-sanitized client-side by Angular's `[innerHTML]` — never a
  bypass. Storage: `V23__crisis_guidance.sql` (`media_assets` + `guidance_posts`; the hero
  image is an id reference, never a URL). Controllers: `GuidanceController` +
  `MediaController` (public reads) and `AdminGuidanceController` + `AdminMediaController`
  (admin writes) in `ee.sheltermap.api`. The media directory (`MEDIA_UPLOAD_DIR`, default
  `data/media` — gitignored, never committed) is created at startup when missing, and a
  directory that cannot be created or written fails the boot (fail-closed,
  `MediaStorage.init`).
- **Uniform error shape** (`ErrorResponse`) across the whole API; `@RestControllerAdvice`.
- **Admin moderation (admin-moderation)** — a single env-provisioned admin works the trust
  layer's queues; submission moderation stays community-driven — `POST
  /admin/shelters/{id}/review` is the rare manual override, and no moderator touches rows the
  community didn't flag.
  - **Provisioning**: set `ADMIN_EMAIL` + `ADMIN_PASSWORD` in the environment (dev values
    live in the gitignored `.env`). At startup the `AdminSeeder` creates the account **only if
    no user with that email exists** (create-if-absent — it never overwrites an existing user,
    never re-hashes the password, so an in-app password change survives restarts; a normal
    account that happens to hold the email string stays a normal account). Both claims are
    pre-set on the account (the mailbox does not exist by design), so it is fully writable
    from the first request with no email/SMS verification. The admin logs in through the
    normal `POST /auth/login` — no special endpoint. **Either var unset → no admin exists**
    and the app behaves exactly as before. De-provisioning = remove the env vars and delete
    the row (manual — no API deletes admin accounts); while both vars stay set, the seeder
    recreates the account on the next boot after the row was deleted.
  - **What an admin can do** (`/admin/*`, 403 for non-admins; the kind is re-checked on every
    request — no role in the JWT): list **every** shelter including auto-hidden ones (with
    report counts, occupancy, the submitter's name, name/address search); **hide/restore
    user shelters** (a restore is the manual change that disarms auto-hide — later "does
    not exist" reports never re-hide that shelter); **hard-delete a user shelter** (shelter
    reports and occupancy cascade); **triage the shelter-report queue** (newest first, with
    the reporter's name + email — idempotent dismiss keeps the row, recorded as resolved);
    **suspend/unsuspend a registered user** (idempotent,
    audited with the account as subject — while suspended, login, refresh and every
    token-bearing request are refused; the user's shelters stay on the map); **view a
    shelter's edit history** (who created/edited/deleted it and which field moved where —
    it survives both shelter and account deletion); **ask the submitter for details**
    (one exchange per shelter, answered once from the submitter's contributions list);
    **mark a listing inaccurate / clear the mark** (the row STAYS visible with the
    "Reported inaccurate" warning — idempotent, audited). **Registry rows are read-only**
    — the registry import owns their lifecycle (it rebuilds them as `ACTIVE` on every
    run), so every shelter-scoped write (status, info request, inaccurate mark, delete)
    on them answers 409 and the UI offers no actions for them. The admin is also exempt
    from the 10-active-shelter submission cap.

## Stack

- Java 21 · Maven · Spring Boot 3.5.x (web, validation, data-jpa, security, actuator)
- PostgreSQL 16 (Docker Compose) · Flyway migrations `V1`–`V33` (SQL, `src/main/resources/db/migration/`) — plus the index-only dotted `V23.1__shelter_bbox_index.sql` (the composite B-tree on the shelter coordinate columns; no PostGIS), the index-only `V30__index_cleanup_and_queue_indexes.sql` (the moderation-actions reporter index + the report-queue ordering index, minus four unused/redundant indexes), the column-only `V31__shelter_submitter_verified_snapshot.sql` (the write-time verification snapshot behind the erasure-stable `submitterVerified`, W2-A part 2), the column-widening `V32__otp_code_hash_keyed_widen.sql` (keyed `v2:` one-time-code hashes are 67 chars, so the OTP columns widen from VARCHAR(64) to VARCHAR(128); refresh tokens stay unkeyed/VARCHAR(64)) and the constraint-drop `V33__guidance_hero_import_on_save.sql` (the hero import moved from publish to SAVE — the V25 "no pending import on a published post" CHECK is gone; a page renders the hero only from the stored-asset reference, so the property holds by construction) — and the Java-based `V13` (`V13PiiEncryptionMigration` — PII-at-rest encryption + blind-index backfill, M2)
- jjwt 0.12.x (JWT access/refresh) · spring-security-crypto (Argon2id) · proj4j (coordinate transform)
- Testcontainers 2.0.x (Postgres) + JUnit 5 + AssertJ for tests
- No Lombok — records replace the boilerplate

## Package layout (root package `ee.sheltermap`)

| Package        | Contents                                                                                                                                                                                                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `User` hierarchy (incl. `AdminUser` — the env-provisioned admin, admin-moderation), `VerificationClaim`/`Policy`/`Rules`, `Shelter`, `Provenance`/`ReviewStatus`, enums, value records — pure Java, no Spring                                                                                                                         |
| `app`          | `UserService`, `ShelterService`, `LocationResolveService`, `MapsUrlCoordinates`, `RedirectClient` + `HttpUrlRedirectClient`, `AppInfo`, repository **interfaces**, `NotVerifiedException`                                                                                                                                             |
| `verification` | `VerificationProvider` + 3 impls, `SmsSender`/`SmtpSender` + impls, `VerificationService`, `PendingVerification`, `VerificationProperties`                                                                                                                                                                                            |
| `auth`         | `UserCredentials`, `PasswordHasher`, `TokenService`, `AuthService`, `PasswordResetService`, `ContactChangeService`, `AccountService`, `AuthController`, `AccountController`, `ClientIps`, `Codes`, `Hashes`, `RateLimiter`, `JwtProperties`, `ContactChangeProperties`, `AdminSeeder` (env-provisioned admin, admin-moderation), DTOs |
| `ingestion`    | `ShelterRegistryClient` (csv/paasteamet/dev clients), `LEst97Transformer`, `ShelterParser`, `ShelterImportService`, `ImportResult`, `RegistryProperties`                                                                                                                                                                              |
| `api`          | `ShelterController`, `LocationController`, `DataSourceController`, `AdminController` + `AdminModerationService` (admin-moderation), the dev `EmailTestController`/`SmsTestController` diagnostics, query services, DTOs, `ErrorResponse`, global advice                                                                               |
| `persistence`  | JPA entities + Spring Data implementations of the repository interfaces                                                                                                                                                                                                                                                               |
| `config`       | Composition root only: `SecurityConfig`, `JwtAuthenticationFilter`, `ProdJwtGuard`, `DevEndpointsGuard`, `ApiDocsGuard`, `OpenApiConfig`, `RateLimitProperties`, `RegistryScheduler` (weekly sync), `RegistryRunConfig`                                                                                                               |

| `security`     | `PiiCrypto` (AES-256-GCM + HMAC blind index), `PiiKeys` (fail-closed key loading) |
| `migration`    | `V13PiiEncryptionMigration` — the Java-based PII migration Flyway runs between V12 and V14 |
| `guidance`     | crisis-guidance: `GuidanceService`, `GuidanceSlug`, `BodySanitizer`, `MediaService`, `MediaStorage`, `MediaImageInspector` |

The `api` package additionally carries the crisis-guidance surface: `GuidanceController` and
`MediaController` (public reads) plus `AdminGuidanceController` and `AdminMediaController`.

Dependency rule: `api`/`auth`/`ingestion` → `app`/`verification` → `domain`. `domain` depends
on nothing. Cross-package access goes through interfaces only.

## Documentation

The repo holds 200-plus markdown files and only a handful are linked from this one, so here
is the map — grouped by who each set is for.

### Product & public documents

For readers outside the build — what the project is, and how to consume the API:

- [docs/whitepaper.md](docs/whitepaper.md) — the full whitepaper (product, security,
  architecture, the verification discipline)
- [docs/whitepaper-brief.md](docs/whitepaper-brief.md) — the one-page brief of the same
- [docs/external-review-ask.md](docs/external-review-ask.md) — the cover sheet for an outside
  reviewer (municipality, researcher, civil-protection contact)
- [docs/security/](docs/security/) — the threat model (`threat-model.md`) and the operations
  runbook (`operations.md`)
- [docs/api/openapi.json](docs/api/openapi.json) — the machine-readable API contract
  (readable summary under [API](#api))

### Operating documents (how to build, run, test, ship)

For the developer / operator:

- [README.md](README.md) (this file) — backend: run, configure, deploy, current state
- [frontend/README.md](frontend/README.md) — the Angular SPA: run, build, test, v1 deferrals
- [qa/](qa/) — the QA map: test plan, feature matrix, security + accessibility checklists
- [context-and-tasks/](context-and-tasks/) — the source-of-truth UML (`.puml` files) plus the
  backend agent task pack (`agent/`: `01-TASK.md` the contract, `07-STEPS.md` the build plan)
- [frontend/docs/](frontend/docs/) — the frontend flow diagrams (`.puml` files) plus the
  frontend agent pack (`agent/`)
- [docs/agentic-development.md](docs/agentic-development.md) — how this repo is developed
  with AI agents (topologies, verification discipline, surviving records)

### Internal process records (dated evidence, not guidance)

For the archaeologist — what a specific run or review found, not instructions to follow:

- [docs/code-review/](docs/code-review/) — the review records (2026-09-08 review output +
  fix log, 2026-09-14 P2 audit, the review-process docs)
- [docs/autopilot/](docs/autopilot/) — one hardening run's ledger (`findings/LEDGER.md`),
  run log (`RUNLOG.md`) and report (`AUTOPILOT-REPORT-2026-09-15.md`)
- [.agent-orchestration/](.agent-orchestration/) — an earlier run's artifacts (task ledger,
  decision log, audit report, risk register, model usage)
- [openspec/](openspec/) — the spec-driven change record: [openspec/specs/](openspec/specs/)
  is the current behavioral truth, [openspec/changes/](openspec/changes/) holds in-flight
  changes plus the `archive/` of the completed ones

## Data flow

```
Päästeamet open-data CSV (id;nimi;aadress;lest_x;lest_y, EPSG:3301)
      │  CsvRegistryClient (bulk download, If-Modified-Since, retry/backoff, politeness)
      ▼
LEst97Transformer  ── EPSG:3301 → WGS84 (proj4j)
      ▼
ShelterImportService ── upsert by externalId, delist missing (the fetched registry
           source only — PAASETEAMET today; USER rows + other sources never touched)
      ▼
PostgreSQL (all registry fields stored: name, address, county, municipality,
           coordinates, data-as-of, source attribution)
      ▼
GET /api/shelters  ── lean projection (id, name, address, lat/lng, trust/provenance) for the UI
```

The UI only ever talks to the local API for app data — never to the external
the external source. The DB is refreshed **weekly** by `RegistryScheduler` (`@Scheduled`, cron
`0 0 3 * * MON`, Europe/Tallinn) or manually on boot (see below).

### External services

| Service       | Who talks to it                                                                               | Purpose / policy                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Päästeamet    | backend only (weekly import + manual trigger)                                                 | registry shelters (EPSG:3301 → WGS84)                                                                                                                                                                                                                                                                                                                                                         |
| OSM Nominatim | **frontend only** — `/submit` address search (`frontend/src/app/gateways/geocode-gateway.ts`) | Estonia-restricted geocoding (`countrycodes=ee`, limit 5, jsonv2), no API key. Client-side **≥1000 ms request spacing** (1 req/s usage policy; the browser sends the expected `Referer`/`Accept-Language`). The UI always renders the required attribution "© OpenStreetMap contributors" (openstreetmap.org/copyright) next to the search box, and a search failure never blocks submission. |

## API

The generated OpenAPI document is the machine-readable contract (kept in sync by
`OpenApiContractIT` + `OpenApiSnapshotIT`): committed at [`docs/api/openapi.json`](docs/api/openapi.json),
browsable at `/swagger-ui` + `/v3/api-docs` in **dev/test only** (opt-in via `SPRINGDOC_ENABLED=true`;
`ApiDocsGuard` refuses to boot with the docs enabled outside dev/test). The table below is a
readable summary.

| Method | Path                                                                                      | Auth                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------ | ----------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                                                                          | —                       | Register (name, email, phone, password) → 201 (empty body — no session is created); 409 e-mail/phone already registered; 429 + `Retry-After` — per-IP bucket or the per-e-mail rolling registration-attempt cap (every attempt counts — a duplicate-409 retry is still an attempt; `auth/AuthController.java` register + `RollingContactOtpLimiter`, "register:" namespace)                                                                                                                                                                                                                                                                                                                                                                                                                                |
| POST   | `/auth/login`                                                                             | —                       | Login → access + refresh tokens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| POST   | `/auth/refresh`                                                                           | refresh                 | Rotate refresh token → new token pair                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| POST   | `/auth/logout`                                                                            | refresh                 | Revoke session                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| POST   | `/auth/password-reset/request`                                                            | —                       | Always 200 ("if the account exists, we emailed a 6-digit code")                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| POST   | `/auth/password-reset/confirm`                                                            | —                       | `{email, code, newPassword}` — set new password with the emailed code; revokes all sessions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| GET    | `/account/me`                                                                             | JWT                     | The caller's real profile + real verified claims + `isAdmin` (admin-moderation: always present, true only for the ADMIN-kind account — the frontend's gate for the nav item and the `/admin` route) (`MeResponse` — the frontend's single source of truth)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| PUT    | `/account/profile`                                                                        | JWT                     | Update the name with current-password confirmation → fresh `MeResponse`; wrong password → 401 (nothing updated)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| GET    | `/account/export`                                                                         | JWT                     | The caller's own data (profile + every author-scoped shelter row) as one JSON document → 200 `DataExportResponse` (the frontend turns it into a download)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| DELETE | `/account`                                                                                | JWT + verified          | Account erasure → 204 — private homes purged, public community rows orphaned (map data outlives accounts), credentials/claims/tokens/reports cascade; a repeat call is an idempotent no-op                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| POST   | `/account/email-change/request`                                                           | JWT                     | Start email change → **SMS code to current phone** (202)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| POST   | `/account/email-change/confirm`                                                           | JWT                     | Complete email change with the SMS code (200/400)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| POST   | `/account/phone-change/request`                                                           | JWT                     | Start phone change → **email code to current email** (202)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| POST   | `/account/phone-change/confirm`                                                           | JWT                     | Complete phone change with the email code (200/400)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| POST   | `/verify/request`                                                                         | JWT                     | Request email/phone verification code → 202 (429 if throttled: 60s cooldown / daily cap)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| POST   | `/verify/confirm`                                                                         | JWT                     | Confirm with the code → claim added; 400 wrong/expired code; idempotent — re-confirming an already-verified level returns 200 (the 409 already-verified answer belongs to `/verify/request`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| GET    | `/api/shelters?source=ALL\|USER\|REGISTRY&minLat=&minLng=&maxLat=&maxLng=&limit=&offset=` | public                  | List shelters — **ACTIVE rows only** (auto-hidden shelters are absent); optional filters `hasCapacity=true` and `provenance=` (enum) compose with `source`, applied server-side (a stray `minRating` param is ignored); the optional viewport `minLat`/`minLng`/`maxLat`/`maxLng` (ALL four together or none — a partial, non-finite, out-of-range or inverted box is a 400) restricts the rows read, and `limit` (1…200) + `offset` (≥ 0) page the stable id-ascending answer — the trust filters apply before the slice; omitting all of them answers exactly the pre-change list, and bad values are 400s with the uniform error body; every row carries the trust state (`nonexistentReports`, `inaccurateReports`, `reportCount`, `lastVerifiedAt`, `openStatus`, `occupancy`, `reviewStatus`, `provenance`, `inaccurate`) |
| GET    | `/api/shelters/{id}`                                                                      | public                  | Shelter detail (`ShelterDetailDto` — the list fields + the caller's `yourOccupancyBand`); **all statuses** (an auto-hidden shelter stays reachable here and by its owner)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | `/api/shelters`                                                                           | JWT + verified          | Submit a shelter → 201 + Location; 409 when the caller already has 10 ACTIVE USER shelters (the cap; ADMIN kind exempt); 409 for a near-duplicate (an ACTIVE USER row with the same normalized name within 100 m haversine — the message carries the existing row id; ADMIN kind exempt); 429 + `Retry-After` when the caller has hit the rolling 24 h submission cap (5 per user; ADMIN kind exempt) — the checks are `app/ShelterService.java` addPlace                                                                                                                                                                                                                                                                                                                                                  |
| GET    | `/api/shelters/mine`                                                                      | JWT                     | The caller's own shelters (never other users' or registry rows; **all statuses** — auto-hidden rows included, the contributions panel marks them)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| PUT    | `/api/shelters/{id}`                                                                      | JWT + verified + author | Update own shelter (name/description/capacity/lat/lng; bbox re-checked) → 200 `ShelterDto`; 404 absent / 403 not the author (registry/legacy rows). **Owner-edit trust reset (M5b):** an edit of a published row publishes immediately (the row's status is preserved — it never disappears from the public map) and returns the row to the same pending-verification state a newly added shelter carries (`reviewStatus` NEW → the "Newly added" treatment in the unified yellow family, provenance UNDER_REVIEW) until a verification clears it (the admin CONFIRM, or three distinct non-submitter confirmations — open OPEN_CONFIRMED reports and current OPEN taps — crossing the threshold); a no-op PUT (nothing changed) and hidden (REJECTED/auto-hidden) rows keep their state; the trust state is NOT a request field — it cannot be set by the client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| DELETE | `/api/shelters/{id}`                                                                      | JWT + verified + author | Delete own shelter → 204 (its reports and occupancy cascade); 404 absent / 403 not the author                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| POST   | `/api/shelters/{id}/reports`                                                              | JWT + verified          | Report a shelter `{type, detail?}` (NON_EXISTENT / CLOSED / OPEN_CONFIRMED / WRONG_LOCATION / OTHER; detail optional, stored for CLOSED / WRONG_LOCATION / OTHER and ignored for the binary types, ≤ 500) → 200 `{"damped": true\|false}` (the dampening outcome); 404 unknown shelter, 409 duplicate (shelter, user, type — checked before the throttle budget), 429 report throttle. The trust-weighted NON_EXISTENT tally reaching 5 points auto-hides an ACTIVE shelter (five baseline reporters — the 5th report; never re-hides after a manual status change)                                                                                                                                                                                                                                                                                                                     |
| PUT    | `/api/shelters/{id}/occupancy`                                                            | JWT + verified          | Report how full `{band}` (SPACE / GETTING_FULL / FULL) → 204 upsert — one live band per user per shelter, latest wins (no 409: a re-PUT is the update); 404 unknown shelter, 429 throttle. Display-only: 2 h freshness at read time, latest fresh band wins, hedged at one agreeing report, firm at two+ — never hides or filters                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| POST   | `/api/geo/resolve`                                                                        | JWT                     | Resolve a `maps.app.goo.gl` short link → `{latitude, longitude}` (per-IP 5/min → 429; 400 one generic message when no pair / outside Estonia / other host; 502 one generic retry-later on upstream failure)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| POST   | `/api/shelters/{id}/info-request/reply`                                                   | JWT + verified + author | The submitter's ONE-TIME answer to the admin's information request `{message}` → 204; 404 unknown shelter or no request, 403 not the author, 409 a second answer (the row is kept)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| PUT    | `/api/shelters/{id}/open-status`                                                          | JWT + verified          | Report the live open/closed state `{state: OPEN\|CLOSED}` → 204 upsert — one state per user per shelter, latest wins; 404 unknown shelter, 400 unknown enum value; **not throttled** (a tap is a state, not a report)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| GET    | `/api/data-source`                                                                        | public                  | Where the official shelter data comes from: the publisher, its open-data page and the newest import audit (status, source version, added/updated/removed counts) → 200 `DataSourceDto`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| GET    | `/api/site-texts`                                                                         | public                  | The admin overrides for the popup/header/footer copy (site_texts): `locale → key → {value, url?}` (en/et/ru always present; an absent key = the shipped i18n catalog default; `url` only on the two footer source-link keys, https) → 200                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GET    | `/api/guidance?locale=&limit=&offset=` | public                  | Crisis-guidance index — **published posts only**, pinned posts first and then the admin's manual order (`V28` `sort_order`; equal stamps: newest published → oldest; equal ids impossible); `limit` (1…200) + `offset` (≥ 0) page the stable index order (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the un-paged index length — a past-the-end page is empty, not an error) → `GuidancePostDto[]` |
| GET    | `/api/guidance/{slug}`                                                                    | public                  | One published post by slug → `GuidancePostDto` (404 for an unknown slug, a draft or a disabled post)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| GET    | `/api/media/{filename}`                                                                   | public                  | Serve a stored image (404 outside the generated name shape, with no asset row or with a missing file; `Cache-Control: immutable` because generated names are never reused)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| HEAD   | `/api/media/{filename}`                                                                   | public                  | Head probe of a stored image: same status, `Content-Type` and `Content-Length` as GET, no body (proxies, CDNs and monitoring can verify the asset anonymously); 404 for an unknown name                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| GET    | `/admin/guidance?locale=&q=&limit=&offset=` | JWT + ADMIN kind        | **Every post incl. drafts** (pinned first, then the manual order); `locale` scopes to the posts with content in it, `q` the case-insensitive substring; `limit` (1…200) + `offset` (≥ 0) page the (filtered) stored manual order (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the un-paged filtered length) → `AdminGuidancePostDto[]` (401 anonymous, 403 non-admin — fresh kind lookup per request) |
| POST   | `/admin/guidance`                                                                         | JWT + ADMIN kind        | Create a post (`title` + `body` required; the slug is derived from the title or supplied) → 200 `AdminGuidancePostDto`; 409 slug in use; 404 `heroImageId` with no such asset                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| GET    | `/admin/guidance/{id}`                                                                    | JWT + ADMIN kind        | One post → `AdminGuidancePostDto`; 404 unknown id                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| PUT    | `/admin/guidance/{id}`                                                                    | JWT + ADMIN kind        | Full replace of the editable fields (the body is re-sanitized) → 200 `AdminGuidancePostDto`; 404/409                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| POST   | `/admin/guidance/{id}/publish`                                                            | JWT + ADMIN kind        | Publish → **204** (idempotent — an already-published post also answers 204)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| POST   | `/admin/guidance/{id}/unpublish`                                                          | JWT + ADMIN kind        | Return to draft → **204** (idempotent); the public slug then answers 404                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| DELETE | `/admin/guidance/{id}`                                                                    | JWT + ADMIN kind        | Hard delete — requires `confirm=true` → **204**; 400 without the confirmation
| PUT    | `/admin/guidance/order`                                                                   | JWT + ADMIN kind        | Manual ordering (guidance-manual-order) — the FULL ordered id list of every post `{postIds}`; validated as a permutation of all ids BEFORE writing (unknown id, duplicate, stale/short list, empty-while-posts-exist → **400**, nothing written) → **204**, positions renumbered 1..N in one transaction (all-or-nothing); resubmitting the confirmed order is a no-op (no audit row), a changing reorder writes one `GUIDANCE_REORDER` audit row                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| GET    | `/admin/guidance/{id}/translations`                                                       | JWT + ADMIN kind        | The post's translations in locale order (the source of the public `alternates`) → `GuidanceTranslationDto[]`; 404 unknown id |
| POST   | `/admin/guidance/{id}/translations`                                                       | JWT + ADMIN kind        | Create a translation in a new locale (`locale` + `title` + `body` required; the slug is derived from the title or supplied) → 200 `GuidanceTranslationDto`; 409 the post already has a translation in that locale, or the (locale, slug) pair is taken |
| PUT    | `/admin/guidance/{id}/translations/{locale}`                                              | JWT + ADMIN kind        | Full replace of one translation's content (the locale is the key) → 200 `GuidanceTranslationDto`; 404/409 |
| DELETE | `/admin/guidance/{id}/translations/{locale}`                                              | JWT + ADMIN kind        | Delete a translation → **204**; 400 the post's own-locale (home) translation cannot be deleted; 404 unknown locale |
| POST   | `/admin/guidance/{id}/translations/attach`                                                | JWT + ADMIN kind        | Attach an existing post as a translation — re-parents the source's home-locale row onto this post (a move, not a copy) → 200 `GuidanceTranslationDto`; 400 source == target; 409 the target already has a translation in the source's locale |
| GET    | `/admin/media?limit=&offset=`                                                                            | JWT + ADMIN kind        | The media library with usage counts, **newest first**; optional `limit` (1..200; absent = no paging) + `offset` (≥ 0) page it (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the library's asset count without paging) → 200 `MediaAssetDto[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| POST   | `/admin/media`                                                                            | JWT + ADMIN kind        | Upload an image (multipart `file`) → **201** `MediaAssetDto`; 400 unsupported or declared-type mismatch; 413 over `MEDIA_MAX_BYTES`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| DELETE | `/admin/media/{id}`                                                                       | JWT + ADMIN kind        | Delete an asset → 200 `MediaAssetDto` (the pre-delete usage snapshot); 409 while still referenced and `confirm` is false                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| PUT    | `/admin/site-texts`                                                                       | JWT + ADMIN kind        | Save the admin's site-text edits `{texts: [{key, locale, value, url?}]}` (only the changed fields; a blank value resets that (key, locale) to the shipped default — the row is deleted, a blank url resets to the default URL) → 204; 400 an unknown key (the allowlist is closed — the admin edits VALUES, never invents keys), an unknown locale, a value over 500 characters, a url on a non-link key, a non-https url |
| GET    | `/admin/shelters?status=&source=&q=&limit=&offset=`                                                      | JWT + ADMIN kind        | **Every shelter incl. hidden** (id-ordered) with `nonexistentReports`, `inaccurateReports`, `openStatus`, fresh `occupancy`, `reviewStatus`/`reviewNote`, `provenance`, `locationKind`, `inaccurate`, the info request and the submitter's name; `status` exact-match filter, `source` the group filter (`REGISTRY` = Päästeamet + municipality imports, `USER` = user submissions, `ALL` = everything — the old per-source values such as `PAASETEAMET` are 400s now), `q` = case-insensitive name/address substring; `limit` (1…200) + `offset` (≥ 0) page the (filtered) id-ordered list (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the un-paged filtered length) → 200 `AdminShelterDto[]` (401 anonymous, 403 non-admin — fresh kind lookup per request)                                                                                                                                                                                                                                                                                                                                                                                                  |
| POST   | `/admin/shelters/{id}/status`                                                             | JWT + ADMIN kind        | `{"status": "ACTIVE" \| "INACTIVE"}` — manual hide/restore of a USER shelter → 204; a **restore disarms auto-hide permanently** (later NON_EXISTENT reports never re-hide); 400 missing/unknown status, 404 unknown shelter, **409 registry row** (import-owned)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| DELETE | `/admin/shelters/{id}`                                                                    | JWT + ADMIN kind        | Hard delete of a USER shelter (shelter reports and occupancy cascade) → 204; 404 unknown shelter, 409 registry row (import-owned)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| GET    | `/admin/reports?shelterId=&excludeDismissed=&limit=&offset=`                                                               | JWT + ADMIN kind        | The shelter-report queue, **newest first**, with the shelter's live status + the reporter's profile name + email (admin-only data); optional `shelterId` filter (unknown shelter → 404), `excludeDismissed=true` hides the dismissed (resolved) rows — absent or false renders everything, so the default hides nothing; `limit` 1..200 (default 100) + `offset` (≥ 0) page the queue (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the queue's length without paging — the OPEN count when `excludeDismissed=true`) → 200 `AdminShelterReportDto[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| POST   | `/admin/reports/{id}/dismiss`                                                             | JWT + ADMIN kind        | Mark a shelter report resolved → 204 — **idempotent** (a re-dismiss is a no-op); the row is KEPT, stamped `dismissed_at` once (V10); 404 unknown report                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| GET    | `/admin/shelters/{id}/history`                                                            | JWT + ADMIN kind        | The shelter's edit history, ascending: CREATED / EDITED (server-parsed field changes) / DELETED, with snapshot + batched actor names → 200 `AdminShelterHistoryDto[]`; a deleted shelter's history still serves; registry rows answer an empty list                                                                                                                                                                                                                                                                                                                                                                                                                        |
| POST   | `/admin/shelters/{id}/request-info`                                                       | JWT + ADMIN kind        | Ask the submitter for details `{message}` → 204; one exchange per shelter (the replied row is kept → 409 on a second request), 404 unknown shelter, 409 registry rows                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| POST   | `/admin/shelters/{id}/mark-inaccurate`                                                    | JWT + ADMIN kind        | Mark a USER shelter inaccurate (`{reason?}` optional) → 204 — **idempotent**; the row STAYS visible with the `inaccurate` flag; 404 unknown shelter, 409 registry rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| POST   | `/admin/shelters/{id}/clear-inaccurate`                                                   | JWT + ADMIN kind        | Clear the inaccurate mark → 204 — **idempotent**, audited; 404 unknown shelter, 409 registry rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| POST   | `/admin/shelters/{id}/review`                                                             | JWT + ADMIN kind        | The community-review decision `{action: CONFIRM\|REJECT, reason?}` → 200 `{"ok":true}`; CONFIRM promotes the row to CONFIRMED (status untouched), REJECT hides it (REJECTED + INACTIVE, reason stored as the note); 404 unknown shelter, 409 registry rows                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| GET    | `/admin/audit?limit=&offset=`                                                                     | JWT + ADMIN kind        | The moderation audit trail, newest first — every moderation-relevant action (admin AND automatic) with the shelter name resolved at read time → 200 `AdminAuditDto[]`; `limit` 1..200 (default 100) + `offset` (≥ 0) page the trail (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the trail's length without paging)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GET    | `/admin/alerts?limit=`                                                                    | JWT + ADMIN kind        | The throttle-abuse alerts, newest first: the daily submission cap (429), the per-contact OTP cap (429) and the near-duplicate rejection (409) → 200 `AdminAlertDto[]`; `limit` 1..200 (default 50). **In-memory** — clears on restart, so it is a triage view, not a durable log                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| GET    | `/admin/users?limit=&offset=`                                                                            | JWT + ADMIN kind        | Every REGISTERED and ADMIN account with its suspension state (e-mail included — admin-only data), id-ordered; optional `limit` (1..200; absent = the whole list) + `offset` (≥ 0) page it (bad values are 400s with the uniform error body), every answer carrying the `X-Total-Count` header (the account count without paging) → 200 `AdminUserDto[]`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| POST   | `/admin/users/{id}/suspend`                                                               | JWT + ADMIN kind        | Suspend a registered account → 204 — **idempotent**; login, refresh and every in-flight token stop working immediately; 404 unknown id, 409 ADMIN/GUEST targets (lockout vector)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| POST   | `/admin/users/{id}/unsuspend`                                                             | JWT + ADMIN kind        | Lift the suspension → 204 — **idempotent**, audited; same 404/409                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| POST   | `/dev/email-test`                                                                         | JWT + opt-in            | **SMTP diagnostic** — sends a real email and reports `sent`/error truthfully (disabled by default, see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| POST   | `/dev/sms-test`                                                                           | JWT + opt-in            | **SMS diagnostic** — sends a real SMS via the active sender and reports provider + E.164 recipient (disabled by default, see below)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| GET    | `/actuator/health`                                                                        | public                  | Health check                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Every error path returns the uniform `ErrorResponse` shape.

The seven paged reads (`GET /api/guidance`, `GET /admin/guidance`,
`GET /admin/shelters`, `GET /admin/reports`, `GET /admin/audit`, `GET /admin/users`
and `GET /admin/media`) always carry the `X-Total-Count` response header — the
length of the (filtered) scope WITHOUT the paging applied — so a client can
compute the page count and tell a past-the-end empty page from an empty scope.

### SMTP diagnostic endpoint (`POST /dev/email-test`)

Off by default (it must never be an open relay on a public deploy). Enable with
`DEV_EMAIL_TEST_ENABLED=true` in `.env`, then:

```bash
# 1. register + login → token (see curl examples above)
TOKEN=$(curl -s -X POST localhost:8080/auth/login -H 'Content-Type: application/json' \
  -d '{"emailOrPhone":"mari@example.ee","password":"s3cret"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

# 2. send a test email — minimal body works (subject/message have defaults)
curl -s -X POST localhost:8080/dev/email-test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"to":"you@example.com"}'
# → {"provider":"SmtpPulseSmtpSender","from":"noreply@sheltermap.ee","to":"you@example.com",
#    "subject":"OpenShelter test","sent":true,"error":null}

# 3. explicit subject/message
curl -s -X POST localhost:8080/dev/email-test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"to":"you@example.com","subject":"Hi","message":"OpenShelter works!"}'
```

`provider` shows which channel is active (`SmtpPulseSmtpSender` = real SMTP,
`DevSmtpSender` = console logging). Unlike the production senders (which swallow
delivery failures for anti-enumeration), this endpoint reports the truth:
`"sent":false` + the relay error tells you exactly what went wrong.

### SMS diagnostic endpoint (`POST /dev/sms-test`)

Mirror of the SMTP diagnostic for the phone channel (the hardening pass found
the Twilio channel had no way to be exercised end-to-end). Enable it with
`DEV_SMS_TEST_ENABLED=true` in `.env`, then:

```bash
# minimal body works (message has a default)
curl -s -X POST localhost:8080/dev/sms-test -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"to":"+37251234567"}'
# → {"provider":"TwilioSmsSender","to":"+37251234567","toE164":"+37251234567","sent":true,"error":null}
```

`sent:true` means the active sender accepted the message; a Twilio-side
rejection is logged by `TwilioSmsSender` (delivery errors are swallowed by
design — anti-enumeration), so check the app log for the error line.
Misconfiguration itself is caught at startup: with `app.sms.provider=twilio`
and missing `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_MESSAGING_SERVICE_SID`
(or `TWILIO_FROM`) the app refuses to start (fail-fast). Same safety as the
SMTP endpoint: disabled by default, JWT required, recipient allowlist
(`DEV_SMS_TEST_ALLOWED_RECIPIENTS`, matched in E.164 form) unless
`DEV_SMS_TEST_ALLOW_ANY=true`.

## Running locally

Requirements: JDK 21, Maven 3.9+, Docker (Compose), Node.js 26 + npm 11 (`frontend/package.json` `engines`).

```bash
# 1. Start PostgreSQL 16 (dev credentials: sheltermap / sheltermap — dev only)
#    It returns as soon as the container is created, so give it a few seconds:
#    `docker compose ps` until the db reports "healthy". Order matters — Flyway
#    migrates at boot, and the app exits rather than starting without a database.
docker compose up -d

# 2. Create the local .env (gitignored) from the tracked template and set the
#    two PII keys — REQUIRED in every profile: without them the app refuses to
#    boot (PiiKeys fail-closed; see "PII at rest" below). The template's other
#    defaults (dev console senders, no admin, diagnostics off) are fine for a
#    dev profile.
cp .env.example .env
openssl rand -base64 32   # paste into .env as PII_AES_KEY
openssl rand -base64 32   # paste into .env as PII_HMAC_KEY

# 3. (Optional — to build and test, not to run)
mvn -q compile

# 4. (Optional) Run the backend tests (Testcontainers spins its own postgres:16; the
#    suite is green on this tree — run `flock /tmp/openshelter-mvn.lock mvn -q test`
#    to see the current test counts). CI runs the same suite plus the build-time
#    gates (PMD, the JaCoCo coverage floor, the OWASP dependency scan) as
#    `mvn verify` against a service Postgres.
mvn test

# 5. Run the API (Flyway enabled, JPA ddl-auto=validate) — waits briefly for the
#    database and, if it is not up, prints what to do instead of failing obscurely.
#    dev-start.sh pins SPRING_PROFILES_ACTIVE=dev (see note below) — a bare
#    `mvn spring-boot:run` now refuses to boot (fail-closed guards).
./dev-start.sh

# 6. Health check — expect {"status":"UP"}
curl http://localhost:8080/actuator/health

# 7. Run the web app (second terminal) → http://localhost:5173
#    The dev server proxies /api, /auth, /account (with a browser-navigation
#    bypass — the path is both an Angular route and an API path), /verify/ and
#    /admin/ to :8080 (frontend/proxy.conf.js), so the SPA is same-origin and no
#    CORS or API-origin config is needed.
cd frontend && npm install && npm start
```

Steps 3–4 are build/verification steps; steps 1, 2, 5 and 7 are all it takes to
run the application. (`frontend/README.md` covers the frontend on its own.)

> **Use `./dev-start.sh` to run the app locally.** Since the 2026-09-08 review the app is
> **fail-closed at boot** via five guards: `ProdJwtGuard` (refuses the published dev-default /
> < 32-byte `JWT_SECRET`), `DevEndpointsGuard` (refuses the `/dev/email-test` +
> `/dev/sms-test` diagnostic endpoints — which the local `.env` turns on), `DevSenderGuard`
> (refuses to send through the dev console senders when a real provider is configured),
> `ApiDocsGuard` (refuses the springdoc `/v3/api-docs` + `/swagger-ui` surface — which the local
> `.env` turns on via `SPRINGDOC_ENABLED=true`) and `DataSourceCredentialGuard` (refuses the
> published dev database password — or a blank one). All five refuse to boot
> **unless the active profile is exactly `dev` or `test`** (dev parity). A plain
> `mvn spring-boot:run` with no profile set therefore exits at startup with
> `PRODUCTION REFUSED TO START`. `./dev-start.sh` pins `SPRING_PROFILES_ACTIVE=dev` for you;
> the equivalent one-liner is `SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run`. (A strong
> non-default `JWT_SECRET` clears the JWT guard but NOT the dev-endpoint/doc guards while
> `DEV_EMAIL_TEST_ENABLED` / `DEV_SMS_TEST_ENABLED` / `SPRINGDOC_ENABLED` are on — the dev profile
> is the intended local path.) The test suite runs under profile `test` (its own classpath `application.yml`)
> and is unaffected by the script.

### One-off import of the real registry data

```bash
# Fetches all ~300 shelters from the official open-data CSV, transforms to WGS84, stores them
./dev-start.sh --run-registry
# (equivalent: SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.run-on-startup=true")
```

Then the data is served by `GET /api/shelters`:

```bash
curl http://localhost:8080/api/shelters | python3 -m json.tool | head -50
```

### Dev fixture instead of the live source

```bash
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.client=dev --app.registry.run-on-startup=true"
```

## Configuration (environment variables)

**Local `.env` file** (project root): Spring loads it automatically at startup via
`spring-dotenv` (`me.paulschwarz:spring-dotenv`). Put real credentials there instead of
exporting them each launch — `.env` is gitignored and never committed. `.env.example` in the
repository root lists the variable names this app reads (placeholders only, no real values) —
copy it and fill in your own; shell-exported env vars take precedence over `.env` values.

> **Secret-scan note (2026-09-09 de-slop pass):** a secret-pattern scan of the FULL git
> history found zero committed credentials. The `a5e83db` commit message ("tested with
> live twilio credentials") is historical wording only — its diff contains no secrets.
> Live credentials live exclusively in the gitignored `.env`.

| Variable                                                         | Default                                                                     | Purpose                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`                         | `jdbc:postgresql://localhost:5432/sheltermap` / `sheltermap` / `sheltermap` | Datasource (dev-only defaults)                                                                                                                                                                                                                                                                                                                          |
| `SERVER_PORT`                                                    | `8080`                                                                      | HTTP port                                                                                                                                                                                                                                                                                                                                               |
| `JWT_SECRET`                                                     | dev-only placeholder                                                        | **Must be overridden in any real environment** (≥ 32 bytes)                                                                                                                                                                                                                                                                                             |
| `MAIL_PROVIDER`                                                  | `dev`                                                                       | `dev` (console) or `smtp-pulse` (real SMTP)                                                                                                                                                                                                                                                                                                             |
| `SMTP_HOST` / `SMTP_PORT`                                        | `smtp-pulse.com` / `587`                                                    | SMTP relay (alt: 465 SSL, 2525)                                                                                                                                                                                                                                                                                                                         |
| `SMTP_USERNAME` / `SMTP_PASSWORD`                                | —                                                                           | SMTP login (real credentials → `.env`, never git)                                                                                                                                                                                                                                                                                                       |
| `SMTP_FROM`                                                      | falls back to `SMTP_USERNAME`                                               | From-address — **must be verified in the smtp-pulse dashboard**                                                                                                                                                                                                                                                                                         |
| `SMS_PROVIDER`                                                   | `dev`                                                                       | `dev` (console) or `twilio` (real SMS)                                                                                                                                                                                                                                                                                                                  |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`                       | —                                                                           | Twilio credentials (real → `.env`, never git)                                                                                                                                                                                                                                                                                                           |
| `TWILIO_MESSAGING_SERVICE_SID`                                   | —                                                                           | Twilio Messaging Service (preferred over `TWILIO_FROM`)                                                                                                                                                                                                                                                                                                 |
| `TWILIO_FROM`                                                    | —                                                                           | Fallback sender number (only if no Messaging Service)                                                                                                                                                                                                                                                                                                   |
| `VERIFICATION_COOLDOWN_SECONDS`                                  | `60`                                                                        | Min seconds between two codes for the same (user, level); `0` disables                                                                                                                                                                                                                                                                                  |
| `VERIFICATION_MAX_PER_DAY`                                       | `5`                                                                         | Max codes per (user, level) per UTC day; `0` disables                                                                                                                                                                                                                                                                                                   |
| `VERIFICATION_SEND_LOG_PATH`                                     | `data/verification-send.log`                                                | File-backed send log (survives restarts; never commit `data/`)                                                                                                                                                                                                                                                                                          |
| `CONTACT_CHANGE_COOLDOWN_SECONDS`                                | `60`                                                                        | Min seconds between two change requests for the same (user, type)                                                                                                                                                                                                                                                                                       |
| `CONTACT_CHANGE_CODE_TTL_SECONDS`                                | `900`                                                                       | Contact-change code validity window (15 min)                                                                                                                                                                                                                                                                                                            |
| `CONTACT_CHANGE_MAX_ATTEMPTS`                                    | `5`                                                                         | Max wrong contact-change codes before the request is rejected                                                                                                                                                                                                                                                                                           |
| `DEV_EMAIL_TEST_ENABLED`                                         | `false`                                                                     | Enables `POST /dev/email-test` (SMTP diagnostic, JWT required)                                                                                                                                                                                                                                                                                          |
| `REGISTRY_BASE_URL`                                              | Päästeamet open-data CSV URL                                                | Registry endpoint                                                                                                                                                                                                                                                                                                                                       |
| `REGISTRY_CLIENT`                                                | `csv`                                                                       | `csv` (real HTTP), `paasteamet` (legacy WFS) or `dev` (local fixture)                                                                                                                                                                                                                                                                                   |
| `CORS_ALLOWED_ORIGINS`                                           | `http://localhost:5173,http://localhost:3000`                               | Browser origins allowed to call the API                                                                                                                                                                                                                                                                                                                 |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                                 | — (empty = no admin exists)                                                 | The env-provisioned admin (admin-moderation): both set + no user with that email → an ADMIN-kind account is created at startup (create-if-absent — never re-hashed; login through the normal `/auth/login`); either unset → no admin, `/admin/*` answers 403 for everyone. **No defaults are committed** — the dev values live in the gitignored `.env` |
| `PII_AES_KEY` / `PII_HMAC_KEY`                                   | — (empty = **the app refuses to boot**)                                     | PII at rest (M2): 32-byte base64 AES-GCM data key + HMAC blind-index key. Generate: `openssl rand -base64 32` (once per key). Dev values live in the gitignored `.env`; **never committed, never logged** — see “PII at rest” below                                                                                                                     |
| `RATELIMIT_TRUSTED_PROXIES`                                      | —                                                                           | IPs of trusted reverse proxies (for `X-Forwarded-For` rate-limit keys)                                                                                                                                                                                                                                                                                  |
| `DEV_EMAIL_TEST_ALLOWED_RECIPIENTS` / `DEV_EMAIL_TEST_ALLOW_ANY` | — / `false`                                                                 | E-mail-test recipient allowlist (spam-relay guard)                                                                                                                                                                                                                                                                                                      |
| `DEV_SMS_TEST_ENABLED`                                           | `false`                                                                     | Enables `POST /dev/sms-test` (SMS diagnostic, JWT required)                                                                                                                                                                                                                                                                                             |
| `DEV_SMS_TEST_ALLOWED_RECIPIENTS` / `DEV_SMS_TEST_ALLOW_ANY`     | — / `false`                                                                 | SMS-test recipient allowlist (spam-relay guard; numbers matched in E.164)                                                                                                                                                                                                                                                                               |
| `REPORTS_MAX_ACTIONS_PER_HOUR`                                   | `10`                                                                        | per-user cap on report-type actions per rolling hour (over it → 429)                                                                                                                                                                                                                                                                                    |
| `REGISTRY_OFFICIAL_URL`                                          | — (empty → falls back to the rescue.ee page)                                | the publisher's open-data page that `GET /api/data-source` serves as `officialUrl`                                                                                                                                                                                                                                                                      |
| `MEDIA_UPLOAD_DIR`                                               | `data/media`                                                                | directory the media library writes uploaded images to                                                                                                                                                                                                                                                                                                   |
| `MEDIA_MAX_BYTES`                                                | `5242880` (5 MiB)                                                           | upload cap — a larger body is rejected with 413 before anything is stored                                                                                                                                                                                                                                                                               |
| `HERO_IMPORT_CONNECT_TIMEOUT` / `HERO_IMPORT_READ_TIMEOUT`      | `3s` / `5s`                                                                 | hero-image import (guidance-hero-import): the connect timeout and the no-progress read timeout of the admin's remote fetch — a stalled host cannot pin the publish thread                                                                                                                                                                              |
| `HERO_IMPORT_BUDGET`                                             | `10s`                                                                       | wall-clock budget for the whole import walk (entry + ≤ 3 redirect hops); past it the publish fails and the post stays a DRAFT                                                                                                                                                                                                                          |
| `HERO_IMPORT_MAX_SIDE`                                           | `10000`                                                                     | max image dimension in pixels (the decompression-bomb guard) — an image whose header claims more is refused with 400 before anything is decoded                                                                                                                                                                                                       |
| `GUIDANCE_DEFAULT_LOCALE`                                        | `en`                                                                        | locale applied when a guidance post is created without one                                                                                                                                                                                                                                                                                              |
| `RETENTION_ENABLED` / `RETENTION_INACTIVE_ACCOUNT_MONTHS` / `RETENTION_AUDIT_MONTHS` | `false` / `24` / `24` | the daily data-retention job (V24, `app.retention.*`): prunes accounts with no sign-in activity for `RETENTION_INACTIVE_ACCOUNT_MONTHS` months and moderation/audit rows older than `RETENTION_AUDIT_MONTHS` months, using the `DELETE /account` erasure rule. **Off by default** — the destructive job ships disabled and a deployment enables it deliberately |
| — scheduler —                                                    | see `application.yml`                                                       | `app.registry.*`: page-size, retries, politeness, cron, zone, `schedule-enabled`                                                                                                                                                                                                                                                                        |

## Hardening pass

A code-review pass over the completed Steps 0–6 fixed the following (each with tests):

**High**

- **Duplicate registration → 409** — `users.email` / `users.phone` are now UNIQUE (V3 migration);
  the API pre-checks and answers `409 Conflict` with the uniform `ErrorResponse` (race-safe via
  the DB constraint as backstop).
- **Password reset is an emailed 6-digit code** — the emailed URL link (base URL via
  `app.frontend.base-url` / `FRONTEND_BASE_URL`) is gone (M2 `password-reset-email-code`):
  confirm takes `{email, code, newPassword}`, the code is hashed, 15-min TTL, single-use,
  5-attempt-limited, and a new request invalidates the previous code.

**Medium**

- **Atomic password reset** — hash update, token mark-used and session revocation now run in
  ONE transaction (a mid-way failure can no longer leave the token replayable).
- **Atomic registry import** — the apply/upsert/delist phase runs in one transaction; the
  network fetch happens outside it. A failure rolls back the whole batch (no partial state).
- **Register rate limiting** — registration is guarded per client IP (account-spam vector),
  alongside login + reset-request.
- **`description`/`capacity` are stored** — user submissions used to validate these fields then
  silently drop them; they now persist (V3 columns, domain, entity, mapper, DTO).
- **No N+1 on the shelter listing** — the per-row trust derivations (creator verification,
  report counts, fresh occupancy, the last-verified stamp) are computed in ONE batched query per
  listing (`ShelterQueryService`), not one query per shelter. (The rating aggregates this fix
  originally batched went with the review model — V21.)
- **X-Forwarded-For-aware rate limiting** — behind a reverse proxy, every user used to share one
  IP bucket (global lockout risk); `X-Forwarded-For` is honored only from configured trusted
  proxies (`RATELIMIT_TRUSTED_PROXIES`), so clients can't spoof their key.
- **Health endpoint hardening** — `/actuator/health` details are now shown only to authorized
  callers (`show-details: when-authorized`); SMTP reachability no longer flips the app DOWN.

**Low**

- Review add is moot — the whole review model (and with it that upsert race) was dropped in
  `V21__drop_reviews.sql`.
- Concurrent verification confirms can't produce duplicate active claims (unique
  `(user_id, level)` on non-revoked claims); failed attempts are persisted so the limit holds
  across HTTP requests.
- Startup import and the weekly scheduler share one overlap guard (`AtomicBoolean` in
  `ShelterImportService`).
- Intra-fetch duplicate `externalId`s are counted as skipped, never silently dropped.
- The registry client sends a `User-Agent` identifying the app (politeness).
- CORS configured (`app.cors.allowed-origins`) for the browser frontend.
- `/dev/email-test` has a recipient allowlist (never an open relay); `DevSmtpSender`/`DevSmsSender`/
  `TwilioSmsSender` are conditional beans — exactly one active per channel.
- Dead code removed — `VerificationService.revoke` (revocation is pure domain state),
  `AdminUser`, `User.canWatch()`, `UserService.guest()`/`deleteAccount()`,
  `Capability.PUBLISH_INSTANTLY`, `ShelterReviewService.getRatingSummary()`, and
  `ShelterStatus.PENDING`/`REJECTED` were deleted as part of the review-fix pass.
  The remaining hierarchy is `User` → `GuestUser`/`RegisteredUser` only; `revoke(level)`
  survives on `RegisteredUser` because the Step-1 contract ("levels() reflects add/revoke")
  requires it.

## 2026-09-08 code-review fix campaign

A 4-lead / 14-child review was fixed over three waves — structure and per-area verdicts are
documented in [docs/code-review/README.md](docs/code-review/README.md); the verbatim reports
and the full per-issue fix log are gitignored, so they stay local-only. Highlights:

- **P0 security** — reset-confirm anti-guess rate limit; per-user reset re-issue cooldown (60 s)
  - 5/UTC-day cap; `ClientIps` XFF resolution made unspoofable (untrusted peer → header
    ignored; trusted chain peeled right-to-left); JWT secret guard made **fail-closed**
    (refuses the dev-default or < 32-byte secret on any profile except `dev`/`test`);
    refresh rotation race fixed (transactional, `int` claim).
- **Backend** — user-submission write path: `@Version` optimistic locking + 409 mapping
  (incl. commit-time `TransactionSystemException(StaleStateException)` form), author-scoped
  queries ordered, per-source delisting (see below), dev-endpoint guard (`DevEndpointsGuard`
  refuses to boot with dev diagnostics enabled on a non-dev/test profile), case-insensitive
  unique email, login contact-key normalization + per-IP aggregate bucket.
- **Frontend** — session state consolidated (`session/` package), 401/refresh edge cases
  (epoch-guarded profile, single-flight refresh, network-error handling), unified error copy,
  shared loading/rating/leaflet/form-helper layer, contributions panel folded into
  `features/account/` (zero cross-feature imports).
- **Schema** — `V8__review_hardening.sql` (reset-token hash uniqueness + `created_at`;
  case-insensitive email index; `shelters.version`).
- **Delisting is per source** — the importer now delists only `client.source()`
  (today `PAASETEAMET`); a zero-row fetch skips delisting entirely; `MUNICIPALITY` rows are
  retained until a municipality client ships.

Deliberately deferred (recorded in the fix log): reset-token global prune scheduler
(product/ops decision), the review's long tail of low-severity nits (in-memory TokenBucket
sweep race, send-log UTC-midnight assumption, 403-vs-401 deleted-user inconsistency,
unreachable `NotAuthor` guards, first-validation-field-only messages, test nits; frontend
prod `apiUrl ''`, banner warning variant, `--bp-narrow` token, copy-pasted fakes,
map-page.scss size budget; dev-endpoint CRLF/`@Size`; national-ID-at-rest — resolved by M1:
the field no longer exists, `users.national_id_code` dropped in V12).

## PII at rest (M2)

User identity contacts (e-mail, phone) are stored **encrypted** — a stolen DB dump or
backup alone no longer exposes account identities. Design: `openspec/changes/archive/2026-09-16-pii-at-rest/design.md`.

- **What is encrypted where.** `users.email` / `users.phone`, `verification_claims.external_ref`,
  `pending_verifications.contact` and `pending_contact_changes.target` store a `v1:` +
  Base64URL(12-byte nonce ‖ AES-256-GCM ciphertext+tag) envelope. The `v1:` prefix is the
  key-slot tag (the V13 migration's idempotency guard + the rotation hook). All crypto lives
  in the persistence layer (`ee.sheltermap.security.PiiCrypto`, applied by `UserMapper` and
  the pending-* JPA repositories) — the domain, the API and the frontend keep working with
  plaintext in memory; no API contract changed.
- **Lookups + uniqueness.** `users.email_hash` / `users.phone_hash` hold the domain-separated
  HMAC-SHA256 blind index of the canonical value (e-mail lower-cased + trimmed, phone E.164).
  Login, duplicate-check and admin lookups run on the hashes, under the UNIQUE indexes
  `uq_users_email_hash` / `uq_users_phone_hash` (they replaced the V3/V8 plaintext indexes);
  the ciphertext columns are never matched against.
- **Keys (fail-closed).** `PII_AES_KEY` + `PII_HMAC_KEY` — 32-byte base64, env-only (dev:
  the gitignored `.env`), **never committed, never logged**. Missing or malformed ⇒ the app
  refuses to boot (same fail-closed pattern as the JWT guard). Generate: `openssl rand -base64 32`
  (once per key).
- **Existing rows.** V13 (a Flyway Java migration, bean-injected) re-encrypts every row in
  place at startup and is rerun-safe after `flyway repair` (already-`v1:` rows are skipped,
  DDL is idempotent). A pre-existing canonical-collision (e.g. `Foo@x.com` next to
  `foo@x.com`) fails the migration loudly — dedupe, `flyway repair`, restart.
- **Rotation (documented procedure, D6).** The `v1:` tag is the key slot. AES-key rotation:
  (1) set the new key under the next slot and run a one-off re-encrypting migration that
  rewrites each row as `v2:` — old rows stay decryptable under their slot tag until
  rewritten; (2) once every row is re-encrypted, drop support for the old slot. The HMAC
  key MUST rotate in the same migration pass (rehash every row atomically) — a blind-index
  lookup against a stale hash fails, so the two keys rotate together, never independently.
  The re-encryption tooling is deliberately NOT built until a rotation is scheduled.
- **Lost key = unrecoverable PII.** Accounts become unloginable by contact. Keep an
  **offline backup of both keys** — the DB dump itself no longer helps an attacker, so the
  key is the single thing worth protecting.
- **Out of scope here.** The file-backed `data/verification-send.log` TSV (anti-spam daily
cap) keeps its format — a named residual (backup + future DB-backed seam) in
`docs/security/operations.md` (M15). JWTs carry no e-mail/phone claims (verified).

## Production deployment

Checklist for a non-dev deploy (the 2026-09-08 campaign hardened all of these server-side):

1. **JWT secret (fail-closed).** Run with a real profile (e.g. `SPRING_PROFILES_ACTIVE=prod`)
   **and** a `JWT_SECRET` that is not the published dev default and is **≥ 32 bytes** (HS256).
   `ProdJwtGuard` refuses to boot otherwise — a misconfigured deploy cannot start with a
   weak secret. `dev`/`test` profiles are the only exemptions.
2. **Dev diagnostics off.** `POST /dev/email-test` and `POST /dev/sms-test` are disabled by
   default; `DevEndpointsGuard` additionally refuses to boot if either is enabled on a
   non-dev/test profile.
3. **CORS.** Set `CORS_ALLOWED_ORIGINS` to the exact public origin(s) of the frontend
   (default `http://localhost:5173,http://localhost:3000` is dev-only).
4. **Mail / SMS providers.** `MAIL_PROVIDER=smtp-pulse` + `SMTP_USERNAME`/`SMTP_PASSWORD`
   (`SMTP_FROM` verified in the dashboard); `SMS_PROVIDER=twilio` + `TWILIO_*` credentials
   (the sender fail-fasts at boot with missing credentials). All credentials via env vars / a
   secret store — never committed.
5. **Registry sync.** `REGISTRY_CLIENT=csv` (default, M5) fetches the
   Päästeamet open-data CSV; `REGISTRY_CLIENT=paasteamet` is the legacy WFS
   alternate; `REGISTRY_CLIENT=dev` uses the local fixture (dev only).
   Weekly cron `0 0 3 * * MON`
   Europe/Tallinn (`app.registry.cron`/`zone`), disable with `app.registry.schedule-enabled=false`.
6. **Single instance — in-memory rate limits.** The token-bucket limiter and the reset
   re-issue counter are **in-memory, per process**. This app must run as ONE instance; behind
   multiple replicas each has its own buckets (limits weaken by the replica count) and the
   reset daily cap is per-instance. Run one, or move to a shared store first.
7. **Content-Security-Policy at the proxy.** Set the ready-to-use CSP header
   from [`docs/deploy/spa-csp.md`](docs/deploy/spa-csp.md) in the reverse proxy in front of the SPA
   — that is the UI's real enforcement point. The shipped header is derived
   from what the built SPA actually loads (own bundle, the two hashed
   pre-paint scripts, OSM tiles + Nominatim geocoder); `python3 scripts/spa-csp.py
   frontend/dist/frontend/browser/index.html` recomputes it after every
   frontend rebuild (the doc also covers the nginx/caddy/ingress forms and
   why it is a proxy header, not a `<meta>` tag). The API has sent its own
   hardening headers, including a
   defense-in-depth CSP, on every response since the M3 slice 5 hardening
   pass (`SecurityHeadersFilter`).
8. **Trusted proxies for rate-limit keys.** If the app sits behind a reverse proxy/LB, set
   `RATELIMIT_TRUSTED_PROXIES` to the proxy IP(s) — otherwise every user behind it shares one
   bucket, and without it the `X-Forwarded-For` header is ignored entirely (safe default).
   Set `RATELIMIT_TRUST_LOOPBACK=false` behind a real load balancer.
9. **PII keys (fail-closed).** `PII_AES_KEY` + `PII_HMAC_KEY` (32-byte base64, env/secret
   store — never in the repo) MUST be set, or the app refuses to boot. Back up both keys
   OFFLINE: a lost key makes the affected accounts unloginable by contact (see “PII at rest”).
10. **No `.env` in production.** `spring-dotenv` auto-loads a repo-root `.env` in EVERY
   profile, so a file shipped with the deploy silently supplies the local dev value for
   every variable the production environment does not set — the boot guards catch the dev
   console senders, the dev diagnostics and springdoc, but NOT, e.g., the dev SMTP
   relay/credentials or a localhost `DB_URL`. Ship the app without a `.env` (or remove it
   from the deploy directory) and set every variable explicitly in the environment or
   secret store.

## Security

- **Threat model** — `docs/security/threat-model.md`: the twelve-attack
  model (false submissions, brigading, DoS, account takeover, enumeration,
  private-address exposure, malicious content, location tracking,
  SMS/e-mail cost abuse, DB leaks, admin compromise, nearest-result
  manipulation) with each attack's mitigations, status and pinning tests,
  plus the explicit residual-risk register.
- **Operations runbook** — `docs/security/operations.md`: environments and
  the fail-closed boot guards, the env-only secrets matrix,
  staging-vs-production separation, backups (pg_dump + restore),
  monitoring, and the incident quick-list.
- The security test suite (the `*IT` classes named in the threat model,
  incl. `PasswordRecoveryFlowIT` and `AdminAuthorizationIT`) runs with
  `mvn test`.

## Current state & known gaps

**Done and working (production-grade):**

- Auth (register/login/refresh/logout/password-reset) with Argon2id + JWT + rate limiting
- **Verification over HTTP** (`POST /verify/request` + `/verify/confirm`, email/phone) — the
  write path is now reachable: verified users can submit shelters, report and answer an
  information request
- **Cross-channel contact change** (`POST /account/*-change/request` + `/confirm`) — email
  change verified by SMS, phone change by email
- Shelter ingestion from the official Päästeamet open-data CSV + weekly scheduler +
  manual trigger
- Public read API with the trust/provenance aggregates, a verified-write API for shelters,
  reports and occupancy, and the community trust layer (shelter reports with auto-hide, live
  occupancy and open state, provenance, trust filters)
- **Shelter-list viewport + paging (shelter-bbox-paging)** — `GET /api/shelters` takes the
  optional `minLat`/`minLng`/`maxLat`/`maxLng` box (all four together or none — a partial,
  non-finite, out-of-range or inverted box is a 400 with the uniform error body) and
  `limit` (1…200) + `offset` (≥ 0) paging over the stable id-ascending order (the filters
  apply before the slice; an offset past the end answers an empty page); omitting all of
  them answers exactly what the endpoint answered before. The box rides a plain composite
  B-tree index on `(latitude, longitude)` (`V23.1__shelter_bbox_index.sql`) — deliberately no
  PostGIS and no spatial extension (Estonia-scale data does not justify the deployment
  surface; the scale-up path is recorded in the change's `design.md`); "nearest shelter"
  remains a client-side ranking of the loaded list
- Persistence (Flyway `V1`–`V33` + the Java `V13`, JPA, `ddl-auto=validate`), uniform error handling
- Fail-closed JWT secret guard + fail-fast dev-endpoint guard (refuse to boot misconfigured)

**Configured integrations (working — not gaps):**

- **E-mail** — `SmtpPulseSmtpSender` is wired through `MAIL_PROVIDER=smtp-pulse` plus
  `SMTP_HOST`/`SMTP_PORT`/`SMTP_USERNAME`/`SMTP_PASSWORD`/`SMTP_FROM` (smtp-pulse.com:587) in the
  gitignored `.env`; `DevSmtpSender` is only the fallback when those variables are unset. Live
  delivery is confirmed.
- **SMS** — `TwilioSmsSender` is wired through `SMS_PROVIDER=twilio` plus
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN` and `TWILIO_FROM` (or a messaging-service SID); live
  delivery to a handset is confirmed. `DevSmsSender` logs instead when the provider is unset.
- **Nearest-shelter search** — implemented client-side over the loaded list: the "Nearest
  shelter" call to action uses `findNearest` and a Haversine distance in
  `frontend/src/app/features/map/map-page.ts`, with permission-aware geolocation whose denied and
  unsupported states are covered by tests.

**Genuine gaps (deferred or stubbed):**

1. **Smart-ID verification** — a stub: requests are rejected with 400 up front.
2. **Deployment hardening** — HTTPS, real secret management, monitoring (dev-grade config today).
3. **Frontend v1 deferrals** — shipped in `frontend/` (M0–M6 complete + M7/M8 additions);
   the deferral list (server-side nearest search, further content i18n beyond the shipped
   ET/EN chrome, MapLibre, httpOnly cookies, SSR, e2e framework) is in
   [frontend/README.md](frontend/README.md#deferrals-v1-honest-list).
4. **2026-09-08 review deferrals** — the low-severity tail (reset-token global prune
   scheduler, TokenBucket sweep race, send-log UTC-midnight assumption, 403-vs-401
   deleted-user inconsistency, unreachable `NotAuthor` guards, first-validation-field-only
   messages, test nits; frontend prod `apiUrl ''`, banner warning variant, `--bp-narrow`
   token, copy-pasted fakes, map-page.scss size budget; dev-endpoint CRLF/`@Size`;
   national-ID-at-rest — resolved by M1, the column is dropped) is recorded per-issue in the
   fix log's deferred list.
5. **`national_id_code` is no longer stored (M1, V12)** — the former plaintext privacy
   consideration is closed: registration no longer collects the field, the column is dropped,
   and the SMART_ID verification level stays a stub that, when it lands, proves identity via
   an external PKI flow without storing any code.
6. **Live Twilio send** — the sender, E.164 normalization and the fail-fast at startup are
   covered by tests with fakes/fixtures, and live delivery to a handset is confirmed
   (`POST /dev/sms-test` with `DEV_SMS_TEST_ENABLED=true` and the account credentials in `.env`).
   The code *default* stays the dev console sender, so a fresh clone sends to the log until the
   `.env` is recreated.

## License

MIT — see [LICENSE](LICENSE).
