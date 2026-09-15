package ee.sheltermap.verification;

/**
 * Outbound e-mail channel (TIJ Ch 9). Used by the email verification provider
 * and later by password-reset. Implementations are swappable.
 */
public interface SmtpSender {

    /**
     * Sends an e-mail to {@code email}. Implementations must never log the
     * full message content to production logs — the payload carries the token.
     */
    void send(String email, String message);
}
