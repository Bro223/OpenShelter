package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class PasswordResetServiceTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final InMemoryUserCredentialsRepository credentials = new InMemoryUserCredentialsRepository();
    private final InMemoryPasswordResetTokenRepository tokens = new InMemoryPasswordResetTokenRepository();
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final RecordingSmtpSender smtp = new RecordingSmtpSender();
    private final PasswordResetService service = new PasswordResetService(
            users, credentials, tokens, refreshTokens, new StubPasswordHasher(), smtp, clock,
            "http://localhost:5173");

    private RegisteredUser savedUser() {
        RegisteredUser user = new RegisteredUser("Mari", "mari@example.ee", "+37250000001", "49001010001");
        users.save(user);
        credentials.save(new UserCredentials(user.getId(), "h(oldpass)"));
        return user;
    }

    @Test
    void requestForUnknownEmailIsSilentSuccess() {
        service.requestReset("nobody@example.ee");
        assertThat(tokens.all()).isEmpty();
        assertThat(smtp.sent()).isEmpty();
    }

    @Test
    void requestStoresHashedTokenAndEmailsResetLink() {
        savedUser();
        service.requestReset("mari@example.ee");

        assertThat(tokens.all()).hasSize(1);
        PasswordResetToken stored = tokens.all().get(0);
        assertThat(stored.isExpired(clock.instant())).isFalse();

        String message = smtp.last().message();
        assertThat(message).startsWith("http://localhost:5173/reset?token=");
        String token = TestTokens.fromResetUrl(message);
        assertThat(stored.getTokenHash()).isNotEqualTo(token); // hashed at rest
        assertThat(stored.getTokenHash()).isEqualTo(Hashes.sha256Hex(token));
    }

    @Test
    void resetWithValidTokenUpdatesPasswordMarksUsedAndRevokesAllSessions() {
        RegisteredUser user = savedUser();
        refreshTokens.save(Hashes.sha256Hex("session-refresh"), user.getId(), clock.instant().plus(Duration.ofDays(30)));

        service.requestReset("mari@example.ee");
        String token = TestTokens.fromResetUrl(smtp.last().message());

        assertThat(service.reset(token, "newpass")).isTrue();
        assertThat(credentials.findByUserId(user.getId()).getPasswordHash()).isEqualTo("h(newpass)");
        assertThat(tokens.all().get(0).isUsed()).isTrue();
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex("session-refresh")).revokedAt()).isNotNull();
    }

    @Test
    void resetWithWrongTokenFails() {
        savedUser();
        assertThat(service.reset("wrong-token", "newpass")).isFalse();
        assertThat(credentials.findByUserId(users.findAll().get(0).getId()).getPasswordHash()).isEqualTo("h(oldpass)");
    }

    @Test
    void resetWithExpiredTokenFails() {
        savedUser();
        service.requestReset("mari@example.ee");
        String token = TestTokens.fromResetUrl(smtp.last().message());
        clock.advance(Duration.ofMinutes(16));

        assertThat(service.reset(token, "newpass")).isFalse();
    }

    @Test
    void resetTokenIsSingleUse() {
        savedUser();
        service.requestReset("mari@example.ee");
        String token = TestTokens.fromResetUrl(smtp.last().message());

        assertThat(service.reset(token, "newpass")).isTrue();
        assertThat(service.reset(token, "another")).isFalse();
    }
}
