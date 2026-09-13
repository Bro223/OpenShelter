# Tasks — legal-recovery (M4)

## Slice 1 — data export (this pass)

- [x] OpenSpec change dir: proposal.md + spec delta (account data export,
      4 scenarios) + tasks.md
- [x] BE `DataExportResponse` (profile / shelters / reviews records —
      phone null for the admin, address null for USER rows)
- [x] `AccountService.dataExport`: decrypted profile + verified levels,
      every author-scoped shelter row (all statuses,
      `ShelterRepository.findByCreatedBy`), every review with the shelter
      id + name (one batched `findByIds` read, same idiom as
      `/account/reviews/mine`); `myReviews` refactored onto the shared
      name-map helper (no N+1)
- [x] `AccountController`: `GET /account/export` (same auth rule as
      `/me`, no rate bucket — cheap read) + class javadoc
- [x] `AccountDataExportIT`: anonymous 401; decrypted profile + own
      shelter (fields incl. NEW review status, null address) + own review
      (shelter id + resolved name); author scoping (other user's rows
      absent); empty lists without contributions
- [x] FE `DataExportResponse`/`DataExportShelter`/`DataExportReview`
      models + `AccountGateway.exportData()`
- [x] FE account page "Your data" panel: `downloadData()` — fetch +
      client-side Blob download `openshelter-data-export-<YYYY-MM-DD>.json`,
      shared busy flag, success banner, 5xx → standard banner
- [x] FE specs: gateway `/account/export` call + page success/failure
      flows (anchor download name asserted, nothing downloaded on error)
- [x] Gates green: `npx ng test` + `mvn -q test`

## Slice 2 — account deletion (this pass)

- [x] `DELETE /account` (verified-user gate, idempotent 204): SPLIT rule
      — PURGE the user's PRIVATE rows, ORPHAN the PUBLIC rows
      (`created_by -> NULL`, `review_note` redacted, trust state
      untouched), redact `moderation_actions.reason` on the user's
      shelters, erase the user row (DB cascades the rest — admin-delete
      convention, audit rows keep dangling ids)
- [x] V14 migration: `moderation_actions.moderator_id` nullable +
      `ON DELETE SET NULL` (erased AUTO_CONFIRM actors dangle, render
      "Unknown"; entity column + admin read already null-safe)
- [x] FE: type-to-confirm delete on the account page (type DELETE),
      then local session end + navigate to the map
- [x] ITs + gates: `AccountDeletionIT` 5/5 (anon 401, unverified 403,
      private-purged/public-orphaned + cascade + blind-index-free +
      re-register, idempotent second delete, export-after-delete yields
      no data) + BE/FE gates green

## Slice 3 — privacy policy + terms (this pass)

- [x] Static FE pages (no backend): `features/legal/privacy-policy-page`
      + `features/legal/terms-page` (OnPush, no state, app tokens only),
      lazy routes `/privacy` + `/terms` (titleGuard, bundle budget)
- [x] Footer links on EVERY page via the shell (`.shell-footer__legal`
      under the safety notice) + page specs pinning the claims the copy
      makes (verification+recovery reasons, encryption facts, client-side
      location, no IP inference, self-service rights, 112 framing,
      verified-user ≠ verified-shelter)
- [x] "Why we collect e-mail/phone" copy on the register form (`.field-note`
      under the e-mail field: verification code + password resets; under
      the phone field: verification code + later login)

## Slice 4 — retention rules + explicit geolocation consent (partial — retention owner-owed)

- [x] Geolocation consent: the "Show shelters around you" CTA stays the
      ONLY user-initiated trigger; a standing consent line under it now
      states the browser asks first and the location is never sent to the
      servers (the nearest ranking is client-side — no backend call);
      never IP geolocation (no such code path exists — verified in review)
- [ ] Retention rules — **OWNER PRODUCT CALL (logged 2026-09-13, not
      decided)**: whether to run any calendar-based retention (e.g. auto-
      deletion of inactive accounts, or a data-prune schedule). The
      privacy policy states the CURRENT behavior only (data kept for the
      life of the account, no automatic deletion today) and flags that it
      will be updated if that changes. M15 (security/backups/monitoring)
      is the natural place to revisit this with the owner.
