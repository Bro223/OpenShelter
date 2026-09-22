package ee.sheltermap.ingestion;

import ee.sheltermap.app.DataImportLog;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.ShelterSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.nio.charset.StandardCharsets;

/**
 * Bulk-CSV client for the official Päästeamet shelter dataset
 * (official-dataset-csv).
 *
 * <p>The old Maa-amet WFS layer ({@code 1pdl2oh}) no longer publishes a
 * service ("Ei ole saadaval" — every WFS request 404s), so the official
 * source is the open-data CSV at {@code https://opendata.smit.ee/gis/varjumiskohad.csv}
 * (semicolon-separated, header {@code id;nimi;aadress;lest_x;lest_y},
 * EPSG:3301 coordinates — the existing {@link LEst97Transformer} applies
 * unchanged). One bulk download replaces the WFS page walk; the politeness
 * delay, transient-only retries with exponential backoff, and the
 * deterministic-4xx-no-retry rule carry over.
 *
 * <p>Versioning: the dataset publishes no version field, so the upstream
 * HTTP {@code Last-Modified} (fallback: {@code ETag}) stamps every row's
 * {@code dataAsOf} and becomes the run's {@code sourceVersion}. The
 * previous run's stamp is sent back as {@code If-Modified-Since}; a 304
 * means "the local copy is current" — the import applies nothing (in
 * particular no delist over an empty set) and the run is NOT a failure.
 */
@Service
@ConditionalOnProperty(name = "app.registry.client", havingValue = "csv")
public class CsvRegistryClient implements ShelterRegistryClient {

    private static final Logger log = LoggerFactory.getLogger(CsvRegistryClient.class);

    /** The publisher, as shown on the open-data page and on the UI. */
    public static final String SOURCE_NAME = "Päästeamet";

    /** Backoff base: 100 ms, doubling per attempt (100, 200, 400 …). */
    private static final long BACKOFF_BASE_MILLIS = 100;
    private static final DateTimeFormatter DATA_AS_OF = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final String csvUrl;
    private final int maxRetries;
    private final RestClient restClient;
    private final LEst97Transformer transformer;
    private final DataImportLog importLog;

    public CsvRegistryClient(RegistryProperties properties,
                             RestClient.Builder builder,
                             LEst97Transformer transformer,
                             DataImportLog importLog) {
        this.csvUrl = properties.baseUrl();
        this.maxRetries = properties.maxRetries();
        this.transformer = transformer;
        this.importLog = importLog;
        // User-Agent identifies the client (politeness — see SDI Ch 9).
        this.restClient = builder.defaultHeader("User-Agent",
                "OpenShelter/0.1 (+https://github.com/Bro223/OpenShelter)").build();
    }

    @Override
    public ShelterSource source() {
        return ShelterSource.PAASETEAMET;
    }

    @Override
    public List<RegistryShelterDto> fetchAll() {
        return fetch().rows();
    }

    @Override
    public RegistryFetch fetch() {
        // If-Modified-Since: the previous run's version stamp (data_imports).
        // Only an HTTP-date stamp is reusable as If-Modified-Since; an ETag
        // stamp just means "we cannot ask for a 304 this run".
        String lastVersion = importLog == null ? null
                : importLog.findLatestBySource(source().name())
                        .map(DataImportLog.Row::sourceVersion)
                        .orElse(null);
        String ifModifiedSince = parseHttpDate(lastVersion);

        ResponseEntity<byte[]> response = download(ifModifiedSince);
        if (response.getStatusCode().value() == 304) {
            log.info("Registry CSV unchanged since {} — no import apply this run", lastVersion);
            return new RegistryFetch(List.of(), lastVersion, true, List.of());
        }

        String version = versionOf(response.getHeaders());
        String dataAsOf = dataAsOfOf(response.getHeaders());

        RegistryCsvParser.Parsed parsed;
        try {
            // The file is UTF-8 (Estonian diacritics) but is served as
            // application/octet-stream with no charset — decode explicitly.
            String body = response.getBody() == null ? null
                    : new String(response.getBody(), StandardCharsets.UTF_8);
            parsed = RegistryCsvParser.parse(body);
        } catch (IllegalArgumentException e) {
            // A wrong header means the URL no longer serves the dataset —
            // deterministic, retrying cannot help.
            throw new RegistryUnavailableException(
                    "Registry CSV rejected: " + e.getMessage(), e);
        }
        if (parsed.dropped() > 0) {
            // Not visible in the import's skipped count (the parser never
            // saw these rows) — the log is the only record of the loss.
            log.warn("Registry CSV returned {} unusable row(s) this run "
                    + "(blank id/nimi/aadress or non-numeric coordinates) — dropped",
                    parsed.dropped());
        }

        List<RegistryShelterDto> dtos = new ArrayList<>(parsed.rows().size());
        List<String> rejected = new ArrayList<>();
        for (RegistryCsvParser.Row row : parsed.rows()) {
            RegistryShelterDto dto = toDto(row, dataAsOf);
            if (dto != null) {
                dtos.add(dto);
            } else {
                rejected.add(row.externalId());
            }
        }
        if (!rejected.isEmpty()) {
            // Loud by design (public-safety map): every unplaceable row was
            // also logged individually in toDto; the import counts these as
            // skipped and retains (never delists) the stored rows.
            log.warn("Registry CSV run: {} of {} row(s) could not be placed and were "
                    + "rejected (axis order unresolvable, transform non-finite, or "
                    + "outside the Estonia bbox) — counted as skipped; first ids: {}",
                    rejected.size(), parsed.rows().size(), rejected.stream().limit(5).toList());
        }
        return new RegistryFetch(dtos, version, false, rejected);
    }

    private ResponseEntity<byte[]> download(String ifModifiedSince) {
        int attempt = 0;
        while (true) {
            try {
                var spec = restClient.get().uri(csvUrl);
                if (ifModifiedSince != null) {
                    spec = spec.header(HttpHeaders.IF_MODIFIED_SINCE, ifModifiedSince);
                }
                return spec.retrieve().toEntity(byte[].class);
            } catch (RestClientException e) {
                // Retry ONLY transient failures (network problems, 5xx). A
                // deterministic 4xx (URL gone, forbidden…) never succeeds on
                // retry — fail fast instead of burning the retry budget.
                if (!isTransient(e) || attempt >= maxRetries) {
                    throw new RegistryUnavailableException(
                            isTransient(e)
                                    ? "Registry CSV unreachable after " + (maxRetries + 1) + " attempts"
                                    : "Registry CSV failed deterministically, no retry: " + e.getMessage(),
                            e);
                }
                sleep(Duration.ofMillis(BACKOFF_BASE_MILLIS << attempt));
                attempt++;
            }
        }
    }

    /** Transient = worth a retry: network failures and 5xx. */
    private static boolean isTransient(RestClientException e) {
        if (e instanceof ResourceAccessException) {
            return true;
        }
        if (e instanceof RestClientResponseException response) {
            return response.getStatusCode().is5xxServerError();
        }
        return false;
    }

    /**
     * One CSV row → the neutral DTO, or {@code null} when the row cannot be
     * placed (the caller logs it loudly and counts it):
     * <ul>
     *   <li>the axis order is unresolvable — see {@link Lest97AxisOrder}: the
     *       live publisher fills {@code lest_x} with northings and
     *       {@code lest_y} with eastings despite the names, and a row whose
     *       two values fall in the same scale band cannot be guessed;</li>
     *   <li>the transform yields a non-finite point; or</li>
     *   <li>the placed point is outside the Estonia bbox — the same check as
     *       {@link GeoPoint#inEstonia} downstream in the parser, applied here
     *       too so the rejection is counted at the boundary that produced it
     *       (the parser's guard stays as the backstop for every source).</li>
     * </ul>
     */
    private RegistryShelterDto toDto(RegistryCsvParser.Row row, String dataAsOf) {
        Lest97AxisOrder.Resolved axes = Lest97AxisOrder.resolve(row.lestX(), row.lestY());
        if (axes == null) {
            log.warn("Registry CSV row {} ({}): L-EST97 axis order unresolvable "
                    + "(lest_x={}, lest_y={}) — rejected, not placed",
                    row.externalId(), row.name(), row.lestX(), row.lestY());
            return null;
        }
        double[] wgs84 = transformer.toWgs84(axes.easting(), axes.northing());
        if (wgs84 == null) {
            log.warn("Registry CSV row {} ({}): WGS84 transform non-finite "
                    + "(lest_x={}, lest_y={}) — rejected, not placed",
                    row.externalId(), row.name(), row.lestX(), row.lestY());
            return null;
        }
        double latitude = wgs84[1];
        double longitude = wgs84[0];
        if (!GeoPoint.inEstonia(latitude, longitude)) {
            log.warn("Registry CSV row {} ({}): placed at ({}, {}) outside the Estonia "
                    + "bbox (lest_x={}, lest_y={}) — rejected, not placed",
                    row.externalId(), row.name(), latitude, longitude,
                    row.lestX(), row.lestY());
            return null;
        }
        String[] segments = splitAddress(row.address());
        return new RegistryShelterDto(
                row.externalId(), row.name(), row.address(),
                latitude, longitude,
                null, false,          // the CSV publishes no capacity/accessibility
                segments[0], segments[1],
                dataAsOf, SOURCE_NAME);
    }

    /**
     * {@code aadress} = {@code <maakond>, <vald/linn>[, <asula>, <aadress>]}:
     * segment 1 is the county, segment 2 the municipality (the WFS-era
     * MK/OV attributes have no CSV equivalent).
     */
    private static String[] splitAddress(String address) {
        String[] parts = address.split(",");
        String county = parts.length >= 1 ? parts[0].trim() : null;
        String municipality = parts.length >= 2 ? parts[1].trim() : null;
        return new String[]{county, municipality};
    }

    /** The upstream stamp: Last-Modified as published, else the ETag. */
    private static String versionOf(HttpHeaders headers) {
        String lastModified = headers.getFirst(HttpHeaders.LAST_MODIFIED);
        if (lastModified != null && !lastModified.isBlank()) {
            return lastModified.trim();
        }
        String etag = headers.getETag(); // Spring 6: String (quoted form kept)
        return etag;
    }

    /** Per-row data date: the Last-Modified day (UTC), or null. A 0 epoch
     *  is treated as absent (some HTTP stacks default it). */
    private static String dataAsOfOf(HttpHeaders headers) {
        Long lastModified = headers.getLastModified();
        if (lastModified == null || lastModified <= 0) {
            return null;
        }
        return Instant.ofEpochMilli(lastModified).atZone(ZoneOffset.UTC).toLocalDate().format(DATA_AS_OF);
    }

    /** An HTTP-date string (Last-Modified), or null when it is not one. */
    private static String parseHttpDate(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            DateTimeFormatter.RFC_1123_DATE_TIME.parse(raw, Instant::from);
            return raw;
        } catch (RuntimeException e) {
            return null;
        }
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
}
