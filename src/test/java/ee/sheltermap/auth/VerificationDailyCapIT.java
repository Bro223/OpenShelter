package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.InMemoryVerificationSendLog;
import ee.sheltermap.verification.SmtpSender;
import ee.sheltermap.verification.VerificationSendLog;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The service-level daily cap over HTTP: the per-IP bucket is raised so it
 * never fires, the cooldown is disabled, and the cap is 2 per UTC day — the
 * third request is rejected by the SEND LOG (not the bucket) and carries an
 * honest {@code Retry-After}: seconds until the next UTC midnight, where the
 * cap resets (always &gt; 0, so the client counts down instead of spaming).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.ratelimit.verify-capacity=1000",
        "app.ratelimit.verify-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=2",
        "app.mail.provider=dev"
})
@Transactional
class VerificationDailyCapIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Daily Cap Kasutaja\",\"email\":\"daily-cap@example.ee\",\"phone\":\"+37250006666\","
                    + "\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    InMemoryVerificationSendLog sendLog;

    @Autowired
    RecordingSmtpSender smtp;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        VerificationSendLog inMemoryVerificationSendLog() {
            return new InMemoryVerificationSendLog();
        }

        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }
    }

    @BeforeEach
    void clearFakes() {
        sendLog.clear();
        smtp.clear();
    }

    @Test
    void dailyCapThrottleCarriesRetryAfterUntilUtcMidnight() throws Exception {
        // register + login
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"daily-cap@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

        // two requests pass (daily cap 2, cooldown disabled)
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/verify/request")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"level\":\"EMAIL\"}"))
                    .andExpect(status().isAccepted());
        }

        // the third is rejected by the send log (DAILY CAP) — 429, uniform
        // shape, message naming the verification throttle, and an honest
        // Retry-After: seconds until the next UTC midnight, always > 0
        MvcResult throttled = mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many verification requests"))
                .andExpect(jsonPath("$.path").value("/verify/request"))
                .andReturn();
        String retryAfter = throttled.getResponse().getHeader("Retry-After");
        assertThat(retryAfter).isNotBlank();
        assertThat(Integer.parseInt(retryAfter)).isGreaterThan(0);

        // the throttled request sent nothing
        assertThat(smtp.sent()).hasSize(2);
    }
}
