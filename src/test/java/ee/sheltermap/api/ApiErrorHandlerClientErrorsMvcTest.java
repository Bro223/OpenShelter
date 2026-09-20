package ee.sheltermap.api;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartFile;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Resolver-level regression for the client-mistake 4xx family: the
 * catch-all {@code @ExceptionHandler(Exception.class)} in
 * {@link ApiErrorHandler} outranks Spring's own default resolution, so
 * every MVC failure raised OUTSIDE the handler body must have a dedicated
 * handler — these tests pin the RESOLUTION (the real advice wired into a
 * DispatcherServlet next to a stub controller that mirrors
 * {@code AdminMediaController.upload}, {@code consumes =
 * multipart/form-data}):
 *
 * <ul>
 * <li>JSON body on a multipart-consumes endpoint → 415 (not 500);</li>
 * <li>multipart body without the required {@code file} part → 400 (not
 * 500);</li>
 * <li>{@link MaxUploadSizeExceededException} (what the servlet container
 * throws when the received bytes pass the 6 MB cap) → 413 with the cap
 * named (not 500);</li>
 * <li>a genuine server exception still falls through to the catch-all 500
 * (the handlers must not shadow it).</li>
 * </ul>
 *
 * <p>The full-stack 415/400 rows are additionally pinned in
 * {@code AdminMediaClientErrorsIT} against the real security chain.
 */
class ApiErrorHandlerClientErrorsMvcTest {

    /** The 6 MB servlet-container cap from application.yml. */
    private static final long CONTAINER_CAP = 6L * 1024 * 1024;

    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        Clock clock = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneOffset.UTC);
        // Explicit JSON converter: the classpath also carries jackson-dataformat-xml
        // (via swagger-core), and this Spring build's standalone defaults order the
        // XML converter first — the app's real converters (Boot) answer JSON.
        mvc = MockMvcBuilders.standaloneSetup(new StubUploadController())
                .setMessageConverters(new MappingJackson2HttpMessageConverter())
                .setControllerAdvice(new ApiErrorHandler(clock))
                .build();
    }

    @Test
    void aJsonBodyOnAMultipartEndpointAnswers415Not500() throws Exception {
        mvc.perform(post("/upload")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"file\":\"x.png\"}"))
                .andExpect(status().isUnsupportedMediaType())
                .andExpect(jsonPath("$.status").value(415))
                .andExpect(jsonPath("$.message").value("Unsupported media type"))
                .andExpect(jsonPath("$.path").value("/upload"));
    }

    @Test
    void aMultipartBodyWithoutTheFilePartAnswers400Not500() throws Exception {
        mvc.perform(multipart("/upload")
                        .file(new MockMultipartFile("other", "x.png", "image/png",
                                new byte[]{1})))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Malformed request"))
                .andExpect(jsonPath("$.path").value("/upload"));
    }

    @Test
    void anUploadOverTheContainerCapAnswers413WithTheCapNamed() throws Exception {
        // /too-large simulates the servlet container throwing while parsing
        // a body over spring.servlet.multipart.max-file-size (6 MB) — the
        // exception arrives with no controller code of its own, exactly as
        // StandardServletMultipartResolver produces it under a real server.
        mvc.perform(multipart("/upload/too-large")
                        .file(new MockMultipartFile("file", "big.png", "image/png",
                                new byte[]{1})))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.message")
                        .value("The uploaded file exceeds the maximum size of 6291456 bytes"))
                .andExpect(jsonPath("$.path").value("/upload/too-large"));
    }

    @Test
    void aGenuineServerExceptionStillAnswers500() throws Exception {
        // the new handlers must not shadow the catch-all fallback
        mvc.perform(multipart("/upload/broken")
                        .file(new MockMultipartFile("file", "x.png", "image/png",
                                new byte[]{1})))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("Internal server error"));
    }

    /** Mirrors AdminMediaController.upload's mapping (consumes multipart/form-data, a required file part). */
    @RestController
    @RequestMapping("/upload")
    static class StubUploadController {

        @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public String upload(@RequestParam("file") MultipartFile file) {
            return "ok";
        }

        @PostMapping(value = "/too-large", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public String tooLarge() {
            throw new MaxUploadSizeExceededException(CONTAINER_CAP);
        }

        @PostMapping(value = "/broken", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public String broken() {
            throw new IllegalStateException("boom");
        }
    }
}
