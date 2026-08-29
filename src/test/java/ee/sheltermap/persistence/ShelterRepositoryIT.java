package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@Transactional
class ShelterRepositoryIT extends AbstractPersistenceIT {

    @Autowired
    ShelterRepository shelters;

    private static Shelter shelter(String name, ShelterStatus status, ShelterSource source, String externalId) {
        return new Shelter(name, new GeoPoint(59.437, 24.7536), status, externalId, source);
    }

    @Test
    void saveAndFindByExternalId() {
        Shelter s = shelter("Viru Keskus", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "ext-1");
        shelters.save(s);

        assertThat(s.getId()).isNotNull();
        assertThat(shelters.findByExternalId("ext-1")).isPresent();
        assertThat(shelters.findByExternalId("ext-1").orElseThrow().getName()).isEqualTo("Viru Keskus");
        assertThat(shelters.findByExternalId("nope")).isEmpty();
    }

    @Test
    void findAllAndFindAllBySourceIn() {
        shelters.save(shelter("A", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "a"));
        shelters.save(shelter("B", ShelterStatus.ACTIVE, ShelterSource.MUNICIPALITY, "b"));
        shelters.save(shelter("C", ShelterStatus.ACTIVE, ShelterSource.USER, null));

        assertThat(shelters.findAll()).hasSize(3);
        assertThat(shelters.findAllBySourceIn(List.of(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY)))
                .hasSize(2)
                .extracting(Shelter::getSource)
                .doesNotContain(ShelterSource.USER);
    }

    @Test
    void saveAllPersistsAll() {
        shelters.saveAll(List.of(
                shelter("A", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "a"),
                shelter("B", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "b")));

        assertThat(shelters.findAll()).hasSize(2);
    }

    @Test
    void deleteBySourceAndExternalIdNotInDeletesOnlyRegistryRows() {
        shelters.save(shelter("P1", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "p1"));
        shelters.save(shelter("P2", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "p2"));
        shelters.save(shelter("P3", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "p3"));
        shelters.save(shelter("M1", ShelterStatus.ACTIVE, ShelterSource.MUNICIPALITY, "m1"));
        shelters.save(shelter("U1", ShelterStatus.ACTIVE, ShelterSource.USER, null));

        int deleted = shelters.deleteBySourceAndExternalIdNotIn(
                ShelterSource.PAASETEAMET, List.of("p1", "p2"));

        assertThat(deleted).isEqualTo(1);
        assertThat(shelters.findByExternalId("p1")).isPresent();
        assertThat(shelters.findByExternalId("p2")).isPresent();
        assertThat(shelters.findByExternalId("p3")).isEmpty();
        // other sources untouched
        assertThat(shelters.findByExternalId("m1")).isPresent();
        // user-submitted row untouched (also by SQL NULL semantics)
        assertThat(shelters.findAllBySourceIn(List.of(ShelterSource.USER))).hasSize(1);
    }

    @Test
    void emptyKeepListRefusesBlindWipe() {
        shelters.save(shelter("P1", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "p1"));

        int deleted = shelters.deleteBySourceAndExternalIdNotIn(ShelterSource.PAASETEAMET, List.of());

        assertThat(deleted).isZero();
        assertThat(shelters.findAll()).hasSize(1);
    }
}
