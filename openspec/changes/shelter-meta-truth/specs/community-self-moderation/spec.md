# Spec Delta: community-self-moderation (shelter-meta-truth, M8)

## MODIFIED Requirements

### Requirement: Report endpoints surface the dampening outcome

`POST /api/shelters/{id}/reports` SHALL answer `200` with a body of
`{"damped": true|false}` stating whether the stored report was
dampened. The `GET /admin/reports` rows SHALL carry the report's
`damped` flag, and the admin queue SHALL render a "dampened" marker
on such rows. The shelter detail page SHALL show the dampened success
notice (single-sourced copy) when its report came back dampened — and
that notice SHALL say plainly that the report was RECORDED but
WEIGHTED 0, WHY (the reporter holds their own other listing of a
similar location), and what that means for the user (it does not count
toward hiding the shelter). A notice that merely says "reduced weight"
without the zero and the reason is insufficient: a damped report must
never be silently worth 0.

#### Scenario: The report response carries the damp flag

- **WHEN** a verified user files a report that the dampening rule
  marks
- **THEN** the endpoint returns 200 with `{"damped": true}` and the
  detail page shows the weighted-0 notice stating the report was
  recorded, that it was weighted 0, the reason (the reporter's own
  similar listing) and its consequence (it does not count toward
  hiding the shelter); an undampened report returns `{"damped": false}`
  and the plain notice

#### Scenario: The admin queue flags dampened rows

- **WHEN** an admin opens the shelter-report queue containing a
  dampened report
- **THEN** that row's `damped` field is true and the queue renders
  the "dampened" marker beside the report type
