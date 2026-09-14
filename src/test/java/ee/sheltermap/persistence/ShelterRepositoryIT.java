package ee.sheltermap.persistence;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
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

    @Autowired
    UserRepository users;

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
    void findAllAndFindAllActiveBySourceIn() {
        shelters.save(shelter("A", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "a"));
        shelters.save(shelter("B", ShelterStatus.ACTIVE, ShelterSource.MUNICIPALITY, "b"));
        shelters.save(shelter("C", ShelterStatus.ACTIVE, ShelterSource.USER, null));

        assertThat(shelters.findAll()).hasSize(3);
        // the public list query (D5): ACTIVE rows of the requested sources only
        assertThat(shelters.findAllActiveBySourceIn(List.of(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY)))
                .hasSize(2)
                .extracting(Shelter::getSource)
                .doesNotContain(ShelterSource.USER);
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
        assertThat(shelters.findAllActiveBySourceIn(List.of(ShelterSource.USER))).hasSize(1);
    }

    @Test
    void emptyKeepListRefusesBlindWipe() {
        shelters.save(shelter("P1", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "p1"));

        int deleted = shelters.deleteBySourceAndExternalIdNotIn(ShelterSource.PAASETEAMET, List.of());

        assertThat(deleted).isZero();
        assertThat(shelters.findAll()).hasSize(1);
    }

    private static Shelter userShelterWithAuthor(String name, long authorId) {
        Shelter s = shelter(name, ShelterStatus.ACTIVE, ShelterSource.USER, null);
        s.setCreatedBy(authorId);
        return s;
    }

    @Test
    void createdByRoundTripsAndFiltersByAuthor() {
        // created_by is a real FK: author rows must exist in users
        RegisteredUser authorA = saveUser(users, "contrib-a1@example.ee", "+37250011101");
        RegisteredUser authorB = saveUser(users, "contrib-b1@example.ee", "+37250011102");
        Shelter a1 = userShelterWithAuthor("A1", authorA.getId());
        Shelter a2 = userShelterWithAuthor("A2", authorA.getId());
        Shelter b1 = userShelterWithAuthor("B1", authorB.getId());
        Shelter legacy = shelter("Legacy No Author", ShelterStatus.ACTIVE, ShelterSource.USER, null);
        List.of(a1, a2, b1, legacy).forEach(shelters::save);

        assertThat(shelters.findByCreatedBy(authorA.getId()))
                .extracting(Shelter::getName)
                .containsExactlyInAnyOrder("A1", "A2");
        assertThat(shelters.findByCreatedBy(authorB.getId())).extracting(Shelter::getName).containsExactly("B1");
        // the legacy row (created_by NULL) belongs to nobody
        assertThat(shelters.findByCreatedBy(999_999_999L)).isEmpty();
    }

    @Test
    void findByIdsReturnsExactlyTheRequestedRows() {
        Shelter a = shelter("A", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "a");
        Shelter b = shelter("B", ShelterStatus.ACTIVE, ShelterSource.MUNICIPALITY, "b");
        List.of(a, b).forEach(shelters::save);

        assertThat(shelters.findByIds(List.of(a.getId())))
                .extracting(Shelter::getName)
                .containsExactly("A");
        assertThat(shelters.findByIds(List.of())).isEmpty();
    }

    @Test
    void deleteByIdRemovesTheRowAndIsANoOpWhenAbsent() {
        Shelter a = shelter("A", ShelterStatus.ACTIVE, ShelterSource.PAASETEAMET, "a");
        shelters.save(a);

        shelters.deleteById(a.getId());

        assertThat(shelters.findById(a.getId())).isEmpty();
        shelters.deleteById(999_999L); // no-op, no exception
    }
}
