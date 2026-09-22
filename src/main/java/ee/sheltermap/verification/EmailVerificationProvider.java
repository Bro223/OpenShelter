package ee.sheltermap.verification;

import ee.sheltermap.app.AppInfo;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.security.PiiCrypto;
import org.springframework.stereotype.Service;

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

    private static final Duration TTL = Duration.ofMinutes(15);
    // The e-mail code length the user is asked to type — mirrors frontend
    // verify-page EMAIL_CODE_LENGTH — do not drift.
    private static final int TOKEN_LENGTH = 8;
    private static final String TOKEN_ALPHABET =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    private final SmtpSender sender;
    private final PiiCrypto piiCrypto;
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public EmailVerificationProvider(SmtpSender sender, PiiCrypto piiCrypto, Clock clock) {
        this.sender = Objects.requireNonNull(sender, "sender");
        this.piiCrypto = Objects.requireNonNull(piiCrypto, "piiCrypto");
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
        // A channel refusal is an exception on purpose: the service catches
        // it to keep the anti-enumeration ack while persisting NO pending
        // code and consuming NO daily slot (see CodeSendFailedException).
        if (!sender.send(email, AppInfo.APP_DISPLAY_NAME + " verification code: " + token)) {
            throw new CodeSendFailedException("e-mail");
        }
        return new PendingVerification(
                user.getId(),
                VerificationLevel.EMAIL,
                email,
                piiCrypto.codeHash(PiiCrypto.DOMAIN_CODE_EMAIL, token),
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
        if (pending.getAttempts() >= CodePolicy.MAX_ATTEMPTS) {
            return false;
        }
        if (!CodeHashes.matches(piiCrypto, pending.getCodeHash(),
                PiiCrypto.DOMAIN_CODE_EMAIL, code)) {
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
