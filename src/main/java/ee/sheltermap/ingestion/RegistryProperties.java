package ee.sheltermap.ingestion;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * Registry client configuration ({@code app.registry.*}).
 *
 * @param baseUrl        registry base URL (CSV file URL by default — real deployments set REGISTRY_BASE_URL)
 * @param pageSize       rows per page request (vestigial — the WFS client
 *                       that paged was removed with its dead upstream)
 * @param maxRetries     retries after the initial attempt (0 = no retry)
 * @param politenessDelay sleep between page requests (never hammer a public service)
 * @param client         which {@code ShelterRegistryClient} bean to use: {@code csv} (default, official open-data CSV) or {@code dev} (fixture). The closed vocabulary is enforced at bind time — anything else fails the boot with a clear message (fail-closed, no silent fallback).
 * @param officialUrl    the publisher's open-data page, shown on the UI's provenance line
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
        String officialUrl,
        boolean scheduleEnabled,
        String cron,
        String zone) {

    public RegistryProperties {
        if (baseUrl == null || baseUrl.isBlank()) {
            baseUrl = "https://opendata.smit.ee/gis/varjumiskohad.csv";
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
            client = "csv";
        }
        // Fail closed on an unknown client: a removed value (the legacy
        // 'paasteamet' WFS client, whose upstream no longer publishes a
        // service) must refuse the boot with a clear message — never
        // silently fall back to a different client.
        if (!"csv".equals(client) && !"dev".equals(client)) {
            throw new IllegalStateException(
                    "app.registry.client must be 'csv' (the official open-data CSV) or 'dev' "
                            + "(local fixture), got '" + client + "'. The 'paasteamet' WFS client "
                            + "was removed — its upstream Maa-amet WFS layer (VARJEKOHT) is no "
                            + "longer published and every request to it 404s.");
        }
        if (officialUrl == null || officialUrl.isBlank()) {
            officialUrl = "https://www.rescue.ee/et/juhend/avaandmed/avalikud-varjumiskohad";
        }
        if (cron == null || cron.isBlank()) {
            cron = "0 0 3 * * MON";
        }
        if (zone == null || zone.isBlank()) {
            zone = "Europe/Tallinn";
        }
    }
}
