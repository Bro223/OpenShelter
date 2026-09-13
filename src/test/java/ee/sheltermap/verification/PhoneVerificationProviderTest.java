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

class PhoneVerificationProviderTest {

    private static final Pattern OTP_AT_END = Pattern.compile("(\\d{6})$");

    private CapturingSmsSender sender;
    private PhoneVerificationProvider provider;
    private RegisteredUser user;
    private Clock clock;

    @BeforeEach
    void setUp() {
        sender = new CapturingSmsSender();
        clock = Clock.fixed(Instant.parse("2026-09-01T10:00:00Z"), ZoneOffset.UTC);
        provider = new PhoneVerificationProvider(sender, clock);
        user = new RegisteredUser("Aleks", "aleks@example.com", "+37250000000");
        user.setId(1L);
    }

    @Test
    void requestGeneratesOtpSendsItAndReturnsHashedExpiringPending() {
        PendingVerification pending = provider.request(user);

        assertThat(pending.getLevel()).isEqualTo(VerificationLevel.PHONE);
        assertThat(pending.getUserId()).isEqualTo(1L);
        assertThat(pending.getContact()).isEqualTo("+37250000000");
        assertThat(pending.getAttempts()).isZero();
        assertThat(pending.getExpiresAt()).isAfter(clock.instant());

        // sent to the right phone, code embedded in the message
        assertThat(sender.getLastPhone()).isEqualTo("+37250000000");
        assertThat(sender.getLastMessage()).contains("OTP");
        String otp = extractOtp(sender.getLastMessage());
        assertThat(otp).matches("\\d{6}");

        // stored hashed, never plaintext
        assertThat(pending.getCodeHash()).isEqualTo(PendingVerification.sha256(otp));
        assertThat(pending.getCodeHash()).doesNotContain(otp);
    }

    @Test
    void confirmWithCorrectCodeReturnsTrue() {
        PendingVerification pending = provider.request(user);
        String otp = extractOtp(sender.getLastMessage());

        assertThat(provider.confirm(user, pending, otp)).isTrue();
        assertThat(pending.getAttempts()).isZero();
    }

    @Test
    void confirmWithWrongCodeReturnsFalseAndIncrementsAttempts() {
        PendingVerification pending = provider.request(user);
        String otp = extractOtp(sender.getLastMessage());
        String wrong = otp.equals("000000") ? "000001" : "000000";

        assertThat(provider.confirm(user, pending, wrong)).isFalse();
        assertThat(pending.getAttempts()).isEqualTo(1);
    }

    @Test
    void confirmWithNullCodeReturnsFalse() {
        PendingVerification pending = provider.request(user);

        assertThat(provider.confirm(user, pending, null)).isFalse();
    }

    @Test
    void confirmAfterAttemptsExhaustedFailsEvenWithCorrectCode() {
        PendingVerification pending = provider.request(user);
        String otp = extractOtp(sender.getLastMessage());
        String wrong = otp.equals("000000") ? "000001" : "000000";

        for (int i = 0; i < PhoneVerificationProvider.MAX_ATTEMPTS; i++) {
            provider.confirm(user, pending, wrong);
        }

        assertThat(pending.getAttempts()).isEqualTo(PhoneVerificationProvider.MAX_ATTEMPTS);
        assertThat(provider.confirm(user, pending, otp)).isFalse();
    }

    @Test
    void confirmExpiredPendingReturnsFalse() {
        PendingVerification expired = new PendingVerification(
                1L, VerificationLevel.PHONE, "+37250000000",
                PendingVerification.sha256("123456"), clock.instant().minusSeconds(1));

        assertThat(provider.confirm(user, expired, "123456")).isFalse();
    }

    @Test
    void confirmPendingForAnotherLevelReturnsFalse() {
        PendingVerification emailPending = new PendingVerification(
                1L, VerificationLevel.EMAIL, "aleks@example.com",
                PendingVerification.sha256("123456"), clock.instant().plusSeconds(60));

        assertThat(provider.confirm(user, emailPending, "123456")).isFalse();
    }

    private static String extractOtp(String message) {
        Matcher matcher = OTP_AT_END.matcher(message);
        assertThat(matcher.find()).isTrue();
        return matcher.group(1);
    }
}
