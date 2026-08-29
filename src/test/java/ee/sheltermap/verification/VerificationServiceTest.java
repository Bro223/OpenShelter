package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class VerificationServiceTest {

    private CapturingSmsSender sms;
    private CapturingSmtpSender smtp;
    private InMemoryPendingVerificationRepository pendingRepo;
    private VerificationService service;
    private RegisteredUser user;

    @BeforeEach
    void setUp() {
        sms = new CapturingSmsSender();
        smtp = new CapturingSmtpSender();
        pendingRepo = new InMemoryPendingVerificationRepository();

        Map<VerificationLevel, VerificationProvider> providers = new EnumMap<>(VerificationLevel.class);
        providers.put(VerificationLevel.PHONE, new PhoneVerificationProvider(sms));
        providers.put(VerificationLevel.EMAIL, new EmailVerificationProvider(smtp));
        providers.put(VerificationLevel.SMART_ID, new SmartIdVerificationProvider());

        service = new VerificationService(providers, pendingRepo);

        user = new RegisteredUser("Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.setId(1L);
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
    void revokeRemovesLevelFromUser() {
        service.requestVerification(user, VerificationLevel.PHONE);
        String otp = extractOtp(sms.getLastMessage());
        service.confirmVerification(user, VerificationLevel.PHONE, otp);
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE);

        service.revoke(user, VerificationLevel.PHONE);

        assertThat(user.levels()).isEmpty();
        assertThat(user.canWrite()).isFalse();
    }

    @Test
    void requestVerificationForUnknownLevelThrows() {
        VerificationService bare = new VerificationService(Map.of(), pendingRepo);

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

    private static String extractOtp(String message) {
        return message.substring(message.lastIndexOf(' ') + 1);
    }
}
