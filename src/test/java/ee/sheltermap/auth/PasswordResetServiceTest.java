package ee.sheltermap.auth;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.app.InMemoryUserRepository;
import ee.sheltermap.app.ProvisionedAdminProtectedException;
import ee.sheltermap.domain.AdminUser;
import ee.sheltermap.domain.RegisteredUser;
import org.junit.jupiter.api.Test;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PasswordResetServiceTest {

    private static final String EMAIL = "mari@example.ee";
    private static final String ADMIN_EMAIL = "admin@example.ee";

    private final MutableClock clock = new MutableClock(Instant.parse("2026-08-23T12:00:00Z"));
    private final InMemoryUserRepository users = new InMemoryUserRepository();
    private final InMemoryUserCredentialsRepository credentials = new InMemoryUserCredentialsRepository(clock);
    private final InMemoryPasswordResetTokenRepository tokens = new InMemoryPasswordResetTokenRepository(clock);
    private final InMemoryRefreshTokenRepository refreshTokens = new InMemoryRefreshTokenRepository(clock);
    private final RecordingSmtpSender smtp = new RecordingSmtpSender();
    private final PasswordResetService service = new PasswordResetService(
            users, credentials, tokens, refreshTokens, new StubPasswordHasher(), smtp, clock);

    private RegisteredUser savedUser() {
        RegisteredUser user = new RegisteredUser("Mari", EMAIL, "+37250000001");
        users.save(user);
        credentials.save(new UserCredentials(user.getId(), "h(oldpass)", clock.instant()));
        return user;
    }

    /** Requests a reset and returns the 6-digit code the fake sender captured. */
    private String requestCode() {
        service.requestReset(EMAIL);
        return TestTokens.fromResetEmail(smtp.last().message());
    }

    private static String aDifferentCode(String code) {
        return code.equals("000000") ? "000001" : "000000";
    }

    private void assertPasswordUnchanged(RegisteredUser user) {
        assertThat(credentials.findByUserId(user.getId()).getPasswordHash()).isEqualTo("h(oldpass)");
    }

    @Test
    void requestForUnknownEmailIsSilentSuccess() {
        service.requestReset("nobody@example.ee");
        assertThat(tokens.all()).isEmpty();
        assertThat(smtp.sent()).isEmpty();
    }

    @Test
    void requestForTheProvisionedAdminIsRefusedAndSendsNothing() {
        // The env-provisioned admin's password is the deployment's
        // (ADMIN_PASSWORD): a code e-mailed to its address must never be
        // issuable — the ONE non-uniform answer to the anti-enumeration
        // rule, a 403 naming the environment provisioning.
        AdminUser admin = new AdminUser("Admin", ADMIN_EMAIL, null);
        users.save(admin);
        credentials.save(new UserCredentials(admin.getId(), "h(oldpass)", clock.instant()));

        assertThatThrownBy(() -> service.requestReset(ADMIN_EMAIL))
                .isInstanceOf(ProvisionedAdminProtectedException.class)
                .hasMessage(PasswordResetService.PROVISIONED_ADMIN_RESET_MESSAGE);

        assertThat(tokens.all()).as("no reset code row is created").isEmpty();
        assertThat(smtp.sent()).as("nothing is e-mailed").isEmpty();
    }

    @Test
    void resetForTheProvisionedAdminIsRefusedAndChangesNothing() {
        // Defense in depth: a DIRECT confirm call (no code was ever
        // issued) must still be refused — the env's credentials are never
        // rewritten through the reset flow.
        AdminUser admin = new AdminUser("Admin", ADMIN_EMAIL, null);
        users.save(admin);
        credentials.save(new UserCredentials(admin.getId(), "h(oldpass)", clock.instant()));

        assertThatThrownBy(() -> service.reset(ADMIN_EMAIL, "123456", "newpass"))
                .isInstanceOf(ProvisionedAdminProtectedException.class)
                .hasMessage(PasswordResetService.PROVISIONED_ADMIN_RESET_MESSAGE);

        assertThat(credentials.findByUserId(admin.getId()).getPasswordHash())
                .isEqualTo("h(oldpass)");
    }

    @Test
    void resetStillWorksForAnOrdinaryAccount() {
        // The refusal is scoped to the ADMIN kind — a REGISTERED account
        // keeps the full recovery flow.
        RegisteredUser user = savedUser();
        String code = requestCode();

        assertThat(service.reset(EMAIL, code, "newpass")).isTrue();
        assertThat(credentials.findByUserId(user.getId()).getPasswordHash()).isEqualTo("h(newpass)");
    }

    @Test
    void requestStoresHashedCodeAndEmailsTheCodeNotALink() {
        savedUser();
        service.requestReset(EMAIL);

        assertThat(tokens.all()).hasSize(1);
        PasswordResetToken stored = tokens.all().get(0);
        assertThat(stored.isExpired(clock.instant())).isFalse();

        String message = smtp.last().message();
        String code = TestTokens.fromResetEmail(message);
        assertThat(message)
                .isEqualTo(AppInfo.APP_DISPLAY_NAME + " password reset code: " + code + " (valid 15 min)")
                .doesNotContain("http"); // no URL link — the code is the whole message
        assertThat(stored.getTokenHash()).isNotEqualTo(code); // hashed at rest
        assertThat(stored.getTokenHash()).isEqualTo(Hashes.sha256Hex(code));
    }

    @Test
    void reissueWithinCooldownKeepsTheOriginalCodeValid() {
        savedUser();
        String first = requestCode();

        clock.advance(Duration.ofSeconds(30)); // inside the 60 s cooldown (S1b)
        service.requestReset(EMAIL);

        // silent no-op: no new row, no new e-mail — the original code is
        // still the single active one (rotation brute-force stays closed)
        assertThat(tokens.all()).hasSize(1);
        assertThat(smtp.sent()).hasSize(1);
        assertThat(service.reset(EMAIL, first, "newpass")).isTrue();
    }

    @Test
    void reissueAfterCooldownInvalidatesThePreviousCode() {
        savedUser();
        String first = requestCode();

        clock.advance(Duration.ofSeconds(61)); // past the 60 s cooldown
        String second = requestCode();

        assertThat(second).isNotEqualTo(first);
        assertThat(tokens.all()).hasSize(1); // the first code was invalidated
        assertThat(service.reset(EMAIL, first, "newpass")).isFalse();
        assertThat(service.reset(EMAIL, second, "newpass")).isTrue();
    }

    @Test
    void sixthReissueOnTheSameUtcDayIsSkippedButStillSucceeds() {
        savedUser();
        // Five request+confirm cycles: each confirmed code leaves a USED row
        // behind (the cap counts rows created today, incl. used ones).
        for (int i = 0; i < 5; i++) {
            if (i > 0) {
                clock.advance(Duration.ofSeconds(61));
            }
            service.requestReset(EMAIL);
            String code = TestTokens.fromResetEmail(smtp.last().message());
            assertThat(service.reset(EMAIL, code, "newpass" + i)).isTrue();
        }
        assertThat(smtp.sent()).hasSize(5);
        assertThat(tokens.all()).hasSize(5);

        clock.advance(Duration.ofSeconds(61));
        service.requestReset(EMAIL); // 6th reissue today -> silent skip (S1b)

        // still the identical silent success — no 6th e-mail, no 6th row
        assertThat(smtp.sent()).hasSize(5);
        assertThat(tokens.all()).hasSize(5);
    }

    @Test
    void resetWithValidCodeUpdatesPasswordMarksUsedAndRevokesAllSessions() {
        RegisteredUser user = savedUser();
        refreshTokens.save(Hashes.sha256Hex("session-refresh"), user.getId(), clock.instant().plus(Duration.ofDays(30)));

        String code = requestCode();

        assertThat(service.reset(EMAIL, code, "newpass")).isTrue();
        assertThat(credentials.findByUserId(user.getId()).getPasswordHash()).isEqualTo("h(newpass)");
        assertThat(tokens.all().get(0).isUsed()).isTrue();
        assertThat(refreshTokens.findByTokenHash(Hashes.sha256Hex("session-refresh")).revokedAt()).isNotNull();
    }

    @Test
    void resetWithWrongCodeFailsAndRecordsOneAttempt() {
        RegisteredUser user = savedUser();
        String code = requestCode();

        assertThat(service.reset(EMAIL, aDifferentCode(code), "newpass")).isFalse();
        assertPasswordUnchanged(user);
        assertThat(tokens.all().get(0).getAttempts()).isEqualTo(1); // persisted brute-force guard
    }

    @Test
    void resetFailsAfterMaxAttemptsEvenWithTheCorrectCode() {
        RegisteredUser user = savedUser();
        String code = requestCode();
        String wrong = aDifferentCode(code);

        for (int i = 0; i < PasswordResetService.MAX_ATTEMPTS; i++) {
            assertThat(service.reset(EMAIL, wrong, "newpass")).isFalse();
        }
        assertPasswordUnchanged(user);

        // the code is locked out — even the correct one no longer works
        assertThat(service.reset(EMAIL, code, "newpass")).isFalse();
        assertPasswordUnchanged(user);
    }

    @Test
    void exhaustedCodeIsReplacedByANewRequest() {
        savedUser();
        String code = requestCode();
        String wrong = aDifferentCode(code);
        for (int i = 0; i < PasswordResetService.MAX_ATTEMPTS; i++) {
            service.reset(EMAIL, wrong, "newpass");
        }

        clock.advance(Duration.ofSeconds(61)); // past the reissue cooldown
        String fresh = requestCode(); // a new request resets the attempts
        assertThat(service.reset(EMAIL, fresh, "newpass")).isTrue();
    }

    @Test
    void resetForUnknownEmailFails() {
        savedUser();
        requestCode();
        assertThat(service.reset("ghost@example.ee", "000000", "newpass")).isFalse();
    }

    @Test
    void resetWithExpiredCodeFails() {
        savedUser();
        String code = requestCode();
        clock.advance(Duration.ofMinutes(16));

        assertThat(service.reset(EMAIL, code, "newpass")).isFalse();
    }

    @Test
    void resetWithExpiredCodeDoesNotCountAsAnAttempt() {
        savedUser();
        String code = requestCode();
        clock.advance(Duration.ofMinutes(16));

        assertThat(service.reset(EMAIL, code, "newpass")).isFalse();
        // an expired code is filtered out, not a failed guess — the attempts
        // counter must stay untouched
        assertThat(tokens.all().get(0).getAttempts()).isZero();
    }

    @Test
    void resetCodeIsSingleUse() {
        savedUser();
        String code = requestCode();

        assertThat(service.reset(EMAIL, code, "newpass")).isTrue();
        assertThat(service.reset(EMAIL, code, "another")).isFalse();
    }

    @Test
    void resetWithUsedCodeDoesNotCountAsAnAttempt() {
        savedUser();
        String code = requestCode();

        assertThat(service.reset(EMAIL, code, "newpass")).isTrue();
        assertThat(service.reset(EMAIL, code, "another")).isFalse();
        assertThat(tokens.all().get(0).getAttempts()).isZero();
    }

    @Test
    void resetSucceedsOnTheLastAllowedAttempt() {
        RegisteredUser user = savedUser();
        String code = requestCode();
        String wrong = aDifferentCode(code);

        // MAX_ATTEMPTS - 1 wrong guesses: the 5th slot must still accept the
        // correct code (attempts < MAX, not attempts <= MAX)
        for (int i = 0; i < PasswordResetService.MAX_ATTEMPTS - 1; i++) {
            assertThat(service.reset(EMAIL, wrong, "newpass")).isFalse();
        }
        assertThat(tokens.all().get(0).getAttempts()).isEqualTo(PasswordResetService.MAX_ATTEMPTS - 1);

        assertThat(service.reset(EMAIL, code, "newpass")).isTrue();
        assertThat(credentials.findByUserId(user.getId()).getPasswordHash()).isEqualTo("h(newpass)");
    }
}
