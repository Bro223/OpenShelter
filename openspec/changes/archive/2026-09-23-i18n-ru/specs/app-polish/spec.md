# Spec Delta: i18n-ru (app-polish)

## MODIFIED Requirements

### Requirement: Localization (Estonian/English/Russian)

The application chrome (header nav, header actions, footer, document
titles) SHALL be available in English (`en`), Estonian (`et`) and Russian
(`ru`). A language switcher SHALL let the user choose the active locale;
the choice SHALL persist across reloads and the document language
(`<html lang>`) SHALL reflect the active locale from before first paint.
The default locale (no stored preference) SHALL be `en`, preserving the
existing first-load behavior.

The three locale catalogs SHALL stay key-complete: every message key
present in one catalog SHALL be present in the other two (no
untranslated/empty strings may silently ship) — enforced at compile time
by the shared `Messages` interface and at runtime by the catalog-parity
guard.

The Russian catalog SHALL be marked, in a header comment, as
machine-assisted and NOT reviewed by a native speaker; the repository
docs SHALL state that a native speaker's review is required before the
site is genuinely public-facing. The six Russian crisis-guidance posts
SHALL be stored as DRAFTS until that review is done.

#### Scenario: Switching language re-renders the chrome

- **WHEN** the user selects the Estonian option in the header language
  switcher
- **THEN** the nav labels, header actions, footer notice, legal links and
  data-provenance line render in Estonian, `<html lang>` becomes `et`, and
  the choice is persisted so a reload starts in Estonian

#### Scenario: Switching to Russian re-renders the chrome

- **WHEN** the user selects the Russian (RU) option in the header
  language switcher
- **THEN** the nav labels, header actions, footer notice, legal links and
  data-provenance line render in Russian, `<html lang>` becomes `ru`, and
  the choice is persisted so a reload starts in Russian with the
  pre-paint `<html lang>` already `ru`

#### Scenario: No stored preference keeps the default

- **WHEN** the app loads with no stored locale preference
- **THEN** the chrome renders in English and `<html lang>` is `en`

#### Scenario: Catalogs stay in lockstep

- **WHEN** a message key is added to one locale catalog
- **THEN** the key-parity guard fails unless all three catalogs carry the
  same key with a non-empty value

#### Scenario: A missing Russian key cannot ship

- **WHEN** a `Messages` key has no Russian value
- **THEN** the compile (typed catalog) and the parity guard both fail, and
  the route-title check fails for any route whose `data.title` key lacks
  the Russian value

## RENAMED Requirements

- FROM: `### Requirement: Localization (Estonian/English)`
  TO: `### Requirement: Localization (Estonian/English/Russian)`
