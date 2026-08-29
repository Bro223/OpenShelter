package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Development SMS channel: prints the code to the console so flows can be
 * exercised without a real gateway (free dev + CI). Deliberately logs the
 * code — that is the point of a dev sender; production senders must not.
 */
public class DevSmsSender implements SmsSender {

    private static final Logger log = LoggerFactory.getLogger(DevSmsSender.class);

    @Override
    public void send(String phone, String message) {
        log.info("[DEV SMS] to {}: {}", phone, message);
    }
}
