package ee.sheltermap.auth;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Issued token pair (03-auth.puml): access JWT + hashed-at-rest refresh.
 * A CREDENTIAL response — the values are bearer tokens, never log them,
 * and this type carries no example values in the published document.
 */
public record TokenResponse(
        @Schema(description = "Issued access JWT (credential — never log, "
                + "never store in the document).")
        String accessToken,
        @Schema(description = "Issued refresh token (credential — hashed at "
                + "rest, rotated on every refresh; never log).")
        String refreshToken,
        @Schema(description = "The access token's time-to-live in seconds.")
        int expiresIn) {
}
