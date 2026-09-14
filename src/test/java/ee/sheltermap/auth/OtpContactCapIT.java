package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.InMemoryVerificationSendLog;
import ee.sheltermap.verification.RollingContactOtpLimiter;
import ee.sheltermap.verification.SmsSender;
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
 * The per-contact rolling OTP cap (abuse-limits M3 slice 2) over HTTP:
 * cap 2 per contact per rolling window. The per-IP token buckets are raised
 * so they never fire, and the per-(user, level) throttle is loosened
 * (cooldown off, daily cap 10) so only the CONTACT cap fires. A throttled
 * request sends nothing and carries an honest {@code Retry-After}.
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
        "app.verification.max-per-day=10",
        "app.limits.otp-per-contact-max=2"
})
@Transactional
class OtpContactCapIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    InMemoryVerificationSendLog sendLog;

    @Autowired
    RollingContactOtpLimiter contactLimiter;

    @Autowired
    RecordingSmtpSender smtp;

    @Autowired
    RecordingSmsSender sms;

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

        @Bean
        @Primary
        SmsSender smsSender() {
            return new RecordingSmsSender();
        }
    }

    @BeforeEach
    void clearFakes() {
        sendLog.clear();
        contactLimiter.clear();
        smtp.clear();
        sms.clear();
    }

    private String registerAndLogin(String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Contact Cap Kasutaja\",\"email\":\"" + email + "\",\"phone\":\"" + phone
                                + "\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void phoneCapThrottlesThirdRequestToTheSamePhone() throws Exception {
        String token = registerAndLogin("otp-phone@example.ee", "+37250007777");

        // two sends to the phone pass (contact cap 2)
        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/verify/request")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"level\":\"PHONE\"}"))
                    .andExpect(status().isAccepted());
        }

        // the third is rejected by the ROLLING CONTACT CAP — 429, uniform
        // shape, honest Retry-After (> 0; the window has barely elapsed)
        MvcResult throttled = mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"PHONE\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many verification requests"))
                .andExpect(jsonPath("$.path").value("/verify/request"))
                .andReturn();
        assertThat(Integer.parseInt(throttled.getResponse().getHeader("Retry-After"))).isGreaterThan(0);

        // the throttled request sent nothing
        assertThat(sms.sent()).hasSize(2);
    }

    @Test
    void emailCapThrottlesThirdRequestToTheSameEmail() throws Exception {
        String token = registerAndLogin("otp-email@example.ee", "+37250007778");

        for (int i = 0; i < 2; i++) {
            mvc.perform(post("/verify/request")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"level\":\"EMAIL\"}"))
                    .andExpect(status().isAccepted());
        }

        MvcResult throttled = mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many verification requests"))
                .andReturn();
        assertThat(Integer.parseInt(throttled.getResponse().getHeader("Retry-After"))).isGreaterThan(0);

        assertThat(smtp.sent()).hasSize(2);
    }

    @Test
    void registerEmailCapThrottlesRepeatedRegistration() throws Exception {
        String body = "{\"name\":\"Repeat Register\",\"email\":\"repeat-reg@example.ee\",\"phone\":\"+37250007779\","
                + "\"password\":\"s3cret123\"}";

        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated());
        // duplicate e-mail — still an ATTEMPT, so it counts toward the cap
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict());
        // the window is full (cap 2): 429 + Retry-After instead of another 409
        MvcResult throttled = mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many registration attempts with this e-mail"))
                .andExpect(jsonPath("$.path").value("/auth/register"))
                .andReturn();
        assertThat(Integer.parseInt(throttled.getResponse().getHeader("Retry-After"))).isGreaterThan(0);
    }
}
