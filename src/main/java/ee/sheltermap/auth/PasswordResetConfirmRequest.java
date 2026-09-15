package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Password-reset confirmation payload (03-auth.puml). The e-mail scopes the
 * confirm to the account the code was sent to (the reset page still has it
 * from the request); the 6-digit code is the secret.
 */
@Schema(description = "Password-reset confirmation payload (03-auth.puml). "
        + "The e-mail scopes the confirmation to the account the code was "
        + "sent to.")
public record PasswordResetConfirmRequest(
        @Schema(description = "The address the reset code was sent to.")
        @NotBlank @Email @Size(max = 255) String email,
        @Schema(description = "The 6-digit code from the reset e-mail — "
                + "the secret of this call.")
        @NotBlank @Size(max = 16) String code,
        @Schema(description = "At least 8 characters.")
        @NotBlank @Size(min = 8, max = 200, message = "Password must be at least 8 characters long") String newPassword) {
}
