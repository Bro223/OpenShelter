package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Step 6 acceptance — full-stack MockMvc against real services, security
 * chain, JWT filter and Postgres (06-CONTEXT-API.md "Testing notes").
 *
 * <p>Covers: public GETs; POST shelter 401/403/201; review verified-gate,
 * one-review-per-user upsert, author-only update/delete; the uniform
 * {@link ErrorResponse} shape on every error path.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=1000",
        "app.ratelimit.reset-refill-per-second=0"
})
@Transactional
class ShelterApiIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    ShelterReviewRepository reviews;

    @Autowired
    TokenService tokens;

    private long nextUser = 1;

    @BeforeEach
    void cleanShelterTable() {
        // no-op: @Transactional rolls each test back; kept for clarity
    }

    // ---------- helpers ----------

    private String verifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++, "4900101000" + nextUser);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private String unverifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++, "4900101000" + nextUser);
        users.save(user);
        return tokens.issue(user).accessToken();
    }

    private long seedUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++, "4900101000" + nextUser);
        users.save(user);
        return user.getId();
    }

    private long seedShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                source == ShelterSource.USER ? null : "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    private long seedShelterWithReview(String name, ShelterSource source, int rating) {
        long shelterId = seedShelter(name, source);
        long reviewerId = seedUser("Arvustaja", "arvustaja" + nextUser + "@example.ee");
        reviews.save(new ShelterReview(shelterId, reviewerId, rating, "test comment"));
        return shelterId;
    }

    private static String shelterBody(String name) {
        return "{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}";
    }

    private static String reviewBody(int rating, String comment) {
        return "{\"rating\":" + rating + ",\"comment\":\"" + comment + "\"}";
    }

    private static void expectErrorShape(org.springframework.test.web.servlet.ResultActions result,
                                         int status, String error) throws Exception {
        result.andExpect(status().is(status))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.error").value(error))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    // ---------- read side (public) ----------

    @Test
    void getSheltersSourceUserReturnsOnlyUserRowsWithRatingAggregates() throws Exception {
        long userShelterId = seedShelterWithReview("Kasutaja varjend", ShelterSource.USER, 4);
        reviews.save(new ShelterReview(userShelterId, seedUser("Teine Arvustaja", "teine@example.ee"), 5, "teine"));
        seedShelterWithReview("Päästeameti varjend", ShelterSource.PAASETEAMET, 3);
        seedShelterWithReview("Linna varjend", ShelterSource.MUNICIPALITY, 2);

        // anonymous call -> public
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Kasutaja varjend"))
                .andExpect(jsonPath("$[0].source").value("USER"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].averageRating").value(4.5))
                .andExpect(jsonPath("$[0].reviewCount").value(2));

        mvc.perform(get("/api/shelters").param("source", "REGISTRY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)));
    }

    @Test
    void getSheltersDefaultsToAllAndIsPublic() throws Exception {
        seedShelter("A", ShelterSource.USER);
        seedShelter("B", ShelterSource.PAASETEAMET);
        seedShelter("C", ShelterSource.MUNICIPALITY);

        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(3)));
    }

    @Test
    void getShelterByIdIsPublic() throws Exception {
        long id = seedShelterWithReview("Üksik varjend", ShelterSource.USER, 5);

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Üksik varjend"))
                .andExpect(jsonPath("$.averageRating").value(5.0))
                .andExpect(jsonPath("$.reviewCount").value(1));
    }

    @Test
    void getMissingShelterReturnsUniform404() throws Exception {
        expectErrorShape(mvc.perform(get("/api/shelters/999999")), 404, "Not Found");
    }

    // ---------- write side: POST /api/shelters ----------

    @Test
    void postShelterAnonymousIs401WithErrorShape() throws Exception {
        expectErrorShape(mvc.perform(post("/api/shelters")
                .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Anonüümne"))), 401, "Unauthorized");
    }

    @Test
    void postShelterUnverifiedIs403WithErrorShape() throws Exception {
        String token = unverifiedToken("Priit", "priit@example.ee");

        expectErrorShape(mvc.perform(post("/api/shelters")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Kinnitamata"))), 403, "Forbidden");
    }

    @Test
    void postShelterVerifiedCreates201WithLocation() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(shelterBody("Minu varjend")))
                .andExpect(status().isCreated())
                .andExpect(header().exists("Location"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.source").value("USER"))
                .andExpect(jsonPath("$.averageRating").doesNotExist())
                .andExpect(jsonPath("$.reviewCount").value(0))
                .andReturn();

        long createdId = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
        assertThat(result.getResponse().getHeader("Location"))
                .isEqualTo("/api/shelters/" + createdId);

        // it is a USER row now — visible under ?source=USER
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Minu varjend"));
    }

    @Test
    void postShelterWithBlankNameIs400WithErrorShape() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        expectErrorShape(mvc.perform(post("/api/shelters")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  \",\"latitude\":59.4,\"longitude\":24.7}")), 400, "Bad Request");
    }

    // ---------- reviews ----------

    @Test
    void postReviewAnonymousIs401AndUnverifiedIs403() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String unverified = unverifiedToken("Priit", "priit@example.ee");

        expectErrorShape(mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                .contentType(MediaType.APPLICATION_JSON).content(reviewBody(4, "anon"))), 401, "Unauthorized");
        expectErrorShape(mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                .header("Authorization", "Bearer " + unverified)
                .contentType(MediaType.APPLICATION_JSON).content(reviewBody(4, "kinnitamata"))), 403, "Forbidden");
    }

    @Test
    void duplicateReviewUpdatesInsteadOfInserting() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");

        // first review -> 201 created
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(4, "hea")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rating").value(4));

        // same user re-rates -> 200 updated, still exactly one review
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(2, "parandus")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(2));

        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].rating").value(2));

        // the shelter aggregate reflects the updated rating
        mvc.perform(get("/api/shelters/" + shelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.averageRating").value(2.0))
                .andExpect(jsonPath("$.reviewCount").value(1));
    }

    @Test
    void authorCanPutAndDeleteOwnReview() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(3, "esialgne")))
                .andExpect(status().isCreated());

        // PUT /mine updates the author's own review
        mvc.perform(put("/api/shelters/" + shelterId + "/reviews/mine")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(5, "uuendatud")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rating").value(5))
                .andExpect(jsonPath("$.comment").value("uuendatud"));

        // DELETE /mine removes it
        mvc.perform(delete("/api/shelters/" + shelterId + "/reviews/mine")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(0)));
    }

    @Test
    void putDeleteMineByNonAuthorIsUniform404() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String author = verifiedToken("Mari", "mari@example.ee");
        String intruder = verifiedToken("Jaan", "jaan@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(reviewBody(4, "autori hinnang")))
                .andExpect(status().isCreated());

        // /mine resolves to the CALLER's review; the intruder owns none here,
        // so the resource does not exist — 404, still a uniform ErrorResponse.
        // (The author-only 403 guard lives in ShelterReviewService and is
        // unit-tested: updateDeleteByNonAuthorThrowsNotAuthor.)
        expectErrorShape(mvc.perform(put("/api/shelters/" + shelterId + "/reviews/mine")
                .header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(reviewBody(1, "sissetung"))), 404, "Not Found");
        expectErrorShape(mvc.perform(delete("/api/shelters/" + shelterId + "/reviews/mine")
                .header("Authorization", "Bearer " + intruder)), 404, "Not Found");
    }

    @Test
    void getReviewsIsPublicAndMapsAuthorNames() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String first = verifiedToken("Mari", "mari@example.ee");
        String second = verifiedToken("Jaan", "jaan@example.ee");
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + first)
                        .contentType(MediaType.APPLICATION_JSON).content(reviewBody(4, "hea")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                        .header("Authorization", "Bearer " + second)
                        .contentType(MediaType.APPLICATION_JSON).content(reviewBody(5, "väga hea")))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/shelters/" + shelterId + "/reviews"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(2)))
                .andExpect(jsonPath("$[*].authorName",
                        org.hamcrest.Matchers.containsInAnyOrder("Mari", "Jaan")))
                .andExpect(jsonPath("$[*].rating",
                        org.hamcrest.Matchers.containsInAnyOrder(4, 5)))
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty());
    }

    @Test
    void invalidReviewBodyIs400WithErrorShape() throws Exception {
        long shelterId = seedShelter("Hinnatav", ShelterSource.USER);
        String token = verifiedToken("Mari", "mari@example.ee");

        // rating out of 1..5
        expectErrorShape(mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(reviewBody(0, "null"))), 400, "Bad Request");
        // comment > 500 chars
        expectErrorShape(mvc.perform(post("/api/shelters/" + shelterId + "/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(reviewBody(4, "a".repeat(501)))), 400, "Bad Request");
    }

    @Test
    void reviewForMissingShelterIsUniform404() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        expectErrorShape(mvc.perform(post("/api/shelters/999999/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(reviewBody(4, "pole varjendit"))), 404, "Not Found");
    }

    @Test
    void errorShapeIsUniformAcrossAllPaths() throws Exception {
        // 401 (no token), 403 (unverified), 404 (missing shelter), 400 (bad body)
        expectErrorShape(mvc.perform(post("/api/shelters")), 401, "Unauthorized");
        expectErrorShape(mvc.perform(get("/api/shelters/999999")), 404, "Not Found");
        String unverified = unverifiedToken("Priit", "priit@example.ee");
        expectErrorShape(mvc.perform(post("/api/shelters")
                .header("Authorization", "Bearer " + unverified)
                .contentType(MediaType.APPLICATION_JSON)
                .content(shelterBody("Kinnitamata"))), 403, "Forbidden");
        expectErrorShape(mvc.perform(post("/api/shelters")
                .header("Authorization", "Bearer " + verifiedToken("Mari", "mari2@example.ee"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("not-json")), 400, "Bad Request");
    }
}
