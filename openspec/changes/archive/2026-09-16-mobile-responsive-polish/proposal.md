# Change: Mobile burger menu + responsive polish (roadmap M13)

## Why

Roadmap M13 is "mobile burger menu + responsive polish". The mobile
burger menu itself already exists and is committed (`.shell-burger` +
the `.shell-menu` dropdown in `shared/page-shell.html`: hidden at
>=900px, `menuOpen` signal, click-to-close, Escape-to-close,
navigation-close, `aria-expanded`/`aria-controls`, 48px touch target —
pinned in `page-shell.spec.ts`). So this change is a SYSTEMATIC
NARROW-WIDTH AUDIT (headless Chromium, 360px and 820px, light +
high-contrast theme, public and authenticated routes) plus the fixes
the audit found.

## Audit result (evidence: /tmp/m13-audit, /tmp/m13-audit2 screenshots)

Verified at 360x740 and 820x1180, both themes, zero horizontal
overflow and zero page errors on every route:

- Map page: stacks map-over-list at <900 (M6 responsive block),
  filter chips wrap, legend + attribution clear — unchanged.
- Detail page: reflows, navigate row wraps, location map full width —
  unchanged.
- Forms (login/register/reset, legal pages): single column, full-width
  inputs — unchanged.
- High-contrast theme at mobile widths: applied pre-paint, no contrast
  regressions observed, no overflow — unchanged.
- Admin dashboard: tabs wrap, tables sit in `overflow-x: auto`
  wrappers (the documented pattern) — unchanged, BUT see defect 1.
- 48px touch targets: global `.btn` min-height + the burger/menu rows —
  unchanged, pinned in `design-tokens.spec.ts`.

## What Changes

- **Defect 1 (dev, functional): the dev proxy is missing the `/admin`
  prefix.** `frontend/proxy.conf.json` proxies `/api`, `/auth`,
  `/account/`, `/verify/` to the backend — every prefix the app calls
  EXCEPT `/admin`. In the dev environment (`ng serve`), every admin
  dashboard request (`/admin/shelters`, `/admin/users`, `/admin/alerts`,
  ...) falls through to the SPA fallback and answers 200 with
  `index.html`, so the whole dashboard renders "Request failed with
  status 200" and can never load its data. Fix: add the `/admin/`
  entry (trailing slash — `/admin` itself is the SPA route, the same
  pattern as `/account/` and `/verify/`). Takes effect on the next
  `ng serve` start (the running dev server is left untouched by this
  pass); verified on a throwaway `ng serve` on a spare port.
- **Defect 2 (visual, all widths): the /submit private-home checkbox
  row is misaligned.** The global `.field input { width: 100%; ... }`
  form rule stretches the D7 checkbox into a ~112px-wide flex item,
  pushing the label text to the middle of the row (measured at 360px:
  checkbox x=24 w=112, label text x=147). The detail page's report
  radios already escape the rule with an explicit 18px size
  (`.report-option input`); the checkbox gets the same treatment
  (width/height 18px, `margin: 0`, `flex-shrink: 0`,
  `accent-color: var(--color-primary)`).
- **Spec pin**: `design-tokens.spec.ts` gains a mechanism assertion
  that the checkbox carries an explicit native size (regression guard
  for the global width rule), and the app-polish spec gains the
  checkbox-row scenario.

## Unchanged (verified, not re-done)

The burger menu, the map stacking, the admin table scroll wrappers,
the 48px touch-target rule, the high-contrast token overrides — all
already shipped and re-verified by this audit. No new breakpoints, no
new tokens, no new colors.
