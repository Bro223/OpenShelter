package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

/**
 * Development e-mail channel: prints the token to the console (free dev + CI).
 * Logging the code is the whole point of a dev sender — the production
 * senders must not. A real JavaMail implementation can replace this later.
 *
 * <p>Default {@code SmtpSender} bean — selected via
 * {@code app.mail.provider=dev} (matchIfMissing), so exactly one
 * {@code SmtpSender} exists at runtime (dev default | smtp-pulse).
 */
@Service
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "dev", matchIfMissing = true)
public class DevSmtpSender implements SmtpSender {

    private static final Logger log = LoggerFactory.getLogger(DevSmtpSender.class);

    @Override
    public boolean send(String email, String message) {
        log.info("[DEV SMTP] to {}: {}", email, message);
        return true;
    }
}
