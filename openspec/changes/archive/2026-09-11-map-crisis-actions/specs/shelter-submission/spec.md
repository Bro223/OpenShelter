# Spec Delta: shelter-submission (map-crisis-actions)

## ADDED Requirements

### Requirement: Submission entry points

The application SHALL make shelter submission reachable from the map page
sidebar (authenticated users) and from the account contributions panel for
all authenticated users, not only when the user has no shelters yet. The
route guards on /submit (authentication, then verification redirect) remain
the single enforcement point.

#### Scenario: contributions panel always offers the action

- **WHEN** an authenticated user with existing shelters opens the
  contributions panel
- **THEN** a "Submit a shelter" action is visible
