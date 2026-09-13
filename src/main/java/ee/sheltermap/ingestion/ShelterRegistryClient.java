package ee.sheltermap.ingestion;

import ee.sheltermap.domain.ShelterSource;

import java.util.List;

/**
 * The seam between the system and a public shelter registry. Nothing outside
 * {@code ee.sheltermap.ingestion} knows how data arrives (HTTP, fixture file,
 * future registry).
 */
public interface ShelterRegistryClient {

    /**
     * The {@link ShelterSource} the rows this client fetches belong to.
     * Delisting is scoped to the source of the fetch that actually ran —
     * a source with no fetcher in this run keeps its rows (a blind delist
     * over an empty fetched set would wipe them).
     */
    ShelterSource source();

    /**
     * Fetches every currently-published shelter from the registry.
     *
     * @return the raw registry rows (not yet validated/mapped)
     * @throws RegistryUnavailableException when the registry cannot be reached
     */
    List<RegistryShelterDto> fetchAll();

    /**
     * Fetch like {@link #fetchAll()}, plus the upstream data version when
     * the source publishes one (HTTP Last-Modified / ETag) and a 304
     * "not modified" marker (official-dataset-csv M5). The default wraps
     * {@code fetchAll()} unchanged, so version-less sources (WFS, dev
     * fixture) need no override.
     */
    default RegistryFetch fetch() {
        return RegistryFetch.of(fetchAll());
    }
}
