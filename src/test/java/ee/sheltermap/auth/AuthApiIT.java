package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.domain.RegisteredUser;
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

import java.time.Instant;

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
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.reset-confirm-capacity=1000",
        "app.ratelimit.reset-confirm-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        // The env-provisioned admin (the refused password-reset case):
        // explicit per class — a plain test context must never seed.
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1"
})
@Transactional
class AuthApiIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Mari\",\"email\":\"mari@example.ee\",\"phone\":\"+37250000001\","
                    + "\"password\":\"s3cret123\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    RecordingSmtpSender smtp;

    @Autowired
    ee.sheltermap.app.UserRepository users;

    @Autowired
    PasswordResetTokenRepository resetTokens;

    @Autowired
    AdminSeeder seeder;

    @BeforeEach
    void seedAdmin() {
        // Create-if-absent (idempotent): guarantees the provisioned admin
        // exists even if a sibling IT deliberately wiped the shared tables.
        seeder.run(null);
    }

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
    void duplicateRegistrationReturns409() throws Exception {
        // First registration -> 201
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());

        // Same email again -> 409 with the uniform error shape (hardening:
        // V3 unique index + DuplicateAccountException pre-check).
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"));

        // Same phone, different email -> also 409
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"mari2@example.ee\","
                                + "\"phone\":\"+37250000001\","
                                + "\"password\":\"s3cret123\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void registerCaseVariantEmailOrPhoneReturns409() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());

        // case-variant e-mail of an existing account -> 409 (the service
        // pre-check lower-cases; the V8 case-insensitive index is the
        // race-safe backstop)
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"MARI@EXAMPLE.EE\",\"phone\":\"+37250000002\","
                                + "\"password\":\"s3cret123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));

        // phone-variant twin: national format of the registered E.164 -> 409
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"mari3@example.ee\",\"phone\":\"50000001\","
                                + "\"password\":\"s3cret123\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void loginWithLocalFormatPhoneNormalizesAndSucceeds() throws Exception {
        registerUser();
        // 50000001 -> +37250000001 (E.164 normalization at the login boundary)
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"50000001\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty());
    }

    @Test
    void oversizedRegisterFieldReturns400WhileDuplicateReturns409() throws Exception {
        // oversized name (> 255, the column size) is rejected at the
        // validation boundary with 400 — not a DB error
        String longName = "x".repeat(300);
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + longName + "\",\"email\":\"big@example.ee\","
                                + "\"phone\":\"+37250000010\","
                                + "\"password\":\"s3cret123\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));

        // ...while a duplicate registration stays a 409 (the service-side
        // DIVE catch converts it before the global handler could 400 it)
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409));
    }

    @Test
    void shortRegistrationAndResetPasswordsAreRejectedWith400() throws Exception {
        // The 8-character minimum is enforced at the boundary —
        // a short registration password is a 400 validation failure, no row
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mari\",\"email\":\"mari@example.ee\",\"phone\":\"+37250000001\","
                                + "\"password\":\"s3c\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
        assertThat(users.findByEmail("mari@example.ee")).isNull();

        // and on reset confirm: a valid code + a short new password -> 400,
        // the old password still logs in
        registerUser();
        requestReset();
        String code = TestTokens.fromResetEmail(smtp.last().message());
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + code + "\",\"newPassword\":\"short\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk());
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
                .andExpect(jsonPath("$.message").value("Invalid credentials"))
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        // right password -> TokenResponse
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.refreshToken").isNotEmpty())
                .andExpect(jsonPath("$.expiresIn").value(900));
    }

    @Test
    void loginWithDummyPasswordIsIndistinguishableFromAWrongPassword() throws Exception {
        // The login timing equalizer verifies an
        // UNKNOWN contact against the Argon2 hash of the literal password
        // "dummy" — so "dummy" PASSES the verify for a ghost account, and
        // only the post-verify null check keeps the answer a generic 401.
        // Pre-fix the request reached tokens.issue(null) → NPE → 500, and
        // one unauthenticated POST /auth/login enumerated account existence
        // (unknown+"dummy" → 500 vs known+wrong → 401).
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"ghost@example.ee\",\"password\":\"dummy\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid credentials"))
                .andExpect(jsonPath("$.error").value("Unauthorized"));

        // known contact + the literal "dummy" → the identical generic 401
        registerUser();
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"dummy\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Invalid credentials"))
                .andExpect(jsonPath("$.error").value("Unauthorized"));
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
    void passwordResetWithEmailedCodeChangesPasswordAndRevokesSessions() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        String refreshToken = loginAndGetRefreshToken();

        // request reset for a KNOWN email -> 200, and the 6-digit code lands in the captured mail
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk());
        String code = TestTokens.fromResetEmail(smtp.last().message());
        assertThat(code).matches("\\d{6}");
        assertThat(smtp.last().message()).doesNotContain("http"); // no URL link in the mail

        // confirm with code + new password -> 200
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + code + "\",\"newPassword\":\"newpass1\"}"))
                .andExpect(status().isOk());

        // the pre-reset session is dead (all refresh tokens revoked)
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());

        // the old password no longer logs in; the new one does
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"newpass1\"}"))
                .andExpect(status().isOk());

        // the code is single-use -> second confirm is 400
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + code + "\",\"newPassword\":\"again\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void passwordResetForTheProvisionedAdminIsRefused() throws Exception {
        // The env-provisioned admin's password is the deployment's
        // (ADMIN_PASSWORD): the request is the ONE non-uniform answer to the
        // anti-enumeration rule — 403 naming the env provisioning, no code
        // row, nothing e-mailed.
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@example.ee\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(PasswordResetService.PROVISIONED_ADMIN_RESET_MESSAGE));
        assertThat(smtp.sent()).as("no reset code is e-mailed to the admin").isEmpty();

        // the DIRECT confirm call (no code was ever issued) is refused the
        // same way — the env's credentials are never rewritten through the
        // reset flow, and the admin can still log in with the env password
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@example.ee\",\"code\":\"123456\",\"newPassword\":\"usurped123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message")
                        .value(PasswordResetService.PROVISIONED_ADMIN_RESET_MESSAGE));
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void passwordResetConfirmWithWrongCodeReturnsGeneric400AndCountsAttempt() throws Exception {
        registerUser();
        requestReset();
        String code = TestTokens.fromResetEmail(smtp.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + wrong + "\",\"newPassword\":\"newpass1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset code"));

        // the failed attempt is persisted (brute-force guard)
        RegisteredUser mari = users.findByEmail("mari@example.ee");
        PasswordResetToken active = resetTokens.findActiveByUserId(mari.getId(), Instant.now());
        assertThat(active).isNotNull();
        assertThat(active.getAttempts()).isEqualTo(1);

        // the password is unchanged
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void passwordResetConfirmForUnknownEmailIsIndistinguishableFromAWrongCode() throws Exception {
        registerUser();
        requestReset();
        String code = TestTokens.fromResetEmail(smtp.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        // same status + generic message whether the email was ever requested
        // or the code is simply wrong — no account-existence oracle on confirm
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@example.ee\",\"code\":\"000000\",\"newPassword\":\"newpass1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset code"))
                .andExpect(jsonPath("$.error").value("Bad Request"));
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + wrong + "\",\"newPassword\":\"newpass1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset code"))
                .andExpect(jsonPath("$.error").value("Bad Request"));
    }

    @Test
    void passwordResetCodeIsLockedOutAfterFiveWrongAttempts() throws Exception {
        registerUser();
        requestReset();
        String code = TestTokens.fromResetEmail(smtp.last().message());
        String wrong = code.equals("000000") ? "000001" : "000000";

        for (int i = 0; i < 5; i++) {
            mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"email\":\"mari@example.ee\",\"code\":\"" + wrong + "\",\"newPassword\":\"newpass1\"}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value("Invalid or expired reset code"));
        }

        // even the CORRECT code is now rejected with the same generic 400
        mvc.perform(post("/auth/password-reset/confirm").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\",\"code\":\"" + code + "\",\"newPassword\":\"newpass1\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Invalid or expired reset code"));
    }

    @Test
    void resetRequestAcksTheReissueCooldownAndSilentSkipKeepsTheSameBody() throws Exception {
        registerUser();

        // known email -> 200 + ack with the reissue cooldown (60 s)
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resendAvailableAfterSeconds").value(60));

        // second request inside the cooldown: silent skip — still 200 with
        // the SAME ack, never a 429 (no enumeration, no rotation oracle)
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resendAvailableAfterSeconds").value(60));

        // the skip really was silent: exactly ONE mail went out
        assertThat(smtp.sent()).hasSize(1);
        assertThat(smtp.last().email()).isEqualTo("mari@example.ee");
    }

    @Test
    void requestResetForUnknownEmailReturnsTheSame200AsAKnownEmail() throws Exception {
        registerUser();

        MvcResult known = mvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk())
                .andReturn();
        MvcResult unknown = mvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"ghost@example.ee\"}"))
                .andExpect(status().isOk())
                .andReturn();

        // identical bodies — the endpoint never reveals account existence
        assertThat(unknown.getResponse().getContentAsString())
                .isEqualTo(known.getResponse().getContentAsString());
        // and nothing was e-mailed for the unknown address
        assertThat(smtp.sent()).hasSize(1);
        assertThat(smtp.last().email()).isEqualTo("mari@example.ee");
    }

    private void requestReset() throws Exception {
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"mari@example.ee\"}"))
                .andExpect(status().isOk());
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
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.refreshToken");
    }

    private String loginAndGetAccessToken() throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"mari@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }
}
