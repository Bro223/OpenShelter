package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/** Login payload — the user logs in with whichever contact they registered. */
public record LoginRequest(
        @NotBlank String emailOrPhone,
        @NotBlank String password) {
}
