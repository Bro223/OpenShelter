package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Login payload — the user logs in with whichever contact they registered. */
public record LoginRequest(
        @NotBlank @Size(max = 255) String emailOrPhone,
        @NotBlank @Size(max = 200) String password) {
}
