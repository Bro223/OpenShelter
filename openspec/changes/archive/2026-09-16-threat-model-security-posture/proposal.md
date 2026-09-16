# Change: threat model + security posture (roadmap M15, slice 1)

## Why

Roadmap M15 is "threat model + security testing (OTP abuse, account recovery,
API/DB), backups, monitoring, staging-vs-production separation". The app has
accumulated a large security surface since the 2026-09-08 / 2026-09-11 review
campaigns and M2–M10 (Argon2id + timing-equalized login, rotating refresh
tokens, per-contact OTP caps, PII at rest with blind index, fail-closed
boot guards, hardening headers, the admin moderation suite) — but it exists
only as scattered commits, README checklist items and per-feature OpenSpec
deltas. There is no single document that maps each attack to its mitigation
and the test that pins it, and two attack surfaces still lack end-to-end API
pins: the **account-recovery (password reset) flow** (unit + repository
coverage exists, but nothing over HTTP pins the uniform ack, the attempt
lockout, single-use, expiry and the refresh-token revocation) and the
**admin authorization surface** (anonymous / non-admin / admin outcomes over
the real security chain, plus the cross-user shelter-write 404/403
vocabulary). The operations knowledge (backups, monitoring, staging-vs-prod
separation, the single-instance constraint) is likewise scattered.

## What Changes

- **`docs/security/threat-model.md`** (new) — the threat model: assets,
  threat sources, and the twelve-attack list (false shelter submissions,
  brigading / fake reviews, DoS, account takeover, enumeration,
  private-address exposure, malicious content, location tracking,
  SMS/e-mail cost abuse, DB leaks, admin compromise, nearest-result
  manipulation). Every attack gets its mitigations with code pointers, a
  status (mitigated / mitigated-with-residual / accepted-by-decision) and
  the tests that pin it, ending in a test-evidence matrix and an explicit
  residual-risk register.
- **`docs/security/operations.md`** (new) — the operations runbook:
  environments and the fail-closed boot guards, the env-only secrets matrix,
  staging-vs-production separation (separate DB + separate PII keys, CORS,
  trusted proxies, HSTS, single instance), backups (pg_dump procedure +
  restore, retention, what is and is not re-derivable, the
  `verification-send.log` residual), monitoring (actuator health, log-based
  alerts, the admin alert ring) and an incident quick-list.
- **BE tests** (new, no behavior change):
  - `security/PasswordRecoveryFlowIT` — the reset flow over HTTP: uniform
    ack for unknown e-mail (no send, no oracle), reissue cooldown silence,
    wrong-code generic 400 ×5 then locked, single-use code, expired code
    (DB-level expiry), and successful reset revoking every refresh token
    while the new password takes effect.
  - `security/AdminAuthorizationIT` — the admin surface over the real
    security chain with an env-provisioned admin: anonymous 401 (headers +
    no cookie), registered non-admin 403 (headers + no cookie), env admin
    200, foreign shelter writes 404 (absent) / 403 (not author), and
    `/mine` scoping to the caller.
- **README** — a `## Security` section linking the two docs; two stale
  production-checklist lines corrected to match shipped code (registry
  client default is `csv` since M5, not `paasteamet`; the API has sent the
  hardening headers incl. a defense-in-depth CSP since M3 slice 5, so the
  "the app does not send one" parenthetical is reworded — the proxy remains
  the SPA's real CSP enforcement point).
- **OpenSpec** — this change dir; no existing spec delta touches the
  provenance/legend/copy surface (the owner's in-flight v2 WIP is not
  referenced or modified).

## Non-goals

- No CAPTCHA (locked decision — the per-IP / per-contact buckets are the
  abuse valve).
- No key-rotation tooling (README D6: deliberately not built until a
  rotation is scheduled).
- No volumetric-DoS / network-layer controls (edge/CDN responsibility —
  named in the operations doc, not the app).
- No FE changes. M14 slice 2 is parked on the owner's uncommitted
  provenance-v2 WIP; nothing in this change touches an FE file.
- No BE behavior changes. The tests pin the current behavior; if a gate
  red reveals a real gap, it is recorded as a decision for the owner, not
  silently patched here.
