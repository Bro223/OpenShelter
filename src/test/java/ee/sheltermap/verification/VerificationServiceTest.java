package ee.sheltermap.verification;

import ee.sheltermap.config.VerificationProperties;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VerificationServiceTest {

    private CapturingSmsSender sms;
    private CapturingSmtpSender smtp;
    private InMemoryPendingVerificationRepository pendingRepo;
    private InMemoryVerificationSendLog sendLog;
    private MutableClock clock;
    private VerificationService service;
    private RegisteredUser user;

    @BeforeEach
    void setUp() {
        sms = new CapturingSmsSender();
        smtp = new CapturingSmtpSender();
        pendingRepo = new InMemoryPendingVerificationRepository();
        sendLog = new InMemoryVerificationSendLog();
        clock = new MutableClock(Instant.parse("2026-09-01T10:00:00Z"));

        Map<VerificationLevel, VerificationProvider> providers = new EnumMap<>(VerificationLevel.class);
        providers.put(VerificationLevel.PHONE, new PhoneVerificationProvider(sms));
        providers.put(VerificationLevel.EMAIL, new EmailVerificationProvider(smtp));
        providers.put(VerificationLevel.SMART_ID, new SmartIdVerificationProvider());

        service = newService(new VerificationProperties(0, 0, "unused"));

        user = new RegisteredUser("Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.setId(1L);
    }

    /** Builds a service sharing this test's fakes, with the given throttle config. */
    private VerificationService newService(VerificationProperties properties) {
        Map<VerificationLevel, VerificationProvider> providers = new EnumMap<>(VerificationLevel.class);
        providers.put(VerificationLevel.PHONE, new PhoneVerificationProvider(sms));
        providers.put(VerificationLevel.EMAIL, new EmailVerificationProvider(smtp));
        providers.put(VerificationLevel.SMART_ID, new SmartIdVerificationProvider());
        return new VerificationService(providers, pendingRepo, sendLog, properties, clock);
    }

    @Test
    void requestVerificationPersistsPendingAndSendsCode() {
        service.requestVerification(user, VerificationLevel.PHONE);

        assertThat(pendingRepo.findAll()).hasSize(1);
        PendingVerification saved = pendingRepo.findAll().get(0);
        assertThat(saved.getUserId()).isEqualTo(1L);
        assertThat(saved.getLevel()).isEqualTo(VerificationLevel.PHONE);
        assertThat(sms.getLastPhone()).isEqualTo("+37250000000");
        assertThat(sms.getLastMessage()).contains("OTP");
    }

    @Test
    void requestVerificationTwiceKeepsOnlyOneActivePending() {
        service.requestVerification(user, VerificationLevel.PHONE);
        service.requestVerification(user, VerificationLevel.PHONE);

        assertThat(pendingRepo.findAll()).hasSize(1);
    }

    @Test
    void confirmVerificationWithCorrectCodeAddsClaimAndDeletesPending() {
        service.requestVerification(user, VerificationLevel.PHONE);
        String otp = extractOtp(sms.getLastMessage());

        assertThat(service.confirmVerification(user, VerificationLevel.PHONE, otp)).isTrue();

        // claim persisted + levels() updated; one-time code consumed
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE);
        assertThat(user.getData().levels()).containsExactly(VerificationLevel.PHONE);
        assertThat(pendingRepo.findAll()).isEmpty();
    }

    @Test
    void confirmVerificationWithWrongCodeReturnsFalseAndKeepsLevelsEmpty() {
        service.requestVerification(user, VerificationLevel.PHONE);

        assertThat(service.confirmVerification(user, VerificationLevel.PHONE, "000000")).isFalse();
        assertThat(user.levels()).isEmpty();
        assertThat(pendingRepo.findAll()).hasSize(1);
    }

    @Test
    void confirmVerificationWithoutPendingReturnsFalse() {
        assertThat(service.confirmVerification(user, VerificationLevel.PHONE, "123456")).isFalse();
        assertThat(user.levels()).isEmpty();
    }

    @Test
    void confirmVerificationWithNullCodeReturnsFalse() {
        service.requestVerification(user, VerificationLevel.PHONE);

        assertThat(service.confirmVerification(user, VerificationLevel.PHONE, null)).isFalse();
    }

    @Test
    void revokeIsPureDomainStateNotAServiceMethod() {
        // Claim revocation lives on the domain aggregate (RegisteredUser.revoke),
        // not on the service — the service has no HTTP surface for revocation in
        // v1, so there is deliberately no VerificationService.revoke.
        service.requestVerification(user, VerificationLevel.PHONE);
        String otp = extractOtp(sms.getLastMessage());
        service.confirmVerification(user, VerificationLevel.PHONE, otp);
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE);
        assertThat(user.canWrite()).isTrue();

        user.revoke(VerificationLevel.PHONE);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }

    @Test
    void requestVerificationForUnknownLevelThrows() {
        VerificationService bare = new VerificationService(
                Map.of(), pendingRepo, sendLog, new VerificationProperties(0, 0, "unused"), clock);

        assertThatThrownBy(() -> bare.requestVerification(user, VerificationLevel.PHONE))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("no verification provider");
    }

    @Test
    void smartIdProviderIsStubAndThrows() {
        assertThatThrownBy(() -> service.requestVerification(user, VerificationLevel.SMART_ID))
                .isInstanceOf(UnsupportedOperationException.class)
                .hasMessageContaining("stub");
    }

    // ---- Anti-spam throttle (Twilio plan): cooldown + daily cap ----

    @Test
    void requestWithinCooldownIsThrottled() {
        VerificationService throttled = newService(new VerificationProperties(60, 5, "unused"));

        throttled.requestVerification(user, VerificationLevel.PHONE); // ok

        assertThatThrownBy(() -> throttled.requestVerification(user, VerificationLevel.PHONE))
                .isInstanceOf(VerificationThrottledException.class);
    }

    @Test
    void requestAfterCooldownElapsesSucceeds() {
        VerificationService throttled = newService(new VerificationProperties(60, 5, "unused"));

        throttled.requestVerification(user, VerificationLevel.PHONE);
        clock.advance(Duration.ofSeconds(61));

        throttled.requestVerification(user, VerificationLevel.PHONE); // no exception
        assertThat(sendLog.countToday(user.getId(), VerificationLevel.PHONE)).isEqualTo(2);
    }

    @Test
    void dailyCapBlocksFurtherSends() {
        VerificationService throttled = newService(new VerificationProperties(0, 2, "unused"));

        throttled.requestVerification(user, VerificationLevel.PHONE);
        clock.advance(Duration.ofSeconds(1));
        throttled.requestVerification(user, VerificationLevel.PHONE);

        assertThatThrownBy(() -> throttled.requestVerification(user, VerificationLevel.PHONE))
                .isInstanceOf(VerificationThrottledException.class);
    }

    @Test
    void cooldownIsPerUserAndPerLevel() {
        VerificationService throttled = newService(new VerificationProperties(60, 5, "unused"));

        throttled.requestVerification(user, VerificationLevel.PHONE);
        // A different level for the same user is not throttled by the PHONE cooldown.
        throttled.requestVerification(user, VerificationLevel.EMAIL);

        RegisteredUser other = new RegisteredUser("Mari", "mari@example.com", "+37251111111", "49001011111");
        other.setId(2L);
        throttled.requestVerification(other, VerificationLevel.PHONE); // different user, not throttled
    }

    private static String extractOtp(String message) {
        return message.substring(message.lastIndexOf(' ') + 1);
    }

    /** Test clock that can be advanced to simulate the passage of time. */
    static final class MutableClock extends Clock {

        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration duration) {
            now = now.plus(duration);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
