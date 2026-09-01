package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the SMTP diagnostic endpoint ({@code POST /dev/email-test}):
 * enabled via {@code app.dev-email-test.enabled=true}, JWT required, sends a
 * real message through the {@link JavaMailSender} and reports the truth.
 * The mail sender is swapped for a capturing fake (no real SMTP in tests).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.dev-email-test.enabled=true",
        // The allowlist is part of the endpoint's hardening (it must never be
        // an open relay). This IT tests the send path, so it opts into
        // allow-any; a separate assertion below verifies the allowlist itself.
        "app.dev-email-test.allow-any=true",
        "app.mail.provider=dev",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class EmailTestControllerIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Mail Testija\",\"email\":\"mailtest@example.ee\",\"phone\":\"+37250007777\","
                    + "\"nationalIdCode\":\"49001017777\",\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    FakeJavaMailSender mail;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        JavaMailSender javaMailSender() {
            return new FakeJavaMailSender();
        }
    }

    /** Capturing {@link JavaMailSender} — records the last message instead of dialling out. */
    static class FakeJavaMailSender extends JavaMailSenderImpl {
        SimpleMailMessage last;

        @Override
        public void send(SimpleMailMessage simpleMessage) {
            this.last = simpleMessage;
        }
    }

    @Test
    void sendsTestEmailAndReportsTruthfully() throws Exception {
        registerUser();
        String token = loginAndGetAccessToken();

        // unauthenticated -> 401 (must never be an open relay)
        mvc.perform(post("/dev/email-test").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"someone@example.com\"}"))
                .andExpect(status().isUnauthorized());

        // minimal body -> defaults for subject/message
        mvc.perform(post("/dev/email-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"someone@example.com\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.provider").value("DevSmtpSender"))
                .andExpect(jsonPath("$.to").value("someone@example.com"))
                .andExpect(jsonPath("$.subject").value("OpenShelter test"))
                .andExpect(jsonPath("$.error").doesNotExist());

        assertThat(mail.last).isNotNull();
        assertThat(mail.last.getTo()).containsExactly("someone@example.com");
        assertThat(mail.last.getSubject()).isEqualTo("OpenShelter test");
        assertThat(mail.last.getText()).isEqualTo("Test message from OpenShelter");

        // explicit subject/message are honoured
        mvc.perform(post("/dev/email-test")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"to\":\"boss@example.com\",\"subject\":\"Custom\","
                                + "\"message\":\"Hello boss\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(true))
                .andExpect(jsonPath("$.subject").value("Custom"));

        assertThat(mail.last.getTo()).containsExactly("boss@example.com");
        assertThat(mail.last.getText()).isEqualTo("Hello boss");

        // blank to -> 400 with the uniform ErrorResponse shape
        mvc.perform(post("/dev/email-test")
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
                        .content("{\"emailOrPhone\":\"mailtest@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
