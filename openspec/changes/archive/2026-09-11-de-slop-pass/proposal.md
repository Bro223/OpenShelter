# Change: De-slop pass — brand, voice, and consistency scrub

## Why

A read-only audit of the whole app (design tokens, every user-facing
string, all code) found the app almost free of AI-design slop — no vibe
fonts, no gradients, no purple, no emoji, token discipline machine-policed
by `design-tokens.spec.ts`. What remains: the old working name "Shelter
Map" in all outgoing e-mail/SMS (product is OpenShelter), one dev-jargon
message, inconsistent banner capitalization (lowercase backend strings
echoed verbatim), "token" vs "code" terminology drift on the verification
path, a cross-language magic "8", duplicated message strings, and an
em-dash clause rhythm that is the main remaining AI text fingerprint.
This change scrubs exactly the audited list — nothing more (the design
baseline is good and must not be "improved").

## What Changes

Backend:

- C1: "Shelter Map" → "OpenShelter" in all 6 user-received strings
  (email verification, phone OTP, password reset, change-email,
  change-phone, SMTP subject/log) via one shared display-name constant
- C2: SMART_ID 400 message → "eID verification is not available yet."
  (no enum token, no "stub in v1")
- C3: capitalize the ~12 lowercase-starting backend user-facing messages
  (banners render them verbatim)
- C4: email "verification token" → "verification code"
- K4: name the 8-char email code length in both languages (backend
  constant in the provider; FE `EMAIL_CODE_LENGTH = 8` constant with a
  "mirrors backend — do not drift" comment; both UI strings built from it)
- K5: promote the 3 duplicated backend message strings to constants

Frontend:

- K3: drop the dead `_expiresIn` parameter from
  `TokenStore.setTokens` (+ 2 call sites + specs)
- C5: 404 detail "No shelter exists at this address" → "No shelter with
  this ID exists"
- C7: map subtitle drops "every" (now identical to the meta description)
- C6: break ~6 of the 12 em-dash clauses in user-visible copy into two
  sentences or commas (code comments untouched)
- K5: dedup the 2 duplicated strings in `error-copy.ts`
- C8 (submit subtitle) already folded into the shelter-location-input
  rework — NOT repeated here
- K1: README security note — the `a5e83db` commit message mentioning
  "live twilio credentials" is historical; no credentials exist in git
  history (pattern-scanned); live credentials live in gitignored `.env`

Accepted as-is (documented, no change): D1 (account-page note callout
bar), K6 (pagination TODO), K7 (findById batch-path reuse), map filter
chip "User" as short form of "User-submitted" (documented in
shelter-copy.ts comment).

## Impact

- Backend: 7 files (providers, services, controller, error handler,
  sender) + message tests
- Frontend: verify-page.ts, token-store.ts (+auth-store call sites),
  shelter-detail-page.html, map-page.html, 6 template em-dash lines,
  error-copy.ts (+spec), styles untouched
- README (1 note). No pumls, no API shape changes, no behavior changes
  beyond the strings themselves
- Tests: existing string assertions updated; no new tests required
  except a spec that the display-name constant is used (grep-style
  assertion optional)
