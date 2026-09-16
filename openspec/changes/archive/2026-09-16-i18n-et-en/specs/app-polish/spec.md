# Spec Delta: app-polish (i18n-et-en, M14 slice 1)

## ADDED Requirements

### Requirement: Localization (Estonian/English)

The application chrome (header nav, header actions, footer, document
titles) SHALL be available in both English (`en`) and Estonian (`et`). A
language switcher SHALL let the user choose the active locale; the choice
SHALL persist across reloads and the document language (`<html lang>`) SHALL
reflect the active locale from before first paint. The default locale (no
stored preference) SHALL be `en`, preserving the existing first-load
behavior.

The two locale catalogs SHALL stay key-complete: every message key present
in one catalog SHALL be present in the other (no untranslated/empty strings
may silently ship).

#### Scenario: Switching language re-renders the chrome

- **WHEN** the user selects the Estonian option in the header language
  switcher
- **THEN** the nav labels, header actions, footer notice, legal links and
  data-provenance line render in Estonian, `<html lang>` becomes `et`, and
  the choice is persisted so a reload starts in Estonian

#### Scenario: No stored preference keeps the default

- **WHEN** the app loads with no stored locale preference
- **THEN** the chrome renders in English and `<html lang>` is `en`

#### Scenario: Catalogs stay in lockstep

- **WHEN** a message key is added to one locale catalog
- **THEN** the key-parity guard fails unless the other catalog carries the
  same key with a non-empty value
