package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The allowlist hardening of {@code POST /dev/email-test}: with
 * {@code allow-any=false} (the safe default) only recipients listed in
 * {@code app.dev-email-test.allowed-recipients} may receive test mail — an
 * authenticated user must not turn the diagnostic endpoint into a spam relay.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.dev-email-test.enabled=true",
        "app.dev-email-test.allow-any=false",
        "app.dev-email-test.allowed-recipients=allowed@example.com",
        "app.mail.provider=dev",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class EmailTestControllerAllowlistIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Mail Testija\",\"email\":\"mailtest@example.ee\",\"phone\":\"+37250007777\","
                    + "\"nationalIdCode\":\"49001017777\",\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Test
    void unlistedRecipientIsRejected() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // recipient NOT in the allowlist -> 403 (uniform error shape)
        mvc.perform(post("/dev/email-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"stranger@example.com\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // recipient in the allowlist -> allowed through to the sender
        mvc.perform(post("/dev/email-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"allowed@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.to").value("allowed@example.com"));
    }

    private void registerUser() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mailtest@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
