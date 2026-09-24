package ee.sheltermap.domain;

/**
 * An inclusive WGS84 bounding box — the optional viewport filter of the
 * public shelter list. A row exactly ON an edge is inside (the SQL
 * BETWEEN semantics the query uses).
 *
 * <p>Self-validating (the compact constructor): no call site — the API or
 * a future internal one — can build an inverted or out-of-range box. The
 * API's friendly 400 messages come from the controller's earlier checks;
 * this constructor is the defense in depth for everything else.
 */
public record BoundingBox(double minLat, double minLng, double maxLat, double maxLng) {

    public BoundingBox {
        if (!Double.isFinite(minLat) || !Double.isFinite(minLng)
                || !Double.isFinite(maxLat) || !Double.isFinite(maxLng)) {
            throw new IllegalArgumentException("Bounding box coordinates must be finite numbers");
        }
        if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
            throw new IllegalArgumentException("Latitude must be between -90 and 90");
        }
        if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) {
            throw new IllegalArgumentException("Longitude must be between -180 and 180");
        }
        if (minLat > maxLat) {
            throw new IllegalArgumentException("minLat must be <= maxLat");
        }
        if (minLng > maxLng) {
            throw new IllegalArgumentException("minLng must be <= maxLng");
        }
    }

    /** Inclusive containment — the same predicate the SQL BETWEEN uses. */
    public boolean contains(double lat, double lng) {
        return lat >= minLat && lat <= maxLat && lng >= minLng && lng <= maxLng;
    }
}
