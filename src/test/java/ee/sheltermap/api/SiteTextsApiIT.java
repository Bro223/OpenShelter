package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.RegisteredUser;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the site texts (site_texts): the public read is
 * anonymous (the overrides ARE the public copy) and always carries the
 * three locale keys; the write side is behind the fresh-lookup admin
 * guard (401 anonymous, 403 non-admin) and 400s a disallowed key or a
 * non-https URL; a blank value resets the override (the row is deleted,
 * the shipped catalog default stands). Full-stack MockMvc against the
 * real service, security chain, JWT filter and Postgres; the admin is
 * (re-)seeded before each test by the shared base (create-if-absent,
 * immune to a preceding race IT's wipe of the shared container) and
 * logs in through the normal /auth/login.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        // The per-IP login bucket too (default 20): sibling IT contexts share
        // the test IP — 429s would be flake, not behavior (the house idiom).
        "app.ratelimit.login-ip-capacity=1000",
        "app.ratelimit.login-ip-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class SiteTextsApiIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Autowired
    TokenService tokens;

    @Autowired
    UserRepository users;

    private String adminToken;
    private String userToken;
    private static int nextUser = 1;

    @BeforeEach
    void setUp() throws Exception {
        // The provisioned admin is (re-)seeded by the base @BeforeEach
        // before this setUp — create-if-absent, and the non-transactional
        // race ITs now clean up only their OWN rows, so the admin row
        // survives every class-order permutation (the base reseed remains
        // as the self-healing backstop).
        adminToken = adminToken();
        // A regular (non-admin) account for the 403 leg (the AdminAlertsIT
        // verified-user idiom: email-verified row, token issued directly).
        int n = nextUser++;
        String email = "user" + n + "@example.ee";
        RegisteredUser user = new RegisteredUser("User", email, "+3725001" + n);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        userToken = tokens.issue(user).accessToken();
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.parse(login.getResponse().getContentAsString()).read("$.accessToken", String.class);
    }

    @Test
    void thePublicReadIsAnonymousAndCarriesAllThreeLocales() throws Exception {
        mvc.perform(get("/api/site-texts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.en").exists())
                .andExpect(jsonPath("$.et").exists())
                .andExpect(jsonPath("$.ru").exists());
    }

    /* --- the admin guard ----------------------------------------------------- */

    @Test
    void anAnonymousWriteIsUnauthorized() throws Exception {
        int status = mvc.perform(put("/admin/site-texts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"a11y.button\",\"locale\":\"en\",\"value\":\"x\"}]}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(401);
    }

    @Test
    void aNonAdminWriteIsForbidden() throws Exception {
        int status = mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"a11y.button\",\"locale\":\"en\",\"value\":\"x\"}]}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(403);
    }

    /* --- the write round-trip ------------------------------------------------ */

    @Test
    void anAdminSaveRoundTripsThroughThePublicRead() throws Exception {
        mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":["
                                + "{\"key\":\"a11y.popup.title\",\"locale\":\"en\",\"value\":\"Contrast\"},"
                                + "{\"key\":\"a11y.popup.title\",\"locale\":\"et\",\"value\":\"Kontrast\"},"
                                + "{\"key\":\"footer.rescueBoard\",\"locale\":\"en\",\"value\":\"Päästeamet\",\"url\":\"https://www.paast.ee\"}"
                                + "]}"))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/site-texts"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.en['a11y.popup.title'].value").value("Contrast"))
                .andExpect(jsonPath("$.et['a11y.popup.title'].value").value("Kontrast"))
                .andExpect(jsonPath("$.ru['a11y.popup.title']").doesNotExist())
                .andExpect(jsonPath("$.en['footer.rescueBoard'].value").value("Päästeamet"))
                .andExpect(jsonPath("$.en['footer.rescueBoard'].url").value("https://www.paast.ee"));
    }

    @Test
    void aBlankValueResetsTheOverrideToTheDefault() throws Exception {
        mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"nav.map\",\"locale\":\"en\",\"value\":\"Map\"}]}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/site-texts"))
                .andExpect(jsonPath("$.en['nav.map'].value").value("Map"));

        mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"nav.map\",\"locale\":\"en\",\"value\":\"\"}]}"))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/site-texts"))
                .andExpect(jsonPath("$.en['nav.map']").doesNotExist());
    }

    /* --- the 400s ------------------------------------------------------------- */

    @Test
    void anUnknownKeyRefusesTheBatchWithA400() throws Exception {
        int status = mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"evil.key\",\"locale\":\"en\",\"value\":\"x\"}]}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(400);
    }

    @Test
    void aNonHttpsUrlRefusesTheBatchWithA400() throws Exception {
        int status = mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"footer.ministry\",\"locale\":\"en\","
                                + "\"value\":\"Ministry\",\"url\":\"http://insecure.ee\"}]}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(400);
    }

    @Test
    void aUrlOnANonLinkKeyRefusesTheBatchWithA400() throws Exception {
        int status = mvc.perform(put("/admin/site-texts")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"texts\":[{\"key\":\"a11y.button\",\"locale\":\"en\","
                                + "\"value\":\"x\",\"url\":\"https://example.ee\"}]}"))
                .andReturn().getResponse().getStatus();
        assertThat(status).isEqualTo(400);
    }
}
