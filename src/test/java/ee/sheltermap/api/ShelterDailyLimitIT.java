package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Acceptance IT for the per-user DAILY shelter-submission cap
 * (abuse-limits M3): a rolling 24 h window on the submitting act — the
 * {@code app.limits.daily-submissions-per-user}+1-th submission is a 429
 * with a uniform {@link ErrorResponse} and an exact {@code Retry-After}
 * countdown, the cap is per-user (other users are unaffected), ADMIN-kind
 * accounts are exempt (like the active-shelter cap), and deleting a row
 * frees its slot (the row is gone — the churn stays bounded by the active
 * cap). Full-stack MockMvc against real services, security chain, JWT
 * filter and Postgres; the admin is seeded by the context startup
 * (app.admin.* set) and logs in through the normal /auth/login.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=admin@example.ee",
        "app.admin.password=admin-pass-1",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0"
})
@Transactional
class ShelterDailyLimitIT extends AbstractPersistenceIT {

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
        RegisteredUser user = new RegisteredUser(name, email, "+37250000" + nextUser++);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return new Auth(user.getId(), tokens.issue(user).accessToken());
    }

    private long submit(String token, String name) throws Exception {
        MvcResult result = mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.parse(result.getResponse().getContentAsString()).read("$.id", Long.class);
    }

    private void expect429WithRetryAfter(String token, String name) throws Exception {
        mvc.perform(post("/api/shelters")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"latitude\":59.4,\"longitude\":24.7}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string("Retry-After",
                        org.hamcrest.Matchers.matchesPattern("\\d+")))
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.error").value("Too Many Requests"))
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.path").isNotEmpty());
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"admin@example.ee\",\"password\":\"admin-pass-1\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.parse(login.getResponse().getContentAsString()).read("$.accessToken", String.class);
    }

    // ---------- the cap ----------

    @Test
    void theSixthSubmissionWithin24hIs429WithRetryAfter() throws Exception {
        Auth user = verified("Piiratud", "piiratud@example.ee");

        // the configured default (app.limits.daily-submissions-per-user) is 5
        for (int i = 1; i <= 5; i++) {
            submit(user.token(), "Varjend " + i);
        }

        // the 6th within the same window: 429 + exact countdown + uniform body
        expect429WithRetryAfter(user.token(), "Varjund 6");

        // the rejected row was NOT created
        assertThat(shelters.findByCreatedBy(user.id())).hasSize(5);

        // the cap is per-user: a different account is unaffected
        Auth other = verified("Teine", "teinepiir@example.ee");
        assertThat(submit(other.token(), "Teise varjend")).isPositive();
    }

    @Test
    void deletingARowFreesItsDailyCapSlot() throws Exception {
        Auth user = verified("Kustutaja", "kustutaja@example.ee");
        List<Long> ids = new ArrayList<>();
        for (int i = 1; i <= 5; i++) {
            ids.add(submit(user.token(), "Kustuta " + i));
        }

        // at the cap
        expect429WithRetryAfter(user.token(), "Kustuta 6");

        // delete one of the five → its slot is free (the row is gone)
        mvc.perform(delete("/api/shelters/" + ids.get(0))
                        .header("Authorization", "Bearer " + user.token()))
                .andExpect(status().isNoContent());
        assertThat(submit(user.token(), "Uus varjend")).isPositive();
    }

    @Test
    void adminIsExemptFromTheDailyCap() throws Exception {
        String token = adminToken();

        // 6 in a row (more than the default 5) — never throttled
        for (int i = 1; i <= 6; i++) {
            submit(token, "Admini varjend " + i);
        }
    }
}
