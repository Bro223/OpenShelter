package ee.sheltermap.auth;

import ee.sheltermap.domain.RegisteredUser;

/** Records calls for {@link AuthService} tests. */
public class StubTokenService implements TokenService {

    public static final TokenResponse RESPONSE = new TokenResponse("access-stub", "refresh-stub", 900);

    private RegisteredUser lastIssued;
    private String lastRefreshed;
    private String lastRevoked;
    private boolean refreshShouldFail;

    @Override
    public TokenResponse issue(RegisteredUser user) {
        this.lastIssued = user;
        return RESPONSE;
    }

    @Override
    public TokenResponse refresh(String refreshToken) {
        this.lastRefreshed = refreshToken;
        if (refreshShouldFail) {
            throw new InvalidRefreshTokenException();
        }
        return RESPONSE;
    }

    @Override
    public void revoke(String refreshToken) {
        this.lastRevoked = refreshToken;
    }

    @Override
    public Long validateAccessToken(String accessToken) {
        return 1L;
    }

    public RegisteredUser lastIssued() {
        return lastIssued;
    }

    public String lastRefreshed() {
        return lastRefreshed;
    }

    public String lastRevoked() {
        return lastRevoked;
    }

    public void refreshShouldFail(boolean refreshShouldFail) {
        this.refreshShouldFail = refreshShouldFail;
    }
}
