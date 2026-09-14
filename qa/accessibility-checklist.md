# OpenShelter — Accessibility Checklist (frontend-grounded)

Read-only QA pass, 2026-07-08. Evidence is from `frontend/src/` (paths relative to
`frontend/src/` unless stated otherwise). Verdicts: **verified** (code + test evidence) /
**partial** (mechanism exists, coverage or proof incomplete) / **missing**.

---

## 1. Semantic headings & landmarks

**Status: VERIFIED**

- App shell landmarks on every page: `<header>` (`shared/page-shell.html:3`), `<main class="shell-body">` wrapping the router outlet (`page-shell.html:88-90`), `<footer>` (`page-shell.html:98`) with a legal `<nav aria-label="Legal">` (`page-shell.html:106`).
- Primary nav: `<nav class="shell-nav" aria-label="Primary">` (`page-shell.html:32`).
- Exactly one `<h1>` per page: map `features/map/map-page.html:3` ("Shelter map"), account `features/account/account-page.html:2`, admin `features/admin/admin-page.html:2`, detail `features/shelter/shelter-detail-page.html:13`, login `features/auth/login-page.html:2`; panels/sections use `<h2>` (e.g. `account-page.html:33,99,132,237,340,347,365,396`; `shelter-detail-page.html:139,148,165,212,255,345`).
- Consent banner: `<section role="region" aria-labelledby="consent-title">` with its own `<h2 id="consent-title">` (`shared/consent-banner.component.html:2-4`).
- Legal pages render a title + table of contents + section headings: `features/legal/privacy-policy-page.spec.ts` (renders the title, the last-updated line and a table of contents / renders the section headings), same for `terms-page.spec.ts`.
- **Partial note**: the mobile menu panel reuses header controls; its landmark role is a plain div panel controlled by the burger (see §7) — acceptable, but not a `<nav>` duplicate (nav stays in the header).

## 2. Form labels

**Status: VERIFIED**

- 37 `<label for=…>` bindings across feature templates; every form field has a programmatic label:
  - login: `features/auth/login-page.html:13,27` (contact, password)
  - register: `register-page.html:14,22,41,58` (name, email, phone, password)
  - reset: `reset-page.html:9,45,61,74` (email, code, new password, repeat)
  - account: `account-page.html:61,69,144,175,249,278,372` (name, current password, new email, SMS code, new phone, email code, type-DELETE confirm)
  - contributions (inline edit + reply forms): `contributions-panel.html:136,144,158,167,179,229`
  - verify: `verify-page.html:34` (dynamic `[for]="codeId(level)"` per channel)
  - map anchor search: `map-page.html:71` (`for="anchor-search-input"`)
- Tests: `features/auth/login-page.spec.ts` ("renders the login form with real labels"), `register-page.spec.ts` ("renders all four fields with real labels"), `features/account/account-page.spec.ts` (43 cases incl. required-field error behavior).
- **Partial note**: no automated check that *every* input has a label (a lint rule would guarantee this); the label set above is complete by manual inspection of the current tree.

## 3. Focus-visible styles

**Status: VERIFIED**

- Global rule: `a, button, input, textarea` `:focus-visible` in `styles.scss:314-318` ("global :focus-visible rules win where they exist"); explicit `:focus-visible` on shell controls (`styles.scss:380`).
- Test: `design-tokens.spec.ts` — "styles.scss provides a global :focus-visible rule (keyboard-operable nav)".
- **Partial note**: focus *order* and focus *restoration* (e.g. after the mobile menu closes, or after a two-step confirm strips disappear) are not asserted by any spec — needs manual keyboard walk (see manual items).

## 4. ARIA roles & live regions

**Status: VERIFIED**

- Status/live regions:
  - loading indicator `<p role="status">` (`shared/loading-indicator.html:1`; spec asserts "renders the default message as an aria status").
  - map nearest line `role="status"` (`map-page.html:138`), nearest error `role="alert"` (`map-page.html:167`), anchor search error `role="alert"` (`map-page.html:110`), anchor line `role="status"` (`map-page.html:174`), results list `aria-label="Address results"` (`map-page.html:114`).
  - global error banner `role="alert"`: `shared/banner.component.spec.ts` ("renders an error banner with role=\"alert\"").
- State-bearing controls: `aria-pressed` on language buttons (`page-shell.html:55`), theme toggle (`page-shell.html:69`), filter chips (`map-page.html:202,211`); burger `aria-label`/`aria-expanded`/`aria-controls` (`page-shell.html:10-12`); `aria-busy` during locate/anchor search (`map-page.html:52,90`); list `aria-label="Shelters"` (`map-page.html:227`); legend `role="group"` (`map-page.html:10`); filter groups `role="group"` with labels (`map-page.html:180,197`); level chips `aria-label="Verification status"` (`verify-page.html:8`); decorative glyphs `aria-hidden="true"` (burger bars `page-shell.html:15-17`, legend swatches `map-page.html:14-33`).
- Named targets: list rows expose "View details for <name>" aria-labels (`map-page.html:298-304`).
- **Partial note**: no spec asserts the live-region announcements actually change on state transitions beyond what the specs above pin; screen-reader verification is a manual item.

## 5. 48 px touch targets

**Status: VERIFIED (buttons); PARTIAL (row actions)**

- Token `--space-48: 48px` (`styles.scss:157`); every `.btn` carries `min-height: var(--space-48)` with both-axis label centering (`styles.scss:395-411`, comment: "the explicit min-height makes every .btn … at least a 48px target").
- Test: `design-tokens.spec.ts` — "48px touch targets: .btn carries the min-height (D5)".
- Occupancy band buttons and open/closed state buttons on the detail page are 48 px (FE spec: "the three 48px band buttons …", "the two 48px state buttons").
- **Partial note**: sidebar list rows and admin table row-action buttons that are *not* `.btn`-classed are not covered by the token rule; verify row hit areas manually on a small viewport.

## 6. Color-contrast tokens + high-contrast theme

**Status: VERIFIED (token-level); PARTIAL (per-surface visual)**

- Single source of truth `:root` token block (`styles.scss:17+`); documented ratios at definition: crisis CTA white-on-`#bf360c` = 5.6:1 (`styles.scss:39`), reported white-on-`#c2410c` = 5.18:1 (`styles.scss:~57`), two-reds contrast rationale 5.4:1 vs 9.1:1 (N20 comment).
- Automated contrast audit: `design-tokens.spec.ts` — "every contrast-checked text pair meets 4.5:1 and border pairs 3:1, in both themes", "every contrast exemption is honest", "colour literals only inside the :root token block or the theme block".
- High-contrast theme as token override (same token names, no parallel stylesheet): `[data-theme='high-contrast']` block (`styles.scss:175-230+`), tests "the high-contrast theme block overrides a sampled set of token names (D1)" and "overrides the SAME --color* name set as :root (both directions)".
- No first-paint flash: pre-paint inline script applies `data-theme` before the bundle (`src/index.html:14-25`); persistence in `core/theme-store.ts` (+ `theme-store.spec.ts` 7 cases incl. reload survival and pre-paint read).
- OS form-control color fix for HC (UA colors don't follow `data-theme`): `styles.scss:323-327` + test "form controls and links carry explicit token colours".
- **Partial note**: contrast is audited for token *pairs*, not every rendered surface (e.g. map markers are graphical objects with their own WCAG 1.4.11 logic, not text). Real-browser visual pass under HC is a manual item.

## 7. Keyboard navigation

**Status: PARTIAL (structure verified, full walk manual)**

- Global focus-visible makes every interactive element keyboard-reachable (§3).
- Mobile menu: Escape closes the panel, host keydown listener bound and unbound on teardown (`shared/page-shell.spec.ts`: "Escape closes the panel (host keydown listener)", "teardown unbinds the host keydown listener", navigation closes the panel).
- Anchor pin is deliberately out of the tab order (non-interactive Leaflet element): `shared/leaflet-service.spec.ts` ("the anchor pin is fixed and non-interactive — no drag, no click handler, out of the tab order (M12)").
- Map interaction alternatives exist: sidebar list rows are real links ("View details" `map-page.html:298-304`), filters are toggle buttons with `aria-pressed`, address search submits on Enter with one-pending guard (`map-page.spec.ts`: "Enter submits, and a press while a search is pending is ignored").
- **Partial note**: no automated full-page keyboard walk (tab order, focus traps, focus return after menu/panel close); Leaflet map itself is not keyboard-operable — the list is the accessible path (verify the map's non-keyboard nature is documented/accepted manually).

## 8. Responsive breakpoint

**Status: VERIFIED (structure); PARTIAL (device pass)**

- Single literal breakpoint 900px used in `@media` rules (token cannot be used inside media queries — browser limitation, documented at `styles.scss:167`); tests: `design-tokens.spec.ts` — "map page re-stacks map + sidebar at the narrow breakpoint", "the shell header reflows (wraps) so the chrome never overflows at narrow widths", mobile checkbox glyph fix (M13).
- Viewport meta present: `src/index.html:7`.
- **Partial note**: no automated small-device pass (320–430 px) beyond the reflow tests — manual device check (manual item).

## 9. i18n coverage — known gap

**Status: PARTIAL — known gap (feature-page copy still English)**

- Switcher infrastructure: locales `['en','et']` (`core/i18n/locale.ts:8-11`), typed `Messages` contract with compile-time parity + runtime parity/no-empty-value guard (`core/i18n/messages.ts`, `core/i18n/i18n.spec.ts` 10 cases incl. "en and et carry exactly the same key set"), pre-paint `<html lang>` (`src/index.html:26-39`), locale group with `aria-pressed` per language (`page-shell.html:50-61`, spec tests both directions + persistence).
- **Translated** (uses `| t`): page chrome `shared/page-shell.html` (18 uses), consent banner (4), auth pages (login 15, register 25, reset 23), map page partially (6: nav/how-to blocks, e.g. `map-page.html:335`).
- **NOT translated** (0 `| t` uses, hardcoded English): `features/account/account-page.html`, `features/account/contributions-panel.html`, `features/account/verify-page.html`, `features/admin/admin-page.html`, `features/shelter/shelter-detail-page.html`, `features/shelter/submit-shelter-page.html`, `features/legal/privacy-policy-page.html`, `features/legal/terms-page.html`.
- Catalog scope is "app chrome + route titles" by design of M14 slice 1 (`messages.ts` header comment: "Slice 2+ of M14 extends this interface with the feature-page copy") — the gap is tracked, not accidental.
- Manual item: full Estonian pass over the untranslated feature pages (copy review + `<html lang>`/screen-reader behavior in ET mode).

---

### Summary table

| # | Area | Verdict |
|---|---|---|
| 1 | Semantic headings/landmarks | verified |
| 2 | Form labels | verified (no lint rule guaranteeing it — partial on guarantee) |
| 3 | focus-visible styles | verified (focus order/return manual) |
| 4 | ARIA roles / live regions | verified (announcement pass manual) |
| 5 | 48 px touch targets | verified for `.btn`; partial for non-button row actions |
| 6 | Contrast tokens + high-contrast theme | verified at token level; visual pass manual |
| 7 | Keyboard navigation | partial (structure verified, full walk manual) |
| 8 | Responsive breakpoint | verified structurally; device pass manual |
| 9 | i18n (EN/ET) | partial — **known gap: feature-page copy still English** |
