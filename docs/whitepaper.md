# OpenShelter — Whitepaper

**A community-verified bomb-shelter map for Estonia**

*Version 1.0 — September 2026 — Aleks Bratsun (TalTech MSc)*

---

## 1. Abstract

OpenShelter is a full-stack web application that aggregates Estonia's official bomb-shelter
registry, enriches it with user-submitted shelters, and layers community verification,
reviews, and ratings on top of the combined data. It is designed around three ideas:
**no moderator** (the rating system is the moderation), **provenance as trust** (every
shelter shows whether it comes from the official registry or a verified community member),
and **crisis-ready UX** (a calm, fast, high-contrast interface that works under stress).

The system consists of a Spring Boot / PostgreSQL backend (auth, multi-channel
verification, weekly registry ingestion, shelter API, community reviews) and an
Angular single-page frontend (map, shelter detail, account and verification flows).
Both sides are test-heavy: 360 backend and 588 frontend automated tests at the time
of writing, with two completed security/code-review campaigns that hardened the whole
stack.

## 2. Problem and context

Estonia maintains a public registry of bomb shelters, published as GIS data
(a WFS service operated by Maa-amet, the Estonian Land Board). But raw GIS data is not
a product: an ordinary citizen cannot practically query it, judge its freshness, or
contribute local knowledge to it.

Official crisis-communication channels (kriis.ee, the Rescue Board's "ole valmis"
preparedness program) communicate *what to do* in a crisis, but they do not provide an
interactive, living shelter map that answers the most immediate question: *"Where is the
nearest shelter I can actually get to?"*

Two gaps remain open:

1. **Discoverability** — the registry is not presented as a browsable, searchable,
   distance-aware map for the public.
2. **Trust and freshness** — registry rows are static (last updated at import time) and
   carry no field-level status ("is it reachable? is it full?"). There is no mechanism for
   the community to confirm, correct, or extend the dataset.

OpenShelter addresses both: it turns the registry into a first-class map product, and it
builds a community feedback layer (verified accounts, ratings, reviews, provenance
badges) that increases the trustworthiness of the combined dataset over time.

The threat model includes crisis use: users under stress, weak or congested networks,
and a wide audience (including elderly and low-vision users). This shapes the UX rules
(one primary action per screen, high-contrast theme, large touch targets, words beside
every color-coded status) and the performance rules (public reads require no
authentication and batch queries rather than N+1).

## 3. Design thesis

1. **No moderator. The rating system is the moderation.** User-submitted shelters are
   published immediately (`ACTIVE`, `source=USER`). Quality is governed by community
   ratings: one review per user per shelter, re-rating updates rather than inserts.
   There is no admin approval path and no moderation role.
2. **Provenance is a first-class property.** Every shelter carries a `source`
   (REGISTRY vs USER). The importer may create/update/delete only REGISTRY rows; USER
   rows are sacred. The UI presents provenance as badges (Registry / Verified /
   Community) so trust is visible at a glance.
3. **Verification is data, not a class change.** A user's verification state is a set of
   claims (EMAIL, PHONE, SMART_ID) added at runtime — never modelled as subclasses.
4. **Cross-channel contact change.** Changing the account email requires an SMS code to
   the *current phone*; changing the phone requires an email code to the *current email*.
   Stealing one channel is never sufficient to hijack an account.
5. **Abuse prevention is an architecture, not a feature.** Every outward channel
   (login, register, password reset, OTP requests, contact change) sits behind layered
   limits: per-IP token buckets, per-user resend cooldowns, a file-backed daily cap that
   survives restarts, bounded attempts, short code TTLs, and codes stored only as
   SHA-256 hashes.
6. **Channels are swappable seams.** SMS, email, and Smart-ID sit behind interfaces
   (`SmsSender`, `SmtpSender`, `VerificationProvider`). All code-generation, retry, and
   verification logic lives in the application; external vendors (Twilio, smtp-pulse)
   are senders only, selected by configuration.

## 4. System overview

```
┌──────────────────────────────┐        REST/JSON (JWT)        ┌─────────────────────────────┐
│  Angular SPA (map, detail,   │  ───────────────────────────▶  │  Spring Boot                │
│  auth, verify, account)      │  ◀───────────────────────────  │  api → app → domain         │
│  Leaflet, design tokens,     │                                │  ├─ auth (JWT, reset)       │
│  high-contrast theme         │                                │  ├─ verification (OTP)      │
└──────────────────────────────┘                                │  ├─ ingestion (WFS)         │
                                                               │  └─ api (shelters, reviews) │
        ┌──────────────┬──────────────────┐                    └──────┬──────────────┬───────┘
        │              │                  │                           │              │
        ▼              ▼                  ▼                    ┌──────▼──────┐  ┌────▼──────────┐
  Maa-amet WFS      SMTP relay         SMS provider           │ PostgreSQL  │  │ File state     │
  (VARJEKOHT layer) (smtp-pulse / dev) (Twilio / dev console) │ (Flyway     │  │ (verification  │
        ▲              ▲                  ▲                    │  V1–V8)    │  │  send log)     │
        │              └──────────────────┴────────────────────┴──────┬──────┘  └───────────────┘
        │  weekly import (Mon 03:00 Europe/Tallinn) + manual trigger  │
        └─────────────────────────────────────────────────────────────┘
```

**Data flow (registry):** WFS GetFeature → shelter parser (EPSG:3301 → WGS84
reprojection, validation: in-Estonia bbox, non-blank name, sane capacity) → import
service (upsert new, update changed, delete delisted — REGISTRY rows only) →
`shelters` table → public read API → frontend map.

**Data flow (community):** registered user → verifies at least one channel → submits
shelter (immediately ACTIVE/USER) and/or reviews existing shelters → ratings
aggregates served with every shelter listing.

## 5. Functional specification

### 5.1 Authentication and sessions
- Registration: name, email, phone (canonicalized to E.164), Estonian personal
  identification code, password. Duplicate email/phone → 409.
- Passwords hashed with **Argon2id**; no plaintext ever stored or logged.
- JWT sessions: 15-minute access token + 30-day refresh token. Refresh tokens are
  **rotated on every use and stored as SHA-256 hashes**; logout revokes.
- Login accepts email **or** phone; failures always return a generic "invalid
  credentials" (no account enumeration).

### 5.2 Multi-channel verification
- **EMAIL**: 8-character code delivered by SMTP (real relay in production, console
  sender in dev).
- **PHONE**: 6-digit OTP via SMS (Twilio SDK wired; dev console sender; live account
  pending).
- **SMART_ID**: reserved seam, stubbed (Estonian e-ID path for the future).
- Codes: SecureRandom, SHA-256 at rest, 5–15-minute TTL, 5-attempt limit, one active
  code per user per channel; resend invalidates the previous code.
- Re-verifying an already-verified level is handled idempotently (request → 409
  "already verified", confirm → 200 no-op).

### 5.3 Password reset and account management
- Email-based reset with single-use, expiring, hashed tokens; the request always
  responds success regardless of whether the account exists (anti-enumeration);
  a successful reset **revokes all sessions** for the user.
- Cross-channel contact change (email ↔ phone), with per-request rate limits,
  resend cooldown, duplicate-target 409, and E.164 normalization.
- Profile access (`GET /account/me`) exposes the user's current contacts and
  verification claims to the authenticated owner.

### 5.4 Registry ingestion
- Weekly scheduled import (Mondays 03:00, Europe/Tallinn) plus a manual/on-startup
  trigger; overlap-guarded.
- The importer is transactional and **never touches `source=USER` rows**; a failed
  batch degrades to a failed import result, never a crash.
- Malformed rows (outside Estonia, blank name, out-of-range capacity) are skipped
  and counted, not fatal.

### 5.5 Shelter API, map, and community layer
- Public read API: list with source filter, detail endpoint, batched rating
  aggregates (no N+1).
- Shelter submission: requires an authenticated, verified account; stores
  description and bounded capacity; geo coordinates validated against an Estonia
  bounding box.
- Community reviews: verified users only; one review per user per shelter
  (upsert semantics); author-only update/delete.
- User-contributed shelter content (addresses, descriptions, geocoded locations)
  with an SSRF-hardened URL/location resolution path.
- Frontend: Leaflet map with provenance markers, shelter detail with rating and
  review list, auth/verification/account pages, design-token theming including a
  high-contrast (black/yellow) mode after the national crisis-portal pattern.

## 6. Security and abuse prevention

| Layer | Mechanism |
|---|---|
| Passwords | Argon2id; generic login errors; no plaintext in logs |
| Sessions | Short-lived access tokens; rotating refresh tokens hashed at rest; revocation on reset/logout |
| Enumeration | Uniform failure messages on login, reset-request, code confirm; reset always "succeeds" |
| OTP abuse | Per-IP token buckets + 60 s resend cooldown + **file-backed 5-per-day cap (restart-proof)** + bounded attempts + short TTL |
| SMS/email costs | Same throttle layer covers both channels; vendor senders are the only external egress |
| Secrets | Gitignored `.env` (spring-dotenv); git history audited clean (no credential ever committed); boot-time fail-fast guards (prod refuses dev-default JWT secret; Twilio refuses blank credentials) |
| SSRF | URL/location resolution hardened against internal-address exfiltration |
| Diagnostics | `/dev/email-test` and `/dev/sms-test` are opt-in, JWT-gated, recipient-allowlisted — never an open relay |
| Data integrity | Flyway-migrated schema with unique constraints (email, phone, one active claim per user per level, one review per user per shelter); `ddl-auto=validate` |

A dedicated security review campaign (2026-09-08) additionally closed race
conditions (duplicate registration, concurrent confirms, contact-change
duplicate races), N+1 query paths, and validation gaps (unbounded capacity,
missing bbox check).

## 7. Technical architecture

| Concern | Choice |
|---|---|
| Backend | Java 21, Maven, Spring Boot 3.3.x (web, validation, data-jpa, security, actuator) |
| Data | PostgreSQL 16, Flyway migrations V1–V8, JPA with `ddl-auto=validate` |
| Auth | jjwt 0.12.x; spring-security-crypto (Argon2id) |
| Ingestion | Hand-written WFS client (pagination, retry/backoff, politeness), proj4j (EPSG:3301 → WGS84) |
| Testing | JUnit 5 + AssertJ + Testcontainers (PostgreSQL); **no Mockito** (JDK-agnostic hand-written fakes) |
| Frontend | Angular 22 (standalone components, zoneless), Leaflet, SCSS design tokens, Vitest |
| Docs-as-code | PlantUML diagrams (architecture + per-flow sequences) rendered via Docker/Kroki; per-milestone "agent build packs" that keep docs in sync with code |

**Backend package layout** (root `ee.sheltermap`): `domain` (pure Java, depends on
nothing) ← `app` / `verification` (services + repository seams) ← `api` / `auth` /
`ingestion` (HTTP layer), with `persistence` implementing repository interfaces and
`config` holding Spring wiring. The dependency rule is strict and one-directional;
all cross-package access goes through interfaces, making every external channel
(email, SMS, registry, storage) swappable.

All errors share one shape: `ErrorResponse` (timestamp, status, error, message,
path), with consistent HTTP semantics (400 validation, 401 unauthenticated,
403 forbidden, 404 not found, 409 conflict, 429 rate limited).

## 8. Quality assurance

- **360 backend tests** (unit + PostgreSQL integration via Testcontainers) and
  **588 frontend tests** (unit + component, TestBed with hand-written fakes) at the
  time of writing; both suites run in CI style per milestone.
- **Two review campaigns**: a first hardening pass (uniqueness constraints,
  transactional import, batched queries, X-Forwarded-For-aware rate limiting,
  CORS, health hygiene) and a second pass (race conditions, canonical E.164/lowercase
  normalization, Twilio fail-fast, dead-code removal, prod JWT guard).
- **Process**: the project was built milestone-by-milestone against written
  acceptance criteria, with every milestone stopping for human review; PlantUML
  diagrams are re-synced to code state after each milestone, so the architecture
  documentation does not drift.

## 9. Deployment posture

The app is configured for a **single-instance** deployment (in-memory rate limiting
and file-backed caps are instance-scoped by design). Configuration is
environment-variable-driven via `.env` (never committed); production hardening is a
checklist, not a default: real `JWT_SECRET`, real senders (SMTP/SMS credentials),
Postgres hosting, TLS termination and CSP at the proxy layer. Boot guards fail
closed: the app refuses to start in the `prod` profile with a development JWT
secret, and the Twilio sender refuses to start with missing credentials.

## 10. Current state and roadmap

**Working end-to-end:** authentication with JWT sessions and password reset;
email verification with a live relay; phone verification (full logic, live SMS
pending vendor credentials); cross-channel contact change; weekly registry
ingestion of ~300 shelters; public shelter API with ratings; community
submissions and reviews; the Angular map, detail, auth, verification, and account
surfaces.

**Roadmap (in priority order):**
1. Smart-ID verification (seam exists; stub today)
2. Internationalization — Estonian first, then EN/RUS/UA (kriis.ee ships all four)
3. Community status reports (lightweight "reachable / full / no-entry" confirmations)
4. Saved/bookmarked shelters
5. PWA + offline-last-good cache (crisis context)
6. Nearest/bbox + paging query endpoints (currently deferred by design)
7. Additional registry sources (municipality-level clients behind the existing
   `ShelterRegistryClient` seam)
8. Production deployment (TLS, secrets management, proxy-level CSP)

## 11. Appendix — API surface (abridged)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (201/409), `POST /auth/login` (200/401), `POST /auth/refresh` (rotate), `POST /auth/logout`, `POST /auth/password-reset/request|confirm` |
| Verification | `POST /verify/request` (202/409/429), `POST /verify/confirm` (200/400) |
| Account | `GET /account/me`, `POST /account/email-change/request|confirm`, `POST /account/phone-change/request|confirm`, profile updates |
| Shelters | `GET /api/shelters` (+ `?source=`), `GET /api/shelters/{id}`, `POST /api/shelters` (verified), user contribution endpoints |
| Reviews | `GET /api/shelters/{id}/reviews`, `POST /api/shelters/{id}/reviews` (verified, upsert), `PUT`/`DELETE` (author-only) |
| Diagnostics (opt-in) | `POST /dev/email-test`, `POST /dev/sms-test` — JWT + allowlist, never enabled by default |

---
*This whitepaper describes the project as of September 2026. Test counts and
roadmap items reflect the state at the time of writing.*
