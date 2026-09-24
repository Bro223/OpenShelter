package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.Argon2PasswordHasher;
import ee.sheltermap.auth.TokenResponse;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.auth.UserCredentials;
import ee.sheltermap.auth.UserCredentialsRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
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
 * Acceptance IT for the moderator→submitter information request
 * — full-stack MockMvc
 * against the real services, security chain, JWT filter and Postgres:
 * the admin request (204, USER rows only — registry 409, unknown 404),
 * the pending request on the submitter's /mine rows (never on the public
 * reads), the ONE-TIME reply (204, author only — 403 for another user,
 * 404 with no request, 409 on a second answer), the admin list showing
 * the request WITH the reply (audit posture — the row is kept), and the
 * one-exchange-per-shelter bound (a second request is 409, replied or
 * not).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The per-IP login bucket too (default 20): sibling IT contexts share
        // the test IP — 429s would be flake, not behavior.
        "app.ratelimit.login-ip-capacity=1000",
        "app.ratelimit.login-ip-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class ShelterInfoRequestIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    ShelterRepository shelters;

    @Autowired
    TokenService tokens;

    @Autowired
    UserCredentialsRepository credentials;

    @Autowired
    PasswordEncoder passwordEncoder;

    // ---------- helpers ----------

    private static final class Account {
        final RegisteredUser user;
        final String accessToken;

        Account(RegisteredUser user, String accessToken) {
            this.user = user;
            this.accessToken = accessToken;
        }
    }

    /**
     * A verified registered account (the same path /auth/login uses after the
     * credential check — the IT asserts the exchange, not the password),
     * issued an access token directly.
     */
    private Account verifiedAccount(String name, String email, String password) {
        RegisteredUser user = new RegisteredUser(name, email, "+372555000" + (100 + nextUser++));
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email,
                Instant.now()));
        users.save(user);
        credentials.save(new UserCredentials(user.getId(),
                new Argon2PasswordHasher(passwordEncoder).hash(password), Instant.now()));
        TokenResponse pair = tokens.issue(user);
        return new Account(user, pair.accessToken());
    }

    private long nextUser = 0;

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    /** Submits a USER shelter and returns its id (the 201 Location header). */
    private long submitShelter(Account account, String name) throws Exception {
        String body = """
                {"name":"%s","latitude":58.50,"longitude":24.50,"description":"Kelder","capacity":10,"locationKind":"PUBLIC"}
                """.formatted(name);
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + account.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        String location = result.getResponse().getHeader("Location");
        return Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
    }

    /** A registry (import-owned) row, seeded through the repository. */
    private long seedRegistryShelter(String name) {
        Shelter shelter = new Shelter(name, new GeoPoint(58.9, 26.3), ShelterStatus.ACTIVE,
                "ext-" + name, ShelterSource.PAASETEAMET, "Pikakaevu 3", "Harjumaa",
                "Tallinn linn", "01.01.2026", "SMIT");
        shelters.save(shelter);
        return shelter.getId();
    }

    private void adminRequestInfo(String admin, long shelterId, String message) throws Exception {
        mvc.perform(post("/admin/shelters/" + shelterId + "/request-info")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"" + message + "\"}"))
                .andExpect(status().isNoContent());
    }

    private void reply(long shelterId, Account account, String message) throws Exception {
        mvc.perform(post("/api/shelters/" + shelterId + "/info-request/reply")
                        .header("Authorization", "Bearer " + account.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"" + message + "\"}"))
                .andExpect(status().isNoContent());
    }

    /** The /mine row of the shelter (the submitter's surface). */
    private String mineRow(Account submitter, long shelterId) throws Exception {
        MvcResult result = mvc.perform(get("/api/shelters/mine")
                        .header("Authorization", "Bearer " + submitter.accessToken))
                .andExpect(status().isOk())
                .andReturn();
        String body = result.getResponse().getContentAsString();
        // The filter read returns a (single-element) array — take the first
        // match; its toString is the row's JSON for the field-level reads.
        net.minidev.json.JSONArray rows = JsonPath.read(body,
                "$[?(@.id == " + shelterId + ")]");
        return net.minidev.json.JSONValue.toJSONString(rows.get(0));
    }

    /** The admin list row of the shelter (the admin's surface). */
    private String adminRow(String admin, long shelterId) throws Exception {
        MvcResult result = mvc.perform(get("/admin/shelters")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        net.minidev.json.JSONArray rows = JsonPath.read(
                result.getResponse().getContentAsString(),
                "$[?(@.id == " + shelterId + ")]");
        return net.minidev.json.JSONValue.toJSONString(rows.get(0));
    }

    // ---------- the exchange ----------

    @Test
    void theAdminRequestShowsOnTheSubmittersMineAndOnTheAdminList() throws Exception {
        Account submitter = verifiedAccount("Kaja", "kaja@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        adminRequestInfo(admin, id, "Kas varjend on avatud?");

        // the submitter sees the pending request on their own row
        String mine = mineRow(submitter, id);
        assertThat(JsonPath.<Object>read(mine, "$.infoRequest.message")).isEqualTo("Kas varjend on avatud?");
        assertThat(JsonPath.<Object>read(mine, "$.infoRequest.replyMessage")).isNull();

        // the admin list shows it with the requester's name
        String row = adminRow(admin, id);
        assertThat(JsonPath.<Object>read(row, "$.infoRequest.message")).isEqualTo("Kas varjend on avatud?");
        assertThat(JsonPath.<Object>read(row, "$.infoRequest.requestedByName")).isEqualTo("Admin");
        assertThat(JsonPath.<Object>read(row, "$.infoRequest.replyMessage")).isNull();
    }

    @Test
    void theSubmitterAnswersOnceAndTheAdminSeesTheReply() throws Exception {
        Account submitter = verifiedAccount("Maret", "maret@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        adminRequestInfo(admin, id, "Kas varjend on avatud?");
        reply(id, submitter, "Jah, avatud on.");

        // the reply is stored — the row is KEPT (audit posture)
        String mine = mineRow(submitter, id);
        assertThat(JsonPath.<Object>read(mine, "$.infoRequest.replyMessage")).isEqualTo("Jah, avatud on.");
        assertThat(JsonPath.<Object>read(mine, "$.infoRequest.repliedAt")).isNotNull();

        // the admin sees the request together with the reply
        String row = adminRow(admin, id);
        assertThat(JsonPath.<Object>read(row, "$.infoRequest.replyMessage")).isEqualTo("Jah, avatud on.");
        assertThat(JsonPath.<Object>read(row, "$.infoRequest.requestedByName")).isEqualTo("Admin");
    }

    @Test
    void aSecondAnswerAndASecondRequestAreBothConflicts() throws Exception {
        Account submitter = verifiedAccount("Toomas", "toomas@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        adminRequestInfo(admin, id, "Kas varjend on avatud?");
        reply(id, submitter, "Jah, avatud on.");

        // a second reply is refused (409) — the answer is one-time
        mvc.perform(post("/api/shelters/" + id + "/info-request/reply")
                        .header("Authorization", "Bearer " + submitter.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Uuesti?\"}"))
                .andExpect(status().isConflict());
        // the original reply survives
        assertThat(JsonPath.<Object>read(mineRow(submitter, id), "$.infoRequest.replyMessage"))
                .isEqualTo("Jah, avatud on.");

        // the replied row is KEPT, so a second request is also a 409 —
        // one exchange per shelter
        mvc.perform(post("/admin/shelters/" + id + "/request-info")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Uus küsimus?\"}"))
                .andExpect(status().isConflict());
    }

    @Test
    void theExchangeNeverLeaksOnThePublicReads() throws Exception {
        Account submitter = verifiedAccount("Liisa", "liisa@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        String admin = adminToken();

        adminRequestInfo(admin, id, "Kas varjend on avatud?");

        // the public list row and the detail read carry no info request
        MvcResult list = mvc.perform(get("/api/shelters")).andExpect(status().isOk()).andReturn();
        net.minidev.json.JSONArray publicRows = JsonPath.read(
                list.getResponse().getContentAsString(),
                "$[?(@.id == " + id + ")]");
        String publicRow = net.minidev.json.JSONValue.toJSONString(publicRows.get(0));
        assertThat(JsonPath.<Object>read(publicRow, "$.infoRequest")).isNull();
        MvcResult detail = mvc.perform(get("/api/shelters/" + id))
                .andExpect(status().isOk()).andReturn();
        assertThat(JsonPath.<Object>read(detail.getResponse().getContentAsString(), "$.infoRequest"))
                .isNull();
    }

    @Test
    void requestInfoGuardsRegistryRowsAndUnknownIds() throws Exception {
        String admin = adminToken();
        long registryId = seedRegistryShelter("Registri varjend");

        // registry rows are import-owned (409, same guard as the other admin writes)
        mvc.perform(post("/admin/shelters/" + registryId + "/request-info")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Kust?\"}"))
                .andExpect(status().isConflict());
        // an unknown shelter is a 404
        mvc.perform(post("/admin/shelters/999999/request-info")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Kust?\"}"))
                .andExpect(status().isNotFound());
        // a blank message is a 400 validation failure
        Account submitter = verifiedAccount("Kari", "kari@example.ee", "pass123");
        long id = submitShelter(submitter, "Keldri varjend");
        mvc.perform(post("/admin/shelters/" + id + "/request-info")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void theReplyIsAuthorOnlyAndRequiresAnOpenRequest() throws Exception {
        Account author = verifiedAccount("Ene", "ene@example.ee", "pass123");
        Account stranger = verifiedAccount("Tiiu", "tiiu@example.ee", "pass123");
        long id = submitShelter(author, "Keldri varjend");
        String admin = adminToken();

        // no request yet: a reply is a 404
        mvc.perform(post("/api/shelters/" + id + "/info-request/reply")
                        .header("Authorization", "Bearer " + author.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Mis küsimus?\"}"))
                .andExpect(status().isNotFound());

        adminRequestInfo(admin, id, "Kas varjend on avatud?");

        // another user's answer is a 403 (the same vocabulary as the author
        // mutations — 404 if absent, 403 if not the author)
        mvc.perform(post("/api/shelters/" + id + "/info-request/reply")
                        .header("Authorization", "Bearer " + stranger.accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Minu vastus?\"}"))
                .andExpect(status().isForbidden());
        // anonymous callers never reach the guard (401 first)
        mvc.perform(post("/api/shelters/" + id + "/info-request/reply")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Ilma tokenita?\"}"))
                .andExpect(status().isUnauthorized());

        // the author's reply lands
        reply(id, author, "Jah, avatud on.");
        assertThat(JsonPath.<Object>read(mineRow(author, id), "$.infoRequest.replyMessage"))
                .isEqualTo("Jah, avatud on.");
    }
}
