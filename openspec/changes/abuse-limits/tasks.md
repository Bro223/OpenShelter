# Tasks — abuse-limits (M3)

## Slice 1 — per-user daily submission cap

- [x] Config `app.limits.daily-submissions-per-user: 5` (main + test yml)
- [x] `ShelterSubmissionThrottledException` (429 + `retryAfterSeconds`,
      same idiom as the auth throttles)
- [x] `ShelterRepository` seam: `countByCreatedByAndSourceAndCreatedAtAfter`
      + `findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc`
      (Spring Data derived + JPA delegate + in-memory fake)
- [x] `ShelterService.addPlace`: rolling 24 h cap, ADMIN exempt,
      `Retry-After` from the oldest in-window submission
- [x] `ApiErrorHandler`: 429 + `Retry-After` handler (uniform
      `ErrorResponse`)
- [x] `ShelterDailyLimitIT`: 6th submission 429 + Retry-After + row NOT
      created, per-user isolation, delete frees the slot, admin exempt
- [x] Gates green: `mvn -q test` (incl. unit fakes updated for the new
      constructor arg)

## Slice 2 — OTP caps (done)

- [x] `RollingContactOtpLimiter` (verification pkg): rolling-window cap per
      normalized contact (e-mail / E.164 phone), 429-friendly verdict with
      exact `Retry-After` (oldest in-window event), clock-injectable,
      `maxPerWindow <= 0` disables; wired as a bean from
      `app.limits.otp-per-contact-max` / `-window-hours` (main + test yml)
- [x] Per-phone OTP request cap: enforced in `VerificationService.
      requestVerification` AFTER the per-(user, level) gate, so a cooldown/
      daily-cap reject records nothing; the contact cap counts only REAL
      sends (Twilio/SMTP volume valve). Keys are namespaced per surface
      (`verify:` vs `register:`) so registering an account does not consume
      its verification-send budget
- [x] Per-e-mail caps on the verify + register request endpoints:
      `/verify/request` (EMAIL level, `verify:` seam, same rolling cap as the
      phone) and `/auth/register` (`register:` seam, every attempt counts — a
      duplicate-409 retry is still an attempt — 429 + Retry-After instead of
      a 409 loop); per-IP stays on the existing verify/register token
      buckets; test-yml runs the cap at 100 (IT harnesses reuse fixed
      e-mails in one shared context) — cap-under-test ITs pin it themselves
- [x] ITs for each cap: `OtpContactCapIT` (phone 3rd request 429 +
      Retry-After + nothing sent; e-mail verify 3rd request 429 + nothing
      sent; register 3rd attempt 429 after 201 + 409) +
      `RollingContactOtpLimiterTest` (window expiry, isolation,
      normalization, retry-after math, disabled mode) + service-level
      `VerificationServiceTest` interaction test

## Slice 3 — duplicate-submission detection (done)

- [x] Near-duplicate definition: an ACTIVE USER row with the same
      NORMALIZED name (lowercase, trim, collapsed whitespace — USER rows
      carry no address, a registry-only field, so name + coordinates are
      the whole identity signal) AND within `app.limits.duplicate-coord-meters`
      (default **100**, main + test yml) haversine. Fuzzier re-reports
      (same place, reworded name) stay bounded by the daily cap
- [x] Detection at submit time: `ShelterService.addPlace` checks it AFTER
      the active/daily caps (429 precedes 409), **cross-user** (the
      throwaway-account re-report vector; own re-POST also 409s — editing
      goes through PUT), ADMIN kind exempt (like the caps); INACTIVE rows
      don't match (admin reject / auto-hide free the place). New
      `ShelterDuplicateException` → **409**, plain-spoken message carries
      the existing row id (`shelter #<id>`) — uniform `ErrorResponse` shape
      kept. Java-side scan over `findAllActiveBySourceIn([USER])` (one
      indexed query, the USER table is small) — no new repository method.
      `haversineMeters` / `normalizeName` / `normalizedNamesEqual` are
      package-private statics, unit-tested directly
- [x] ITs: `ShelterServiceTest` +9 (same-name-same-point 409 with the row
      id, cross-user, case/whitespace, different-name-same-point allowed,
      1 km away allowed, INACTIVE not a duplicate, admin exempt,
      daily-cap precedence, normalization + haversine math) and
      `ShelterDuplicateIT` 7/7 over HTTP (resubmit 409 + row id + no row
      created, ~50 m offset 409, different name 201, ~1 km 201, cross-user
      409 with the original row untouched, admin exempt 201, hidden row
      re-addable 201)

## Slice 4 — admin alerts

- [ ] Alert surface for throttled/abusive accounts

## Slice 5 — secure headers + HTTPS-only cookies audit

- [ ] Header filter (X-Content-Type-Options, X-Frame-Options,
      Referrer-Policy, CSP, HSTS)
- [ ] Cookie flags audit (Secure/HttpOnly/SameSite)
- [ ] ITs asserting the headers
