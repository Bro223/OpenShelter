package ee.sheltermap.ingestion;

import ee.sheltermap.domain.Shelter;

import java.util.List;

/**
 * Maps registry rows to domain {@link Shelter} instances. Per-registry
 * parsing strategies plug in here.
 */
public interface ShelterParser {

    /**
     * Validates and maps raw registry rows. Malformed rows (bad coordinates,
     * outside Estonia, blank name/externalId) are <em>skipped, never fatal</em>.
     * The caller derives the skipped count as {@code dtos.size() - result.size()}.
     */
    List<Shelter> parse(List<RegistryShelterDto> dtos);
}
