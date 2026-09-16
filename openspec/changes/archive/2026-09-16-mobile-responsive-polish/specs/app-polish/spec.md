# Spec Delta: app-polish (mobile-responsive-polish, M13)

## MODIFIED Requirements

### Requirement: Responsive layout

The application SHALL remain usable at narrow (mobile) widths: the primary page layouts (map,
detail, forms, auth pages) stack or reflow so no horizontal scrolling is required for core
content, and the map + sidebar arrangement degrades gracefully. Native form controls
(checkboxes, radios) SHALL keep their native glyph size inside flex form rows — the global
form-control width rule SHALL NOT stretch them into wide flex items that displace the row's
label text.

#### Scenario: Narrow viewport on the map page

- **WHEN** the map page is viewed at a mobile width
- **THEN** the map and the sidebar list are arranged for the narrow screen (e.g. stacked or
  otherwise reflowed) and remain usable without horizontal scrolling

#### Scenario: Narrow viewport on forms and detail pages

- **WHEN** a form or the shelter detail page is viewed at a mobile width
- **THEN** the layout reflows to the narrow screen and all controls remain reachable and
  operable

#### Scenario: Checkbox and radio rows at any width

- **WHEN** a form row pairs a native checkbox or radio with a text label (the /submit
  private-home declaration, the report-type options)
- **THEN** the control renders at its native size (the app's 18px glyph) directly beside the
  label, the label wraps below/after it on narrow widths, and the row stays left-aligned
  without a stretched control box
