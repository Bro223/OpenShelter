# OpenShelter — Whitepaper

**A community-verified bomb-shelter map for Estonia**

*Version 1.1 — 2026-09-13 — Aleks Bratsun (TalTech MSc)*

---

## 1. Abstract

OpenShelter is a full-stack web application that aggregates Estonia's official bomb-shelter
registry, enriches it with user-submitted shelters, and layers community verification
and trust reports on top of the combined data. It is designed around three ideas:
**no pre-publication moderation** (community reports — not a moderator, not a rating —
are the quality mechanism), **provenance as trust** (every shelter shows whether it comes
from the official registry or a verified community member, and how it got there), and
**crisis-ready UX** (a calm, fast, high-contrast, bilingual interface that works under
stress).

The system consists of a Spring Boot / PostgreSQL backend (auth, multi-channel
verification, weekly registry ingestion, shelter API, community reports and trust
state) and an
Angular single-page frontend (map, shelter detail, account and verification flows).
Both sides are test-heavy: 706 backend and 887 frontend automated tests at the time of
writing (2026-09-13), with three completed security/code-review efforts that hardened
the whole stack: the 2026-09-08 review campaign, the 2026-09-11 review wave, and the
2026-09-13 threat-model + security-posture pass (a twelve-attack model, an operations
runbook and end-to-end API security pins — see §6).

## 2. Problem and context

Estonia maintains a public registry of bomb shelters, published as open data by the
Päästeamet (the Rescue Board) — a weekly-updated CSV of ~300 locations (the legacy
Maa-amet WFS layer that originally advertised it is no longer available). But raw open
data is not a product: an ordinary citizen cannot practically query it, judge its
freshness, or contribute local knowledge to it.

Official crisis-communication channels (kriis.ee, the Rescue Board's "ole valmis"
preparedness program) communicate *what to do* in a crisis, but they do not provide an
interactive, living shelter map that answers the most immediate question: *"Where is the
nearest shelter I can actually get to?"*

Two gaps remain open:

1. **Discoverability** — the registry is not presented as a browsable, searchable,
   distance-aware map for the public.
2. **Trust and freshness** — registry rows are static (last updated at import time) and
   carry no field-level status ("is it reachable? is it full?"). There is no mechanism for
   the community to confirm, correct, or extend the dataset. OpenShelter also makes the
   data's own provenance explicit: the footer names the dataset, links to the official
   open-data source and shows the last import (status + counts), so users can judge
   freshness at a glance.

OpenShelter addresses both: it turns the registry into a first-class map product, and it
builds a community feedback layer (verified accounts, reported trust state, provenance
badges) that increases the trustworthiness of the combined dataset over time.

The threat model includes crisis use: users under stress, weak or congested networks,
and a wide audience (including elderly and low-vision users). This shapes the UX rules
(one primary action per screen, high-contrast theme, large touch targets, words beside
every color-coded status) and the performance rules (public reads require no
authentication and batch queries rather than N+1).

## 3. Design thesis

1. **No pre-publication moderation. Community reports are the moderation.**
   User-submitted shelters appear immediately, marked *Proposed*; community
   confirmations move them to *Community-reported*. Quality is governed by community
   reports — the fifth trust-weighted "does not exist" report takes a shelter off the
   public map — and by a single env-provisioned admin who works the report queues
   after the fact (hide/restore, mark inaccurate, request info, suspend), every action
   audited. There is no approval path, no standing moderation role, and no star
   rating: the review model was removed in `V21__drop_reviews.sql`.
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
7. **Privacy is architecture, not a page.** Identity contacts (e-mail, phone) are
   AES-256-GCM encrypted at rest behind an HMAC blind index — a stolen database dump
   does not reveal account identities — and the app refuses to boot without the keys.
   Registration collects no national ID code, and an account can export and then
   erase itself.

## 4. System overview

```
┌──────────────────────────────┐        REST/JSON (JWT)        ┌─────────────────────────────┐
│  Angular SPA (map, detail,   │  ───────────────────────────▶  │  Spring Boot                │
│  auth, verify, account)      │  ◀───────────────────────────  │  api → app → domain         │
│  Leaflet, design tokens,     │                                │  ├─ auth (JWT, reset)       │
│  high-contrast theme, ET/EN  │                                │  ├─ verification (OTP)      │
└──────────────────────────────┘                                │  ├─ ingestion (CSV/WFS)     │
                                                               │  └─ api (shelters, reports) │
        ┌──────────────┬──────────────────┐                    └──────┬──────────────┬───────┘
        │              │                  │                           │              │
        ▼              ▼                  ▼                    ┌──────▼──────┐  ┌────▼──────────┐
  Päästeamet        SMTP relay         SMS provider           │ PostgreSQL  │  │ File state     │
  open data (CSV)   (smtp-pulse / dev) (Twilio / dev console) │ (Flyway     │  │ (verification  │
        ▲              ▲                  ▲                    │  V1–V20)   │  │  send log)     │
        │              └──────────────────┴────────────────────┴──────┬──────┘  └───────────────┘
        │  weekly import (Mon 03:00 Europe/Tallinn) + manual trigger  │
        └─────────────────────────────────────────────────────────────┘
```

**Data flow (registry):** weekly CSV download (versioned by the upstream
`Last-Modified`; a 304 applies nothing and is not a failure) → quote-aware parse
(EPSG:3301 → WGS84 reprojection; validation: in-Estonia bbox, non-blank name, sane
capacity — malformed rows counted, never fatal) → import service (upsert new, update
changed, delist removed — registry rows only, one transaction, overlap-guarded) →
`shelters` table + a `data_imports` audit row → public read API → frontend map (the
footer shows source, official open-data link and last-import date via
`GET /api/data-source`). The legacy WFS client remains as a working alternate.

**Data flow (community):** registered user → verifies at least one channel → submits
a shelter (immediately ACTIVE/USER) and/or files trust reports (shelter / occupancy /
open status) → the server-derived trust state is served with every shelter listing.

## 5. Functional specification

### 5.1 Authentication and sessions

- Registration: name, email, phone (canonicalized to E.164), password. No national
  ID code is collected or stored (privacy decision — the column was dropped).
  Duplicate email/phone → 409.
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
- **Data export and erasure**: `GET /account/export` returns the user's own data as
  JSON; `DELETE /account` erases the account — private data purged, the user's public
  shelters stay on the map without the authorship link.

### 5.4 Registry ingestion

- The official dataset is the **Päästeamet open-data CSV** (~300 rows; the legacy
  Maa-amet WFS layer is kept as a working alternate). Versioning is the upstream
  `Last-Modified` (fallback `ETag`): the previous stamp is sent as `If-Modified-Since`,
  and a 304 applies nothing — no delist over an empty set, and not a failure.
- Weekly scheduled import (Mondays 03:00, Europe/Tallinn) plus a manual/on-startup
  trigger; overlap-guarded.
- The importer is transactional and **delists per source** — `source=USER` rows are
  never touched; a failed batch degrades to a failed import result, never a crash.
- Malformed rows (outside Estonia, blank name, out-of-range capacity) are skipped
  and counted, not fatal.
- Every run — OK / FAILED / NOT_MODIFIED / SKIPPED — is recorded in a `data_imports`
  audit table; `GET /api/data-source` exposes source, official URL and last-import
  status publicly, and the UI footer renders them.

### 5.5 Shelter API, map, and community layer

- Public read API: list with source, provenance and trust filters
  (`?source=`, `?provenance=`, `?hasCapacity=`), detail endpoint, every derivation
  batched (no N+1). The public list is ACTIVE-only and carries the server-computed
  trust state: report counts, the fresh open/closed block, fresh occupancy, the
  last-verified moment and the inaccurate mark.
- **Provenance taxonomy**: every shelter carries a server-derived `provenance`
  (Official / Partner / Community-reported / Proposed / Reported-inactive / Rejected —
  computed at read time from source + community trust state + live report counts,
  never stored), with coloured markers, a legend and the `?provenance=` filter.
- **Community trust layer** (no pre-publication moderation): verified users report
  shelters ("does not exist" / "closed" / "confirmed open" / "wrong location" / other —
  the **fifth trust-weighted "does not exist" report auto-hides the shelter** from the
  public map), report current occupancy (three bands, 2 h freshness, hedged at one
  agreeing report, firm at two or more — display-only, it never hides or filters), and
  report the live open/closed state (one state per user, the same 2 h freshness rule,
  deliberately unthrottled). Per-user throttles bound the abuse:
  10 report-type actions per rolling hour, 10 active shelters, 5 submissions per
  rolling day, near-duplicate detection (same name + ≤ 100 m → 409).
- **Admin moderation** (post-hoc, audited): a single env-provisioned admin (no
  API-created admins; the kind is re-checked per request) works the report queues —
  hide/restore user shelters (a restore disarms auto-hide), hard delete, triage shelter
  reports, suspend/unsuspend users, view the append-only edit history, ask
  the submitter for details (one exchange per shelter), mark a listing inaccurate (the
  row stays visible with a warning). Registry rows are import-owned: every
  shelter-scoped admin write on them answers 409.
- Shelter submission: requires an authenticated, verified account; stores
  description and bounded capacity; geo coordinates validated against an Estonia
  bounding box; user-submitted addresses/descriptions and geocoded locations ride an
  SSRF-hardened URL/location resolution path.
- Community reviews are gone (V21): there is no review list, review write or star
  rating anywhere. The quality lever is the community report + confirmation mechanism
  above.
- **Location & navigation**: "Navigate" / "Open in Apple Maps" deep links,
  straight-line distance-from-you, and an address-search anchor on the map
  (OSM Nominatim, Estonia-restricted, frontend-only — the app never does IP
  geolocation).
- Frontend: Leaflet map with provenance markers and trust filters, shelter detail
  with the trust-state badges, occupancy and report controls, auth/verification/
  account pages, the admin moderation panel, privacy/terms legal pages, design-token
  theming including a high-contrast (black/yellow) mode after the national
  crisis-portal pattern, responsive down to 360 px, and a bilingual ET/EN language
  switcher (app chrome fully translated; feature-page copy in progress).

## 6. Security and abuse prevention

| Layer | Mechanism |
|---|---|
| Passwords | Argon2id; generic login errors; no plaintext in logs |
| Sessions | Short-lived access tokens; rotating refresh tokens hashed at rest; revocation on reset/logout |
| Enumeration | Uniform failure messages on login, reset-request, code confirm; reset always "succeeds" |
| OTP abuse | Per-IP token buckets + 60 s resend cooldown + **file-backed 5-per-day cap (restart-proof)** + bounded attempts + short TTL |
| SMS/email costs | Same throttle layer covers both channels; vendor senders are the only external egress |
| PII at rest | E-mail/phone AES-256-GCM encrypted with versioned key slots + HMAC-SHA256 blind index for lookups; keys env-only, never committed or logged; **missing keys ⇒ the app refuses to boot**; lost key = unrecoverable contact (offline key backup required) |
| Secrets | Gitignored `.env` (spring-dotenv); full git history scanned clean (no credential ever committed); fail-closed boot guards (non-dev profiles refuse a dev-default / <32-byte JWT secret; dev diagnostic endpoints refuse to boot outside dev/test; missing PII keys ⇒ refused; Twilio refuses blank credentials) |
| SSRF | URL/location resolution hardened against internal-address exfiltration |
| Diagnostics | `/dev/email-test` and `/dev/sms-test` are opt-in, JWT-gated, recipient-allowlisted — never an open relay |
| Data integrity | Flyway-migrated schema with unique constraints (email, phone, one active claim per user per level, one live report per user per shelter/type); `ddl-auto=validate` |

Three review efforts have hardened the stack, each with findings fixed and
test-pinned:

- **2026-09-08 campaign** (4-lead / 13-child review) — reset-code brute-force,
  unspoofable `X-Forwarded-For` rate-limit keys, fail-closed prod JWT guard,
  transactional refresh rotation, plus the hardening wave (uniqueness races,
  transactional import, N+1 removal, canonical phone/email, Twilio fail-fast,
  dead-code removal).
- **2026-09-11 review wave** — the same surface re-reviewed after the fix waves,
  incl. a full-history secret scan (zero committed credentials).
- **2026-09-13 threat model + security posture (M15)** — a twelve-attack model in
  [`docs/security/threat-model.md`](security/threat-model.md) (every attack mapped to
  its mitigations, its status and the test that pins it, with an explicit
  residual-risk register), an operations runbook in
  [`docs/security/operations.md`](security/operations.md) (fail-closed boot guards,
  staging-vs-production separation, pg_dump backup/restore, monitoring, incident
  quick-list), and eleven end-to-end API security tests pinning the recovery flow
  (uniform ack, cooldown, attempt lockout, single-use, expiry, session revocation)
  and the admin authorization surface (401/403/200 vocabulary, headers, no cookie).

## 7. Technical architecture

| Concern | Choice |
|---|---|
| Backend | Java 21, Maven, Spring Boot 3.3.x (web, validation, data-jpa, security, actuator) |
| Data | PostgreSQL 16, Flyway migrations V1–V20, JPA with `ddl-auto=validate` |
| Auth | jjwt 0.12.x; spring-security-crypto (Argon2id) |
| Ingestion | Hand-written Päästeamet CSV client (quote-aware semicolon parse, transient-only retry/backoff, Last-Modified versioning) with the legacy WFS client as alternate; proj4j (EPSG:3301 → WGS84) |
| Testing | JUnit 5 + AssertJ + Testcontainers (PostgreSQL); **no Mockito** (JDK-agnostic hand-written fakes) |
| Frontend | Angular 22 (standalone components, zoneless), Leaflet, SCSS design tokens, i18n (EN/ET catalogs with a key-parity guard), Vitest |
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

- **706 backend tests** (unit + PostgreSQL integration via Testcontainers) and
  **887 frontend tests** (unit + component, TestBed with hand-written fakes) at the
  time of writing (2026-09-13); both suites run in CI style per milestone, before
  anything is committed.
- **Three review efforts** (detailed in §6): the hardening pass (uniqueness
  constraints, transactional import, batched queries, X-Forwarded-For-aware rate
  limiting, CORS, health hygiene); the 2026-09-08 / 2026-09-11 security campaigns
  (race conditions, reset-code brute force, canonical E.164/lowercase normalization,
  Twilio fail-fast, dead-code removal, prod JWT guard, full-history secret scan);
  and the M15 threat-model pass (twelve-attack model + operations runbook + eleven
  API security pins).
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
closed: a non-dev profile refuses a development or short JWT secret, refuses the dev
diagnostic endpoints, and refuses to start without the PII keys; the Twilio sender
refuses to start with missing credentials. Staging and production are separate
environments with separate databases and separate PII keys (staging runs the
production profile); the backup/restore procedure, monitoring and the incident
quick-list are in `docs/security/operations.md`.

## 10. Current state and roadmap

**Working end-to-end:** authentication with JWT sessions and password reset;
email verification with a live relay; phone verification (full logic, live SMS
pending vendor credentials); cross-channel contact change; PII at rest; weekly
registry ingestion of ~300 shelters with a public data-source footer; the
provenance taxonomy (coloured markers, legend, filter); public shelter API with
the server-derived trust state; community submissions, reports and live
occupancy (auto-hide on the fifth trust-weighted "does not exist" report); the
env-provisioned admin moderation panel (report queues, suspension, edit history,
info requests, inaccurate marks, audit trail); data export + account deletion;
privacy/terms pages; the Angular map, detail, auth, verification, account, legal
and admin surfaces; bilingual ET/EN app chrome.

**In progress:** bilingual feature-page copy (i18n slice 2 — the trust copy,
forms and legal bodies; the app chrome is already ET/EN).

**Roadmap (in priority order):**

1. Smart-ID verification (seam exists; stub today)
2. Internationalization — ET/EN chrome is live (default locale still `en`; flipping
   to `et` is a one-line owner decision); feature-page Estonian copy in progress;
   RUS/UA not started (kriis.ee ships all four)
3. Saved/bookmarked shelters
4. PWA + offline-last-good cache (crisis context)
5. Nearest/bbox + paging query endpoints (nearest is now client-side by design; the
   server endpoints remain deferred)
6. Additional registry sources (municipality-level clients behind the existing
   `ShelterRegistryClient` seam; the `PARTNER_VERIFIED` provenance is already
   reserved for them)
7. Production deployment (TLS, secrets management, proxy-level CSP)

## 11. Appendix — API surface (abridged)

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/register` (201/409), `POST /auth/login` (200/401), `POST /auth/refresh` (rotate), `POST /auth/logout`, `POST /auth/password-reset/request|confirm` |
| Verification | `POST /verify/request` (202/409/429), `POST /verify/confirm` (200/400) |
| Account | `GET /account/me`, `PUT /account/profile`, `POST /account/email-change/request|confirm`,`POST /account/phone-change/request|confirm`,`GET /account/export`,`DELETE /account` |
| Shelters | `GET /api/shelters` (+ `?provenance=`, `?source=`, `?hasCapacity=`), `GET /api/shelters/{id}`, `POST /api/shelters` (verified), `GET /api/shelters/mine`, `PUT`/`DELETE /api/shelters/{id}` (author-only), `POST /api/shelters/{id}/info-request/reply` (author-only) |
| Trust & reports | `POST /api/shelters/{id}/reports` (verified), `PUT /api/shelters/{id}/occupancy` (verified), `PUT /api/shelters/{id}/open-status` (verified) |
| Data source | `GET /api/data-source` (public — source, official URL, last-import status) |
| Admin (env-provisioned) | `GET /admin/shelters` (+ history, request-info, mark/clear inaccurate), `POST /admin/shelters/{id}/status`, `DELETE /admin/shelters/{id}`, `GET /admin/reports`, `POST /admin/reports/{id}/dismiss`,`GET /admin/users`,`POST /admin/users/{id}/suspend|unsuspend`,`GET /admin/alerts` |
| Diagnostics (opt-in) | `POST /dev/email-test`, `POST /dev/sms-test` — JWT + allowlist, never enabled by default |

---
*This whitepaper describes the project as of 2026-09-13. Test counts and
roadmap items reflect the state at the time of writing.*

**Version history**

- **1.1 (2026-09-13)** — full refresh against the shipped code: official
  Päästeamet open-data CSV pipeline (audit + public data-source API), national-ID
  removal, PII at rest, provenance taxonomy, community trust layer (reports,
  occupancy, auto-hide, throttles), admin moderation + dashboard
  completion, data export + account deletion, legal pages, location & navigation,
  mobile polish, i18n foundation (ET/EN chrome), threat model + operations
  runbook, 706/887 automated tests, three review efforts.
- **1.0 (2026-09-12)** — first public draft; 360/588 automated tests, two review
  campaigns, pre-provenance-trust-layer state.
