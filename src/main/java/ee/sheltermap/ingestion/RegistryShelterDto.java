package ee.sheltermap.ingestion;

/**
 * The registry's JSON shape — dies at this boundary. The anti-corruption
 * layer never lets this record leak into the domain.
 *
 * @param externalId registry identifier (unique per registry)
 * @param name       display name
 * @param address    street address as published by the registry
 * @param latitude   WGS84 latitude
 * @param longitude  WGS84 longitude
 * @param capacity   declared capacity (may be null when the registry omits it)
 * @param accessible whether the shelter is wheelchair accessible
 * @param county     county (MK) as published by the registry (may be null)
 * @param municipality municipality (OV) as published by the registry (may be null)
 * @param dataAsOf   registry data date (ANDMESEIS) as published (may be null)
 * @param sourceAttribution attribution string (ALLIKAS) as published (may be null)
 */
public record RegistryShelterDto(
        String externalId,
        String name,
        String address,
        double latitude,
        double longitude,
        Integer capacity,
        boolean accessible,
        String county,
        String municipality,
        String dataAsOf,
        String sourceAttribution) {
}
