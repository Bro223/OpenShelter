package ee.sheltermap.auth;

import ee.sheltermap.domain.RegisteredUser;

/**
 * Two-token session model (03-auth.puml): access = JWT, 15 min, stateless,
 * signed; refresh = 30 days, stored hashed, revocable.
 */
public interface TokenService {

    TokenResponse issue(RegisteredUser user);

    TokenResponse refresh(String refreshToken);

    void revoke(String refreshToken);

    /**
     * Validates an access token and returns the user id it was issued to.
     * Throws {@link InvalidAccessTokenException} on any failure.
     */
    Long validateAccessToken(String accessToken);
}
