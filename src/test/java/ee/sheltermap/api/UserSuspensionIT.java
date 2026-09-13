package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.auth.Argon2PasswordHasher;
import ee.sheltermap.auth.TokenResponse;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.auth.UserCredentials;
import ee.sheltermap.auth.UserCredentialsRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for user suspension (moderation-dashboard-completion M10
 * slice 1) — full-stack MockMvc against the real services, security chain,
 * JWT filter and Postgres: the admin suspend/unsuspend endpoints
 * (idempotent, REGISTERED-only, audited with the account as subject), and
 * enforcement at all three credential doors — login refuses AFTER the
 * verify (403, never 401), the refresh rotation refuses (403, the refresh
 * token is spent), and the JWT filter's fresh lookup leaves a suspended
 * user unauthenticated (401) on the very next request. An unsuspend
 * restores everything.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The per-IP login bucket too (default 20): this class's admin logins
        // share the test IP with sibling ITs' contexts, and the default
        // 0.334/s refill is slower than the class's login volume — 429s
        // would be flake, not behavior.
        "app.ratelimit.login-ip-capacity=1000",
        "app.ratelimit.login-ip-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class UserSuspensionIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    UserCredentialsRepository credentials;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    AdminSeeder seeder;

    @BeforeEach
    void seedAdmin() {
        seeder.run(null);
    }

    // ---------- helpers ----------

    private static final class Account {
        final RegisteredUser user;
        final String accessToken;
        final String refreshToken;

        Account(RegisteredUser user, String accessToken, String refreshToken) {
            this.user = user;
            this.accessToken = accessToken;
            this.refreshToken = refreshToken;
        }
    }

    /**
     * A verified registered account with a password (login-testable),
     * issued a token pair directly (the same path /auth/login uses after
     * the credential check — the IT asserts the doors, not the password).
     */
    private Account verifiedAccount(String name, String email, String password) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + (100 + nextUser++));
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        credentials.save(new UserCredentials(user.getId(),
                new Argon2PasswordHasher(passwordEncoder).hash(password)));
        TokenResponse pair = tokens.issue(user);
        return new Account(user, pair.accessToken(), pair.refreshToken());
    }

    private long nextUser = 0;

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    private long adminUserId() {
        return users.findByEmail("admin@example.ee").getId();
    }

    // ---------- the admin surface ----------

    @Test
    void aNonAdminCannotSeeOrActOnTheUserList() throws Exception {
        Account stranger = verifiedAccount("Tavaline", "tavaline@example.ee", "pass123");

        mvc.perform(get("/admin/users").header("Authorization", "Bearer " + stranger.accessToken))
                .andExpect(status().isForbidden());
        mvc.perform(post("/admin/users/1/suspend").header("Authorization", "Bearer " + stranger.accessToken))
                .andExpect(status().isForbidden());
    }

    @Test
    void theUserListCarriesTheSuspensionState() throws Exception {
        Account target = verifiedAccount("Siht", "siht@example.ee", "pass123");
        String admin = adminToken();

        MvcResult before = mvc.perform(get("/admin/users").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(rowById(before, target.user.getId()).get("suspendedAt")).isNull();
        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        MvcResult after = mvc.perform(get("/admin/users").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        assertThat(String.valueOf(rowById(after, target.user.getId()).get("suspendedAt"))).isNotBlank();
    }

    @Test
    void suspendingIsIdempotentAndOnlyRegisteredAccountsAreSuspendable() throws Exception {
        Account target = verifiedAccount("Siht", "siht2@example.ee", "pass123");
        String admin = adminToken();

        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        // the same call again: a no-op 204 (no second audit row — the audit
        // assertion below counts exactly one USER_SUSPEND)
        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        // the provisioned admin is a lockout vector — 409
        mvc.perform(post("/admin/users/" + adminUserId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isConflict());
        // unknown id — 404
        mvc.perform(post("/admin/users/999999/suspend").header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound());

        MvcResult audit = mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        List<Map<String, Object>> rows =
                JsonPath.read(audit.getResponse().getContentAsString(), "$");
        long suspends = rows.stream()
                .filter(row -> "USER_SUSPEND".equals(row.get("action")))
                .count();
        assertThat(suspends).isEqualTo(1);
    }

    // ---------- enforcement at the three doors ----------

    @Test
    void aSuspendedUserCannotLogInWithCorrectCredentials() throws Exception {
        Account target = verifiedAccount("Siht", "siht3@example.ee", "pass123");
        String admin = adminToken();
        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        // correct password, but the account is suspended: 403 (never the
        // generic 401 — the user can see that it is a suspension)
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"siht3@example.ee\",\"password\":\"pass123\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This account is currently suspended"));
        // a wrong password still gets the generic 401 (no oracle either way)
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"siht3@example.ee\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void inFlightTokensDieOnTheNextRequestAndTheRefreshRotationIsRefused() throws Exception {
        Account target = verifiedAccount("Siht", "siht4@example.ee", "pass123");
        // the token works while the account is active
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + target.accessToken))
                .andExpect(status().isOk());

        String admin = adminToken();
        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        // the same token now authenticates nothing (the filter's fresh
        // lookup) — 401 on a protected route
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + target.accessToken))
                .andExpect(status().isUnauthorized());
        // and the refresh rotation is refused — 403, and the refresh token
        // is spent (a second attempt is a plain 401 invalid-token)
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + target.refreshToken + "\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("This account is currently suspended"));
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + target.refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anUnsuspendedUserLogsInAgainAndTheAuditShowsTheExchange() throws Exception {
        Account target = verifiedAccount("Siht", "siht5@example.ee", "pass123");
        String admin = adminToken();
        mvc.perform(post("/admin/users/" + target.user.getId() + "/suspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        mvc.perform(post("/admin/users/" + target.user.getId() + "/unsuspend")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());

        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"siht5@example.ee\",\"password\":\"pass123\"}"))
                .andExpect(status().isOk());

        MvcResult audit = mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        String body = audit.getResponse().getContentAsString();
        // newest first: the unsuspend, then the suspend — both with the
        // account rendered as subject in the shelter-name slot
        assertThat((String) JsonPath.read(body, "$[0].action")).isEqualTo("USER_UNSUSPEND");
        assertThat((String) JsonPath.read(body, "$[0].shelterName")).isEqualTo("Account: Siht (siht5@example.ee)");
        assertThat((String) JsonPath.read(body, "$[1].action")).isEqualTo("USER_SUSPEND");
        assertThat((String) JsonPath.read(body, "$[1].shelterName")).isEqualTo("Account: Siht (siht5@example.ee)");
    }

    // ---------- local helpers ----------

    private Map<String, Object> rowById(MvcResult result, long userId) throws Exception {
        List<Map<String, Object>> rows =
                JsonPath.read(result.getResponse().getContentAsString(), "$");
        return rows.stream()
                .filter(row -> Long.valueOf(userId).equals(((Number) row.get("id")).longValue()))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no user row for id " + userId));
    }
}
