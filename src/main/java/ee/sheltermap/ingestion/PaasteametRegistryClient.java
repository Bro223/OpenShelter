package ee.sheltermap.ingestion;

import ee.sheltermap.config.RegistryProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * Real HTTP client for the Päästeamet shelter registry, which is served as a
 * Maa-amet WFS (OGC Web Feature Service) layer named {@code VARJEKOHT}.
 *
 * <p>Protocol (verified against the live service):
 * {@code GET {baseUrl}?service=WFS&version=1.0.0&request=GetFeature
 * &typeName=VARJEKOHT&outputFormat=geojson&maxFeatures={pageSize}
 * &startIndex={offset}} — paginated with {@code startIndex} until a page
 * returns fewer than {@code pageSize} features.
 *
 * <p>Behaves well (SDI Ch 9 — never hammer a public service): sleeps
 * {@code politenessDelay} between pages, retries transient failures with
 * exponential backoff up to {@code maxRetries} attempts, and gives up with
 * {@link RegistryUnavailableException} — never a crash. A runaway guard caps
 * the walk at 10 000 pages.
 *
 * <p>The service always returns coordinates in EPSG:3301 (L-EST97, meters)
 * and ignores {@code srsName} — every point is transformed to WGS84 by
 * {@link LEst97Transformer} before it leaves this class, so downstream code
 * only ever sees latitude/longitude.
 */
@Service
@ConditionalOnProperty(name = "app.registry.client", havingValue = "paasteamet", matchIfMissing = true)
public class PaasteametRegistryClient implements ShelterRegistryClient {

    /** Backoff base: 100 ms, doubling per attempt (100, 200, 400 …). */
    private static final long BACKOFF_BASE_MILLIS = 100;
    private static final int MAX_PAGES = 10_000;

    private final String baseUrl;
    private final int pageSize;
    private final int maxRetries;
    private final Duration politenessDelay;
    private final RestClient restClient;
    private final LEst97Transformer transformer;

    public PaasteametRegistryClient(RegistryProperties properties,
                                    RestClient.Builder builder,
                                    LEst97Transformer transformer) {
        this.baseUrl = trimTrailingSlash(properties.baseUrl());
        this.pageSize = properties.pageSize();
        this.maxRetries = properties.maxRetries();
        this.politenessDelay = properties.politenessDelay();
        this.transformer = transformer;
        // Timeouts come from spring.http.client.* (Boot auto-config) — the
        // builder stays untouched so tests can bind MockRestServiceServer to it.
        this.restClient = builder.baseUrl(this.baseUrl).build();
    }

    @Override
    public List<RegistryShelterDto> fetchAll() {
        int startIndex = 0;
        List<RegistryShelterDto> all = new ArrayList<>();
        while (true) {
            WfsFeatureCollection page = fetchPage(startIndex);
            List<WfsFeature> features = page.features() == null ? List.of() : page.features();
            for (WfsFeature feature : features) {
                RegistryShelterDto dto = toDto(feature);
                if (dto != null) {
                    all.add(dto);
                }
            }
            if (features.size() < pageSize) {
                break; // short page ends the walk
            }
            if (startIndex / pageSize >= MAX_PAGES) {
                break; // runaway guard — never loop forever on a misbehaving registry
            }
            sleep(politenessDelay); // politeness between pages
            startIndex += pageSize;
        }
        return all;
    }

    private WfsFeatureCollection fetchPage(int startIndex) {
        int attempt = 0;
        while (true) {
            try {
                return restClient.get()
                        .uri(uriBuilder -> uriBuilder
                                .queryParam("service", "WFS")
                                .queryParam("version", "1.0.0")
                                .queryParam("request", "GetFeature")
                                .queryParam("typeName", "VARJEKOHT")
                                .queryParam("outputFormat", "geojson")
                                .queryParam("maxFeatures", pageSize)
                                .queryParam("startIndex", startIndex)
                                .build())
                        .retrieve()
                        .body(WfsFeatureCollection.class);
            } catch (RestClientException e) {
                if (attempt >= maxRetries) {
                    throw new RegistryUnavailableException(
                            "Päästeamet registry unreachable after " + (maxRetries + 1)
                                    + " attempts (startIndex " + startIndex + ")", e);
                }
                sleep(Duration.ofMillis(BACKOFF_BASE_MILLIS << attempt)); // exponential backoff
                attempt++;
            }
        }
    }

    /** Maps one WFS feature to the neutral DTO; {@code null} when unusable. */
    private RegistryShelterDto toDto(WfsFeature feature) {
        if (feature == null || feature.properties() == null || feature.geometry() == null) {
            return null; // missing payload — skip
        }
        double[] coordinates = feature.geometry().coordinates();
        if (coordinates == null || coordinates.length < 2) {
            return null; // no point geometry — skip
        }
        double[] wgs84 = transformer.toWgs84(coordinates[0], coordinates[1]);
        if (wgs84 == null) {
            return null; // non-finite transform — skip
        }
        WfsProperties p = feature.properties();
        return new RegistryShelterDto(
                p.ID(), p.NIMI(), p.AADRESS(),
                wgs84[1], wgs84[0],           // (lat, lng)
                null, false,                  // WFS publishes no capacity/accessibility
                p.MK(), p.OV(), p.ANDMESEIS(), p.ALLIKAS());
    }

    private static void sleep(Duration duration) {
        if (duration == null || duration.isZero() || duration.isNegative()) {
            return;
        }
        try {
            Thread.sleep(duration.toMillis());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RegistryUnavailableException("Interrupted while waiting between registry calls", e);
        }
    }

    private static String trimTrailingSlash(String url) {
        return url == null ? "" : url.replaceAll("/+$", "");
    }

    /** Minimal GeoJSON FeatureCollection shape (unknown fields ignored). */
    record WfsFeatureCollection(List<WfsFeature> features) {
    }

    record WfsFeature(WfsProperties properties, WfsGeometry geometry) {
    }

    /** Uppercase keys are the WFS layer's published attribute names. */
    record WfsProperties(String ID, String NIMI, String AADRESS, String MK, String OV,
                         String ANDMESEIS, String ALLIKAS) {
    }

    /** Point geometry — {@code coordinates} is {@code [easting, northing]} in EPSG:3301. */
    record WfsGeometry(String type, double[] coordinates) {
    }
}
