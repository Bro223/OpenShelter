package ee.sheltermap.guidance;

import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * The thumbnail derivative renderer: the width set, the same-format
 * policy (JPEG→JPEG, PNG→PNG — the JDK has no WebP), the no-upscale rule,
 * the undecodable-body skip, the magic-byte GATE on the encoder output
 * (the guard 6 extension), and the derived name contract. Fixtures are
 * REAL ImageIO-encoded images (the header-only fixtures of the other
 * media tests are readable by the inspector but undecodable — which is
 * itself pinned here as a skip, not a failure).
 */
class MediaDerivativesTest {

    // ---- fixtures: real decodable images (ImageIO-encoded in memory) ----

    private static byte[] realPng(int width, int height) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        fillGradient(img, width, height, true);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (!ImageIO.write(img, "png", out)) {
            throw new IOException("no PNG writer on this JDK");
        }
        return out.toByteArray();
    }

    private static byte[] realJpeg(int width, int height) throws IOException {
        BufferedImage img = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        fillGradient(img, width, height, false);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (!ImageIO.write(img, "jpeg", out)) {
            throw new IOException("no JPEG writer on this JDK");
        }
        return out.toByteArray();
    }

    // ---- EXIF orientation (the portrait-upload distortion) -------
    //
    // A phone portrait photo stores LANDSCAPE sensor pixels plus an EXIF
    // Orientation tag (the browser rotates the ORIGINAL at render time).
    // The derivatives must be rendered in the VISUAL orientation: a portrait
    // upload must not get landscape derivative files whose pixels sit 90°
    // off from what the detail page shows of the same photo.

    @Test
    void exifRotatedOriginalRendersDerivativesInVisualOrientation() throws Exception {
        // Real 400x300 landscape-pixel JPEG + EXIF orientation 6 → the
        // VISUAL photo is 300 wide x 400 tall (portrait).
        byte[] original = withExifOrientation(realJpeg(400, 300), 6);
        List<MediaDerivatives.RenderedDerivative> rendered =
                MediaDerivatives.renderAll("image/jpeg", 300, 400, original, false);

        // The no-upscale decision runs on the VISUAL width (300): 480/800
        // would upscale.
        assertThat(rendered).extracting(MediaDerivatives.RenderedDerivative::width)
                .containsExactly(96, 192);

        // The 96w derivative is PORTRAIT (96x128), not the raw-pixel
        // landscape (96x72 the pre-fix renderer produced).
        MediaImageInspector.ImageInfo info =
                MediaImageInspector.inspect(rendered.get(0).bytes()).orElseThrow();
        assertThat(info.width()).isEqualTo(96);
        assertThat(info.height()).as("portrait derivative").isEqualTo(128);

        // The PIXELS are rotated, not just the header: the test gradient
        // runs red→raw-x, green→raw-y. The EXIF 6 correction (rotate the
        // sensor buffer 90° clockwise) puts the raw BOTTOM-LEFT corner
        // (pure green) at the visual TOP-LEFT. The unrotated render
        // would put the raw top-left (red≈0, green≈0) there instead.
        BufferedImage tiny = ImageIO.read(new ByteArrayInputStream(rendered.get(0).bytes()));
        assertThat(tiny).isNotNull();
        int[] rgb = rgb(tiny.getRGB(0, 0));
        assertThat(rgb[1]).as("top-left green after the EXIF 6 rotation").isGreaterThan(192);
        assertThat(rgb[0]).as("top-left red after the EXIF 6 rotation").isLessThan(96);
    }

    @Test
    void exifOrientations5To8AllRenderInVisualOrientation() throws Exception {
        // 90° CW (6) and 270° CW (8) swap the corners differently; both
        // must come out as a 96x128 portrait derivative.
        for (int orientation : new int[]{5, 6, 7, 8}) {
            byte[] original = withExifOrientation(realJpeg(400, 300), orientation);
            List<MediaDerivatives.RenderedDerivative> rendered =
                    MediaDerivatives.renderAll("image/jpeg", 300, 400, original, false);
            assertThat(rendered).as("orientation %d", orientation)
                    .extracting(MediaDerivatives.RenderedDerivative::width)
                    .containsExactly(96, 192);
            MediaImageInspector.ImageInfo info =
                    MediaImageInspector.inspect(rendered.get(0).bytes()).orElseThrow();
            assertThat(info.height()).as("orientation %d", orientation).isEqualTo(128);
        }
    }

    @Test
    void aLandscapeOriginalWithoutExifRendersUnrotated() throws Exception {
        // The control: a plain landscape JPEG (orientation 1 / none) keeps
        // its pixels and its landscape derivatives — the portrait fix must
        // not touch the landscape path.
        byte[] original = realJpeg(400, 300);
        List<MediaDerivatives.RenderedDerivative> rendered =
                MediaDerivatives.renderAll("image/jpeg", 400, 300, original, false);

        assertThat(rendered).extracting(MediaDerivatives.RenderedDerivative::width)
                .containsExactly(96, 192);
        MediaImageInspector.ImageInfo info =
                MediaImageInspector.inspect(rendered.get(0).bytes()).orElseThrow();
        assertThat(info.width()).isEqualTo(96);
        assertThat(info.height()).isEqualTo(72);
        // The top-left stays the raw top-left (red≈0, green≈0 — no rotation).
        BufferedImage tiny = ImageIO.read(new ByteArrayInputStream(rendered.get(0).bytes()));
        assertThat(tiny).isNotNull();
        int[] rgb = rgb(tiny.getRGB(0, 0));
        assertThat(rgb[0]).as("top-left red (unrotated)").isLessThan(96);
        assertThat(rgb[1]).as("top-left green (unrotated)").isLessThan(96);
    }

    @Test
    void theNoUpscaleRuleRunsOnTheVisualWidth() throws Exception {
        // Visual 90x160 (a 160x90 sensor buffer with orientation 6): every
        // width in the set (≥96) would upscale the VISUAL width → none.
        byte[] original = withExifOrientation(realJpeg(160, 90), 6);
        assertThat(MediaDerivatives.renderAll("image/jpeg", 90, 160, original, false)).isEmpty();
    }

    /** Insert a real EXIF APP1 (Orientation = {@code orientation}) after the SOI. */
    private static byte[] withExifOrientation(byte[] jpeg, int orientation) {
        byte[] exif = new byte[32];
        exif[0] = 'E'; exif[1] = 'x'; exif[2] = 'i'; exif[3] = 'f';
        exif[6] = 'I'; exif[7] = 'I'; exif[8] = 0x2A; exif[9] = 0;
        exif[10] = 8;
        exif[14] = 1; exif[15] = 0;
        exif[16] = 0x12; exif[17] = 0x01;
        exif[18] = 3; exif[19] = 0;
        exif[20] = 1;                       // count 1 (little-endian u32)
        exif[24] = (byte) orientation;      // value (LEFT-justified short)
        int app1Len = exif.length + 2;
        byte[] out = new byte[jpeg.length + app1Len + 2]; // SOI + marker + length + payload
        out[0] = (byte) 0xFF; out[1] = (byte) 0xD8;
        out[2] = (byte) 0xFF; out[3] = (byte) 0xE1;
        out[4] = (byte) (app1Len >> 8); out[5] = (byte) app1Len;
        System.arraycopy(exif, 0, out, 6, exif.length);
        System.arraycopy(jpeg, 2, out, 6 + exif.length, jpeg.length - 2);
        return out;
    }

    /** Split an sRGB int into its (red, green, blue) channels. */
    private static int[] rgb(int srgb) {
        return new int[]{(srgb >> 16) & 0xFF, (srgb >> 8) & 0xFF, srgb & 0xFF};
    }

    /** A smooth RGB gradient (deterministic, decodable, non-trivial). */
    private static void fillGradient(BufferedImage img, int width, int height, boolean alpha) {
        int base = alpha ? 0xFF000000 : 0x00000000;
        for (int x = 0; x < width; x++) {
            for (int y = 0; y < height; y++) {
                int r = x * 255 / Math.max(1, width - 1);
                int g = y * 255 / Math.max(1, height - 1);
                img.setRGB(x, y, base | (r << 16) | (g << 8) | 128);
            }
        }
    }

    /** The header-only PNG the other media tests use: inspector-readable, undecodable. */
    private static byte[] headerOnlyPng(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x50;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        b[8] = 0; b[9] = 0; b[10] = 0; b[11] = 13;
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        b[16] = (byte) (width >>> 24); b[17] = (byte) (width >>> 16);
        b[18] = (byte) (width >>> 8); b[19] = (byte) width;
        b[20] = (byte) (height >>> 24); b[21] = (byte) (height >>> 16);
        b[22] = (byte) (height >>> 8); b[23] = (byte) height;
        b[24] = 8;
        b[25] = 2;
        return b;
    }

    // ---- render -----------------------------------------------------------

    @Test
    void rendersJpegDerivativesStrictlyBelowTheSourceWidth() throws Exception {
        byte[] original = realJpeg(500, 500);
        // 800 would upscale a 500 px original — the set is 96/192/480.
        List<MediaDerivatives.RenderedDerivative> rendered =
                MediaDerivatives.renderAll("image/jpeg", 500, 500, original, true);

        assertThat(rendered).extracting(MediaDerivatives.RenderedDerivative::width)
                .containsExactly(96, 192, 480);
        for (MediaDerivatives.RenderedDerivative d : rendered) {
            // The gate ran: each output re-inspects as JPEG at its width.
            assertThat(MediaDerivatives.passesGate(d.bytes(), "image/jpeg", d.width()))
                    .as("width %d", d.width())
                    .isTrue();
            MediaImageInspector.ImageInfo info =
                    MediaImageInspector.inspect(d.bytes()).orElseThrow();
            assertThat(info.width()).isEqualTo(d.width());
            assertThat(info.height()).as("aspect preserved at %d", d.width()).isEqualTo(d.width());
        }
        // A 96 px thumbnail of a 500 px original is a real byte win.
        MediaDerivatives.RenderedDerivative tiny = rendered.get(0);
        assertThat(tiny.bytes().length).isLessThan(original.length);
    }

    @Test
    void rendersPngDerivativesInPngFormat() throws Exception {
        byte[] original = realPng(300, 150);
        List<MediaDerivatives.RenderedDerivative> rendered =
                MediaDerivatives.renderAll("image/png", 300, 150, original, true);

        assertThat(rendered).extracting(MediaDerivatives.RenderedDerivative::width)
                .containsExactly(96, 192);
        for (MediaDerivatives.RenderedDerivative d : rendered) {
            MediaImageInspector.ImageInfo info =
                    MediaImageInspector.inspect(d.bytes()).orElseThrow();
            assertThat(info.contentType()).isEqualTo("image/png");
            assertThat(info.width()).isEqualTo(d.width());
        }
        // 150 * 96 / 300 = 48 — the aspect ratio follows the width.
        MediaImageInspector.ImageInfo tiny =
                MediaImageInspector.inspect(rendered.get(0).bytes()).orElseThrow();
        assertThat(tiny.height()).isEqualTo(48);
    }

    @Test
    void webpOriginalsAreNotRenderable() {
        // The JDK has no WebP reader/encoder (the inspector's documented
        // constraint): no derivative, no exception — the slots render
        // the original.
        assertThat(MediaDerivatives.isRenderable("image/webp")).isFalse();
        assertThat(MediaDerivatives.isRenderable("IMAGE/JPEG")).isTrue();
        assertThat(MediaDerivatives.isRenderable("text/plain")).isFalse();
        assertThat(MediaDerivatives.isRenderable(null)).isFalse();
        assertThat(MediaDerivatives.renderAll("image/webp", 500, 500, new byte[64], true)).isEmpty();
    }

    @Test
    void neverUpscales() throws Exception {
        // 50×50: every width in the set (≥96) is an upscale → none.
        byte[] small = realPng(50, 50);
        assertThat(MediaDerivatives.renderAll("image/png", 50, 50, small, true)).isEmpty();
    }

    @Test
    void anUndecodableBodyRendersEmptyInsteadOfFailing() {
        // The header-only fixture: the inspector reads its dimensions, but
        // ImageIO cannot decode it (no IDAT) — a SKIP, never an exception
        // (the upload/import of such an asset must keep working).
        assertThat(MediaDerivatives.renderAll("image/png", 300, 150, headerOnlyPng(300, 150), true))
                .isEmpty();
    }

    @Test
    void aDegenerateSourceIsRefusedBeforeAnyDecode() {
        assertThat(MediaDerivatives.renderAll("image/png", 0, 100, new byte[100], true)).isEmpty();
        assertThat(MediaDerivatives.renderAll("image/png", 100, 0, new byte[100], true)).isEmpty();
        assertThat(MediaDerivatives.renderAll("image/png", 100, 100, null, true)).isEmpty();
    }

    // ---- the gate (guard 6 extended to the encoder output) -----------------

    @Test
    void theGateAcceptsOnlyTheExpectedTypeAndWidth() throws Exception {
        List<MediaDerivatives.RenderedDerivative> rendered =
                MediaDerivatives.renderAll("image/png", 300, 150, realPng(300, 150), true);
        byte[] at96 = rendered.get(0).bytes();

        assertThat(MediaDerivatives.passesGate(at96, "image/png", 96)).isTrue();
        // The wrong type: these are PNG bytes, not JPEG.
        assertThat(MediaDerivatives.passesGate(at96, "image/jpeg", 96)).isFalse();
        // The wrong width: a 96 px file is not a 192 px file.
        assertThat(MediaDerivatives.passesGate(at96, "image/png", 192)).isFalse();
        // The degenerate inputs.
        assertThat(MediaDerivatives.passesGate(null, "image/png", 96)).isFalse();
        assertThat(MediaDerivatives.passesGate(at96, "image/png", 0)).isFalse();
        // A truncated write (an unreadable header) fails the gate.
        assertThat(MediaDerivatives.passesGate(new byte[at96.length / 2], "image/png", 96)).isFalse();
    }

    // ---- the name contract --------------------------------------------------

    @Test
    void theDerivativeNameIsDerivedFromTheBaseName() {
        String base = "0123456789abcdef0123456789abcdef.png";
        assertThat(MediaDerivatives.derivativeName(base, 96))
                .isEqualTo("0123456789abcdef0123456789abcdef-t96.png");
        assertThat(MediaDerivatives.derivativeName(base, 800))
                .isEqualTo("0123456789abcdef0123456789abcdef-t800.png");
        String baseJpg = "fedcba9876543210fedcba9876543210.jpg";
        assertThat(MediaDerivatives.derivativeName(baseJpg, 192))
                .isEqualTo("fedcba9876543210fedcba9876543210-t192.jpg");
    }

    @Test
    void theDerivativeNameRefusesAForeignBaseOrWidth() {
        for (String base : new String[]{
                "../etc/passwd.png",
                "0123456789ABCDEF0123456789ABCDEF.png", // upper case
                "0123456789abcdef0123456789abc.png",   // 31 hex
                "0123456789abcdef0123456789abcdef.gif",
                "sub/0123456789abcdef0123456789abcdef.png",
                "",
                null}) {
            assertThatThrownBy(() -> MediaDerivatives.derivativeName(base, 96))
                    .as("base: %s", (Object) base)
                    .isInstanceOf(IllegalArgumentException.class);
        }
        for (int width : new int[]{0, 1, 123, 481, 1000}) {
            assertThatThrownBy(() ->
                    MediaDerivatives.derivativeName("0123456789abcdef0123456789abcdef.png", width))
                    .as("width: %d", width)
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test
    void theWidthSetIsTheSlotCoveringSet() {
        // 96: the 40–72 px slots at 1×; 192: the same at 2×; 480/800: the
        // 400 px guidance card at 1×/2×.
        assertThat(MediaDerivatives.WIDTHS).containsExactly(96, 192, 480, 800);
    }
}
