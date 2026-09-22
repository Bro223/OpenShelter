package ee.sheltermap.api;

import ee.sheltermap.app.DataImportLog;
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
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the last-verified meta (last-verified-meta) — full-
 * stack MockMvc against the real services, security chain, JWT filter and
 * Postgres: the per-entry {@code lastVerifiedAt} stamp (registry rows from
 * the newest verifying import; community rows from the newest non-submitter
 * OPEN_CONFIRMED check or confirming moderation action) and the total
 * {@code reportCount} ride on the public list and the detail projection.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.limits.daily-submissions-per-user=100"
})
@Transactional
class LastVerifiedApiIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    DataImportLog importLog;

    private long nextUser = 1;

    // ---------- helpers ----------

    private String verifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email,
                Instant.now()));
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private long seedRegistryShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    /** Creates a USER shelter through the API (records the author link). */
    private long createShelterViaApi(String token, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andReturn();
        return ((Number) com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.id")).longValue();
    }

    private void report(long shelterId, String token, String type) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"" + type + "\"}"))
                .andExpect(status().isOk());
    }

    // ---------- registry rows: the newest VERIFYING import wins ----------

    @Test
    void registryRowCarriesTheNewestVerifyingImport() throws Exception {
        seedRegistryShelter("Ametlikku varjend", ShelterSource.PAASETEAMET);
        Instant okAt = Instant.parse("2026-09-10T06:00:00Z");
        Instant failedAt = Instant.parse("2026-09-12T06:00:00Z");
        Instant notModifiedAt = Instant.parse("2026-09-13T06:00:00Z");
        importLog.record(new DataImportLog.Row("PAASETEAMET", "v-ok", okAt, 300, 0, 0, "OK", null));
        importLog.record(new DataImportLog.Row("PAASETEAMET", null, failedAt, 0, 0, 0, "FAILED",
                "registry is down"));
        importLog.record(new DataImportLog.Row("PAASETEAMET", "v-304", notModifiedAt, 0, 0, 0,
                "NOT_MODIFIED", null));

        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Ametlikku varjend')].lastVerifiedAt")
                        .value(org.hamcrest.Matchers.contains(notModifiedAt.toString())))
                .andExpect(jsonPath("$[?(@.name == 'Ametlikku varjend')].reportCount")
                        .value(org.hamcrest.Matchers.contains(0)));
    }

    @Test
    void registryRowWithoutAVerifyingImportStaysUnverified() throws Exception {
        seedRegistryShelter("Partneri varjend", ShelterSource.MUNICIPALITY);
        importLog.record(new DataImportLog.Row("PAASETEAMET", "v-fail",
                Instant.parse("2026-09-12T06:00:00Z"), 0, 0, 0, "FAILED", "registry is down"));

        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                // the FAILED run verifies nothing — and the partner row has
                // no runs of its own at all
                .andExpect(jsonPath("$[?(@.name == 'Partneri varjend')].lastVerifiedAt")
                        .value(org.hamcrest.Matchers.contains(org.hamcrest.Matchers.nullValue())))
                .andExpect(jsonPath("$[?(@.name == 'Partneri varjend')].reportCount")
                        .value(org.hamcrest.Matchers.contains(0)));
    }

    // ---------- community rows: the newest verification touch ----------

    @Test
    void aNewCommunityRowIsUnverifiedUntilACrossUserCheck() throws Exception {
        String submitter = verifiedToken("Uuskasutaja", "uus1@example.ee");
        long shelterId = createShelterViaApi(submitter, "Varjend pakkumine");

        // proposed (UNDER_REVIEW), never verified, no reports
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.provenance").value("UNDER_REVIEW"))
                .andExpect(jsonPath("$.lastVerifiedAt").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.reportCount").value(0));

        Instant before = Instant.now();
        // the 3-distinct threshold: the first two checkers stay below
        report(shelterId, verifiedToken("Kontrollija1", "kontrollija1@example.ee"), "OPEN_CONFIRMED");
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
        report(shelterId, verifiedToken("Kontrollija2", "kontrollija2@example.ee"), "OPEN_CONFIRMED");
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(jsonPath("$.reviewStatus").value("NEW"));
        String reporter = verifiedToken("Kontrollija3", "kontrollija3@example.ee");
        report(shelterId, reporter, "OPEN_CONFIRMED");
        Instant after = Instant.now();

        // the third cross-user check verifies the row AND promotes it (the
        // auto-confirm tally) — the stamp (newest check) lands inside the
        // call window
        MvcResult result = mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.provenance").value("COMMUNITY_REPORTED"))
                .andExpect(jsonPath("$.reportCount").value(3))
                .andReturn();
        String stamp = com.jayway.jsonpath.JsonPath.read(
                result.getResponse().getContentAsString(), "$.lastVerifiedAt");
        Instant lastVerified = Instant.parse(stamp);
        assertThat(lastVerified).isBetween(before.minusSeconds(1), after.plusSeconds(1));
    }

    @Test
    void theSubmittersOwnCheckNeverVerifiesOrPromotes() throws Exception {
        String submitter = verifiedToken("Autor", "autor1@example.ee");
        long shelterId = createShelterViaApi(submitter, "Oma kinnitus");
        report(shelterId, submitter, "OPEN_CONFIRMED");

        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                // a self-confirm is neither a verification nor a promotion
                .andExpect(jsonPath("$.reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.provenance").value("UNDER_REVIEW"))
                .andExpect(jsonPath("$.lastVerifiedAt").value(org.hamcrest.Matchers.nullValue()))
                .andExpect(jsonPath("$.reportCount").value(1));
    }

    @Test
    void reportCountSumsEveryReportType() throws Exception {
        long shelterId = seedRegistryShelter("Kontrollitud varjend", ShelterSource.PAASETEAMET);
        String token = verifiedToken("Arapaneja", "arapaneja1@example.ee");
        report(shelterId, token, "NON_EXISTENT");
        report(shelterId, token, "CLOSED");
        report(shelterId, token, "WRONG_LOCATION");

        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.name == 'Kontrollitud varjend')].reportCount")
                        .value(org.hamcrest.Matchers.contains(3)))
                .andExpect(jsonPath("$[?(@.name == 'Kontrollitud varjend')].nonexistentReports")
                        .value(org.hamcrest.Matchers.contains(1)));
    }
}
