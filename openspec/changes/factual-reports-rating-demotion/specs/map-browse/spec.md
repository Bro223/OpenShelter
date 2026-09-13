# Spec Delta: map-browse (factual-reports-rating-demotion, M11)

## MODIFIED Requirements

### Requirement: Source filter

The map page SHALL offer source-filter chips (All, Registry, User) that
refetch shelters from the server with the corresponding `?source=` value;
filtering SHALL be server-side, not client-side. The same list endpoint
SHALL additionally accept optional trust filters, composable with the
source filter: `reviewed=true` (shelter has at least one visible review;
`false` is the negation) and `hasCapacity=true` (capacity data present).
There is NO rating filter: the `minRating` parameter was removed in M11
(rating demotion — the rating is context, not a lever) and a request
carrying it is ignored, not an error. The map page SHALL expose these as
a `Reviewed` toggle chip and a `Has capacity` toggle chip beside the
source chips — no rating control of any kind. All filter states SHALL
refetch from the server and clear/rebuild the list the same way the
source chips do. The star summary on list rows and the detail page
remains a READ-ONLY rating display (unchanged by M11).

#### Scenario: Filter by registry

- **WHEN** the user selects the Registry chip
- **THEN** the page refetches with source REGISTRY and the map and list show only registry rows
  (PAASETEAMET and MUNICIPALITY)

#### Scenario: Filter by user submissions

- **WHEN** the user selects the User chip
- **THEN** the page refetches with source USER and the map and list show only USER rows

#### Scenario: Back to all

- **WHEN** the user selects the All chip
- **THEN** the page refetches with source ALL and shows every shelter again

#### Scenario: Reviewed filter hides unreviewed shelters

- **WHEN** the user toggles the `Reviewed` chip
- **THEN** the page refetches with `reviewed=true` and only shelters with at least one visible
  review remain

#### Scenario: No rating filter is offered

- **WHEN** the map page loads
- **THEN** no rating filter control is rendered and no `minRating`
  parameter is ever sent

#### Scenario: Filters combine

- **WHEN** the user selects the User chip, toggles `Reviewed`, and toggles `Has capacity`
- **THEN** the request carries `source=USER&reviewed=true&hasCapacity=true` and the list shows
  the intersection
