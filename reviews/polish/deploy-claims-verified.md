# Deploy claims — empirically verified

**Lane:** DEPLOY-CLAIMS-VERIFY (read-only; no tracked file changed; no commit made)
**Branch:** `feature/frontend` @ `0232b1d` (checked out; `polish-work` points at the same commit, clean tree at lane start)
**Date:** 2026-09-28/29 (23:45–00:20 EEST)
**Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` — rule 7 honored: **this lane never ran Maven**; it booted the pre-built fat jar. (One incident, §9, where this lane was the *victim* of another lane's `mvn clean`.)
**Report under test:** `reviews/polish/deploy-readiness.md` (the DEPLOY-READINESS lane's report)

**Owner's instruction, verbatim:** "both seemed to work fine, make sure that there is really something that needs to be fixed or those are just false assumptions."

**Verdict in one line:** every claim tested was **CONFIRMED**. The owner's suspicions in B8 (SMTP silent bounce), B2 (copied `.env` trips the guards), and the guard set were **real defects / real mechanisms, not false assumptions**. Nothing in the tested set was refuted. Two orderings and two scope notes below.

**Method.** 14 boots of the app from scratch working directories (`/tmp/deploy-claims/run/<test>` — outside the repository), each with a controlled env matrix, plus one socket-level fake SMTP relay I ran on 127.0.0.1, plus two scratch Postgres roles/databases created **inside the existing dev `sheltermap-db` container** and dropped again afterwards. The live dev server (java pid 1449084 on :8080, `ng serve` pid 383842 on :5173, up 19 h at lane start) was **never stopped** — all test boots ran on :18080 against the scratch databases, so the live app and its live `sheltermap` DB were untouched. After teardown I re-confirmed :8080 → `{"status":"UP"}` and :5173 → 200, and that the original PIDs still own the ports.

**Secrets hygiene.** No secret value was printed, copied, or recorded. All credentials used in tests are values **I generated or invented** (flagged *fake* below) or the published dev defaults that are committed in the repo (`application.yml`, `docker-compose.yml`). The live `.env` was examined via a scratch copy in `/tmp` — **key names and two boolean flags only**.

**Boot harness (exact mechanism, so every command below is reproducible).**
`/tmp/deploy-claims/boot-test.sh <test> [KEY=VAL …]` sources a per-test env file (base matrix + overrides) in a fresh cwd and runs:

```text
nohup java -jar /home/aleks/MyScripts/LocalRepos/OpenShelter/target/shelter-map-0.0.1-SNAPSHOT.jar > boot.log 2>&1 &
```

then reports `STARTED` (log contains `Started ShelterMapApplication`) or `REFUSED` (process exited).

**Base matrix** (`/tmp/deploy-claims/base.env`, all values generated/invented in this lane):

| Var | Value |
|---|---|
| `SPRING_PROFILES_ACTIVE` | `prod` |
| `SERVER_PORT` | `18080` |
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | scratch role/db in the dev container, generated password |
| `JWT_SECRET`, `PII_AES_KEY`, `PII_HMAC_KEY` | `openssl rand -base64 32` (fresh, never reused from anywhere) |
| `MAIL_PROVIDER` / `SMTP_HOST` / `SMTP_PORT` | `smtp-pulse` / `127.0.0.1` / `2525` (my fake relay) |
| `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM` | *fake-smtp-login* / *fake-smtp-password-not-real* / `deploy-verify@unverified.example` |
| `SMS_PROVIDER` / `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | `twilio` / *ACdeployclaimverify000000000000001* / *fake-twilio-token-not-real* / `+15550001111` — all dummy; the Twilio bean is created but **no network call to Twilio is ever made** (send-only at request time, and no test triggered an SMS) |
| `DEV_EMAIL_TEST_ENABLED` / `DEV_SMS_TEST_ENABLED` / `SPRINGDOC_ENABLED` | `false` / `false` / `false` |

**Jar provenance.** The jar used for boots T1–T11 was built 23:16; HEAD `0232b1d` (23:52) differs from that tree by exactly one backend file, `ApiErrorHandler.java`, whose diff (`git show 0232b1d -- …/ApiErrorHandler.java`) is a comment plus a hardening `throw` in a branch the comment declares unreachable — not on any path tested here. A concurrent lane's `mvn clean verify` rebuilt the jar at 00:10; boots T12–T13 used the fresh jar. (See §9 for the incident.)

---

## 1. "SMTP does not fail fast — a bad sender silently bounces every verification mail while health stays green." — **CONFIRMED (real defect)**

Three failure classes were exercised, each against a **real TCP session or real connection attempt** — nothing imagined. What I replaced the real vendor (smtp-pulse.com:587) with: a **socket-level listener I ran myself** (`/tmp/deploy-claims/fake-smtp.py`, Python, 127.0.0.1:2525) that speaks just enough SMTP (220/EHLO/AUTH LOGIN/MAIL FROM/…) and rejects `MAIL FROM` with the exact error the repo's `.env`/`application.yml` comments document: `554 5.9.2 Sender domain is not valid`.

**Setup (common):** `prod` profile, `MAIL_PROVIDER=smtp-pulse`, scratch DB (so all six guards pass and the boot is otherwise a normal deploy shape), then the real user flow that triggers a verification mail: `POST /auth/register` → `POST /auth/login` → `POST /verify/request {"level":"EMAIL"}` (the same code path a real new user's verification mail takes — `VerificationService.requestVerification` → `EmailVerificationProvider` → `SmtpPulseSmtpSender`).

### 1a. Rejected sender (the documented `554 5.9.2` bounce)

Command: relay started with `python3 fake-smtp.py reject-sender 2525`; boot `boot-test.sh t9b-smtp-rejected` (base matrix, i.e. fake credentials that the relay **accepts**, `SMTP_FROM=deploy-verify@unverified.example`).

Observed — the relay's wire transcript (`fake-smtp/session.log`):

```text
client: AUTH LOGIN            → relay: 334 VXNlcm5hbWU:
client: ZmFrZS1zbXRwLWxvZ2lu  → relay: 334 UGFzc3dvcmQ6
client: ZmFrZS1zbXRw…         → relay: 235 2.7.0 Authentication successful
client: MAIL FROM:<deploy-verify@unverified.example>
relay:  554 5.9.2 Sender domain is not valid
```

Observed — API answers:

```text
register: HTTP 201 (empty body)
login: HTTP 200 (token issued)
verify-request: HTTP 202 body={"resendAvailableAfterSeconds":60}
```

Observed — app log (`run/t9b-smtp-rejected/boot.log:59`):

```text
ERROR … e.s.verification.SmtpPulseSmtpSender : SMTP delivery to d***@deploy-claims.local failed
org.springframework.mail.MailSendException: Failed messages:
  org.eclipse.angus.mail.smtp.SMTPSendFailedException: 554 5.9.2 Sender domain is not valid
```

Observed — `curl http://localhost:18080/actuator/health` **after** the failed send: `HTTP 200 {"status":"UP"}`.

### 1b. Missing SMTP credentials (blank `SMTP_USERNAME`/`SMTP_PASSWORD`)

Command: `boot-test.sh t9a-smtp-unreachable SMTP_PORT=2599 SMTP_USERNAME= SMTP_PASSWORD=` (nothing listens on 2599). The app **started fine** — no fail-fast for missing SMTP credentials (the guards only check the provider name, not the credentials). Same user flow:

```text
verify-request: HTTP 202 body={"resendAvailableAfterSeconds":60}
```
App log: `ERROR … SMTP delivery to d***@deploy-claims.local failed` + `org.springframework.mail.MailAuthenticationException: Authentication failed` (with `mail.smtp.auth: true` and a blank username, JavaMail refuses at the auth stage). Health afterwards: `HTTP 200 {"status":"UP"}`.

### 1c. Valid credentials, genuinely unreachable host

Command: `boot-test.sh t13-smtp-connrefused SMTP_PORT=2599` (fake credentials, nothing listening). Same user flow → `HTTP 202 {"resendAvailableAfterSeconds":60}`; app log:

```text
ERROR … SMTP delivery to d***@deploy-claims.local failed
org.springframework.mail.MailSendException: Mail server connection failed.
  org.eclipse.angus.mail.util.MailConnectException: Couldn't connect to host, port: 127.0.0.1, 2599; timeout 5000;
  nested exception is: java.net.ConnectException: Connection refused
```

Health afterwards: `HTTP 200 {"status":"UP"}`.

**What it means.** The claim is exactly right, in all three variants: boot succeeds with any SMTP configuration (no credential fail-fast — the explicit contrast with Twilio in §2 holds), every verification mail is refused, the refusal is visible **only** in server logs (plus the in-memory admin alert ring via `alerts.codeSendFailure`, which needs an admin and dies on restart), the HTTP API still answers a friendly `202 {"resendAvailableAfterSeconds":60}`, and `/actuator/health` stays `UP` (the mail health indicator is deliberately disabled — `management.health.mail.enabled: false` in `application.yml`). New users can register and can never verify, while every external signal says "healthy." **This is a real defect to fix before deploy** — the report's B8 smallest fix (send one real code to a test address before first boot) is the right mitigation; note the `/dev/email-test` diagnostic cannot be used for it in production (flag refused by `DevEndpointsGuard` there, confirmed in §4).

---

## 2. "Twilio fails fast at boot on missing credentials." — **CONFIRMED (works as designed)**

Command (half-configured #1 — token missing): `boot-test.sh t1a-twilio-missing-token SPRING_PROFILES_ACTIVE=dev SMS_PROVIDER=twilio TWILIO_AUTH_TOKEN=` (dev profile = guard-exempt, so Twilio's own check is the only thing that can stop the boot; scratch DB valid, so nothing else can stop it).

Result: `RESULT: REFUSED`. Exact exception (`run/t1a-twilio-missing-token/boot.log:158`):

```text
Caused by: java.lang.IllegalStateException: app.sms.provider=twilio requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (see .env)
	at ee.sheltermap.verification.TwilioSmsSender.newApiOrFail(TwilioSmsSender.java:71)
	at ee.sheltermap.verification.TwilioSmsSender.<init>(TwilioSmsSender.java:54)
```

**When it happens:** during context refresh, ~7 s after start, as `BeanCreationException: Error creating bean with name 'twilioSmsSender' … Constructor threw exception` → `Application run failed`. `grep -c 'Tomcat started' boot.log` → **0**: the web server never starts, so there is no port and no health endpoint to be "green."

Command (half-configured #2 — no service SID and no sender number): `boot-test.sh t1b-twilio-missing-sid SPRING_PROFILES_ACTIVE=dev SMS_PROVIDER=twilio TWILIO_FROM= TWILIO_MESSAGING_SERVICE_SID=` → `REFUSED`, `boot.log:120`:

```text
Caused by: java.lang.IllegalStateException: app.sms.provider=twilio requires TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM (see .env)
```

**What it means.** The report's claim (and the "contrast Twilio, below" in its §1.4) is correct: both missing-credential branches refuse boot at bean creation, before any listener exists. Twilio is the honest channel; SMTP is not. (No real Twilio API call was made — the bean constructs an SDK client without network I/O, and no test triggered an SMS send.)

---

## 3. "`spring-dotenv` loads the dev `.env` in every profile, so a prod-profile boot would pick up dev secrets and trip the guards." — **CONFIRMED (real defect for copy-`.env` deploys)**

Command: working dir `/tmp/deploy-claims/run/t8-dotenv/` containing a **scratch `.env` with exactly two non-secret marker lines** (the repo `.env` was never read for values):

```text
DEV_EMAIL_TEST_ENABLED=true
SPRINGDOC_ENABLED=true
```

The process environment for this boot was the base matrix **with all three of those variables removed** (`grep -c 'DEV_EMAIL_TEST\|SPRINGDOC' run/t8-dotenv/env-overrides` → 0), so the only possible source of those values is the `.env` file. Boot: `ENV_FILE=t8.env boot-test.sh t8-dotenv` (prod profile, everything else valid).

Result: `RESULT: REFUSED`, `boot.log`:

```text
ERROR … ee.sheltermap.config.ApiDocsGuard : REFUSING TO START — OpenAPI documentation
  springdoc.api-docs.enabled + springdoc.swagger-ui.enabled enabled on a non-dev/test profile:
  active profiles=[prod].
Caused by: java.lang.IllegalStateException: PRODUCTION REFUSED TO START: OpenAPI documentation …
```

**What it means.** Under `SPRING_PROFILES_ACTIVE=prod`, the working-directory `.env` was loaded and its values drove a boot refusal — spring-dotenv (v4.0.0 in `pom.xml`) is profile-blind, exactly as `README.md:821` and `.env.example` header state. Corollaries, also checked from a scratch copy of the **live** dev `.env` (names + non-secret booleans only): it really does carry `DEV_EMAIL_TEST_ENABLED=true`, `DEV_SMS_TEST_ENABLED=true`, `SPRINGDOC_ENABLED=true`, `MAIL_PROVIDER=smtp-pulse`, `SMS_PROVIDER=twilio` — so a deploy package built from this working tree would be refused by the guards on exactly the flags I demonstrated; and it carries **no** `DB_URL`/`DB_PASSWORD`/`JWT_SECRET`/`CORS_*` keys, so those would silently fall back to the yml dev defaults (the B2 "guards catch the flags, not the rest" split). Precedence note: shell-exported variables win over `.env`, so variables the environment *does* set are safe — the hazard is precisely the variables it doesn't set.

---

## 4. "Six fail-closed boot guards refuse to start a misconfigured deployment." — **CONFIRMED, each demonstrated individually**

Each test: prod profile, the full valid matrix (fresh keys, valid scratch DB, real senders configured with dummy-but-present credentials, all flags off) with **exactly one** guard's condition armed. Every boot exited with the guard's `PRODUCTION REFUSED TO START` refusal.

| # | Guard (class) | Condition armed | Exact boot command (override) | Observed refusal |
|---|---|---|---|---|
| 1 | `ProdJwtGuard` | `JWT_SECRET` = the published dev default | `boot-test.sh t2-prodjwt JWT_SECRET=dev-only-secret-change-me-sheltermap-0123456789abcdef` | `REFUSING TO START — app.jwt.secret is still the published dev-only default: active profiles=[prod]` … `PRODUCTION REFUSED TO START: app.jwt.secret is still the published dev-only default. Set JWT_SECRET to a strong random value (>= 32 bytes, not the published dev default)…` (log :45/:89) |
| 2 | `DataSourceCredentialGuard` | `DB_PASSWORD` = published dev default `sheltermap` | `boot-test.sh t3b-dscred DB_URL=…/dscred DB_USERNAME=dscredtest DB_PASSWORD=sheltermap` (scratch role whose *actual* password is the published default, so the DB is genuinely reachable with the published credential) | `REFUSING TO START — spring.datasource.password is still the published dev default: active profiles=[prod]. Set DB_PASSWORD to a strong non-default value…` (log :82) |
| 3 | `PiiKeys` (in `security/`) | `PII_AES_KEY` blank — prod profile | `boot-test.sh t4-piikeys PII_AES_KEY=` | `IllegalStateException: PII_AES_KEY is not set — PII-at-rest is fail-closed. Generate a key with 'openssl rand -base64 32'…` (log :126) |
| 3b | `PiiKeys` — the "required in **every** profile, including dev/test" sub-claim | same, `dev` profile | `boot-test.sh t4b-piikeys-dev SPRING_PROFILES_ACTIVE=dev PII_AES_KEY=` | identical refusal under `dev` |
| 4 | `DevSenderGuard` | `MAIL_PROVIDER=dev` (SMS real) | `boot-test.sh t5-devsender MAIL_PROVIDER=dev` | `REFUSING TO START — dev code sender(s) app.mail.provider active on a non-dev/test profile: active profiles=[prod]` … "The dev senders log every code in plaintext — set MAIL_PROVIDER=smtp-pulse / SMS_PROVIDER=twilio…" (log :00:03:12) |
| 5 | `DevEndpointsGuard` | `DEV_EMAIL_TEST_ENABLED=true` | `boot-test.sh t6-devendpoints DEV_EMAIL_TEST_ENABLED=true` | `REFUSING TO START — dev diagnostic endpoint(s) app.dev-email-test.enabled enabled on a non-dev/test profile: active profiles=[prod]` … "The /dev/* test endpoints are dev-only…" |
| 6 | `ApiDocsGuard` | `SPRINGDOC_ENABLED=true` (drives both `springdoc.*.enabled` flags) | `boot-test.sh t7-apidocs SPRINGDOC_ENABLED=true` | `REFUSING TO START — OpenAPI documentation springdoc.api-docs.enabled + springdoc.swagger-ui.enabled enabled on a non-dev/test profile: active profiles=[prod]` |

Plus the seventh (warning, not refusal): `LoopbackXffTrustGuard` — on the **successful** prod boot (§5, T10) the log contains exactly one:

```text
WARN … LoopbackXffTrustGuard : app.ratelimit.trust-loopback is ACTIVE on a non-dev/test deploy (active profiles=[prod]):
  with a loopback proxy in front, ANY process that can reach the app's loopback interface can set X-Forwarded-For…
```

**What it means.** All six refusals are real, each names its own condition and its own fix, and each fires as a hard boot failure (process exit, no web server). The profile-exemption rule (`Profiles.isDevTestOnly`: whole resolved set ⊆ {dev,test}, non-empty) is what makes every demo above work with `prod`. Two ordering nuances worth knowing (they change *which* error message an operator sees, never the fail-closed outcome):

- **The guards run as constructor-checked beans during context refresh — after the first database connection, not before it.** T2's log shows Flyway validating the schema at 00:01:02 and `ProdJwtGuard` refusing at 00:01:05. Consequence: with an unreachable DB *and* a bad guard value, the Flyway/Hikari connection error can surface first. This bit the first T3 attempt: `DB_PASSWORD=sheltermap` against the scratch DB (whose real password differs) died at `flywayInitializer` with `FATAL: password authentication for user "deployclaim"` **before** the guard bean was ever created. Re-run against a DB genuinely using the published default (t3b), the guard's message is what you get. Either way the misconfiguration is loud — but "the guard's exact message" requires a reachable DB.
- **The blank-DB-password branch** (`…password is blank`) was verified by reading the code (`DataSourceCredentialGuard.isRealPassword`) but not booted: a blank password fails at the DB auth/connection stage first (same ordering), so the guard's blank-message branch cannot be observed with a real Postgres. Trivial branch, same guard.

---

## 5. Other single-command-settleable claims

### 5.1 CORS default silently survives into production — **CONFIRMED**

`application.yml`: `app.cors.allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:3000}`; **no guard or boot warning exists for it** (none of the six guards reads it; the successful prod boot's log has no CORS-related line). Behaviorally, on the successful **prod-profile** boot (T10, no `CORS_ALLOWED_ORIGINS` set):

```text
$ curl -s -i -X OPTIONS http://localhost:18080/api/shelters -H 'Origin: http://localhost:5173' -H 'Access-Control-Request-Method: GET'
HTTP/1.1 200
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Allow-Methods: GET,POST,PUT,DELETE,OPTIONS
Access-Control-Allow-Credentials: true

$ curl -s -i -X OPTIONS http://localhost:18080/api/shelters -H 'Origin: https://evil.example' …
HTTP/1.1 403            (no Access-Control-Allow-Origin header)
```

So on a prod boot with defaults: the dev localhost origin is **actively allowed**, and every other origin is refused. Exactly the B4 split: harmless (even protective) for the same-origin topology, site-breaking for a split-origin frontend — and nothing at boot tells the operator which topology they are shipping.

### 5.2 `RETENTION_ENABLED` ships off, "nothing runs or logs while off" — **CONFIRMED**

`application.yml`: `enabled: ${RETENTION_ENABLED:false}`. `RetentionScheduler` is `@ConditionalOnProperty(name = "app.retention.enabled", havingValue = "true", matchIfMissing = false)` — with the default, **the bean (and therefore the scheduled job) does not exist**. Observation: `grep -ci 'retention' run/t10-prod-full/boot.log` → **0** on a full successful prod boot. (The *enabled* path was not run — it is a destructive prune; the claim only concerns the shipped default.)

### 5.3 Relative `data/` paths — **CONFIRMED** (and the fail-closed gate is real too)

`application.yml`: `app.media.upload-dir: ${MEDIA_UPLOAD_DIR:data/media}`, `app.verification.send-log-path: ${VERIFICATION_SEND_LOG_PATH:data/verification-send.log}` — both relative. Behaviorally, the successful prod boot (T10) created them **relative to its process cwd**: `find data` in the scratch working dir → `data`, `data/media` — i.e. wherever the process is started, that's where the data lands (in the image: `WORKDIR /app`, `USER sheltermap`, **no `VOLUME` line anywhere in `Dockerfile`** — grep-verified → `/app/data` in the writable layer, lost on container replacement; the B6 mechanism). And the "default succeeds, so the failure mode is silent data loss, not a refused boot" half is true in both directions: T10 proves the default *succeeds* at boot; T11 proves the gate does refuse when it can't:

```text
$ boot-test.sh t11-mediagate MEDIA_UPLOAD_DIR=/proc/deployclaims-nocreate   → RESULT: REFUSED
BeanCreationException … 'mediaStorage' … Factory method 'mediaStorage' threw exception
  with message: Cannot create the media upload directory /proc/deployclaims-nocreate — check the MEDIA_UPLOAD_DIR setting
```

### 5.4 "The production-profile boot has never been proven end-to-end" (B10) — **confirmed as a CI fact, then filled locally**

`grep -n 'SPRING_PROFILES_ACTIVE' .github/workflows/ci.yml` → line 246: `-e SPRING_PROFILES_ACTIVE=dev` — CI's docker job really does boot the image with the dev profile only. I then booted the **prod profile against a brand-new empty Postgres 16** (fresh scratch DB, `boot-test.sh t12-prod-freshdb`): `Successfully applied 36 migrations to schema "public", now at version v35 (execution time 00:00.565s)`, Hibernate `validate` passed, `Started ShelterMapApplication in 8.493 seconds`, `GET /actuator/health` → `HTTP 200 {"status":"UP"}`; `flyway_schema_history` → 36 rows, no failures. **The prod-profile path works end-to-end on a fresh database** — the gap is a CI-coverage gap, not a code gap. (CI still only proves dev; the report's B10 smallest fix — a prod-profile CI run with generated secrets — remains the durable version of what I did by hand.)

### 5.5 HSTS is conditional, not absent — **CONFIRMED both directions**

Plain HTTP on the prod boot: `curl -s -i …/actuator/health` → **no** `Strict-Transport-Security` header. With `X-Forwarded-Proto: https` from loopback (trusted by default via `trust-loopback: true`): `Strict-Transport-Security: max-age=31536000; includeSubDomains`. So behind a plain-HTTP edge not in `RATELIMIT_TRUSTED_PROXIES`, HSTS indeed never fires; behind a trusted proxy that forwards `X-Forwarded-Proto`, it does. The report's description is accurate in both directions.

### 5.6 Registry import: "no HTTP endpoint — the only manual trigger is a restart with the flag" — **CONFIRMED**

`RegistryRunConfig` is `@ConditionalOnProperty(name = "app.registry.run-on-startup", havingValue = "true")` (a bean that exists only with the startup flag); grep for import-trigger mappings in the API layer finds none (the only "import" hits are the media hero-import and row-ownership comments). `schedule-enabled: true`, cron `0 0 3 * * MON` remain as documented — the weekly outbound call to `opendata.smit.ee` will run in production unless disabled.

### 5.7 Live dev `.env` flags (as used by B1/B2) — **CONFIRMED from a scratch copy** (names + booleans only, see §3)

---

## 6. Claims I could not test, and why

- **Real smtp-pulse / real Twilio vendor behaviour** (sender reputation, rate limits, TLS policy, the actual 554 from the real relay). Replaced with a socket-level local relay + invented credentials as above; the `554 5.9.2` code was copied from the rejection the repo itself documents. A one-off real send to a test address (the report's own B8 fix) is the only way to close the last centimetre.
- **`DataSourceCredentialGuard`'s blank-password message branch** — a blank password fails at DB auth before the guard bean is created (ordering, §4), so the branch's message can't be observed against a real Postgres; verified by code read only.
- **Retention *enabled* runtime** — enabling it would run a real destructive prune; I only verified the shipped-off state (bean absent, zero log lines).
- **B3's aggregate-traffic 429s** (shared per-proxy bucket draining healthy users) — the defaults and the loopback-trust warning are confirmed; the actual 429 under multi-user load was not exercised (needs a traffic generator, out of a read-only lane's budget).
- **CI's current green state on this commit** — no `gh` token (recorded closing decision); workflow definitions were only read, as the original report did.
- **Performance headroom** under deploy-shaped load — not exercised; consistent with the original report's own §8.

## 7. Anything unverified beyond the above

- The runbook's per-line log-shape claims (401/429 WARN formats) — carried over as unverified, same as the original report §8; my boots did not exercise 401/429 paths.
- Frontend `dist/` layout, threat-model contents — out of scope for the tested claims.

## 8. Answer to the owner's question

"Which of his suspicions were false assumptions and which are real defects?" — **none of the tested claims were false assumptions.** The two things he "seemed to see working fine" that actually don't:

1. **Verification mail delivery can be fully broken while everything says "healthy"** (§1): boot OK, health UP, API 202 — the failure lives only in server logs and an in-memory admin ring. Fix before first production data: one real code send to a test address (staging/dev against the production credentials), and keep it in the deploy checklist.
2. **A deploy package built from this working tree carries the live dev `.env`** (§3), which both trips the guards (proven) and would silently supply dev values for every variable the environment doesn't set (DB, JWT, CORS, loopback trust — the guards don't cover those). Build from a clean checkout / Dockerfile context (`.dockerignore` already excludes `.env`).

The reassuring half: **Twilio fail-fast, all six guards, the media boot gate, and the conditional-HSTS logic all work exactly as documented** — and, bonus, a prod-profile end-to-end boot on a fresh database was proven to work (§5.4), so "first prod boot is a first-run" is no longer true for the happy path; the *misconfiguration* paths are what the guards now demonstrably catch.

## 9. Infrastructure incident (rule-7 class, this lane as victim)

The first T9 boot (00:07) died with `ServiceConfigurationError … NoSuchFileException: …/target/shelter-map-0.0.1-SNAPSHOT.jar`: another lane's `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify` (observed holding the lock) ran `clean` and removed the jar while my JVM was loading classes from it. I never ran Maven myself (rule 7); the failed boot is **not** app evidence and was retried after the lock released and the jar was rebuilt (00:10, 83,074,230 bytes — matching the original report's "~83 MB observed").

## 10. Environment left as found

- Live dev server: never stopped; original PIDs `1449084` (:8080) and `383842` (:5173) still own the ports; :8080 `{"status":"UP"}`, :5173 `200` at teardown.
- Live dev database `sheltermap`: never used by any test boot; scratch roles/dbs (`deployclaim`/`deployclaims`, `dscredtest`/`dscred`) created in the dev container for tests and **all dropped** (verified: 0 remaining).
- No tracked file modified by this lane (working-tree changes present at teardown — 22 modified + 6 untracked — belong to concurrent lanes, e.g. `reviews/polish/nearest-audit.md`, frontend `admin-*` files; I wrote only this report). No commit made.
- Evidence preserved at `/tmp/deploy-claims/`: per-boot `boot.log`s under `run/`, the SMTP wire transcript `fake-smtp/session.log`, probe captures under `run/*/probes/`, the env matrix `base.env`, the marker `.env` at `run/t8-dotenv/.env`, and this lane's scripts. (The scratch `.env` copy of the live file is at `/tmp/deploy-claims/live-env-scratch.env` — contains real credential values; delete it or keep it out of any commit, by design.)
