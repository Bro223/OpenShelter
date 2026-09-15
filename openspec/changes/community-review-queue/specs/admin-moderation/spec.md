# Spec Delta: admin-moderation (community-review-queue)

## ADDED Requirements

### Requirement: Admin confirm/reject as manual override

The system SHALL provide `POST /admin/shelters/{id}/review` with body
`{ action: CONFIRM | REJECT, reason?: string }` (admin-only; 401
anonymous, 403 non-admin, 404 unknown id, 409 non-USER rows). CONFIRM
sets review_status=CONFIRMED (status untouched). REJECT sets
review_status=REJECTED, status=INACTIVE, and stores reason as
review_note. This is the rare manual path — the primary trust flow is
the automatic community one.

#### Scenario: The two decisions

- **WHEN** an admin confirms or rejects a community row
- **THEN** review_status (and status, for REJECT) change exactly as
  specified, reason is stored when given, and the response is 200
  `{ "ok": true }`

### Requirement: Moderation audit trail

The system SHALL record one `moderation_actions` row in the same
transaction as every moderation-relevant action: admin status change,
delete, report dismiss, review hide/restore, admin CONFIRM/REJECT, and
the automatic AUTO_CONFIRM promotion. Each row stores moderator id
(the acting user for AUTO_CONFIRM), shelter id, action, optional
reason, previous status, new status, and creation timestamp.
`GET /admin/audit` SHALL return the newest 100 actions (admin-only,
optional limit 1..200) with the shelter name resolved at read time
("Deleted shelter" when the row is gone).

#### Scenario: Every action leaves a row

- **WHEN** any of the listed actions occurs (admin or automatic)
- **THEN** exactly one audit row exists with the correct
  previous/new status pair and actor

#### Scenario: The audit log is readable

- **WHEN** an admin calls GET /admin/audit
- **THEN** the newest actions come first, each with action, reason
  (when present), status transition, actor name, and timestamp
