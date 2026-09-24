package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import jakarta.persistence.EntityManager;
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
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the community trust lifecycle without a blocking
 * queue — full-stack MockMvc against the real services, security chain,
 * JWT filter and Postgres:
 * new USER rows publish IMMEDIATELY as NEW (public list + /mine); three
 * DISTINCT community confirmers promote NEW→CONFIRMED (the crossing
 * action writes the AUTO_CONFIRM audit row; the submitter's own
 * confirmation never counts, not even as the third); the rare admin
 * CONFIRM/REJECT decisions (REJECT hides via
 * status INACTIVE + stores the reason; restoring a REJECTED row via the
 * existing status endpoint reverts it to NEW); registry rows untouched
 * (review → 409, import-owned, backfilled CONFIRMED); the moderation
 * audit trail (one row per action with the correct previous/new
 * review_status pair and actor, read-time name resolution — "Deleted
 * shelter" once the row is gone); and the private-home declaration
 * (locationKind) round-tripping. The admin is (re-)seeded before each
 * test by the shared base (create-if-absent, the shared-container hazard
 * fix) and logs in through the normal /auth/login, like AdminModerationIT.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        // the AGGREGATE per-IP login bucket (the credential-stuffing valve)
        // is in-memory per context and shared by every login in it — this
        // class logs the admin in more than the default 20 times, so it
        // runs its own context with a raised cap (AdminModerationIT stays
        // on the shared-default context and under its 20)
        "app.ratelimit.login-ip-capacity=1000",
        "app.ratelimit.login-ip-refill-per-second=0"
})
@Transactional
class CommunityReviewIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    ee.sheltermap.app.UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    JdbcTemplate jdbc;

    /**
     * The test transaction and the MockMvc requests share one persistence
     * context (same thread). Raw JDBC reads do NOT trigger Hibernate's
     * auto-flush (only JPA queries do), and raw JDBC writes are invisible
     * to the L1 cache — so flush before JDBC assertions.
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
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
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

    // ---------- new submission: public immediately, as NEW ----------

    @Test
    void aNewSubmissionIsPublicImmediatelyWithTheNewTrustState() throws Exception {
        String author = verifiedToken("Autor", "autor@example.ee");
        // the 201 response describes the row
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Uus varjend\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.locationKind").value("PUBLIC"))
                .andExpect(jsonPath("$.reviewNote").doesNotExist());

        long id = shelters.findAll().stream()
                .filter(s -> s.getName().equals("Uus varjend"))
                .findFirst().orElseThrow().getId();

        // public IMMEDIATELY: list + detail (no blocking queue)
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].reviewStatus")
                        .value(org.hamcrest.Matchers.contains("NEW")));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // the owner's /mine shows NEW
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$[0].id").value(id))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].reviewStatus").value("NEW"))
                .andExpect(jsonPath("$[0].reviewNote").doesNotExist());

        // the admin "Unconfirmed" queue (USER + NEW + ACTIVE) has it —
        // asserted through the production admin queue
        // (AdminModerationService.listShelters → ShelterQueryService
        // .findAllForAdmin, the surface the Unconfirmed tab reads), not a
        // repository seam
        mvc.perform(get("/admin/shelters").param("source", "USER").param("status", "ACTIVE")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == " + id + ")].reviewStatus")
                        .value(org.hamcrest.Matchers.contains("NEW")))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].submitter").value(
                        org.hamcrest.Matchers.contains("Autor")));
    }

    // ---------- automatic trust: community confirmation ----------

    /** One OPEN_CONFIRMED report from a distinct non-submitter. */
    private void openConfirmed(long shelterId, String token) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void threeDistinctConfirmationsConfirmTheRowAndAuditTheCrossingOne() throws Exception {
        String author = verifiedToken("Autor", "autor2@example.ee");
        long id = createShelterViaApi(author, "Kinnitatav");
        long authorId = shelters.findById(id).orElseThrow().getCreatedBy();

        // the first two distinct confirmers stay below the threshold —
        // the owner-reported defect was that ONE of them already flipped
        // the row community-verified
        openConfirmed(id, verifiedToken("Kinnitaja1", "kinnitaja1@example.ee"));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
        openConfirmed(id, verifiedToken("Kinnitaja2", "kinnitaja2@example.ee"));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        // the third distinct confirmer crosses
        openConfirmed(id, verifiedToken("Kinnitaja", "kinnitaja@example.ee"));

        // CONFIRMED: the row keeps its public visibility, the state moved
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("CONFIRMED");
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$[0].reviewStatus").value("CONFIRMED"));

        // the AUTO_CONFIRM audit row: the CROSSING reporter is the actor
        // of record — exactly one row, written on the third action
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ? AND action = 'AUTO_CONFIRM'",
                Integer.class, id)).isEqualTo(1);
        Long confirmerId = userIdByEmail("kinnitaja@example.ee"); // PII-at-rest: hash lookup
        assertThat(jdbc.queryForObject(
                        "SELECT action FROM moderation_actions WHERE shelter_id = ?", String.class, id))
                .isEqualTo("AUTO_CONFIRM");
        assertThat(jdbc.queryForObject(
                        "SELECT previous_status FROM moderation_actions WHERE shelter_id = ?",
                        String.class, id)).isEqualTo("NEW");
        assertThat(jdbc.queryForObject(
                        "SELECT new_status FROM moderation_actions WHERE shelter_id = ?",
                        String.class, id)).isEqualTo("CONFIRMED");
        assertThat(jdbc.queryForObject(
                        "SELECT moderator_id FROM moderation_actions WHERE shelter_id = ?",
                        Long.class, id)).isEqualTo(confirmerId);
        assertThat(authorId).isNotEqualTo(confirmerId);
    }

    @Test
    void theSubmittersOwnPositiveReportDoesNotConfirm() throws Exception {
        String author = verifiedToken("Autor", "autor3@example.ee");
        long id = createShelterViaApi(author, "Oma kinnitus");

        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());

        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("NEW");
        assertThat(jdbc.queryForObject(
                "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ?", Integer.class, id))
                .isZero();
    }

    // ---------- the rare admin decisions ----------

    @Test
    void anAdminConfirmConfirmsWithoutTouchingTheStatus() throws Exception {
        String author = verifiedToken("Autor", "autor4@example.ee");
        long id = createShelterViaApi(author, "Manuaalselt");
        long adminId = userIdByEmail("admin@example.ee"); // PII-at-rest: hash lookup

        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_note FROM shelters WHERE id = ?",
                String.class, id)).isNull();
        assertThat(jdbc.queryForObject(
                        "SELECT action FROM moderation_actions WHERE shelter_id = ?", String.class, id))
                .isEqualTo("CONFIRM");
        assertThat(jdbc.queryForObject(
                        "SELECT previous_status || '->' || COALESCE(new_status, 'NULL') "
                                + "FROM moderation_actions WHERE shelter_id = ?",
                        String.class, id)).isEqualTo("NEW->CONFIRMED");
        assertThat(jdbc.queryForObject(
                        "SELECT moderator_id FROM moderation_actions WHERE shelter_id = ?",
                        Long.class, id)).isEqualTo(adminId);
    }

    @Test
    void aRejectHidesTheRowStoresTheReasonAndARestoreStartsOverAsNew() throws Exception {
        String author = verifiedToken("Autor", "autor5@example.ee");
        long id = createShelterViaApi(author, "Keeldatud");

        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"REJECT\",\"reason\":\"Pole varjend\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.ok").value(true));

        // hidden: out of the public list (status INACTIVE — the existing
        // mechanism); the detail stays readable by id like any INACTIVE row
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Keeldatud"))));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.reviewStatus").value("REJECTED"))
                // OWNER-SCOPED: the anonymous detail read must NOT carry the
                // moderator's REJECT reason (ids are sequential — an unscoped
                // note would be enumerable)
                .andExpect(jsonPath("$.reviewNote").doesNotExist());

        // the owner-scoped surfaces DO carry it: the submitter's own detail
        // read…
        mvc.perform(get("/api/shelters/" + id).header("Authorization", "Bearer " + author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("REJECTED"))
                .andExpect(jsonPath("$.reviewNote").value("Pole varjend"));
        // …and an authenticated NON-owner still gets nothing
        mvc.perform(get("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + verifiedToken("Teine", "teine@example.ee")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("REJECTED"))
                .andExpect(jsonPath("$.reviewNote").doesNotExist());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_note FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("Pole varjend");

        // the owner sees REJECTED + the admin's reason
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$[0].reviewStatus").value("REJECTED"))
                .andExpect(jsonPath("$[0].reviewNote").value("Pole varjend"))
                .andExpect(jsonPath("$[0].status").value("INACTIVE"));

        // the existing status endpoint restores it — and the review state
        // starts over as NEW (v2), NOT CONFIRMED
        mvc.perform(post("/admin/shelters/" + id + "/status")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ACTIVE\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.hasItem("Keeldatud")));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        // two audit rows with the correct pairs, newest first
        entityManager.flush();
        List<String> pairs = jdbc.query(
                "SELECT previous_status || '->' || COALESCE(new_status, 'NULL') FROM moderation_actions "
                        + "WHERE shelter_id = ? ORDER BY id DESC",
                (rs, rowNum) -> rs.getString(1), id);
        assertThat(pairs).containsExactly("REJECTED->NEW", "NEW->REJECTED");
    }

    // ---------- registry rows are unaffected ----------

    @Test
    void registryRowsAreImportOwnedAndReviewIs409() throws Exception {
        long registryId = seedRegistryShelter("Registri varjend", "Tule 1, Tartu");
        // backfilled CONFIRMED and publicly listed exactly as before
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.hasItem("Registri varjend")));
        mvc.perform(get("/api/shelters/" + registryId))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.locationKind").value("PUBLIC"));
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, registryId)).isEqualTo("CONFIRMED");

        // a review decision on a registry row → 409 (the import-owned
        // guard), the row untouched
        expectError(mvc.perform(post("/admin/shelters/" + registryId + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"REJECT\",\"reason\":\"miks?\"}")),
                409, "Conflict");
        Shelter intact = shelters.findById(registryId).orElseThrow();
        assertThat(intact.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(intact.getReviewStatus()).isEqualTo(ReviewStatus.CONFIRMED);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ?",
                Integer.class, registryId)).isZero();

        // unknown id → 404; malformed bodies → 400
        expectError(mvc.perform(post("/admin/shelters/999999/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}")),
                404, "Not Found");
        long userId = createShelterViaApi(verifiedToken("Autor", "autor6@example.ee"), "Valideeritav");
        expectError(mvc.perform(post("/admin/shelters/" + userId + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"APPROVE\"}")),
                400, "Bad Request");
        expectError(mvc.perform(post("/admin/shelters/" + userId + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}")),
                400, "Bad Request");
    }

    // ---------- the audit trail ----------

    @Test
    void everyActionWritesAnAuditRowWithTheRightTransition() throws Exception {
        String author = verifiedToken("Autor", "autor7@example.ee");
        String token = adminToken();
        // the row for the trust-lifecycle actions
        long trust = createShelterViaApi(author, "Audit 1");
        // a row with a report for the queue actions
        long queue = createShelterViaApi(author, "Audit 2");
        mvc.perform(post("/api/shelters/" + queue + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kolmeja", "kolmeja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"NON_EXISTENT\"}"))
                .andExpect(status().isOk());

        // the actions, oldest → newest
        // three distinct confirmers cross the verify threshold on the
        // third report (one AUTO_CONFIRM row, the crossing reporter is
        // the actor)
        mvc.perform(post("/api/shelters/" + queue + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja", "kinnitaja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk()); // below the threshold
        mvc.perform(post("/api/shelters/" + queue + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja3", "kinnitaja3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk()); // still below
        mvc.perform(post("/api/shelters/" + queue + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja4", "kinnitaja4@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk()); // → AUTO_CONFIRM (NEW->CONFIRMED)
        mvc.perform(post("/admin/shelters/" + queue + "/status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"INACTIVE\"}"))
                .andExpect(status().isNoContent()); // → STATUS_CHANGE
        Long reportId = jdbc.queryForObject(
                "SELECT id FROM shelter_reports WHERE shelter_id = ? AND type = 'NON_EXISTENT'",
                Long.class, queue);
        mvc.perform(post("/admin/reports/" + reportId + "/dismiss")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent()); // → REPORT_DISMISS
        mvc.perform(post("/admin/shelters/" + trust + "/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk()); // → CONFIRM (NEW->CONFIRMED)
        mvc.perform(post("/admin/shelters/" + trust + "/review")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"REJECT\",\"reason\":\"Pole varjend\"}"))
                .andExpect(status().isOk()); // → REJECT (CONFIRMED->REJECTED)

        // newest first; the correct action and transition pairs end to end
        mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(5)))
                .andExpect(jsonPath("$[0].action").value("REJECT"))
                .andExpect(jsonPath("$[0].shelterId").value(trust))
                .andExpect(jsonPath("$[0].shelterName").value("Audit 1"))
                .andExpect(jsonPath("$[0].previousStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$[0].newStatus").value("REJECTED"))
                .andExpect(jsonPath("$[0].reason").value("Pole varjend"))
                .andExpect(jsonPath("$[0].moderatorName").isNotEmpty())
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty())
                .andExpect(jsonPath("$[0].id").isNotEmpty())
                .andExpect(jsonPath("$[1].action").value("CONFIRM"))
                .andExpect(jsonPath("$[1].previousStatus").value("NEW"))
                .andExpect(jsonPath("$[1].newStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$[2].action").value("REPORT_DISMISS"))
                .andExpect(jsonPath("$[3].action").value("STATUS_CHANGE"))
                .andExpect(jsonPath("$[4].action").value("AUTO_CONFIRM"))
                .andExpect(jsonPath("$[4].previousStatus").value("NEW"))
                .andExpect(jsonPath("$[4].newStatus").value("CONFIRMED"));
        // the AUTO_CONFIRM actor is the CROSSING reporter, not an admin
        Long kinnitajaId = userIdByEmail("kinnitaja4@example.ee"); // PII-at-rest: hash lookup
        entityManager.flush();
        assertThat(jdbc.queryForObject(
                        "SELECT moderator_id FROM moderation_actions WHERE action = 'AUTO_CONFIRM' "
                                + "AND shelter_id = ?",
                        Long.class, queue)).isEqualTo(kinnitajaId);

        // the limit param: newest 2, then a bad limit is a 400
        mvc.perform(get("/admin/audit").param("limit", "2").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[0].action").value("REJECT"))
                .andExpect(jsonPath("$[1].action").value("CONFIRM"));
        expectError(mvc.perform(get("/admin/audit").param("limit", "0")
                        .header("Authorization", "Bearer " + token)),
                400, "Bad Request");
        expectError(mvc.perform(get("/admin/audit").param("limit", "201")
                        .header("Authorization", "Bearer " + token)),
                400, "Bad Request");

        // every row's actor is the acting user (admin or the reporter)
        Long adminId = userIdByEmail("admin@example.ee"); // PII-at-rest: hash lookup
        assertThat(jdbc.queryForObject(
                        "SELECT COUNT(*) FROM moderation_actions WHERE moderator_id = ?",
                        Integer.class, adminId)).isEqualTo(4);
    }

    @Test
    void aDeletedShelterRendersDeletedInTheAuditLog() throws Exception {
        String author = verifiedToken("Autor", "autor8@example.ee");
        long id = createShelterViaApi(author, "Kustutatav");
        String token = adminToken();

        mvc.perform(delete("/admin/shelters/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        // the audit row outlives the shelter (no FK on shelter_id):
        // previous = the review state, new = null
        mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].action").value("DELETE"))
                .andExpect(jsonPath("$[0].shelterId").value(id))
                .andExpect(jsonPath("$[0].shelterName").value("Deleted shelter"))
                .andExpect(jsonPath("$[0].previousStatus").value("NEW"))
                .andExpect(jsonPath("$[0].newStatus").doesNotExist());
    }

    @Test
    void theAuditLogIsAdminOnly() throws Exception {
        expectError(mvc.perform(get("/admin/audit")), 401, "Unauthorized");
        expectError(mvc.perform(post("/admin/shelters/1/review")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}")),
                401, "Unauthorized");
        String normal = verifiedToken("Tavaline", "tavaline@example.ee");
        expectError(mvc.perform(get("/admin/audit").header("Authorization", "Bearer " + normal)),
                403, "Forbidden");
        expectError(mvc.perform(post("/admin/shelters/1/review")
                        .header("Authorization", "Bearer " + normal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}")),
                403, "Forbidden");
    }

    // ---------- the private-home declaration ----------

    @Test
    void aPrivateDeclarationRoundTripsOnEverySurface() throws Exception {
        String author = verifiedToken("Autor", "autor9@example.ee");
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Privaatkodu\",\"latitude\":59.4,\"longitude\":24.7,"
                                + "\"locationKind\":\"PRIVATE\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.locationKind").value("PRIVATE"))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));

        long id = shelters.findAll().stream()
                .filter(s -> s.getName().equals("Privaatkodu"))
                .findFirst().orElseThrow().getId();
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT location_kind FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("PRIVATE");

        // public list + detail (private rows are public results)
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].locationKind")
                        .value(org.hamcrest.Matchers.contains("PRIVATE")));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.locationKind").value("PRIVATE"));
        // /mine
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$[0].locationKind").value("PRIVATE"));
        // admin list
        mvc.perform(get("/admin/shelters").header("Authorization", "Bearer " + adminToken()))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].locationKind")
                        .value(org.hamcrest.Matchers.contains("PRIVATE")));

        // an unknown kind is a 400 malformed body
        expectError(mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Kummaline\",\"latitude\":59.4,\"longitude\":24.7,"
                                + "\"locationKind\":\"SECRET\"}")),
                400, "Bad Request");
    }

    // ---------- owner edits: the pending-verification reset ----------

    @Test
    void anOwnerEditPublishesImmediatelyAndCarriesThePendingVerificationState() throws Exception {
        String author = verifiedToken("Autor", "autor-m5b-1@example.ee");
        long id = createShelterViaApi(author, "varjend");

        // verified first: the row is green/CONFIRMED
        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.provenance").value("COMMUNITY_REPORTED"));

        // the owner's edit (the name moves): it PUBLISHES IMMEDIATELY —
        // the row stays ACTIVE and on the public map — and carries the
        // SAME pending state a newly added shelter does (NEW → the amber
        // UNDER_REVIEW provenance, the "pending verification" treatment)
        mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"varjend 2\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.provenance").value("UNDER_REVIEW"));
        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].reviewStatus")
                        .value(org.hamcrest.Matchers.contains("NEW")));
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // the row is back in the admin's Unconfirmed queue (USER + NEW +
        // ACTIVE) — the operational surface for the re-verification
        mvc.perform(get("/admin/shelters").param("source", "USER").param("status", "ACTIVE")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(jsonPath("$[?(@.id == " + id + ")].reviewStatus")
                        .value(org.hamcrest.Matchers.contains("NEW")));

        // the edit itself writes no moderation audit row (it is an owner
        // edit, not a moderation action — it shows in the shelter's edit
        // history): the trail holds only the CONFIRM
        entityManager.flush();
        assertThat(jdbc.queryForObject(
                        "SELECT COUNT(*) FROM moderation_actions WHERE shelter_id = ?",
                        Integer.class, id)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                        "SELECT action FROM moderation_actions WHERE shelter_id = ?",
                        String.class, id)).isEqualTo("CONFIRM");

        // and a verification AFTER the edit clears the pending state
        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.provenance").value("COMMUNITY_REPORTED"));
    }

    @Test
    void aCommunityConfirmationAfterAnEditClearsThePendingState() throws Exception {
        String author = verifiedToken("Autor", "autor-m5b-2@example.ee");
        long id = createShelterViaApi(author, "kinnitus");
        String first = verifiedToken("Kinnitaja", "kinnitaja-m5b-1@example.ee");

        // one community confirmation is below the 3-distinct threshold
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization", "Bearer " + first)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("NEW");

        // the owner's edit voids the pending tally again — the data
        // changed, so the previous stamp no longer covers it
        mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"kinnitus 2\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("NEW");

        // the pre-edit confirmation still counts (one report per user per
        // shelter per type — the other confirmers are different users):
        // two more distinct confirmations clear the pending state, on the
        // third overall
        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization",
                                "Bearer " + verifiedToken("Kinnitaja2", "kinnitaja-m5b-2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("NEW");

        mvc.perform(post("/api/shelters/" + id + "/reports")
                        .header("Authorization",
                                "Bearer " + verifiedToken("Kinnitaja3", "kinnitaja-m5b-3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("CONFIRMED");
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.provenance").value("COMMUNITY_REPORTED"));
    }

    @Test
    void anEditByANonOwnerIsStillRefusedAndChangesNothing() throws Exception {
        String author = verifiedToken("Autor", "autor-m5b-3@example.ee");
        long id = createShelterViaApi(author, "oma");
        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk());

        expectError(mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization",
                                "Bearer " + verifiedToken("Vooris", "vooris-m5b@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Varastatud\",\"latitude\":59.4,\"longitude\":24.7}")),
                403, "Forbidden");

        // nothing moved: name, trust state and status untouched
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(jsonPath("$.name").value("oma"))
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));
    }

    @Test
    void theClientCannotSetTheTrustStateThroughTheEditBody() throws Exception {
        String author = verifiedToken("Autor", "autor-m5b-4@example.ee");
        long id = createShelterViaApi(author, "usaldus");
        mvc.perform(post("/admin/shelters/" + id + "/review")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"action\":\"CONFIRM\"}"))
                .andExpect(status().isOk());

        // the body tries to ride the trust state through. No such fields
        // exist on the request (UpdateShelterRequest) — the unknowns are
        // ignored, and the owner-edit trust reset decides the state
        mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"usaldus 2\",\"latitude\":59.4,\"longitude\":24.7,"
                                + "\"reviewStatus\":\"CONFIRMED\",\"provenance\":\"OFFICIAL\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.provenance").value("UNDER_REVIEW"));
        entityManager.flush();
        assertThat(jdbc.queryForObject("SELECT review_status FROM shelters WHERE id = ?",
                String.class, id)).isEqualTo("NEW");
    }
}
