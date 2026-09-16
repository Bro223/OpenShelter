# Tasks — official-dataset-csv (M5)

## Slice 1 — CSV client + audit + provenance read (this pass)

- [x] `V15__data_imports.sql` — `data_imports` audit table (source_name,
      source_version, imported_at, records_added/updated/removed, status,
      error_message) + (source_name, imported_at DESC) index
- [x] `DataImportLog` port (app) + `DataImportEntity` /
      `SpringDataDataImportRepository` / `JpaDataImportLog` (persistence)
- [x] `RegistryCsvParser` — semicolon/quote-aware CSV → raw rows;
      BOM + CRLF tolerant; blank lines ignored; malformed rows dropped and
      counted; wrong header = deterministic failure
- [x] `CsvRegistryClient` — bulk GET, Last-Modified/ETag version stamp,
      If-Modified-Since from the previous audit row, 304 → notModified
      (not a failure), explicit UTF-8 decode (octet-stream, no charset),
      transient-only retry + deterministic-4xx/bad-header no-retry,
      county/municipality from `aadress` segments, `sourceAttribution`
      "Päästeamet", `dataAsOf` = Last-Modified day (UTC)
- [x] `ShelterRegistryClient.fetch()` default (rows + dataVersion +
      notModified) — WFS/dev clients untouched
- [x] `ImportResult.sourceVersion` (nullable; 7-arg constructor kept)
- [x] `ShelterImportService` — uses `fetch()`, 304 applies nothing,
      appends the audit row on OK / FAILED / NOT_MODIFIED / SKIPPED
      (best-effort, never breaks the import); existing constructors kept
- [x] `app.registry` config — `client` default `csv`, `base-url` default
      the open-data CSV (REGISTRY_BASE_URL override), new
      `official-url` (REGISTRY_OFFICIAL_URL); main + test yml in sync
- [x] `GET /api/data-source` (permitAll) + `DataSourceDto` — sourceName,
      officialUrl, lastImport (newest audit row) or null
- [x] FE — `DataSourceDto` model + `DataSourceGateway` (fail → null) +
      footer provenance line in the page shell (source · last import ·
      official open-data link; hidden while loading / on error)
- [x] Tests — `RegistryCsvParserTest` (8), `CsvRegistryClientTest` (9:
      mapping + transform + stamping + 304 + If-Modified-Since + retries +
      no-retry branches), `ShelterImportServiceTest` (+4 audit rows:
      OK/FAILED/NOT_MODIFIED/SKIPPED), `DataSourceApiIT` (2: audit row +
      endpoint, null lastImport), `data-source-gateway.spec.ts` (2),
      `page-shell.spec.ts` (+2 provenance-line tests); `PaasteametRegistryClientTest`
      updated for the new `RegistryProperties` shape
- [x] Gates green: `mvn -q test` 593/593 (Testcontainers ITs incl. the
      V15 `ddl-auto=validate` context boot); FE `ng test` 798/798;
      `tsc --noEmit` clean

## Open items (owner-owed, logged in design.md)

- [ ] O1: licence/attribution wording — **OWNER DECISION, still open**. The
      publisher's dataset page (rescue.ee/et/juhend/avaandmed/avalikud-varjumiskohad,
      checked 2026-09-15) states no licence at all, and the explainer PDF is unreadable
      (FlateDecode). Estonian state open data defaults to CC BY 4.0 under the RIA
      licensing guidance, which would carry an attribution duty; and because the import
      reprojects EPSG:3301 → WGS84, any CC BY notice would also have to state that the
      data was modified. Do NOT assert licence terms until the publisher confirms them:
      the safe default is to credit "Päästeamet / Siseministeerium", link the dataset,
      and name no licence.
- [ ] O2: confirm upstream update cadence (no version field in the file)
- [ ] O3: confirm dataset semantic scope (official-only vs adjacent
      structures mixed in)
