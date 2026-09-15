package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Refresh / logout payload (03-auth.puml). */
public record RefreshRequest(@NotBlank @Size(max = 512) String refreshToken) {
}
