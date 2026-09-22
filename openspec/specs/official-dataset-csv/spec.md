# official-dataset-csv Specification

## Purpose

TBD - created by archiving change official-dataset-csv. Update Purpose after archive.

## Requirements

### Requirement: Official shelter import from the open-data CSV

The backend SHALL import the official shelter dataset from the
Päästeamet open-data CSV (`app.registry.base-url`, selected by
`app.registry.client=csv` — the default) as one bulk download. Each
row SHALL map `id` → external id, `nimi` → name, `aadress` → address
(county = segment 1, municipality = segment 2 of its comma segments),
`lest_x`/`lest_y` → WGS84 via the L-EST97 transformer, and SHALL carry
`source = PAASETEAMET` with attribution "Päästeamet". Malformed rows
(blank id/nimi/aadress, non-finite coordinates) SHALL be dropped and
counted, never fatal. A wrong header (validated quote-aware — the same
five column names in order, quoted or bare) or a deterministic 4xx SHALL
fail the run with NO retry; transient failures (network, 5xx) SHALL be
retried with the existing backoff budget. The zero-row-no-delist guard
and the "never touch source=USER rows" invariant SHALL be preserved.

#### Scenario: A changed dataset imports

- **WHEN** the CSV downloads with 200 and N parseable rows
- **THEN** the import upserts by external id, delists only PAASETEAMET
  rows missing from the fetch, records malformed rows as skipped, and
  stores Last-Modified-derived `dataAsOf` on every row

#### Scenario: A malformed row never aborts the run

- **WHEN** one of 303 rows has a non-numeric coordinate
- **THEN** that row is dropped and counted, the other 302 still import,
  and the run is not a failure

#### Scenario: A deterministic failure fails fast

- **WHEN** the endpoint answers 404 (or the header is not the same five
  column names — `id;nimi;aadress;lest_x;lest_y` in order — validated
  quote-aware: the live registry's quoted header validates, only a
  genuinely wrong or truncated header fails)
- **THEN** exactly one request is made, the run is recorded FAILED, and
  no shelter row changes

### Requirement: 304 handling and data versioning

The client SHALL send `If-Modified-Since` carrying the previous run's
version stamp (from the newest `data_imports` row for the source) when
that stamp is an HTTP date. A 304 response SHALL apply NOTHING (in
particular no delist) and SHALL NOT be counted as a failure. The
upstream `Last-Modified` (fallback: `ETag`) SHALL be the run's source
version.

#### Scenario: The dataset is unchanged

- **WHEN** the previous run stored a Last-Modified stamp and the server
  answers 304 to If-Modified-Since
- **THEN** the import touches no shelter row, the result has zero counts
  and failed=0, and a NOT_MODIFIED audit row is appended

### Requirement: data_imports audit trail

Every import run SHALL append one `data_imports` row with the source
name, source version (nullable), finish time, added/updated/removed
counts, a status (OK | FAILED | NOT_MODIFIED | SKIPPED) and an error
message for FAILED runs. An audit-write failure SHALL NOT break the
import itself.

#### Scenario: Every outcome is recorded

- **WHEN** runs finish as OK, FAILED, NOT_MODIFIED, or an overlap is
  skipped
- **THEN** each run has exactly one data_imports row with the matching
  status and counts

### Requirement: Public data-provenance read and UI line

The backend SHALL expose `GET /api/data-source` publicly (no auth)
returning the publisher name, the official open-data URL (from
`app.registry.official-url`), and the newest audit row (or null when no
import ran). The frontend app shell SHALL render a footer line with the
source, the last-import date, and a link to the official open-data page;
the line SHALL stay hidden while loading or when the fetch fails.

#### Scenario: Provenance after an import

- **WHEN** an import run has completed and an anonymous visitor loads any
  page
- **THEN** the footer shows the publisher, the last import date, and a
  working link to the official open-data page

#### Scenario: No import yet

- **WHEN** no import has ever run
- **THEN** the endpoint answers 200 with `lastImport: null` and the
  footer line is absent
