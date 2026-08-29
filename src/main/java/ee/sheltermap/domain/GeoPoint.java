package ee.sheltermap.domain;

/** An immutable geographic coordinate (WGS84). */
public record GeoPoint(double lat, double lng) {

    public GeoPoint {
        if (Double.isNaN(lat) || Double.isNaN(lng)) {
            throw new IllegalArgumentException("Coordinates must not be NaN");
        }
        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            throw new IllegalArgumentException("Coordinates out of range: (" + lat + ", " + lng + ")");
        }
    }
}
