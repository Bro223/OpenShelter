package ee.sheltermap.auth;

import ee.sheltermap.domain.VerificationLevel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /verify/confirm} body — the channel and the code the user
 * received (e-mail token or SMS OTP).
 */
public record VerifyConfirmRequest(
        @NotNull VerificationLevel level,
        @NotBlank @Size(max = 16) String code) {
}
