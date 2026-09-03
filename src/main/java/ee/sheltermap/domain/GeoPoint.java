package ee.sheltermap.domain;

/** An immutable geographic coordinate (WGS84). */
public record GeoPoint(double lat, double lng) {

    /** Estonia bounding box (sanity check — not a hard geopolitical border). */
    public static final double MIN_LAT = 57.5;
    public static final double MAX_LAT = 59.7;
    public static final double MIN_LNG = 21.5;
    public static final double MAX_LNG = 28.2;

    public GeoPoint {
        if (Double.isNaN(lat) || Double.isNaN(lng)) {
            throw new IllegalArgumentException("Coordinates must not be NaN");
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new IllegalArgumentException("Coordinates out of range: (" + lat + ", " + lng + ")");
        }
    }

    /** True when the coordinate falls inside the Estonia bounding box. */
    public static boolean inEstonia(double lat, double lng) {
        return lat >= MIN_LAT && lat <= MAX_LAT && lng >= MIN_LNG && lng <= MAX_LNG;
    }
}
