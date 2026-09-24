package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Extracts the first coordinate pair from a map URL — the backend mirror
 * of the frontend {@code shared/location-input.ts} pattern list. Both
 * parsers are unit
 * tested against the same fixture table ({@code MapsUrlCoordinatesTest}
 * and the frontend spec) so a pinned location can never drift between
 * the two sides.
 *
 * <p>Patterns are tried in a deterministic order: known query params
 * ({@code q|ll|daddr|saddr=lat,lng} — Google, Apple {@code maps.apple.com}
 * {@code ?ll=}, Bing {@code bing.com/maps?q=}), then the Google share
 * path {@code !3d…!4d…}, then {@code /@lat,lng} (with an optional
 * {@code ,zoomz} suffix), then the Google search path
 * {@code /search/lat(+|,)lng} (the current {@code maps.app.goo.gl}
 * redirect target), then the generic first decimal pair anywhere
 * in the URL. A coordinate-carrying segment written with an Estonian
 * decimal comma ({@code 58,25} — a comma decimal with no point decimal in
 * the segment) carries NO pair (FE parity with the frontend
 * {@code shared/location-input.ts} guard — never guess/convert; a naive
 * parse would pin (58, 25), inside the box, about 27 km off). The gate is
 * {@link GeoPoint#inEstonia}: (a,b) is used when
 * inside the box, otherwise (b,a) (a lng/lat paste), otherwise the URL
 * carries no usable pair.
 */
public final class MapsUrlCoordinates {

    /** Query params that may carry a {@code lat,lng} value.
     *  NOTE: query values are NOT URL-decoded — a percent-encoded comma
     *  ({@code ?ll=59.437%2C24.753}) does not parse as a pair (the raw
     *  value never contains a literal comma). Pinned by
     *  {@code MapsUrlCoordinatesTest}. */
    private static final Pattern PARAM_PAIR = Pattern.compile(
            "[?&](?:daddr|saddr|q|ll)=([^&#\\s]+)", Pattern.CASE_INSENSITIVE);

    /** Google share path: {@code !3d59.437!4d24.753}. */
    private static final Pattern EXCLAMATION_PAIR = Pattern.compile(
            "!3d(-?\\d+(?:\\.\\d+)?)!4d(-?\\d+(?:\\.\\d+)?)");

    /** Google place path: {@code /@59.437,24.753} or {@code /@59.437,24.753,17z}. */
    private static final Pattern AT_PAIR = Pattern.compile(
            "/@(-?\\d+(?:\\.\\d+)?),(-?\\d+(?:\\.\\d+)?)(?:,\\d+(?:\\.\\d+)?z)?");

    /** Google search path (the current {@code maps.app.goo.gl} redirect
     *  target): {@code /search/58.999669,+27.289732} — comma and/or plus
     *  (a URL-encoded space) as the separator — or the comma form
     *  {@code /search/59.437,24.753}. Only the raw path forms are matched;
     *  a percent-encoded separator is not decoded (like the query values). */
    private static final Pattern SEARCH_PAIR = Pattern.compile(
            "/search/(-?\\d+(?:\\.\\d+)?)[,\\s+]+(-?\\d+(?:\\.\\d+)?)");

    /** Fallback: the first decimal {@code a,b} / {@code a+b} pair anywhere
     *  in the URL — comma, plus (URL-encoded space) or whitespace as the
     *  separator. */
    private static final Pattern GENERIC_PAIR = Pattern.compile(
            "(-?\\d{1,3}(?:\\.\\d+)?)[,\\s+]+(-?\\d{1,3}(?:\\.\\d+)?)");

    /** A plain {@code lat,lng} decimal pair (a query param value). */
    private static final Pattern DECIMAL_PAIR = Pattern.compile(
            "^(-?\\d+(?:\\.\\d+)?)\\s*,\\s*(-?\\d+(?:\\.\\d+)?)$");

    /** A comma used as the DECIMAL mark (the Estonian locale writes 58,25). */
    private static final Pattern DECIMAL_COMMA = Pattern.compile("\\d+,\\d+");

    /** A point used as the decimal mark (58.25) — or a host/version like 212.50 / v1.2. */
    private static final Pattern POINT_DECIMAL = Pattern.compile("\\d+\\.\\d+");

    /** scheme + authority — never carries coordinates (the generic fallback's
     *  guard applies to the body, so host dots can't mask a comma-decimal). */
    private static final Pattern URL_HEAD = Pattern.compile("^[A-Za-z][A-Za-z0-9+.-]*://[^/?#]*");

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

    /**
     * Estonian decimal-comma guard (FE parity with the frontend
     * {@code shared/location-input.ts} rule): the
     * coordinate-carrying text contains a comma decimal ({@code 58,25}) and
     * NO point decimal anywhere in that part → the comma is the decimal
     * mark, not a separator. Never guess/convert the value: the segment
     * carries no pair (a naive parse would pin (58, 25) — inside the
     * Estonia box — about 27 km off).
     */
    private static boolean isDecimalComma(String coordinatePart) {
        return DECIMAL_COMMA.matcher(coordinatePart).find()
                && !POINT_DECIMAL.matcher(coordinatePart).find();
    }

    /** The first pair in pattern order, or null when nothing parses. */
    private static double[] firstPair(String url) {
        // 1. known params — the first value that parses as a pair wins
        //    (a place-name q= falls through to ll=/daddr=/saddr=)
        Matcher params = PARAM_PAIR.matcher(url);
        while (params.find()) {
            String value = params.group(1);
            // A comma-decimal value (58,25 — no point decimal in the
            // value) is a decimal-mark misuse, not a pair — skip it, like a
            // place-name q= (the FE refuses it with its decimal-comma
            // reason; here: no pair from this segment).
            if (isDecimalComma(value)) {
                continue;
            }
            double[] pair = decimalPair(value);
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
            // /@58,25 is a comma-decimal, not a pair — the segment
            // carries no pair; the generic fallback (with its own body
            // guard) is given the chance, as with any skipped segment.
            if (isDecimalComma(at.group(1) + "," + at.group(2))) {
                return genericPair(url);
            }
            return decimalPair(at.group(1), at.group(2));
        }
        Matcher search = SEARCH_PAIR.matcher(url);
        if (search.find()) {
            // /search/58,25 is a comma-decimal, not a pair — same
            // treatment as the skipped /@ segment above: the segment
            // carries no pair; the generic fallback (with its own body
            // guard) is given the chance.
            if (isDecimalComma(search.group(1) + "," + search.group(2))) {
                return genericPair(url);
            }
            return decimalPair(search.group(1), search.group(2));
        }
        return genericPair(url);
    }

    /**
     * The generic first-decimal-pair fallback: the scheme+
     * host always carries dots, so — exactly like the FE's {@code urlBody}
     * check — the decimal-comma rule applies to the coordinate-carrying
     * part (path + query + fragment), not to the whole URL.
     */
    private static double[] genericPair(String url) {
        if (isDecimalComma(URL_HEAD.matcher(url).replaceFirst(""))) {
            return null;
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
