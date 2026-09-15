# OpenShelter audit report (Workstreams A + B + C)

Date: 2026-09-13. Source of truth: the repository (code + config), not documentation.

## 1. Confirmed features found in the codebase

- Angular 22 frontend (`frontend/`) + Spring Boot 3 / Java backend (`src/main/java/ee/sheltermap`).
- Leaflet map (OpenStreetMap tiles) + Nominatim geocoding (address search), client-side Haversine
  nearest-shelter ranking.
- Auth: register/login with email-or-phone + password (Argon2), silent refresh (JWT access token
  in memory + refresh token in localStorage `os.refresh`), password reset by email code.
- Verification: email + phone one-time codes (EMAIL/PHONE levels). Smart-ID provider exists but is
  rejected by the backend as a stub (not active).
- PII at rest: AES-256-GCM encryption + one-way HMAC blind index for email/phone. National
  identification code was removed (V12).
- Provenance taxonomy: PAASETEAMET / MUNICIPALITY (official) vs USER (community), with trust
  states NEW ("Newly added"), CONFIRMED ("Community-checked"), REJECTED, plus reported/occupancy/
  open-status/inaccurate states.
- User-generated content: shelters + reports (closed/inaccurate/nonexistent/occupancy/open-status)
  - info-request replies. Reviews were removed (V21) and no longer exist.
- Moderation: admin dashboard, audit log, suspension, hide/correct/remove.
- Self-service: data export (JSON) + account deletion (purge private, orphan public).
- i18n foundation (en + et) for app chrome + route titles; feature-page copy still hardcoded
  English (M14 slice 2 pending).
- Design tokens in `styles.scss` + high-contrast theme, policed by `design-tokens.spec.ts`.

## 2. Personal data processed

Name, email address, phone number, password (Argon2 hash only), verification levels, user kind
(admin), submitted shelters/reports. No national ID, no analytics/tracking.

## 3. Location data processed

Browser geolocation is user-initiated only ("Show shelters around you" / submit form), computed
client-side, never sent to the backend. Address search (Nominatim) sends the searched address.
Shelter coordinates are stored as part of submissions. No IP geolocation anywhere.

## 4. User-generated content

Shelters and reports (typed factual reports + occupancy/open-status). Reviews are gone. Submitters
can edit/remove own shelters; admins review/hide/correct/remove; reports feed trust-weighted
auto-hide.

## 5. Third-party providers used (confirmed)

- SendPulse (SMTP, `smtp-pulse.com`) for verification/reset/contact-change email codes.
- Twilio (SMS, send-only) for verification/contact-change SMS codes.
- OpenStreetMap map tiles + Nominatim geocoding.
- Paasteamet (Estonian Rescue Board) open-data CSV is an inbound data source.
- No CAPTCHA, no analytics, no error-monitoring SaaS.

## 6. Cookies and browser storage used

No HTTP cookies. localStorage only: `os.refresh` (refresh token), `openshelter-theme`
(high-contrast preference), `openshelter-locale` (language). All necessary; none optional.

## 7. User roles and moderation capabilities

REGISTERED (verified) vs ADMIN (env-provisioned). Admins: review, hide/correct/remove shelters,
suspend users, mark inaccurate, view audit trail. Users: submit/edit/delete own shelters, submit
reports.

## 8. Data retention that can be confirmed

Account data for the life of the account; deletion removes private shelters, orphans public ones,
cascades tokens/claims/reports. No calendar-based auto-deletion (owner decision pending).

## 9. Security measures that can be confirmed

Argon2 password hashing, AES-GCM PII encryption + blind index, rate limits (OTP, submissions,
reports), security headers filter, fail-closed boot guards, JWT refresh rotation, cross-channel
contact-change confirmation, near-duplicate detection.

## 10. Missing information requiring a decision

Operator legal name/address/contact, data-protection contact, retention schedule, legal bases,
applicable law/dispute venue, whether any processor involves an international transfer.

## 11. Contradictions between existing pages and actual code

- The committed privacy policy and terms referenced "reviews", which V21 removed. Fixed.
- The register page subtitle referenced "reviews". Fixed.
- README still mentions "review" in one capability line (not in scope; flagged as follow-up).
- map-page.spec.ts still asserts a `.shelter-row--nearest` emphasis class that the template no
  longer renders (pre-existing WIP inconsistency at HEAD, unrelated to this workstream).

## 12. Legal/product risks to disclose

- OpenShelter is not an official government or emergency service; community data must never look
  official (the UI already labels sources; the new "How it works" block restates this).
- No operator identity/contact published yet; placeholders inserted.
- No legal review has been performed on the draft text.
