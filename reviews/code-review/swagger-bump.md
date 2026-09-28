# SWAGGER-BUMP — report

Lane `SWAGGER-BUMP` · branch `code-review-2` · 2026-09-28

**Scope:** bump the swagger-ui webjar pair (pom.xml + application.yml) to the release that
bundles DOMPurify 3.4.13, clearing the two open below-gate DOMPurify advisories from
`next-decisions-research.md` D3. **Changed exactly one pair of values** (plus the two
adjacent comments that document the pairing constraint). No other version, no other code.
One cross-lane action (five doc-anchor re-derivations, recorded in `CODE-REVIEW-NOTES.md`,
see below).

## Before / after

| File | Property | Before | After |
|---|---|---|---|
| `pom.xml` (was line 50) | `<swagger-ui.version>` | 5.32.7 | **5.32.15** |
| `src/main/resources/application.yml` (was line 79) | `springdoc.swagger-ui.version` | 5.32.7 | **5.32.15** |

The property key and its current value were verified from the files, not assumed:
`springdoc.swagger-ui.version` under the `springdoc:` root — the value the `/swagger-ui/**`
resource handler serves from (`classpath:/META-INF/resources/webjars/swagger-ui/<version>/`),
springdoc 2.8.17 hardcoding the default to 5.32.2 in its own bundled
`springdoc.config.properties` — the documented trap that makes the two values move together.

## The bump, measured from jar bytes (not trusted from the research)

- `org/webjars/swagger-ui/5.32.15/swagger-ui-5.32.15.jar` from Maven Central
  (fetched 2026-09-28, 1,174,450 bytes): `swagger-ui-bundle.js` (1,552,209 bytes) contains
  exactly one DOMPurify version literal — `version="3.4.13"` — and no other `3.4.1x` string.
  sha256 of the bundle: `a7e344f2770b2f07527ce828e0951626983b8f2dcdb7a826689c0232023f995b`.
- Baseline captured from the **live dev server** (port 8080, `SPRINGDOC_ENABLED=true`,
  still on 5.32.7) before the bump: served `/swagger-ui/swagger-ui-bundle.js` = 1,536,858
  bytes, sha256 `dcc1ebdc8b581b2eeac3b7a4892002621b97d4b39d41822ee2ea1e034b6e053b`,
  containing `version="3.4.11"` — the vulnerable pair (CVE-2026-66010, CVE-2026-75838).

## The UI still resolves — and serves the new webjar

1. **Guard green:** `theServedUiResolvesItsOwnWebjarAssets`
   (`OpenApiContractIT.java:75`) — fetches `/swagger-ui/swagger-ui-bundle.js` through the
   resource handler and asserts 200 + JS content type + non-empty. Focused run
   (`flock … mvn -B -ntp test -Dtest=OpenApiContractIT`, exit file): **10/10 green, exit 0**.
2. **Only the new webjar on the classpath:** the gate-built
   `target/shelter-map-0.0.1-SNAPSHOT.jar` contains exactly one swagger-ui webjar —
   `BOOT-INF/lib/swagger-ui-5.32.15.jar` (no 5.32.7, no the 5.32.2 springdoc defaults).
3. **Served bytes == new webjar bytes (byte-identity):** booted the packaged jar
   (`--server.port=8090 --spring.profiles.active=dev`, dev DB):
   - `GET /swagger-ui/swagger-ui-bundle.js` → **200**, 1,552,209 bytes,
     sha256 **`a7e344f2…f995b`** — identical to both the packaged lib-jar bundle and the
     Maven Central 5.32.15 artifact (three-way hash match); contains `version="3.4.13"`.
   - `GET /swagger-ui/index.html` → 200; `GET /v3/api-docs` → 200.
   - The pre-bump 5.32.7 hash (`dcc1ebdc…`) does not match — the served bytes are the new
     webjar's, not a stale artifact.
   - First boot without the dev profile was **refused by `ApiDocsGuard`** (fail-closed,
     `active profiles=[]`) — expected guard behaviour, not a defect; booted with `dev`.
4. **OpenAPI snapshot:** `OpenApiSnapshotIT` 1/1 green in the gate — the document is
   unchanged by a UI-webjar bump, so `docs/api/openapi.json` was **not** regenerated.

## Advisories — the scan proves the clear

`flock /tmp/openshelter-mvn.lock mvn -B -ntp dependency-check:check` → **exit 0**
(report preserved at `/tmp/swaggerbump-report.html`; the scanned webjar is
`swagger-ui-5.32.15.jar`; **zero** DOMPurify mentions in the report):

| Advisory | Before | After |
|---|---|---|
| CVE-2026-66010 (DOMPurify < 3.4.12, CVSS v3 6.1 / v4 5.1) | open via bundled 3.4.11 | **cleared** — absent from the report |
| CVE-2026-75838 / GHSA-55q2-fjhq-7xh7 (RetireJS, medium) | open via bundled 3.4.11 | **cleared** — RetireJS analyzer ran, no DOMPurify finding |

No new finding at or above the gate was introduced by the bump — the stop condition was
not met.

## What remains below the gate (8 findings, all ≤ 6.5; from the scan log's own list)

| Dependency | Findings | Score | Status |
|---|---|---|---|
| spring-core 6.2.19 | CVE-2026-47883, -47887, -59280, -59281, -59314 | 6.1 each | no 3.5-line fix — Boot 4 watch |
| spring-data-jpa 3.5.13 | CVE-2026-47834 | 6.5 | no 3.4.x/3.5.x fix on Central — Boot 4 watch |
| spring-security-core 6.5.11 | CVE-2026-47842, -59276 | 6.5 each | no 6.5-line fix — Boot 4 watch |

These are exactly the research's remaining three groups (its ten findings minus the two
DOMPurify ones now cleared). The 15 suppressed at-gate findings (6.2/6.5 line endings,
Boot-4-only fixes) are untouched — `dependency-check-suppressions.xml` was not modified.

## Gate exit codes (all `flock /tmp/openshelter-mvn.lock`, detached, exit files)

| Run | Command | Exit | Result |
|---|---|---|---|
| guard (blocked) | `test -Dtest=OpenApiContractIT` | 1 | sibling lane's mid-refactor tree (`GuidanceService.java:888,890 cannot find symbol: URI`) — not my change; see below |
| guard | `test -Dtest=OpenApiContractIT` | **0** | 10/10 after the sibling lane landed |
| gate (blocked) | `clean verify -Ddependency-check.skip=true` | 1 | 1362 run, **1 failure** — `DocumentationFactsTest` on five stale §5 hero-zone citations left by the landed sibling lane; 1361/1362 green, OpenApiContractIT + OpenApiSnapshotIT green |
| gate | `clean verify -Ddependency-check.skip=true` | **0** | **Tests run: 1362, Failures: 0**, PMD clean, JaCoCo 0.93 floor met, BUILD SUCCESS |
| scan | `dependency-check:check` | **0** | the clear, above |

**Test count 1362 vs the 1359 baseline:** the +3 are `NEXT-SPLIT-GUIDANCE`'s new
`GuidanceValidationTest` pins (its notes row: "1359 → 1362 (+3; nothing deleted or
weakened") — that lane landed while this lane was in flight; both gates ran on the
combined tree.

## Cross-lane actions (recorded, with the old/new ranges, in `CODE-REVIEW-NOTES.md`)

- **Gate blocked twice by `NEXT-SPLIT-GUIDANCE`, never by this pair.** First by its
  mid-refactor tree (uncompilable `GuidanceService.java`, uncommitted in its worktree);
  then, after it landed, by five stale `docs/agent/00-CURRENT-STATE.md` §5 citations its
  refactor orphaned (`GuidanceService.java` 1084 → 822 lines).
- **Re-derived those five anchors on its behalf** (the FINISH-P3-BE precedent in the same
  notes file; no anchor-pass lane was running and my gate required the combined tree
  green). All five verified in-tree in `HeroSaveResolver.java` (197 L) against the test's
  token/phrase semantics (`DocumentationFactsTest:1607-1642`): `:802-827` →
  `HeroSaveResolver.java:131-156` (javadoc + `resolveHeroOnSave` declaration, token at
  :155); `:839-850` → `:168-180` (catch; the quoted phrase "A failed import NEVER blocks
  the save" at :170); `:845-849` → `:174-177` (fallback assignment); `:853-860` →
  `:182-189` (`isHeroImportedFrom` javadoc + declaration, token at :189); `:831-835` →
  `:160-164` (the no-re-fetch guard, token at :160). One-for-one line swaps — the doc's
  line count is unchanged and no other anchor cites the doc's own lines.

## Environment actions (discipline, not code)

- **Stopped the live dev server** (`mvn spring-boot:run`, up since 2026-09-27, running in
  this worktree on 5.32.7) **before the gates** — rule 7 / D5 item 21: a gate and a
  rebuilding dev server in one worktree wipe each other's `target/` (7th on record).
- **Restarted it afterwards** the documented way (`SPRING_PROFILES_ACTIVE=dev`
  `mvn spring-boot:run`, per `dev-start.sh`), so the owner's dev server now runs the new
  build with the 5.32.15 webjar.

## Unverified / caveats

- The NVD data is a point-in-time snapshot (the scan reused the ~1 h-old cached NVD data
  from the research lane's 03:25 run; a rescore ≥ 7.0 on any remaining CVE is the
  designed tripwire, not a regression of this bump).
- 5.32.13/5.32.14 were not individually byte-measured by this lane (the research measured
  the whole 5.32.13–5.32.15 range; this lane self-measured only the chosen 5.32.15).
- The pre-existing uncommitted changes from other lanes (`guidance-gateway.spec.ts`
  formatting, the guidance refactor files) were verified as part of the combined tree but
  are not this lane's.
