# SIMPLIFY-MEDIA — media pipeline readability pass

**Lane:** SIMPLIFY-MEDIA · **Branch:** `code-review` · **Date:** 2026-09-24
**Scope (exclusive):** the media pipeline in `src/main/java/ee/sheltermap/guidance/**` — `MediaService`, `MediaDerivatives`, `MediaStorage`, `MediaImageInspector` and the hero-image import classes (`HeroImageImportService`, `JdkHeroImageFetchClient`, `HeroImageFetchClient`, `HeroAddressResolver`, `DnsHeroAddressResolver`, `HeroAddressPolicy`, `HeroImport{Refused,Unreachable}Exception`) — plus the tests pinning them (read-only: untouched).
**Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` + `docs/skills/{clean-code,code-review,test-driven-development}.md` + `reviews/code-review/{be-recon.md,inventory.md}`.

Behaviour-preserving only. No public media URL shape, migration, guard, other service or frontend file touched. `GuidanceService` + guidance DTOs untouched (another lane's scope).

## 1. What changed, with before/after

Method line counts measured from the HEAD version and the working tree (brace-matched, signatures included).

### 1.1 `HeroImageImportService.java` (449 → 461 lines)

| Method | Before | After |
|---|---:|---:|
| `store` (the security boundary) | **87** lines (L322) | **44** lines (L318) |
| `requireSuccessfulResponse` (new) | — | 16 (L370) |
| `validateImportedBytes` (new, guards 6+7) | — | 11 (L410) |
| `importHero` | 31 (L183) | 31 (L181) — untouched |
| all other methods | — | unchanged |

- `store` split into named steps, same order, same messages: `requireSuccessfulResponse` (the 4xx→400 / 5xx→502 vocabulary split + the empty-body refusal) and `validateImportedBytes` (guard 6 content sniff + guard 7 pixel cap). The two "why this is safe" constraint comments moved verbatim into the javadocs of the methods that own them. The store/orphan-cleanup block (file first, row second, `deleteWithDerivatives` on row failure) is unchanged in the method.
- `EXTENSION_BY_TYPE` (L105-107): the duplicated 3-entry table is now a same-named alias of `MediaImageInspector.EXTENSION_BY_TYPE` (be-recon §7.8). **The alias (rather than deleting the field) is deliberate**: removing the field would leave the `Map` import (L14) unused, and deleting that import shifts the class javadoc and breaks the two anchored ranges (see §3) — the alias keeps the field type, the import and every line ≤ L104 byte-stable.

### 1.2 `JdkHeroImageFetchClient.java` (255 → 280 lines)

| Method | Before | After |
|---|---:|---:|
| `fetch` | **68** lines (L88) | **6** lines (L89) — orchestrator only |
| `parseUrl` (new) | — | 6 (L95) |
| `singleGetRequest` (new) | — | 8 (L107) |
| `awaitHead` (new — head deadline poll + error mapping) | — | 29 (L127) |
| `toFetchedImage` (new — status/location/redirect + capped body read) | — | 17 (L164) |
| `readCapped` (guard 4 — streaming cap) | 61 (L169) | 61 (L194) — **byte-identical** |
| `nap`/`waitFinished`/`closeQuietly` | — | unchanged |

- The "deliberately NO request `timeout()`" constraint comment moved into `singleGetRequest`'s javadoc; the "HEAD must arrive within the read timeout" comment into `awaitHead`'s; the redirect-discarded comment into `toFetchedImage`'s.
- Two expression cleanups: the inline fully-qualified `@org.springframework.beans.factory.annotation.Autowired` → proper import + `@Autowired` (the file already imports its sibling `Value`), and `final java.util.concurrent.atomic.AtomicLong bytesRead = new java.util.concurrent.atomic.AtomicLong()` → simple names (import already present). The `bytesRead` test seam is unchanged.

### 1.3 `MediaService.java` (370 → 371 lines)

| Method | Before | After |
|---|---:|---:|
| `upload` (validation order: 413 → magic bytes → type match) | 58 (L213) | 58 (L209) — comments reworded to constraints, code identical |
| `listPage` | 16 (L142) | 19 (L136) — one hoisted `total` |
| `getById` | 11 (L161) | 8 (L167) |
| `delete` (the 409/clear-hero/delete-set rules) | 29 (L324) | 29 (L320) — untouched |

- **Recon §6.3 fixed:** `listPage` called `countAll()` up to three times per request (the synthesized limit, the empty-page total, the `Paged` total); it is now ONE `long total` per call (L141-143), used for all three. Same transaction, read-only — the value is identical.
- `withUsage(asset, counts)` (L352-354): the "row = asset + referenced-count" mapping was spelled three times (`list`, `listPage`, `getById`); it is one named helper now.
- `upload`: the "Step 1 / Step 2+4 / Step 3" planning numbering (a 4-step scheme the javadoc doesn't even match) is cut; each comment now states the constraint (the 413 fires first, the magic-byte gate, the lying-declared-type 400) in the javadoc's own fixed order.
- `EXTENSION_BY_TYPE` removed (was L64-69): the call site reads `MediaImageInspector.EXTENSION_BY_TYPE` directly (L227-228).

### 1.4 `MediaImageInspector.java` (376 → 388 lines)

- **New shared constant** `EXTENSION_BY_TYPE` (L41-48): the sniffed-type → stored-extension table now lives in the class that is the authority on exactly which types the inspector answers. Both call sites (1.1, 1.3) read one table (be-recon §7.8, ~10-line fix — done).
- **`int littleEndian` (0/1) → `boolean littleEndian`** in `exifOrientationIn` (L225-231), `u16` (L373) and `u32` (L381): the TIFF byte-order flag was an int-as-boolean (clean-code smell; `littleEndian == 1` reads as a code point). Branch behaviour is identical (both branches byte-for-byte the same reads).
- No method length changed; **no parser logic touched** — every segment walk, bounds check and "normal, never an exception" fallback is byte-identical.

### 1.5 `MediaStorage.java` (233 → 235 lines)

| Method | Before | After |
|---|---:|---:|
| `store` | 22 (L89) | 12 (L89) |
| `storeDerivative` | 17 (L128) | 10 (L118) |
| `writeNewFile` (new — the shared write discipline) | — | 12 (L135) |
| `resolve` (the traversal + parent-equality gates) | 14 (L210) | 14 (L212) — untouched |

- The initialized-check + CREATE_NEW write + `UncheckedIOException` was duplicated across `store`/`storeDerivative`; it is one private `writeNewFile(kind, name, bytes)`, with the two exception messages preserved exactly ("Cannot write the media file …" / "Cannot write the media derivative …").
- The CREATE_NEW rationale comments stay, attached to the two name-generation sites (they explain *why the name cannot pre-exist*, which is per-caller).

### 1.6 Unchanged in scope (and why)

- **`MediaDerivatives.java` (319 lines, byte-identical):** `renderAll` (45) is already flat; `toVisualOrientation` (the double pixel loop + the 8-case orientation switch) and `stagedDownscale`/`resample`/`encode` are the verified rendering mechanisms (be-recon must-stay list — EXIF-orientation correctness is pinned by `MediaDerivativesTest`'s per-orientation pins). The recon's "deep nesting" in the image pipeline is in the *inspector's* parser, which is the same must-keep class: its loops are already early-`continue` style at depth ≤ 3, and the one genuine 0/1-as-boolean smell there is fixed above.
- **`HeroImageFetchClient`, `HeroAddressResolver`, `DnsHeroAddressResolver`, `HeroAddressPolicy`, both exceptions:** already flat and small (≤ 99 lines); `HeroAddressPolicy.disallowedReason` is a pure early-return classifier. Nothing to change.
- **`JdkHeroImageFetchClient.readCapped` (61 lines):** the guard-4 enforcement (cap checked per chunk, stream closed on cross, stall watchdog on a daemon reader). Splitting further would fragment the reader/caller handoff — left byte-identical.
- **The two JPEG segment walks** (`MediaImageInspector.readJpeg` L129 and `exifOrientationOf` L173) share ~15 lines of walker shape but have *different stop semantics* (first APP1 wins vs. first APP1 with a non-1 orientation). A shared walker would need a functional interface with a stop signal — a clever construct for a 15-line saving inside a security guard pinned by fixture-byte tests. Left alone (deliberate, not missed).

## 2. Guard evidence — every guard test passed unmodified

No test file was touched (`git status`: only the five main files + this report + the notes file are mine; the seven `verification/**` modifications are the concurrent verification lane's, see §5).

Guard/pin suite, all green **in the full gate** (exit 0, 1342 run / 0 failures / 0 errors):

| Guard | Suite | Result |
|---|---|---|
| Magic-byte content gate (upload) | `MediaImageInspectorTest` 18/18, `MediaServiceTest` 18/18 (incl. `unrecognizedBytesAre400WithNoFileAndNoRow`, `aDeclaredTypeThatContradictsTheBytesIs400`) | pass |
| Streaming size cap (guard 4) | `JdkHeroImageFetchClientTest` (incl. the mid-stream abort + `bytesRead` wire-total pin) | pass |
| Per-hop redirect re-validation (guard 3) | `HeroImageImportServiceTest` redirect family (loopback/private/non-http/credentials/malformed/hop-cap) + `HeroImageImportIT` 11/11 | pass |
| Pixel-dimension cap (guard 7) | `HeroImageImportServiceTest` (`aRemoteHeaderClaimingGiganticDimensionsIsRefused`, `thePixelCapIsConfigurable`) | pass |
| Failed import → post stays draft, error surfaced | `HeroImageImportIT` (save-time acceptance rules) | pass |
| Derivative content gate | `MediaDerivativesTest` 14/14 (strict + best-effort gate, no-upscale, per-orientation pins) | pass |
| Delete path removes originals WITH derivatives | `MediaServiceTest` (`deletingAnAssetRemovesItsDerivativesToo`) + `MediaStorageTest` 16/16 (`deleteWithDerivatives*`) | pass |
| Serving URL shape / srcset / content-type | `MediaDerivativeServingIT` 2/2, `AdminMediaClientErrorsIT` 4/4, `OpenApiSnapshotIT` 1/1 (snapshot byte-identical) | pass |
| Doc anchors + vocabulary | `DocumentationFactsTest` 21/21, `SourceVocabularyTest` 1/1 | pass |

Focused pre-gate run: 127/127 across the seven in-scope unit suites (`/tmp/media-focused.exit` = 0).

## 3. Anchor status — no shift owed

`docs/agent/00-CURRENT-STATE.md` cites exactly two ranges into my scope (grep-verified: only `HeroImageImportService.java`):

- `:23-26` (structural pin — the "save time … generated name" clause)
- `:28-35` (content pin — the clause's token `REQUIRES_NEW` must appear at the cited lines)

Both ranges are **byte-identical before/after** (verified by `sed` of both versions): all my `HeroImageImportService` edits start at L102 or later. `DocumentationFactsTest` green at 21/21 in the gate is the live proof. **No anchor shift to record for the anchor pass.**

## 4. Gate

`flock /tmp/openshelter-mvn.lock mvn -B -ntp clean verify -Ddependency-check.skip=true` — **exit 0** (exit file `/tmp/media-gate.exit`), `BUILD SUCCESS`, **1342 tests, 0 failures, 0 errors** (the 1342 baseline), `pmd:check` clean, `jacoco:check` 0.93 floor met, finished 2026-09-24T18:05:46+03:00. Log: `/tmp/media-gate.log`. No foreign failures at gate time (the concurrent verification lane's in-flight files were compiling and passing at the moment of the run).

## 5. Foreign / unverified

- **Foreign in-flight (not mine, untouched):** seven `src/main/java/ee/sheltermap/verification/*.java` files modified in the working tree by the concurrent verification lane (visible in `git status`). They were green at my gate time; nothing to reverse.
- **Not verified by me:** no mutation testing in this lane (the TEST-QUALITY lanes' mutation passes for the guidance suites — 21 instances, all killed, per their notes — cover the same guards); no manual HTTP probe (the ITs pin the same surface).
- **Left for the owner/parent (filed, not fixed):** none new. Be-recon items that were in my scope (target 8 `EXTENSION_BY_TYPE`; §6.3 double `countAll`) are done. The `readJpeg`/`exifOrientationOf` walker duplication (§1.6) is a judgement call I made deliberately — a future lane may still want a shared walker; it would need a stop-signal design and a re-run of the fixture suite.

## 6. Files for the parent's commit

- `src/main/java/ee/sheltermap/guidance/MediaService.java` (370 → 371)
- `src/main/java/ee/sheltermap/guidance/MediaStorage.java` (233 → 235)
- `src/main/java/ee/sheltermap/guidance/MediaImageInspector.java` (376 → 388)
- `src/main/java/ee/sheltermap/guidance/HeroImageImportService.java` (449 → 461)
- `src/main/java/ee/sheltermap/guidance/JdkHeroImageFetchClient.java` (255 → 280)
- `reviews/code-review/simplify-media.md` (this report)
- `docs/autopilot/CODE-REVIEW-NOTES.md` (appended entries)
