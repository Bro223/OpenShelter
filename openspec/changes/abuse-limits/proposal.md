# Change: abuse-limits

## Why

A single compromised or throwaway account can currently spam the map with
shelter submissions at will. The owner-approved roadmap (M3) adds the
abuse layer: per-user rate caps on submitting, OTP throttles per
phone/IP/e-mail, duplicate-submission detection, admin alerting, and the
secure-headers / HTTPS-only-cookie audit. No CAPTCHA (locked decision).

This change is delivered in slices; **slices 1–4 are done** (per-user daily
submission cap + per-contact OTP caps + duplicate-submission detection +
admin alerts) — each the smallest complete, gate-green piece.

## What Changes

### Slice 1 — per-user daily submission cap (done)

- **`app.limits.daily-submissions-per-user`** (default **5**, main + test
  yml): max `source = USER` shelters one account may create within a
  **rolling 24 h window**. The next submission is **429 Too Many Requests**
  with the uniform `ErrorResponse` and an exact **`Retry-After`** countdown
  (seconds until the oldest in-window submission leaves the window — same
  idiom as the auth throttles).
- **`ShelterService.addPlace`** enforces the cap after the existing checks;
  **ADMIN-kind accounts are exempt** (consistent with the active-shelter
  cap, D3 of shelter-trust-and-reports). The cap counts SUBMITTING, not
  holding: distinct from the 409 active-shelter cap (10 rows). Deleting a
  row frees its slot (the row is gone) — the delete/re-submit churn stays
  bounded by the active cap + the admin surface.
- **Repository seam:** `countByCreatedByAndSourceAndCreatedAtAfter` +
  `findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc`
  (app interface → Spring Data derived query → JPA delegate → in-memory
  fake).
- **New exception** `ShelterSubmissionThrottledException` (429 +
  `retryAfterSeconds`) + handler in `ApiErrorHandler`.

### Slice 2 — OTP caps (done)

- **`RollingContactOtpLimiter`** (verification pkg, bean in
  `SecurityConfig`): rolling-window cap per normalized contact (e-mail /
  E.164 phone), bound from `app.limits.otp-per-contact-max` (**5**) /
  `app.limits.otp-per-contact-window-hours` (**24**); a verdict carries the
  exact seconds until the oldest in-window event leaves the window
  (`Retry-After`); `max <= 0` disables. In-memory, same single-instance
  constraint (W16) as the token buckets — the file-backed per-(user, level)
  daily cap stays the durable backstop.
- **Per-phone OTP request cap:** enforced in `VerificationService.
  requestVerification` AFTER the per-(user, level) gate, so cooldown /
  daily-cap rejects record nothing — the contact cap counts only REAL
  sends (the Twilio/SMTP volume valve). 429 + `Retry-After` via the
  existing `VerificationThrottledException` handler.
- **Per-e-mail caps on the verify + register request endpoints:**
  `/verify/request` (EMAIL level, same seam) and `POST /auth/register`
  (per e-mail; EVERY attempt counts — a duplicate-409 retry is still an
  attempt — 429 + `Retry-After` instead of a 409 loop). Keys are namespaced
  per surface (`verify:` vs `register:`) so a registration does not consume
  the account's verification-send budget. Per-IP stays on the pre-existing
  verify/register token buckets.
- **Tests:** `OtpContactCapIT` (phone / e-mail-verify / register: 3rd
  event 429 + `Retry-After`, nothing sent), `RollingContactOtpLimiterTest`
  (window expiry, isolation, normalization, retry-after math, disabled
  mode), service-level interaction test in `VerificationServiceTest`.

### Slice 3 — duplicate-submission detection (done)

- **Near-duplicate rule:** an `ACTIVE` USER row with the same normalized
  name (lowercase, trim, collapsed whitespace) AND within
  **`app.limits.duplicate-coord-meters`** (**100** m, main + test yml)
  haversine is the same place re-submitted. USER rows carry no address
  (a registry-only field), so name + coordinates are the whole identity
  signal; fuzzier re-reports (same place, reworded name) stay bounded by
  the daily cap.
- **Detection at submit time:** `ShelterService.addPlace` checks it AFTER
  the active/daily caps (a capped resubmit is 429, not 409), **cross-user**
  (the throwaway-account re-report vector — and an author re-POSTing their
  own row gets the same 409; editing goes through PUT), **ADMIN kind
  exempt** (like the caps). INACTIVE rows don't match — admin reject /
  auto-hide free the place for a fresh row.
- **409 with the existing row id:** new `ShelterDuplicateException` — the
  uniform `ErrorResponse` shape is kept, the plain-spoken message carries
  the pointer (`... (shelter #<id>)`) so the client can point at or edit
  the colliding row. The scan is Java-side over
  `findAllActiveBySourceIn([USER])` (one indexed query; the USER table is
  small) — no new repository method.
- **Tests:** `ShelterServiceTest` +9 unit cases (rule, normalization,
  cross-user, INACTIVE, admin, cap precedence, haversine math) +
  `ShelterDuplicateIT` 7/7 over HTTP (409 + row id + no row created;
  ~50 m offset 409; different name / ~1 km 201; cross-user 409; admin
  exempt; hidden row re-addable).

### Slice 4 — admin alerts (done)

- **`ThrottleAlert` + `ThrottleAlertRecorder`** (new `alerts` package,
  bean in `SecurityConfig`): a bounded in-memory ring
  (`app.limits.alerts-retained: 200`, main + test yml; `<= 0` disables).
  The three M3 mechanisms append their events at the throw site:
  the daily submission cap (429, subject `user:<id>`), the per-contact
  OTP cap on the verify AND register surfaces (429, subject
  `contact:<normalized>` — normalized the same way as the limiter's
  bucket key) and the near-duplicate rejection (409, subject
  `user:<id>`, the detail names the existing row). `recent(limit)` is
  newest-first with oldest-first eviction past the retention bound; the
  ring-local `id` is a monotonic sequence (resets on restart).
  **W16**: process memory — a restart clears it, N replicas see their own
  share; accepted for a triage surface, a durable audit table is the
  upgrade path. The pre-M3 token-bucket / per-(user, level) throttles
  deliberately do NOT alert.
- **`GET /admin/alerts?limit=`** on `AdminController`: newest-first
  `AdminAlertDto[]` (`id, kind, subject, detail, retryAfterSeconds, at`)
  behind the fresh-lookup admin guard (401/403 like the other routes);
  `limit` 1..200 default 50, out of range 400.
- **FE:** `AdminAlertRow` + `AdminGateway.listAlerts` + the admin page's
  "Alerts" tab (lazy load, kind labels, human-formatted Retry-After;
  audit stays the LAST tab).
- **Tests:** `ThrottleAlertRecorderTest` 7/7 (ordering, eviction,
  clamping, disabled mode, normalization, ids) + `AdminAlertsIT` 7/7 over
  HTTP (401/403/400-limit; each kind lands with the right subject +
  retry-after; newest-first).

### Remaining M3 scope (later slices — NOT in this pass)

- Secure headers + HTTPS-only cookies audit.

## Impact

- Affected specs: shelter submission API (429 on the capped account; 409
  near-duplicate with the existing row id); verify-request + register APIs
  (429 when the per-contact window is full).
- No schema change (slice 1 counts over `shelters.created_by`/`source`/
  `created_at`, all present since V5/V7; slice 2 keeps the window in
  process memory).
- Frontend: no change in slices 1–2 (the 429 body is uniform
  `ErrorResponse`; the submit/verify UI surfacing is a follow-up note,
  not required for the caps to be effective).
