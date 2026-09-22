# Change: i18n-ru

## Why

The whitepaper's internationalization item reads "Estonian first, then
EN/RUS/UA". EN and ET are live; RUS is next. The locale set is the single
enforceable seam — the catalogs are typed against the `Messages` interface
and a runtime parity guard compares them — so adding `ru` makes a missing
Russian key a compile error and a failing test. Completeness is a build
requirement, not a hope.

This change adds Russian as a third UI locale and translates the six
crisis-guidance posts into Russian. The Russian work is MACHINE-ASSISTED
and NOT reviewed by a native speaker; that is recorded in the catalog
header and in the docs, and the six Russian guidance posts are created as
DRAFTS — unreviewed crisis guidance must not be public.

## What Changes

- **Locale set**: `Locale` becomes `'en' | 'et' | 'ru'`; `LOCALES` and the
  pre-paint vocabulary (`core/prepaint.ts` + the inline `src/index.html`
  script + `openshelter-locale`) accept `ru`. Default stays `en`.
- **Russian catalog**: `core/i18n/ru.ts` — a complete translation of every
  `Messages` key (351 keys), machine-assisted, with a header stating that
  it requires a native speaker's review before the site is public-facing.
  Civic vocabulary: shelter = укрытие, blast shelter = убежище, Rescue
  Board = Спасательный департамент, Emergency Response Centre =
  Центр тревоги (112); "OpenShelter", "112" and "EE-ALARM" stay as-is.
  Placeholders (`{time}`, `{m}`) survive verbatim.
- **Switcher**: renders from `LOCALES`, so it gains the third option with
  no template change; with the active locale never rendered, at most two
  "switch to" buttons render at a time, so the narrow (<900px) full-width
  row layout is unchanged in shape.
- **Guards span three catalogs**: the `title.spec.ts` route-title check
  and the `i18n.spec.ts` parity guard now fail on a missing Russian key;
  `prepaint.spec.ts`'s table gains the valid `ru` rows (`fr` takes over
  the invalid-value row).
- **Backend: NO CHANGE** — the public guidance `locale` query parameter
  validates by shape (blank or >5 chars → 400), not against a fixed set;
  `ru` passes (verified against the live API: `?locale=ru` → 200).
- **Six Russian guidance DRAFTS** (never published): the six English
  guidance posts translated 1:1 into Russian, paragraph structure kept
  (each source line its own `<p>`, allowlisted tag set), created through
  `POST /admin/guidance` with `locale: "ru"` and no `status` (draft by
  default). Slugs: the English slug + `-ru`. Drafts are invisible to the
  public API (verified: `GET /api/guidance?locale=ru` → 200 with `[]`,
  draft slug → 404).

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `app-polish`: the "Localization (Estonian/English)" requirement becomes
  the three-locale contract (EN/ET/RU chrome, three-catalog parity, the
  Russian machine-assisted caveat).

## Impact

- Affected specs: `app-polish` (one MODIFIED requirement — the
  localization contract; the "Project documentation" scenario's
  "bilingual EN/ET" deferral sentence is corrected in the main spec
  directly, since it is a different requirement this delta does not own).
- Affected code — frontend: `core/i18n/{locale,i18n.service,ru,i18n.spec,
  messages}.ts`, `core/{prepaint,prepaint.spec,title.spec}.ts`,
  `shared/page-shell.spec.ts`, `src/index.html`.
- Affected code — backend: none (locale query validates by shape).
- Data: six new DRAFT `guidance_posts` rows (locale `ru`).
- Docs sync: `frontend/README.md`, `docs/whitepaper.md`,
  `docs/whitepaper-brief.md`, `qa/accessibility-checklist.md`,
  `openspec/specs/app-polish/spec.md` (deferral sentence).
- Caveat (stated in the catalog header + docs): the RU catalog and the
  six RU guidance posts are machine-assisted and require a native
  speaker's review before the site is genuinely public-facing.
