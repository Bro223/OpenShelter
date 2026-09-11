# Spec Delta: shelter-detail-reviews (shelter-trust-and-reports)

## MODIFIED Requirements

### Requirement: Community review list

The detail page SHALL render the shelter's visible reviews (author name, rating, comment when
present, date) as a read-only list for everyone. Hidden reviews SHALL NOT be rendered for
anyone except their author, who sees their own hidden review marked "Hidden". No delete or edit
UI SHALL be offered for reviews that are not provably the viewer's own. For every review that
is not the viewer's own, a verified viewer SHALL be offered a "Report" action opening the
review-report picker (reasons FALSY_DATA, NOT_RELEVANT, SPAM, OTHER with free text; one report
per user per review, duplicate → the standard 409 message). Unverified viewers see no report
action (the existing redirect vocabulary).

#### Scenario: Reviews exist

- **WHEN** the detail page loads and the shelter has reviews
- **THEN** each review shows its author name, rating, optional comment, and date

#### Scenario: No reviews

- **WHEN** the shelter has no reviews
- **THEN** the page shows an explicit empty state for the review section

#### Scenario: Hidden review excluded from public list

- **WHEN** a review has been hidden by reports
- **THEN** other visitors do not see it; the author sees it marked "Hidden"

#### Scenario: Report a review

- **WHEN** a verified viewer who is not the author reports another user's review as SPAM
- **THEN** the report is stored, the viewer gets confirmation, and repeating the same reason is
  rejected with 409
