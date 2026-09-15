package ee.sheltermap.config;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * The prod-closure proof (SW-H3): "readable in dev WITHOUT weakening the
 * guards" must hold by construction, not by review.
 *
 * <p>The context boots under a NON-dev profile ({@code production} — the
 * fail-closed guards are all satisfied: a strong non-default
 * {@code app.jwt.secret} here, the fixed test PII keys from
 * {@link AbstractPersistenceIT}, and both dev-diagnostic flags left off).
 * The docs flag stays at its yml default (false), so the springdoc
 * endpoints are absent AND fall outside the dev/test-only docs permit
 * (SW-C1) — every request to them must hit the default-deny
 * {@code anyRequest().authenticated()} rule.
 *
 * <p>The explicit pins below are load-bearing: spring-dotenv loads the
 * developer's local {@code .env} into the test environment (lowest
 * precedence, but it feeds every {@code ${…:}} placeholder in the test yml)
 * — and a real dev {@code .env} carries {@code SPRINGDOC_ENABLED=true},
 * {@code DEV_EMAIL_TEST_ENABLED=true} and {@code DEV_SMS_TEST_ENABLED=true}.
 * Without the pins, a non-dev context would be refused by
 * {@link DevEndpointsGuard}/{@link ApiDocsGuard} before the test could
 * assert anything — and with them, the test proves the closure for ANY
 * local {@code .env}.
 *
 * <p>The sender pins (ORCH-4) close the same gap one door further in:
 * {@link DevSenderGuard} refuses a non-dev profile whose mail/sms provider
 * is blank/{@code dev}, so without them the boot would depend on the
 * untracked {@code .env} supplying {@code MAIL_PROVIDER=smtp-pulse} /
 * {@code SMS_PROVIDER=twilio}. The dummy Twilio values exist only to satisfy
 * {@code TwilioSmsSender}'s fail-fast constructor — nothing in this IT
 * sends a message.
 *
 * <p>Assertion: {@code /v3/api-docs} and {@code /swagger-ui/index.html}
 * are NEVER 200 — 401 (the security chain answers first) or 404 (the
 * endpoint is absent) are both acceptable; 200 fails the build.
 */
@AutoConfigureMockMvc
@ActiveProfiles("production")
@TestPropertySource(properties = {
        // 32 bytes, not the published dev default — ProdJwtGuard requires
        // exactly this to let a non-dev profile boot at all.
        "app.jwt.secret=0123456789abcdef0123456789abcdef0123",
        // the real sender providers (DevSenderGuard refuses blank/dev on a
        // non-dev profile) + the non-live credentials its fail-fast
        // constructors require — pinned so no untracked .env is needed
        "app.mail.provider=smtp-pulse",
        "app.sms.provider=twilio",
        "TWILIO_ACCOUNT_SID=AC00000000000000000000000000000000",
        "TWILIO_AUTH_TOKEN=00000000000000000000000000000000",
        "TWILIO_MESSAGING_SERVICE_SID=MG00000000000000000000000000000000",
        // the dev .env activates both relays — a production context must
        // not inherit them (DevEndpointsGuard would refuse the boot)
        "app.dev-email-test.enabled=false",
        "app.dev-sms-test.enabled=false",
        // the dev .env enables the docs — the production closure under test
        // is precisely the default-off state (ApiDocsGuard + no permit)
        "springdoc.api-docs.enabled=false",
        "springdoc.swagger-ui.enabled=false"})
class ApiDocsProdClosureIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Test
    void apiDocsNeverAnswer200UnderANonDevProfile() throws Exception {
        int status = mvc.perform(get("/v3/api-docs")).andReturn().getResponse().getStatus();
        assertThat(status)
                .as("GET /v3/api-docs under the production profile must never be 200")
                .isIn(401, 404);
    }

    @Test
    void apiDocsYamlNeverAnswers200UnderANonDevProfile() throws Exception {
        int status = mvc.perform(get("/v3/api-docs.yaml")).andReturn().getResponse().getStatus();
        assertThat(status)
                .as("GET /v3/api-docs.yaml under the production profile must never be 200")
                .isIn(401, 404);
    }

    @Test
    void swaggerUiNeverAnswers200UnderANonDevProfile() throws Exception {
        int status = mvc.perform(get("/swagger-ui/index.html")).andReturn().getResponse().getStatus();
        assertThat(status)
                .as("GET /swagger-ui/index.html under the production profile must never be 200")
                .isIn(401, 404);
    }
}
