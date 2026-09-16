# Tasks: community-self-moderation (M9)

## Phase 1 — Backend

- [x] `ReporterTrust` domain record: weight 1 baseline, +1 cross-verified own submission (USER + CONFIRMED), +1 at ≥ 2 own AUTO_CONFIRM actions, cap 3; `ReporterTrustTest` (6 tests)
- [x] `V16__community_self_moderation.sql`: `shelter_reports.damped BOOLEAN NOT NULL DEFAULT FALSE`; entity + mapper (insert/update + toDomain restore)
- [x] `ShelterReport` domain: `damped` flag, `markDamped()` set-once (mirrors `markDismissed`); `AUTO_HIDE_THRESHOLD` javadoc updated to the weighted tally
- [x] Seams: `ShelterReportRepository.reportersByShelterIdAndType` (JPA query + in-memory fake), `ShelterRepository.countByCreatedByAndSourceAndReviewStatus` (derived query + JPA + fake), `ModerationAuditLog.countByModeratorAndAction` (derived query + JPA + fake)
- [x] `ShelterReportService`: weighted hide tally (crossing 4→≥5 fires exactly once; 5 baseline reporters unchanged; no re-hide after restore; disarmed flag untouched); duplicate dampening at write time (reporter's own OTHER USER row, same normalized name within `app.limits.duplicate-coord-meters` haversine, any status, target excluded — reuses the M3 statics); `reportShelter` returns the damp fact
- [x] API: `POST /api/shelters/{id}/reports` → 200 `{"damped": true|false}` (`ShelterReportResult`); 403/404/409/429 mappings unchanged
- [x] Admin queue: `AdminShelterReportDto.damped` + `AdminModerationService`
- [x] `ShelterReportServiceTest`: 8 new cases (trusted 2+2+1 hides on the 3rd; weight-3 + baseline crosses; dampened rival counts 0 and the row is flagged; inactive own listing still dampens; far/different-name not dampened; own row + positive report never damped; deleted listing cannot dampen) — 23 green
- [x] `ShelterReportIT`: 2 new ITs (displaced rival end-to-end: rejected own row → re-listing → dampened vote → 4 baselines stay ACTIVE → 5th full point hides; trusted reporters 2+2+1 hide on the 3rd) + the shelter-report POST expectations moved 204 → 200 (all IT files, review/occupancy endpoints untouched)

## Phase 2 — Frontend

- [x] `ShelterReportResult` model + `AdminShelterReportDto.damped`
- [x] Gateway `report()` → `Promise<ShelterReportResult>`
- [x] Copy single-sourced in `shelter-copy.ts`: `REPORT_SUBMITTED` (moved out of the detail page) + `REPORT_SUBMITTED_DAMPED`; pins in `shelter-copy.spec.ts`
- [x] Detail page: success notice picks the dampened variant from the response
- [x] Admin queue: "Dampened" badge on flagged rows (+ rendering test)
- [x] FE specs updated (gateway, detail page incl. new dampened-notice test, admin fixtures) — ng test green (822)

## Phase 3 — Orchestrator

- [x] Full gates (mvn test 646 green incl. both gates of the spec delta; ng test 822; prettier)
- [x] Commit `M9: ...`
- [x] Docs/agent-pack sync — N/A this milestone (no agent-pack page describes the report internals; the trust lifecycle puml is unchanged in behaviour)
