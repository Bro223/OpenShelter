# Change: i18n Estonian/English — foundation + bilingual app chrome (roadmap M14, slice 1 of N)

## Why

Roadmap M14 is "i18n Estonian/English" — the whitepaper's
"Internationalization — Estonian first, then EN/RUS/UA" item. The FE copy is
currently single-language English with the single-sourcing seams already in
place (per-route titles via `titleGuard`, `shared/shelter-copy.ts`,
`shared/error-copy.ts`). This is a multi-pass refactor; **slice 1 lands the
i18n foundation and makes the app chrome (header, nav, actions, footer,
document titles) fully bilingual**. Feature-page copy (shelter trust copy,
submit/auth/account/admin forms, legal pages, error copy) is explicitly
deferred to later slices so each pass ships a complete green unit.

**Default-locale decision (owner-flagged):** the default locale is **`en`**
— the current copy language — so this slice changes no first-load behavior
for existing users; Estonian is fully supported via the switcher. The
whitepaper's "Estonian first" suggests the owner may want `et` as the
default once the whole UI is translated; flipping the default is a one-line
change (`DEFAULT_LOCALE` in `core/i18n/i18n.service.ts`) and a spec update,
deliberately NOT made in this slice.

## What Changes

- **i18n core** (`app/core/i18n/`): `Locale` type (`'en' | 'et'`), typed
  `Messages` catalog interface + `en`/`et` catalogs, `I18nService`
  (root-provided): `locale` signal, `t(key, params?)` with `{param}`
  interpolation (the seam slice 2+ domain copy needs), `setLocale()`.
  Persistence mirrors `ThemeStore` exactly: `openshelter-locale`
  localStorage key (only `en`/`et` ever stored; absent/invalid = the `en`
  default; try/catch so private-mode storage degrades to session-only),
  `<html lang>` re-asserted on construction, and an **inline index.html
  pre-paint script** sets `lang` before first paint (screen readers /
  spellcheck see the right language from the first byte — the documented
  no-flash pattern from the high-contrast theme).
- **`t` pipe** (`TranslatePipe`, `pure: false`): `{{ 'nav.map' | t }}` —
  re-evaluates on change detection so a locale switch re-renders.
- **Language switcher** in the shell header actions (before the high-
  contrast toggle): a two-button EN/ET group, `aria-pressed` mirrors the
  active locale, group `aria-label` translated, 48px targets (the global
  `.btn` rule), persists on click.
- **Shell copy extracted** through `t`: nav labels, burger aria-label,
  high-contrast / log-in / log-out / create-account controls, the footer
  safety notice (split into segments around the two official-source links),
  the legal links, and the data-provenance line — whose `date: 'short'`
  now follows the active locale (`registerLocaleData(et)` added in
  main.ts so Estonian dates format natively).
- **Route titles through i18n**: `app.routes.ts` `data.title` values become
  message keys (`title.map` … `title.admin`); `titleGuard` resolves them
  via `I18nService` (the `"<Page> — OpenShelter"` shape is unchanged). The
  title.spec completeness check is strengthened: every routable title must
  be a key present in BOTH catalogs.
- **Specs**: new `i18n.spec.ts` (default locale, stored preference,
  invalid-value fallback, `setLocale` persistence + `lang` attribute,
  `t()` + interpolation, en/et **key-parity guard** + no-empty-values
  guard); page-shell spec gains the switcher wiring tests + a full
  Estonian-chrome render test; title spec covers both locales.

## Unchanged (deferred slices)

- Feature-page copy: `shelter-copy.ts` (provenance/occupancy/report/recency
  helpers), `error-copy.ts`, submit/auth/account/verify/admin pages, legal
  page bodies — all stay English in this slice. The `t(key, params)`
  interpolation seam is in place for them.
- The `document.title` updates on the next route activation, not live on
  locale switch (acceptable: titles are per-navigation).
- No backend change (FE-only slice).

## Impact

- New: `app/core/i18n/{locale,messages,en,et,i18n.service,translate-pipe}.ts`
  - `i18n.spec.ts`.
- Modified: `index.html` (pre-paint script), `main.ts` (et locale data),
  `app.routes.ts` (title keys), `core/title.ts` (+spec),
  `shared/page-shell.{html,scss,ts}` (+spec), `frontend/README.md`
  (the i18n limitation line), OpenSpec delta below.
