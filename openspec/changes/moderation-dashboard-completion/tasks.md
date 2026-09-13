# Tasks: moderation-dashboard-completion (M10)

## Slice 1 — Suspend user

- [x] V17 `users.suspended_at`; `moderation_actions.shelter_id`
      nullable + `subject_user_id` (no FK)
- [x] `User.suspendedAt` domain state + `UserEntity`/`UserMapper`
      mapping
- [x] `SuspendedAccountException` → 403 in `ApiErrorHandler`
- [x] Login refusal (post-verify), refresh refusal (post-claim),
      JWT-filter fresh-lookup refusal (SecurityConfig wiring)
- [x] `ModerationAuditLog`: `Long shelterId` + `subjectUserId`,
      USER_SUSPEND / USER_UNSUSPEND actions; JPA + in-memory fakes;
      audit projection renders the subject ("Account: …" /
      "Deleted account"); all existing call sites updated
- [x] `AdminModerationService` + `AdminController`: `GET
      /admin/users`, `POST /admin/users/{id}/suspend`, `POST
      /admin/users/{id}/unsuspend` (+ `AdminUserDto`)
- [x] BE tests: service unit (idempotency, kinds, audit rows),
      `UserSuspensionIT` (login 403, in-flight 401, refresh 403,
      unsuspend restores, audit subject rendering, admin-only)
- [x] FE: `AdminUserDto` model + gateway methods + Users tab
      (before audit, which stays last) with badge/dim/two-tap
      actions; audit column "Subject" + two new audit labels; specs
- [x] Gate: `mvn -q test` + `npx ng test` + prettier; OpenSpec
      validate; commit `M10: suspend user (slice 1)`

## Slice 2 — Edit-history viewer

- [x] V18 `shelter_history` (snapshot name, SET NULL shelter FK, no
      actor FK, changes JSON)
- [x] `ShelterHistoryLog` seam + JPA impl + in-memory fake
- [x] Record CREATED/EDITED/DELETED in `ShelterService` (diff on
      PUT; no-op PUT records nothing; delete actor threaded from
      both call sites)
- [x] `GET /admin/shelters/{id}/history` (+ `AdminShelterHistoryDto`,
      server-parsed field changes, batched actor names, 404 rule)
- [x] BE tests: diff unit tests, history IT (edit, no-op, deleted
      shelter history, 404)
- [x] FE: History button + inline event dialog in the Shelters tab;
      specs
- [x] Gate both + commit `M10: edit-history viewer (slice 2)`

## Slice 3 — Request-info

- [x] V19 `shelter_info_requests`
- [x] `POST /admin/shelters/{id}/request-info`, admin read of
      request+reply
- [x] Submitter surface: pending request on own rows + one-time
      reply endpoint (author only, 409 on re-reply)
- [x] BE + FE tests; gate both; commit `M10: request-info (slice 3)`

## Slice 4 — Mark inaccurate

- [ ] V20 `shelters.inaccurate_marked_at` / `inaccurate_marked_by`
- [ ] `POST /admin/shelters/{id}/mark-inaccurate {reason?}` +
      `/clear-inaccurate` (idempotent, audited)
- [ ] Public DTO `inaccurate` flag + single-sourced FE warning on
      the unverified-treatment surfaces
- [ ] BE + FE tests; gate both; commit `M10: mark inaccurate
      (slice 4)`

## Slice 5 — Wrap-up

- [ ] "Delete abusive content" verified as carried-over (admin
      hard delete + two-tap confirm) — spec delta marks it
      satisfied-by-existing
- [ ] Docs/diagrams sync (06-CONTEXT-API endpoint table, admin puml
      section if warranted), README if ops-relevant
- [ ] OpenSpec archive-ready state (all tasks ticked)
