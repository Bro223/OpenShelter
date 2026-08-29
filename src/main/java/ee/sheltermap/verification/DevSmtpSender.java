package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Development e-mail channel: prints the token to the console (free dev + CI).
 * Deliberately logs the code — that is the point of a dev sender; production
 * senders must not. A real JavaMail implementation can replace this later.
 */
@Service
public class DevSmtpSender implements SmtpSender {

    private static final Logger log = LoggerFactory.getLogger(DevSmtpSender.class);

    @Override
    public void send(String email, String message) {
        log.info("[DEV SMTP] to {}: {}", email, message);
    }
}
