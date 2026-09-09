## ADDED Requirements

### Requirement: Outgoing user messages SHALL carry the product name

Every e-mail and SMS the app sends (verification, OTP, password reset,
contact change, SMTP subject) SHALL identify the product as
"OpenShelter" via a single shared backend constant. The legacy working
name "Shelter Map" SHALL NOT appear in any user-received message.

#### Scenario: Verification e-mail

- **WHEN** the app sends an email verification code
- **THEN** the message body and the subject name "OpenShelter" (not
  "Shelter Map")

### Requirement: User-facing messages SHALL be free of internal jargon

Exception messages rendered to users SHALL NOT contain internal
identifiers (enum names like SMART_ID) or process notes ("stub in v1").
Internal implementation facts belong in code comments only.

#### Scenario: eID request

- **WHEN** a caller requests a verification channel that is not
  implemented
- **THEN** the 400 message is plain user language
  ("eID verification is not available yet.") with no enum token or
  stub note

### Requirement: Banner text SHALL be sentence case regardless of origin

Backend user-facing messages echoed by the frontend banner SHALL start
with a capital letter, matching the sentence-case frontend copy, so the
same banner component never flips capitalization between sources.

#### Scenario: Backend message in banner

- **WHEN** a backend 400/403 message ("a verified account is required…"
  class) is rendered in the app banner
- **THEN** it renders sentence-case like every other banner string

### Requirement: Verification terminology SHALL be consistent across channels

The e-mail that delivers the verification value and the UI field that
receives it SHALL use the same term ("code") and the same length
constant, named in both languages with an explicit mirror comment
(backend provider constant; FE `EMAIL_CODE_LENGTH = 8`), so a length
change cannot drift silently.

#### Scenario: User follows the e-mail

- **WHEN** the user reads the verification e-mail and enters the value
- **THEN** the e-mail called it a "code" of the same length the UI asks
  for

### Requirement: User-facing strings SHALL not be duplicated or intensifier-laden

Repeating user-facing strings (≥2 occurrences) SHALL be named
constants in their owning module. The map home subtitle SHALL match
the meta description verbatim (no soft intensifier like "every").
User-visible copy SHALL not use the em-dash as its default clause
joiner: of the current 12 em-dash clauses, the most formulaic ~6 SHALL
become separate sentences or commas (remaining natural uses allowed;
code comments untouched).

#### Scenario: Duplicated string

- **WHEN** the same user-facing message appears in ≥2 places in one
  module
- **THEN** it is a named constant referenced from both places

#### Scenario: 404 detail copy

- **WHEN** a shelter ID does not exist
- **THEN** the detail text refers to "this ID" (the route key), not
  "this address"
