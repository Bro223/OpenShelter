package ee.sheltermap.ingestion;

import ee.sheltermap.app.DataImportLog;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withStatus;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * {@link CsvRegistryClient} against a mocked HTTP layer: bulk-CSV parsing,
 * Last-Modified → dataAsOf/sourceVersion stamping, If-Modified-Since + 304
 * (a 304 is NOT a failure), transient-only retries, and the
 * deterministic-4xx/bad-header no-retry rule.
 */
class CsvRegistryClientTest {

    private static final String URL = "http://opendata.test/gis/varjumiskohad.csv";
    private static final String LAST_MODIFIED = "Sun, 06 Sep 2026 21:02:21 GMT";

    private static final RegistryProperties PROPS = new RegistryProperties(
            URL, 100, 1, Duration.ZERO, "csv",
            "https://official.test/avaandmed", true, "0 0 3 * * MON", "Europe/Tallinn");

    /** Fresh mock server + client per test (the server binds to the builder). */
    private record Rig(MockRestServiceServer server, CsvRegistryClient client,
                       InMemoryImportLog importLog) {
    }

    /** In-memory {@link DataImportLog} double — newest row wins. */
    private static final class InMemoryImportLog implements DataImportLog {
        private final List<Row> rows = new ArrayList<>();

        void store(String sourceVersion) {
            rows.add(new Row("PAASETEAMET", sourceVersion, Instant.parse("2026-09-07T00:00:00Z"),
                    0, 0, 0, "OK", null));
        }

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

    private Rig rig(InMemoryImportLog importLog) {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        CsvRegistryClient client = new CsvRegistryClient(
                PROPS, builder, new LEst97Transformer(), importLog);
        return new Rig(server, client, importLog);
    }

    private static InMemoryImportLog freshLog() {
        return new InMemoryImportLog();
    }

    private static String csvBody(String... lines) {
        return String.join("\n", java.util.stream.Stream.concat(
                java.util.stream.Stream.of("id;nimi;aadress;lest_x;lest_y"),
                java.util.stream.Stream.of(lines)).toList()) + "\n";
    }

    private static void expectCsv(MockRestServiceServer server, String body) {
        server.expect(requestTo(URL)).andRespond(
                withSuccess(body, MediaType.APPLICATION_OCTET_STREAM)
                        .header("Last-Modified", LAST_MODIFIED));
    }

    @Test
    void downloadsParsesAndMapsEveryColumn() {
        // Known pair (verified): 542337.43 / 6587993.7 (L-EST97)
        // -> 24.745890 / 59.427685 (WGS84).
        Rig r = rig(freshLog());
        expectCsv(r.server(), csvBody(
                "\"PÕ81166\";\"Vasalemma Kogukonnamaja\";\"Harju maakond, Lääne-Harju vald, Vasalemma alevik, Ranna tee 8\";6567275.63;516551.56",
                "\"LÄ1\";\"Liivalaia jalakäiate tunnel\";\"Harju maakond, Tallinn, Liivalaia tee 1\";542337.43;6587993.7"));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.notModified()).isFalse();
        assertThat(fetch.dataVersion()).isEqualTo(LAST_MODIFIED);
        assertThat(fetch.rows()).hasSize(2);

        // L-EST97 → WGS84 via the shared transformer. Row 1 is in the LIVE
        // PUBLISHER'S ORDER (lest_x = northing 6 567 275.63, lest_y = easting
        // 516 551.56) and must be detected and swapped; row 2 honours its
        // column names and must not be swapped.
        RegistryShelterDto first = fetch.rows().get(0);
        assertThat(first.externalId()).isEqualTo("PÕ81166");
        assertThat(first.name()).isEqualTo("Vasalemma Kogukonnamaja");
        assertThat(first.address())
                .isEqualTo("Harju maakond, Lääne-Harju vald, Vasalemma alevik, Ranna tee 8");
        assertThat(first.county()).isEqualTo("Harju maakond");
        assertThat(first.municipality()).isEqualTo("Lääne-Harju vald");
        assertThat(first.sourceAttribution()).isEqualTo("Päästeamet");
        assertThat(first.dataAsOf()).isEqualTo("2026-09-06"); // Last-Modified day, UTC
        assertThat(first.capacity()).isNull();
        assertThat(first.accessible()).isFalse();
        assertThat(first.latitude()).isCloseTo(59.24350, within(0.001));
        assertThat(first.longitude()).isCloseTo(24.29003, within(0.001));

        // L-EST97 → WGS84 via the shared transformer
        RegistryShelterDto second = fetch.rows().get(1);
        assertThat(second.latitude()).isCloseTo(59.427685, within(0.001));
        assertThat(second.longitude()).isCloseTo(24.745890, within(0.001));
        assertThat(fetch.rejectedExternalIds()).isEmpty();
        r.server().verify();
    }

    /**
     * Live-file defect guard (P0-COORDINATES): the publisher fills the column
     * NAMED {@code lest_x} with NORTING-scale values and {@code lest_y} with
     * EASTING-scale values, so trusting the names places Pärnu Hotell in the
     * English Channel (−0.346°E, 60.511°N). The client must detect the axis
     * order from the values and place it in Pärnu city centre.
     */
    @Test
    void livePublisherRowOrderIsDetectedFromValuesNotNames() {
        Rig r = rig(freshLog());
        expectCsv(r.server(), csvBody(
                "\"LÄ23016\";\"Pärnu Hotell\";\"Pärnu maakond, Pärnu linn, Rüütli tn 44\";6471752.8;529641.52"));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.rows()).hasSize(1);
        RegistryShelterDto parnu = fetch.rows().get(0);
        assertThat(parnu.latitude()).isCloseTo(58.38523, within(0.001));
        assertThat(parnu.longitude()).isCloseTo(24.50676, within(0.001));
        assertThat(fetch.rejectedExternalIds()).isEmpty();
        r.server().verify();
    }

    /**
     * Unplaceable rows are rejected — loudly (per-row warn + run summary),
     * counted (rejectedExternalIds → the import's skipped), and never placed:
     * <ul>
     *   <li>both values in the same scale band → axis order unresolvable;</li>
     *   <li>order resolvable but the point outside the Estonia bbox — the live
     *       ID35606 (Narva border) lands 0.002° east of the bbox edge.</li>
     * </ul>
     */
    @Test
    void unplaceableRowsAreRejectedCountedAndNeverPlaced() {
        Rig r = rig(freshLog());
        expectCsv(r.server(), csvBody(
                // live Pärnu row — places correctly (the only survivor)
                "\"LÄ23016\";\"Pärnu Hotell\";\"Pärnu maakond, Pärnu linn, Rüütli tn 44\";6471752.8;529641.52",
                // both values easting-scale (529641.52 and 661000.0 are real
                // eastings: Pärnu, Tartu) → unresolvable, must not be guessed
                "\"X1\";\"Ambiguus\";\"Pärnu maakond, Pärnu linn\";529641.52;661000.0",
                // live ID35606 — order resolvable, but the point is just
                // outside the eastern bbox edge (28.202°E > 28.2°E)
                "\"ID35606\";\"Bastioni käigud\";\"Ida-Viru maakond, Narva linn, Narva linn, Rüütli tn 59\";6590218.58;738663.74"));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.rows()).hasSize(1);
        assertThat(fetch.rows().get(0).externalId()).isEqualTo("LÄ23016");
        assertThat(fetch.rejectedExternalIds()).containsExactly("X1", "ID35606");
        r.server().verify();
    }

    @Test
    void etagIsTheVersionFallbackWhenNoLastModified() {
        Rig r = rig(freshLog());
        r.server().expect(requestTo(URL)).andRespond(
                withSuccess(csvBody("\"P1\";\"A\";\"Harju maakond, Tallinn\";540000.0;6580000.0"),
                        MediaType.APPLICATION_OCTET_STREAM)
                        .header("ETag", "\"v42\""));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.dataVersion()).isEqualTo("\"v42\"");
        assertThat(fetch.rows()).first().satisfies(dto ->
                assertThat(dto.dataAsOf()).isNull()); // no Last-Modified → no row date
        r.server().verify();
    }

    @Test
    void threeHundredFourMeansUnchangedNotFailure() {
        InMemoryImportLog log = freshLog();
        log.store(LAST_MODIFIED);
        Rig r = rig(log);
        r.server().expect(requestTo(URL))
                .andExpect(header(HttpHeaders.IF_MODIFIED_SINCE, LAST_MODIFIED))
                .andRespond(withStatus(HttpStatus.NOT_MODIFIED));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.notModified()).isTrue();
        assertThat(fetch.rows()).isEmpty();
        assertThat(fetch.dataVersion()).isEqualTo(LAST_MODIFIED);
        r.server().verify();
    }

    @Test
    void sendsIfModifiedSinceFromThePreviousAuditRowOnAChangedFile() {
        InMemoryImportLog log = freshLog();
        log.store(LAST_MODIFIED);
        Rig r = rig(log);
        r.server().expect(requestTo(URL))
                .andExpect(header(HttpHeaders.IF_MODIFIED_SINCE, LAST_MODIFIED))
                .andRespond(withSuccess(csvBody(
                        "\"P1\";\"A\";\"Harju maakond, Tallinn\";540000.0;6580000.0"),
                        MediaType.APPLICATION_OCTET_STREAM)
                        .header("Last-Modified", LAST_MODIFIED));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.notModified()).isFalse();
        assertThat(fetch.rows()).hasSize(1);
        r.server().verify();
    }

    @Test
    void clientErrorIsNotRetried() {
        Rig r = rig(freshLog());
        r.server().expect(requestTo(URL)).andRespond(withBadRequest());

        assertThatThrownBy(() -> r.client().fetch())
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("failed deterministically, no retry");
        r.server().verify(); // exactly one request — no retry on 4xx
    }

    @Test
    void transientServerErrorIsRetriedThenSucceeds() {
        Rig r = rig(freshLog());
        r.server().expect(requestTo(URL)).andRespond(withServerError());
        expectCsv(r.server(), csvBody("\"P1\";\"A\";\"Harju maakond, Tallinn\";540000.0;6580000.0"));

        RegistryFetch fetch = r.client().fetch();

        assertThat(fetch.rows()).hasSize(1);
        r.server().verify(); // one 500 + one success
    }

    @Test
    void persistentServerErrorIsUnavailable() {
        Rig r = rig(freshLog());
        r.server().expect(requestTo(URL)).andRespond(withServerError());
        r.server().expect(requestTo(URL)).andRespond(withServerError());

        assertThatThrownBy(() -> r.client().fetch())
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("unreachable");
        r.server().verify(); // initial attempt + 1 retry (maxRetries=1)
    }

    @Test
    void wrongHeaderFailsDeterministicallyWithNoRetry() {
        Rig r = rig(freshLog());
        r.server().expect(requestTo(URL)).andRespond(withSuccess(
                "id;name;address;x;y\n\"P1\";\"A\";\"a\";1.0;2.0\n",
                MediaType.APPLICATION_OCTET_STREAM));

        assertThatThrownBy(() -> r.client().fetch())
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("rejected");
        r.server().verify(); // exactly one request — the bad header is not transient
    }

    @Test
    void fetchAllDelegatesToFetch() {
        Rig r = rig(freshLog());
        expectCsv(r.server(), csvBody("\"P1\";\"A\";\"Harju maakond, Tallinn\";540000.0;6580000.0"));

        assertThat(r.client().fetchAll()).hasSize(1);
        r.server().verify();
    }
}
