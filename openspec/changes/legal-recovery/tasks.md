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

## Slice 2 — account deletion (not started)

- [ ] `DELETE /account` (verified-user gate): purge own data — USER-source
      shelters, reviews, verification claims, pending changes — keep audit
      rows with dangling ids (admin-delete convention)
- [ ] FE: two-step delete on the account page (type-to-confirm)
- [ ] ITs + gates

## Slice 3 — privacy policy + terms (not started)

- [ ] Static FE pages (no backend) + routes + nav/footer links
- [ ] "Why we collect e-mail/phone" copy (verification + account recovery)

## Slice 4 — retention rules + explicit geolocation consent (not started)

- [ ] Retention documentation/decisions (owner product call candidates —
      LOG, do not decide)
- [ ] Geolocation consent: keep the "Show shelters around you" CTA fully
      user-initiated (browser prompt IS the consent; never IP geolocation)
