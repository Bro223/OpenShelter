package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import jakarta.persistence.EntityManager;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the env-provisioned admin (admin-moderation D1) —
 * real security chain, real JWT, real Postgres. The context boots WITH
 * {@code app.admin.email}/{@code app.admin.password} set, so the seeder
 * runs at startup exactly like a prod boot; the tests then verify the
 * row, the login path and the restart idempotency.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class AdminSeederIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    AdminSeeder seeder;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    EntityManager entityManager;

    /**
     * The seeder runs at CONTEXT start, but Spring contexts are shared
     * across IT classes while each class gets a FRESH database — the
     * startup seed may have landed in another class's DB. The seeder is
     * create-if-absent, so re-running it per test guarantees the admin
     * exists in THIS class's database regardless of context-cache order.
     * Flush: the seeder's JPA writes are pending in the test transaction —
     * raw-JDBC reads (adminId()) do not trigger Hibernate's auto-flush.
     */
    @BeforeEach
    void seedAdmin() {
        seeder.run(null);
        entityManager.flush();
    }

    private long adminId() {
        // PII-at-rest: users.email holds ciphertext — look up by blind index.
        return userIdByEmail("admin@example.ee");
    }

    @Test
    void theSeededAdminHasTheAdminKindAndAllClaims() {
        long id = adminId();
        assertThat(jdbc.queryForObject("SELECT kind FROM users WHERE id = ?",
                String.class, id)).isEqualTo("ADMIN");
        assertThat(jdbc.queryForObject("SELECT name FROM users WHERE id = ?",
                String.class, id)).isEqualTo("Admin");

        RegisteredUser admin = (RegisteredUser) users.findById(id);
        assertThat(admin).isInstanceOf(ee.sheltermap.domain.AdminUser.class);
        assertThat(admin.levels()).containsExactlyInAnyOrder(
                VerificationLevel.EMAIL, VerificationLevel.PHONE, VerificationLevel.SMART_ID);
        // fully writable without the email/SMS flow the mailbox could never pass
        assertThat(admin.canWrite()).isTrue();
        // the kind seam the /admin/* guard and the shelter cap read
        assertThat(users.isAdmin(id)).isTrue();
    }

    @Test
    void theSeededAdminLogsInThroughTheNormalLoginEndpoint() throws Exception {
        // no verification step was ever needed — login straight after boot
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String token = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");

        // the same JWT shape as every other user (principal = userId) — and
        // /account/me carries isAdmin for the route/nav gating
        mvc.perform(get("/account/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Admin"))
                .andExpect(jsonPath("$.email").value("admin@example.ee"))
                .andExpect(jsonPath("$.isAdmin").value(true))
                .andExpect(jsonPath("$.levels.length()").value(3));
    }

    @Test
    void aWrongPasswordStillFailsForTheAdmin() throws Exception {
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void aSecondRunChangesNothing() {
        long id = adminId();
        String hashBefore = jdbc.queryForObject(
                "SELECT password_hash FROM user_credentials WHERE user_id = ?", String.class, id);
        int claimsBefore = jdbc.queryForObject(
                "SELECT COUNT(*) FROM verification_claims WHERE user_id = ?", Integer.class, id);

        // simulate a restart with the same env vars
        seeder.run(null);

        long after = adminId();
        assertThat(after).isEqualTo(id);
        // the password hash is byte-identical — no re-hash, ever
        assertThat(jdbc.queryForObject(
                "SELECT password_hash FROM user_credentials WHERE user_id = ?", String.class, id))
                .isEqualTo(hashBefore);
        assertThat(jdbc.queryForObject("SELECT kind FROM users WHERE id = ?",
                String.class, id)).isEqualTo("ADMIN");
        assertThat(jdbc.queryForObject("SELECT name FROM users WHERE id = ?",
                String.class, id)).isEqualTo("Admin");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM verification_claims WHERE user_id = ?", Integer.class, id))
                .isEqualTo(claimsBefore);
    }

    @Test
    void aRepeatedRunLeavesOtherUsersAlone() {
        RegisteredUser normal = new RegisteredUser("Mari Maasikas", "mari@example.ee",
                "+37250000001");
        users.save(normal);
        long before = jdbc.queryForObject(
                "SELECT COUNT(*) FROM verification_claims WHERE user_id = ?", Integer.class, normal.getId());

        seeder.run(null);

        assertThat(normal).isNotInstanceOf(ee.sheltermap.domain.AdminUser.class);
        assertThat(users.isAdmin(normal.getId())).isFalse();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM verification_claims WHERE user_id = ?", Integer.class, normal.getId()))
                .isEqualTo(before);
    }
}
