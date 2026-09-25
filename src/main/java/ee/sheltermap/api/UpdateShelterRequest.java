package ee.sheltermap.api;

import ee.sheltermap.domain.LocationKind;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT /api/shelters/{id}} body.
 *
 * <p>Constraints are field-for-field IDENTICAL to {@link CreateShelterRequest}
 * — name, description, capacity and the coordinate bounds cannot drift
 * between create and update. Only these fields are writable on an
 * existing shelter; status/source/registry fields/createdAt/createdBy
 * are never. The body is a FULL replace of the writable fields: an absent
 * (or {@code null}) {@code description} or {@code capacity} CLEARS the
 * stored value — the one kept-when-absent field is {@code locationKind},
 * the private-home declaration (absent or {@code null} keeps the row's
 * current value).
 *
 * <p>The shelter's trust state is NOT a field here: {@code
 * reviewStatus} is server-owned — the owner-edit trust reset in
 * {@code ShelterService.updatePlace} decides it on the write path, so no
 * request field can let a caller set (or skip) verification.
 */
public record UpdateShelterRequest(
        @NotBlank @Size(max = 200) String name,
        @DecimalMin("-90") @DecimalMax("90") double latitude,
        @DecimalMin("-180") @DecimalMax("180") double longitude,
        @Size(max = 2000) String description,
        @Min(1) @Max(100_000) Integer capacity,
        LocationKind locationKind) {
}
