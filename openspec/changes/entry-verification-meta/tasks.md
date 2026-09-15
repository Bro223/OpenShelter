# Tasks — entry-verification-meta (M8)

## Slice 1 — BE: derivation + DTO fields

- [x] `app/ShelterReportRepository` — `ConfirmedAt` record +
      `latestOpenConfirmedByShelterIds` (batched max per
      (shelter, reporter))
- [x] `app/ModerationAuditLog` — `LatestConfirmation` record +
      `latestConfirmationByShelterIds` (CONFIRM / AUTO_CONFIRM only)
- [x] `app/DataImportLog` — `VERIFIED_STATUSES` +
      `findLatestVerifiedBySource`
- [x] `persistence` — JPA + Spring Data implementations of all three
      (JpaShelterReportRepository, JpaModerationAuditLog,
      JpaDataImportLog)
- [x] `api/ShelterDto` — `reportCount` + `lastVerifiedAt` components
- [x] `api/ShelterQueryService` — batched `lastVerifiedFor` derivation
      (per-source import lookups, self-confirm exclusion, report vs
      audit max) + `reportCount` sum in `toDto`

## Slice 2 — BE: unit + acceptance tests

- [x] test fakes — `InMemoryDataImportLog` (new),
      `InMemoryShelterReportRepository` + `InMemoryModerationAuditLog`
      extended, inline import-log doubles (CsvRegistryClientTest,
      ShelterImportServiceTest) extended
- [x] `ShelterQueryServiceTest` — 12 new tests (count sum, import
      verification incl. FAILED/SKIPPED/NOT_MODIFIED, self-confirm
      exclusion, legacy unclaimed rows, audit max, non-confirming
      actions)
- [x] `LastVerifiedApiIT` — 5 full-stack tests (registry import stamp,
      failed-only unverified, cross-user check stamps + promotes,
      self-confirm no-op, mixed-type count)

## Slice 3 — FE: surfaces

- [x] `core/models.ts` — `ShelterDto.reportCount` + `.lastVerifiedAt`
- [x] `shared/shelter-copy.ts` — `reportedBadgeText`,
      `verifiedAgoText`, `lastVerifiedText`, `communityReportsText`,
      `hasCommunityReports`
- [x] `map-page.html/.ts` — "Reported (n)" badge
- [x] `shelter-detail-page.html/.ts/.scss` — last-verified line
      (+ report-count suffix) in the header
- [x] spec fixtures updated (gateway, leaflet, map, detail, account,
      contributions, submit)

## Slice 4 — FE: spec pins

- [x] `shelter-copy.spec.ts` — pins for the five new helpers
- [x] `map-page.spec.ts` — badge count pin
- [x] `shelter-detail-page.spec.ts` — 5 new line tests + badge count
      pin

## Slice 5 — Docs + gates

- [x] `frontend/docs/agent/05-CONTEXT-MAP.md` — M8 line
- [x] Gates green: FE `ng test` (full), BE `mvn -q test` (full)
- [x] OpenSpec change validated
