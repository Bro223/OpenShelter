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
 * Anti-spam throttle over HTTP (Twilio plan): with a tight per-IP bucket and
 * a tight daily cap, the third verification request in a burst returns 429
 * with the uniform {@code ErrorResponse}. Which layer fired (IP bucket vs
 * daily cap vs cooldown) is attributed precisely in VerificationServiceTest —
 * here we prove the HTTP surface behaves.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.ratelimit.verify-capacity=2",
        "app.ratelimit.verify-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=2",
        "app.mail.provider=dev"
})
@Transactional
class VerificationThrottleIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Throttle Kasutaja\",\"email\":\"throttle@example.ee\",\"phone\":\"+37250007777\","
                    + "\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    InMemoryVerificationSendLog sendLog;

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
    }

    @Test
    void burstOfVerificationRequestsIsThrottledWith429() throws Exception {
        // register + login
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"throttle@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

        // two requests pass (per-IP bucket capacity 2, daily cap 2)
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/verify/request")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"level\":\"EMAIL\"}"))
                    .andExpect(status().isAccepted());
        }

        // the third is throttled by the per-IP TOKEN BUCKET (capacity 2, no
        // refill) — 429 with the uniform ErrorResponse shape. The bucket
        // cannot compute a wait time, so no Retry-After header (unlike the
        // service-level throttles, which the daily-cap IT covers).
        MvcResult throttled = mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many requests"))
                .andExpect(jsonPath("$.path").value("/verify/request"))
                .andReturn();
        assertThat(throttled.getResponse().getHeader("Retry-After")).isNull();
    }
}
