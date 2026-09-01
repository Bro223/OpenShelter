package ee.sheltermap.config;

import ee.sheltermap.ingestion.ShelterImportService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Manual import trigger (Step 5 deliverable). Off by default so a normal
 * {@code spring-boot:run} never touches the network; enable with
 * {@code --app.registry.run-on-startup=true}. The result is logged by
 * {@link ShelterImportService} itself, and the overlap guard lives there too
 * (hardening pass) — a startup run can never overlap a scheduled one.
 */
@Configuration
public class RegistryRunConfig {

    @Bean
    @ConditionalOnProperty(name = "app.registry.run-on-startup", havingValue = "true")
    CommandLineRunner importOnStartup(ShelterImportService importer) {
        return args -> importer.importFromRegistry();
    }
}
