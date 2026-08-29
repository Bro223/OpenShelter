# Shelter Map (OpenShelter)

Backend for an Estonia public-shelter map: verified user registration, password auth with
JWT sessions, shelter data ingested automatically from the official registry, user-submitted
shelters with community ratings (the rating system **is** the moderation — no moderator).

**Backend only** — the frontend (Vue/Angular) is out of scope for this repo.

> Built step by step from the task pack in [`context and tasks/agent/`](context%20and%20tasks/agent/):
> `01-TASK.md` is the contract, `07-STEPS.md` the build plan, the puml files in
> [`context and tasks/`](context%20and%20tasks/) the source-of-truth UML.

## Status

- ✅ **Steps 0–6 complete** — backend functional end-to-end, **176 tests green**.
- ✅ **Live data source wired** — real shelter data is fetched from the Maa-amet WFS layer
  (`VARJEKOHT`, Päästeamet open data), transformed and stored in the local DB.
- ⚠️ **Known gaps** (see [Current state](#current-state--known-gaps)): verification has no
  HTTP endpoints yet, email delivery is console-only (dev), Smart-ID and Twilio are stubs.

## Features

- **Auth**: register, login (Argon2id hashing), JWT access (15 min) + refresh (30 days, hashed
  at rest, rotated on refresh), logout revokes sessions, password reset (always "succeeds",
  single-use token, revokes all sessions), rate limiting on login + reset.
- **Verification services** (tested, not yet exposed over HTTP): email OTP / phone OTP /
  Smart-ID stub; codes hashed, expiring, attempt-limited. Verified users gain
  `canWrite()` (submit shelters, review).
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
- PostgreSQL 16 (Docker Compose) · Flyway migrations (`V1__schema.sql`, `V2__shelter_registry_fields.sql`)
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
| POST | `/auth/password-reset/request` | — | Always 200 ("if the account exists, we sent an email") |
| POST | `/auth/password-reset/confirm` | token | Set new password; revokes all sessions |
| GET | `/api/shelters?source=ALL\|USER\|REGISTRY` | public | List shelters with `averageRating`/`reviewCount` |
| GET | `/api/shelters/{id}` | public | Shelter detail |
| POST | `/api/shelters` | JWT + verified | Submit a shelter → 201 + Location |
| GET | `/api/shelters/{id}/reviews` | public | Reviews for a shelter |
| POST | `/api/shelters/{id}/reviews` | JWT + verified | Review (upsert: re-rating updates) |
| PUT | `/api/shelters/{id}/reviews/mine` | JWT + verified + author | Update own review |
| DELETE | `/api/shelters/{id}/reviews/mine` | JWT + verified + author | Delete own review |
| GET | `/actuator/health` | public | Health check |

Every error path returns the uniform `ErrorResponse` shape.

## Running locally

Requirements: JDK 21, Maven 3.9+, Docker (Compose).

```bash
# 1. Start PostgreSQL 16 (dev credentials: sheltermap / sheltermap — dev only)
docker compose up -d

# 2. Build
mvn -q compile

# 3. Run tests (Testcontainers spins its own postgres:16; expect 176 green)
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

| Variable | Default | Purpose |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `jdbc:postgresql://localhost:5432/sheltermap` / `sheltermap` / `sheltermap` | Datasource (dev-only defaults) |
| `SERVER_PORT` | `8080` | HTTP port |
| `JWT_SECRET` | dev-only placeholder | **Must be overridden in any real environment** (≥ 32 bytes) |
| `REGISTRY_BASE_URL` | Maa-amet WFS URL | Registry endpoint |
| `REGISTRY_CLIENT` | `paasteamet` | `paasteamet` (real HTTP) or `dev` (local fixture) |
| — scheduler — | see `application.yml` | `app.registry.*`: page-size, retries, politeness, cron, zone, `schedule-enabled` |

## Current state & known gaps

**Done and working (production-grade):**
- Auth (register/login/refresh/logout/password-reset) with Argon2id + JWT + rate limiting
- Shelter ingestion from the live Maa-amet WFS + weekly scheduler + manual trigger
- Public read API with rating aggregates, verified-write API for shelters and reviews
- Persistence (Flyway V1+V2, JPA, `ddl-auto=validate`), uniform error handling

**Known gaps / next steps:**
1. **Verification has no HTTP endpoints yet.** `VerificationService` + providers exist and are
   fully tested, but there is no `POST /verify/request` / `POST /verify/confirm` controller and
   they are not yet Spring beans — so no user can become *verified* through the API, which means
   `POST /api/shelters` and reviews return 403 in practice. **This is the critical missing piece.**
2. **Email delivery is console-only** (`DevSmtpSender` logs messages; no real SMTP yet). A real
   sender (e.g. smtp-pulse via `spring-boot-starter-mail`, selected with `app.mail.provider`)
   is planned. Same for SMS (`TwilioSmsSender` is a stub) and Smart-ID (stub).
3. **nearest/bbox search + paging** — documented as deferred, not built.
4. **Deployment hardening** — HTTPS, real secret management, monitoring (dev-grade config today).
5. **Frontend** — separate project, out of scope here.

## License

MIT — see [LICENSE](LICENSE).
