# Spec Delta: map-browse (remove-shelter-reviews)

## MODIFIED Requirements

### Requirement: Load and render shelters

The map page SHALL load all shelters from the backend (`GET /api/shelters`,
no paging) and render them both as markers on a map and as rows in a
sidebar list, each showing the shelter name, address (when present), and a
source badge.

#### Scenario: Shelters exist

- **WHEN** the map page loads and the backend returns shelter rows
- **THEN** every returned shelter appears as a map marker and as a sidebar
  row, with no duplicate entries

#### Scenario: Shelter has no address

- **WHEN** a shelter row has a null address (user-submitted rows)
- **THEN** the sidebar row renders without an address line and without a
  layout break

<!-- The "Shelter has no ratings" scenario is dropped with the rating model:
     the shelter payload carries no average rating or review count, so there
     is no null-rating row state left to specify. -->
