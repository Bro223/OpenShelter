# Change: external review package (roadmap M16)

## Why

Roadmap M16 is the "external review package": a review-ready state of the
project's public-facing documents plus an explicit ask for a municipality /
university / civil-protection reviewer. The whitepaper
(`docs/whitepaper.md`) and the one-page brief (`docs/whitepaper-brief.md`)
were written at v1.0 (2026-09-12) and describe the pre-M1..M15 state:
360/588 tests, "no moderator — the rating system is the moderation",
national-ID registration, the Maa-amet WFS feed, no PII-at-rest, no
provenance taxonomy, no trust layer, no admin moderation, no i18n. Every one
of those lines is now false — an external reviewer reading them would review
a project that does not exist.

## What Changes

- **`docs/whitepaper.md` → v1.1 (2026-09-13)** — full refresh against the
  shipped code: official Päästeamet open-data CSV pipeline (Last-Modified
  versioning, `data_imports` audit, public `GET /api/data-source`),
  national-ID removal, PII at rest (AES-GCM + blind index, fail-closed
  keys), provenance taxonomy, the community trust layer (shelter/review
  reports, occupancy, auto-hide, throttles), review/rating model removal (V21), admin
  moderation + dashboard completion, data export + account erasure, legal
  pages, location & navigation, mobile polish, i18n foundation (ET/EN
  chrome), the M15 threat model + operations runbook, 706/887 tests, three
  review efforts; roadmap re-stated (community status reports done; i18n
  ET/EN chrome live, feature copy in progress); version history added.
- **`docs/whitepaper-brief.md`** — the same refresh on one page (dataset
  source, registration fields, provenance markers + trust filters, detail
  page last-verified/occupancy, community reports, Proposed submission +
  caps, review/rating model removal (V21), data audit + footer, privacy by architecture +
  your-data, routes 8→11, 706/887 tests, three review efforts, status line).
- **`docs/external-review-ask.md`** (new) — the review-request cover sheet:
  60-second project summary, suggested reading order, the per-domain
  checklist (data & provenance, the no-pre-publication-moderation model,
  privacy, security, crisis UX & i18n, deployment readiness) with the two
  owner-owed open questions flagged as explicit asks (licence wording,
  retention schedule), the locked-decisions list, and the feedback channel.
- **OpenSpec** — this change dir.

## Non-goals

- No code, no FE files, no README rewrite (the README is already current —
  M15 corrected its two stale checklist lines).
- No new product decisions. The docs only restate shipped behavior and
  locked decisions; the two open questions (licence wording, retention
  schedule) are *asked to the reviewer*, not answered here.
- No i18n work — M14 slice 2 stays parked on the owner's uncommitted
  provenance-v2 WIP. The docs describe ET/EN as "chrome translated, feature
  copy in progress", which is true at `ab3c488`.
