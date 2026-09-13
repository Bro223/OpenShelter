# Spec Delta: legal-recovery (new capability)

## ADDED Requirements

### Requirement: Account data export

The backend SHALL provide `GET /account/export` for authenticated users,
returning the caller's own data as one JSON document: the profile (name,
e-mail, phone — decrypted at the persistence boundary — plus the verified
levels), every shelter row the user created (all statuses, author-scoped),
and every review the user wrote (with the shelter's id and name). The
endpoint SHALL require a valid JWT (401 anonymous) and SHALL NOT add a
rate bucket beyond the standard `/account` rules. Another user's rows
SHALL NOT appear in the document.

#### Scenario: Anonymous export

- **WHEN** `GET /account/export` arrives without a valid JWT
- **THEN** the API answers 401 and no data is returned

#### Scenario: User with contributions

- **WHEN** a verified user who submitted one shelter and wrote one review
  on it calls the endpoint
- **THEN** the API answers 200 with `profile` (decrypted e-mail/phone +
  verified levels), `shelters` containing exactly the user's row and
  `reviews` containing the review with the shelter's id + name

#### Scenario: Author scoping

- **WHEN** user A exports while user B has also submitted a shelter
- **THEN** A's document contains only A's rows — B's shelter and reviews
  are absent

#### Scenario: User without contributions

- **WHEN** a verified user with no shelters and no reviews calls the
  endpoint
- **THEN** the API answers 200 with `shelters: []` and `reviews: []`

### Requirement: Account deletion

The backend SHALL provide `DELETE /account` for a verified user (valid
JWT + at least one verification claim; 401 anonymous, 403 without a
claim). In one transaction it SHALL: hard-delete every shelter row where
`created_by` is the user and `location_kind = 'PRIVATE'`; set
`created_by = NULL` on the user's remaining (PUBLIC) shelter rows and
null their `review_note` without changing any other field (a CONFIRMED
row stays CONFIRMED — a newly-NULL creator is not a re-review signal);
null the `reason` of every `moderation_actions` row for the user's
shelter ids (the action rows themselves survive); and delete the user
row. The DB FK policy completes the erasure: every child `user_id` is
`ON DELETE CASCADE` (credentials, verification claims, pending
verifications and contact changes, refresh and password-reset tokens,
reviews, reports, report actions) and `moderation_actions.moderator_id`
is `ON DELETE SET NULL` (V14) — audit rows survive with dangling ids and
render "Unknown" for an erased moderator. The M2 blind-index columns
(email_hash/phone_hash) die with the user row, so the erased contacts
can be re-registered. A second `DELETE /account` with the still-valid
JWT SHALL be an idempotent 204 no-op.

#### Scenario: Anonymous deletion

- **WHEN** `DELETE /account` arrives without a valid JWT
- **THEN** the API answers 401 and nothing is erased

#### Scenario: Unverified account

- **WHEN** a registered user without any verification claim calls the
  endpoint
- **THEN** the API answers 403 and the account still exists

#### Scenario: Private rows purged, public rows orphaned

- **WHEN** a user with one PUBLIC shelter (CONFIRMED via a community
  report) and one PRIVATE shelter deletes the account
- **THEN** the PRIVATE row is hard-deleted (GET on it → 404) and the
  PUBLIC row remains with `created_by = NULL` and its review status
  unchanged (CONFIRMED stays CONFIRMED), rendered to the map as
  `submitterVerified: false` with no submitter label

#### Scenario: The account cascades

- **WHEN** the deletion commits
- **THEN** the user's credentials, claims, pending verifications and
  contact changes, refresh and password-reset tokens, reviews and
  reports are gone — re-login answers 401, a stored refresh token no
  longer refreshes, and no `users` row (ciphertext or blind index)
  matches the erased e-mail or phone

#### Scenario: Audit rows survive with dangling ids

- **WHEN** an AUTO_CONFIRM audit row was recorded with the deleted user
  as the reporting actor of record
- **THEN** the audit row survives with `moderator_id = NULL`, while a
  row whose actor is another (surviving) user keeps that id

#### Scenario: Idempotent repeat

- **WHEN** `DELETE /account` is called twice with the same (still valid)
  JWT
- **THEN** both calls answer 204 and the second is a no-op

#### Scenario: No user data after erasure

- **WHEN** the user exports data, deletes the account, then requests the
  export again with the same JWT
- **THEN** no data document is returned (the account no longer exists
  behind the token) and the erased contact can be re-registered

### Requirement: Legal pages (privacy policy + terms of use)

The frontend SHALL serve a static privacy policy at `/privacy` and a
static terms of use at `/terms` (no backend endpoints; both public, no
auth guard, browser-tab titles via the standard title guard). Both pages
SHALL be reachable from every page via the app shell footer. The privacy
policy SHALL state, matching the implementation: what is collected
(name, e-mail, phone, password, submitted content); why e-mail and phone
are collected (identity verification + account recovery, and only those
uses); that e-mail/phone are encrypted at rest with a one-way lookup
index and passwords one-way hashed; that location is used only on
user-initiated actions, that the map's nearest ranking is computed in the
browser (live position never sent to the servers), and that IP
geolocation is never performed; who sees the data (no sale or
advertising; e-mail/SMS delivery providers see the destination contact);
the self-service rights (JSON export, account deletion with its
private-purged/public-orphaned consequence, code-verified contact change,
password reset); and that retention is for the life of the account with
no automatic deletion of inactive accounts yet (the retention schedule
itself is an owner product call — logged, not asserted).

#### Scenario: Privacy policy page

- **WHEN** an anonymous visitor opens `/privacy`
- **THEN** the policy renders with the sections: what we collect, why we
  collect e-mail/phone (verification + recovery), storage facts
  (encrypted at rest, one-way index/hash), location (user-initiated,
  in-browser ranking, no IP inference), sharing (no sale; delivery
  providers only), self-service rights, retention (life of account, no
  auto-deletion yet) and contact/changes

#### Scenario: Terms of use page

- **WHEN** an anonymous visitor opens `/terms`
- **THEN** the terms render with the app's safety framing (community
  list, not an official emergency service, 112 first, official sources),
  the account/verification rules, the contribution rules (accuracy duty,
  the M3 caps framed as limits-with-wait not bans, reviewability), the
  trust-label gap (a verified user is not a verified shelter), a pointer
  to the privacy policy for personal data, the no-warranty clause and the
  changes clause

#### Scenario: Footer links on every page

- **WHEN** any page renders the app shell
- **THEN** the footer contains links to "Privacy policy" (`/privacy`)
  and "Terms of use" (`/terms`) below the safety notice

### Requirement: Contact-collection disclosure and geolocation consent

The register form SHALL explain under the e-mail field and the phone
field why each contact is collected (one-time verification code now,
recovery/login uses later). The map's "Show shelters around you" CTA
SHALL remain the ONLY geolocation trigger and SHALL be paired with a
standing consent line stating that the browser asks first and that the
location is never sent to the servers (the nearest ranking is
client-side). IP geolocation SHALL NOT be performed anywhere.

#### Scenario: Register form why-we-collect notes

- **WHEN** an anonymous visitor opens the register form
- **THEN** the e-mail field carries a note naming the verification code
  and password resets, and the phone field carries a note naming the
  verification code and later login

#### Scenario: Geolocation is user-initiated and disclosed

- **WHEN** an anonymous visitor is on the map page before any location
  request
- **THEN** no geolocation request has been made, the CTA is the only
  trigger, and the consent line under it states the browser asks first
  and the location is never sent to the servers
