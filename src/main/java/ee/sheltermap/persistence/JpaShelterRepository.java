package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collection;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

/**
 * JPA implementation of {@link ShelterRepository} (approach B).
 */
@Repository
public class JpaShelterRepository implements ShelterRepository {

    private final SpringDataShelterRepository shelters;

    public JpaShelterRepository(SpringDataShelterRepository shelters) {
        this.shelters = Objects.requireNonNull(shelters, "shelters");
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
        entity.setAutoHideDisarmed(shelter.isAutoHideDisarmed());
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
    public void saveAll(List<Shelter> list) {
        for (Shelter shelter : list) {
            save(shelter);
        }
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
    public List<Shelter> findAllBySourceIn(List<ShelterSource> sources) {
        return shelters.findAllBySourceInOrderByIdAsc(sources).stream().map(JpaShelterRepository::toDomain).toList();
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
    public long countByCreatedByAndSourceAndStatus(Long createdBy, ShelterSource source,
                                                   ShelterStatus status) {
        return shelters.countByCreatedByAndSourceAndStatus(createdBy, source, status);
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
    @Transactional
    public void deleteById(Long id) {
        shelters.deleteById(id);
        // Force the SQL DELETE (and its ON DELETE CASCADE onto
        // shelter_reviews) to run NOW, not at an arbitrary later auto-flush:
        // a follow-up read of the reviews table in the same transaction must
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
        shelter.setAutoHideDisarmed(entity.isAutoHideDisarmed());
        return shelter;
    }
}
