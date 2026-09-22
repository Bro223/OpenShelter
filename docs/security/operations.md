# OpenShelter operations runbook (roadmap M15)

Written 2026-09-13 (M15 slice 1). Companion to `threat-model.md` — that
document says *what* defends the system, this one says *how to run it*:
environments, secrets, staging-vs-production separation, backups,
monitoring, and the incident quick-list. Keep this file updated whenever
an env var, guard or endpoint changes.

## 1. Environments and the fail-closed boot guards

The app is **fail-closed at boot** via five guards (do not "fix" a
refused boot by loosening a guard — make the environment correct instead):

| Guard | Refuses to boot when | Why |
|-------|----------------------|-----|
| `ProdJwtGuard` | active profile is not `dev`/`test` **and** `JWT_SECRET` is the published dev default or < 32 bytes | a misconfigured deploy cannot start with a weak JWT secret |
| `DevEndpointsGuard` | the `/dev/email-test` or `/dev/sms-test` diagnostics are enabled on a non-dev/test profile | a public deploy cannot start as an open e-mail/SMS relay |
| `DevSenderGuard` | the active profile set is not entirely `dev`/`test` **and** either `app.mail.provider` or `app.sms.provider` is still the `dev` console sender | a deploy cannot start with a console sender that logs every code in plaintext |
| `ApiDocsGuard` | `SPRINGDOC_ENABLED` is on outside `dev`/`test` | the generated documentation surface cannot be exposed by accident |
| `PiiKeys` | `PII_AES_KEY` / `PII_HMAC_KEY` are missing or not 32-byte base64 | the app cannot do its PII-at-rest job without real keys |

Profile usage:

- **dev** — `SPRING_PROFILES_ACTIVE=dev` (pinned by `dev-start.sh`), the
  local `.env` (gitignored) carries SMTP/Twilio credentials and enables
  the `/dev/*` diagnostics. Dev-only: the compose Postgres with the
  published dev credentials, the `csv` registry import against the live
  open-data URL, the console senders if `.env` doesn't override.
- **test** — the Maven test classpath profile; ITs run on Testcontainers
  (or `-Dit.db.url=...` for a CI sandbox) with the fixed test PII keys.
  The guards treat it as dev-parity.
- **production** — any other profile (e.g. `prod`): all three guards are
  active, the dev diagnostics are off, real providers must be
  explicitly configured. There is **no** `prod` application.yml —
  production is the base `application.yml` + environment, so a missing
  env var surfaces as a boot failure or a safe default, never a silent
  weak config.

**`.env` must not reach production.** `spring-dotenv` auto-loads a
repo-root `.env` in **every** profile, so any variable the production
environment does not set silently takes the local dev value from the
file — the boot guards catch the dev console senders, the dev
diagnostics and springdoc, but not, e.g., the dev SMTP
relay/credentials or a localhost `DB_URL`. Deploy without a `.env` (or
remove it from the deploy directory) and set every variable explicitly
in the environment/secret store; a shell-exported variable wins over a
`.env` value either way.

## 2. Secrets — env-only matrix

Everything sensitive is an environment variable (or secret-store value).
None of these may ever appear in the repo, the compose file, or a log
line.

| Variable | Used by | Notes |
|----------|---------|-------|
| `JWT_SECRET` | `app.jwt.secret` | ≥ 32 bytes, unique per environment, fail-closed outside dev/test |
| `PII_AES_KEY` | `app.pii.aes-key` | 32-byte base64, `openssl rand -base64 32`, **unique per environment**, offline backup mandatory |
| `PII_HMAC_KEY` | `app.pii.hmac-key` | same as above; rotates together with the AES key (README "PII at rest" D6) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | `app.admin.*` | BOTH set = an admin is seeded at startup; both empty = no admin exists. Strong password; rotate on exposure |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | datasource | production DB: dedicated user, no `postgres` superuser, strong password |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM` | e-mail | `MAIL_PROVIDER=smtp-pulse` to go live; `SMTP_FROM` must be a verified sender |
| `SMS_PROVIDER=twilio` + `TWILIO_*` | SMS | the sender fails fast at boot with missing credentials (no silent no-op) |
| `CORS_ALLOWED_ORIGINS` | CORS | the **exact** public origin(s) of the frontend — never `*`-like lists in prod |
| `RATELIMIT_TRUSTED_PROXIES` / `RATELIMIT_TRUST_LOOPBACK` | rate-limit keys | set to your proxy IP(s) behind a reverse proxy; loopback trust must be OFF behind a real LB |
| `REGISTRY_BASE_URL` / `REGISTRY_CLIENT` / `REGISTRY_OFFICIAL_URL` | open-data import | `csv` is the default client (M5) |

Generate/rotate: `openssl rand -base64 32` (PII keys, JWT secret). Lost PII
key = affected accounts unloginable by contact — the offline key backup is
the single most valuable artifact in this system.

## 3. Staging vs production separation

- **Separate databases, always.** Staging and production must never share a
  Postgres cluster/instance. Reason: the PII keys are per-environment
  (below), and a staging DB seeded from production data would carry
  production ciphertext.
- **Separate PII keys, always.** `PII_AES_KEY`/`PII_HMAC_KEY` must differ
  between staging and production. Consequence, stated once: data cannot be
  copied between environments as ciphertext (a staging row is undecryptable
  in production and vice versa). If a production-like dataset is needed in
  staging, import the *official registry CSV* (no PII) — do not copy user
  rows.
- **Separate provider accounts/credentials** (Twilio, SMTP): a staging bug
  or a staging abuse test must not burn production sender reputation or
  quota. The per-contact caps are in-memory per process, so they do not
  coordinate across environments anyway.
- **Never publish the database port.** `docker-compose.yml` maps `5432:5432`
  for local work; for anything reachable beyond localhost, bind `127.0.0.1`
  (`"127.0.0.1:5432:5432"`) or drop the published port entirely — the
  compose credentials are the published dev defaults.
- **Same build, different env.** Deploy the same artifact to staging and
  production; only the environment differs (profile, env vars, proxy
  config). Staging should run the production profile (`prod`), not `dev` —
  running staging on `dev` silently enables the diagnostics and the weak
  secret exemption, which is exactly the misconfiguration the guards
  exist to stop.
- **Per-environment CORS + trusted proxies.** Each environment sets its
  own `CORS_ALLOWED_ORIGINS` and `RATELIMIT_TRUSTED_PROXIES`; a staging
  origin must never appear in production's list.
- **TLS + HSTS at the edge.** Terminate TLS in front of the app. The app
  sends `Strict-Transport-Security` when the client's connection was
  secure: directly (`request.isSecure()`) or via a TRUSTED proxy that
  terminated TLS and tagged the original scheme with
  `X-Forwarded-Proto: https` (`SecurityHeadersFilter` honors that header
  ONLY when the direct peer is in `RATELIMIT_TRUSTED_PROXIES` — or a
  trusted loopback — the same hop-by-hop trust gate as the rate-limit IP
  keying; an untrusted client sets it freely, so it is ignored). Set
  `RATELIMIT_TRUSTED_PROXIES` to the edge's IP: in the documented
  edge-terminates-TLS deployment the edge forwards plain HTTP, where
  `isSecure()` alone is never true and HSTS would otherwise never fire.
- **The single-instance constraint is per environment** (in-memory
  rate limits + alert ring, W16 — see `threat-model.md` residual 1).
  Staging may be its own single instance; it does not dilute production's
  buckets, and production must remain one process.

## 4. Backups

**What to back up:**

1. **PostgreSQL** — the sole source of truth for community rows, accounts,
   PII ciphertext, audit trails. Registry rows are re-derivable (re-run the
   import from the open-data CSV) but community data is not — the DB is
   the backup, full stop.
2. **`data/verification-send.log`** — the file-backed anti-spam send log
   (user id + level + timestamp — the raw contact is deliberately not persisted; survives
   restarts). Small, local, gitignored.
   Losing it resets the daily verification caps (abuse valve weakened
   until the window slides past) — back it up with the DB, same cadence.
3. **The two PII keys + the JWT secret** — OFFLINE (encrypted password
   manager / sealed envelope), separate from the DB backups. A DB dump
   without the keys is useless to an attacker *and* to you; the keys are
   what make the dump recoverable.
4. **The environment/secret-store config** — the variable *names* and
   non-secret values (a secrets manifest, not the secrets).

**Procedure (daily, minimum):**

```sh
# dump (custom format — compresses, supports parallel restore)
pg_dump -Fc -h <db-host> -U <db-user> -d sheltermap -f /backup/sheltermap-$(date +%F).dump
# integrity check of the newest dump (restore to a scratch DB weekly at least)
pg_restore -d sheltermap_restore_check -n public /backup/sheltermap-$(date +%F).dump
# the send log
cp data/verification-send.log /backup/verification-send-$(date +%F).log
```

- **Cadence/retention (recommended):** daily dumps, 14 daily + 12 weekly +
  6 monthly retained; keep at least one copy off-host. Tune to the
  deployment, but "daily + off-host copy" is the floor.
- **Restore drill:** do one real restore to a scratch database monthly;
  an untested backup is a hope, not a backup. After any restore, the app
  must boot against it (Flyway `validate` will confirm schema
  compatibility at start).
- **What a restore does NOT give you:** registry rows newer than the last
  import (re-run the import), and any in-memory state (rate buckets, alert
  ring) — both self-heal.

### Migration files are append-only — do not edit an applied migration

Flyway stores a **checksum of every migration file** in
`flyway_schema_history`. Editing a file that a database has already applied —
comments included, since the checksum covers the whole file — makes that
database refuse to boot with `Migration checksum mismatch for migration
version N`, and the app exits before serving a single request.

This actually happened: a comment-cleanup pass touched 14 migrations
(V1, V3, V5, V8, V9, V12, V14–V21) after the dev database had applied them,
so the next restart failed and took the whole API down for every client.
Tests never caught it — Testcontainers always starts from an empty database,
so it applies the edited files and records their new checksums, which is
self-consistent and green.

So: **add a new migration; never rewrite an applied one.** If a file has
already been edited, the database's history is the source of truth — the file
must be restored to the bytes that built it, or the history repaired:

```bash
# Restore the applied bytes (preferred when the edit was cosmetic):
git log --oneline -- src/main/resources/db/migration/V7__shelter_created_by.sql
git checkout <last-good-rev> -- src/main/resources/db/migration/V7__shelter_created_by.sql
```

`flyway repair` rewrites the stored checksums to match the current files and
is the right tool when the SQL itself intentionally changed — but it requires
the Flyway CLI or plugin (neither ships with this repo) and, unlike restoring
the file, it does not prove the database still matches what the file claims.

## 5. Monitoring

The app ships **no APM and no metrics endpoint** beyond actuator health —
monitoring is health-probe + logs + the admin alert ring:

1. **Health probe.** `GET /actuator/health` (anonymous, details
   suppressed for unauthenticated callers). Probe every 30 s; alert on
   DOWN or on three consecutive failures. `GET /actuator/info` is also
   public (app metadata only).
2. **Logs** (the app logs to stdout/stderr — ship to your log
   aggregation):
   - **Auth failures (401):** every unauthenticated request on a protected
     route (missing / invalid / expired / a suspended account's token —
     the security entry point) and every rejected credential (wrong
     password, wrong profile password, a bad refresh token — the error
     handler) logs one `401` WARN carrying the method + path only, never
     the presented credential, e-mail or token. A burst is a
     credential-stuffing or token-spray attempt.
   - **Throttles (429):** every rate-limited response logs one `429 <kind>`
     WARN — token-bucket (login, reset, registration, verify,
     contact-change, geo, and the refresh + logout session bucket), the
     per-user report throttle, the verification / contact-change daily
     cap, and the shelter-submission daily cap. Token-bucket, report and
     daily-cap throttles carry an honest `Retry-After` (whole seconds);
     a 429 with NO `Retry-After` is a never-refilling bucket — once
     drained it is drained. A burst means an abuse attempt or a
     provider-outage retry storm.
   - **Reset re-issue skips:** the per-UTC-day cap skip is logged at INFO
     (a spike on one e-mail is a reset-flow abuse attempt); the 60 s
     cooldown skip is logged at DEBUG (routine, not a signal).
   - Registry import runs (Monday 03:00 Europe/Tallinn): alert if an
     import is not `OK`/`NOT_MODIFIED` — a broken import silently stops
     official data updating.
   - Any `ERROR`/`WARN` line: alert on volume, not just presence.
3. **Admin alert ring.** `GET /admin/alerts` (admin-only, in-memory,
   newest first, `app.limits.alerts-retained` size) aggregates the
   throttle (429) and repeat-report (409) events. It is process memory —
   cleared on restart (W16) — so treat it as a *current-incident* view,
   not history: persist what you read if it matters.
4. **Provider-side dashboards.** Twilio (SMS failure rate, balance) and
   the SMTP dashboard (bounce/reject rate) — a sender that suddenly bounces
   everything shows up there before it shows up in the app.

## 6. Incident quick-list

| Incident | Immediate action |
|----------|------------------|
| Suspected **PII key** exposure | Rotate BOTH PII keys (AES + HMAC together, in one migration pass per README D6) + rotate `JWT_SECRET`; until the re-encryption migration lands, old-slot rows stay decryptable under their tag — plan the downtime accordingly. Until tooling exists (README D6: deliberately not built until scheduled), rotation is a manual re-encrypt migration — schedule it, don't improvise it. |
| Suspected **admin credential** exposure | Change `ADMIN_PASSWORD` + restart (the seeder is idempotent; the existing row keeps its id) + review `moderation_actions` + `shelter_history` for the exposure window. |
| Suspected **JWT secret** exposure | Rotate `JWT_SECRET` + restart — every outstanding access/refresh token dies (15 min / 30 days) — acceptable, state it. |
| **DB compromised/exposed** | Rotate DB password, take the DB offline, assess from the dump what leaked (PII is ciphertext — the keys are the question, see first row), restore from the last clean backup, re-run the registry import. |
| **SMS/e-mail abuse in progress** | The per-contact cap already bounds volume; identify the contact(s) from the 429 log lines + the admin alert ring; the durable send log shows the volume; worst case, flip the provider to `dev` (console) temporarily — verification sends stop, but so does the abuse. |
| **Bad data on the map (live emergency)** | Admin: mark inaccurate / request info / hide / delete (all audited); the provenance + "reported (n)" surfaces carry the warning until then. |
