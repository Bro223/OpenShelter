# 13 — Delivery audit (DELIVERY-AUDITOR-FINAL)

Date: 2026-09-21 · Auditor: DELIVERY-AUDITOR-FINAL (independent, read-only)
Tree audited: `feature/frontend` @ `ce4cd3f` ("feat: i18n completeness, guarded templates, and a CSP the SPA can actually run under"), working tree clean, `origin/feature/frontend` in sync (push observed in the orchestrator session log).

Method note: every finding below is tagged **[ran]** (I executed it) or **[read]** (I read the file/commit). I searched the whole repo before calling anything missing. The orchestrator's own gate wrapper ran in session `01a0c0f6…` (2026-09-20T22:36Z jsonl, record 2596/2597) — I read that toolResult when verifying the commit's provenance.

---

## 1. Is the committed tree internally consistent? (my own runs)

**Backend — `flock /tmp/openshelter-mvn.lock mvn -q test` — I ran it twice.**
- First run backgrounded from my session: completed, no `[ERROR]` lines, all per-class reports green (see §7 anomaly for why it looked "killed" at first — it had finished).
- Second run **in the foreground with a 30-min timeout so I witnessed the exit**: `MVN_EXIT=0`.
- Result from `target/surefire-reports` (my run): **130 test classes, 1111 tests, 0 failures, 0 errors, 0 skipped.**
- **JDK Maven used:** Maven 3.9.16 (sdkman) on **Java 27** (Oracle, `mise` runtime 27.0.0); the pom targets `java.version=21` (release-compiled).
- Note: `target/surefire-reports` also contains **3 orphan reports for deleted classes** (`RouteDebugIT`, `ScratchDebugTest`, `PaasteametRegistryClientTest` — all three `.java` files no longer exist; `PaasteametRegistryClientTest` was deleted in `670f43d`). Including them, the directory sums to "133 classes / 1123 tests" — which is exactly the number the delivery message announced. **The true current suite is 1111 tests / 130 classes.** See finding P2-1.

**Frontend — `npx ng test --watch=false` from `frontend/` — I ran it:**
- **Test Files 57 passed (57) · Tests 1329 passed (1329)** (Vitest 4.1.11, via the Angular builder). Zero failures.

**Frontend — `npx ng build` from `frontend/` — I ran it:**
- Exit 0, output `frontend/dist/frontend` (browser layout at `dist/frontend/browser`).
- Warnings (not errors): initial bundle **716.94 kB vs `maximumWarning: 560 kB` (over by 156.94 kB; `maximumError: 1 MB` not hit)** and 5 component-style warnings (map-page 8.29 kB, admin-page 7.39 kB, shelter-detail 6.08 kB, page-shell 4.87 kB, guidance-editor 4.27 kB vs 4 kB warning).
- **CSP check on my build output — I ran the tooling:** `python3 scripts/spa-csp.py dist/frontend/browser/index.html` → `script-src 'self' sha256-eEsoRzCi5dUPfjfiEAEbV+3sri1glfPnaHWpq5qf7ko= sha256-uRaocgOj5NiVsHL0rjZSuS7oiMAjFXrAjPwRiKToi6c=` — **byte-identical to the two hashes committed in `docs/deploy/spa-csp.md`** (2 inline pre-paint scripts: theme + locale). Then I ran `node scripts/postbuild-csp.mjs`: it replaced the builder's `media="print" onload="this.media='all'"` stylesheet swap with a plain `<link>` (`onload=` count 1 → 0) — the hook works as documented. Caveat: the hook only fires via **`npm run build`** (the `postbuild` npm hook in `frontend/package.json:9`); a raw `npx ng build` leaves the inline event handler in place, which the documented proxy CSP would block (SPA renders unstyled). Both the gate job and my runs used raw `ng build`, so the on-disk dist from those runs is *not* the CSP-safe artifact — build output, not source; see §5.3.

**Verdict: the tree compiles and every suite I ran is green. No failures with a causing file — there were none.**

---

## 2. Milestone-by-milestone verification

Commit map (from `git log 670f43d..ce4cd3f`): N2 `4289189` · N3 `e04fb4e` (+ `f47e106` follow-up) · N4 `d79c075` · N5 `252c3ec` · N6 `ea7db6e` · N9 `101dbe4` · N7+N8 (+ docs sync) `ce4cd3f`. The pre-N "nine high findings" sweep is `670f43d` + `131a09d`.

### N2 — Boot upgrade (commit `4289189`)
- **[read]** `pom.xml:11` — parent `spring-boot-starter-parent:3.5.16` (3.5.x ✓); springdoc pinned to 2.8.17 with a comment explaining the 3.4+/Spring 6.2 incompatibility.
- **[read]** `README.md:227` — "Java 21 · Maven · Spring Boot **3.5.x**" (was 3.3.x — the commit's README diff shows the line flip). Consistent with the pom.
- **[ran]** full `mvn -q test` green on 3.5.16, so the upgrade didn't break the suite. (One stale 3.3.13 mention survives in `docs/autopilot/findings/swagger-plan.md:8` — a historical findings doc; P2-3.)
- **Done.**

### N3 — lazy i18n catalogs + budget decision (commits `e04fb4e`, `f47e106`)
- **[read]** `frontend/src/app/core/i18n/i18n.service.ts` — `DEFAULT_LOCALE = 'en'`; `EAGER_CATALOGS = { en: EN }` (static import — **the default locale is still eager**, as required); `LAZY_CATALOG_LOADERS` uses dynamic `import('./et')` / `import('./ru')`; a stored non-default preference starts its chunk load in the constructor; while loading, `t()` serves the default locale (never a raw key); arrival triggers `catalogVersion` bump + `ApplicationRef.tick()`. `f47e106` makes the language switch await the catalog (`onCatalogLoaded`, title re-resolve).
- **[ran]** 1329/1329 FE tests green — includes the rewritten `i18n.spec.ts`, `title.spec.ts`, `page-shell.spec.ts` (all adapted in `e04fb4e` to await catalogs).
- **Budget decision:** `frontend/angular.json:45-50` keeps `initial: maximumWarning 560 kB / maximumError 1 MB`; the decision is documented in `frontend/README.md:133-145` (Leaflet must stay in the initial bundle; the warning is accepted). **[read]** — but the README's measured number is stale (P2-2).
- **Done** (with the README-number caveat).

### N4 — a11y: announced errors, map theming, badge parity (commit `d79c075`)
- **[read]** field-error aria wiring on all four pages: `login-page.html` (6 `aria-invalid`/`aria-describedby` + `role="alert"` errors at :31, :50), `register-page.html` (9, errors at :30/:63/:91/:112), `reset-page.html` (9, at :28/:74/:98/:129), `account-page.html` (13, at :68/:86…) — each error `<p>` has an `id` matching the fields' `aria-describedby`.
- **[read]** Leaflet theme rules now exist where the old comment claimed they weren't needed: `accessibility-dialog.component.scss:217-265` — `[data-theme='black-and-yellow'] .leaflet-bar a{…}`, hover/focus/disabled, attribution strip + link, and `:focus-visible` rings for both `black-and-yellow` and `high-contrast`. `styles.scss` comment updated to match (`d79c075` diff).
- **[read]** badge theming: `--color-warning` darkened to `#965a00` with measured ratios in `styles.scss:121-131`; badge token table with per-pair ratios; the mixed-fill pairs are "audit-enforced in design-tokens.spec.ts MIXED_PAIRS" (that spec was rewritten to 347 lines in this commit and is green in my run).
- **Done.**

### N5 — bilingual admin: alternates + translation endpoints (commit `252c3ec`)
- **[read]** backend: `src/main/java/ee/sheltermap/api/AdminGuidanceController.java` — `@RequestMapping("/admin/guidance")` with `GET /{id}/translations` (:422), `POST /{id}/translations` (:445), `PUT /{id}/translations/{locale}` (:473), `DELETE /{id}/translations/{locale}` (:500), `POST /{id}/translations/attach` (:524).
- **[read]** frontend calls them: `gateways/admin-gateway.ts:371/389/408/…` — GET/POST/PUT/DELETE all wired, with the contract documented at :59-62.
- **[read]** "reader is told when one is missing": `guidance-detail-page.html:56-71` — `fallbackNotice()` renders `guidance.localeFallback` with a `role="note"` and an explicit link to the reader's-locale version via `alternates` (never a silent URL switch).
- **[ran]** FE 1329 green incl. the new `admin-page.spec.ts` (+219), `guidance-editor.spec.ts` (+98), `admin-gateway.spec.ts` (+115), `guidance-detail-page.spec.ts` (+77).
- **Done.**

### N6 — transactions, optimistic locking, verify-confirm 500 (commit `ea7db6e`)
- **[read]** `ShelterService`: `@Transactional` on `addPlace` (:128), `updatePlace` (:309), `deletePlace` (:378) — the three mutation methods the review named.
- **[read]** `VerificationService`: `@Transactional` on `requestVerification` (:105) and `confirmVerification` (:241); `confirmVerification` uses `findFirst` on the pending read (`JpaPendingVerificationRepository.java:44` — `findFirstByUserIdAndLevelAndExpiresAtGreaterThanOrderByExpiresAtDescIdDesc`), the documented fix for the `IncorrectResultSizeDataAccessException` → 500; plus an idempotency guard for re-confirm.
- **[read]** `V29__user_version.sql` — `users.version BIGINT NOT NULL DEFAULT 0` with the full rationale; `UserEntity.java:80-82` `@Version`; `UserMapper` round-trips the stamp. 409 mapping: `ApiErrorHandler.java:375-380` maps `OptimisticLockException` **and** `OptimisticLockingFailureException` → 409 "The resource changed under you; reload and retry", plus a commit-time `StaleStateException` handler.
- **[read]** regression ITs added: `UserOptimisticLockingIT` (stale whole-row save vs a committed suspension → lock failure, each step in its own transaction), `PendingVerificationDuplicateIT` (double-send duplicate rows → newest code verifies, previously the 500), `ShelterSubmissionCapRaceIT`.
- **[ran]** all green in my two full backend runs.
- **Done.** New 409 surface (intended): whole-row user saves (account profile update, admin suspend races) now 409 where they previously clobbered silently — see §5.2.

### N9 — dedup refactor + V30 (commit `101dbe4`)
- **[read]** the commit does "one admin check, one trust rule, one set of helpers": new `AdminAccess.java` (56), `TextTruncation.java` (21), `ContactChangeService` +133, trims in `ReportService`/`ShelterService`/`AccountController`/`AuthController`, **and adds `V30__index_cleanup_and_queue_indexes.sql`**.
- **[read]** V30: ADD `idx_moderation_actions_moderator (moderator_id, action)` (serves `countByModeratorIdAndAction` + the FK `SET NULL` scan) and ADD `idx_shelter_reports_created (created_at DESC, id DESC)` (the bounded admin queue's exact ORDER BY); DROP 4 redundant indexes (`idx_shelters_county`, `idx_site_texts_key`, `idx_pending_contact_changes_user`, +1) — each with a per-index rationale citing review 05 F5/F9/F12. README `:228`/`:809` now say V1–V30 and describe V30. **[read]**
- **[ran]** V30 applied cleanly under `ddl-auto=validate` in my backend runs (migration log: "now at version v30").
- The **god-file extractions are NOT in this commit** — see §3.

### N7 — i18n completeness + widened template guard (commit `ce4cd3f`)
- **[read]** `shelter-copy.ts` rewritten catalog-backed: every helper takes a `translate` seam with `EN_FALLBACK`; `shelter-detail-page.ts:158-215` passes `i18n.t` as the callback (the public surface is now reactive to locale); catalogs grew `+45/+46/+46` keys (en/et/ru) incl. the 9 byte-identical twins and the hero-error keys (`admin.guidance.editor.hero.uploadError.*` — the "5 missing hero keys" are present, messages.ts:980-1004).
- **[read]** guard widened: `core/i18n/i18n-template-guard-scanner.ts` (253 lines, char-level state machine) flags (1) plain text nodes, (2) literal `placeholder`/`aria-label`/`title`/`alt`/`message` values, (3) **string literals inside `{{ }}` interpolations — the class the old line-based scanner skipped**. `i18n-template-guard.spec.ts` walks **all 23 `.html` templates under `src/app`** (no opt-out map; `EXPECTED_TEMPLATES` pins the set — I counted 23 files on disk, matching), with per-file allow-lists + a staleness test that fails if an allow-list entry stops matching. The old `account-i18n-guard.spec.ts` (349 lines) was deleted.
- **[ran]** 1329 FE tests green, including the guard itself.
- **Done** — with the two temp admin allow-list entries (§3) and one residual hardcoded admin badge (P2-2).

### N8 — SPA CSP (commit `ce4cd3f`)
- **[read]** `docs/deploy/spa-csp.md` (127 lines, operator-facing): the policy is proxy-served (correctly explaining why the app's one-line fallback CSP must not intersect it), with the exact header and the two inline-script hashes.
- **[ran]** hashes recompute identically from a fresh build (see §1); `scripts/spa-csp.py` (89 lines) and `frontend/scripts/postbuild-csp.mjs` (61 lines) exist and the hook is wired as `postbuild` (`package.json:9`). The postbuild fix targets a real defect: the beasties critical-CSS swap is an inline `onload` handler, which CSP hashes **cannot** allow-list.
- **Done** (with the `npm run build` vs `npx ng build` trap, §5.3).

### N10 — OpenSpec archive pass (bookkeeping)
- **[ran]** `git log 670f43d..ce4cd3f --name-only -- openspec` → **no output**: none of the milestone commits touched `openspec/`. `openspec/changes/` still holds 8 active changes (`community-review-queue`, `crisis-guidance`, `guidance-hero-import`, `guidance-manual-order`, `i18n-ru`, `retention-pruning`, `shelter-meta-truth`). The orchestrator's own todo keeps this pending. **Not done** (out of the N2–N9 core; flagged here for completeness).

---

## 3. The things the implementers said they did NOT do

| Item | Still true in code? | Evidence |
|---|---|---|
| Network-error banner renders English | **Yes** | **[read]** `core/api-error.ts` — `ApiError.fromNetwork()` hardcodes `'Cannot reach the backend. It may be offline — please try again later.'` (and `reasonPhrase()` is English). No catalog seam on the network path. The stated reason still holds: all *server* banner messages are also English (the backend's uniform `ErrorResponse.message`), so a translated network line would be the only localized banner in the app — consistency, not laziness. |
| Two `admin-page.html` `aria-label`s allow-listed, not fixed | **Yes** | **[read]** raw literals remain at `admin-page.html:1006` (`aria-label="Guidance posts"`) and `:1234` (`aria-label="Media library"`); both are in `ALLOWED_ATTRS` (`i18n-template-guard.spec.ts:148-153`) as "TEMP admin lane" entries. The stated reason (admin lane mid-rewrite) is still true — and the staleness test makes the allow-list self-expiring: the moment those two literals are keyed, the guard **fails** until the entries are removed. This is the strongest possible "left as a plan" mechanism. |
| God-file extractions left as plans | **Yes** | **[ran]** `wc -l`: `admin-page.ts` = **1783** lines (review measured 1654 — it *grew* under N5), `GuidanceService.java` = **1213** (review: 1236 — trimmed slightly by the helper extractions, but still the five-responsibility god class). No extraction of either into collaborator types happened in any N commit; the orchestrator's todo #44 is still pending; no extraction plan document exists in `docs/` or `frontend/docs/` (I searched). |
| Image `srcset` finding left unimplemented | **Yes** | **[ran]** `grep -rc srcset frontend/src` → zero occurrences in any `.html`/`.ts`. The stated reason still holds: the backend media pipeline (`guidance/MediaService.java`, `MediaStorage.java`, `MediaImageInspector.java`) stores a single original — there is no variant/resizer (no `Graphics2D`/scaling anywhere in the package), so there is no second source size to point a `srcset` at. |

---

## 4. Contradictory claims — what the current tree supports

1. **TypeScript `strict` finding: no-op (agent 8 was right).** **[ran]** I compiled a probe file (`let x: string = null; function f(y){return y;}`) with the repo's own TypeScript **6.0.3** and no flags: `TS2322` + `TS7006` are reported; with `--strict false` it is clean. `frontend/tsconfig.json` still sets no `strict` flag — correctly, because TS 6.0 defaults it on. **[read]** `@angular/compiler-cli`'s `compiler-cli.d.ts:268`: "strictTemplate is `true` by default." Adding the flags would change nothing. The tree supports agent 8's version.
2. **Which limiter values the test config should mirror: main's values, via an overlay with a documented-delta allow-list (agent 1's model).** **[read]** `src/test/resources/application-test.yml` is now an **overlay, not a mirror** (the old shadowing full copy is gone; `TestConfigOverlayTest` fails the build if a same-named `application.yml` reappears on the test classpath). It carries only deltas — the only limiter delta is `otp-per-contact-max: 100` (:47, inline-justified); every other `app.*` value (incl. `reset-confirm 10 / 0.2`) reaches tests from main by construction. `TestConfigOverlayTest` enforces: no invented keys, no copy-keys, every delta in `DOCUMENTED_DELTAS`, no stale allow-list entries. So the "stale 5/0.084" test values no longer exist at all. **[ran]** the test is part of my green backend runs.
3. **Concurrency test vs shipped code: agent 4's position is still true — the gap was NOT closed by the milestones.** **[read]** `VerificationService.requestVerification` now does read-`lastSentAt`/`countToday` → channel send → record (check-then-act); the atomic `VerificationSendLog.tryRecord` (`FileVerificationSendLog.java:90`, `synchronized`) is called **only from tests** (`FileVerificationSendLogTest`, `VerificationServiceTest`, `InMemoryVerificationSendLog`, `ShelterImportServiceTest`) — still production-dead. The milestones added `PendingVerificationDuplicateIT` (which fixes the *confirm* 500, a different defect) but **no** concurrency IT for the send-path overcount that agent 4 asked for, and `tryRecord` was not deleted or annotated as test-only. `FileVerificationSendLogTest.concurrentTryRecordHonorsTheDailyCapExactly` therefore still gives false confidence about production. (Bounded in practice by the per-contact OTP limiter — same residual as at review.)

---

## 5. Did the milestones break anything?

### 5.1 Lazy catalogs vs specs asserting translated copy synchronously
**No breakage.** **[ran]** 57/57 FE files, 1329/1329 tests green. The specs that had asserted translated copy synchronously were rewritten in the same commit that introduced lazy loading (`e04fb4e`: `page-shell.spec.ts` −83/+83-scale, `title.spec.ts`, `i18n.spec.ts` +113, `site-texts-panel.spec.ts`, legal-page specs, consent-banner, map-page). The fallback design (default-locale text while a chunk loads, one repaint on arrival) is unit-pinned.

### 5.2 New 409s where paths used to silently succeed
**Yes — exactly one surface, and it is the intended fix.** Whole-row user saves: a stale in-flight save (e.g. the user's own `PUT /account` landing while an admin suspension committed, or vice versa) now fails with 409 "The resource changed under you; reload and retry" instead of silently writing the whole row back (the old code could un-suspend a suspended account). Pinned by `UserOptimisticLockingIT`. Shelter edits were already 409 under `shelters.version` (V8) — unchanged. `POST /verify/confirm` on a duplicate pending pair went from **500 → success** (newest code wins), pinned by `PendingVerificationDuplicateIT`. I found no *unintended* 409 path: the two `@Version` mappings plus the pre-existing shelter 409s are the whole conflict surface, and all account/auth/verify flows are green in my runs.

### 5.3 CSP postbuild hook vs the built `index.html`
**No breakage when using the documented pipeline.** **[ran]** a raw `ng build` leaves `onload="this.media='all'"` in `dist/.../index.html` (the hook is an npm `postbuild`); running `node scripts/postbuild-csp.mjs` removes it (verified: `onload=` count 1→0, plain `<link rel="stylesheet">` remains — render-blocking, no FOUC regression per the doc), and the two pre-paint inline scripts hash exactly to the values in `docs/deploy/spa-csp.md`. The trap is procedural, not code: anyone deploying a raw `ng build` output under the documented proxy CSP gets an unstyled SPA. The doc explicitly prescribes `npm run build` semantics ("the operator then recomputes… if they ever change") — worth a one-line warning in the frontend README (folded into P2-4).

---

## 6. Findings (no P0, no P1 in the delivered tree)

- **P2-1 — The announced backend test count is 11 too high.** The delivery message says "backend exit=0 → 1123 tests". 1111 of those belong to the 130 live test classes; the other 11 come from 3 orphan surefire reports of classes deleted in/around `670f43d` (`RouteDebugIT` 1, `ScratchDebugTest` 1, `PaasteametRegistryClientTest` 9). **[ran]** Location: `target/surefire-reports/` (untracked, but it's what any report count reads). Fix: delete the 3 stale `.txt` files (or run `mvn clean` before counting); no source change needed.
- **P2-2 — One hardcoded English label survives on the now-bilingual admin surface.** `shelter-copy.ts:178` `INACCURATE_BADGE = 'Inaccurate'` → rendered at `admin-page.html:277` via `{{ inaccurateBadge }}` (a TS-bound interpolation, which the template guard cannot see by design). No `Inaccurate` key exists in `et.ts`/`ru.ts`. Fix: key it like the other admin badges (one line per catalog + the allow-list stays clean).
- **P2-3 — Stale version reference in a historical doc.** `docs/autopilot/findings/swagger-plan.md:8` still cites `spring-boot-starter-parent:3.3.13`. It's a point-in-time findings doc, so this is report-only.
- **P2-4 — Frontend README bundle numbers are stale.** `frontend/README.md:138` documents "670.83 kB raw / 165.10 kB transfer (2026-09-18) — exceeds maximumWarning by 110.83 kB". My fresh production build on `ce4cd3f` measured **716.94 kB initial, over by 156.94 kB** — N5/N7 added ~46 kB to the initial bundle after that measurement. The warning behavior is correctly predicted; the numbers aren't. Also add the "`npm run build` (postbuild hook) produces the CSP-safe index.html — raw `ng build` does not" one-liner here.
- **P2-5 — The send-path concurrency gap from the review was not closed (carried over from §4.3).** `tryRecord` remains production-dead and the requested overcount IT is absent. Not a regression — the tree is exactly as the review described — but it is the most substantive unaddressed risk in the delivery and should be tracked, not absorbed into "deferred".

---

## 7. Top 5 things a delivery owner should know

1. **The delivery is green under my own runs, not just the lanes' claims.** I re-ran everything on `ce4cd3f`: backend `flock … mvn -q test` exit 0 (130 classes / **1111** tests, 0 F/E/S — foreground run, exit witnessed), frontend 57 files / **1329** tests, build exit 0. JDK: Maven 3.9.16 on Java 27 (pom targets 21). Nothing in the N2–N9 work breaks a spec, a status code, or the build.
2. **The announced "1123 backend tests" is inflated by 11** — orphan surefire reports from three deleted debug/scratch test classes. Real current count: 1111. Cosmetic, but if this number ever goes into a release note or a compliance artifact, it's wrong. (P2-1)
3. **CSP ships only through `npm run build`.** The postbuild hook is what makes the built `index.html` CSP-safe; a raw `npx ng build` (which is what both the gate wrapper and my verification used) leaves an inline `onload` handler that the documented proxy CSP blocks → unstyled SPA. The documented hashes **do** validate against a fresh build (I recomputed them), so the doc is trustworthy — but add the `npm run build` warning to the frontend README. (P2-4)
4. **The initial bundle grew ~46 kB past its documented measurement** (716.94 kB vs the README's 670.83 kB; now 156.94 kB over the 560 kB warning budget, under the 1 MB error). The N3 budget *decision* (accept the warning, keep Leaflet in the initial bundle) still stands, but the README's measured numbers predate N5/N7. (P2-2/4)
5. **All four "not done" items are honestly represented in code** — the English network banner, the two allow-listed admin `aria-label`s (armed with a self-expiring staleness test), the still-god files (`admin-page.ts` is now 1783 lines, *bigger* than at review time), and the unimplemented `srcset` (no backend variant pipeline exists to feed it). The one residual that deserves an explicit ticket rather than a shrug: **the verification send-path concurrency test still tests a production-dead helper** (`tryRecord`), and the overcount IT the review asked for was never added (§4.3, P2-5).

**Process note (transparency):** my first backgrounded `mvn` run initially *looked* dead (log frozen at the last migration line, no maven process visible) and I could not at first reconcile the gate wrapper's "backend exit=0" with its 73-second log and absent surefire evidence. Resolution: the suite genuinely finishes in ~75–90 s (parallel classes + one shared Testcontainers context), the log's last line is simply the last test-stdout event, and all reports my run wrote were green; my foreground re-run then completed with a witnessed `MVN_EXIT=0`. The gate run's own report files no longer exist (overwritten by my runs), so its green is corroborated by my two independent runs rather than by surviving artifacts of the gate itself.

---

## 8. What I could not verify

- **No live browser check under the proxy CSP.** I verified hash equality and the link normalization structurally (ran both tools); I did not serve `dist/` behind the documented policy and load the SPA in a browser.
- **The gate wrapper's own `backend exit=0`** rests on the orchestrator session's recorded toolResult (which I read) — its surefire artifacts were overwritten before I could inspect them, so the gate's green is established by my independent re-runs, not by the gate's surviving evidence.
- **The push to `origin`** — I confirmed the local `origin/feature/frontend` ref points at `ce4cd3f` and read the wrapper's push output, but I did not query the remote itself.
- **Contrast ratios for the new badge/Leaflet pairs** — I read the documented ratios and the enforcing `design-tokens.spec.ts` (green in my run), but did not independently recompute WCAG ratios from the token values.

---

## Merge verdict

**OK with notes.** No P0 or P1 in the delivered tree. All nine milestones (N2–N9) are verifiably present and consistent; all declared non-actions are honestly represented and mostly self-arming. Carried items: P2-1 (orphan report count), P2-2 (one English admin badge), P2-3 (stale historical doc), P2-4 (stale README bundle numbers + `npm run build` warning), P2-5 (send-path concurrency gap, track as a ticket), and N10 (OpenSpec archive pass) still pending.
