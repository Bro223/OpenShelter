package ee.sheltermap.config;

import ee.sheltermap.ingestion.ImportResult;
import ee.sheltermap.ingestion.ShelterImportService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Manual import trigger (Step 5 deliverable). Off by default so a normal
 * {@code spring-boot:run} never touches the network; enable with
 * {@code --app.registry.run-on-startup=true}. A scheduled cron may replace
 * this later — the service stays the same either way.
 */
@Configuration
public class RegistryRunConfig {

    private static final Logger log = LoggerFactory.getLogger(RegistryRunConfig.class);

    @Bean
    @ConditionalOnProperty(name = "app.registry.run-on-startup", havingValue = "true")
    CommandLineRunner importOnStartup(ShelterImportService importer) {
        return args -> {
            ImportResult result = importer.importFromRegistry();
            log.info("Registry import finished: created={} updated={} removed={} skipped={} failed={}",
                    result.created(), result.updated(), result.removed(), result.skipped(), result.failed());
        };
    }
}
