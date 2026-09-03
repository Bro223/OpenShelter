package ee.sheltermap.verification;

import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;

/**
 * Phone channel adapter: generates a 6-digit OTP, sends it via
 * {@link SmsSender} and validates it (hash + attempts limit + expiry).
 * Pure channel adapter — no database access.
 */
@Service
public class PhoneVerificationProvider implements VerificationProvider {

    static final int MAX_ATTEMPTS = 5;
    private static final Duration TTL = Duration.ofMinutes(5);
    private static final int OTP_DIGITS = 6;

    private final SmsSender sender;
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public PhoneVerificationProvider(SmsSender sender, Clock clock) {
        this.sender = Objects.requireNonNull(sender, "sender");
        this.clock = Objects.requireNonNull(clock, "clock");
    }

    @Override
    public String providerCode() {
        // "sms" — the channel is provider-agnostic (Twilio is swappable via
        // app.sms.provider); the claim must not be labeled with a vendor.
        return "sms";
    }

    @Override
    public VerificationLevel level() {
        return VerificationLevel.PHONE;
    }

    @Override
    public PendingVerification request(RegisteredUser user) {
        // E.164 at the channel boundary: Twilio requires it, the domain stays
        // as-registered. Lenient normalization never throws.
        String phone = PhoneNumbers.normalizeE164(user.getData().phone());
        String otp = String.format("%0" + OTP_DIGITS + "d", random.nextInt(1_000_000));
        sender.send(phone, "Shelter Map OTP: " + otp);
        return new PendingVerification(
                user.getId(),
                VerificationLevel.PHONE,
                phone,
                PendingVerification.sha256(otp),
                clock.instant().plus(TTL));
    }

    @Override
    public boolean confirm(RegisteredUser user, PendingVerification pending, String code) {
        if (pending.getLevel() != VerificationLevel.PHONE) {
            return false;
        }
        Instant now = clock.instant();
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
}
