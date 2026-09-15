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
    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
    private final InMemoryUserCredentialsRepository credentials = new InMemoryUserCredentialsRepository(clock);
    private final StubPasswordHasher hasher = new StubPasswordHasher();
    private final StubTokenService tokens = new StubTokenService();
    private final InMemoryPasswordResetTokenRepository resetTokens = new InMemoryPasswordResetTokenRepository(clock);
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final RecordingSmtpSender smtp = new RecordingSmtpSender();
    private final PasswordResetService passwordReset = new PasswordResetService(
            users, credentials, resetTokens, refreshTokens, hasher, smtp, clock);
    private final AuthService auth = new AuthService(userService, hasher, credentials, tokens, passwordReset, clock);

    private void registerMari() {
        auth.register(new RegisterRequest("Mari", "mari@example.ee", "+37250000001", "s3cret"));
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
                .hasMessage("Invalid credentials");
    }

    @Test
    void loginWrongPasswordThrowsSameGenericError() {
        registerMari();
        assertThatThrownBy(() -> auth.login(new LoginRequest("mari@example.ee", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void loginUnknownContactWithDummyPasswordThrowsSameGenericError() {
        // S1 (2026-09-11 review): the dummy verify is a timing equalizer, not
        // a credential check — the literal password "dummy" verifies against
        // AuthService.DUMMY_PASSWORD_HASH (the stub mirrors the real hasher
        // here), so an unknown contact with "dummy" must still get the
        // generic 401 — pre-fix, tokens.issue(null) would have NPE'd into a
        // 500 and revealed the account does not exist.
        assertThatThrownBy(() -> auth.login(new LoginRequest("ghost@example.ee", "dummy")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void loginKnownContactWithDummyPasswordThrowsSameGenericError() {
        // S1: the "dummy" password is only special against the DUMMY hash —
        // a real stored hash still rejects it with the generic 401.
        registerMari();
        assertThatThrownBy(() -> auth.login(new LoginRequest("mari@example.ee", "dummy")))
                .isInstanceOf(InvalidCredentialsException.class)
                .hasMessage("Invalid credentials");
    }

    @Test
    void loginRunsExactlyOneHashVerificationForUnknownAndKnownContacts() {
        // Timing equalizer (2026-09-10 review H1): every login — unknown
        // contact, known contact with a wrong password, known contact with
        // the right one — must run verify() EXACTLY ONCE, so response time
        // never reveals whether the account exists.
        CountingHasher counting = new CountingHasher();
        AuthService countingAuth =
                new AuthService(userService, counting, credentials, tokens, passwordReset, clock);

        assertThatThrownBy(() -> countingAuth.login(new LoginRequest("ghost@example.ee", "x")))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThat(counting.verifyCalls).isEqualTo(1);

        registerMari();
        assertThatThrownBy(() -> countingAuth.login(new LoginRequest("mari@example.ee", "wrong")))
                .isInstanceOf(InvalidCredentialsException.class);
        assertThat(counting.verifyCalls).isEqualTo(2);

        countingAuth.login(new LoginRequest("mari@example.ee", "s3cret"));
        assertThat(counting.verifyCalls).isEqualTo(3);
    }

    /** {@link StubPasswordHasher} that counts verify() calls. */
    private static final class CountingHasher extends StubPasswordHasher {
        int verifyCalls;

        @Override
        public boolean verify(String plain, String hash) {
            verifyCalls++;
            return super.verify(plain, hash);
        }
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
                .hasMessage("Invalid or expired reset code");
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
