# Frontend inventory — `frontend/src/app` (+ `frontend/src/styles.scss`, `index.html`)

Scope: Angular 22 frontend, branch `feature/frontend`, read-only pass.
Method: grep + read only (this agent has no shell), cross-checking every import, template binding and
spec reference. No runtime/DOM observation was possible — that limitation is stated per item where it
matters (see §5).

**Headline:** no P1 defects. The frontend is structurally clean: no dead components/services, no HTTP
outside the api-client seam, no legacy control flow, no `any`, and the *user-facing* review-model copy
was already corrected. What remains is (i) four concrete accessibility defects, (ii) review-model
residue that is now **doc-truth only** (comments/token notes), (iii) two real coverage holes, and
(iv) small duplication/style items.

---

## 1. P2 — Accessibility defects (project standard is WCAG AA + 360px)

### F-01 — No skip-to-content link anywhere (WCAG 2.4.1, Level A)

- Evidence: `grep -i "skip to|skip-link|skiplink" frontend/src` → **0 matches**. The shell renders the
  full header nav (`frontend/src/app/shared/page-shell.html`) above `<router-outlet>` for every route.
- Impact: keyboard and screen-reader users must traverse the entire navigation on every page visit; the
  map/first-load route is the app's critical path.
- Fix: make the first element in `page-shell.html` a visually-hidden-until-focused anchor
  (`<a class="skip-link" href="#main">Skip to content</a>`), give the outlet container `id="main"` and
  `tabindex="-1"`, and add a `.skip-link` rule to `styles.scss` (shown on `:focus-visible`).

### F-02 — Admin shelters table is a scroll region with no keyboard access (WCAG 2.1.1)

- Evidence: `frontend/src/app/features/admin/admin-page.scss:53-56` —
  `.admin-table-wrap { overflow-x: auto; }`. The wrapped table has **9 columns**
  (`admin-page.html:379` uses `colspan="9"`). No `tabindex`, `role="region"` or `aria-label` on the
  wrapper anywhere in the feature: `grep "tabindex|role=\"region\"" features/admin` → 0 matches.
- Impact: at 360px the table overflows horizontally; a keyboard-only user has no focusable handle on
  the scroll container. Partially mitigated in practice (the row action buttons inside the table do
  receive focus, and browsers scroll the focused element into view), so this is non-conformance rather
  than a blocker.
- Fix: `tabindex="0" role="region" aria-label="Shelters table"` on `.admin-table-wrap` plus a visible
  focus ring, or collapse the table into stacked cards below the 900px breakpoint.

### F-03 — ARIA tabs pattern declared but not implemented

- Evidence: `admin-page.html:13` `<div class="admin-tabs" role="tablist" aria-label="Admin sections">`
  with six `role="tab"` buttons carrying `aria-selected` (`:16, :26, :36, :46, :56, :66`), matching
  `AdminTab = 'unconfirmed' | 'shelters' | 'reports' | 'alerts' | 'users' | 'audit'`
  (`admin-page.ts:50`). But `grep "tabpanel|aria-controls|aria-labelledby" features/admin` → **0**,
  and there is no arrow-key handler and no roving `tabindex` (`grep "keydown|ArrowRight|tabindex"`
  → 0).
- Impact: assistive tech announces a tab widget, then arrow keys do nothing and the panels are not
  associated with their tabs — worse than plain buttons for screen-reader users.
- Fix: either complete the pattern (ids + `aria-controls` + `role="tabpanel"`/`aria-labelledby`,
  roving tabindex, ArrowLeft/Right/Home/End) or drop `role="tab*"`/`aria-selected` and use plain
  buttons with `aria-pressed`.

### F-04 — Destructive confirms lose focus and are never announced

- Evidence: `admin-page.html:341-368` — activating Delete swaps the button for the confirm strip
  (`<span class="admin-confirm">Delete this shelter permanently?</span>` + Confirm/Cancel). Same shape
  in `contributions-panel.html:95-125`. `grep "\.focus\(\)" features/` → **0 matches** (the only focus
  management in the app is `shared/consent-banner.component.ts:42,67,71`, which is correct), and the
  prompt span has no `role="status"`/`aria-live`.
- Impact: after the swap, focus falls to `<body>`; a keyboard user must re-tab from the top of the
  document, and a screen-reader user never hears *why* the buttons changed.
- Fix: when arming, move focus to the Confirm button (or the strip); on cancel, restore focus to the
  trigger; give the prompt `role="status"` so it is announced. The same primitive should own this
  behaviour for all four call sites (see F-12).
- Related, same class: there is **no focus management on route change** anywhere in `features/`
  (`grep "\.focus\(\)"` → 0). `core/title.ts:32` updates `document.title`, which is a partial
  mitigation, but SPA navigation still leaves focus on the clicked link.

---

## 2. P2 — Review/rating residue (now documentation-truth, not user-visible)

Confirmed clean: no `RatingStars`/`review-form`/`rating-stars` file or symbol, no `.star-*`/`.review-*`
CSS class, no `--color-star-*` token, and no review copy in `core/i18n/en.ts|et.ts`
(`grep -i "star|rating|write reviews|review\." core/i18n` → 1 hit, the "official emergency
instructions" disclaimer, which is unrelated). `shelter-detail-page.spec.ts:251-253` asserting
`.review-list` is null is an intentional removal guard — keep it.

The following are stale because the review model was removed by `V21__drop_reviews.sql`:

### F-05 — `styles.scss` token note attributes `--color-error` to a removed form

- Evidence: `styles.scss:71-78`:
  `--color-error #c0392b — the BRIGHTER red used ONLY by the M5 review form (its .field-error + the
  over-limit counter)` … `Collapsing it onto --color-danger would change visible contrast of the form
  errors (5.4:1 vs 9.1:1) — kept as two tokens.` and the inline repeat at `styles.scss:81`:
  `--color-error: #c0392b; /* M5 review-form error text (slightly brighter red) */`.
- Reality: the only live consumer is `admin-page.scss:210-211` — `.admin-reason__error { … color:
  var(--color-error); }` (the inline reject-reason / info-request editor). The review form does not
  exist.
- Impact: the token's justification is false, so a future consolidation would reason from a form that
  is gone (and the high-contrast override at `styles.scss:271` inherits the same stale rationale).
- Fix: restate the note around the real consumer (`admin-reason` field error on the page surface) or
  collapse `--color-error` onto `--color-danger` if the contrast split is no longer wanted.

### F-06 — `design-tokens.spec.ts` asserts a contrast pair for the removed form

- Evidence: `design-tokens.spec.ts:201-202`:
  `// Review-form error text on the page surface.` / `['--color-error', '--color-bg-surface'],`
- Fix: update the comment to name the admin editor error (`F-05`); keep the assertion (the pair is
  still real).

### F-07 — `app.routes.ts` documents a review area and a review form

- Evidence: `app.routes.ts:21` — `M5: the real /shelters/:id detail page replaces the stub (still
  public — the review area branches in-component)`; `:76-77` — `Public: anonymous visitors see the
  detail without the review controls; the page itself branches on auth/verification (design decision
  2)`; `:80-81` — `Lazy (M6 bundle budget): the detail page + review form are only needed after a
  marker/row click, not for first paint of the map.`
- Impact: three comments describe controls and a lazy chunk that no longer exist; the lazy-chunk
  rationale is the misleading one (it explains a bundle-budget decision by a form that is gone).
- Fix: reword to "the page branches on auth/verification" and "the detail page is only needed after a
  marker/row click".

### F-08 — `admin-page.scss` still names a review-reports queue

- Evidence: `admin-page.scss:272` — `/* ---- queue rows (reports + review reports) ---- */`. The
  review-report queue was removed: `grep -i "reviewReport|hideReview|restoreReview|review-report"
  features/admin` → **0 matches**, and `AdminTab` has no review tab (`admin-page.ts:50`).
- Fix: delete `+ review reports` from the comment.
- Note: `admin-page.scss:183-185` (`Review-queue row actions`) and `:189` (`community-review-queue`)
  are **correct** — that "review" is the live shelter `review_status` moderation queue.

### F-09 — `styles.scss:458` narrows `.btn--danger` to one consumer

- Evidence: `/* two-step delete: armed danger button (used by the contributions panel) */` above the
  generic `.btn--danger` rule. The class is also used by the admin tables
  (`admin-page.html:348` and the report/review rows), and arming is component state, not a class.
- Fix: describe it as the shared danger button; drop the "armed"/"contributions panel" claim.

---

## 3. P2 — Real coverage holes

### F-10 — `shared/form-helpers.ts` has no spec (the only `shared/*` module without one)

- Evidence: `shared/` contains specs for banner, consent-banner, error-copy, loading-indicator,
  location-input, page-shell, resend-countdown, shelter-copy and leaflet-service — but **no**
  `form-helpers.spec.ts`, while all four exports are production-used: `CODE_SIX_DIGITS`
  (`reset-page.ts:65`, `account-page.ts:84,96`, `verify-page.ts:74`), `readCoordinate`
  (`contributions-panel.ts:27,210,211`), `capacityValidator` (`submit-shelter-page.ts:148`,
  `contributions-panel.ts:134`), `nameBlankValidator` (`admin-page.ts:177,202`,
  `contributions-panel.ts:83,127`, `submit-shelter-page.ts:141`).
- Impact: the boundary rules (code format, coordinate parsing/emptiness, capacity bounds,
  whitespace-only names) are only exercised indirectly through page specs, so a regression in the
  shared rule surfaces as a page-level failure rather than a pinned unit contract.
- Fix: add `form-helpers.spec.ts` with table-driven cases per validator (valid/invalid/empty/boundary).

### F-11 — The two pre-paint boot scripts in `index.html` are untested

- Evidence: `index.html:14-24` (theme from `localStorage['openshelter-theme']`) and `:25-40` (locale →
  `document.documentElement.lang`). Both scripts encode FOUC/`<html lang>` guarantees that the specs
  assert *after* the fact (`i18n.spec.ts:31`) but the inline scripts themselves are never executed by
  the vitest/TestBed suite, and the repo has no e2e layer.
- Impact: a regression here (e.g. key rename, `lang` no longer set pre-paint) would ship green —
  precisely the accessibility-visible failure the scripts exist to prevent.
- Fix: extract the pre-paint logic into a tiny exported module (`core/prepaint.ts`) that `index.html`
  inlines via a build step, or add a unit spec that evaluates the script source; alternatively pin the
  storage keys in a spec that also asserts the attribute contract.

---

## 4. P3 — Duplication and Angular-style consistency

### F-12 — The two-tap destructive confirm is implemented 4× with no shared owner

- Evidence: `admin-page.ts:236` (armed suspend), `:248` + `:499-510` (armed delete) with
  `admin-page.html:341-368`; `contributions-panel.ts:242-252` with `contributions-panel.html:95-125`;
  `account-page.ts:358` (type-the-word confirm). Each re-implements arm → confirm/cancel, and none of
  them handles focus/announcement (F-04).
- Fix: one shared confirm primitive (component or signal-based helper) that owns the state machine *and*
  the a11y behaviour; adopt it at all four sites.

### F-13 — Spec harness duplication (test-only)

- Evidence: each page spec re-declares its own router stubs and settle helpers, e.g.
  `core/guards.spec.ts:7-16`, `map-page.spec.ts:232-236`, `account-page.spec.ts:101-104`,
  `submit-shelter-page.spec.ts:94-103`, `login-page.spec.ts:40-46`.
- Fix: a shared `testing/` module (stub pages, `settle()`, gateway fakes) to shrink the specs and make
  new page specs cheaper.

### F-14 — Geolocation mechanism duplicated across two pages (copy mirroring is by design)

- Evidence/context: `shared/shelter-copy.ts` documents that the geolocation **error copy** is
  deliberately mirrored per feature (W9/W15 convention) — that part is correct and should stay. But the
  *mechanism* (`navigator.geolocation.getCurrentPosition` + error mapping + Haversine distance) exists
  in both `map-page.ts` and `shelter-detail-page.ts`.
- Fix: extract a `GeolocationService` returning a typed result; keep the divergent copy in the features.

### F-15 — Root component alone omits `OnPush`

- Evidence: `app.ts:11-15` declares `@Component({ selector: 'app-root', imports: [PageShell], … })` with
  no `changeDetection`. Every other production component sets
  `changeDetection: ChangeDetectionStrategy.OnPush` (`login-page.ts:23`, `map-page.ts:171`,
  `admin-page.ts:152`, `shelter-detail-page.ts:135`, `page-shell.ts:36`, `loading-indicator.ts:16`,
  `banner.component.ts:15`, `consent-banner.component.ts:31`, legal pages, …).
- Fix: add `ChangeDetectionStrategy.OnPush` to `App` for consistency.

### F-16 — Subscription teardown is entirely manual

- Evidence: `ngOnDestroy` unsubscribe in `page-shell.ts:87`, `map-page.ts:350`,
  `shelter-detail-page.ts:342`, `submit-shelter-page.ts:262`, `verify-page.ts:149`,
  `account-page.ts:108`, `reset-page.ts:51`; `grep "takeUntilDestroyed|DestroyRef"` → **0 matches**.
  (`shared/resend-countdown.ts:22` documents the MUST-call-`stop()` contract, which is fine.)
- Impact: not a defect today (the teardowns are present), but a missed unsubscribe is an open leak
  class in a zoneless app; the modern idiom removes the failure mode.
- Fix: migrate new/edited subscriptions to `takeUntilDestroyed(this.destroyRef)` as files are touched.

---

## 5. Verified correct (explicitly checked, no action)

- **No dead components/services.** Import-and-render trace: `ConsentBanner` is rendered
  (`page-shell.html:1`), `PageShell` by `app.html:1`, `BannerComponent`/`LoadingIndicator` by the
  feature templates, and every gateway is consumed — `DataSourceGateway` (`page-shell.ts:16`),
  `GeocodeGateway` (`map-page.ts:25`, `submit-shelter-page.ts:18`), `GeoGateway`
  (`submit-shelter-page.ts:19`), plus account/admin/auth/shelter/verify gateways. Every
  `shelter-copy.ts` export has a live consumer (`PRIVATE_LOCATION_NOTE` →
  `shelter-detail-page.html:63`, `INACCURATE_WARNING/BADGE` → `admin-page.ts:262-264`,
  `hasCommunityReports`/`reportedBadgeText`/`lastVerifiedText` → `shelter-detail-page.html:122-124`).
- **Dead-seam removal is complete on the FE side**: no symbol, class, token or i18n key for the removed
  review model survives (see §2 preamble).
- **HTTP discipline holds**: `HttpClient` appears only in `core/api-client.ts:1,21` (wired once in
  `app.config.ts:11`); all specs that touch it are test doubles. Pages never call HTTP directly.
- **Modern Angular throughout**: no `*ngIf`/`*ngFor` (0 matches — `@if`/`@for` everywhere), no `: any`/
  `as any` in production code, signals/`input()`/`output()`/`viewChildren` in use, `standalone` relies
  on the Angular 19+ default (correct — no explicit flag needed).
- **Reduced-motion is a non-issue**: there are no `@keyframes`, no `animation:` and no `transition:`
  declarations anywhere in `frontend/src/**/*.scss` (all three greps → 0), so there is nothing to gate
  behind `prefers-reduced-motion`.
- **Focus management where it matters most**: `consent-banner.component.ts:42,67,71` moves focus into the
  modal dialog and traps it first↔last, with `role="dialog"`/`aria-modal`/`aria-describedby` pinned by
  its spec — the correct pattern; F-04 asks for the same rigour on the inline confirms.
- **Live-region discipline is good**: errors use `role="alert"`, status/loading use `role="status"`, and
  async buttons expose `[attr.aria-busy]` (`map-page.html:52,87`, `shelter-detail-page.html:88,109,113`).
- **Breakpoint policy**: exactly one breakpoint (`--bp-narrow` = the documented 900px literal,
  `page-shell.scss:164-181`, `map-page.scss:576`); the one known 360px defect is documented as fixed
  (`submit-shelter-page.scss:44`). Layout is fluid below it, so 360px support rests on base styles —
  see F-02 for the uncovered overflow case and §3 for the coverage holes.

## 6. Limitations of this pass

- No shell: every claim is static (grep/read). Nothing here was confirmed in a running browser, and no
  test was executed.
- Member-level dead-code tracing was done for the shared copy/alias surface and the admin feature
  (`reviewReport*` → 0 hits); I did not exhaustively diff every private method of the two ~700-line
  page components against their templates. That is the one area where a follow-up with a runner could
  still find unused members.
- Contrast values in F-05/F-06 are quoted from the existing comments/spec, not re-measured.
