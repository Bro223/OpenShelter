package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;

class EmailVerificationProviderTest {

    private static final Pattern TOKEN_AT_END = Pattern.compile("([A-Za-z0-9]{8})$");

    private CapturingSmtpSender sender;
    private EmailVerificationProvider provider;
    private RegisteredUser user;
    private Clock clock;

    @BeforeEach
    void setUp() {
        sender = new CapturingSmtpSender();
        clock = Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC);
        provider = new EmailVerificationProvider(sender, clock);
        user = new RegisteredUser("Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.setId(1L);
    }

    @Test
    void requestGeneratesTokenSendsItAndReturnsHashedExpiringPending() {
        PendingVerification pending = provider.request(user);

        assertThat(pending.getLevel()).isEqualTo(VerificationLevel.EMAIL);
        assertThat(pending.getUserId()).isEqualTo(1L);
        assertThat(pending.getContact()).isEqualTo("aleks@example.com");
        assertThat(pending.getAttempts()).isZero();
        assertThat(pending.getExpiresAt()).isAfter(clock.instant());

        assertThat(sender.getLastEmail()).isEqualTo("aleks@example.com");
        assertThat(sender.getLastMessage()).contains("code");
        String token = extractToken(sender.getLastMessage());
        assertThat(token).matches("[A-Za-z0-9]{8}");

        // stored hashed, never plaintext
        assertThat(pending.getCodeHash()).isEqualTo(PendingVerification.sha256(token));
        assertThat(pending.getCodeHash()).doesNotContain(token);
    }

    @Test
    void confirmWithCorrectTokenReturnsTrue() {
        PendingVerification pending = provider.request(user);
        String token = extractToken(sender.getLastMessage());

        assertThat(provider.confirm(user, pending, token)).isTrue();
        assertThat(pending.getAttempts()).isZero();
    }

    @Test
    void confirmWithWrongTokenReturnsFalseAndIncrementsAttempts() {
        PendingVerification pending = provider.request(user);

        assertThat(provider.confirm(user, pending, "wrongtok")).isFalse();
        assertThat(pending.getAttempts()).isEqualTo(1);
    }

    @Test
    void confirmAfterAttemptsExhaustedFailsEvenWithCorrectToken() {
        PendingVerification pending = provider.request(user);
        String token = extractToken(sender.getLastMessage());

        for (int i = 0; i < EmailVerificationProvider.MAX_ATTEMPTS; i++) {
            provider.confirm(user, pending, "wrongtok");
        }

        assertThat(pending.getAttempts()).isEqualTo(EmailVerificationProvider.MAX_ATTEMPTS);
        assertThat(provider.confirm(user, pending, token)).isFalse();
    }

    @Test
    void confirmExpiredPendingReturnsFalse() {
        PendingVerification expired = new PendingVerification(
                1L, VerificationLevel.EMAIL, "aleks@example.com",
                PendingVerification.sha256("token123"), clock.instant().minusSeconds(1));

        assertThat(provider.confirm(user, expired, "token123")).isFalse();
    }

    @Test
    void confirmPendingForAnotherLevelReturnsFalse() {
        PendingVerification phonePending = new PendingVerification(
                1L, VerificationLevel.PHONE, "+37250000000",
                PendingVerification.sha256("123456"), clock.instant().plusSeconds(60));

        assertThat(provider.confirm(user, phonePending, "123456")).isFalse();
    }

    private static String extractToken(String message) {
        Matcher matcher = TOKEN_AT_END.matcher(message);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }
}
