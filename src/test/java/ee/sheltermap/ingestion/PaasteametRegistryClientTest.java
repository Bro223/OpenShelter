package ee.sheltermap.ingestion;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withBadRequest;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

/**
 * {@link PaasteametRegistryClient} against a mocked HTTP layer
 * (MockRestServiceServer): WFS pagination via startIndex, retry/backoff,
 * politeness, the registry-down failure mode, null-geometry skipping, and the
 * EPSG:3301 → WGS84 coordinate transform.
 */
class PaasteametRegistryClientTest {

    private static final String BASE = "http://registry.test";

    private static final RegistryProperties PROPS = new RegistryProperties(
            BASE, 2, 1, Duration.ZERO, "paasteamet",
            "https://official.test/avaandmed", true, "0 0 3 * * MON", "Europe/Tallinn");

    private final RestClient.Builder builder = RestClient.builder();
    private final MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
    private final PaasteametRegistryClient client =
            new PaasteametRegistryClient(PROPS, builder, new LEst97Transformer());

    /** The exact WFS URL the client must produce for a given startIndex. */
    private static String wfsUrl(int startIndex) {
        return BASE + "?service=WFS&version=1.0.0&request=GetFeature&typeName=VARJEKOHT"
                + "&outputFormat=geojson&maxFeatures=2&startIndex=" + startIndex;
    }

    private static String wfsPage(String... features) {
        return "{\"type\":\"FeatureCollection\","
                + "\"crs\":{\"type\":\"name\",\"properties\":{\"name\":\"urn:ogc:def:crs:EPSG::3301\"}},"
                + "\"features\":[" + String.join(",", features) + "]}";
    }

    private static String feature(String id, String nimi, double x, double y) {
        return "{\"type\":\"Feature\",\"id\":\"VARJEKOHT." + id + "\","
                + "\"properties\":{\"ID\":\"" + id + "\",\"NIMI\":\"" + nimi
                + "\",\"AADRESS\":\"addr " + id + "\",\"MK\":\"Harju maakond\",\"OV\":\"Tallinn\","
                + "\"ANDMESEIS\":\"02.07.2026\",\"ALLIKAS\":\"SMIT. Päästeameti avaandmed\"},"
                + "\"geometry\":{\"type\":\"Point\",\"coordinates\":[" + x + "," + y + "]}}";
    }

    @Test
    void paginatesWithStartIndexUntilAShortPage() {
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess(wfsPage(feature("PK-1", "A", 540000, 6587000),
                        feature("PK-2", "B", 541000, 6588000)), MediaType.APPLICATION_JSON));
        server.expect(requestTo(wfsUrl(2)))
                .andRespond(withSuccess(wfsPage(feature("PK-3", "C", 542000, 6589000),
                        feature("PK-4", "D", 543000, 6590000)), MediaType.APPLICATION_JSON));
        server.expect(requestTo(wfsUrl(4)))
                .andRespond(withSuccess(wfsPage(), MediaType.APPLICATION_JSON));

        List<RegistryShelterDto> result = client.fetchAll();

        assertThat(result).hasSize(4);
        assertThat(result.get(0).externalId()).isEqualTo("PK-1");
        assertThat(result.get(3).externalId()).isEqualTo("PK-4");
        server.verify(); // 3 sequential page requests — politeness between them
    }

    @Test
    void emptyFirstPageStopsTheWalk() {
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess(wfsPage(), MediaType.APPLICATION_JSON));

        assertThat(client.fetchAll()).isEmpty();
        server.verify();
    }

    @Test
    void transientServerErrorIsRetriedWithBackoffThenSucceeds() {
        server.expect(requestTo(wfsUrl(0))).andRespond(withServerError());
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess(wfsPage(feature("PK-1", "A", 540000, 6587000),
                        feature("PK-2", "B", 541000, 6588000)), MediaType.APPLICATION_JSON));
        server.expect(requestTo(wfsUrl(2)))
                .andRespond(withSuccess(wfsPage(), MediaType.APPLICATION_JSON));

        List<RegistryShelterDto> result = client.fetchAll();

        assertThat(result).hasSize(2);
        server.verify(); // one failure + one success, same page
    }

    @Test
    void persistentFailureThrowsRegistryUnavailable() {
        server.expect(requestTo(wfsUrl(0))).andRespond(withServerError());
        server.expect(requestTo(wfsUrl(0))).andRespond(withServerError());

        assertThatThrownBy(client::fetchAll)
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("unreachable");
        server.verify(); // initial attempt + 1 retry (maxRetries=1)
    }

    @Test
    void malformedJsonIsReportedAsRegistryUnavailable() {
        // A 200 with an unparseable body is a DETERMINISTIC failure:
        // retrying cannot fix it, so the client must fail fast with exactly
        // ONE request — no retry, no retry budget burned.
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess("not json at all", MediaType.APPLICATION_JSON));

        assertThatThrownBy(client::fetchAll)
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("failed deterministically, no retry");
        server.verify(); // exactly one request — the fail-fast branch
    }

    @Test
    void clientErrorIsNotRetried() {
        // A 4xx (bad request, auth, gone…) is equally deterministic: one
        // request, no retry, reported as registry-unavailable with the
        // no-retry message — pinning the non-retry branch of the
        // "retry ONLY ResourceAccessException + 5xx" rule.
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withBadRequest());

        assertThatThrownBy(client::fetchAll)
                .isInstanceOf(RegistryUnavailableException.class)
                .hasMessageContaining("failed deterministically, no retry");
        server.verify(); // exactly one request — no retry on 4xx
    }

    @Test
    void featuresWithoutGeometryAreSkipped() {
        String noGeometry = "{\"type\":\"Feature\",\"properties\":{\"ID\":\"PK-NULL\",\"NIMI\":\"No geom\","
                + "\"AADRESS\":\"x\",\"MK\":\"Harju maakond\",\"OV\":\"Tallinn\","
                + "\"ANDMESEIS\":\"02.07.2026\",\"ALLIKAS\":\"SMIT\"},\"geometry\":null}";
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess(wfsPage(noGeometry, feature("PK-1", "A", 540000, 6587000)),
                        MediaType.APPLICATION_JSON));
        server.expect(requestTo(wfsUrl(2)))
                .andRespond(withSuccess(wfsPage(), MediaType.APPLICATION_JSON));

        List<RegistryShelterDto> result = client.fetchAll();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).externalId()).isEqualTo("PK-1");
        server.verify();
    }

    @Test
    void pageCapBoundaryAllowsExactlyMaxPages() {
        // The guard is checked BEFORE the fetch, so the walk may serve
        // exactly MAX_PAGES pages (0 .. MAX_PAGES-1) — the MAX_PAGES-th
        // offset must be rejected, the one before it must not.
        int pageSize = 2;
        int maxPages = 10_000;
        assertThat(PaasteametRegistryClient.hasReachedPageCap(0, pageSize)).isFalse();
        assertThat(PaasteametRegistryClient.hasReachedPageCap((maxPages - 1) * pageSize, pageSize))
                .isFalse();
        assertThat(PaasteametRegistryClient.hasReachedPageCap(maxPages * pageSize, pageSize))
                .isTrue();
        assertThat(PaasteametRegistryClient.hasReachedPageCap(maxPages * pageSize + pageSize, pageSize))
                .isTrue();
    }

    @Test
    void coordinatesAreTransformedFromLEst97ToWgs84AndAllFieldsMapped() {
        // Known pair (verified): Liivalaia tunnel 542337.43, 6587993.7 (L-EST97)
        // -> 24.745890, 59.427685 (WGS84). One feature < pageSize=2 -> single page.
        server.expect(requestTo(wfsUrl(0)))
                .andRespond(withSuccess(wfsPage(feature("PÕ15527", "Liivalaia jalakäiate tunnel",
                        542337.43, 6587993.7)), MediaType.APPLICATION_JSON));

        List<RegistryShelterDto> result = client.fetchAll();

        assertThat(result).hasSize(1);
        RegistryShelterDto dto = result.get(0);
        assertThat(dto.externalId()).isEqualTo("PÕ15527");
        assertThat(dto.name()).isEqualTo("Liivalaia jalakäiate tunnel");
        assertThat(dto.address()).isEqualTo("addr PÕ15527");
        assertThat(dto.latitude()).isCloseTo(59.427685, within(0.001));
        assertThat(dto.longitude()).isCloseTo(24.745890, within(0.001));
        assertThat(dto.county()).isEqualTo("Harju maakond");
        assertThat(dto.municipality()).isEqualTo("Tallinn");
        assertThat(dto.dataAsOf()).isEqualTo("02.07.2026");
        assertThat(dto.sourceAttribution()).isEqualTo("SMIT. Päästeameti avaandmed");
        server.verify();
    }
}
