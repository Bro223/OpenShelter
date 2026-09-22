package ee.sheltermap.api;

import com.jayway.jsonpath.JsonPath;
import ee.sheltermap.guidance.MediaImageInspector;
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

import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * P2-9 over the REAL stack: the derivative URL shape
 * ({@code /api/media/<32hex>-t<width>.<ext>}) serves the rendered
 * thumbnail with the BASE asset's stored content type, its own on-disk
 * size and the immutable cache headers; a never-rendered width (an
 * upscale) and a derivative name with no base row answer the SAME
 * uniform 404 as everything unknown; the original keeps answering
 * exactly as before (the public URL shape of existing assets is
 * unchanged). A WebP original — no JDK decoder — has no derivatives at
 * all: its derivative URLs 404 and the response carries no srcset.
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
class MediaDerivativeServingIT extends AbstractPersistenceIT {

    private static final Path MEDIA_DIR;

    static {
        try {
            MEDIA_DIR = Files.createTempDirectory("sheltermap-media-derivative-it");
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

    /** A REAL decodable 300×150 gradient JPEG (the derivative set: 96/192 — 480/800 would upscale). */
    private static byte[] jpeg300x150() {
        try {
            BufferedImage img = new BufferedImage(300, 150, BufferedImage.TYPE_INT_RGB);
            for (int x = 0; x < 300; x++) {
                for (int y = 0; y < 150; y++) {
                    img.setRGB(x, y, (x * 255 / 299 << 16) | (y * 255 / 149 << 8) | 128);
                }
            }
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            if (!javax.imageio.ImageIO.write(img, "jpeg", out)) {
                throw new IOException("no JPEG writer on this JDK");
            }
            return out.toByteArray();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    /** A header-only WebP (VP8L): inspector-readable (storable), undecodable (no derivative). */
    private static byte[] webpVp8l(int width, int height) {
        byte[] b = new byte[24];
        b[0] = 'R'; b[1] = 'I'; b[2] = 'F'; b[3] = 'F';
        b[4] = 0; b[5] = 0; b[6] = 0; b[7] = 16;
        b[8] = 'W'; b[9] = 'E'; b[10] = 'B'; b[11] = 'P';
        b[12] = 'V'; b[13] = 'P'; b[14] = '8'; b[15] = 'L';
        b[16] = 18; b[17] = 0; b[18] = 0; b[19] = 0;
        b[20] = 0x2F;
        int packed = (width - 1) | ((height - 1) << 14);
        b[21] = (byte) (packed & 0xFF);
        b[22] = (byte) ((packed >> 8) & 0xFF);
        b[23] = (byte) ((packed >> 16) & 0xFF);
        return b;
    }

    private String loginAdmin() throws Exception {
        MvcResult result = mvc.perform(
                        org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                                .post("/auth/login").contentType(MediaType.APPLICATION_JSON)
                                .content("{\"emailOrPhone\":\"guid-admin@example.ee\","
                                        + "\"password\":\"guid-admin-pass\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.accessToken");
    }

    @Test
    void theDerivativeUrlsServeTheRenderedThumbnails() throws Exception {
        String admin = loginAdmin();

        MvcResult upload = mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("file", "photo.jpg", "image/jpeg", jpeg300x150()))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isCreated())
                .andReturn();
        String stored = JsonPath.read(upload.getResponse().getContentAsString(), "$.storedFilename");
        String stem = stored.substring(0, 32);
        String body = upload.getResponse().getContentAsString();

        // The upload answer carries the srcset — exactly the widths on disk.
        String srcset = JsonPath.read(body, "$.srcset");
        assertThat(srcset)
                .isEqualTo("/api/media/" + stem + "-t96.jpg 96w, /api/media/" + stem + "-t192.jpg 192w");

        // The original keeps answering exactly as before.
        mvc.perform(get("/api/media/" + stored))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"));

        // The 96 derivative: the BASE asset's stored type, its own size,
        // the immutable cache, and the served bytes ARE a readable 96 px
        // JPEG (the content gate ran on these bytes).
        MvcResult d96 = mvc.perform(get("/api/media/" + stem + "-t96.jpg"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andReturn();
        assertThat(d96.getResponse().getHeader("Cache-Control")).contains("immutable");
        assertThat(d96.getResponse().getHeader("Content-Length")).isNotBlank();
        MediaImageInspector.ImageInfo served =
                MediaImageInspector.inspect(d96.getResponse().getContentAsByteArray()).orElseThrow();
        assertThat(served.contentType()).isEqualTo("image/jpeg");
        assertThat(served.width()).isEqualTo(96);

        // The 192 derivative, same contract.
        MvcResult d192 = mvc.perform(get("/api/media/" + stem + "-t192.jpg"))
                .andExpect(status().isOk())
                .andReturn();
        MediaImageInspector.ImageInfo d192Info =
                MediaImageInspector.inspect(d192.getResponse().getContentAsByteArray()).orElseThrow();
        assertThat(d192Info.width()).isEqualTo(192);

        // A never-rendered width (480 would upscale a 300 px original)
        // and a derivative name with no base row: the SAME uniform 404.
        mvc.perform(get("/api/media/" + stem + "-t480.jpg")).andExpect(status().isNotFound());
        mvc.perform(get("/api/media/ffffffffffffffffffffffffffffffff-t96.jpg"))
                .andExpect(status().isNotFound());
        // The shape stays traversal-proof: no path separators in the marker.
        mvc.perform(get("/api/media/" + stem + "-t96.jpg/../" + stored)).andExpect(
                status().isBadRequest()); // the firewall, before the route
    }

    @Test
    void aWebpUploadHasNoDerivativesAndItsDerivativeUrls404() throws Exception {
        String admin = loginAdmin();

        MvcResult upload = mvc.perform(multipart("/admin/media")
                        .file(new MockMultipartFile("file", "photo.webp", "image/webp", webpVp8l(300, 150)))
                        .header("Authorization", "Bearer " + admin))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.srcset").isEmpty()) // no JDK WebP decoder
                .andReturn();
        String stored = JsonPath.read(upload.getResponse().getContentAsString(), "$.storedFilename");
        String stem = stored.substring(0, 32);

        // The original serves; the derivative URLs do not exist.
        mvc.perform(get("/api/media/" + stored))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/webp"));
        mvc.perform(get("/api/media/" + stem + "-t96.webp")).andExpect(status().isNotFound());
    }
}
