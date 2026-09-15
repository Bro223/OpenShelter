# Spec Delta: app-polish (accessibility-and-provenance)

## ADDED Requirements

### Requirement: High-contrast theme

The application SHALL offer a high-contrast theme toggled from the app
shell, persisted across sessions, and applied before first paint. The
theme SHALL override the existing design tokens (same token names) rather
than introducing parallel styles; the default theme SHALL remain the
existing light theme.

#### Scenario: toggle persists

- **WHEN** the user enables high contrast and reloads the app
- **THEN** the high-contrast theme is active before the first paint

#### Scenario: default is light

- **WHEN** a user with no stored preference opens the app
- **THEN** the light theme is shown
