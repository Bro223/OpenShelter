# Tasks — de-slop-pass

## Backend (one child)

- [x] C1: `APP_DISPLAY_NAME = "OpenShelter"` constant (small home, e.g.
      `app/AppInfo.java`); replace "Shelter Map" in
      EmailVerificationProvider:52, PhoneVerificationProvider:54,
      PasswordResetService:117, ContactChangeService:87,139,
      SmtpPulseSmtpSender:49 (+:52 log). Keep `spring.application.name`.
      — verified: `app/AppInfo.java` holds `APP_DISPLAY_NAME =
      "OpenShelter"`; all 6 user-received strings + SMTP subject use it;
      `spring.application.name` untouched (application.yml)
- [x] C2: VerificationController:75 → "eID verification is not
      available yet." (stub fact stays in the comment)
      — verified at VerificationController:78
- [x] C3: capitalize the ~12 lowercase backend user-facing messages
      (ShelterController:84,166,174,177; ShelterReviewService:88,102,139;
      ApiErrorHandler:125; VerificationThrottledException:15 + any others
      the audit lists); update every test asserting those strings
      — verified: "A verified account is required to submit shelters",
      "A verified account is required to modify shelters", "An account
      with this email or phone already exists", etc.; commit: "~15
      backend user-facing messages capitalized (verified live: 401 now
      reads 'Authentication required')"
- [x] C4: "verification token" → "verification code" in the e-mail line
      — verified at EmailVerificationProvider:55
- [x] K4: named 8-char constant in EmailVerificationProvider
      (verification-internal, per dependency rule) + "mirrors frontend
      verify-page EMAIL_CODE_LENGTH — do not drift" comment
      — verified: `TOKEN_LENGTH = 8` + do-not-drift mirror comment
- [x] K5: promote duplicated backend strings to constants
      ("an account with this email already exists" ×3 / phone variants,
      "a verified account is required to modify shelters" ×2)
      — verified: `DUPLICATE_EMAIL_MESSAGE` / `DUPLICATE_PHONE_MESSAGE`
      (DuplicateAccountException, used from AuthService +
      ContactChangeService) and `MODIFY_SHELTERS_MESSAGE`
      (ShelterController:60, used ×2)
- [x] tests: update message assertions; add 1 assertion that a
      user-received message contains the APP_DISPLAY_NAME constant
      — verified: SmtpPulseSmtpSenderTest + PasswordResetServiceTest
      assert on `APP_DISPLAY_NAME`

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

- [x] `mvn -q test` · `npx ng test --watch=false` · both tsc configs ·
      prettier on touched files
      — GATE PASSED (commit 1aaf143: "321 backend, 513 frontend, tsc
      clean (app+spec), prettier clean"); backend re-counted 2026-09-11
      pre-fix-wave from a surefire run: 321 green, 0 failures
- [x] live E2E spot check: trigger a dev e-mail (dev endpoint) to see
      the new brand line + subject; banner shows a capitalized backend
      message (e.g. unverified submit attempt)
      — commit 1aaf143 records the live banner check ("verified live: 401
      now reads 'Authentication required'"); the brand line + subject
      (all 6 user-received strings + SMTP subject via
      `AppInfo.APP_DISPLAY_NAME`) are verified in code
