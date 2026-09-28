# Deploy readiness — what a real deployment needs that development does not

**Lane:** DEPLOY-READINESS (read-only; no code, config or document was changed; no commit made)
**Branch:** `polish-work` @ `41cc03a` (exists — used; `feature/frontend` was the fallback)
**Date:** 2026-09-28
**Rule file:** `docs/autopilot/CODE-REVIEW-RUN.md` (read; this lane reports only)

**Method.** Everything below is read from the repository on this branch, plus two
read-only observations on the live dev machine: the gitignored `.env` (variable names and
non-secret values only — secret values were never printed or recorded) and the dev
Postgres's `flyway_schema_history` (read-only `SELECT`). Nothing that could not be
verified from the repository is stated as fact — it is listed in §8.

**Framing.** The app runs today via `dev-start.sh` with `SPRING_PROFILES_ACTIVE=dev`
(pinned by the script), the loopback-only compose Postgres
(`docker-compose.yml`, `"127.0.0.1:5432:5432"`, credentials `sheltermap/sheltermap`
published in the file), the gitignored local `.env` with real SMTP/Twilio credentials,
and the Angular dev server on :5173 proxying to :8080. Nothing in the repository has
ever been deployed — the README itself lists "Deployment hardening — HTTPS, real secret
management, monitoring (dev-grade config today)" under genuine gaps
(`README.md:845` ff).

**The single most important structural fact:** there is **no production profile file**.
`src/main/resources/` contains exactly one config file — `application.yml` (plus the
test-classpath overlay `src/test/resources/application-test.yml`, which only tests load).
"Production" is the base `application.yml` plus environment variables, with a set of
fail-closed boot guards doing the safety work (verified in code, §2).

---

## 1. Production-versus-dev configuration inventory (exact keys)

Every property below has a dev value in `src/main/resources/application.yml` and needs a
real one, a conscious "leave default" decision, or a topology-dependent decision in
production. Profile note applies to the whole table: the guards exempt only when the
**entire** active profile set is a subset of `{dev, test}` (`Profiles.isDevTestOnly`,
cited in every guard) — `prod`, `production`, `prod-*`, a blank set, or a mixed set like
`production,dev` all run the full guard set.

### 1.1 Database

| Property | Env var | Dev default (application.yml) | Production needs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `spring.datasource.url` | `DB_URL` | `jdbc:postgresql://localhost:5432/sheltermap` | Real host. **Unguarded** — a forgotten override points at localhost and the boot dies on connection failure (loud, not silent). |
| `spring.datasource.username` | `DB_USERNAME` | `sheltermap` | Dedicated user, no superuser (runbook §2). The guard keys on the password only. |
| `spring.datasource.password` | `DB_PASSWORD` | `sheltermap` (published in `application.yml` **and** `docker-compose.yml`) | Strong non-default. `DataSourceCredentialGuard` (config/DataSourceCredentialGuard.java) refuses boot outside dev/test when the resolved password is blank or the published default. |
| `spring.datasource.hikari.maximum-pool-size` | `HIKARI_MAXIMUM_POOL_SIZE` | 20 | Sized for the documented single-instance deploy; leave or raise deliberately. |
| `spring.datasource.hikari.connection-timeout` | `HIKARI_CONNECTION_TIMEOUT` | 5000 | Leave. |

### 1.2 Keys and secrets (fail-closed)

| Property | Env var | Dev default | Production needs / behaviour if missing |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `app.jwt.secret` | `JWT_SECRET` | the published string `dev-only-secret-change-me-sheltermap-0123456789abcdef` (52 bytes) | `ProdJwtGuard` refuses boot outside dev/test on the published default or < 32 bytes. `app.jwt.access-ttl: 15m`, `refresh-ttl: 30d` are fixed. |
| `app.pii.aes-key` | `PII_AES_KEY` | *(empty — no default)* | **Required in every profile, including dev/test** (`PiiKeys` throws at context startup on blank, non-base64, or non-32-byte values). 32-byte base64; must be unique per environment (staging ≠ production — runbook §3). |
| `app.pii.hmac-key` | `PII_HMAC_KEY` | *(empty)* | Same as above. This key is also the OTP/password-reset **code-hash** key and the blind-index key (`CodeHashes` → `PiiCrypto`, `PiiCrypto.java:256` `mac.init(keys.hmacKey())`); codes are never stored in plaintext (`V32__otp_code_hash_keyed_widen.sql`). |

### 1.3 Admin seeder

| Property | Env var | Dev default | Production needs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `app.admin.email` | `ADMIN_EMAIL` | *(empty)* | **Both empty → no admin exists and `/admin/*` answers 403 for everyone** (no moderation, no guidance publishing, no alert ring). Create-if-absent only: `AdminSeeder` never re-hashes, never flips kind — an existing row with that email is left untouched, so the env vars cannot rotate an existing admin password (see §6, B5, for the runbook inconsistency this creates). |
| `app.admin.password` | `ADMIN_PASSWORD` | *(empty)* | ≥ 8 chars — a shorter value **refuses the boot** (`AdminSeeder.run` throws `IllegalStateException`). |

### 1.4 Mail and SMS (providers fail-closed at boot, credentials half-fail-closed)

| Property | Env var | Dev default | Production needs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `app.mail.provider` | `MAIL_PROVIDER` | `dev` (console sender that logs every code in plaintext) | `smtp-pulse` (or any non-dev value). `DevSenderGuard` refuses boot outside dev/test when **either** channel is still `dev`/blank. |
| `spring.mail.host` | `SMTP_HOST` | `smtp-pulse.com` | The default host is already a real provider; set deliberately either way. |
| `spring.mail.port` | `SMTP_PORT` | `587` | 587 (starttls is on: `mail.smtp.starttls.enable: true`). |
| `spring.mail.username` | `SMTP_USERNAME` | *(empty)* | Real login. **No fail-fast found for missing SMTP credentials** (contrast Twilio, below) — a bad combo fails per-send at runtime, logged (unverified in detail, §8). |
| `spring.mail.password` | `SMTP_PASSWORD` | *(empty)* | Real secret. |
| `app.mail.from` | `SMTP_FROM` | falls back to `SMTP_USERNAME` | **Must be a sender verified in the smtp-pulse dashboard** — the local `.env` comment documents the failure mode: unverified domain → `554 5.9.2 Sender domain is not valid`, i.e. every verification e-mail bounces while the app appears healthy. |
| `app.sms.provider` | `SMS_PROVIDER` | `dev` (console) | `twilio`. Same `DevSenderGuard` coverage. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | same | *(not in yml; no defaults)* | `TwilioSmsSender` **fails fast at bean creation** on missing credentials (`TwilioSmsSender.java:60-76`) — a deliberate boot failure, no silent no-op. |
| `TWILIO_MESSAGING_SERVICE_SID` / `TWILIO_FROM` | same | *(none)* | The local `.env` notes no Messaging Service SID exists — the sender is the verified number `TWILIO_FROM`. A production account needs its own (runbook §3: separate provider accounts per environment). |
| `app.dev-email-test.enabled` / `.allowed-recipients` / `.allow-any` | `DEV_EMAIL_TEST_ENABLED` / `DEV_EMAIL_TEST_ALLOWED_RECIPIENTS` / `DEV_EMAIL_TEST_ALLOW_ANY` | `false` / `*` / `false` | Must stay `false` — `DevEndpointsGuard` refuses boot if either dev diagnostic is enabled on a non-dev/test profile. **The live dev `.env` has both set `true`** — a copied `.env` is a boot-refusal (see §6, B2). |
| `app.dev-sms-test.*` | `DEV_SMS_TEST_*` | same shape | same |

### 1.5 CORS, origins, proxies, HSTS

| Property | Env var | Dev default | Production needs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `app.cors.allowed-origins` | `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,http://localhost:3000` | The exact public origin(s), or **nothing at all if the SPA is served same-origin behind the API proxy** (then no cross-origin requests exist). **Unguarded** — the dev default silently survives into production. |
| `app.ratelimit.trusted-proxies` | `RATELIMIT_TRUSTED_PROXIES` | *(empty = trust no `X-Forwarded-For`)* | The edge proxy's IP(s) whenever the proxy is not loopback. This one variable gates three things: rate-limit IP keying (`ClientIps`), HSTS via `X-Forwarded-Proto` (`SecurityHeadersFilter.clientConnectionWasSecure`), and the loopback-trust interaction. |
| `app.ratelimit.trust-loopback` | `RATELIMIT_TRUST_LOOPBACK` | `true` | `false` behind a real load balancer. `LoopbackXffTrustGuard` emits a boot **WARNING** (deliberately not a refusal — it would break the local dev proxy) on non-dev/test deploys. |
| *(no property)* | — | — | HSTS is **implemented** (`SecurityHeadersFilter`, `max-age=31536000; includeSubDomains`) but conditional: sent only when the client connection was secure — directly (`isSecure()`) or via a **trusted** proxy's leftmost `X-Forwarded-Proto: https`. Behind a plain-HTTP edge that is not in `RATELIMIT_TRUSTED_PROXIES`, HSTS never fires. |
| **Cookies / secure flags** | — | — | **There are none to set.** Auth is stateless Bearer tokens (`SecurityConfig.java:214` — "Stateless Bearer-token auth … no cookie"); a grep for `Set-Cookie`/`addCookie`/`ResponseCookie` across `src/main/java` returns nothing; the SPA keeps tokens in `localStorage` (`frontend/src/app/core/token-store*`). `httpOnly cookies` is a listed v1 deferral (README known gaps). The whole cookie question collapses into: **TLS must exist at the edge**, or the tokens ride plain HTTP. |

### 1.6 Feature defaults and runtime paths

| Property | Env var | Dev default | Production needs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `app.retention.enabled` | `RETENTION_ENABLED` | `false` | **Owner decision** (product/legal). The daily prune job (03:30 Europe/Tallinn; `RETENTION_INACTIVE_ACCOUNT_MONTHS: 24`, `RETENTION_AUDIT_MONTHS: 24`) ships disabled and "whoever operates a deployment enables it" (yml comment). Nothing runs or logs while off. |
| `app.media.upload-dir` | `MEDIA_UPLOAD_DIR` | `data/media` (**relative**) | An absolute path on persistent storage. `MediaStorage.init()` (`guidance/MediaStorage.java:64-78`) creates the directory at boot and **fails the boot** if it cannot be created or is not writable — but the default path *succeeds* in the container (inside the writable layer), so the failure mode is silent data loss, not a refused boot (§6, B6). |
| `app.verification.send-log-path` | `VERIFICATION_SEND_LOG_PATH` | `data/verification-send.log` (**relative**) | Same persistence story; this is the durable daily verification-cap log (runbook §4 lists it as a backup item). |
| `app.registry.base-url` / `client` / `official-url` | `REGISTRY_BASE_URL` / `REGISTRY_CLIENT` / `REGISTRY_OFFICIAL_URL` | `*` / `csv` (live open-data CSV `opendata.smit.ee`) / rescue.ee page | The import needs **outbound internet egress** to the CSV host. `app.registry.schedule-enabled: true`, cron `0 0 3 * * MON` (Europe/Tallinn) — the weekly sync runs unconditionally in production unless disabled. `run-on-startup: false` (the only "manual trigger" is a restart with the flag — there is **no HTTP endpoint** for it; verified by grep). |
| `springdoc.api-docs.enabled` / `springdoc.swagger-ui.enabled` | `SPRINGDOC_ENABLED` | `false` | Must stay `false` — `ApiDocsGuard` refuses boot if enabled outside dev/test. (Live dev `.env` has it `true` — another copied-`.env` boot-refusal.) |
| `server.port` | `SERVER_PORT` | `8080` | 8080 is fine behind a proxy. |
| `app.guidance.default-locale` | `GUIDANCE_DEFAULT_LOCALE` | `en` | Leave; flipping means changing the frontend too (yml comment). |
| rate-limit buckets (`app.ratelimit.login-capacity` … `session-refill-per-second`), `app.limits.*` | mostly fixed in yml (no env overrides) | tuned values | No action; they assume the documented **single instance** (in-memory buckets + alert ring, `app.limits.alerts-retained: 200`). |

---

## 2. Secrets — what must be a secret, where it is read, and today's behaviour

| Secret | Read from | Today, if missing or left at default |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | 
| `JWT_SECRET` | `app.jwt.secret` (yml default = the published dev string) | **dev profile:** the published default silently works — that is the point (the local `.env` does not even set it). **non-dev profile:** boot refused with "PRODUCTION REFUSED TO START" naming the dev default (`ProdJwtGuard`). No silent path. |
| `PII_AES_KEY` / `PII_HMAC_KEY` | `app.pii.aes-key` / `hmac-key` (no default) | **Every profile, dev included:** boot refused — "PII-at-rest is fail-closed. Generate a key with `openssl rand -base64 32`". The local `.env` sets both, which is why dev boots. A lost key = affected accounts unloginable by contact (README "PII at rest"); offline backup is mandatory **before** production data exists. |
| `DB_PASSWORD` | `spring.datasource.password` (default `sheltermap`, published) | **dev:** the compose DB uses exactly that — silently works by design. **non-dev:** boot refused (blank or published default — `DataSourceCredentialGuard`). Note the guard does **not** check the host or username: `DB_URL` can still point at localhost (fails on connection, loudly). |
| `ADMIN_PASSWORD` (+ `ADMIN_EMAIL`) | `app.admin.*` (no default) | Unset → **no admin exists** (no failure; `/admin/*` 403 for all). Set but < 8 chars → boot refused. Set + no row with that email → row created at startup; row exists → no-op, **password never re-hashed** (see B5). |
| `SMTP_PASSWORD` / `SMTP_USERNAME` | `spring.mail.*` (no default) | Provider `smtp-pulse` with blank creds → **no boot failure found** (unlike Twilio); sends fail per-send and are logged. Provider left `dev` on a non-dev profile → boot refused by `DevSenderGuard`. |
| `TWILIO_AUTH_TOKEN` (+ SID) | read by `TwilioSmsSender` bean | Provider `twilio` + missing credentials → **boot failure** (`TwilioSmsSender.java:60-76`). Provider left `dev` on non-dev → boot refused by `DevSenderGuard`. |
| OTP / password-reset codes | never stored — HMAC-hashed with `PII_HMAC_KEY` (`CodeHashes` → `PiiCrypto.java:256`), widened by `V32` | No independent secret; rotating the PII keys changes the code hashes (handled by the documented re-encrypt migration, README D6 — deliberately not yet built, runbook §6). |
| (context) CI `NVD_API_KEY` | GitHub secret, optional | Absent → nightly OWASP scan downloads the unkeyed feed. Not a runtime secret. |

**The asked question — "a default that silently works in production is the finding":**
the security-critical secrets are all fail-closed (JWT, DB password, PII keys, senders,
dev diagnostics, API docs) — verified class by class. The defaults that *do* silently
survive into production are the **non-secret** ones, and they matter:

- `CORS_ALLOWED_ORIGINS` → localhost:5173/3000 — harmless same-origin, site-breaking cross-origin (§6 B4).
- `RATELIMIT_TRUSTED_PROXIES` → empty and `trust-loopback` → true — wrong rate-limit keys and dead HSTS behind a non-loopback edge, with only a boot warning (§6 B3).
- `DB_URL` → localhost:5432 — loud connection failure, but note the guard checks the password, not the URL.
- `RETENTION_ENABLED` → false — a compliance-relevant default that is "safe" only until someone decides otherwise.
- `spring.mail.from` → `SMTP_USERNAME` — bounces all mail if the login is not a verified sender (the `.env` comment documents the exact 554 error).
- `REGISTRY_*` → the live open-data URL — "works" but means production makes outbound calls to a third party on a schedule with no operator awareness.

---

## 3. The database path

**Migrations at startup.** `spring.flyway.enabled: true`, `locations: classpath:db/migration`,
`jpa.hibernate.ddl-auto: validate` — Flyway owns the schema, Hibernate only validates
(application.yml). Flyway runs **before** the web server starts (dev-start.sh preflight
comment; the Dockerfile healthcheck `start-period=60s` exists to cover it).

**The migration set (repository, `src/main/resources/db/migration/` + `src/main/java/ee/sheltermap/migration/`):**
34 SQL files — V1–V12, V14–V33, V35 (including decimal V23.1) — plus two **Java**
migrations occupying the "missing" numbers: `V13PiiEncryptionMigration.java` (PII
encryption) and `V34BlindIndexFramingMigration.java`. The sequence V1…V35 is gap-free.

**Applied list — verified on the live dev database** (read-only query against
`flyway_schema_history`, container `sheltermap-db`): all 36 entries applied, `success =
true`, installed_rank 1–36, in order, V13 and V34 recorded as the Java migration class
names. The dev DB holds 62 users / 315 shelters.

**Can a fresh database be migrated cleanly?** Evidence says yes:
- every integration test spins a fresh Testcontainers `postgres:16` and applies the full
  set (the suite runs under `mvn test`; `pom.xml` pins `testcontainers.version 2.0.5`);
- the CI `docker` job builds the image and boots it against a **fresh** `postgres:16`
  service container, asserting `/actuator/health` = UP (`.github/workflows/ci.yml`);
- the dev-start.sh preflight exists precisely because a missing DB turns into a wall of
  Hikari retries — the documented failure is loud.

**Caveat (evidence gap):** that CI boot uses `SPRING_PROFILES_ACTIVE=dev`
(`ci.yml:246`) with the dev DB credentials. The **prod profile has never been booted in
CI** — first prod boot is a first-run, protected only by the guards' own (unit-tested)
refusal paths.

**Backup/restore story (documented, not implemented — §5).**
- What to back up (runbook §4): the Postgres DB (sole source of truth — registry rows are
  re-derivable by re-import, community rows are not); `data/verification-send.log` (losing
  it resets the daily verification caps); the two PII keys + `JWT_SECRET` **offline**,
  separate from the dumps (a dump without the keys is recoverable by you and useless to
  an attacker — the keys are what make it recoverable); and a secrets *manifest*.
- Procedure: `pg_dump -Fc` daily + `pg_restore` integrity check, 14+12+6 retention,
  off-host copy, monthly restore drill to a scratch DB. Restore compatibility is checked
  by the app itself: booting against the restored DB runs Flyway `validate`.
- What a restore does **not** give you: registry rows newer than the last import (re-run
  the import) and in-memory state (rate buckets, alert ring) — both self-heal.
- **Append-only migration discipline** (runbook §4, with a recorded incident): a
  comment-only edit of 14 applied migrations once took the whole API down via
  `Migration checksum mismatch` — Testcontainers never caught it because each IT starts
  from an empty DB. Rule: add a new migration, never rewrite an applied one.
- **No backup tooling exists in the repository**: `scripts/` contains only
  `commit-truthfulness-check.sh` and `spa-csp.py`; `qa/` contains checklists and demo SQL.
  No cron, no dump job, no off-host destination.

---

## 4. Build and artefacts

**What `mvn` produces.** `mvn verify` builds `target/shelter-map-0.0.1-SNAPSHOT.jar`
(~83 MB observed in `target/` on the dev machine) — a single Spring Boot fat jar carrying
the app, the migration SQL **and** the two Java migrations (they are on the classpath),
and the Swagger webjar. `verify` also runs the PMD (high) and JaCoCo floor gates; the
OWASP dependency scan runs nightly instead (`.github/workflows/ci.yml` job
`dependency-scan`, `failBuildOnCVSS=7`).

**The backend image** (`Dockerfile`, multi-stage, verified):
- stage 1: `maven:3.9-eclipse-temurin-21`, `mvn verify -DskipTests -Ddependency-check.skip=true`;
- stage 2: `eclipse-temurin:21-jre-jammy` + `curl` only; non-root user `sheltermap`;
  `WORKDIR /app`; exactly one artefact, `app.jar`; `EXPOSE 8080`;
  `HEALTHCHECK` on `/actuator/health` (`--start-period=60s` covers Flyway on a fresh DB).
- **No Node stage, no frontend in the image** — `.dockerignore` excludes `frontend/`,
  `.env`, docs, and build output. The comment states the position explicitly: "The SPA is
  built and deployed separately … the backend serves no static resources."

**How the frontend is served — verified, not assumed:** separately.
- The production build is `npm run build` = `ng build` **plus** `postbuild-csp.mjs`
  (`frontend/package.json` scripts; a bare `ng build` leaves a CSP-hostile `onload=`
  stylesheet swap — CI runs `npm run build` for this reason, `ci.yml` frontend job).
- Output: `frontend/dist/frontend/browser/` (referenced by `docs/deploy/spa-csp.md` and
  the CI/postbuild tooling).
- The SPA is deployed to a static host / reverse proxy of the operator's choice. The
  backend is the API only — with one public file-serving exception: media assets are
  served **by the API** at `GET /api/media/{filename}` (permitAll, `SecurityConfig.java:275-276`;
  unguessable 32-hex server-generated names are the access control, `MediaStorage`).
- **The production build is same-origin by default:** `frontend/src/environments/environment.ts`
  ships `apiUrl: ''` (calls the current origin; the dev build swaps in
  `environment.development.ts` via `fileReplacements`). If the API lives on a different
  origin, the origin must be baked into `environment.ts` and **rebuilt** — and this
  specific item is listed under README known gaps ("frontend prod `apiUrl ''`"), i.e.
  known and deferred, not solved.
- The dev topology to mirror in production is `frontend/proxy.conf.js`: forward
  `/api`, `/auth`, `/account`, `/verify/`, `/admin/` to the backend, and let browser
  navigations fall through to `index.html` (the `/account` route-vs-API disambiguation in
  the file header is load-bearing — a production proxy that forwards `/account`
  unconditionally breaks SPA deep links).

**The SPA's real enforcement point is a proxy header:** the CSP in `docs/deploy/spa-csp.md`
(hash-based `script-src`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, OSM tile
+ Nominatim sources) must be applied at the proxy; `python3 scripts/spa-csp.py
frontend/dist/frontend/browser/index.html` recomputes the hashes after every rebuild. The
API separately sends its own defense-in-depth headers on every response
(`SecurityHeadersFilter`: nosniff, X-Frame-Options DENY, no-referrer, CSP `default-src
'self'`, conditional HSTS).

**What a deployment package therefore contains:** the jar (or image) + `frontend/dist` +
the reverse-proxy config (TLS, CSP header, the five forwarded prefixes) + the environment
matrix (§1) + a persistent directory for `data/` (§6 B6).

---

## 5. Operational gaps — implemented vs aspirational

**Implemented (in the repository, verified):**
- **Health/readiness:** `/actuator/health` and `/actuator/info` public (permitAll,
  `SecurityConfig.java:277`); `show-details: when-authorized`; the mail health indicator
  deliberately disabled (e-mail is not the critical path — application.yml `management`
  block). Image `HEALTHCHECK` wired to it; CI asserts UP. (No separate "ready" endpoint —
  "health UP after Flyway" is the readiness story.)
- **Fail-closed boot guards:** six refusals + one warning, all verified in
  `src/main/java/ee/sheltermap/config/` — `ProdJwtGuard`, `DevSenderGuard`,
  `DataSourceCredentialGuard`, `DevEndpointsGuard`, `ApiDocsGuard`, `PiiKeys`
  (in `security/`), plus the `LoopbackXffTrustGuard` warning. This is the strongest
  operational feature the app has: a misconfigured production deploy cannot boot into a
  silent weak state.
- **Hardening headers + conditional HSTS** (`SecurityHeadersFilter`, verified line by line
  — including the trusted-proxy-only `X-Forwarded-Proto` gate and the explicit
  "NOT `server.forward-headers-strategy=framework`" decision).
- **Media boot gate:** `MediaStorage.init()` fails the boot on a non-creatable or
  non-writable directory (`MediaConfig` bean wiring).
- **Structured operational log lines** as documented in runbook §5: 401 WARNs carrying
  method+path only (never the credential), 429 WARNs with honest `Retry-After`,
  reset-reissue skips at INFO/DEBUG, masked PII everywhere (e.g. `AdminSeeder.maskEmail`,
  sender `maskPhone`). *The runbook's per-line claims were not each re-verified in code
  (§8) — the guard and header code was.*
- **Durable send log** (`data/verification-send.log`, survives restarts) and the in-memory
  admin alert ring (`GET /admin/alerts`, size `app.limits.alerts-retained`, cleared on
  restart — a current-incident view, not history).
- **Scheduled jobs:** registry import Monday 03:00 ET, retention 03:30 ET (off by
  default) — Spring `@Scheduled` cron, single instance by design.
- **CSP tooling:** `scripts/spa-csp.py` + the `postbuild` hook, both committed.
- **CI as an operational gate:** five jobs — backend (unit+IT+PMD+coverage),
  clean-checkout (guards on a fresh `git archive`), frontend (ng test + prod build),
  docker (image builds and boots, health UP), dependency-scan (nightly).

**Aspirational (documented in `docs/security/operations.md` / README, absent from the repo):**
- **Backups** — the full procedure exists on paper (§4) with zero automation: no dump
  script, no schedule, no off-host destination, no restore drill record.
- **Monitoring** — "probe every 30 s, alert on DOWN or three consecutive failures",
  alert on 401/429 bursts and ERROR/WARN volume, Twilio/SMTP dashboards: all runbook
  guidance. No APM, **no metrics endpoint** beyond actuator health (runbook §5 says so
  plainly; README known gaps: "monitoring (dev-grade config today)").
- **Log aggregation** — the app logs to stdout/stderr with Spring Boot defaults (no
  `logback*.xml` anywhere under `src/`, no `logging:` block in `application.yml` —
  verified by grep); "ship to your log aggregation" is the operator's job.
- **TLS termination** — the *app-side contract* is implemented (HSTS + the
  `X-Forwarded-Proto` trust gate), but **no edge configuration exists in the repository**:
  no nginx/caddy/ingress manifest — only the header snippets and nginx example inside
  `docs/deploy/spa-csp.md`.
- **Secret management** — the runbook says "env var **or secret-store value**"; the app
  reads only environment variables (and the repo-root `.env`, which is precisely what
  must NOT reach production). No Vault/K8s-secret integration exists.
- **Staging/production separation** — runbook §3 rules (separate DBs, separate PII keys,
  separate provider accounts, same build different env) are policy; nothing in the repo
  enforces or instantiates it.

---

## 6. The blocker list, ordered — deploy tomorrow, what breaks first

Assumed topology for ordering: the prod profile, the documented env-var matrix, one host,
a reverse proxy in front, a fresh Postgres. (The topology itself is the owner's — §7.)

**B1 — The boot guards refuse to start until the secret matrix is correct. (At boot; loud.)**
If any of `JWT_SECRET` (dev default), `DB_PASSWORD` (`sheltermap`), `PII_AES_KEY` /
`PII_HMAC_KEY` (blank), `MAIL_PROVIDER` / `SMS_PROVIDER` (`dev`) is wrong on a
non-dev/test profile, the process exits with "PRODUCTION REFUSED TO START" /
"PiiKeys fail-closed" — and a copied dev `.env` adds two more refusals
(`DEV_EMAIL_TEST_ENABLED=true`, `SPRINGDOC_ENABLED=true` are in the live `.env`).
*Evidence:* the six guard classes; `application.yml` defaults; live `.env` names.
*Smallest fix:* generate `JWT_SECRET`, `PII_AES_KEY`, `PII_HMAC_KEY`
(`openssl rand -base64 32` × 3, **fresh per environment** — never reuse the dev PII keys),
set the DB pair and both provider values explicitly, and boot against a checklist — the
guard error messages each name the exact fix.

**B2 — The deploy package carries the dev `.env`. (At boot, or silent per-variable.)**
`spring-dotenv` auto-loads a repo-root `.env` in **every** profile (`.env.example`
header; runbook §1; README item 10). Building the package from the working tree (which
contains the live 58-line `.env`) ships real SMTP/Twilio credentials into production and
fills every variable the environment does not set with local dev values — the guards
catch the senders/diagnostics/docs, **not** the SMTP credentials, `DB_URL`, CORS, or the
loopback trust. *Smallest fix:* build from a clean checkout / the Dockerfile context
(already excludes `.env` via `.dockerignore`) and set every variable explicitly in the
environment.

**B3 — Rate limiting and HSTS break behind a non-loopback proxy. (First real traffic.)**
`RATELIMIT_TRUSTED_PROXIES` defaults to empty: without it, every user behind the proxy
shares the proxy's IP in the per-IP buckets — the shared login bucket
(`login-ip-capacity: 20`, ~20/min for the **whole site**) and the session bucket drain on
aggregate traffic and healthy users get 429 on login/refresh; `X-Forwarded-Proto` is
ignored, so HSTS never fires. `trust-loopback` defaults `true` (a boot warning only).
*Evidence:* `application.yml` defaults; `ClientIps`/`SecurityHeadersFilter` trust gate;
`LoopbackXffTrustGuard` text. *Smallest fix:* set `RATELIMIT_TRUSTED_PROXIES` to the edge
IP(s) and `RATELIMIT_TRUST_LOOPBACK=false` behind a real LB — or make the proxy loopback
on the app host, where the default is correct. (Topology-dependent — §7.)

**B4 — A split-origin frontend is dead in the browser. (First real traffic, if split origin.)**
With the SPA on a different origin than the API and `CORS_ALLOWED_ORIGINS` left at the
localhost default, every API call is blocked preflight; the site looks dead while the
server only sees 403s. The same-origin alternative (proxy forwards the five API prefixes,
`apiUrl: ''`) avoids CORS entirely and is the documented default — but then the proxy must
forward `/api`, `/auth`, `/account`, `/verify/`, `/admin/` **and** respect the
`/account` route-vs-API rule from `proxy.conf.js`. *Smallest fix:* pick same-origin, or
set `CORS_ALLOWED_ORIGINS` to the exact public origin — and if split-origin, rebuild the
SPA with `apiUrl` set (known gap, §4).

**B5 — No admin means the trust layer is inert — and the runbook's admin-rotation line is wrong. (First report, first moderation need.)**
Without `ADMIN_EMAIL`/`ADMIN_PASSWORD` set **before first boot**, no ADMIN row ever
appears: shelter reports, hides, info requests, guidance publishing and `/admin/alerts`
all 403 for everyone, forever — the community trust layer runs unmoderated. Worse, the
seeder is create-if-absent and **never re-hashes**: the runbook incident line "Change
`ADMIN_PASSWORD` + restart (the seeder is idempotent…)" does **not** rotate an existing
admin's password (the row is left untouched by design — `AdminSeeder.run`, verified).
*Evidence:* `AdminSeeder.java`; `operations.md` §6 line 2. *Smallest fix:* set both vars
before first boot; for future rotation, delete the row (or update its credentials
directly) and re-seed. Flag the runbook line for correction in a later lane (read-only
here).

**B6 — `data/` is not persistent: media and the anti-spam log die with the container. (First redeploy.)**
Both defaults are relative (`data/media`, `data/verification-send.log`); in the image
that is `/app/data` under the non-root `sheltermap` user — created successfully at boot
(the fail-closed gate passes) and lost on every container replacement: guidance media
404, verification daily caps silently reset (the abuse valve weakens), audit-relevant
send history gone. *Evidence:* `application.yml` defaults; `Dockerfile` (`WORKDIR /app`,
`USER sheltermap`, no volumes); `MediaStorage.init`; `.gitignore` (the dev `data/` is
local). *Smallest fix:* a volume (or host mount) + absolute `MEDIA_UPLOAD_DIR` and
`VERIFICATION_SEND_LOG_PATH` — and include both in the backup set (runbook §4 already
lists the send log).

**B7 — The map is empty until the registry import runs — and it needs outbound egress. (Day one → first Monday 03:00 ET.)**
A fresh DB has no registry rows; `run-on-startup: false`; there is no HTTP trigger — the
one-shot import is a restart with `--app.registry.run-on-startup=true`
(`dev-start.sh --run-registry` is the dev form). Until then the public map shows only
community submissions. The import also phones home to `opendata.smit.ee` — a host that
blocks egress gets a silent (logged) import failure every Monday, and official data never
updates. *Smallest fix:* run the import once at deploy time and allow egress (or set
`REGISTRY_BASE_URL` / disable the schedule deliberately).

**B8 — Verification delivery can silently fail while the app is healthy. (First new user.)**
Unlike Twilio (fail-fast), the SMTP path has no credential fail-fast:
`MAIL_PROVIDER=smtp-pulse` with a bad `SMTP_FROM` (unverified sender domain — the `.env`
documents the `554 5.9.2` rejection) or weak credentials bounces every code while the
health endpoint stays UP; new users can register but can never verify, and the write path
(verified-only by design) stays closed to them. *Smallest fix:* before first boot, send a
real code to a test address (the dev `/dev/email-test` is the tool for exactly this — it
will be off in production, so do it once in staging/dev against the production
credentials), and confirm a real Twilio send the same way.

**B9 — Nothing is backed up, and the PII keys do not exist yet. (Day one, background — becomes fatal at first loss.)**
No dump job, no off-host copy, no offline key backup: the moment production holds user
PII, a disk loss or a lost key is unrecoverable (a dump without the keys is useless; a
lost key makes accounts unloginable by contact). *Smallest fix:* do the runbook §4 set
**before or immediately after first boot** — `pg_dump -Fc`, the send log, and the three
generated keys to an offline store; schedule the daily cadence and one restore drill.

**B10 — The production-profile boot has never been proven end-to-end. (Confidence gap, not a break.)**
CI boots the image with `SPRING_PROFILES_ACTIVE=dev` (`ci.yml:246`); the prod-profile
path is exercised only by the guards' unit tests. *Smallest fix (repo change — recommend,
do not do in this lane):* point the CI docker job at a `prod` profile run with
generated-but-valid secrets (the job already generates PII keys with `openssl rand`).

---

## 7. Questions that are the owner's (posed, not answered)

1. **Host, domain and edge.** Which machine/VM, which domain(s), and which edge
   (nginx / caddy / ingress, same-host vs cloud LB)? This single answer sets
   `RATELIMIT_TRUSTED_PROXIES`, `RATELIMIT_TRUST_LOOPBACK`, the HSTS behaviour (B3), and
   the TLS-termination config that does not exist in the repo (§5).
2. **Same-origin or split-origin frontend?** Decides whether CORS matters at all and
   whether the SPA must be rebuilt with `apiUrl` (B4).
3. **E-mail provider for production.** Keep smtp-pulse (a personal relay — is that
   acceptable for production volumes/sender reputation?) or a real provider? Whichever:
   which **verified sender domain** goes into `SMTP_FROM`?
4. **Twilio.** Reuse the account in the dev `.env`, or a separate production account
   (the runbook says environments should have separate provider credentials)?
5. **Admin identity.** Which e-mail owns the admin account (`ADMIN_EMAIL` is a live login
   contact), and who else should be able to reach `/admin/*` (only one admin can be
   seeded; more requires a product decision — the seeder creates exactly one kind).
6. **Database hosting.** The app assumes a reachable Postgres 16 with a dedicated user;
   the compose file is explicitly dev-only. Managed service, self-hosted container, or
   the same host? (Also sets the backup destination — §7.7.)
7. **Backup destination and cadence.** Where does the off-host copy live, and is the
   runbook floor (daily + off-host + monthly restore drill) accepted?
8. **Retention.** Enable `RETENTION_ENABLED` in production, and at what horizons?
   (Product/legal — the shipped default is off, 24/24 months if on.)
9. **Registry egress.** May production make outbound calls to `opendata.smit.ee` on a
   weekly schedule, or should the import be disabled/redirected?

(For context only, **not re-litigated** — decided in `docs/closing-decisions-2026-09-24.md`:
the Spring CVEs are suppressed until the Boot 4 migration, which is the owner's future
project; the suppression entries are dated.)

---

## 8. Unverified / could not be verified from the repository

- **Prod-profile end-to-end boot** — CI only proves the dev profile (§6 B10). The
  production first boot is a first-run.
- **SMTP credential fail-fast** — verified *absent* by grep of `SmtpPulseSmtpSender`
  (bean wired by `@ConditionalOnProperty` only; no credential check found), but the exact
  runtime behaviour of a send with blank credentials was not exercised.
- **Runbook log-line claims** (401/429 WARN shapes, reset-skip levels, alert ring
  contents) — `operations.md` is precise and consistent with the code read here, but each
  log line was not audited individually.
- **Live `.env` secret values** — deliberately not read; only variable names and
  non-secret values were observed (58 lines; names listed in §2 context).
- **Current CI green state on this exact commit** — the workflow definitions were read;
  recent run results were not (closing decision #3 records an invalid `gh` token, which
  is why CI logs have had to be reproduced by hand).
- **`frontend/dist` layout** — `dist/frontend/browser/` is taken from the committed
  tooling's reference (`docs/deploy/spa-csp.md`, postbuild script); no build was run in
  this lane.
- **Threat-model content** — read by targeted search (single-instance residual W16, the
  documented `localStorage` refresh-token residual, the MITIGATED-RESIDUAL status
  register), not line by line; nothing in this report contradicts it.
- **Performance headroom** — pool sizing, timeouts and bucket math are all explicitly
  configured and commented for a single instance; no load test of the deployed shape
  exists in the repository (consistent with the "stability and performance first" rule,
  but a deploy-time profile would be the owner's call).

---

### One-paragraph summary

The app is unusually honest about deployment: every secret-critical default is
fail-closed at boot (six guards, verified in code), the schema path is proven on fresh
databases in CI, and the runbook, secrets matrix and CSP tooling already exist. What a
real deployment still needs is the *surrounding* system that development never had: a
correct, explicit env-var matrix with per-environment generated keys (B1), a package that
does not carry the dev `.env` (B2), an edge with TLS + `RATELIMIT_TRUSTED_PROXIES` + the
CSP header (B3/B4/B10-§5), an admin provisioned at first boot (B5), a persistent `data/`
volume (B6), a first registry import plus egress (B7), a verified verification-delivery
path (B8), and backups with an offline key backup that exist **before** the first
production data does (B9). Everything in §7 is a decision only the owner can make.
