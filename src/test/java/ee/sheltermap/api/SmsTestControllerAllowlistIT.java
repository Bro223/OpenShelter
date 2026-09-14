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
 * The allowlist hardening of {@code POST /dev/sms-test}: with
 * {@code allow-any=false} (the safe default) only recipients listed in
 * {@code app.dev-sms-test.allowed-recipients} may receive test SMSes — an
 * authenticated user must not turn the diagnostic endpoint into an open
 * relay. Mirrors the sibling {@link EmailTestControllerAllowlistIT}; the
 * deny is a 403 (same semantics as the mail mirror), not a 200 with
 * {@code sent:false}.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.dev-sms-test.enabled=true",
        "app.dev-sms-test.allow-any=false",
        "app.dev-sms-test.allowed-recipients=+37250001111",
        "app.sms.provider=dev",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class SmsTestControllerAllowlistIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"SMS Testija\",\"email\":\"smstest@example.ee\",\"phone\":\"+37250008888\","
                    + "\"password\":\"s3cret123\"}";

    @Autowired
    MockMvc mvc;

    @Test
    void unlistedRecipientIsRejected() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // unauthenticated -> 401 (must never be an open relay)
        mvc.perform(post("/dev/sms-test").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"+37250001111\"}"))
                .andExpect(status().isUnauthorized());

        // recipient NOT in the allowlist -> 403 (uniform error shape)
        mvc.perform(post("/dev/sms-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"+37260012345\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403));

        // the SAME number, spelled differently, IS in the allowlist once
        // E.164-normalized -> allowed through to the sender
        mvc.perform(post("/dev/sms-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"00372 500 011 11\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.provider").value("DevSmsSender"))
                .andExpect(jsonPath("$.toE164").value("+37250001111"));
    }

    private void registerUser() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"smstest@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
