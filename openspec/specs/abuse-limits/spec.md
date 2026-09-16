# abuse-limits Specification

## Purpose
TBD - created by archiving change abuse-limits. Update Purpose after archive.

## Requirements

### Requirement: Per-user daily submission cap

The backend SHALL limit each non-admin account to
`app.limits.daily-submissions-per-user` (default **5**) shelters with
`source = USER` created within a rolling 24 h window; the next submission
SHALL be rejected with HTTP **429**, the uniform `ErrorResponse` and a
`Retry-After` header carrying the exact seconds until the oldest
in-window submission leaves the window. Users of `ADMIN` kind SHALL be
exempt. Deleting a row frees its slot (the row is gone).

#### Scenario: Capped resubmission

- **WHEN** a verified user has made 5 USER submissions within the last 24 h
  and submits a 6th
- **THEN** the API answers 429 with `Retry-After` (uniform error body) and
  no shelter row is created

#### Scenario: Admin exemption

- **WHEN** an ADMIN-kind account makes more than 5 USER submissions within
  24 h
- **THEN** all submissions are accepted (201)

#### Scenario: Slot freed by delete

- **WHEN** a capped user deletes one of their in-window rows and submits
  again
- **THEN** the submission is accepted (201)

### Requirement: Per-contact OTP caps

The backend SHALL cap verification-code events per normalized contact
(e-mail lower-cased / phone E.164) at `app.limits.otp-per-contact-max`
(default **5**) within a rolling
`app.limits.otp-per-contact-window-hours` (default **24**) window,
ACROSS users, with HTTP **429** + `Retry-After` above the cap;
`max <= 0` disables the cap. The verify-request surface SHALL count only
REAL sends (checked after the per-(user, level) gate), and the
registration surface SHALL count every attempt. Keys are namespaced per
surface so registration does not consume the verification-send budget.

#### Scenario: Capped OTP request

- **WHEN** the 3rd OTP request for the same phone arrives within the
  window (cap 2 in the IT)
- **THEN** the API answers 429 with `Retry-After` and no code is sent

#### Scenario: Registration attempts count

- **WHEN** the same e-mail is used for registration attempts beyond the
  cap (including duplicate-409 retries)
- **THEN** the attempts answer 429 with `Retry-After` instead of a 409
  loop

### Requirement: Near-duplicate submission detection

The backend SHALL reject a USER shelter submission as a near-duplicate
when an `ACTIVE` USER row with the same normalized name (lowercase, trim,
collapsed whitespace) lies within `app.limits.duplicate-coord-meters`
(default **100**) haversine of the submitted point; the rejection SHALL
be HTTP **409** with the uniform `ErrorResponse`, its message carrying
the existing row id. The check SHALL apply across users, SHALL NOT
match `INACTIVE` rows, SHALL EXEMPT `ADMIN` kind, and SHALL run after the
active/daily caps (a capped resubmission answers 429, not 409). USER rows
carry no address, so name + coordinates are the complete identity signal.

#### Scenario: Resubmitting the same place

- **WHEN** a verified user submits a shelter whose name (normalized) and
  point match an existing ACTIVE USER row within 100 m
- **THEN** the API answers 409, the message names the existing shelter
  id, and no new row is created

#### Scenario: Cross-user re-report

- **WHEN** a second account submits the same name and point as an
  existing USER row
- **THEN** the API answers 409 with the first row's id (the
  throwaway-account re-report vector)

#### Scenario: Legitimate distinct submissions

- **WHEN** a submission differs in name at the same point, or matches the
  name but is ~1 km away, or matches an INACTIVE (hidden/rejected) row
- **THEN** the submission is accepted (201)

#### Scenario: Admin exemption

- **WHEN** an ADMIN-kind account submits a shelter matching an existing
  USER row in name and point
- **THEN** the submission is accepted (201)

### Requirement: Admin throttle-abuse alerts

The backend SHALL append an alert to a bounded in-memory ring
(`app.limits.alerts-retained`, default **200**; `<= 0` disables
recording) whenever an M3 mechanism throttles or flags an account:
the per-user daily submission cap (429), the per-contact OTP cap on the
verify or register surface (429), and a near-duplicate rejection (409,
whose detail names the existing row). `GET /admin/alerts?limit=` SHALL
serve them newest first behind the fresh-lookup admin guard (401
anonymous, 403 non-admin), with `limit` 1..200 (default **50**; out of
range 400). The ring is process memory (W16): a restart clears it and
replicas see only their own share — a triage view, not a durable log.
Contact subjects SHALL be normalized the same way as the limiter's
bucket key (trim + root-locale lowercase).

#### Scenario: A capped account becomes an alert

- **WHEN** a user's 6th USER submission within 24 h is rejected with 429
  and an admin calls `GET /admin/alerts`
- **THEN** the list contains a row with kind `submission-daily-cap`,
  subject `user:<id>`, and a non-null `retryAfterSeconds`

#### Scenario: A repeat reporter becomes an alert

- **WHEN** a second account's near-duplicate submission is rejected with
  409 and an admin calls `GET /admin/alerts`
- **THEN** the list contains a row with kind `near-duplicate`, subject
  `user:<id>` of the re-reporter, and a detail naming the existing
  shelter's id

#### Scenario: Newest first, oldest evicted

- **WHEN** more than the retention bound of alerts have been recorded
- **THEN** the ring keeps only the newest `alerts-retained` rows and
  `GET /admin/alerts` returns them newest first

### Requirement: Secure headers and stateless cookie posture

Every backend response — success, 4xx, 5xx and the security 401/403
error bodies — SHALL carry the hardening headers
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: no-referrer` and `Content-Security-Policy:
default-src 'self'`. `Strict-Transport-Security` (max-age one year,
includeSubDomains) SHALL be sent ONLY when the request is secure
(HTTPS) — never over plain-HTTP dev traffic. The app is stateless JWT:
the backend SHALL NOT set any cookie on any response.

#### Scenario: Error responses are hardened too

- **WHEN** a request is rejected (401 unauthenticated, 404 unknown
  resource, 400 malformed)
- **THEN** the error response carries all four hardening headers and no
  `Set-Cookie` header

#### Scenario: HSTS is HTTPS-only

- **WHEN** the same public endpoint is called over plain HTTP and over
  HTTPS
- **THEN** the plain-HTTP response has no `Strict-Transport-Security`
  header and the HTTPS response carries it with the one-year
  includeSubDomains value

#### Scenario: No cookie is ever set

- **WHEN** any endpoint is called (public reads, the auth surface,
  protected routes)
- **THEN** the response carries no `Set-Cookie` header (stateless JWT
  posture — the source audit found no cookie-setting paths)
