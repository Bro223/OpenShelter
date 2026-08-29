package ee.sheltermap.config;

import ee.sheltermap.ingestion.ImportResult;
import ee.sheltermap.ingestion.ShelterImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.atomic.AtomicBoolean;

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
 * would be infrastructure the project does not have. An {@link AtomicBoolean}
 * guard prevents overlapping runs (a slow import must never pile up).
 */
@Component
@EnableScheduling
@ConditionalOnProperty(name = "app.registry.schedule-enabled", havingValue = "true", matchIfMissing = true)
public class RegistryScheduler {

    private static final Logger log = LoggerFactory.getLogger(RegistryScheduler.class);

    private final ShelterImportService importer;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public RegistryScheduler(ShelterImportService importer) {
        this.importer = importer;
    }

    @Scheduled(cron = "${app.registry.cron:0 0 3 * * MON}", zone = "${app.registry.zone:Europe/Tallinn}")
    public void runScheduledImport() {
        if (!running.compareAndSet(false, true)) {
            log.warn("Registry import already running — skipping overlapping scheduled run");
            return;
        }
        try {
            ImportResult result = importer.importFromRegistry();
            log.info("Scheduled registry import finished: created={} updated={} removed={} skipped={} failed={}",
                    result.created(), result.updated(), result.removed(), result.skipped(), result.failed());
        } finally {
            running.set(false);
        }
    }
}
