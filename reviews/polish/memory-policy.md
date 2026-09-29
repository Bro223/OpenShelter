# Memory-policy report

**Store:** pi-hermes-memory (`~/.pi/agent/pi-hermes-memory/`)
**Role:** MEMORY-POLICY
**Date:** 2026-09-29
**Predecessor:** `reviews/polish/memory-consolidate.md` (lane that cut the failure store 1,723 → 1,100 entries / 1,161,804 → 765,587 joined chars)

No repository file was modified other than this report. No memory entries were added, removed, or rewritten. No extension source code was touched.

---

## 1. Where the budget lives and what it does

**Config file:** `~/.pi/agent/hermes-memory-config.json` (agent-root `hermes-memory-config.json`, resolved from `AGENT_ROOT` in `src/paths.ts`). **This file did not exist before this lane** — the extension ran on all defaults. Keys: `memoryCharLimit` (default 5,000), `userCharLimit` (5,000), `projectCharLimit` (5,000).

**The reported 10,000 figure is derived, not configured.** In `src/store/memory-store.ts`:

```typescript
private charLimit(target): number {
  if (target === "failure") return this.config.memoryCharLimit * 2; // Failures get more space
  return target === "user" ? this.config.userCharLimit : this.config.memoryCharLimit;
}
```

So the failures.md cap is `memoryCharLimit × 2` = 10,000 by default. There is no independent failure-budget knob.

**What the budget does (verified in source, v0.9.9):**

| Consumption site | Behavior |
| --- | --- |
| Write enforcement (`_add`, `replaceUnlocked`, `applyMutationPlan`) | Gated by `capEnforced = (config.memoryMode !== "policy-only")`. The current mode is the default **`policy-only`**, so **the cap is NOT enforced on writes at all**: no rejection, no eviction, no overflow-triggered auto-consolidation. An over-budget write is simply accepted. |
| Tool-result `usage` string | Every successful memory mutation returns ```${pct}% — ${current}/${limit} chars``` (capped at 100) — this is the "permanently at 100% — 765,587/10,000" the consolidation lane saw. Purely informational in the current mode. |
| Prompt-injection headers | `renderBlock`/`renderProjectBlock` print the same percentage into the `<memory-context>` headers — but only in `legacy-inject` mode, which is not active. |
| Overflow strategy (`reject` / `auto-consolidate` / `fifo-evict`) | Only reachable in `legacy-inject` mode. `fifo-evict` is the only strategy that can drop entries, and it is not active. |
| Recall | **Not shaped by the budget.** In policy-only mode the store is not injected into the prompt at all; recall is the agent's `memory_search` (SQLite FTS5). (The recent-failures injection in `formatForSystemPrompt()` is also only reached in legacy-inject mode — `prompt-context.ts` returns only the policy text in policy-only mode.) |

**Safety conclusion:** raising the budget is safe — the value is an upper bound consumed by (a) an informational string in the current mode and (b) overflow triggers that are not active. There is no path by which a *higher* cap loses entries or blocks writes. The dangerous direction is *lowering* the cap, which is why the conservative option was to raise, never to re-tighten.

## 2. Old → new values, and why these numbers

**Evidence used** (measured against the store files with the same metric the extension uses, `entries.join("\n§\n").length`):

| Store | Entries | Joined chars (today) | Old cap | Cap / size ratio |
| --- | --- | --- | --- | --- |
| failures.md | 1,100 | 765,590 | 10,000 | 0.013× |
| USER.md | 245 | 135,918 | 5,000 | 0.037× |
| MEMORY.md (global) | 127 | 83,446 | 5,000 | 0.060× |
| projects-memory/OpenShelter (largest of 7) | 1,134 | 957,185 | 5,000 | 0.005× |

**Growth evidence** (from `created=` metadata and the consolidation report): the entire store was built during the ~5-week peak multi-lane phase (2026-08-24 → 09-28; 1,095 of 1,100 failure entries dated 2026-09). The failure store's observed high-water mark before the consolidation was **1,161,804** chars; after consolidation it sits at 765,590. The observed re-inflation factor for one full cycle is therefore **1,161,804 / 765,590 ≈ 1.5175** — i.e. an unconstrained cycle grows the store ~52% (distinct lessons + the ~30–37% duplicate re-logging the report measured).

**Rule applied:** budget = current size × 1.5175 (one observed re-inflation cycle of headroom), rounded up to the nearest 1,000. This makes "100%" a true *consolidation-due* signal (reached only after the store has re-grown by a full observed cycle) instead of a permanently-true constant. It deliberately rejects both the consolidation lane's illustrative "e.g. 200K" (which is *below* current size) and any round-number pick.

| Key | Old (default) | New | Effective cap for | New cap | Today's usage |
| --- | --- | --- | --- | --- | --- |
| `memoryCharLimit` | 5,000 | **581,000** | failures.md (2×) | **1,162,000** ≈ observed high-water 1,161,804 | 65.9% |
| | | | MEMORY.md (1×) | 581,000 | 14.4% |
| `userCharLimit` | 5,000 | **207,000** | USER.md | 207,000 | 65.7% |
| `projectCharLimit` | 5,000 | **1,453,000** | per-project MEMORY.md | 1,453,000 (largest store: OpenShelter) | 65.9% |

Derivation: failures → 765,590 × 1.5175 ≈ 1,161,783 → 1,162,000 → `memoryCharLimit` = 581,000 (the failure cap is hardcoded 2× this key). USER.md → 135,918 × 1.5175 ≈ 206,245 → 207,000. OpenShelter project → 957,185 × 1.5175 ≈ 1,452,528 → 1,453,000.

**Scope note:** the owner's decision named the 10,000 (failures) budget, but the same "permanently 100%" pathology sat on `userCharLimit` and `projectCharLimit` in the same file, and the OpenShelter *project* store is actually the largest store (957K). All three were raised in one file under the same rule. If the owner wants to revert the user/project keys, each is a single line in the config file.

**Known side effect of the hardcoded coupling:** raising `memoryCharLimit` to cover the failure store also raises the MEMORY.md cap to 581,000 (7× its current 83,446). That is the cost of the extension's single-knob `2×` design; in the current mode nothing is enforced, and in legacy-inject the auto-consolidation trigger would simply fire later.

## 3. Merge-if-similar: configurable or skill?

**Established first, per the task:**

1. **No configuration exists.** `loadConfig` in `src/config.ts` was read in full; its key surface is exhaustive and contains no similarity, dedup, or merge knob for memory entries. The only write-time dedupe is **exact-text** equality in `_add` (`decoded.text === content`, metadata-stripped) — a same-lesson re-log with different wording is always accepted as a new entry. That exact gap is what produced the 24× pkill family.
2. **The extension's own Jaccard machinery is skills-only.** `jaccardSimilarity`/`tokenizeForSimilarity` exist but are used only by `skill-store.ts` (hardcoded 0.7/0.75 name/description thresholds, not configurable), to block similar *skills* at create time. Nothing equivalent for memory entries.
3. **A hook path technically exists but was rejected.** Pi's extension API exposes `on("tool_call", ...)` — "Fired before a tool executes. Can block. `event.input` is mutable" (`dist/core/extensions/types.d.ts`). A *separate* user extension could intercept `memory_add`, Jaccard-score its content against failures.md, and rewrite the args in place. Not built, for three reasons: (a) it is new runtime code on the memory write path — the task's fallback explicitly designates a skill as the durable fix when configuration can't do it, and patching the extension was forbidden; (b) a fixed-threshold auto-merge at write time would silently conflate distinct lessons — the consolidation lane deliberately refused to merge below 0.45 Jaccard for exactly that reason, and a write-time hook has no per-case review; (c) the extension's whole-entry-replace validation ("Refusing replace" when content omits original lines) would collide with naive hook merges, converting would-be merges into failed writes.

**Implemented as a global skill:** `memory-merge-if-similar` (`skill_manage`, scope `global`), stored at the extension's own skills storage, `~/.pi/agent/pi-hermes-memory/skills/memory-merge-if-similar/SKILL.md`.

What it does: before every `memory_add`, extract the lesson core (rule + mechanism + remedy + scope), `memory_search` the same target, then classify — merge via `memory_replace` (union, whole-entry semantics), replace on contradicting newer evidence (latest-evidence-wins, probe-date noted), or add only when the core is genuinely new. It encodes the recurring-lesson pattern with the observed families (pkill ×24, vLLM volatility ×22, 16-slot budget ×20, …) so "an entry probably already exists" is the prior, and it states what it will **not** merge (different remedy, different project/scope; the 0.45 floor) and the extension's traps (exact-only dedupe, whole-entry replace refusal, no HTML comments in content).

What it will and will not catch: it is agent-side discipline — it binds when the *main agent* writes memory. The extension's background review/flush/correction LLM paths (hardcoded prompts in `src/constants.ts`, not configurable) still emit `add` operations and are governed by the exact-text dedupe only; residual duplication from those paths is bounded and remains the preserve of periodic `consolidate-memory` runs.

## 4. Verification that the extension still works

1. **Config accepted by the extension's own loader** — ran the package's real `loadConfig` under jiti (the same loader Pi uses for TS extensions):
   ```bash
   node -e "const jiti=require('/home/aleks/.pi/agent/npm/node_modules/jiti')(__filename);
            const {loadConfig}=jiti('.../pi-hermes-memory/src/config.ts'); console.log(loadConfig())"
   → memoryCharLimit: 581000 | userCharLimit: 207000 | projectCharLimit: 1453000
     failure limit (2x): 1162000 | memoryMode: policy-only | overflowStrategy: auto-consolidate
   ```
   All three values landed as written; every other key retained its default (merge-over-defaults semantics confirmed in `loadConfig`).
2. **Extension loads + search returns results with the new config** — one-shot child process, the same `pi -p` mechanism the extension itself uses for its subprocess path:
   ```bash
   cd /home/aleks/MyScripts/LocalRepos/OpenShelter && pi -p --no-session \
     "Call memory_search once with query 'pkill self-match', target 'failure'; copy the first 120 chars of the best hit verbatim…"
   → HIT=pkill -f '<pattern>' matches the invoking shell's own command line and kills the caller before it can kill the targets (
   ```
   The quoted text was cross-checked with `grep -c` against `failures.md` (1 hit) — a genuine search result, not a model-invented one. An earlier probe returned `RESULTS=10` for query `pkill`.

**Caveat:** the config is read at process start, so the currently-running session keeps the old in-memory values (its `usage` strings will still show the old caps) until the next session start; all new sessions and spawned child processes pick up the new caps.

## 5. Every path changed

| Path | Change |
| --- | --- |
| `~/.pi/agent/hermes-memory-config.json` | **Created** (was absent). Contents: `{"memoryCharLimit": 581000, "userCharLimit": 207000, "projectCharLimit": 1453000}` |
| `~/.pi/agent/pi-hermes-memory/skills/memory-merge-if-similar/SKILL.md` | **Created** via `skill_manage` (scope `global`) — the extension's skills storage, not its source |
| `reviews/polish/memory-policy.md` | **Created** — this report (the one allowed repo file) |

Not touched: repository code, `~/.pi/agent/npm/node_modules/pi-hermes-memory/src/**` (extension source), `failures.md` / `MEMORY.md` / `USER.md` / any project store, any `.recovery`/`.retired` artifacts.

## 6. Could not do safely / left open

- **Write-time auto-merge hook** — technically possible via `tool_call`, not built (reasons in §3). If the owner later wants it, it must be a separate, reviewed extension with a conservative threshold and dry-run mode, and it should respect the extension's whole-entry-replace validation.
- **Consolidation report, unresolved item 1** (further reduction beyond de-duplication: per-category budgets / one-time bulk rewrite) — still a curation-policy decision, untouched by this lane.
- **Residual sub-0.45 near-duplicates** (unresolved item 4) — left by design; the new skill's merge rule covers future occurrences, not past ones.
- **Background review/flush LLM write paths** — their prompts are hardcoded and not configurable, so the skill cannot bind them; they remain under exact-text dedupe plus periodic consolidation.
