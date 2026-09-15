# Agentic development approaches used in this repository

How OpenShelter is built with AI agents: the topologies we use, the context and model economics,
the verification discipline, the records that survive an agent dying, and the failure modes we have
actually hit. Written from observed runs, not from theory — every claim below points at an artifact
in this repo.

This is the umbrella document. The campaign-specific write-ups stay where they are:

| Document | Covers |
|---|---|
| `docs/code-review/review-process.md` | Hierarchical multi-agent review (4 area leads + children, brief anatomy, verification protocol) |
| `docs/code-review/fix-process.md` | Fix campaigns (parallel by ownership, serial by gates, verify-before-fix, gate discipline) |
| `docs/autopilot/AUTOPILOT-REPORT-2026-09-15.md` | The 4-wave hardening run (what it changed, what it cost, durable lessons) |
| `docs/autopilot/findings/LEDGER.md` | The ranked work ledger with per-row ownership (the record format we reuse) |
| `.agent-orchestration/` | An earlier single-pass run's own ledger, decision log, model-usage note and risk register |
| `context-and-tasks/agent/*`, `frontend/docs/agent/*` | The shipped agent context packs (brief-ready domain/API/task context) |

---

## 1. The four non-negotiables

1. **Spec first.** A feature starts as an OpenSpec change (`openspec/changes/<name>/`: proposal,
   design with numbered decisions, spec deltas, task list). Implementation does not start until the
   decisions are written down and `openspec validate --all` is green. Specs are the source of truth;
   when a feature is deleted, the deletion gets its own change record
   (`openspec/changes/archive/2026-09-14-remove-shelter-reviews/`).
2. **One writer per file.** Every workstream owns an explicit file list, and no two concurrent lanes
   may share a file. When ownership was enumerated file-by-file, files nobody listed were missed
   three times, so ownership is now assigned by **glob** (`context-and-tasks/agent/**`).
3. **Children do not self-verify.** Agent lanes have editing tools but **no shell** — the host omits
   `bash` from the child allowlist (recorded in a runner diagnostic). So no lane can compile, test or
   commit. The orchestrator runs every gate and makes every commit.
4. **Gates decide, not prose.** A lane's "done" is a claim; `mvn clean test`, `npm test
   -- --watch=false` and `openspec validate --all` are the verdict. Every wave in the autopilot run
   was gated green before it was committed.

## 2. The topologies we actually use

Pick the topology to fit the risk of the work — we use all five.

| # | Topology | Use it when | Evidence |
|---|---|---|---|
| 1 | **Single pass, no subagents** | the work is privacy/safety-critical and every claim must be matched against the code; fan-out would lower fidelity | `.agent-orchestration/model-usage.md` records this choice for the legal/consent work |
| 2 | **Hierarchical review** — 4 area leads (backend, frontend, architecture, security), each spawning children | you need breadth with independent verification, and the output is findings, not code | `docs/code-review/review-process.md`, `docs/code-review/2026-09-08-review-output.md` |
| 3 | **Fix campaign** — waves partitioned by file ownership, one wave at a time, gates between | there is a large findings backlog to burn down | `docs/code-review/fix-process.md` |
| 4 | **Autopilot wave loop** — planner → N file-disjoint fixers → read-only reviewer → state-writer → gates → commit, on a re-firing schedule | unattended progress over hours, with resumption if a lane dies | `docs/autopilot/AUTOPILOT-REPORT-2026-09-15.md` |
| 5 | **Gated feature build** — small waves by layer (A: backend, B: public UI, C: admin UI, D: docs), each lane owning a group of files with a brief read from disk. As run for crisis-guidance, only wave A exists (A1 data+audit, A2 sanitizer+media, A3 services+controllers) | building a new feature with several layers | `docs/autopilot/crisis-guidance/briefs/` |

The wave loop (topology 4) in one line of pseudo-code:

```text
plan   = one lane reads LEDGER + STATE, returns the next ≤3 file-disjoint workstreams
fix    = those workstreams run in parallel, each owning its files
review = a fresh, read-only reviewer verdicts every row (done / partial / wrong)
state  = a writer tags only reviewer-verified rows, appends the runlog, updates STATE
gate   = the orchestrator runs the suites, fixes what the gates catch, commits
```

## 3. Model routing and context economics

**Routing.** Token-heavy work goes to the free HPC model; orchestration and review go to a cheap
API model:

| Role | Model | Why |
|---|---|---|
| Heavy lanes (inventory, building, fixing) | `hpc-vllm/Qwen3.8-27B` (TalTech, free) | long outputs; cost matters more than latency |
| Planner, reviewer, state-writer | `deepseek/deepseek-flash` | short, decision-shaped output; needs to be fast and reliable |

**Measure before you route.** The free endpoint is shared: at one point it served 8 tokens in
86.2 s (~0.09 tok/s), which would have turned a 20 k-token analysis into ~60 hours (20,000 tokens × 86.2 s per 8 tokens ≈ 59.9 h), while `GET
/models` still answered in 0.1 s. So the standing rule is a **probe before each wave** (an 8–24 token
completion): healthy → the free model; degraded → the cheap API model; and switch back when it
recovers (it later measured 0.4 s). The probe log lives in `docs/autopilot/STATE.json`.

**Fresh vs forked context — the mistake that cost a wave.** Worker lanes default to *forking* the
parent transcript. That is useful for continuity and fatal for size: three lanes failed identically
with `maximum context length is 262144 tokens ... prompt contains at least 262144 input tokens`
because they inherited a session transcript that had grown enormous. The fix, now standard:

- pass `context: "fresh"` for every lane,
- keep the prompt to a few lines and put the detail in a **brief file** the lane reads
  (`docs/autopilot/crisis-guidance/briefs/A1-data-and-audit.md`),
- split by deliverable — one file per lane, ~150-word inline briefs for small jobs.

**Frozen interface contracts.** Because fresh lanes cannot see each other and cannot compile, a
parallel build pins the exact signatures in every brief (domain API, repository interfaces, service
methods). Interface drift — not model capability — is the thing that breaks parallel work.

## 4. Evidence discipline

- **Every row cites a location.** Ledger rows carry `path:line`, the observed text, why it is wrong
  and the required fix, so a fixer never has to re-derive the problem (`docs/autopilot/findings/`).
- **Prove before you delete.** Removing a seam required grepping for production callers first; if a
  caller existed the lane was told to report it instead of removing it.
- **Never delete coverage silently.** When a dead method's only test was removed, its unique
  assertion was relocated to where the behaviour now lives.
- **"Verified correct — do not fix" lists.** Each ledger ends with the things that were checked and
  are right, so later waves do not "fix" them into regressions.
- **Reviewer verdicts are cross-checked against the tree**, never accepted as prose. That is how we
  caught that `ShelterRequestConstraintParityTest` had asserted an **empty set** since the day it was
  written (Jakarta constraints do not target `RECORD_COMPONENT`, so the guard never guarded).
- **Generated artifacts are regenerated, never hand-edited.** A lane hand-synced
  `docs/api/openapi.json`; the sanctioned command then produced no diff — the generator is the
  authority, and the test that compares them is the proof.
- **Gate cheap and gate first.** `mvn -DskipTests compile` hides test-compile errors: two lane
  defects surfaced only when the gate started with `test-compile`. Also regenerate targets —
  `mvn clean test` — because Maven's incremental compile can resolve a **stale class** and report a
  method that no longer exists in the source.

## 5. Records and resumability

Agent runs die: lanes stall, waves get stopped, a session ends mid-flight. The design goal is that
**nothing is lost and nothing is repeated**.

- `docs/autopilot/findings/LEDGER.md` — the ranked work ledger: rows, severities, file ownership,
  and a status tag per row (`[closed W1]`, `[open W2: …]`). Append-only in practice; a tag is only
  added when a reviewer verified the row.
- `docs/autopilot/RUNLOG.md` — append-only, one line per closed row plus one block per wave. Two
  rules learned the hard way: **append, never rewrite** (concurrent writers each hold a copy), and
  attribute lines to the correct wave (a late state-writer cannot tell which wave it is recording —
  tell it explicitly rather than letting it guess).
- `docs/autopilot/STATE.json` — phase, budget, model policy + probe log, `open_items`, `last_wave`.
  Only a state-writer touches it, and never `started_at`/`budget`/`model_policy` mid-run.
- **Scheduling for resilience**: the wave loop is registered as a recurring schedule, so if a wave
  dies the next fire re-reads the ledger and re-dispatches the unfinished rows. `overlap: skip`
  prevents two waves stacking.
- **Control surfaces** used when a lane blocks: `steer` for live guidance, `resume` for a retained
  child, `stop`/`interrupt` for a dead wave, and killing orphaned runners by PID (note:
  `pkill -f <pattern>` matches the invoking shell's own command line — exclude your PID or you kill
  yourself first).
- **Budgeting**: the run declares a soft and hard hour budget in STATE; the wave that crosses the
  hard stop writes the closing report instead of starting new work.

## 6. Escalation to humans (deliberate boundaries)

Lanes are told to **ask instead of guessing** when a decision is outside their scope, using a
supervisor channel. Real examples from this repo: a lane refused to annotate 8 domain enums because
the row contradicted its own hard rule (ruling: keep `domain` free of a web/docs dependency); a lane
refused a "migrate these subscriptions" row after disproving its premise (the teardown bodies dispose
a Leaflet map, not an RxJS subscription); a lane refused to decide whether a spec requirement was
superseded. Ledger rows that need a human are tagged `HUMAN` rather than being silently dropped, and
destructive actions require explicit confirmation.

## 7. Failure modes catalogue (observed, with the fix)

| Symptom | Cause | Fix now standard |
|---|---|---|
| Every lane fails with a 262 144-token error | lanes forked the parent transcript | `context: "fresh"` + briefs in files + one deliverable per lane |
| A wave dies and its siblings keep running | a stopped workflow does not always reap its children | kill orphan runners by explicit PID; `overlap: skip`; re-dispatch from the ledger |
| The planner "parroted the prompt" | the answer was read from the **head** of the child log, where the task text sits | read the **tail** of the log (or the completion result); a real example had a correct plan at the end |
| Two lanes append to the same record and one's lines vanish | read-modify-write on a shared file | append-only records; state-writers told exactly which wave they own |
| Duplicate row IDs after concurrent writes | two writers allocating IDs independently | a writer renumbers its own rows and leaves a gap; the orchestrator de-duplicates |
| Files nobody owned stay stale through three sweeps | ownership enumerated file-by-file | assign ownership by glob |
| A test passes but asserts nothing | reflection over an empty set (record components vs fields) | assert a **non-vacuity** condition in the guard itself |
| A generated file silently drifts | it was hand-edited | regenerate with the sanctioned command; keep the comparison test |
| Build reports a symbol that the source no longer has | stale `target/classes` from an incremental compile | `mvn clean test`, and start gates with `test-compile` |
| Test counts in docs go stale | they were correct when written, then waves added tests | re-count and re-date when the numbers are touched; keep dated historical figures explicitly dated |
| A tool's output is truncated by compression, so counts are wrong | aggregating over piped, truncated output | write the raw output to a file and count the file |

## 8. What this costs and what it buys

From the 4-wave hardening run (`docs/autopilot/AUTOPILOT-REPORT-2026-09-15.md`): ≥5.1 h of logged wave time (23:19:44Z start to the
last wave-3 record at 04:25Z), 20 commits, **68 inventoried rows → 1 open work row**, four independent reviewer verdicts plus
one orphan review, and roughly 719 backend / 953 frontend tests green at the end. The gates caught
**four defects in lane-authored code** (three compile errors, two test-compile breaks, a contract
guard that double-rooted paths and scanned comments, and an OpenAPI extension the library never
surfaced) plus one guard that had never asserted anything. That is the trade: the orchestrator's gate
step is not overhead, it is the only reason a lane's output is trustworthy.

## 9. Reuse checklist

1. Write the spec change first; get `openspec validate --all` green before code.
2. Inventory read-only into findings files; consolidate into a ledger with `path:line` evidence and
   **glob-based** file ownership.
3. Probe the heavy model; route heavy → free HPC, orchestration/review → cheap API.
4. Dispatch waves of **file-disjoint** lanes with `context: "fresh"` and a brief file / short brief.
5. Make every lane state the runner command it cannot run.
6. Review each wave with a fresh, read-only reviewer; tag only what it verified.
7. Gate with `test-compile` → full suite → `openspec validate`; fix what the gates find; regenerate
   any generated artefact.
8. Commit per concern, in English, with the evidence in the message.
9. Append to the runlog, update STATE, and leave the remaining rows tagged with owners.
10. When a row needs a judgement call, ask the human and tag it `HUMAN` — do not guess.
