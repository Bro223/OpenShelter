# Change: abuse-limits

## Why

A single compromised or throwaway account can currently spam the map with
shelter submissions at will. The owner-approved roadmap (M3) adds the
abuse layer: per-user rate caps on submitting, OTP throttles per
phone/IP/e-mail, duplicate-submission detection, admin alerting, and the
secure-headers / HTTPS-only-cookie audit. No CAPTCHA (locked decision).

This change is delivered in slices; **slices 1–2 are done** (per-user daily
submission cap + per-contact OTP caps) — each the smallest complete,
gate-green piece.

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

### Remaining M3 scope (later slices — NOT in this pass)

- Duplicate-submission detection (near-identical name/address/coords).
- Admin alerts on throttled/abusive accounts.
- Secure headers + HTTPS-only cookies audit.

## Impact

- Affected specs: shelter submission API (429 on the capped account);
  verify-request + register APIs (429 when the per-contact window is full).
- No schema change (slice 1 counts over `shelters.created_by`/`source`/
  `created_at`, all present since V5/V7; slice 2 keeps the window in
  process memory).
- Frontend: no change in slices 1–2 (the 429 body is uniform
  `ErrorResponse`; the submit/verify UI surfacing is a follow-up note,
  not required for the caps to be effective).
