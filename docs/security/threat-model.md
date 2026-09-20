# OpenShelter threat model (roadmap M15)

Written 2026-09-13 (M15 slice 1). This document maps each credible attack
against OpenShelter to the mitigation(s) that address it, the status of that
mitigation, and the test that pins it. **Statuses:**

- **MITIGATED** — the defense is shipped and pinned by a test.
- **MITIGATED-RESIDUAL** — the defense is shipped, but a bounded residual
  risk remains (stated explicitly).
- **ACCEPTED** — a residual risk the project consciously accepts by a locked
  product decision (stated which one).

It is a point-in-time description. When a defense changes, update the
pointer and the pinning test name here in the same commit.

## Scope, assets, threat sources

**In scope:** the Spring Boot backend (`src/`), its PostgreSQL 16 database,
the Angular frontend's API-facing behavior, and the environment/config
surface. The public UI copy and the map rendering are covered only where
they intersect an attack (e.g. location data flow).

**Assets (in rough order of value):**

1. The shelter dataset — official registry rows (re-importable from the
   open-data CSV) and community rows (not re-derivable — loss is permanent).
2. User account PII — e-mail, phone (AES-GCM at rest + blind index, M2),
   Argon2id password hashes.
3. The community's trust in the map — a shelter app's core asset; false
   entries during an emergency are the primary failure mode.
4. Provider credentials — Twilio (SMS), SMTP (e-mail); abused sends cost
   money and burn the sender reputation.
5. The admin account and its moderation capabilities.

**Threat sources (assumed capability):** an anonymous visitor; a registered
(possibly verified) user acting in bad faith; a coordinated small group; a
curious insider with read access to the repo/README; a network-level
observer. We do not assume a compromised host or kernel, a compromised
provider (Twilio/SMTP), or sustained volumetric DoS capacity (that is the
edge/CDN's problem — see `operations.md`).

**Context that shapes the model (locked decisions — never re-litigated):**
no CAPTCHA; private homes stay usable (submitter-declared `PRIVATE`, badge +
warning, never hidden); no active moderation (auto-trust + community
reports); the nearest-shelter computation is client-side; never IP
geolocation; the official dataset is the Päästeamet open-data CSV.

## Attacks

### A1. False shelter submissions

An attacker floods the map with fake shelters (wrong addresses, closed
places, bait locations) so the map is untrustworthy or directs people
nowhere.

**Mitigations:** per-user rolling-24 h submission cap (5, 429 + Retry-After)
and a per-user ACTIVE-shelter cap (10, 409) in `ShelterService`;
near-duplicate detection (same normalized name + ≤ 100 m haversine → 409
with the existing row id, M3 slice 3, `app.limits.duplicate-coord-meters`);
every USER row starts `UNDER_REVIEW`/“Proposed” provenance
(`Provenance` derivation, M6/M7) and only reaches trust through the
community lifecycle (confirmations, admin actions — `CommunityReviewIT`);
five trust-weighted `NON_EXISTENT` reports auto-hide the row (M9, weight
1..3 derived from the reporter's own rows); factual report types (M11) give
reporters a channel to say *when it closed / the actual address*; the admin
moderation suite (M10) can mark inaccurate, request info, hide and hard
delete, with an audit trail (`moderation_actions`, `shelter_history`).
Estonia bounding-box check rejects coordinates off-island at write time.

**Status: MITIGATED-RESIDUAL.** A verified attacker can still plant up to 5
plausible fake entries per day before the cap fires, and a small
coordinated group can multiply that (each account needs a verified e-mail
or phone — an SMS/SMTP cost per account, see A9). The accepted backstop is
community reports + admin review (no active moderation is a locked product
decision). **Pins:** `ShelterDailyLimitIT`, `ShelterDuplicateIT`,
`CommunityReviewIT`, `ShelterReportIT`, `MarkInaccurateIT`,
`LastVerifiedApiIT`, `ShelterHistoryIT`, `AdminModerationIT`.

### A2. Brigading / fake reports

A group of accounts coordinates to hide a real shelter (flood of
`NON_EXISTENT` reports) or to bury a rival's entry.

**Mitigations:** the report throttle (10 report-type actions per user per
rolling hour, 429, durable `report_actions` log — `ReportThrottleIT`); one
report per user per shelter per type (409 — `ShelterReportIT`); auto-hide is
trust-*weighted*, not head-count — five brand-new baseline accounts hide
barely faster than five trusted ones (M9); a reporter holding their own
other listing of the same place is stored **damped** (recorded + flagged in
the admin queue, counts 0 — V16, M9); rating/review flooding is no
longer possible — the whole review model (reviews, star ratings, review
reports) was removed in `V21__drop_reviews.sql`, so the remaining
qualitative levers are the report, occupancy and open-status signals;
every damped/repeated event lands in `GET /admin/alerts` and the admin
report queue.

**Status: MITIGATED-RESIDUAL.** A large enough coordinated ring of freshly
verified accounts can still sway a borderline row before admin attention
arrives; the dampening + weighting slows it and the admin queue surfaces
it. **Pins:** `ReportThrottleIT`, `ShelterReportIT`, `CommunityReviewIT`,
`AdminAlertsIT`.

### A3. Denial of service

An attacker degrades or stops the service (CPU, connection, SMS/SMTP
queues, database).

**Mitigations:** the app is stateless (JWT, no session store —
`SessionCreationPolicy.STATELESS`); every externally callable
cost-bearing endpoint has a per-IP token bucket: login (per-(IP, contact)
*and* an aggregate per-IP anti-stuffing bucket, W5), register,
verify-request, password-reset request + confirm (per-(IP, e-mail) anti-
guess), contact-change requests, and `POST /api/geo/resolve` (5/min —
every call is a server-side HTTP fetch, so the bucket is the valve);
public GETs are batched projections (no N+1, M8); no public file uploads
(the admin-gated media library — 5 MiB cap, magic-byte validated — is the
only upload path) and no user-authored HTML outside the admin-authored,
jsoup-sanitized guidance bodies; no webhooks; health probe is anonymous and
detail-suppressed. **Residual, explicit:** the token buckets and the alert
ring are in-memory per process (W16) — a restart resets them, and the
single-instance constraint in `operations.md` is a hard requirement;
volumetric DoS (Gbps) is out of app scope (edge/CDN responsibility).

**Status: MITIGATED-RESIDUAL** (bounded application-layer DoS; volumetric
out of scope by design). **Pins:** `AuthRateLimitIT`,
`VerificationDailyCapIT`, `VerificationThrottleIT`, `OtpContactCapIT`,
`LocationResolveIT` (bucket on the resolver).

### A4. Account takeover

An attacker logs in as an existing user (credential stuffing, brute force,
token theft, reset flow abuse).

**Mitigations:** Argon2id (`Argon2PasswordEncoder.defaultsForSpringSecurity
_v5_8`); login timing equalizer — an unknown contact verifies against a
dummy hash, so no latency oracle, and the S1 existence guard makes
unknown+`"dummy"` refuse with the *same* generic 401 as wrong-password
(`AuthService.login` — no 500 oracle); per-(IP, contact) + aggregate per-IP
login buckets (A3); suspended accounts are refused **after** the password
verify at all three doors (login 403, refresh 403 + token spent, JWT filter
column-only `isSuspended` per request → 401) so a suspended login never
leaks an account-state oracle to unauthenticated callers (M10); access
tokens are 15 min; refresh tokens rotate on every use (the race is pinned)
and **a successful password reset revokes every refresh token of the user**
(this pass, `PasswordRecoveryFlowIT`); logout revokes the presented
refresh token.

**Status: MITIGATED-RESIDUAL.** A refresh token stolen and presented *before*
rotation (30-day TTL) still authenticates until its next use rotates it or
the password changes — the rotation-on-use + reset-revoke bounds the
window. **Pins:** `AuthApiIT`, `AuthRateLimitIT`, `UserSuspensionIT`,
`RefreshRotationRaceIT`, `AccountDeletionIT`, and this pass's
`PasswordRecoveryFlowIT`.

### A5. Enumeration (account existence)

An attacker maps which e-mails/phones are registered.

**Mitigations:** login is uniform (generic 401 for unknown *and* wrong
password, timing equalized — A4); `POST /auth/password-reset/request`
answers the **identical** ack for a known e-mail, an unknown e-mail and a
cooldown skip, and sends nothing for an unknown address
(`PasswordResetService.requestReset` — pinned this pass); the 6-digit reset
code is stored SHA-256-hashed, single-use, 15-min TTL, 5-attempt lockout,
re-issue capped at 5/UTC-day with a 60-s cooldown, and the confirm endpoint
is rate-limited per (IP, e-mail) so the code is not brute-forceable (W1).
**Residual, explicit:** `POST /auth/register` answers 409 for an existing
contact — an honest-duplicate UX choice — so registration *is* a slow
existence oracle, bounded by the per-IP register bucket and the
per-contact rolling OTP cap (5 attempts/24 h, which a registration attempt
counts toward). **Pins:** `AuthApiIT`, `PiiAtRestIT` (409 duplicate),
`PasswordResetServiceTest`, and this pass's `PasswordRecoveryFlowIT`.

### A6. Private-address exposure

An attacker (or the UI) leaks a private home's occupant PII, or the
location of a `PRIVATE`-declared home, to third parties.

**Mitigations:** `PRIVATE` homes are *visible by locked decision* with a
badge + warning and never hidden — but visibility is the shelter's
name/coordinates as declared by the submitter; the occupant's e-mail/phone
is **not** on any public shelter DTO (public reads are
`ShelterDto`/`ShelterQueryService` projections that carry no user PII);
PII is AES-GCM-encrypted at rest with a domain-separated HMAC blind index
(M2 — `PiiCrypto`, applied in the mapper layer), and the national ID code
was removed entirely (M1); the server never performs IP geolocation (locked
decision) and the client's browser location is never sent to the server —
`findNearest`/distance are computed client-side (M12); the only
server-side geocode endpoint resolves a shelter short-link, not a user
position; CORS is restricted to the configured frontend origins.

**Status: MITIGATED.** **Pins:** `PiiAtRestIT`, `PiiCryptoTest`,
`UserMapperBlankValueTest`, `ShelterApiIT` (public projection shape),
`LocationResolveIT`.

### A7. Malicious content (XSS / abuse via user text)

A submitter or reporter embeds script or abusive content that executes or
harms in another user's browser.

**Mitigations:** all user content is plain text in size-capped fields
(name ≤ 200, description ≤ 2000, report detail ≤ 500, admin question/reply
≤ 2000); **there are no public file or image uploads** — the admin-gated media
library (`POST /admin/media`, 5 MiB cap, magic-byte validated) is the only upload
path; the SPA renders user strings through Angular template
interpolation (auto-escaping) — no `innerHTML` of user data; the API
responses carry `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer` and a defense-in-depth CSP
(`SecurityHeadersFilter` — pinned by `SecurityHeadersIT`), and the
production deploy adds the SPA's real CSP at the reverse proxy (README
production checklist); there is no active moderation by locked decision, so
abusive *text* is handled by the community-report + admin-delete path (A1).

**Status: MITIGATED** (no active moderation of text content is
ACCEPTED-by-decision; execution vectors are closed). **Pins:**
`SecurityHeadersIT`, `ShelterApiIT`, `ShelterReportIT`.

### A8. Location tracking / user privacy

An attacker (or the operator) tracks a user's real location.

**Mitigations:** never-IP-geolocation is a locked decision (grep-verified
in M12 — no server code reads client coordinates); the browser geolocation
prompt appears only on the user's explicit “show shelters around you” CTA;
the resolved position is used client-side for nearest/distance and is
**never transmitted to or stored by the server**; the JWTs carry no
e-mail/phone claims; `Referrer-Policy: no-referrer` keeps token-bearing
URLs from leaking; the file-backed anti-spam send log (user id + level +
timestamp — the raw contact is deliberately not persisted) is local-only, gitignored, and named as a residual in
`operations.md` (M15 note carried from the README).

**Status: MITIGATED.** **Pins:** `PiiAtRestIT` (no PII in JWTs asserted in
the M2 change), `SecurityHeadersIT`, `LocationResolveIT`.

### A9. SMS (Twilio) / e-mail (SMTP) cost abuse

An attacker turns the app into an open SMS/e-mail relay or exhausts the
provider budget.

**Mitigations (layered, innermost first):** per-(user, level) verification
throttle — 60-s cooldown + 5/UTC-day cap, backed by a durable send log that
survives restarts; the **rolling per-contact OTP cap** — 5 events
(a real send *or* a registration attempt) per normalized e-mail / E.164
phone within 24 h, **across users** (M3 slice 2 — the volume valve on
Twilio/SMTP cost), 429 + honest `Retry-After`, and a throttled request
sends *nothing* (`OtpContactCapIT`); per-IP buckets on `/verify/request`
and `/auth/register` stop one IP spraying many accounts (A3); the reset
flow's re-issue cooldown + 5/UTC-day cap (A5); the `/dev/email-test` and
`/dev/sms-test` diagnostics are **disabled by default**, recipient-
allowlisted, and `DevEndpointsGuard` refuses to boot if they are enabled on
a non-dev profile — a misconfigured public deploy cannot start as a relay;
`MAIL_PROVIDER`/`SMS_PROVIDER` default to the console-logging `dev`
impl, so a real send path only exists when explicitly configured; every
throttle event is recorded in the admin alert ring (`GET /admin/alerts`).

**Status: MITIGATED-RESIDUAL.** The caps are in-memory (A3 residual) and a
distributed attacker with many IPs stays under each per-IP bucket while
each contact still hits the per-contact cap — the per-contact cap is the
backstop that holds regardless of IP count. **Pins:** `OtpContactCapIT`,
`VerificationThrottleIT`, `VerificationDailyCapIT`, `AuthRateLimitIT`,
`EmailTestControllerAllowlistIT`, `SmsTestControllerAllowlistIT`,
`AdminAlertsIT`.

### A10. Database leak

The DB (or a dump of it) is exposed; the question is what the attacker
gains.

**Mitigations:** PII columns are ciphertext (AES-GCM, `v1:` slot tag) with
HMAC blind-index lookups (M2) — a raw dump does **not** yield e-mails or
phones; the two PII keys are env-only, fail-closed at boot
(`PiiKeys`/`PiiCrypto` — the app refuses to start without them), gitignored
`.env` never committed, and the README names the offline key backup as the
single most valuable artifact; `JWT_SECRET` is env-only with the
fail-closed `ProdJwtGuard` (refuses the published dev default / < 32 bytes
outside dev/test); admin credentials env-only; `ddl-auto=validate` +
versioned Flyway migrations (no runtime schema mutation); all SQL through
JPA/parameterized queries (no string-built SQL); `/actuator/health` shows
details only to authorized callers (`show-details: when-authorized`); the
dev compose binds 5432 to the host interface — for anything non-local, bind
`127.0.0.1` or drop the published port (recorded in `operations.md` §3); error bodies
are a fixed `ErrorResponse` shape with no stack traces or SQL fragments.

**Status: MITIGATED-RESIDUAL.** A dump still leaks: the dataset itself,
password hashes (Argon2id — offline cracking is costly but not impossible),
audit/admin history, and the *existence* of contacts (blind index is
one-way, but the set of hashes is enumerable). **Pins:** `PiiAtRestIT`,
`PiiCryptoTest`, `AdminSeederIT`, `SecurityHeadersIT` (health surface via
the config assertions), plus the boot guards' own unit/IT coverage.

### A11. Admin compromise

An attacker obtains the admin account (or elevates a user to it) and
destroys data or poisons moderation.

**Mitigations:** an admin exists **only** when `ADMIN_EMAIL` +
`ADMIN_PASSWORD` are both provisioned in the environment
(`AdminSeederIT` pins the seeder + idempotent restart); every `/admin/**`
endpoint is behind `requireAdmin()` — a registered user gets 403, anonymous
gets 401 (pinned this pass, `AdminAuthorizationIT`); admins cannot suspend
themselves/others' admins (409 — the self-lockout vector, M10); every
admin shelter-scoped write is audited in `moderation_actions` with the
actor and, where relevant, a reason (mark-inaccurate's reason rides the
audit row), and shelter edits keep a full `shelter_history` trail (M10)
that survives the shelter's own deletion; the admin list is read-only for
registry rows (409 on import-owned rows).

**Status: MITIGATED-RESIDUAL.** An admin credential leaked in the env
remains a valid secret until rotated — `operations.md` carries the
incident step. **Pins:** `AdminSeederIT`, `AdminModerationIT`,
`UserSuspensionIT`, `ShelterHistoryIT`, this pass's `AdminAuthorizationIT`.

### A12. Nearest-result manipulation

An attacker manipulates the “nearest shelter” answer a stranded person
sees.

**Mitigations:** the nearest computation is **client-side** (Haversine over
the user-authorized browser position and the public list) — the server
never ranks by distance, so there is no server input to poison; the server
list is id-ordered (stable between requests) and the ordering a user sees is a function of the
public row set only; a manipulator can therefore only inject a fake
coordinate by creating/editing a shelter row — which is exactly A1 (caps,
duplicate 409, provenance, reports) — and registry rows are import-only
(admin writes on them 409); the map's address-search anchor (M12) is a
fixed pin the user placed, not a trust input.

**Status: MITIGATED** (reduces to A1). **Pins:** `ShelterApiIT`
(public projection), `ShelterDuplicateIT`, `CommunityReviewIT`,
`ShelterReportIT`.

### A13. SSRF via the admin hero-image import

A compromised (or convinced) admin pastes a hero-image URL that the
SERVER fetches — and the target is not the innocent image host it
claims: `file:///etc/passwd`, `http://127.0.0.1/admin`, a public
host that 302s to `http://169.254.169.254/latest/meta-data/` (cloud
metadata), a 2 GiB body, or a 100001×1 image header. The server is
the client here, so an admin-supplied URL is a trust input at the
outbound boundary. (The admin is an insider by the A11 threat
model; this entry exists so the surface is bounded even for a
compromised one, and so the guards are test-pinned.)

**Mitigations** (`HeroImageImportService`, guidance-hero-import —
each guard is test-pinned, not just asserted):

1. **Scheme allowlist** — only `http`/`https` is fetchable;
   `file:`/`data:`/`gopher:`/`javascript:`/anything-else is refused
   400 before any I/O.
2. **No credentials** — `user:pass@` URLs are refused 400 before
   any I/O: the pasted credentials are never transmitted upstream
   as an Authorization header.
3. **SSRF address policy, entry AND every redirect hop** — the
   host of the URL about to be fetched is resolved and EVERY
   resolved address classified; loopback, RFC 1918 private,
   link-local (incl. the cloud-metadata 169.254.169.254 and
   fe80::/10), unique-local fc00::/7 (incl. the AWS metadata form
   fd00:ec2::254), multicast and unspecified addresses are refused
   400 and that URL is NEVER fetched. The HTTP client never
   auto-follows redirects (`followRedirects(NEVER)`) — the service
   walks at most 3 hops itself, and every hop target is
   re-validated (scheme, credentials, shape) and its ADDRESS
   re-checked the moment before it is fetched, so a public host
   that 302s to 127.0.0.1 dies at the re-check.
4. **Streaming size cap** — the body is read against
   `app.media.max-bytes` WHILE reading; past the cap the
   connection is aborted (the buffer never exceeds cap + one
   chunk) and the fetch fails 413 — an oversized body is aborted,
   not buffered.
5. **Connect + read timeouts + walk budget** — a connect timeout
   bounds the handshake, a no-progress read timeout aborts a
   stalled head or body, and a wall-clock budget (default 10 s)
   bounds the whole walk: a hostile upstream cannot pin the
   publish thread.
6. **Magic-byte validation** — the stored Content-Type is the
   SNIFFED type, never the remote's header; text bytes served as
   `image/png` are refused 400.
7. **Decompression-bomb pixel cap** — declared dimensions over the
   configured max side (default 10000 px) are refused 400 before
   anything is stored: a 33-byte file cannot claim a gigapixel
   image.

Failure vocabulary: policy refusals 400, upstream trouble (DNS,
timeouts, 5xx, budget) 502, over-cap 413 — and EVERY failure
leaves the post a DRAFT with the URL intact (the publish
transaction rolls back), so a failed import never publishes
anything. The origin of an imported image is recorded on
`media_assets.source_url` (the takedown trail).

**Status: MITIGATED** with the residuals below stated honestly. **Pins:**
`HeroAddressPolicyTest` (the classifier), `JdkHeroImageFetchClientTest`
(cap/stall/redirect against a real local server),
`HeroImageImportServiceTest` (the walk, incl. redirect-to-127.0.0.1
refused-and-never-fetched), `GuidanceServiceTest` (draft/publish
lifecycle, failed publish keeps the DRAFT), `HeroImageImportIT`
(full-stack endpoint acceptance).

### Session model — CSRF protection is disabled by design

Authentication is a stateless `Authorization: Bearer` token (JWT), not a
cookie session: the access token lives in an Angular signal (memory only)
and the refresh token is sent explicitly in the request body — browsers
never attach either credential to a cross-site request automatically.
There is therefore no CSRF vector to defend against, which is why
`SecurityConfig` disables Spring Security's CSRF filter
(`.csrf(csrf -> csrf.disable())`, `SessionCreationPolicy.STATELESS`).
The residual XSS surface of the `localStorage` refresh token is documented
in `frontend/README.md` (token-storage tradeoff); moving to an httpOnly
refresh cookie would re-introduce CSRF and require `withCredentials` +
explicit CSRF tokens on both sides (deferred cross-stack change).

## Test-evidence matrix

| # | Attack | Existing pins | Added this pass |
|---|--------|---------------|-----------------|
| A1 | False submissions | `ShelterDailyLimitIT`, `ShelterDuplicateIT`, `CommunityReviewIT`, `ShelterReportIT`, `MarkInaccurateIT`, `LastVerifiedApiIT`, `ShelterHistoryIT`, `AdminModerationIT` | — |
| A2 | Brigading / fake reports | `ReportThrottleIT`, `ShelterReportIT`, `CommunityReviewIT`, `AdminAlertsIT` | — |
| A3 | DoS (app layer) | `AuthRateLimitIT`, `VerificationDailyCapIT`, `VerificationThrottleIT`, `OtpContactCapIT`, `LocationResolveIT` | — |
| A4 | Account takeover | `AuthApiIT`, `AuthRateLimitIT`, `UserSuspensionIT`, `RefreshRotationRaceIT`, `AccountDeletionIT` | `PasswordRecoveryFlowIT` (reset revokes refresh tokens) |
| A5 | Enumeration | `AuthApiIT`, `PiiAtRestIT`, `PasswordResetServiceTest` | `PasswordRecoveryFlowIT` (uniform ack, lockout, single-use, expiry) |
| A6 | Private-address exposure | `PiiAtRestIT`, `PiiCryptoTest`, `UserMapperBlankValueTest`, `ShelterApiIT`, `LocationResolveIT` | — |
| A7 | Malicious content | `SecurityHeadersIT`, `ShelterApiIT`, `ShelterReportIT` | — |
| A8 | Location tracking | `PiiAtRestIT`, `SecurityHeadersIT`, `LocationResolveIT` | — |
| A9 | SMS/e-mail cost abuse | `OtpContactCapIT`, `VerificationThrottleIT`, `VerificationDailyCapIT`, `AuthRateLimitIT`, `EmailTestControllerAllowlistIT`, `SmsTestControllerAllowlistIT`, `AdminAlertsIT` | — |
| A10 | DB leak | `PiiAtRestIT`, `PiiCryptoTest`, `AdminSeederIT`, `SecurityHeadersIT` | — |
| A11 | Admin compromise | `AdminSeederIT`, `AdminModerationIT`, `UserSuspensionIT`, `ShelterHistoryIT` | `AdminAuthorizationIT` |
| A12 | Nearest manipulation | `ShelterApiIT`, `ShelterDuplicateIT`, `CommunityReviewIT`, `ShelterReportIT` | — |
| A13 | Admin-import SSRF | — | `HeroAddressPolicyTest`, `JdkHeroImageFetchClientTest`, `HeroImageImportServiceTest`, `GuidanceServiceTest`, `HeroImageImportIT` |

## Residual-risk register (accepted, stated once)

1. **In-memory abuse valves** (A3/A9): per-process buckets + alert ring;
   a restart clears them and horizontal scaling weakens them. Hard
   single-instance requirement — `operations.md`.
2. **Registration 409 = slow existence oracle** (A5): UX trade-off, bounded
   by the register bucket + per-contact cap.
3. **Refresh-token TTL window** (A4): 30-day rotating token; rotation-on-use
   - reset-revoke bound it.
4. **No active moderation** (A1/A2/A7): locked product decision —
   auto-trust + community reports + admin queue is the backstop.
5. **The file-backed verification send log** (`data/verification-send.log`):
   local, gitignored, contains user id + level + timestamp (never the raw contact); included in the
   backup list in `operations.md`; candidate for a DB-backed seam in a
   future milestone (carried from the README M15 note).
6. **Admin e-mail provisioning** (A11): the admin password lives in the
   environment — rotate on suspected exposure (`operations.md`).
7. **Volumetric DoS / provider compromise**: out of app scope by design.
8. **DNS rebinding / resolve–connect TOCTOU** (A13): `DnsHeroAddressResolver`
   classifies every resolved address of the host, and
   `JdkHeroImageFetchClient` then connects to the HOSTNAME — the JDK
   performs its own DNS lookup at connect time, so an attacker who
   controls that zone (or its answers) can flip the record between
   check and connect (public at check, loopback / RFC 1918 /
   169.254.169.254 at connect). Bounded, not closed: the endpoint is
   ADMIN-ONLY (the admin is the insider of record — A11), the body is
   read against `app.media.max-bytes` WHILE reading (a flipped
   connection yields at most one capped, sniffed-as-image response,
   never an unbounded read), the per-hop scheme/credentials/shape
   re-validation + address re-check still kill a rebinding that
   announces itself as a redirect target, and the connect/read
   timeouts + walk budget bound the thread. Accepted rather than
   fixed: `java.net.http.HttpClient` exposes no public API to pin a
   pre-resolved address, and connecting to the checked IP literal with
   a `Host` header would break SNI / virtual hosting for legitimate
   image hosts — the fix costs more surface than the residual gives.
9. **Third-party content trust** (A13): an imported image is
   third-party bytes served from our origin; the sniff + pixel cap
   bound what it can BE, not whether the content is appropriate
   (the admin is the insider of record — A11).
10. **Manual-upload pixel-bomb residual** (A13): the decompression
    bomb guard is wired on the import path; the manual upload path
    (`POST /admin/media`) has the same declared-dimension exposure
    and is NOT capped in this change — a follow-up.
11. **In-transaction network hold** (A13/D2): one admin's publish
    can hold a DB connection for up to the walk budget (default
    10 s) while the remote walk runs — accepted for the
    admin-only, rate-limited publish surface.
