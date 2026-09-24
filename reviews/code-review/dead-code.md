# DEAD-CODE — deletion of `guidance/MarkdownToHtml` (owner decision executed)

Branch `code-review`, lane DEAD-CODE. Finding: `reviews/code-review/be-recon.md` §2.2 / §7 target 3; notes-board entry BE-RECON `guidance/MarkdownToHtml.java:70`. Decision: owner, recorded in this run's tasking — delete (priority: a minimal codebase a human can read). This report documents the unreachability proof, the class's history, exactly what went, the gate, and a repo-wide audit for anything else dead in the same way.

## 1. Unreachability evidence

Every search below was run over the whole repo root with explicit paths (see §7 "unverified" for a tooling note about why root-level `rg` needed an explicit path argument in one of my sandboxes). No live reference exists anywhere:

| # | Place looked | Command / method | Result |
|---|---|---|---|
| 1 | `src/main` Java | `rg -w MarkdownToHtml` (whole repo, explicit path) | Only the class file itself (2 self-references). **Zero references from any other main-source file.** |
| 2 | Case/spelling variants | `rg -i markdowntohtml` (whole repo) | Same closed set as #1 — no alias, no alternate casing in code. |
| 3 | Property/bean names | `rg -i 'markdown-to-html\|markdown_to_html'` (whole repo) | **Zero matches** — no property key, no bean name, no kebab/snake spelling anywhere. |
| 4 | Configuration | `rg -i markdown src/main/resources` (all of `application.yml`, `db/migration/` V2–V33, `registry/`) | **Zero matches** — no property names the class, no migration SQL, no config entry. (The class is a plain `final` utility — private constructor, static methods — not a Spring bean, so there is no bean surface to look up by name.) |
| 5 | Templates | `find src/main/resources -name '*.html' -path '*templates*'` | **No template tree exists** — the UI is the Angular SPA, not server templates. `rg -i markdown frontend/src` → zero matches (the frontend consumes the API over HTTP; no class-name coupling). |
| 6 | ServiceLoader / auto-configuration | `find src -path '*META-INF*'` | **No `META-INF/services`, no `spring.factories`, no `*.imports`** anywhere under `src`. |
| 7 | Reflection / string-based lookup | `rg -n 'forName' src/main/java` | **No `Class.forName` / reflective loading anywhere in main** — there is no mechanism by which a string could resolve to this class. |
| 8 | Migrations | `ls src/main/resources/db/migration` (V2–V33) + #4 | No migration references it; no SQL migration of the migration exists — the data migration was a **manual one-shot run of a test-tree `main()`**, not an applied Flyway file. Nothing in `db/migration` is affected. |
| 9 | Scripts & CI | `rg -i markdown qa scripts .github` | Only `qa/check-guidance-bodies.sh:11-12` — a **historical comment** ("The 2026-07 bodies were copy-pasted from .md files; MarkdownToHtml + MarkdownMigrationDriver converted them…"). The script itself calls only the running admin API (`curl` + `jq`); it is the durable tripwire for the post-migration invariant, not a caller of the class. `scripts/` (2 files) and `.github/workflows/ci.yml`: zero references. |
| 10 | Build config | `rg -i markdown pom.xml` | Zero — no surefire/failsafe entries name the class or its test. |
| 11 | Docs/specs anchors | `rg -i MarkdownToHtml docs/` | Only `docs/autopilot/CODE-REVIEW-NOTES.md` (the board entry this report answers). **`docs/agent/00-CURRENT-STATE.md` does not cite the class** — no `DocumentationFactsTest` anchor is affected. Review docs (`reviews/**`) mention it as history — untouched. |
| 12 | Independent corroboration | `reviews/code-review/simplify-guidance.md:81-84` | The SIMPLIFY-GUIDANCE lane reached the same conclusion on its own sweep: "zero references from production code (raw-Markdown bodies in the DB were converted once…)". |

**Conclusion: the class is unreachable from the running product by every mechanism checked — code, configuration, templates, service loading, reflection, migrations, scripts, CI. Deletion proceeds per the owner decision.**

## 2. What it was for

`MarkdownToHtml` was the **one-shot content-migration engine for the guidance blog**. The guidance bodies had been copy-pasted into the database (2026-07) as raw Markdown — stored one `<p>` per source line — while the detail page needed real formatting constrained to the strict allow-list the server sanitizer enforces (`h2 h3 p br strong em ul ol li blockquote a`, `href` limited to `http`/`https`/`mailto`). The class — per its own javadoc, "the one-shot migration tool's engine and the reference implementation of the content rules" — is a stateless Markdown-to-allow-listed-HTML scanner (the two longest methods in the tree, `convert`/`inline`). Everything arrived in a single commit, `20cb65b` (2026-09-20, "feat(blog): the guidance bodies carry real formatting instead of raw markdown"): the converter (411 L), its test (370 L, 43 tests), `MarkdownMigrationDriver` (549 L — a standalone `main()` that re-read every stored post in en/et/ru, drafts included, through the admin API, converted each body, refused any post the converter could not represent losslessly, wrote verbatim pre-conversion reference copies to `docs/content/guidance-markdown/<locale>/<slug>.md`, and kept a `repair` mode to rebuild bodies from those copies), and `qa/check-guidance-bodies.sh` (the durable tripwire that fails if any stored body ever regains raw-Markdown markers). No commit after `20cb65b` touches the driver or the reference directory — the migration was run once and frozen. The production invariant now lives in `BodySanitizer` (kept; it has live production callers). From the day after the one-shot, `MarkdownToHtml` had no production caller: 411 lines of main source plus the tree's two longest methods that the running product never executes.

## 3. What was deleted

| File | Lines | Role |
|---|---|---|
| `src/main/java/ee/sheltermap/guidance/MarkdownToHtml.java` | 411 | the converter (the finding's target) |
| `src/test/java/ee/sheltermap/guidance/MarkdownToHtmlTest.java` | 370 | the converter's test (43 `@Test` methods; no fixtures, no resource loading, imports only jsoup/JUnit/AssertJ) |
| `src/test/java/ee/sheltermap/guidance/MarkdownMigrationDriver.java` | 549 | the one-shot migration driver (standalone `main()`, zero `@Test` methods; imports only JDK + jackson/jsoup — it references **no** project class other than the converter) |
| **Total** | **1 330** | |

Nothing else existed solely to serve it: the `InMemory*` repositories in the same test package are shared by four other guidance tests (kept); no test-resource fixtures reference it; no helper script in the tree exists only for it (the `qa/` script is a durable, independent guard — kept, see below). Deletions are left **uncommitted** for the parent, per the run convention.

**Kept, with notes:**
- `qa/check-guidance-bodies.sh` — durable tripwire, independent of the class. Its comment at `:11-12` now names a deleted class. **Note for the guard lane/parent: reword that comment when convenient** (no behaviour change). I did not edit it — it is a guard outside my write scope.
- `docs/content/guidance-markdown/{en,et,ru}/*.md` — the 20 verbatim pre-conversion reference copies. Their only consumer was the driver's `repair` mode, which went with the driver. They are a data artifact of the applied one-shot under `docs/`; **kept as a content archive — owner's call** if they should go.
- `guidance/BodySanitizer.java` — the live server-side sanitizer (referenced from `GuidanceService`); the converter's javadoc pointed at it, but it is production code and untouched.

## 4. Test count and why it drops

- Baseline (same tree, full gate run of 2026-09-24T02:26Z, surefire reports): **1 356 tests, 153 test classes, 0 failures/errors/skipped**.
- Deleted: `MarkdownToHtmlTest` = **43** tests; the driver carries **0** test methods.
- **Expected new total: 1 313.** The drop is exactly the deleted test class — no other test was touched, weakened or removed. Actual gate numbers below.

## 5. Further dead-code candidates (reported, not deleted)

Repo-wide audit, same "no production reference" standard as the finding:

- **Main source: 358 types scanned, no duplicate simple names. Exactly ONE production-dead type existed: `MarkdownToHtml` — deleted above.** The other 34 types with zero `src/main` references are all Spring components (`@SpringBootApplication`, `@Configuration`, `@Component`, `@Service`, `@Repository`, `@RestController`, `@RestControllerAdvice`) alive through component scanning — not dead. List on request; none is a deletion candidate without an owner decision of a different kind (a "never executed in production" profile question, e.g. the `Dev*` beans, which *do* have production references from profile-wired config).
- **Test tree: 184 types scanned (post-deletion state), zero unreferenced types** — no dead test scaffolding, no orphaned fixtures.
- **Frontend:** not audited here — dead-code detection in Angular needs DI-aware (injection-token) analysis, a different toolchain and another lane's scope.
- Already on the notes board (not new, not a class): the dead `ShelterController` constructor param (`api/ShelterController.java:108`, BE-RECON — test lane's item).

## 6. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, log `/tmp/deadcode-gate.log`, exit file `/tmp/deadcode-gate.exit`):

- **Exit code: 0 — `BUILD SUCCESS`.**
- **New totals: 1 313 tests, 152 test classes, 0 failures / 0 errors / 0 skipped** (baseline: 1 356 tests, 153 classes, same tree pre-deletion). The drop is exactly **−1 class / −43 tests** = `MarkdownToHtmlTest`; the driver contributed 0 tests. No other test changed.
- **PMD 7.27.0: clean. Coverage: "All coverage checks have been met"** (the 0.93 floor held — the deleted class was self-contained, so no coverage of other code was lost).
- Frontend gate not run — nothing frontend-facing was touched (no `frontend/` file changed).

## 7. Unverified / caveats

- **Not verified:** running the app end-to-end after deletion — the gate (compile + full test suite + PMD + 0.93 coverage floor) is the verification, per the run rules. If the gate's coverage floor trips because the deleted tests carried coverage of *other* code, that would be reported, not papered over; the converter was self-contained (no other main code references it), so no cross-coverage is expected.
- **Tooling note (for the parent):** in the context-mode sandbox, `rg` with **no explicit path** reads stdin instead of `./` (its stdin is a socket, and ripgrep's heuristic picks stdin) — root-level greps there silently searched an empty stream. All negative results above were re-run with an explicit path argument and are reliable; the earlier batch-tool runs (real stdin) returned the identical set.
- The driver's `repair` mode can no longer be run (the driver is deleted). If a stored body were ever damaged, the reference files (§3) are still present; reconstructing the driver from git history (`20cb65b`) is a one-commit restore if the owner ever wants it back.
- Deletions are uncommitted working-tree changes, per the run's convention (the parent commits).
