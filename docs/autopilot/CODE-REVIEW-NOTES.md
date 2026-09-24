# Code review — cross-lane notes

Shared message board for the `code-review` run. Rules are in `docs/autopilot/CODE-REVIEW-RUN.md`.

**How to use it:** one line per entry, with the file and line. Write here when (a) you find a problem in a file you do not own, (b) you need another lane to change something, or (c) another lane's change broke your work and you want it reversed. Read it before you start and again before you report.

**Do not edit another lane's entry.** Append your own; if you disagree, append a reply beneath it referencing it.

| From | About (file:line) | Message |
|---|---|---|
| BE-RECON | api/ShelterController.java:108 | Dead `ShelterRepository` constructor param ("no longer assigned", kept for the frozen seam). Removal needs the test seam in `src/test/java/ee/sheltermap/api/ShelterControllerDetailReadTest.java` — test lane to pick up. Detail: `reviews/code-review/be-recon.md` §4.4, §6.6. |
| BE-RECON | guidance/MarkdownToHtml.java:70 | 411-line main-source class with NO production callers — only `MarkdownToHtmlTest` + `MarkdownMigrationDriver` (both test tree). Owner decision needed before any lane touches it (deletion would delete tests, currently forbidden). Detail: be-recon.md §2.2, §7 target 3. |
| BE-RECON | api/Pagination.java:20 | Proposed move out of `api` (only reverse import in the tree: `guidance/MediaService.java:3`). Shared by many controllers — serialize the move across lanes; do not move mid-batch while a controller lane is active. Detail: be-recon.md §1.1. |
| BE-RECON | src/test/java/ee/sheltermap/config/SourceVocabularyTest.java:47-69 | Guard-coverage gap: forbidden patterns miss every planning-id form the code actually uses (`Wave 9`, `W2-A`, `D4`, `M9`, `V26 …` — ~600 refs), so the no-unresolvable-ids rule passes vacuously. Guard lane: extend patterns; migration-name forms (`V\d+__file.sql`) stay legal. Detail: be-recon.md §4.1-4.2, §6.7. |
