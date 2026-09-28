# UNREAD-FRONTEND — the 23-file frontend remainder (features + core + shared + gateways + app root)

**Branch:** `feature/frontend` (clean tree at start; no commit — the parent commits).
**Scope:** exactly the 23 `frontend/` files in `readability-sweep.md` Appendix A (the map's
frontend remainder — the sweep lane itself read/fixed `leaflet-service.ts`, which is not in
the appendix and was not touched here). Line counts below are current-tree; the appendix's
counts predate the four landed commits and drift by ±1–2 per file.
**Skills:** `docs/skills/clean-code.md`, `docs/skills/angular-developer.md`,
`docs/skills/accessibility.md`. **Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` (rule 6 —
anchors; rule 7 — the Maven lock, not owed: no Java touched).

---

## 1. Files read, one-line verdict each (all 23)

| File (lines) | Verdict |
|---|---|
| `app.scss` (4) | `:host` block only, no comments — clean, nothing to do. |
| `features/admin/alerts-panel.html` (38) | Comment-free template; `alertKindLabel`/`retryAfterText` resolve in `alerts-panel.ts`; region/`role="alert"` associations verified (§3). |
| `features/admin/alerts-panel.scss` (5) | Comment verified: single-source `@use './admin-shared'` holds — all 10 table tab panels `@use` it (`site-texts-panel` is the form-panel exception, correctly out of the claim). |
| `features/admin/guidance-panel.ts` (218) | No dead members (every input/output/handler verified used: own template + `admin-page.html` bindings); every javadoc claim verified (page-scoped hero picker, `PAGE_SIZE_DEFAULT` 20, content-language select binds `contentLocale`/emits the change). |
| `features/admin/media-panel.ts` (121) | No dead members; delete-is-API-first claim verified (`admin-page.ts:840`); **filed**: `const input` at `:100` shadows the imported `input()` (§5.1). |
| `features/admin/reports-panel.scss` (7) | Comment verified (shared queue vocabulary; the unconfirmed panel renders the same `admin-row`/`admin-cell` classes — checked against both templates). |
| `features/admin/unconfirmed-panel.html` (112) | Comment verified against `unconfirmed-panel.ts` (USER+NEW client-side filter, no detail nav); `label[for=reject-reason]` ↔ `textarea#reject-reason` verified (§3). |
| `features/admin/unconfirmed-panel.scss` (5) | Comment verified; `review-queue` is the already-adjudicated concept shorthand (FRONT-NAMES §3, live `community-review-queue`) — left. |
| `features/admin/users-panel.ts` (91) | No dead members; every javadoc claim verified against the backend (id-ordered page, idempotent suspend, admin rows never offered Suspend, suspended rows dimmed) (§4). |
| `features/auth/login-page.scss` (26) | The cited `page-shell.scss` router-outlet rule resolves (`:166-177`, which names `login-page.scss :host` in return) — accurate both ways. |
| `features/auth/register-page.scss` (22) | "mirrors the reset page's muted helper line" verified — `.field-note` byte-identical in `reset-page.scss`. |
| `features/auth/reset-page.scss` (22) | "mirrors the account page's muted helper line" verified — identical `.field-note` at `account-page.scss:123-127`. |
| `features/legal/privacy-policy-page.html` (256) | Comment-free; heading structure h1→h2; all 16 TOC fragments resolve to section ids (§3). |
| `features/legal/privacy-policy-page.scss` (53) | Comments accurate ("Last updated" line, TOC list — both match the template). |
| `features/legal/terms-page.html` (154) | Comment-free; h1→h2; all 17 TOC fragments resolve (§3). |
| `features/legal/terms-page.scss` (54) | The `.legal-page` block duplicates the privacy page's — documented in-place ("Shares the layout contract"), component-encapsulated; deliberate, left (§5.2). |
| `gateways/auth-gateway.ts` (68→70) | **Two fixes** — both password-reset javadocs under-stated the backend's documented 403/429 exceptions (§2). `01-TASK.md §4` citation resolves (`frontend/docs/agent/01-TASK.md:71`); all six methods have production callers. |
| `shared/accessibility-dialog.component.html` (54) | Comments verified (backdrop vs dialog click, the border-not-tint rule — checked in the component scss); `aria-labelledby`/`aria-describedby`/`#dialog` verified (§3). |
| `shared/banner.component.scss` (32) | No comments, clean. |
| `shared/gauge-math.ts` (30) | "unit-tested" verified (`gauge-math.spec.ts` exists); "SERVER-derived share" verified (`report-gauge.ts:38-40` input doc); clamp matches the spec's boundary cases. |
| `shared/loading-indicator.scss` (11) | Cited state classes (`sidebar-state`/`detail-state`/`contributions-state`) are real consuming classes; UA-margin-reset rationale accurate. |
| `shared/report-gauge.scss` (93) | Every geometry claim verified against `report-gauge.html` (viewBox `0 0 200 112`, arc `M 20 100 A 80 80 0 0 1 180 100`, hub at (100,100), `<wbr />` between token pairs) — accurate. |
| `node-fs.d.ts` (14) | **One fix** — attribution "used by `design-tokens.spec.ts`" contradicted the tree: **17** spec files import `node:fs` through this ambient declaration (all also call `process.cwd()`), and `hero-geometry.spec.ts:523` cites this very file by path (§2). |

## 2. Fixes applied (2 files, 3 comment edits, zero code lines)

| file:line | Before (what was wrong) | After |
|---|---|---|
| `auth-gateway.ts:48-52` (was `:41-45`) | `requestPasswordReset`: "POST /auth/password-reset/request -> **always 200** (anti-enumeration: …)" | `-> 200 (anti-enumeration: the UI must never distinguish "unknown email" — **the one exception, the provisioned admin e-mail, is refused 403**). …` — the backend documents exactly this exception (`AuthController.java:179-193`, `@ApiResponse 403 "The provisioned administrator's email"`); "always 200" is contradicted by the endpoint this method wraps. |
| `auth-gateway.ts:59-65` (was `:54-59`) | `resetPassword`: "ANY failure (… / over-limit) answers 400 with one generic message, so the page must not treat the 400 as account-existence information." | Same sentence kept (the four 400 cases incl. the per-code attempt limit are correct — `PasswordResetService` "5 failed attempts per code", all indistinguishable), with the two documented out-of-400 classes added: "— **the provisioned admin e-mail is refused 403, the (IP, e-mail) anti-guess bucket 429** — so the page …" (`AuthController.java:200-224`). The original was a truncated copy of the controller javadoc's first sentence. |
| `node-fs.d.ts:1-5` | "Test-only minimal typing for the node surface used by `design-tokens.spec.ts` (filesystem walk + cwd)." | "…for the node surface **the source-scanning specs** use (filesystem walk + cwd)." — single-consumer attribution is false (17 consumers, enumerated below) and misleading: believing it, a future lane could delete the declaration when one spec stops using `fs`. The "no @types/node dependency" rationale (the real constraint) is unchanged. |

The two `auth-gateway.ts` edits add +2 lines (68→70). Neither edited file is cited by
`docs/agent/00-CURRENT-STATE.md` (grep-verified, all anchors) — **no rule-6 anchor shift is
owed**. The byte-pinned specs' content pins are comment-tolerant (`api-contract.spec.ts`
strips comments before scanning gateway URL literals; the two frozen specs are not in this
diff), confirmed by the green gate.

## 3. Accessibility associations verified (all still resolve — the diff is comment text
only, so nothing moved)

- `unconfirmed-panel.html` — `<label for="reject-reason">` ↔ `<textarea id="reject-reason">`
  resolve inside the `@if (rejectFor() === row.id)` branch; a single `rejectFor()` signal
  means at most ONE row renders the editor, so the fixed `id` can never duplicate.
- `accessibility-dialog.component.html` — `aria-labelledby="a11y-dialog-title"` ↔
  `h2#a11y-dialog-title`, `aria-describedby="a11y-dialog-body"` ↔ `p#a11y-dialog-body` both
  resolve; `role="dialog" aria-modal="true" tabindex="-1"` + the `#dialog` template ref
  (the component's focus target); the options are a native radio group (`name="a11y-theme"`)
  inside `fieldset`+`legend` — arrow-key movement/announcement come from the native control,
  as the comment claims. The "distinguished by its BORDER, not a tint" claim holds:
  `accessibility-dialog.component.scss:116-117` `&--selected { border-color: var(--color-primary); }`.
- Legal pages — single `<h1>` then `<h2>` per section; TOC fragment ↔ section id: privacy
  **16/16**, terms **17/17** (each fragment has exactly one matching `id`, no orphans).
- Admin tables (`alerts-panel.html`, `users-panel.html`, `unconfirmed-panel.html`) —
  `role="region"` + `[attr.aria-label]` + `tabindex="0"` on the table wrapper, `role="alert"`
  on the error line, `role="status"` on the two-tap confirm strip — associations intact.
- The fixed `auth-gateway.ts` javadocs name no a11y surface; the reset page's error handling
  (generic 400/403/429 → server message) is the `role="alert"` path's input, unchanged.

## 4. Comment claims verified accurate and left in place (the sweep's evidence)

- `users-panel.ts` — "newest ids last (id-ordered)" = backend `findAccountPage` ("id-ordered",
  `UserRepository.java:88-95`); "Suspend … idempotent server-side" =
  `AdminUserModeration.java:36,87,106` ("idempotent: a no-op records no audit row");
  "the Suspend action is never offered [for admin rows]" = `users-panel.html` gates the whole
  action cell on `row.kind === 'REGISTERED'`; "suspended row is dimmed" =
  `[class.admin-row--dismissed]="row.suspendedAt !== null"` (`users-panel.html:39`).
- `media-panel.ts` — "a fresh upload lands on page 1 (the page navigates there)" =
  `admin-page.ts:787-790` (`navigate({ page: 1 })`, newest-first `createdAt desc, id desc`
  in `SpringDataMediaAssetRepository.java:16-25`); the "input value resets FIRST" ordering is
  literally what the code does (grab file → clear value → emit).
- `guidance-panel.ts` — "default page 1 / size 20" = `PAGE_SIZE_DEFAULT = 20`
  (`shared/paging.ts:30`); the content-language select binds `[value]="contentLocale()"` and
  emits through `onContentLanguageChange` (`guidance-panel.html:7-15`).
- `auth-gateway.ts` (unfixed claims) — "register -> 201 empty body (no session is created)",
  "logout -> 204 … revokes the given refresh token" (`AuthController.java:85-98,157-166`,
  `AuthService.logout` → `tokens.revoke`), "01-TASK.md §4: gateways are the only way pages
  reach the API" (the doc's dependency rule: "gateways are the only door to the API").
- `report-gauge.scss` / `gauge-math.ts` / `loading-indicator.scss` / `login-page.scss` /
  the three auth `.field-note` mirrors — see §1; each cited file/rule/class re-verified in-tree.
- `node-fs.d.ts` — `design-tokens.spec.ts` does use the full declared surface
  (`readFileSync/readdirSync/statSync` at `:1`, `process.cwd()` at `:33`); the fix widened
  the attribution, did not retract the claim.

## 5. Filed, not fixed

1. **`media-panel.ts:100`** — `const input = event.target as HTMLInputElement` shadows the
   `input()` function this same file imports from `@angular/core` (and calls ~15 times at
   class scope). A search/grep trap ("which `input`?") and a readability hazard per the
   clean-code "avoid disinformation" rule; the neighbouring comment explains the FileList
   index access but not the shadowing. **Not fixed — renaming a live local is a code
   change, outside this lane's comment/dead-code authority.** One-line rename
   (`event.target as HTMLInputElement` → e.g. `fileInput`), zero behaviour delta, one
   template reference unaffected (the handler is bound by name, the local is private).
   On the notes board for the parent.
2. **Deliberate CSS duplication (left, documented in place):** the ~50-line `.legal-page`
   block is duplicated verbatim across `privacy-policy-page.scss`/`terms-page.scss` (terms
   comment: "Shares the layout contract"), and `.auth-card`/`.auth-links`/`.field-note`
   across the three auth pages ("mirrors …" comments). Component-encapsulated styles;
   de-duplication is a structural change (shared partial + two `styleUrl` rewires) —
   outside this lane, and the comments already flag the coupling.

## 6. Dead-name / never-filed-name census (the guard's six names + wrap-splits)

- Whole-token grep of all six `NEVER_MADE_CHANGE_NAMES` entries
  (`bilingual-guidance`, `admin-tab-persist`, `admin-page-size`, `admin-guidance-search`,
  `guidance-index-paging`, `admin-locale-scope`) over all 23 files: **0 hits**.
- Comment-only kebab-token census (comments extracted per syntax, 59 distinct tokens):
  every token classified — English compounds (`two-tap`, `read-only`, `anti-enumeration`,
  `server-derived`…), CSS properties (`stroke-width`, `min-height`), real component/selector
  names (`app-pagination`, `app-list-state`, `router-outlet`, `a11y-dialog`…), real state
  classes (`sidebar-state`, `detail-state`, `contributions-state`), i18n-ish and file names.
  `review-queue` (1 hit, `unconfirmed-panel.scss:3`) is the already-adjudicated concept
  shorthand (FRONT-NAMES §3 — shorthand for the LIVE `community-review-queue`, never a
  directory). No new never-filed candidate → **nothing to record for the parent's list
  membership decision** (no `git log --all -S` run was needed; no candidate name exists).
- No wrap-split of any known name in scope (line-pair eyeball + the census covers both
  halves of a split as separate non-matching tokens; none reassembles to a listed name).

## 7. Gates (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — 1590/1590 tests, 66 test files**
  (baseline 1590 exact; 1590 = 1583 + SPLIT-PORTABILITY's 7 new tests, 66 = 65+1 per that
  lane's reconciliation). Log/exit: `/tmp/uf-test.log`, `/tmp/uf-test.exit` (0).
- `npx ng build` → **exit 0** (pre-existing `shelters-panel.scss` +384 B budget warning —
  not in this diff). Log/exit: `/tmp/uf-build.log`, `/tmp/uf-build.exit` (0).
- Backend gate not owed — no Java file touched (rule 7 lock therefore never needed).
- Diff: `git diff --numstat` = `9/6 auth-gateway.ts`, `3/3 node-fs.d.ts` — comments only,
  zero code lines, zero user-visible strings, zero i18n keys, zero CSS classes, zero DOM ids,
  zero test files.

## 8. Unverified / caveats

- **Appendix A counts are stale by construction** (measured at the `polish-work` cut); all 23
  files were re-read on this branch's tree — the scope set itself is unchanged (same 23 paths,
  no file added/removed from the remainder since).
- The "source-scanning specs" wording in the fixed `node-fs.d.ts` is a descriptive collective
  (the 17 consumers: `design-tokens`, `i18n-template-guard`, `prepaint`, `models-contract`,
  `theme-store`, `api-contract`, `consent-banner`, `page-shell`, `map-page`, `account-page`,
  `shelter-detail-page`, `admin-page`, `guidance-editor`, `guidance-detail-page`,
  `guidance-list-page`, `hero-geometry`, `architecture` specs — all 17 import `node:fs` and
  call `process.cwd()`); deliberately no count in the comment (counts rot).
- No live sibling lane was observed during this lane (clean `git status` at start; the only
  diff at report time is this lane's two files) — no attribution hazards.
- `site-texts-panel.scss` not `@use`ing `admin-shared` is correct, not a defect: it is the
  form (Settings) panel, not a table panel — the "like every tab panel" comments in my three
  table-panel scss files scope to the table panels.

**Files for the parent's commit:** `frontend/src/app/gateways/auth-gateway.ts`,
`frontend/src/node-fs.d.ts`, this report, and the two UNREAD-FRONTEND notes-board lines.
