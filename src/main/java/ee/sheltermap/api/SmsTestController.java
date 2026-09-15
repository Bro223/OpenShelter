package ee.sheltermap.api;

import ee.sheltermap.verification.PhoneNumbers;
import ee.sheltermap.verification.SmsSender;
import io.swagger.v3.oas.annotations.Hidden;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
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
 * Dev-only diagnostic endpoint — {@code POST /dev/sms-test} (mirror of
 * {@code /dev/email-test}, hardening pass: the phone channel had no way to be
 * exercised end-to-end without digging through logs). Sends a real SMS through
 * the active {@link SmsSender} and reports which provider handled it plus the
 * E.164-normalized recipient.
 *
 * <p><strong>Safety:</strong> disabled by default
 * ({@code app.dev-sms-test.enabled=true} / {@code DEV_SMS_TEST_ENABLED=true}
 * to enable), requires a valid JWT (falls under
 * {@code anyRequest().authenticated()}), and — unless
 * {@code app.dev-sms-test.allow-any=true} is explicitly set — only sends to
 * recipients listed in {@code app.dev-sms-test.allowed-recipients}.
 */
@RestController
@RequestMapping("/dev/sms-test")
@ConditionalOnProperty(name = "app.dev-sms-test.enabled", havingValue = "true")
// Dev-only relay (DevEndpointsGuard): hidden from the OpenAPI document so the
// API map never advertises a surface that is meant to be invisible.
@Hidden
public class SmsTestController {

    private static final Logger log = LoggerFactory.getLogger(SmsTestController.class);

    private final SmsSender activeSmsSender;
    private final Set<String> allowedRecipients;
    private final boolean allowAny;

    public SmsTestController(SmsSender activeSmsSender,
                             @Value("${app.dev-sms-test.allowed-recipients:}") String allowedRecipients,
                             @Value("${app.dev-sms-test.allow-any:false}") boolean allowAny) {
        this.activeSmsSender = Objects.requireNonNull(activeSmsSender, "activeSmsSender");
        this.allowedRecipients = Arrays.stream(allowedRecipients.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .map(s -> s.toLowerCase(Locale.ROOT))
                .collect(Collectors.toUnmodifiableSet());
        this.allowAny = allowAny;
    }

    @PostMapping
    @Hidden
    public SmsTestResult send(@Valid @RequestBody SmsTestRequest request) {
        String provider = activeSmsSender.getClass().getSimpleName();
        String toE164 = PhoneNumbers.normalizeE164(request.to());
        String key = toE164 == null ? request.to().toLowerCase(Locale.ROOT) : toE164.toLowerCase(Locale.ROOT);
        if (!allowAny && !allowedRecipients.contains(key)) {
            // 403 — same deny semantics as the mail mirror
            // (EmailTestController): an authenticated user must not turn the
            // diagnostic endpoint into an open SMS relay
            log.warn("[sms-test] rejected recipient {} (not in the allowlist)", request.to());
            throw new NotAuthorException("recipient is not in the sms-test allowlist");
        }
        log.info("[sms-test] provider={} to={} toE164={}", provider, request.to(), toE164);
        try {
            activeSmsSender.send(request.to(), request.message());
            return new SmsTestResult(provider, request.to(), toE164, true, null);
        } catch (RuntimeException ex) {
            log.error("[sms-test] send threw for {}: {}", request.to(), ex.getMessage());
            return new SmsTestResult(provider, request.to(), toE164, false, ex.getMessage());
        }
    }
}
