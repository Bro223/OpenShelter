# Design: accessibility-and-provenance

## D1 — High-contrast = token override, zero structural change

One `[data-theme="high-contrast"] { ... }` block in styles.scss overriding
the SAME custom properties the light theme defines (bg #0a0a0a, text #fff,
muted #cfcfcf, surface #141414, subtle #1f1f1f, border #5a5a5a, hover
# 262626, primary #7db8f0 [≥4.5:1 on #0a0a0a], primary-hover #a8d0f5,
danger #ff8a7a, error #ff9d8f, success/badges re-checked for contrast,
cta #ff9f1c). Component scss is untouched (they already consume tokens —
that is the payoff of the M6 token pass). Leaflet container + marker
colors: markers keep their source colors (map context), the legend card
uses surface tokens so it inverts.

## D2 — Toggle + persistence, no flash

Toggle button in `page-shell.html` `.shell-actions` ("High contrast"
label, `aria-pressed`), persisted in localStorage key `openshelter-theme`.
Applied before first paint: a 3-line inline script in `index.html` reads
the key and sets `data-theme` on `<html>` synchronously. app.ts
reads/writes the same key on toggle. Default: no attribute (light theme).
The theme token block and the design-tokens spec: the spec already allows
per-theme token values (values differ by theme, names are stable) — the
spec file needs no structural change; document the theme in its comment.

## D3 — Provenance data: one join, one field

`ShelterDto` gains `boolean submitterVerified`. `ShelterQueryService.toDtos`
already maps in one place: batch-load the distinct non-null `createdById`
values → their `UserData.verification` (one `In` query, no N+1) →
`submitterVerified = shelter.createdById != null && user.verification ==
COMPLETED`. Registry shelters (null createdBy) → false. No new endpoint,
no new table.

## D4 — Badge copy (source is three-valued, not two)

- PAASETEAMET → "Paasteamet registry"
- MUNICIPALITY → "Municipal registry"
- USER + submitterVerified → "Verified user"
- USER + !submitterVerified → "User-submitted"
Badge: small muted chip next to the name in list rows and in the detail
page header (same visual weight as the status chip if one exists, else a
plain muted text line). The legend/filter chip wording is untouched.
