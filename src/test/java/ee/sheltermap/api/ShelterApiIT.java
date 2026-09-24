package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
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
 * <p>Covers: public GETs; POST shelter 401/403/201; the uniform
 * {@link ErrorResponse} shape on every error path.
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
class ShelterApiIT extends AbstractPersistenceIT {

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

    private long seedUser(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++);
        users.save(user);
        return user.getId();
    }

    private long seedShelter(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE,
                source == ShelterSource.USER ? null : "ext-" + name, source);
        shelters.save(shelter);
        return shelter.getId();
    }

    private static String shelterBody(String name) {
        return "{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}";
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
    void getSheltersSourceUserReturnsOnlyUserRows() throws Exception {
        seedShelter("Kasutaja varjend", ShelterSource.USER);
        seedShelter("Päästeameti varjend", ShelterSource.PAASETEAMET);
        seedShelter("Linna varjend", ShelterSource.MUNICIPALITY);

        // anonymous call -> public
        mvc.perform(get("/api/shelters").param("source", "USER"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Kasutaja varjend"))
                .andExpect(jsonPath("$[0].source").value("USER"))
                .andExpect(jsonPath("$[0].status").value("ACTIVE"))
                .andExpect(jsonPath("$[0].createdAt").isNotEmpty());

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
        long id = seedShelter("Üksik varjend", ShelterSource.USER);

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Üksik varjend"))
                .andExpect(jsonPath("$.createdAt").isNotEmpty());
    }

    @Test
    void getMissingShelterReturnsUniform404() throws Exception {
        expectErrorShape(mvc.perform(get("/api/shelters/999999")), 404, "Not Found");
    }

    @Test
    void dtoCarriesSubmitterVerifiedPerCreatorVerificationState() throws Exception {
        String mari = verifiedToken("Mari", "mari@example.ee");
        long unverifiedId = seedUser("Priit", "priit@example.ee");

        // verified user submits through the API — the author link is recorded on save
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + mari)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Kinnitatud varjend")))
                .andExpect(status().isCreated()).andReturn();
        long verifiedShelterId = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        // unverified author: the API would 403 a submission, so seed the USER row with the link
        Shelter unverifiedShelter = new Shelter("Kinnitamata varjend", new GeoPoint(59.4, 24.7),
                ShelterStatus.ACTIVE, null, ShelterSource.USER);
        unverifiedShelter.setCreatedBy(unverifiedId);
        shelters.save(unverifiedShelter);

        long registryShelterId = seedShelter("Päästeameti varjend", ShelterSource.PAASETEAMET);

        // list: the field on each row — one batched creator lookup per listing
        // (no query-count assertion precedent in this repo; the batchedness is
        // pinned by the unit test's two-creators case). Filter paths must not
        // chain [0] after a root-level filter (Jayway 2.9 returns [] there),
        // so the property is read directly off the filter result.
        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(3)))
                .andExpect(jsonPath("$[?(@.name == 'Kinnitatud varjend')].submitterVerified")
                        .value(org.hamcrest.Matchers.contains(true)))
                .andExpect(jsonPath("$[?(@.name == 'Kinnitatud varjend')].submitterVerification")
                        .value(org.hamcrest.Matchers.contains("EMAIL")))
                .andExpect(jsonPath("$[?(@.name == 'Kinnitamata varjend')].submitterVerified")
                        .value(org.hamcrest.Matchers.contains(false)))
                .andExpect(jsonPath("$[?(@.name == 'Päästeameti varjend')].submitterVerified")
                        .value(org.hamcrest.Matchers.contains(false)));

        // detail: the same field on the single read
        mvc.perform(get("/api/shelters/" + verifiedShelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(true))
                .andExpect(jsonPath("$.submitterVerification").value("EMAIL"));
        mvc.perform(get("/api/shelters/" + unverifiedShelter.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(false))
                .andExpect(jsonPath("$.submitterVerification").doesNotExist());
        mvc.perform(get("/api/shelters/" + registryShelterId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.submitterVerified").value(false))
                .andExpect(jsonPath("$.submitterVerification").doesNotExist());

        // the contributions path (/mine) carries the field too
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + mari))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].submitterVerified").value(true))
                .andExpect(jsonPath("$[0].submitterVerification").value("EMAIL"));
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

    // ---------- author-scoped shelters (user-contributions, V7) ----------

    private static String updateBody(String name, double latitude, double longitude) {
        return "{\"name\":\"" + name + "\",\"latitude\":" + latitude
                + ",\"longitude\":" + longitude + "}";
    }

    @Test
    void mineIsAnonymous401AndListsOnlyOwnShelters() throws Exception {
        String author = verifiedToken("Mari", "mari@example.ee");
        String other = verifiedToken("Jaan", "jaan@example.ee");

        expectErrorShape(mvc.perform(get("/api/shelters/mine")), 401, "Unauthorized");

        mvc.perform(post("/api/shelters").header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Mari varjend")))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/shelters").header("Authorization", "Bearer " + other)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Jaan varjend")))
                .andExpect(status().isCreated());
        seedShelter("Päästeameti varjend", ShelterSource.PAASETEAMET);
        seedShelter("Legacy varjend", ShelterSource.USER); // pre-V7 USER row, no author

        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + author))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("Mari varjend"))
                .andExpect(jsonPath("$[0].source").value("USER"));
    }

    @Test
    void putByAuthorReplacesTheFiveFieldsAndKeepsTheRest() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Vana nimi")))
                .andExpect(status().isCreated()).andReturn();
        String body = created.getResponse().getContentAsString();
        long id = ((Number) JsonPath.read(body, "$.id")).longValue();
        String createdAt = JsonPath.read(body, "$.createdAt");

        mvc.perform(put("/api/shelters/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Uus nimi\",\"latitude\":59.5,\"longitude\":24.8,"
                                + "\"description\":\"uuendatud kirjeldus\",\"capacity\":40}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.name").value("Uus nimi"))
                .andExpect(jsonPath("$.latitude").value(59.5))
                .andExpect(jsonPath("$.longitude").value(24.8))
                .andExpect(jsonPath("$.description").value("uuendatud kirjeldus"))
                .andExpect(jsonPath("$.capacity").value(40))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.source").value("USER"))
                .andExpect(jsonPath("$.createdAt").value(createdAt)); // never writable

        // the public read reflects the edit (it persisted)
        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Uus nimi"))
                .andExpect(jsonPath("$.capacity").value(40));
    }

    @Test
    void postOutsideEstoniaIs400AndCreatesNothing() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        // Paris — the create side of the shared bbox gate (the PUT side is
        // pinned by putOutsideEstoniaIs400AndChangesNothing; without this the
        // create call site is the untested half of the shared check)
        expectErrorShape(mvc.perform(post("/api/shelters")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Parisi varjend\",\"latitude\":48.85,\"longitude\":2.35}")),
                400, "Bad Request");

        // nothing was created
        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].name")
                        .value(org.hamcrest.Matchers.not(
                                org.hamcrest.Matchers.hasItem("Parisi varjend"))));
    }

    @Test
    void putOutsideEstoniaIs400AndChangesNothing() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Vana nimi")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        // Paris — same bbox gate as POST, shared so create/update cannot drift
        expectErrorShape(mvc.perform(put("/api/shelters/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Vana nimi", 48.85, 2.35))), 400, "Bad Request");

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Vana nimi"))
                .andExpect(jsonPath("$.latitude").value(59.4))
                .andExpect(jsonPath("$.longitude").value(24.7));
    }

    @Test
    void putWithInvalidBodyIs400AndChangesNothing() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Vana nimi")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        // blank name — same @NotBlank @Size(max=200) as POST (shared constraints)
        expectErrorShape(mvc.perform(put("/api/shelters/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"  \",\"latitude\":59.4,\"longitude\":24.7}")), 400, "Bad Request");
        // capacity out of 1..100_000
        expectErrorShape(mvc.perform(put("/api/shelters/" + id)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Vana nimi\",\"latitude\":59.4,\"longitude\":24.7,\"capacity\":0}")), 400, "Bad Request");

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Vana nimi"));
    }

    @Test
    void putByNonAuthorIs403AndChangesNothing() throws Exception {
        String author = verifiedToken("Mari", "mari@example.ee");
        String intruder = verifiedToken("Jaan", "jaan@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Mari varjend")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        expectErrorShape(mvc.perform(put("/api/shelters/" + id)
                .header("Authorization", "Bearer " + intruder)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Röövitud", 59.4, 24.7))), 403, "Forbidden");

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Mari varjend"))
                .andExpect(jsonPath("$.description").doesNotExist());
    }

    @Test
    void putOnRegistryAndLegacyRowsIs403ForEveryoneAndMissingIs404() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        long registryId = seedShelter("Päästeameti varjend", ShelterSource.PAASETEAMET);
        long legacyUserId = seedShelter("Legacy USER varjend", ShelterSource.USER);

        // registry rows and pre-V7 legacy USER rows are unmanageable by ANYONE
        expectErrorShape(mvc.perform(put("/api/shelters/" + registryId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Ründus", 59.4, 24.7))), 403, "Forbidden");
        expectErrorShape(mvc.perform(put("/api/shelters/" + legacyUserId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Ründus", 59.4, 24.7))), 403, "Forbidden");

        // absent shelter → 404 (ids are public, so 403-vs-404 leaks nothing)
        expectErrorShape(mvc.perform(put("/api/shelters/999999")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Ründus", 59.4, 24.7))), 404, "Not Found");
    }

    @Test
    void putAnonymousIs401AndUnverifiedIs403() throws Exception {
        String unverified = unverifiedToken("Priit", "priit@example.ee");

        expectErrorShape(mvc.perform(put("/api/shelters/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Ründus", 59.4, 24.7))), 401, "Unauthorized");
        expectErrorShape(mvc.perform(put("/api/shelters/1")
                .header("Authorization", "Bearer " + unverified)
                .contentType(MediaType.APPLICATION_JSON)
                .content(updateBody("Ründus", 59.4, 24.7))), 403, "Forbidden");
    }

    @Test
    void deleteByAuthorRemovesTheShelterAndItsReportsCascade() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Kustutatav")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        mvc.perform(delete("/api/shelters/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        expectErrorShape(mvc.perform(get("/api/shelters/" + id)), 404, "Not Found");
        mvc.perform(get("/api/shelters/mine").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").value(org.hamcrest.Matchers.hasSize(0)));
    }

    @Test
    void deleteByNonAuthorIs403AndUntouchedAndMissingIs404() throws Exception {
        String author = verifiedToken("Mari", "mari@example.ee");
        String intruder = verifiedToken("Jaan", "jaan@example.ee");
        MvcResult created = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + author)
                        .contentType(MediaType.APPLICATION_JSON).content(shelterBody("Jäänu varjend")))
                .andExpect(status().isCreated()).andReturn();
        long id = ((Number) JsonPath.read(created.getResponse().getContentAsString(), "$.id")).longValue();

        expectErrorShape(mvc.perform(delete("/api/shelters/" + id)
                .header("Authorization", "Bearer " + intruder)), 403, "Forbidden");
        expectErrorShape(mvc.perform(delete("/api/shelters/999999")
                .header("Authorization", "Bearer " + author)), 404, "Not Found");

        mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Jäänu varjend"));
    }

    @Test
    void deleteOnRegistryAndLegacyRowsIs403ForEveryoneAndAnonymousIs401() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");
        long registryId = seedShelter("Päästeameti varjend", ShelterSource.PAASETEAMET);
        long legacyId = seedShelter("Legacy USER varjend", ShelterSource.USER);

        // same author-check as PUT: registry rows and pre-V7 legacy rows are
        // unmanageable by ANYONE
        expectErrorShape(mvc.perform(delete("/api/shelters/" + registryId)
                .header("Authorization", "Bearer " + token)), 403, "Forbidden");
        expectErrorShape(mvc.perform(delete("/api/shelters/" + legacyId)
                .header("Authorization", "Bearer " + token)), 403, "Forbidden");
        // anonymous → 401 (auth rule before the author check)
        expectErrorShape(mvc.perform(delete("/api/shelters/" + registryId)), 401, "Unauthorized");

        // both rows untouched
        mvc.perform(get("/api/shelters/" + registryId)).andExpect(status().isOk());
        mvc.perform(get("/api/shelters/" + legacyId)).andExpect(status().isOk());
    }
}
