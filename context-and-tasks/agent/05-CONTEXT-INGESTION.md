# Context — Registry Ingestion

**Source diagram:** `docs/uml/04-ingestion.puml` (class diagram + sequence diagram)
**Used by steps:** 5 (create).
**Depends on contracts from:** `domain.Shelter`, `app.ShelterRepository`.

## Purpose

Pull shelter data from public registries (Päästeamet / municipalities) and keep the local store in
sync. The whole package is an **anti-corruption layer**: the external registry's format never leaks
into the domain.

## Classes to create (all in `ee.sheltermap.ingestion`)

| Type | Kind | Key members / notes |
|---|---|---|
| `ShelterRegistryClient` | interface | `fetchAll(): List<RegistryShelterDto>`. The seam — nothing in the system knows how data arrives. |
| `PaasteametRegistryClient` | class | Real HTTP client for the **Maa-amet WFS** (`service=WFS&request=GetFeature&typeName=VARJEKOHT&outputFormat=geojson`), paginated via `startIndex` until a short page; **retry with exponential backoff**, timeouts, **politeness delay** between pages (SDI Ch 9), a `User-Agent` identifying the client, and a runaway-page guard. Coordinates arrive in **EPSG:3301** (L-EST97) — every point is transformed to WGS84 by `LEst97Transformer` before it leaves the class. Throws `RegistryUnavailableException` when unreachable. |
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
2. **Delisted:** registry rows missing from the latest fetch → **DELETE**
   (`deleteBySourceAndExternalIdNotIn(REGISTRY, fetchedIds)`).
3. **User-added shelters are sacred:** the delete only ever targets `source = REGISTRY`
   (`PAASETEAMET`/`MUNICIPALITY`). `source = USER` rows are never touched by the importer.
4. User submissions have `externalId = null`, `source = USER` — they simply don't participate in
   dedup/delete.
5. The `?source=REGISTRY|USER|ALL` API filter (frontend selector) belongs to the API context
   (`05-shelter-api.puml`) — not here.

## Sequence (executable spec)

`scheduler → importFromRegistry() → client.fetchAll() → parser.parse(dtos) → loop
{findByExternalId → update | create} → deleteBySourceAndExternalIdNotIn(REGISTRY, fetchedIds) →
ImportResult`

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
