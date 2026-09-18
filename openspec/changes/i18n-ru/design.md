# Design: i18n-ru

## D1 — The locale set is the enforcement seam, so no separate "RU

completeness" check is needed

The catalogs are typed against the `Messages` interface, so a missing
Russian key is a COMPILE error; the runtime parity guard
(`i18n.spec.ts`) is the backstop and also rejects empty values.
`title.spec.ts` checks every routable `data.title` against all three
catalogs at runtime (the typed access is compile-time-only — that check
is the typo guard for route data). Result: there is exactly one way to
ship Russian, and it is complete.

## D2 — Machine-assisted translation, stated as such, review deferred to a

native speaker

A competent plain translation is better than a blocked feature, but the
site must never imply the Russian copy has been reviewed. So the caveat
lives in three places: the `ru.ts` header comment (machine-assisted, NOT
native-reviewed, review required before public-facing), the OpenSpec
requirement (SHALL be marked as such), and the docs (whitepaper + brief
roadmap/status lines). The review itself is an owner task, tracked as
"remaining", not claimed as done.

## D3 — Civic vocabulary is fixed, not free-style

shelter = укрытие (the general shelter), blast shelter = убежище (the
purpose-built one — the guidance posts draw exactly that distinction),
Rescue Board = Спасательный департамент (Päästeamet kept as the
proper-noun gloss where the name is explained), Emergency Response
Centre = Центр тревоги (112). "OpenShelter", "112", "EE-ALARM", the app
names ("Ole valmis!", "Eesti äpp") and the official URLs stay as-is.

## D4 — Quoted UI labels stay truthful per locale

The `how.*` and geocode copy quote UI labels verbatim. Labels that ARE
translated in the Russian locale (the map legend: «Реестр», «Новое от
сообщества», «Подтверждено сообществом»; the submit page's «Моё
местоположение») are quoted in Russian. The one label that stays English
in every locale by design — the around-you CTA "Show shelters around you"
(`messages.ts`: it is intentionally NOT keyed so the `how.nearest` quote
stays true) — is quoted in English, exactly as the ET catalog does.

## D5 — The switcher gains an option, not a redesign

The switcher renders from `LOCALES` and never renders the ACTIVE locale,
so with three locales at most two "switch to" buttons render at a time —
the same number as before. The narrow (<900px) panel row
(`.shell-lang { width: 100%; .btn { flex: 1 } }`) therefore splits the
row between two buttons, visually unchanged; no SCSS change.

## D6 — Russian guidance posts are DRAFTS by construction

The create call omits `status` (the API's default is DRAFT) and the
publish endpoint is never called — unreviewed crisis guidance must not be
public. Verified: the public `?locale=ru` index answers 200 with `[]`
and the draft slug answers 404 (the draft's existence is not revealed).
Publishing is a later owner action after native review.

## D7 — Slugs: explicit, stable, locale-suffixed

The RU slugs are the English slug + `-ru`, supplied explicitly. Relying
on server-side generation from the Cyrillic title would work (the
`SlugFactory` transliterates) but would be a transliteration artifact;
the explicit slug is predictable, greppable, and collision-free (slugs
are globally unique across locales, and no `-ru` slug existed).

## D8 — Backend untouched: shape validation already accepts `ru`

The public guidance `locale` query parameter is validated by shape
(blank or >5 chars → 400, `GuidanceService.resolveLocale`) — not against
a fixed en/et set — because the column is VARCHAR(5) and the value is a
query filter, not a locale claim. `ru` (2 chars, non-blank) passes;
verified live (`?locale=ru` → 200, `?locale=` → 400). No backend code or
test change was needed, so the backend suite was not re-gated.
