package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Login payload — the user logs in with whichever contact they registered. */
@Schema(description = "Login payload — the user logs in with whichever "
        + "contact they registered (e-mail address or phone number).")
public record LoginRequest(
        @Schema(description = "The registered e-mail address or the "
                + "normalized E.164 phone number.")
        @NotBlank @Size(max = 255) String emailOrPhone,
        @Schema(description = "The account password.")
        @NotBlank @Size(max = 200) String password) {
}
