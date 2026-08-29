package ee.sheltermap.ingestion;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

/**
 * EPSG:3301 (L-EST97) → EPSG:4326 (WGS84) transform, verified against the
 * known reference pair for the Liivalaia tunnel in Tallinn.
 */
class LEst97TransformerTest {

    private final LEst97Transformer transformer = new LEst97Transformer();

    @Test
    void knownTallinnPointTransformsToExpectedWgs84() {
        // [easting, northing] in meters -> [lng, lat] in degrees
        double[] wgs84 = transformer.toWgs84(542337.43, 6587993.7);

        assertThat(wgs84).isNotNull();
        assertThat(wgs84[0]).isCloseTo(24.745890, within(0.001)); // longitude
        assertThat(wgs84[1]).isCloseTo(59.427685, within(0.001)); // latitude
    }

    @Test
    void transformOfOtherEstonianPointsStaysInTheCountryBbox() {
        // a point in southern Estonia (Tartu area, L-EST97 meters)
        double[] tartu = transformer.toWgs84(661000, 6473000);

        assertThat(tartu).isNotNull();
        assertThat(tartu[1]).isBetween(57.5, 59.7);   // lat
        assertThat(tartu[0]).isBetween(21.5, 28.2);   // lng
    }
}
