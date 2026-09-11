# Design — de-slop-pass

## Context

Findings source: SLOP-AUDIT (`/tmp/openshelter-slop-audit.md`, 2026-09,
every file:line verified). The audit's verdict: design is clean
(system fonts, functional palette, one shadow, token-policed by spec
test) — do not touch styles. The work is copy + small code hygiene.

## Decisions

1. **Fix the audited list, nothing else.** The audit is the scope
   authority. No redesign, no rewording beyond the listed strings, no
   comment-prose trimming (dense informational comments are accepted;
   the "AI texture" of cross-referential comments is documented scar
   tissue, not slop — trimming reviewer tags would destroy audit trail).
2. **Brand name via one backend constant.** `OpenShelter` as a
   `public static final String APP_DISPLAY_NAME` in a small
   `app/AppInfo` (or existing constants home) — all 6 mail/SMS strings +
   the SMTP subject reference it. Frontend already has `APP_NAME`
   (`core/title.ts`) — no change.
3. **Sentence case, backend side.** Capitalize the ~12 backend
   user-facing messages (smaller diff than de-capitalizing frontend
   copy; banners then always render sentence-case regardless of origin).
   Rate-limit 429s stay frontend-copy-owned (already the case).
4. **Em-dash: break the rhythm, not ban the punctuation.** Split ~6 of
   the 12 user-visible em-dash clauses (choose the most formulaic
   "X — Y" ones); a remaining handful is natural. Code/template
   comments are out of scope.
5. **K4 cross-language mirror, documented not shared.** The
   verification package must not import auth (W9/W15 dependency rule,
   accepted in the 2026-09-08 campaign). So the length is a named
   constant in each side with an explicit "mirrors … do not drift"
   comment — same accepted-duplication pattern as the code generators.
6. **D1/K6/K7/chip-label: accepted, documented.** One-line comments or
   the term table in 06-CONTEXT-SHELTER.md where relevant.

## Risks

- Capitalizing backend strings changes test expectations (message
  assertions) — mechanical, part of the mandate.
- C6 is subjective; guard: only the listed 12 user-visible strings,
  no creative rewriting, keep meaning 1:1.
