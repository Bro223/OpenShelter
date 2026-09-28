# SPLIT-ADMIN-GUIDANCE — lane report

**Branch:** `code-review-2` (no commit — parent commits)
**Scope:** `src/main/java/ee/sheltermap/api/AdminGuidanceController.java` (716 lines) +
any class extracted from it + the tests pinning it. Nothing else touched.

## Verdict: NOT a defect — no extraction performed

The file is flat, uniform endpoint delegation. Every one of its 13 endpoints is
authorize → parse → delegate → map, with all business rules already living in the
service layer (in the `guidance` package after the sibling lanes' extractions).
The 716-line size is carried by the OpenAPI document surface and the
constraint javadoc — 37 % of the file is annotation text that `OpenApiSnapshotIT`
pins byte-for-byte and that structurally must sit on the endpoint methods — not by
logic. **The lane deliberately changed nothing.**

## The measurements behind it

File composition (all 716 lines classified):

| Kind | Lines | Share |
|---|---|---|
| OpenAPI/mapping/parameter annotations (`@Operation`, `@ApiResponses`, `@Parameter`, …) | 265 | 37 % |
| Javadoc + comments (per-endpoint contract text) | 191 | 27 % |
| Executable code + declarations | 194 | 27 % |
| Package + 38 imports | 39 | 5 % |
| Blank | 28 | 4 % |

Method census (body = non-blank lines after the opening brace):

| Endpoint | Sig line | Body | What the body is |
|---|---|---|---|
| `list` (GET `/`) | :142 | **29** (longest) | the only pipeline: bounds → locale → search-filter → slice → hero index → map; every step one call into a named collaborator |
| `get` (GET `/{id}`) | :221 | 6 | authorize, locale, `guidance.getById`, map |
| `create` (POST `/`) | :265 | 7 | authorize, `guidance.create` (10 fields), map |
| `update` (PUT `/{id}`) | :318 | 10 | authorize, locale, `savePost`, content-row read, map |
| `reorder` (PUT `/order`) | :378 | 5 | authorize, locale, scoped/unscoped service call |
| `publish` (POST `/{id}/publish`) | :415 | **2** | `guidance.publish(requireAdmin(), id)` — one statement |
| `unpublish` (POST `/{id}/unpublish`) | :435 | **2** | one statement |
| `delete` (DELETE `/{id}`) | :458 | 3 | one statement |
| `listTranslations` (GET `/{id}/translations`) | :483 | 3 | one service call + mapper |
| `createTranslation` (POST `/{id}/translations`) | :509 | 6 | one service call + mapper |
| `updateTranslation` (PUT `/{id}/translations/{locale}`) | :536 | 6 | one service call + mapper |
| `deleteTranslation` (DELETE `/{id}/translations/{locale}`) | :561 | 3 | one statement |
| `attachTranslation` (POST `/{id}/translations/attach`) | :589 | 5 | one service call + mapper |

**12 of the 13 endpoint bodies are ≤ 10 non-blank lines; 13/13 begin with the
shared guard `adminAccess.requireAdmin()`; 13/13 have exactly one delegated
write/read per request.** The longest body (`list`, 29 lines) is a flat,
single-pass pipeline with four constraint comments — no branching beyond the
scoped/unscoped ternaries, no nested control flow.

Private helpers (6, all named, all javadoc'd): `heroIndex` :603 (11 L, one
batched `findByIds`), `heroIndexFor` :616 (7 L, one `findById`), `detailContent`
:633 (9 L, the detail's locale-row-or-404), `savePost` :651 (9 L, the
scoped/unscoped update pick), `toAdminDto` :674 (26 L, pure field mapping),
`toTranslationDto` :703 (12 L, pure field mapping). Total executable method
bodies: **161 non-blank lines across 19 methods**.

Where the "logic" actually lives (the controller's calls, counted): 18 distinct
`GuidanceService` methods (the rules, validation, 404/409/audit vocabulary — the
layer the sibling lanes' `HeroSaveResolver` / `GuidanceTranslationService` /
`GuidanceLifecycleService` / `GuidanceValidation` extractions built), 2
`GuidanceSearch` statics (the search policy — already extracted by the
`SIMPLIFY-GUIDANCE-CTRL` lane), 3 `Pagination` statics (the shared paging
vocabulary), 2 `MediaAssetRepository` reads (hero index), 1 `MediaService`
call (`derivativeSrcset`). The 404 word is not even re-declared: `detailContent`
throws `GuidanceNotFoundException(GuidanceService.POST_NOT_FOUND_MESSAGE)`
(`GuidanceService.java:116` — the service's own constant, same-message idiom).

**No duplicated logic.** The only repeated lines are the one-line guard call
(the shared `AdminAccess` by design) and the five uniform
`content != null ? content.getX() : post.getX()` ternaries inside `toAdminDto` —
the DTO's documented content-source contract (locale row or home columns)
expressed once in one method. Duplicated-string census: every repeated literal
is OpenAPI annotation text (`"Required: confirm=true."` ×2 = two `@Parameter`s
on `delete`; the `heroImportError` response description on create and update;
the two `/translations` route fragments).

## Seams considered and REJECTED (say so rather than doing it)

1. **`toAdminDto` + `toTranslationDto` → a mapping collaborator.** Rejected —
   the exact shape `SPLIT-QUERY` rejected for `ShelterQueryService` ("the DTO
   mapping as a third collaborator"): 38 lines of stateless field mapping with
   one external call; moving them to a new file buys a rename, not a boundary.
   The mapper IS the response shape of this surface, and each of the 13
   endpoints keeps its own status/verb/annotation surface untouched.
2. **`heroIndex` + `heroIndexFor` → a hero-asset read collaborator.** Rejected —
   18 lines total, already named private helpers with their own javadoc, each
   one repository call; extraction would be the `SPLIT-MODERATION`-rejected
   "one-method component = file-shuffling".
3. **`detailContent` / `savePost` → helpers in a collaborator.** Rejected — one
   method each, 9 lines each; the 404 deliberately reuses the service constant
   (forking it into a collaborator would duplicate the 404 literal the
   `SPLIT-MODERATION`/`NEXT-SPLIT-GUIDANCE` lanes kept single-sourced).
4. **The `list` pipeline (locale scope → search filter → slice) → a list
   assembly collaborator.** Rejected — the orchestration IS the endpoint; every
   step already delegates to a named collaborator, so the new class would be a
   single-method middle man (Fowler baseline) adding an indirection with no
   duplication removed. No other endpoint shares the pipeline.
5. **Splitting the file into a posts controller + a translations controller.**
   Rejected — a route-level reorganization of the HTTP surface (tags/paths in
   the snapshot-pinned OpenAPI document) with no logic split to justify it; the
   five translations endpoints share nothing but one mapper.

Contrast with the three files the sibling lanes DID split: `GuidanceService`
(1084→822), `ShelterQueryService` (1002→675), `AdminModerationService`
(804→649) each contained a real data engine or cohesive cluster (the no-N+1
trust batch, the pulse aggregator, the audit trail, the users-tab cluster, the
hero resolver). This file contains none: its logic was already in the service
layer before this lane started. Being "second-largest in the tree" is a
consequence of owning the app's largest API surface (13 endpoints × a full
OpenAPI block each), which is the legitimate reason for a controller to be
long.

## Behaviour preservation

No change was made, so preservation is exact by construction: same paths, verbs,
status codes, request/response shapes, validation order and error mapping. The
public HTTP surface is pinned by `AdminGuidanceSearchPagingIT`,
`GuidanceLocaleFilterIT`, `GuidanceOrderIT`, `GuidanceTranslationIT`,
`HeroImageImportIT`, `OpenApiContractIT`, `CorsExposedHeadersIT`,
`GuidanceAuthorizationIT` (the authorization ITs pin the 401/403 surface) and
`OpenApiSnapshotIT` (the annotation text, via `docs/api/openapi.json`). No test
file touched. `git status` clean before and after; `git diff` empty on the lane's
files.

## Anchors (rule 6)

**None owed.** Zero citations of `AdminGuidanceController` in
`docs/agent/00-CURRENT-STATE.md` and zero in `DocumentationFactsTest`
(grep-verified on the current tree — 0 hits each, re-checked after the
`NEXT-SPLIT-GUIDANCE`/`SWAGGER-BUMP` doc edits, which only touched the
hero-zone §5 citations). No code moved, so no shift could arise.

## Evidence the suite passed unmodified

- Full suite is the evidence (no file changed): `AdminGuidanceSearchPagingIT`,
  `GuidanceLocaleFilterIT`, `GuidanceOrderIT`, `GuidanceTranslationIT`,
  `HeroImageImportIT`, `OpenApiContractIT`, `CorsExposedHeadersIT`,
  `GuidanceAuthorizationIT` and `OpenApiSnapshotIT` all ran green unmodified in
  the gate (part of the 1362).
- `git diff --stat` on scope: empty (no source or test file modified by this
  lane; the only files this lane adds are this report and its notes-board row).

## Gate

- `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify
  -Ddependency-check.skip=true` (detached, exit file read) → **exit 0** —
  Tests run: **1362**, Failures: 0, Errors: 0, Skipped: 0 (baseline exact — the
  tree is the committed post-split state: `ShelterQueryService` 675,
  `AdminModerationService` 649, `GuidanceService` 822), PMD `pmd:3.27.0:check`
  clean, JaCoCo 0.93 floor met, 0 missing-class errors (no rule-7 hazard),
  BUILD SUCCESS, total 02:24 min, finished 2026-09-28T17:51:16+03:00.
  Log `/tmp/splitag-gate.log`, exit `/tmp/splitag-gate.exit`.

## Filed rather than made (notes board, rule 4)

- **Dead change name `bilingual-guidance`** in comments of 4 main files:
  `api/AdminGuidanceController.java:465` (this lane's file — the translations
  section divider), `api/GuidancePostDto.java:19`, `api/GuidanceController.java:155`,
  `guidance/GuidanceService.java:722`. Unresolvable: no `bilingual-guidance`
  directory in `openspec/changes` (live or archive) or `openspec/specs/`, and it
  is not on `SourceVocabularyTest`'s 74-name list (so the guard passes silently)
  — the same class `DEAD-NAMES-CLEAN` handled for `admin-locale-split`/
  `admin-locale-scope`. Comment rewording only; the one line in my file can be
  folded into the same pass if the parent assigns it.

## Unverified / residual

- Nothing else. No code change, no anchor shift, no signature change, no
  cross-lane impact — nothing to verify beyond the gate.
