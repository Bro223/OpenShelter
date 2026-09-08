package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.UserService;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class AuthServiceTest {

    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final UserService userService = new UserService(users);
    private final InMemoryUserCredentialsRepository credentials = new InMemoryUserCredentialsRepository();
    private final StubPasswordHasher hasher = new StubPasswordHasher();
    private final StubTokenService tokens = new StubTokenService();
    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
    private final InMemoryPasswordResetTokenRepository resetTokens = new InMemoryPasswordResetTokenRepository();
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final RecordingSmtpSender smtp = new RecordingSmtpSender();
    private final PasswordResetService passwordReset = new PasswordResetService(
            users, credentials, resetTokens, refreshTokens, hasher, smtp, clock);
    private final AuthService auth = new AuthService(userService, hasher, credentials, tokens, passwordReset);

    private void registerMari() {
        auth.register(new RegisterRequest("Mari", "mari@example.ee", "+37250000001", "49001010001", "s3cret"));
    }

    private Long mariId() {
        return users.findAll().get(0).getId();
    }

    @Test
    void registerPersistsUserAndHashedCredentials() {
        registerMari();

        assertThat(users.findAll()).hasSize(1);
        UserCredentials stored = credentials.findByUserId(mariId());
        assertThat(stored.getPasswordHash()).isEqualTo("h(s3cret)");
        assertThat(stored.getPasswordHash()).isNotEqualTo("s3cret");
    }

    @Test
    void loginUnknownUserThrowsGenericError() {
        assertThatThrownBy(() -> auth.login(new LoginRequest("ghost@example.ee", "x")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("invalid credentials");
    }

    @Test
    void loginWrongPasswordThrowsSameGenericError() {
        registerMari();
        assertThatThrownBy(() -> auth.login(new LoginRequest("mari@example.ee", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("invalid credentials");
    }

    @Test
    void loginSuccessReturnsTokenResponse() {
        registerMari();
        TokenResponse response = auth.login(new LoginRequest("mari@example.ee", "s3cret"));
        assertThat(response).isEqualTo(StubTokenService.RESPONSE);
        assertThat(tokens.lastIssued().getId()).isEqualTo(mariId());
    }

    @Test
    void loginByPhoneWorks() {
        registerMari();
        assertThat(auth.login(new LoginRequest("+37250000001", "s3cret"))).isEqualTo(StubTokenService.RESPONSE);
    }

    @Test
    void refreshAndLogoutDelegateToTokenService() {
        assertThat(auth.refresh(new RefreshRequest("rt-1"))).isEqualTo(StubTokenService.RESPONSE);
        assertThat(tokens.lastRefreshed()).isEqualTo("rt-1");

        auth.logout("rt-2");
        assertThat(tokens.lastRevoked()).isEqualTo("rt-2");
    }

    @Test
    void resetPasswordWithInvalidCodeThrows() {
        assertThatThrownBy(() -> auth.resetPassword("mari@example.ee", "bogus", "newpass"))
                .isInstanceOf(InvalidResetTokenException.class)
                .hasMessage("invalid or expired reset code");
    }

    @Test
    void resetPasswordEndToEndUpdatesPasswordAndRevokesSessions() {
        registerMari();
        refreshTokens.save(Hashes.sha256Hex("old-refresh"), mariId(), clock.instant().plus(Duration.ofDays(30)));

        auth.requestPasswordReset("mari@example.ee");
        String code = TestTokens.fromResetEmail(smtp.last().message());
        auth.resetPassword("mari@example.ee", code, "newpass");

        assertThat(credentials.findByUserId(mariId()).getPasswordHash()).isEqualTo("h(newpass)");
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex("old-refresh")).revokedAt()).isNotNull();
    }
}
