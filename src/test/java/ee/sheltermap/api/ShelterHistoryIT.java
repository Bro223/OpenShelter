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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the shelter edit history (moderation-dashboard-completion
 * M10 slice 2, D4) — full-stack MockMvc against the real services, security
 * chain, JWT filter and Postgres: the CREATED row on submission, the EDITED
 * row with exactly the moved fields (a no-op PUT records nothing), the
 * DELETED row on the admin hard delete, the history of a deleted shelter
 * surviving (the dangling shelter_id), and the admin-only 404/403 rules.
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
class ShelterHistoryIT extends AbstractPersistenceIT {

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
     * credential check — the IT asserts the history, not the password),
     * issued an access token directly.
     */
    private Account verifiedAccount(String name, String email, String password) {
        RegisteredUser user = new RegisteredUser(name, email, "+372555000" + (100 + nextUser++));
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

    /** Submits a shelter and returns its id (the 201 Location header). */
    private long submitShelter(Account account, String name, double latitude, double longitude,
                               String description, Integer capacity) throws Exception {
        String body = """
                {"name":"%s","latitude":%s,"longitude":%s,"description":%s,"capacity":%s,"locationKind":"PUBLIC"}
                """.formatted(name, latitude, longitude,
                description == null ? "null" : "\"%s\"".formatted(description),
                capacity == null ? "null" : String.valueOf(capacity));
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + account.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }

    /** Puts an owner edit; returns the response body for the caller's assertions. */
    private MvcResult editShelter(Account account, long id, String name, double latitude,
                                  double longitude, String description, Integer capacity)
            throws Exception {
        String body = """
                {"name":"%s","latitude":%s,"longitude":%s,"description":%s,"capacity":%s,"locationKind":null}
                """.formatted(name, latitude, longitude,
                description == null ? "null" : "\"%s\"".formatted(description),
                capacity == null ? "null" : String.valueOf(capacity));
        return mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + account.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk())
                .andReturn();
    }

    private List<Map<String, Object>> history(String admin, long shelterId) throws Exception {
        MvcResult result = mvc.perform(get("/admin/shelters/" + shelterId + "/history")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$");
    }

    // ---------- the history endpoint ----------

    @Test
    void aNewSheltersHistoryIsCreatedAttributedToTheSubmitter() throws Exception {
        Account submitter = verifiedAccount("Kaja", "kaja@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend", 58.40, 24.90, "Kelder", 12);

        List<Map<String, Object>> rows = history(adminToken(), id);

        assertThat(rows).hasSize(1);
        assertThat(rows.get(0).get("action")).isEqualTo("CREATED");
        assertThat(rows.get(0).get("shelterName")).isEqualTo("Keldri varjend");
        assertThat(rows.get(0).get("actorName")).isEqualTo("Kaja");
        assertThat(rows.get(0).get("changes")).isEqualTo(List.of());
    }

    @Test
    void anOwnerEditIsRecordedAsExactlyTheMovedFieldsAndANoOpPutRecordsNothing() throws Exception {
        Account submitter = verifiedAccount("Maret", "maret@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend", 58.41, 24.91, "Kelder", 12);

        // name + capacity + description move; location and locationKind do not
        editShelter(submitter, id, "Keldri varjend 2", 58.41, 24.91, "Suurem kelder", 15);

        List<Map<String, Object>> rows = history(adminToken(), id);
        assertThat(rows).hasSize(2);
        Map<String, Object> edited = rows.get(1);
        assertThat(edited.get("action")).isEqualTo("EDITED");
        assertThat(edited.get("shelterName")).isEqualTo("Keldri varjend"); // snapshot at event time
        assertThat(edited.get("actorName")).isEqualTo("Maret");
        List<?> changes = (List<?>) edited.get("changes");
        assertThat(changes).hasSize(3);
        assertThat(changes.get(0))
                .isEqualTo(Map.of("field", "name", "from", "Keldri varjend", "to", "Keldri varjend 2"));
        assertThat(changes.get(1))
                .isEqualTo(Map.of("field", "description", "from", "Kelder", "to", "Suurem kelder"));
        assertThat(changes.get(2))
                .isEqualTo(Map.of("field", "capacity", "from", "12", "to", "15"));

        // a no-op PUT (identical values, locationKind null = keep) records
        // nothing — no edit-spam history
        editShelter(submitter, id, "Keldri varjend 2", 58.41, 24.91, "Suurem kelder", 15);
        assertThat(history(adminToken(), id)).hasSize(2);
    }

    @Test
    void theHistoryOfADeletedShelterSurvivesWithTheDeleteLast() throws Exception {
        Account submitter = verifiedAccount("Toomas", "toomas@example.ee", "pass123");
        String admin = adminToken();
        long id = submitShelter(submitter, "Linnuse kelder", 58.42, 24.92, "Kelder", 10);
        editShelter(submitter, id, "Linnuse kelder", 58.42, 24.92, "Kelder, avatud", 10);

        mvc.perform(delete("/admin/shelters/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        assertThat(shelters.findById(id)).isEmpty();

        // the shelter is gone, but its history still serves — the rows'
        // shelter_id dangles legally (no FK)
        List<Map<String, Object>> rows = history(admin, id);
        assertThat(rows).hasSize(3);
        assertThat(rows).extracting(row -> row.get("action").toString())
                .containsExactly("CREATED", "EDITED", "DELETED");
        // the DELETE is actor-attributed to the moderating admin
        assertThat(rows.get(2).get("actorName")).isEqualTo("Admin");
        assertThat(rows.get(2).get("changes")).isEqualTo(List.of());

        // an id with neither shelter nor history is a 404
        mvc.perform(get("/admin/shelters/999999/history")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void onlyAdminsCanReadHistory() throws Exception {
        Account submitter = verifiedAccount("Liisa", "liisa@example.ee", "pass123");
        long id = submitShelter(submitter, "Liisa kelder", 58.43, 24.93, "Kelder", 5);

        // the submitter (authenticated, not an admin) is refused
        mvc.perform(get("/admin/shelters/" + id + "/history")
                        .header("Authorization", "Bearer " + submitter.accessToken))
                .andExpect(status().isForbidden());
        // anonymous callers never reach the guard (the security entry point
        // answers 401 first — /admin/** requires a token)
        mvc.perform(get("/admin/shelters/" + id + "/history"))
                .andExpect(status().isUnauthorized());
    }
}
