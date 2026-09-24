# SIMPLIFY-SITETEXTS — site-texts simplification + the allowlist lockstep pin

**Lane:** SIMPLIFY-SITETEXTS (branch `code-review`, uncommitted — the parent commits)
**Scope:** `src/main/java/ee/sheltermap/sitetexts/**` (service + seams), `src/main/java/ee/sheltermap/api/{AdminSiteTextController, SiteTextController, SiteTextEntryDto, UpdateSiteTextRequest}.java`, `src/test/java/ee/sheltermap/sitetexts/SiteTextsServiceTest.java`, `frontend/src/app/features/admin/site-texts-panel.{ts,html,scss,spec.ts}`.
**Pinned by the brief:** the closed key allowlist (unknown keys refused), plain-text-only values, https-validated link URLs, blank-value refusal semantics, and the overlay's precedence over the catalog. All of those pins pass untouched (§3).

## 1. What was flattened and renamed

**Backend — `sitetexts/SiteTextsService.java`** (140 → 146 lines; `update` 78 → 22 lines):
- `update` no longer carries the six per-entry checks and the per-entry upsert logic inline. It now reads as: no-op guard → batch cap → one validate pass (dedupe by `key::locale`, last wins) → one apply pass. The "1) … 2) …" step comments are gone; the method names carry the steps.
- New `validate(SiteTextEntry)` (`:86`) — the six checks in their original order, with the original messages verbatim (the unit tests pin the message substrings).
- New `apply(SiteTextEntry)` (`:122`) — blank→delete vs upsert + URL resolution; the `String url = null; if (existing != null) …` two-statement resolution collapsed to one ternary.
- Class javadoc: 11 bullets → 6, every constraint kept (unknown key/locale, value cap, URL rules, blank semantics, last-wins).
- No public renames, no signature changes. Check order, message text, dedupe order (first-seen position, last value wins), delete-on-blank and upsert semantics preserved — proven by the 15 unit pins + 8 IT legs running untouched in the gate.
- `sitetexts/SiteTextKeys.java` — the `java.util.HashSet` fully-qualified name in the static block became a proper import (cosmetic, zero behaviour).
- Controllers/DTOs: read in full, left as is — already flat and small; the OpenAPI annotation volume is declarative (the same verdict other lanes gave `ApiErrorHandler`/`AdminGuidanceController`).

**Frontend — `features/admin/site-texts-panel.ts`** (238 → 269 lines):
- `load()` — the promise body is now three lines; the fetched-map→drafts mapping moved to a private `draftsFrom()` returning a small `Drafts` type (the two Record maps travelled together — a data clump).
- `save()` (75 → 40 lines) — three named steps: `requireHttpsLinkUrls()` (the client-side https mirror; sets the error status and returns false), `changedValueEntries(loaded)` and `changedUrlEntries(loaded)` (the two diff loops). The identity no-op `url: draftUrl === '' ? '' : draftUrl` became `url: draftUrl`.
- The PUT body is assembled in the same order as before (value entries in locale→key order, then URL entries on the `en` rows) — the diff behaviour is byte-identical; `site-texts-panel.spec.ts` passes unmodified.
- **`site-texts-panel.scss`** (127 → 122) — the two split `.site-texts-actions` rule blocks merged into one (declaration order preserved → identical CSS output); a stale "last translations block" clause (the panel was carved out of the translations tab) and the "This was the one space-12 holdout" history clause cut.
- **`site-texts-panel.html`** — unchanged (the header comment states constraints; the template is declarative).

## 2. The allowlist-coupling finding (brief rule 2)

**The claim holds.** `theAllowlistIsTheFrontendSet` pinned block *sizes* (10/9/12/31), `LINK_KEYS` exactly, `LOCALES` exactly and a dotted-shape regex — but never read `frontend/src/app/core/i18n/site-texts.ts`. A key renamed, or added-and-removed with sizes preserved, on either side sailed through. (Filed by TEST-QUALITY-MISC as a parent call; the parent brief ruled it — this lane closed it.)

**Red proofs** (throwaway scratch trees under `/tmp/simplify-sitetexts/`, single-class runs under the Maven lock):

| # | Tree | Result | Evidence |
|---|---|---|---|
| 1 | OLD pin + renamed backend key (`a11y.popup.title` → `a11y.popup.titles` in `POPUP_KEYS`, size 10 preserved, dotted shape valid) | **15/15 green, BUILD SUCCESS** — the drift is invisible to the old pin (weakness proven) | `mutant-old.log`, exit 0 |
| 2 | NEW pin + the same mutation | 14/15 — `theAllowlistIsTheFrontendSet` red, assertion diff names the drifted key | `mutantA.log`, exit 1 |
| 3 | NEW pin + frontend drift (`auth.newKey` added to `SITE_TEXT_HEADER_KEYS` only) | 14/15 — the same pin red | `mutantB.log`, exit 1 |
| 4 | NEW pin + in-lockstep tree | green in the full gate (§5) | `final-mvn.log` |

In runs 2–3 every other test in the class stayed green, which also proves the service flattening broke no other pin.

**The strengthened pin:** the test now reads `frontend/src/app/core/i18n/site-texts.ts` (repo root found by walking up to `pom.xml` — the `SourceVocabularyTest` idiom, so it also works from an IDE run) and asserts, block for block, name-equality (`containsExactlyInAnyOrderElementsOf`) for the popup/header/footer arrays and `SITE_TEXT_LINK_KEYS`, plus union-of-blocks = `SiteTextKeys.KEYS`. The extractor fails loudly when the frontend array shape changes (a guard that cannot find its array must not pass). All original assertions are retained — the change is purely additive, no assertion deleted or weakened.

**Cross-lane contract (also on the notes board):** the backend suite now reads a frontend file at test time. The catalog lane owns `core/i18n/site-texts.ts`; its allowlist arrays must keep the shape `NAME: readonly SiteTextKey[] = [ 'key', … ] as const;` with single-quoted literals, or the pin's extractor fails loudly (by design) and the pin must be updated in the same edit.

## 3. Evidence the pinned behaviours hold

- **Unit** — `SiteTextsServiceTest` 15/15 in the gate; the file changed only additively (the strengthened pin), every original assertion kept. Pinned behaviours: unknown-key 400 (`anUnknownKeyRefusesTheBatch`), unknown-locale, value cap + boundary, URL-on-non-link-key, non-https URL, URL-on-non-en-row, blank-URL clears / absent-URL keeps, blank-value deletes, last-wins dedupe, batch cap, locale-grouped read, empty-batch no-op.
- **API IT** — `SiteTextsApiIT` 8/8 in the gate (anonymous 401, non-admin 403, round-trip through the public read, blank reset, the three 400 legs) — full-stack, unmodified.
- **Frontend** — `site-texts-panel.spec.ts` unmodified, all 7 tests green in the full ng run (full-allowlist rendering, placeholder semantics, URL inputs, diff-only save, client-side https refusal, error surfacing, closed-set).
- **Overlay precedence** (I18nService applying the admin overlay over the catalog) lives in the core lane's files — untouched by this lane; its pins are green in the FE gate.

## 4. Anchors

No citation in `docs/agent/00-CURRENT-STATE.md` references any file in this scope — grep for `SiteText|site-texts|sitetexts|site_texts` returns zero hits (and SIMPLIFY-CATALOGS confirmed `site-texts.ts`/`messages.ts` are uncited). **No anchor shift is owed; nothing recorded.**

## 5. Gates (all detached, exit files read)

Baseline (pristine tree, before any edit of mine):
- Backend `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0, 1349/1349**, PMD clean.
- Frontend `npx ng test --watch=false` → **exit 0** (1562 tests / 65 files), `npx ng build` → **exit 0**.

Final (after all changes):

- Backend `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → **exit 0 — 1349/1349, 0 failures, BUILD SUCCESS**, PMD clean, `jacoco:check` "All coverage checks have been met". My classes in the run: `SiteTextsServiceTest` 15/15, `SiteTextsApiIT` 8/8. (22:13→22:17 EEST, serialized on the flock behind SIMPLIFY-INGESTION's own gate; their completed files were in the tree — no foreign failures.) — `/tmp/simplify-sitetexts/final-mvn.log|.exit`
- Frontend `npx ng test --watch=false` → **exit 0 — 1562 passed (1562), 65/65 files, 0 failures** (baseline exact); `npx ng build` → **exit 0** (only the pre-existing SCSS budget warnings in other lanes' files — none in `site-texts-panel.scss`). — `/tmp/simplify-sitetexts/final-ngtest.log`, `final-ngbuild.log`, `final-ng.exit`

## 6. Deliberately left, and why

- **The panel's `loadError`/retry path** — reachable only if `SiteTextsGateway.fetch` rejects; the gateway catches internally and resolves to null, so today it is a defensive seam, not a live path. Removing it would be a behaviour change reaching into the gateway file (another lane's). Filed, not changed.
- **`bundle-lazy-i18n` comment in `site-texts-panel.spec.ts`** — a planning-doc reference in a pinned spec; the parent has ruled pinned specs frozen (SIMPLIFY-CORE-FE's board entry). Left untouched, reported.
- **`nextLoadedFromDrafts` echo quirk** — the client echo stores the un-trimmed draft while the server stores the trimmed value; pre-existing, invisible (inputs show drafts, not loaded values), and behaviour-preserving scope forbids changing it.
- **No planning ids were found in this lane's main-source files** (the `(site_texts)` feature markers are house style carried by every feature class; they match no `SourceVocabularyTest` pattern — the gate's guard run confirms).

## 7. Unverified / coordination notes

- The brief mentioned "one lane just removed a no-op setup from a site-texts test". No such change exists in this tree: `git log` on both site-texts test files shows no recent commit touching them, no lane on the notes board recorded one, and the only no-op-setup removal on record is TEST-QUALITY-API's `ShelterApiIT.cleanShelterTable` (a shelter test). Nothing was duplicated; this lane's only test-file change is the strengthened pin the brief ordered.
- The final backend gate runs against the working tree, which includes SIMPLIFY-INGESTION's completed-but-uncommitted files (their lane was in its own gate when this one started; serialized on the flock). If any failure lands in an `ingestion/**` file it is foreign and named here.
