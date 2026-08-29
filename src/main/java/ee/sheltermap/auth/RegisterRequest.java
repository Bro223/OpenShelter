package ee.sheltermap.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/** Registration payload (03-auth.puml). */
public record RegisterRequest(
        @NotBlank String name,
        @NotBlank @Email String email,
        @NotBlank String phone,
        @NotBlank String nationalIdCode,
        @NotBlank String password) {
}
