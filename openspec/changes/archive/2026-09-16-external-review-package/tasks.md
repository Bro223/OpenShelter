# Tasks — external-review-package (M16)

## Document refresh

- [x] `docs/whitepaper.md` v1.1: abstract (three ideas, 706/887 tests,
      three review efforts), §2 official-dataset framing, §3 thesis 1
      (no pre-publication moderation, reports are the moderation, ratings
      read-only) + new thesis 7 (privacy architecture), §4 diagram +
      registry data flow (CSV, Last-Modified, audit, data-source), §5
      (registration without national ID, export + erasure, ingestion
      bullets, trust layer / provenance / admin / navigation), §6 (PII row,
      fail-closed guards, three review efforts + threat-model/ops links),
      §7 (V1–V20, CSV client, i18n), §8 (706/887, three efforts), §9 (PII
      keys, staging-vs-prod), §10 (current state + re-stated roadmap +
      in-progress line), appendix (admin/trust/data-source rows), version
      history
- [x] `docs/whitepaper-brief.md`: dataset source, registration fields,
      account-page field list (personal code gone), provenance markers +
      trust filters, detail page (last-verified, occupancy), community
      reports, Proposed submission + caps, rating demotion, data audit +
      footer, privacy by architecture + your data, routes 11, 706/887 +
      three efforts, status line

## Review-ask checklist

- [x] `docs/external-review-ask.md`: package metadata (date, commit, test
      state), 60-second summary, reading order, per-domain checklist (data
      & provenance, moderation model, privacy, security, crisis UX & i18n,
      deployment readiness) with the owner-owed asks (licence wording,
      retention schedule) flagged, locked-decisions list, feedback channel

## Gates + close-out

- [x] `openspec validate` for this change
- [x] no FE files touched (docs-only pass — the owner's 32 dirty FE files
      must remain dirty and untouched; verified before/after commit: 32 → 32)
- [x] commit `M16: ...` with path-scoped adds only (docs + this change dir,
      six paths)
