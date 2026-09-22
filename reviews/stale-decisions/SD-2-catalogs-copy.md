# SD-2 — Catalogs, copy and dead UI

**Lane:** stale-decision audit, batch of 3 (READ-ONLY; no edits, no build, no server, no DB).
**Scope:** catalog keys, UI copy and CSS rules that a decision left behind.
**Corpus:** `frontend/src/app/core/i18n/{en,et,ru,messages}.ts` (977 keys, all three catalogs
key-complete — compile-time parity), all 35 `.html` templates under `src/app`, all non-spec
`.ts`, all `.spec.ts`, `docs/`, `openspec/`, `qa/`, `README.md`.

## Method (the counter-check, run exhaustively)

1. **Key inventory.** 977 keys extracted from the `Messages` interface (`messages.ts`);
   verified `en.ts`/`et.ts`/`ru.ts` each define exactly that set (977/977/977 — no ET/RU gap
   can exist; a missing key is a compile error).
2. **Live-reference scan.** For every key, both quoted forms (`'key'`, `"key"`) searched in
   every `.ts`/`.html` under `frontend/src` except the four definition files; hits classified
   as template / TS / site-texts allow-list (`site-texts.ts` — a key there is live: rendered
   by the admin panel and applied by the overlay) / spec-only. 19 keys had zero
   template+TS+site-texts references; each was individually re-verified (dynamic references,
   object-map key tables like `shelter-copy.ts`, route data, `defaultText`/`url()` callers,
   spec pins, OpenSpec/qa mentions).
3. **Template scan.** The repo's own guard scanner
   (`core/i18n/i18n-template-guard-scanner.ts`) was run in a sandbox against all 35 templates:
   38 raw violations, **all 38 are in the guard's allow-lists** (glyphs, punctuation, the
   `OpenShelter` brand, `Capacity:`, the `DELETE` arming word, `https://`, `suspend`).
   No un-allow-listed hardcoded template copy exists.
4. **TS copy scan.** Every multi-word string literal in non-spec TS classified (structural vs
   copy); copy candidates individually verified against their render path.
5. **Wording scan.** All five named old forms plus the full fix history recovered from
   `docs/i18n-review.md` (both "fixed errors" tables and the dictionary-audit tables)
   searched as substrings/word-boundaries across all three catalogs, templates, specs and docs.
6. **CSS scan.** 365 class selectors extracted from the 37 `.scss` files; each counter-checked
   against the full HTML+TS corpus. 5 candidates, each individually verified.

**Finding count: 10** (2 HIGH, 1 MED, 7 LOW) + 1 mandated open item + 18 rejected false
positives.

---

## Findings

### F1 — `Kusta` survivors on two live delete buttons — **STALE-HIGH**

**Superseded decision.** The i18n-review fix `Kusta`→`Kustuta` (owner-side queue,
`docs/autopilot/BACKLOG-PLAN.md:249`: "every Estonian defect this week (`Sule`, `nimekik`,
`Hovendatud`, `Kusta`, the word order corrected in `admin.unconfirmed.reject`)"). The fix was
applied across the catalog's delete vocabulary but missed these two keys:
`account.contrib.delete` dates from `4a68f4a` and `admin.media.delete` from `18038ae`; the
audit-corrections commit `75d4cc0` passed over `admin.media.delete` without touching it (the
diff shows the line unchanged next to the fixed `admin.media.delete.inUse`).

**Artefacts.**
- `frontend/src/app/core/i18n/et.ts:550` — `'account.contrib.delete': 'Kusta'`
- `frontend/src/app/core/i18n/et.ts:984` — `'admin.media.delete': 'Kusta'`

**Counter-check.** Both keys are **LIVE** — this is stale wording, not a dead key:
- `account.contrib.delete` rendered at `features/account/contributions-panel.html:106`
- `admin.media.delete` rendered at `features/admin/media-panel.html:138`
- No spec pins the string `'Kusta'`.

**Why it is wrong, not merely inconsistent.** `Kusta` is the imperative of `kustama`
(to extinguish a fire) — an ET delete button reading "extinguish". Every sibling delete
control in the same catalog says `Kustuta`: `map.clear` (et.ts:208), `account.delete.button`
(et.ts:521), `account.contrib.deleteConfirm` (et.ts:551), `admin.shelters.delete` (et.ts:694),
`admin.guidance.delete` (et.ts:843), and the direct sibling
`admin.media.delete.confirmButton` = `Kustuta siiski` (et.ts:988) — the confirm button of the
very dialog the `Kusta` button opens. EN (`Delete`) and RU (`Удалить`) are correct; only ET
is wrong.

**Proposed fix.** et.ts only, two values → `Kustuta`. **Blast radius:** zero (no spec, no
doc, no other locale references the string). **Risk:** none — cosmetic-word fix, and it
removes a visible contradiction inside one dialog (Kusta → Kustuta siiski).

---

### F2 — Nine dead `account.contrib.*` form keys orphaned by M5 — **STALE-LOW**

**Superseded decision.** Commit `28f1b4d` ("feat(shelter): editing uses the creation form"):
the account area's reduced inline edit form was deleted; the current template documents it —
`contributions-panel.html:89-92`: "M5: Edit opens the SHARED /submit form in edit mode …
The account area no longer hosts a reduced inline edit form." The form's field keys were
never removed.

**Artefacts** (en.ts / et.ts / ru.ts / messages.ts lines; EN values):

| Key | en.ts | et.ts | ru.ts | messages.ts |
| --- | --- | --- | --- | --- |
| `account.contrib.nameLabel` | 552 | 553 | 569 | 662 |
| `account.contrib.nameRequired` | 553 | 554 | 570 | 663 |
| `account.contrib.descriptionLabel` | 554 | 555 | 571 | 664 |
| `account.contrib.descriptionTooLong` | 555 | 556 | 572 | 665 |
| `account.contrib.latitudeLabel` | 556 | 557 | 573 | 666 |
| `account.contrib.latitudeError` | 557 | 558 | 574 | 667 |
| `account.contrib.longitudeLabel` | 558 | 559 | 575 | 668 |
| `account.contrib.longitudeError` | 559 | 560 | 576 | 669 |
| `account.contrib.estoniaNote` | 560 | 561 | 577 | 670 |

The same fields are now served by the live `submit.*` keys in the shared /submit form.

**Counter-check.** Exhaustive quoted-string scan: **zero** template/TS/site-texts references;
not pinned by any spec; not mentioned in `openspec/` or `qa/`. The only consumers are the
programmatic parity guards (`i18n.spec.ts`, `catalog-identity.spec.ts`), which iterate
`Object.entries` — that is a definition, not a binding.

**Proposed fix.** Delete from `messages.ts` + all three catalogs (4 files, 36 lines).
**Blast radius:** mechanical; the parity/identity guards re-run on the smaller set.
**Risk:** none — no render path, no test assertion.

---

### F3 — `map.legend.new` orphaned by the legend redesign — **STALE-LOW**

**Superseded decision.** Commit `804101d` removed the NEW item from the legend
(diff: `-{{ 'map.legend.new' | t }}` with its `shelter-marker--new` swatch); the current
template comment carries the owner decision — `map-page.html:20-24`: "The NEW tone is
deliberately NOT a legend entry (owner decision): the verification shapes carry the
community-row story on the map, and the row badge text still says 'Newly added'."

**Artefacts.**
- `en.ts:186` `'New by community'`, `et.ts:189` `'Uus kogukonnalt'`, `ru.ts:201` `'Новое от сообщества'`, `messages.ts:198`

**Counter-check.** Zero template/TS/site-texts references; no spec pin. The NEW *tone* is
still live (marker class `shelter-marker--new` in `leaflet-service.ts:80`, badge text via
`shelter.newlyAddedUnverified` / `account.contrib.badge.new`) — only the legend label key is
dead.

**Proposed fix.** Delete the key from `messages.ts` + 3 catalogs. **Blast radius:** zero.
**Risk:** none. (Alternative: keep it as "requested vocabulary" — no doc claims that, so
delete is the honest read.)

---

### F4 — `how.exampleTitle` + `how.example.1…5` — dead since day one, documented as such — **STALE-LOW**

**Superseded decision.** The map-page "How OpenShelter works" block was authored as prose,
never as the five-step example list; the template comment documents it since the first
commit (`1c4cfd1`, still current at `map-page.html:355-362`): "a five-step example list
would restate what the sources/report paragraphs already say (**the how.example\* keys stay
in the catalogs, unused**)."

**Artefacts** (en.ts / et.ts / ru.ts / messages.ts):

| Key | en.ts | et.ts | ru.ts | messages.ts |
| --- | --- | --- | --- | --- |
| `how.exampleTitle` | 93 | 96 | 107 | 106 |
| `how.example.1` | 94 | 97 | 108 | 107 |
| `how.example.2` | 95 | 98 | 109 | 108 |
| `how.example.3` | 97 | 100 | 111 | 109 |
| `how.example.4` | 98 | 101 | 112 | 110 |
| `how.example.5` | 99 | 102 | 113 | 111 |

**Counter-check.** Zero template/TS/site-texts references; no spec pin; the only non-catalog
mentions are the template comment itself and `docs/i18n-review.md:591-592` — audit items 12/13
corrected the ET value of `how.example.1` (and quote-alignment in `how.example.2`) **after
the key had never been rendered**: fix effort was spent on dead copy. Note also that the
values are doubly stale: `how.example.2` quotes the legend label "New by community"/
"Uus kogukonnalt" for a legend item that no longer renders (see F3).

**Proposed fix.** Delete the six keys from `messages.ts` + 3 catalogs and drop the "keys
stay" clause from the template comment. **Blast radius:** zero. **Risk:** none — but the
template comment records an explicit "they stay" decision, so this is a propose-and-wait
item if the owner wants the keys kept as editorial vocabulary.

---

### F5 — `consent.aria` — dead since day one — **STALE-LOW**

**Superseded decision.** The consent dialog was built with `aria-labelledby="consent-title"`
pointing at the visible title from its first commit (`1c4cfd1`,
`consent-banner.component.html`); the separate aria-label key it was evidently intended for
was never wired.

**Artefacts.**
- `en.ts:73` `'Cookie and storage notice'`, `et.ts:75`, `ru.ts:87`, `messages.ts:93`

**Counter-check.** Zero references anywhere (template uses the `aria-labelledby` id); no spec
pin. Footnote: i18n-review audit item 17 (`75d4cc0`) "fixed" the RU value of this dead key
(`cookie`→`файлами cookie` alignment) — again, work on a key that renders nowhere.

**Proposed fix.** Delete from `messages.ts` + 3 catalogs. **Blast radius:** zero. **Risk:** none.

---

### F6 — `admin.guidance.empty` orphaned by the locale-scoped list — **STALE-LOW**

**Superseded decision.** Commit `6dd9468` ("admin guidance follows the active language,
with a locale-scoped reorder"): the empty state became locale-scoped — the diff replaces
`{{ 'admin.guidance.empty' | t }}` with
`{{ 'admin.guidance.emptyLocale' | t: { locale: uiLocale() } }}`
(`guidance-order-list.html:18` today) and adds `admin.guidance.emptyLocale`; the old key was
kept.

**Artefacts.**
- `en.ts:797` `'No guidance posts yet.'`, `et.ts:802`, `ru.ts:824`, `messages.ts:1003`

**Counter-check.** Zero template/TS/site-texts references (the live sibling is
`admin.guidance.emptyLocale`); no spec pin.

**Proposed fix.** Delete from `messages.ts` + 3 catalogs. **Blast radius:** zero. **Risk:** none.

---

### F7 — `admin.guidance.editor.hero.current` — dead since day one — **STALE-LOW**

**Superseded decision.** The guidance editor (blog wave C, `18038ae`) shipped a hero section
that renders the current image as thumbnail + filename with **no "current image" label**
(`guidance-editor.html:140-160`, the `guidance-editor__hero-current` block); the key for
that label was never used.

**Artefacts.**
- `en.ts:876` `'Current image'`, `et.ts:880`, `ru.ts:924`, `messages.ts:1123`

**Counter-check.** Zero references in any template/TS in the entire git history; no spec pin.

**Proposed fix.** Delete from `messages.ts` + 3 catalogs. **Blast radius:** zero. **Risk:** none.

---

### F8 — Hardcoded English machine-value labels in the localized admin area — **STALE-HIGH**

**Superseded decision.** `4a68f4a` ("every user-visible string is translated, guarded and
reactive") and `4c808bf` ("feat(i18n): the admin area speaks Estonian and Russian too")
declared the admin area fully localized. The machine-value label maps were not catalogized
and were not touched by `4c808bf`; no spec or doc declares them an English-only exception.
They escape the i18n template guard because the guard only scans `.html` — TS label maps are
a known blind spot of the guard, and this is where the class hides.

**Artefacts** — `frontend/src/app/shared/admin-copy.ts`:
- `:20-26` `SHELTER_REPORT_TYPE_LABEL` — "Does not exist", "Reported closed", "Confirmed open", "Wrong location", "Other"
- `:30-50` `AUDIT_ACTION_LABEL` — "Status change", "Report dismissed", "User suspended", "Marked inaccurate", "Guidance published", "Media asset deleted", … (18 values)
- `:54-58` `SHELTER_HISTORY_ACTION_LABEL` — "Created", "Edited", "Deleted"
- `:62-66` `ALERT_KIND_LABEL` — "Daily submission cap", "OTP contact cap", "Near-duplicate submission"
- `:74` `reporterText` — `'Unknown'` fallback for the reporter name

**Rendered live at** (all in the admin UI, which speaks ET/RU per the decision):
- `features/admin/reports-panel.ts:90` (report type column) and `reports-panel.html:73` (reporter)
- `features/admin/audit-panel.ts:57` → `audit-panel.html:56` (`{{ auditActionLabel(row.action) }}`)
- `features/admin/shelters-panel.ts:163` (history actions)
- `features/admin/alerts-panel.ts:38` (alert kind)

**Counter-check.** LIVE — not dead copy. The English strings are pinned by
`admin-page.spec.ts:1043, 1068, 1091, 1395, 1540, 3127, 3128` (`toContain('Does not exist')`,
`'Report dismissed.'`, `'Marked inaccurate'`, `'User suspended'`, `'Guidance published'`,
`'Media asset deleted'`). A moderator on ET/RU sees an otherwise-Estonian audit/alert/report
table with English action labels — the visible contradiction of the admin-localization
decision.

**Proposed fix.** Introduce catalog keys (e.g. `admin.reportType.*`, `admin.audit.action.*`,
`admin.history.action.*`, `admin.alerts.kind.*`, `admin.unknownReporter`), keep the maps as
`value → MessageKey`, resolve through `t()`; update the six spec assertions to the ET/EN
fixture values. **Blast radius:** `admin-copy.ts` + the four panel TS + the specs + catalogs;
no template changes. **Risk:** low; **ET/RU values require the native speaker** →
propose-and-wait lane. Cross-reference: server-resolved audit *subject* texts
("Guidance post \"…\" (slug)", "Media asset \"…\" (stored)", "Deleted shelter") are the same
class on the backend side — flagged to SD-3 (served contract).

---

### F9 — `title: 'Selected location'` hardcoded on the map pick marker — **STALE-MED**

**Superseded decision.** `4a68f4a` ("every user-visible string is translated"): the marker's
native browser tooltip is user-visible copy, created in JS (a DOM node the template guard
cannot see) and never catalogized.

**Artefact.**
- `frontend/src/app/shared/leaflet-service.ts:278` — `title: 'Selected location'` on the
  draggable pick marker (`setPick`, used by the /submit location flow)

**Counter-check.** LIVE: the tooltip renders in every locale on hover/drag. No catalog key
covers it (`submit.location.set` = "Set location"/"Määra asukoht" is the *button* label — a
different concept — and `submit.locationLabel` is the field legend). Not a dead key; a
localization gap with no render-time locale.

**Proposed fix.** Add a key (e.g. `submit.location.selected`: EN "Selected location", ET
"Valitud asukoht", RU "Выбранное местоположение"), thread the localized title through
`LeafletService.setPick`. **Blast radius:** one key × 3 catalogs, `leaflet-service.ts`,
`submit-shelter-page.ts` call site, one spec. **Risk:** low; ET/RU values need the native
speaker.

---

### F10 — Dead CSS rule `.field-label` — **STALE-LOW**

**Superseded decision.** The contributions panel's form markup moved to the `.field` wrapper
+ bare `<label>` pattern; the `field-label` class left the template in `e7fe7c6` while its
rule stayed in the stylesheet (last touched by the review campaign `8da4b5d`).

**Artefact.**
- `frontend/src/app/features/account/contributions-panel.scss:201-206` — the whole rule
  (`display: block; font-size: var(--text-md); font-weight: …; margin-bottom: var(--space-4);`)

**Counter-check.** Exhaustive class scan (365 defined classes × full HTML+TS corpus): zero
references in any template or TS; defined in exactly one file; historical template usage
ended at `d8a44a2` (last commit containing `field-label` in a template).

**Proposed fix.** Delete the rule. **Blast radius:** one SCSS file. **Risk:** none — no
element carries the class, so nothing can be re-styled or de-styled.

---

## Mandated open item — `admin.reports.dismiss` = `Arvelda` (reported, NOT changed)

**Artefact.** `frontend/src/app/core/i18n/et.ts:732` — `'admin.reports.dismiss': 'Arvelda'`,
live at `reports-panel.html:104` (the per-row dismiss button). Family in the catalog:
`admin.reports.dismissed` = `Arveldatud` (et.ts:727),
`admin.reports.success.dismissed` = `Teatedis arveldatud.` (et.ts:733).
EN (en.ts:727) "Dismiss"; RU (ru.ts:750) `Отклонить` ("reject").

**Analysis (auditor's, for the native speaker).**
- Domain context: dismissing a report is the moderator declaring it **not counted** — the
  sibling badge is `admin.reports.notCounted` = `Arvestamata` (et.ts:729), the plain-language
  relabelling decided in the i18n review because "dampened communicated nothing"
  (`docs/i18n-review.md:61`).
- `arvelda` ("to settle, to check out, to pay the bill") is *defensible* — it carries the
  "settle a claim" sense, and the three keys form a coherent `arvelda / arveldatud /
  arveldatud` family. But its primary associations (hotel checkout, settling a bill) are a
  stretch for a moderation action, and `Teatedis arveldatud.` reads "the report was
  checked out."
- The `arvestama` family ("to count / take into account") is the family of the sibling
  badge, but its imperative `Arvesta` is the *affirmative* ("count it!") — the wrong
  direction for "don't count this"; an imperative in that family would have to be
  `Arvestamata märgista` ("mark as not counted"), which is precise but long for a row button.
- The reject family must be avoided: `Lükka tagasi` / `Tagasi lükatud` is the
  unconfirmed-queue's rejection vocabulary (et.ts:659, 542) — overloading it for report
  dismissal would merge two different moderation outcomes.
- Note the cross-locale drift: RU chose the **reject** family (`Отклонить`/`Отклонено`)
  where EN/ET chose the **settle/dismiss** family — the two locales do not even agree on the
  semantic family, so whichever way ET goes, RU deserves a look for consistency.

**Recommendation (decision deferred to a native speaker, per the lane's constraint).**
Candidate set, in the order an auditor would present it: (1) keep `Arvelda` if a native
reader accepts `arveldatud teade` as idiomatic — it is family-consistent and already
shipped; (2) `Lahenda`/`Lahendatud` ("resolve") — the most idiomatic single verb for closing
a report, but shifts the concept from "not counted" to "resolved"; (3)
`Arvestamata märgista` — maximum consistency with the `Arvestamata` badge, longest button.
Flag for the owner's queue alongside the existing `admin.reports.dismiss` word-choice item
(`docs/autopilot/BACKLOG-PLAN.md:249`).

---

## False positives explicitly rejected

The counter-check's job is to drop these; each was investigated and cleared.

1. **The NEW marker tone itself** — `shelter-marker--new` / `--color-new` are live
   (`leaflet-service.ts:80`, unified yellow per `design-tokens.spec.ts:603`); only the
   *legend label* `map.legend.new` is dead (F3). The tone was not removed; only its legend
   entry was (owner decision, `map-page.html:20-24`).
2. **`.ql-snow`, `.ql-picker-options`** (`guidance-editor.scss:282-306`) — vendor DOM
   classes generated by Quill at runtime; the SCSS comment at :272-281 states `.ql-snow` is
   "load-bearing, not decoration". Live.
3. **`.leaflet-disabled`** (`accessibility-dialog.component.scss:227`) — a class Leaflet
   itself adds to disabled zoom-bar controls; defensive theming of vendor-emitted DOM. Live.
4. **`.map-cta__form`** — the only occurrence (`guidance-panel.scss:9`) is *inside a
   comment*; no rule exists. My class extractor's false positive (it scans comments).
5. **`error-copy.ts` English constants** (`shared/error-copy.ts:9-43`) — documented
   fallback layer; **all 44 live callers pass a translate callback** (verified by
   caller-by-caller grep), so no user ever receives the legacy English. Live as code,
   invisible to users. (Cross-lane note: server-provided 400/401/409 messages are echoed
   verbatim in several branches — backend copy, SD-3's territory.)
6. **`DECIMAL_COMMA_DETAIL`** and friends in `shared/location-input.ts:82` ("Estonian
   decimal-comma detected — …") — internal diagnostic `detail` metadata, never rendered;
   the user-facing copy is the catalog key `submit.loc.decimalComma`. Not user-visible.
7. **`Capacity:`** (`shelter-detail-page.html:187`) and **`placeholder="DELETE"`**
   (`account-page.html`) — allow-listed in the template guard with documented decisions
   (review 07 P1-4 gauge-splice note; the account lane's arming-word decision).
   Intentional, not stale. (The former is still a user-visible English splice in ET/RU — a
   known, documented exception, recorded here for completeness, not reported as stale.)
8. **`suled` in `legal.privacy.cookies.p2`** (et.ts, "kui suled vahekaardi") — a
   conjugated form of the *correct* verb `sulgeda`; the misspelled fix target was the
   standalone imperative `Sule` (a11y close button). Word-boundary scan confirms no
   standalone `Sule`/`sule` survives in any catalog, template or spec.
9. **`Tagasi lükatud`** (et.ts:542 `account.contrib.badge.rejected`, et.ts:717
   `admin.shelters.success.rejected`) — past participles "rejected", valid grammar; the
   superseded form was the *imperative* `Tagasi lükka`, and the live button key
   `admin.unconfirmed.reject` already reads `Lükka tagasi` (et.ts:659). Clean.
10. **`nimekik`** — all surviving occurrences are in `docs/i18n-review.md` (the
    pre-audit "Full listing" tables, which the doc explicitly labels pre-fix, and the
    audit's own Before→After table) and in this batch's brief/plan. The live ET catalog
    uses `nimekiri`/case forms in all five fixed keys. Clean.
11. **`Hõivendatud` / `Mõnitatud`** — documentation only (`docs/i18n-review.md:61,596`);
    the live key is `admin.reports.notCounted` = `Arvestamata` (et.ts:729). Clean.
12. **`убежище` in RU** — the vocabulary decision *evolved* rather than reverted: the
    `ru.ts` header (lines 16-19) records "shelter = укрытие, blast shelter = убежище", and
    the i18n-ru proposal confirms the same pair. All live occurrences (guidance content,
    the spec fixture `admin-page.spec.ts:261`) are in the blast-shelter sense. Not stale.
13. **SMART_ID keys** (`shelter.submitterVerification.smartId`, models union) —
    `remove-national-id` explicitly kept the level grantable: the AdminSeeder still
    pre-sets the SMART_ID claim (`AdminSeeder.java:102`) and `shelter-copy.ts:63` resolves
    the label. Live, by design.
14. **Spec-only key references** — `i18n.spec.ts`/`catalog-identity.spec.ts` reference
    keys programmatically (parity/identity guards over `Object.entries`); a spec fixture
    (`i18n-template-guard.spec.ts` mentioning `account.retry`) is a test template, not a
    production binding. Counted as non-live in the dead-key classification, with the three
    spec-touching dead candidates (`a11y.popup.title`, `footer.rescueBoard`,
    `footer.ministry`) re-verified as **live** anyway via `site-texts.ts` (the admin
    allow-list) — they do not enter the dead list.
15. **`panus`/`panused`, `sisseliikumist`, `Kriisijuhtimine`, `Cookied`, `kaoaiana`,
    `juhisepost`, `hülgatud hoone` (non-illative), `mitte keeluse`, `pikkus ja laius`,
    `eraomana`/`eraomanina`, `Konta kustutamine`, `Postid näevad`, `Tühjaks jättes`,
    `seansitunnus`, `ristsaidi jälgimist`, `privaalaru`/`erakoju`** — the wider
    i18n-review fix history, re-searched across catalogs+templates+specs+docs: every
    surviving hit is in `docs/i18n-review.md`'s own historical tables (pre-audit listings
    and Before→After columns) or the audit brief/plan. The live catalogs carry the fixed
    forms. Clean.
16. **`admin.shelters.readOnly`** ("read-only", en.ts:694) — the precedent class ("a hint
    that survived its own removal") was checked: live, and its behaviour exists — registry
    rows render the hint instead of actions (`shelters-panel.html:262`). Not stale.
17. **Numeric claims in copy** — all verified against live code: code TTL 15 min
    (`auth/…` `CODE_TTL = Duration.ofMinutes(15)` vs `authPage.reset.codeNote`), 6-digit
    codes (`Codes.java:27` vs `account.codePlaceholder` etc.), 2 h pulse window
    (`ShelterQueryService.OCCUPANCY_FRESHNESS_WINDOW = ofHours(2)` vs
    `detail.pulse.windowHint`), capacity 1–100 000 (`CreateShelterRequest:28`
    `@Min(1) @Max(100_000)` vs `submit.capacityHint`/`submit.capacity.invalid`),
    name ≤200 / description ≤2000 (`CreateShelterRequest:24,27` vs the two `tooLong`
    keys), 24-month retention horizons (active change `retention-pruning`'s
    `RETENTION_*_MONTHS=24` vs `legal.privacy.retention.p2.strong`/`strong2`).
18. **`account.contrib.source.paasteamet`/`.municipality`** — live
    (`contributions-panel.ts:108-111`, `shelter-copy.ts:143-146`). Not dead.

---

## Cross-lane notes (flagged, not owned here)

- **Stale "amber" wording in spec names and comments** after the pin-colour unification
  (the owner's example class, colour side — SD-1's lane): `leaflet-service.spec.ts:228`
  ("community marker tone: NEW amber, CONFIRMED green (D5)"), :242 ("…orange, not amber"),
  :301, :362; `map-page.spec.ts:105, 451, 1739, 1769`; `models.ts:23, 407`;
  `contributions-panel.ts:123`. The tests assert the live marker *classes*
  (`shelter-marker--new`/`--user`) — they pass while their *names* describe the retired
  colour family; the current treatment is the unified yellow
  (`design-tokens.spec.ts:603` pins `--color-new === --color-verified`).
  The `contributions-panel` "amber chip" (info-request badge) may be a *different*, still
  live warning tone — SD-1 should compute that before touching those names.
- **Server-resolved admin texts** (audit subject labels, "Deleted shelter", change-column
  machine values) are English by construction from the backend — the served-contract side
  of F8 (SD-3).
- **`frontend/src/index.html:7`** — static English meta description
  ("Find registered and community-reported bomb shelters in Estonia."); the documented
  pre-paint decision keeps `index.html` catalog-free (default locale is `en`), so this is
  the default-locale SEO copy, not a stale artefact — noted only for the record.
- **Content-corpus detritus:** `docs/content/guidance-markdown/en/my-new-post.md`
  (`<p>hello</p>`) and `this-is-my-first-post.md` (`l`) — dev-scratch posts with no ET/RU
  twin and no catalog involvement; low-priority content cleanup, not a finding.
- **Excluded per instruction:** `src/main/java/ee/sheltermap/ingestion/`
  (`RegistryCsvParser`) — another lane's active fix; not reported.

## Suggested merge-pass buckets (for SUMMARY.md)

- **Fix-now (behaviour-visible):** F1 (two ET values), F8 (needs native values — propose
  and wait on the words, code path is ready).
- **Doc/dead-artefact cleanup (no visible effect):** F2–F7, F10 (one file-set:
  `messages.ts` + `en.ts` + `et.ts` + `ru.ts` for F2–F7, `contributions-panel.scss` for
  F10) — batchable in a single commit; every entry counter-checked as unreferenced.
- **Propose-and-wait (native-language calls):** `admin.reports.dismiss` = `Arvelda`
  (mandated open item) plus the ET/RU values for F8/F9.
