package ee.sheltermap.ingestion;

import java.util.List;

/**
 * The seam between the system and a public shelter registry. Nothing outside
 * {@code ee.sheltermap.ingestion} knows how data arrives (HTTP, fixture file,
 * future registry).
 */
public interface ShelterRegistryClient {

    /**
     * Fetches every currently-published shelter from the registry.
     *
     * @return the raw registry rows (not yet validated/mapped)
     * @throws RegistryUnavailableException when the registry cannot be reached
     */
    List<RegistryShelterDto> fetchAll();
}
