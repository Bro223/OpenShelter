package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts the first coordinate pair from a map URL — the backend mirror
 * of the frontend {@code shared/location-input.ts} pattern list
 * (shelter-location-input, design decision 4). Both parsers are unit
 * tested against the same fixture table ({@code MapsUrlCoordinatesTest}
 * and the frontend spec) so a pinned location can never drift between
 * the two sides.
 *
 * <p>Patterns are tried in a deterministic order: known query params
 * ({@code q|ll|daddr|saddr=lat,lng} — Google, Apple {@code maps.apple.com}
 * {@code ?ll=}, Bing {@code bing.com/maps?q=}), then the Google share
 * path {@code !3d…!4d…}, then {@code /@lat,lng} (with an optional
 * {@code ,zoomz} suffix), then the generic first decimal pair anywhere
 * in the URL. The gate is {@link GeoPoint#inEstonia}: (a,b) is used when
 * inside the box, otherwise (b,a) (a lng/lat paste), otherwise the URL
 * carries no usable pair.
 */
public final class MapsUrlCoordinates {

    /** Query params that may carry a {@code lat,lng} value. */
    private static final Pattern PARAM_PAIR = Pattern.compile(
            "[?&](?:daddr|saddr|q|ll)=([^&#\\s]+)", Pattern.CASE_INSENSITIVE);

    /** Google share path: {@code !3d59.437!4d24.753}. */
    private static final Pattern EXCLAMATION_PAIR = Pattern.compile(
            "!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)");

    /** Google place path: {@code /@59.437,24.753} or {@code /@59.437,24.753,17z}. */
    private static final Pattern AT_PAIR = Pattern.compile(
            "/@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)(?:,\\d+(?:\\.\\d+)?z)?");

    /** Fallback: the first decimal {@code a,b} pair anywhere in the URL. */
    private static final Pattern GENERIC_PAIR = Pattern.compile(
            "(-?\\d{1,3}(?:\\.\\d+)?),\\s*(-?\\d{1,3}(?:\\.\\d+)?)");

    /** A plain {@code lat,lng} decimal pair (a query param value). */
    private static final Pattern DECIMAL_PAIR = Pattern.compile(
            "^(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)$");

    private MapsUrlCoordinates() {
    }

    /**
     * @param url a map URL (any scheme)
     * @return the first extractable pair — in the order that falls inside
     *         the Estonia box (auto-swapped when the URL carried
     *         {@code lng,lat}) — or {@code null} when no pair can be
     *         extracted or neither order is inside the box
     */
    public static GeoPoint extract(String url) {
        if (url == null) {
            return null;
        }
        double[] pair = firstPair(url);
        if (pair == null) {
            return null;
        }
        if (GeoPoint.inEstonia(pair[0], pair[1])) {
            return new GeoPoint(pair[0], pair[1]);
        }
        if (GeoPoint.inEstonia(pair[1], pair[0])) {
            return new GeoPoint(pair[1], pair[0]);
        }
        return null;
    }

    /** The first pair in pattern order, or null when nothing parses. */
    private static double[] firstPair(String url) {
        // 1. known params — the first value that parses as a pair wins
        //    (a place-name q= falls through to ll=/daddr=/saddr=)
        Matcher params = PARAM_PAIR.matcher(url);
        while (params.find()) {
            double[] pair = decimalPair(params.group(1));
            if (pair != null) {
                return pair;
            }
        }
        Matcher exclamation = EXCLAMATION_PAIR.matcher(url);
        if (exclamation.find()) {
            return decimalPair(exclamation.group(1), exclamation.group(2));
        }
        Matcher at = AT_PAIR.matcher(url);
        if (at.find()) {
            return decimalPair(at.group(1), at.group(2));
        }
        Matcher generic = GENERIC_PAIR.matcher(url);
        if (generic.find()) {
            return decimalPair(generic.group(1), generic.group(2));
        }
        return null;
    }

    /** Parses {@code a,b} into a {@code double[2]} or null (incl. out-of-±180 values). */
    private static double[] decimalPair(String value) {
        Matcher m = DECIMAL_PAIR.matcher(value);
        return m.matches() ? decimalPair(m.group(1), m.group(2)) : null;
    }

    private static double[] decimalPair(String a, String b) {
        double lat, lng;
        try {
            lat = Double.parseDouble(a);
            lng = Double.parseDouble(b);
        } catch (NumberFormatException e) {
            return null;
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return null; // not a coordinate pair at all
        }
        return new double[]{lat, lng};
    }
}
