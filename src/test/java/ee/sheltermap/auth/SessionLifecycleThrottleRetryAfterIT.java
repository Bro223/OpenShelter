package ee.sheltermap.auth;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The positive-refill half of the session-lifecycle 429 contract: with
 * {@code session-refill-per-second > 0} a drained per-IP bucket answers 429
 * WITH the whole-seconds {@code Retry-After} countdown the bucket computed
 * (the global 429 shape — the uniform body + the exact countdown; the
 * refill=0 half — no honest countdown, header omitted — is pinned by
 * SessionLifecycleThrottleIT).
 *
 * <p>No register/login: the throttle fires BEFORE the token is looked up,
 * so a bogus refresh token 401s after consuming a token (proof the acquire,
 * not the token rule, is what the later 429 hangs on) and no row is written
 * to the shared Postgres — @Transactional is not needed.
 *
 * <p>The bucket under test is capacity 1 at a tiny 0.001/s refill: the
 * countdown is ~1000 s, so a slow CI machine cannot refill the bucket
 * between the two calls (a 1/s refill would re-arm within a second and make
 * the 429 non-deterministic).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        // the per-IP session-lifecycle bucket under test: one burst token,
        // positive (tiny) refill so the 429 carries a Retry-After countdown
        "app.ratelimit.session-capacity=1",
        "app.ratelimit.session-refill-per-second=0.001"
})
class SessionLifecycleThrottleRetryAfterIT extends AbstractPersistenceIT {

    private static final String BOGUS_REFRESH = "{\"refreshToken\":\"not-a-real-token\"}";

    @Autowired
    MockMvc mvc;

    @Test
    void aDrainedSessionBucket429sWithARetryAfterCountdown() throws Exception {
        // call 1 consumes the capacity-1 bucket; the bogus token is then
        // refused with the generic 401 (the acquire already happened)
        mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(BOGUS_REFRESH))
                .andExpect(status().isUnauthorized());

        // call 2: the bucket is drained -> 429, and because the bucket DOES
        // refill, the 429 carries the whole-seconds countdown (>= 1, and at
        // most the 1/refill bound of 1000 s)
        MvcResult throttled = mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content(BOGUS_REFRESH))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andReturn();
        String retryAfter = throttled.getResponse().getHeader("Retry-After");
        assertThat(retryAfter).isNotNull();
        assertThat(Integer.parseInt(retryAfter)).isBetween(1, 1000);

        // logout shares the SAME per-IP bucket -> throttled too
        mvc.perform(post("/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .content(BOGUS_REFRESH))
                .andExpect(status().isTooManyRequests());
    }
}
