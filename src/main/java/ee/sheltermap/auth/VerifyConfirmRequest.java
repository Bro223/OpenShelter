package ee.sheltermap.auth;

import ee.sheltermap.domain.VerificationLevel;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * {@code POST /verify/confirm} body — the channel and the code the user
 * received (e-mail token or SMS OTP).
 */
@Schema(description = "POST /verify/confirm body — the channel and the code "
        + "the user received (e-mail token or SMS OTP).")
public record VerifyConfirmRequest(
        @Schema(description = "The channel being confirmed.")
        @NotNull VerificationLevel level,
        @Schema(description = "The code from the e-mail token or the SMS "
                + "OTP.")
        @NotBlank @Size(max = 16) String code) {
}
