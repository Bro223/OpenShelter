# Spec Delta: external-review (external-review-package, M16)

## ADDED Requirements

### Requirement: Maintained whitepaper

The repository SHALL contain `docs/whitepaper.md` and
`docs/whitepaper-brief.md` whose status, test-count and roadmap sections
reflect the latest committed milestone (the brief mirrors the whitepaper's
claims on one page).

#### Scenario: A milestone ships

- **WHEN** a milestone changes the shipped behavior, the test counts or the
  roadmap
- **THEN** the whitepaper and the brief are refreshed in the same pass
  (version line bumped, affected sections updated)

### Requirement: External review-ask checklist

The repository SHALL contain `docs/external-review-ask.md` defining the
external review request for a municipality / university / civil-protection
reviewer: a short project summary, a suggested reading order, a per-domain
checklist (data & provenance, moderation model, privacy, security, crisis
UX & i18n, deployment readiness) with any owner-owed open questions flagged
as explicit asks, the locked-decisions list, and the feedback channel.

#### Scenario: A reviewer surfaces a new review-worthy question

- **WHEN** a review yields a question that is not covered by the checklist
  and is valuable to future reviews
- **THEN** the checklist gains the question (or the relevant document gains
  the answer) in the next maintenance pass
