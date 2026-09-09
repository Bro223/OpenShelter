# Tasks — de-slop-pass

## Backend (one child)

- [ ] C1: `APP_DISPLAY_NAME = "OpenShelter"` constant (small home, e.g.
      `app/AppInfo.java`); replace "Shelter Map" in
      EmailVerificationProvider:52, PhoneVerificationProvider:54,
      PasswordResetService:117, ContactChangeService:87,139,
      SmtpPulseSmtpSender:49 (+:52 log). Keep `spring.application.name`.
- [ ] C2: VerificationController:75 → "eID verification is not
      available yet." (stub fact stays in the comment)
- [ ] C3: capitalize the ~12 lowercase backend user-facing messages
      (ShelterController:84,166,174,177; ShelterReviewService:88,102,139;
      ApiErrorHandler:125; VerificationThrottledException:15 + any others
      the audit lists); update every test asserting those strings
- [ ] C4: "verification token" → "verification code" in the e-mail line
- [ ] K4: named 8-char constant in EmailVerificationProvider
      (verification-internal, per dependency rule) + "mirrors frontend
      verify-page EMAIL_CODE_LENGTH — do not drift" comment
- [ ] K5: promote duplicated backend strings to constants
      ("an account with this email already exists" ×3 / phone variants,
      "a verified account is required to modify shelters" ×2)
- [ ] tests: update message assertions; add 1 assertion that a
      user-received message contains the APP_DISPLAY_NAME constant

## Frontend (one child, parallel with backend child)

- [x] K3: remove `_expiresIn` from `core/token-store.ts setTokens` +
      update call sites (session/auth-store login/rotate) + specs
- [x] K4: `EMAIL_CODE_LENGTH = 8` in verify-page.ts with mirror comment;
      build the regex and both strings from it
- [x] C5: shelter-detail-page.html:4 → "No shelter with this ID exists
      — it may have been removed."
- [x] C7: map-page.html subtitle → identical to index.html meta
      description (drop "every", match plural)
- [x] C6: pick ~6 of the 12 user-visible em-dash clauses (audit list:
      login-page.html:7,11; register-page.html:5,14;
      verify-page.html:4,29,85,101; account-page.html:17,47,172,257,316;
      contributions-panel.html:140; shelter-detail-page.html:4) and
      reword into two sentences/commas — meaning 1:1, no creative
      rewriting; leave ≥6 em-dashes in place (natural ones)
- [x] K5: dedup the 2 repeated strings in shared/error-copy.ts
      ("Please check your input and try again." ×2) + spec
- [x] accepted-items docs: one-line comment in shared/shelter-copy.ts
      documenting chip "User" as the short form of "User-submitted"

## Docs (either child may do — no overlap: assign to FE child)

- [x] K1: README security section note — `a5e83db` commit message is
      historical; secret-pattern scan of full history found zero
      credentials; live credentials live in gitignored `.env`
- [x] `frontend/docs/agent/06-CONTEXT-SHELTER.md` term table: add the
      chip short-form note (one line)

## Gates (orchestrator runs, not children)

- [ ] `mvn -q test` · `npx ng test --watch=false` · both tsc configs ·
      prettier on touched files
- [ ] live E2E spot check: trigger a dev e-mail (dev endpoint) to see
      the new brand line + subject; banner shows a capitalized backend
      message (e.g. unverified submit attempt)
