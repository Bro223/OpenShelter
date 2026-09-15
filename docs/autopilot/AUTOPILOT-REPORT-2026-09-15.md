# OpenShelter autopilot hardening run — report (2026-09-15)

**What this was.** An owner-requested autopilot run over the whole OpenShelter repo: inventory every
code/doc/diagram surface, fix what is wrong, keep the docs and PlantUML in sync with the shipped
state, add Swagger/OpenAPI, and keep working unattended — with the free TalTech model
(`hpc-vllm/Qwen3.8-27B`) doing the token-heavy work and `deepseek/deepseek-flash` orchestrating —
resuming automatically if a lane died.

**Budget.** Started 2026-09-14T23:19:44Z, soft stop 3 h, hard stop 4 h. Four waves ran inside the
soft budget. This report was written at the soft-stop boundary.

**Headline.** 68 inventoried rows → **7 tracked work rows open** (plus a separate list of
orchestrator-found follow-ups). Three waves are committed; the fourth is verified green but its
commit is outstanding (see *Not finished* below, which includes a tooling failure that hit at the
end of the run).

---

## 1. Where the repo stands

### Committed (9 commits, tree was clean after each)

| Commit | Content |
|---|---|
| `18a1cd7` | wave-1 artifacts (ledger, runlog, state) |
| `c7983e5` | wave-1: docs/PUML — the deleted review model removed from the context pack + all 14 checked-in renders regenerated |
| `af13fb1` | wave-1: **backend hardening + Swagger/OpenAPI** (landed together on purpose — see §3) |
| `4fb4b32` | whitepaper corrections (the P2 pass's last artefact) |
| `b052aa5` | wave-3 artifacts |
| `3227090` | wave-3: frontend focus-after-destroy, map-doc truth, complete API diagram |
| `cf5261a` | wave-3: Swagger DTO descriptions + `.env`-free closure proof |
| `610068b` | wave-2 artifacts |
| `4c4dcd6` | wave-2: frontend a11y + shared primitives |
| `1702770` | wave-2: docs/PUML/OpenSpec truth sweep + capability rename (D21) |

*(The earlier P2 batch from the owner's audit is also committed: `8e7510e`, `a794bdf`, `baf8fc7`,
`1d801bc`, `d4c66a9`, `66dc5ae`.)*

### Gate results (all run by the orchestrator; the lanes have no shell)

| Wave | `mvn clean test` | `npm test -- --watch=false` | `openspec validate --all` |
|---|---|---|---|
| 1 | 679, 0 failures | 870, 41 files | 28/28 |
| 2 | untouched (0 Java files changed — proved by grep) | **951**, 42→43 files | 28/28 |
| 3 | **705**, 0 failures | **953**, 45 files | 28/28 |
| 4 | **719**, 0 failures | **953**, 45 files | 28/28 |

### Independently reviewed

Every wave got a fresh-context read-only reviewer, and each verdict was checked against the tree by
the orchestrator rather than taken on trust:

- wave 1: `needs-fix` — two P0 blockers (a test reflecting an empty annotation set; `x-admin-only`
  never reaching the document). Both fixed by the orchestrator, then re-verified.
- wave 2: `needs-fix` — narrowed to docs: three files **no workstream owned**. Code declared
  "correct and keepable".
- v4 (orphan wave): `OK with notes` for its code; its P1 (surviving deltas would re-introduce
  removed review text) became `ORCH-12`.
- wave 3: `needs-fix` — code keepable; three findings (`ORCH-19/20/21`) plus two process concerns
  already resolved by the orchestrator.
- wave 4: **`safe-to-keep`**, "no runtime regression", per-row verdicts: `ORCH-5`, `B4a`, `B5`,
  `B9`, `TG1`, `TG2`, `ORCH-6` done; `F-16` partial-by-design; `ORCH-12` partial (still not
  archive-safe → `ORCH-22`).

---

## 2. What actually changed

### Swagger / OpenAPI (the owner's explicit ask; wave 1, refined in 3)

- `springdoc-openapi-starter-webmvc-ui` **2.6.0** pinned as a property (the line aligned to Boot
  3.3.x/Java 21); no actuator starter, so actuator exposure stays `health,info`.
- A **third fail-closed boot guard** (`ApiDocsGuard`) mirroring `DevEndpointsGuard`: docs are
  **off by default**, enabled only via the gitignored `.env`, and on a non-dev profile the app
  refuses to start. `ApiDocsProdClosureIT` proves from a production-profile boot that
  `/v3/api-docs*` and `/swagger-ui*` are never 200 — and after wave 3 that proof **no longer
  depends on the untracked `.env`**.
- `OpenApiConfig`: info/contact/licence, `bearerAuth` scheme matching the JWT filter, one
  `ErrorResponse` shape attached to 400/401/403/404/409/429/500, public/account/admin groups that
  match no `/dev` or `/actuator` path, and `x-admin-only` on every `/admin/**` operation.
- Annotations promoted from existing javadoc across 9 controllers and the DTOs (never inventing
  prose); `/dev` controllers `@Hidden`; admin-only PII carriers and the credential response
  labelled as such.
- **Non-drift tests**: `OpenApiContractIT` (exact 43-operation inventory, bearer scheme, admin 403
  - extension, public-vs-authenticated split including the `/mine` trap, forbidden-content sweep for
  `emailHash`/`phoneHash`/`v1:`/key names/dev defaults), `OpenApiSnapshotIT` (committed
  `docs/api/openapi.json` compared with recursive key normalization), `ApiDocsGuardTest`,
  `ApiDocsProdClosureIT`, and a frontend spec asserting every gateway URL exists in the snapshot.
- **Ruling recorded (`ORCH-14`)**: the 8 domain enums are deliberately **not** annotated — `domain`
  is pure Java (a verified invariant), and the ledger row contradicted itself. Per-value prose, if
  ever wanted, belongs in a springdoc `ModelConverter` or a DTO field, never in `domain`.

### Docs and PlantUML brought back in sync (waves 1–3)

The single largest class of defect was documentation describing the review/rating model that
migration `V21` deleted (9 of the inventory's P0s were whole documents):

- Every `.puml` in `context-and-tasks/` corrected — including `04-ingestion.puml`, which documented
  the dead Maa-amet WFS pipeline as *the* client while the shipped default is the official CSV
  client, and `05-shelter-api.puml`, which now also lists **all ten** `ShelterController`
  operations (`ORCH-18`).
- `frontend/docs/05-shelter-review-flow.puml` was the removed feature end-to-end; it is now the
  shelter-detail / trust-reports / submission flow, keeping its historical filename with a header
  explaining why (deleting it would have orphaned three documents that cite it).
- The written contracts (`context-and-tasks/agent/**`, `frontend/docs/agent/**`), the maintained
  whitepaper + its one-page brief, `docs/security/threat-model.md`, `README.md` and
  `qa/feature-matrix.md` corrected against the shipped surface.
- OpenSpec: the removal of the review model is now recorded as an archived change; the two current
  specs that pinned review/rating behaviour were unpinned; `D16`'s dead delta was removed with its
  rationale moved to the change's `design.md`; `D21` renamed the capability directory to
  `openspec/specs/shelter-detail`; `ORCH-12` stripped the remaining review/rating text out of the
  un-archived trust change's deltas so archiving it can no longer resurrect removed spec text.
- **All 26 checked-in diagram renders regenerated** through the repo's own `render.sh`
  (both `context-and-tasks/out/` and `frontend/docs/out/`), content-verified (e.g. `now : Instant`
  present in `03-auth.svg`, `Trust Reports` in the rewritten flow diagram).

### Backend hygiene

- The 7 auth request payloads are now bounded (`@Size`), closing a path where an over-long password
  reached Argon2 before the per-IP limiter (which counts requests, not bytes).
- **Zero `Instant.now()` remain in `src/main`**: `Clock` is injected or the instant is
  caller-supplied across services, domain types, the error handler and the JPA repositories.
- `/admin/**` carries `.hasAuthority("ADMIN")`, granted from a **fresh per-request `isAdmin` read**
  in the JWT filter (never from token claims), with all 15 in-handler `requireAdmin()` checks kept
  as the second layer.
- Production-dead repository seams from the earlier audit stay removed; the two the earlier pass
  deferred were finished, with their coverage **rewired onto surviving production APIs** rather
  than deleted.
- New tests: `AccountServiceTest` (erasure/export orchestration), `JwtAuthenticationFilterTest`
  (accept/expire/malformed/absent), and the `ORCH-5` repair below. Backend went 679 → 719 tests.

### Frontend

- **Accessibility (WCAG)**: a real skip-to-content link, keyboard-reachable admin table wrappers
  (`tabindex=0 role=region` + labels), a tab strip that no longer claims to be a tab widget it does
  not implement, focus that moves to a destructive confirm and returns to its trigger, announced via
  `role=status`, extracted into one `ConfirmAction` primitive adopted at all four sites, and focus
  landing in `#main` after a successful destroy.
- **i18n**: the skip link is catalog-driven (`nav.skip` in both EN and ET, typed so parity is a
  compile error) instead of hardcoded English (`ORCH-6`).
- New shared primitives with specs: `prepaint.ts`, `geolocation.ts` (one typed implementation
  replacing a duplicated mechanism), `form-helpers.spec.ts` (the last untested shared module).
- Frontend went 870 → 953 tests across 41 → 45 files.

### The guard that never guarded (`ORCH-5`)

`shelter-map`'s `ShelterRequestConstraintParityTest` reflected
`RecordComponent.getAnnotations()` — always empty for Jakarta constraints — so it compared two empty
maps and had **never asserted anything**. It now reads the backing field, pins the absolute bound
set, and has a non-vacuity assertion. The wave-4 reviewer independently confirmed that removing a
bound now fails it. A test that silently protected nothing is the single most valuable thing this
run fixed.

---

## 3. How the run was operated (and what it cost)

- **Children have no shell.** Every lane returned `read/grep/find/ls/edit/write/contact_supervisor`;
  the runner's own stderr documents `host runtime tool availability omitted [bash]`. Consequence:
  lanes analyse and edit, **the orchestrator runs every gate and every commit**. Four defects in
  lane-authored code were caught only by that arrangement (three compile errors in `OpenApiConfig`,
  two test-compile breaks, a contract guard that double-rooted paths and scanned doc comments, and the
  `x-admin-only` extension springdoc never surfaced).
- **Model policy, measured rather than assumed.** The free `hpc-vllm/Qwen3.8-27B` endpoint was
  probed: `GET /models` answered in 0.1 s but a completion took **86.2 s for 8 tokens (~0.09 tok/s)**
  and returned empty content, so four lanes produced nothing in three minutes. Heavy lanes were
  switched to `deepseek-flash` and the policy recorded in `STATE.json` with a **switch-back rule**;
  a re-probe minutes later returned 23 tokens in 0.4 s, so heavy lanes moved **back to the free
  Qwen model** and all four waves' fixer lanes ran on it (planners/reviewers on flash). The model
  choice is **data-driven**: the planner echoes `STATE.json → model_policy.active.token_heavy`.
- **Autopilot mechanics.** A project-wide schedule (every 20 min, `overlap: skip`) decided per fire:
  budget spent / ledger complete / still inventorying / else resume up to three file-disjoint
  workstreams from the ledger, each fixer followed by a fresh read-only reviewer and a state-writer
  that closes rows **only** where the reviewer agreed. Durable state lives in
  `docs/autopilot/{STATE.json,findings/LEDGER.md,RUNLOG.md}`.
- **Recovery was exercised, not just designed.** Waves fired while another was mid-flight
  (`overlap: skip`), one wave was stopped on a *misdiagnosis of mine* and the two orphaned lanes
  were steered to finish cleanly (their work was verified and folded in), one orphaned state-writer
  was intercepted with instructions so it **added** its record instead of clobbering two waves'
  history, and one lane escalated a genuine self-contradiction in the ledger (which produced the
  `domain`-purity ruling above).

---

## 4. Open work (tracked, with owners)

**Tracked work rows: 7.** Seven of the original 68 remain, plus orchestrator-found follow-ups:

| Row | What | Owner |
|---|---|---|
| `B4a/B5/B9/TG1/TG2` | **Closed by wave 4** (kept here only because `STATE.json` has not yet been recounted) | — |
| `F-16` | `takeUntilDestroyed` migration: the wave-4 lane **disproved the row's premise** (the teardown bodies dispose a Leaflet map / stop a countdown; the one `.unsubscribe` is in a WS-3-owned file that documents completing on route deactivation). Left open as a **ledger-cell correction**, not code | next frontend wave |
| `D21` | capability rename — **done in the tree** (`openspec/specs/shelter-detail`), tagged by the wave-3 record as left untagged | — |
| `ORCH-8` / `ORCH-23` | Two **pre-existing** un-archivable deltas (`factual-reports-rating-demotion`, `remove-national-id`), plus the reviewer's finding that the *whole* `factual-reports-rating-demotion` delta set still specifies review/rating text — not just its `shelter-reports` file | next docs wave |
| `ORCH-9/10/11/13/16/17/19` | Docs residue: the frontend build pack's unowned files, the domain doc's retired `ShelterStatusFlag`, the stale re-render notes, the API diagram's operation count (`ORCH-18` also) | next docs wave (ownership is now a **glob**, see below) |
| `ORCH-20` | Focus fires on every `NavigationEnd`, so `main#main`'s `focus()` can override back/forward scroll restoration; plus the `firstNavigation` one-shot gap | needs a semantics decision |
| `ORCH-21` | `ORCH-4`'s closure IT now constructs a real `TwilioSmsSender` (safe today; future assertions must not expect a live send) | next backend wave |
| `ORCH-22` | **Decision needed**: the trust change's deltas still pin a retired `statusFlag` field/shape, so the change must not be archived until that requirement is resolved | **HUMAN** |
| `ORCH-24` (below) | Latent formatting quirk in the repaired guard (`Size(min=5, )` when only `min` is set) — unreachable today | next backend wave |
| `ORCH-7` | Manual keyboard pass (skip link → page, Delete → Confirm → Cancel → return; back/forward + scroll position per `ORCH-20`) | needs a browser |
| `H-B8`, `H-D22` | Pre-existing HUMAN rows: the two tracked TODOs (PostGIS/bbox, licence wording) and the orphaned `qa/` + `.agent-orchestration/` sets (link-or-move, **do not delete**) | owner decision |

**A structural fix worth keeping.** Three separate reviewers found files still describing the
removed feature that **no workstream owned**, because the ledger enumerated ownership file-by-file.
The docs workstream's ownership is now the **glob** (`context-and-tasks/agent/**`,
`frontend/docs/agent/**`, plus every `*.puml`), so a file cannot hide from the next sweep.

---

## 5. Not finished (read this before continuing)

1. **[RESOLVED 2026-09-15T12:25:54Z]** **Wave 4 is now COMMITTED** as 68f431a (backend), 23192fc (frontend) and 96a54b9 (openspec), with the artifacts + this report in 0b4d367. The text below records the state as it stood at the soft-stop boundary. (original) **Wave 4 is verified but not committed.** Its gates ran green on the wave-4 tree —
   `mvn clean test` **719/0/0**, `npm test` **953 passed / 45 files**, `openspec validate --all`
   **28/28**, plus the focused `ORCH-5` + parity + two new test-class runs — and wave 4's reviewer
   returned `safe-to-keep` with no runtime regression. The tree holds 17 changed/new files
   (`frontend/src` i18n + shell spec; `src/main` + `src/test`; `openspec/changes`; the state files).
   The commit is outstanding **because `bash`/`git` became unavailable to the orchestrator at this
   point in the run** — not because anything failed.
2. **[RESOLVED 2026-09-15T12:25:54Z]** **The wave-4 state record landed**: the wave-3 and wave-4 writers both completed; `STATE.json` now reads wave 4 with `open_items: 1`, and LEDGER/RUNLOG carry the wave-3 and wave-4 blocks. (original) **Wave 4's state-writer had not written when this report was produced** (`STATE.json` still reads
   wave 3, `open_items: 7`; the RUNLOG has no wave-4 block). Its brief is correct and it may still
   land; if it does not, the record it owes is: tag `B4a/B5/B9/TG1/TG2/ORCH-5/ORCH-6` `[closed W4]`,
   keep `F-16` open with the disproof note, keep `ORCH-12` partial (→ `ORCH-22`), append a
   `## Wave 4` block, and set `open_items` to the true recount.
3. **Three P2 record-accuracy fixes the wave-4 reviewer asked for** — **APPLIED** by the orchestrator at the
   soft-stop boundary (no code impact):
   - the RUNLOG's `TG2` line now carries a correction block: only **2 of 7** cases assert the chain
     continued (`:60,78`); the record no longer overstates the file;
   - the `ORCH-12` RUNLOG line's "safe to archive" claim is replaced by an explicit "NOT yet
     archivable — decide `ORCH-22` first" correction;
   - **`ORCH-23` added** to the ledger: the reviewer found the *whole*
     `factual-reports-rating-demotion` delta set still specifies `reviewed=true`/`Reviewed` chip/star
     summary, not just its `shelter-reports` file that `ORCH-8` named.
4. **`STATE.json`'s `model_policy.reason` prose is stale** — **APPLIED**: it now records the measured
   degradation, the 23:27Z recovery and that heavy lanes ran on the free `hpc-vllm/Qwen3.8-27B`
   model for all four waves (only orchestrators and reviewers used `deepseek-flash`).

### Resume instructions (exact)

```bash
cd /home/aleks/MyScripts/LocalRepos/OpenShelter
git status --porcelain                      # expect the wave-4 set (17 files)
mvn clean test                              # expect 719, 0 failures
cd frontend && npm test -- --watch=false    # expect 953 passed / 45 files
cd .. && openspec validate --all            # expect 28/28
# then commit wave 4 in logical groups, e.g.:
#   backend tests/guard  |  frontend i18n  |  openspec deltas  |  autopilot artifacts
```

Autopilot schedules: the v5 wave schedule is **paused** (`9a6a80a9`, safe to resume), v4
(`5dfed72f`) is paused and still holds a stuck run record, and 9 paused
`openshelter-*-watch*` schedules from earlier sessions are inert and safe to delete.

---

## 6. Durable lessons from this run

- **A test can be green and assert nothing.** `ORCH-5`'s guard reflected a surface Jakarta
  annotations never populate, so it compared empty maps for months. Any "parity/guard" test that
  reflects annotations deserves a non-vacuity assertion.
- **Never hand-edit a generated artefact.** A lane hand-synced `docs/api/openapi.json`; the
  regeneration produced no diff, but only the re-run proved it — treat the generator as authority.
- **Split ownership by glob, not by list.** Three reviewers found unowned files that were invisible
  precisely because ownership was enumerated.
- **Verify lane claims; do not merge self-reports.** Every wave had at least one real defect that
  only the executable gate caught, and one reviewer claim (a "vacuous" sibling test) that was worth
  acting on.
- **Judge a child by the tail of its log.** The head is the prompt — reading it once caused a
  healthy wave to be stopped on a misdiagnosis.
- **Tool output can be truncated before you see it**: counts derived from pipes (`... | wc -l`) once
  reported 12 for a 61-entry tree. Materialise to a file and count the file.
- **`pkill -f <pattern>` matches its own shell**; use explicit PIDs.
