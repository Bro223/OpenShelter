# Change: abuse-limits

## Why

A single compromised or throwaway account can currently spam the map with
shelter submissions at will. The owner-approved roadmap (M3) adds the
abuse layer: per-user rate caps on submitting, OTP throttles per
phone/IP/e-mail, duplicate-submission detection, admin alerting, and the
secure-headers / HTTPS-only-cookie audit. No CAPTCHA (locked decision).

This change is delivered in slices; **slice 1 (this pass) is the per-user
daily submission cap** — the smallest complete, gate-green piece.

## What Changes

### Slice 1 — per-user daily submission cap (done)

- **`app.limits.daily-submissions-per-user`** (default **5**, main + test
  yml): max `source = USER` shelters one account may create within a
  **rolling 24 h window**. The next submission is **429 Too Many Requests**
  with the uniform `ErrorResponse` and an exact **`Retry-After`** countdown
  (seconds until the oldest in-window submission leaves the window — same
  idiom as the auth throttles).
- **`ShelterService.addPlace`** enforces the cap after the existing checks;
  **ADMIN-kind accounts are exempt** (consistent with the active-shelter
  cap, D3 of shelter-trust-and-reports). The cap counts SUBMITTING, not
  holding: distinct from the 409 active-shelter cap (10 rows). Deleting a
  row frees its slot (the row is gone) — the delete/re-submit churn stays
  bounded by the active cap + the admin surface.
- **Repository seam:** `countByCreatedByAndSourceAndCreatedAtAfter` +
  `findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc`
  (app interface → Spring Data derived query → JPA delegate → in-memory
  fake).
- **New exception** `ShelterSubmissionThrottledException` (429 +
  `retryAfterSeconds`) + handler in `ApiErrorHandler`.

### Remaining M3 scope (later slices — NOT in this pass)

- OTP caps per phone/IP/e-mail (register + verify request endpoints).
- Duplicate-submission detection (near-identical name/address/coords).
- Admin alerts on throttled/abusive accounts.
- Secure headers + HTTPS-only cookies audit.

## Impact

- Affected specs: shelter submission API (429 on the capped account).
- No schema change (counting over `shelters.created_by`/`source`/
  `created_at` — all present since V5/V7).
- Frontend: no change in slice 1 (the 429 body is uniform `ErrorResponse`;
  the submit UI surfacing is a follow-up note, not required for the cap to
  be effective).
