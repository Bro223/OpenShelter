# Tasks — i18n-et-en (M14, slice 1 of N: foundation + app chrome)

## Slice 1 — i18n core (this pass)

- [x] `core/i18n/locale.ts`: `Locale` type (`'en' | 'et'`) + `LOCALES`
      (the switcher renders from it — a new language is one entry, not a
      template edit)
- [x] `core/i18n/messages.ts`: typed `Messages` interface + `MessageKey`
      (chrome + route-title keys) — the key set is the contract both
      catalogs must satisfy
- [x] `core/i18n/en.ts` + `core/i18n/et.ts`: the two catalogs (EN = the
      current copy verbatim; ET = Estonian translations); a `CATALOGS`
      record in `i18n.service.ts`
- [x] `core/i18n/i18n.service.ts`: `I18nService` — `locale` signal,
      `t(key, params?)` with `{param}` interpolation, `setLocale()`;
      `openshelter-locale` persistence mirroring `ThemeStore` (only
      `en`/`et` stored; absent/invalid → `en` default; try/catch
      private-mode degradation); `<html lang>` re-asserted on construction
- [x] `core/i18n/translate-pipe.ts`: `TranslatePipe` (`t`, `pure: false`)
- [x] `index.html`: pre-paint locale script (sets `<html lang>` before
      first paint, same no-flash pattern as the theme)
- [x] `main.ts`: `registerLocaleData(et)` so the `date` pipe formats
      Estonian dates natively

## Slice 2 — language switcher + shell copy (this pass)

- [x] `page-shell.html`: nav labels, burger aria-label, high-contrast /
      log-in / log-out / create-account, footer safety notice (segmented
      around the two official links), legal links, data-provenance line —
      all through the `t` pipe; the date-provenance `date` pipe follows
      the active locale
- [x] `page-shell.html`: EN/ET switcher in `.shell-actions` (before the
      theme toggle) — two `.btn btn--ghost` buttons, `aria-pressed`
      mirrors the active locale, translated group `aria-label`
- [x] `page-shell.scss`: `.shell-lang` group (flex row; stretches to the
      column rows at <900 like the other actions)
- [x] `page-shell.ts`: import `TranslatePipe`, expose `I18nService` to the
      template

## Slice 3 — route titles (this pass)

- [x] `app.routes.ts`: `data.title` values → message keys
      (`title.map` … `title.admin`)
- [x] `core/title.ts`: `titleGuard` resolves the key via `I18nService`
      (`"<Page> — OpenShelter"` shape unchanged)

## Slice 4 — specs + docs (this pass)

- [x] `core/i18n/i18n.spec.ts`: default locale, stored preference,
      invalid-value fallback, `setLocale` persistence + `lang` attribute,
      `t()` + interpolation, en/et key-parity guard, no-empty-values guard
- [x] `page-shell.spec.ts`: switcher wiring (aria-pressed, persistence,
      `lang` flip) + full Estonian-chrome render test
- [x] `title.spec.ts`: both locales + every routable title is a key present
      in BOTH catalogs
- [x] `frontend/README.md`: the "i18n — English-only strings" limitation
      line updated to reflect slice 1

## Gates

- [x] FE: `npx ng test` 891/891 (42 files, +15 new tests), `tsc` app+spec
      clean, prettier clean on touched files
- [x] BE: `mvn -q test` 695/695 (89 classes, tree-health green — no BE
      change in this slice)
- [x] `openspec validate --all` 25/25 green at gate time

## Deferred (slices 2+ of M14, next passes)

- `shared/shelter-copy.ts` trust copy (provenance, occupancy, reports,
  recency, distance) through `t(key, params)`
- `shared/error-copy.ts` + feature pages (submit, auth, account, verify,
  admin, legal page bodies)
- default-locale flip to `et` — owner decision, one line + spec update
