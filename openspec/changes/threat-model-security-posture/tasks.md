# Tasks — threat-model-security-posture (M15 slice 1: threat model + ops runbook + API security pins)

## Threat model document

- [x] `docs/security/threat-model.md`: scope + method + assets + threat
      sources
- [x] `docs/security/threat-model.md`: all twelve attacks, each with the
      vector, the mitigations (code pointers), status
      (mitigated / mitigated-with-residual / accepted-by-decision) and the
      pinning tests: false shelter submissions; brigading / fake reviews;
      DoS; account takeover; enumeration; private-address exposure;
      malicious content; location tracking; SMS/e-mail cost abuse; DB leaks;
      admin compromise; nearest-result manipulation
- [x] `docs/security/threat-model.md`: test-evidence matrix (attack →
      existing + new tests) + explicit residual-risk register

## Operations runbook

- [x] `docs/security/operations.md`: environments + the fail-closed boot
      guards (ProdJwtGuard, DevEndpointsGuard, PiiKeys)
- [x] `docs/security/operations.md`: env-only secrets matrix
- [x] `docs/security/operations.md`: staging-vs-production separation
      (separate DB, separate PII keys, CORS, trusted proxies, HSTS,
      single-instance constraint)
- [x] `docs/security/operations.md`: backups (pg_dump + restore procedure,
      retention, re-derivable vs not, the verification-send.log residual)
- [x] `docs/security/operations.md`: monitoring (actuator health, log-based
      alerts, admin alert ring) + incident quick-list

## BE security tests (no behavior change)

- [x] `security/PasswordRecoveryFlowIT`: unknown-e-mail ack is uniform and
      sends nothing (no existence oracle)
- [x] `security/PasswordRecoveryFlowIT`: reissue within cooldown is silent
      (no second e-mail)
- [x] `security/PasswordRecoveryFlowIT`: 5 wrong codes → generic 400s, then
      the correct code is refused (attempt lockout)
- [x] `security/PasswordRecoveryFlowIT`: a used code cannot be reused
- [x] `security/PasswordRecoveryFlowIT`: an expired code is refused
      (DB-level expiry)
- [x] `security/PasswordRecoveryFlowIT`: a successful reset revokes every
      refresh token + old password dead + new password works
- [x] `security/AdminAuthorizationIT`: anonymous /admin/** → 401 with the
      hardening headers and no Set-Cookie
- [x] `security/AdminAuthorizationIT`: registered non-admin /admin/** → 403
      with the hardening headers and no Set-Cookie
- [x] `security/AdminAuthorizationIT`: the env-provisioned admin gets 200
- [x] `security/AdminAuthorizationIT`: foreign shelter writes → 404 absent /
      403 not-author (PUT + DELETE)
- [x] `security/AdminAuthorizationIT`: /api/shelters/mine returns only the
      caller's rows

## README sync

- [x] README `## Security` section linking the two docs
- [x] README production checklist: registry client default corrected to
      `csv` (M5) with the WFS alternate noted
- [x] README production checklist: CSP line reworded (API sends the
      hardening headers incl. defense-in-depth CSP since M3 slice 5; the
      proxy remains the SPA's real CSP point)

## Gates + close-out

- [x] BE gate: `mvn -q test` green (foreground)
- [x] FE gate: `cd frontend && npx ng test` — with the owner's 32 dirty FE
      files present, attribute any failure to their WIP ("FE gate
      contaminated by owner WIP <file>, deferred") instead of fixing it
- [x] `openspec validate` for this change
- [x] commit `M15: ...` with path-scoped adds only; the owner's 32 dirty FE
      files remain dirty and untouched (verify before + after)
