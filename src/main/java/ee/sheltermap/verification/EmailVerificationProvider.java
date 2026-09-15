package ee.sheltermap.verification;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * E-mail channel adapter: generates an alphanumeric token, sends it via
 * {@link SmtpSender} and validates it (hash + attempts limit + expiry).
 * Pure channel adapter — no database access.
 */
@Service
public class EmailVerificationProvider implements VerificationProvider {

    static final int MAX_ATTEMPTS = 5;
    private static final Duration TTL = Duration.ofMinutes(15);
    // The e-mail code length the user is asked to type — mirrors frontend
    // verify-page EMAIL_CODE_LENGTH — do not drift.
    private static final int TOKEN_LENGTH = 8;
    private static final String TOKEN_ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private final SmtpSender sender;
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public EmailVerificationProvider(SmtpSender sender, Clock clock) {
        this.sender = Objects.requireNonNull(sender, "sender");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public String providerCode() {
        return "smtp";
    }

    @Override
    public VerificationLevel level() {
        return VerificationLevel.EMAIL;
    }

    @Override
    public PendingVerification request(RegisteredUser user) {
        String email = user.getData().email();
        String token = randomToken();
        sender.send(email, AppInfo.APP_DISPLAY_NAME + " verification code: " + token);
        return new PendingVerification(
                user.getId(),
                VerificationLevel.EMAIL,
                email,
                PendingVerification.sha256(token),
                clock.instant().plus(TTL));
    }

    @Override
    public boolean confirm(RegisteredUser user, PendingVerification pending, String code) {
        if (pending.getLevel() != VerificationLevel.EMAIL) {
            return false;
        }
        Instant now = clock.instant();
        if (pending.isExpired(now)) {
            return false;
        }
        if (pending.getAttempts() >= MAX_ATTEMPTS) {
            return false;
        }
        if (!constantTimeEquals(code == null ? null : PendingVerification.sha256(code), pending.getCodeHash())) {
            pending.recordAttempt();
            return false;
        }
        return true;
    }

    /**
     * Constant-time hash compare — no early exit on the first
     * differing byte. Private here on purpose: {@code auth.Hashes} is not
     * importable from this package (01-TASK.md §4 dependency rule — auth
     * already imports verification), so the 3-line helper stays local.
     */
    private static boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null) {
            return false;
        }
        return MessageDigest.isEqual(a.getBytes(StandardCharsets.UTF_8), b.getBytes(StandardCharsets.UTF_8));
    }

    private String randomToken() {
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(TOKEN_ALPHABET.charAt(random.nextInt(TOKEN_ALPHABET.length())));
        }
        return sb.toString();
    }
}
