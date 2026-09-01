package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Production SMS channel via the Twilio SDK.
 *
 * <p>Step 2 stubs the SDK call — no credentials exist in dev/CI. Wire the
 * real client here when Twilio credentials are available (see TODO). The
 * stub logs metadata only, never the message payload (it carries the OTP).
 *
 * <p>Only active when explicitly selected via {@code app.sms.provider=twilio}.
 */
@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "twilio")
public class TwilioSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsSender.class);

    @Override
    public void send(String phone, String message) {
        // TODO(real): construct the Twilio client from ACCOUNT_SID/AUTH_TOKEN
        //  and call Message.creator(new PhoneNumber(phone), ...).create().
        log.info("TwilioSmsSender stub: would send SMS to {} ({} chars)", phone, message.length());
    }
}
