package ee.sheltermap.api;

/**
 * Truthful result of a {@code POST /dev/email-test} call. Unlike the
 * production senders (which swallow delivery failures for anti-enumeration),
 * this endpoint reports whether the message was actually accepted by the
 * mail relay — that is the whole point of a diagnostic endpoint.
 *
 * @param provider simple class name of the active {@code SmtpSender} bean
 *                 (e.g. {@code SmtpPulseSmtpSender} or {@code DevSmtpSender})
 * @param from     the From address used
 * @param to       the recipient
 * @param subject  the subject used
 * @param sent     true if the relay accepted the message
 * @param error    relay error message when {@code sent} is false, else null
 */
public record EmailTestResult(
        String provider,
        String from,
        String to,
        String subject,
        boolean sent,
        String error) {
}
