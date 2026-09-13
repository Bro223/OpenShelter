package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Trust layer acceptance (shelter-trust-and-reports D1/D2/D4/D5,
 * community-self-moderation M9) — full-stack MockMvc against the real
 * services, security chain, JWT filter and Postgres, covering EVERY
 * scenario in specs/shelter-reports/spec.md plus the map-browse filter
 * scenarios and the shelter-submission cap: typed reports + derived
 * state, the trust-weighted five-point auto-hide (five baseline
 * reporters still hide on the fifth report; trusted reporters faster;
 * dampened reports count zero; no re-hide after a manual restore),
 * duplicate dampening of the self-interested rival's negative vote (the
 * endpoint answers {"damped": true|false}), the CLOSED/OPEN_CONFIRMED
 * flag, review reports + hidden-review exclusion, occupancy (upsert,
 * hedge/firm, 2 h staleness), the per-user submission cap and the trust
 * list filters.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        // The active-cap tests submit 11 shelters in one window — lift the
        // daily submission cap (abuse-limits M3) so it cannot fire first.
        "app.limits.daily-submissions-per-user=100"
})
@Transactional
class ShelterReportIT extends AbstractPersistenceIT {

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

    private long nextUser = 1;

    // ---------- helpers ----------

    private String verifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private String unverifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private long seedShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                source == ShelterSource.USER ? null : "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    /** Creates a USER shelter through the API (records the author link). */
    private long createShelterViaApi(String token, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(shelterBody(name)))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private static String shelterBody(String name) {
        return "{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}";
    }

    private static String reviewBody(int rating, String comment) {
        return "{\"rating\":" + rating + ",\"comment\":\"" + comment + "\"}";
    }

    private static String reportBody(String type, String detail) {
        return "{\"type\":\"" + type + "\"" + (detail == null ? "" : ",\"detail\":\"" + detail + "\"") + "}";
    }

    private static String occupancyBody(String band) {
        return "{\"band\":\"" + band + "\"}";
    }

    private static String reviewReportBody(String reason, String detail) {
        return "{\"reason\":\"" + reason + "\"" + (detail == null ? "" : ",\"detail\":\"" + detail + "\"") + "}";
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

    // ---------- shelter reports (D1) ----------

    @Test
    void verifiedUserReportIsStoredAndDerivedStateShowsOnNextList() throws Exception {
        long shelterId = seedShelter("Aruundetav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");

        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.damped").value(false));

        // the list fetch already carries the derived state (no extra calls)
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Aruundetav"))
                .andExpect(jsonPath("$[0].nonexistentReports").value(1))
                .andExpect(jsonPath("$[0].statusFlag").doesNotExist());
        // detail carries it too
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.nonexistentReports").value(1));
    }

    @Test
    void duplicateReportIs409AndCountStaysOne() throws Exception {
        long shelterId = seedShelter("Dubleeritav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");

        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());

        // same (shelter, user, type) again → 409, count stays at one
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null))),
                409, "Conflict");
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.nonexistentReports").value(1));

        // a DIFFERENT type for the same user is allowed
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("CLOSED", null)))
                .andExpect(status().isOk());
    }

    @Test
    void unverifiedUsersCannotReport() throws Exception {
        long shelterId = seedShelter("Kaitstev", ShelterSource.USER);
        String unverified = unverifiedToken("Priit", "priit@example.ee");

        // anonymous → 401, unverified → 403 — exactly like a submission attempt
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                .contentType(MediaType.APPLICATION_JSON).content(reportBody("NON_EXISTENT", null))),
                401, "Unauthorized");
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + unverified)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null))),
                403, "Forbidden");
        expectError(mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + unverified)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL"))),
                403, "Forbidden");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.nonexistentReports").value(0));
    }

    @Test
    void reportForUnknownShelterIs404() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        expectError(mvc.perform(post("/api/shelters/999999/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null))),
                404, "Not Found");
        expectError(mvc.perform(put("/api/shelters/999999/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL"))),
                404, "Not Found");
    }

    @Test
    void reportBodyValidationIs400() throws Exception {
        long shelterId = seedShelter("Valideeritav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");

        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("BOGUS", null))),
                400, "Bad Request");
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"detail\":\"milleagi\"}")),
                400, "Bad Request");
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("OTHER", "a".repeat(501)))),
                400, "Bad Request");
        expectError(mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("CRASHED"))),
                400, "Bad Request");
    }

    // ---------- auto-hide (D1) ----------

    @Test
    void fifthNonExistentReportHidesTheShelterAndRemovesItFromPublicList() throws Exception {
        // author via the API (so /mine has the row), 5 OTHER verified users report
        String author = verifiedToken("Autor", "autor@example.ee");
        long shelterId = createShelterViaApi(author, "Peanema varjend");
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Arendaja" + i, "arendaja" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportBody("NON_EXISTENT", null)))
                    .andExpect(status().isOk());
        }

        // hidden: INACTIVE, gone from the public list (any source filter),
        // but still fetchable by id and present in the owner's /mine
        Shelter stored = shelters.findById(shelterId).orElseThrow();
        assertThat(stored.getStatus()).isEqualTo(ShelterStatus.INACTIVE);

        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Peanema varjend"))));
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Peanema varjend"))));
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("INACTIVE"))
                .andExpect(jsonPath("$.nonexistentReports").value(5));
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Peanema varjend"))
                .andExpect(jsonPath("$[0].status").value("INACTIVE"));
    }

    @Test
    void oneToFourNonExistentReportsOnlyFlag() throws Exception {
        long shelterId = seedShelter("Neli aruanet", ShelterSource.USER);
        for (int i = 1; i <= 4; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Reporter" + i, "rep" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportBody("NON_EXISTENT", null)))
                    .andExpect(status().isOk());
        }

        // 1–4 reports: ACTIVE, public, flagged
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[?(@.name == 'Neli aruanet')].status")
                        .value(org.hamcrest.Matchers.contains("ACTIVE")))
                .andExpect(jsonPath("$[?(@.name == 'Neli aruanet')].nonexistentReports")
                        .value(org.hamcrest.Matchers.contains(4)));
    }

    @Test
    void noReHideAfterAManualRestore() throws Exception {
        long shelterId = seedShelter("Taastatud", ShelterSource.USER);
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Esialgne" + i, "esialgne" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportBody("NON_EXISTENT", null)))
                    .andExpect(status().isOk());
        }
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.INACTIVE);

        // admin restore (the admin-moderation change owns the write path —
        // simulate its resulting status change here)
        Shelter restored = shelters.findById(shelterId).orElseThrow();
        restored.setStatus(ShelterStatus.ACTIVE);
        shelters.save(restored);

        // later NON_EXISTENT reports increment the count (6, 7) but never re-hide
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Hilinen1", "hilinen1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Hilinen2", "hilinen2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());

        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[?(@.name == 'Taastatud')].nonexistentReports")
                        .value(org.hamcrest.Matchers.contains(7)));
    }

    // ---------- trust-weighted auto-hide + duplicate dampening (M9) ----------

    @Test
    void aDampenedRivalReportCountsZeroInTheHideTally() throws Exception {
        // The rival's own listing of the same place is rejected (INACTIVE) —
        // the displaced-rival vector: M3's cross-user 409 no longer blocks
        // the re-listing because only ACTIVE rows are scanned.
        String rival = verifiedToken("Rivaleer", "rivaleer@example.ee");
        long rivalRow = createShelterViaApi(rival, "Rivale varjend");
        Shelter rejected = shelters.findById(rivalRow).orElseThrow();
        rejected.setStatus(ShelterStatus.INACTIVE);
        rejected.setReviewStatus(ReviewStatus.REJECTED);
        shelters.save(rejected);

        // the same place is re-listed by another user
        String author = verifiedToken("Autor9", "autor9@example.ee");
        long shelterId = createShelterViaApi(author, "Rivale varjend");

        // the rival's self-interested NON_EXISTENT vote: stored, dampened,
        // and it counts 0 — the endpoint says so
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + rival)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.damped").value(true));
        Integer dampenedRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reports WHERE damped = TRUE", Integer.class);
        assertThat(dampenedRows).isEqualTo(1);

        // four baseline points: the dampened vote is not a fifth
        for (int i = 1; i <= 4; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Haelija" + i, "haelija" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportBody("NON_EXISTENT", null)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.damped").value(false));
        }
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);

        // the fifth FULL point crosses the tally
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Haelija5", "haelija5@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.INACTIVE);
    }

    @Test
    void trustedReportersReachTheFivePointTallyWithFewerReports() throws Exception {
        long shelterId = seedShelter("Sihtvarjend", ShelterSource.USER);

        // two reporters each get a cross-verified own submission (weight 2):
        // their NEW row is promoted by a cross-user OPEN_CONFIRMED
        String t1 = verifiedToken("Usaldat1", "usaldat1@example.ee");
        long t1Row = createShelterViaApi(t1, "Usaldus row 1");
        mvc.perform(post("/api/shelters/" + t1Row + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja1", "kinnitaja1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("OPEN_CONFIRMED", null)))
                .andExpect(status().isOk());
        String t2 = verifiedToken("Usaldat2", "usaldat2@example.ee");
        long t2Row = createShelterViaApi(t2, "Usaldus row 2");
        mvc.perform(post("/api/shelters/" + t2Row + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja2", "kinnitaja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("OPEN_CONFIRMED", null)))
                .andExpect(status().isOk());
        assertThat(shelters.findById(t1Row).orElseThrow().getReviewStatus())
                .isEqualTo(ReviewStatus.CONFIRMED);

        // 2 + 2 = 4 points: still ACTIVE
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + t1)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.damped").value(false));
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + t2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.ACTIVE);

        // the third (baseline) point crosses the five-point tally
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Punkt", "punkt@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("NON_EXISTENT", null)))
                .andExpect(status().isOk());
        assertThat(shelters.findById(shelterId).orElseThrow().getStatus())
                .isEqualTo(ShelterStatus.INACTIVE);
    }

    // ---------- CLOSED / OPEN_CONFIRMED flag (D1) ----------

    @Test
    void closedReportsFlagReportedClosedAndTheShelterStays() throws Exception {
        long shelterId = seedShelter("Suletud varjend", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Suletud1", "suletud1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("CLOSED", null)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Suletud2", "suletud2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("CLOSED", null)))
                .andExpect(status().isOk());

        // 2 CLOSED, 0 OPEN_CONFIRMED → "Reported closed" — and it stays mappable
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[?(@.name == 'Suletud varjend')].statusFlag")
                        .value(org.hamcrest.Matchers.contains("REPORTED_CLOSED")))
                .andExpect(jsonPath("$[?(@.name == 'Suletud varjend')].status")
                        .value(org.hamcrest.Matchers.contains("ACTIVE")));
    }

    @Test
    void openConfirmationsFlipTheFlagToConfirmedOpen() throws Exception {
        long shelterId = seedShelter("Tagasiavatud", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Suletud3", "suletud3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("CLOSED", null)))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Suletud4", "suletud4@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reportBody("CLOSED", null)))
                .andExpect(status().isOk());
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.statusFlag").value("REPORTED_CLOSED"));

        // 3 OPEN_CONFIRMED after 2 CLOSED → flips, visible throughout
        for (int i = 5; i <= 7; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Avatud" + i, "avatud" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reportBody("OPEN_CONFIRMED", null)))
                    .andExpect(status().isOk());
        }
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[?(@.name == 'Tagasiavatud')].statusFlag")
                        .value(org.hamcrest.Matchers.contains("CONFIRMED_OPEN")))
                .andExpect(jsonPath("$[?(@.name == 'Tagasiavatud')].status")
                        .value(org.hamcrest.Matchers.contains("ACTIVE")));
    }

    // ---------- review reports + hidden reviews (D2) ----------

    @Test
    void fiveReviewReportsHideTheReviewAndExcludeItFromAggregates() throws Exception {
        long shelterId = seedShelter("Arvustatav", ShelterSource.USER);
        String author = verifiedToken("Autor", "autor2@example.ee");
        // the author's hidden-to-be review: rating 1 (a bad rating it attacked)
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(1, "vöör info")))
                .andExpect(status().isCreated());
        // a fair visible review: rating 5
        String fair = verifiedToken("Toetaja", "toetaja@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + fair)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(5, "reaalne")))
                .andExpect(status().isCreated());

        // before: both count
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.reviewCount").value(2))
                .andExpect(jsonPath("$.averageRating").value(3.0));

        long reviewId = reviewIdOf(shelterId, "Autor");
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Arvestaja" + i, "arvestaja" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reviewReportBody("SPAM", null)))
                    .andExpect(status().isNoContent());
        }

        // hidden now: excluded from the public list, the average and the count —
        // and the row itself is retained (hiding never deletes)
        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].authorName").value("Toetaja"));
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.reviewCount").value(1))
                .andExpect(jsonPath("$.averageRating").value(5.0));
        // the row is still there (evidence for the admin queue)
        Integer retained = jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_reviews WHERE hidden_at IS NOT NULL", Integer.class);
        assertThat(retained).isEqualTo(1);
    }

    @Test
    void authorStillSeesTheirHiddenReviewMarkedHidden() throws Exception {
        long shelterId = seedShelter("Oma varjend", ShelterSource.USER);
        String author = verifiedToken("Autor", "autor3@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(2, "peida mind")))
                .andExpect(status().isCreated());
        long reviewId = reviewIdOf(shelterId, "Autor");
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Arv" + i, "arv" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reviewReportBody("FALSY_DATA", null)))
                    .andExpect(status().isNoContent());
        }

        // the author's detail-page fetch: their own hidden review, marked
        mvc.perform(get("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].authorName").value("Autor"))
                .andExpect(jsonPath("$[0].hidden").value(true));
        // a different verified user never receives it
        String other = verifiedToken("Teine", "teine2@example.ee");
        mvc.perform(get("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + other))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(0)));
    }

    @Test
    void ownReviewReportIs403AndNothingIsStored() throws Exception {
        long shelterId = seedShelter("Oma arvustus", ShelterSource.USER);
        String author = verifiedToken("Autor", "autor4@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(4, "süütu")))
                .andExpect(status().isCreated());
        long reviewId = reviewIdOf(shelterId, "Autor");

        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("SPAM", null))),
                403, "Forbidden");

        // still fully visible, nothing stored
        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].hidden").value(false));
    }

    @Test
    void duplicateReviewReportIs409() throws Exception {
        long shelterId = seedShelter("Dubleeritav arvustus", ShelterSource.USER);
        String author = verifiedToken("Autor", "autor5@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(3, "süütu")))
                .andExpect(status().isCreated());
        long reviewId = reviewIdOf(shelterId, "Autor");
        String reporter = verifiedToken("Arvaja", "arvaja@example.ee");

        mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + reporter)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("SPAM", null)))
                .andExpect(status().isNoContent());

        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + reporter)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("OTHER", "üks ja ainult üks"))),
                409, "Conflict");
    }

    @Test
    void reviewReportRequiresExistingShelterAndReviewOfThatShelter() throws Exception {
        long shelterId = seedShelter("Otsitav", ShelterSource.USER);
        String author = verifiedToken("Autor", "autor6@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(3, "siin")))
                .andExpect(status().isCreated());
        long reviewId = reviewIdOf(shelterId, "Autor");
        String token = verifiedToken("Arvaja", "arvaja2@example.ee");

        // unknown shelter → 404
        expectError(mvc.perform(post("/api/shelters/999999/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("SPAM", null))),
                404, "Not Found");
        // a real review pointed at the WRONG shelter → 404 (no cross-shelter)
        expectError(mvc.perform(post("/api/shelters/" + (shelterId + 1) + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("SPAM", null))),
                404, "Not Found");
        // an unknown review id under a real shelter → 404
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reviews/999999/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("SPAM", null))),
                404, "Not Found");
        // a bogus reason → 400
        expectError(mvc.perform(post("/api/shelters/" + shelterId + "/reviews/" + reviewId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewReportBody("BOGUS", null))),
                400, "Bad Request");
    }

    // ---------- occupancy (D4) ----------

    @Test
    void loneFreshOccupancyIsHedged() throws Exception {
        long shelterId = seedShelter("Ainuke", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari2@example.ee");

        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL")))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[0].occupancy.band").value("FULL"))
                .andExpect(jsonPath("$[0].occupancy.reportCount").value(1)) // hedged copy at 1
                .andExpect(jsonPath("$[0].occupancy.lastReportedAt").isNotEmpty());
    }

    @Test
    void agreeingFreshReportsFirmUp() throws Exception {
        long shelterId = seedShelter("Täisvarjend", ShelterSource.USER);
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + verifiedToken("Esmene", "esmene@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL")))
                .andExpect(status().isNoContent());
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + verifiedToken("Teine", "teine3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL")))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[0].occupancy.band").value("FULL"))
                .andExpect(jsonPath("$[0].occupancy.reportCount").value(2)); // firm
    }

    @Test
    void theLatestBandWinsOverEarlierDisagreeingReports() throws Exception {
        long shelterId = seedShelter("Muutuvarjend", ShelterSource.USER);
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + verifiedToken("Täis1", "tais1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL")))
                .andExpect(status().isNoContent());
        // a later SPACE report: the band flips, only one agrees
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + verifiedToken("Vaba1", "vaba1@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("SPACE")))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[0].occupancy.band").value("SPACE"))
                .andExpect(jsonPath("$[0].occupancy.reportCount").value(1));
    }

    @Test
    void staleOccupancyDisappearsAtReadTime() throws Exception {
        long shelterId = seedShelter("Vana", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari3@example.ee");
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("FULL")))
                .andExpect(status().isNoContent());

        // age the report past the 2 h window (no cleanup job — read-time check)
        jdbc.update("UPDATE shelter_occupancy_reports SET updated_at = updated_at - INTERVAL '3 hours'");

        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[0].occupancy").doesNotExist());
    }

    @Test
    void occupancyUpsertsOneRowPerUserAndDetailCarriesYourBand() throws Exception {
        long shelterId = seedShelter("Uuendatav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari4@example.ee");

        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("SPACE")))
                .andExpect(status().isNoContent());
        // re-report: latest band wins, still one live report per user
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(occupancyBody("GETTING_FULL")))
                .andExpect(status().isNoContent());

        // detail carries the caller's own band for the picker pre-select
        mvc.perform(get("/api/shelters/" + shelterId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$.yourOccupancyBand").value("GETTING_FULL"))
                .andExpect(jsonPath("$.occupancy.band").value("GETTING_FULL"))
                .andExpect(jsonPath("$.occupancy.reportCount").value(1));
        // the list projection is detail-free: no own band there
        mvc.perform(get("/api/shelters").param("source", "USER")
                        .header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$[0].yourOccupancyBand").doesNotExist());
        // other callers get no band (guests and anonymous included)
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.yourOccupancyBand").doesNotExist());
        mvc.perform(get("/api/shelters/" + shelterId)
                        .header("Authorization", "Bearer " + verifiedToken("Teine", "teine4@example.ee")))
                .andExpect(jsonPath("$.yourOccupancyBand").doesNotExist());
    }

    @Test
    void occupancyNeverHides() throws Exception {
        long shelterId = seedShelter("Alati nähtav", ShelterSource.USER);
        for (int i = 1; i <= 3; i++) {
            mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                            .header("Authorization", "Bearer " + verifiedToken("Täis" + i, "tais" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(occupancyBody("FULL")))
                    .andExpect(status().isNoContent());
        }

        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(jsonPath("$[?(@.name == 'Alati nähtav')].status")
                        .value(org.hamcrest.Matchers.contains("ACTIVE")));
    }

    // ---------- per-user submission cap (D3) ----------

    @Test
    void eleventhActiveShelterIs409AndDeletingFreesTheCap() throws Exception {
        String token = verifiedToken("Koguja", "koguja@example.ee");
        long firstId = 0;
        for (int i = 1; i <= 10; i++) {
            MvcResult created = mvc.perform(post("/api/shelters")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(shelterBody("Varjend " + i)))
                    .andExpect(status().isCreated())
                    .andReturn();
            long id = ((Number) com.jayway.jsonpath.JsonPath.read(
                    created.getResponse().getContentAsString(), "$.id")).longValue();
            if (i == 1) {
                firstId = id;
            }
        }

        // the 11th active USER shelter is rejected with a plain message
        expectError(mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(shelterBody("Üle piiri"))),
                409, "Conflict");
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + token))
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(10)));

        // deleting one frees the cap
        mvc.perform(delete("/api/shelters/" + firstId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(shelterBody("Vaba koht")))
                .andExpect(status().isCreated());
    }

    @Test
    void hiddenAndRegistrySheltersDoNotCountTowardsTheCap() throws Exception {
        String token = verifiedToken("Piirim", "piirim@example.ee");
        for (int i = 1; i <= 9; i++) {
            mvc.perform(post("/api/shelters")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(shelterBody("Aktiivne " + i)))
                    .andExpect(status().isCreated());
        }
        // a hidden OWN shelter (status flipped directly) — does not count
        long hiddenId = shelters.findByCreatedBy(users.findByEmail("piirim@example.ee").getId()).get(0).getId();
        Shelter hidden = shelters.findById(hiddenId).orElseThrow();
        hidden.setStatus(ShelterStatus.INACTIVE);
        shelters.save(hidden);
        // registry rows are not the user's at all
        seedShelter("Registri varjend", ShelterSource.PAASETEAMET);

        // 9 active + 1 hidden + registry → the 10th active still passes
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(shelterBody("Kümnes")))
                .andExpect(status().isCreated());
    }

    // ---------- trust filters (D5) ----------

    @Test
    void reviewedFilterKeepsOnlySheltersWithVisibleReviews() throws Exception {
        long visible = seedShelter("Arvustatud", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + visible + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("ArvU", "arvu@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(4, "")))
                .andExpect(status().isCreated());

        long hiddenOnly = seedShelter("Peadetud", ShelterSource.USER);
        mvc.perform(post("/api/shelters/" + hiddenOnly + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("ArvH", "arvh@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(5, "peita")))
                .andExpect(status().isCreated());
        long hiddenReviewId = reviewIdOf(hiddenOnly, "ArvH");
        for (int i = 1; i <= 5; i++) {
            mvc.perform(post("/api/shelters/" + hiddenOnly + "/reviews/" + hiddenReviewId + "/reports")
                            .header("Authorization", "Bearer " + verifiedToken("Peitja" + i, "peitja" + i + "@example.ee"))
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(reviewReportBody("SPAM", null)))
                    .andExpect(status().isNoContent());
        }

        long none = seedShelter("Ilma", ShelterSource.USER);

        mvc.perform(get("/api/shelters").param("reviewed", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Arvustatud")));
        // a hidden-only shelter does NOT pass reviewed=true
        mvc.perform(get("/api/shelters").param("reviewed", "true"))
                .andExpect(jsonPath("$[*].name",
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Peadetud"))));
        // the negation keeps the unreviewed (visible) shelters
        mvc.perform(get("/api/shelters").param("reviewed", "false"))
                .andExpect(jsonPath("$[*].name",
                        org.hamcrest.Matchers.containsInAnyOrder("Peadetud", "Ilma")));
    }

    @Test
    void hasCapacityFilterKeepsSheltersWithCapacityData() throws Exception {
        String token = verifiedToken("Maht", "maht@example.ee");
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Mahuga\",\"latitude\":59.4,\"longitude\":24.7,\"capacity\":40}"))
                .andExpect(status().isCreated());
        seedShelter("Ilma Mahuta", ShelterSource.USER);

        mvc.perform(get("/api/shelters").param("hasCapacity", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Mahuga")));
        mvc.perform(get("/api/shelters").param("hasCapacity", "false"))
                .andExpect(jsonPath("$[*].name",
                        org.hamcrest.Matchers.containsInAnyOrder("Ilma Mahuta")));
    }

    @Test
    void trustFiltersComposeWithTheSourceFilter() throws Exception {
        // USER + reviewed + hasCapacity → the intersection (M11: the
        // minRating filter is gone — a stray param is ignored, not an error)
        String token = verifiedToken("Liitja", "liitja@example.ee");
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Kõik korras\",\"latitude\":59.4,\"longitude\":24.7,\"capacity\":10}"))
                .andExpect(status().isCreated());
        long qualifiedId = shelters.findByCreatedBy(users.findByEmail("liitja@example.ee").getId())
                .stream().filter(s -> s.getName().equals("Kõik korras")).findFirst().orElseThrow().getId();
        mvc.perform(post("/api/shelters/" + qualifiedId + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("LiitArv", "liitarv@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(4, "")))
                .andExpect(status().isCreated());
        // a REGISTRY shelter that also matches — must be cut by source=USER
        long registry = seedShelter("Registri hinne", ShelterSource.PAASETEAMET);
        mvc.perform(post("/api/shelters/" + registry + "/reviews")
                        .header("Authorization", "Bearer " + verifiedToken("RegArv", "regarv@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(5, "")))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/shelters")
                        .param("source", "USER")
                        .param("reviewed", "true")
                        .param("hasCapacity", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name").value(org.hamcrest.Matchers.contains("Kõik korras")));
    }

    @Test
    void theStrayMinRatingParamIsIgnoredNotAnError() throws Exception {
        // M11: the rating filter is gone — old clients that still send
        // minRating get the unfiltered list (Spring drops unknown params),
        // never a 400.
        seedShelter("Muinene", ShelterSource.USER);
        mvc.perform(get("/api/shelters").param("minRating", "4"))
                .andExpect(status().isOk());
        mvc.perform(get("/api/shelters").param("minRating", "abc"))
                .andExpect(status().isOk());
    }

    // ---------- public list ACTIVE-only (D5) ----------

    @Test
    void inactiveShelterIsAbsentFromPublicListButPresentInMine() throws Exception {
        String author = verifiedToken("Omanik", "omanik@example.ee");
        long shelterId = createShelterViaApi(author, "Peidetud oma");
        Shelter inactive = shelters.findById(shelterId).orElseThrow();
        inactive.setStatus(ShelterStatus.INACTIVE);
        shelters.save(inactive);

        mvc.perform(get("/api/shelters"))
                .andExpect(jsonPath("$[*].name").value(
                        org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("Peidetud oma"))));
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(jsonPath("$[0].name").value("Peidetud oma"))
                .andExpect(jsonPath("$[0].status").value("INACTIVE"));
        // detail stays available
        mvc.perform(get("/api/shelters/" + shelterId)).andExpect(status().isOk());
    }

    /** Resolves the review id of the named author's review of a shelter (straight from the DB). */
    private long reviewIdOf(long shelterId, String authorName) {
        return jdbc.queryForObject(
                "SELECT r.id FROM shelter_reviews r JOIN users u ON u.id = r.user_id " +
                        "WHERE r.shelter_id = ? AND u.name = ?",
                Long.class, shelterId, authorName);
    }
}
