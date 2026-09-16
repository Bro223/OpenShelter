# shelter-provenance-taxonomy Specification

## Purpose
TBD - created by archiving change shelter-provenance-taxonomy. Update Purpose after archive.

## Requirements

### Requirement: Server-derived provenance on every shelter projection

Every shelter DTO (public list, detail, `/mine`, admin list) SHALL
carry `provenance`, a value of the taxonomy OFFICIAL /
PARTNER_VERIFIED / COMMUNITY_REPORTED / UNDER_REVIEW /
REPORTED_INACTIVE / REJECTED, derived server-side at read time from
`(source, review_status, status, nonexistentReports)` with the
precedence REJECTED > REPORTED_INACTIVE (INACTIVE + ≥ 5 NON_EXISTENT
reports) > OFFICIAL (PAASETEAMET) > PARTNER_VERIFIED (MUNICIPALITY) >
UNDER_REVIEW (USER + NEW) > COMMUNITY_REPORTED. The value SHALL NOT be
stored. The FE SHALL NOT re-derive it from source/reviewStatus.

#### Scenario: The public list carries the four visible values

- **WHEN** the list mixes registry, partner, new and confirmed
  community rows
- **THEN** each row's `provenance` is OFFICIAL / PARTNER_VERIFIED /
  UNDER_REVIEW / COMMUNITY_REPORTED respectively, and no row carries
  REPORTED_INACTIVE or REJECTED (the list is ACTIVE-only)

#### Scenario: A reported-away row is REPORTED_INACTIVE on every surface

- **WHEN** a row is INACTIVE with 5 NON_EXISTENT reports
- **THEN** its `provenance` is REPORTED_INACTIVE on the detail read,
  `/mine` and the admin list — even when the row is an official
  registry row

#### Scenario: REJECTED beats the report count

- **WHEN** a row is REJECTED and INACTIVE and also accumulated
  5 NON_EXISTENT reports
- **THEN** its `provenance` is REJECTED

### Requirement: The provenance filter narrows the public list

`GET /api/shelters?provenance=<value>` SHALL keep only rows whose
derived provenance matches, applied in-memory over the projected list
(same precedent as the trust filters), composable with `?source=` and
the trust filters. `REPORTED_INACTIVE` and `REJECTED` SHALL filter to
an empty list on the public (ACTIVE-only) endpoint. A value outside the
enum SHALL be a 400. `?source=` remains accepted and is still sent by the frontend;
`?provenance=` is additive

#### Scenario: Each visible value filters to its own rows

- **WHEN** the list contains one row per visible value and the caller
  requests `?provenance=OFFICIAL` (and each of the other three)
- **THEN** exactly the matching row is returned

#### Scenario: A hidden value filters to empty on the public list

- **WHEN** the caller requests `?provenance=REJECTED` on the public
  endpoint
- **THEN** 200 with an empty list

#### Scenario: An invalid value is rejected

- **WHEN** the caller requests `?provenance=BOGUS`
- **THEN** the response is a 400 with the standard error shape

### Requirement: Provenance presentation stays on the trust palette

The UI SHALL NOT render provenance as its own chips, legend entries or
marker colours. Provenance is server-derived metadata that the API exposes
(the `?provenance=` filter); the map's visible trust signals remain the
community-review-queue palette — the source chips (All / Registry / User)
plus the Open and Has-capacity chips — together with the reported-state and
private-home markers.

#### Scenario: The map offers no provenance chips

- **WHEN** the map filter bar renders
- **THEN** it offers the three source chips and the Open / Has-capacity
  chips, and no chip or legend entry naming a provenance value

#### Scenario: Provenance stays available through the API

- **WHEN** a client sends `GET /api/shelters?provenance=<value>`
- **THEN** the list narrows to rows whose server-derived provenance matches,
  and the UI never has to render the value as a chip

### Requirement: Provenance badges on every surface

The map row, the detail header, the /mine list and the admin list SHALL
render the provenance label and badge tone from the DTO's `provenance`
via the single-sourced `provenanceText` / `provenanceBadgeClass`. The
visible values keep their established copy ("Paasteamet registry" /
"Municipal registry" / "Community-checked" / "Newly added"); the hidden
values read "Reported inactive" (muted grey tone) and "Rejected"
(danger tone).

#### Scenario: The /mine list names a reported-away row

- **WHEN** the owner's list includes an INACTIVE row with 5
  NON_EXISTENT reports
- **THEN** its badge reads "Reported inactive" with the muted
  `badge--inactive` tone

#### Scenario: The admin list renders all six values

- **WHEN** the admin list contains one row per taxonomy value
- **THEN** each row's badge shows the matching label and tone
