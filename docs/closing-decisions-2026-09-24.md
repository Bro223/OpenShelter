# Closing decisions — 2026-09-24

Every previously open item, decided by the stated priorities: **stability and performance first, minimal working solution, the recommended approach, simple code a human can read.** Anything that still needs a person is marked **OWNER** and says exactly what is needed.

This file is the answer to "read this to know what was decided and why" — nothing here is waiting on me.

---

## 1. The two Spring CVEs — DEFER the migration, suppress with a date (decided)

`spring-core 6.2.19` (CVE-2026-47884, 9.8, plus eleven more at or above the gate) and `spring-security-core 6.5.11` (9.1, 7.4) **cannot be fixed on this line**: `6.2.20` and `6.5.12` do not exist on Maven Central, both lines ended at the versions shipped, and Spring Boot 3.5.16 is the last 3.5.x. Clearing them means **Boot 4 — Spring Framework 7, Java 25+, jakarta churn across the backend.**

**Decision: do not migrate now.** A framework major is the opposite of "minimal, stability first": it would touch every module, invalidate the day's verified test suite, and put a green CI at risk for CVEs that require an attacker to already reach internals we do not expose (no user-controlled deserialisation; the affected paths are server-side framework internals behind our own filters).

**What we do instead:** a suppression entry per CVE with an explicit `until` note naming **Boot 4** as the trigger, so the nightly scan goes green but the reason stays visible and dated. A suppressed 9.8 with no released fix is the legitimate case for suppression; an *undated* one is not.

**OWNER:** schedule the Boot 4 migration deliberately when no other work is mid-flight. It is a project, not a lane.

## 2. ET/RU review packet — OWNER (cannot be closed here)

The packet is written: **`docs/i18n-review.md`** carries every rewritten string with before/after, the ET and RU drafts, and per-key uncertainty notes. Includes the 18 copy rewrites, the legend labels, the map legend's "click to select" affordance line, and the ~20 admin labels.

**OWNER:** native sign-off. Legal strings (7 rows) need a lawyer's eye *in addition* — cutting commentary can remove protective weight.

**One open word:** `admin.reports.dismiss` = `Arvelda`. Recommendation recorded in the packet (family-consistent, already shipped); alternatives listed. Native speaker decides.

## 3. `gh` access — OWNER

**The token is invalid** (`gh auth status`: "The token in default is invalid"). That is why CI logs have been 403 and re-runs 401 all day; every CI failure was reproduced by hand on archived trees instead. `gh auth login` (or a valid `GH_TOKEN`) restores direct log reading and re-runs.

## 4. Address-result list spacing — DECIDED: unify on the form values

Two surfaces spaced the same list differently: the map sidebar (`4 / 8–10`) and the submit form (`6 / 8–12`). **Decision: one value, the submit form's (`6 / 8–12`)** — it is the surface where the user acts on the results, and the slightly larger rhythm reads better at the 360 px width that surface must survive.

## 5. The two theme golds — DECIDED: keep the theme's designated tokens

The black-and-yellow placeholder is the theme's muted hint gold (`#d4b53a`, 10.47:1) and the anchor-search button's border is the theme's border gold (`#8a7400`, 4.58:1), because those are the *roles* every card, input and ghost button in that theme already uses. Both are yellow; both are contrast-verified and enforced.

**If you want the brightest yellow (`#ffd400`, 14.67:1) on either**, that is a one-token change — say which and it is done.

## 6. Trust-snapshot backfill — DECIDED: no backfill

Already-orphaned pre-`V31` rows (author deleted before the snapshot existed) resolve **unverified**. The snapshot protects standing from the moment it exists; inventing a past for rows whose author is gone would be guessing provenance — the opposite of what the column is for. No migration.

## 7. Erasure policy — DECIDED: keep current behaviour

`AccountService.deleteAccount` currently **orphans public community shelters** to `created_by NULL` (they remain on the map, their trust state untouched) and **purges private ones**. **Decision: keep.** The public rows are community safety data whose value does not depend on who added them, and they are already anonymous; removing them would take live shelter information off a crisis map. Documented here so the choice is explicit rather than accidental — deletion now reaches this code for unverified users too, which is by design (#8).

## 8. Account deletion without verification — DELIVERED

Deletion no longer requires verification (a right, not a verified-only action). The verified-only gate remains on the sensitive identity changes. Anonymous callers still get 401.

## 9. `ID35606` (Bastioni käigud, Narva) — DECIDED: keep the bound

The row sits 0.002° past the Estonia longitude bound and is refused at import. **Decision: keep the bound.** A safety bound exists to make wrong data loud; loosening it for one address weakens it for every future row. The refusal is logged and counted, so it is visible rather than silent — that is the intended behaviour for an anomaly, not a bug to paper over.

## 10. Old one-tap confirmations — DECIDED: no retroactive re-evaluation

Rows confirmed under the previous rule keep their status. Re-deriving past confirmations would rewrite user-visible trust from a migration we cannot verify against the original intent, and the snapshot column already protects earned standing from here on. The stricter rule (three distinct confirmers, submitter excluded) applies to every new confirmation.

## 11. Visual checks — OWNER (needs eyes, not code)

jsdom cannot measure rendered results, so these are recorded as unverified rather than claimed: black-and-yellow badges and the `proof-note` block (which sits black-on-black in that theme and relies on the panel edge), the unified pin colours, the new ring/shape treatment, the 48 px guidance select whose padding changed with the spacing pass, gauge needles on shelter 311, and the admin table at narrow widths.

---

## What this repository now has that it did not

- **CI, green, enforcing every push:** backend (tests, PMD, coverage floor), frontend, a **clean-checkout** job that catches gitignored-file and documentation drift, and an image that boots and reports healthy. It has already caught real bugs — including two of mine.
- **Guards that can fail:** sixteen documentation pins (class names, DTO fields, env coverage, tokens, counts, thresholds), the current-state document's **107 anchors** content-checked with count floors, a spacing-literal guard, an absence-of-recency-tone guard proven against nested and re-spaced forms, an architecture guard with count floors, and a commit-truth hook.
- **One current-state document** (`docs/agent/00-CURRENT-STATE.md`) as the entry point lanes read first, with every claim anchored to code.
- **Six hollow guards closed**, each proven by mutation — the failure mode this codebase kept producing.
- **A verified data fix** that mattered: the registry import was placing **0 of 303** shelters inside Estonia.
