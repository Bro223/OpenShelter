package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Community pulse acceptance (report aggregation UI) — full-stack
 * MockMvc against the real services, security chain, JWT filter and
 * Postgres: the detail read carries the fresh-window aggregates (the
 * plain open/closed counts and the empty/partial/full distribution),
 * the trust-weighted shares (a trusted reporter outweighs baseline
 * ones, exactly like the auto-hide tally), the anonymized recent-report
 * log (time + what, NO reporter identity) and the explicit empty state
 * (stale → null blocks, never a neutral gauge). The pulse is public
 * (guests read it) and detail-only (absent on the list); the existing
 * single-report hedge behaviour and the {"damped": bool} report
 * response stay untouched.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class CommunityPulseIT extends AbstractPersistenceIT {

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

    private long seedShelter(String name) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                null, ShelterSource.USER);
        shelters.save(shelter);
        return shelter.getId();
    }

    private void tapOpenStatus(String token, long shelterId, String state) throws Exception {
        mvc.perform(put("/api/shelters/" + shelterId + "/open-status")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"state\":\"" + state + "\"}"))
                .andExpect(status().isNoContent());
    }

    private void tapOccupancy(String token, long shelterId, String band) throws Exception {
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"band\":\"" + band + "\"}"))
                .andExpect(status().isNoContent());
    }

    // ---------- the aggregate query (detail read) ----------

    @Test
    void theDetailReadCarriesTheFreshCountsAndTheAnonymizedLog() throws Exception {
        long shelterId = seedShelter("Pulsed");
        String t1 = verifiedToken("Avatud1", "avatud1@example.ee");
        String t2 = verifiedToken("Avatud2", "avatud2@example.ee");
        String t3 = verifiedToken("Suletud1", "suletud1@example.ee");
        String t4 = verifiedToken("Täis1", "tais1@example.ee");
        String t5 = verifiedToken("Täitumas1", "taitumas1@example.ee");

        tapOpenStatus(t1, shelterId, "OPEN");
        tapOpenStatus(t2, shelterId, "OPEN");
        tapOpenStatus(t3, shelterId, "CLOSED");
        tapOccupancy(t4, shelterId, "FULL");
        tapOccupancy(t5, shelterId, "GETTING_FULL");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                // the plain counts (the "general count")
                .andExpect(jsonPath("$.communityPulse.openClosed.openReports").value(2))
                .andExpect(jsonPath("$.communityPulse.openClosed.closedReports").value(1))
                .andExpect(jsonPath("$.communityPulse.occupancy.spaceReports").value(0))
                .andExpect(jsonPath("$.communityPulse.occupancy.gettingFullReports").value(1))
                .andExpect(jsonPath("$.communityPulse.occupancy.fullReports").value(1))
                // the baseline-weighted shares: 2/3 open; (0 + 0.5 + 1)/2 fullness
                .andExpect(jsonPath("$.communityPulse.openClosed.openShare").value(2.0 / 3.0))
                .andExpect(jsonPath("$.communityPulse.occupancy.fullness").value(0.75))
                // the recent log: five entries, each with exactly what + when
                .andExpect(jsonPath("$.communityPulse.recentReports.length()").value(5))
                .andExpect(jsonPath("$.communityPulse.recentReports[0].kind").isNotEmpty())
                .andExpect(jsonPath("$.communityPulse.recentReports[0].reportedAt").isNotEmpty())
                // the existing blocks stay untouched beside the pulse
                .andExpect(jsonPath("$.openStatus.state").isNotEmpty())
                .andExpect(jsonPath("$.occupancy.band").isNotEmpty());
    }

    @Test
    void thePulseIsPublicForGuestsAndAbsentFromTheList() throws Exception {
        long shelterId = seedShelter("Avalik pulss");
        tapOpenStatus(verifiedToken("Avatud", "avatul-public@example.ee"), shelterId, "OPEN");

        // guest: no token at all — the emergency map must stay viewable
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.communityPulse.openClosed.openReports").value(1));

        // the list projection is pulse-free: communityPulse stays null on
        // list rows (Jackson keeps the property — the same treatment the
        // other detail-only nulls, e.g. yourOccupancyBand, already get)
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(status().isOk())
                .andExpect(result -> org.assertj.core.api.Assertions.assertThat(
                        (List<Object>) com.jayway.jsonpath.JsonPath.read(
                                result.getResponse().getContentAsString(),
                                "$[?(@.name == 'Avalik pulss')].communityPulse"))
                        .hasSize(1)
                        .first()
                        .isNull());
    }

    @Test
    void theEmptyStateAnswersNullBlocksNeverANeutralGauge() throws Exception {
        long shelterId = seedShelter("Tühjapoolne");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.communityPulse").exists())
                .andExpect(jsonPath("$.communityPulse.openClosed").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.occupancy").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.recentReports").isEmpty());
    }

    @Test
    void staleReportsAgeOutAtReadTimeLikeEveryOtherBlock() throws Exception {
        long shelterId = seedShelter("Vana pulss");
        tapOpenStatus(verifiedToken("Vana1", "vana1@example.ee"), shelterId, "CLOSED");
        tapOccupancy(verifiedToken("Vana2", "vana2@example.ee"), shelterId, "FULL");

        // age both families past the 2 h window (no cleanup job — read-time)
        jdbc.update("UPDATE shelter_open_status SET created_at = created_at - INTERVAL '3 hours'");
        jdbc.update("UPDATE shelter_occupancy_reports SET updated_at = updated_at - INTERVAL '3 hours'");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.communityPulse.openClosed").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.occupancy").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.recentReports").isEmpty());
    }

    @Test
    void aTrustedReporterMovesTheShareLikeTheAutoHideTally() throws Exception {
        long shelterId = seedShelter("Usaldus pulss");

        // the trusted reporter: an own submission cross-verified by THREE
        // distinct users' OPEN_CONFIRMED confirmations (the auto-confirm
        // tally → weight 2, the same derivation the tally uses)
        String trusted = verifiedToken("Usaldatud", "usaldatud@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + trusted)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Usaldatud oma\",\"latitude\":59.5,\"longitude\":24.8}"))
                .andExpect(status().isCreated())
                .andReturn();
        long ownRow = ((Number) com.jayway.jsonpath.JsonPath.read(
                created.getResponse().getContentAsString(), "$.id")).longValue();
        mvc.perform(post("/api/shelters/" + ownRow + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja", "kinnitaja@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + ownRow + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja2", "kinnitaja2@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());
        mvc.perform(post("/api/shelters/" + ownRow + "/reports")
                        .header("Authorization", "Bearer " + verifiedToken("Kinnitaja3", "kinnitaja3@example.ee"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"OPEN_CONFIRMED\"}"))
                .andExpect(status().isOk());

        // weight-2 OPEN vs weight-1 CLOSED → openShare 2/3, plain counts 1:1
        tapOpenStatus(trusted, shelterId, "OPEN");
        tapOpenStatus(verifiedToken("Tavaline", "tavaline@example.ee"), shelterId, "CLOSED");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.communityPulse.openClosed.openReports").value(1))
                .andExpect(jsonPath("$.communityPulse.openClosed.closedReports").value(1))
                .andExpect(jsonPath("$.communityPulse.openClosed.openShare").value(2.0 / 3.0));
    }

    @Test
    void theLogNeverLeaksTheReporterIdentity() throws Exception {
        long shelterId = seedShelter("Privaatne pulss");
        String token = verifiedToken("Marran Marik", "marran@example.ee");
        tapOpenStatus(token, shelterId, "OPEN");
        tapOccupancy(token, shelterId, "FULL");

        // even the reporting user's OWN call gets no identity back: the
        // entry surface is (kind, reportedAt) only
        MvcResult result = mvc.perform(get("/api/shelters/" + shelterId)
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();

        // no user-shaped field on any log entry…
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.communityPulse.recentReports[*].userId").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.recentReports[*].user").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.recentReports[*].name").doesNotExist())
                .andExpect(jsonPath("$.communityPulse.recentReports[*].email").doesNotExist());
        // …and the reporter's profile never reaches the log entries
        assertThatNoIdentityInLog(body);
    }

    private void assertThatNoIdentityInLog(String body) {
        org.assertj.core.api.Assertions.assertThat(body)
                .as("the pulse block must not name the reporter")
                .satisfies(b -> {
                    int pulse = b.indexOf("\"communityPulse\"");
                    org.assertj.core.api.Assertions.assertThat(pulse).isNotNegative();
                    String logSection = b.substring(pulse);
                    org.assertj.core.api.Assertions.assertThat(logSection)
                            .doesNotContain("marran@example.ee")
                            .doesNotContain("Marran Marik");
                });
    }

    @Test
    void anUnknownShelterDetailIs404LikeBefore() throws Exception {
        mvc.perform(get("/api/shelters/999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    void theSingleReportHedgeAndTheDampResponseStayUntouched() throws Exception {
        long shelterId = seedShelter("Hedge puutumata");
        String token = verifiedToken("Ainuke", "ainuke@example.ee");

        // the typed-report write still answers {"damped": bool}
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"WRONG_LOCATION\",\"detail\":\"teine aadress\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.damped").value(false));

        // the lone fresh CLOSED tap still hedges in the existing block
        tapOpenStatus(token, shelterId, "CLOSED");
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.openStatus.state").value("CLOSED"))
                .andExpect(jsonPath("$.openStatus.reportCount").value(1))
                .andExpect(jsonPath("$.communityPulse.openClosed.closedReports").value(1));
    }
}
