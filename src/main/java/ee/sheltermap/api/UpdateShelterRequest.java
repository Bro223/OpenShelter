package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT /api/shelters/{id}} body (user-contributions).
 *
 * <p>Constraints are field-for-field IDENTICAL to {@link CreateShelterRequest}
 * — name, description, capacity and the coordinate bounds cannot drift
 * between create and update. Only these fields are writable on an
 * existing shelter; status/source/registry fields/createdAt/createdBy
 * are never. {@code locationKind} is the private-home declaration
 * (community-review-queue v2 D7): absent (or {@code null}) keeps the
 * row's current value.
 */
public record UpdateShelterRequest(
        @NotBlank @Size(max = 200) String name,
        @DecimalMin("-90") @DecimalMax("90") double latitude,
        @DecimalMin("-180") @DecimalMax("180") double longitude,
        @Size(max = 2000) String description,
        @Min(1) @Max(100_000) Integer capacity,
        LocationKind locationKind) {
}
