package ee.sheltermap.verification;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Production e-mail channel: real SMTP via {@link JavaMailSender}
 * (spring-boot-starter-mail, smtp-pulse.com). Selected with
 * {@code app.mail.provider=smtp-pulse} (default: dev console sender).
 *
 * <p>Logs metadata only, never the message body — the payload carries the
 * one-time codes (verification, contact change, password reset).
 * Credentials come exclusively from env vars (spring.mail.username/password),
 * never from code.
 *
 * <p>Delivery failures are logged, never thrown: password-reset and
 * verification requests must "always succeed" (no account enumeration,
 * no 500 when the mail relay is down — see 01-TASK.md §5.10).
 */
@Service
@ConditionalOnProperty(name = "app.mail.provider", havingValue = "smtp-pulse")
public class SmtpPulseSmtpSender implements SmtpSender {

    private static final Logger log = LoggerFactory.getLogger(SmtpPulseSmtpSender.class);

    private final JavaMailSender mailSender;
    private final String from;

    public SmtpPulseSmtpSender(JavaMailSender mailSender,
                               @Value("${app.mail.from:${spring.mail.username:}}") String from) {
        this.mailSender = Objects.requireNonNull(mailSender, "mailSender");
        this.from = from;
    }

    @Override
    public void send(String email, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(from);
            mail.setTo(email);
            mail.setSubject("Shelter Map");
            mail.setText(message);
            mailSender.send(mail);
            log.info("SMTP e-mail sent to {} (subject 'Shelter Map')", email);
        } catch (MailException ex) {
            // Never surface delivery problems to callers: the API contract is
            // "reset/verify always succeeds" (anti-enumeration, no 500s).
            log.error("SMTP delivery to {} failed: {}", email, ex.getMessage());
        }
    }
}
