package ee.sheltermap.ingestion;

import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Step 5 acceptance: one real import run via {@link DevRegistryClient} (JSON
 * fixture) inserts shelters into PostgreSQL through the real JPA repository.
 * Fixture: 5 rows → 3 valid, 2 malformed (blank name, outside Estonia).
 */
@Transactional
class RegistryImportIT extends AbstractPersistenceIT {

    @Autowired
    ShelterRepository shelters;

    private ShelterImportService service() {
        return new ShelterImportService(
                new DevRegistryClient(new ObjectMapper()),
                new RegistryShelterParser(),
                shelters,
                Clock.systemUTC());
    }

    @Test
    void devFixtureImportCreatesSheltersAndSkipsMalformedRows() {
        // a delisted PAASETEAMET row + a USER row that must survive the import
        shelters.save(new Shelter("Delisted", new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                "PK-OLD", ShelterSource.PAASETEAMET));
        shelters.save(new Shelter("My shelter", new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                null, ShelterSource.USER));

        ImportResult result = service().importFromRegistry();

        assertThat(result.created()).isEqualTo(3);
        assertThat(result.updated()).isZero();
        assertThat(result.removed()).isEqualTo(1);        // PK-OLD delisted
        assertThat(result.skipped()).isEqualTo(2);        // blank name + outside Estonia
        assertThat(result.failed()).isZero();

        List<Shelter> registry = shelters.findAllBySourceIn(List.of(ShelterSource.PAASETEAMET));
        assertThat(registry).hasSize(3); // PK-0001, PK-0002, PK-0005 — PK-OLD was delisted
        assertThat(registry).extracting(Shelter::getName)
                .contains("Tallinna varjend 1", "Tartu keldri varjend", "Narva varjend");
        // the full published record is stored locally
        assertThat(registry).anyMatch(s -> "Endla 5, Tallinn".equals(s.getAddress())
                && "Harju maakond".equals(s.getCounty())
                && "Tallinn".equals(s.getMunicipality()));

        // user-added shelter is untouched by the importer
        List<Shelter> user = shelters.findAllBySourceIn(List.of(ShelterSource.USER));
        assertThat(user).anyMatch(s -> s.getName().equals("My shelter"));
    }

    @Test
    void reImportUpdatesExistingRowsInsteadOfDuplicating() {
        service().importFromRegistry();

        ImportResult second = service().importFromRegistry();

        assertThat(second.created()).isZero();
        assertThat(second.updated()).isEqualTo(3);
        assertThat(second.skipped()).isEqualTo(2);
        assertThat(shelters.findAllBySourceIn(List.of(ShelterSource.PAASETEAMET))).hasSize(3);
    }
}
