package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.util.Base64;

import io.jsonwebtoken.security.SignatureException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtTokenServiceTest {

    private static final JwtProperties PROPS = new JwtProperties(
            "test-secret-test-secret-test-secret-test-secret", Duration.ofMinutes(15), Duration.ofDays(30));
    private static final Instant NOW = Instant.parse("2026-08-23T12:00:00Z");

    private static Instant monthsBefore(Instant from, long months) {
        return ZonedDateTime.ofInstant(from, ZoneOffset.UTC).minusMonths(months).toInstant();
    }

    private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);
    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final JwtTokenService tokens = new JwtTokenService(PROPS, clock, refreshTokens, users);

    private RegisteredUser savedUser() {
        RegisteredUser user = new RegisteredUser("Mari", "mari@example.ee", "+37250000001");
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
    void refreshStampsFreshActivity() {
        // Retention-pruning: a successful refresh rotation is sign-in
        // activity (the session is being renewed).
        RegisteredUser user = savedUser();
        user.markActive(monthsBefore(NOW, 12));
        users.save(user);
        TokenResponse first = tokens.issue(user);

        tokens.refresh(first.refreshToken());

        assertThat(user.getLastActivityAt()).isEqualTo(NOW);
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

        // A forged payload with the original signature: structurally a JWT,
        // but the HMAC covers the ORIGINAL claims — the refusal must be a
        // signature mismatch, not a claim swap (a validator that skipped the
        // signature check would answer with the forged user id).
        RegisteredUser user = savedUser();
        String[] segments = tokens.issue(user).accessToken().split("\\.");
        String payload = new String(Base64.getUrlDecoder().decode(segments[1]), StandardCharsets.UTF_8);
        String forged = payload.replace("\"sub\":\"" + user.getId() + "\"",
                "\"sub\":\"" + (user.getId() + 1) + "\"");
        assertThat(forged).isNotEqualTo(payload); // the swap actually happened
        String tampered = segments[0] + "." + Base64.getUrlEncoder().withoutPadding()
                .encodeToString(forged.getBytes(StandardCharsets.UTF_8)) + "." + segments[2];
        assertThatThrownBy(() -> tokens.validateAccessToken(tampered))
                .isInstanceOf(InvalidAccessTokenException.class)
                .hasCauseInstanceOf(SignatureException.class);
    }

    @Test
    void validateAccessTokenRejectsExpiredTokens() {
        // The exp claim is enforced by the same clock the tokens were issued
        // against — a token past its 15-min TTL validates for no one (the
        // filter turns this into a 401 on the very next request).
        RegisteredUser user = savedUser();
        String token = tokens.issue(user).accessToken();

        Clock later = Clock.fixed(NOW.plus(Duration.ofMinutes(16)), ZoneOffset.UTC);
        JwtTokenService laterTokens = new JwtTokenService(PROPS, later, refreshTokens, users);

        assertThatThrownBy(() -> laterTokens.validateAccessToken(token))
                .isInstanceOf(InvalidAccessTokenException.class);
    }
}
