package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.SmsSender;
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

import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the cross-channel contact-change HTTP surface: an email
 * change is verified by an SMS code sent to the current phone; a phone change
 * by an email code sent to the current email. Real security chain + real
 * Postgres; both channels captured by @Primary recording senders.
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
        "app.ratelimit.change-capacity=1000",
        "app.ratelimit.change-refill-per-second=0",
        "app.mail.provider=dev",
        "app.sms.provider=dev"
})
@Transactional
class AccountControllerIT extends AbstractPersistenceIT {

    private static final Pattern CODE = Pattern.compile("code: (\\d{6})");
    private static final Pattern TOKEN = Pattern.compile("token: (\\S+)");

    private static final String REGISTER_BODY =
            "{\"name\":\"Kontakt Muutus\",\"email\":\"kontakt@example.ee\",\"phone\":\"+37250004444\","
                    + "\"nationalIdCode\":\"49001014444\",\"password\":\"s3cret\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    RecordingSmsSender sms;

    @Autowired
    RecordingSmtpSender smtp;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        SmsSender smsSender() {
            return new RecordingSmsSender();
        }

        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }
    }

    @BeforeEach
    void clear() {
        sms.clear();
        smtp.clear();
    }

    private String registerAndLogin() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content(REGISTER_BODY))
                .andExpect(status().isCreated());
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"kontakt@example.ee\",\"password\":\"s3cret\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    private static String codeFrom(String message) {
        Matcher m = CODE.matcher(message);
        assertThat(m.find()).as("message contains a 6-digit code: %s", message).isTrue();
        return m.group(1);
    }

    @Test
    void emailChangeIsVerifiedBySmsToCurrentPhone() throws Exception {
        String token = registerAndLogin();

        // endpoints require a JWT
        mvc.perform(post("/account/email-change/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isUnauthorized());

        // request -> SMS to the CURRENT phone (cross-channel)
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isAccepted());
        assertThat(sms.last()).isNotNull();
        assertThat(sms.last().phone()).isEqualTo("+37250004444");
        assertThat(smtp.sent()).isEmpty();
        String code = codeFrom(sms.last().message());

        // wrong code -> 400, uniform error shape
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"000000\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Bad Request"));

        // correct code -> 200; email persisted
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());
        assertThat(users.findByEmail("uus@example.ee")).isNotNull();
        assertThat(users.findByEmail("kontakt@example.ee")).isNull();

        // the same value again is now "equals current" -> 400
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isBadRequest());

        // a DIFFERENT account's email -> 409 (already in use)
        RegisteredUser other = new RegisteredUser("Teine Kasutaja", "teine@example.ee",
                "+37250005555", "49001015555");
        users.save(other);
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"teine@example.ee\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void phoneChangeIsVerifiedByEmailToCurrentEmail() throws Exception {
        String token = registerAndLogin();

        mvc.perform(post("/account/phone-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPhone\":\"55507777\"}"))
                .andExpect(status().isAccepted());

        // cross-channel: the EMAIL goes to the current email
        assertThat(smtp.last()).isNotNull();
        assertThat(smtp.last().email()).isEqualTo("kontakt@example.ee");
        assertThat(sms.sent()).isEmpty();
        String code = codeFrom(smtp.last().message());

        mvc.perform(post("/account/phone-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isOk());

        // phone persisted in E.164
        assertThat(users.findByPhone("+37255507777")).isNotNull();
        assertThat(users.findByPhone("+37250004444")).isNull();
    }

    @Test
    void changeRequestRejectsSameAsCurrentAndDuplicate() throws Exception {
        String token = registerAndLogin();

        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"kontakt@example.ee\"}"))
                .andExpect(status().isBadRequest());

        mvc.perform(post("/account/phone-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPhone\":\"+372 5000 4444\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void resendWithinCooldownReturns429() throws Exception {
        String token = registerAndLogin();

        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isAccepted());

        // immediate second request -> 429 (cooldown anchored on the pending row)
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"teine@example.ee\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error").value("Too Many Requests"));
    }

    @Test
    void confirmWithoutPendingChangeReturns400() throws Exception {
        String token = registerAndLogin();

        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"123456\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void verificationClaimsSurviveAnEmailChange() throws Exception {
        // The change must not destroy existing verification claims: register,
        // verify by email, then change the email via SMS — claims persist.
        String token = registerAndLogin();
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());
        Matcher tm = TOKEN.matcher(smtp.last().message());
        assertThat(tm.find()).as("verification email carries a token: %s", smtp.last().message()).isTrue();
        String verifyCode = tm.group(1);
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + verifyCode + "\"}"))
                .andExpect(status().isOk());

        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isAccepted());
        String changeCode = codeFrom(sms.last().message());
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + changeCode + "\"}"))
                .andExpect(status().isOk());

        RegisteredUser user = users.findByEmail("uus@example.ee");
        assertThat(user).isNotNull();
        assertThat(user.levels()).contains(ee.sheltermap.domain.VerificationLevel.EMAIL);
        assertThat(user.canWrite()).isTrue();
    }
}
