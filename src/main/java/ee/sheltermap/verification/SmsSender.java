package ee.sheltermap.verification;

/**
 * Outbound SMS channel (TIJ Ch 9): implementations are swappable
 * ({@link TwilioSmsSender} for production, {@link DevSmsSender} for dev/CI,
 * fakes in tests).
 */
public interface SmsSender {

    /**
     * Sends an SMS to {@code phone}. Implementations must never log the full
     * message content to production logs — the payload carries the OTP.
     *
     * <p>Delivery failures are reported, not thrown: the return value is
     * {@code true} when the channel accepted the message and {@code false}
     * when delivery failed (the sender logged the error). Callers decide
     * what a refusal means for their flow — verification does NOT consume
     * a daily send slot for a refused send, while the contact-change flow
     * ignores the result and keeps its "always succeeds" HTTP contract
     * (anti-enumeration).
     */
    boolean send(String phone, String message);
}
