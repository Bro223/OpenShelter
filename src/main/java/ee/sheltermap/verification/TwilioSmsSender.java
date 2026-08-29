package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Production SMS channel via the Twilio SDK.
 *
 * <p>Step 2 stubs the SDK call — no credentials exist in dev/CI. Wire the
 * real client here when Twilio credentials are available (see TODO). The
 * stub logs metadata only, never the message payload (it carries the OTP).
 */
public class TwilioSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(TwilioSmsSender.class);

    @Override
    public void send(String phone, String message) {
        // TODO(real): construct the Twilio client from ACCOUNT_SID/AUTH_TOKEN
        //  and call Message.creator(new PhoneNumber(phone), ...).create().
        log.info("TwilioSmsSender stub: would send SMS to {} ({} chars)", phone, message.length());
    }
}
