# Code review and simplification run

**Branch:** `code-review` (cut from the completed `feature/frontend`).

**Goal:** the code should be understandable *by reading it* — no documentation detour needed to know what a file does or why. Reviewed against the five skills in `docs/skills/`, and simplified where simplification is free.

**Priority order, from the owner, and it overrides everything below:** stability and performance first; the minimal working solution; the recommended approach; simple code, no clever constructs, no heavy nested structures, no multi-dimensional variables "because they are idiomatic".

---

## Hard rules for every lane

1. **Behaviour-preserving.** This codebase is green and verified; refactoring must not change what it does. No test may be deleted or weakened. A test that changes is a signal the change was not behaviour-preserving — stop and report unless the test pinned the *old* behaviour as a bug and a red-proof justifies the change.
2. **Gates, on every lane before it reports:**
   - Frontend: `cd frontend && npx ng test --watch=false` → exit 0, and `npx ng build` → exit 0.
   - Backend: `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` → exit 0 (tests, PMD, 0.93 coverage floor).
   - Run long gates **detached** (`nohup bash -c '…; echo $? > /tmp/x.exit' &`) and read the exit file — a single long blocking call gets cut off here.
3. **One writer per file.** A lane owns its directory or file exclusively. Touching a file another lane owns — including any shared stylesheet, `shared/paging.ts`, the catalogs, or anything under `src/test/java/ee/sheltermap/persistence/` — is forbidden; record a request in the notes file instead.
4. **Report both directions.** Findings that are *not* yours go to the notes file. If a lane's change breaks something of yours, write it there with the file and line so it can be reversed.
5. **No new dependencies. Never touch `frontend/src/vendor/**`** (vendored third-party bytes), **`docs/skills/**`** (third-party skill instructions, copied verbatim so the tooling cannot change under us), or any migration that has already been applied.

## What "simpler" means here — the standard to apply

Rewrite toward these, and stop when the code is plain; do not gold-plate:

- **Names that say what the thing is**, not what it is made of, and no abbreviations only the author knows.
- **One thing per function.** If a reader has to hold two ideas while reading it, split it.
- **Flat control flow.** Early returns over nesting; no nested ternaries; no multi-dimensional arrays or maps standing in for a small named structure.
- **Comments that state the constraint, not the history or the task id.** "Public reads must not reveal the reporter" stays; "wave 8 refactor" goes. Planning ids are refused by a guard anyway.
- **Delete what is dead** — unreferenced constants, helpers, branches, and any comment describing a behaviour the code no longer has. The repository has a documented history of code that outlived its decisions.
- **Do not trade clarity for terseness.** A stream that three people must re-read is worse than a loop.
- **Keep the verified mechanisms alone unless you are simplifying their expression**: the trust ladder, the report/verification rules, the paging clamp vocabulary, the datasource seam, the theme token homes, and the guards themselves. Those were built deliberately and are pinned by tests.

## Skills to follow, and who uses which

The skill texts are in `docs/skills/` and each is self-describing; follow the instructions inside the file you are given.

| Skill file | Use it for |
|---|---|
| `clean-code.md` | every lane — the readability standard |
| `code-review.md` | every lane — how to review and report findings |
| `test-driven-development.md` | backend lanes: any behaviour-touching change is test-first, red then green |
| `web-design-guidelines.md` | frontend lanes: fetch the current guidelines from the URL inside the file and audit against them |
| `find-skills.md` | the skills-discovery lane only |

A lane that finds a rule in a skill it cannot satisfy should record that in its report, not invent a workaround.

## Outputs

- Every lane writes **`reviews/code-review/<lane-name>.md`**: its scope, what it changed with `file:line`, what it deliberately left and why, its gate exit codes, and anything unverified. Permanent record, read by the owner.
- Cross-lane notes, requests and reversals go in **`docs/autopilot/CODE-REVIEW-NOTES.md`** — one line per entry with the file and line.

## Batching

- At most **16 live lanes**; the owner prunes finished ones.
- One lane per directory, or per file when the file is large. Files over roughly 400 lines are worth a lane of their own; `admin-page.ts` and the biggest services are the first candidates.
- Never two lanes on one file. Shared files are serialized across batches.
- Start every batch with `subagent_wait_all` so the next batch starts the moment the previous one finishes.
- Every batch keeps lanes on **disjoint files**.

## Batch 1 (first, because later batches depend on it)

1. **INVENTORY** — read-only: list every source file by size, propose the lane split (one lane per directory or large file) as a table, and name the shared files that must be serialized.
2. **FIND-SKILLS** — use `docs/skills/find-skills.md` to find at least five further skills relevant to this application (a Java/Spring backend, an Angular frontend, Postgres, security, accessibility), fetch their instructions to `docs/skills/` with the same `npx skills use` mechanism, and report what each is for and which lanes should use it.
3. **BE-RECON** — read-only: map the backend's layering and name its deepest readability problems (god classes, duplicated logic, unclear naming) with `file:line`, so later backend lanes know what to aim at.
