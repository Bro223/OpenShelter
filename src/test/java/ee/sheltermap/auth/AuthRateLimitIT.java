package ee.sheltermap.auth;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Token-bucket enforcement on the auth endpoints (Step 4 acceptance: burst
 * over N -> 429). The buckets are keyed per IP + contact, so different emails
 * here do not interfere with each other.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.ratelimit.login-capacity=3",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.reset-capacity=3",
        "app.ratelimit.reset-refill-per-second=0"
})
@Transactional
class AuthRateLimitIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Test
    void loginBurstOverCapacityReturns429() throws Exception {
        String body = "{\"emailOrPhone\":\"ratelimit@example.ee\",\"password\":\"x\"}";
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isUnauthorized()); // passes the limiter, generic 401
        }
        mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("too many requests"));
    }

    @Test
    void resetRequestBurstOverCapacityReturns429() throws Exception {
        String body = "{\"email\":\"ratelimit2@example.ee\"}";
        for (int i = 0; i < 3; i++) {
            mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isOk());
        }
        mvc.perform(post("/auth/password-reset/request").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.status").value(429))
                .andExpect(jsonPath("$.message").value("too many requests"));
    }
}
