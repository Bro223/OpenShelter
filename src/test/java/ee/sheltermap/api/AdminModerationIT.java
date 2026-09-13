package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import jakarta.persistence.EntityManager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the admin moderation API (admin-moderation D2/D3/D4) —
 * full-stack MockMvc against the real services, security chain, JWT filter
 * and Postgres: authorization (fresh kind lookup, no JWT claim), the admin
 * shelter list (all statuses, trust fields, submitter), manual
 * hide/restore (restore disarms auto-hide), hard delete (cascade), the two
 * report queues with their idempotent moderation actions. The admin is
 * seeded by the context startup (app.admin.* set) and logs in through the
 * normal /auth/login.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class AdminModerationIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    AdminSeeder seeder;

    /**
     * The seeder runs at CONTEXT start, but Spring contexts are shared
     * across IT classes while each class gets a FRESH database — the
     * startup seed may have landed in another class's DB. The seeder is
     * create-if-absent, so re-running it per test guarantees the admin
     * exists in THIS class's database regardless of context-cache order.
     */
    @BeforeEach
    void seedAdmin() {
        seeder.run(null);
    }

    /**
     * The test transaction and the MockMvc requests share one persistence
     * context (same thread). Raw JDBC reads do NOT trigger Hibernate's
     * auto-flush (only JPA queries do), and raw JDBC writes are invisible
     * to the L1 cache — so flush before JDBC assertions and clear after
     * JDBC updates that a JPA read must observe.
     */
    @Autowired
    EntityManager entityManager;

    private long nextUser = 1;

    // ---------- helpers ----------

    private String verifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    private long seedShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                source == ShelterSource.USER ? null : "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    private long seedRegistryShelter(String name, String address) {
        Shelter shelter = new Shelter(name, new GeoPoint(58.9, 26.3), ShelterStatus.ACTIVE,
                "ext-" + name, ShelterSource.PAASETEAMET, address, "Pärnu", "Pärnu linn",
                "01.01.2026", "SMIT");
        shelters.save(shelter);
        return shelter.getId();
    }

    private long createShelterViaApi(String token, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void expectError(org.springframework.test.web.servlet.ResultActions result,
                             int status, String error) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.error").value(error))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    // ---------- authorization (D2) ----------

    @Test
    void anonymousAdminRequestsAre401() throws Exception {
        expectError(mvc.perform(get("/admin/shelters")), 401, "Unauthorized");
        expectError(mvc.perform(post("/admin/shelters/1/status")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"INACTIVE\"}")),
                401, "Unauthorized");
        expectError(mvc.perform(post("/admin/reports/1/dismiss")), 401, "Unauthorized");
    }

    @Test
    void aVerifiedNonAdminGets403AndNoData() throws Exception {
        long shelterId = seedShelter("Oma", ShelterSource.USER);
        String token = verifiedToken("Tavaline", "tavaline@example.ee");

        // the guard answers 403 on reads AND writes; the body is the
        // uniform error, never admin data
        expectError(mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token)),
                403, "Forbidden");
        expectError(mvc.perform(get("/admin/reports?shelterId=" + shelterId)
                        .header("Authorization", "Bearer " + token)),
                403, "Forbidden");
        expectError(mvc.perform(get("/admin/review-reports")
                        .header("Authorization", "Bearer " + token)),
                403, "Forbidden");
        expectError(mvc.perform(post("/admin/shelters/" + shelterId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}")),
                403, "Forbidden");
        expectError(mvc.perform(delete("/admin/shelters/" + shelterId)
                        .header("Authorization", "Bearer " + token)),
                403, "Forbidden");
        // nothing was changed
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus()).isEqualTo(ShelterStatus.ACTIVE);
    }

    @Test
    void aDemotionTakesEffectImmediatelyOnTheNextRequest() throws Exception {
        long adminId = userIdByEmail("admin@example.ee"); // PII-at-rest (M2): hash lookup
        String token = adminToken();

        // the pre-demotion request works (the guard re-reads the kind)
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // demote: the JWT stays valid, but the kind is the truth
        jdbc.update("UPDATE users SET kind = 'REGISTERED' WHERE id = ?", adminId);
        // the earlier request cached the ADMIN entity in the shared PC —
        // drop it so the guard's fresh lookup re-reads the row
        entityManager.clear();
        expectError(mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token)),
                403, "Forbidden");
    }

    @Test
    void accountMeCarriesTheIsAdminFlag() throws Exception {
        mvc.perform(get("/account/me").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(true));

        String normal = verifiedToken("Tavaline2", "tavaline2@example.ee");
        mvc.perform(get("/account/me").header("Authorization", "Bearer " + normal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.isAdmin").value(false));
    }

    // ---------- admin shelter list (D3) ----------

    @Test
    void theAdminListHasAllStatusesTrustFieldsAndTheSubmitter() throws Exception {
        String author = verifiedToken("Autor", "autor@example.ee");
        long userId = createShelterViaApi(author, "Kasutaja varjend");
        // a visible review + a NON_EXISTENT report + the CLOSED/OPEN net
        mvc.perform(post("/api/shelters/" + userId + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("Arvustaja", "arvustaja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/shelters/" + userId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Arendaja", "arendaja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + userId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Arendaja2", "arendaja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CLOSED\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + userId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Arendaja3", "arendaja3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        // a hidden USER shelter (auto-hidden by the trust layer's path)
        long hiddenId = createShelterViaApi(author, "Peidetud oma");
        Shelter hidden = shelters.findById(hiddenId).orElseThrow();
        hidden.setStatus(ShelterStatus.INACTIVE);
        shelters.save(hidden);
        // a registry row: no submitter, import-owned
        long registryId = seedRegistryShelter("Registri varjend", "Pikakaevu 3, Tallinn");

        String token = adminToken();
        // the user shelter was created first → id order puts it before the
        // registry row; the hidden row is INCLUDED (all statuses)
        MvcResult result = mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        assertThat(((java.util.List<?>) JsonPath.read(body, "$")).size()).isEqualTo(3);

        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].name").value("Kasutaja varjend"))
                .andExpect(jsonPath("$[0].id").value(userId))
                .andExpect(jsonPath("$[0].source").value("USER"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].rating").value(5.0))
                .andExpect(jsonPath("$[0].reviewCount").value(1))
                .andExpect(jsonPath("$[0].nonexistentReports").value(1))
                .andExpect(jsonPath("$[0].statusFlag").value("CONFIRMED_OPEN"))
                .andExpect(jsonPath("$[0].submitter").value("Autor"));
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[?(@.name == 'Peidetud oma')].status")
                        .value(org.hamcrest.Matchers.contains("INACTIVE")))
                .andExpect(jsonPath("$[?(@.name == 'Registri varjend')].submitter")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andExpect(jsonPath("$[?(@.name == 'Registri varjend')].source")
                        .value(org.hamcrest.Matchers.contains("PAASETEAMET")))
                .andExpect(jsonPath("$[?(@.name == 'Registri varjend')].address")
                        .value(org.hamcrest.Matchers.contains("Pikakaevu 3, Tallinn")));
        // id order: user shelter < hidden shelter < registry row
        assertThat(((Number) JsonPath.read(body, "$[1].id")).longValue()).isGreaterThan(userId);
        assertThat(((Number) JsonPath.read(body, "$[2].id")).longValue()).isEqualTo(registryId);
    }

    @Test
    void theAdminListFiltersByStatusSourceAndQuery() throws Exception {
        long active = seedShelter("Otsitav A", ShelterSource.USER);
        long inactiveId = seedShelter("Otsitav B", ShelterSource.USER);
        Shelter inactive = shelters.findById(inactiveId).orElseThrow();
        inactive.setStatus(ShelterStatus.INACTIVE);
        shelters.save(inactive);
        seedRegistryShelter("Registri otsing", "Otsingu 12, Pärnu");
        String token = adminToken();

        // status: exact match
        mvc.perform(get("/admin/shelters").param("status", "INACTIVE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Otsitav B")));
        mvc.perform(get("/admin/shelters").param("status", "ACTIVE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder("Otsitav A", "Registri otsing")));

        // source: exact match
        mvc.perform(get("/admin/shelters").param("source", "PAASETEAMET")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Registri otsing")));
        mvc.perform(get("/admin/shelters").param("source", "USER")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder("Otsitav A", "Otsitav B")));

        // q: case-insensitive substring over name OR address
        mvc.perform(get("/admin/shelters").param("q", "OTSITAV")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder("Otsitav A", "Otsitav B")));
        mvc.perform(get("/admin/shelters").param("q", "pärnu")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Registri otsing")));
        mvc.perform(get("/admin/shelters").param("q", "puudub")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.empty()));

        // filters compose
        mvc.perform(get("/admin/shelters").param("source", "USER").param("q", "otsitav a")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Otsitav A")));
        assertThat(active).isNotNull();
    }

    // ---------- manual hide / restore (D3) ----------

    @Test
    void hideAndRestoreACycle() throws Exception {
        String author = verifiedToken("Omanik", "omanik@example.ee");
        long id = createShelterViaApi(author, "Peidetav");
        String token = adminToken();

        mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isNoContent());
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.INACTIVE);
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Peidetav"))));
        // the public detail stays readable (ids are public)
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.status").value("INACTIVE"));

        mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isNoContent());
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.hasItem("Peidetav")));

        // the SAME-status POST is a no-op: it must NOT disarm — checked on
        // a fresh, never-restored shelter (the cycle above already disarmed
        // the first one via its restore)
        long fresh = seedShelter("Samast", ShelterSource.USER);
        mvc.perform(post("/admin/shelters/" + fresh + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isNoContent());
        entityManager.flush();
        Boolean disarmed = jdbc.queryForObject(
                "SELECT auto_hide_disarmed FROM shelters WHERE id = ?", Boolean.class, fresh);
        assertThat(disarmed).isFalse();
    }

    @Test
    void aRestoreDisarmsAutoHidePermanently() throws Exception {
        long id = seedShelter("Taastatud", ShelterSource.USER);
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + id + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Esialgne" + i, "esialgne" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"type\":\"NON_EXISTENT\"}"))
                    .andExpect(status().isOk());
        }
        // auto-hidden at the 5th
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.INACTIVE);

        // the admin restore sets the manual-change marker (auto_hide_disarmed)
        mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isNoContent());
        entityManager.flush();
        Boolean disarmed = jdbc.queryForObject(
                "SELECT auto_hide_disarmed FROM shelters WHERE id = ?", Boolean.class, id);
        assertThat(disarmed).isTrue();

        // 5 MORE reports: the count goes to 10, but the shelter never re-hides
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + id + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Hilinen" + i, "hilinen" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"type\":\"NON_EXISTENT\"}"))
                    .andExpect(status().isOk());
        }
        Shelter restored = shelters.findById(id).orElseThrow();
        assertThat(restored.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(restored.isAutoHideDisarmed()).isTrue();
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.nonexistentReports").value(10));
    }

    // ---------- guard rails: registry rows + unknown ids (D4) ----------

    @Test
    void registryRowsAreImportOwned() throws Exception {
        long registryId = seedRegistryShelter("Tulet", "Tule 1, Tartu");
        String token = adminToken();

        expectError(mvc.perform(post("/admin/shelters/" + registryId + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}")),
                409, "Conflict");
        expectError(mvc.perform(delete("/admin/shelters/" + registryId)
                        .header("Authorization", "Bearer " + token)),
                409, "Conflict");
        // untouched: still ACTIVE, still there
        Shelter intact = shelters.findById(registryId).orElseThrow();
        assertThat(intact.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(intact.getSource()).isEqualTo(ShelterSource.PAASETEAMET);
    }

    @Test
    void unknownShelterIdsAre404AndBadBodiesAre400() throws Exception {
        String token = adminToken();
        expectError(mvc.perform(post("/admin/shelters/999999/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}")),
                404, "Not Found");
        expectError(mvc.perform(delete("/admin/shelters/999999")
                        .header("Authorization", "Bearer " + token)),
                404, "Not Found");
        // unknown enum value / missing field → 400
        long id = seedShelter("Valideeritav", ShelterSource.USER);
        expectError(mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"BOGUS\"}")),
                400, "Bad Request");
        expectError(mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")),
                400, "Bad Request");
    }

    // ---------- hard delete (D3) ----------

    @Test
    void aDeleteCascadesReviewsReportsAndOccupancy() throws Exception {
        String author = verifiedToken("Autor", "autor2@example.ee");
        long id = createShelterViaApi(author, "Prunk");
        // a review + a review report + a shelter report + an occupancy report
        mvc.perform(post("/api/shelters/" + id + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("Arv1", "arv1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":2,\"comment\":\"\"}"))
                .andExpect(status().isCreated());
        Long reviewId = jdbc.queryForObject(
                "SELECT id FROM shelter_reviews WHERE shelter_id = ?", Long.class, id);
        mvc.perform(post("/api/shelters/" + id + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Arv2", "arv2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"SPAM\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Aru1", "aru1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/shelters/" + id + "/occupancy")
                        .header("Authorization", "Bearer " + verifiedToken("Aru2", "aru2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"band\":\"FULL\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(delete("/admin/shelters/" + id).header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNoContent());

        // the row and its whole neighbourhood are gone
        assertThat(shelters.findById(id)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM shelters WHERE id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reviews WHERE shelter_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reports WHERE shelter_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM review_reports WHERE review_id = ?", Integer.class, reviewId)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_occupancy_reports WHERE shelter_id = ?", Integer.class, id)).isZero();
        // the public surface is clean
        mvc.perform(get("/api/shelters/" + id)).andExpect(status().isNotFound());
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.empty()));
    }

    // ---------- shelter report queue (D3) ----------

    @Test
    void theShelterReportQueueHasTheShapeOrderAndReporterIdentity() throws Exception {
        long a = seedShelter("Kolmetav A", ShelterSource.USER);
        long b = seedShelter("Kolmetav B", ShelterSource.USER);
        String token = adminToken();

        mvc.perform(post("/api/shelters/" + a + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kolmeja", "kolmeja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + a + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kolmeja2", "kolmeja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OTHER\",\"detail\":\"põhjutus siin\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + b + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kolmeja3", "kolmeja3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CLOSED\"}"))
                .andExpect(status().isOk());
        // explicit staggering — the queue order is by created_at, not by
        // luck: r2 newest, then r3, then r1
        Long r1 = reportId("Kolmeja", a);
        Long r2 = reportId("Kolmeja2", a);
        Long r3 = reportId("Kolmeja3", b);
        jdbc.update("UPDATE shelter_reports SET created_at = created_at - INTERVAL '3 minutes' WHERE id = ?", r1);
        jdbc.update("UPDATE shelter_reports SET created_at = created_at - INTERVAL '1 minute' WHERE id = ?", r2);
        jdbc.update("UPDATE shelter_reports SET created_at = created_at - INTERVAL '2 minutes' WHERE id = ?", r3);

        // the shelter-scoped queue: newest first, with shelter + reporter identity
        mvc.perform(get("/admin/reports").param("shelterId", String.valueOf(a))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[0].id").value(r2))
                .andExpect(jsonPath("$[1].id").value(r1))
                .andExpect(jsonPath("$[0].shelterId").value(a))
                .andExpect(jsonPath("$[0].shelterName").value("Kolmetav A"))
                .andExpect(jsonPath("$[0].shelterStatus").value("ACTIVE"))
                .andExpect(jsonPath("$[0].type").value("OTHER"))
                .andExpect(jsonPath("$[0].detail").value("põhjutus siin"))
                .andExpect(jsonPath("$[0].reporterName").value("Kolmeja2"))
                .andExpect(jsonPath("$[0].reporterEmail").value("kolmeja2@example.ee"))
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty())
                .andExpect(jsonPath("$[0].dismissed").value(false));

        // the unfiltered queue: every report, globally newest first
        mvc.perform(get("/admin/reports").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(3)))
                .andExpect(jsonPath("$[0].id").value(r2))
                .andExpect(jsonPath("$[1].id").value(r3))
                .andExpect(jsonPath("$[2].id").value(r1));
    }

    @Test
    void reportsForAnUnknownShelterAre404() throws Exception {
        expectError(mvc.perform(get("/admin/reports").param("shelterId", "999999")
                        .header("Authorization", "Bearer " + adminToken())),
                404, "Not Found");
    }

    @Test
    void aDismissIsIdempotentAndKeepsTheRow() throws Exception {
        long id = seedShelter("Märkitav", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kolmeja4", "kolmeja4@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        Long reportId = reportId("Kolmeja4", id);
        String token = adminToken();

        mvc.perform(post("/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        entityManager.flush();
        Instant stamp = jdbc.queryForObject(
                "SELECT dismissed_at FROM shelter_reports WHERE id = ?",
                Instant.class, reportId);
        assertThat(stamp).isNotNull();

        // the queue shows it resolved; the row is KEPT
        mvc.perform(get("/admin/reports").param("shelterId", String.valueOf(id))
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].dismissed").value(true));

        // a second dismiss is a 204 no-op — the stamp is untouched
        mvc.perform(post("/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject("SELECT dismissed_at FROM shelter_reports WHERE id = ?",
                Instant.class, reportId)).isEqualTo(stamp);
    }

    @Test
    void anUnknownReportDismissIs404() throws Exception {
        expectError(mvc.perform(post("/admin/reports/999999/dismiss")
                        .header("Authorization", "Bearer " + adminToken())),
                404, "Not Found");
    }

    // ---------- review report queue + hide/restore (D3) ----------

    @Test
    void theReviewReportQueueIncludesHiddenReviewsWithTheirMarkers() throws Exception {
        long id = seedShelter("Arvustatav", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + id + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("Autor", "autor3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":1,\"comment\":\"vöör info\"}"))
                .andExpect(status().isCreated());
        Long reviewId = jdbc.queryForObject(
                "SELECT id FROM shelter_reviews WHERE shelter_id = ?", Long.class, id);
        // 5 review reports → the trust layer hides the review
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + id + "/reviews/" + reviewId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Arvestaja" + i, "arvestaja" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(i == 5
                                    ? "{\"reason\":\"OTHER\",\"detail\":\"siin põhjus\"}"
                                    : "{\"reason\":\"SPAM\"}"))
                    .andExpect(status().isNoContent());
        }
        // stagger: the OTHER-reason report (id = the 5th, newest by default)
        // must come first
        entityManager.flush();
        jdbc.update("UPDATE review_reports SET created_at = created_at - INTERVAL '1 minute' " +
                "WHERE review_id = ? AND reason = 'SPAM'", reviewId);

        mvc.perform(get("/admin/review-reports").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(5)))
                .andExpect(jsonPath("$[0].shelterId").value(id))
                .andExpect(jsonPath("$[0].shelterName").value("Arvustatav"))
                .andExpect(jsonPath("$[0].reviewId").value(reviewId))
                .andExpect(jsonPath("$[0].reviewRating").value(1))
                .andExpect(jsonPath("$[0].reviewComment").value("vöör info"))
                .andExpect(jsonPath("$[0].reviewHidden").value(true))
                .andExpect(jsonPath("$[0].reason").value("OTHER"))
                .andExpect(jsonPath("$[0].detail").value("siin põhjus"))
                .andExpect(jsonPath("$[0].reporterName").value("Arvestaja5"))
                .andExpect(jsonPath("$[0].reporterEmail").value("arvestaja5@example.ee"))
                .andExpect(jsonPath("$[1].reason").value("SPAM"))
                .andExpect(jsonPath("$[1].detail").doesNotExist());
    }

    @Test
    void hideAndRestoreAreIdempotentAndRestoreRestoresTheAverage() throws Exception {
        long id = seedShelter("Hinnatav", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + id + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("Autor", "autor4@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":1,\"comment\":\"\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/shelters/" + id + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("Toetaja", "toetaja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":5,\"comment\":\"\"}"))
                .andExpect(status().isCreated());
        Long reviewId = jdbc.queryForObject(
                "SELECT r.id FROM shelter_reviews r JOIN users u ON u.id = r.user_id " +
                        "WHERE r.shelter_id = ? AND u.id = ?",
                Long.class, id, userIdByEmail("autor4@example.ee"));
        String token = adminToken();

        // before: both count (average 3.0)
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewCount").value(2))
                .andExpect(jsonPath("$.averageRating").value(3.0));

        // hide: 204, the review drops out of the public projection
        mvc.perform(post("/admin/reviews/" + reviewId + "/hide")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewCount").value(1))
                .andExpect(jsonPath("$.averageRating").value(5.0));
        entityManager.flush();
        Instant hiddenStamp = jdbc.queryForObject(
                "SELECT hidden_at FROM shelter_reviews WHERE id = ?", Instant.class, reviewId);
        assertThat(hiddenStamp).isNotNull();

        // hide again: 204 no-op, the stamp is untouched
        mvc.perform(post("/admin/reviews/" + reviewId + "/hide")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        assertThat(jdbc.queryForObject(
                "SELECT hidden_at FROM shelter_reviews WHERE id = ?", Instant.class, reviewId))
                .isEqualTo(hiddenStamp);

        // restore: 204, the review is back in the rating/count (trust
        // projection: hidden reviews were excluded, restore re-includes)
        mvc.perform(post("/admin/reviews/" + reviewId + "/restore")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewCount").value(2))
                .andExpect(jsonPath("$.averageRating").value(3.0));
        entityManager.flush();
        assertThat(jdbc.queryForObject(
                "SELECT hidden_at FROM shelter_reviews WHERE id = ?", Instant.class, reviewId)).isNull();

        // restore again: 204 no-op
        mvc.perform(post("/admin/reviews/" + reviewId + "/restore")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewCount").value(2));
    }

    @Test
    void unknownReviewIdsAre404() throws Exception {
        String token = adminToken();
        expectError(mvc.perform(post("/admin/reviews/999999/hide")
                        .header("Authorization", "Bearer " + token)),
                404, "Not Found");
        expectError(mvc.perform(post("/admin/reviews/999999/restore")
                        .header("Authorization", "Bearer " + token)),
                404, "Not Found");
    }

    /** The report id of the named reporter's report on a shelter (straight from the DB). */
    private long reportId(String reporterName, long shelterId) {
        return jdbc.queryForObject(
                "SELECT r.id FROM shelter_reports r JOIN users u ON u.id = r.user_id " +
                        "WHERE r.shelter_id = ? AND u.name = ?",
                Long.class, shelterId, reporterName);
    }
}
