# NEXT-DECISIONS-RESEARCH — report

Lane `NEXT-DECISIONS-RESEARCH` · branch `code-review-2` · baseline `caf49f5` · 2026-09-28

**Scope:** turn the remaining open questions into one-reading decisions — researched against
this codebase, each with the established facts, the options, a recommendation and its reasoning,
and the exact question where a person is required. **Changed no code, docs, copy or translation
values.** (One pre-existing uncommitted change in the worktree — `guidance-gateway.spec.ts`
formatting — was not made by this lane and was left untouched.)

**Evidence base:** the current tree; the live dev database (`sheltermap-db`, queried read-only);
a fresh `dependency-check:check` run this session (exit 0, green; report preserved at
`/tmp/nextdec-report.html` — see §Concurrency); Maven Central version metadata; and the
DOMPurify version bundled inside each swagger-ui webjar, read from the jar bytes.

Reading order per the stated priorities: **reliability first, then the recommendation, then
what is safe and will not break the app.**

---

## D1 — The duplicate-race rule

### What the current rule actually does

The near-duplicate rule is one check in `ShelterService.addPlace`
(`src/main/java/ee/sheltermap/app/ShelterService.java:204-214`), with these exact constants:

| Constant | Value | Where |
|---|---|---|
| `app.limits.duplicate-coord-meters` | **100 m** haversine | `application.yml:251`; default `100` in the constructor (`ShelterService.java:110`) |
| name match | case/whitespace-insensitive (lowercase, trim, collapse whitespace runs) | `normalizeName`, `ShelterService.java:262-266` |
| candidate rows | **ACTIVE, `source = USER`** only (registry and hidden rows never count) | `findNearDuplicate`, `ShelterService.java:253-259` |
| scope | **cross-user** (any verified account); ADMIN kind exempt, like the caps | `ShelterService.java:204-214`; `ShelterDuplicateException` javadoc |
| Earth radius | 6,371,000 m | `ShelterService.java:96` |
| outcome | **409** `ShelterDuplicateException` — "A shelter with this name already exists at this location (shelter #<id>)" + an in-memory admin alert row `near-duplicate` naming the repeat reporter | `ShelterDuplicateException.java`; `ThrottleAlertRecorder.java:67-72` |

Sitting in the same method, so the full submission guard stack: verified-account gate (403) →
**per-user row lock** → active cap (10, 409) → daily cap (5 per rolling 24 h, 429 + exact
Retry-After) → near-duplicate check (409).

The same 100 m tolerance is a **second, distinct rule** in `ShelterReportService`
(`:121-133`, `:285-296`): a `NON_EXISTENT` report is stored *damped* (counts 0 toward the
auto-hide tally) when the reporter holds their own other USER listing of the same place. The
two rules share one constant on purpose; only the submission check is the 409.

### The race guard, and exactly what it covers

- `userRepository.lockForUpdate(user.getId())` (`ShelterService.java:179`;
  `JpaUserRepository.java:283`) serializes the read-check-write **per user**. Added in
  commit `ea7db6e` ("fix: transactions, optimistic locking and the verify-confirm 500 on the
  write paths"); proven by `ShelterSubmissionCapRaceIT` (two concurrent submissions by the
  **same** user: exactly one wins, the loser gets the documented 409).
- The report/audit crossing path is guarded separately by the optimistic lock
  (`shelters.version`, `@Version` at `ShelterEntity.java:106`): the losing concurrent
  writer's whole transaction rolls back into a **retryable** 409 ("The resource changed under
  you; reload and retry") — proven by `ShelterTallyCrossingRaceIT`.

So: same-user races are closed and proven. **Cross-user races are not serialized** — the lock
is on each user's own row, so two different users lock different rows; under Postgres
READ COMMITTED each transaction's duplicate scan does not see the other's uncommitted row.
There is **no database backstop**: the only partial unique index on `shelters` is
`external_id` (registry import, `V1__schema.sql:48`) — name+coordinates carry no constraint.

### What happens in each scenario (established)

| Scenario | Outcome | Pinned by |
|---|---|---|
| Same user resubmits (retry, any time later) | Serialized by the row lock; the second sees the first's committed row → 409 with the existing row id + alert. The rejected row is never created. | `ShelterDuplicateIT.resubmittingTheSameShelterIs409…` |
| Cross-user resubmission, **sequential** | Second gets 409 (the check is cross-user by design). | `ShelterDuplicateIT.crossUserResubmissionIs409` |
| Two different users submit the same place **concurrently** (same normalized name, ≤ 100 m, same few seconds) | **Both scans pass, both rows commit.** Two ACTIVE USER rows sit on the map. No test covers this case; no post-hoc dedup exists. Both stay until an admin hides or deletes one. | not pinned — the gap |
| Same user, daily cap exhausted | 429 with Retry-After; the attempt is not stored. | `ShelterDailyLimitIT` |

Blast radius of the unclosed window: it requires two distinct **verified** accounts, an
identical normalized name, ≤ 100 m apart, and a concurrent window. It is bounded by the 5/24 h
and 10-active caps; the duplicate is visible on the map, appears in the admin shelter list, and
`DELETE /admin/shelters/{id}` (or hide) removes it. The near-duplicate 409 alerts already put
the repeat-reporter pattern in the admin alert ring.

The rule's stated purpose is anti-abuse (the throwaway-account re-report vector —
`ShelterService.java:204-207` javadoc, `docs/security/threat-model.md:58-59`), not a map
uniqueness guarantee. It is also **promised in user-facing legal copy**: `legal.privacy.verification.p3`
and `legal.terms.rules.li4` both state "detection of near-duplicate submissions" — so the rule
should not be removed or materially weakened without touching that copy (and its ET/RU
duplicates), but tightening it requires no copy change.

### Options

- **A. Leave it.** No change. Residual: a rare, visible, admin-removable double row under a
  genuine two-user race.
- **B. Tighten — serialize per normalized name.** A Postgres advisory transaction lock keyed
  on the normalized name (e.g. `pg_advisory_xact_lock(hashtext(normalizeName))`) taken before
  the scan, so the second submitter's scan sees the first's committed row and gets the same 409
  the sequential path documents. ~20 lines in `ShelterService` + a new repository seam
  (JdbcTemplate) + a cross-user race IT in the shape of `ShelterSubmissionCapRaceIT` (exactly
  one row survives, loser gets 409). No migration (advisory locks need no schema), no new
  error shape, no contract change. A `hashtext` collision only serializes unrelated names —
  harmless.
- **C. Deduplicate after the fact.** A scheduled job scanning ACTIVE USER pairs
  (same normalized name, ≤ 100 m), keeping the older row and hiding the younger with an audit
  row. Heaviest: new scheduler + merge semantics (the hidden row's reports/occupancy stop
  counting; trust state of the survivor; which row's history wins) + new audit semantics.
  It reaches into the verified trust-ladder territory that this run deliberately keeps
  undisturbed.

### Recommendation: **A — leave it** (with B as the fallback if you rule the double row unacceptable)

Reasoning against the stated order:

1. **Reliability first:** nothing in the current state is unreliable. The worst interleaving
   ends in a correct, visible, bounded, manually-removable outcome; no trust, data or
   accounting state is corrupted. Tightening changes nothing on this axis.
2. **The recommended approach:** the rule is an abuse valve, and its job (stop sequential
   re-reporting from throwaway accounts, with an admin-visible alert) is done. The window it
   doesn't close requires two distinct verified humans colliding on the same name within
   100 m in the same seconds — the app's own documented acceptance behaviour
   (`ShelterDuplicateIT`) is sequential, and the caps bound any residual.
3. **Safe and will not break the app:** B is safe *if* you want it — no migration, no contract
   change, the full suite is the proof, and the new race IT proves it red-capable. C is not
   safe under "stability first": it rewrites trust-ladder behaviour for a cosmetic problem.

If you pick B, the one-sentence spec for the lane: *advisory xact lock on the normalized name
before `findNearDuplicate`, loser of a concurrent same-name submit gets the existing 409; new
cross-user race IT asserting exactly one committed row.*

**Nothing here needs a person** — it is a pure owner call between A and B.

---

## D2 — The dev-map test shelters (`E2E Manual Shelter …`, `M5 Live Community Shelter`)

### What they are (verified against the live dev DB, 2026-09-28 03:30 EEST)

Four rows, all `ACTIVE`/`USER`, all orphaned (`created_by = NULL` — their author account was
deleted), all at (59.437, 24.754):

| id | name | created | description |
|---|---|---|---|
| 301 | M5 Live Community Shelter | 2026-09-06 19:47Z | "Live E2E check shelter" |
| 302 | E2E Manual Shelter 1788728089740 | 2026-09-06 20:56Z | "Created by the M6 manual E2E run." |
| 303 | E2E Manual Shelter 1788728300743 | 2026-09-06 20:59Z | "Created by the M6 manual E2E run." |
| 304 | E2E Manual Shelter 1788728605077 | 2026-09-06 21:03Z | "Created by the M6 manual E2E run." |

They were created by hand through the running app during the M5/M6 milestone E2E runs
(timestamp-suffixed names). **Nothing in the repository references them** — the only hits are
a review-snapshot JSON (`reviews/stale-decisions/fetches-sd1/api-shelters.json`). No test,
fixture, spec, SQL script or doc depends on these rows.

**How to check for them, one command:**

```
PGPASSWORD=sheltermap psql -h 127.0.0.1 -U sheltermap -d sheltermap \
  -c "SELECT id, name, status, source, created_by, created_at FROM shelters
      WHERE name ILIKE 'E2E Manual Shelter%' OR name ILIKE 'M5 Live Community Shelter' ORDER BY id;"
```

(Or via the app: the public `GET /api/shelters` / the dev map shows them; the admin shelter
list with `q=E2E` shows them with the moderation actions.)

### What removing them would touch

**Nothing.** All four have **zero dependent rows** (verified: 0 in `shelter_reports`,
`shelter_occupancy_reports`, `shelter_open_status`, `shelter_history`, `moderation_actions`,
`shelter_info_requests`). Two removal routes:

- **App route** (leaves an audit trail): `DELETE /admin/shelters/{id}` four times — each
  records a moderation-audit `DELETE` row and a `DELETED` history row, both rendering
  "Deleted shelter" afterwards.
- **One SQL command** (equally clean here, since nothing depends on the rows):
  `DELETE FROM shelters WHERE id IN (301, 302, 303, 304);`

Adjacent data you may or may not also want (each verified live):

- **The E2E test accounts** — users 5–8 (`M5 Live Check`, `E2E Manual Tester` ×3) still
  exist. Deleting them **cascades** their demo report rows (V1/V9 FKs are
  `ON DELETE CASCADE` on both sides), i.e. it would strip 4 of the 5 rows per report table
  on shelter 311 — see below.
- **Shelter 311 "Taltech"** is a separate orphaned row but it is the **community-pulse demo
  fixture**: `qa/taltech-pulse-demo-insert.sql` / `-cleanup.sql` target exactly
  `(311, users 5–8)`, and shelter 311 is one of *your* visual-check items (closing decisions
  §11 — "gauge needles on shelter 311"). Its 5th row in each report table is a real tap
  (user 64, 2026-09-20) — the cleanup script removes only the four demo pairs.
- **The other orphaned rows** — 310 "aru 13 kj", 313 "Jõhvi gymnaasium", 314 "ahtme maxima",
  315 "pargikeskus", 316 "Ahtme Grossi (Iidla Kaubanduskeskus)", 622 "TLU", 623 "Solaris
  Tallinn" — are orphaned USER rows whose names look like genuine community submissions
  whose authors later deleted their accounts. The erasure decision (closing decisions §7:
  public community rows stay) covers them.

### Recommendation

**Delete 301–304** (the one SQL command, or the four admin deletes if you want the audit
rows). They are unambiguous test artifacts — the milestone they verified shipped weeks ago,
nothing references them, and they are false "community shelter" entries on a crisis map.
**Keep 311** (live demo fixture; the qa scripts and your visual-check list point at it).
**Keep 310–316 and 622/623** unless you recognize them as test data — under the documented
erasure policy they are community data, and their value (per §7) does not depend on the
author. Only if you delete the E2E **accounts** 5–8 do you touch the 311 demo — decide the
accounts and the demo together.

**No person is strictly required** for the deletion itself; the one judgement is whether
622/623 and the 310–316 orphans are real (only you would know).

---

## D3 — The below-gate dependency advisories

### Established (fresh scan this session: `flock … mvn dependency-check:check` exit 0; report at
`/tmp/nextdec-report.html`; Maven Central metadata checked 2026-09-28)

Ten below-gate findings, all visible in the report, none failing the CVSS 7 gate:

| Finding | Score (v3 / v4) | Nature | Fixed release |
|---|---|---|---|
| **DOMPurify 3.4.11** inside swagger-ui webjar 5.32.7 — CVE-2026-66010 (NVD, CWE-79) | 6.1 / 5.1 | `afterSanitizeElements` hook not run for custom elements allowed via `CUSTOM_ELEMENT_HANDLING.tagNameCheck` → second-order XSS gadget | **3.4.12** ("DOMPurify before 3.4.12…") |
| **DOMPurify 3.4.11** — CVE-2026-75838 (RetireJS, unscored, medium) | — | refs: fix commit `3067f77`, PR #1557, **release 3.4.13**, GHSA-55q2-fjhq-7xh7 | **3.4.13** |
| **spring-data-jpa 3.5.13** — CVE-2026-47834 | 6.5 | "Sort validation can be bypassed when parameters containing crafted payload are accepted from untrusted sources"; affected 3.5.0–3.5.13, 3.4.0–3.4.15, 4.0.0–4.0.6, 4.1.0 | **no 3.4.x/3.5.x fix exists on Central** — the 3.4 line ends at 3.4.13 and the 3.5 line ends at 3.5.13 (verified in `maven-metadata.xml`); fixes ship only in 4.0.7+ / 4.1.1+ (the Boot 4 line) |
| **Spring Framework 6.2.19** — 5 findings CVE-2026-47883/47887/59280/59281/59314 | 6.1 each | CWE-601 open redirect | line ended at 6.2.19 — **Boot 4 only** (same as the 12 suppressed gate findings) |
| **Spring Security 6.5.11** — 2 findings CVE-2026-47842/59276 | 6.5 each | CWE-326 inadequate encryption strength | line ended at 6.5.11 — **Boot 4 only** |

**The DOMPurify/webjar boundary, measured from the jar bytes** (the pom pins 5.32.7 for
CVE-2026-65898; the two new advisories land on that exact fix release):

| webjar | bundled DOMPurify | clears |
|---|---|---|
| 5.32.7 (pinned) – 5.32.10 | 3.4.11 | nothing (both advisories stand) |
| 5.32.11 – 5.32.12 | 3.4.12 | CVE-2026-66010 only |
| **5.32.13 – 5.32.15** (5.32.15 is the latest, released 2026-09-14) | 3.4.13 | **both** |

**Exposure in this app is minimal:** the swagger UI is dev-only — `springdoc.api-docs.enabled`
defaults to `false` (`application.yml:66`) and `ApiDocsGuard` **refuses to boot** if the docs
flags are on outside dev/test (fail-closed, pinned by `ApiDocsGuardTest` /
`ApiDocsProdClosureIT`). When enabled, the rendered content comes from the app's own
annotations, not user input. The spring-data-jpa CVE is likewise **not reachable**: no
endpoint accepts a client-supplied `Sort`/`Pageable` (grep of `src/main/java`: zero `Sort.`
usages; paging is manual `limit`/`offset` through the `Pagination` vocabulary).

### Options

- **Bump the swagger-ui pair to 5.32.13** (5.32.15 if you prefer latest): `<swagger-ui.version>`
  in `pom.xml` **and** `springdoc.swagger-ui.version` in `application.yml:79` together — the
  webjar alone 404s every UI asset (proven, then reverted; pom comment at `pom.xml:36-49`).
  Same sanctioned mechanism as the already-landed advisory bumps (tomcat/jackson/
  commons-lang3/postgresql/log4j2): a patch/minor bump within the line, full suite as the
  behaviour proof. This closes FINISH-CONFIG's explicit hand-off ("if a patched
  DOMPurify/webjar exists that is the advisory lane's bump") — one now exists.
- **Leave all four groups**, relying on the gate staying green.

### Recommendation

**Bump the swagger-ui pair to 5.32.13 (or 5.32.15); leave the other three groups under the
Boot 4 watch.**

Reasoning: (1) reliability — it is the same in-line patch-bump pattern this repo has already
landed five times with the full suite green, and it removes the only below-gate finding with a
fix reachable *without* Boot 4; (2) recommendation — FINISH-CONFIG explicitly routed it to the
advisory lane once a patched webjar existed, and it exists; (3) safe — two config values,
no API/contract/copy change, dev-only surface.

**Watch conditions (the answer to "what to watch"):**

- DOMPurify pair: **closed by the bump** — no watch needed afterwards.
- spring-data-jpa 47834 + the 7 Spring below-gate findings: **no released fix on the 3.4/3.5
  lines** — the trigger is the **Spring Boot 4 migration** (the same dated trigger the 15
  suppression entries already name). No suppression entries are added for them (the decision
  keeps below-gate findings visible, not suppressed).
- **Rescore tripwire:** any of the ten rescored to ≥ 7.0 by a future NVD update fails the CI
  dependency-check job — that is by design (FINISH-CONFIG §5: a new finding to re-decide, not
  a silent widening). The CI scan runs on every push (`.github/workflows`, cached NVD data).

**Nothing here needs a person** — pure owner call (bump now vs defer both to Boot 4).

---

## D4 — The legal-review packet (the seven rows whose rewrites cut commentary)

### Established first: the trimmed text is already live

All three catalogs (EN/ET/RU) **already ship the trimmed values** — the copy pass landed in
commit `c406f5c` (2026-09-22), and `privacy-policy-page.spec.ts` was updated with it. The
"before" text exists only in `docs/i18n-review.md` (§"Rewritten — legal pages"). So the
review is of the **live** legal pages, and restoring any sentence means a value change in
three catalogs plus its spec pin — not a packet edit.

Cross-cutting, bigger than all seven: **`[LEGAL BASIS TO BE CONFIRMED]` still ships in all
three locales** (`legal.privacy.why.p2`; one occurrence each in `en.ts:1051`, `et.ts:1054`,
`ru.ts` — verified present). Article 6 legal basis is a hard GDPR requirement; the placeholder
is the largest legal gap on the page and is an owner decision the packet already marks.

### Row by row — what the removed text might have carried, and the exact question to ask

1. **`legal.privacy.scope.p1`** — cut *"It is intended to describe the application's actual
   behaviour."*
   Protective weight it could carry: **low-to-moderate, double-edged.** It asserted the policy
   accurately mirrors actual processing — supportive of a transparency claim, but also a
   self-declaration that any drift falsifies (it becomes a target, not a shield). GDPR
   accuracy duties attach to the processing, not to the document's self-description.
   **Question for the lawyer:** *Is it worth restoring an accuracy assertion in the policy —
   and if so, who keeps it in sync with the code — or is dropping it the safer posture?*

2. **`legal.privacy.why.p2`** — cut *"This document is intended to describe the processing;
   it is not a legal opinion."* (the `[LEGAL BASIS TO BE CONFIRMED]` sentence kept)
   Weight: **low.** A policy is never a legal opinion in law, so the disclaimer adds nothing
   enforceable; the "intended to describe the processing" half is the same accuracy framing as
   row 1. The row's real issue is the surviving placeholder, not the cut.
   **Question for the lawyer:** *none needed on the cut itself; the open question on this
   row is the legal-basis placeholder (see above) — what text replaces it per purpose, and
   does the operator confirm it before the page is treated as final?*

3. **`legal.privacy.retention.p3`** — replaced. Cut: *"Those periods are the app's retention
   rule. … it is off in this repository's development setup, and it is enabled by whoever
   operates a deployment. … are simply kept."* Now: *"Enforcement of these periods is a
   deployment-level switch (RETENTION_ENABLED): where the switch is off, inactive accounts
   and old audit records are kept."*
   Weight: **moderate, and this is the row to read carefully.** The cut sentence declared the
   24-month periods **the rule regardless of the switch**; the new text conditions enforcement
   on the switch. The code default is **off**
   (`application.yml:297-304`: the pruning job "ships disabled and whoever operates a
   deployment enables it"). So in a deployment running with the switch off, the policy states
   retention periods that are not enforced — the removed sentence was the bridge that kept
   the periods as commitments in both cases.
   **Question for the lawyer (and the operator):** *Is the production deployment running with
   RETENTION_ENABLED=true? If yes, the new conditional wording is accurate and fine. If no,
   the page overpromises and must either state the real (no pruning) behaviour or keep the
   "these are the app's retention rule" sentence.*

4. **`legal.privacy.security.p2`** — cut *"No security measure can guarantee absolute safety,
   but these measures reduce common risks."*
   Weight: **moderate.** The first half is the standard expectation-limitation most privacy
   policies keep (it pre-empts "you guaranteed safety" framing after a future incident); the
   second half is reassurance. The kept sentence enumerates the Article 32 measures, which is
   the substance.
   **Question for the lawyer:** *restore a short "no security measure is absolute" limitation,
   or is the bare enumeration of measures sufficient as-is?*

5. **`legal.privacy.cookies.p2`** — cut *"and there are no optional analytics or tracking
   technologies to accept or reject."*
   Weight: **low.** Its function was to explain the absence of a reject button on the consent
   banner. The retained `consent.body` already states the same fact on the consent surface:
   "It does not use advertising, analytics, or cross-site tracking, and it never sells your
   data" (kept verbatim, pinned by the banner spec).
   **Question for the lawyer:** *is the consent body's negation sufficient to make this clause
   redundant — i.e., does the privacy page need to restate that there are no optional
   trackers?*

6. **`legal.terms.liability.p1`** — cut *"This paragraph is intended to be reasonable and is
   subject to legal review;"* — the scope clause *"does not exclude liability that cannot be
   excluded by law"* was kept and **re-spliced** into one sentence: "…OpenShelter accepts no
   liability for decisions made in reliance on the list, **and this does not exclude
   liability that cannot be excluded by law.**"
   Weight: the cut is a **net positive** — a published "subject to legal review" clause is an
   admission that the limitation is unvetted; a lawyer would strike it, not defend it. The
   remaining risk is the splice itself: "and this does not exclude…" must read as the same
   carve-out (the limitation does not purport to exclude non-excludable liability), in all
   three languages (ET/RU drafts match the EN splice byte-for-byte in the packet).
   **Question for the lawyer:** *confirm the re-spliced sentence reads as the same limitation
   in EN/ET/RU, and that dropping the "subject to legal review" admission is acceptable*
   (expected: both yes).

7. **`legal.terms.rules.li4`** — cut *"to keep the list usable"* (the purpose clause before
   the limits list).
   Weight: **low.** A purpose clause can support proportionality/fairness arguments for the
   limits, but the anti-abuse purpose survives in the privacy policy
   (`legal.privacy.verification.p3`: "To prevent abuse, the application applies rate
   limits…"). The terms row still ends with "Exceeding a limit produces an error and a
   suggested wait; it is not a ban."
   **Question for the lawyer:** *is the purpose clause worth restoring in the terms (or does
   the privacy policy's "to prevent abuse" cover it)?*

### Recommendation

Send the seven framed questions above to the lawyer **as one packet** (each row's removed text
is quoted in `docs/i18n-review.md` with the before/after); the only rows with real protective
weight at stake are **3 (retention — also needs the operator's answer on RETENTION_ENABLED),
4 (security disclaimer)** and the splice confirmation in **6**. Rows 1, 2, 5, 7 are
recommended to stand as trimmed. **Order the legal-basis placeholder decision with the same
packet** — it outweighs all seven cuts. Nothing here can be decided from the codebase: the
weight of legal text is exactly what a lawyer (or the owner, with counsel) frames — the
questions above are the research's contribution.

---

## D5 — Other open questions found in the three documents

Status verified against `docs/autopilot/CODE-REVIEW-NOTES.md` and the current tree (2026-09-28).
**Closed, no action needed:** owner-queue items 2 (trust-snapshot backfill — decided: no
backfill, §6) and 3 (erasure policy — decided: keep, §7); board items 4 (`color-scheme: dark`
— landed: `styles.scss:925-931` sets it on both dark theme blocks, pinned by the
design-tokens spec), 9 (`requireRate`/`ClientIps` — landed as `auth/ClientThrottle` by
FINISH-P3-BE), 10 (`Pagination` move — landed, FINISH-P3-BE), 14 (GuidanceSearch duplicate
suites — merged, FINISH-P3-BE), 15 (guard census — extended by FINISH-COPY-GUARD), 18 (qa doc
citations — verified already re-pointed in `a1d73e2`), 22-F8 ("Malformed request" message —
landed, FINISH-P3-BE), 24 (README dated build-log ids — board verdict: dated history, accept).

Still open, each with the one-reading recommendation:

| # (board) | Question | Recommendation |
|---|---|---|
| 1 | `how.sources` **ET/RU** still describe the removed yellow triangle (`et.ts:94`, `ru.ts:99`; EN already fixed by FINISH-COPY-GUARD) | **Native review.** The model to encode: default community circle / yellow circle (one channel) / green circle (two or more), red = reported, blue = registry. Exact question: *rewrite these two values to match the EN at `en.ts:85` — what ET/RU wording do you want?* Needs a native speaker (this row predates the review packet, so no draft exists yet). |
| 2 | ET `admin.reports.dismiss` = "Arvelda" (catalog value verified: `et.ts:718`; EN "Dismiss", RU "Отклонить") | **Native review.** Packet records the recommendation (family-consistent, already shipped) + alternatives. One word; needs a native speaker. |
| 3 | Submit placeholders not ending "…" (en/et/ru convention) | **Native call** on the "e.g. …" convention; the packet carries the candidates. |
| 5 | Hero `sizes="400px"` over-declaration (actual render 200–320 px) | **Accept.** It can pick a slightly larger derivative, never a too-small one (no blur); the pin is the measured geometry (`guidance-hero-geometry.spec.ts:18-19`); re-measuring costs two spec edits for a mild bandwidth difference. |
| 6 | Submit button disabled while in flight | **Keep disabled-while-in-flight.** It is the app-wide pinned convention (frozen submit spec), and on the one write path where a double POST has real 409 side effects (the duplicate rule, D1), the disabled state is the double-submit protection. Changing it to stay-enabled + spinner is a look change with a behaviour regression risk on slow networks. |
| 7 | DESIGN-REVIEW:145 three proposals | **Apply #1** (`.anchor-line__clear` min-height to the app's 48 px control rule — a WCAG 2.5.8 target-size fix, two lines); **defer #2** (dense admin tab row — look change, no a11y defect, and the 48 px rows are the app's own convention); **apply #3** (`.panel-title` → `--font-weight-title`, one token, near-imperceptible but free while the file is open). |
| 8 | Limiter bean collapse | **Accept the nine `@Bean`s.** They are the documented throttle surface — one bean per named bucket with its own config, `@Qualifier`-contracted across four controllers. Collapsing into a `RateLimiters` record hides the buckets from the bean graph; no defect is served by the collapse. |
| 11 | `PhoneNumbers` move | **Keep it in `verification/`.** Two **applied** programmatic migrations (`V13PiiEncryptionMigration`, `V34BlindIndexFramingMigration`) import it and rule 5 forbids touching applied migrations; the only alternative is a legacy-package shim — new dead-weight machinery for a style issue. |
| 12 | `Shelter.applyOwnerEdit` domain method | **Defer.** The move's destination is an open design question (the same finding calls `app` the leftover bucket), and the carry-over hazard it would fix is now *written down once* in `ownerEditRow`'s javadoc (SIMPLIFY-SHELTER-CTRL). A style move with an undecided destination is not worth the anchor churn now. |
| 13 | Persistence SQL-drift self-enforcing pin | **Accept (skip).** Nothing is red without it: the page/count twins are one `adminWhere` builder (byte-identical SQL proven by the proxy-EntityManager harness) and `ShelterPagingCostIT` pins the statement shape. A permanent query-listener pin is machinery guarding a regression the single builder makes structurally unlikely. |
| 16 | Frozen pinned-spec prose/titles (5 core specs, 4 domain test files, 7 admin-page it-titles, 6 guidance spec lines) | **Authorise** — comment/title-only, guard-green today, cosmetic only; it is the run's residual debt and the only way it gets cleared. Low priority relative to D1–D4. |
| 17 | `community-review-queue` live-name citations (24 comments in 14 main files) | **Accept as resolvable.** The name is live and resolves; the guard correctly allows it; rewording 24 lines across 14 files buys nothing functional. |
| 19 | `.env:43` comment | **Leave** — untracked local file, not on the branch; `.env.example` is clean. |
| 21 | flock lock discipline | **Enforce: stop the dev server before any gate, and never run gates while it is up.** Live evidence this session: the dev server (`mvn spring-boot:run`, PID 525159, since 2026-09-27) plus a concurrent full build in this worktree wiped my scan report from `target/` within a minute — the 7th observed instance of rule-7's hazard (FINISH-COPY-GUARD recorded the 6th). Do **not** put `dev-start.sh` under the lock: a long-running dev server would hold it forever and serialize every lane gate behind it. The fix is discipline, not plumbing: dev server off during gates (or run it from a prebuilt jar, `java -jar`, so it never rebuilds `target/`). |
| 22-F7 | 26 `/admin/*` paths in the committed OpenAPI document | **Accept.** No runtime exposure: docs are dev-only and `ApiDocsGuard` is fail-closed; both proposed fixes cross lane/contract boundaries (documented in `p3-security-logging.md` §P3-B.2). |
| 22-F9 | Loopback `X-Forwarded-For` trust on by default; limiter bucket sweep residual | **Accept as the documented residual.** The default exists for the documented dev workflow (local Angular proxy on loopback), the guard warns on non-dev deploys, and the bucket map is swept (1024 entries / 1 h idle); a hard cap is a behaviour change to all nine shared buckets that no current threat justifies. |
| 23-N1 | api-resident services move | **Defer** — same reason as item 12 (destination undecided, anchor churn, `app` is the bucket the finding itself criticises). |
| 23-N2 | `MAX_REDIRECT_HOPS` unification (`<3` vs `<=3`) | **Do not unify; document the difference.** The two services genuinely have different budgets on purpose: the short-link resolver is a fast public path (max 3 fetches), the hero import is an admin-only fetch (max 4). Unifying changes one of them' behaviour — a change to buy a shared constant. (If you do want one policy, the question to answer first: *which fetch budget is the policy — 3 or 4 redirects max?*) |
| 23-N4 | Retention IT harness trade | **Accept** (documented evidence trade-off in the report). |

Plus the standing **OWNER** items that only a person can close (already framed in
`docs/closing-decisions-2026-09-24.md`): the ET/RU native sign-off of the whole packet
(including the 38 new strings), the `gh` token (CI 403/401 root cause), and the §11 visual
checks (needs eyes — jsdom cannot measure rendered output).

---

## Concurrency note (evidence integrity)

While this lane worked (03:25–03:35 EEST), other Maven activity ran in this worktree: my first
scan's report (written 03:25:25 to `target/dependency-check-report.html`) was wiped within a
minute, a full compile+test+package+PMD build ran 03:30:50–03:33:11, and a dependency report
was written again at 03:35:05. A formatting-only change in
`frontend/src/app/gateways/guidance-gateway.spec.ts` (not made by this lane) is uncommitted in
the tree. All of this lane's evidence is preserved outside `target/`
(`/tmp/nextdec-report.html`, `/tmp/nextdec-scan*.log`, psql output quoted above), so the report
stands on captured data; the wiped-file incident is itself further evidence for D5 item 21.

## What I could not confirm

- **Which process** deleted the first scan report and ran the 03:30–03:33 build (concurrent
  lane/session activity is proven by the mtimes; the actor is not).
- **Native-language judgement** on the ET/RU strings (D4 cross-cutting, D5 #1–3) — needs the
  native reviewer; I state the questions, not the answers.
- **Legal weight** of the seven cuts (D4) — needs a lawyer; framed, not answered.
- Whether rows **622 "TLU" / 623 "Solaris Tallinn"** and the 310–316 orphans are genuine
  community submissions or further test data — the names and the erasure policy say keep;
  only the owner knows the history.
- The NVD state is a **point-in-time snapshot** (today's scan); a rescore above 7.0 on any
  below-gate CVE would change D3's "watch" into a "decide" — that is the designed tripwire.
- "The booking/audit path" was read as the submission write/audit path (the `lockForUpdate`
  row lock + the `shelters.version` optimistic lock, both proven by race ITs). If a different
  path was meant, say which and the mapping above shows which guard covers what.
