package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.verification.SmsSender;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Controller-level regression for the send result: the
 * {@link SmsSender#send} contract is "false on failure, never throws"
 * (the production senders log the provider error themselves), so the
 * diagnostic endpoint must PROPAGATE the boolean — the uncommitted
 * signature change once discarded it and the endpoint answered
 * {@code sent:true} for a refused send, defeating its entire purpose
 * (the mail mirror {@code /dev/email-test} stays the reference behaviour:
 * {@code sent:false} + the reason IS the diagnostic).
 */
class SmsTestControllerTest {

    private static final String BODY = "{\"to\":\"00372 500 011 11\"}";

    private static MockMvc mvcOf(SmsSender sender) {
        // allowAny=true — the allowlist is covered by SmsTestControllerIT/
        // SmsTestControllerAllowlistIT; here only the send result matters.
        // Explicit JSON converter: the classpath also carries
        // jackson-dataformat-xml (via swagger-core), and this Spring build's
        // standalone defaults order the XML converter first — the app's
        // real converters (Boot) answer JSON.
        return MockMvcBuilders.standaloneSetup(new SmsTestController(sender, "", true))
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .build();
    }

    private static String send(SmsSender sender) throws Exception {
        MvcResult result = mvcOf(sender)
                .perform(post("/dev/sms-test").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getContentAsString();
    }

    @Test
    void anAcceptedSendReportsSentTrue() throws Exception {
        mvcOf(new AcceptingSender())
                .perform(post("/dev/sms-test").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.provider").value("AcceptingSender"))
                .andExpect(jsonPath("$.toE164").value("+37250001111"))
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    @Test
    void aChannelRefusalReportsSentFalseWithTheReason() throws Exception {
        // the regression: before the fix the boolean was discarded and
        // this answered sent:true with no error
        mvcOf(new RefusingSender())
                .perform(post("/dev/sms-test").contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(false))
                .andExpect(jsonPath("$.provider").value("RefusingSender"))
                .andExpect(jsonPath("$.toE164").value("+37250001111"))
                .andExpect(jsonPath("$.error").value(
                        "the sms channel did not accept the message (the provider error is in the app log)"));
    }

    @Test
    void aThrowingSenderStillReportsSentFalseWithTheExceptionMessage() throws Exception {
        // the RuntimeException path (a dev/test sender misbehaving) keeps
        // the pre-existing behaviour: sent:false + the exception message
        String json = send((phone, message) -> {
            throw new IllegalStateException("relay 503");
        });
        Object sent = JsonPath.read(json, "$.sent");
        Object error = JsonPath.read(json, "$.error");
        assertThat(sent).isEqualTo(false);
        assertThat(error).isEqualTo("relay 503");
    }

    @Test
    void theRefusalReasonCarriesNoContact() throws Exception {
        // the diagnostic's ERROR field must not repeat the recipient
        // (it already rides in the "to"/"toE164" fields of the same body)
        String error = JsonPath.read(send(new RefusingSender()), "$.error").toString();
        assertThat(error).doesNotContain("500 011 11");
        assertThat(error).doesNotContain("+37250001111");
    }

    /** Named (not lambda) so the response's provider field is deterministic. */
    private static final class AcceptingSender implements SmsSender {
        @Override
        public boolean send(String phone, String message) {
            return true;
        }
    }

    /** Named (not lambda) so the response's provider field is deterministic. */
    private static final class RefusingSender implements SmsSender {
        @Override
        public boolean send(String phone, String message) {
            return false;
        }
    }
}
