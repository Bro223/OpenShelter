# security-posture Specification

## Purpose
TBD - created by archiving change threat-model-security-posture. Update Purpose after archive.

## Requirements

### Requirement: Maintained threat model

The repository SHALL contain a threat model at `docs/security/threat-model.md`
covering the thirteen-attack list (false shelter submissions, brigading / fake
reports, DoS, account takeover, enumeration, private-address exposure,
malicious content, location tracking, SMS/e-mail cost abuse, DB leaks, admin
compromise, nearest-result manipulation, SSRF via the admin hero-image import). Every attack SHALL state its
mitigations with code pointers, a status (mitigated / mitigated-with-residual
/ accepted-by-decision), and the test(s) that pin it, and the document SHALL
carry an explicit residual-risk register.

#### Scenario: A defense changes

- **WHEN** a security mitigation is added, removed or changed in code
- **THEN** the threat model entry for the affected attack is updated in the
  same commit (pointer, status and pinning test name)

### Requirement: Operations runbook

The repository SHALL contain an operations runbook at
`docs/security/operations.md` documenting: the environments and the
fail-closed boot guards, the env-only secrets matrix,
staging-vs-production separation, the backup and restore procedure (database,
the verification send log, the PII keys), and the monitoring surface (health
probe, log-based alerts, the admin alert ring).

#### Scenario: A deployment-affecting setting changes

- **WHEN** an environment variable, boot guard or monitoring-relevant
  endpoint is added or renamed
- **THEN** the operations runbook section that names it is updated in the
  same commit

### Requirement: API-level security pins

The account-recovery flow and the admin authorization surface SHALL be
pinned by end-to-end HTTP tests over the real security chain: the reset
request ack is uniform for known and unknown e-mails (no send for the
unknown one), a wrong reset code fails generically five times and then locks
out the correct code, a used code is single-use, an expired code is refused,
a successful reset revokes every refresh token, and the admin endpoints
answer 401 anonymous / 403 registered non-admin / 200 env-provisioned admin,
each with the hardening headers and no cookie, while shelter writes keep the
404-absent / 403-foreign vocabulary and `/mine` stays caller-scoped.

#### Scenario: A recovery or admin behavior drifts

- **WHEN** a change alters the reset flow's uniformity, lockout, single-use,
  expiry or refresh-token revocation, or the admin 401/403/200 vocabulary
- **THEN** `PasswordRecoveryFlowIT` or `AdminAuthorizationIT` fails, naming
  the pinned behavior
