# SIMPLIFY-ACCOUNT-FE — account surface readability pass

**Branch:** `code-review` · **Scope:** `frontend/src/app/features/account/**` (exclusive)
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` + `docs/skills/{clean-code,code-review,web-design-guidelines}.md`
**Method:** comment-to-constraint reduction, dead-comment deletion, one method split, one nest flatten. Zero renames, zero behaviour change. Pinned specs untouched.

---

## 1. What changed (file:line, before/after)

### Flattened / split

| Where | Change | Lines |
|---|---|---|
| `verify-page.ts:248-268` (was 249-269) | `request()` catch: removed the `else` nest — the 409 branch now `return`s, the 429 countdown and the error set run at one level. `finally` still clears `sending()` on every path (verified: 409 → refresh + notice, no error, no countdown; 429 → countdown + error; other → error only). | verify-page.ts 301 → 302 |
| `account-page.ts:481-517` (was 481-505) | `downloadData()` split: the Blob / object-URL / transient-`<a download>` dance moved into a named private step `saveDataExport(data)` (one level of abstraction — the method now reads "fetch, save, report"; the download mechanics are a detail below). Byte-identical statements, same order. | account-page.ts 517 → 517 |

No other method needed flattening: `saveProfile` / `emailSend` / `emailConfirm` / `phoneSend` / `phoneConfirm` / `deleteAccount` / `sendInfoReply` are already early-return shaped at ≤ 35 lines each — reshaping them would trade clarity for novelty, which the standard forbids.

### Renamed

Nothing. Every public member is referenced by a pinned spec (method names like `emailSend`, `retryProfile`, `requestDeleteShelter`, `codes`, `phases`) or by the templates; renaming would require touching the specs, which rule 1 forbids. The only new symbol is `private saveDataExport` (account-page.ts:506).

### Comments cut to constraints (history/planning tone removed)

- **account-page.ts** — class doc (40-57): dropped the `remove-national-id` / `user-contributions` tags and the "reviews list … no review model" history clause; **corrected a stale clause** — the doc described the contributions panel as "inline edit + two-step delete", but the inline edit form no longer exists (Edit is the shared /submit link); it now reads "list, edit via the shared /submit form, two-step delete". Dropped `i18n-et-en`, `legal-recovery` tags and the redundant "Unsubscribed in ngOnDestroy" sentence.
- **account-page.html** — dropped the `(admin-moderation)` tag, the `(Workstream A)` label on the Legal section banner, and "the /submit convention" pointer; the admin-delete and a11y comments keep their constraint content.
- **account-page.scss** — `.proof-note` (111-122): the `(owner): the 3px primary left bar read as machine-generated…` history → "the subtle fill is the note's boundary (in place of a border); the contrast pair is pinned in design-tokens.spec.ts". Same treatment for the two "this was the one space-10 holdout" and "sat at space-N" history clauses (`.identity-row`, `.contact-chip--verified`, `.panel-actions`, `.badge`).
- **contributions-panel.ts** — class doc: dropped `(user-contributions)` and "The reviews list is gone with the review model (owner decision)" (history); removed the whole dead `// ---- shelter edit ----` section header whose five comment lines repeated what the `editLink` doc already states; dropped `community-review-queue` / `user-contributions` / `shelter-trust-and-reports` tags and the "(the review edit's local updatedAt bump precedent)" cross-reference in `sendInfoReply`.
- **contributions-panel.html** — dropped `map-crisis-actions` / `community-review-queue` / `user-contributions` tags; **deleted a dead sentence** — the Edit-link comment described the "String form (not the array form)" rationale, but the template uses the `editLink()` UrlTree (that rationale now lives only in `editLink`'s doc, where it is true).
- **contributions-panel.scss** — dropped the tags and the "what the old sibling layout produced" arithmetic in the empty-state comment (the constraint — symmetric whitespace, 4px top compensation — stays).
- **verify-page.ts** — class doc: dropped "03 puml" and "(04-CONTEXT decision 3, reversed)" (a *reversal* is history); the `returnUrl` javadoc-style `{@link}` / `{@code}` markers → plain backticks.
- **verify-page.scss** — dropped "(the verify panel sat at space-6)" and "this was the one space-10 holdout".
- **verify-page.html** — unchanged (already constraint-only).

### File totals (source, specs excluded)

| File | Before | After | Δ |
|---|---:|---:|---:|
| account-page.ts | 517 | 517 | 0 |
| account-page.html | 441 | 439 | −2 |
| account-page.scss | 154 | 151 | −3 |
| contributions-panel.ts | 330 | 321 | −9 |
| contributions-panel.html | 211 | 206 | −5 |
| contributions-panel.scss | 207 | 201 | −6 |
| verify-page.ts | 301 | 302 | +1 |
| verify-page.scss | 82 | 82 | 0 |
| **total** | **2243** | **2220** | **−23** |

Formatting: `prettier --check` (repo .prettierrc, printWidth 100) shows the identical single pre-existing warning on `account-page.ts` before and after (the `imports:` array reflow that prettier 3.9.6 — newer than the pinned `^3.8.1` that formatted the tree at b971648 — wants). Zero new violations introduced.

## 2. Evidence the pinned behaviours hold (specs passed UNMODIFIED)

`git status` proves the three spec files are byte-identical (not in the diff). In the full gate run, all of these passed unmodified:

- **Deletion flow for unverified users** — `account-page.spec.ts` "delete account" describe block: `the delete button stays disarmed until DELETE is typed`, `a confirmed delete erases the account, ends the session and leaves for the map`, `a failed delete shows the banner and keeps the session`, `an untyped confirm is a no-op`, plus the admin-absence pin `the provisioned admin gets no delete controls`.
- **Contact-change via a code to the existing channel** — `account-page.spec.ts`: `email send -> 202: normalises the address and moves to the code phase` (asserts `requestEmailChange('new@example.ee')` + "SMS code sent to the phone" copy + input lock), `the code phase locks the phone target input too`, `phone flow: request by email code -> confirm updates the phone` ("email code sent to the email"), the 255/64 maxlength boundary pins, the per-change-type 429 Retry-After countdown pins, `a wrong/expired confirm code (400) shows generic copy`, `startOver clears a stale confirm error`.
- **Info-request display with one-time reply** — `contributions-panel.spec.ts`: `an open info request shows the amber chip and the Info button`, `the Info panel shows the open question with the reply form`, `sending the reply POSTs the one-time answer and patches the row in place` (asserts `replyInfoRequest(7, …)` and the answered flip), `an answered request stays viewable read-only`, `a rejected reply (409) shows the row error and keeps the form open`.
- **Proof-note rendering (background in place of the border)** — `design-tokens.spec.ts:1317` `account-page .proof-note — the confirmed case` (sass-compiles my scss: no single-side border, `background: var(--color-bg-subtle)` exactly) and `account-page.spec.ts` "no page-level horizontal overflow at 360px" (regex-parses the `.proof-note` block: no fixed width, no nowrap). Both pass — I re-verified the block shape against both regexes after editing.
- **360 px overflow mechanisms** — same 360px describe block above (passes; the block's declarations are untouched, only its comment changed).
- **Everything else on the surface** — identity edit, admin badge, verified labels, profile retry, export download, hidden-row marks, trust badges, admin note, inaccurate line, all verify-page channel/cooldown/409/429 pins.

## 3. Web-design-guidelines findings (guidelines fetched fresh from the source URL)

Grouped by file, per the skill's output format:

**account-page.html**
- `account-page.html:186,297` — code inputs lack `spellcheck="false"` (guideline: disable spellcheck on codes)
- `account-page.html:400` — delete arming input lacks `spellcheck="false"` (same rule; typed literal)
- otherwise pass: every control has a label/`for`, correct `type` (email/tel/password/text), `autocomplete` correct on all (name / current-password / email / one-time-code / tel / off), `<button>` for actions + `<a routerLink>` for navigation, field errors `role=alert` wired via `aria-invalid` + `aria-describedby`, armed state `role=status`, banners `role=alert|status` (live regions), h1→h2→h3 hierarchy, `overflow-wrap: anywhere` on values, no icon-only buttons, no images, no `transition: all` in the scss.

**contributions-panel.html**
- pass — semantic `<ul>/<li>` list, `role=status` on the confirm strip, `role=alert` on row errors, badges are text not icons, `overflow-wrap` on title/note/hidden mark.

**verify-page.html**
- `verify-page.html:34` — the channel code inputs lack `spellcheck="false"`
- `verify-page.html:7` — `aria-label` on a plain `<ul>` is non-standard (harmless; the list is already semantic)
- otherwise pass: `✓` mark `aria-hidden`, labels present, `inputmode`/`autocapitalize` set per channel.

**Cross-cutting (filed in the notes board, not fixed here):** no form in the surface moves keyboard focus to the first invalid field on a blocked submit (guideline "focus first error on submit") — an app-wide pattern (auth/shelter forms show the same shape), so it belongs in a shared helper, not this lane.

**Left as owner decisions (recorded in the notes board):** the `spellcheck="false"` additions are browser-behaviour changes, not readability — I did not make them, and the pinned specs are asserted untouched.

## 4. Anchor shifts

**None.** `docs/agent/00-CURRENT-STATE.md` contains zero citations of any file in my scope (verified by grep for `account-page`, `contributions-panel`, `verify-page`, `features/account` — the only "account" mention in the doc is `frontend/proxy.conf.js:7-16`, foreign). Nothing to re-derive; recorded in the notes board for the anchor pass.

## 5. Gates (detached, exit files read)

| Gate | Result |
|---|---|
| `cd frontend && npx ng test --watch=false` | **exit 0** — 1562/1562 tests, 65 files (baseline: 1562 / 65 — exact) |
| `cd frontend && npx ng build` | **exit 0** — initial 608.47 kB; 15 budget warnings, all in admin/shelter files, **none in my scope** |

Evidence: `/tmp/simplify-account-fe-test.log` / `.exit`, `/tmp/simplify-account-fe-build.log` / `.exit`. No foreign failures in either run.

## 6. Unverified / residual

- **Nothing unverified in-scope** — every changed file is type-checked by the build gate and exercised by the spec gate; the two scss-reading pins were additionally re-verified against their regexes directly.
- The planning-id guard (`SourceVocabularyTest`, backend) scans `frontend/src` too: I mirrored all 16 forbidden patterns (incl. the hex-adjacency exemption) over all 12 in-scope files — **0 hits** before and after. I did not run the Maven gate (no Java change; the guard's frontend scan is covered by the pattern mirror + the owner's final backend run).
- The prettier 3.9.6-vs-3.8.x reflow of the `imports:` array in `account-page.ts` is pre-existing (identical at HEAD) and repo-wide in scope — left alone; if a formatter pass is planned, it should pin one version first.
- `verify-page.ts:138` (`protected readonly auth = this.store`): a one-line template alias — kept; the template reads `auth.levels()` and the underlying store is private, so the alias is the exposure seam, not a middle-man class.
