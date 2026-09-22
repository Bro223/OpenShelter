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

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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
        "app.admin.password=admin-pass-1",
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
        // The per-IP /auth/login bucket (capacity 20, ~3s per refill token,
        // application.yml) is shared by EVERY IT class in the run — one
        // MockMvc IP, one context. Each redundant login burns a scarce
        // token and the class sits at the bucket's edge, so the admin
        // token is memoized per class: the JWT is stateless and the
        // per-request kind guard re-reads the row, so a shared token
        // changes no assertion (the demotion test nulls the cache after
        // it changes the admin's kind).
        if (sharedAdminToken == null) {
            MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                    .andExpect(status().isOk())
                    .andReturn();
            sharedAdminToken = JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
        }
        return sharedAdminToken;
    }

    private static volatile String sharedAdminToken;

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
        long adminId = userIdByEmail("admin@example.ee"); // PII-at-rest: hash lookup
        String token = adminToken();

        // the pre-demotion request works (the guard re-reads the kind)
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());

        // demote: the JWT stays valid, but the kind is the truth
        jdbc.update("UPDATE users SET kind = 'REGISTERED' WHERE id = ?", adminId);
        // the memoized class token is now a demoted subject for every
        // later test — drop it so a re-login (if any) re-issues
        sharedAdminToken = null;
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
        // a NON_EXISTENT report + the CLOSED/OPEN net
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
                .andExpect(jsonPath("$[0].nonexistentReports").value(1))
                .andExpect(jsonPath("$[0].openStatus").doesNotExist())
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
        // A municipality-import row — the REGISTRY filter's second member
        // (the frontend-facing filter groups Päästeamet + municipality).
        Shelter municipality = new Shelter("Linna otsing", new GeoPoint(58.5, 25.9),
                ShelterStatus.ACTIVE, "ext-muni", ShelterSource.MUNICIPALITY);
        shelters.save(municipality);
        String token = adminToken();

        // status: exact match
        mvc.perform(get("/admin/shelters").param("status", "INACTIVE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Otsitav B")));
        mvc.perform(get("/admin/shelters").param("status", "ACTIVE")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder("Otsitav A", "Registri otsing", "Linna otsing")));

        // source: the frontend-facing filter (REGISTRY = Päästeamet +
        // municipality imports; USER = user submissions)
        mvc.perform(get("/admin/shelters").param("source", "REGISTRY")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.containsInAnyOrder("Registri otsing", "Linna otsing")));
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

    @Test
    void theAdminListPagesTheFilteredOrderWithTheTotalHeader() throws Exception {
        // Five USER rows in creation (id) order + one registry row the
        // source filter must keep out of the paged scope.
        long a = seedShelter("Lehek A", ShelterSource.USER);
        long b = seedShelter("Lehek B", ShelterSource.USER);
        long c = seedShelter("Lehek C", ShelterSource.USER);
        long d = seedShelter("Lehek D", ShelterSource.USER);
        long e = seedShelter("Lehek E", ShelterSource.USER);
        seedRegistryShelter("Lehek F", "Registri 1, Pärnu");
        String token = adminToken();

        // Absent params: the whole filtered list + the header (always
        // present, the un-paged length).
        mvc.perform(get("/admin/shelters").param("source", "USER")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(5))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("X-Total-Count", "5"));

        // Consecutive pages tile the filtered order (id-ascending — the
        // stored order), no overlap or skips, the header is the FILTERED
        // length (the registry row never counts).
        List<Long> tiled = new java.util.ArrayList<>();
        for (long offset = 0; offset < 5; offset += 2) {
            com.jayway.jsonpath.DocumentContext pageJson =
                    com.jayway.jsonpath.JsonPath.parse(mvc.perform(get("/admin/shelters")
                                    .param("source", "USER")
                                    .param("limit", "2")
                                    .param("offset", String.valueOf(offset))
                                    .header("Authorization", "Bearer " + token))
                            .andExpect(status().isOk())
                            .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                                    .header().string("X-Total-Count", "5"))
                            .andReturn().getResponse().getContentAsString());
            List<?> page = pageJson.read("$[*].id");
            for (Object id : page) {
                tiled.add(((Number) id).longValue());
            }
        }
        assertThat(tiled).containsExactly(a, b, c, d, e);

        // Past the end: an empty page, the total intact — never an error.
        mvc.perform(get("/admin/shelters").param("source", "USER")
                        .param("limit", "2").param("offset", "5")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers
                        .header().string("X-Total-Count", "5"));

        // The bounds are the public guidance's vocabulary (uniform 400s).
        mvc.perform(get("/admin/shelters").param("limit", "0")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/admin/shelters").param("limit", "201")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("limit must be between 1 and 200"));
        mvc.perform(get("/admin/shelters").param("offset", "-1")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("offset must be non-negative"));
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
    void aDeleteCascadesReportsOccupancyAndOpenStatus() throws Exception {
        String author = verifiedToken("Autor", "autor2@example.ee");
        long id = createShelterViaApi(author, "Prunk");
        // a shelter report + an occupancy report + an open-status tap
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
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .put("/api/shelters/" + id + "/open-status")
                        .header("Authorization", "Bearer " + verifiedToken("Aru3", "aru3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"state\":\"OPEN\"}"))
                .andExpect(status().isNoContent());

        mvc.perform(delete("/admin/shelters/" + id).header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNoContent());

        // the row and its whole neighbourhood are gone
        assertThat(shelters.findById(id)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM shelters WHERE id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reports WHERE shelter_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_occupancy_reports WHERE shelter_id = ?", Integer.class, id)).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_open_status WHERE shelter_id = ?", Integer.class, id)).isZero();
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
    void theReportQueueIsBoundedInSqlWithUnchangedNewestFirstOrder() throws Exception {
        // The queue's table is append-only: the read must stay bounded at
        // the store (the audit-trail twin's bound — default 100, max 200,
        // 400 outside), and the bound must not change the order.
        long shelterId = seedShelter("Märgitud", ShelterSource.USER);
        String[] types = {"NON_EXISTENT", "CLOSED", "OPEN_CONFIRMED", "WRONG_LOCATION", "OTHER"};
        long[] userIds = new long[24];
        for (int i = 0; i < 24; i++) {
            RegisteredUser u = new RegisteredUser("Bulk" + i, "bulk" + i + "@example.ee",
                    "+3725002" + String.format("%04d", i));
            users.save(u);
            userIds[i] = u.getId();
        }
        // 120 rows for ONE shelter (24 users x 5 types — the unique
        // (shelter, user, type) holds), each a minute older than the last:
        // row i has created_at = base - i minutes, so row 0 is newest.
        java.time.Instant base = java.time.Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        for (int i = 0; i < 120; i++) {
            jdbc.update("INSERT INTO shelter_reports (shelter_id, user_id, type, detail, created_at) "
                            + "VALUES (?, ?, ?, NULL, ?)",
                    shelterId, userIds[i % 24], types[i % 5],
                    java.sql.Timestamp.from(base.minus(i, java.time.temporal.ChronoUnit.MINUTES)));
        }
        String token = adminToken();

        java.util.List<Instant> all = queueCreatedAts(mvc.perform(
                        get("/admin/reports").param("limit", "200")
                                .header("Authorization", "Bearer " + token))
                .andReturn(), 120);

        // default: the newest 100 of the 120
        java.util.List<Instant> defaulted = queueCreatedAts(mvc.perform(
                        get("/admin/reports").header("Authorization", "Bearer " + token))
                .andReturn(), 100);
        assertThat(defaulted).isEqualTo(all.subList(0, 100)); // the bound trims the TAIL
        assertThat(defaulted).doesNotContain(
                base.minus(100, java.time.temporal.ChronoUnit.MINUTES)); // the 101st-newest row is outside the window

        // an explicit smaller limit: the same newest-first prefix
        java.util.List<Instant> fifty = queueCreatedAts(mvc.perform(
                        get("/admin/reports").param("limit", "50")
                                .header("Authorization", "Bearer " + token))
                .andReturn(), 50);
        assertThat(fifty).isEqualTo(all.subList(0, 50));

        // the ORDER is the unbounded order restricted to the window:
        // strictly newest-first, minute by minute
        for (int i = 1; i < all.size(); i++) {
            assertThat(all.get(i)).isBefore(all.get(i - 1));
        }

        // the bound applies to the shelter-scoped queue the same way
        java.util.List<Instant> scoped = queueCreatedAts(mvc.perform(
                        get("/admin/reports").param("shelterId", String.valueOf(shelterId))
                                .header("Authorization", "Bearer " + token))
                .andReturn(), 100);
        assertThat(scoped).isEqualTo(all.subList(0, 100));

        // the bound vocabulary is the audit's: 400 outside 1..200
        expectError(mvc.perform(get("/admin/reports").param("limit", "0")
                        .header("Authorization", "Bearer " + token)),
                400, "Bad Request");
        expectError(mvc.perform(get("/admin/reports").param("limit", "201")
                        .header("Authorization", "Bearer " + token)),
                400, "Bad Request");
    }

    /** The queue response's createdAt column, parsed, with a pinned row count. */
    private java.util.List<Instant> queueCreatedAts(
            org.springframework.test.web.servlet.MvcResult result, int expectedSize)
            throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        com.fasterxml.jackson.databind.JsonNode rows = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(result.getResponse().getContentAsString());
        assertThat(rows.isArray()).as("the queue response is a JSON array").isTrue();
        java.util.List<Instant> stamps = new java.util.ArrayList<>();
        rows.forEach(row -> stamps.add(Instant.parse(row.get("createdAt").asText())));
        assertThat(stamps).hasSize(expectedSize);
        return stamps;
    }

    // ---------- W2-A: every admin list is a bounded page + a stable count ----------

    @Test
    void theUsersListPagesInStableOrderWithTheTotalHeader() throws Exception {
        // The admin users list must be a bounded page (limit/offset) with the
        // X-Total-Count header = the FILTERED length WITHOUT paging — the
        // same number on every page, so the UI can page without re-counting.
        String token = adminToken();
        for (int i = 0; i < 5; i++) {
            RegisteredUser u = new RegisteredUser("Lehekord " + i, "pageu" + i + "@example.ee",
                    "+3725003" + String.format("%04d", i));
            users.save(u);
        }
        // the full filtered list (one unbounded read) is the reference set —
        // the header must equal its length and the pages must partition it
        MvcResult all = mvc.perform(get("/admin/users")
                        .header("Authorization", "Bearer " + token)
                        .param("limit", "200"))
                .andExpect(status().isOk())
                .andReturn();
        int total = Integer.parseInt(all.getResponse().getHeader("X-Total-Count"));
        java.util.List<Long> allIds = parseIds(all.getResponse().getContentAsString());
        assertThat(allIds).hasSize(total);
        assertThat(allIds).isNotEmpty();

        java.util.Set<Long> seen = new java.util.HashSet<>();
        for (long offset = 0; offset < allIds.size(); offset += 2) {
            MvcResult page = mvc.perform(get("/admin/users")
                            .header("Authorization", "Bearer " + token)
                            .param("limit", "2").param("offset", String.valueOf(offset)))
                    .andExpect(status().isOk())
                    .andExpect(header().string("X-Total-Count", String.valueOf(total)))
                    .andReturn();
            java.util.List<Long> pageIds = parseIds(page.getResponse().getContentAsString());
            assertThat(pageIds).as("page at offset " + offset).hasSize(Math.min(2, allIds.size() - (int) offset));
            assertThat(pageIds).as("each page is the same stable window of the full order")
                    .isEqualTo(allIds.subList((int) offset, (int) offset + pageIds.size()));
            for (long id : pageIds) {
                assertThat(seen).as("no row appears on two pages").doesNotContain(id);
                seen.add(id);
            }
        }
        assertThat(seen).containsExactlyInAnyOrderElementsOf(allIds);
    }

    @Test
    void theReportQueueOffsetSlicesNewestFirstWithTheTotalHeader() throws Exception {
        // The offset window slices the SAME newest-first order the unbounded
        // read uses, and the header stays the filtered length (this shelter's
        // report count), never the page length.
        long shelterId = seedShelter("Ridade", ShelterSource.USER);
        String[] types = {"NON_EXISTENT", "CLOSED", "OPEN_CONFIRMED"};
        java.time.Instant base = java.time.Instant.now().truncatedTo(java.time.temporal.ChronoUnit.MINUTES);
        for (int i = 0; i < 3; i++) {
            RegisteredUser u = new RegisteredUser("Ridade" + i, "ridade" + i + "@example.ee",
                    "+3725004" + String.format("%04d", i));
            users.save(u);
            jdbc.update("INSERT INTO shelter_reports (shelter_id, user_id, type, detail, created_at) "
                            + "VALUES (?, ?, ?, NULL, ?)",
                    shelterId, u.getId(), types[i],
                    java.sql.Timestamp.from(base.minus(i, java.time.temporal.ChronoUnit.MINUTES)));
        }
        String token = adminToken();

        MvcResult middle = mvc.perform(get("/admin/reports")
                        .header("Authorization", "Bearer " + token)
                        .param("shelterId", String.valueOf(shelterId))
                        .param("limit", "1").param("offset", "1"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andReturn();
        java.util.List<Instant> middleStamps = queueCreatedAts(middle, 1);
        java.util.List<Instant> full = queueCreatedAts(mvc.perform(get("/admin/reports")
                        .header("Authorization", "Bearer " + token)
                        .param("shelterId", String.valueOf(shelterId)))
                .andReturn(), 3);
        assertThat(middleStamps).isEqualTo(full.subList(1, 2)); // the SECOND-newest row

        MvcResult tail = mvc.perform(get("/admin/reports")
                        .header("Authorization", "Bearer " + token)
                        .param("shelterId", String.valueOf(shelterId))
                        .param("limit", "1").param("offset", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andReturn();
        assertThat(queueCreatedAts(tail, 1)).isEqualTo(full.subList(2, 3));
    }

    @Test
    void theAuditListPagesWithTheTotalHeader() throws Exception {
        // The audit trail is the bounded twin (limit/offset) with the header
        // = the full trail length, stable across pages.
        String author = verifiedToken("Auvitaja", "auvitaja@example.ee");
        // A DIFFERENT verified user OPEN-CONFIRMS the author's NEW USER
        // shelters — the cross-user OPEN_CONFIRMED tap is the report flow's
        // AUTO_CONFIRM audit action (one trail row per shelter; the author's
        // own tap would not fire it); the admin hide adds the third row.
        String confirmer = verifiedToken("Kinnitaja", "kinnitaja@example.ee");
        long a = createShelterViaApi(author, "Auvitamine A");
        long b = createShelterViaApi(author, "Auvitamine B");
        String token = adminToken();
        mvc.perform(post("/api/shelters/" + a + "/reports")
                        .header("Authorization", "Bearer " + confirmer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk()); // the report answer is the dampening outcome (200), not a creation
        mvc.perform(post("/api/shelters/" + b + "/reports")
                        .header("Authorization", "Bearer " + confirmer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/admin/shelters/" + a + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isNoContent());

        // The class' shared trail already carries earlier tests' actions —
        // read the total from the API itself and check the paging math
        // against it: header = the full trail length, stable across pages,
        // and the offset windows slice the SAME newest-first order.
        MvcResult first = mvc.perform(get("/admin/audit")
                        .header("Authorization", "Bearer " + token)
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andReturn();
        int total = Integer.parseInt(first.getResponse().getHeader("X-Total-Count"));
        assertThat(total).as("the two report submissions + the hide landed in the trail")
                .isGreaterThanOrEqualTo(3);
        String firstBody = first.getResponse().getContentAsString();
        assertThat(firstBody).as("the newest actions are this test's own").contains("Auvitamine A");
        assertThat(org.springframework.util.StringUtils.countOccurrencesOf(firstBody, "\"id\""))
                .isEqualTo(2);

        long tailOffset = total - 1L;
        MvcResult tail = mvc.perform(get("/admin/audit")
                        .header("Authorization", "Bearer " + token)
                        .param("limit", "2").param("offset", String.valueOf(tailOffset)))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", String.valueOf(total)))
                .andReturn();
        String tailBody = tail.getResponse().getContentAsString();
        assertThat(org.springframework.util.StringUtils.countOccurrencesOf(tailBody, "\"id\""))
                .as("the tail page carries the single oldest action").isEqualTo(1);
    }

    /** The "id" column of a JSON array of admin DTOs. */
    private java.util.List<Long> parseIds(String json) throws Exception {
        com.fasterxml.jackson.databind.JsonNode rows = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(json);
        java.util.List<Long> ids = new java.util.ArrayList<>();
        rows.forEach(row -> ids.add(row.get("id").asLong()));
        return ids;
    }

    @Test
    void factualReportDetailsReachTheAdminQueueAndBinaryTypesDropThem() throws Exception {
        // The factual types carry their detail into the admin queue;
        // the binary types store the claim without the text.
        long a = seedShelter("Suletud koht", ShelterSource.USER);
        long b = seedShelter("Viga asukoht", ShelterSource.USER);
        String token = adminToken();

        mvc.perform(post("/api/shelters/" + a + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Suletaja", "suletaja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CLOSED\",\"detail\":\"suletud 12.05\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + b + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Asukohataja", "asukohataja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"WRONG_LOCATION\",\"detail\":\"päris aadress on 5\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + b + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Poisitaja", "poisitaja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\",\"detail\":\"sõna maha\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/admin/reports").param("shelterId", String.valueOf(a))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].type").value("CLOSED"))
                .andExpect(jsonPath("$[0].detail").value("suletud 12.05"));

        mvc.perform(get("/admin/reports").param("shelterId", String.valueOf(b))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.type == 'WRONG_LOCATION')].detail",
                        org.hamcrest.Matchers.contains("päris aadress on 5")))
                .andExpect(jsonPath("$[?(@.type == 'NON_EXISTENT')].detail",
                        org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())));
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

    // ---------- dismissal stops counting (NON_EXISTENT tally + display) ----------

    @Test
    void aDismissedNonExistentReportStopsCountingInTallyAndDisplay() throws Exception {
        long id = seedShelter("Lugatu", ShelterSource.USER);
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + id + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Aru" + i, "aru" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"type\":\"NON_EXISTENT\"}"))
                    .andExpect(status().isOk());
        }
        // auto-hidden at the fifth report
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.INACTIVE);

        // the admin judged one of them invalid — it stops influencing
        // anything (the row itself stays in the queue)
        Long reportId = reportId("Aru1", id);
        mvc.perform(post("/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNoContent());
        entityManager.flush();

        // the displayed count drops 5 → 4
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.nonexistentReports").value(4));
        mvc.perform(get("/admin/reports").param("shelterId", String.valueOf(id))
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(5)))
                .andExpect(jsonPath("$[?(@.id == " + reportId + ")].dismissed")
                        .value(org.hamcrest.Matchers.contains(true)));
    }

    @Test
    void fiveWithOneDismissedDoNotAutoHideAndTheFifthUndismissedStillHides() throws Exception {
        long id = seedShelter("Viis aruanet", ShelterSource.USER);
        for (int i = 1; i <= 4; i++) {
            mvc.perform(post("/api/shelters/" + id + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Viies" + i, "viies" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"type\":\"NON_EXISTENT\"}"))
                    .andExpect(status().isOk());
        }

        // the admin dismisses one: the tally sees three undismissed reports
        Long reportId = reportId("Viies1", id);
        mvc.perform(post("/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNoContent());
        entityManager.flush();

        // the fifth report arrives: only four undismissed count → stays ACTIVE
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Viies5", "viies5@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.nonexistentReports").value(4));

        // the sixth report: five undismissed → hides (the undismissed five
        // still auto-hide)
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Viies6", "viies6@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());
        assertThat(shelters.findById(id).orElseThrow().getStatus()).isEqualTo(ShelterStatus.INACTIVE);
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.nonexistentReports").value(5));
    }

    /** The report id of the named reporter's report on a shelter (straight from the DB). */
    private long reportId(String reporterName, long shelterId) {
        return jdbc.queryForObject(
                "SELECT r.id FROM shelter_reports r JOIN users u ON u.id = r.user_id " +
                        "WHERE r.shelter_id = ? AND u.name = ?",
                Long.class, shelterId, reporterName);
    }
}
