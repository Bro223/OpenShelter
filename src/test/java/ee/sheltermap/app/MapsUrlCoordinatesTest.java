package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fixture table for URL → coordinate extraction (shelter-location-input,
 * design decision 4). The table mirrors the URL shapes the frontend spec
 * ({@code shared/location-input.spec.ts}) covers — the two parsers must
 * agree on every case, so a pinned location can never drift between the
 * sides.
 */
class MapsUrlCoordinatesTest {

    /** A named case: the URL plus the expected pair (nulls = no pair). */
    private record Case(String name, String url, Double latitude, Double longitude) {
        static Case none(String name, String url) {
            return new Case(name, url, null, null);
        }
    }

    private static final List<Case> CASES = List.of(
            new Case("google place/@ link with zoom suffix",
                    "https://www.google.com/maps/place/@59.43703,24.75353,17z", 59.43703, 24.75353),
            new Case("google ?q=lat,lng",
                    "https://www.google.com/maps?q=59.437,24.7535", 59.437, 24.7535),
            new Case("google ?ll=lat,lng",
                    "https://www.google.com/maps?ll=59.437,24.7535", 59.437, 24.7535),
            Case.none("encoded comma is not decoded — query values are not URL-decoded",
                    "https://www.google.com/maps?ll=59.437%2C24.753"),
            Case.none("generic fallback takes the FIRST positional pair — a foreign pair "
                    + "shadows a valid one later in the URL (documented limitation)",
                    "https://x/geo?foo=1,2&c=59.437,24.753"),
            new Case("google ?daddr= (directions destination)",
                    "https://www.google.com/maps/dir/?api=1&daddr=59.437,24.7535", 59.437, 24.7535),
            new Case("google ?saddr= (directions start)",
                    "https://www.google.com/maps/dir/?api=1&saddr=59.437,24.7535", 59.437, 24.7535),
            new Case("google !3d…!4d… share path",
                    "https://www.google.com/maps/@!3d59.437!4d24.7535!5d0", 59.437, 24.7535),
            new Case("apple maps.apple.com ?ll=",
                    "https://maps.apple.com/?ll=59.437,24.7535&q=Tallinn", 59.437, 24.7535),
            new Case("bing bing.com/maps ?q=",
                    "https://www.bing.com/maps?q=59.437,24.7535", 59.437, 24.7535),
            new Case("generic decimal-pair fallback",
                    "https://example.org/geo?c=59.437,24.7535", 59.437, 24.7535),
            new Case("place-name q= falls through to ll=",
                    "https://www.google.com/maps?q=Some%20Place&ll=59.437,24.7535", 59.437, 24.7535),
            new Case("lng/lat paste auto-swapped into the Estonia box",
                    "https://www.google.com/maps?q=24.7535,59.437", 59.437, 24.7535),
            Case.none("google place name (no pair)",
                    "https://www.google.com/maps?q=Tallinn"),
            Case.none("map URL without any coordinates",
                    "https://www.google.com/maps/search/Tallinn"),
            Case.none("short link itself (no pair)",
                    "https://maps.app.goo.gl/abc123"),
            Case.none("outside Estonia in both orders (Paris)",
                    "https://www.google.com/maps?q=48.858,2.294"),
            Case.none("garbage",
                    "https://maps.app.goo.gl/!!!"));

    @Test
    void caseTable() {
        for (Case c : CASES) {
            GeoPoint point = MapsUrlCoordinates.extract(c.url());
            String label = "case " + c.name() + " (" + c.url() + ")";
            if (c.latitude() == null) {
                assertThat(point).as(label).isNull();
            } else {
                assertThat(point).as(label).isNotNull();
                assertThat(point.lat()).as(label).isEqualTo(c.latitude());
                assertThat(point.lng()).as(label).isEqualTo(c.longitude());
            }
        }
    }

    @Test
    void nullUrlIsNoPair() {
        assertThat(MapsUrlCoordinates.extract(null)).isNull();
    }
}
