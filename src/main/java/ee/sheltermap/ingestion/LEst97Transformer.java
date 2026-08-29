package ee.sheltermap.ingestion;

import org.locationtech.proj4j.CRSFactory;
import org.locationtech.proj4j.CoordinateReferenceSystem;
import org.locationtech.proj4j.CoordinateTransform;
import org.locationtech.proj4j.CoordinateTransformFactory;
import org.locationtech.proj4j.ProjCoordinate;
import org.springframework.stereotype.Component;

/**
 * EPSG:3301 (Estonian L-EST97, meters) → EPSG:4326 (WGS84, degrees).
 *
 * <p>The Maa-amet WFS shelter service (VARJEKOHT) always returns coordinates
 * in L-EST97 and ignores {@code srsName} reprojection requests, so every
 * point must be transformed client-side. The CRS is defined explicitly from
 * its proj4 parameters (the standard L-EST97 / ETRS89 definition) rather than
 * relying on proj4j's built-in EPSG database.
 */
@Component
public class LEst97Transformer {

    private static final String L_EST97_PARAMS =
            "+proj=lcc +lat_1=59.33333333333334 +lat_2=58 +lat_0=57.51755393055556 +lon_0=24 "
                    + "+x_0=500000 +y_0=6375000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";

    private final CoordinateTransform transform;

    public LEst97Transformer() {
        CRSFactory factory = new CRSFactory();
        // Both CRSs are defined from parameters — no dependency on proj4j's
        // separate EPSG registry resource (proj4j-epsg artifact).
        CoordinateReferenceSystem lEst97 = factory.createFromParameters("EPSG:3301", L_EST97_PARAMS);
        CoordinateReferenceSystem wgs84 = factory.createFromParameters("EPSG:4326",
                "+proj=longlat +datum=WGS84 +no_defs");
        this.transform = new CoordinateTransformFactory().createTransform(lEst97, wgs84);
    }

    /**
     * Transforms one point.
     *
     * @param easting  EPSG:3301 easting (X, meters)
     * @param northing EPSG:3301 northing (Y, meters)
     * @return {@code [lng, lat]} in WGS84 degrees, or {@code null} when the
     *         transform yields a non-finite result
     */
    public double[] toWgs84(double easting, double northing) {
        ProjCoordinate out = new ProjCoordinate();
        transform.transform(new ProjCoordinate(easting, northing), out);
        if (Double.isNaN(out.x) || Double.isNaN(out.y)
                || Double.isInfinite(out.x) || Double.isInfinite(out.y)) {
            return null;
        }
        return new double[]{out.x, out.y};
    }
}
