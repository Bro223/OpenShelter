package ee.sheltermap.api;

import ee.sheltermap.persistence.AbstractPersistenceIT;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Regression for the error-dispatch defect (reviews/06-backend-api-errors-logging.md,
 * Finding 2): a PUBLIC endpoint whose request fails must answer its REAL
 * status with the uniform error body naming the ORIGINAL path — never
 * {@code 401 "Authentication required"} and never {@code "path":"/error"}.
 *
 * <p>Why it happened: Spring Security 6 filters the ERROR dispatch, and the
 * chain had no ERROR rule, so the container's error page ({@code /error})
 * fell into {@code anyRequest().authenticated()} and the JWT wall's entry
 * point wrote the 401 instead. Verified live against the running backend
 * before the fix: {@code GET /api/guidance} (permitAll) with an
 * unsatisfiable {@code Accept} answered
 * {@code {"status":401,...,"message":"Authentication required","path":"/error"}}.
 *
 * <p>Why the request below looks synthetic: {@code MockMvc} carries no
 * servlet container, so it never performs the container's ERROR dispatch
 * itself ({@code MockMvc} only special-cases {@code DispatcherType.ASYNC}).
 * The dispatch the CONTAINER would perform after a failed request — the
 * dispatcher type plus the {@code jakarta.servlet.error.status_code} /
 * {@code .request_uri} attributes Tomcat sets before forwarding to the
 * registered error page — is therefore supplied explicitly, and the client
 * {@code Accept}s JSON (Boot's error page renders HTML for a
 * {@code text/html} client, where there is no envelope to assert on).
 * Everything that made the defect is real: the same security chain, the
 * same authorization rules, the same {@code /error} error page. The query
 * below therefore pins what a failing PUBLIC request answers a JSON
 * client: the error page's own body, whose
 * {@code timestamp}/{@code status}/{@code error}/{@code path} vocabulary is
 * {@link ErrorResponse}'s with {@code path} filled from the servlet's
 * original-URL attribute ({@code message} is Boot's, off by default — see
 * {@code server.error.include-message}).
 */
@AutoConfigureMockMvc
class ErrorDispatchPublicEndpointIT extends AbstractPersistenceIT {

    @Autowired
    MockMvc mvc;

    /**
     * A container-level failure (the review logged a 414 for an over-long
     * URI) reaches the error page with its own status and the ORIGINAL
     * path; the answer must be that status and that path.
     */
    @Test
    void aFailedPublicEndpointAnswersItsRealStatusAndTheOriginalPath() throws Exception {
        MvcResult result = mvc.perform(get("/error")
                        .with(errorDispatch(414, "/api/guidance"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUriTooLong())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(414))
                .andExpect(jsonPath("$.error").value("URI Too Long"))
                .andExpect(jsonPath("$.path").value("/api/guidance"))
                .andReturn();

        // The two shapes the defect produced, asserted negatively so the
        // regression cannot come back as "a 401 that happens to be 414-shaped".
        String body = result.getResponse().getContentAsString();
        assertThat(result.getResponse().getStatus()).isNotEqualTo(401);
        assertThat(body).doesNotContain("Authentication required");
        assertThat(body).doesNotContain("\"/error\"");
    }

    /**
     * A second failing row, so the fix is pinned for any status the
     * container forwards, not just 414.
     */
    @Test
    void theOriginalPathIsReportedForAnyForwardedStatus() throws Exception {
        mvc.perform(get("/error")
                        .with(errorDispatch(400, "/api/shelters"))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.path").value("/api/shelters"));
    }

    /**
     * The permission is the DISPATCHER TYPE, not the path: a plain request
     * to the internal error page is still unauthenticated-401 (nothing was
     * opened up for an anonymous caller), and so is a FORWARD dispatch —
     * only {@code DispatcherType.ERROR} was permitted.
     */
    @Test
    void onlyTheErrorDispatcherTypeIsPermitted() throws Exception {
        mvc.perform(get("/error").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.path").value("/error"))
                .andExpect(jsonPath("$.message").value("Authentication required"));

        mvc.perform(get("/error")
                        .with(request -> {
                            request.setDispatcherType(DispatcherType.FORWARD);
                            return request;
                        }))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    /**
     * The rules the ERROR permit sits in front of are untouched — the
     * public reads stay public and every authenticated rule still 401s an
     * anonymous caller (including the ones that PRECEDE the public
     * wildcard rules, like {@code GET /api/shelters/mine} and the
     * {@code /admin/**} authority rule).
     */
    @Test
    void theExistingAuthorizationRulesAreUnchanged() throws Exception {
        mvc.perform(get("/api/shelters")).andExpect(status().isOk());

        mvc.perform(get("/api/shelters/mine")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/shelters")).andExpect(status().isUnauthorized());
        mvc.perform(get("/account/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/admin/alerts")).andExpect(status().isUnauthorized());
    }

    /** The container's ERROR dispatch: dispatcher type + the servlet error attributes. */
    private static RequestPostProcessor errorDispatch(int status, String originalUri) {
        return request -> {
            request.setDispatcherType(DispatcherType.ERROR);
            request.setAttribute(RequestDispatcher.ERROR_STATUS_CODE, status);
            request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, originalUri);
            return request;
        };
    }
}
