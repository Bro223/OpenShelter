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
| `PaasteametRegistryClient` | class | Real HTTP client: endpoint config, **pagination**, **retry with backoff**, timeout, **politeness** (SDI Ch 9 — don't hammer a public service). Parses JSON → DTOs. Fields `pageSize`, `maxRetries`. Throws `RegistryUnavailableException` when unreachable. |
| `DevRegistryClient` | class | Reads a local JSON fixture (`src/test/resources` or `src/main/resources` fixture) — dev/CI runs with no network. Same interface, swap the impl. |
| `RegistryShelterDto` | record | `externalId: String, name: String, address: String, latitude: double, longitude: double, capacity: Integer, accessible: boolean`. **The registry's JSON shape — dies at this boundary.** |
| `ShelterParser` | interface | `parse(dtos: List<RegistryShelterDto>): List<Shelter>`. Seam for per-registry parsing strategies. |
| `RegistryShelterParser` | class | Maps DTO → domain `Shelter`: name normalization (trim/collapse spaces), coordinate validation (lat ∈ [-90,90], lng ∈ [-180,180] + **Estonia bbox sanity check**), malformed rows **skipped and counted, never fatal**. Sets `source = PAASETEAMET` (or MUNICIPALITY per registry). |
| `ShelterImportService` | class | Orchestrator: `importFromRegistry(): ImportResult` — fetch → parse → dedupe (by `externalId`) → upsert → remove delisted → return result. Catches `RegistryUnavailableException` → failed result, **app never crashes because the registry is down**. |
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

Step 5 wires it manually (a `CommandLineRunner`/admin trigger or a test). A scheduled cron
(`@Scheduled`) may be added in a later step — the service stays the same either way.

## Testing notes

- `RegistryShelterParser`: valid row → Shelter; lat/lng out of range → skipped + counted; outside
  Estonia bbox → skipped + counted; blank name → skipped; empty list → empty result.
- `ShelterImportService` (with fake client + fake repo): new rows created, existing updated,
  delisted removed, `source = USER` untouched, `RegistryUnavailableException` → `ImportResult`
  with `failed > 0` and no crash.
- `DevRegistryClient` returns the fixture; `PaasteametRegistryClient` logic tested against a mock
  HTTP layer (pagination/retry/politeness).
