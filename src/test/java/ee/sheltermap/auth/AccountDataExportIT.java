package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.RegisteredUser;
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
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for {@code GET /account/export} (legal-recovery M4,
 * slice 1): anonymous 401; the authenticated user's document carries the
 * DECRYPTED profile (pii-at-rest M2 — the persistence boundary hands the
 * domain plaintext), exactly the user's own shelter rows (all statuses)
 * and reviews (shelter id + name resolved); another user's rows stay out;
 * a user without contributions gets empty lists. Full-stack MockMvc
 * against real services, security chain, JWT filter and Postgres.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0"
})
@Transactional
class AccountDataExportIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    private long nextUser = 1;

    /** A write-capable (e-mail-verified) user; returns id + token. */
    private record Auth(long id, String token) {
    }

    private Auth verified(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+37250000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return new Auth(user.getId(), tokens.issue(user).accessToken());
    }

    private long submit(Auth user, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    private void review(Auth user, long shelterId) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + user.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"rating\":4,\"comment\":\"Hea varjend\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void anonymousExportIs401() throws Exception {
        mvc.perform(get("/account/export"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void theExportCarriesDecryptedProfileOwnSheltersAndOwnReviews() throws Exception {
        Auth user = verified("Ekspordi Kasutaja", "ekspordi@example.ee");
        long shelterId = submit(user, "Ekspordi Varjend");
        review(user, shelterId);

        mvc.perform(get("/account/export").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                // profile: decrypted e-mail/phone (pii-at-rest M2 boundary) + verified level
                .andExpect(jsonPath("$.profile.name").value("Ekspordi Kasutaja"))
                .andExpect(jsonPath("$.profile.email").value("ekspordi@example.ee"))
                .andExpect(jsonPath("$.profile.phone").value("+372500001"))
                .andExpect(jsonPath("$.profile.levels.length()").value(1))
                .andExpect(jsonPath("$.profile.levels[0]").value("EMAIL"))
                // exactly the user's own row, all the submitted fields
                .andExpect(jsonPath("$.shelters.length()").value(1))
                .andExpect(jsonPath("$.shelters[0].id").value(shelterId))
                .andExpect(jsonPath("$.shelters[0].name").value("Ekspordi Varjend"))
                .andExpect(jsonPath("$.shelters[0].latitude").value(59.4))
                .andExpect(jsonPath("$.shelters[0].longitude").value(24.7))
                .andExpect(jsonPath("$.shelters[0].source").value("USER"))
                .andExpect(jsonPath("$.shelters[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$.shelters[0].reviewStatus").value("NEW"))
                .andExpect(jsonPath("$.shelters[0].locationKind").value("PUBLIC"))
                .andExpect(jsonPath("$.shelters[0].address").value(nullValue()))
                // the review with the shelter's id + resolved name
                .andExpect(jsonPath("$.reviews.length()").value(1))
                .andExpect(jsonPath("$.reviews[0].shelterId").value(shelterId))
                .andExpect(jsonPath("$.reviews[0].shelterName").value("Ekspordi Varjend"))
                .andExpect(jsonPath("$.reviews[0].rating").value(4))
                .andExpect(jsonPath("$.reviews[0].comment").value("Hea varjend"))
                .andReturn();
    }

    @Test
    void theExportIsAuthorScoped_otherUsersRowsStayOut() throws Exception {
        Auth user = verified("Esimese Kasutaja", "esimese@example.ee");
        submit(user, "Esimese Varjend");

        Auth other = verified("Teise Kasutaja", "teise@example.ee");
        long otherShelter = submit(other, "Teise Varjend");
        review(other, otherShelter);

        MvcResult result = mvc.perform(get("/account/export")
                        .header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shelters.length()").value(1))
                .andExpect(jsonPath("$.reviews.length()").value(0))
                .andReturn();

        String body = result.getResponse().getContentAsString();
        assertThat(body).doesNotContain("Teise Varjend");
        assertThat(body).doesNotContain("teise@example.ee");
    }

    @Test
    void aUserWithoutContributionsGetsEmptyLists() throws Exception {
        Auth user = verified("Tuhja Kasutaja", "tuhja@example.ee");

        mvc.perform(get("/account/export").header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.profile.email").value("tuhja@example.ee"))
                .andExpect(jsonPath("$.shelters.length()").value(0))
                .andExpect(jsonPath("$.reviews.length()").value(0));
    }
}
