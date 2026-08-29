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
     */
    void send(String phone, String message);
}
