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
 * Acceptance IT for the SMS diagnostic endpoint ({@code POST /dev/sms-test}):
 * enabled via {@code app.dev-sms-test.enabled=true}, JWT required, sends
 * through the active {@link ee.sheltermap.verification.SmsSender} (the
 * logging-only {@code DevSmsSender} in tests — no real gateway) and reports
 * the truth, including the E.164-normalized recipient. Mirrors the sibling
 * {@link EmailTestControllerIT}.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.dev-sms-test.enabled=true",
        // The allowlist is part of the endpoint's hardening (it must never be
        // an open relay). This IT tests the send path, so it opts into
        // allow-any; the allowlist IT covers the deny path itself.
        "app.dev-sms-test.allow-any=true",
        "app.sms.provider=dev",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class SmsTestControllerIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"SMS Testija\",\"email\":\"smstest@example.ee\",\"phone\":\"+37250008888\","
                    + "\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Test
    void sendsTestSmsAndReportsTruthfully() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // unauthenticated -> 401 (must never be an open relay)
        mvc.perform(post("/dev/sms-test").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"+37250001111\"}"))
                .andExpect(status().isUnauthorized());

        // minimal body -> default message, E.164 normalization of a spaced
        // 00-prefixed dialing string, dev sender reports the truth
        mvc.perform(post("/dev/sms-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"00372 500 011 11\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.provider").value("DevSmsSender"))
                .andExpect(jsonPath("$.to").value("00372 500 011 11"))
                .andExpect(jsonPath("$.toE164").value("+37250001111"))
                .andExpect(jsonPath("$.error").doesNotExist());

        // country code typed without the '+' is normalized too
        mvc.perform(post("/dev/sms-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"37250001111\",\"message\":\"Hello\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.toE164").value("+37250001111"));

        // blank to -> 400 with the uniform ErrorResponse shape
        mvc.perform(post("/dev/sms-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    private void registerUser() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"smstest@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
