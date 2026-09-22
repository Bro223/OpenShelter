package ee.sheltermap.app;

import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;

import java.time.Instant;
import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Comparator;

/** In-memory fake of {@link ShelterRepository} for tests. */
public class InMemoryShelterRepository implements ShelterRepository {

    private final Map<Long, Shelter> store = new LinkedHashMap<>();
    private long nextId = 1;

    @Override
    public void save(Shelter shelter) {
        if (shelter.getId() == null) {
            shelter.setId(nextId++);
        }
        store.put(shelter.getId(), shelter);
    }

    @Override
    public Optional<Shelter> findByExternalId(String externalId) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getExternalId(), externalId))
                .findFirst();
    }

    @Override
    public Optional<Shelter> findById(Long id) {
        return Optional.ofNullable(store.get(id));
    }

    @Override
    public int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds) {
        if (externalIds == null || externalIds.isEmpty()) {
            // mirror the JPA impl: refuse a blind wipe of an entire source
            return 0;
        }
        List<Shelter> toDelete = store.values().stream()
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getExternalId() != null && !externalIds.contains(s.getExternalId()))
                .toList();
        toDelete.forEach(s -> store.remove(s.getId()));
        return toDelete.size();
    }

    @Override
    public List<Shelter> findAll() {
        return List.copyOf(store.values());
    }

    @Override
    public List<Shelter> findAllActiveBySourceIn(List<ShelterSource> sources) {
        return store.values().stream()
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> s.getStatus() == ShelterStatus.ACTIVE)
                .toList();
    }

    @Override
    public List<Shelter> findAllActiveBySourceInWithin(List<ShelterSource> sources, BoundingBox bbox) {
        // The JPA query's inclusive BETWEEN and stable id order, mirrored in memory.
        return store.values().stream()
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> s.getStatus() == ShelterStatus.ACTIVE)
                .filter(s -> bbox.contains(s.getLocation().lat(), s.getLocation().lng()))
                .sorted(Comparator.comparing(Shelter::getId))
                .toList();
    }

    @Override
    public long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source, ShelterStatus status) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getStatus() == status)
                .count();
    }

    @Override
    public long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                            Instant createdAtAfter) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(createdAtAfter))
                .count();
    }

    @Override
    public long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                         ReviewStatus reviewStatus) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getReviewStatus() == reviewStatus)
                .count();
    }

    @Override
    public Optional<Shelter> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), createdBy))
                .filter(s -> s.getSource() == source)
                .filter(s -> s.getCreatedAt() != null && s.getCreatedAt().isAfter(createdAtAfter))
                .min(Comparator.comparing(Shelter::getCreatedAt));
    }

    @Override
    public List<Shelter> findByCreatedBy(Long userId) {
        return store.values().stream()
                .filter(s -> Objects.equals(s.getCreatedBy(), userId))
                .toList();
    }

    @Override
    public List<Shelter> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return ids.stream()
                .map(store::get)
                .filter(Objects::nonNull)
                .toList();
    }

    @Override
    public List<Shelter> findActivePage(List<ShelterSource> sources, BoundingBox bbox, Boolean hasCapacity,
                                        ShelterSource provenanceSource, ReviewStatus provenanceReviewStatus,
                                        long offset, int limit) {
        // The JPA native query's semantics, mirrored in memory: the
        // ACTIVE-only public projection, the viewport (inclusive), the
        // capacity filter (null = either) and the provenance column pair
        // (null = either), id-ascending, LIMIT/OFFSET.
        return store.values().stream()
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> s.getStatus() == ShelterStatus.ACTIVE)
                .filter(s -> bbox == null || bbox.contains(s.getLocation().lat(), s.getLocation().lng()))
                .filter(s -> hasCapacity == null || (s.getCapacity() != null) == hasCapacity)
                .filter(s -> provenanceSource == null || s.getSource() == provenanceSource)
                .filter(s -> provenanceReviewStatus == null || s.getReviewStatus() == provenanceReviewStatus)
                .sorted(Comparator.comparing(Shelter::getId))
                .skip(offset)
                .limit(limit)
                .toList();
    }

    @Override
    public List<Shelter> findAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern,
                                       long offset, int limit) {
        // The JPA native query's semantics, mirrored in memory: every
        // status (the admin view), the exact status + source filters, the
        // case-insensitive LIKE (the pattern arrives already lowercased,
        // % -wildcarded and ESCAPE '\\' -quoted), id-ascending,
        // LIMIT/OFFSET.
        return store.values().stream()
                .filter(s -> status == null || s.getStatus() == status)
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> qPattern == null
                        || likeMatches(qPattern, s.getName()) || likeMatches(qPattern, s.getAddress()))
                .sorted(Comparator.comparing(Shelter::getId))
                .skip(offset)
                .limit(limit)
                .toList();
    }

    @Override
    public long countAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern) {
        return store.values().stream()
                .filter(s -> status == null || s.getStatus() == status)
                .filter(s -> sources.contains(s.getSource()))
                .filter(s -> qPattern == null
                        || likeMatches(qPattern, s.getName()) || likeMatches(qPattern, s.getAddress()))
                .count();
    }

    /**
     * The SQL {@code lower(value) LIKE pattern ESCAPE '\\'} the admin
     * search runs, emulated: {@code %} = any run, {@code _} = any single
     * character, {@code \x} = the literal x. Case-insensitive (both sides
     * lowercased — the pattern arrives lowercased already).
     */
    private static boolean likeMatches(String pattern, String value) {
        if (value == null) {
            return false;
        }
        StringBuilder regex = new StringBuilder();
        for (int i = 0; i < pattern.length(); i++) {
            char c = pattern.charAt(i);
            if (c == '\\' && i + 1 < pattern.length()) {
                i++;
                regex.append(java.util.regex.Pattern.quote(String.valueOf(pattern.charAt(i))));
            } else if (c == '%') {
                regex.append(".*");
            } else if (c == '_') {
                regex.append('.');
            } else {
                regex.append(java.util.regex.Pattern.quote(String.valueOf(c)));
            }
        }
        return value.toLowerCase(java.util.Locale.ROOT).matches(regex.toString());
    }

    @Override
    public void deleteById(Long id) {
        store.remove(id);
    }
}
