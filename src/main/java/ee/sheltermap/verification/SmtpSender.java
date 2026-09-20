package ee.sheltermap.verification;

/**
 * Outbound e-mail channel (TIJ Ch 9). Used by the email verification provider
 * and later by password-reset. Implementations are swappable.
 */
public interface SmtpSender {

    /**
     * Sends an e-mail to {@code email}. Implementations must never log the
     * full message content to production logs — the payload carries the token.
     *
     * <p>Delivery failures are reported, not thrown: the return value is
     * {@code true} when the channel accepted the message and {@code false}
     * when delivery failed (the sender logged the error). Callers decide
     * what a refusal means for their flow — verification does NOT consume
     * a daily send slot for a refused send, while the other code flows
     * (password reset, contact change) ignore the result and keep their
     * "always succeeds" HTTP contract (anti-enumeration).
     */
    boolean send(String email, String message);
}
