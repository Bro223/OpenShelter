package ee.sheltermap.config;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The cross-origin readability of the {@code X-Total-Count} response
 * header (reviews/06-backend-api-errors-logging.md, P1).
 *
 * <p>Model under guard: the shared CORS configuration in
 * {@link SecurityConfig#corsConfigurationSource(String)} decides which
 * response headers a browser may READ. The paged endpoints
 * ({@code GET /api/guidance}, {@code GET /admin/shelters},
 * {@code GET /admin/guidance}) report the UN-PAGED total in
 * {@code X-Total-Count}, and the frontend reads it by name
 * ({@code getWithHeaders} in {@code frontend/src/app/core/api-client.ts}).
 * By default a browser exposes only the CORS-safelisted response
 * headers, so without {@code Access-Control-Expose-Headers} the value is
 * present but unreadable — and the UI falls back to the page length,
 * which is silently WRONG on every page but the last.
 *
 * <p>The request below is a REAL cross-origin GET (an {@code Origin}
 * header on the public paged index), so the assertion covers the whole
 * chain — {@link SecurityConfig} → Spring Security's CORS filter → the
 * controller's {@code X-Total-Count} — rather than the configuration
 * object alone. The negative case pins the other half of the contract:
 * exposure is granted per ORIGIN, so an unconfigured origin still gets
 * nothing (no {@code *} crept in with the new header).
 */
@AutoConfigureMockMvc
class CorsExposedHeadersIT extends AbstractPersistenceIT {

    /** The dev/test default from {@code app.cors.allowed-origins}. */
    private static final String FRONTEND_ORIGIN = "http://localhost:5173";

    /** Not in {@code app.cors.allowed-origins} — must stay unreadable. */
    private static final String FOREIGN_ORIGIN = "https://not-the-frontend.example";

    private static final String X_TOTAL_COUNT = "X-Total-Count";

    @Autowired
    MockMvc mvc;

    @Test
    void aPagedEndpointExposesItsTotalCountToTheConfiguredOrigin() throws Exception {
        MvcResult result = mvc.perform(get("/api/guidance").header(HttpHeaders.ORIGIN, FRONTEND_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, FRONTEND_ORIGIN))
                .andReturn();

        // The header the frontend reads is on the response …
        assertThat(result.getResponse().getHeader(X_TOTAL_COUNT)).isNotNull();
        // … and readable by name across the origin boundary — exactly
        // that one header (no wildcard exposure).
        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS))
                .isEqualTo(X_TOTAL_COUNT);
    }

    @Test
    void anUnconfiguredOriginGetsNoExposure() throws Exception {
        MvcResult result = mvc.perform(get("/api/guidance").header(HttpHeaders.ORIGIN, FOREIGN_ORIGIN))
                .andExpect(status().isForbidden())
                .andReturn();

        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN)).isNull();
        assertThat(result.getResponse().getHeader(HttpHeaders.ACCESS_CONTROL_EXPOSE_HEADERS)).isNull();
    }
}
