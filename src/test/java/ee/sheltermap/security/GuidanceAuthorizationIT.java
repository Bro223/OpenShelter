package ee.sheltermap.security;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultMatcher;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.List;
import java.io.UncheckedIOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Crisis-guidance endpoint authorization over the REAL security chain
 * (crisis-guidance D3): anonymous /admin/guidance/* and /admin/media/* is
 * a 401, a registered non-admin a 403, the env-provisioned admin gets
 * through; and the two public guidance routes plus the hero-image serving
 * path answer anonymously (200 on a published post / a stored file, the
 * SAME 404 for a draft slug and an unknown one).
 *
 * <p>Same shape as {@link AdminAuthorizationIT}: the admin kind comes from
 * a fresh per-request DB lookup (never a JWT claim), and the hardening
 * headers ride on the 401/403 bodies.
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=guid-admin@example.ee",
        "app.admin.password=guid-admin-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0",
        "app.ratelimit.verify-capacity=1000",
        "app.ratelimit.verify-refill-per-second=0",
        "app.verification.cooldown-seconds=0",
        "app.verification.max-per-day=10"
})
@Transactional
class GuidanceAuthorizationIT extends AbstractPersistenceIT {

    /**
     * Isolates the media upload directory per JVM run: the default
     * data/media must not accumulate IT artifacts, and the directory is
     * created by the storage layer at boot (a missing parent temp dir
     * would fail the boot loudly — the D13 fail-closed behaviour).
     */
    private static final Path MEDIA_DIR;

    static {
        try {
            MEDIA_DIR = Files.createTempDirectory("sheltermap-guidance-it-media");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void mediaUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.media.upload-dir", MEDIA_DIR::toString);
    }

    /** A 1x1 transparent PNG — a real, inspector-readable fixture. */
    private static final byte[] PNG_1X1 = Base64.getDecoder().decode(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ"
                    + "AAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");

    /** Every /admin/guidance/* and /admin/media/* route, method + path. */
    private static final List<String[]> ADMIN_ROUTES = List.of(
            new String[]{"GET", "/admin/guidance"},
            new String[]{"GET", "/admin/guidance/1"},
            new String[]{"POST", "/admin/guidance"},
            new String[]{"PUT", "/admin/guidance/1"},
            new String[]{"POST", "/admin/guidance/1/publish"},
            new String[]{"POST", "/admin/guidance/1/unpublish"},
            new String[]{"DELETE", "/admin/guidance/1"},
            new String[]{"GET", "/admin/media"},
            new String[]{"POST", "/admin/media"},
            new String[]{"DELETE", "/admin/media/1"});

    @Autowired
    MockMvc mvc;

    /** One matcher asserting the full hardening-header set + no cookie. */
    private static ResultMatcher hardeningHeadersAndNoCookie() {
        return result -> {
            assertThat(result.getResponse().getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
            assertThat(result.getResponse().getHeader("X-Frame-Options")).isEqualTo("DENY");
            assertThat(result.getResponse().getHeader("Referrer-Policy")).isEqualTo("no-referrer");
            assertThat(result.getResponse().getHeader("Content-Security-Policy")).isEqualTo("default-src 'self'");
            assertThat(result.getResponse().getHeader("Set-Cookie")).isNull();
        };
    }

    private String login(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    /** Register + login (a non-admin needs no verification to hit the 403 guard). */
    private String registerAndLoginPlain(String email, String phone) throws Exception {
        mvc.perform(post("/auth/register").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Plain User\",\"email\":\"" + email + "\","
                                + "\"phone\":\"" + phone + "\",\"password\":\"s3cret123\"}"))
                .andExpect(status().isCreated());
        return login(email, "s3cret123");
    }

    /** Runs one admin route with a JSON body where the method expects one. */
    private void performAdminRoute(String method, String path, String token) throws Exception {
        var builder = switch (method) {
            case "GET" -> get(path);
            case "DELETE" -> delete(path);
            case "POST" -> post(path);
            default -> put(path);
        };
        if (method.equals("POST") && path.equals("/admin/guidance")
                || method.equals("PUT")) {
            builder = builder.contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"T\",\"body\":\"<p>b</p>\"}".getBytes(StandardCharsets.UTF_8));
        }
        if (method.equals("POST") && path.equals("/admin/media")) {
            builder = multipart("/admin/media")
                    .file(new MockMultipartFile("file", "x.png", "image/png", PNG_1X1));
        }
        if (token != null) {
            builder = builder.header("Authorization", "Bearer " + token);
        }
        mvc.perform(builder)
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(hardeningHeadersAndNoCookie());
    }

    private void performAdminRoute403(String method, String path, String token) throws Exception {
        var builder = switch (method) {
            case "GET" -> get(path);
            case "DELETE" -> delete(path);
            case "POST" -> post(path);
            default -> put(path);
        };
        if (method.equals("POST") && path.equals("/admin/guidance")
                || method.equals("PUT")) {
            builder = builder.contentType(MediaType.APPLICATION_JSON)
                    .content("{\"title\":\"T\",\"body\":\"<p>b</p>\"}".getBytes(StandardCharsets.UTF_8));
        }
        if (method.equals("POST") && path.equals("/admin/media")) {
            builder = multipart("/admin/media")
                    .file(new MockMultipartFile("file", "x.png", "image/png", PNG_1X1));
        }
        mvc.perform(builder.header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(hardeningHeadersAndNoCookie());
    }

    @Test
    void anonymousAdminGuidanceAndMediaCallsGet401() throws Exception {
        for (String[] route : ADMIN_ROUTES) {
            performAdminRoute(route[0], route[1], null);
        }
    }

    @Test
    void aRegisteredNonAdminGets403OnEveryAdminGuidanceAndMediaRoute() throws Exception {
        String token = registerAndLoginPlain("guid-plain@example.ee", "+37250020010");
        for (String[] route : ADMIN_ROUTES) {
            performAdminRoute403(route[0], route[1], token);
        }
    }

    @Test
    void theEnvProvisionedAdminAuthorsGuidanceAndMedia() throws Exception {
        String admin = login("guid-admin@example.ee", "guid-admin-pass");

        // Create (the Estonian title exercises the transliterated slug).
        MvcResult created = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"Varjumine droonirünnaku ajal\","
                                + "\"body\":\"<p>Hide in a shelter.</p>\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        String createdJson = created.getResponse().getContentAsString(StandardCharsets.UTF_8);
        long id = ((Number) JsonPath.read(createdJson, "$.id")).longValue();
        assertThat((Object) JsonPath.read(createdJson, "$.slug")).isEqualTo("varjumine-droonirunnaku-ajal");
        assertThat((Object) JsonPath.read(createdJson, "$.status")).isEqualTo("DRAFT");

        // Read back by id (the admin form edits by id).
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id));

        // Publish → the public surface sees it.
        mvc.perform(post("/admin/guidance/" + id + "/publish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/guidance/varjumine-droonirunnaku-ajal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Varjumine droonirünnaku ajal"));

        // Unpublish → the public detail is a 404 again.
        mvc.perform(post("/admin/guidance/" + id + "/unpublish")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/guidance/varjumine-droonirunnaku-ajal"))
                .andExpect(status().isNotFound());

        // Delete: without confirm → 400 (the post stays), with confirm → 204.
        mvc.perform(delete("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
        mvc.perform(delete("/admin/guidance/" + id).param("confirm", "true")
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isNoContent());
        mvc.perform(get("/admin/guidance/" + id).header("Authorization", "Bearer " + admin))
                .andExpect(status().isNotFound());

        // Media: upload → the generated name, list, delete (unreferenced → 200).
        MvcResult upload = mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("file", "varjumine.png", "image/png", PNG_1X1))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isCreated())
                .andReturn();
        String uploadJson = upload.getResponse().getContentAsString(StandardCharsets.UTF_8);
        long mediaId = ((Number) JsonPath.read(uploadJson, "$.id")).longValue();
        String stored = JsonPath.read(uploadJson, "$.storedFilename");
        assertThat(stored).matches("^[a-f0-9]{32}\\.png$");
        mvc.perform(get("/admin/media").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(mediaId))
                .andExpect(jsonPath("$[0].reusedBy").value(0));
        mvc.perform(delete("/admin/media/" + mediaId).header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk());
        mvc.perform(get("/admin/media").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", org.hamcrest.Matchers.empty()));
    }

    @Test
    void thePublicGuidanceAndMediaRoutesAreReadableAnonymously() throws Exception {
        String admin = login("guid-admin@example.ee", "guid-admin-pass");

        // A published post and a draft, both created by the admin.
        createPost(admin, "Public post", "<p>Body</p>", true);
        createPost(admin, "Draft post", "<p>Body</p>", false);
        String draftSlug = draftSlugOf(admin, "Draft post");
        assertThat(draftSlug).isEqualTo("draft-post");

        // Anonymous index: the published post, in API order, no body exposed.
        mvc.perform(get("/api/guidance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].slug").value("public-post"))
                .andExpect(jsonPath("$[0].pinned").value(false))
                .andExpect(jsonPath("$[0].bodyHtml").isEmpty());

        // Anonymous detail: title + stored body + null hero fields.
        mvc.perform(get("/api/guidance/public-post"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Public post"))
                .andExpect(jsonPath("$.bodyHtml").value("<p>Body</p>"))
                .andExpect(jsonPath("$.heroImageUrl").isEmpty())
                .andExpect(jsonPath("$.heroImageAlt").isEmpty());

        // A draft slug and an unknown slug answer the SAME 404.
        mvc.perform(get("/api/guidance/" + draftSlug))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
        mvc.perform(get("/api/guidance/unknown-slug"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));

        // The admin list still shows the draft (admin-only surface).
        mvc.perform(get("/admin/guidance").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].slug", hasItem("draft-post")));

        // Hero serving: upload as admin, then the anonymous page loads it.
        MvcResult upload = mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("file", "public.png", "image/png", PNG_1X1))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isCreated())
                .andReturn();
        String stored = JsonPath.read(upload.getResponse().getContentAsString(), "$.storedFilename");
        mvc.perform(get("/api/media/" + stored))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/png"))
                .andExpect(result -> {
                    String cache = result.getResponse().getHeader("Cache-Control");
                    assertThat(cache).as("Cache-Control").contains("public");
                    assertThat(cache).contains("max-age=31536000");
                    assertThat(cache).contains("immutable");
                });

        // Unknown names and traversal answer 404 without leaking anything.
        mvc.perform(get("/api/media/ffffffffffffffffffffffffffffffff.png"))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/media/not-a-generated-name"))
                .andExpect(status().isNotFound());
        // A raw path traversal never reaches the route: Spring Security's
        // StrictHttpFirewall (the framework default) refuses a non-normalised
        // request path outright, and that refusal is a 400 — the controller's
        // name-shape 404 only applies to names that get as far as the route.
        mvc.perform(get("/api/media/../../etc/passwd"))
                .andExpect(status().isBadRequest());
    }

    /** Creates a post; returns its id (published when requested). */
    private long createPost(String admin, String title, String body, boolean publish) throws Exception {
        MvcResult result = mvc.perform(post("/admin/guidance")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(("{\"title\":\"" + title + "\",\"body\":\"" + body + "\"}")
                                .getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isOk())
                .andReturn();
        long id = ((Number) JsonPath.read(result.getResponse().getContentAsString(), "$.id")).longValue();
        if (publish) {
            mvc.perform(post("/admin/guidance/" + id + "/publish")
                            .header("Authorization", "Bearer " + admin))
                    .andExpect(status().isNoContent());
        }
        return id;
    }

    /** The server-generated slug of the first (only) post with this title. */
    private String draftSlugOf(String admin, String title) throws Exception {
        MvcResult result = mvc.perform(get("/admin/guidance").header("Authorization", "Bearer " + admin))
                .andExpect(status().isOk())
                .andReturn();
        List<?> slugs = JsonPath.read(result.getResponse().getContentAsString(StandardCharsets.UTF_8),
                "$[?(@.title == '" + title + "')].slug");
        return slugs.get(0).toString();
    }
}
