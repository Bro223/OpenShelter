package ee.sheltermap.api;

import ee.sheltermap.domain.ShelterStatus;
import jakarta.validation.constraints.NotNull;

/**
 * Manual hide/restore body (admin-moderation D3):
 * {@code {"status": "ACTIVE" | "INACTIVE"}}. A missing value is a 400
 * validation failure; an unknown value is a 400 malformed body — both
 * through the standard vocabulary.
 */
public record AdminShelterStatusRequest(@NotNull ShelterStatus status) {
}
