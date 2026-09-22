package ee.sheltermap.ingestion;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * L-EST97 axis-order detection from raw CSV values, using REAL values from
 * the live Päästeamet file (measured 2026, 303 rows) and the project's
 * verified reference pairs.
 */
class Lest97AxisOrderTest {

    @Test
    void livePublisherRowIsDetectedAsTransposed() {
        // Pärnu Hotell (LÄ23016), verbatim live row:
        //   "lest_x" = 6471752.8 (NORTING-scale), "lest_y" = 529641.52 (EASTING-scale)
        Lest97AxisOrder.Resolved resolved = Lest97AxisOrder.resolve(6471752.8, 529641.52);

        assertThat(resolved).isNotNull();
        assertThat(resolved.easting()).isEqualTo(529641.52);
        assertThat(resolved.northing()).isEqualTo(6471752.8);
        assertThat(resolved.transposed()).isTrue();
    }

    @Test
    void correctlyOrderedRowPassesThroughUnswapped() {
        // Liivalaia tunnel reference pair (LEst97TransformerTest): the file
        // that honours its column names must NOT be swapped.
        Lest97AxisOrder.Resolved resolved = Lest97AxisOrder.resolve(542337.43, 6587993.7);

        assertThat(resolved).isNotNull();
        assertThat(resolved.easting()).isEqualTo(542337.43);
        assertThat(resolved.northing()).isEqualTo(6587993.7);
        assertThat(resolved.transposed()).isFalse();
    }

    @Test
    void bothValuesInEastingBandAreUnresolvable() {
        // two real eastings (Pärnu 529641.52, Tartu 661000.0) — cannot form a point
        assertThat(Lest97AxisOrder.resolve(529641.52, 661000.0)).isNull();
    }

    @Test
    void bothValuesInNorthingBandAreUnresolvable() {
        // two real northings (Tallinn 6587993.7, Tartu 6473000.0) — cannot form a point
        assertThat(Lest97AxisOrder.resolve(6587993.7, 6473000.0)).isNull();
    }

    @Test
    void valuesOutsideBothBandsAreUnresolvable() {
        // neither value is L-EST97-scale at all — reject, do not guess
        assertThat(Lest97AxisOrder.resolve(1234.0, 5678.0)).isNull();
        assertThat(Lest97AxisOrder.resolve(6471752.8, 5678.0)).isNull();
    }

    @Test
    void bandsCoverEveryValueInTheLiveFile() {
        // measured live ranges: lest_x 6 388 433.84 – 6 606 587.05 (northing),
        // lest_y 384 654.52 – 738 663.74 (easting) — the extreme pair of each
        // measured corner must still resolve.
        assertThat(Lest97AxisOrder.resolve(6606587.05, 384654.52)).isNotNull();
        assertThat(Lest97AxisOrder.resolve(6388433.84, 738663.74)).isNotNull();
        assertThat(Lest97AxisOrder.resolve(542337.43, 6587993.7)).isNotNull(); // canonical corners
    }
}
