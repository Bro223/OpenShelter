package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Password-reset request payload (03-auth.puml). */
public record PasswordResetRequest(@NotBlank @Email String email) {
}
