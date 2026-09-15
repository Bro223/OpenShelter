# Spec Delta: shelter-submission (shelter-trust-and-reports)

## ADDED Requirements

### Requirement: Per-user active shelter cap

`POST /api/shelters` SHALL reject with 409 a submission when the
submitting user already has 10 shelters with `source=USER` and
`status=ACTIVE` (deletions and hidden shelters free up the cap). The
error message SHALL state the cap plainly, in the product's
sentence-case user-facing vocabulary. The cap SHALL NOT apply to users
of `ADMIN` kind.

#### Scenario: cap reached

- **WHEN** a verified user with 10 active user-shelters submits an
  11th
- **THEN** the request fails with 409 and a message explaining the limit
  of 10 active shelters

#### Scenario: deleting frees the cap

- **WHEN** the same user deletes one shelter and submits again
- **THEN** the new submission is accepted
