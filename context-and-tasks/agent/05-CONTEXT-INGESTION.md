# Context — Registry Ingestion

**Source diagram:** `../04-ingestion.puml` (class diagram + sequence diagram)
**Used by steps:** 5 (create).
**Depends on contracts from:** `domain.Shelter`, `app.ShelterRepository`.

## Purpose

Pull shelter data from public registries (Päästeamet / municipalities) and keep the local store in
sync. The whole package is an **anti-corruption layer**: the external registry's format never leaks
into the domain.

## Classes to create (all in `ee.sheltermap.ingestion`)

| Type | Kind | Key members / notes |
|---|---|---|
| `ShelterRegistryClient` | interface | `source(): ShelterSource` + `fetchAll(): List<RegistryShelterDto>` + `fetch(): RegistryFetch` (official-dataset-csv M5 — the raw rows plus the upstream data version (HTTP `Last-Modified` / `ETag`) and the 304 `notModified` marker; the default method wraps `fetchAll()` unchanged, so version-less sources need no override). The seam — nothing in the system knows how data arrives. `source()` declares which `ShelterSource` the fetched rows belong to; **delisting is scoped to it** (a source with no fetcher in this run keeps its rows — a blind delist over an empty fetched set would wipe them). |
| `CsvRegistryClient` | class | **The DEFAULT client** (`app.registry.client=csv`): one bulk download of the official Päästeamet open-data CSV (`https://opendata.smit.ee/gis/varjumiskohad.csv` — UTF-8, semicolon-separated, header `id;nimi;aadress;lest_x;lest_y`; the CSV publishes no capacity/accessibility, so those DTO fields are `null`/`false`; county/municipality are split from the `aadress` field). **Versioning:** the upstream HTTP `Last-Modified` (fallback: `ETag`) stamps every row's `dataAsOf` and the run's `sourceVersion`; the previous run's stamp (the newest `data_imports` row via `DataImportLog.findLatestBySource`) is sent back as `If-Modified-Since` — a **304** answers `RegistryFetch(rows=[], version, notModified=true)` and the import applies **nothing** (in particular no delist over an empty set) without counting as a failure (`NOT_MODIFIED`). Retries **transient** failures only (network / 5xx) with exponential backoff (100 ms base); a deterministic 4xx (URL gone, forbidden…) fails fast with **no retry** (wrong header from `RegistryCsvParser` included). Coordinates arrive in **EPSG:3301** (L-EST97) — `LEst97Transformer` applies unchanged. Throws `RegistryUnavailableException` when unreachable. |
| `RegistryCsvParser` | class | Static parser for the Päästeamet open-data CSV: the delimiter is the **semicolon** (addresses contain commas — never the comma); every field is double-quoted with doubled quotes as the escape (quote-aware split). The header line must be `id;nimi;aadress;lest_x;lest_y` (after BOM/trim) — a different header is a **deterministic, no-retry** registry failure (`IllegalArgumentException` → `RegistryUnavailableException`; the file is not the dataset we expect). Malformed **rows** (blank `id`/`nimi`/`aadress`, non-numeric/non-finite coordinates) are **dropped and counted** (`Parsed.dropped` — the import's "skipped" semantics), never fatal. Emits raw L-EST97 values (`lestX`/`lestY`) — the WGS84 transform happens in the client. |
| `PaasteametRegistryClient` | class | **LEGACY opt-in** (`app.registry.client=paasteamet`) — **NOT the default**: the Maa-amet WFS layer no longer publishes a service ("Ei ole saadaval" — every WFS request 404s), so the official source is the CSV (`CsvRegistryClient`, M5). It activates only when explicitly selected. Real HTTP client for the **Maa-amet WFS** (`service=WFS&request=GetFeature&typeName=VARJEKOHT&outputFormat=geojson`), paginated via `startIndex` until a short page; **retry with exponential backoff**, timeouts, **politeness delay** between pages (SDI Ch 9), a `User-Agent` identifying the client, and a runaway-page guard. Coordinates arrive in **EPSG:3301** (L-EST97) — every point is transformed to WGS84 by `LEst97Transformer` before it leaves the class. Throws `RegistryUnavailableException` when unreachable. |
| `DevRegistryClient` | class | Reads a local JSON fixture (`src/test/resources` or `src/main/resources` fixture) — dev/CI runs with no network. Same interface, swap the impl. |
| `RegistryShelterDto` | record | `externalId: String, name: String, address: String, latitude: double, longitude: double, capacity: Integer, accessible: boolean, county: String, municipality: String, dataAsOf: String, sourceAttribution: String`. **The registry's JSON shape — dies at this boundary.** Stores the FULL published record (the app owns the dataset; the API serves a lean projection). |
| `LEst97Transformer` | class | EPSG:3301 (L-EST97, meters) → EPSG:4326 (WGS84) via proj4j. Maa-amet ignores `srsName`, so the client transforms every point itself. Verified against a known pair (Tallinn tunnel → 59.427685, 24.745890). |
| `ShelterParser` | interface | `parse(dtos: List<RegistryShelterDto>): List<Shelter>`. Seam for per-registry parsing strategies. |
| `RegistryShelterParser` | class | Maps DTO → domain `Shelter`: name normalization (trim/collapse spaces), coordinate validation (lat ∈ [-90,90], lng ∈ [-180,180] + **Estonia bbox sanity check**), malformed rows **skipped and counted, never fatal**. Sets `source = PAASETEAMET` (or MUNICIPALITY per registry). |
| `ShelterImportService` | class | Orchestrator: `importFromRegistry(): ImportResult` — fetch → parse → dedupe (by `externalId`) → upsert → remove delisted → return result. Catches `RegistryUnavailableException` → failed result, **app never crashes because the registry is down**. **Hardening:** the network fetch happens OUTSIDE the transaction; the apply phase runs in ONE transaction (a mid-batch failure rolls back everything). The `AtomicBoolean` overlap guard lives HERE — the weekly scheduler and the startup runner share it, so runs never overlap. Intra-fetch duplicate `externalId`s are counted as skipped. |
| `ImportResult` | record | `created: int, updated: int, removed: int, skipped: int, failed: int, at: Instant`. |
| `RegistryUnavailableException` | class | Runtime exception with a name — the "registry is down" failure mode is explicit. |

## Import semantics (from the puml note — do not silently change)

1. **Re-import:** existing `externalId` → **UPDATE** (fresh data), new → **CREATE**.
2. **Delisted:** registry rows missing from the latest fetch → **DELETE** — but **only for the
   source this run actually fetched** (`client.source()`, one of
   `PAASETEAMET`/`MUNICIPALITY` per client): `deleteBySourceAndExternalIdNotIn(fetchedSource,
   fetchedIds)`. Today only Päästeamet has a fetcher, so a run delists `PAASETEAMET` rows only;
   `MUNICIPALITY` rows keep existing until a municipality client ships, whose own run delists its
   own source. A zero-row fetch **skips delisting entirely** (rows retained, `log.warn`).
   The keep-list is every externalId the registry served this run — including rows that failed
   the length pre-check or parsing (a live row must never be deleted because this run couldn't
   store it).
3. **User-added shelters are sacred:** the delete only ever targets the fetched registry
   source (`PAASETEAMET` or `MUNICIPALITY` — never a blanket "REGISTRY"). `source = USER` rows
   are never touched by the importer.
4. User submissions have `externalId = null`, `source = USER` — they simply don't participate in
   dedup/delete.
5. The `?source=REGISTRY|USER|ALL` API filter (frontend selector) belongs to the API context
   (`05-shelter-api.puml`) — not here.

## Sequence (executable spec)

`scheduler → importFromRegistry() → client.fetchAll() → parser.parse(dtos) → loop
{findByExternalId → update | create} → fetchedSource = client.source(); if fetchedIds empty →
delist skipped, else deleteBySourceAndExternalIdNotIn(fetchedSource, fetchedIds) → ImportResult`

## Scheduling

**Implemented:** `RegistryScheduler` (`ee.sheltermap.config`) — Spring's built-in `@Scheduled`,
cron default `0 0 3 * * MON` Europe/Tallinn (`app.registry.cron` / `app.registry.zone`,
disable with `app.registry.schedule-enabled=false`). Chosen over Quartz / Spring Cloud Task /
external cron because the app is a single instance with no clustering needs. The manual
`CommandLineRunner` trigger (`--app.registry.run-on-startup=true`) still works and shares the
service's overlap guard.

## Testing notes

- `RegistryShelterParser`: valid row → Shelter; lat/lng out of range → skipped + counted; outside
  Estonia bbox → skipped + counted; blank name → skipped; empty list → empty result.
- `ShelterImportService` (with fake client + fake repo): new rows created, existing updated,
  delisted removed, `source = USER` untouched, `RegistryUnavailableException` → `ImportResult`
  with `failed > 0` and no crash.
- `DevRegistryClient` returns the fixture; `PaasteametRegistryClient` logic tested against a mock
  HTTP layer (pagination/retry/politeness).
