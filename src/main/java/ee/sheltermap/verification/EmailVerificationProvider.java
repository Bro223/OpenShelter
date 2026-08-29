package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * E-mail channel adapter: generates an alphanumeric token, sends it via
 * {@link SmtpSender} and validates it (hash + attempts limit + expiry).
 * Pure channel adapter — no database access.
 */
public class EmailVerificationProvider implements VerificationProvider {

    static final int MAX_ATTEMPTS = 5;
    private static final Duration TTL = Duration.ofMinutes(15);
    private static final int TOKEN_LENGTH = 8;
    private static final String TOKEN_ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private final SmtpSender sender;
    private final SecureRandom random = new SecureRandom();

    public EmailVerificationProvider(SmtpSender sender) {
        this.sender = Objects.requireNonNull(sender, "sender");
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
        sender.send(email, "Shelter Map verification token: " + token);
        return new PendingVerification(
                user.getId(),
                VerificationLevel.EMAIL,
                email,
                PendingVerification.sha256(token),
                Instant.now().plus(TTL));
    }

    @Override
    public boolean confirm(RegisteredUser user, PendingVerification pending, String code) {
        if (pending.getLevel() != VerificationLevel.EMAIL) {
            return false;
        }
        Instant now = Instant.now();
        if (pending.isExpired(now)) {
            return false;
        }
        if (pending.getAttempts() >= MAX_ATTEMPTS) {
            return false;
        }
        if (code == null || !PendingVerification.sha256(code).equals(pending.getCodeHash())) {
            pending.recordAttempt();
            return false;
        }
        return true;
    }

    private String randomToken() {
        StringBuilder sb = new StringBuilder(TOKEN_LENGTH);
        for (int i = 0; i < TOKEN_LENGTH; i++) {
            sb.append(TOKEN_ALPHABET.charAt(random.nextInt(TOKEN_ALPHABET.length())));
        }
        return sb.toString();
    }
}
