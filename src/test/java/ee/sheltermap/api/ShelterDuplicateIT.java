package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.RegisteredUser;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for near-duplicate shelter-submission detection
 * (abuse-limits M3 slice 3): an ACTIVE USER row with the same normalized
 * name within {@code app.limits.duplicate-coord-meters} (100 m) haversine
 * already existing makes the next submission a 409 whose message carries
 * the existing row id. The check is CROSS-USER (the throwaway-account
 * re-report vector), case/whitespace-insensitive on the name, and
 * ADMIN-kind accounts are exempt (like the other caps). Full-stack
 * MockMvc against real services, security chain, JWT filter and Postgres;
 * the admin is seeded by the context startup (app.admin.* set) and logs in
 * through the normal /auth/login.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0"
})
@Transactional
class ShelterDuplicateIT extends AbstractPersistenceIT {

    /** Base point for the fixtures (inside the Estonia bbox). */
    private static final double BASE_LAT = 59.40;
    private static final double BASE_LNG = 24.70;
    /** ~50 m north of the base point — inside the 100 m tolerance. */
    private static final double FIFTY_M_LAT = 59.400449;
    /** ~1 km north of the base point — far outside the tolerance. */
    private static final double ONE_KM_LAT = 59.408983;

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    private long nextUser = 1;

    // ---------- helpers ----------

    /** A write-capable (e-mail-verified) user; returns id + token. */
    private record Auth(long id, String token) {
    }

    private Auth verified(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+37251000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return new Auth(user.getId(), tokens.issue(user).accessToken());
    }

    private long submit(String token, String name, double lat, double lng) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":" + lat
                                + ",\"longitude\":" + lng + "}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    private void expect409WithExistingRowId(String token, String name, double lat, double lng,
                                            long existingId) throws Exception {
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":" + lat
                                + ",\"longitude\":" + lng + "}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.error").value("Conflict"))
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("shelter #" + existingId)))
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.parse(login.getResponse().getContentAsString()).read("$.accessToken", String.class);
    }

    // ---------- the detection ----------

    @Test
    void resubmittingTheSameShelterIs409WithTheExistingRowId() throws Exception {
        Auth user = verified("Kahekordne", "kahekordne@example.ee");
        long firstId = submit(user.token(), "Kahekordne abri", BASE_LAT, BASE_LNG);

        expect409WithExistingRowId(user.token(), "Kahekordne abri", BASE_LAT, BASE_LNG, firstId);

        // the rejected row was NOT created
        assertThat(shelters.findByCreatedBy(user.id())).hasSize(1);
    }

    @Test
    void aFiftyMetreOffsetStillCountsAsDuplicate() throws Exception {
        Auth user = verified("Paigutatud", "paigutatud@example.ee");
        long firstId = submit(user.token(), "Paigutuse abri", BASE_LAT, BASE_LNG);

        // ~50 m off — inside the 100 m tolerance (GPS re-tap drift)
        expect409WithExistingRowId(user.token(), "Paigutuse abri", FIFTY_M_LAT, BASE_LNG, firstId);
        assertThat(shelters.findByCreatedBy(user.id())).hasSize(1);
    }

    @Test
    void differentNameAtTheSamePointIsAccepted() throws Exception {
        Auth user = verified("Erinev", "erinev@example.ee");
        submit(user.token(), "Esimese abri", BASE_LAT, BASE_LNG);

        long secondId = submit(user.token(), "Teise abri", BASE_LAT, BASE_LNG);
        assertThat(secondId).isPositive();
        assertThat(shelters.findByCreatedBy(user.id())).hasSize(2);
    }

    @Test
    void sameNameAKilometreAwayIsAccepted() throws Exception {
        Auth user = verified("Kaugel", "kaugel@example.ee");
        submit(user.token(), "Kauguse abri", BASE_LAT, BASE_LNG);

        long secondId = submit(user.token(), "Kauguse abri", ONE_KM_LAT, BASE_LNG);
        assertThat(secondId).isPositive();
        assertThat(shelters.findByCreatedBy(user.id())).hasSize(2);
    }

    @Test
    void crossUserResubmissionIs409() throws Exception {
        Auth first = verified("Algataja", "algataja@example.ee");
        long firstId = submit(first.token(), "Hapniku abri", BASE_LAT, BASE_LNG);

        // the throwaway-account re-report vector: a DIFFERENT account
        Auth second = verified("Teine", "teinehapnik@example.ee");
        expect409WithExistingRowId(second.token(), "Hapniku abri", BASE_LAT, BASE_LNG, firstId);
        assertThat(shelters.findByCreatedBy(second.id())).isEmpty();
        // the original row is untouched
        assertThat(shelters.findById(firstId)).isPresent();
    }

    @Test
    void adminIsExemptFromDuplicateDetection() throws Exception {
        Auth user = verified("Admini all", "adminiall@example.ee");
        submit(user.token(), "Admini kopeeri", BASE_LAT, BASE_LNG);

        // the admin re-adding the same place (e.g. after an admin-side
        // correction) is never blocked — like the other caps
        long adminId = submit(adminToken(), "Admini kopeeri", BASE_LAT, BASE_LNG);
        assertThat(adminId).isPositive();
    }

    @Test
    void hiddenRowIsNotADuplicate() throws Exception {
        Auth user = verified("Peidetud", "peidetud@example.ee");
        long firstId = submit(user.token(), "Peidetud abri", BASE_LAT, BASE_LNG);

        // deactivate the row (the admin reject / auto-hide path) — it is no
        // longer a live entry, so re-adding the same place is legal
        shelters.findById(firstId).ifPresent(row -> {
            row.setStatus(ShelterStatus.INACTIVE);
            shelters.save(row);
        });

        long secondId = submit(user.token(), "Peidetud abri", BASE_LAT, BASE_LNG);
        assertThat(secondId).isPositive();
    }
}
