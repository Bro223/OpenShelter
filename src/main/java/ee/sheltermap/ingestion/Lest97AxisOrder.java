package ee.sheltermap.ingestion;

/**
 * Resolves which L-EST97 axis (easting or northing) each raw coordinate
 * value from the Päästeamet CSV actually carries.
 *
 * <p><b>The publisher's field names do not describe the contents.</b>
 * Measured against the live file ({@code opendata.smit.ee/gis/varjumiskohad.csv},
 * 303 rows): the column named {@code lest_x} carries <em>northing</em>-scale
 * values (6 388 433.84 – 6 606 587.05 m) and the column named {@code lest_y}
 * carries <em>easting</em>-scale values (384 654.52 – 738 663.74 m). Trusting
 * the names feeds the transformer the wrong axis and places every shelter
 * outside the country (0 of 303 rows inside the Estonia bbox; Pärnu Hotell
 * lands in the English Channel at −0.346°E, 60.511°N instead of
 * 58.385°N, 24.507°E in Pärnu city centre).
 *
 * <p>The axis order is therefore detected from the <em>values</em> (scale
 * bands), not from the column names. In L-EST97 over Estonia, eastings sit in
 * ~350–750 km and northings in ~6.38–6.64 M m — the bands are ~4× apart and
 * never overlap, so a row whose two values fall in different bands is
 * unambiguous. Detecting from values (rather than hard-swapping for the live
 * file) also keeps a future file that <em>does</em> honour its column names
 * ({@code lest_x} = easting) placing correctly.
 *
 * <p>A row is <b>unresolvable</b> — and must be rejected, never guessed — when
 * both values fall in the same band (two eastings or two northings cannot
 * form a point) or when a value falls outside both bands. A guessed pin on a
 * public-safety map is worse than a counted rejection.
 */
public final class Lest97AxisOrder {

    /** Plausible L-EST97 easting over Estonia (m); measured live: 384 654 – 738 664. */
    public static final double EASTING_MIN = 300_000.0;
    public static final double EASTING_MAX = 800_000.0;
    /** Plausible L-EST97 northing over Estonia (m); measured live: 6.388 – 6.607 M. */
    public static final double NORTHING_MIN = 6_000_000.0;
    public static final double NORTHING_MAX = 7_000_000.0;

    /** One resolved (easting, northing) pair. */
    public record Resolved(double easting, double northing, boolean transposed) {
    }

    private Lest97AxisOrder() {
    }

    /**
     * Resolves the axis of one raw CSV row.
     *
     * @param lestX the value in the column <em>named</em> {@code lest_x}
     * @param lestY the value in the column <em>named</em> {@code lest_y}
     * @return the resolved axis pair, or {@code null} when the values are
     *         ambiguous (both in the same band, or a value outside both bands)
     */
    public static Resolved resolve(double lestX, double lestY) {
        if (isEasting(lestX) && isNorthing(lestY)) {
            return new Resolved(lestX, lestY, false); // names honoured
        }
        if (isNorthing(lestX) && isEasting(lestY)) {
            return new Resolved(lestY, lestX, true);  // the live publisher's order
        }
        return null;
    }

    private static boolean isEasting(double value) {
        return value >= EASTING_MIN && value <= EASTING_MAX;
    }

    private static boolean isNorthing(double value) {
        return value >= NORTHING_MIN && value <= NORTHING_MAX;
    }
}
