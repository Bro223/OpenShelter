# Review process — hierarchical multi-agent code review

The reusable methodology behind the 2026-09-08 OpenShelter review
(1 orchestrator + 4 leads + 14 children, all non-orchestrator agents on
`hpc-vllm/Qwen3.8-27B` via vLLM). This document is deliberately general —
it captures the process, not the findings. The full verbatim output of the
2026-09-08 run lives in `2026-09-08-review-output.md` (gitignored — see
[Git-push safety analysis](#git-push-safety-analysis)).

## Why 4 area leads

The review was split along the seams the repo is itself organized by, each
with a lead (parent agent) plus 3–4 children:

| Area | What it covers | Why a lead is needed |
|---|---|---|
| backend | all of `src/` (auth, api, domain, persistence, ingestion, config) | largest surface; contract docs in `context-and-tasks/agent/` |
| frontend | all of `frontend/src` (core, gateways, features, shared, styles, specs) | contract docs in `frontend/docs/agent/` |
| architecture | layering, package/module boundaries, API contract, docs↔code consistency | cross-cutting: must see both stacks and all docs at once |
| security | authn/authz, one-time codes & rate limiting, input/transport/data exposure | different bar: each claim is judged for exploitability, not just "is it a bug" |

Rationale: (a) each area has an agent doc pack a lead can ground in before
reviewing, so children review code *against* the documented contract rather
than against their priors; (b) the lead is a parent — it carries the
whole-area context and can independently re-verify its children's claims;
(c) 3–4 non-overlapping sub-scopes per lead keep each child's scope small
enough for a 27B-class local model to hold in context; (d) cross-child and
cross-lead conflicts are resolved at the lead/orchestrator layer, where
both sides of a claim are visible.

## Agent tree & runIds

runIds are provenance: each identifies one subagent conversation, so any
claim in the output can be traced back to the agent that produced it.

| Lead (runId) | Children (runId — sub-scope) |
|---|---|
| backend — `sa-923898c7` | `sa-ee69af8c` — auth & account · `sa-77fc336e` — shelter & review domain/API · `sa-bfdd63f7` — persistence & ingestion · `sa-93159a9c` — test quality |
| frontend — `sa-a86b5218` | `sa-ba619bf0` — core & state · `sa-e891b812` — map & shelter · `sa-25d40da3` — account & contributions · `sa-ab44f68f` — shared, styles & test quality |
| architecture — `sa-cb6ff54e` | `sa-10528d48` — backend layering & config · `sa-92a59459` — frontend architecture · `sa-12477e97` — API contract + docs consistency |
| security — `sa-b6269147` | `sa-db9a33a3` — authn/authz & IDOR · `sa-f305f77d` — codes, brute force & rates · `sa-f5ade5bb` — input, transport & data exposure |

## Lead workflow (per lead)

1. **Ground.** Read the relevant agent doc pack (`00-README.md` → the
   context files), the repo structure, and the diagrams. Verify the
   baseline itself — run the test suite(s) the lead is accountable for and
   confirm the green counts — before trusting any claim about them.
2. **Partition.** Split the area into 3–4 non-overlapping sub-scopes, each
   with named entry files.
3. **Spawn.** One `subagent_spawn` per child: explicit `model` param
   (`hpc-vllm/Qwen3.8-27B`), type `review`, cwd = repo root, and the
   self-contained brief (anatomy below).
4. **Wait.** `subagent_wait_all` in ≤960 s windows (the tool's timeout cap);
   loop until all children are terminal. On the saturated 2026-09-08 run
   children took 40–80 min wall, so each lead expected several loops.
5. **Re-verify & consolidate.** Independently re-check **every high/med
   claim against source** (file reads, greps, migration statements, test
   runs) — no claim survives on a child's word. Drop false positives with a
   written reason. Emit the consolidated report: child table with runIds,
   per-child summaries, deduplicated findings (W/N with `file:line`,
   severity, fix), per-area verdicts, and suggested fix priorities.

## Child brief anatomy

A child has no access to the parent's context, so the brief must be
self-contained. Required parts:

- **Repo path** (absolute) and **baseline state** (commit, test counts,
  clean tree) — so the child can separate pre-existing state from review
  output.
- **Exact sub-scope**: the entry files/directories the child owns, plus the
  doc files that define the contract for that scope.
- **Review-only mandate**: read-only; no file modifications, no commits
  (this kept the working tree clean across all 17 review agents).
- **Method hint**: verify against source, cite `file:line`, classify
  severity (high/med/low).
- **Output format**: findings as **W** (worth fixing) / **N** (nit), each
  with `file:line`, severity, problem, and a concrete fix.
- **Baseline verification where relevant** (e.g. "run the suite and report
  the green count").

## Verification protocol

- **Lead re-verification.** Every high/med claim is re-checked by the lead
  against source before it enters the consolidated report. In the
  2026-09-08 run this corrected line-number drift and merged within-lead
  duplicates; the high/med set itself held up.
- **False positives are dropped with a written reason**, kept in the output
  for audit (3 dropped in the 2026-09-08 run; the reasons are preserved in
  the verbatim output).
- **Cross-lead dedup.** The orchestrator merges same-root-cause findings
  reported by multiple leads (fix once) and produces the priority batches
  (P0–P4 in the 2026-09-08 run). The dedup map is preserved in the verbatim
  output.

## Practical notes

- **Single-vLLM-endpoint saturation.** 18 concurrent 27B agents on one vLLM
  endpoint saturated it: children took 40–80 min wall. Budget for that; do
  not raise concurrency on a single endpoint — add capacity instead.
- **960 s wait windows.** `subagent_wait_all` is capped near 960 s; the
  orchestrator loops on the returned unfinished list rather than blocking
  longer.
- **runIds as provenance.** Every lead/child is cited by runId in the
  output; any finding can be re-opened in its agent's conversation.
- **Review-only, fix-separate.** No review agent may modify files; fixes
  run as a separate campaign with its own docs (`fix-process.md` + a
  gitignored per-issue log) so the review record stays an unmodified
  observation of the reviewed commit.

## Git-push safety analysis

Decided before any file was written, because the detailed output documents
unfixed vulnerabilities.

### Evidence

1. **Remote.** `git remote -v` → `git@github.com:Bro223/OpenShelter.git`.
   The URL reveals nothing about visibility.
2. **Remote state.** `git ls-remote origin HEAD` succeeds → the repository
   exists and is reachable over SSH.
3. **Unauthenticated visibility probes** (the authoring environment has no
   valid GitHub token — `gh` reports an invalid token):
   - `GET https://api.github.com/repos/Bro223/OpenShelter` → **404**. A
     public repo returns 200; GitHub answers 404 (not 403) for private repos
     to unauthenticated clients, hiding their existence.
   - `https://github.com/Bro223/OpenShelter` (web) and
     `raw.githubusercontent.com/Bro223/OpenShelter/HEAD/README.md` → both
     **404**.
   - Reading: the remote is **very likely private**, but this is not
     *verifiable* from the authoring environment (no authenticated API
     access). Per the rule below, unverified visibility is treated as
     **unknown**.
4. **Content scan of the detailed output.**
   - **Secrets/credentials:** no new exposure. The output mentions the
     committed dev JWT secret only by its truncated prefix
     (`dev-only-secret-change-me-…`); the full value is already committed
     in `src/main/resources/application.yml` as a dev default, so the output
     adds no new secret. No other keys, tokens, or passwords appear.
   - **PII:** none. The only phone-like values are test fixtures
     (`PhoneNumbersTest.java` E.164-normalization examples, echoed in source
     comments). No real user data.
   - **Actionable attack detail:** **present**. The output documents, with
     concrete attack mechanics, the four P0 security findings (S1–S4 in the
     verbatim output) that were unfixed in the reviewed tree at the time of
     writing: an unthrottled password-reset confirmation path whose rotation
     resets the attempt cap; rate-limit keying that is attacker-controllable
     behind an appending proxy; a fail-open guard for the production JWT
     signing secret; and a concurrent refresh-token rotation race.

### Decision rule

If the remote is public, **or** visibility is unknown, **or** the output
contains actionable attack detail for vulnerabilities not fixed in the same
commit → the detailed output is **excluded from git (gitignored)** and only
the general process documents are committed. When in doubt: gitignore.

### Decision

**Excluded.** `2026-09-08-review-output.md` and `2026-09-08-fix-log.md` (the
fix campaign's per-issue log — same sensitivity class, written later by the
fix orchestrator) are listed in `docs/code-review/.gitignore` and are not
committed. Both the "visibility unknown" and "actionable attack detail for
unfixed vulnerabilities" clauses are independently satisfied, so the
decision holds even if the remote is in fact private; the latter clause
alone would be enough.

**Revisit condition.** Once the P0 fixes (S1–S4) are merged and those
findings are fixed in-tree, the output can be re-evaluated for committing;
until then it stays local-only, and this section should be updated with the
re-evaluation outcome.

## Re-running a similar review

1. **Freeze a baseline.** Commit the work, run the full test suites, record
   commit + green counts. The review records this state.
2. **Spawn one lead per area** (backend, frontend, architecture, security —
   or whatever seams the repo is organized by) on the local model, each
   with the lead brief: ground in the area's agent doc packs → verify the
   baseline → partition into 3–4 sub-scopes → spawn children with
   self-contained briefs (explicit model param) → wait in ≤960 s windows →
   independently re-verify every high/med claim → consolidate with
   per-area verdicts.
3. **Cross-lead dedup at orchestrator level.** Merge same-root-cause
   findings, drop residual false positives with reasons, agree the fix
   priority batches (P0 security first, then by area, docs drift last).
4. **Preserve the output.** Save the full verbatim lead reports + dedup as
   `docs/code-review/<YYYY-MM-DD>-review-output.md`, re-run the git-push
   safety analysis for that file, and update `docs/code-review/README.md`
   (counts/severity summary only).
5. **Fix separately.** A separate fix campaign executes the batches and
   writes `fix-process.md` + a gitignored per-issue log in this folder.
