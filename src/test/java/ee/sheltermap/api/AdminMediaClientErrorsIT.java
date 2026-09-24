package ee.sheltermap.api;

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
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
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

    @Test
    void theMediaLibraryPagesWithTheTotalHeader() throws Exception {
        // the admin media library is a bounded page (limit/offset) with
        // the X-Total-Count header = the FULL library length, stable across
        // pages — the page read must not walk the whole library to count.
        String admin = adminToken();
        // A real 1x1 PNG — the upload pipeline sniffs and DECODES the image
        // (a 400 for bytes that are not a readable JPEG/PNG/WebP), so the
        // fixture must be a genuine image, unique filename per row.
        byte[] onePixelPng = java.util.Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==");
        for (int i = 0; i < 3; i++) {
            mvc.perform(multipart("/admin/media")
                            .file(new MockMultipartFile("file", "page" + i + ".png", "image/png",
                                    onePixelPng))
                            .header("Authorization", "Bearer " + admin))
                    .andExpect(status().isCreated());
        }

        MvcResult first = mvc.perform(get("/admin/media")
                        .header("Authorization", "Bearer " + admin)
                        .param("limit", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andReturn();
        String firstBody = first.getResponse().getContentAsString();
        assertThat(org.springframework.util.StringUtils.countOccurrencesOf(firstBody, "\"id\""))
                .as("the first page carries exactly two rows").isEqualTo(2);

        MvcResult second = mvc.perform(get("/admin/media")
                        .header("Authorization", "Bearer " + admin)
                        .param("limit", "2").param("offset", "2"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Total-Count", "3"))
                .andReturn();
        String secondBody = second.getResponse().getContentAsString();
        assertThat(org.springframework.util.StringUtils.countOccurrencesOf(secondBody, "\"id\""))
                .as("the tail page carries the remaining single row").isEqualTo(1);

        // the two pages are disjoint (id sets)
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        java.util.Set<Long> firstIds = new java.util.HashSet<>();
        for (com.fasterxml.jackson.databind.JsonNode row : mapper.readTree(firstBody)) {
            firstIds.add(row.get("id").asLong());
        }
        com.fasterxml.jackson.databind.JsonNode tail = mapper.readTree(secondBody);
        assertThat(tail.size()).isEqualTo(1);
        assertThat(firstIds).doesNotContain(tail.get(0).get("id").asLong());
    }
}
