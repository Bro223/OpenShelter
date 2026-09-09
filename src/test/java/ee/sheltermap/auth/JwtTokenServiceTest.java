package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenServiceTest {

    private static final JwtProperties PROPS = new JwtProperties(
            "test-secret-test-secret-test-secret-test-secret", Duration.ofMinutes(15), Duration.ofDays(30));
    private static final Instant NOW = Instant.parse("2026-08-23T12:00:00Z");

    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final JwtTokenService tokens = new JwtTokenService(PROPS, clock, refreshTokens, users);

    private RegisteredUser savedUser() {
        RegisteredUser user = new RegisteredUser("Mari", "mari@example.ee", "+37250000001", "49001010001");
        users.save(user);
        return user;
    }

    @Test
    void issueReturnsAccessAndRefreshAndStoresRefreshHashed() {
        RegisteredUser user = savedUser();
        TokenResponse response = tokens.issue(user);

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).hasSize(64);
        assertThat(response.expiresIn()).isEqualTo(900);

        RefreshTokenRecord record = refreshTokens.findByTokenHash(Hashes.sha256Hex(response.refreshToken()));
        assertThat(record).isNotNull();
        assertThat(record.userId()).isEqualTo(user.getId());
        // the plaintext refresh token is never stored — only its hash
        assertThat(refreshTokens.all())
                .noneMatch(r -> r.tokenHash().equals(response.refreshToken()));
        // the access token validates back to the user id
        assertThat(tokens.validateAccessToken(response.accessToken())).isEqualTo(user.getId());
    }

    @Test
    void refreshRotatesAndRevokesThePresentedToken() {
        RegisteredUser user = savedUser();
        TokenResponse first = tokens.issue(user);

        TokenResponse second = tokens.refresh(first.refreshToken());

        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex(first.refreshToken())).revokedAt()).isNotNull();
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex(second.refreshToken())).revokedAt()).isNull();
        assertThat(tokens.validateAccessToken(second.accessToken())).isEqualTo(user.getId());
    }

    @Test
    void refreshWithUnknownTokenFails() {
        assertThatThrownBy(() -> tokens.refresh("no-such-token"))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refreshWithRevokedTokenFails() {
        RegisteredUser user = savedUser();
        TokenResponse response = tokens.issue(user);
        tokens.revoke(response.refreshToken());

        assertThatThrownBy(() -> tokens.refresh(response.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void refreshWithExpiredTokenFails() {
        RegisteredUser user = savedUser();
        TokenResponse response = tokens.issue(user);

        Clock later = Clock.fixed(NOW.plus(Duration.ofDays(31)), ZoneOffset.UTC);
        JwtTokenService laterTokens = new JwtTokenService(PROPS, later, refreshTokens, users);

        assertThatThrownBy(() -> laterTokens.refresh(response.refreshToken()))
                .isInstanceOf(InvalidRefreshTokenException.class);
    }

    @Test
    void validateAccessTokenRejectsGarbageAndTamperedTokens() {
        assertThatThrownBy(() -> tokens.validateAccessToken("garbage"))
                .isInstanceOf(InvalidAccessTokenException.class);
    }
}
