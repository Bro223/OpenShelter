# Spec Delta: abuse-limits (new capability)

## ADDED Requirements

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
