# Spec Delta: shelter-provenance-taxonomy (M6)

## ADDED Requirements

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
enum SHALL be a 400. `?source=` remains accepted (compatibility); the
frontend no longer sends it.

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

### Requirement: Provenance-coloured markers, legend and chips

The map's marker tone SHALL follow the row's provenance — OFFICIAL
blue, PARTNER_VERIFIED yellow, COMMUNITY_REPORTED green, UNDER_REVIEW
amber — with the reported-state orange overriding all four for ACTIVE
rows with `nonexistentReports > 0`. The legend SHALL show the five
public-map entries (Official / Partner / Community / New community /
Reported); the grey (REPORTED_INACTIVE) and red (REJECTED) tones SHALL
render only on the detail page's static pin. The filter chips SHALL be
the five provenance values (All / Official / Partner / Community /
New community), each chip refetching server-side; they replace the old
All / Registry / User source chips.

#### Scenario: Each provenance renders its pin colour

- **WHEN** the map renders one row per visible provenance
- **THEN** the pins carry the registry (blue), partner (yellow), user
  (green) and new (amber) marker classes respectively

#### Scenario: The reported state still beats the provenance colour

- **WHEN** an UNDER_REVIEW row has `nonexistentReports > 0`
- **THEN** its pin carries the reported (orange) class, not the amber
  one

#### Scenario: A chip refetches server-side with the provenance param

- **WHEN** the user clicks the Partner chip
- **THEN** the gateway requests `?provenance=PARTNER_VERIFIED`, the
  list rebuilds from the response, and the chip becomes active

#### Scenario: The hidden tones render on the detail pin

- **WHEN** the detail page pins a REPORTED_INACTIVE (respectively
  REJECTED) row
- **THEN** the static pin carries the inactive (grey) / rejected (red)
  marker class

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
