package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterSource;

import java.util.List;

/**
 * Frontend-facing source filter for {@code GET /api/shelters?source=...}.
 * Maps to repository queries: REGISTRY = registry-imported rows,
 * USER = user-submitted rows, ALL = everything.
 */
public enum ShelterSourceFilter {
    REGISTRY,
    USER,
    ALL;

    public List<ShelterSource> sources() {
        return switch (this) {
            case REGISTRY -> List.of(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY);
            case USER -> List.of(ShelterSource.USER);
            case ALL -> List.of(ShelterSource.values());
        };
    }
}
