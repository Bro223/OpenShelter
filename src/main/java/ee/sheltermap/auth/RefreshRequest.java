package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Refresh / logout payload (03-auth.puml). */
@Schema(description = "Refresh / logout payload (03-auth.puml).")
public record RefreshRequest(
        @Schema(description = "The refresh token issued by the login or "
                + "refresh response.")
        @NotBlank @Size(max = 512) String refreshToken) {
}
