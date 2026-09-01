package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

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
        ShelterEntity entity = toEntity(shelter);
        ShelterEntity saved = shelters.save(entity);
        shelter.setId(saved.getId());
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
        return shelters.findAllBySourceIn(sources).stream().map(JpaShelterRepository::toDomain).toList();
    }

    private static ShelterEntity toEntity(Shelter shelter) {
        ShelterEntity entity = new ShelterEntity();
        entity.setId(shelter.getId());
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
        return entity;
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
        return shelter;
    }
}
