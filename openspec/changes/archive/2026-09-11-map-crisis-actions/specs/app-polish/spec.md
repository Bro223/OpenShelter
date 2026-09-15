# Spec Delta: app-polish (map-crisis-actions)

## ADDED Requirements

### Requirement: Touch target and numeric legibility

Primary/secondary (`.btn`) buttons and list-row buttons SHALL have a
minimum height of 48px. Coordinate and count readouts SHALL use tabular
numerals (`font-variant-numeric: tabular-nums`) so digits do not shift
while they update.

#### Scenario: small-screen target size

- **WHEN** the app is rendered on a 360px-wide viewport
- **THEN** every primary/secondary (`.btn`) button and list-row button is
  at least 48px tall
