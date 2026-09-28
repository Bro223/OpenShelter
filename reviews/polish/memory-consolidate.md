# Failure-memory consolidation report

**Store:** `~/.pi/agent/pi-hermes-memory/failures.md` (pi-hermes-memory failure target)
**Role:** MEMORY-CONSOLIDATE
**Date:** 2026-07-17 (session work spanning two phases)

## Headline numbers

| Metric | Before | After | Delta |
|---|---|---|---|
| Entries | 1,723 | 1,100 | **−623 (−36.2%)** |
| Joined chars | 1,161,804 | 765,587 | **−396,217 (−34.1%)** |
| File bytes | 1,168,872 | 770,406 | −398,466 |

- Removals executed: **642** (Phase 1: 332, Phase 2: 291, Phase 3: 19)
- Consolidated re-adds: **19** (one merged ≤600-char entry per dominant duplicate family)
- Net: 1,723 − 642 + 19 = 1,100 ✓

### Category mix (before → after)

| Category | Before | After |
|---|---|---|
| tool-quirk | 691 | 419 |
| insight | 625 | 397 |
| convention | 195 | 142 |
| correction | 96 | 81 |
| failure | 91 | 36 |
| preference | 18 | 18 |
| (no tag) | 7 | 7 |

**Dominant excess categories:** `tool-quirk` + `insight` — together 75% of the store, and the source of nearly all duplication. The same harness lessons (pkill self-match ×24, vLLM/TalTech volatility ×22, 16-slot subagent budget ×20, lane-logs-start-with-prompt ×19, Maven staleness ×17, "children have no bash" ×14, forked context ×11, ng-serve staleness ×11) had been re-logged after every session, each with slightly different wording.

## What was done

1. **Phase 1 — Jaccard 0.55 clustering** (1,723 entries): 73 families / 386 entries merged. Each family kept its single richest entry; the rest were removed and one sharpened merged entry (rule + mechanism + remedy + verification) was re-added. Containment traps (one entry's text nested inside another) were resolved by ordered deletion + uniqueness simulation (0 simulated conflicts).
2. **Phase 2 — Jaccard 0.45 re-cluster** on the 1,410-entry corpus: 125 clusters / 532 entries, every cluster ≥4 reviewed by hand with full-text reads of the keeper candidates. Per cluster: keep the richest/latest (or the Phase-1 merged entry), delete the rest; pure incident catalogs and session-detail path memos deleted outright.
3. **Phase 3 — targeted noise pass** over remaining `[failure]`-category entries: deleted 19 more duplicates/progress reports (scroll-snap saga ×3 → keep final-state entry; DocumentationFactsTest ×4 → keep 2; red-commit ×2 → keep 1; @AfterEach deadlock ×2 → keep 1; Päästeamet CSV ×3 → keep 1; lane-self-report "done with broken code" ×7 → keep 3; router-outlet dup; Twilio dup; review-surgery dup).

## Contradictions resolved (latest-evidence-wins)

- **"Workflow children have NO bash"** (14 entries, dated 2026-09-15/17) **vs "children DO have a bash tool"** (10 entries, 2026-09-16 → 2026-09-28, merged entry dated 2026-09-28): all 14 NO-BASH entries deleted as stale/contradicted. Lesson: a probe from one lane is not a policy for all lanes; verify the actual child tool list.
- vLLM endpoint health: merged the split "502 while `/v1/models` answers 200" pair into one entry with the remedy (measure with a real completion, retry, cap fan-out at ~3 lanes).

## What was deliberately kept (and why)

**The 19 merged entries** (one per family): template-names≠agents, lane-logs-start-with-prompt, TalTech fan-out saturation (cap ~3), `context:'fresh'` + brief file for 262K overflow, Maven staleness, Flyway checksum, script over-delete, `ctx_execute_file` root confinement, pkill self-match, 16-live budget, Jakarta `RECORD_COMPONENT`, GLOB ownership, `runner.temp`, children-DO-have-bash, test-side traps, HC dark-on-dark, OpenSpec archive, emptied delta, vLLM-502 health.

**High-value standalone keepers** (too valuable to compress):
- **"Lane self-reports are unreliable — verify against the tree by grep/read, not by report"** (original #603) — the single most important operating rule for this repo's multi-lane work.
- **Guard doctrine** (original #1699): "a guard is only real if proven to FAIL by mutation; matched-count floor; brace-balanced scanning." Seven hollow guards were found in exactly this repo.
- **ng-serve staleness entry** (richest single entry, 1,069 chars): full symptom catalog + angular.json + hard-refresh remedy.
- Per-cluster keepers: pkill (1399), vLLM (1393 + model_policy 342), 16-slot (1400), fork context (1396), Hypa truncation (604), GLOB house rules (419 + 1402), Flyway (1395 + no-broad-replacement 1161), design-tokens parser (1349), IT context cache (1303 + 1365), weak-planner JSON (334), ctx/curl (1208), springdoc `@Extension` (331), schedule bookkeeping (551), admin-audit NPE (647), router-outlet (756), i18n batch discipline (858), shared Testcontainers IT (1374), nftables/IPv6 (134 + 506), mid-gate bulk touch (499 + 327), self-report Wave A (698), planner echo (1219), td flex (755), zoneless `toObservable` (732), password-reset (1191), Vite 504 (878), error-copy i18n (998), review sweep (984), over-delete + "put every fix in a lane brief" (1087 + merged 1397), REQUIRES_NEW deadlock (1277), CI debug (1276), hollow-guard list (1127 + 894), long-gate abort (1273), jiti extensions (85), red-commit gate (1010).

## Unresolved items

1. **The 10,000-char budget is not reachable by tool-level merging alone.** The store is at 765,587 chars — ~75× over budget. What remains are ~1,100 *distinct* lessons (no more high-similarity duplicates at 0.45); further reduction means deleting genuinely different lessons, which is a curation-policy decision, not a de-duplication task. Options: (a) accept the size, (b) set per-category budgets and prune the oldest/least-cited within each, (c) approve a one-time bulk rewrite of the file (the store tool only supports per-entry mutations; a bulk rewrite would bypass `memory_remove`'s uniqueness checks and needs explicit sign-off since the file lives outside the repo).
2. **Budget policy**: the pi-hermes-memory extension's 10K budget flag is permanently at "100% — 765,587/10,000". Recommend either raising the configured budget to a realistic value (e.g. 200K) or adopting (b)/(c) above.
3. **Growth driver**: ~30% of the original entries were the *same* harness lessons re-logged per session (each agent session auto-records what it hit). A "merge-if-similar" policy at write time would prevent recurrence.
4. Leftover singletons may still contain near-duplicates below the 0.45 threshold; none were merged below that threshold to avoid conflating distinct lessons.

## Method notes

- All mutations via `memory_remove` / `memory_add` only (store files never edited directly).
- `memory_remove` matches on the first non-empty line of `old_text` as a substring and rejects multi-matches → every deletion substring was computed to be unique *at call time* via a sequential simulation (0 conflicts in all three phases).
- Merges = remove-all-but-one + re-add (in-place `replace` refuses omitting original lines).
- Concurrency: the store lock rejects overlapping mutations; batches of 6 with retry succeeded reliably.
