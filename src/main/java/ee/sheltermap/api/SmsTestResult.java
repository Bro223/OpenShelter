package ee.sheltermap.api;

/**
 * Result of a {@code POST /dev/sms-test} call.
 *
 * <p>Note on {@code sent}: the production senders swallow delivery errors by
 * design (anti-enumeration — the verification request must not reveal whether
 * a delivery succeeded). So {@code sent:true} means "accepted by the active
 * sender without an exception"; a Twilio-side rejection is logged by
 * {@code TwilioSmsSender} and must be read from the app log. Misconfiguration
 * itself is caught at startup (fail-fast constructor).
 *
 * @param provider simple class name of the active {@code SmsSender} bean
 *                 (e.g. {@code TwilioSmsSender} or {@code DevSmsSender})
 * @param to       the recipient as given
 * @param toE164   the recipient normalized to E.164 (what the sender used)
 * @param sent     true if the active sender accepted the message
 * @param error    error message when the send threw, else null
 */
public record SmsTestResult(
        String provider,
        String to,
        String toE164,
        boolean sent,
        String error) {
}
