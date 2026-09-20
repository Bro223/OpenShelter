package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Development SMS channel: prints the code to the console so flows can be
 * exercised without a real gateway (free dev + CI). Deliberately logs the
 * code — that is the point of a dev sender; production senders must not.
 *
 * <p>Default {@code SmsSender} bean — selected via {@code app.sms.provider=dev}
 * (matchIfMissing), so exactly one {@code SmsSender} exists at runtime
 * (dev default | twilio).
 */
@Service
@ConditionalOnProperty(name = "app.sms.provider", havingValue = "dev", matchIfMissing = true)
public class DevSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(DevSmsSender.class);

    @Override
    public boolean send(String phone, String message) {
        log.info("[DEV SMS] to {}: {}", phone, message);
        return true;
    }
}
