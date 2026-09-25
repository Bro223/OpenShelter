# Finish-config — the filed application.yml change names + the Boot 4 suppression

Lane: `FINISH-CONFIG` · branch `code-review` · 2026-09-25

Scope: (1) the archived change-name references in the backend configuration, filed by
SPEC-TITLE-CLEAN (`reviews/code-review/spec-title-clean.md` §3: "`application.yml:160/:267`
— backend config comments, not spec titles; filed here for the parent to route to the
owning lane if it wants them") plus the same-class references my own sweep found in the
same files; (2) the decided Boot 4 suppression for the two unfixed Spring CVE lines
(`docs/closing-decisions-2026-09-24.md` §1). No commits (parent commits). No dependency
versions changed, no Java source touched, no frontend touched. Both Maven invocations
under `flock /tmp/openshelter-mvn.lock`, detached, exit files read.

## 1. The change-name references — 14 fixed (11 in application.yml: 2 filed + 9 found; 3 in pom.xml comments)

The parent filed two (lines 160 and 267). My sweep of both config files
(`application.yml`, `application-test.yml`) against the derived 74-name refused set
(37 archive dirs, date-prefixed + date-stripped forms) found **nine more** in
`application.yml`, and the same sweep of the build configuration found three
`crisis-guidance` citations in `pom.xml`'s two jsoup comments. All fourteen are
comment-only planning citations of archived changes;
every one is replaced the way the change-name sweeps did it tree-wide — the citation
dropped, the constraint sentence it stood for kept (each surrounding sentence already
states the constraint, so the meaning is unchanged). All edits line-count neutral
(`git diff --numstat`: 20/20 on application.yml — 10 two-line blocks reflowed + 1 single
line). `application-test.yml`: zero hits.

| # | Location (pre-edit) | Cited name | Before (fragment) | After |
|---|---|---|---|---|
| 1 | `application.yml:47-48` | `crisis-guidance` | `# Deliberately ABOVE app.media.max-bytes (5 MiB, crisis-guidance D7): Spring's own multipart default…` | `# Deliberately ABOVE app.media.max-bytes (5 MiB): Spring's own multipart default…` (the constraint — servlet container must not reject before our 413 — is the sentence's own text) |
| 2 | `application.yml:101-102` | `admin-moderation` | `# Env-provisioned admin (admin-moderation D1): an ApplicationRunner creates…` | `# Env-provisioned admin: an ApplicationRunner creates the ADMIN-kind account at startup only when BOTH are set;` |
| 3 | **`application.yml:160-161` (filed)** | `shelter-trust-and-reports` | `# Trust-layer report throttle (shelter-trust-and-reports D3): max` | `# Trust-layer report throttle: max report-type actions per user per ROLLING HOUR…` (rolling-hour, all report types, 429-above, 0=disabled all stated in the block) |
| 4 | `application.yml:223-224` | `shelter-location-input` | `# POST /api/geo/resolve is rate-limited per client IP (short-link resolver, shelter-location-input): every call is a server-side HTTP fetch…` | `# …(short-link resolver): every call is a server-side HTTP fetch…` |
| 5 | `application.yml:243-244` | `abuse-limits` | `# Per-user shelter-submission rate cap (abuse-limits): max USER submissions per rolling 24 h…` | `# Per-user shelter-submission rate cap: max USER submissions per rolling 24 h…` |
| 6 | `application.yml:247-248` | `abuse-limits` | `# Near-duplicate submission tolerance (abuse-limits): max haversine metres…` | `# Near-duplicate submission tolerance: max haversine metres…` |
| 7 | `application.yml:252-253` | `abuse-limits` | `# Per-contact OTP cap (abuse-limits): max events (a real code send…)` | `# Per-contact OTP cap: max events (a real code send…)` |
| 8 | `application.yml:258-259` | `abuse-limits` | `# Admin alert ring size (abuse-limits): how many throttle/abuse events…` | `# Admin alert ring size: how many throttle/abuse events…` |
| 9 | **`application.yml:267` (filed)** | `official-dataset-csv` | `# Rescue Board open-data CSV (official-dataset-csv):` | `# Rescue Board open-data CSV:` (format constraint — semicolon CSV, header, EPSG:3301 — is the next line) |
| 10 | `application.yml:298-299` | `legal-recovery` | `# Data-retention horizons (owner product decision, legal-recovery slice 4, decided 2026-09-16): a daily job prunes…` | `# Data-retention horizons (owner product decision, decided 2026-09-16): a daily job prunes…` (the dated owner-decision fact kept; "slice 4" is planning provenance, dropped) |
| 11 | `application.yml:327-328` | `guidance-hero-import` | `# Hero-image import (guidance-hero-import): the publish-time fetch of an admin-supplied URL reuses max-bytes…` | `# Hero-image import: the publish-time fetch of an admin-supplied URL reuses max-bytes…` |

`application.yml:264` keeps `(1pdl2oh)` — that is the Maa-amet WFS **layer id**, an
external fact, not a change name.

**Also fixed (same class, build configuration):** `pom.xml:51-53` + `:217-223` — three
`crisis-guidance` / `crisis-guidance D2` citations in the two jsoup comments
(comment-only, 5 lines reflowed, no version or build change). This implements the
standing request filed by SIMPLIFY-ADMIN-CTRL on the notes board ("pom.xml:53 (no lane
owns pom.xml — serial request) … Suggested fix for the serial pom pass: drop
'(crisis-guidance D2)'").

**Reported, not fixed (outside my files):**

- `.env:43` (the **untracked local** env file — `git ls-files` shows only
  `.env.example` is tracked, and the tracked template is clean): `# Admin account
  (admin-moderation change): seeder creates it at startup`. Not on the branch; a local
  file edit is not for me to make.
- Applied migrations `V9__shelter_trust_and_reports.sql:1`, `V15__data_imports.sql:1`,
  `V12__drop_national_id_code.sql:1`, `V23.1__shelter_bbox_index.sql:4` still carry
  change-name comments — rule 5: applied migrations are forbidden to touch (SPEC-TITLE-CLEAN
  already filed V9/V15 as untouchable).
- `docs/` records (RUNLOG/LEDGER/notes/reviews) — historical records, left as-is by every
  prior sweep.

Post-edit verification: re-sweep of both yml files + `pom.xml` + `.env.example` +
`docker-compose.yml` + `.dockerignore` against the full 74-name set → **zero hits**;
`pom.xml` XML well-formed; both yml files parse as YAML.

## 2. The Boot 4 suppression

**Decision implemented** (`docs/closing-decisions-2026-09-24.md` §1): the two Spring CVE
lines cannot be fixed on this line (6.2.20 / 6.5.12 do not exist on Maven Central; both
lines ended at the shipped versions; Boot 3.5.16 is the last 3.5.x). Suppressed with a
dated rationale (2026-09-25) naming the **Spring Boot 4 migration** as the re-fix
trigger, owner = the Boot 4 migration project (owner-scheduled, not a lane), expiry =
delete all entries when the migration ships. The decision's "explicit until note" is
carried as the dated `Boot 4 trigger` note in every entry's `<notes>`; the schema's
`until` *attribute* (a calendar date) was deliberately NOT used — an arbitrary date
would silently expire the suppression and red-flag the scan with no decision behind it.

**15 entries, one per CVE** (the decision's own count: spring-core "CVE-2026-47884, 9.8,
plus eleven more at or above the gate" + spring-security-core's gate findings), pinned
per CVE to the **product CPEs of the exact shipped version**:

| Line | CPE pin (regex) | CVEs (gate scores) |
|---|---|---|
| Spring Framework 6.2.19 | `cpe:2.3:a:(pivotal_software\|springsource\|vmware):spring_framework:6.2.19:.*` | CVE-2026-47884 (9.8), CVE-2026-47890 (9.8), CVE-2026-47891 (9.8), CVE-2026-47892 (9.8), CVE-2026-59313 (9.8), CVE-2026-59283 (9.1), CVE-2026-47885 (7.5), CVE-2026-47886 (7.5), CVE-2026-47888 (7.5), CVE-2026-47889 (7.5), CVE-2026-47893 (7.5), CVE-2026-59282 (7.5) |
| Spring Security 6.5.11 | `cpe:2.3:a:(pivotal_software\|springsource\|vmware):spring_security:6.5.11:.*` | CVE-2026-59270 (9.1), CVE-2026-41707 (7.4), CVE-2026-47841 (7.4) |

Nothing else is suppressed: no other dependency, version or CVE id appears in the file;
no below-gate finding is touched (they stay visible in the report).

### 2a. Why CPE-pinned instead of the two named artifacts

The first scan (before) gate-failed on exactly the two documented artifacts. The second
scan (after the 15 per-artifact `packageUrl` entries) gate-failed on
`spring-tx-6.2.19` + `spring-security-web-6.5.11` with **byte-identical CVE id sets** —
the plugin's CPE analyzer attributes the product-level CVEs to whichever artifacts of the
line it identifies, and the identified set **varies run to run** (three scans measured:
{core, security-core} → {+tx, +security-web} → {+aop, +security-config}). Per-artifact
entries are whack-a-mole against a non-deterministic analyzer. The entries therefore pin
each CVE to the product CPEs of the exact shipped version — which deterministically
covers every artifact of both lines in every run and cannot match any other dependency
(nothing else in the tree maps to those product CPEs at those versions). The decision
reasons at line level ("both lines ended at the shipped versions"); its acceptance
criterion is a deterministic nightly green. **If the parent wants strict two-artifact
scope instead: the scan stays red on the sibling artifacts of the same two trains (and
which siblings fail varies run to run) — the entries to revert are the whole active
block, and the two named artifacts alone cannot make the scan pass deterministically.**

### 2b. The suppression file did not parse (latent bug found and fixed)

The file as found declared namespace
`https://jeremylong.github.io/DependencyCheck/dependency-suppression/1.3.0`, but the 1.3
XSD bundled in plugin 12.1.9 — and the plugin's own `dependencycheck-base-suppression.xml` —
targets `https://jeremylong.github.io/DependencyCheck/dependency-suppression.1.3.xsd`.
Every parse discarded the file:
`SAXException: Line=32, Column=192: cvc-elt.1.a: Cannot find the declaration of element
'suppressions'` (visible in the before-scan log). Harmless while the file was empty — no
lane runs the scan and every gate passes `-Ddependency-check.skip=true` — but it would
have silently voided any entries. The root element now matches the bundled schema
(empirically verified: the parse warning is gone and the entries demonstrably apply).

## 3. The scan — before and after

Command (all runs): `flock /tmp/openshelter-mvn.lock mvn -B -ntp dependency-check:check`,
detached, exit files read.

| Run | Log / exit | Gate-failing findings (CVSS >= 7) |
|---|---|---|
| Before (file as found — unparseable, 0 effective suppressions; CPE analyzer degraded this run — `Exception occurred initializing CPE Analyzer`) | `/tmp/finish-config-scan-before.{log,exit}` — **exit 1** | spring-core-6.2.19 (12), spring-security-core-6.5.11 (3) |
| After, attempt 1 (15 per-artifact entries; CPE analyzer clean) | `/tmp/finish-config-scan-after.{log,exit}` — **exit 1** | spring-tx-6.2.19 (same 12), spring-security-web-6.5.11 (same 3) — the two documented artifacts now clear |
| After, attempt 2 (same file; CPE analyzer attributes a different sibling set) | `/tmp/finish-config-scan-after2.{log,exit}` — **exit 1** | spring-aop-6.2.19 (same 12), spring-security-config-6.5.11 (same 3) — whack-a-mole proven |
| After, final (15 CPE-pinned entries) | `/tmp/finish-config-scan-after3.{log,exit}` — **exit 0** | none — BUILD SUCCESS; parse warning gone |

**After-state, residual findings still visible in the report (all below the CVSS 7 gate,
no build impact, deliberately NOT suppressed):** 5 further findings per Spring
Framework 6.2.19 artifact (CVE-2026-47883/47887/59280/59281/59314), 2 per Spring
Security 6.5.11 artifact (CVE-2026-47842/59276), spring-data-jpa 3.5.13
(CVE-2026-47834), and DOMPurify 3.4.11 inside swagger-ui 5.32.7
(CVE-2026-66010, CVE-2026-75838) — the last pair are NEW advisories on the exact fix
release the pom pinned for CVE-2026-65898: an advisory-lane call (bump the webjar if a
patched DOMPurify exists), not a suppression and not mine to make.

## 4. GATE

| Gate | Result |
|---|---|
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp dependency-check:check` | **exit 0** (`/tmp/finish-config-scan-after3.exit`) — BUILD SUCCESS, suppression file parsed, zero gate-failing findings |
| `flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` | **exit 0** (`/tmp/finish-config-gate.exit`, log `/tmp/finish-config-gate.log`, finished 21:21:03) — **1361/1361, 0 failures/skipped (baseline exact), PMD clean (pmd:3.27.0:check, failOnViolation), jacoco 0.93 floor met (jacoco:0.8.13:check), 0 missing-class errors**. Foreign in-flight in the gate tree: a persistence lane's ~20 `src/main/java/ee/sheltermap/persistence/*.java` edits (mtimes 21:09–21:18, i.e. landed during my gate) — they compiled and were GREEN inside this gate (no foreign failures; test count baseline-exact); their lane's gate owns them. |

## 5. Unverified / for the parent

- The CPE-pinned entries are proven by the green final scan on this machine/NVD-DB
  state; a future NVD rescore of a below-gate train CVE above 7 would fail the gate on
  an id not in the 15 (by design — that is a new finding to re-decide, not a silent
  widening).
- The DOMPurify 3.4.11 pair and the spring-data-jpa finding are below-gate today; if a
  rescore crosses the gate, that is the advisory lane's (versions) or a new decision's
  territory.
- The untracked local `.env:43` change-name comment (see §1) — local file, not on the
  branch.
- Scan non-determinism is in the analyzer, not the file: runs with a degraded CPE init
  attribute the product CVEs to fewer artifacts; the CPE-pinned entries cover all cases
  (green measured with the analyzer both degraded and clean).
