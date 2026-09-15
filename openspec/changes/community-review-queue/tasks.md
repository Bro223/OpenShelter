# Tasks: community-review-queue

## Phase 1 — Backend (SA-A1)

- [x] V11 migration: `shelters.review_status` (CHECK NEW/CONFIRMED/REJECTED, NOT NULL DEFAULT 'NEW'; backfill USER rows NEW, registry rows CONFIRMED), `shelters.review_note VARCHAR(500) NULL`, `shelters.location_kind` (CHECK PUBLIC/PRIVATE, NOT NULL DEFAULT 'PUBLIC'), `moderation_actions` table
- [x] Domain: ReviewStatus + LocationKind enums; shelter aggregate carries reviewStatus/reviewNote/locationKind
- [x] JPA entity fields + admin-queue query (USER + review_status='NEW')
- [x] Submission service: new USER rows → review_status NEW (public immediately) + location_kind from the request (default PUBLIC); submission request accepts `locationKind`
- [x] Report service: OPEN_CONFIRMED by a non-submitter promotes NEW→CONFIRMED in-transaction + AUTO_CONFIRM audit row (submitter's own positive report does not)
- [x] `ModerationAuditLog` app interface + JPA impl + in-memory test double; audit rows for status change, delete, report dismiss, review hide/restore, CONFIRM, AUTO_CONFIRM, REJECT
- [x] Admin: `POST /admin/shelters/{id}/review` {action: CONFIRM|REJECT, reason?} (404/409 as specified), `GET /admin/audit` (newest 100, limit 1..200, read-time name resolution, "Deleted shelter")
- [x] DTOs: public ShelterDto + reviewStatus + locationKind; /mine and admin rows + reviewStatus/reviewNote/locationKind
- [x] Restoring a REJECTED row via the existing status endpoint reverts review_status to NEW
- [x] ITs: new row public as NEW; positive report by other user → CONFIRMED + AUTO_CONFIRM; own positive report → stays NEW; admin CONFIRM; REJECT → hidden + note; restore → NEW; audit rows for all actions; registry rows unaffected (review 409); private kind round-trips
- [x] Targeted mvn tests green (full suite by orchestrator)

## Phase 2 — Frontend (SA-A2)

- [x] Design token `--color-new` (amber, documented in styles.scss; design-tokens spec compliant) + `shelter-marker--new` marker class in styles.scss
- [x] Marker tone: community NEW → amber, CONFIRMED → green, reported override unchanged; legend → Registry / New community / Confirmed community / Reported
- [x] List rows + detail: "Newly added" / "Community-checked" badges (replacing the "User-submitted" provenance text for USER rows), "Private location" badge, detail unverified warning (NEW) + private note (PRIVATE)
- [x] Map CTA: "Show shelters around you" (button/result/empty); result line "≈ N km straight line" (metres <1 km); unverified warning line for community rows
- [x] Submission form: private-home declaration checkbox → locationKind in the payload
- [x] Admin page: "Unconfirmed" tab (USER NEW rows: name/address/submitter; Mark confirmed / Reject with required reason) + "Audit log" tab (newest 100); gateway: reviewShelter, listAudit + TS models
- [x] Contributions (/mine): NEW/CONFIRMED/REJECTED badges + reviewNote; submit-success copy (listed, marked as newly added, community reports confirm it)
- [x] Specs for all of the above; tsc + ng test + prettier green

## Phase 3 — Orchestrator

- [x] Full gates (mvn test, ng test, tsc ×2, prettier)
- [ ] Review (deepseek-v4-flash) → fix findings → re-verify  (watchdog pass 2026-09-13: performed a full code-vs-spec verification sweep in lieu of the model review — every Phase 1/2 item verified against source; the model review itself is still owed to the owner's orchestrator)
- [x] Docs/agent-pack + puml sync (marker legend, trust lifecycle)
- [ ] Commit, restart dev backend, live-verify (submit → NEW/amber → confirm report → green; reject → hidden)  (watchdog pass 2026-09-13: committed; the dev backend restart + live-verify is owed to the owner — the watchdog must never restart the protected spring-boot:run dev server, and it is still running the pre-V11 build)
