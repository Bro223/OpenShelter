# Shelter Map

Backend for an Estonia bomb-shelter map: verified user registration (email / phone OTP /
Smart-ID stub), password auth with JWT sessions, shelter data ingested from public registries,
user-submitted shelters with community ratings. **Backend only** — the frontend is out of scope.

> Built step by step from the task pack in [`context and tasks/agent/`](context%20and%20tasks/agent/):
> `01-TASK.md` is the contract, `07-STEPS.md` the build plan. **One step per run, stop for review.**

## Stack

- Java 21 · Maven · Spring Boot 3.3.x (web, validation, data-jpa, security, actuator)
- PostgreSQL 16 (Docker Compose) · Flyway migrations
- jjwt 0.12.x (JWT access/refresh) · spring-security-crypto (Argon2id)
- Testcontainers (Postgres) + JUnit 5 + AssertJ for tests
- No Lombok — records replace the boilerplate

## Package layout (root package `ee.sheltermap`)

| Package | Contents | Diagram |
|---|---|---|
| `domain` | `User` hierarchy, claims, policy, shelter, reviews | `01` |
| `app` | `UserService`, `ShelterService`, repository interfaces | `01` |
| `verification` | providers, senders, `VerificationService` | `01` |
| `auth` | credentials, hasher, JWT tokens, reset, rate limiter | `03` |
| `ingestion` | registry clients, parser, import service | `04` |
| `api` | controllers, query/review services, DTOs | `05` |
| `persistence` | Spring Data JPA repository implementations | — |
| `config` | Spring configuration, security filter chain | — |

Dependency rule: `api`/`auth`/`ingestion` → `app`/`verification` → `domain`. `domain` depends
on nothing. Cross-package access goes through interfaces only.

## Running locally (Step 0 skeleton)

Requirements: JDK 21, Maven 3.9+, Docker (Compose).

```bash
# 1. Start PostgreSQL 16 (dev credentials: sheltermap / sheltermap — dev only)
docker compose up -d

# 2. Build
mvn -q compile

# 3. Run (Flyway enabled, JPA ddl-auto=validate)
mvn spring-boot:run

# 4. Health check — expect {"status":"UP"}
curl http://localhost:8080/actuator/health
```

Overridable via environment: `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `SERVER_PORT`.

## Current state

**Step 0 — project skeleton** (complete): Maven project, package directories, main application
class, placeholder `SecurityFilterChain`, `docker-compose.yml`, `application.yml`, `.gitignore`,
`README.md`. No domain/service/controller code yet — that starts at Step 1.
