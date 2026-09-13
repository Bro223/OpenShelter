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
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Report-throttle acceptance (shelter-trust-and-reports D5): 10 report-type
 * actions (shelter reports, occupancy reports, review reports) per user per
 * rolling hour → the 11th is 429. Window expiry frees budget; the limit is
 * per user, not global.
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
class ReportThrottleIT extends AbstractPersistenceIT {

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
    private long nextShelter = 1;

    private String verifiedToken(String email) {
        RegisteredUser user = new RegisteredUser("Throttle" + nextUser, email,
                "+3725100000" + nextUser);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        nextUser++;
        return tokens.issue(user).accessToken();
    }

    private long seedShelter() {
        Shelter shelter = new Shelter("Throttle varjend " + (nextShelter++),
                new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE, null, ShelterSource.USER);
        shelters.save(shelter);
        return shelter.getId();
    }

    private void report(String token, long shelterId, String type) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/reports")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"" + type + "\"}"))
                .andExpect(status().isNoContent());
    }

    private void occupancy(String token, long shelterId, String band) throws Exception {
        mvc.perform(put("/api/shelters/" + shelterId + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"band\":\"" + band + "\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void eleventhReportTypeActionIs429() throws Exception {
        String token = verifiedToken("spammer@example.ee");
        long s1 = seedShelter();
        long s2 = seedShelter();
        long s3 = seedShelter();
        long s4 = seedShelter();
        long s5 = seedShelter();

        // 10 report-type actions across all three endpoint families
        for (int i = 0; i < 5; i++) {
            report(token, new long[]{s1, s2, s3, s4, s5}[i], "NON_EXISTENT");
        }
        occupancy(token, s1, "FULL");
        report(token, s1, "CLOSED");
        report(token, s2, "CLOSED");
        report(token, s3, "CLOSED");
        report(token, s4, "CLOSED");

        // the 11th is 429 with the standard error body
        mvc.perform(put("/api/shelters/" + s2 + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"band\":\"SPACE\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").value("Too many report requests"))
                .andExpect(jsonPath("$.path").isNotEmpty());

        // nothing was stored for the rejected action (one occupancy row for s1)
        Integer occupancyRows = jdbc.queryForObject(
                "SELECT COUNT(*) FROM shelter_occupancy_reports", Integer.class);
        assertThat(occupancyRows).isEqualTo(1);
        // the log holds exactly the 10 accepted actions
        Integer logged = jdbc.queryForObject(
                "SELECT COUNT(*) FROM report_actions", Integer.class);
        assertThat(logged).isEqualTo(10);
    }

    @Test
    void theRollingWindowExpiresOldActions() throws Exception {
        String token = verifiedToken("varemalt@example.ee");
        long s1 = seedShelter();
        long s2 = seedShelter();
        long s3 = seedShelter();
        long s4 = seedShelter();
        long s5 = seedShelter();

        for (int i = 0; i < 5; i++) {
            report(token, new long[]{s1, s2, s3, s4, s5}[i], "NON_EXISTENT");
        }
        occupancy(token, s1, "FULL");
        report(token, s1, "CLOSED");
        report(token, s2, "CLOSED");
        report(token, s3, "CLOSED");
        report(token, s4, "CLOSED");

        // everything older than the trailing hour stops counting
        jdbc.update("UPDATE report_actions SET created_at = created_at - INTERVAL '2 hours'");

        occupancy(token, s2, "SPACE");
        mvc.perform(put("/api/shelters/" + s3 + "/occupancy")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"band\":\"FULL\"}"))
                .andExpect(status().isNoContent());
    }

    @Test
    void theLimitIsPerUser() throws Exception {
        String spammer = verifiedToken("hulbikas@example.ee");
        String goodCitizen = verifiedToken("headlik@example.ee");
        long s1 = seedShelter();
        long s2 = seedShelter();
        long s3 = seedShelter();
        long s4 = seedShelter();
        long s5 = seedShelter();

        for (int i = 0; i < 5; i++) {
            report(spammer, new long[]{s1, s2, s3, s4, s5}[i], "NON_EXISTENT");
        }
        occupancy(spammer, s1, "FULL");
        report(spammer, s1, "CLOSED");
        report(spammer, s2, "CLOSED");
        report(spammer, s3, "CLOSED");
        report(spammer, s4, "CLOSED");

        // the spammer is throttled...
        mvc.perform(post("/api/shelters/" + s5 + "/reports")
                        .header("Authorization", "Bearer " + spammer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"type\":\"CLOSED\"}"))
                .andExpect(status().isTooManyRequests());
        // ...while a different user is completely unaffected
        report(goodCitizen, s5, "CLOSED");
    }
}
