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

## Slice 2 — OTP caps (next)

- [ ] Per-phone OTP request cap (rolling window, 429 + Retry-After)
- [ ] Per-IP + per-e-mail caps on the verify/register request endpoints
- [ ] ITs for each cap

## Slice 3 — duplicate-submission detection

- [ ] Near-duplicate definition (name/coords/address thresholds)
- [ ] Detection at submit time (409 with the existing row id?)
- [ ] ITs

## Slice 4 — admin alerts

- [ ] Alert surface for throttled/abusive accounts

## Slice 5 — secure headers + HTTPS-only cookies audit

- [ ] Header filter (X-Content-Type-Options, X-Frame-Options,
      Referrer-Policy, CSP, HSTS)
- [ ] Cookie flags audit (Secure/HttpOnly/SameSite)
- [ ] ITs asserting the headers
