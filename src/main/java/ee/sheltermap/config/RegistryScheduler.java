package ee.sheltermap.config;

import ee.sheltermap.ingestion.ShelterImportService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Weekly automatic registry sync (product decision): refreshes the local copy
 * of the Päästeamet/Maa-amet shelter data on a cron schedule — default Monday
 * 03:00 Europe/Tallinn, overridable via {@code app.registry.cron} /
 * {@code app.registry.zone}. The UI never talks to the external WFS; it reads
 * our own API, which serves whatever this job last stored.
 *
 * <p>Scheduling choice: Spring's built-in {@code @Scheduled} (via
 * {@code @EnableScheduling}) — the app is a single instance with no clustering
 * or distributed-lock needs, so Quartz / Spring Cloud Task / an external cron
 * would be infrastructure the project does not have. Overlap protection lives
 * in {@link ShelterImportService} (an {@code AtomicBoolean} guard shared with
 * the startup runner) — a slow import must never pile up, and a manual run
 * must never overlap a scheduled one.
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.registry.schedule-enabled", havingValue = "true", matchIfMissing = true)
public class RegistryScheduler {

    private final ShelterImportService importer;

    public RegistryScheduler(ShelterImportService importer) {
        this.importer = importer;
    }

    @Scheduled(cron = "${app.registry.cron:0 0 3 * * MON}", zone = "${app.registry.zone:Europe/Tallinn}")
    public void runScheduledImport() {
        importer.importFromRegistry(); // logs its own result; overlap-guarded inside the service
    }
}
