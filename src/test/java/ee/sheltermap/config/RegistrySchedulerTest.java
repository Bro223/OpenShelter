package ee.sheltermap.config;

import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.ingestion.ImportResult;
import ee.sheltermap.ingestion.ShelterImportService;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The weekly sync trigger: a scheduled run must invoke the import exactly
 * once and never fail the app when the import reports a failure result.
 *
 * <p>Uses a hand-written subclass fake instead of Mockito so this test runs
 * on any JDK (the ByteBuddy agent bundled with Boot 3.3's Mockito does not
 * support JDK 27+).
 */
class RegistrySchedulerTest {

    private static final Instant NOW = Instant.parse("2026-08-23T12:00:00Z");

    /** Fake that records invocation count and returns a canned result. */
    private static final class FakeImporter extends ShelterImportService {
        private final ImportResult result;
        private final AtomicInteger calls = new AtomicInteger();

        FakeImporter(ImportResult result) {
            super(
                    () -> List.of(),                       // ShelterRegistryClient
                    dtos -> List.of(),                     // ShelterParser
                    new InMemoryShelterRepository(),       // ShelterRepository
                    Clock.fixed(NOW, ZoneOffset.UTC));     // Clock
            this.result = result;
        }

        @Override
        public ImportResult importFromRegistry() {
            calls.incrementAndGet();
            return result;
        }

        int calls() {
            return calls.get();
        }
    }

    @Test
    void scheduledRunInvokesTheImport() {
        FakeImporter importer = new FakeImporter(new ImportResult(3, 0, 1, 2, 0, NOW));
        RegistryScheduler scheduler = new RegistryScheduler(importer);

        scheduler.runScheduledImport();

        assertThat(importer.calls()).isEqualTo(1);
    }

    @Test
    void failedImportIsSwallowedNotThrown() {
        FakeImporter importer = new FakeImporter(ImportResult.failure(NOW));
        RegistryScheduler scheduler = new RegistryScheduler(importer);

        // must not throw — the scheduler logs and moves on
        scheduler.runScheduledImport();

        assertThat(importer.calls()).isEqualTo(1);
    }
}
