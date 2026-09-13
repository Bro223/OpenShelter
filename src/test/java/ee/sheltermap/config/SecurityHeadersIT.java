package ee.sheltermap.config;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultMatcher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The hardening response headers (abuse-limits M3 slice 5) + the cookie
 * audit: EVERY response — 200, 400, 401, 404 — carries
 * X-Content-Type-Options / X-Frame-Options / Referrer-Policy /
 * Content-Security-Policy, and NO response sets a cookie (the app is
 * stateless JWT — the source audit found no addCookie/ResponseCookie
 * paths, this IT pins the observable behavior). HSTS is HTTPS-only:
 * absent over the plain-HTTP test traffic, present (with the exact
 * value) when the request is secure.
 */
@AutoConfigureMockMvc
class SecurityHeadersIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    @Test
    void aPublicResponseCarriesTheHardeningHeadersAndNoCookie() throws Exception {
        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(hardeningHeaders())
                .andExpect(header().doesNotExist("Strict-Transport-Security"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    void anAuthenticationFailureCarriesTheHeadersToo() throws Exception {
        // /api/shelters/mine requires a token — the 401 error body is
        // written by the security entry point AFTER the headers filter ran.
        mvc.perform(get("/api/shelters/mine"))
                .andExpect(status().isUnauthorized())
                .andExpect(hardeningHeaders())
                .andExpect(header().doesNotExist("Strict-Transport-Security"))
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    void aNotFoundAndAValidationFailureCarryTheHeadersAndNoCookie() throws Exception {
        mvc.perform(get("/api/shelters/999999"))
                .andExpect(status().isNotFound())
                .andExpect(hardeningHeaders())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));

        // malformed auth surface: the 400 handler answers, still headered
        // and cookie-free (the stateless-JWT posture).
        mvc.perform(post("/auth/register").contentType("application/json").content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(hardeningHeaders())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE));
    }

    @Test
    void hstsIsSentOnlyOnSecureRequests() throws Exception {
        // plain HTTP (the dev/test posture): no HSTS at all
        mvc.perform(get("/api/shelters"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Strict-Transport-Security"));

        // a secure request: the exact HSTS value
        mvc.perform(get("/api/shelters")
                        .with(request -> {
                            request.setScheme("https");
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security",
                        "max-age=31536000; includeSubDomains"));
    }

    /** The four always-on hardening headers (HSTS and the cookie check
     *  are posture-specific and asserted at the call site). */
    private static ResultMatcher hardeningHeaders() {
        return result -> {
            assertThat(result.getResponse().getHeader("X-Content-Type-Options"))
                    .isEqualTo("nosniff");
            assertThat(result.getResponse().getHeader("X-Frame-Options"))
                    .isEqualTo("DENY");
            assertThat(result.getResponse().getHeader("Referrer-Policy"))
                    .isEqualTo("no-referrer");
            assertThat(result.getResponse().getHeader("Content-Security-Policy"))
                    .isEqualTo("default-src 'self'");
        };
    }
}
