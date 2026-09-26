# Skills index — code-review run

**Rule: a lane may only use skills listed in this index.** If a lane needs a skill
that is not listed here, it requests it (via `docs/autopilot/CODE-REVIEW-NOTES.md`)
rather than fetching its own, so the skill set stays visible and reproducible.

**Provenance:** every file in this directory is third-party instruction copied
**verbatim** from the `npx skills use` output (or, for `find-skills.md`, from the
agent harness's own skill set). No lane may edit, reformat, or "clean up" a skill
file — the tooling must not change under us. The `Supporting files … /tmp/…`
trailers at the bottom of some files are part of the original tool output and are
kept as-is; those auxiliary reference files were **not** vendored, and where a
skill says to load one, the lane records that in its report instead of fetching
it (run rule: a rule a skill gives that cannot be satisfied is reported, not
worked around).

Re-fetching: run the exact command from the repo root; it prints the same
prompt-format document. All commands below were run **2026-09-24** from
`/home/aleks/MyScripts/LocalRepos/OpenShelter`, except the three
`addyosmani/web-quality-skills` rows (fetched **2026-09-26** by the
design-review lane, together with the two rejected siblings in the table
below).

## Skills (27)

| Skill | Source (repo, stars on 2026-09-24) | What it is for | Stored at | Lane(s) and when | Fetch command (exit) |
|---|---|---|---|---|---|
| clean-code | jackjin1997/ClawForge (12) | The readability standard (Uncle Bob): names, functions, comments, error handling | `clean-code.md` (112 L) | every lane, during refactoring | originally vendored 2026-02-27; command not recorded (see Notes) |
| code-review | mattpocock/skills (268 473) | Two-axis review of a diff since a fixed point: Standards + Spec | `code-review.md` (99 L) | every lane, during review | `timeout 300 npx -y skills use "https://github.com/mattpocock/skills" --skill "code-review"` (0, verified identical 2026-09-24) |
| test-driven-development | obra/superpowers (290 669) | Red-then-green discipline for behaviour-touching changes | `test-driven-development.md` (342 L) | backend lanes, before implementation | `timeout 300 npx -y skills use "https://github.com/obra/superpowers" --skill "test-driven-development"` (0, verified identical modulo tmp path) |
| web-design-guidelines | vercel-labs/agent-skills (31 491) | Vercel Web Interface Guidelines audit (fetches current list from the URL inside the file) | `web-design-guidelines.md` (46 L) | frontend lanes, during review | `timeout 300 npx -y skills use "https://github.com/vercel-labs/agent-skills" --skill "web-design-guidelines"` (0, verified identical 2026-09-24) |
| find-skills | agent harness skill set (not an npx package) | How to discover and install skills via `npx skills` | `find-skills.md` (148 L) | discovery lane only | copied from the harness; not re-fetchable via `npx skills use` |
| java-springboot | github/awesome-copilot (39 321; 20.4 K installs) | Spring Boot best practices: structure, DI, service/data layer, testing, security | `java-springboot.md` (72 L) | backend lanes, during refactoring (the "recommended approach" yardstick) | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "java-springboot"` (0; first 90 s attempt exited 124) |
| sql-code-review | github/awesome-copilot (39 321; 13.3 K) | SQL review checklist: injection, performance, anti-patterns, Postgres-specific notes | `sql-code-review.md` (308 L) | persistence/migrations lane + any lane touching queries, during review | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "sql-code-review"` (0; first 90 s attempt exited 124) |
| refactor | github/awesome-copilot (39 321; 21.9 K) | Behaviour-preserving refactoring: smells, extraction, god functions, dead code | `refactor.md` (652 L) | every backend lane, during refactoring | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "refactor"` (0; first 90 s attempt exited 124) |
| java-junit | github/awesome-copilot (39 321; 11.4 K) | JUnit 5 patterns: parameterized tests, assertions, mocking, organization | `java-junit.md` (70 L) | backend test lanes, when touching tests | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "java-junit"` (0; first 90 s attempt exited 124) |
| test-gap-audit | github/awesome-copilot (39 321) | Read-only audit for missing/weak/stale/mis-scoped tests, with severity rubric | `test-gap-audit.md` (187 L) | backend lanes (esp. guards/trust-ladder areas) and the final review lane, before reporting | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "test-gap-audit"` (0) |
| docs-sync-audit | github/awesome-copilot (39 321) | Read-only docs-drift audit with severity rubric and evidence standard | `docs-sync-audit.md` (175 L) | docs + `.puml` sync lane, during review | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "docs-sync-audit"` (0) |
| plantuml-ascii | github/awesome-copilot (39 321; 9.7 K) | PlantUML syntax and ASCII/text-mode output for diagram maintenance | `plantuml-ascii.md` (312 L) | `.puml` sync lane, when rewriting or checking diagrams | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "plantuml-ascii"` (0) |
| accessibility | addyosmani/web-quality-skills (2 831; 54.6 K) | WCAG 2.2 audit workflow (POUR, conformance levels, testing checklist, Lighthouse) | `accessibility.md` (476 L) | frontend lanes (three a11y themes, public reporting UI), during review | `timeout 90 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "accessibility"` (0) |
| performance | addyosmani/web-quality-skills (2 841; 2026-09-26) | Evidence-led performance: field (RUM/CWV) + lab (trace) measurement before editing, before/after reporting | `performance.md` (411 L) | frontend lanes, during review (perf axis) | `timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "performance"` (0, 2026-09-26) |
| core-web-vitals | addyosmani/web-quality-skills (2 841; 2026-09-26) | LCP / INP / CLS: field data for user impact, browser traces for causes, per-metric optimisation | `core-web-vitals.md` (240 L) | frontend lanes, during review (CWV axis) | `timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "core-web-vitals"` (0, 2026-09-26) |
| web-quality-audit | addyosmani/web-quality-skills (2 841; 2026-09-26) | Whole-page quality audit: performance, accessibility, SEO, best practices, agentic browsing — evidence-led, no aggregate-score proof | `web-quality-audit.md` (221 L) | design-review lane, during review (the audit spine) | `timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "web-quality-audit"` (0, 2026-09-26) |
| code-review-and-quality | addyosmani/agent-skills (98 703; 46.6 K) | Five-axis code review (correctness, maintainability, dead code, change sizing, …) | `code-review-and-quality.md` (403 L) | review lanes (later batches), during review | `timeout 300 npx -y skills use "https://github.com/addyosmani/agent-skills" --skill "code-review-and-quality"` (0) |
| documentation-and-adrs | addyosmani/agent-skills (98 703; 39.6 K) | Writing docs and ADRs; decision records with status lifecycle | `documentation-and-adrs.md` (295 L) | docs lane, when recording decisions or updating API docs | `timeout 300 npx -y skills use "https://github.com/addyosmani/agent-skills" --skill "documentation-and-adrs"` (0) |
| ce-simplify-code | everyinc/compound-engineering-plugin (25 234; 3.1 K) | Simplify settled code (clarity, reuse, behaviour-preserved) — the run's core task | `ce-simplify-code.md` (78 L) | every lane, after making changes and before reporting | `timeout 90 npx -y skills use "https://github.com/everyinc/compound-engineering-plugin" --skill "ce-simplify-code"` (0) |
| receiving-code-review | obra/superpowers (290 669) | How to act on review feedback: verify before implementing, push back with evidence | `receiving-code-review.md` (212 L) | every lane, when acting on notes-board findings | `timeout 300 npx -y skills use "https://github.com/obra/superpowers" --skill "receiving-code-review"` (0) |
| verification-before-completion | obra/superpowers (290 669) | Run verification and confirm output before claiming anything is called done | `verification-before-completion.md` (127 L) | every lane, before reporting (gates + evidence) | `timeout 300 npx -y skills use "https://github.com/obra/superpowers" --skill "verification-before-completion"` (0) |
| systematic-debugging | obra/superpowers (290 669) | Disciplined bug diagnosis: phases, red flags, no-fix-without-root-cause | `systematic-debugging.md` (295 L) | any lane, when a gate fails or a test goes red | `timeout 300 npx -y skills use "https://github.com/obra/superpowers" --skill "systematic-debugging"` (0) |
| security-review | getsentry/skills (1 004, official Sentry) | Confidence-based security review: exploitability verification, do-not-flag rules, OWASP framing | `security-review.md` (324 L) | security-focused review pass (auditability: no false-positive noise), during review | `timeout 300 npx -y skills use "https://github.com/getsentry/skills" --skill "security-review"` (0) |
| springboot-security | affaan-m/ecc (266 174; 10.6 K) | Spring Security review: authn/authz, SQL injection, CSRF, secrets, rate limiting, dependency posture | `springboot-security.md` (280 L) | backend lanes touching security (JWT, trust ladder, validation), during review | `timeout 300 npx -y skills use "https://github.com/affaan-m/ecc" --skill "springboot-security"` (0) |
| angular-developer | angular/skills (655, official Angular team) | Angular architecture guidance: signals/linkedSignal, DI, forms, ARIA, routing, testing | `angular-developer.md` (156 L) | frontend lanes, during refactoring and review | `timeout 300 npx -y skills use "https://github.com/angular/skills" --skill "angular-developer"` (0) |
| assertion-quality | dotnet/skills (5 468, official dotnet; 2.1 K) | Assertion diversity analysis: catches always-true, self-referential, assertion-free guards | `assertion-quality.md` (212 L) | backend test lanes, when auditing test quality (the recurring defect) | `timeout 300 npx -y skills use "https://github.com/dotnet/skills" --skill "assertion-quality"` (0) |
| skill-creator | anthropics/skills (177 824, official Anthropic) | Turn settled standards into reusable skills; create/measure skills | `skill-creator.md` (497 L) | discovery lane / post-run, when a settled standard should become a skill | `timeout 300 npx -y skills use "https://github.com/anthropics/skills" --skill "skill-creator"` (0) |

## Rejected candidates (documented rejections)

Fetched and rejected after reading the content:

| Candidate | Source (stars) | Fetch command (exit) | Reason for rejection |
|---|---|---|---|
| angular-component, angular-signals | analogjs/angular-skills (591; 10.9 K / 8.4 K installs) | `timeout 90 npx -y skills use "https://github.com/analogjs/angular-skills" --skill "angular-component"` (0); same for `angular-signals` (0) | Upstream **deprecated** them: the fetched files are 28-line stubs pointing to the official `angular/skills` repo, which we use instead (`angular-developer`) |
| ce-code-review | everyinc/compound-engineering-plugin (25 234) | `timeout 300 npx -y skills use "https://github.com/everyinc/compound-engineering-plugin" --skill "ce-code-review"` (0) | Not portable as a single file: its execution spine mandates un-vendored `references/*.md` files and `.compound-engineering/config.yaml`, plus cross-model dispatch machinery |
| spring-boot-testing | github/awesome-copilot (39 321) | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "spring-boot-testing"` (0) | Written for **Spring Boot 4 / JUnit 6**; this codebase is Boot 3.5 / JUnit 5 — would pull wrong idioms against the run's "recommended approach" priority; its Testcontainers detail lives in un-vendored reference files |
| security-review | github/awesome-copilot (39 321; 5.2 K) | `timeout 300 npx -y skills use "https://github.com/github/awesome-copilot" --skill "security-review"` (0) | Workflow steps mandate un-vendored `references/*.md` (Java patterns, report format); superseded by `springboot-security` (self-contained, framework-specific) + Sentry `security-review` (methodology) |
| owasp-top-10-testing | usestrix/strix (64 383; 6.1 K) | `timeout 300 npx -y skills use "https://github.com/usestrix/strix" --skill "owasp-top-10-testing"` (0) | Strix product runner: needs the `strix` binary, a running instance and an LLM key — not a code-review skill |
| upstash-ratelimit-js | upstash/skills (28; 12.6 K) | `timeout 300 npx -y skills use "https://github.com/upstash/skills" --skill "upstash-ratelimit-js"` (0) | TypeScript/Upstash-Redis SDK integration; the app is Java/Spring. Closest on-target "rate limiting" result in the ecosystem — see the anti-abuse gap below |
| clean-code | sickn33/agentic-awesome-skills (46 836; 11.5 K) | `timeout 300 npx -y skills use "https://github.com/sickn33/agentic-awesome-skills" --skill "clean-code"` (0) | Near-duplicate of the already-vendored `clean-code.md` (same Uncle Bob material, same sections) |
| best-practices | addyosmani/web-quality-skills (2 841; 2026-09-26) | `timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "best-practices"` (0, 2026-09-26) | Its security section is the spine and points at an un-vendored `references/SECURITY.md`; security is already covered by the vendored `security-review` (methodology) + `springboot-security` (framework); the a11y/perf rest is a subset of the kept `accessibility` + `web-quality-audit` |
| seo | addyosmani/web-quality-skills (2 841; 2026-09-26) | `timeout 300 npx -y skills use "https://github.com/addyosmani/web-quality-skills" --skill "seo"` (0, 2026-09-26) | Off-target for this run: no SEO lane in the code-review run; its design-relevant items (semantic structure, meta, image alt) are already covered by `web-quality-audit` + `accessibility` |

Rejected on reputation/overlap without fetching:

| Candidate | Source (stars) | Reason |
|---|---|---|
| code-review | coderabbitai/skills (181) | 181★ product-marketing repo; a fourth review skill is padding — three kept review skills already cover the axis |
| documentation-update | geoffjay/claude-plugins (8) | Below the 100★ skepticism threshold |
| accessibility-compliance (13.4 K) | wshobson/agents (39 911) | Overlaps the more popular addyosmani `accessibility` (54.6 K, WCAG 2.2) |
| clean-code (5.5 K) | wondelai/skills (2 246) | Overlaps the vendored `clean-code.md` |
| postgresql-code-review (12.4 K) | github/awesome-copilot (39 321) | Overlaps `sql-code-review`, which already carries Postgres-specific guidance |
| refactor-plan, review-and-refactor, java-refactoring-extract-method, java-refactoring-remove-parameter | github/awesome-copilot (39 321) | Folded into the kept 652-line `refactor` (extract/rename/god-function all covered); the Java ones are micro-slices of the same content |

## Findings and notes

- **Anti-abuse / policy / anti-spam: no reputable on-target skill exists.** Searched
  `spam`, `abuse`, `moderation`, `rate limit` (2026-09-24). The spam results are
  about *sending* spam (email marketing), the rate-limit results are JS SDK
  integrations or sub-1 K-install unknowns, and the abuse results are
  attack-side (JWT/ACL exploitation), not abuse-resistance design. This lane's
  recommendation: the public-reporting/rate-limit/dedup review is done with
  `springboot-security` + `sql-code-review` and general judgment; if a future run
  wants a dedicated policy skill, one should be *created* (see `skill-creator`)
  rather than fetched.
- **The analogjs lead is dead.** Both of its Angular skills are deprecated stubs
  (see above); the official `angular/skills` repo is the current source.
- **Upstream drift on `clean-code.md`.** Re-running its ClawForge fetch today
  returns a changed description, extra sections, and ⚠ parse warnings from
  sibling skills in that repo (the vendored copy is dated 2026-02-27). The
  vendored file is canonical; do not re-fetch over it.
- **Original five:** fetch commands were not recorded when they were first
  vendored (commit `df948cc`). On 2026-09-24 the commands in the table were
  verified to reproduce `code-review.md`, `test-driven-development.md` (identical
  modulo the tmp path in the trailer) and `web-design-guidelines.md` (identical);
  `clean-code.md` has drifted upstream (above); `find-skills.md` is not an npx
  package at all.
- **Slow clones:** `github/awesome-copilot` clones exceed 90 s; every one of its
  four first fetch attempts exited 124 under `timeout 90` and succeeded on retry
  at `timeout 300`. Use ≥300 s for that repo.
- Supporting (auxiliary) files for `test-gap-audit`, `docs-sync-audit`,
  `accessibility`, `ce-simplify-code`, `systematic-debugging`,
  `security-review`, `angular-developer`, `skill-creator`, `performance`
  (`/tmp/skills-use-hZOMuA/performance`), `core-web-vitals`
  (`/tmp/skills-use-TlYAV9/core-web-vitals`) and `web-quality-audit`
  (`/tmp/skills-use-9tpztJ/web-quality-audit`) were downloaded to ephemeral
  `/tmp/skills-use-*` dirs at fetch time and are **not** in the repo.
  Each skill's core instructions are self-contained in its file; lanes needing an
  auxiliary reference report the gap rather than fetching it. Note:
  `web-quality-audit` also routes to `scripts/analyze.sh` and
  `../performance/references/MEASUREMENT.md` (not vendored) — the design-review
  lane did the source-inspection path only and reports accordingly.
- Gate check (2026-09-24): all 24 files non-empty, line counts in the table
  column "Stored at"; `wc -l docs/skills/*.md` → 24 files, 5 878 lines total.
  2026-09-26 (design-review lane): +3 kept skills / −2 rejected (deleted from
  this directory) → 27 files, 6 750 lines total.
