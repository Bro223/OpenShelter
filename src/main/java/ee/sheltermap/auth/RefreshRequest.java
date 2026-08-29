package ee.sheltermap.auth;

import jakarta.validation.constraints.NotBlank;

/** Refresh / logout payload (03-auth.puml). */
public record RefreshRequest(@NotBlank String refreshToken) {
}
