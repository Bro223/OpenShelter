# Fix Campaign Process

How a multi-agent code-review finding list is turned into verified, gate-checked
changes — the methodology behind the 2026-09-08 OpenShelter fix campaign.
General by design: apply it to any reviewed repo, not just this one.

## 1. Inputs and source of truth

A campaign starts from two artifacts:

1. **The deduplicated finding list** (one per root cause, with file:line,
   suggested fix, and the evidence the reviewers verified). Findings are the
   _hypotheses_ — they are never assumed true.
2. **The tree state at review time** (commit hash + test baseline counts).
   If the working tree has moved on, every finding is re-verified against
   current source before any fix, because line numbers and even the defect
   itself may be stale.

A single fix log is opened on day one (gitignored if it contains runIds or
intermediate state) and is the campaign's spine: every finding ends up with a
terminal status — `fixed`, `deferred` (with reason), or `dropped` (with
evidence of why it was not real). No finding may vanish.

## 2. Waves: parallel by ownership, serial by gates

The campaign runs in **waves**. Inside a wave, child agents work in parallel;
between waves, the orchestrator runs the full verification gate and only
proceeds when it is green.

Why waves and not one big parallel swarm:

- **One writer per file.** A wave is partitioned so that no two children can
  touch the same file. Ownership lists are written into each child's brief
  explicitly ("you may edit/create/delete ONLY these; everything else
  belongs to other children — if you need another file, report it, don't
  edit it"). When two findings from different reviews point at the same file
  (e.g. two different exception handlers both belong in the shared error
  mapper), the orchestrator assigns that file to exactly one child and folds
  the second finding into that child's brief — cross-child "I'll add mine
  later" is how duplicate-handler bugs are born.
- **Waves are dependency barriers.** Architecture moves (package refactors,
  file relocations, interface signature changes) go in their own wave after
  the feature work, because they change the coordinates everyone else is
  editing. Docs go last, against settled code — documenting moving targets
  is how drift is manufactured.
- **Compile ownership.** Exactly one backend child per wave may run the
  compile check; frontend children get at most one targeted spec run. Full
  suites are the orchestrator's job after the wave — parallel `mvn test`
  collides on `target/` and parallel test runners collide on caches, and a
  child that "fixed" its own compile error by editing a sibling's file would
  be undetectable.

A child that fails, hangs, or (on a saturated shared model endpoint) crawls
gets **one steer** with the concrete unblock; if it is still stuck, the
orchestrator does that child's work itself as sequential passes and says so
in the log. The wave completes either way — a hung child is not a reason to
skip the remaining fixes.

### If a wave dies mid-flight

A child — or the orchestrator session itself — can die mid-wave (provider
timeout, host restart, a saturated endpoint). Recovery rules:

- **Trust the tree, not memory.** Re-derive state on restart: the fix
  log's last written line, the working-tree diff, and a fresh re-verification
  of every remaining item. The orchestrator writes a _verified
  remaining-work inventory_ into the restart brief — each item re-checked
  against current source at hand-off time, because a dead session may have
  done more (or less) than it announced, and a restart brief that repeats
  stale "to-do" claims is how a second child re-applies finished work or
  skips work that was never done.
- **Re-baselining is part of the restart.** A docs/format wave re-checks
  its formatter baseline at HEAD on restart: files already dirty before
  the wave are reported as pre-existing debt against that baseline — not
  "fixed", and not mass-reformatted as a side effect.
- **The log is the spine, the tree is the source of truth.** When the two
  disagree (log says done, tree says not), the tree wins and the log is
  corrected — a log entry without tree evidence is a hypothesis, and a
  brief built on it carries the error forward.

## 3. Verify-before-fix protocol

Every child brief carries the same standing order:

1. Open the cited file in the _current_ tree and confirm the defect exists.
2. If the finding is stale or wrong, mark it **dropped with one line of
   evidence** (the code that disproves it). Do not "fix" it — a speculative
   fix for a non-issue is how regressions enter a fix campaign.
3. If the finding's suggested fix fights the codebase's conventions (wrong
   package, wrong exception type, missing dependency), adapt the fix and
   record the deviation in the final report.

The orchestrator spot-anchors before spawning: a handful of load-bearing
files (the security config, the core store, the migrations) are re-read
directly so that child briefs carry _current_ coordinates, and environment
facts that change what "correct" means are resolved up front (e.g. which
profile the test suite runs under — a fail-closed startup guard silently
breaks every test context if the test profile was never considered).

## 4. Gate discipline

After each wave, the orchestrator runs the **full gate, serially**:

- backend: the whole test suite (including container-based integration
  tests), with the pass/fail counts recorded;
- frontend: the whole unit suite + both TypeScript project configs
  (`app` and `spec`) + a formatter check over every touched file (write,
  then re-check — except a file already dirty at wave start, which is
  reported against that baseline rather than reformatted as a side effect;
  formatting debt gets its own cleanup pass, not a wave's collateral);
- a green gate is the _only_ entry ticket to the next wave.

When a gate goes red, the orchestrator — not a child — diagnoses. The
diagnosis is by _cluster_, not by test: several red tests almost always
share one root cause, and the fix goes at the root. The recurring
orchestrator-level failure modes from this campaign, worth knowing in
advance:

- **Cross-child integration seams.** Children build independently against
  the brief, so an interface change by one child (a new method on a seam)
  breaks a lambda/anonymous fake written by the other. The compile gate
  catches these; the fix is a few lines in the un-owned file, done by the
  orchestrator with the change logged.
- **Tests that commit on a shared database.** An integration test that is
  deliberately non-transactional (a real race test _must_ commit) leaks its
  committed rows into every later test's row counts on the shared
  container. Non-transactional ITs owe the suite a cleanup (`@AfterEach`
  truncate of the shared tables) plus fixture identifiers that cannot
  collide with other suites'.
- **Hallucinated APIs in child edits.** A child may introduce an
  annotation, method, or import that does not exist in the resolved
  library version — plausible on the page, dead at compile time. The
  compile gate is the detector; the fix is the idiomatic equivalent
  (here: a derived-query name instead of a nonexistent `@OrderBy`
  annotation).
- **Test fakes that don't model the scenario they claim.** A "deleted
  mid-flight" fake that never actually deletes, or a "winner row" that was
  never persisted, produces a test failure that looks like a production
  bug but is a modeling error in the fake. Read the service flow the fake
  is simulating; make the fake's observable state tell the story.
- **Formatters run last, on the final file set.** Whitespace drift from
  children is normal; reformat, re-check, and re-run the suites if the
  formatter touched behavior-adjacent files (it never should, but the
  re-run is cheap insurance).

## 5. How issues map to children

The mapping is by **file ownership first, theme second**. The review's
priority batches (P0 security → P1 backend → P2 frontend → P3 architecture
→ P4 docs) determine _which wave_, and the file ownership determines
_which child within the wave_:

- A security finding's fix touches the same files as other security
  findings (rate limiter + rotation policy + IP resolution all live in the
  auth package and the security config) — those travel together as one
  child, because the fixes are mutually verifying (each one's test
  exercises the others' surface).
- A finding whose file is owned by a different child is either folded into
  that child's brief (small, same-file work) or deferred to the next wave
  with an explicit note (cross-file architectural work) — never split
  mid-file between two briefs.
- Findings with no owner in the current wave (the file belongs to no
  child) are recorded as orchestrator work items or pushed to the next
  wave; they are never silently dropped.
- Every child's final report is a table: finding ID → status → one-line
  evidence, plus the file list, the checks it ran, and its
  **coordination notes** (files it needed but didn't own, assumptions it
  made about a sibling's work, deviations from the brief). Those notes are
  the orchestrator's queue for the next wave's briefs and for gate
  diagnosis.

## 6. Recording

The fix log grows with the campaign: wave table (child runIds + scope),
per-issue terminal statuses with evidence, gate runs with counts, and the
gate diagnostics (what was red, the root-cause cluster, the fix). The log
is operational state — it may stay gitignored.

What gets **committed** is the process document (this one) plus the docs
the campaign produced (architecture docs, API docs, specs, diagrams). The
commit history of the fixes themselves is the human's to shape per batch;
the campaign deliberately leaves the tree dirty and commits nothing.

Two rules keep the record honest: _deviations are named_ (a child that
does not do exactly what the brief said — a private helper instead of a
shared one, a test that is deferred with a determinism argument — gets a
line in the log explaining why), and _deferrals carry a reason and an
owner or a "product decision" tag_ — a deferred item without a reason is
just a dropped one wearing a different hat.
