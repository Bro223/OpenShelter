# SIMPLIFY-INGESTION — registry ingestion readability pass

**Lane:** SIMPLIFY-INGESTION · **Branch:** `code-review` · **Mode:** behaviour-preserving simplification.
**Scope (exclusive):** `src/main/java/ee/sheltermap/ingestion/**` + the tests pinning it (`src/test/java/ee/sheltermap/ingestion/**`).
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` (readability standard + hard rules), skills `clean-code`, `code-review`, `test-driven-development` from `docs/skills/`, BE-RECON `reviews/code-review/be-recon.md` §5.5 (the registry-import safety must-stay list).

---

## 1. What was read (whole scope, main + test)

All 14 main-source files (~1,230 lines) read in full: `CsvRegistryClient`, `RegistryCsvParser`, `Lest97AxisOrder`, `LEst97Transformer`, `ShelterImportService`, `RegistryShelterParser`, `ShelterRegistryClient`, `DevRegistryClient`, `RegistryProperties`, `RegistryFetch`, `RegistryShelterDto`, `ImportResult`, `ShelterParser`, `RegistryUnavailableException`. All 8 test classes + the `FakeRegistryClient` fake read in full (64 tests total). The pinned anchors in `docs/agent/00-CURRENT-STATE.md` §6 were mapped line-by-line before any edit.

## 2. What was changed, with before/after

Guard tests were the red/green pins throughout (TDD refactor discipline: green → refactor → green, no test touched). No new behaviour was added, so no new test was written — the existing 64 pins are the proof.

### 2.1 `CsvRegistryClient.java` (291 → 305 lines)

| Unit | Before | After | What |
|---|---|---|---|
| `fetch()` | 61 lines | **43 lines** | flattened narrative: previous stamp → download → 304 early return → version stamps → parse → dropped warn → per-row mapping → aggregate warn → return |
| `previousVersionStamp()` (new, extracted) | 4 inline lines + 3-line comment | 1 call + named step | the If-Modified-Since reuse constraint (HTTP-date only; ETag ⇒ no 304 possible) moved to the step's javadoc |
| `parseBody(byte[])` (new, extracted) | 13 inline lines | 1 call + named step | isolates UTF-8 explicit decode + parse + the deterministic bad-header → no-retry translation; both constraint comments travel with it |
| `splitAddress` | returned `String[]`, positional `segments[0]/[1]` at the call site | returns new private record **`AddressSegments(county, municipality)`**; the always-true `parts.length >= 1 ? … : null` ternary deleted | the run doc's "multi-dimensional variable standing in for a small named structure" |
| class javadoc | 8-line history paragraph ("the old Maa-amet WFS layer … carry over") | 6-line constraint paragraph (source URL, format, transformer, retry policy) | history out, constraints kept (the 304/versioning paragraph is unchanged — it is the contract) |

### 2.2 `RegistryCsvParser.java` (171 → 178 lines)

| Unit | Before | After | What |
|---|---|---|---|
| `parse()` | 37 lines, header flag + row mapping interleaved | **20 lines** | flat: null → BOM/trim → loop over data lines → row-or-drop → return |
| `dataLinesAfterHeader(String)` (new, extracted) | the interleaved header-state machine | named step with the loud-failure constraint in its javadoc (first non-blank line must be the header; wrong/truncated ⇒ deterministic throw) | quote-aware validation stays exactly as pinned |
| dead branch | `if (text.strip().isEmpty()) return new Parsed(List.of(), 0);` at the end of `parse` | **deleted** | unreachable in effect: an empty/blank file loops over zero non-blank lines and returns `Parsed(List.of(), 0)` anyway (the empty-input pins still pass) |
| `toRow` / `parseCoordinate` | `fields.get(n) == null ? "" : …` ×3 and `if (raw == null) return NaN` | deleted | `splitFields` never emits null elements — defensive checks the code no longer needed |
| class javadoc | one 113-char wrapped line | rewrapped | no content change |

The quote-aware `splitFields` state machine itself is **untouched** (RFC-4180-lenient quoting, pinned by `splitFieldsHandlesQuotedEscapesAndUnquotedFields`).

### 2.3 `ShelterImportService.java` (276 → 309 lines)

| Unit | Before | After | What |
|---|---|---|---|
| `importFromRegistry()` | 59 lines, **nested** `try { try { … } catch (RegistryUnavailableException) { … } } finally { … }` | **35 lines** | one guard → one `try/catch/finally`; the 304 path and the apply path each early-return with their own log + audit (statuses `SKIPPED`/`NOT_MODIFIED`/`OK`/`FAILED` and the `at` timestamp order preserved exactly) |
| `applyFetched(RegistryFetch, Instant)` (new) | the pre-check loop inline in the inner try | named step: fit pre-check + oversize warn, then the transactional apply | |
| `fitColumnLimits` (new) + `Fit` record | inline loop with two locals | named step returning `Fit(fitting, oversize)` — no more two-locals plumbing across the method boundary | |
| `doImport()` | 53 lines | **24 lines** | reads top-down: parse → skipped arithmetic → rejected warn → keep-list → `upsert` → `delist` → result |
| `upsert` (new) + `UpsertCounts` record | inline 14-line loop incrementing a caller-local `skipped` | named step returning `UpsertCounts(created, updated, duplicates)`; duplicate accounting re-joined in `doImport` as `skipped + duplicates` (identical value) | the create/update/delist semantics are now one narrative |
| `delist` (new) | inline if/else with the blind-wipe guard | named step; the "delist only the fetched source; empty keep-list never wipes" constraint lives in its javadoc | |
| class javadoc | `source = REGISTRY` (no such `ShelterSource` value exists) | "only the source this run actually fetched — USER rows are sacred …" | stale comment corrected to what the code does (the `fetchedIds` local renamed `keepIds` for the same reason) |

### 2.4 Comment-only, one line each

- `RegistryProperties.java` (70 → 71): `politenessDelay` documented "sleep between page requests (never hammer a public service)" — page requests no longer exist; now marked vestigial (the bulk-CSV client makes one request per run; the property is bound but has no production caller — kept, it is part of the `app.registry.*` config surface and the record shape is pinned by `RegistryPropertiesTest`).
- `DevRegistryClient.java` (45 → 45): fixture comment "mirrors the Päästeamet (Maa-amet WFS) dataset" → "…open-data CSV dataset" (legacy naming).

### 2.5 Deliberately left (and why)

- **`Lest97AxisOrder.java`** — untouched. Already flat (4-line `resolve`, two 2-line band predicates), already named for what it is, and its javadoc *is* the mechanism's evidence (the 0-of-303 measurement, the Pärnu Hotell misplacement). Anchored at `:7-23,33-37,54-62` and `:25-28` — editing it would owe anchor shifts for zero readability gain.
- **`LEst97Transformer.java`** — untouched. 55 lines, one job, the CRS-parameter rationale is a real constraint (no proj4j EPSG registry dependency).
- **`RegistryShelterParser.java`** — untouched. Already flat early-return `tryParse`; the two coordinate guards (WGS84 range + Estonia bbox backstop) are the pinned backstop, named and short.
- **`RegistryFetch`, `RegistryShelterDto`, `ImportResult`, `ShelterRegistryClient`, `ShelterParser`, `RegistryUnavailableException`** — untouched. Small, honest, javadoc states current contracts.
- **`RegistryProperties` record shape** — untouched. `pageSize`/`politenessDelay` are vestigial (no production callers, grep-verified) but the 9-arg shape is pinned by `RegistryPropertiesTest` and the `application.yml` binding; removal is an owner/config-surface decision, not a lane one. The fail-closed message still names the removed `paasteamet` WFS client — that wording is **pinned** by `RegistryPropertiesTest.theRemovedPaasteametValueFailsClosedAtBindTime` (`hasMessageContaining("'paasteamet'")`, `"no longer published"`), so it stays.
- **All 8 test classes + fake** — byte-identical (`git status`: zero entries under `src/test/java/ee/sheltermap/ingestion/`).

## 3. Guard evidence — every pin passed unmodified

Baseline (pre-edit, `flock`-locked): 64/64 green. Post-edit (same invocation): 64/64 green. No test file modified at any point.

| Test class | Pins | Baseline | Post-edit |
|---|---|---|---|
| `Lest97AxisOrderTest` (6) | value-band axis detection: live-publisher transposed row swapped, name-honouring row not swapped, same-band and out-of-band rows rejected, bands cover the live file's extremes | 6/6 | 6/6 |
| `CsvRegistryClientTest` (11) | conditional fetch (If-Modified-Since round-trip, 304 ⇒ not-failure, ETag fallback, dataAsOf stamping), transient-only retries, deterministic-4xx/bad-header no-retry, unplaceable rows rejected + counted + never placed | 11/11 | 11/11 |
| `RegistryCsvParserTest` (11) | quote-aware header (quoted + unquoted), quote-aware fields incl. escaped quotes, BOM/CRLF, malformed-row drop counting, blank-line tolerance, empty-input forms, wrong/truncated header ⇒ `IllegalArgumentException` | 11/11 | 11/11 |
| `ShelterImportServiceTest` (18) | create/update/delist counts, USER rows sacred, MUNICIPALITY rows never delisted, malformed/oversized/rejected rows skipped + kept from delisting, dedupe-first-wins, registry-down failure, empty-fetch no-blind-wipe, overlap guard, audit rows (OK/FAILED/NOT_MODIFIED/SKIPPED) | 18/18 | 18/18 |
| `RegistryShelterParserTest` (9) | Estonia bbox backstop, WGS84 range, name normalisation, blank id/name skips | 9/9 | 9/9 |
| `RegistryImportIT` (2) | real-Postgres import run: create + delist + skip, re-import updates without duplicating | 2/2 | 2/2 |
| `RegistryPropertiesTest` (5) | closed fail-closed client vocabulary + defaults | 5/5 | 5/5 |
| `LEst97TransformerTest` (2) | L-EST97 → WGS84 reference pair | 2/2 | 2/2 |
| **Total** | | **64/64** | **64/64** |

Logs: `/tmp/ingest-baseline.log` (exit 0), `/tmp/ingest-post.log` (exit 0).

## 4. Anchor shifts (run rule 6) — owed to the single anchor pass

`docs/agent/00-CURRENT-STATE.md` §6 cites `CsvRegistryClient.java` five times. My edits removed 20 lines above every cited range (class javadoc −2; `fetch()` extraction −18) and added the two new helpers at the END of the file, so **all five citations shift by exactly −20, cited content byte-identical at the new position** (verified by line grep on the new file):

| Citation (old) | New | Cited content |
|---|---|---|
| `CsvRegistryClient.java:120-126` | `:100-106` | dropped-row warn block |
| `CsvRegistryClient.java:138-146` | `:118-126` | rejected-run aggregate warn block |
| `CsvRegistryClient.java:196-199` | `:176-179` | `toDto` javadoc bbox bullet |
| `CsvRegistryClient.java:202-209` | `:182-189` | `toDto` signature + axis-order guard |
| `CsvRegistryClient.java:219-225` | `:199-205` | Estonia bbox check block |

Unchanged (files untouched): `Lest97AxisOrder.java:7-23,33-37,54-62` and `:25-28`; `GeoPoint.java:7-10,22-24` (domain, not my scope). No other file in the doc cites anything I edited (grep-verified: `ingestion` appears in the doc only in §6). The full gate ran `DocumentationFactsTest` **21/21 green on the old ranges** — the anchor check (structural range + clause tokens) is still satisfied at the old positions, so this is precision drift, not red; the doc-lane re-derivation is owed at the final anchor pass for precision only (recorded on the notes board, corrected there after the gate).

## 5. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` (detached, exit file read): **exit 0** — 2026-09-24T22:14:41+03:00, 3:10 min. `Tests run: 1349, Failures: 0, Errors: 0, Skipped: 0` (the 1,349 baseline, no test added or removed). `pmd:check` clean. `jacoco:check` "All coverage checks have been met" (0.93 BUNDLE LINE floor). `DocumentationFactsTest` 21/21 and `SourceVocabularyTest` 1/1 green inside it — no foreign failures, no missing-class wall (the lock was held for the whole run). Log: `/tmp/ingest-gate.log`, exit: `/tmp/ingest-gate.exit`.

## 6. Anything unverified

- The 304 path's *log ordering* relative to the audit write: the original logged `NOT_MODIFIED` after `recordAudit` on that path and before it on the OK path; the refactor makes both paths log-then-audit. Neither order is pinned by any test (audit rows are asserted on content, not log interleaving) and both audit rows are still written exactly once with identical fields — flagged for completeness.
- The extracted `parseBody` runs the UTF-8 decode + parse + IAE-translation in one place — behaviour is structurally identical (same exception type, same message prefix `Registry CSV rejected: `, same cause chain) and pinned by `wrongHeaderFailsDeterministicallyWithNoRetry`, but the message itself is not asserted verbatim beyond the `"rejected"` substring.
- Nothing in this scope was verified against a live `opendata.smit.ee` fetch in this run (no network access from the lane); the live-file measurements cited in the code were carried over, not re-measured.
- `pageSize`/`politenessDelay` vestigiality: grep-verified no production/test caller, but they remain in the bound config surface — see §2.5 for why they were kept.
