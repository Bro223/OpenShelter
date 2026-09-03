package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
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
 * Acceptance IT for the verification HTTP surface: register -> login ->
 * request EMAIL verification -> confirm -> the write path opens (POST
 * /api/shelters 201). Runs against the real security chain + real Postgres;
 * the e-mail is captured by the @Primary recording sender.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.ratelimit.verify-capacity=1000",
        "app.ratelimit.verify-refill-per-second=0",
        "app.mail.provider=dev"
})
@Transactional
class VerificationControllerIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Veri Kasutaja\",\"email\":\"veri@example.ee\",\"phone\":\"+37250008888\","
                    + "\"nationalIdCode\":\"49001018888\",\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    RecordingSmtpSender smtp;

    @Autowired
    InMemoryVerificationSendLog sendLog;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }

        @Bean
        @Primary
        VerificationSendLog inMemoryVerificationSendLog() {
            return new InMemoryVerificationSendLog();
        }
    }

    @BeforeEach
    void clearFakes() {
        smtp.clear();
        sendLog.clear();
    }

    @Test
    void verificationIsReachableOverHttpAndUnlocksTheWritePath() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // /verify/** requires a JWT
        mvc.perform(post("/verify/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isUnauthorized());

        // request email verification -> 202, code delivered via the channel
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());

        String message = smtp.last().message();
        assertThat(message).contains("verification token: ");
        String code = message.substring(message.lastIndexOf(' ') + 1);

        // resend within the cooldown window (default 60s) -> 429, uniform shape
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"));

        // wrong code -> 400 with the uniform ErrorResponse shape
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"WRONG123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"));

        // right code -> 200; the claim is persisted
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());

        RegisteredUser user = users.findByEmail("veri@example.ee");
        assertThat(user).isNotNull();
        assertThat(user.levels()).contains(VerificationLevel.EMAIL);
        assertThat(user.canWrite()).isTrue();

        // SMART_ID is rejected up front (stub in v1)
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"SMART_ID\"}"))
                .andExpect(status().isBadRequest());

        // the write path now works over HTTP
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"HTTP Verified Varjend\",\"latitude\":59.4372,\"longitude\":24.7453}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("USER"));
    }

    @Test
    void reVerifyingAnAlreadyVerifiedLevelIsAConflictAndIdempotent() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // first verification round succeeds
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());
        String firstMessage = smtp.last().message();
        String firstCode = firstMessage.substring(firstMessage.lastIndexOf(' ') + 1);
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + firstCode + "\"}"))
                .andExpect(status().isOk());

        // P1 fix: requesting the already-verified level again -> 409, no code sent
        int sentBefore = smtp.sent().size();
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
        assertThat(smtp.sent()).hasSize(sentBefore);

        // P1 fix: re-confirming an already-verified level is an idempotent no-op
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"000000\"}"))
                .andExpect(status().isOk());
    }

    private void registerUser() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"veri@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
