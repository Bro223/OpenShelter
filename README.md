# OpenShelter

Backend for an Estonia public-shelter map: verified user registration, password auth with
JWT sessions, shelter data ingested automatically from the official registry, user-submitted
shelters with community ratings (the rating system **is** the moderation — no moderator).
Users manage their own contributions — list/edit/delete their own shelters and reviews from
the account page (M8, `user-contributions`). On top, a community trust layer (shelter-
trust-and-reports) keeps the map honest without a moderator: users report shelters that no
longer exist (the 5th such report takes the shelter off the public map), report bad reviews
(the 5th hides the review), and report how full a shelter is right now (shown to everyone
while fresh). A single env-provisioned admin (admin-moderation) works the trust layer's report
queues — restore/delete user shelters, triage shelter reports, hide/restore reviews — from a
moderation panel that is invisible to everyone else.

**Frontend in [`frontend/`](frontend/)** — Angular 22 SPA (map browse with trust filters,
auth, verification, shelter submission, community reviews and reports); run/build docs in
[frontend/README.md](frontend/README.md).

> Built step by step from the task pack in [`context and tasks/agent/`](context%20and%20tasks/agent/):
> `01-TASK.md` is the contract, `07-STEPS.md` the build plan, the puml files in
> [`context and tasks/`](context%20and%20tasks/) the source-of-truth UML.

## Status

- ✅ **Admin moderation (admin-moderation)** — the env-provisioned admin + moderation API:
  `ADMIN_EMAIL`/`ADMIN_PASSWORD` provision one ADMIN-kind account at startup (create-if-absent,
  never re-hashed, no-op when either var is unset; login through the normal `/auth/login`),
  fresh `UserKind.ADMIN` lookup per `/admin/*` request (no JWT role claim — 401 anonymous /
  403 non-admin, a demotion takes effect on the next request), the `/admin/*` surface
  (all-shelters list incl. hidden + search, user-shelter hide/restore — a restore disarms
  auto-hide — and hard delete, the shelter-report queue with idempotent dismiss, the
  review-report queue with idempotent hide/restore; registry rows are import-owned → 409),
  `isAdmin` on `GET /account/me`, `V10__admin_moderation.sql` (`shelter_reports.dismissed_at`)
  — **464 backend tests green** plus the frontend `/admin` page (guard + admin-only nav item,
  three tabs, account-page badge, `AdminGateway`) at **723 frontend tests across 38 spec
  files** (both counted 2026-09-12), all green.
- ✅ **Trust & reports (shelter-trust-and-reports)** — community trust layer: shelter
  reports (the 5th "does not exist" auto-hides the shelter from the public list/map), review
  reports (the 5th hides the review), live occupancy bands (display-only, 2 h freshness),
  trust filters on the public list (`reviewed` / `minRating` / `hasCapacity`), the 10-active-
  shelter submission cap, a durable per-user report throttle (10 report-type actions /
  rolling hour, advisory-locked check-and-record) and `V9__shelter_trust_and_reports.sql` —
  **433 backend tests green**, plus the frontend trust wave (trust filter chips + rating
  select, the orange reported marker + legend, the badge set, detail-page report pickers,
  the "Report how full" 3-band picker, the contributions-panel hidden state, the
  `--color-reported` token) at **657 frontend tests across 35 spec files** (both counted
  2026-09-11), all green.
- ✅ **Steps 0–6 complete + verification HTTP surface + hardening pass + Twilio SMS plan** —
  backend functional end-to-end, **321 tests green** (counted 2026-09-11, pre-fix-wave) —
  2026-09-11 post-review-wave: 360 backend / 588 frontend, all green.
- ✅ **2026-09-08 code-review fix campaign** — a 4-lead/13-child review found P0 security
  issues (reset-code brute force, XFF rate-limit spoofing, fail-open dev JWT secret) plus
  backend/frontend/architecture findings; all in-scope findings were fixed over 3 waves with
  tests (see [2026-09-08 code review — fix log](docs/code-review/2026-09-08-fix-log.md)).
  Frontend: **513 tests green across 33 spec files** (counted 2026-09-10, pre-fix-wave) —
  2026-09-11 post-review-wave: 360 backend / 588 frontend, all green.
- ✅ **Live data source wired** — real shelter data is fetched from the Maa-amet WFS layer
  (`VARJEKOHT`, Päästeamet open data), transformed and stored in the local DB.
- ✅ **Verification reachable over HTTP** — `POST /verify/request` + `POST /verify/confirm`
  (email/phone), so the full loop works: register → verify → add shelter → review.
- ✅ **Anti-spam throttle on verification** — resend cooldown + per-user daily cap (file-backed,
  survives restarts) + per-IP bucket → 429.
- ✅ **Real SMS channel** — Twilio Programmable Messaging implemented (send-only; OTP logic stays
  on our side), E.164 normalization, swappable via `app.sms.provider`.
- ✅ **Hardening pass (code review)** — duplicate registration → 409, unique email/phone +
  one-active-claim constraints (V3), register rate limiting, X-Forwarded-For-aware buckets,
  atomic password reset + import, no-N+1 rating aggregates, stored `description`/`capacity`,
  CORS, SMTP delivery failures never surface as 500s. See [Hardening](#hardening-pass).
- ⚠️ **Remaining gaps** (see [Current state](#current-state--known-gaps)): email delivery is
  dev console by default (real SMTP via `app.mail.provider=smtp-pulse`), SMS delivery needs
  Twilio credentials in `.env`, Smart-ID is a stub.

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
  attempt-limited. Verified users gain `canWrite()` (submit shelters, review).
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
- **Shelter ingestion**: weekly automatic sync (Mon 03:00 Europe/Tallinn) from the
  **Maa-amet WFS** (`https://xgis.maaamet.ee/xgis2/service/1pdl2oh`, `typeName=VARJEKOHT`),
  EPSG:3301 → WGS84 transformation via proj4j, pagination + retry/backoff + politeness delay,
  **registry rows only** — user-submitted rows are never touched by the importer.
- **Shelter API**: public read endpoints with source filter, trust filters and rating
  aggregates — the public list is ACTIVE-only (auto-hidden shelters are absent) and carries
  the server-computed trust state (report counts, status flag, fresh occupancy); the detail
  read is public for all statuses and adds the caller's own occupancy band; adding a shelter
  requires an authenticated, verified user; **community reviews** — one review per user per
  shelter (re-rating = update), author-only update/delete.
- **Trust & reports (shelter-trust-and-reports)** — the community keeps the map honest, no
  moderator. Verified users report a shelter ("it does not exist" / "it is closed" / "it is
  open" / wrong location / other — one report per user per type) and the **5th "does not
  exist" report automatically hides the shelter from the public list and map** (the owner
  still sees it, marked hidden; restoring is admin-only — later reports never re-hide). Closed
  vs open reports net to a display flag ("Reported closed" / "Confirmed open") that never
  hides. Reviews can be reported (four reasons, one per user per review — the **5th hides the
  review** from everyone except its author, and it drops out of the rating, the count and the
  `reviewed` filter). Anyone verified can report how full a shelter is right now (three bands,
  one live report per user, latest wins — shown to everyone while fresh: 2 h window, latest
  fresh band wins, hedged "Reported full" at one agreeing report, firm at two+; display-only,
  it never hides or filters). All report endpoints share one durable per-user throttle — 10
  report-type actions per rolling hour, check-and-record made atomic per user with a
  transaction-scoped Postgres advisory lock (a duplicate 409 consumes no budget; at the cap
  nothing is recorded). Submissions are capped at 10 ACTIVE USER shelters (409; ADMIN kind
  exempt).
- **User contributions (M8)**: submitting users can list, edit and delete their OWN
  USER-source shelters (`GET /api/shelters/mine`, `PUT`/`DELETE /api/shelters/{id}`) and list
  their own reviews across all shelters (`GET /account/reviews/mine`). `shelters.created_by`
  (V7, nullable — registry/legacy rows have no author) links a submission to its author;
  404 if the shelter is absent, 403 if it exists but is not the caller's (registry and
  legacy rows are unmanageable by anyone); deleting a shelter cascades to its reviews.
- **Uniform error shape** (`ErrorResponse`) across the whole API; `@RestControllerAdvice`.
- **Admin moderation (admin-moderation)** — a single env-provisioned admin works the trust
  layer's report queues; the rating/submission flow stays community-moderated (no moderator
  touches ratings or reviews the community didn't flag).
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
    not exist" reports never re-hide that shelter); **hard-delete a user shelter** (reviews
    and reports cascade); **triage the shelter-report queue** (newest first, with the
    reporter's name + email — idempotent dismiss keeps the row, recorded as resolved);
    **hide/restore reviews** from the review-report queue (immediate, idempotent — a hide can
    land before the 5th-report threshold; a restore re-joins the review to the rating,
    count and `reviewed` filter). **Registry rows are read-only** — the registry import owns
    their lifecycle (it rebuilds them as `ACTIVE` on every run), so status/delete on them
    answers 409 and the UI offers no actions for them. The admin is also exempt from the
    10-active-shelter submission cap.

## Stack

- Java 21 · Maven · Spring Boot 3.3.x (web, validation, data-jpa, security, actuator)
- PostgreSQL 16 (Docker Compose) · Flyway migrations (`V1__schema.sql`, `V2__shelter_registry_fields.sql`, `V3__hardening.sql`, `V4__contact_change.sql`, `V5__shelter_created_at.sql`, `V6__password_reset_attempts.sql`, `V7__shelter_created_by.sql`, `V8__review_hardening.sql`, `V9__shelter_trust_and_reports.sql`, `V10__admin_moderation.sql`)
- jjwt 0.12.x (JWT access/refresh) · spring-security-crypto (Argon2id) · proj4j (coordinate transform)
- Testcontainers 2.0.x (Postgres) + JUnit 5 + AssertJ for tests
- No Lombok — records replace the boilerplate

## Package layout (root package `ee.sheltermap`)

| Package        | Contents                                                                                                                                                                                                                                                                     |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `domain`       | `User` hierarchy (incl. `AdminUser` — the env-provisioned admin, admin-moderation), `VerificationClaim`/`Policy`/`Rules`, `Shelter`, `ShelterReview`, enums, value records — pure Java, no Spring                                                                                                                                              |
| `app`          | `UserService`, `ShelterService`, `LocationResolveService`, `MapsUrlCoordinates`, `RedirectClient` + `HttpUrlRedirectClient`, `AppInfo`, repository **interfaces**, `NotVerifiedException`                                                                                                                                                   |
| `verification` | `VerificationProvider` + 3 impls, `SmsSender`/`SmtpSender` + impls, `VerificationService`, `PendingVerification`, `VerificationProperties`                                                                                                                                   |
| `auth`         | `UserCredentials`, `PasswordHasher`, `TokenService`, `AuthService`, `PasswordResetService`, `ContactChangeService`, `AccountService`, `AuthController`, `AccountController`, `ClientIps`, `Codes`, `Hashes`, `RateLimiter`, `JwtProperties`, `ContactChangeProperties`, `AdminSeeder` (env-provisioned admin, admin-moderation), DTOs |
| `ingestion`    | `ShelterRegistryClient` (WFS), `LEst97Transformer`, `ShelterParser`, `ShelterImportService`, `ImportResult`, `RegistryProperties`                                                                                                                                            |
| `api`          | `ShelterController`, `ReviewController`, `LocationController`, `AdminController` + `AdminModerationService` (admin-moderation), query/review services, DTOs, `ErrorResponse`, global advice                                                                                                                                                     |
| `persistence`  | JPA entities + Spring Data implementations of the repository interfaces                                                                                                                                                                                                      |
| `config`       | Composition root only: `SecurityConfig`, `JwtAuthenticationFilter`, `ProdJwtGuard`, `DevEndpointsGuard`, `RateLimitProperties`, `RegistryScheduler` (weekly sync), `RegistryRunConfig`                                                                                       |

Dependency rule: `api`/`auth`/`ingestion` → `app`/`verification` → `domain`. `domain` depends
on nothing. Cross-package access goes through interfaces only.

## Data flow

```
Maa-amet WFS (VARJEKOHT, EPSG:3301)
      │  PaasteametRegistryClient (pagination, retry/backoff, politeness)
      ▼
LEst97Transformer  ── EPSG:3301 → WGS84 (proj4j)
      ▼
ShelterImportService ── upsert by externalId, delist missing (the fetched registry
           source only — PAASETEAMET today; USER rows + other sources never touched)
      ▼
PostgreSQL (all registry fields stored: name, address, county, municipality,
           coordinates, data-as-of, source attribution)
      ▼
GET /api/shelters  ── lean projection (id, name, address, lat/lng, rating) for the UI
```

The UI only ever talks to the local API for app data — never to the external
WFS. The DB is refreshed **weekly** by `RegistryScheduler` (`@Scheduled`, cron
`0 0 3 * * MON`, Europe/Tallinn) or manually on boot (see below).

### External services

| Service       | Who talks to it                                                                               | Purpose / policy                                                                                                                                                                                                                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maa-amet WFS  | backend only (weekly import + manual trigger)                                                 | registry shelters (EPSG:3301 → WGS84)                                                                                                                                                                                                                                                                                                                                                         |
| OSM Nominatim | **frontend only** — `/submit` address search (`frontend/src/app/gateways/geocode-gateway.ts`) | Estonia-restricted geocoding (`countrycodes=ee`, limit 5, jsonv2), no API key. Client-side **≥1000 ms request spacing** (1 req/s usage policy; the browser sends the expected `Referer`/`Accept-Language`). The UI always renders the required attribution "© OpenStreetMap contributors" (openstreetmap.org/copyright) next to the search box, and a search failure never blocks submission. |

## API

| Method | Path                                       | Auth                    | Description                                                                                                                                                                                                 |
| ------ | ------------------------------------------ | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/auth/register`                           | —                       | Register (name, email, phone, password)                                                                                   |
| POST   | `/auth/login`                              | —                       | Login → access + refresh tokens                                                                                                                                                                             |
| POST   | `/auth/refresh`                            | refresh                 | Rotate refresh token → new token pair                                                                                                                                                                       |
| POST   | `/auth/logout`                             | refresh                 | Revoke session                                                                                                                                                                                              |
| POST   | `/auth/password-reset/request`             | —                       | Always 200 ("if the account exists, we emailed a 6-digit code")                                                                                                                                             |
| POST   | `/auth/password-reset/confirm`             | —                       | `{email, code, newPassword}` — set new password with the emailed code; revokes all sessions                                                                                                                 |
| GET    | `/account/me`                              | JWT                     | The caller's real profile + real verified claims + `isAdmin` (admin-moderation: always present, true only for the ADMIN-kind account — the frontend's gate for the nav item and the `/admin` route) (`MeResponse` — the frontend's single source of truth)                                                                                                     |
| PUT    | `/account/profile`                         | JWT                     | Update the name with current-password confirmation → fresh `MeResponse`; wrong password → 401 (nothing updated)                                                   |
| POST   | `/account/email-change/request`            | JWT                     | Start email change → **SMS code to current phone** (202)                                                                                                                                                    |
| POST   | `/account/email-change/confirm`            | JWT                     | Complete email change with the SMS code (200/400)                                                                                                                                                           |
| POST   | `/account/phone-change/request`            | JWT                     | Start phone change → **email code to current email** (202)                                                                                                                                                  |
| POST   | `/account/phone-change/confirm`            | JWT                     | Complete phone change with the email code (200/400)                                                                                                                                                         |
| POST   | `/verify/request`                          | JWT                     | Request email/phone verification code → 202 (429 if throttled: 60s cooldown / daily cap)                                                                                                                    |
| POST   | `/verify/confirm`                          | JWT                     | Confirm with the code → claim added (400 wrong/expired; 409 if already verified — idempotent re-confirm returns 200)                                                                                        |
| GET    | `/api/shelters?source=ALL\|USER\|REGISTRY` | public                  | List shelters with `averageRating`/`reviewCount` — **ACTIVE rows only** (auto-hidden shelters are absent); optional trust filters `reviewed=true`, `minRating=1..5` (else 400), `hasCapacity=true` compose with `source`, applied server-side; rows carry the trust state (`nonexistentReports`, `statusFlag`, `occupancy`) |
| GET    | `/api/shelters/{id}`                       | public                  | Shelter detail (`ShelterDetailDto` — the list fields + the caller's `yourOccupancyBand`); **all statuses** (an auto-hidden shelter stays reachable here and by its owner) |
| POST   | `/api/shelters`                            | JWT + verified          | Submit a shelter → 201 + Location; 409 when the caller already has 10 ACTIVE USER shelters (the cap; ADMIN kind exempt) |
| GET    | `/api/shelters/mine`                       | JWT                     | The caller's own shelters (never other users' or registry rows; **all statuses** — auto-hidden rows included, the contributions panel marks them) |
| PUT    | `/api/shelters/{id}`                       | JWT + verified + author | Update own shelter (name/description/capacity/lat/lng; bbox re-checked) → 200 `ShelterDto`; 404 absent / 403 not the author (registry/legacy rows)                                                          |
| DELETE | `/api/shelters/{id}`                       | JWT + verified + author | Delete own shelter → 204 (reviews cascade); 404 absent / 403 not the author                                                                                                                                 |
| POST   | `/api/shelters/{id}/reports`               | JWT + verified          | Report a shelter `{type, detail?}` (NON_EXISTENT / CLOSED / OPEN_CONFIRMED / WRONG_LOCATION / OTHER; detail only for OTHER, ≤ 500) → 204; 404 unknown shelter, 409 duplicate (shelter, user, type — checked before the throttle budget), 429 report throttle. The 5th NON_EXISTENT auto-hides an ACTIVE shelter (never re-hides after a manual status change) |
| PUT    | `/api/shelters/{id}/occupancy`             | JWT + verified          | Report how full `{band}` (SPACE / GETTING_FULL / FULL) → 204 upsert — one live band per user per shelter, latest wins (no 409: a re-PUT is the update); 404 unknown shelter, 429 throttle. Display-only: 2 h freshness at read time, latest fresh band wins, hedged at one agreeing report, firm at two+ — never hides or filters |
| POST   | `/api/geo/resolve`                         | JWT                     | Resolve a `maps.app.goo.gl` short link → `{latitude, longitude}` (per-IP 5/min → 429; 400 one generic message when no pair / outside Estonia / other host; 502 one generic retry-later on upstream failure) |
| GET    | `/account/reviews/mine`                    | JWT                     | The caller's reviews across all shelters (`shelterId`, `shelterName`, rating, comment, timestamps)                                                                                                          |
| GET    | `/api/shelters/{id}/reviews`               | public                  | Reviews for a shelter                                                                                                                                                                                       |
| POST   | `/api/shelters/{id}/reviews`               | JWT + verified          | Review (upsert: re-rating updates)                                                                                                                                                                          |
| PUT    | `/api/shelters/{id}/reviews/mine`          | JWT + verified + author | Update own review                                                                                                                                                                                           |
| DELETE | `/api/shelters/{id}/reviews/mine`          | JWT + verified + author | Delete own review                                                                                                                                                                                           |
| POST   | `/api/shelters/{id}/reviews/{reviewId}/reports` | JWT + verified | Report a review `{reason, detail?}` (FALSY_DATA / NOT_RELEVANT / SPAM / OTHER) → 204; 403 own review or not verified, 404 unknown shelter/review, 409 duplicate (review, user), 429 throttle. The 5th report hides the review (set once, cleared only by admin moderation; the author still sees it, marked hidden) |
| GET    | `/admin/shelters?status=&source=&q=`       | JWT + ADMIN kind        | **Every shelter incl. hidden** (id-ordered) with `nonexistentReports`, `statusFlag`, fresh `occupancy`, `reviewCount`/`rating` and the submitter's name; `status`/`source` exact-match filters, `q` = case-insensitive name/address substring → 200 `AdminShelterDto[]` (401 anonymous, 403 non-admin — fresh kind lookup per request) |
| POST   | `/admin/shelters/{id}/status`              | JWT + ADMIN kind        | `{"status": "ACTIVE" \| "INACTIVE"}` — manual hide/restore of a USER shelter → 204; a **restore disarms auto-hide permanently** (later NON_EXISTENT reports never re-hide); 400 missing/unknown status, 404 unknown shelter, **409 registry row** (import-owned) |
| DELETE | `/admin/shelters/{id}`                     | JWT + ADMIN kind        | Hard delete of a USER shelter (reviews, shelter reports, review reports, occupancy cascade) → 204; 404 unknown shelter, 409 registry row (import-owned) |
| GET    | `/admin/reports?shelterId=`                | JWT + ADMIN kind        | The shelter-report queue, **newest first**, with the shelter's live status + the reporter's profile name + email (admin-only data); optional `shelterId` filter (unknown shelter → 404) → 200 `AdminShelterReportDto[]` |
| POST   | `/admin/reports/{id}/dismiss`              | JWT + ADMIN kind        | Mark a shelter report resolved → 204 — **idempotent** (a re-dismiss is a no-op); the row is KEPT, stamped `dismissed_at` once (V10); 404 unknown report |
| GET    | `/admin/review-reports`                    | JWT + ADMIN kind        | The review-report queue, newest first, **hidden reviews included** with their hidden marker + the review excerpt (rating + comment) → 200 `AdminReviewReportDto[]` |
| POST   | `/admin/reviews/{id}/hide`                 | JWT + ADMIN kind        | Immediate hide of the reviewed review (`{id}` = the REVIEW's id) → 204 — **idempotent**; can fire before the 5th-report threshold; hiding never deletes the row; 404 unknown review |
| POST   | `/admin/reviews/{id}/restore`              | JWT + ADMIN kind        | Clear the review's hidden state (`{id}` = the REVIEW's id) → 204 — **idempotent**; the review re-joins the rating, count and `reviewed` filter; 404 unknown review |
| POST   | `/dev/email-test`                          | JWT + opt-in            | **SMTP diagnostic** — sends a real email and reports `sent`/error truthfully (disabled by default, see below)                                                                                               |
| POST   | `/dev/sms-test`                            | JWT + opt-in            | **SMS diagnostic** — sends a real SMS via the active sender and reports provider + E.164 recipient (disabled by default, see below)                                                                         |
| GET    | `/actuator/health`                         | public                  | Health check                                                                                                                                                                                                |

Every error path returns the uniform `ErrorResponse` shape.

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

Requirements: JDK 21, Maven 3.9+, Docker (Compose).

```bash
# 1. Start PostgreSQL 16 (dev credentials: sheltermap / sheltermap — dev only)
docker compose up -d

# 2. Build
mvn -q compile

# 3. Run tests (Testcontainers spins its own postgres:16; expect 464 green)
mvn test

# 4. Run the app (Flyway enabled, JPA ddl-auto=validate)
#    dev-start.sh pins SPRING_PROFILES_ACTIVE=dev (see note below) — a bare
#    `mvn spring-boot:run` now refuses to boot (fail-closed guards).
./dev-start.sh

# 5. Health check — expect {"status":"UP"}
curl http://localhost:8080/actuator/health
```

> **Use `./dev-start.sh` to run the app locally.** Since the 2026-09-08 review the app is
> **fail-closed at boot** via two guards: `ProdJwtGuard` (refuses the published dev-default /
> < 32-byte `JWT_SECRET`) and `DevEndpointsGuard` (refuses the `/dev/email-test` +
> `/dev/sms-test` diagnostic endpoints — which the local `.env` turns on). Both refuse to boot
> **unless the active profile is exactly `dev` or `test`** (dev parity). A plain
> `mvn spring-boot:run` with no profile set therefore exits at startup with
> `PRODUCTION REFUSED TO START`. `./dev-start.sh` pins `SPRING_PROFILES_ACTIVE=dev` for you;
> the equivalent one-liner is `SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run`. (A strong
> non-default `JWT_SECRET` clears the JWT guard but NOT the dev-endpoint guard while
> `DEV_EMAIL_TEST_ENABLED` / `DEV_SMS_TEST_ENABLED` are on — the dev profile is the intended
> local path.) The test suite runs under profile `test` (its own classpath `application.yml`)
> and is unaffected by the script.

### One-off import of the real registry data

```bash
# Fetches all ~300 shelters from the live WFS, transforms to WGS84, stores them
./dev-start.sh --run-registry
# (equivalent: SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.run-on-startup=true")
```

Then the data is served by `GET /api/shelters`:

```bash
curl http://localhost:8080/api/shelters | python3 -m json.tool | head -50
```

### Dev fixture instead of the live WFS

```bash
SPRING_PROFILES_ACTIVE=dev mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.client=dev --app.registry.run-on-startup=true"
```

## Configuration (environment variables)

**Local `.env` file** (project root): Spring loads it automatically at startup via
`spring-dotenv` (`me.paulschwarz:spring-dotenv`). Put real credentials there instead of
exporting them each launch — `.env` is gitignored and never committed. A `*.env.example`
naming convention is reserved; shell-exported env vars take precedence over `.env` values.

> **Secret-scan note (2026-09-09 de-slop pass):** a secret-pattern scan of the FULL git
> history found zero committed credentials. The `a5e83db` commit message ("tested with
> live twilio credentials") is historical wording only — its diff contains no secrets.
> Live credentials live exclusively in the gitignored `.env`.

| Variable                                                         | Default                                                                     | Purpose                                                                          |
| ---------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD`                         | `jdbc:postgresql://localhost:5432/sheltermap` / `sheltermap` / `sheltermap` | Datasource (dev-only defaults)                                                   |
| `SERVER_PORT`                                                    | `8080`                                                                      | HTTP port                                                                        |
| `JWT_SECRET`                                                     | dev-only placeholder                                                        | **Must be overridden in any real environment** (≥ 32 bytes)                      |
| `MAIL_PROVIDER`                                                  | `dev`                                                                       | `dev` (console) or `smtp-pulse` (real SMTP)                                      |
| `SMTP_HOST` / `SMTP_PORT`                                        | `smtp-pulse.com` / `587`                                                    | SMTP relay (alt: 465 SSL, 2525)                                                  |
| `SMTP_USERNAME` / `SMTP_PASSWORD`                                | —                                                                           | SMTP login (real credentials → `.env`, never git)                                |
| `SMTP_FROM`                                                      | falls back to `SMTP_USERNAME`                                               | From-address — **must be verified in the smtp-pulse dashboard**                  |
| `SMS_PROVIDER`                                                   | `dev`                                                                       | `dev` (console) or `twilio` (real SMS)                                           |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN`                       | —                                                                           | Twilio credentials (real → `.env`, never git)                                    |
| `TWILIO_MESSAGING_SERVICE_SID`                                   | —                                                                           | Twilio Messaging Service (preferred over `TWILIO_FROM`)                          |
| `TWILIO_FROM`                                                    | —                                                                           | Fallback sender number (only if no Messaging Service)                            |
| `VERIFICATION_COOLDOWN_SECONDS`                                  | `60`                                                                        | Min seconds between two codes for the same (user, level); `0` disables           |
| `VERIFICATION_MAX_PER_DAY`                                       | `5`                                                                         | Max codes per (user, level) per UTC day; `0` disables                            |
| `VERIFICATION_SEND_LOG_PATH`                                     | `data/verification-send.log`                                                | File-backed send log (survives restarts; never commit `data/`)                   |
| `CONTACT_CHANGE_COOLDOWN_SECONDS`                                | `60`                                                                        | Min seconds between two change requests for the same (user, type)                |
| `CONTACT_CHANGE_CODE_TTL_SECONDS`                                | `900`                                                                       | Contact-change code validity window (15 min)                                     |
| `CONTACT_CHANGE_MAX_ATTEMPTS`                                    | `5`                                                                         | Max wrong contact-change codes before the request is rejected                    |
| `DEV_EMAIL_TEST_ENABLED`                                         | `false`                                                                     | Enables `POST /dev/email-test` (SMTP diagnostic, JWT required)                   |
| `REGISTRY_BASE_URL`                                              | Maa-amet WFS URL                                                            | Registry endpoint                                                                |
| `REGISTRY_CLIENT`                                                | `paasteamet`                                                                | `paasteamet` (real HTTP) or `dev` (local fixture)                                |
| `CORS_ALLOWED_ORIGINS`                                           | `http://localhost:5173,http://localhost:3000`                               | Browser origins allowed to call the API                                          |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                                 | — (empty = no admin exists)                                                 | The env-provisioned admin (admin-moderation): both set + no user with that email → an ADMIN-kind account is created at startup (create-if-absent — never re-hashed; login through the normal `/auth/login`); either unset → no admin, `/admin/*` answers 403 for everyone. **No defaults are committed** — the dev values live in the gitignored `.env` |
| `PII_AES_KEY` / `PII_HMAC_KEY`                                    | — (empty = **the app refuses to boot**)                                     | PII at rest (M2): 32-byte base64 AES-GCM data key + HMAC blind-index key. Generate: `openssl rand -base64 32` (once per key). Dev values live in the gitignored `.env`; **never committed, never logged** — see “PII at rest” below |
| `RATELIMIT_TRUSTED_PROXIES`                                      | —                                                                           | IPs of trusted reverse proxies (for `X-Forwarded-For` rate-limit keys)           |
| `DEV_EMAIL_TEST_ALLOWED_RECIPIENTS` / `DEV_EMAIL_TEST_ALLOW_ANY` | — / `false`                                                                 | E-mail-test recipient allowlist (spam-relay guard)                               |
| `DEV_SMS_TEST_ENABLED`                                           | `false`                                                                     | Enables `POST /dev/sms-test` (SMS diagnostic, JWT required)                      |
| `DEV_SMS_TEST_ALLOWED_RECIPIENTS` / `DEV_SMS_TEST_ALLOW_ANY`     | — / `false`                                                                 | SMS-test recipient allowlist (spam-relay guard; numbers matched in E.164)        |
| — scheduler —                                                    | see `application.yml`                                                       | `app.registry.*`: page-size, retries, politeness, cron, zone, `schedule-enabled` |

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
- **No N+1 on the shelter listing** — rating aggregates are computed in ONE batched query
  (`findRatingAggregates`) instead of one query per shelter.
- **X-Forwarded-For-aware rate limiting** — behind a reverse proxy, every user used to share one
  IP bucket (global lockout risk); `X-Forwarded-For` is honored only from configured trusted
  proxies (`RATELIMIT_TRUSTED_PROXIES`), so clients can't spoof their key.
- **Health endpoint hardening** — `/actuator/health` details are now shown only to authorized
  callers (`show-details: when-authorized`); SMTP reachability no longer flips the app DOWN.

**Low**

- Review add is upsert-safe under concurrency (unique-constraint race → update, not 500).
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

A 4-lead / 13-child review (reports: `docs/code-review/2026-09-08-review-output.md`) was fixed
over three waves — full per-issue record with test evidence in
[docs/code-review/2026-09-08-fix-log.md](docs/code-review/2026-09-08-fix-log.md). Highlights:

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
backup alone no longer exposes account identities. Design: `openspec/changes/pii-at-rest/design.md`.

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
cap) keeps its format — residual item for the M15 security pass. JWTs carry no
e-mail/phone claims (verified).

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
5. **Registry sync.** `REGISTRY_CLIENT=paasteamet` (default) fetches the live Maa-amet WFS;
   `REGISTRY_CLIENT=dev` uses the local fixture (dev only). Weekly cron `0 0 3 * * MON`
   Europe/Tallinn (`app.registry.cron`/`zone`), disable with `app.registry.schedule-enabled=false`.
6. **Single instance — in-memory rate limits.** The token-bucket limiter and the reset
   re-issue counter are **in-memory, per process**. This app must run as ONE instance; behind
   multiple replicas each has its own buckets (limits weaken by the replica count) and the
   reset daily cap is per-instance. Run one, or move to a shared store first.
7. **Content-Security-Policy at the proxy (review N1 — the app does not send one).** Add the
   CSP `Content-Security-Policy` header in the reverse proxy in front of the SPA
   (the backend sets no CSP; the frontend's prod build is same-origin by default, so a
   `default-src 'self'`-style policy at the proxy is the intended enforcement point).
8. **Trusted proxies for rate-limit keys.** If the app sits behind a reverse proxy/LB, set
   `RATELIMIT_TRUSTED_PROXIES` to the proxy IP(s) — otherwise every user behind it shares one
   bucket, and without it the `X-Forwarded-For` header is ignored entirely (safe default).
   Set `RATELIMIT_TRUST_LOOPBACK=false` behind a real load balancer.
9. **PII keys (fail-closed).** `PII_AES_KEY` + `PII_HMAC_KEY` (32-byte base64, env/secret
   store — never in the repo) MUST be set, or the app refuses to boot. Back up both keys
   OFFLINE: a lost key makes the affected accounts unloginable by contact (see “PII at rest”).

## Current state & known gaps

**Done and working (production-grade):**

- Auth (register/login/refresh/logout/password-reset) with Argon2id + JWT + rate limiting
- **Verification over HTTP** (`POST /verify/request` + `/verify/confirm`, email/phone) — the
  write path is now reachable: verified users can submit shelters and review
- **Cross-channel contact change** (`POST /account/*-change/request` + `/confirm`) — email
  change verified by SMS, phone change by email
- Shelter ingestion from the live Maa-amet WFS + weekly scheduler + manual trigger
- Public read API with rating aggregates, verified-write API for shelters and reviews, and
  the community trust layer (shelter/review reports with auto-hide, live occupancy, trust
  filters)
- Persistence (Flyway V1–V10, JPA, `ddl-auto=validate`), uniform error handling
- Fail-closed JWT secret guard + fail-fast dev-endpoint guard (refuse to boot misconfigured)

**Known gaps / next steps:**

1. **E-mail delivery is dev console by default** (`DevSmtpSender` logs messages). Real SMTP is
   implemented (`SmtpPulseSmtpSender`) — enable with `MAIL_PROVIDER=smtp-pulse`,
   `SMTP_USERNAME=…`, `SMTP_PASSWORD=…` (smtp-pulse.com:587). **SMS delivery** needs real
   Twilio credentials: set `SMS_PROVIDER=twilio` plus `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`
   and `TWILIO_MESSAGING_SERVICE_SID` (or `TWILIO_FROM`) in `.env` — the sender is implemented
   and tested, only the live account is unverified. Smart-ID remains a stub (rejected with 400
   up front).
2. **nearest/bbox search + paging** — documented as deferred, not built.
3. **Deployment hardening** — HTTPS, real secret management, monitoring (dev-grade config today).
4. **Frontend v1 deferrals** — shipped in `frontend/` (M0–M6 complete + M7/M8 additions);
   the honest deferral list (per-shelter `reviews/mine` endpoint, paging/nearest-bbox search,
   i18n, MapLibre, httpOnly cookies, SSR, e2e framework) is in
   [frontend/README.md](frontend/README.md#deferrals-v1-honest-list).
5. **2026-09-08 review deferrals** — the low-severity tail (reset-token global prune
   scheduler, TokenBucket sweep race, send-log UTC-midnight assumption, 403-vs-401
   deleted-user inconsistency, unreachable `NotAuthor` guards, first-validation-field-only
   messages, test nits; frontend prod `apiUrl ''`, banner warning variant, `--bp-narrow`
   token, copy-pasted fakes, map-page.scss size budget; dev-endpoint CRLF/`@Size`;
   national-ID-at-rest — resolved by M1, the column is dropped) is recorded per-issue in the
   fix log's deferred list.
6. **`national_id_code` is no longer stored (M1, V12)** — the former plaintext privacy
   consideration is closed: registration no longer collects the field, the column is dropped,
   and the SMART_ID verification level stays a stub that, when it lands, proves identity via
   an external PKI flow without storing any code.
7. **Live Twilio send is not yet proven end-to-end** — the sender, E.164
   normalization and fail-fast are tested with fakes/fixtures; a real SMS from a
   production Twilio account is the one thing only a live run confirms (use
   `POST /dev/sms-test` once `DEV_SMS_TEST_ENABLED=true`).

## License

MIT — see [LICENSE](LICENSE).
