package ee.sheltermap.verification;

import ee.sheltermap.app.AppInfo;
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
    public boolean send(String email, String message) {
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(from);
            mail.setTo(email);
            mail.setSubject(AppInfo.APP_DISPLAY_NAME);
            mail.setText(message);
            mailSender.send(mail);
            log.info("SMTP e-mail sent to {} (subject '{}')", maskEmail(email), AppInfo.APP_DISPLAY_NAME);
            return true;
        } catch (MailException ex) {
            // Never surfaced to callers: the API contract is
            // "reset/verify always succeeds" (anti-enumeration, no 500s).
            // The FALSE return value is the honest signal — the
            // verification flow consumes no daily slot for a refused
            // send (the other flows ignore it by design).
            log.error("SMTP delivery to {} failed", maskEmail(email), ex);
            return false;
        }
    }

    /**
     * Log-safe e-mail mask (PII): first character + {@code ***} + the
     * full domain, e.g. {@code janes.doe@example.com} → {@code j***@example.com}.
     * Logs must not carry the full address (it is a login contact +
     * account-recovery channel).
     */
    private static String maskEmail(String email) {
        if (email == null) {
            return "?";
        }
        int at = email.indexOf('@');
        if (at <= 0) {
            return "***";
        }
        return email.charAt(0) + "***" + email.substring(at);
    }
}
