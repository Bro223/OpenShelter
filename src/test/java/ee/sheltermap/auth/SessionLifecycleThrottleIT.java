package ee.sheltermap.auth;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * {@code /auth/refresh} and {@code /auth/logout} are rate-limited per
 * client IP (session-lifecycle): both are unauthenticated and DB-touching,
 * so a single IP must not hammer token rotation / revocation across
 * accounts. The two SHARE one per-IP token bucket. This IT pins a tiny
 * bucket (capacity 2, no refill) so a handful of calls drains it
 * deterministically: the first two session-lifecycle calls pass, the next
 * is 429. With {@code refill = 0} the bucket never refills, so the 429
 * carries NO {@code Retry-After} (no honest countdown — the token-bucket
 * contract; a positive refill WOULD send the whole-seconds countdown).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        // generous so register/login don't consume the session bucket's
        // IP (they use their own limiters)
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        // the per-IP session-lifecycle bucket under test
        "app.ratelimit.session-capacity=2",
        "app.ratelimit.session-refill-per-second=0"
})
// @Transactional (the AbstractPersistenceIT convention): the ITs share ONE
// static Testcontainers Postgres, so the register here must roll back after
// the test — a committed row with the shared +37250007777 phone would 409
// the next IT that registers it (e.g. VerificationThrottleIT). The throttle
// itself is the in-memory token bucket, which @Transactional does not touch.
@Transactional
class SessionLifecycleThrottleIT extends AbstractPersistenceIT {

    private static final String REGISTER_BODY =
            "{\"name\":\"Mari\",\"email\":\"session-throttle@example.ee\",\"phone\":\"+37250007777\","
                    + "\"password\":\"s3cret123\"}";

    @Autowired
    MockMvc mvc;

    private String registerAndLogin() throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON).content(REGISTER_BODY))
                .andExpect(status().isCreated());
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"session-throttle@example.ee\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.refreshToken");
    }

    private String refresh(String refreshToken) throws Exception {
        MvcResult result = mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.refreshToken");
    }

    @Test
    void refreshAndLogoutShareAPerIpBucketAnd429WhenDrained() throws Exception {
        String refreshToken = registerAndLogin();

        // two refreshes drain the capacity-2 per-IP session bucket
        refreshToken = refresh(refreshToken); // 2 -> 1
        refreshToken = refresh(refreshToken); // 1 -> 0

        // the next session-lifecycle call (refresh) is 429, and with
        // refill=0 the 429 carries NO Retry-After (no honest countdown)
        MvcResult throttled = mvc.perform(post("/auth/refresh").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andReturn();
        assertThat(throttled.getResponse().getHeader("Retry-After")).isNull();

        // logout shares the SAME per-IP bucket -> throttled too
        mvc.perform(post("/auth/logout").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isTooManyRequests());
    }
}
