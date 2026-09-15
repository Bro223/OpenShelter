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
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the admin "mark inaccurate" flag
 * (moderation-dashboard-completion) — full-stack MockMvc
 * against the real services, security chain, JWT filter and Postgres:
 * the mark (204, USER rows only — registry 409, unknown 404) sets the
 * V20 stamp and the public {@code inaccurate} flag on the list, the
 * detail, the /mine and the admin projections WITHOUT touching the
 * status (the row stays visible); the idempotent mark/clear pair audits
 * MARK_INACCURATE / CLEAR_INACCURATE (a no-op writes no row); a blank or
 * absent reason stores NULL on the audit row.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The per-IP login bucket too (default 20): sibling IT contexts share
        // the test IP — 429s would be flake, not behavior.
        "app.ratelimit.login-ip-capacity=1000",
        "app.ratelimit.login-ip-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class MarkInaccurateIT extends AbstractPersistenceIT {

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

        Account(RegisteredUser user, String accessToken) {
            this.user = user;
            this.accessToken = accessToken;
        }
    }

    /**
     * A verified registered account (the same path /auth/login uses after the
     * credential check — the IT asserts the mark, not the password), issued
     * an access token directly.
     */
    private Account verifiedAccount(String name, String email, String password) {
        RegisteredUser user = new RegisteredUser(name, email, "+372555100" + (100 + nextUser++));
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email,
                Instant.now()));
        users.save(user);
        credentials.save(new UserCredentials(user.getId(),
                new Argon2PasswordHasher(passwordEncoder).hash(password), Instant.now()));
        TokenResponse pair = tokens.issue(user);
        return new Account(user, pair.accessToken());
    }

    private long nextUser = 0;

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    /** Submits a USER shelter and returns its id (the 201 Location header). */
    private long submitShelter(Account account, String name) throws Exception {
        String body = """
                {"name":"%s","latitude":58.50,"longitude":24.50,"description":"Kelder","capacity":10,"locationKind":"PUBLIC"}
                """.formatted(name);
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + account.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }

    /** A registry (import-owned) row, seeded through the repository. */
    private long seedRegistryShelter(String name) {
        Shelter shelter = new Shelter(name, new GeoPoint(58.9, 26.3), ShelterStatus.ACTIVE,
                "ext-" + name, ShelterSource.PAASETEAMET, "Pikakaevu 3", "Harjumaa",
                "Tallinn linn", "01.01.2026", "SMIT");
        shelters.save(shelter);
        return shelter.getId();
    }

    private void markInaccurate(String admin, long shelterId, String reasonBody) throws Exception {
        mvc.perform(post("/admin/shelters/" + shelterId + "/mark-inaccurate")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reasonBody))
                .andExpect(status().isNoContent());
    }

    private void clearInaccurate(String admin, long shelterId) throws Exception {
        mvc.perform(post("/admin/shelters/" + shelterId + "/clear-inaccurate")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNoContent());
    }

    /** The public list row of the shelter. */
    private String publicRow(long shelterId) throws Exception {
        MvcResult list = mvc.perform(get("/api/shelters")).andExpect(status().isOk()).andReturn();
        net.minidev.json.JSONArray rows = JsonPath.read(
                list.getResponse().getContentAsString(), "$[?(@.id == " + shelterId + ")]");
        return net.minidev.json.JSONValue.toJSONString(rows.get(0));
    }

    /** The detail read of the shelter. */
    private String detail(long shelterId) throws Exception {
        MvcResult detail = mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk()).andReturn();
        return detail.getResponse().getContentAsString();
    }

    /** The /mine row of the shelter (the submitter's surface). */
    private String mineRow(Account submitter, long shelterId) throws Exception {
        MvcResult result = mvc.perform(get("/api/shelters/mine")
                        .header("Authorization", "Bearer " + submitter.accessToken))
                .andExpect(status().isOk())
                .andReturn();
        net.minidev.json.JSONArray rows = JsonPath.read(
                result.getResponse().getContentAsString(), "$[?(@.id == " + shelterId + ")]");
        return net.minidev.json.JSONValue.toJSONString(rows.get(0));
    }

    /** The admin list row of the shelter (the admin's surface). */
    private String adminRow(String admin, long shelterId) throws Exception {
        MvcResult result = mvc.perform(get("/admin/shelters")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        net.minidev.json.JSONArray rows = JsonPath.read(
                result.getResponse().getContentAsString(), "$[?(@.id == " + shelterId + ")]");
        return net.minidev.json.JSONValue.toJSONString(rows.get(0));
    }

    /** The count of audit rows with the given action. */
    private long auditCount(String admin, String action) throws Exception {
        MvcResult result = mvc.perform(get("/admin/audit")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        net.minidev.json.JSONArray rows = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$[?(@.action == '" + action + "')]");
        return rows.size();
    }

    // ---------- the flag ----------

    @Test
    void markingSetsThePublicFlagWithoutTouchingTheStatus() throws Exception {
        Account submitter = verifiedAccount("Kaja", "kaja@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        markInaccurate(admin, id, "{\"reason\":\"Uks on suletud\"}");

        // every projection carries the flag — the row stays ACTIVE and
        // visible in the public list
        for (String row : new String[]{publicRow(id), detail(id), mineRow(submitter, id),
                adminRow(admin, id)}) {
            assertThat(JsonPath.<Object>read(row, "$.inaccurate")).isEqualTo(true);
        }
        assertThat(JsonPath.<Object>read(publicRow(id), "$.status")).isEqualTo("ACTIVE");
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(shelters.findById(id).orElseThrow().getInaccurateMarkedAt()).isNotNull();
        // the decision is audited with the reason
        assertThat(auditCount(admin, "MARK_INACCURATE")).isEqualTo(1);
    }

    @Test
    void clearingRemovesTheFlagAgain() throws Exception {
        Account submitter = verifiedAccount("Maret", "maret@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        markInaccurate(admin, id, "{\"reason\":\"Uks on suletud\"}");
        clearInaccurate(admin, id);

        assertThat(JsonPath.<Object>read(publicRow(id), "$.inaccurate")).isEqualTo(false);
        assertThat(JsonPath.<Object>read(adminRow(admin, id), "$.inaccurate")).isEqualTo(false);
        assertThat(shelters.findById(id).orElseThrow().getInaccurateMarkedAt()).isNull();
        assertThat(auditCount(admin, "MARK_INACCURATE")).isEqualTo(1);
        assertThat(auditCount(admin, "CLEAR_INACCURATE")).isEqualTo(1);
    }

    @Test
    void anOwnerPutOnAMarkedRowKeepsTheAdminInaccurateMark() throws Exception {
        Account submitter = verifiedAccount("Liisa", "liisa@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        markInaccurate(admin, id, "{\"reason\":\"Uks on suletud\"}");
        Shelter marked = shelters.findById(id).orElseThrow();
        assertThat(marked.getInaccurateMarkedAt()).isNotNull();
        assertThat(marked.getInaccurateMarkedBy()).isNotNull();

        // the owner edits their own shelter — the admin mark must survive
        // the edit (an owner PUT must never clear an admin moderation stamp)
        mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + submitter.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Keldri varjend 2\",\"latitude\":58.51,\"longitude\":24.51,"
                                + "\"description\":\"Kelder\",\"capacity\":12}"))
                .andExpect(status().isOk());

        Shelter after = shelters.findById(id).orElseThrow();
        assertThat(after.getInaccurateMarkedAt()).isEqualTo(marked.getInaccurateMarkedAt());
        assertThat(after.getInaccurateMarkedBy()).isEqualTo(marked.getInaccurateMarkedBy());
        // and the public surface still carries the flag
        assertThat(JsonPath.<Object>read(publicRow(id), "$.inaccurate")).isEqualTo(true);
    }

    @Test
    void theMarkPairIsIdempotentAndANoOpAuditsNothing() throws Exception {
        Account submitter = verifiedAccount("Toomas", "toomas@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        markInaccurate(admin, id, "{}");
        markInaccurate(admin, id, "{}");
        clearInaccurate(admin, id);
        clearInaccurate(admin, id);

        assertThat(auditCount(admin, "MARK_INACCURATE")).isEqualTo(1);
        assertThat(auditCount(admin, "CLEAR_INACCURATE")).isEqualTo(1);
        // an absent reason body stores NULL on the audit row (the key is
        // absent or null on the wire — both mean "no reason stored")
        MvcResult audit = mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk()).andReturn();
        // The filter projects the matched row as a map (parser-dependent)
        // — read it through Object, not a net.minidev cast.
        Object rows = JsonPath.read(
                audit.getResponse().getContentAsString(), "$[?(@.action == 'MARK_INACCURATE')]");
        List<?> matched = (List<?>) rows;
        assertThat(matched).hasSize(1);
        assertThat(((Map<?, ?>) matched.get(0)).get("reason")).isNull();
    }

    @Test
    void theMarkGuardsRegistryRowsUnknownIdsAndAnonymousCallers() throws Exception {
        String admin = adminToken();
        long registryId = seedRegistryShelter("Registri varjend");

        // registry rows are import-owned (409, same guard as the other admin writes)
        mvc.perform(post("/admin/shelters/" + registryId + "/mark-inaccurate")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Kust?\"}"))
                .andExpect(status().isConflict());
        mvc.perform(post("/admin/shelters/" + registryId + "/clear-inaccurate")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isConflict());
        // an unknown shelter is a 404
        mvc.perform(post("/admin/shelters/999999/mark-inaccurate")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Kust?\"}"))
                .andExpect(status().isNotFound());
        // anonymous callers never reach the guard (401 first)
        mvc.perform(post("/admin/shelters/" + registryId + "/mark-inaccurate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Ilma tokenita?\"}"))
                .andExpect(status().isUnauthorized());
        // an oversized reason is a 400 validation failure
        Account submitter = verifiedAccount("Kari", "kari@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        mvc.perform(post("/admin/shelters/" + id + "/mark-inaccurate")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"" + "x".repeat(501) + "\"}"))
                .andExpect(status().isBadRequest());
        assertThat(shelters.findById(id).orElseThrow().getInaccurateMarkedAt()).isNull();
    }
}
