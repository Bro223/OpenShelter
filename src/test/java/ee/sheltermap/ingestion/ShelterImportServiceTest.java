package ee.sheltermap.ingestion;

import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * {@link ShelterImportService} with a fake client + fake repo (acceptance
 * criteria from Step 5): created/updated/removed counts, USER rows sacred,
 * malformed rows counted, registry-down → failed result, no crash.
 */
class ShelterImportServiceTest {

    private static final Instant NOW = Instant.parse("2026-08-23T12:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private final InMemoryShelterRepository repo = new InMemoryShelterRepository();
    private final RegistryShelterParser parser = new RegistryShelterParser();

    private ShelterImportService service(FakeRegistryClient client) {
        return new ShelterImportService(client, parser, repo, CLOCK);
    }

    private static RegistryShelterDto dto(String id, String name, double lat, double lng) {
        return new RegistryShelterDto(id, name, "addr " + id, lat, lng, 100, true,
                "Harju maakond", "Tallinn", "02.07.2026", "SMIT. Päästeameti avaandmed");
    }

    @Test
    void updateRefreshesTheFullRegistryRecord() {
        repo.save(registryShelter("PK-1", "Old name"));

        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "New name", 59.5, 24.8))).importFromRegistry();

        assertThat(result.updated()).isEqualTo(1);
        Shelter stored = repo.findAll().get(0);
        assertThat(stored.getAddress()).isEqualTo("addr PK-1");
        assertThat(stored.getCounty()).isEqualTo("Harju maakond");
        assertThat(stored.getMunicipality()).isEqualTo("Tallinn");
        assertThat(stored.getDataAsOf()).isEqualTo("02.07.2026");
        assertThat(stored.getSourceAttribution()).isEqualTo("SMIT. Päästeameti avaandmed");
    }

    private static Shelter registryShelter(String externalId, String name) {
        return new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                externalId, ShelterSource.PAASETEAMET);
    }

    private static Shelter userShelter(String name) {
        return new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                null, ShelterSource.USER);
    }

    @Test
    void newRowsAreCreated() {
        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7), dto("PK-2", "B", 58.3, 26.7))).importFromRegistry();

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.updated()).isZero();
        assertThat(result.removed()).isZero();
        assertThat(result.skipped()).isZero();
        assertThat(result.failed()).isZero();
        assertThat(repo.findAll()).hasSize(2);
    }

    @Test
    void existingRowsAreUpdatedInPlace() {
        repo.save(registryShelter("PK-1", "Old name"));

        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "New name", 59.5, 24.8))).importFromRegistry();

        assertThat(result.created()).isZero();
        assertThat(result.updated()).isEqualTo(1);
        assertThat(repo.findAll()).hasSize(1); // no duplicate row
        Shelter stored = repo.findAll().get(0);
        assertThat(stored.getName()).isEqualTo("New name");
        assertThat(stored.getLocation().lat()).isEqualTo(59.5);
    }

    @Test
    void delistedRowsAreRemoved() {
        repo.save(registryShelter("PK-1", "A"));
        repo.save(registryShelter("PK-2", "B"));
        repo.save(registryShelter("PK-3", "C"));

        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7), dto("PK-2", "B", 58.3, 26.7))).importFromRegistry();

        assertThat(result.removed()).isEqualTo(1);
        assertThat(repo.findAll()).extracting(Shelter::getExternalId)
                .containsExactlyInAnyOrder("PK-1", "PK-2");
    }

    @Test
    void userSheltersAreNeverTouched() {
        repo.save(registryShelter("PK-1", "A"));
        Shelter user = userShelter("My shelter");
        repo.save(user);

        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7))).importFromRegistry();

        assertThat(result.removed()).isZero();
        assertThat(repo.findAllBySourceIn(List.of(ShelterSource.USER))).hasSize(1);
    }

    @Test
    void municipalityRowsAreNeverDeletedByThePaasteametImport() {
        repo.save(new Shelter("Municipal", new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                "M-1", ShelterSource.MUNICIPALITY));

        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7))).importFromRegistry();

        assertThat(result.removed()).isZero();
        assertThat(repo.findAllBySourceIn(List.of(ShelterSource.MUNICIPALITY))).hasSize(1);
    }

    @Test
    void malformedRowsAreSkippedAndCounted() {
        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7),
                dto("PK-2", "   ", 59.4, 24.7),        // blank name
                dto("PK-3", "Helsinki", 60.17, 24.94)  // outside Estonia
        )).importFromRegistry();

        assertThat(result.created()).isEqualTo(1);
        assertThat(result.skipped()).isEqualTo(2);
        assertThat(result.failed()).isZero();
    }

    @Test
    void duplicateExternalIdsInOneFetchAreDeduped() {
        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7), dto("PK-1", "A", 59.4, 24.7))).importFromRegistry();

        assertThat(result.created()).isEqualTo(1);
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void registryDownYieldsFailedResultWithoutCrashing() {
        ImportResult result = service(FakeRegistryClient.down()).importFromRegistry();

        assertThat(result.failed()).isEqualTo(1);
        assertThat(result.created()).isZero();
        assertThat(result.updated()).isZero();
        assertThat(result.removed()).isZero();
        assertThat(result.skipped()).isZero();
        assertThat(result.at()).isEqualTo(NOW);
    }

    @Test
    void emptyFetchDoesNotBlindlyWipeTheSource() {
        repo.save(registryShelter("PK-1", "A"));

        ImportResult result = service(FakeRegistryClient.returning(List.of())).importFromRegistry();

        // the keep-list guard refuses a blind wipe on an empty fetch
        assertThat(result.removed()).isZero();
        assertThat(repo.findAll()).hasSize(1);
    }
}
