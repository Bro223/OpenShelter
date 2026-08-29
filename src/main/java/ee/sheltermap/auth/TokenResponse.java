package ee.sheltermap.auth;

/** Issued token pair (03-auth.puml): access JWT + hashed-at-rest refresh. */
public record TokenResponse(String accessToken, String refreshToken, int expiresIn) {
}
