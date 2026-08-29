package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.SmtpSender;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack MockMvc tests for the auth endpoints (Step 4 acceptance): real
 * Spring Security chain, real JWT filter, real services, real Postgres.
 * The rate limiter is raised to 1000 so these tests never trip it.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0"
})
@Transactional
class AuthApiIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Mari\",\"email\":\"mari@example.ee\",\"phone\":\"+37250000001\","
                    + "\"nationalIdCode\":\"49001010001\",\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingSmtpSender smtp;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }
    }

    @BeforeEach
    void clearSmtp() {
        smtp.clear();
    }

    @Test
    void registerThenLoginRoundTrip() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());

        // wrong password -> 401 with the generic message (no enumeration)
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("invalid credentials"))
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        // right password -> TokenResponse
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresIn").value(900));
    }

    @Test
    void refreshRotatesAndOldRefreshIsRejected() throws Exception {
        registerUser();
        String refreshToken = loginAndGetRefreshToken();

        MvcResult refreshResult = mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andReturn();
        String newRefreshToken = JsonPath.read(refreshResult.getResponse().getContentAsString(), "$.refreshToken");
        assertThat(newRefreshToken).isNotEqualTo(refreshToken);

        // the rotated-away token is now dead
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void logoutRevokesRefreshToken() throws Exception {
        registerUser();
        String refreshToken = loginAndGetRefreshToken();

        mvc.perform(post("/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void passwordResetFlowAlwaysSucceedsAndRevokesSessions() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        String refreshToken = loginAndGetRefreshToken();

        // request reset for a KNOWN email -> 200, and the token lands in the captured mail
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk());
        String token = TestTokens.fromResetUrl(smtp.last().message());

        // confirm -> 200
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"newPassword\":\"newpass\"}"))
                .andExpect(status().isOk());

        // the pre-reset session is dead
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());

        // login with the new password works
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"newpass\"}"))
                .andExpect(status().isOk());

        // the token is single-use -> second confirm is 400
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"" + token + "\",\"newPassword\":\"again\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void requestResetForUnknownEmailStillReturns200() throws Exception {
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@example.ee\"}"))
                .andExpect(status().isOk());
        assertThat(smtp.sent()).isEmpty();
    }

    @Test
    void protectedEndpointReturns401WithoutTokenAndHealthStaysPublic() throws Exception {
        mvc.perform(post("/api/shelters"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk());
    }

    @Test
    void protectedEndpointAcceptsAValidAccessToken() throws Exception {
        registerUser();
        String accessToken = loginAndGetAccessToken();
        // authenticated -> passes the security chain; unverified -> 403
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Test Shelter\",\"latitude\":59.4,\"longitude\":24.7}"))
                // Step 6 added the real handler: the token is accepted (reaches the
                // controller) and an unverified account is forbidden (403) instead of
                // the Step-4 no-handler 404.
                .andExpect(status().isForbidden());
    }

    private void registerUser() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
    }

    private String loginAndGetRefreshToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.refreshToken");
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
