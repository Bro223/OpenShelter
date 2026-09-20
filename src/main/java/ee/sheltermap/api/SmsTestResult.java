package ee.sheltermap.api;

/**
 * Result of a {@code POST /dev/sms-test} call.
 *
 * <p>Note on {@code sent}: the production senders report delivery failures
 * as a {@code false} return (anti-enumeration — the verification request
 * must not reveal whether a delivery succeeded) and log the provider error
 * themselves. The test endpoint propagates that boolean: {@code sent:false}
 * + the {@code error} reason IS the diagnostic for a channel refusal, and a
 * sender that throws still answers {@code sent:false} with the exception
 * message. Misconfiguration itself is caught at startup (fail-fast
 * constructor).
 *
 * @param provider simple class name of the active {@code SmsSender} bean
 *                 (e.g. {@code TwilioSmsSender} or {@code DevSmsSender})
 * @param to       the recipient as given
 * @param toE164   the recipient normalized to E.164 (what the sender used)
 * @param sent     true if the active sender accepted the message (its
 *                 boolean return), false when the channel refused or the
 *                 send threw
 * @param error    error message when the channel refused or the send
 *                 threw, else null
 */
public record SmsTestResult(
        String provider,
        String to,
        String toE164,
        boolean sent,
        String error) {
}
