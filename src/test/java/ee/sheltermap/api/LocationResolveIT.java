package ee.sheltermap.api;

import ee.sheltermap.app.RedirectClient;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.TokenService;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Endpoint acceptance for the short-link resolver (shelter-location-input)
 * — full-stack MockMvc against the real security chain, JWT filter and the
 * per-IP token bucket, with the upstream stubbed at the
 * {@link RedirectClient} seam (the real client cannot be pointed at a local
 * server: the service whitelists {@code maps.app.goo.gl} BEFORE any fetch).
 *
 * <p>Covers: 401 unauthenticated; 200 with {@code {latitude, longitude}};
 * 429 once the per-IP 5/minute bucket is drained.
 */
@AutoConfigureMockMvc
@Transactional
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LocationResolveIT extends AbstractPersistenceIT {

    private static final String SHORT_LINK = "https://maps.app.goo.gl/xyz";

    @Autowired
    MockMvc mvc;

    @Autowired
    UserRepository users;

    @Autowired
    TokenService tokens;

    private long nextUser = 1;

    /**
     * Stubbed upstream: one fixed 302 hop to a Google Maps URL carrying an
     * in-Estonia pair — enough for the 200 path (the hop walk itself is
     * unit-tested in {@code LocationResolveServiceTest}).
     */
    @TestConfiguration
    static class StubbedUpstream {

        @Bean
        @Primary
        RedirectClient redirectClient() {
            return url -> new RedirectClient.RedirectHop(302,
                    "https://www.google.com/maps/place/@59.43703,24.75353,17z?hl=et");
        }
    }

    @Test
    @Order(1)
    void anonymousResolveIs401() throws Exception {
        mvc.perform(post("/api/geo/resolve")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveBody()))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    @Test
    @Order(2)
    void resolvedShortLinkReturns200WithThePair() throws Exception {
        String token = verifiedToken("Mari", "mari@example.ee");

        mvc.perform(post("/api/geo/resolve")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveBody()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.latitude").value(59.43703))
                .andExpect(jsonPath("$.longitude").value(24.75353));
    }

    @Test
    @Order(3)
    void rapidCallsFromOneIpHitTheFivePerMinuteBucket() throws Exception {
        String token = verifiedToken("Jaan", "jaan@example.ee");

        // The bucket holds 5 tokens total and the 200 test above consumed
        // one, so rapid calls from one IP MUST trip the 429 within this
        // loop. The exact position depends on refill timing (the bucket
        // refills ~1 token/12 s), so the invariant is "a 429 arrives",
        // not "at call N" — no wall-clock coupling.
        int first429 = -1;
        for (int i = 1; i <= 10; i++) {
            int statusCode = mvc.perform(post("/api/geo/resolve")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(resolveBody()))
                    .andReturn().getResponse().getStatus();
            if (statusCode == 429) {
                first429 = i;
                break;
            }
        }

        assertThat(first429)
                .as("a rapid 429 must arrive within 10 rapid calls")
                .isPositive();

        // the limit holds — the next call is still 429 (refill is far too
        // slow to grant a token between these calls), uniform shape
        mvc.perform(post("/api/geo/resolve")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(resolveBody()))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429));
    }

    // ---------- helpers ----------

    private static String resolveBody() {
        return "{\"url\":\"" + SHORT_LINK + "\"}";
    }

    private String verifiedToken(String name, String email) {
        RegisteredUser user = new RegisteredUser(name, email, "+3725000000" + nextUser++, "4900101000" + nextUser);
        user.addVerification(new VerificationClaim(VerificationLevel.EMAIL, "smtp", email, Instant.now()));
        users.save(user);
        return tokens.issue(user).accessToken();
    }
}
