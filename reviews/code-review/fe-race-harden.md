# FE-RACE-HARDEN — the flaky guidance-detail race test, characterised, forced, and mutation-verified

**Lane:** FE-RACE-HARDEN · **Branch:** `code-review` (no commits — parent commits) ·
**Scope (exclusive, test files only):** `frontend/src/app/features/guidance/guidance-detail-page.spec.ts` + one sibling spec proven flaky (`frontend/src/app/features/guidance/guidance-list-page.spec.ts`). No production code changed (two throwaway in-place mutations, both reverted, md5-verified).

---

## 1. Reproduction and characterisation (task 1)

**Reproduced.** First single-spec run of the session (fresh process, cold
`./et` transform): **FAILED**, with the signature

```text
AssertionError: expected 'Skip to contentOpenShelterShelter map…' to contain
    'Juhise artiklit ei leitud'
    at guidance-detail-page.spec.ts:355:29   (the first ET not-found assertion)
```

Runs 2–12 of the same isolated invocation: **11/12 passed**. So in this
session: 1 failure / 12 runs, and the failure is the COLD first run — the
same "failed once in isolation today, passed on an immediate re-run" shape
the parent reported.

**The flake is not the fetch interleaving — it is the lazy i18n chunk.**
A throwaway probe spec (deleted before the gate) replicated the exact flow
and logged state at the exact assertion points, 15 fresh-process runs:

| measured at the ET not-found assertion | result (15/15 runs) |
|---|---|
| `whenStable` after `setLocale('et')` resolves | 5–12 ms |
| page state then | `loading=false notFound=true post=null` — the 404 **always** settles within `whenStable` |
| `i18n.isCatalogLoaded('et')` | **false** — the `et` chunk has not landed |
| DOM then | EN not-found copy (`Guidance post not found`), not the ET copy |
| when the `et` chunk actually lands (`ensureCatalog` resolve, relative to `setLocale`) | **22–39 ms** (warm transform, fresh worker; colder when the transform cache is cold) |

The chain: `setLocale('et')` (a) schedules the re-fetch through
`toObservable(i18n.locale)` — an **effect** in Angular 22, so the 404 fetch
and its settlement are Angular-scheduled work that the zoneless
`whenStable` tracks (and the probe shows it settles within 5–12 ms, 15/15);
and (b) starts the on-demand `import('./et')` catalog chunk. The asserted
string `Juhise artiklit ei leitud` is **Estonian chrome copy**, which
`t()` can only serve once the chunk is in memory — until then it serves
the default-locale copy (the documented production fallback). The chunk
load is a floating promise inside `I18nService.ensureCatalog`; nothing
awaits it and the zoneless stability tracker does not see it. So
`settle()` returns at ~12 ms with the page in the correct not-found
**state** but the EN **copy**, and the assertion fails unless the chunk
happens to land in the remaining sliver before the DOM read. In suite
context the worker's module history from earlier files usually hides the
race (the baseline stays green); a fresh worker (isolated run, or a file
early in a worker's life) pays the full import cost inside the test's own
timeline and loses.

**The ordering rule the test is actually pinning** (task 2): after a
locale switch, the NEW fetch decides the page state, and the SUPERSEDED
in-flight response — a 200 or a failure — must not land, in the DOM or in
the model, whenever it resolves later.

## 2. How the hardened version forces it (task 2)

`guidance-detail-page.spec.ts` — `a switch while the fetch is in flight
re-fetches, and a stale response cannot land` (spec :328–375):

- **The fetch interleaving was already forced and stays forced:** the EN
  fetch is a hanging promise the test resolves by hand (last), and the ET
  fetch is a controlled immediate 404. The probe proved this thread
  settles deterministically (15/15), so no change was needed there.
- **The uncontrolled thread is removed:** `await i18n.ensureCatalog('et')`
  runs BEFORE `open()` while the locale is still `en` — preloading the
  chunk triggers no re-fetch (only the locale signal does), and at
  assertion time the ET copy is immediate. This is the same idiom the
  other ten+ specs in this tree already document as
  `// bundle-lazy-i18n: the et chunk is on demand`.
- **A new model-level pin.** The mutation pass (below) showed the
  DOM-only assertions **cannot see** a guard-removing regression: the
  template checks `notFound()` first, so the not-found branch renders
  OVER a stale `post` — with the guard disabled, the stale 200 sets
  `post` and the DOM is unchanged (the original test survived the
  mutation 3/3). The test now additionally asserts
  `expect(page.post()).toBeNull()` after the stale 200 is released —
  the guard's data-level contract, not just its visual one.
- **The invariant assertion stays strict** — every original assertion is
  present, unmodified, in the same order. Nothing was weakened.
- **New twin test** (spec :377–444): `a stale failure from the superseded
  fetch cannot land over the settled not-found either` — the FAILURE
  branch of the same `fetchSeq` guard had **no test at all** (a stale 500
  settling over a settled not-found). Same forced interleaving (hung EN
  fetch released as a 500 last), same catalog preload, DOM assertions
  (not-found stays, no error banner) plus the model pin
  `expect(page.error()).toBeNull()`.

Result: 24 → 25 tests in the file, all 25 green in **15/15 fresh-process
runs** (25/25 each), including run 1 of the batch.

## 3. Mutation proofs (task 3) — throwaway in-place mutations, all reverted (md5 `4da690b…` before and after)

| # | Mutation (production file, reverted) | Behaviour removed | Killed by |
|---|---|---|---|
| M1 | `guidance-detail-page.ts` `load()` success branch — `if (false && seq !== this.fetchSeq)` | the stale-200 drop (a superseded 200 may land in `post`) | **Against the original DOM-only assertions: SURVIVED 3/3 — the hole this lane found** (probe showed the stale 200 lands: `post()` = the EN post, DOM still shows not-found because the template's `@if (notFound())` branch renders over it). **Against the hardened test: KILLED 3/3** — `AssertionError: expected { slug: 'water-and-heating', …(10) } to be null` at the `page.post()` pin (spec :383) |
| M2 | `guidance-detail-page.ts` `load()` failure branch — `if (false && seq !== this.fetchSeq)` | the stale-failure drop (a superseded 500 may land in `error`) | KILLED 3/3 by the new twin test — `expected 'Midagi läks valesti. Palun proovi uue…' to be null` at the `page.error()` pin (the ET banner copy — locale-aware, as production serves it) |

After every mutation step the file was restored with `git checkout --` and
the md5 verified equal to the committed hash; the final green run on the
restored file is the last of the 15-run batch.

## 4. Sibling sweep (task 4)

**Proven flaky — hardened (1 file):**
`guidance-list-page.spec.ts` — `refetches the CURRENT page on a locale
switch (no URL change)` (:669–688): asserts the **Estonian** out-of-range
copy `Lehe 2 ei ole — nimestik lõppeb lehel 1.` after
`setLocale('et')` with **no catalog await** — the same uncontrolled chunk
thread as the detail test. Proven flaky: **5/5 failed** when the file was
run as an isolated invocation (fresh worker), same signature
(`expected 'Skip to contentOpenShelterShelter map…' to contain 'Lehe 2 ei
ole — nimestik lõppeb lehel…'`); a throwaway probe (deleted) logged
3/3 `oobPresent=true catalogLoadedEt=false hasEnCopy=true` at the
assertion point — the state had settled, the copy was still the EN
fallback. Fix: one line — `await TestBed.inject(I18nService).ensureCatalog('et')`
after the switch, the tree's documented idiom. After the fix: **3/3 green
(30/30 tests)** under the same isolated condition.

**Examined, NOT flaky — no change (evidence per group):**
- *Same file, same describe:* `refetches the index when the language
  switcher changes` and `drops a superseded response — a stale locale
  must not land over the new fetch` assert only DTO **titles** (content,
  never chrome copy) — no chunk dependency; the stale-rows test kills its
  own regression through the DOM (list rows are rendered directly, there
  is no masking branch).
- *guidance-detail, other locale test* (`a mismatch 404 is the not-found
  state…`): asserts a content title and the **EN** not-found copy (the
  default catalog is always in memory) — deterministic.
- *guidance-detail locale-fallback describe:* already does
  `setLocale('ru'); await ensureCatalog('ru')` before `open()` — the
  correct idiom; this test is the template my fix follows.
- *`shelter-detail-page.spec.ts:2193`* `setLocale('ru')` without an
  `ensureCatalog`: the asserted `июл.` is **DatePipe** locale data,
  registered eagerly in `test-setup.ts` (`registerLocaleData(ruLocale)`) —
  not the lazy catalog — deterministic.
- *Every other `setLocale` spec* (`i18n.spec.ts`, `title.spec.ts`,
  `guidance-gateway.spec.ts`, `consent-banner.component.spec.ts`,
  `login-page.spec.ts`, `map-page.spec.ts`, `admin-page.spec.ts`,
  `privacy-policy-page.spec.ts`, `terms-page.spec.ts`): either the
  documented `setLocale; await ensureCatalog` idiom before the copy
  assertion, or assertions on non-copy state (signal values, API query
  strings, localStorage keys).
- *Real-delay specs* (`setTimeout(resolve, 0)` in `api-interceptor`,
  `confirm-action`, `account-page`, `contributions-panel`,
  `submit-shelter-page-session`, `site-texts-panel`, `guidance-editor`):
  a 0 ms macrotask yield drains the ENTIRE microtask queue before
  asserting — deterministic given this codebase's async is
  microtask-based (signals/effects/fake promises); no `fakeAsync`, no
  `requestAnimationFrame`, no asserted real-timer work anywhere in the
  spec tree.
- *Controlled deferred-promise specs* (`guards`, `submit-shelter-page`,
  `shelter-detail-page`, `admin-page`, `auth-store`): manual
  resolve/reject handles released by the test, then `settle`/`whenStable`
  — the same controlled idiom the hardened guidance tests use; no
  unawaited chunk loads, consistently green in the baseline.

## 5. Production bug suspected?

**None.** The observed behaviour is the documented production fallback
("while a catalog is still loading, `t()` serves the DEFAULT locale's
value" — `i18n.service.ts` lookup seam): the page was in the CORRECT
not-found state with the reader-language copy pending. The `fetchSeq`
guard behaves as specified in both branches. The flake was a test racing
an async step production handles gracefully.

**One observability note (reported, not a defect):** the detail template's
`@if (notFound()) {…} @else {…}` branch order means a stale `post`/`error`
is *masked* in the DOM while the not-found state shows — which is exactly
why the original DOM-only assertions survived the guard-removal mutation
(M1). A latent state (invisible under the current template, would surface
if the template ever rendered `post` outside the article branch) is now
pinned at the model level by the two new signal assertions.

## 6. Gate (detached, exit files read)

| Gate | Command | Result |
|---|---|---|
| tests | `cd frontend && npx ng test --watch=false` | **exit 0** — `Test Files 65 passed (65)`, `Tests 1581 passed (1581)` = 1580 baseline **+ 1** (the new stale-failure twin; nothing deleted or weakened) |
| build | `cd frontend && npx ng build` | **exit 0** |

Repetition counts: original test isolated — 1/12 failed (cold run 1);
hardened detail spec isolated — 15/15 × 25/25; hardened list spec
isolated — 3/3 × 30/30 (pre-fix: 5/5 failed × 1); probe batches
15+15+3+3 fresh processes (all evidence in `/tmp/fe-race/*.json` and
`probe*.log`, the tmp dir may be cleared before the parent reads it).

## 7. Unverified / residual

- In-suite (full-worker-history) flake frequency is not measured
  separately: the full suite passes because earlier files warm the worker
  enough; the isolated-condition frequency (what the parent hit) is the
  measured one, and the fix removes the timing dependency structurally in
  both conditions.
- The 0 ms `setTimeout` ticks were classified deterministic by reading
  (macrotask yield ⇒ full microtask drain); not stress-run under load.
- Vitest's `--filter` did not filter as documented when combined with
  `--include` (it ran the whole file); isolated-file `--include` was used
  instead. No action needed, noted for future lanes.
- Both mutations were in-place edits of the (clean, committed) component,
  reverted with `git checkout --`; `git status` for the guidance directory
  shows only the two spec files modified by this lane.

## 8. Files for the parent commit

- `frontend/src/app/features/guidance/guidance-detail-page.spec.ts`
  (hardened in-flight test + model pin + new stale-failure twin test)
- `frontend/src/app/features/guidance/guidance-list-page.spec.ts`
  (one line + comment: await the et catalog before the ET-copy assertion)
- `reviews/code-review/fe-race-harden.md` (this report)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (board entry appended by this lane)
