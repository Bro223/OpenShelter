package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Production SMS channel — Twilio Programmable Messaging (send-only).
 *
 * <p>Twilio is only the transport: OTP generation, retry/cooldown and
 * verification logic all live on the OpenShelter side (see
 * {@link PhoneVerificationProvider} + {@link VerificationService}), so the
 * provider stays swappable by changing {@code app.sms.provider}.
 *
 * <p>Credentials come from env vars ({@code TWILIO_ACCOUNT_SID},
 * {@code TWILIO_AUTH_TOKEN}, plus {@code TWILIO_MESSAGING_SERVICE_SID} or
 * {@code TWILIO_FROM}) — loaded from the gitignored {@code .env} by
 * spring-dotenv, never committed. Logs metadata only, never the message body
 * (it carries the OTP). Delivery errors are logged, not thrown — the
 * verification request must not reveal whether a delivery succeeded
 * (anti-enumeration, same policy as the SMTP sender).
 */
@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "twilio")
public class TwilioSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsSender.class);

    /**
     * Thin seam over the Twilio SDK so unit tests can use a hand-written fake
     * (the suite is Mockito-free by design — stays JDK-agnostic).
     */
    interface TwilioApi {
        void send(String toE164, String messagingServiceSid, String fromNumber, String body);
    }

    private final TwilioApi api;
    private final String messagingServiceSid;
    private final String fromNumber;

    @Autowired
    public TwilioSmsSender(@Value("${TWILIO_ACCOUNT_SID:}") String accountSid,
                           @Value("${TWILIO_AUTH_TOKEN:}") String authToken,
                           @Value("${TWILIO_MESSAGING_SERVICE_SID:}") String messagingServiceSid,
                           @Value("${TWILIO_FROM:}") String fromNumber) {
        this(newApiOrFail(accountSid, authToken, messagingServiceSid, fromNumber),
                messagingServiceSid, fromNumber);
    }

    /**
     * Fail fast (hardening): with app.sms.provider=twilio, missing credentials
     * would otherwise make EVERY send fail silently (the sender swallows
     * delivery errors for anti-enumeration). Refuse to start instead — the
     * misconfiguration is caught at boot, not at the first user's OTP request.
     * Kept as a static helper because {@code this(...)} must be the first
     * statement of the delegated constructor.
     */
    private static TwilioApi newApiOrFail(String accountSid, String authToken,
                                          String messagingServiceSid, String fromNumber) {
        if (accountSid == null || accountSid.isBlank() || authToken == null || authToken.isBlank()) {
            throw new IllegalStateException(
                    "app.sms.provider=twilio requires TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN (see .env)");
        }
        if ((messagingServiceSid == null || messagingServiceSid.isBlank())
                && (fromNumber == null || fromNumber.isBlank())) {
            throw new IllegalStateException(
                    "app.sms.provider=twilio requires TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM (see .env)");
        }
        return new SdkTwilioApi(accountSid, authToken);
    }

    TwilioSmsSender(TwilioApi api, String messagingServiceSid, String fromNumber) {
        this.api = Objects.requireNonNull(api, "api");
        this.messagingServiceSid = messagingServiceSid;
        this.fromNumber = fromNumber;
    }

    @Override
    public void send(String phone, String message) {
        String toE164 = PhoneNumbers.normalizeE164(phone);
        try {
            api.send(toE164, messagingServiceSid, fromNumber, message);
            log.info("Twilio SMS sent to {} ({} chars)", maskPhone(toE164), message.length());
        } catch (RuntimeException ex) {
            // Logged, never thrown: callers must not be able to distinguish
            // "delivery failed" from "request accepted" (anti-enumeration).
            log.error("Twilio SMS delivery failed to {}: {}", maskPhone(toE164), ex.getMessage());
        }
    }

    /**
     * Log-safe phone mask (B5 — PII): keeps the leading {@code +} and the
     * first three digits (country code) and the LAST TWO digits, e.g.
     * {@code +37250000045} → {@code +372****45}. Logs must not carry the
     * full number (it is a login contact + account-recovery channel).
     */
    private static String maskPhone(String phone) {
        if (phone == null || phone.isEmpty()) {
            return "?";
        }
        String head = phone.charAt(0) == '+' ? "+" : "";
        int digitsFrom = head.length();
        if (phone.length() - digitsFrom < 2) {
            return "****";
        }
        String tail = phone.substring(phone.length() - 2);
        if (phone.length() - digitsFrom >= 6) {
            return head + phone.substring(digitsFrom, digitsFrom + 3) + "****" + tail;
        }
        return head + "****" + tail;
    }

    /** SDK-backed {@link TwilioApi}. Static init is idempotent; safe for a single app. */
    static final class SdkTwilioApi implements TwilioApi {

        SdkTwilioApi(String accountSid, String authToken) {
            if (accountSid != null && !accountSid.isBlank()
                    && authToken != null && !authToken.isBlank()) {
                com.twilio.Twilio.init(accountSid, authToken);
            }
        }

        @Override
        public void send(String toE164, String messagingServiceSid, String fromNumber, String body) {
            com.twilio.type.PhoneNumber to = new com.twilio.type.PhoneNumber(toE164);
            if (messagingServiceSid != null && !messagingServiceSid.isBlank()) {
                // Messaging Service: sender pooling, fallback + compliance built in.
                com.twilio.rest.api.v2010.account.Message.creator(to, messagingServiceSid, body).create();
            } else {
                com.twilio.rest.api.v2010.account.Message.creator(
                        to, new com.twilio.type.PhoneNumber(fromNumber), body).create();
            }
        }
    }
}
