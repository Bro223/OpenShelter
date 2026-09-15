package ee.sheltermap.api;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * {@code POST /api/geo/resolve} response (shelter-location-input).
 *
 * <p>The field names {@code latitude}/{@code longitude} are the contract
 * with the frontend's {@code LocationResolved} model — do not rename.
 */
@Schema(description = "The resolved coordinates — the frontend's "
        + "LocationResolved model (the field names are the contract, do not "
        + "rename).")
public record LocationResolvedDto(double latitude, double longitude) {
}
