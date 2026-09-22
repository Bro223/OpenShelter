package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterReportRepository;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.ReviewStatus;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReport;
import ee.sheltermap.domain.ShelterReportType;
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
 * Acceptance IT for the provenance taxonomy (shelter-provenance-taxonomy)
 * — full-stack MockMvc against the real services, security chain, JWT
 * filter and Postgres: every one of the six taxonomy values is derived
 * server-side on the DTOs (public list, detail, /mine, admin list), the
 * optional {@code ?provenance=} filter narrows the public list, and an
 * invalid value is a 400.
 *
 * <p>The public list is ACTIVE-only (D5), so REPORTED_INACTIVE and
 * REJECTED rows are absent from it by construction — they are asserted
 * through the surfaces that keep hidden rows (/mine, /admin/shelters) and
 * the by-id detail read.
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
class ProvenanceApiIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    ShelterReportRepository reports;

    @Autowired
    TokenService tokens;

    private long nextUser = 1;

    // ---------- helpers ----------

    private long seedUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        users.save(user);
        return user.getId();
    }

    /** Verified user (EMAIL claim) + its access token, as one pair. */
    private record Owner(long id, String token) {
    }

    private Owner verifiedOwner(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email,
                Instant.now()));
        users.save(user);
        return new Owner(user.getId(), tokens.issue(user).accessToken());
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    private long seedRegistryShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    private long seedCommunityShelter(String name, ReviewStatus reviewStatus,
                                      ShelterStatus status, long createdBy) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), status, null,
                ShelterSource.USER);
        shelter.setReviewStatus(reviewStatus);
        if (createdBy != 0) {
            shelter.setCreatedBy(createdBy);
        }
        shelters.save(shelter);
        return shelter.getId();
    }

    /** Five NON_EXISTENT reports from five distinct users = the auto-hide count. */
    private void reportAway(long shelterId) {
        for (int i = 1; i <= 5; i++) {
            long reporter = seedUser("Arapaneja" + i, "arapaneja" + i + "-" + shelterId
                    + "-" + nextUser + "@example.ee");
            reports.save(new ShelterReport(shelterId, reporter, ShelterReportType.NON_EXISTENT,
                    null, Instant.now()));
        }
    }

    /** The full fixture: one row per taxonomy value. */
    private record Fixture(long officialId, long partnerId, long communityId, long newId,
                           long reportedInactiveId, long rejectedId) {
    }

    private Fixture seedAll() {
        long officialId = seedRegistryShelter("Ametlikku varjend", ShelterSource.PAASETEAMET);
        long partnerId = seedRegistryShelter("Partneri varjend", ShelterSource.MUNICIPALITY);
        long communityId = seedCommunityShelter("Kinnitatud kogukonna varjend",
                ReviewStatus.CONFIRMED, ShelterStatus.ACTIVE,
                seedUser("Kahetunne", "kahetunne" + nextUser + "@example.ee"));
        long newId = seedCommunityShelter("Uus kogukonna varjend", ReviewStatus.NEW,
                ShelterStatus.ACTIVE, seedUser("Uuskasutaja", "uuskasutaja" + nextUser + "@example.ee"));
        long reportedInactiveId = seedCommunityShelter("Arapandud varjend",
                ReviewStatus.CONFIRMED, ShelterStatus.INACTIVE,
                seedUser("PeidetudAutor", "peidetudautor" + nextUser + "@example.ee"));
        reportAway(reportedInactiveId);
        long rejectedId = seedCommunityShelter("Tagasilugatud varjend", ReviewStatus.REJECTED,
                ShelterStatus.INACTIVE, seedUser("TagasilukseAutor",
                "tagasilukse" + nextUser + "@example.ee"));
        Shelter rejected = shelters.findById(rejectedId).orElseThrow();
        rejected.setReviewNote("Dublett ametliku andmebaasis");
        shelters.save(rejected);
        return new Fixture(officialId, partnerId, communityId, newId, reportedInactiveId,
                rejectedId);
    }

    private static java.util.List<String> provenanceValuesOf(String json, String name) {
        return JsonPath.read(json, "$[?(@.name == '" + name + "')].provenance");
    }

    // ---------- the derived value rides on every projection ----------

    @Test
    void publicListDerivesTheFourVisibleValues() throws Exception {
        seedAll();
        // The fixture has six rows; the ACTIVE-only public list returns the
        // four visible ones — the two hidden (INACTIVE) values are absent
        // by construction.
        MvcResult result = mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                .andReturn();
        String json = result.getResponse().getContentAsString();
        assertThat(provenanceValuesOf(json, "Ametlikku varjend")).containsExactly("OFFICIAL");
        assertThat(provenanceValuesOf(json, "Partneri varjend")).containsExactly("PARTNER_VERIFIED");
        assertThat(provenanceValuesOf(json, "Kinnitatud kogukonna varjend"))
                .containsExactly("COMMUNITY_REPORTED");
        assertThat(provenanceValuesOf(json, "Uus kogukonna varjend")).containsExactly("UNDER_REVIEW");
        java.util.List<String> allValues = JsonPath.read(json, "$.[*].provenance");
        assertThat(allValues).doesNotContain("REPORTED_INACTIVE", "REJECTED");
    }

    @Test
    void detailReadDerivesTheHiddenValues() throws Exception {
        Fixture f = seedAll();
        mvc.perform(get("/api/shelters/" + f.reportedInactiveId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provenance").value("REPORTED_INACTIVE"));
        mvc.perform(get("/api/shelters/" + f.rejectedId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.provenance").value("REJECTED"));
    }

    @Test
    void mineDerivesTheHiddenValuesForTheOwner() throws Exception {
        // Reported-away row: the owner's /mine keeps the hidden row and
        // derives REPORTED_INACTIVE.
        Owner reportedOwner = verifiedOwner("PeidetudAutor2",
                "peidetudautor2-" + nextUser + "@example.ee");
        long reportedRow = seedCommunityShelter("Arapandud 2", ReviewStatus.CONFIRMED,
                ShelterStatus.INACTIVE, reportedOwner.id());
        reportAway(reportedRow);
        mvc.perform(get("/api/shelters/mine").header("Authorization",
                        "Bearer " + reportedOwner.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("REPORTED_INACTIVE"));

        // Rejected row: the owner's /mine derives REJECTED (the note is
        // owner-scoped, the provenance is not).
        Owner rejectedOwner = verifiedOwner("Tagasilukse2", "tagasilukse2-" + nextUser + "@example.ee");
        long rejectedRow = seedCommunityShelter("Tagasilugatud 2", ReviewStatus.REJECTED,
                ShelterStatus.INACTIVE, rejectedOwner.id());
        mvc.perform(get("/api/shelters/mine").header("Authorization",
                        "Bearer " + rejectedOwner.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("REJECTED"));
    }

    @Test
    void adminListDerivesAllSixValues() throws Exception {
        seedAll();
        String admin = adminToken();
        MvcResult result = mvc.perform(get("/admin/shelters")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andReturn();
        String json = result.getResponse().getContentAsString();
        assertThat(provenanceValuesOf(json, "Ametlikku varjend")).containsExactly("OFFICIAL");
        assertThat(provenanceValuesOf(json, "Partneri varjend")).containsExactly("PARTNER_VERIFIED");
        assertThat(provenanceValuesOf(json, "Kinnitatud kogukonna varjend"))
                .containsExactly("COMMUNITY_REPORTED");
        assertThat(provenanceValuesOf(json, "Uus kogukonna varjend")).containsExactly("UNDER_REVIEW");
        assertThat(provenanceValuesOf(json, "Arapandud varjend")).containsExactly("REPORTED_INACTIVE");
        assertThat(provenanceValuesOf(json, "Tagasilugatud varjend")).containsExactly("REJECTED");
    }

    // ---------- the ?provenance= filter ----------

    @Test
    void provenanceFilterKeepsOnlyMatchingRows() throws Exception {
        seedAll();
        mvc.perform(get("/api/shelters?provenance=OFFICIAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("OFFICIAL"));
        mvc.perform(get("/api/shelters?provenance=PARTNER_VERIFIED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("PARTNER_VERIFIED"));
        mvc.perform(get("/api/shelters?provenance=COMMUNITY_REPORTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("COMMUNITY_REPORTED"));
        mvc.perform(get("/api/shelters?provenance=UNDER_REVIEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].provenance").value("UNDER_REVIEW"));
    }

    @Test
    void hiddenProvenanceValuesFilterToEmptyOnThePublicList() throws Exception {
        seedAll();
        mvc.perform(get("/api/shelters?provenance=REPORTED_INACTIVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/shelters?provenance=REJECTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void provenanceFilterComposesWithTheSourceFilter() throws Exception {
        seedAll();
        // COMMUNITY_REPORTED rows are USER-source: the REGISTRY source
        // filter excludes them.
        mvc.perform(get("/api/shelters?source=REGISTRY&provenance=COMMUNITY_REPORTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/shelters?source=USER&provenance=COMMUNITY_REPORTED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void invalidProvenanceIs400() throws Exception {
        mvc.perform(get("/api/shelters?provenance=BOGUS"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }
}
