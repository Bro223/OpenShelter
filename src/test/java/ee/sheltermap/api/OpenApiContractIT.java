package ee.sheltermap.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.Set;
import java.util.TreeSet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.assertj.core.api.Assertions.assertThat;

/**
 * The OpenAPI contract gate: the document must not drift
 * from the controllers, and it must never carry secrets, blind-index
 * columns or PII.
 *
 * <p>Enabled per class (the default in the test yml is OFF — the
 * deterministic baseline everything else boots against). The exact
 * path+method inventory is hardcoded in both directions: adding or
 * removing a controller method without the document failing the build is
 * the point. The public-vs-authenticated split (including the
 * {@code GET /api/shelters/mine} trap — authenticated although
 * {@code /api/shelters/**} is public) and the {@code x-admin-only} marker
 * on every admin operation are asserted here, not reviewed.
 *
 * <p>The Swagger-UI assertion depends on the profile-aware docs permit in
 * SecurityConfig: under the test profile the docs URLs are permitAll, so the
 * UI answers 200.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "springdoc.api-docs.enabled=true",
        "springdoc.swagger-ui.enabled=true"
})
class OpenApiContractIT extends AbstractPersistenceIT {

    private static final Set<String> HTTP_METHODS =
            Set.of("get", "put", "post", "delete", "patch", "head", "options");

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper objectMapper;

    @Test
    void apiDocsAnswer200WithJson() throws Exception {
        mvc.perform(get("/v3/api-docs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(result ->
                        assertThat(result.getResponse().getContentType())
                                .startsWith(MediaType.APPLICATION_JSON_VALUE));
    }

    @Test
    void swaggerUiIsReachableUnderDevTestProfiles() throws Exception {
        // The security chain permits /swagger-ui/** under dev/test only; the test profile
        // is the dev parity here.
        mvc.perform(get("/swagger-ui/index.html"))
                .andExpect(status().isOk());
    }

    @Test
    void theServedUiResolvesItsOwnWebjarAssets() throws Exception {
        // /swagger-ui/** is served from
        // classpath:/META-INF/resources/webjars/swagger-ui/<springdoc.swagger-ui.version>/.
        // If the webjar version in pom.xml drifts from the property in
        // application.yml, the UI's own assets 404 (the regression the 5.32.7
        // bump proved, CVE-2026-65898): the welcome page alone would not
        // catch a property pointing at a still-present OLDER webjar, so the
        // bundle asset is pinned, not just the page.
        mvc.perform(get("/swagger-ui/swagger-ui-bundle.js"))
                .andExpect(status().isOk())
                .andExpect(result -> {
                    assertThat(result.getResponse().getContentType())
                            .as("the bundle must be served as a JS asset")
                            .contains("javascript");
                    assertThat(result.getResponse().getContentAsByteArray())
                            .as("the bundle asset must not be empty")
                            .isNotEmpty();
                });
    }

    @Test
    void thePathAndMethodInventoryIsExact() throws Exception {
        Set<String> actual = inventory(doc());
        assertThat(actual)
                .containsExactlyInAnyOrderElementsOf(expectedInventory());
    }

    @Test
    void bearerAuthIsThePublishedSecurityScheme() throws Exception {
        JsonNode scheme = doc().path("components").path("securitySchemes").path("bearerAuth");
        assertThat(scheme.path("type").asText()).isEqualTo("http");
        assertThat(scheme.path("scheme").asText()).isEqualTo("bearer");
        assertThat(scheme.path("bearerFormat").asText()).isEqualTo("JWT");
        // the global requirement: every operation is bearer-authenticated
        // unless it opts out explicitly (the public operations)
        JsonNode globalSecurity = doc().path("security");
        assertThat(globalSecurity.isArray()).isTrue();
        assertThat(globalSecurity.size()).isGreaterThan(0);
        assertThat(globalSecurity.get(0).has("bearerAuth")).isTrue();
    }

    @Test
    void everyAdminOperationCarries403AndTheAdminExtension() throws Exception {
        JsonNode paths = doc().path("paths");
        Iterator<String> it = paths.fieldNames();
        while (it.hasNext()) {
            String path = it.next();
            if (!path.startsWith("/admin")) {
                continue;
            }
            paths.get(path).fields().forEachRemaining(entry -> {
                if (!HTTP_METHODS.contains(entry.getKey())) {
                    return;
                }
                JsonNode operation = entry.getValue();
                assertThat(operation.path("responses").has("403"))
                        .as("%s %s must declare 403", entry.getKey().toUpperCase(), path)
                        .isTrue();
                assertThat(operation.path("x-admin-only").isObject())
                        .as("%s %s must carry the x-admin-only extension",
                                entry.getKey().toUpperCase(), path)
                        .isTrue();
            });
        }
    }

    @Test
    void thePublicAndAuthenticatedSplitIsDocumented() throws Exception {
        JsonNode doc = doc();
        // Genuinely public: the two shelter reads, the provenance read,
        // the crisis-guidance reads (index, detail and hero-image serving —
        // the /blog pages read them anonymously) and the six /auth
        // operations (all permitAll in SecurityConfig).
            for (String operation : new String[]{
                "GET /api/shelters", "GET /api/shelters/{id}", "GET /api/data-source",
                "GET /api/site-texts",
                "GET /api/guidance", "GET /api/guidance/{slug}", "GET /api/media/{filename}",
                "POST /auth/register", "POST /auth/login", "POST /auth/refresh",
                "POST /auth/logout", "POST /auth/password-reset/request",
                "POST /auth/password-reset/confirm"}) {
            assertThat(requiresBearer(operation, doc))
                    .as("%s must be public (no bearerAuth)", operation)
                    .isFalse();
        }
        // Everything else is JWT — including the /mine trap (authenticated
        // although /api/shelters/** is public) and /api/geo/resolve
        // (deliberably NOT in the permit list).
        for (String operation : new String[]{
                "GET /api/shelters/mine", "POST /api/geo/resolve",
                "GET /account/me", "PUT /account/profile",
                "POST /account/email-change/request", "POST /account/email-change/confirm",
                "POST /account/phone-change/request", "POST /account/phone-change/confirm",
                "GET /account/export", "DELETE /account",
                "POST /verify/request", "POST /verify/confirm"}) {
            assertThat(requiresBearer(operation, doc))
                    .as("%s must be bearer-authenticated", operation)
                    .isTrue();
        }
        // every admin operation inherits the global requirement (no opt-out)
        JsonNode paths = doc.path("paths");
        Iterator<String> it = paths.fieldNames();
        while (it.hasNext()) {
            String path = it.next();
            if (!path.startsWith("/admin")) {
                continue;
            }
            paths.get(path).fields().forEachRemaining(entry -> {
                if (!HTTP_METHODS.contains(entry.getKey())) {
                    return;
                }
                assertThat(requiresBearer(entry.getKey().toUpperCase() + " " + path, doc))
                        .as("%s %s must be bearer-authenticated",
                                entry.getKey().toUpperCase(), path)
                        .isTrue();
            });
        }
    }

    @Test
    void noDevOrActuatorPathsAreDocumented() throws Exception {
        JsonNode paths = doc().path("paths");
        assertThat(paths).isNotEmpty();
        Iterator<String> it = paths.fieldNames();
        while (it.hasNext()) {
            String path = it.next();
            assertThat(path.startsWith("/dev"))
                    .as("the guarded /dev relays must be invisible to the document")
                    .isFalse();
            assertThat(path.startsWith("/actuator"))
                    .as("the actuator surface must not be absorbed into the document")
                    .isFalse();
        }
    }

    @Test
    void theDocumentNeverLeaksSecretsBlindIndexesOrPii() throws Exception {
        // The published document is a public surface — the sweep asserts
        // that blind-index columns, PII ciphertext envelopes and every
        // secret/config name stay out of it (string-level, over the whole
        // serialized document).
        String serialized = objectMapper.writeValueAsString(doc());
        for (String forbidden : new String[]{
                "emailHash", "phoneHash", "email_hash", "phone_hash",
                "v1:", "PII_AES_KEY", "PII_HMAC_KEY", "JWT_SECRET",
                "ADMIN_PASSWORD", "dev-only-secret-change-me"}) {
            assertThat(serialized)
                    .as("forbidden content in the published document: %s", forbidden)
                    .doesNotContain(forbidden);
        }
        // schema property names: no hash/ciphertext/secret-shaped field in
        // any published schema (the `password` REQUEST field of the auth
        // records is a legal input and is deliberately not matched).
        JsonNode schemas = doc().path("components").path("schemas");
        Iterator<String> it = schemas.fieldNames();
        while (it.hasNext()) {
            String schemaName = it.next();
            JsonNode properties = schemas.get(schemaName).path("properties");
            Iterator<String> fields = properties.fieldNames();
            while (fields.hasNext()) {
                String property = fields.next();
                assertThat(property.matches("(?i).*(hash|ciphertext|secret|passwordhash).*"))
                        .as("schema %s has a forbidden property name: %s", schemaName, property)
                        .isFalse();
            }
        }
    }

    @Test
    void theShelterDtoDocumentsTheCommunityPulse() throws Exception {
        // community pulse: the detail-read field and its nested schemas
        // are part of the published contract (the gauge inputs the FE
        // renders — the plain counts, the weighted shares, the log).
        JsonNode shelterDto = doc().path("components").path("schemas").path("ShelterDto");
        assertThat(shelterDto.path("properties").has("communityPulse"))
                .as("ShelterDto must document the communityPulse detail field")
                .isTrue();
        assertThat(shelterDto.path("properties").path("communityPulse").path("$ref").asText())
                .isEqualTo("#/components/schemas/CommunityPulse");
        JsonNode schemas = doc().path("components").path("schemas");
        assertThat(schemas.has("CommunityPulse")).isTrue();
        assertThat(schemas.has("OpenClosed")).isTrue();
        assertThat(schemas.has("OccupancyBands")).isTrue();
        assertThat(schemas.has("RecentReport")).isTrue();
        JsonNode pulse = schemas.path("CommunityPulse").path("properties");
        assertThat(pulse.has("openClosed")).isTrue();
        assertThat(pulse.has("occupancy")).isTrue();
        assertThat(pulse.has("recentReports")).isTrue();
    }

    /** "METHOD /path" for every operation in the document. */
    private static Set<String> inventory(JsonNode doc) {
        Set<String> inventory = new TreeSet<>();
        JsonNode paths = doc.path("paths");
        Iterator<String> it = paths.fieldNames();
        while (it.hasNext()) {
            String path = it.next();
            paths.get(path).fields().forEachRemaining(entry -> {
                if (HTTP_METHODS.contains(entry.getKey())) {
                    inventory.add(entry.getKey().toUpperCase() + " " + path);
                }
            });
        }
        return inventory;
    }

    /**
     * The exact expected surface — every controller method that is not
     * {@code @Hidden}. The /dev/* relays and the actuator endpoints do not
     * belong here; their absence is asserted separately.
     */
    private static Set<String> expectedInventory() {
        return Set.of(
                // ShelterController (/api/shelters)
                "GET /api/shelters",
                "GET /api/shelters/{id}",
                "POST /api/shelters",
                "GET /api/shelters/mine",
                "POST /api/shelters/{id}/info-request/reply",
                "POST /api/shelters/{id}/reports",
                "PUT /api/shelters/{id}/occupancy",
                "PUT /api/shelters/{id}/open-status",
                "PUT /api/shelters/{id}",
                "DELETE /api/shelters/{id}",
                // AdminController (/admin)
                "GET /admin/shelters",
                "POST /admin/shelters/{id}/status",
                "DELETE /admin/shelters/{id}",
                "GET /admin/shelters/{id}/history",
                "POST /admin/shelters/{id}/request-info",
                "POST /admin/shelters/{id}/mark-inaccurate",
                "POST /admin/shelters/{id}/clear-inaccurate",
                "POST /admin/shelters/{id}/review",
                "GET /admin/audit",
                "GET /admin/alerts",
                "GET /admin/reports",
                "POST /admin/reports/{id}/dismiss",
                "GET /admin/users",
                "POST /admin/users/{id}/suspend",
                "POST /admin/users/{id}/unsuspend",
                // GuidanceController (/api/guidance) + MediaController (/api/media)
                "GET /api/guidance",
                "GET /api/guidance/{slug}",
                "GET /api/media/{filename}",
                // AdminGuidanceController (/admin/guidance)
                "GET /admin/guidance",
                "PUT /admin/guidance/order",
                "GET /admin/guidance/{id}",
                "POST /admin/guidance",
                "PUT /admin/guidance/{id}",
                "POST /admin/guidance/{id}/publish",
                "POST /admin/guidance/{id}/unpublish",
                "DELETE /admin/guidance/{id}",
                // AdminGuidanceController — translations (bilingual-guidance)
                "GET /admin/guidance/{id}/translations",
                "POST /admin/guidance/{id}/translations",
                "PUT /admin/guidance/{id}/translations/{locale}",
                "DELETE /admin/guidance/{id}/translations/{locale}",
                "POST /admin/guidance/{id}/translations/attach",
                // AdminMediaController (/admin/media)
                "GET /admin/media",
                "POST /admin/media",
                "DELETE /admin/media/{id}",
                // AuthController (/auth)
                "POST /auth/register",
                "POST /auth/login",
                "POST /auth/refresh",
                "POST /auth/logout",
                "POST /auth/password-reset/request",
                "POST /auth/password-reset/confirm",
                // AccountController (/account)
                "GET /account/me",
                "PUT /account/profile",
                "POST /account/email-change/request",
                "POST /account/email-change/confirm",
                "POST /account/phone-change/request",
                "POST /account/phone-change/confirm",
                "GET /account/export",
                "DELETE /account",
                // VerificationController (/verify)
                "POST /verify/request",
                "POST /verify/confirm",
                // LocationController (/api/geo)
                "POST /api/geo/resolve",
                // DataSourceController
                "GET /api/data-source",
                // SiteTextController (/api/site-texts) + AdminSiteTextController
                "GET /api/site-texts",
                "PUT /admin/site-texts");
    }

    /**
     * True when the operation is bearer-authenticated: it does not opt out
     * of the global {@code bearerAuth} requirement (an operation with no
     * {@code security} entry of its own inherits the global one).
     */
    private static boolean requiresBearer(String operation, JsonNode doc) {
        String[] parts = operation.split(" ", 2);
        JsonNode op = doc.path("paths").path(parts[1]).path(parts[0].toLowerCase());
        JsonNode security = op.path("security");
        if (security.isMissingNode() || !security.isArray()) {
            return true; // no explicit opt-out — the global requirement applies
        }
        for (JsonNode requirement : security) {
            if (requirement.has("bearerAuth")) {
                return true;
            }
        }
        return false; // explicit empty requirement — the public opt-out
    }

    private JsonNode doc() throws Exception {
        String body = mvc.perform(get("/v3/api-docs").accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        return objectMapper.readTree(body);
    }
}
