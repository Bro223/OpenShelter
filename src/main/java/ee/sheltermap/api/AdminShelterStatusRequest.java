package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Manual hide/restore body:
 * {@code {"status": "ACTIVE" | "INACTIVE"}}. A missing value is a 400
 * validation failure; an unknown value is a 400 malformed body — both
 * in the uniform error shape.
 */
public record AdminShelterStatusRequest(@NotNull ShelterStatus status) {
}
