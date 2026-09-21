# Stale-decision audit — batch design

**Why this batch exists.** The two-yellow pin was not a bug in one place: it was a *decision* that got
superseded (one yellow family; red-orange reserved for "reported") while a second rendering path kept the old
treatment alive. Every lane in this repo has changed a decision mid-flight, so the same failure is expected
elsewhere. This batch hunts the *class*, not the instance.

**Hard constraint: these lanes are READ-ONLY.** They may read files, fetch the already-running servers, and
write one report each. They must not edit application code, docs, styles, catalogs, migrations or specs, and
must not run a build (the frontend dev server and backend are already up and serve the current state; a build
would write into `dist/` and `.angular/`, and three implementation lanes are active in this tree).

**Report location.** `reviews/stale-decisions/SD-N-<lens>.md`, one file per lane, plus
`reviews/stale-decisions/SUMMARY.md` for the merging pass.

**Evidence bar — this is the whole value of the batch.** For each candidate the lane must supply:

1. the **superseded decision**, cited to where it was made (an archived OpenSpec change, a review finding, a
   commit, an owner instruction, a spec section) — *not* "this looks old";
2. the **artefact that still carries it**, as `file:line`, or a URL with the fetched response excerpt;
3. the **proof it is stale**, meaning the lane also ran the counter-check: an exhaustive search for any live
   reference. A candidate with a live caller, a live template binding, a live catalog key, or a live CSS rule
   is **not stale** and must be dropped or downgraded to "intentional";
4. the proposed fix, its blast radius, and the risk of applying it.

A candidate that fails (3) is a **false positive** and must be reported as such. Four separate test guards in
this repo already pass while their target behaviour is gone; the same self-skepticism applies here.

**Severity.** `STALE-HIGH` = a user can see the contradiction (two treatments, wrong copy, an action that
silently does nothing) · `STALE-MED` = contradictory code/doc with no visible effect · `STALE-LOW` = cosmetic
or unused artefact. Anything that changes behaviour on a public surface is HIGH by default.

---

## SD-1 — colour, treatment and rendering paths

Lens: every visual decision that was changed while a second path kept the old value.

Check, at minimum:

- The pin unification just landed (amber + verified-yellow → one yellow, reported red-orange untouched).
  Verify it is genuinely one treatment in **every** path: the map marker tone (`shared/leaflet-service.ts`),
  the legend swatches, the list/badge chips (`shelter-copy.ts` and its consumers), the detail page, the admin
  shelters table, and **any hardcoded hex or duplicate variable** that bypasses the token. Report each path
  with its computed value.
- Every theme that redefines a treatment (`Default`, `High contrast`, black-and-yellow) — a theme that still
  defines the retired amber, or defines one family and not the other, is the same defect in a different skin.
  Check the **compiled** stylesheet served to the browser, not only the source, so a stale build is visible.
- Hardcoded colours outside the token file, and any token defined but never used (a decision that was
  removed).
- Superseded palette decisions from earlier in this project: gold for verified, teal for picked, navy as
  brand/chrome versus navy as a data colour, red reserved for "reported", badges as a tint versus a border.
  Report any survivor with where the decision now lives.
- Status/derived treatments: is "newly added", "under review", "reported", "verified" and "official/registry"
  still five visibly distinct states, and does each one have exactly one rendering?

Served-state check: fetch the built CSS and the page HTML from the running frontend, and the map/legend
markup, then state what a user actually receives.

## SD-2 — catalogs, copy and dead UI

Lens: copy and catalog entries that a decision left behind.

- **Dead keys**: every key in the EN catalog with no template/TS reference (the repo already has one removed
  precedent, `admin.subtitle`, and a "registry" hint that survived its own removal). For each, the
  counter-check is the live-reference search; report the ones that are genuinely unreferenced.
- **Contradicted keys**: a value that describes behaviour the code no longer has — the reference case is a
  hint that still explains a removed read-only source column.
- **Superseded wording**: earlier in this project these Estonian defects were fixed — `Sule`→`Sulge`,
  `nimekik`→`nimekiri`, `Hõivendatud`→`Arvestamata`, `Kusta`→`Kustuta`, `Tagasi lükka`→`Lükka tagasi`. Search
  the **whole** corpus (all catalogs and all three languages, plus templates, specs and docs) for any surviving
  old form, including inside longer strings. One known open item: `admin.reports.dismiss` = `Arvelda` (do NOT
  change anything — report it with a recommendation; a native speaker's word choice is not a lane's call).
- **Untranslated or duplicated**: keys identical across locales where they should differ, missing ET/RU where
  EN exists, and any place English copy is still hardcoded in a template or a TS constant.
- **Dead CSS**: class rules in the stylesheets with no template/TS reference — the same class of leftovers as
  dead catalog keys.
- Any user-visible string that names a removed feature, a removed tab, a removed endpoint or a removed source.

## SD-3 — documentation, specs and served contract versus reality

Lens: the failure the audits already caught once — docs asserting behaviour the code no longer has.

- For every OpenSpec change in `openspec/changes/archive/`, name the decisions it made and check whether the
  code still honours them; list the ones that were later reversed but whose spec text still reads as current.
- For every main spec in `openspec/specs/`, look for assertions about removed behaviour (an endpoint, a
  status code, a field, a consent/legal flow, a source vocabulary value). The repo already had one spec that
  was structured to be unfalsifiable — flag that shape too.
- Docs and reviews: the counts, ranges, endpoint inventories, env rows and security claims that earlier audits
  corrected. Check whether the correction was applied **everywhere** the number appears (the same value is
  usually duplicated in README, docs, QA and the whitepaper).
- **Served contract**: fetch the running backend's OpenAPI document and compare it against
  `docs/api/openapi.json` and the README's API section. Report any endpoint, parameter, header or status code
  that exists in one and not the other, in either direction.
- The website in its served state: fetch the public pages and the admin page, and for each documented feature
  (locale filter, alternates/fallback, the accessibility dialog's three themes, the editable texts, post
  ordering, hero images) state whether the served state still matches the documented intent, with the fetched
  excerpt.

---

## Merging pass (after SD-1..SD-3 close)

One lane produces `reviews/stale-decisions/SUMMARY.md`: dedupe across lenses, keep the counter-check result for
every candidate, drop false positives with a one-line reason, then order the survivors into
**fix-now (behaviour-visible) / doc-only / propose-and-wait (any native-language or policy call)**, mapping
each to a file set so the fixes can be batched later without two lanes touching one file.

Do not fix anything in this batch. The output is a decision-ready list, not a patch.
