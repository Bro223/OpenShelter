package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Password-reset confirmation payload (03-auth.puml). The e-mail scopes the
 * confirm to the account the code was sent to (the reset page still has it
 * from the request); the 6-digit code is the secret.
 */
public record PasswordResetConfirmRequest(
        @NotBlank @Email String email,
        @NotBlank String code,
        @NotBlank String newPassword) {
}
