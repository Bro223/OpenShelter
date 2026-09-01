package ee.sheltermap.auth;

import ee.sheltermap.domain.VerificationLevel;
import jakarta.validation.constraints.NotNull;

/**
 * {@code POST /verify/request} body — which channel to verify through.
 * The target contact (email/phone) is read from the authenticated user,
 * never from the request body.
 */
public record VerifyRequest(@NotNull VerificationLevel level) {
}
