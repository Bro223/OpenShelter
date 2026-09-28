# SMALL-CLOSERS — the three owner-ruled closures

**Lane:** SMALL-CLOSERS (branch `feature/frontend`, no commit — the parent commits)
**Base:** `2addbd3` (the parent's commit landing mid-session; it also restored
`reviews/polish/ux-implement.md`, which the session started without — the
READ-FIRST doc now exists in-tree and matches the `polish`-branch copy byte-for-byte)
**Skills:** `docs/skills/clean-code.md`, `docs/skills/code-review.md`
**Rules:** `docs/autopilot/CODE-REVIEW-RUN.md` — rule 6 (anchors), rule 7 (Maven lock)
read; every Maven invocation in this lane ran under `flock /tmp/openshelter-mvn.lock`.

---

## 1. Task 1 — the sixth dead name, `admin-locale-scope`

**Verdict re-verified fresh, the family way (all three, re-run this lane):**

- no live directory — `openspec/changes/` holds only `community-review-queue` (+ the
  archive); no `admin-locale-scope` directory;
- no archive directory — `openspec/changes/archive/` has no `admin-locale*` entry
  (dated or slugged);
- `git log --all -S'admin-locale-scope' -- openspec/` — empty.

Same class as the five listed never-made names. Added per the owner's ruling.

### What changed (`SourceVocabularyTest.java` only)

1. **The list** — sixth entry appended (string literal, per the file's own
   self-scan rule):
   `NEVER_MADE_CHANGE_NAMES = …, "guidance-index-paging", "admin-locale-scope")`.
2. **The floor** — `MIN_NEVER_MADE_CHANGE_NAMES` 5 → **6**, the new measured count,
   with the reason in the comment (the sixth working name verified never-filed the
   family way — no live or archive directory, `git log --all -S` under `openspec/`
   empty; `reviews/polish/wrap-closer.md` §3).
3. **The list's javadoc** reworded to describe the sixth entry **without writing the
   name into a comment** — this file's own comments are scanned by the check it feeds,
   so the entry may only appear in the string literal. The prose says "the admin
   content-locale working name, verified never-filed the same way (… §3)".

### "Reword its comment citations 1:1" — the rewording set is EMPTY (verified, not assumed)

A whole-tree grep of the guard's scanned surface (`src/`, `frontend/src/`) for
`admin-locale-scope` returns **zero** hits. The citations were already reworded by
prior lanes, which the family reports document:

- `reviews/code-review/dead-names-clean.md` — the sweep replaced all 34 occurrences
  (12 frontend files + 2 Java test-tree files) comment-only, line-count neutral
  except `admin-page.spec.ts` (9/10), keeping the constraint each citation stood for;
- `reviews/polish/wrap-closer.md` §3 — the one wrap-split citation
  (`admin-gateway.ts:384-386`) reworded 1:1 (3/3 lines) to `SCOPED (a `locale` is
  given)`.

Remaining tree occurrences are outside the guard's scanned surface by design:
dated board lines in `docs/autopilot/CODE-REVIEW-NOTES.md` (history — rewriting dated
records falsifies them), the dated reports in `reviews/code-review/`, and the stale
fetch chunks in `reviews/stale-decisions/`. **Nothing owed; nothing reworded.** If the
ruling expected live citations still in the tree, that expectation is stale — the
evidence above is why.

### Mutation proof — the list is enforced (re-run, exact commands, all under the lock)

Focused command: `flock /tmp/openshelter-mvn.lock mvn -B -ntp test
-Dtest=SourceVocabularyTest -Ddependency-check.skip=true`. The guard file was
sha256-pinned before the mutation phase (`/tmp/sc-guard.sha`); the restore was
`sha256sum -c` verified (OK). Logs/exit files: `/tmp/sc-p0…p3.log/.exit`.

| Step | Tree state | Result |
|---|---|---|
| **P0** | final tree (6 names, floor 6) | **GREEN** — `SourceVocabularyTest` 5/5, exit 0 |
| **P1** | fixture `NeverMadeSixthProofFixture.java` planted: the sixth name in a **line comment** and **wrap-split** across its own dash in a javadoc, plus four negative controls | **RED — exit 1**, refusing exactly the two planted citations, nothing else: |
| | | `2 source comment(s) cite a change name that was never filed (6 name(s) listed in NEVER_MADE_CHANGE_NAMES):` — `…:12: refused 'admin-locale-scope' — // the (admin-locale-scope) read` and `…:28: refused 'admin-locale-scope' — * the (admin-` |
| **P2** | fixture deleted | **GREEN** — 5/5, exit 0 |
| **P3** | the sixth entry removed from the list (5 entries, floor still 6) | **RED — exit 1**: `Only 5 never-made change name(s) are listed (the floor is 6) — the list is empty, and this guard would pass silently.` |

Negative controls that stayed silent in P1 (one run, four shapes): the LIVE name
`community-review-queue` in a comment (resolvable — not on the list); two adjacent
line comments spelling the name in fragments (two comments — the wrap never joins);
a mid-word break (`admin-loca` / `le-scope`, the documented limit of the join).
P3 is the direct proof the **raised floor** bites on the new entry: dropping the
sixth name alone is now a loud failure. Restore sha-verified; the standing full gate
below re-runs the whole suite on the restored tree.

## 2. Task 2 — the runbook contradiction (B5), fixed to match the code

**The verified seeder behaviour** (`src/main/java/ee/sheltermap/auth/AdminSeeder.java`,
`run()` read in full — this is what the corrected sentences state):

- both env vars blank → no-op, no admin exists;
- `ADMIN_PASSWORD` < 8 chars → **boot refused** (`IllegalStateException`);
- a user with `ADMIN_EMAIL` **already exists (any kind)** → **no-op — the row is
  left completely untouched**: the seeder never re-hashes, never flips kind, never
  touches claims;
- otherwise → creates kind ADMIN with an Argon2id hash of `ADMIN_PASSWORD`.

So the old line — "Change `ADMIN_PASSWORD` + restart (the seeder is idempotent; the
existing row keeps its id)" — was wrong in its consequence: "idempotent" here means
the row is **left as-is**, and the running password silently drifts from the
environment (the owner's own dev-admin incident, per the B5 report).

**No supported rotation path exists** — verified, not asserted: the in-app surface
refuses to mutate the provisioned admin (deletion `AccountService.java:158`,
password reset `PasswordResetService.java:209,262`, contact change
`ContactChangeService.java:286`, suspension `AdminUserModeration.java:130` — all
`ProvisionedAdminProtectedException` → 403), and the seeder never writes an existing
row. The runbook now says exactly that, and gives the two workable procedures
(§"Rotating the provisioned admin's password", new subsection in `operations.md`):

1. **Swap the hash in place** (keeps the user id — audit references survive): stop
   the app, generate an Argon2id hash in the same form the app verifies
   (`Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()`, `SecurityConfig:69`;
   the hash string embeds its own parameters), `UPDATE user_credentials
   SET password_hash = '…' WHERE user_id = <admin id>;`, restart, log in once to
   confirm. **Flagged as a finding (not papered over):** the repo ships no
   hash-generation tooling for this step.
2. **De-provision + re-provision** (the app's own mechanics, new id): stop the app,
   set the new `ADMIN_PASSWORD`, `DELETE FROM users WHERE email = '<ADMIN_EMAIL>'
   AND kind = 'ADMIN';` (credentials cascade with the user — `V1__schema.sql`
   `user_credentials.user_id … ON DELETE CASCADE`; `moderation_actions.moderator_id`
   is `ON DELETE SET NULL` per `V14`; `shelter_history.actor_user_id` has no FK per
   `V18` — the old id renders "Unknown" in both, the existing dangling-reference
   convention), start the app, the seeder re-creates the admin. Trade-off stated:
   the deletion anonymises the admin's past audit rows.

**Edits to `docs/security/operations.md` (three, all factual corrections):**

- §2 matrix row: "BOTH set = an admin is seeded at startup … Strong password; rotate
  on exposure" → the create-if-absent truth + pointer to §6 (the env vars cannot
  rotate an existing admin).
- §6 incident row: the wrong "Change `ADMIN_PASSWORD` + restart (idempotent…)" line →
  "does **not** rotate an existing admin (verified; see below)" + pointer, keeping the
  `moderation_actions` / `shelter_history` review.
- The new subsection above (the full verified semantics + both procedures + the
  tooling gap as an explicit finding).

No other file's admin-rotation claim is wrong: `README.md:627` already says
"create-if-absent — never re-hashed", `application.yml` and `.env.example` say
"at startup only / create-if-absent". `deploy-readiness.md` B5 is the dated report
that filed this — left as history.

## 3. Task 3 — the two pinned-spec conflicts, adjudicated

Both proposals were established as **actual improvements before anything changed**,
against the current tree (proposal text: `reviews/code-review/next-ux-proposal.md`
F3/P3a and F8/P5; the blocker analysis: `reviews/polish/ux-implement.md` §3).

### 3a. The pinned badge on the guidance index cards — **IMPROVEMENT; implemented + re-pinned**

Why it is an improvement: the server sorts pinned posts first (the template header
documents it) and the public DTO already carries `pinned` (`models.ts`) — but the
field was rendered **nowhere** on the public surface, so the editorial "read this
first" was positional only, and position is a weak signal in the 4-column card grid.
Zero new copy: the badge reuses the **existing** `admin.guidance.col.pinned` value
(EN "Pinned" / ET "Kinnitatud" / RU "Закреплён" — all three locales, grep-verified in
the catalogs). No new key, no changed value, no new token (the global
`.badge.badge--private` neutral chip vocabulary, `styles.scss:776`); one
page-scoped `align-self: flex-start` keeps the chip content-sized on the card's
column axis. Placement: a card sibling **between title and date** — not inside the
`<h2>`, so the heading's accessible name is untouched (the UX lane's second,
worse, option is not taken).

Files: `guidance-list-page.html` (the conditional `@if (post.pinned)` badge block +
comment), `guidance-list-page.scss` (the `guidance-post__pin` rule),
`guidance-list-page.spec.ts` (the re-pin).

**The re-pin (the assertion the owner authorised) — before/after:**

BEFORE (`guidance-list-page.spec.ts`, the card-shape test 'renders the thumbnail
above the title in DOM order (card, not row)') — the test's single fixture post was
non-pinned and the card's direct children were pinned to exactly:

```ts
    guidanceGateway.rows = [
      guidancePost({ heroImageUrl: heroUrl, heroImageAlt: 'A kettle on a camp stove' }),
    ];
    …
    expect([...card.children].map((c) => c.className)).toEqual([
      'guidance-post__hero',
      'guidance-post__title',
      'guidance-post__date',
    ]);
```

AFTER — the fixture gains the pinned sibling, the non-pinned shape stays pinned
byte-identical (the badge is conditional on the DTO's `pinned`), and the card-shape
contract is re-pinned for the pinned case with the reason recorded in the test:

```ts
    // RE-PIN (owner-ruled P3a — the pinned-spec conflict cleared
    // deliberately): a PINNED card gains exactly one direct child between
    // title and date — the pin badge. Before it, the DTO's `pinned` was
    // rendered nowhere on the public surface, …
    const pinnedCard = element.querySelectorAll('.guidance-post')[1] as HTMLElement;
    expect([...pinnedCard.children].map((c) => c.className)).toEqual([
      'guidance-post__hero',
      'guidance-post__title',
      'badge badge--private guidance-post__pin',
      'guidance-post__date',
    ]);
    expect(pinnedCard.querySelector('.guidance-post__pin')?.textContent?.trim()).toBe('Pinned');
```

No other assertion in either spec was touched.

### 3b. The unconfirmed-queue count on the admin tab — **IMPROVEMENT; implemented + re-pinned**

Why it is an improvement: the tab row answers nothing about how much work is waiting
(F8), and the answer is **free client-side data** — `UnconfirmedView.rows` is a
computed over the full un-paged shelters list that `ngOnInit` loads for every active
tab; the count needs no endpoint, no copy (a number translates as itself, the tab
word supplies the context), and it updates live through the queue's own refetch
after confirm/reject.

Files: `unconfirmed-view.ts` (one `tabCount` computed: ` (n)` once the queue has
loaded, `''` while the initial load is in flight — `(0)` before a load would read
"empty" for "unknown"), `admin-page.html` (one binding appended to the tab label:
`{{ 'admin.tabs.unconfirmed' | t }}{{ unconfirmed.tabCount() }}` — the `| t` seam
stays in the template).

**The re-pin (the assertion the owner authorised) — before/after:**

BEFORE (`admin-page.spec.ts`, 'opens on the Unconfirmed tab: only USER+NEW rows, with
the queue columns'):

```ts
    const active = element.querySelector<HTMLButtonElement>('.admin-tab--active');
    expect(active?.textContent?.trim()).toBe('Unconfirmed');
```

AFTER — re-pinned to the new expected value, reason recorded in the test:

```ts
    // RE-PIN (owner-ruled P5 — the pinned-spec conflict cleared
    // deliberately): the tab now carries the queue's count — free
    // client-side data (the queue's own rows, no endpoint; a number needs
    // no translation, the tab word supplies the context). The exact-word
    // pin pre-dated the count. 1 here: only USER_ROW is USER+NEW in the
    // fixture (USER_ROW_HIDDEN is CONFIRMED, REGISTRY_ROW is registry).
    const active = element.querySelector<HTMLButtonElement>('.admin-tab--active');
    expect(active?.textContent?.trim()).toBe('Unconfirmed (1)');
```

**Mechanical plumbing in the same spec, forced by the gate (NOT assertion bodies —
reported per the "these two assertions only" boundary):** the count made the
tab's exact text state-dependent, so the spec's exact-match button lookup
(`buttonByText`, trimmed `===`) can no longer find the Unconfirmed tab once the
queue has loaded. One new helper (`unconfirmedTab` — prefix match on the
`button.admin-tab` label; the count is state, not identity) replaced the six
exact-match lookups at the old lines 3674, 3948, 3959, 3970, 4025, 4053
(`buttonByText(element, 'Unconfirmed')` → `unconfirmedTab(element)`, each still
asserting `aria-pressed` exactly as before), and the `every tab value is
URL-addressable` loop special-cases `tab === 'unconfirmed'` to the same helper
(its `labels` map keeps `'Unconfirmed'` as the tab's base word for the failure
message). No assertion body outside the one re-pin changed; the suite is the proof.

## 4. Gates (detached, exit files)

- **Backend:** `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` — `/tmp/sc-gate-be.log/.exit` — **exit 0 — Tests
  run: 1370, Failures: 0** = baseline **1368 + 2** — the +2 is the parent's own
  commit `2addbd3` ("restore the alerts default pin"), which re-landed
  `AdminControllerAlertsTest` (exactly 2 `@Test` methods, green) after the 1368
  baseline was measured. This diff adds zero backend test methods — the proof
  fixture is deleted, and the mutation was proven and restored sha-verified.
  `SourceVocabularyTest` 5/5, `DocumentationFactsTest` 21/21, `OpenApiSnapshotIT`
  1/1 in the same run; PMD + coverage floors green inside the BUILD SUCCESS.
- **Frontend:** `cd frontend && npx ng test --watch=false` — `/tmp/sc-gate-fe.log/.exit`
  — **exit 0 — 1590/1590, 66 files** = baseline **1583 + 7** — the +7 is the sibling
  SPLIT-API lane's new `frontend/src/app/core/api-url.spec.ts` (untracked, in the
  shared tree at gate time; 7 `it`s, all green). My two spec changes keep the test
  COUNT unchanged (one test re-pinned in each file — no test added or deleted in
  either): focused run on the two files `162/162` before the full gate.

## 5. What deliberately did not change

No user-visible string or translation value added or changed (the badge reuses the
existing `admin.guidance.col.pinned`; the count is a number — punctuation + digit,
no copy). No identifier renamed. No migration SQL or comment touched. No behaviour
change beyond the two owner-ruled UI additions. No anchor cited in
`docs/agent/00-CURRENT-STATE.md` points at any touched file (grep-verified: 0 hits
per file) — no anchor shift owed, `DocumentationFactsTest` owes no re-derivation.
The two other `operations.md` consumers of the admin vars (README, application.yml,
`.env.example`) already state create-if-absent correctly — untouched.

## 6. Unverified / caveats

- **Shared tree, sibling lane in flight.** The SPLIT-API lane wrote into this shared
  tree during this lane (files: `docs/deploy/spa-csp.md`, `scripts/spa-csp.py`,
  `frontend/README.md`, `frontend/angular.json`, `frontend/src/environments/
  environment.ts`, `frontend/src/app/core/api-url.{ts,spec.ts}`, and the
  `guidance-detail/`, `guidance-editor`, `guidance-order-list`, `media-panel`
  `.ts/.html` pairs — plus **two hunks inside `guidance-list-page.html` itself**:
  `[src]="heroUrl | apiUrl"` and `[attr.srcset]="… | apiSrcset"` at the hero
  `img`). Those two hunks are NOT this lane's and sit in the same file as my badge
  block — the parent must keep the attribution straight at commit time (my change in
  that file is only the `@if (post.pinned)` block). Both gates ran on the combined
  tree; the FE +7 count is attributed to the sibling's spec above. If their
  in-flight state later lands broken, the re-gate is theirs.
- **Cross-tool Argon2id hash interop (runbook procedure 1)** — the runbook's claim
  is format-level: the app's encoder parses the parameters from the hash string, so
  a standard Argon2id hash works. I did not run an externally generated hash through
  `Argon2PasswordEncoder.matches` (no external hash tool in this environment) —
  which is exactly why the procedure ends with "log in once to confirm" and why the
  missing tooling is flagged as a finding.
- **The render of both UI additions in a real browser, in all three locales** —
  jsdom renders no theme and no pixels; the pins assert structure and the existing
  (token-guarded) vocabulary. Same standing constraint as the prior UX lanes.
- **`reviews/polish/nearest-audit.md`** (untracked) appeared in the tree mid-session
  — not this lane's, left as found.
