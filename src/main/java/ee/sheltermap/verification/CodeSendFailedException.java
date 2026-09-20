package ee.sheltermap.verification;

/**
 * The channel adapter did NOT accept the code message — the delivery
 * failed and the SENDER already logged the error.
 *
 * <p>The {@link VerificationService} catches it to keep the
 * anti-enumeration contract (the endpoint still answers its plain ack —
 * the client must not be able to tell "delivery failed" from "request
 * accepted"), and to stay honest about the durable state: NO pending
 * code is persisted for a code nobody received, and NO daily slot is
 * consumed (a refused send spends no Twilio/SMTP budget, so the user's
 * retry budget survives the outage — the operator sees the outage in
 * the admin alert ring instead).
 */
public class CodeSendFailedException extends RuntimeException {

    public CodeSendFailedException(String channel) {
        super("The " + channel + " channel did not accept the code message (delivery failed — "
                + "see the server log)");
    }
}
