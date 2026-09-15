package ee.sheltermap.api;

import ee.sheltermap.verification.SmtpSender;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Arrays;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Dev-only diagnostic endpoint — {@code POST /dev/email-test}. Sends a real
 * e-mail through the configured {@link JavaMailSender} (spring-boot-starter-mail)
 * and reports the truth about delivery, so you can verify the SMTP channel
 * end-to-end without digging through logs.
 *
 * <p><strong>Why a separate endpoint:</strong> the production senders
 * ({@code SmtpPulseSmtpSender}) deliberately swallow delivery failures
 * ("reset/verify always succeeds" — anti-enumeration, no 500s). A test
 * endpoint must NOT do that: {@code sent:false} + the relay error is exactly
 * the diagnostic you need.
 *
 * <p><strong>Safety (hardening pass):</strong> disabled by default
 * ({@code app.dev-email-test.enabled=true} / {@code DEV_EMAIL_TEST_ENABLED=true}
 * to enable), requires a valid JWT (falls under
 * {@code anyRequest().authenticated()}), and — unless
 * {@code app.dev-email-test.allow-any=true} is explicitly set — only sends to
 * recipients listed in {@code app.dev-email-test.allowed-recipients}. It must
 * never become an open e-mail relay on a public deploy.
 */
@RestController
@RequestMapping("/dev/email-test")
@ConditionalOnProperty(name = "app.dev-email-test.enabled", havingValue = "true")
// Dev-only relay (DevEndpointsGuard): hidden from the OpenAPI document so the
// API map never advertises a surface that is meant to be invisible.
@Hidden
public class EmailTestController {

    private static final Logger log = LoggerFactory.getLogger(EmailTestController.class);

    private final JavaMailSender mailSender;
    private final SmtpSender activeSmtpSender;
    private final String from;
    private final Set<String> allowedRecipients;
    private final boolean allowAny;

    public EmailTestController(JavaMailSender mailSender,
                               SmtpSender activeSmtpSender,
                               @Value("${app.mail.from:${spring.mail.username:}}") String from,
                               @Value("${app.dev-email-test.allowed-recipients:}") String allowedRecipients,
                               @Value("${app.dev-email-test.allow-any:false}") boolean allowAny) {
        this.mailSender = Objects.requireNonNull(mailSender, "mailSender");
        this.activeSmtpSender = Objects.requireNonNull(activeSmtpSender, "activeSmtpSender");
        this.from = from;
        this.allowedRecipients = Arrays.stream(allowedRecipients.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
        this.allowAny = allowAny;
    }

    @PostMapping
    @Hidden
    public EmailTestResult send(@Valid @RequestBody EmailTestRequest request) {
        String provider = activeSmtpSender.getClass().getSimpleName();
        if (!allowAny && !allowedRecipients.contains(request.to().toLowerCase(Locale.ROOT))) {
            log.warn("[email-test] rejected recipient {} (not in the allowlist)", request.to());
            throw new NotAuthorException("recipient is not in the email-test allowlist");
        }
        log.info("[email-test] provider={} from={} to={} subject={}", provider, from, request.to(), request.subject());
        try {
            SimpleMailMessage mail = new SimpleMailMessage();
            mail.setFrom(from);
            mail.setTo(request.to());
            mail.setSubject(request.subject());
            mail.setText(request.message());
            mailSender.send(mail);
            return new EmailTestResult(provider, from, request.to(), request.subject(), true, null);
        } catch (Exception ex) {
            log.error("[email-test] delivery to {} failed: {}", request.to(), ex.getMessage());
            return new EmailTestResult(provider, from, request.to(), request.subject(), false, ex.getMessage());
        }
    }
}
