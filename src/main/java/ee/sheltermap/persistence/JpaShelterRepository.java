package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterRepository} (approach B).
 */
@Repository
public class JpaShelterRepository implements ShelterRepository {

    private final SpringDataShelterRepository shelters;
    private final EntityManager em;

    public JpaShelterRepository(SpringDataShelterRepository shelters, EntityManager em) {
        this.shelters = Objects.requireNonNull(shelters, "shelters");
        this.em = Objects.requireNonNull(em, "em");
    }

    @Override
    @Transactional
    public void save(Shelter shelter) {
        ShelterEntity entity;
        if (shelter.getId() != null) {
            // UPDATE path: mutate the MANAGED row in place. The domain has no
            // version field (B7b), so merging a fresh entity would carry a
            // null @Version and the optimistic-lock UPDATE would match zero
            // rows. In-place mutation keeps the row's current version, which
            // is exactly what makes concurrent writes fail with an
            // OptimisticLockException instead of clobbering each other.
            entity = shelters.findById(shelter.getId())
                    .orElseThrow(() -> new IllegalStateException(
                            "cannot save shelter with unknown id " + shelter.getId()));
        } else {
            // INSERT path: fresh entity (Hibernate initialises @Version to 0).
            entity = new ShelterEntity();
        }
        applyFields(entity, shelter);
        ShelterEntity saved = shelters.save(entity);
        shelter.setId(saved.getId());
    }

    /** Copies every writable domain field onto the entity (insert or update). */
    private static void applyFields(ShelterEntity entity, Shelter shelter) {
        entity.setName(shelter.getName());
        entity.setLatitude(shelter.getLocation().lat());
        entity.setLongitude(shelter.getLocation().lng());
        entity.setStatus(shelter.getStatus());
        entity.setSource(shelter.getSource());
        entity.setExternalId(shelter.getExternalId());
        entity.setAddress(shelter.getAddress());
        entity.setCounty(shelter.getCounty());
        entity.setMunicipality(shelter.getMunicipality());
        entity.setDataAsOf(shelter.getDataAsOf());
        entity.setSourceAttribution(shelter.getSourceAttribution());
        entity.setDescription(shelter.getDescription());
        entity.setCapacity(shelter.getCapacity());
        entity.setCreatedAt(shelter.getCreatedAt());
        entity.setCreatedBy(shelter.getCreatedBy());
        // The write-time trust snapshot (V31) is carried through every save
        // — in particular the erasure path's createdBy=NULL update must not
        // drop it (AccountService.deleteAccount saves the mutated domain
        // row; the snapshot rides on the domain, so it survives).
        entity.setSubmitterVerifiedAtCreation(shelter.getSubmitterVerifiedAtCreation());
        entity.setAutoHideDisarmed(shelter.isAutoHideDisarmed());
        entity.setReviewStatus(shelter.getReviewStatus());
        entity.setReviewNote(shelter.getReviewNote());
        entity.setLocationKind(shelter.getLocationKind());
        entity.setInaccurateMarkedAt(shelter.getInaccurateMarkedAt());
        entity.setInaccurateMarkedBy(shelter.getInaccurateMarkedBy());
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Shelter> findByExternalId(String externalId) {
        return shelters.findByExternalId(externalId).map(JpaShelterRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Shelter> findById(Long id) {
        return shelters.findById(id).map(JpaShelterRepository::toDomain);
    }

    @Override
    @Transactional
    public int deleteBySourceAndExternalIdNotIn(ShelterSource source, List<String> externalIds) {
        if (externalIds == null || externalIds.isEmpty()) {
            // Nothing to keep — refuse a blind wipe of an entire source.
            return 0;
        }
        return shelters.deleteBySourceAndExternalIdNotIn(source, externalIds);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findAll() {
        return shelters.findAll().stream().map(JpaShelterRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findAllActiveBySourceIn(List<ShelterSource> sources) {
        return shelters.findAllBySourceInAndStatusOrderByIdAsc(sources, ShelterStatus.ACTIVE).stream()
                .map(JpaShelterRepository::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findAllActiveBySourceInWithin(List<ShelterSource> sources, BoundingBox bbox) {
        // Inclusive BETWEEN on both coordinates;
        // the V23.1 (latitude, longitude) B-tree backs the range scan — no PostGIS.
        return shelters.findAllBySourceInAndStatusAndLatitudeBetweenAndLongitudeBetweenOrderByIdAsc(
                        sources, ShelterStatus.ACTIVE,
                        bbox.minLat(), bbox.maxLat(), bbox.minLng(), bbox.maxLng())
                .stream()
                .map(JpaShelterRepository::toDomain)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source,
                                                   ShelterStatus status) {
        return shelters.countByCreatedByAndSourceAndStatus(createdBy, source, status);
    }

    @Override
    @Transactional(readOnly = true)
    public long countByCreatedByAndSourceAndCreatedAtAfter(Long createdBy, ShelterSource source,
                                                            Instant createdAtAfter) {
        return shelters.countByCreatedByAndSourceAndCreatedAtAfter(createdBy, source, createdAtAfter);
    }

    @Override
    @Transactional(readOnly = true)
    public long countByCreatedByAndSourceAndReviewStatus(Long createdBy, ShelterSource source,
                                                         ReviewStatus reviewStatus) {
        return shelters.countByCreatedByAndSourceAndReviewStatus(createdBy, source, reviewStatus);
    }

    @Override
    @Transactional(readOnly = true)
    public java.util.Optional<Shelter> findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
            Long createdBy, ShelterSource source, Instant createdAtAfter) {
        return shelters.findFirstByCreatedByAndSourceAndCreatedAtAfterOrderByCreatedAtAsc(
                        createdBy, source, createdAtAfter)
                .map(JpaShelterRepository::toDomain);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findByCreatedBy(Long userId) {
        return shelters.findByCreatedByOrderByIdAsc(userId).stream().map(JpaShelterRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findByIds(Collection<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return List.of();
        }
        return shelters.findByIdIn(ids).stream().map(JpaShelterRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findActivePage(List<ShelterSource> sources, BoundingBox bbox, Boolean hasCapacity,
                                        ShelterSource provenanceSource, ReviewStatus provenanceReviewStatus,
                                        long offset, int limit) {
        // DYNAMIC native query (cost model): the WHERE carries ONLY the
        // predicates that are present. Two planner traps are avoided:
        // a static "(:p IS NULL OR ...)" shape is an UNPREDICTABLE boolean
        // expression the planner cannot constant-fold (it seq-scans even
        // LIMIT 1), and a PARAMETERIZED IN over the FULL source domain
        // gets a bogus 3-row selectivity guess (bitmap scan of the whole
        // table + top-N sort for LIMIT 1). An IN over the whole domain is
        // logically redundant, so it is omitted — a bounded page then rides
        // the PK index. Measured in ShelterPagingCostIT: limit=1 vs
        // limit=100 must read different tuple counts.
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE s.status = 'ACTIVE'");
        if (sources.size() < ShelterSource.values().length) {
            where.append(" AND s.source IN (:sources)");
            params.put("sources", names(sources));
        }
        if (bbox != null) {
            where.append(" AND s.latitude BETWEEN :minLat AND :maxLat")
                    .append(" AND s.longitude BETWEEN :minLng AND :maxLng");
            params.put("minLat", bbox.minLat());
            params.put("maxLat", bbox.maxLat());
            params.put("minLng", bbox.minLng());
            params.put("maxLng", bbox.maxLng());
        }
        if (hasCapacity != null) {
            where.append(hasCapacity ? " AND s.capacity IS NOT NULL" : " AND s.capacity IS NULL");
        }
        if (provenanceSource != null) {
            where.append(" AND s.source = :provSource");
            params.put("provSource", provenanceSource.name());
        }
        if (provenanceReviewStatus != null) {
            where.append(" AND s.review_status = :provReviewStatus");
            params.put("provReviewStatus", provenanceReviewStatus.name());
        }
        params.put("limit", limit);
        params.put("offset", offset);
        String sql = "SELECT * FROM shelters s" + where
                + " ORDER BY s.id ASC LIMIT :limit OFFSET :offset";
        return nativeRows(sql, params).stream().map(JpaShelterRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Shelter> findAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern,
                                       long offset, int limit) {
        // The same dynamic-query discipline as findActivePage (the planner
        // traps documented there apply verbatim).
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (sources.size() < ShelterSource.values().length) {
            where.append(" AND s.source IN (:sources)");
            params.put("sources", names(sources));
        }
        if (status != null) {
            where.append(" AND s.status = :status");
            params.put("status", status.name());
        }
        if (qPattern != null) {
            where.append(" AND (lower(s.name) LIKE :q ESCAPE '\\' OR lower(s.address) LIKE :q ESCAPE '\\')");
            params.put("q", qPattern);
        }
        params.put("limit", limit);
        params.put("offset", offset);
        String sql = "SELECT * FROM shelters s" + where
                + " ORDER BY s.id ASC LIMIT :limit OFFSET :offset";
        return nativeRows(sql, params).stream().map(JpaShelterRepository::toDomain).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public long countAdminPage(ShelterStatus status, List<ShelterSource> sources, String qPattern) {
        // The count twin of findAdminPage — same dynamic where (the
        // X-Total-Count value is the FILTERED length without paging).
        Map<String, Object> params = new HashMap<>();
        StringBuilder where = new StringBuilder(" WHERE 1 = 1");
        if (sources.size() < ShelterSource.values().length) {
            where.append(" AND s.source IN (:sources)");
            params.put("sources", names(sources));
        }
        if (status != null) {
            where.append(" AND s.status = :status");
            params.put("status", status.name());
        }
        if (qPattern != null) {
            where.append(" AND (lower(s.name) LIKE :q ESCAPE '\\' OR lower(s.address) LIKE :q ESCAPE '\\')");
            params.put("q", qPattern);
        }
        Query q = em.createNativeQuery("SELECT COUNT(*) FROM shelters s" + where, Long.class);
        params.forEach(q::setParameter);
        return ((Number) q.getSingleResult()).longValue();
    }

    /** A native SELECT over the shelter table, named params bound. */
    private List<ShelterEntity> nativeRows(String sql, Map<String, Object> params) {
        Query q = em.createNativeQuery(sql, ShelterEntity.class);
        params.forEach(q::setParameter);
        return q.getResultList();
    }

    /** The enum's stored STRING name — native queries bind no converters. */
    private static List<String> names(List<ShelterSource> sources) {
        return sources.stream().map(Enum::name).toList();
    }

    @Override
    @Transactional
    public void deleteById(Long id) {
        shelters.deleteById(id);
        // Force the SQL DELETE (and its ON DELETE CASCADE onto the report
        // tables) to run NOW, not at an arbitrary later auto-flush:
        // a follow-up read of the child tables in the same transaction must
        // already see the cascade (the shelters delete alone would not
        // trigger the auto-flush — the query does not read the shelters table).
        shelters.flush();
    }

    private static Shelter toDomain(ShelterEntity entity) {
        Shelter shelter = new Shelter(
                entity.getName(),
                new GeoPoint(entity.getLatitude(), entity.getLongitude()),
                entity.getStatus(),
                entity.getExternalId(),
                entity.getSource(),
                entity.getAddress(),
                entity.getCounty(),
                entity.getMunicipality(),
                entity.getDataAsOf(),
                entity.getSourceAttribution(),
                entity.getDescription(),
                entity.getCapacity());
        shelter.setId(entity.getId());
        shelter.setCreatedAt(entity.getCreatedAt());
        shelter.setCreatedBy(entity.getCreatedBy());
        shelter.setSubmitterVerifiedAtCreation(entity.getSubmitterVerifiedAtCreation());
        shelter.setAutoHideDisarmed(entity.isAutoHideDisarmed());
        shelter.setReviewStatus(entity.getReviewStatus());
        shelter.setReviewNote(entity.getReviewNote());
        shelter.setLocationKind(entity.getLocationKind());
        shelter.setInaccurateMarkedAt(entity.getInaccurateMarkedAt());
        shelter.setInaccurateMarkedBy(entity.getInaccurateMarkedBy());
        return shelter;
    }
}
