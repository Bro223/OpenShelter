# Change: official-dataset-csv

## Why

Roadmap M5 (import repair). The configured import — the Maa-amet WFS layer
`https://xgis.maaamet.ee/xgis2/service/1pdl2oh` (VARJEKOHT) — 404s for
every request: the layer publishes no service (Maa-amet lists it as "Ei ole
saadaval"), so the weekly job fails soft and the app serves only
fixture/repo data. The authoritative replacement (supervisor addendum,
live-verified 2026-09-12) is the Päästeamet open-data CSV at
`https://opendata.smit.ee/gis/varjumiskohad.csv` (HTTP 200, 303 rows,
semicolon CSV, header `id;nimi;aadress;lest_x;lest_y`, 303 unique ids,
EPSG:3301 — the existing `LEst97Transformer` applies unchanged).

## What Changes

- **`CsvRegistryClient`** (new) implements `ShelterRegistryClient` — one
  bulk download replaces the WFS page walk: quote-aware semicolon-CSV parse
  (`RegistryCsvParser`), `id`→externalId, `nimi`→name, `aadress`→address
  with county/municipality derived from its comma segments, `lest_x/lest_y`
  → WGS84 via the shared transformer, `source = PAASETEAMET`,
  `sourceAttribution = "Päästeamet"`. Transient-only retries with the same
  exponential backoff; a deterministic 4xx or a wrong header fails with no
  retry; malformed rows are dropped and counted, never fatal.
- **Client selection** — `app.registry.client: csv` becomes the default
  (WFS client stays available as `paasteamet`, `dev` fixture untouched);
  `app.registry.base-url` defaults to the CSV (REGISTRY_BASE_URL override
  kept); new `app.registry.official-url` (REGISTRY_OFFICIAL_URL override).
- **Versioning** — the dataset publishes no version field, so the upstream
  HTTP `Last-Modified` (fallback `ETag`) stamps every row's `dataAsOf` and
  becomes the run's source version. The previous run's stamp is sent back
  as `If-Modified-Since`; a **304 applies nothing** (no delist over an
  empty set) and is NOT a failure. `ShelterRegistryClient` gains a default
  `fetch()` (rows + version + notModified) that wraps `fetchAll()`
  unchanged, so the WFS/dev clients need no override.
- **`data_imports` audit (V15)** — one row per run (OK / FAILED /
  NOT_MODIFIED / SKIPPED) with source, version, counts, status, error.
  `ImportResult` gains a nullable `sourceVersion`; the service appends the
  row on every outcome (a failing audit write never breaks the import).
- **`GET /api/data-source`** (public) — `{ sourceName, officialUrl,
  lastImport: { at, status, sourceVersion, recordsAdded/Updated/Removed } |
  null }`; the app-wide footer renders source + official open-data link +
  last-import date (non-critical: hidden while loading or on API error).
- **Kept unchanged** — `ShelterImportService` upsert/delist/
  single-transaction/overlap-guard semantics, the zero-row-no-delist guard,
  the "never touch `source=USER` rows" invariant, `dev` fixture.

## Non-goals (this change)

- No licence-terms assertion: the publisher's explainer PDF is
  FlateDecode-compressed and unreadable — a marked TODO stays in
  `design.md` (Open item O2).
- No GeoPackage ingestion (CSV only, per the addendum).
- No changes to the WFS client's behavior (it stays a working alternate).
