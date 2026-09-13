# Tasks — mobile-responsive-polish (M13)

## Slice 0 — Verified already present (no code change, headless audit)

- [x] Mobile burger menu: `.shell-burger` + `.shell-menu` dropdown
      (hidden >=900px, toggle/click-close/Escape-close/navigation-close,
      `aria-expanded` + `aria-controls`, 48px target) — committed since
      the M6 polish; re-verified rendered at 360/820, both themes
      (spec pins in `page-shell.spec.ts` unchanged)
- [x] Narrow-width map layout: map over list at <900, chips wrap, no
      horizontal overflow (audit: 360/820, light + HC, 0px overflow)
- [x] Admin tables: `.admin-table-wrap { overflow-x: auto }` wrappers +
      wrapping tabs; no page-level overflow at 360 (audit)
- [x] 48px touch targets: global `.btn` min-height + burger/menu rows —
      pinned in `design-tokens.spec.ts`
- [x] High-contrast mode at mobile widths: pre-paint application, no
      overflow, no observed contrast regression (audit, both widths)

## Slice 1 — Dev proxy: the missing `/admin` route (this pass)

- [x] `frontend/proxy.conf.json`: add the `/admin/` entry (trailing
      slash — `/admin` is the SPA route; mirrors `/account/` +
      `/verify/`) → admin dashboard data loads in the dev environment
- [x] Verified on a throwaway `ng serve` (spare port, this pass's own
      process — the protected :5173 server untouched): `/admin` serves
      the SPA, `/admin/shelters` proxies the JSON list; the protected
      :5173 picks the route up on its next start

## Slice 2 — /submit checkbox row native size (this pass)

- [x] `submit-shelter-page.scss`: `.checkbox-field input` — explicit
      18px native size (width/height), `margin: 0`, `flex-shrink: 0`,
      `accent-color: var(--color-primary)` — the same escape the detail
      page's report radios already use (`.report-option input`); fixes
      the global `.field input { width: 100% }` stretch measured at
      360px (checkbox w=112px, label text displaced to x=147)
- [x] `design-tokens.spec.ts`: mechanism pin — the checkbox rule
      carries an explicit native width (regression guard for the
      global width rule)

## Slice 3 — Spec + docs (this pass)

- [x] OpenSpec `mobile-responsive-polish`: this proposal + tasks +
      the app-polish `Responsive layout` delta (checkbox/radio row
      scenario)
- [x] `openspec validate` green at gate time

## Gates

- [x] FE: `npx ng test` green, `tsc` app+spec clean, prettier clean on
      touched files
- [x] BE: `mvn -q test` tree-health green (no BE change in this
      milestone)
