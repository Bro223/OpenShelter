# SUMMARY — merged stale-decision register (SD-MERGE)

**Merged from.** `SD-1-colour-rendering.md` (ran at HEAD `7cfed66`, 09:42),
`SD-2-catalogs-copy.md` (same batch), `SD-3-docs-and-contract.md` (ran at HEAD `3f0cbe7`, 11:31).
**Verified against.** Working tree at `47d2ce8` (clean, committed), backend restarted by the
owner. Every surviving claim below was re-checked against the current tree (grep/sed at the
referenced lines, commit diffs for `2a3fe47`, `60e7cb9`, `3f0cbe7`, `4208538`), plus two
read-only probes of the running backend (`GET /api/shelters?limit=1`, `GET /api/data-source`).
Nothing was fixed.

**Raw candidate count: 34 findings** (SD-1: F1–F6 · SD-2: F1–F10 + 1 mandated open item ·
SD-3: T1–T8 + D1–D8 + A1), plus **47 rejected false positives** carried in §4 as the standing
record against future sweeps.

**Headline:** the day's own work (`2a3fe47` + `60e7cb9` + `3f0cbe7` + `4208538`) resolved
**16 of the 34 candidates outright** — including both HIGH code findings (the reported-OR FE
wiring, the two `Kusta` buttons) — and resolved the served-contract drift via the restart.
**20 distinct defects survive** (15 doc-only, 5 propose-and-wait, **0 fix-now**), of which 4 are
user-visible. The cross-check also found **2 defects the day's work itself created** (N1, N2)
that no audit could have seen.

---

## 1. Dedupe map — how the 34 candidates merge

Same superseded decision reported from different lenses is one entry. Lenses: **C** = SD-1
colour/rendering, **Y** = SD-2 catalogs/copy, **D** = SD-3 docs/contract.

| Entry | Decision superseded | Lenses | Candidate(s) folded in |
|---|---|---|---|
| S1 | single-confirmation promotion → **three distinct confirmers** (`2a3fe47`) | D | T1 + T2(part) + D1(part) + D6(README:362 clause) |
| S2 | raw "5 NON_EXISTENT" auto-hide → **trust-weighted 5-point tally** | D | T3 + D1(part) + D6(README:364) |
| S3 | "reported" = `nonexistentReports` only → **OR with `inaccurateReports`** (W2-B) | C + D | F2 + T8(part) + D6(README:358/392) — code part **resolved** |
| S4 | closed/open "net" formula → **latest fresh tap wins, no OPEN badge** | D | T8(part) + D1(07-STEPS:371) + D6(README:152) |
| S5 | "CTA is the ONLY geolocation trigger" → **three user-initiated triggers** | D | T4 + D7 — split S5a (spec, doc) / S5b (legal copy, propose) |
| S6 | "Proposed" badge wording → **"Newly added"** (owner revert) | D | T5 — fix staged in `shelter-meta-truth` delta |
| S7 | `nationalIdCode` claims after `remove-national-id` (V12) | D | T6 |
| S8 | inline account-area edit → **`/submit?edit=<id>` shared form** (M5) | D + Y | T7 + F2(dead form keys — **keys resolved** by `60e7cb9`) |
| S9 | 4-entry amber legend → **5-entry filter legend** (wave 7, `4208538`) | C + Y + D | D8 + F6(legend) + F3(dead `map.legend.new` — **key resolved**) |
| S10 | "two tabs" → **nine admin tabs** | D | D2 |
| S11 | deferred paging / EN+ET pin → **paging shipped, trilingual shipped** | D | D3 |
| S12 | "twelve-attack list, fake reviews" → **A1–A13, "fake reports"** | D | D4 |
| S13 | exact-header failure → **quote-aware header** (`7b7ff32`) | D | D5 |
| S14 | admin fully localized → **English machine-value labels live in ET/RU admin** | Y + D | F8 + §2.3 server-label note |
| S15 | every visible string translated → **"Selected location" tooltip hardcoded** | Y | F9 |
| S16 | (open item) report-dismiss wording `Arvelda` | Y | mandated open item |
| S17 | NEW-amber treatment → **unified yellow, ring, then depth-not-recency** (wording residue) | C + Y + D | F5.1 + F6(amber) + SD-2 cross-lane spec-name note + A1 + D6(README:362 amber) — most sub-items **resolved** |
| N1 | (none — **new**, created by `60e7cb9`) → `--color-new` token orphaned | merge-pass only | — |
| N2 | (none — **new**, created by `3f0cbe7` vs `60e7cb9` same day) | merge-pass only | — |

**19 entries + S5's split = 20 surviving distinct defects.**

---

## 2. Resolved by the day's work — verified, do not re-fix

| Resolved | Fixed by | Verification at `47d2ce8` |
|---|---|---|
| SD-1 F2 — FE reported-OR (pin, badge gate, badge count, admin column, both FE DTOs); **includes the "which count does the badge show" owner call — decided: the open trust-report sum** | `60e7cb9` | `markerTone` ORs both (leaflet-service.ts), `hasReports` OR, `reportedBadgeText` = sum, `reportedCount(row)` = sum in shelters-panel; `inaccurateReports?: number` on both DTOs with the "absent reads as 0" idiom |
| SD-1 F1 — B&Y pre-paint `--color-verified` + lockstep test hardening (exactly the proposed fix) | `60e7cb9` | index.html:52 `--color-verified: #ffd400`; prepaint.spec.ts now asserts the FULL token set and per-key page↔module lockstep |
| SD-1 F3 — `badge--rejected` admin rule | `60e7cb9` | danger-pair rule present in `_admin-shared.scss` `.badge` block |
| SD-1 F4 — dead `--color-accent` (all 4 homes) | `60e7cb9` | 0 declarations, 0 `var()` refs; decision comment folded into `--color-shelter-pick` |
| SD-1 F5.1 — 4 of 6 amber comments (map-page.ts, shelter-detail-page.html, contributions-panel.scss, contributions-panel.ts) | `60e7cb9` | grep: 0 "amber" in map-page.ts, contributions-panel.ts, leaflet-service.spec.ts |
| SD-1 F5.2 — retired `#ff8a80` "unchanged token" comment in design-tokens.spec.ts | `60e7cb9` | comment now narrates the teal pin correctly |
| SD-1 F5.3 — fresh-CLOSED "red-orange" prose | `60e7cb9` | shelter-copy.ts + map-page.html now say "amber — the warning-tone pair" |
| SD-1 F6 (parts) — qa checklist quote drift, `02-CONTEXT-DOMAIN` amber, CRQ proposal + map-browse delta amber, dead `map.legend.new` key | `3f0cbe7` / `60e7cb9` | checklist says "in every theme"; delta carries the "(Superseded by…)" annotation incl. the spec-pinned absence of `.shelter-marker--new`; key gone from all 4 catalogs |
| SD-2 F1 — both `Kusta` survivors (`account.contrib.delete`, `admin.media.delete`) | `60e7cb9` | both now `Kustuta` (et.ts:544, :967) |
| SD-2 F2–F7 — **26 dead keys** (9 account.contrib form, 6 how.example, consent.aria, admin.guidance.empty, admin.guidance.editor.hero.current, map.legend.new) | `60e7cb9` | all absent from messages.ts + 3 catalogs; the "keys stay" template comment clause removed too |
| SD-2 F10 — dead `.field-label` rule | `60e7cb9` | rule gone from contributions-panel.scss |
| SD-2 cross-lane — stale amber spec names (leaflet-service.spec.ts ×4, map-page.spec.ts ×4) | `60e7cb9` / `4208538` | remaining "amber" hits are the *warning-tone* badge (live by design, per SD-3 A1) and "not the old amber/green tones" (narrates the retirement) |
| SD-3 §2.1 — served-vs-committed OpenAPI drift (stale 00:07 JVM) | backend **restart** (owner) | probe: `GET /api/shelters` rows now carry `inaccurateReports`; committed snapshot stayed faithful — `4208538` added `heroImageSrcset` to DTOs **and** to `docs/api/openapi.json` in the same commit |

**Still open operationally (not a fix lane, owner action):** the registry rows currently
served were imported **07:54:44Z** — before the `Lest97AxisOrder` fix (`2a3fe47`, 11:31).
Verified via `GET /api/data-source` (`lastImport 2026-09-22T07:54:44Z, OK, 302 records`):
**the import has not been re-run since the restart.** Re-run it so the 302 registry rows are
produced by the fixed transformation.

---

## 3. Surviving defects, in three groups (file sets chosen so no two lanes collide)

### 3.1 fix-now (behaviour-visible) — **empty**

No behaviour-visible code defect survives. Both HIGH code findings (SD-1 F2 reported-OR,
SD-2 F1 Kusta) and every rendering finding (F1–F5) were fixed by `60e7cb9` before this merge
ran; the served-contract masking condition cleared with the restart. The remaining
behaviour-visible items all require native-language or owner input, so they sit in
propose-and-wait by definition, not for lack of a fix. (The registry re-import is the one
user-visible action left — it is an owner command, not a lane, see §2.)

### 3.2 doc-only (prose, specs, diagrams, README) — 15 entries

Lane layout: each file has exactly one owner; where an entry's passages land in a file owned
by another entry's lane, the owner rewrites them in the same pass (noted as "shared").

**LANE DOCA — context-and-tasks agent docs + diagram.**
Files: `context-and-tasks/agent/01-TASK.md`, `context-and-tasks/agent/02-CONTEXT-DOMAIN.md`,
`context-and-tasks/agent/06-CONTEXT-API.md`, `context-and-tasks/agent/07-STEPS.md`,
`context-and-tasks/05-shelter-api.puml`.
- **S1** (single-confirmation → three distinct confirmers): 01-TASK:12,99; 02-CONTEXT-DOMAIN:25
(second sentence), :70; 06-CONTEXT-API:97-99,319-320; 05-shelter-api.puml:703-705; 07-STEPS:489-492.
- **S2** (raw-count auto-hide → weighted tally): 02-CONTEXT-DOMAIN:25 ("auto-hidden by the 5th
  `NON_EXISTENT` report"); 07-STEPS:368-371 ("4→5 NON_EXISTENT insert").
- **S4** (retired net formula): 07-STEPS:371 ("CLOSED vs OPEN_CONFIRMED net to a display-only
  flag… a tie counts as confirmed open").
- **S9** (legend wording): 07-STEPS:506-507 (4-entry legend list).
- **N2** (new drift, same file): 07-STEPS:501-504 — "community `NEW` rows render yellow (…
  `shelter-marker--new` class)" — the class was deleted by `60e7cb9` and NEW is no longer a
  marker tone at all (spec-pinned absence); `3f0cbe7` updated the colour but pointed at the
  removed class. `02-verification-flow.puml` needs no change (SD-3 §3.12 refuted that candidate).
Mirror source: `ShelterReportService` javadoc (accurate, per SD-3).

**LANE DOCB — openspec main specs.** One file per entry, no internal collisions:
- **S1:** `specs/community-self-moderation/spec.md` :130-142 — "SHALL remain exactly as
  shipped: one `OPEN_CONFIRMED` report…" + the single-report scenario. The worst shape in the
  set: the spec *forbids* the live behaviour.
- **S2:** `specs/shelter-reports/spec.md` :36-60 — "reaches exactly 5", "5th distinct user".
- **S3 + S4:** `specs/map-browse/spec.md` :380-402 — reported state missing the OR; amber
  "Reported closed" **or green "Confirmed open"**; scenario on the removed `REPORTED_CLOSED`
  flag (block is `openStatus.state`; fresh OPEN renders no badge).
- **S5a:** `specs/legal-recovery/spec.md` :175-196 — "CTA SHALL remain the ONLY geolocation
  trigger" + scenario (three live triggers: map CTA, detail "Distance from you", /submit
  "Use my location"; no IP geolocation still absent — the anti-enumeration clause still holds).
- **S6:** `specs/entry-verification-meta/spec.md` :63,73,77 — "Proposed {age} — not yet
  verified" ×3; the "Newly added" restatement is **already staged** in
  `openspec/changes/shelter-meta-truth/specs/entry-verification-meta/spec.md` — batch with
  that change's archive. (Verified the other two `shelter-meta-truth` deltas do NOT stage
  S1/S3 — they cover the damped flag and address search.)
- **S7:** `specs/account-profile/spec.md` :6,:16,:26 — three `nationalIdCode`/`national ID`
  claims vs the spec's own :73,:108 "no national ID" lines; `MeResponse` schema verified
  field-for-field.
- **S8:** `specs/user-contributions/spec.md` :96-111 — inline-edit requirement + scenario →
  restate as the `/submit?edit=<id>` flow.
- **S10:** `specs/admin-moderation/spec.md` :115,:125 — "two tabs" vs the nine `AdminTab` values.
- **S11:** `specs/app-polish/spec.md` :134-142 (paging/nearest-bbox listed as deferred — shipped
  since `187e697`/`5473b1c`), :253-273 (EN/ET pin vs trilingual `LOCALES`; self-contradiction at
  :138; formally updates when the active `i18n-ru` change archives — batch there).
- **S12:** `specs/security-posture/spec.md` :10-12 — "twelve-attack list… fake reviews" vs
  threat-model A1–A13 ("fake reports"; A13 SSRR hero-import). One sentence.
- **S13:** `specs/official-dataset-csv/spec.md` :19, :39-41 — header failure condition is not
  quote-aware; the live registry serves the quoted header on every weekly import, so the
  scenario as written cannot fire against reality.

**LANE DOC-C — active `community-review-queue` change.**
Files: `openspec/changes/community-review-queue/design.md`, `proposal.md`,
`specs/shelter-submission/spec.md` (the `map-browse` delta is already annotated — don't touch).
- **S1:** shelter-submission delta :5-31 (single-report promotion + scenario); design.md D2
  :15-21 (same, "inside the report-write transaction").
- **S9:** design.md D5 :42-50 (4-entry legend + "amber token"); proposal.md :41-44 (4-entry
  legend; colour was updated to yellow by `3f0cbe7`, entry list was not). Live legend to
  restate against: five pin-tone **filter** entries + hint (`map-page.html:17-100`, `en.ts`
  legend keys).
- **S17 (CRQ amber lines):** shelter-submission delta :20,:29; design.md D3 :26-31, D5
  "amber (NEW)… amber family" — same pass.

**LANE DOC-D — README.** File: `README.md` (one owner for all four passages):
- **S1:** :362 — "until a verification clears it (the admin CONFIRM or a community
  OPEN_CONFIRMED report from a non-submitter)" (single-confirmation phrasing).
- **S2:** :364 — "The 5th NON_EXISTENT auto-hides an ACTIVE shelter" (raw count; the Features
  bullets at :11/:51 are accurate — leave them).
- **S3:** :358, :392 — DTO field lists omit `inaccurateReports` (grep: 0 occurrences in README).
- **S4:** :152 — "net to a display flag (\"Reported closed\" / \"Confirmed open\") that never hides".
- **S17:** :362 — "the **amber** 'pending verification' treatment" (unified yellow). (The
  "provenance UNDER_REVIEW" in the same cell is **correct** — verified, do not touch.)

**LANE DOC-E — FE amber-wording comments.** Files: `frontend/src/app/core/models.ts`,
`frontend/src/styles.scss`, `frontend/src/app/features/shelter/shelter-detail-page.spec.ts`.
- **S17 (verified residue):** models.ts:23 ("amber 'just added' treatment"), models.ts:422
  ("(amber/green marker + …)"), styles.scss:700-701 ("new = the amber trust tint"),
  shelter-detail-page.spec.ts:154 ("backfill NEW (amber)"). Comments/prose only; the
  `contributions-panel` "amber chip" is the still-live **warning** tone — do not touch (SD-3 A1
  "not stale" list). Note: `60e7cb9` already corrected the same wording in four sibling files;
  these are the remainder.

### 3.3 propose-and-wait — 5 entries

- **P-1 (S5b) — legal privacy copy, three locale files.** `frontend/src/app/core/i18n/{en,et,ru}.ts`:
  `legal.privacy.location.p1.after` enumerates the "Show shelters around you" button and the
  submit form's "Use my location" but omits the detail page's "Distance from you" trigger
  (user-visible legal under-enumeration — the HIGH class per SD-3's severity definitions);
  `legal.privacy.cookies.li2.after` = "(Estonian or English)" vs the trilingual switcher.
  Wait: exact legal sentence + native ET/RU twins. (`map.geoNote` stays — borderline-acceptable
  map-local note, SD-3 §3.14.)
- **P-2 (S14) — English machine-value labels in the localized admin.**
  `frontend/src/app/shared/admin-copy.ts` (4 label maps + `Unknown` fallback, :20-74), the four
  panel TS callers, `admin-page.spec.ts` fixtures, catalogs (new `admin.*` keys). User-visible
  in ET/RU admin. Code path is fully specified by SD-2 F8 (maps → `value → MessageKey`,
  resolved through `t()`); only the ET/RU words need the native speaker. Server-resolved audit
  subject texts (`"Deleted shelter"` etc., `AdminModerationService`) are the same class on the
  backend — decide together whether an i18n seam is wanted (SD-3 §2.3 note).
- **P-3 (S15) — `title: 'Selected location'` on the /submit pick marker.**
  `frontend/src/app/shared/leaflet-service.ts:287` (+ `setShelter`-side call site
  `submit-shelter-page.ts`, one new key ×3 catalogs, one spec). Visible in every locale.
- **P-4 (S16) — `admin.reports.dismiss` = `Arvelda`.** `frontend/src/app/core/i18n/et.ts:717`
  (live at reports-panel.html:104). SD-2's candidate set stands: keep / `Lahenda` /
  `Arvestamata märgista`; RU's reject-family (`Отклонить`) drift deserves a consistency look
  whichever way ET goes. Owner/native-speaker queue per `BACKLOG-PLAN.md:249`.
- **P-5 (N1, new) — orphaned `--color-new` token.** `60e7cb9` deleted the ring, which was the
  token's only `var(--color-new)` consumer; the token now has **zero** live consumers (verified:
  declarations only — styles.scss:101,371 + theme-tokens.ts:116 + index.html:51 — plus spec
  tests and comments). The `design-tokens.spec.ts` name-set/family-equality tests (:606-634)
  still require it in every theme block, so it cannot be dropped silently. Owner call: keep it
  as the yellow-family anchor (the unification decision is still live for `--color-badge-new`
  siblings) or remove token + its test legs together. Files: `styles.scss`, `theme-tokens.ts`,
  `index.html`, `design-tokens.spec.ts`. Zero visual impact either way.
  **Collision note:** `styles.scss` is also owned by LANE DOC-E (S17 comment at :700-701) —
  same file, two entries → sequence under one owner (DOC-E comment first, P-5 token only after
  the owner call). No other cross-group file overlap exists.

---

## 4. Counter-check verdicts — all 47 rejected candidates (kept as the record)

A candidate a lane rejected as **not-stale** stays listed with its one-line reason; this is the
main defence against a future sweep re-raising a false positive. Where the day's work changed
the rationale, that is noted.

**SD-1 (12):**
1. Retired hexes (`#f59f00`, `#ffd43b`, `#ffb84d`, `#d4a017`, `#c92a2a`, `#ff8787`, `#6b7280`, `#9aa5b1`, `#d32f2f`, `#ff8a80`, `#168c8c`; `#ffe066` is the intentional B&Y link token) — absent from shipped code; the old five-provenance table survives only in the **archived** design doc (a historical record, not a live artefact).
2. Legend's missing NEW swatch — owner decision documented in three places; verdict still holds and is now stronger: NEW is no longer a marker tone at all, and the spec pins the absence of a `.shelter-marker--new` rule.
3. Map-row badges' 8% `color-mix` fills vs token fills elsewhere — documented page-local override, re-parsed and contrast-pinned per theme (`MIXED_PAIRS` + escape guard).
4. `badge--user` green pill on the admin users table for REGISTERED accounts — documented semantic reuse in the shared `.badge` vocabulary; rule is live.
5. `--bp-narrow` with zero `var()` refs — documented exception (`@media` cannot consume `var()`; the 900px literal is spec-enforced).
6. Two reds (`#b33a3a` danger vs `#c2410c` reported) — documented split: page-level error red vs the reported state's own red-orange family.
7. `ThemeStore.toggle()`/`.highContrast` "dead" — live spec consumers (`theme-store.spec.ts:83,171-207`); borderline API debt, below the evidence bar.
8. B&Y uniform-badge ruling — implemented, spec-pinned, present in the served bundle.
9. Navy as a data colour — brand ink only (wordmark/titles/chrome/gauge needle); no data encoding uses it.
10. Running backend not serving `inaccurateReports` — environmental (stale 00:07 JVM), not a code artefact. Rationale now moot: the restart cleared it (verified).
11. "Newly added X ago" line vs the ring — the text line is the NEW signal, not a second colour treatment. Verdict still valid after the ring's removal — the line now carries NEW *alone*.
12. Two oranges (`#bf360c` CTA vs `#c2410c` reported) — the single crisis affordance vs the state's own language; the unification deliberately left both untouched.

**SD-2 (18):**
1. The NEW marker tone itself — only the legend *label* was dead (now the tone itself is spec-pinned absent; either way not a defect).
2. `.ql-snow`, `.ql-picker-options` — vendor DOM generated by Quill at runtime; SCSS comment marks it load-bearing.
3. `.leaflet-disabled` — class Leaflet itself adds to disabled zoom controls; defensive theming of vendor-emitted DOM.
4. `.map-cta__form` — the only occurrence is inside a comment; extractor false positive.
5. `error-copy.ts` English constants — documented fallback layer; all 44 callers pass a translate callback, so no user receives the legacy English.
6. `DECIMAL_COMMA_DETAIL` etc. in `location-input.ts` — internal diagnostic `detail` metadata, never rendered; user-facing copy is the catalog key.
7. `Capacity:` (detail gauge) and `placeholder="DELETE"` — allow-listed in the template guard with documented decisions; `Capacity:` remains a known, documented EN splice, not a stale artefact.
8. `suled` in `legal.privacy.cookies.p2` — conjugated form of the *correct* verb `sulgeda`; the defect was the standalone imperative `Sule` (none survives).
9. `Tagasi lükatud` participles — valid past participles; the superseded form was the imperative, and the live button reads `Lükka tagasi`.
10. `nimekik` — surviving occurrences only in `docs/i18n-review.md`'s pre-fix historical tables.
11. `Hõivendatud`/`Mõnitatud` — documentation only; live key is `Arvestamata`.
12. `убежище` in RU — the vocabulary decision *evolved* (shelter = укрытие, blast shelter = убежище, recorded in the ru.ts header); all live uses are the blast-shelter sense.
13. SMART_ID keys — `remove-national-id` explicitly kept the level grantable (AdminSeeder pre-set + `shelter-copy.ts` label are live).
14. Spec-only key references — programmatic parity/identity guards over `Object.entries` are definitions, not bindings; the three spec-touching candidates were re-verified **live** via `site-texts.ts`.
15. Wider i18n-review fix-history terms (`panus`, `sisseliikumist`, `Kriisijuhtimine`, `Cookied`, `kaoaiana`, `juhisepost`, `hülgatud hoone`, `mitte keeluse`, `pikkus ja laius`, `eraomana`, `Konta kustutamine`, `Postid näevad`, `Tühjaks jättes`, `seansitunnus`, `ristsaidi jälgimist`, `privaalaru`/`erakoju`) — every surviving hit is in `docs/i18n-review.md`'s own historical tables; live catalogs carry the fixed forms.
16. `admin.shelters.readOnly` — live, and its behaviour exists (registry rows render the hint instead of actions).
17. Numeric claims in copy — all verified against live code: 15-min code TTL, 6-digit codes, 2 h pulse window, capacity 1–100 000, name ≤200 / description ≤2000, 24-month retention.
18. `account.contrib.source.paasteamet`/`.municipality` — live (`contributions-panel.ts`, `shelter-copy.ts`).

**SD-3 (17):**
1. README "10-100 / 20-100 page sizes" — zero hits; the uniform 1..200 bounds are documented correctly.
2. README "five baseline reporters, trusted reporters weigh more" (:11, :51) — accurate summary of the weighted tally; the stale version lives in the API-table cell and the spec (S2).
3. `06-CONTEXT-API.md:129` net formula — carries the explicit "(V9, D1 — retired)" annotation + pointer to the live `openStatus` block; marked history.
4. Warning-tone "amber" references (fresh-CLOSED badge, info-request chip, admin warning tokens, token comments, `design-tokens.spec.ts:373,612`) — the unification retired only the separate NEW-amber hue; the warning tone remains the amber/ochre pair by design.
5. `models.ts:396-401` "orange reported state" + the OR comments — current (updated by `60e7cb9`; they document the OR rule).
6. "The map page fetches no viewport/paging params" — still true at the FE level; server-side params are exercised by other consumers.
7. `shelter-provenance-taxonomy` main spec vs coloured markers — the main spec was rewritten ("SHALL NOT render provenance as its own chips, legend entries or marker colours") and the code honours it.
8. `remove-shelter-reviews` / rating-demotion residue — zero rating/star/review identifiers in any main spec or shipped FE source.
9. Geocode "1 req/s usage policy" (README:330) — matches `MIN_SPACING_MS = 1000` in `geocode-gateway.ts`.
10. Source-filter vocabulary — `REGISTRY/USER/ALL`, old per-source values 400; README, spec and code agree.
11. `MeResponse` README description — accurate (no nationalIdCode); the stale claim lives only in the main spec (S7).
12. `02-verification-flow.puml` "single-confirmation" candidate — refuted as filed: the file only says "community reports + confirmation govern quality" (:121,:125); no promotion-count claim.
13. README:362 "provenance UNDER_REVIEW" — `Provenance.UNDER_REVIEW` is a live derived value (USER + NEW); correct as written.
14. `map.geoNote` "used only to find the nearest shelter" — map-local note for that request's own purpose; borderline, not a finding.
15. Served guidance `heroImageId: none` — data state (no hero set on dev posts), not a contract gap.
16. `legal.privacy` retention months / `cookies.p2` "suled" — SD-2's items (see above), not re-reported.
17. Served-vs-committed OpenAPI drift **as a code defect** — process staleness, not a repo defect; committed snapshot matches code. Rationale now moot: the restart cleared the drift (verified).

---

## 5. Freshly created drift — the day's own work, cross-checked

The audits ran against a moving tree; two defects were created *after* all three audits ran
and are not reported in any of them:

- **N1 — `--color-new` is an orphaned token** (created by `60e7cb9`). The ring that consumed
  `var(--color-new)` was deleted in the same commit; the token now has zero live consumers but
  is still declared in all four homes and still pinned by the family-equality/name-set tests.
  → P-5 (owner call; §3.3).
- **N2 — `07-STEPS.md:501-504` points at the removed `shelter-marker--new` class** and still
  says community NEW rows "render" that tone on the pin (created by `3f0cbe7`, which updated
  the colour word but not the class reference, one commit after `60e7cb9` removed the class).
  → LANE DOCA, §3.2.

And two audit claims are themselves stale in a way that *shrinks* the work, not grows it:
SD-3's "the three-confirmer rule is documented nowhere" remains **true** at `47d2ce8` (no spec
or context doc states it — only `ShelterReportService` javadoc + ITs), so S1 is unchanged in
substance; and SD-1 F2's "masked today by the stale backend" condition is gone (verified the
restarted JVM serves `inaccurateReports`). The BACKLOG-PLAN W4-D wave record ("commission a
ring or…") is a historical wave record, not a current-state claim — left alone, same standard
as the archived design docs.

---

## 6. Sizing

- **Distinct defects surviving: 20** (15 doc-only + 5 propose-and-wait + 0 fix-now).
  Of the 20, 2 (N1, N2) were created by the day's own work.
- **User-visible survivors: 4** — P-2 (English machine labels in the ET/RU admin UI),
  P-3 ("Selected location" tooltip in every locale), P-1 (legal page under-enumerates
  geolocation triggers and says "Estonian or English"), and — outside the 20, operational —
  the 302 registry rows served from the pre-`Lest97AxisOrder` import (07:54:44Z, verified
  still not re-run). P-4 (`Arvelda`) is user-visible in ET admin but is a wording-quality open
  item, not a confirmed defect.
- **Resolved by the day's work: 16 candidates + the served-contract drift** (§2).
- **False positives on record: 47** (§4).

### Top pick — fix first

**Re-run the registry import** (owner, one command, outside all lanes): it is the only
surviving item with live user-visible impact — the public map is serving 302 registry rows
produced by the pre-axis-order-fix code, and I verified the import has not re-run since the
restart. No code risk, immediate effect, and it closes the one data-correctness hole the
audits left.

**First fix-lane pick: S1 / DOCA+DOCB+DOC-C** (the three-confirmer rule). Among the 20, it is
the only surviving document that *actively forbids live behaviour* — "SHALL remain exactly as
shipped: one `OPEN_CONFIRMED` report… promotes" is a time-bomb: any spec-driven agent or
human reading the main spec will regress `2a3fe47`, the day's most load-bearing trust change,
which is documented nowhere else but code + tests. Pure prose, zero code risk, and the accurate
source to mirror (`ShelterReportService` javadoc) already exists. S2 rides the same lanes at
near-zero marginal cost, so both trust rules get documented in one pass.

---

## 7. Could not verify

- **Coordinate correctness of the 302 served registry rows** — I can confirm the import
  predates the `Lest97AxisOrder` fix (timestamps), but validating the transformation itself
  needs the re-run + a coordinate audit; SD-3's in-bounds 2-row sample is not proof either way.
- **Admin served state** (SD-1 §0) — admin endpoints were 401 under the stale process at audit
  time and I did not attempt authenticated admin calls against the running server; the admin
  contract claims rest on the committed OpenAPI + code, which the audits verified line-for-line.
- **The three propose-and-wait wordings** (P-1 legal sentence, P-2/P-3 ET/RU values, P-4
  `Arvelda`) — correctness of the *words* is a native-speaker question by construction; I
  verified only that each artefact is still live at `47d2ce8`.
- **Served frontend bundle** — the FE dev server recompiles on change (SD-3 §2.3), so served
  state = source state; no independent bundle fetch was repeated in this pass (the audits'
  fetches under `fetches-sd1/` predate `60e7cb9`).
