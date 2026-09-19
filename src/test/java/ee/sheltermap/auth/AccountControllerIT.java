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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
        "app.sms.provider=dev",
        // The env-provisioned admin (the refused contact-change case):
        // explicit per class — a plain test context must never seed.
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1"
})
@Transactional
class AccountControllerIT extends AbstractPersistenceIT {

    private static final Pattern CODE = Pattern.compile("code: (\\d{6})");
    private static final Pattern TOKEN = Pattern.compile("verification code: (\\S+)");

    private static final String REGISTER_BODY =
            "{\"name\":\"Kontakt Muutus\",\"email\":\"kontakt@example.ee\",\"phone\":\"+37250004444\","
                    + "\"password\":\"s3cret123\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    PendingContactChangeRepository changes;

    @Autowired
    AdminSeeder seeder;

    @BeforeEach
    void seedAdmin() {
        // Create-if-absent (idempotent): guarantees the provisioned admin
        // exists even if a sibling IT deliberately wiped the shared tables.
        seeder.run(null);
    }

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
                        .content("{\"emailOrPhone\":\"kontakt@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    private static String codeFrom(String message) {
        Matcher m = CODE.matcher(message);
        assertThat(m.find()).as("message contains a 6-digit code: %s", message).isTrue();
        return m.group(1);
    }

    private String adminToken() throws Exception {
        // The env-provisioned admin logs in through the normal /auth/login —
        // the very path the protection must not break.
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void theProvisionedAdminCannotChangeContacts() throws Exception {
        // The admin's contacts are the environment's: the e-mail is the
        // provisioning anchor the seeder keys on (re-pointing it would fork
        // the env identity into a second admin row), and the account has no
        // phone route. Every entry point is refused with 403 naming the env
        // provisioning — a DIRECT API call must fail, not just the hidden
        // button — and nothing is sent or persisted.
        String admin = adminToken();

        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"usurper@example.ee\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(ContactChangeService.PROVISIONED_ADMIN_CONTACT_MESSAGE));
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"123456\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(ContactChangeService.PROVISIONED_ADMIN_CONTACT_MESSAGE));
        mvc.perform(post("/account/phone-change/request")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPhone\":\"+37251111111\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(ContactChangeService.PROVISIONED_ADMIN_CONTACT_MESSAGE));
        mvc.perform(post("/account/phone-change/confirm")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"123456\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(ContactChangeService.PROVISIONED_ADMIN_CONTACT_MESSAGE));

        assertThat(sms.sent()).as("no SMS left the app").isEmpty();
        assertThat(smtp.sent()).as("no e-mail left the app").isEmpty();
        // the admin's identity is exactly what the environment gave it
        assertThat(users.findByEmail("admin@example.ee")).isNotNull();
        assertThat(users.findByPhone("+37251111111")).isNull();
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
        String wrong = code.equals("000000") ? "000001" : "000000";
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + wrong + "\"}"))
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
                "+37250005555");
        users.save(other);
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"teine@example.ee\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void wrongCodesLockOutTheConfirmEndpointAndPersistAttempts() throws Exception {
        // The confirm endpoint is NOT rate-bucketed,
        // so the 5-attempt lockout on the pending row is the only
        // brute-force guard. Every failed attempt must PERSIST across calls
        // — a throw inside @Transactional rolls the increment back on
        // each wrong code, so the lockout is unreachable over HTTP.
        String token = registerAndLogin();
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"uus@example.ee\"}"))
                .andExpect(status().isAccepted());
        String code = codeFrom(sms.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/account/email-change/confirm")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"code\":\"" + wrong + "\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid code"));
        }

        // the 6th: locked out — the right code is rejected by the same guard
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + code + "\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Too many attempts, request a new code"));

        // the five increments survived all the failed calls (visible via
        // the repository) and the email is unchanged
        RegisteredUser user = users.findByEmail("kontakt@example.ee");
        PendingContactChange pending = changes
                .findByUserIdAndType(user.getId(), ee.sheltermap.domain.ContactChangeType.EMAIL_CHANGE)
                .orElseThrow();
        assertThat(pending.getAttempts()).isEqualTo(5);
        assertThat(users.findByEmail("uus@example.ee")).isNull();
    }

    @Test
    void confirmChangeReturns409WhenTheTargetWasClaimedInTheMeantime() throws Exception {
        String tokenA = registerAndLogin();

        // A requests an email change to a free address
        mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"vaidlustatud@example.ee\"}"))
                .andExpect(status().isAccepted());
        String changeCode = codeFrom(sms.last().message());

        // The race: another account claims that address before A confirms
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Konkurent\",\"email\":\"vaidlustatud@example.ee\","
                                + "\"phone\":\"+37250007777\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());

        // A's confirm must surface as 409 (uniform ErrorResponse), never 500
        mvc.perform(post("/account/email-change/confirm")
                        .header("Authorization", "Bearer " + tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"code\":\"" + changeCode + "\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void phoneChangeIsVerifiedByEmailToCurrentEmail() throws Exception {
        String token = registerAndLogin();

        mvc.perform(post("/account/phone-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newPhone\":\"55507777\"}"))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.resendAvailableAfterSeconds").value(60));

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
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.resendAvailableAfterSeconds").value(60));

        // immediate second request -> 429 (cooldown anchored on the pending row),
        // uniform body (all five fields) + exact Retry-After countdown in 1..cooldown
        MvcResult throttled = mvc.perform(post("/account/email-change/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"newEmail\":\"teine@example.ee\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many verification requests"))
                .andExpect(jsonPath("$.path").value("/account/email-change/request"))
                .andReturn();
        String retryAfter = throttled.getResponse().getHeader("Retry-After");
        assertThat(retryAfter).isNotBlank();
        assertThat(Integer.parseInt(retryAfter)).isBetween(1, 60);
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
        assertThat(tm.find()).as("verification email carries a code: %s", smtp.last().message()).isTrue();
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

    // ---- GET /account/me -------------------------------------------------

    @Test
    void meReturnsTheStoredProfileWithRealClaims() throws Exception {
        String token = registerAndLogin();

        // unauthenticated -> 401, no profile data leaks
        mvc.perform(get("/account/me")).andExpect(status().isUnauthorized());

        // before any verification: all three fields, empty claim set
        mvc.perform(get("/account/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Kontakt Muutus"))
                .andExpect(jsonPath("$.email").value("kontakt@example.ee"))
                .andExpect(jsonPath("$.phone").value("+37250004444"))
                .andExpect(jsonPath("$.levels").isEmpty());

        // verify EMAIL via the dev sender: the real claim set comes back
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());
        Matcher tm = TOKEN.matcher(smtp.last().message());
        assertThat(tm.find()).as("verification email carries a code: %s", smtp.last().message()).isTrue();
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + tm.group(1) + "\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/account/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.levels.length()").value(1))
                .andExpect(jsonPath("$.levels[0]").value("EMAIL"));
    }

    // ---- PUT /account/profile ---------------------------------------------

    @Test
    void profileUpdatePersistsNameAndReturnsTheFreshProfile() throws Exception {
        String token = registerAndLogin();

        mvc.perform(put("/account/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Korrektitud Nimi\","
                                + "\"currentPassword\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Korrektitud Nimi"))
                // untouched fields come back unchanged
                .andExpect(jsonPath("$.email").value("kontakt@example.ee"))
                .andExpect(jsonPath("$.phone").value("+37250004444"));

        // persisted (the stored profile reflects the edit)
        RegisteredUser stored = users.findByEmail("kontakt@example.ee");
        assertThat(stored).isNotNull();
        assertThat(stored.getData().name()).isEqualTo("Korrektitud Nimi");
    }

    @Test
    void profileUpdateWithWrongCurrentPasswordIs401AndChangesNothing() throws Exception {
        String token = registerAndLogin();

        mvc.perform(put("/account/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Väline Isik\","
                                + "\"currentPassword\":\"not-the-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Current password is incorrect"));

        RegisteredUser stored = users.findByEmail("kontakt@example.ee");
        assertThat(stored.getData().name()).isEqualTo("Kontakt Muutus");
    }

    @Test
    void profileUpdateRejectsBlankNameWith400() throws Exception {
        String token = registerAndLogin();

        mvc.perform(put("/account/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"   \","
                                + "\"currentPassword\":\"s3cret123\"}"))
                .andExpect(status().isBadRequest());

        RegisteredUser stored = users.findByEmail("kontakt@example.ee");
        assertThat(stored.getData().name()).isEqualTo("Kontakt Muutus");
    }

    @Test
    void profileUpdateWithoutTokenIs401() throws Exception {
        registerAndLogin();

        mvc.perform(put("/account/profile")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Väline Isik\","
                                + "\"currentPassword\":\"s3cret123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void profileNameChangeDoesNotClearVerificationClaims() throws Exception {
        // A name edit must leave existing verification claims intact.
        String token = registerAndLogin();
        mvc.perform(post("/verify/request")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\"}"))
                .andExpect(status().isAccepted());
        Matcher tm = TOKEN.matcher(smtp.last().message());
        assertThat(tm.find()).as("verification email carries a code: %s", smtp.last().message()).isTrue();
        mvc.perform(post("/verify/confirm")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"level\":\"EMAIL\",\"code\":\"" + tm.group(1) + "\"}"))
                .andExpect(status().isOk());

        mvc.perform(put("/account/profile")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Kontakt Muutus\","
                                + "\"currentPassword\":\"s3cret123\"}"))
                .andExpect(status().isOk());

        RegisteredUser stored = users.findByEmail("kontakt@example.ee");
        assertThat(stored.levels()).contains(ee.sheltermap.domain.VerificationLevel.EMAIL);
        assertThat(stored.canWrite()).isTrue();
    }
}
