# Shelter Map (OpenShelter)

Backend for an Estonia public-shelter map: verified user registration, password auth with
JWT sessions, shelter data ingested automatically from the official registry, user-submitted
shelters with community ratings (the rating system **is** the moderation — no moderator).

**Frontend in [`frontend/`](frontend/)** — Angular 22 SPA (map browse, auth, verification,
shelter submission, community reviews); run/build docs in
[frontend/README.md](frontend/README.md).

> Built step by step from the task pack in [`context and tasks/agent/`](context%20and%20tasks/agent/):
> `01-TASK.md` is the contract, `07-STEPS.md` the build plan, the puml files in
> [`context and tasks/`](context%20and%20tasks/) the source-of-truth UML.

## Status

- ✅ **Steps 0–6 complete + verification HTTP surface + hardening pass + Twilio SMS plan** —
  backend functional end-to-end, **216 tests green**.
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
  — always "succeeds", single-use code, 5-attempt limit, revokes all sessions), rate limiting
  on login + reset + register (per client IP, X-Forwarded-For aware).
- **Verification over HTTP**: `POST /verify/request` / `POST /verify/confirm` (JWT required)
  for email OTP and phone OTP; Smart-ID stub rejected up front; codes hashed, expiring,
  attempt-limited. Verified users gain `canWrite()` (submit shelters, review).
- **Cross-channel contact change**: `POST /account/email-change/request` + `/confirm` and
  `POST /account/phone-change/request` + `/confirm` (JWT required). Changing the email is
  verified by an SMS code to the current phone; changing the phone by an email code to the
  current email — stealing only one channel is not enough to hijack an account. One pending
  change per (user, type), 60 s resend cooldown, 15-min code TTL, 5-attempt limit, duplicate
  target → 409, per-IP rate limit on the request endpoints.
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
- **Shelter API**: public read endpoints with source filter and rating aggregates; adding a
  shelter requires an authenticated, verified user; **community reviews** — one review per
  user per shelter (re-rating = update), author-only update/delete.
- **Uniform error shape** (`ErrorResponse`) across the whole API; `@RestControllerAdvice`.

## Stack

- Java 21 · Maven · Spring Boot 3.3.x (web, validation, data-jpa, security, actuator)
- PostgreSQL 16 (Docker Compose) · Flyway migrations (`V1__schema.sql`, `V2__shelter_registry_fields.sql`, `V3__hardening.sql`, `V4__contact_change.sql`, `V5__shelter_created_at.sql`)
- jjwt 0.12.x (JWT access/refresh) · spring-security-crypto (Argon2id) · proj4j (coordinate transform)
- Testcontainers 2.0.x (Postgres) + JUnit 5 + AssertJ for tests
- No Lombok — records replace the boilerplate

## Package layout (root package `ee.sheltermap`)

| Package | Contents |
|---|---|
| `domain` | `User` hierarchy, `VerificationClaim`/`Policy`/`Rules`, `Shelter`, `ShelterReview`, enums, value records — pure Java, no Spring |
| `app` | `UserService`, `ShelterService`, repository **interfaces** |
| `verification` | `VerificationProvider` + 3 impls, `SmsSender`/`SmtpSender` + impls, `VerificationService`, `PendingVerification` |
| `auth` | `UserCredentials`, `PasswordHasher`, `TokenService`, `AuthService`, `PasswordResetService`, `AuthController`, `RateLimiter`, DTOs |
| `ingestion` | `ShelterRegistryClient` (WFS), `LEst97Transformer`, `ShelterParser`, `ShelterImportService`, `ImportResult` |
| `api` | `ShelterController`, `ReviewController`, query/review services, DTOs, `ErrorResponse`, global advice |
| `persistence` | JPA entities + Spring Data implementations of the repository interfaces |
| `config` | `SecurityConfig`, `JwtAuthenticationFilter`, properties, `RegistryScheduler` (weekly sync) |

Dependency rule: `api`/`auth`/`ingestion` → `app`/`verification` → `domain`. `domain` depends
on nothing. Cross-package access goes through interfaces only.

## Data flow

```
Maa-amet WFS (VARJEKOHT, EPSG:3301)
      │  PaasteametRegistryClient (pagination, retry/backoff, politeness)
      ▼
LEst97Transformer  ── EPSG:3301 → WGS84 (proj4j)
      ▼
ShelterImportService ── upsert by externalId, delist missing (REGISTRY rows only)
      ▼
PostgreSQL (all registry fields stored: name, address, county, municipality,
           coordinates, data-as-of, source attribution)
      ▼
GET /api/shelters  ── lean projection (id, name, address, lat/lng, rating) for the UI
```

The UI only ever talks to the local API — never to the external WFS. The DB is refreshed
**weekly** by `RegistryScheduler` (`@Scheduled`, cron `0 0 3 * * MON`, Europe/Tallinn) or
manually on boot (see below).

## API

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register (name, email, phone, national ID, password) |
| POST | `/auth/login` | — | Login → access + refresh tokens |
| POST | `/auth/refresh` | refresh | Rotate refresh token → new token pair |
| POST | `/auth/logout` | refresh | Revoke session |
| POST | `/auth/password-reset/request` | — | Always 200 ("if the account exists, we emailed a 6-digit code") |
| POST | `/auth/password-reset/confirm` | — | `{email, code, newPassword}` — set new password with the emailed code; revokes all sessions |
| POST | `/account/email-change/request` | JWT | Start email change → **SMS code to current phone** (202) |
| POST | `/account/email-change/confirm` | JWT | Complete email change with the SMS code (200/400) |
| POST | `/account/phone-change/request` | JWT | Start phone change → **email code to current email** (202) |
| POST | `/account/phone-change/confirm` | JWT | Complete phone change with the email code (200/400) |
| POST | `/verify/request` | JWT | Request email/phone verification code → 202 (429 if throttled: 60s cooldown / daily cap) |
| POST | `/verify/confirm` | JWT | Confirm with the code → claim added (400 wrong/expired; 409 if already verified — idempotent re-confirm returns 200) |
| GET | `/api/shelters?source=ALL\|USER\|REGISTRY` | public | List shelters with `averageRating`/`reviewCount` |
| GET | `/api/shelters/{id}` | public | Shelter detail |
| POST | `/api/shelters` | JWT + verified | Submit a shelter → 201 + Location |
| GET | `/api/shelters/{id}/reviews` | public | Reviews for a shelter |
| POST | `/api/shelters/{id}/reviews` | JWT + verified | Review (upsert: re-rating updates) |
| PUT | `/api/shelters/{id}/reviews/mine` | JWT + verified + author | Update own review |
| DELETE | `/api/shelters/{id}/reviews/mine` | JWT + verified + author | Delete own review |
| POST | `/dev/email-test` | JWT + opt-in | **SMTP diagnostic** — sends a real email and reports `sent`/error truthfully (disabled by default, see below) |
| POST | `/dev/sms-test` | JWT + opt-in | **SMS diagnostic** — sends a real SMS via the active sender and reports provider + E.164 recipient (disabled by default, see below) |
| GET | `/actuator/health` | public | Health check |

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

# 3. Run tests (Testcontainers spins its own postgres:16; expect 216 green)
mvn test

# 4. Run the app (Flyway enabled, JPA ddl-auto=validate)
mvn spring-boot:run

# 5. Health check — expect {"status":"UP"}
curl http://localhost:8080/actuator/health
```

### One-off import of the real registry data

```bash
# Fetches all ~300 shelters from the live WFS, transforms to WGS84, stores them
mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.run-on-startup=true"
```

Then the data is served by `GET /api/shelters`:

```bash
curl http://localhost:8080/api/shelters | python3 -m json.tool | head -50
```

### Dev fixture instead of the live WFS

```bash
mvn spring-boot:run -Dspring-boot.run.arguments="--app.registry.client=dev --app.registry.run-on-startup=true"
```

## Configuration (environment variables)

**Local `.env` file** (project root): Spring loads it automatically at startup via
`spring-dotenv` (`me.paulschwarz:spring-dotenv`). Put real credentials there instead of
exporting them each launch — `.env` is gitignored and never committed. A `*.env.example`
naming convention is reserved; shell-exported env vars take precedence over `.env` values.

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `jdbc:postgresql://localhost:5432/sheltermap` / `sheltermap` / `sheltermap` | Datasource (dev-only defaults) |
| `SERVER_PORT` | `8080` | HTTP port |
| `JWT_SECRET` | dev-only placeholder | **Must be overridden in any real environment** (≥ 32 bytes) |
| `MAIL_PROVIDER` | `dev` | `dev` (console) or `smtp-pulse` (real SMTP) |
| `SMTP_HOST` / `SMTP_PORT` | `smtp-pulse.com` / `587` | SMTP relay (alt: 465 SSL, 2525) |
| `SMTP_USERNAME` / `SMTP_PASSWORD` | — | SMTP login (real credentials → `.env`, never git) |
| `SMTP_FROM` | falls back to `SMTP_USERNAME` | From-address — **must be verified in the smtp-pulse dashboard** |
| `SMS_PROVIDER` | `dev` | `dev` (console) or `twilio` (real SMS) |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | — | Twilio credentials (real → `.env`, never git) |
| `TWILIO_MESSAGING_SERVICE_SID` | — | Twilio Messaging Service (preferred over `TWILIO_FROM`) |
| `TWILIO_FROM` | — | Fallback sender number (only if no Messaging Service) |
| `VERIFICATION_COOLDOWN_SECONDS` | `60` | Min seconds between two codes for the same (user, level); `0` disables |
| `VERIFICATION_MAX_PER_DAY` | `5` | Max codes per (user, level) per UTC day; `0` disables |
| `VERIFICATION_SEND_LOG_PATH` | `data/verification-send.log` | File-backed send log (survives restarts; never commit `data/`) |
| `CONTACT_CHANGE_COOLDOWN_SECONDS` | `60` | Min seconds between two change requests for the same (user, type) |
| `CONTACT_CHANGE_CODE_TTL_SECONDS` | `900` | Contact-change code validity window (15 min) |
| `CONTACT_CHANGE_MAX_ATTEMPTS` | `5` | Max wrong contact-change codes before the request is rejected |
| `DEV_EMAIL_TEST_ENABLED` | `false` | Enables `POST /dev/email-test` (SMTP diagnostic, JWT required) |
| `REGISTRY_BASE_URL` | Maa-amet WFS URL | Registry endpoint |
| `REGISTRY_CLIENT` | `paasteamet` | `paasteamet` (real HTTP) or `dev` (local fixture) |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Browser origins allowed to call the API |
| `RATELIMIT_TRUSTED_PROXIES` | — | IPs of trusted reverse proxies (for `X-Forwarded-For` rate-limit keys) |
| `DEV_EMAIL_TEST_ALLOWED_RECIPIENTS` / `DEV_EMAIL_TEST_ALLOW_ANY` | — / `false` | E-mail-test recipient allowlist (spam-relay guard) |
| `DEV_SMS_TEST_ENABLED` | `false` | Enables `POST /dev/sms-test` (SMS diagnostic, JWT required) |
| `DEV_SMS_TEST_ALLOWED_RECIPIENTS` / `DEV_SMS_TEST_ALLOW_ANY` | — / `false` | SMS-test recipient allowlist (spam-relay guard; numbers matched in E.164) |
| — scheduler — | see `application.yml` | `app.registry.*`: page-size, retries, politeness, cron, zone, `schedule-enabled` |

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
- `RatingSummaryDto.average` is `null` for no reviews — consistent with `ShelterDto.averageRating`.
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

## Current state & known gaps

**Done and working (production-grade):**

- Auth (register/login/refresh/logout/password-reset) with Argon2id + JWT + rate limiting
- **Verification over HTTP** (`POST /verify/request` + `/verify/confirm`, email/phone) — the
  write path is now reachable: verified users can submit shelters and review
- **Cross-channel contact change** (`POST /account/*-change/request` + `/confirm`) — email
  change verified by SMS, phone change by email
- Shelter ingestion from the live Maa-amet WFS + weekly scheduler + manual trigger
- Public read API with rating aggregates, verified-write API for shelters and reviews
- Persistence (Flyway V1–V5, JPA, `ddl-auto=validate`), uniform error handling

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
4. **Frontend v1 deferrals** — shipped in `frontend/` (M0–M6 complete); the honest
   deferral list (paging, i18n, MapLibre, httpOnly cookies, SSR,
   contributions — see the account-profile change) is in
   [frontend/README.md](frontend/README.md#deferrals-v1-honest-list).
5. **`national_id_code` is stored plaintext** — privacy consideration for launch:
   the Estonian personal ID is treated as an account key, not encrypted at rest
   (documented decision; encrypting it is a schema + service change, deferred).
6. **Live Twilio send is not yet proven end-to-end** — the sender, E.164
   normalization and fail-fast are tested with fakes/fixtures; a real SMS from a
   production Twilio account is the one thing only a live run confirms (use
   `POST /dev/sms-test` once `DEV_SMS_TEST_ENABLED=true`).

## License

MIT — see [LICENSE](LICENSE).
