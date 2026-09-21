package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import ee.sheltermap.security.PiiCrypto;
import ee.sheltermap.verification.PhoneNumbers;
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

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for {@code DELETE /account} (legal-recovery):
 * the split erasure rule — declared PRIVATE homes are purged, public
 * community rows are orphaned (created_by NULL, trust state untouched),
 * the DB cascades credentials/claims/tokens/reports, audit rows
 * survive with dangling ids, the blind index is gone (the erased contact
 * can be re-registered), and a repeat call is an idempotent no-op.
 * Full-stack MockMvc against real services, security chain, JWT filter
 * and Postgres.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The env-provisioned admin (the refused-deletion case): the seeder
        // is explicit per class — a plain test context must never seed.
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1"
})
@Transactional
class AccountDeletionIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    AdminSeeder seeder;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PiiCrypto piiCrypto;

    @BeforeEach
    void seedAdmin() {
        // Create-if-absent (idempotent): guarantees the provisioned admin
        // exists even if a sibling IT deliberately wiped the shared tables.
        seeder.run(null);
    }

    /** A write-capable (e-mail-verified) user with real credentials. */
    private record Auth(long id, String email, String phone, String password,
                        String token, String refreshToken) {
    }

    private Auth registerVerified(String name, String email, String phone, String password) throws Exception {
        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated());

        MvcResult result = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        String token = JsonPath.parse(body).read("$.accessToken", String.class);
        String refreshToken = JsonPath.parse(body).read("$.refreshToken", String.class);

        RegisteredUser user = users.findByEmail(email);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return new Auth(user.getId(), email, phone, password, token, refreshToken);
    }

    private Auth registerUnverified(String name, String email, String phone, String password) throws Exception {
        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isCreated());

        MvcResult result = mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        String token = JsonPath.parse(body).read("$.accessToken", String.class);
        long id = users.findByEmail(email).getId();
        return new Auth(id, email, phone, password, token, null);
    }

    private long submit(Auth user, String name, boolean privateHome) throws Exception {
        String body = "{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7"
                + (privateHome ? ",\"locationKind\":\"PRIVATE\"" : "") + "}";
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    /** A positive (OPEN_CONFIRMED) report — the NEW→CONFIRMED promotion (D2). */
    private void positiveReport(Auth reporter, long shelterId) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + reporter.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void anonymousDeletionIs401() throws Exception {
        mvc.perform(delete("/account"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theProvisionedAdminCannotDeleteTheAccount() throws Exception {
        // The env-provisioned admin (kind ADMIN — the durable truth, a fresh
        // lookup per request) is the deployment's access path: a DIRECT
        // API call must be refused with 403 naming the env provisioning —
        // the hidden UI button is not the enforcement.
        String admin = adminToken();

        mvc.perform(delete("/account").header("Authorization", "Bearer " + admin))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(AccountService.PROVISIONED_ADMIN_DELETE_MESSAGE));

        // nothing was erased: the row + its credentials survive, and the
        // operator can still log in with the env password
        assertThat(users.findByEmail("admin@example.ee")).isNotNull();
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk());
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void anUnverifiedUserCannotDelete() throws Exception {
        Auth user = registerUnverified("Vermata", "vermata-del@example.ee", "+3725003001", "vermata-pass");

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isForbidden());

        // nothing was erased
        assertThat(users.findByEmail(user.email())).isNotNull();
    }

    @Test
    void deletionPurgesPrivateOrphansPublicAndCascadesTheAccount() throws Exception {
        Auth a = registerVerified("Kahane", "kahane-del@example.ee", "+3725002001", "kahane-pass");
        Auth b = registerVerified("Kaks", "kaks-del@example.ee", "+3725002002", "kaks-pass");

        long pubA = submit(a, "Kahane Public", false);
        long privA = submit(a, "Kahane Private", true);
        long pubB = submit(b, "Kaks Public", false);
        // cross-reports: each audit row's actor is the REPORTING user
        positiveReport(b, pubA);
        positiveReport(a, pubB);

        mvc.perform(delete("/account").header("Authorization", "Bearer " + a.token()))
                .andExpect(status().isNoContent());

        // 1. the declared private home is PURGED (hard deleted)
        assertThat(shelters.findById(privA)).isEmpty();
        mvc.perform(get("/api/shelters/" + privA))
                .andExpect(status().isNotFound());

        // 2. the public row is ORPHANED: kept, created_by NULL, trust state
        //    untouched (CONFIRMED stays CONFIRMED), submitter no longer
        //    resolvable (submitterVerified false — the NULL-creator render)
        assertThat(shelters.findById(pubA)).isPresent();
        var pubAEntity = shelters.findById(pubA).orElseThrow();
        assertThat(pubAEntity.getCreatedBy()).isNull();
        assertThat(pubAEntity.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        mvc.perform(get("/api/shelters/" + pubA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.locationKind").value("PUBLIC"))
                .andExpect(jsonPath("$.submitterVerified").value(false))
                // Erasure-trust: the depth behind the "verified yellow" marker
                // is absent too (author gone), and the row keeps its ordinary
                // community provenance — deletion grants no verified standing.
                .andExpect(jsonPath("$.submitterVerification").doesNotExist())
                .andExpect(jsonPath("$.provenance").value("COMMUNITY_REPORTED"))
                .andExpect(jsonPath("$.address").value(nullValue()));

        // 3. b's data is untouched — shelter still authored by b
        assertThat(shelters.findById(pubB)).isPresent();
        assertThat(shelters.findById(pubB).orElseThrow().getCreatedBy()).isEqualTo(b.id());

        // 4. audit rows SURVIVE: the row whose actor was b keeps b; the row
        //    whose actor was a dangles (moderator_id NULL — V14)
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ? "
                        + "AND action = 'AUTO_CONFIRM' AND moderator_id IS NULL",
                Long.class, pubB)).isEqualTo(1L);
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ? "
                        + "AND action = 'AUTO_CONFIRM' AND moderator_id = ?",
                Long.class, pubA, b.id())).isEqualTo(1L);

        // 5. the account itself is erased: row gone, credentials gone
        //    (re-login 401), the refresh token is dead, the blind-index
        //    entries are gone (no ciphertext/hash row can match the contact)
        assertThat(users.findById(a.id())).isNull();
        mvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + a.email() + "\",\"password\":\"" + a.password() + "\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + a.refreshToken() + "\"}"))
                .andExpect(status().isUnauthorized());
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE id = ?", Long.class, a.id())).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE email_hash = ?", Long.class,
                piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_EMAIL, PiiCrypto.canonicalEmail(a.email())))).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM users WHERE phone_hash = ?", Long.class,
                piiCrypto.blindIndex(PiiCrypto.DOMAIN_USER_PHONE, PhoneNumbers.normalizeE164(a.phone())))).isZero();

        // 6. the erased contact is FREE again — re-registration succeeds
        mvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Uus\",\"email\":\"" + a.email() + "\",\"phone\":\"" + a.phone()
                                + "\",\"password\":\"new-pass\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void aSecondDeletionIsAnIdempotentNoOp() throws Exception {
        Auth user = registerVerified("Kord", "kord-del@example.ee", "+3725004001", "kord-pass");

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());
        // the JWT is still valid until its expiry — a repeat call answers
        // the same 204 instead of an error
        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());
    }

    @Test
    void anExportAfterDeletionYieldsNoUserData() throws Exception {
        Auth user = registerVerified("Ekspordi", "ekspordi-del@example.ee", "+3725005001", "ekspordi-pass");
        submit(user, "Ekspordi Varjend", false);

        mvc.perform(get("/account/export").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shelters.length()").value(1));

        mvc.perform(delete("/account").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());

        // the account is gone: no data document can be produced anymore
        // (the user row no longer exists behind the still-valid JWT)
        MvcResult result = mvc.perform(get("/account/export").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().is4xxClientError())
                .andReturn();
        assertThat(result.getResponse().getContentAsString())
                .doesNotContain("ekspordi-del@example.ee")
                .doesNotContain("Ekspordi Varjend");
    }
}
