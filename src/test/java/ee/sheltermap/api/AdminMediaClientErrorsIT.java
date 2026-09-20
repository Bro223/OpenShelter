package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.auth.AdminSeeder;
import ee.sheltermap.persistence.AbstractPersistenceIT;
import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Full-stack regression for the client-mistake 4xx family on the ONLY
 * consumes-multipart endpoint ({@code POST /admin/media}): before the
 * dedicated handlers landed, the advice's catch-all flattened these to
 * 500s ("Internal server error" + an ERROR stack for a plain client bug).
 * Pinned here against the real security chain + services:
 *
 * <ul>
 * <li>a JSON body on the multipart endpoint → 415 (the documented
 * client-error answer, not a 500);</li>
 * <li>a multipart body without the required {@code file} part → 400;</li>
 * <li>a 6 MB upload (over the app's 5 MiB cap, under the 6 MB container
 * cap) → the documented 413 with the cap named.</li>
 * </ul>
 *
 * <p>The band ABOVE the 6 MB servlet-container cap throws
 * {@code MaxUploadSizeExceededException} inside the container's multipart
 * parsing — MockHttpServletRequest never enforces container caps, so that
 * row is pinned at the resolver level in
 * {@link ApiErrorHandlerClientErrorsMvcTest} instead (the mapping is the
 * same handler either way).
 */
@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "app.admin.email=media-admin@example.ee",
        "app.admin.password=media-admin-pass",
        "app.ratelimit.login-capacity=1000",
        "app.ratelimit.login-refill-per-second=0",
        "app.ratelimit.register-capacity=1000",
        "app.ratelimit.register-refill-per-second=0"
})
@Transactional
class AdminMediaClientErrorsIT extends AbstractPersistenceIT {

    /** Isolates the media upload directory per JVM run (no IT artifacts in data/media). */
    private static final Path MEDIA_DIR;

    static {
        try {
            MEDIA_DIR = Files.createTempDirectory("sheltermap-media-client-errors-it");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    @DynamicPropertySource
    static void mediaUploadDir(DynamicPropertyRegistry registry) {
        registry.add("app.media.upload-dir", MEDIA_DIR::toString);
    }

    @Autowired
    MockMvc mvc;

    @Autowired
    AdminSeeder seeder;

    /** The seeder runs at CONTEXT start, but Spring contexts are shared
     * across IT classes while each class gets a FRESH database — re-run it
     * per test so the admin exists in THIS class's database
     * (create-if-absent, same as CommunityReviewIT).
     */
    @BeforeEach
    void seedAdmin() {
        seeder.run(null);
    }

    private String adminToken() throws Exception {
        MvcResult login = mvc.perform(post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"emailOrPhone\":\"media-admin@example.ee\","
                                + "\"password\":\"media-admin-pass\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(login.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void aJsonBodyOnTheMultipartEndpointAnswers415Not500() throws Exception {
        String admin = adminToken();
        mvc.perform(post("/admin/media")
                        .header("Authorization", "Bearer " + admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"file\":\"x.png\"}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.error").value("Unsupported Media Type"))
                .andExpect(jsonPath("$.message").value("Unsupported media type"))
                .andExpect(jsonPath("$.path").value("/admin/media"));
    }

    @Test
    void aMultipartBodyWithoutTheFilePartAnswers400Not500() throws Exception {
        String admin = adminToken();
        mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("renamed", "x.png", "image/png",
                                new byte[]{1}))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Malformed request"))
                .andExpect(jsonPath("$.path").value("/admin/media"));
    }

    @Test
    void anUploadOverTheAppCapAnswers413WithTheCapNamed() throws Exception {
        // 6 MB: over app.media.max-bytes (5 MiB = 5242880), under the 6 MB
        // container cap — the documented app-level 413 band (the message
        // names the cap; no partial file left behind).
        String admin = adminToken();
        byte[] sixMegabytes = new byte[6 * 1024 * 1024];
        Arrays.fill(sixMegabytes, (byte) 1);
        mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("file", "big.png", "image/png",
                                sixMegabytes))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message")
                        .value("The uploaded file exceeds the maximum size of 5242880 bytes"))
                .andExpect(jsonPath("$.path").value("/admin/media"));
    }
}
