# Tasks: admin-moderation

## Phase 1 — Backend: seeder + admin API

- [x] application.yml: `admin.email: ${ADMIN_EMAIL:}` /
      `admin.password: ${ADMIN_PASSWORD:}` (empty defaults, no values
      committed); `.env` dev lines `ADMIN_EMAIL=admin@openshelter.ee`,
      `ADMIN_PASSWORD=admin` (gitignored file — no git add)
- [x] `AdminSeeder` (ApplicationRunner): create-if-absent per design D1
      (kind ADMIN, pre-set verification claims, Argon2 via the standard
      encoder, no modification of existing users, no-op when either var
      unset)
- [x] `AccountDto` + `GET /account/me`: add `isAdmin`
- [x] Admin authorization guard: fresh `UserKind.ADMIN` lookup per
      request (401 anonymous / 403 non-admin)
- [x] `AdminController` + service: `GET /admin/shelters` (status/source/
      q filters, incl. hidden, with counts), `POST
      /admin/shelters/{id}/status` (USER-only, registry → 409, manual
      change disarms auto-hide), `DELETE /admin/shelters/{id}`
      (USER-only, cascade, registry → 409), `GET /admin/reports` +
      `POST /admin/reports/{id}/dismiss`, `GET /admin/review-reports` +
      `POST /admin/reviews/{id}/hide` / `restore`
- [x] Backend tests: seeder (created once, never overwrites, no-op when
      unset, login works without verification), authorization (403
      non-admin, 401 anonymous, immediate demotion), status
      hide/restore + disarm, hard delete cascade, registry 409s, queue
      shapes, idempotent dismiss/hide/restore

## Phase 2 — Frontend: /admin page

- [x] API client + admin gateway (all admin endpoints)
- [x] Session store: `isAdmin` from /account/me; nav "Admin" item
      (admin-only); account page "Admin" badge
- [x] `features/admin/`: route `/admin` (guard: non-admin → redirect
      `/`), three tabs — Shelters (search + inline Hide/Activate,
      Delete with confirm; registry rows read-only), Shelter reports
      (queue + dismiss, hidden rows highlighted with restore shortcut),
      Review reports (queue + Hide/Restore + hidden badge)
- [x] Specs: admin-page spec (tabs, guard redirect, admin-only nav,
      actions + confirm dialog), session store `isAdmin` assertions,
      account-page badge
- [x] Gate: tsc both configs + full `ng test` + prettier

## Phase 3 — Docs and diagrams sync

- [x] Backend agent pack: admin section (seeder semantics, env vars,
      endpoint table, de-provisioning ops note)
- [x] Frontend agent pack: /admin page + nav + session store lines
- [x] puml: user-kind/admin flow diagram + endpoint diagram additions —
      re-rendered (PNG + SVG) after implementation
- [x] README: env table row for `ADMIN_EMAIL`/`ADMIN_PASSWORD` + admin
      usage section (plain terms; note the dev values live in .env)
- [x] Gate: docs diff reviewed against implemented behavior line by line;
      no git add/commit by implementers
