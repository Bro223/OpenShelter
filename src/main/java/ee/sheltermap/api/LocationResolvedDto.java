package ee.sheltermap.api;

/**
 * {@code POST /api/geo/resolve} response (shelter-location-input).
 *
 * <p>The field names {@code latitude}/{@code longitude} are the contract
 * with the frontend's {@code LocationResolved} model — do not rename.
 */
public record LocationResolvedDto(double latitude, double longitude) {
}
