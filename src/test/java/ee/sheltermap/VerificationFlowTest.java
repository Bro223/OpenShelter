package ee.sheltermap;

import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.verification.CapturingSmsSender;
import ee.sheltermap.verification.CapturingSmtpSender;
import ee.sheltermap.verification.EmailVerificationProvider;
import ee.sheltermap.verification.InMemoryPendingVerificationRepository;
import ee.sheltermap.verification.PhoneVerificationProvider;
import ee.sheltermap.verification.VerificationProvider;
import ee.sheltermap.verification.VerificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.EnumMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The executable spec of {@code 02-verification-flow.puml} — the full happy
 * path: anonymous browsing → register → phone OTP → email token → canWrite →
 * addPlace. Wired end-to-end with in-memory fakes (real persistence is Step 3).
 */
class VerificationFlowTest {

    private CapturingSmsSender sms;
    private CapturingSmtpSender smtp;
    private InMemoryPendingVerificationRepository pendings;
    private InMemoryUserRepository users;
    private InMemoryShelterRepository shelters;

    private UserService userService;
    private VerificationService verificationService;
    private ShelterService shelterService;

    @BeforeEach
    void setUp() {
        sms = new CapturingSmsSender();
        smtp = new CapturingSmtpSender();
        pendings = new InMemoryPendingVerificationRepository();
        users = new InMemoryUserRepository();
        shelters = new InMemoryShelterRepository();

        userService = new UserService(users);
        Map<VerificationLevel, VerificationProvider> providers = new EnumMap<>(VerificationLevel.class);
        providers.put(VerificationLevel.PHONE, new PhoneVerificationProvider(sms));
        providers.put(VerificationLevel.EMAIL, new EmailVerificationProvider(smtp));
        verificationService = new VerificationService(providers, pendings);
        shelterService = new ShelterService(shelters);
    }

    @Test
    void fullHappyPathRegisterVerifyThenWrite() {
        // == 0. Anonymous browsing ==
        GuestUser guest = new GuestUser();
        assertThat(guest.canWatch()).isTrue();
        assertThat(guest.canWrite()).isFalse();

        // == 1. Register ==
        RegisteredUser user = userService.register(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");
        assertThat(user.getId()).isNotNull();
        assertThat(user.levels()).isEmpty();

        // == 2-3. Phone verification: request OTP -> confirm ==
        verificationService.requestVerification(user, VerificationLevel.PHONE);
        assertThat(sms.getLastPhone()).isEqualTo("+37250000000");
        assertThat(sms.getLastMessage()).contains("OTP");
        String otp = sms.getLastMessage().substring(sms.getLastMessage().lastIndexOf(' ') + 1);
        assertThat(verificationService.confirmVerification(user, VerificationLevel.PHONE, otp)).isTrue();
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE);

        // == 4-5. Email verification: request token -> confirm ==
        verificationService.requestVerification(user, VerificationLevel.EMAIL);
        assertThat(smtp.getLastEmail()).isEqualTo("aleks@example.com");
        assertThat(smtp.getLastMessage()).contains("token");
        String token = smtp.getLastMessage().substring(smtp.getLastMessage().lastIndexOf(' ') + 1);
        assertThat(verificationService.confirmVerification(user, VerificationLevel.EMAIL, token)).isTrue();
        assertThat(user.levels()).containsExactly(VerificationLevel.PHONE, VerificationLevel.EMAIL);

        // == 7. Capability check ==
        assertThat(user.canWrite()).isTrue();

        // == 8. Add a shelter: published immediately ACTIVE/USER, no moderator ==
        Shelter shelter = new Shelter("Kadriorg shelter",
                new GeoPoint(59.438861, 24.754472), ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelterService.addPlace(user, shelter);

        assertThat(shelters.findAll()).hasSize(1);
        Shelter saved = shelters.findAll().get(0);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(saved.getSource()).isEqualTo(ShelterSource.USER);
        assertThat(saved.getName()).isEqualTo("Kadriorg shelter");
    }
}
