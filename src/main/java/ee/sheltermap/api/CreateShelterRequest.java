package ee.sheltermap.api;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /api/shelters} body (05-shelter-api.puml).
 *
 * <p>{@code description} and {@code capacity} are USER-submission details and
 * are stored on the shelter (V3 hardening — previously validated then
 * silently dropped at the boundary).
 */
public record CreateShelterRequest(
        @NotBlank @Size(max = 200) String name,
        @DecimalMin("-90") @DecimalMax("90") double latitude,
        @DecimalMin("-180") @DecimalMax("180") double longitude,
        @Size(max = 2000) String description,
        @Min(1) Integer capacity) {
}
