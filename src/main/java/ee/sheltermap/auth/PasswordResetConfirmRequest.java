package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/** Password-reset confirmation payload (03-auth.puml). */
public record PasswordResetConfirmRequest(
        @NotBlank String token,
        @NotBlank String newPassword) {
}
