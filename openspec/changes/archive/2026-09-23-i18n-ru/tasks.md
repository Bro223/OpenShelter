# Tasks: i18n-ru

## Phase 1 — Locale plumbing

- [x] `core/i18n/locale.ts`: `Locale = 'en' | 'et' | 'ru'`,
  `LOCALES = ['en', 'et', 'ru']`
- [x] `core/i18n/i18n.service.ts`: `CATALOGS` gains `ru: RU`
- [x] `core/prepaint.ts`: `SUPPORTED_LOCALES = ['en', 'et', 'ru']`,
  `applyStoredLocale` accepts `ru`
- [x] `src/index.html`: the pre-paint locale script accepts `ru`
  (`<html lang>` follows pre-first-paint)

## Phase 2 — Russian catalog

- [x] `core/i18n/ru.ts`: all 351 `Messages` keys translated (typed — a
  missing key is a compile error), placeholders `{time}`/`{m}` survive
  verbatim, no empty values
- [x] Header comment states: machine-assisted, NOT native-reviewed,
  native speaker's review required before public-facing
- [x] Safety-critical strings unambiguous (the 112 footer notice,
  "Report this shelter", the occupancy bands, the open/closed states);
  civic vocabulary fixed (укрытие / убежище / Спасательный департамент /
  Центр тревоги; "OpenShelter", "112", "EE-ALARM" as-is)

## Phase 3 — Guards span three catalogs

- [x] `core/i18n/i18n.spec.ts`: parity over EN/ET/RU (key set +
  no-empty-value); the invalid-stored-value test moves off `ru` (now
  valid) to `fr`
- [x] `core/title.spec.ts`: every routable `data.title` key checked
  against all three catalogs; a Russian title-resolution test
- [x] `core/prepaint.spec.ts`: valid `ru` rows in the module + page
  halves, lockstep states extended, `fr` as the invalid value
- [x] `shared/page-shell.spec.ts`: the switcher spec spans three
  languages (the offered buttons are the two inactive ones; a dedicated
  RU switch test asserts the Russian chrome, `<html lang>` and the
  persisted choice)
- [x] Backend check (no code change): the public guidance `locale` query
  validates by SHAPE (blank or >5 chars → 400), not a fixed en/et set —
  `?locale=ru` verified 200 against the live API

## Phase 4 — Russian guidance drafts (DRAFTS, never published)

> **Superseded (2026-09-22, V26).** The six RU drafts (ids 17–22) were the
> transitional state at lane time. The RU content later shipped as per-locale
> translation rows on the six PUBLISHED posts (ids 5,7,9,11,13,15 — the
> `V26__guidance_post_translations.sql` model), the drafts no longer exist,
> and the RU posts are public. The checked records below are the dated
> history of what this change itself did (translate, create as drafts,
> verify invisible).

- [x] Read the six English guidance posts through the admin API
- [x] Translate 1:1 (no invented guidance), each source line its own
  `<p>`, allowlisted tag set only
- [x] Create through `POST /admin/guidance` with `locale: "ru"` and no
  `status` — all six DRAFT (ids 17–22), slugs: the English slug + `-ru`:
  `three-minutes-to-shelter-what-to-do-the-moment-the-sirens-sound-ru`,
  `shelter-spaces-in-estonia-what-a-shelter-space-and-a-blast-shelter-actually-are-ru`,
  `a-suspicious-drone-what-to-do-and-what-not-to-do-ru`,
  `how-the-state-warns-you-ee-alarm-explained-ru`,
  `sheltering-with-children-older-relatives-and-pets-a-plan-you-can-actually-follow-ru`,
  `seven-days-on-your-own-preparing-your-home-for-power-water-and-network-outages-ru`
- [x] Verified invisible to the public surface:
  `GET /api/guidance?locale=ru` → 200 `[]`; the draft slug detail → 404

## Phase 5 — Docs that said "two languages"

- [x] `frontend/README.md` (the i18n deferral: bilingual EN/ET →
  trilingual EN/ET/RU)
- [x] `docs/whitepaper.md` (crisis-ready UX, the switcher sentence, the
  stack table, the shipped list, the in-progress line, the roadmap item)
- [x] `docs/whitepaper-brief.md` (the switcher line, the status line)
- [x] `qa/accessibility-checklist.md` (the switcher-infrastructure note —
  locales list, the parity-test name, the now-accurate switcher
  behaviour; the i18n status row)
- [x] `openspec/specs/app-polish/spec.md` — the "Project documentation"
  scenario's "app chrome is bilingual EN/ET" → "trilingual EN/ET/RU"
  (a different requirement than the one this delta modifies)

## Phase 6 — Gates

- [x] `npx ng test --watch=false` — 1096/1096 green (49 files)
- [x] `npx tsc -p tsconfig.app.json --noEmit` and
  `npx tsc -p tsconfig.spec.json --noEmit` — clean
- [x] `npx ng build` — success (one pre-existing scss-budget warning,
  unrelated)
- [x] `openspec validate i18n-ru --strict` and `openspec validate --all`
  — green (24 items baseline kept, +1 for this change)
- [x] Backend `mvn test` NOT re-run: no backend code touched (the
  locale-query validation was verified against the live API instead)
