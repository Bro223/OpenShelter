# SIMPLIFY-CATALOGS — i18n catalog data files + allowlist machinery

Scope (exclusive): `frontend/src/app/core/i18n/{en.ts, et.ts, ru.ts, messages.ts, site-texts.ts}`.
The i18n machinery (service, guards, scanner, pipe, locale) was already cleaned by
SIMPLIFY-CORE-FE; its report §7 explicitly hands the catalog data-file planning ids to this lane.
Hard boundary honoured: **no user-facing translation value changed, no key added/renamed/removed,
no behaviour change.** Comment-only diff except one pure reordering (below, §4.7).

## 1. Structural documentation added (the "why" of the structure)

- **`messages.ts` contract header** (was 12 lines of partial orientation) is now the
  structural reference for the whole i18n system:
  - what the catalog is (closed set of UI copy keys; the three catalogs are typed
    against the interface → a missing key in ANY catalog is a compile error; the
    runtime key-parity guard `i18n.spec.ts` as backstop, rejecting empty values; the
    template guard pins both directions — every `| t` key resolves here, no
    user-visible text hardcoded outside the seam);
  - key organisation (dotted `surface.area.qualifier` paths, namespaced by the
    rendering surface: chrome / public pages / shared copy / admin), and that the
    interface and all three catalogs carry the SAME keys in the SAME order;
  - value conventions: `{name}` placeholder interpolation (unknown placeholders
    stay literal — visible, not silent); splice segments (`.before/.strong/.em/…`)
    rendered around inline markup, punctuation-only tails byte-identical across
    locales (hence the identity allow-list); the closed admin-overridable subset
    (site-texts.ts);
  - translator pointers (EN = verbatim reference copy; ET/RU headers document
    review status; `docs/i18n-review.md` tracks the uncertain values).
- **`en.ts` header** — now states what "reference copy" operationally means:
  `en` is the default locale, ships in the initial bundle, strings ARE the
  committed copy (page specs assert on them), ET/RU mirror the same keys in the
  same order, and points to the `Messages` contract for the conventions.
- **`et.ts` header** — documents the structure a translator needs: official
  Estonian data (Päästeamet/Maa-amet) → first-class locale; mirrors the EN
  reference copy (key-parity guard + catalog-identity guard named); proper-noun
  rule; **every value awaits native review in `docs/i18n-review.md` — do not treat
  any of it as final** (this status banner was missing from the ET file; RU had
  one, ET did not — an asymmetry now closed).
- **`ru.ts` header** — keeps the MACHINE-ASSISTED banner (now 21 lines,
  line-preserving), adds the guard cross-reference and the explicit "every value
  awaits native review — do not treat any of it as final" closing line; the
  vocabulary table is kept as a live constraint (shelter = укрытие *throughout*,
  per the unification the old history clause described).
- **`site-texts.ts`** — the allowlist header now states what it refuses: unknown
  keys (compile error here / 400 server-side), non-https URLs (server check),
  and **blank values (refused server-side, treated as absent client-side — the
  catalog default wins)**; the `SITE_TEXT_DEFAULT_URLS` comment now says when the
  fallback applies instead of citing template history.

## 2. Planning ids / history swept from comments (comment-only)

Swept: `i18n-et-en` (all 4 catalog files), `submitter-verification-badge`
(en×2, et, ru), `crisis-guidance` (en×2, et, ru), `list-page-paging` (en, et, ru),
`guidance-hero-import` (en, et, ru), `legal-i18n` (en), `official-dataset-csv`
(messages), `location-navigation` (messages), `community-review-queue` (messages
×2), `last-verified-meta` (messages), `shelter-trust-and-reports` +
`community-self-moderation` (messages), `bilingual-guidance` (messages ×4),
`pre-guidance` (messages), `admin-guidance-search` (messages),
`guidance-manual-order` (messages), `INFO-LAST-REPORTED` (messages), the whitepaper
"RUS / Estonian first" provenance clauses (et, ru), the "appended in batches
(B2..B11, legal text in backup order)" batch history (messages), the "were
English-only static text" history (messages, en), "page-shell.html used to
hardcode" (site-texts), "i18n'd from the guidance tabs on" (messages), and the
"the six Russian guidance drafts in the database are likewise unreviewed" DB-state
history (ru header). Post-edit sweep of the 5 files: **0 hits** for any swept id
(verified by grep, list in §2 of the git diff). No planning-id in my scope matches
a `SourceVocabularyTest` pattern (the backend guard was already green on these
files); the sweep is per the review-run convention, not the guard.

## 3. Defects fixed (each with evidence)

1. **en.ts map section: false "CTA NOT keyed" claim.**
   Comment said "The around-you CTA copy is NOT keyed here (see messages.ts)".
   It IS keyed: `map.aroundYou` exists in all three catalogs with a value per
   locale (EN "Show shelters around you", ET "Näita varjupaiku minu ümbruses",
   RU "Показать укрытия рядом с вами") and is rendered in the map template.
   Comment now states the true relationship (the how/geocode copy quotes the
   active-locale label).
2. **messages.ts detail section: stale `DISTANCE_COPY` reference.**
   Comment claimed the Distance-from-you action "stays English" via a
   `DISTANCE_COPY` constant. The action is fully keyed (`detail.distance.cta/
   straightLine/geolocationError`) and translated in every locale (ET "Kaugus
   sinust", RU "Расстояние до вас" …); `DISTANCE_COPY` exists nowhere in the
   codebase except one stale comment in `frontend/src/app/shared/geolocation.ts:10`
   (out of scope — filed, §5). The one English survivor in the section is the
   Details "Capacity:" data label, a template literal
   (`shelter-detail-page.html:182`) — the comment now says exactly that.
3. **ru.ts detail section: same false claim** ("Кнопка расстояния и метки
   Статус/Вместимость остаются английскими") — the distance button and the
   Status/Capacity row labels are all keyed and translated. Rewritten to the
   true single survivor (the Details "Capacity:" literal).
4. **messages.ts `legal.privacy.updated` / `legal.terms.updated`: "the date is
   locale-formatted"** — false: the date is baked into each locale's value
   (EN "Last updated: 16 September 2026", ET "16. september 2026",
   RU "16 сентября 2026 г." — all static strings; the terms pair the same).
   Comment corrected.
5. **ru.ts typo: `котируется` → `цитируется`** (guidance section comment: "the
   post title and body are admin copy (rendered verbatim)" — "котируется"
   ("is quoted on the stock exchange") was never the intended word).
6. **ru.ts media-delete confirm comment: `400/409` → `409`.** Delete-with-
   derivatives returns 409 only (the messages.ts twin says "The 409
   confirmation text"; the admin delete flow has no 400 on that branch).
7. **Orphaned doc comment in messages.ts** — `/** The subtitle under the page
   H1. */` sat directly above another doc comment with no key between them
   (there is no `admin.subtitle` key in the interface; the next key
   `admin.tabs.aria` has its own doc). Deleted (dead comment).
8. **`("Legal pages ")` quoted doc-section name** carried a trailing space in
   messages.ts — the actual heading in `docs/i18n-review.md` is "Legal pages".

## 4. Structural inconsistencies found

1. **Dead keys: NONE.** Every one of the 955 catalog keys is referenced at least
   once outside the five data files (template `| t`, component
   `i18n.t()/tKey`/`t(`, or dynamic construction — `RECENT_KIND_KEYS`,
   `BAND_KEY`, the openState label builder, the titleGuard route-data map, the
   legal TOC/section loops, the site-texts allow-list all verified complete).
   Nothing to delete; nothing filed.
2. **Duplicate keys: NONE** (script-verified in all four files).
3. **Key-set parity: EXACT** across en/et/ru (955 keys each, same set).
4. **Key ORDER drift: one, fixed.** `messages.ts` (the interface) ordered
   `map.legend.unverified` before `partialVerified/fullVerified` (index 127)
   while all three catalogs order it after `fullVerified`. The catalogs agree
   with each other, so the interface was the outlier; I moved the one entry
   (with its doc comment) in `messages.ts` only. Post-edit verification: the
   only remaining order difference vs HEAD is that single key, multisets
   identical. All four files now share one canonical order, as the new contract
   header documents.
5. **Value integrity: PROVEN.** HEAD-vs-working-tree extraction of every
   `key: value` pair in all five files: key sets identical, every value
   byte-identical (955×3 catalogs + 2 allow-list URLs).
6. **ET/RU `MACHINE DRAFT` notes** kept in place with the status wording
   normalized to the same form the legend blocks already used ("awaiting native
   … review; do not treat as final"); the RU header's stale "Not receiving
   updates" safety-string mention dropped — that string exists nowhere in the
   repo (grep-verified), it was history from an older copy set.
7. **`error.*` EN values** documented as the verbatim twins of
   `shared/error-copy.ts`'s legacy constants — verified byte-identical for all
   12 pairs before writing the comment.

## 5. Reported, NOT fixed (owner / other lanes)

1. **ET `admin.reports.dismiss` = "Arvelda".** The only imperative in the
   admin action row (siblings are past participles: "Vaadata", "Arveldatud",
   "Lõpetatud"); EN "Dismiss" / RU "Отклонить" are the standard terms. The
   sibling badge "Arveldatud" (rejected) is normal Estonian — the imperative
   form is the question, not the word. Translating this is a native-review
   decision (docs/i18n-review.md already lists the `admin.reports.*` rows as
   uncertain) — a value change, outside this lane's comment-only boundary.
2. **Submit-form placeholders do not end with "…"** (web-guidelines note filed
   by SIMPLIFY-SHELTER-FE against en.ts:349-371). Fixing = changing user-facing
   EN values — outside this lane's boundary; owner call.
3. **Stale `DISTANCE_COPY` comment in `frontend/src/app/shared/geolocation.ts:10`**
   (shared-lane file, out of scope): the detail page no longer maps geolocation
   failures to plain copy — it reuses the keyed `map.nearest.*` lines. Filed for
   the record.
4. **Hardcoded `Capacity:` label at `shelter-detail-page.html:182`** — the one
   English remnant in the detail Details section (a template literal beside the
   registry figure). Now documented as fact in messages.ts; making it a key is
   a value/template change (shelter lane / owner).

## 6. Anchor shifts (CODE-REVIEW-RUN.md rule 6)

| File | Cause | Old → new |
|---|---|---|
| `en.ts` | header 7 → 9 lines (+2, all below line 9) | `175` → `177`; `176` → `178`; `177-178` → `179-180`; `179-182` ("there is no grey in it") → `181-184`; `183-184` → `185-186`; `188` → `190`. Every en.ts citation below old L9 shifts by exactly +2. |
| `et.ts` | header 7 → 14 lines (+7, all below line 9) | `182-190` (MACHINE DRAFT legend blocks) → `189-197`; every et.ts citation below old L9 shifts by exactly +7. |
| `ru.ts` | header kept at exactly 21 lines | **NO SHIFT** — `195-203` unchanged (verified: MACHINE DRAFT at 197/201, block 195-203 byte-identical). |
| `messages.ts`, `site-texts.ts` | not cited by the doc | n/a |

`DocumentationFactsTest` is in the backend Maven suite, not the frontend gate —
the en.ts/et.ts citations are stale until the doc lane re-derives them (the
ru.ts citation stays valid as-is).

## 7. Gate

- `cd frontend && npx ng test --watch=false` — **exit 0 — 1562/1562 tests, 65
  spec files passed** (baseline exact). Run: /tmp/catalogs-gate/test.log +
  test.exit. The tree included SIMPLIFY-ACCOUNT-FE's in-flight (uncommitted)
  account-feature files, which their board entry records as gate-green at the
  same count — no foreign failures in my run.
- `npx ng build` — **exit 0** (/tmp/catalogs-gate/build2.log + build2.exit).
  The first detached attempt died before compiling ("npm error could not
  determine executable to run" — the two npx processes started in the same
  instant raced the npx cache); the retry, run alone, is the evidence. Only
  warning: the pre-existing 4 kB budget miss on `admin/audit-panel.scss`
  (another lane's file, already logged in their notes).

## 8. Unverified / residual

- The `docs/i18n-review.md` uncertainty lists themselves were not re-audited
  value-by-value (native territory; out of boundary).
- Whether the "Capacity:" label should ever become a key: owner decision (§5.4).
