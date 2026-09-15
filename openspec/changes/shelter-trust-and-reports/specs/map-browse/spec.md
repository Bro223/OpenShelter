# Spec Delta: map-browse (shelter-trust-and-reports)

## MODIFIED Requirements

### Requirement: Source filter

The map page SHALL offer source-filter chips (All, Registry, User) that refetch shelters from the
server with the corresponding `?source=` value; filtering SHALL be server-side, not client-side.
The same list endpoint SHALL additionally accept an optional trust filter, composable with the
source filter: `hasCapacity=true`, which matches only shelters whose capacity data is present.
The map page SHALL expose it as a `Has capacity` toggle chip beside the source chips. All filter
states SHALL refetch from the server and clear/rebuild the list the same way the source chips
do.

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

#### Scenario: Capacity filter hides shelters without capacity data

- **WHEN** the user toggles the `Has capacity` chip
- **THEN** the page refetches with `hasCapacity=true` and only shelters with capacity data
  remain

#### Scenario: Filters combine

- **WHEN** the user selects the User chip and toggles `Has capacity`
- **THEN** the request carries `source=USER&hasCapacity=true` and the list shows the
  intersection

## ADDED Requirements

### Requirement: Reported and occupancy presentation

Shelters with `nonexistentReports > 0` SHALL render an orange reported
marker on the map and an orange "Reported" badge on the list row (the
orange is the single "reported" affordance; provenance colors apply only
to unreported shelters). The `statusFlag` SHALL render as an amber
"Reported closed" or green "Confirmed open" badge on the list row and
detail header. Fresh occupancy SHALL render as a neutral badge with
recency ("Full · 12 min ago"; hedged "Reported full" for lone reports) —
never styled as success or crisis. Auto-hidden shelters SHALL NOT appear
on the map or in the list at all.

#### Scenario: Reported shelter gets the orange state

- **WHEN** a shelter has at least one non-existence report and is still
  active
- **THEN** its marker is orange and its list row shows the "Reported"
  badge

#### Scenario: Closed flag shows, shelter stays

- **WHEN** a shelter's status flag is REPORTED_CLOSED
- **THEN** the list row and detail header show "Reported closed" and the
  shelter remains mappable

#### Scenario: Occupancy badge with recency

- **WHEN** a shelter has two fresh FULL reports, the latest 12 minutes
  old
- **THEN** the list row and detail header show "Full · 12 min ago"
