# ANCHOR-ONE — the one stale map anchor

**Branch:** `code-review` · **Standard:** `docs/autopilot/CODE-REVIEW-RUN.md` (rule 6)
**Scope:** `docs/agent/00-CURRENT-STATE.md` — the single red anchor in the
`?hasCapacity=` clause (doc §4, the line the lanes read first). My only edited file:
that document. No guard, code, or other doc touched.

## 1. What I changed

`docs/agent/00-CURRENT-STATE.md` §4 (line 215), one citation only:

| state | Range | Why |
| --- | --- | --- |
| committed (before) | `map-page.ts:238-243` | valid against the **pre-rewrite** 950-line file (line 242 comment carries the token) |
| parent's re-point (superseded) | `:325-330` | valid against the **rewritten** 513-line file (line 328 in range), but starts mid-javadoc and ends on a blank |
| **now** | `:321-329` | the whole `activeTrustFilter` method: javadoc 321-326 + signature 327 + `return this.hasCapacity() ? { hasCapacity: true } : undefined;` at 328 + closing brace 329 |

`:321-329` is the best anchor for the claim: that method is where the "Has
capacity" chip becomes the `?hasCapacity=` server parameter, and its javadoc
(line 325: `"Open" is client-side and never reaches the query string`) states
the exact client-side/server-side contrast the clause makes. Whole-unit
including javadoc and closing brace follows the house precedent set by the
previous anchor pass (notes file, ANCHOR-PASS entry).

## 2. Why the two earlier attempts failed — tree mismatch, not the matcher

The guard reads the cited file **as it exists in the tree the test runs in**
(`csLines`, `DocumentationFactsTest.java:1705`, `Files.readAllLines(Path.of(file))`
relative to the Maven working directory — no git involvement). The map lane's
rewrite (950 → 513 lines) is **uncommitted**: HEAD carries the pre-rewrite file
(`hasCapacity` at 242/386-387/557/569), the working tree carries the rewrite
(token at 93/187-188/317/**328**).

- `:238-243` passed on the old file, failed on the rewritten one — the red every
  backend lane saw while the rewrite was in flight (notes: SIMPLIFY-GUIDANCE-CTRL).
- `:325-330` passes on the rewritten file, but the pristine `git archive HEAD`
  contains the old file, where lines 321-330 are the trust-badge/anchor-error
  region — no token. Both attempts were each correct in a *different* tree.

## 3. Gate evidence (all under `flock /tmp/openshelter-mvn.lock`, rule 7)

| Run | Tree | Command shape | Result |
| --- | --- | --- | --- |
| A — prescribed protocol | pristine archive HEAD + my doc | `git archive \| tar -x`; `cp` doc; `mvn -B -ntp -Dtest=DocumentationFactsTest test` | **exit 1** — 21 tests, exactly ONE failure: `map-page.ts:321-329 — none of the clause's code tokens [hasCapacity] … appear at the cited lines` |
| B — the commit tree | pristine archive HEAD + **entire uncommitted batch** (all 16 modified + 8 untracked files) + my doc | same, after overlaying the batch | **exit 0** — `Tests run: 21, Failures: 0` · BUILD SUCCESS |

Run B's tree is exactly what the parent's commit will contain (all lanes done,
working tree static; 186 test files compiled vs 184 in A confirms the overlay
carried the batch). Both full-compile runs: 357 main + 184/186 test sources.
Logs: `/tmp/anch-one-A.log`, `/tmp/anch-one-B.log`; exit files `/tmp/anch-one-{A,B}.exit`.

## 4. Is the guard over-strict? No — but the verification protocol has one blind spot

The guard is correct as written: every rule (citation parse 1537-1543, relative
resolution 1669-1693, 1-based inclusive ranges 1715-1733, structural check
1735-1769, clause window 1771-1829, token/phrase extraction, case-sensitive
substring on seam-normalised content 1831-1838, floors 1556-1566) does what the
javadoc says, and it read the file that was actually on disk. **Do not change it.**

The blind spot is in the *protocol*, not the guard: `git archive HEAD` equals
"the state that will be committed" **only when the code change is already
committed**. When the anchor's target file is itself in the uncommitted batch
(as the map rewrite is), the archive holds the pre-rewrite file and **no range
correct for the commit can pass there** — and a range valid in the archive
(e.g. 568-570) would structurally break at commit time (569 > 513 lines →
"the anchor outlived the code"). Fix deliberately, if wanted: run the anchor
pass *after* the batch commit (as the previous ANCHOR-PASS did, "verified
against a pristine archive" of the post-change HEAD), or have the protocol
overlay the in-batch files. Until the commit lands, this anchor is verified by
run B, and the prescribed protocol (run A) will go green automatically with it.

## 5. Left alone, and why

- The other five `map-page.ts` citations (§4: `:330-336`, `:80-95,504-505`,
  `:62-76,231-241,350-371`, `:66-68`, `:70-75,242-244`) — checked against the
  rewritten file: all still in range and token/phrase-valid; the map rewrite
  kept those regions under their old ranges. No edit owed.
- `ShelterDto.java:127-134` quoted-phrase anchor — passes; the phrase crosses a
  `" + "` string-concatenation seam, which `csCitedContent` (1831) normalises.
  Verified green in run B.
- No guard/test files, no notes file (other lanes' shared record), no code.

## 6. Unverified / for the parent

- Nothing unverified on my side. One ordering note: my doc edit must land in the
  **same commit as the map rewrite** (or after it). A commit carrying the doc
  but not the rewrite is red on this anchor in exactly run A's shape.
- Prescan harness (guard logic ported to Python) kept at `/tmp/cs_prescan.py`
  for the next anchor pass if the parent wants it reused; it reproduces the
  real guard's verdicts on this tree 1:1.
