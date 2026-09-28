# COPY-FIX — the `how.sources` triangle claim (ET + RU) and the approved proximity hedge (all three languages)

Lane: COPY-FIX (branch `feature/frontend`, no commits — the parent commits).
Read first: `reviews/polish/nearest-audit.md` (§3 claim #2, §4 residual 1, §5.2 the
proposed hedge), `reviews/code-review/design-review.md` §4 finding 1,
`reviews/polish/design-safe.md` §4 (the lane that verified the English
`how.sources` before being dismissed — **it was right**; see §1 below),
`docs/autopilot/CODE-REVIEW-RUN.md`. Skills: `clean-code` (readability standard for
the values themselves: plain sentences, no clever constructs), `accessibility`
(both strings render as unadorned `<p>` text — no role/label change is owed by a
copy-only edit; the rendered surfaces were re-verified in §3).

Owner authorisation: **both copy changes, "fix all around" — all three languages.**

Verified starting state (per the brief, re-verified in-tree): English
`how.sources` carries **0** triangle mentions (removed by `bf119ac`, the
design-safe §4 verdict confirmed); Estonian and Russian each still carried
**1** — in their `how.sources` value, the last two triangle mentions in the
whole catalog. This lane's diff removes both and applies the approved hedge to
`map.geoNote` in all three catalogs.

---

## 1. Task 1 — the `how.sources` triangle claim (ET + RU)

The removed marker was the yellow triangle. The current model (the one the
English already states and the decision record at `styles.scss:842-845,873-875`
records): default community marker (no depth) / yellow **circle** (one channel
verified) / green **circle** (two or more).

**English — already correct, NOT touched.** `core/i18n/en.ts:84-85` states the
current model exactly: "…Community locations are added by users: a partially
verified submitter shows a yellow circle, and a fully verified submitter a
green circle. A location with an open report shows a red marker…" — 0 triangle
hits, 0 "unverified" clause. The design-review finding 1 (2026-09-26) pre-dates
`bf119ac` (2026-09-28) and is stale for EN; design-safe §4 verified this and
was right. Nothing to do in EN for this task.

**Method for ET/RU — delete the first conjunct, keep the sentence's predicate.** Both drafts
carry a three-clause enumeration ("unverified → yellow triangle, partially
verified → yellow circle, fully verified → green circle") in each language's
own established construction. The fix deletes exactly the first conjunct (and
its comma); no new coinage is introduced for the native reviewer to triage.
In ET the clause shared the verb `on` with its two siblings, so the verb is
kept on the first surviving clause ("…osaliselt kinnitatud kasutajal **on**
kollane ring ja täielikult kinnitatud kasutajal roheline ring") — dropping it
would leave a predicate-less fragment; the RU dash construction (`у X — Y`) is
self-sufficient per conjunct, so the RU edit is a pure deletion. Every other
surviving word is verbatim from the pre-existing sentence, so the grammatical
risk of the remainder is no greater than the risk of the sentence that was
already in the tree. Key names and key order untouched.

### `how.sources` — before → after

**ET** (`core/i18n/et.ts:94`, one line, 419 → 379 chars):

- **Before:** `…Kogukonna asukohad lisavad kasutajad: ~~kinnitamata kasutajal on kollane kolmnurk,~~ osaliselt kinnitatud kasutajal kollane ring ja täielikult kinnitatud kasutajal roheline ring. Avatud teatega asukoht on märgitud punase märgisega. …`
- **After:** `Asukohad pärinevad kahest allikast. Ametlikud asukohad pärinevad Päästeameti avaandmetest ja neil on sinine märgis „Register". Kogukonna asukohad lisavad kasutajad: osaliselt kinnitatud kasutajal on kollane ring ja täielikult kinnitatud kasutajal roheline ring. Avatud teatega asukoht on märgitud punase märgisega. Kogukonna esitus ei muutu kunagi automaatselt ametlikuks.`

**RU** (`core/i18n/ru.ts:99`, one line, 467 → 412 chars):

- **Before:** `…Места, добавленные сообществом: ~~у неподтверждённого пользователя — жёлтый треугольник,~~ у частично подтверждённого — жёлтый круг, у полностью подтверждённого — зелёный круг. …`
- **After:** `Места берутся из двух источников. Официальные места — из открытых данных Спасательного департамента Эстонии (Päästeamet) — помечаются синим маркером «Реестр». Места, добавленные сообществом: у частично подтверждённого — жёлтый круг, у полностью подтверждённого — зелёный круг. Место с открытым сообщением помечается красным маркером. Добавление сообществом никогда не становится официальным автоматически.`

Both edited sentences now state exactly what the EN sentence states (partial →
yellow circle, full → green circle), key-for-key parallel with the EN. The
`// MACHINE DRAFT — awaiting native … review` comments already above both keys
remain accurate and untouched.

## 2. Task 2 — the `map.geoNote` proximity hedge (all three languages, approved)

`nearest-audit.md` §5.2: the only user-visible UI sentence with a bare
"nearest" superlative is the consent note under the CTA (claim #2). The owner
approved the hedge — replace "the nearest shelter" with "the shelters around
the position your browser shares" (the exact thing the app knows: the fix the
browser returned, whatever its provenance). The browser-attribution sentences
stay intact, the key names are unchanged, and the legal twin
`legal.privacy.location.p2` (whose "the nearest shelter is worked out inside
your browser" mechanism sentence the audit verified true) is **not touched** —
it is legal text and stays the owner's (or counsel's) call.

### `map.geoNote` — before → after

**EN** (`core/i18n/en.ts:188`) — the audit's proposed wording, verbatim
(English: house language, the sentence's grammar is mine to stand behind):

- **Before:** `Your browser asks first — your location is never sent to our servers and is used only to find the nearest shelter.`
- **After:** `Your browser asks first — your location is never sent to our servers and is used only to find the shelters around the position your browser shares.`

**ET** (`core/i18n/et.ts:194`) — **MACHINE DRAFT, awaiting native review**:

- **Before:** `Sinu brauser küsib esmalt luba. Asukohta ei saadeta kunagi meie serveritesse ja seda kasutatakse ainult lähima varjupaiga leidmiseks.`
- **After:** `Sinu brauser küsib esmalt luba. Asukohta ei saadeta kunagi meie serveritesse ja seda kasutatakse ainult selleks, et leida varjupaigad sinu brauseri poolt jagatud asukoha ümbruses.`
- Draft rationale: the first two sentences are the pre-existing value verbatim (browser attribution + "never sent" intact); only the purpose clause was re-hedged — "in order to find the shelters around the position shared by your browser" (`selleks, et leida varjupaigad sinu brauseri poolt jagatud asukoha ümbruses`: purpose clause + locative adverbial `X ümbruses` with the agentive `poolt` construction). Not confirmed by a native Estonian speaker.

**RU** (`core/i18n/ru.ts:200`) — **MACHINE DRAFT, awaiting native review**:

- **Before:** `Сначала браузер спросит разрешение. Местоположение никогда не отправляется на наши серверы и используется только для поиска ближайшего укрытия.`
- **After:** `Сначала браузер спросит разрешение. Местоположение никогда не отправляется на наши серверы и используется только для поиска укрытий рядом с точкой, которую передаёт ваш браузер.`
- Draft rationale: the first two sentences are the pre-existing value verbatim; only the purpose tail was re-hedged — "for finding the shelters around the point your browser shares" (`поиска укрытий рядом с точкой, которую передаёт ваш браузер`: genitive plural `укрытий` as used elsewhere in the catalog, e.g. `ru.ts:96`, relative clause `которую` agrees with `точку`). Not confirmed by a native Russian speaker.

## 3. Layout check (replacement strings change length)

- `map.geoNote` renders at `features/map/map-page.html:134` as
  `<p class="map-page__geo-note">` — the rule (map-page.scss:255-259) sets only
  `margin` / `font-size: var(--text-sm)` / `color: var(--color-muted)`. No
  fixed width, no `max-width` on the element, no `text-overflow`/`-webkit-line-clamp`
  truncation, no `white-space: nowrap`. The `<p>` wraps freely inside the
  sidebar's flex column; a longer string wraps to an extra line — no layout
  assumption breaks. (Verified read-only; the sibling lane's scss work is not
  in this diff.)
- `how.sources` renders at `map-page.html:392` as a plain `<p>` inside
  `.map-page__how` — the block has `max-width: 65ch` (line-length cap, not a
  height cap), `flex-shrink: 0`, and normal paragraph flow. No per-paragraph
  fixed height, no truncation. The ET/RU values get **shorter** (−43 B /
  −104 B); only line wrapping shifts.
- Neither key is admin-editable (`site-texts.ts`: 0 hits for either key), so no
  runtime override can outgrow a pinned layout either.
- No spec pins the rendered text of either string (grep over `*.spec.ts` for
  both values: 0 hits — the map spec pins the CTA result line and the anchor
  line, not these two `<p>`s).

## 4. Key / placeholder parity evidence

The edit changed **no key names, no key order, no counts** — five one-line
value replacements in place (numstat `1/1`, `2/2`, `2/2`: 5 lines changed,
5 lines added; file line counts identical before/after). Consequences and proof:

- **Key parity + order:** 955 keys per catalog; the sorted-key SET and the
  in-file key ORDER are byte-identical across en/et/ru (order-stable hash
  `949838b8` in all three, measured post-edit). The running backstop
  (`i18n.spec.ts` "catalog parity (en/et/ru lockstep)": *same key set* + *no
  value empty*) is green in the targeted run below and in the full gate.
- **Placeholder parity:** none of the five values contains a `{name}`
  placeholder (regex-verified post-edit), so no interpolation seam is touched;
  the pre-existing placeholders elsewhere in the catalogs are untouched.
- **Catalog-identity guard** (ET/RU must not be byte-identical to EN,
  `catalog-identity.spec.ts`): all new ET/RU values differ from EN by
  construction (different language) — green below.
- **Template guard** (`i18n-template-guard.spec.ts`): no template was touched;
  green below.
- **Targeted run:** `npx ng test --watch=false --include='**/core/i18n/*.spec.ts'`
  → **3 files / 71 tests, all passed** (i18n service + parity + identity +
  template-guard suites).
- **Line-count preserving ⇒ no anchor shift:** the only doc citations of the
  three catalogs are `00-CURRENT-STATE.md:116` (en.ts:177,180-182,186) and
  `:337-338` (ru.ts:196-198 / et.ts:190-192) — all above my edited lines
  (en:188, et:94/194, ru:99/200) and unaffected by in-place single-line
  edits. `DocumentationFactsTest` owes nothing from this diff.

## 5. Left untouched — with reasons

1. **`en.ts:85` `how.sources`** — already correct (0 triangle hits; the
   design-safe §4 verification holds). Bumping it would be churn.
2. **`legal.privacy.location.p2.*` (all three locales)** — the owner's
   explicit rule: the mechanism sentence is verified true and is legal text.
3. **The other "nearest" superlative claims (#1, #3–#7, #10–#12 of the audit
   ledger)** — the audit judged them all justified; the owner authorised only
   the §5.2 hedge. No key was changed beyond the five values above
   (`git diff --stat` = 3 catalog files, 5 lines, nothing else in this lane).
4. **`leaflet-service.spec.ts:133-137`** — STALE, filed on the notes board,
   not edited: the test title "…carry the submitter verification depth as
   **SHAPE** (owner decision)" and the comment "One confirmed channel ->
   **the triangle**; two or more -> the circle … the depth never rides on
   colour alone" describe the pre-`2022d6c` pin model; current depth is
   hue-only (the word-redundancy now comes from the legend labels and the row
   badge, per `styles.scss:873-875`). The assertions themselves pin current
   behaviour (`shelter-marker--partial/--full/--user`) and still pass. This
   lane owns the catalog copy only; a spec title/comment reword is the owner's
   or the `shared/` owner's call.
5. **Triangle words in `styles.scss` (:328, :829-:860)** — historical
   decision-record comments in a file the sibling scss lane owns; not copy.
6. **`docs/i18n-review.md`** — the workstream's chronological record of the
   earlier native-review waves; this lane's machine-draft caveat is reported
   here (§2 + §7) instead of editing a doc another lane owns.
7. **`docs/agent/00-CURRENT-STATE.md`** — run rule 6: one lane owns it; no
   citation is owed anyway (§4).

## GATE (detached, exit files)

- `cd frontend && npx ng test --watch=false` → **exit 0 — `Tests 1590 passed
  (1590)`, 66 files** (the 1590 baseline, exact). Log
  `/tmp/copyfix-test.log`, exit `/tmp/copyfix-test.exit`.
- `npx ng build` → **exit 0**. Log `/tmp/copyfix-build.log`, exit
  `/tmp/copyfix-build.exit`. (First launch raced the test gate's npx and died
  with `npm error could not determine executable to run` before compiling —
  environment, not source; the solo re-run is the attested one.)
- The i18n guard suites run inside the 1590 (targeted pre-run: 71/71, §4).

## Bundle delta

Measured on the same tree: the gate build (with the diff) against a HEAD
baseline build taken by temporarily swapping the three catalogs to their
`git show HEAD:` versions (a scoped patch was taken and re-applied;
`git diff --numstat` verified back to the 5-line state; nothing else in the
shared tree was touched) built to a separate output path. Per-chunk, size
mapped across the content hashes:

| chunk | HEAD | with diff | delta | content |
|---|---|---|---|---|
| initial (en.ts ships synchronously) | 351,572 B | 351,605 B | **+33 B** | the EN hedge (en.ts:188, Δ +33 B) |
| et lazy catalog chunk | 66,912 B | 66,918 B | **+6 B** | −40 B (the triangle clause; the shared verb `on` stays with the first surviving clause) + 46 B (the ET hedge) |
| ru lazy catalog chunk | 100,734 B | 100,691 B | **−43 B** | −104 B (the triangle clause) + 61 B (the RU hedge) |
| all other 23 chunks | — | — | **0 B** | byte-identical sizes; only the three changed chunks re-hashed |
| `dist/` total | 1,507,111 B | 1,507,107 B | **−4 B** | 33 + 6 − 43 ✓ |

Source-line UTF-8 deltas (indent + quotes included) sum to the same −4 B:
en +33, et −40 + 46, ru −104 + 61. The bundle stores the non-ASCII literals as
raw UTF-8 (verified in-chunk: no `\u` escaping drift), so source-byte delta =
chunk-byte delta per file. No new import, chunk or route; no new budget
warning (the build's warning set is the pre-existing SCSS budget set of the
sibling lanes' files, none in this diff — this diff touches no `.scss`).

## 7. Machine drafts needing the owner's native review (explicit)

| value | status |
|---|---|
| EN `how.sources` (en.ts:84-85) | **already correct** — shipped, not a draft |
| EN `map.geoNote` (en.ts:188) | house-language; the audit's approved wording verbatim — **not a draft** |
| ET `how.sources` (et.ts:94) | **MACHINE DRAFT** (was one; the edit deletes the triangle conjunct — all surviving words are the pre-existing sentence's own, the shared verb `on` kept on the first surviving clause) — native review owed |
| RU `how.sources` (ru.ts:99) | **MACHINE DRAFT** (same as ET — pure deletion) — native review owed |
| ET `map.geoNote` (et.ts:194) | **MACHINE DRAFT** (the purpose clause is newly authored; the rest of the value is the pre-existing sentence verbatim) — native review owed |
| RU `map.geoNote` (ru.ts:200) | **MACHINE DRAFT** (same shape as ET) — native review owed |

No sentence was authored whose grammar I could not stand behind at the
structural level (case, agreement, standard constructions); the residual
risk on the four ET/RU values is word choice / naturalness, which is exactly
what the native review is for. If the owner's reviewer rejects a draft, the
quotation the reviewer needs is in §1/§2 (before → after in full).

## Unverified / caveats

- No live-browser render check of the two `<p>`s (no running app in this
  lane); the layout verdict is from the token/selector level (§3), the same
  standard the sibling lanes used.
- The EN/ET/RU rendered sentences were verified against the mechanism (the
  audit's §2 source table), not re-traced in this lane — the audit stands.
- Concurrent-tree note: the working tree carries the sibling TABS-DENSE lane's
  uncommitted notes-board line (and its untracked `reviews/polish/tabs-dense.md`);
  neither is in this lane's diff and neither affects the gates (markdown only).

## Files for the parent's commit (this lane only)

- `frontend/src/app/core/i18n/en.ts` (1 line: the approved EN hedge)
- `frontend/src/app/core/i18n/et.ts` (2 lines: the triangle clause + the hedge)
- `frontend/src/app/core/i18n/ru.ts` (2 lines: the triangle clause + the hedge)
- `reviews/polish/copy-fix.md` (this report)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (one COPY-FIX line: the stale
  leaflet spec title/comment, §5.4)
