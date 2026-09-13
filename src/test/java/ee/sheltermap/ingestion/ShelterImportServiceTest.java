package ee.sheltermap.ingestion;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;

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

    /** Capturing {@link DataImportLog} double (M5 audit rows). */
    private static final class CapturingImportLog implements DataImportLog {
        final List<Row> rows = new ArrayList<>();

        @Override
        public void record(Row row) {
            rows.add(row);
        }

        @Override
        public Optional<Row> findLatestBySource(String sourceName) {
            for (int i = rows.size() - 1; i >= 0; i--) {
                Row r = rows.get(i);
                if (r.sourceName().equals(sourceName)) {
                    return Optional.of(r);
                }
            }
            return Optional.empty();
        }

        @Override
        public Optional<Row> findLatest() {
            return rows.isEmpty() ? Optional.empty() : Optional.of(rows.get(rows.size() - 1));
        }

        @Override
        public Optional<Row> findLatestVerifiedBySource(String sourceName) {
            for (int i = rows.size() - 1; i >= 0; i--) {
                Row r = rows.get(i);
                if (r.sourceName().equals(sourceName) && VERIFIED_STATUSES.contains(r.status())) {
                    return Optional.of(r);
                }
            }
            return Optional.empty();
        }
    }

    private ShelterImportService serviceWithAudit(FakeRegistryClient client, CapturingImportLog auditLog) {
        return new ShelterImportService(client, parser, repo, CLOCK, null, auditLog);
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
        assertThat(result.overlapSkipped()).isFalse(); // a real (empty) run, not an overlap-skip
        assertThat(repo.findAll()).hasSize(1);
    }

    @Test
    void oversizedRowsAreSkippedAndCountedWithoutAbortingTheImport() {
        // a row that fits + rows over the column limits (address 513 > 512,
        // name 256 > 255) + one valid row that must still be imported
        ImportResult result = service(FakeRegistryClient.returning(
                dto("PK-1", "A", 59.4, 24.7),
                oversizedDto("PK-2", "A", "x".repeat(513)),
                oversizedDto("PK-3", "y".repeat(256), null),
                dto("PK-4", "B", 58.3, 26.7))).importFromRegistry();

        assertThat(result.created()).isEqualTo(2);
        assertThat(result.skipped()).isEqualTo(2);
        assertThat(result.failed()).isZero();
        assertThat(repo.findAll()).extracting(Shelter::getExternalId)
                .containsExactlyInAnyOrder("PK-1", "PK-4");
    }

    @Test
    void oversizedRowKeepsItsLocalRowFromDelisting() {
        // the registry still serves PK-1 (with an oversized address) — the
        // local row must stay in the keep-list and NOT be delisted
        repo.save(registryShelter("PK-1", "A"));

        ImportResult result = service(FakeRegistryClient.returning(
                oversizedDto("PK-1", "A", "x".repeat(513)))).importFromRegistry();

        assertThat(result.updated()).isZero();
        assertThat(result.created()).isZero();
        assertThat(result.skipped()).isEqualTo(1);
        assertThat(result.removed()).isZero();
        assertThat(repo.findAll()).hasSize(1);
    }

    private static RegistryShelterDto oversizedDto(String id, String name, String address) {
        return new RegistryShelterDto(id, name, address, 59.4, 24.7, 100, true,
                "Harju maakond", "Tallinn", "02.07.2026", "SMIT. Päästeameti avaandmed");
    }

    @Test
    void overlappingRunIsFlaggedSoCallersCanTellItFromAnEmptyRun() throws InterruptedException {
        // A second run that lands while the first is still fetching hits
        // the overlap guard. Its result must carry the overlap flag — a
        // plain (0,0,0,0,0) would be indistinguishable from a legitimate
        // empty registry run.
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        ShelterRegistryClient blocking = new ShelterRegistryClient() {
            @Override
            public ShelterSource source() {
                return ShelterSource.PAASETEAMET;
            }

            @Override
            public List<RegistryShelterDto> fetchAll() {
                firstEntered.countDown();
                try {
                    releaseFirst.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return List.of();
            }
        };
        ShelterImportService service = new ShelterImportService(blocking, parser, repo, CLOCK);

        Thread first = new Thread(() -> service.importFromRegistry());
        first.start();
        firstEntered.await();

        ImportResult overlapping = service.importFromRegistry();

        releaseFirst.countDown();
        first.join();

        assertThat(overlapping.overlapSkipped()).isTrue();
        assertThat(overlapping.created()).isZero();
        assertThat(overlapping.updated()).isZero();
        assertThat(overlapping.removed()).isZero();
        assertThat(overlapping.skipped()).isZero();
        assertThat(overlapping.failed()).isZero();
    }

    @Test
    void successfulRunWritesAnOkAuditRow() {
        CapturingImportLog audit = new CapturingImportLog();

        ImportResult result = serviceWithAudit(
                FakeRegistryClient.returning(dto("PK-1", "A", 59.4, 24.7)), audit)
                .importFromRegistry();

        assertThat(result.failed()).isZero();
        assertThat(audit.rows).hasSize(1);
        DataImportLog.Row row = audit.rows.get(0);
        assertThat(row.sourceName()).isEqualTo("PAASETEAMET");
        assertThat(row.status()).isEqualTo("OK");
        assertThat(row.recordsAdded()).isEqualTo(1);
        assertThat(row.recordsUpdated()).isZero();
        assertThat(row.recordsRemoved()).isZero();
        assertThat(row.importedAt()).isEqualTo(NOW);
        assertThat(row.errorMessage()).isNull();
    }

    @Test
    void failedRunWritesAFailedAuditRowWithTheError() {
        CapturingImportLog audit = new CapturingImportLog();

        ImportResult result = serviceWithAudit(FakeRegistryClient.down(), audit)
                .importFromRegistry();

        assertThat(result.failed()).isEqualTo(1);
        assertThat(audit.rows).hasSize(1);
        DataImportLog.Row row = audit.rows.get(0);
        assertThat(row.status()).isEqualTo("FAILED");
        assertThat(row.errorMessage()).contains("registry is down");
    }

    @Test
    void notModifiedRunAppliesNothingAndWritesNotModified() {
        repo.save(registryShelter("PK-1", "A"));
        CapturingImportLog audit = new CapturingImportLog();
        ShelterRegistryClient notModified = new ShelterRegistryClient() {
            @Override
            public ShelterSource source() {
                return ShelterSource.PAASETEAMET;
            }

            @Override
            public List<RegistryShelterDto> fetchAll() {
                throw new UnsupportedOperationException("this client only answers fetch()");
            }

            @Override
            public RegistryFetch fetch() {
                return new RegistryFetch(List.of(), "v1", true);
            }
        };

        ImportResult result = new ShelterImportService(notModified, parser, repo, CLOCK, null, audit)
                .importFromRegistry();

        // no apply: the row survived, nothing counted, not a failure either
        assertThat(result.failed()).isZero();
        assertThat(result.overlapSkipped()).isFalse();
        assertThat(result.created()).isZero();
        assertThat(result.updated()).isZero();
        assertThat(result.removed()).isZero();
        assertThat(result.sourceVersion()).isEqualTo("v1");
        assertThat(repo.findAll()).hasSize(1);
        assertThat(audit.rows).hasSize(1);
        assertThat(audit.rows.get(0).status()).isEqualTo("NOT_MODIFIED");
        assertThat(audit.rows.get(0).sourceVersion()).isEqualTo("v1");
    }

    @Test
    void overlapSkipWritesASkippedAuditRow() throws InterruptedException {
        CapturingImportLog audit = new CapturingImportLog();
        CountDownLatch firstEntered = new CountDownLatch(1);
        CountDownLatch releaseFirst = new CountDownLatch(1);
        ShelterRegistryClient blocking = new ShelterRegistryClient() {
            @Override
            public ShelterSource source() {
                return ShelterSource.PAASETEAMET;
            }

            @Override
            public List<RegistryShelterDto> fetchAll() {
                firstEntered.countDown();
                try {
                    releaseFirst.await();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                return List.of();
            }
        };
        ShelterImportService service = new ShelterImportService(blocking, parser, repo, CLOCK, null, audit);

        Thread first = new Thread(() -> service.importFromRegistry());
        first.start();
        firstEntered.await();

        ImportResult overlapping = service.importFromRegistry();

        releaseFirst.countDown();
        first.join();

        assertThat(overlapping.overlapSkipped()).isTrue();
        // two rows: the overlapping run's SKIPPED (recorded first) and the
        // first run's OK (recorded when it completed after the release)
        assertThat(audit.rows).hasSize(2);
        assertThat(audit.rows.get(0).status()).isEqualTo("SKIPPED");
        assertThat(audit.rows.get(1).status()).isEqualTo("OK");
    }
}
