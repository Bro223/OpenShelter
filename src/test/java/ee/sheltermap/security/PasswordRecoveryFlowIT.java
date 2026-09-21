package ee.sheltermap.security;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.auth.RecordingSmtpSender;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.verification.SmtpSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The account-recovery (password reset) flow pinned end-to-end over
 * HTTP (threat model A4/A5): the request ack is uniform for a known and an
 * unknown e-mail (no existence oracle, no send for the unknown one), the
 * re-issue cooldown is silent, the 6-digit code fails with one generic 400
 * five times and then locks out even the correct code, a used code is
 * single-use, an expired code is refused (DB-level expiry), and a
 * successful reset revokes every refresh token of the user while the new
 * password takes effect.
 *
 * <p>All rate buckets are raised so no 429 can mask a 400: this pins the
 * FLOW, not the buckets (the buckets have their own ITs).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.reset-capacity=100",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.reset-confirm-capacity=100",
        "app.ratelimit.reset-confirm-refill-per-second=0",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class PasswordRecoveryFlowIT extends AbstractPersistenceIT {

    private static final String OLD_PASSWORD = "old-pass-123";
    private static final String NEW_PASSWORD = "new-pass-456";

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingSmtpSender smtp;

    @Autowired
    JdbcTemplate jdbc;

    @TestConfiguration
    static class Config {
        @Bean
        @Primary
        SmtpSender smtpSender() {
            return new RecordingSmtpSender();
        }
    }

    @BeforeEach
    void clearFakes() {
        smtp.clear();
    }

    private void register(String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Recovery User\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"" + OLD_PASSWORD + "\"}"))
                .andExpect(status().isCreated());
    }

    /** The ack body is uniform by contract — it never reveals a send. */
    private void requestReset(String email) throws Exception {
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resendAvailableAfterSeconds").value(60));
    }

    private ResultActions confirm(String email, String code, String newPassword) throws Exception {
        return mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"code\":\"" + code
                        + "\",\"newPassword\":\"" + newPassword + "\"}"));
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return result.getResponse().getContentAsString();
    }

    /** The reset e-mail is "<app> password reset code: 123456 (valid 15 min)". */
    private String extractCode() {
        String message = smtp.last().message();
        int at = message.indexOf("code: ");
        assertThat(at).isGreaterThan(0);
        return message.substring(at + 6, at + 12);
    }

    @Test
    void unknownEmailRequestIsUniformAndSendsNothing() throws Exception {
        // unknown address: the same 200 ack a real request gets, and nothing sent
        requestReset("ghost-nobody@example.ee");
        assertThat(smtp.sent()).isEmpty();

        // a real address: byte-identical ack, one e-mail
        register("recovery-known@example.ee", "+37250010001");
        requestReset("recovery-known@example.ee");
        assertThat(smtp.sent()).hasSize(1);
        assertThat(smtp.last().email()).isEqualTo("recovery-known@example.ee");
    }

    @Test
    void aRefusedSendLeavesNoTokenRowInTheDatabase() throws Exception {
        // Send-first-then-commit at the persistence boundary: the token row
        // is written ONLY after the channel accepts the send. A refusal
        // (provider timeout / 5xx / rejected number) must leave NO row in
        // the DB — and the endpoint still answers the uniform 200 ack, so
        // the refusal is not even enumerable from the outside.
        register("recovery-refused@example.ee", "+37250010002");
        smtp.refuseNext();
        requestReset("recovery-refused@example.ee");

        Long rows = jdbc.queryForObject(
                "SELECT count(*) FROM password_reset_tokens", Long.class);
        assertThat(rows).as("no token row for a code nobody received").isZero();
        assertThat(smtp.sent()).as("the refusal captured nothing").isEmpty();
    }

    @Test
    void reissueWithinCooldownIsSilent() throws Exception {
        register("recovery-cooldown@example.ee", "+37250010002");
        requestReset("recovery-cooldown@example.ee");
        assertThat(smtp.sent()).hasSize(1);

        // inside the 60 s re-issue cooldown: same ack, no second e-mail
        requestReset("recovery-cooldown@example.ee");
        assertThat(smtp.sent()).hasSize(1);
    }

    @Test
    void fiveWrongCodesLockTheCodeEvenAgainstTheRightOne() throws Exception {
        register("recovery-lockout@example.ee", "+37250010003");
        requestReset("recovery-lockout@example.ee");
        String code = extractCode();
        String wrong = code.equals("000000") ? "111111" : "000000";

        // five failures — every one the SAME generic 400 (no attempt count leaked)
        for (int i = 0; i < 5; i++) {
            confirm("recovery-lockout@example.ee", wrong, NEW_PASSWORD)
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.status").value(400));
        }

        // the code is now locked out: even the correct code is refused,
        // still with the same generic shape
        confirm("recovery-lockout@example.ee", code, NEW_PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void aUsedCodeCannotBeReused() throws Exception {
        register("recovery-singleuse@example.ee", "+37250010004");
        requestReset("recovery-singleuse@example.ee");
        String code = extractCode();

        confirm("recovery-singleuse@example.ee", code, NEW_PASSWORD)
                .andExpect(status().isOk());
        confirm("recovery-singleuse@example.ee", code, "other-pass-789")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void anExpiredCodeIsRefused() throws Exception {
        register("recovery-expired@example.ee", "+37250010005");
        requestReset("recovery-expired@example.ee");
        String code = extractCode();

        // DB-level expiry: age the stored token past its 15-min TTL
        jdbc.update("UPDATE password_reset_tokens SET expires_at = NOW() - INTERVAL '1 minute'");

        confirm("recovery-expired@example.ee", code, NEW_PASSWORD)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void aSuccessfulResetRevokesEveryRefreshToken() throws Exception {
        String email = "recovery-revoke@example.ee";
        register(email, "+37250010006");
        String loginJson = login(email, OLD_PASSWORD);
        String oldRefreshToken = JsonPath.read(loginJson, "$.refreshToken");

        requestReset(email);
        String code = extractCode();
        confirm(email, code, NEW_PASSWORD).andExpect(status().isOk());

        // the old refresh token is dead (revoked, not just rotated)
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + oldRefreshToken + "\"}"))
                .andExpect(status().isUnauthorized());
        // the old password is dead, the new one works
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + OLD_PASSWORD + "\"}"))
                .andExpect(status().isUnauthorized());
        login(email, NEW_PASSWORD);
    }
}
