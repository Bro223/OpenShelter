package ee.sheltermap.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Registry client configuration ({@code app.registry.*}).
 *
 * @param baseUrl        registry base URL (default placeholder — real deployments set REGISTRY_BASE_URL)
 * @param pageSize       rows per page request
 * @param maxRetries     retries after the initial attempt (0 = no retry)
 * @param politenessDelay sleep between page requests (never hammer a public service)
 * @param client         which {@code ShelterRegistryClient} bean to use: {@code paasteamet} (default) or {@code dev}
 * @param scheduleEnabled whether the weekly {@code @Scheduled} sync is active
 * @param cron           cron expression for the weekly sync (default Monday 03:00)
 * @param zone           timezone for {@code cron} (default Europe/Tallinn)
 */
@ConfigurationProperties(prefix = "app.registry")
public record RegistryProperties(
        String baseUrl,
        int pageSize,
        int maxRetries,
        Duration politenessDelay,
        String client,
        boolean scheduleEnabled,
        String cron,
        String zone) {

    public RegistryProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://xgis.maaamet.ee/xgis2/service/1pdl2oh";
        }
        if (pageSize <= 0) {
            pageSize = 100;
        }
        if (maxRetries < 0) {
            maxRetries = 3;
        }
        if (politenessDelay == null || politenessDelay.isNegative()) {
            politenessDelay = Duration.ofMillis(250);
        }
        if (client == null || client.isBlank()) {
            client = "paasteamet";
        }
        if (cron == null || cron.isBlank()) {
            cron = "0 0 3 * * MON";
        }
        if (zone == null || zone.isBlank()) {
            zone = "Europe/Tallinn";
        }
    }
}
