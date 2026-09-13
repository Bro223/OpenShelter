package ee.sheltermap.auth;

import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.verification.VerificationThrottledException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Cross-channel contact-change logic (unit): email change verified by an SMS
 * code to the current phone, phone change by an email code to the current
 * email. No Mockito — hand-written fakes + a fixed clock.
 */
class ContactChangeServiceTest {

    private static final Instant NOW = Instant.parse("2026-09-02T10:00:00Z");
    private static final Pattern CODE = Pattern.compile("code: (\\d{6})");

    private InMemoryUserRepository users;
    private InMemoryPendingContactChangeRepository changes;
    private RecordingSmsSender sms;
    private RecordingSmtpSender smtp;
    private MutableClock clock;
    private ContactChangeService service;

    /** Clock whose instant the test can advance (cooldown/expiry scenarios). */
    private static final class MutableClock extends Clock {
        private Instant instant;

        MutableClock(Instant instant) {
            this.instant = instant;
        }

        void advanceSeconds(long seconds) {
            instant = instant.plusSeconds(seconds);
        }

        @Override
        public ZoneOffset getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return instant;
        }
    }

    @BeforeEach
    void setUp() {
        users = new InMemoryUserRepository();
        changes = new InMemoryPendingContactChangeRepository();
        sms = new RecordingSmsSender();
        smtp = new RecordingSmtpSender();
        clock = new MutableClock(NOW);
        service = new ContactChangeService(users, changes, sms, smtp,
                new ContactChangeProperties(60, 900, 5), clock);
    }

    private RegisteredUser user(String email, String phone) {
        RegisteredUser user = new RegisteredUser("Mari Maasikas", email, phone);
        users.save(user);
        return user;
    }

    private static String codeFrom(String message) {
        Matcher m = CODE.matcher(message);
        assertThat(m.find()).as("message contains a 6-digit code: %s", message).isTrue();
        return m.group(1);
    }

    // ---- Email change (verified by SMS to the current phone) ----

    @Test
    void requestEmailChangeSendsSmsToCurrentPhoneAndPersistsPending() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");

        service.requestEmailChange(user, "MARI@new.ee ");

        // cross-channel: the SMS goes to the CURRENT phone, not the new email
        assertThat(sms.last()).isNotNull();
        assertThat(sms.last().phone()).isEqualTo("+37250000001");
        assertThat(sms.last().message()).contains("change-email code");
        assertThat(sms.sent()).hasSize(1);
        assertThat(smtp.sent()).isEmpty();

        // pending persisted: target lowercased, code hashed (never plaintext)
        PendingContactChange pending = changes.findByUserIdAndType(user.getId(),
                ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE).orElseThrow();
        assertThat(pending.getTarget()).isEqualTo("mari@new.ee");
        assertThat(pending.getCodeHash()).isNotEqualTo(codeFrom(sms.last().message()));
        assertThat(pending.getCodeHash()).hasSize(64);
        assertThat(pending.isExpired(NOW.plusSeconds(901))).isTrue();
    }

    @Test
    void confirmEmailChangeWithCorrectCodeUpdatesEmailAndDeletesPending() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestEmailChange(user, "mari@new.ee");
        String code = codeFrom(sms.last().message());

        service.confirmEmailChange(user, code);

        assertThat(user.getData().email()).isEqualTo("mari@new.ee");
        assertThat(changes.findByUserIdAndType(user.getId(),
                ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE)).isEmpty();
    }

    @Test
    void confirmEmailChangeWithWrongCodeIncrementsAttemptsThenLocks() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestEmailChange(user, "mari@new.ee");
        String code = codeFrom(sms.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        for (int i = 0; i < 5; i++) {
            int attempt = i + 1;
            // H2: a code failure is RETURNED, not thrown (the 400 is raised
            // at the controller boundary) — the attempts increment persists
            // either way, which is what the InMemory repo already showed.
            ContactChangeResult result = service.confirmEmailChange(user, wrong);
            assertThat(result.ok()).isFalse();
            assertThat(result.failureMessage()).isEqualTo("Invalid code");
            PendingContactChange pending = changes.findByUserIdAndType(user.getId(),
                    ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE).orElseThrow();
            assertThat(pending.getAttempts()).isEqualTo(attempt);
        }

        ContactChangeResult locked = service.confirmEmailChange(user, code);
        assertThat(locked.ok()).isFalse();
        assertThat(locked.failureMessage()).contains("Too many attempts");
        // email unchanged
        assertThat(user.getData().email()).isEqualTo("mari@example.ee");
    }

    @Test
    void incrementAttemptsIsStoreAtomicAndStopsAtTheCap() {
        // S2 (2026-09-11 review): the lockout counter is incremented IN THE
        // STORE, not by a read-modify-write. At the cap the increment must
        // affect 0 rows instead of writing past the counter.
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestEmailChange(user, "mari@new.ee");
        PendingContactChange pending = changes.findByUserIdAndType(user.getId(),
                ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE).orElseThrow();

        int max = 5;
        for (int i = 1; i <= max; i++) {
            assertThat(changes.incrementAttempts(pending.getId(), max)).isEqualTo(1);
            assertThat(pending.getAttempts()).isEqualTo(i);
        }
        // at the cap: 0 rows updated, counter untouched
        assertThat(changes.incrementAttempts(pending.getId(), max)).isZero();
        assertThat(pending.getAttempts()).isEqualTo(max);
        // unknown id: 0 rows
        assertThat(changes.incrementAttempts(999L, max)).isZero();
    }

    @Test
    void requestEmailChangeRejectsDuplicateAndSameAsCurrent() {
        user("taken@example.ee", "+37250000002");
        RegisteredUser user = user("mari@example.ee", "+37250000001");

        assertThatThrownBy(() -> service.requestEmailChange(user, "taken@example.ee"))
                .isInstanceOf(DuplicateAccountException.class);
        assertThatThrownBy(() -> service.requestEmailChange(user, "mari@example.ee"))
                .isInstanceOf(InvalidContactChangeException.class)
                .hasMessageContaining("equals the current email");
        assertThat(sms.sent()).isEmpty();
    }

    @Test
    void resendWithinCooldownIsThrottledAndReplacesAfterCooldown() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestEmailChange(user, "mari@new.ee");

        // immediate resend -> 429 (throttle), no new SMS
        assertThatThrownBy(() -> service.requestEmailChange(user, "mari@other.ee"))
                .isInstanceOf(VerificationThrottledException.class);
        assertThat(sms.sent()).hasSize(1);

        // after the cooldown the request is allowed and REPLACES the old pending
        clock.advanceSeconds(61);
        service.requestEmailChange(user, "mari@other.ee");
        assertThat(sms.sent()).hasSize(2);
        PendingContactChange pending = changes.findByUserIdAndType(user.getId(),
                ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE).orElseThrow();
        assertThat(pending.getTarget()).isEqualTo("mari@other.ee");
    }

    // ---- Phone change (verified by email to the current email) ----

    @Test
    void requestPhoneChangeSendsEmailToCurrentEmail() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");

        service.requestPhoneChange(user, "+37250009999");

        // cross-channel: the EMAIL goes to the current email, not the new phone
        assertThat(smtp.last()).isNotNull();
        assertThat(smtp.last().email()).isEqualTo("mari@example.ee");
        assertThat(smtp.last().message()).contains("change-phone code");
        assertThat(sms.sent()).isEmpty();
    }

    @Test
    void confirmPhoneChangeNormalizesE164AndUpdatesPhone() {
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestPhoneChange(user, "55509999"); // 8-digit Estonian local
        String code = codeFrom(smtp.last().message());

        service.confirmPhoneChange(user, code);

        assertThat(user.getData().phone()).isEqualTo("+37255509999");
        assertThat(changes.findByUserIdAndType(user.getId(),
                ee.sheltermap.domain.ContactChangeType.PHONE_CHANGE)).isEmpty();
    }

    @Test
    void confirmPhoneChangeWithWrongCodeIncrementsAttemptsThenLocks() {
        // mirror of the e-mail lockout for the phone-change path
        RegisteredUser user = user("mari@example.ee", "+37250000001");
        service.requestPhoneChange(user, "+37250009998");
        String code = codeFrom(smtp.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        for (int i = 0; i < 5; i++) {
            int attempt = i + 1;
            ContactChangeResult result = service.confirmPhoneChange(user, wrong);
            assertThat(result.ok()).isFalse();
            assertThat(result.failureMessage()).isEqualTo("Invalid code");
            PendingContactChange pending = changes.findByUserIdAndType(user.getId(),
                    ee.sheltermap.domain.ContactChangeType.PHONE_CHANGE).orElseThrow();
            assertThat(pending.getAttempts()).isEqualTo(attempt);
        }

        ContactChangeResult locked = service.confirmPhoneChange(user, code);
        assertThat(locked.ok()).isFalse();
        assertThat(locked.failureMessage()).contains("Too many attempts");
        // phone unchanged
        assertThat(user.getData().phone()).isEqualTo("+37250000001");
    }

    @Test
    void phoneChangeDuplicateAndSameAsCurrentRejected() {
        user("other@example.ee", "+37250009999");
        RegisteredUser user = user("mari@example.ee", "+37250000001");

        assertThatThrownBy(() -> service.requestPhoneChange(user, "+37250009999"))
                .isInstanceOf(DuplicateAccountException.class);
        assertThatThrownBy(() -> service.requestPhoneChange(user, "+372 5000 0001"))
                .isInstanceOf(InvalidContactChangeException.class)
                .hasMessageContaining("equals the current phone");
        assertThat(smtp.sent()).isEmpty();
    }
}
