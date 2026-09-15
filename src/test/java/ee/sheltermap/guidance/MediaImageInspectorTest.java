package ee.sheltermap.guidance;

import ee.sheltermap.guidance.MediaImageInspector.ImageInfo;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Fixture byte arrays for the magic-byte sniffing + header dimension
 * reader (crisis-guidance D7) — the fixtures encode real header layouts,
 * so a regression in the byte offsets of any format shows up here.
 */
class MediaImageInspectorTest {

    private static Optional<ImageInfo> inspect(byte[] bytes) {
        return MediaImageInspector.inspect(bytes);
    }

    @Test
    void pngDimensionsFromIhdr() {
        ImageInfo info = inspect(png(1024, 768)).orElseThrow();
        assertThat(info.contentType()).isEqualTo("image/png");
        assertThat(info.width()).isEqualTo(1024);
        assertThat(info.height()).isEqualTo(768);
    }

    @Test
    void jpegDimensionsFromSofnAfterAppSegment() {
        ImageInfo info = inspect(jpeg(640, 480)).orElseThrow();
        assertThat(info.contentType()).isEqualTo("image/jpeg");
        assertThat(info.width()).isEqualTo(640);
        assertThat(info.height()).isEqualTo(480);
    }

    @Test
    void webpLossyDimensionsFromVp8() {
        ImageInfo info = inspect(webpVp8(320, 240)).orElseThrow();
        assertThat(info.contentType()).isEqualTo("image/webp");
        assertThat(info.width()).isEqualTo(320);
        assertThat(info.height()).isEqualTo(240);
    }

    @Test
    void webpLosslessDimensionsFromVp8l() {
        ImageInfo info = inspect(webpVp8l(800, 600)).orElseThrow();
        assertThat(info.contentType()).isEqualTo("image/webp");
        assertThat(info.width()).isEqualTo(800);
        assertThat(info.height()).isEqualTo(600);
    }

    @Test
    void webpExtendedDimensionsFromVp8x() {
        ImageInfo info = inspect(webpVp8x(1920, 1080)).orElseThrow();
        assertThat(info.contentType()).isEqualTo("image/webp");
        assertThat(info.width()).isEqualTo(1920);
        assertThat(info.height()).isEqualTo(1080);
    }

    @Test
    void textBytesAreNotAnImage() {
        assertThat(inspect("This is not an image.\n".getBytes(StandardCharsets.UTF_8)))
                .isEmpty();
    }

    @Test
    void svgIsRejectedTwiceOver() {
        // SVG is XML text: not in the allowlist AND it fails the magic-byte
        // step, so it can never reach the dimension readers.
        byte[] svg = ("<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"10\" height=\"10\">"
                + "<rect width=\"10\" height=\"10\"/></svg>")
                .getBytes(StandardCharsets.UTF_8);
        assertThat(inspect(svg)).isEmpty();
    }

    @Test
    void truncatedHeadersAreUnreadable() {
        assertThat(inspect(head(png(100, 100), 12))).isEmpty();  // no IHDR yet
        assertThat(inspect(head(jpeg(100, 100), 11))).isEmpty(); // no SOF yet
        assertThat(inspect(head(webpVp8x(100, 100), 20))).isEmpty(); // no canvas size
        assertThat(inspect(head(webpVp8(100, 100), 25))).isEmpty();  // mid header
    }

    @Test
    void zeroDimensionsAreUnreadable() {
        assertThat(inspect(png(0, 100))).isEmpty();
    }

    @Test
    void nullAndShortInputsAreNotImages() {
        assertThat(inspect(null)).isEmpty();
        assertThat(inspect(new byte[0])).isEmpty();
        assertThat(inspect(new byte[]{(byte) 0x89})).isEmpty();
    }

    // ---- fixture builders (real header layouts) ---------------------------

    /** PNG: 8-byte signature + IHDR chunk (length 13, width/height BE). */
    private static byte[] png(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x47;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        putUInt(b, 8, 13); // IHDR chunk length
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        putUInt(b, 16, width);
        putUInt(b, 20, height);
        b[24] = 8; // bit depth
        b[25] = 2; // color type: truecolor
        // compression/filter/interlace/CRC — the reader stops at the height
        return b;
    }

    /** JPEG: SOI + an APP0/JFIF segment the scanner must skip + SOF0. */
    private static byte[] jpeg(int width, int height) {
        byte[] b = new byte[30];
        b[0] = (byte) 0xFF; b[1] = (byte) 0xD8;          // SOI
        b[2] = (byte) 0xFF; b[3] = (byte) 0xE0;          // APP0
        b[4] = 0x00; b[5] = 0x10;                        // segment length 16
        b[6] = 'J'; b[7] = 'F'; b[8] = 'I'; b[9] = 'F';  // payload (content
        b[10] = 0x00;                                    // is irrelevant to
        // the scanner — it jumps by the length)
        b[20] = (byte) 0xFF; b[21] = (byte) 0xC0;        // SOF0
        b[22] = 0x00; b[23] = 0x11;                      // segment length 17
        b[24] = 8;                                       // precision
        b[25] = (byte) (height >> 8); b[26] = (byte) height;
        b[27] = (byte) (width >> 8); b[28] = (byte) width;
        b[29] = 3;                                       // component count
        return b;
    }

    /**
     * WebP lossy (VP8): frame tag 9D 01 2A, start code 0x1000, then
     * 2+14+2+14 bits little-endian: h-scale, width, v-scale, height.
     */
    private static byte[] webpVp8(int width, int height) {
        byte[] b = new byte[30];
        riffWebp(b, "VP8 ", 18);
        b[20] = (byte) 0x9D; b[21] = 0x01; b[22] = 0x2A;
        b[23] = 0x00; b[24] = 0x10;
        b[25] = (byte) ((width & 0x3F) << 2);
        b[26] = (byte) ((width >> 6) & 0xFF);
        b[27] = (byte) ((height & 0x3F) << 2);
        b[28] = (byte) ((height >> 6) & 0xFF);
        return b;
    }

    /** WebP lossless (VP8L): signature 0x2F + 14-bit width-1/height-1. */
    private static byte[] webpVp8l(int width, int height) {
        byte[] b = new byte[24];
        riffWebp(b, "VP8L", 22);
        b[20] = 0x2F;
        int packed = (width - 1) | ((height - 1) << 14);
        b[21] = (byte) (packed & 0xFF);
        b[22] = (byte) ((packed >> 8) & 0xFF);
        b[23] = (byte) ((packed >> 16) & 0xFF);
        return b;
    }

    /** WebP extended (VP8X): flags + reserved, then 24-bit w-1 / h-1 LE. */
    private static byte[] webpVp8x(int width, int height) {
        byte[] b = new byte[30];
        riffWebp(b, "VP8X", 10);
        b[20] = 0; // flags
        // b[21..23] reserved
        putUInt24(b, 24, width - 1);
        putUInt24(b, 27, height - 1);
        return b;
    }

    private static void riffWebp(byte[] b, String chunkType, int chunkSize) {
        b[0] = 'R'; b[1] = 'I'; b[2] = 'F'; b[3] = 'F';
        putUInt(b, 4, b.length - 8); // RIFF payload size
        b[8] = 'W'; b[9] = 'E'; b[10] = 'B'; b[11] = 'P';
        b[12] = (byte) chunkType.charAt(0); b[13] = (byte) chunkType.charAt(1);
        b[14] = (byte) chunkType.charAt(2); b[15] = (byte) chunkType.charAt(3);
        putUInt(b, 16, chunkSize);
    }

    private static void putUInt(byte[] b, int offset, int value) {
        b[offset] = (byte) (value >> 24);
        b[offset + 1] = (byte) (value >> 16);
        b[offset + 2] = (byte) (value >> 8);
        b[offset + 3] = (byte) value;
    }

    private static void putUInt24(byte[] b, int offset, int value) {
        b[offset] = (byte) value;
        b[offset + 1] = (byte) (value >> 8);
        b[offset + 2] = (byte) (value >> 16);
    }

    private static byte[] head(byte[] bytes, int length) {
        byte[] head = new byte[length];
        System.arraycopy(bytes, 0, head, 0, length);
        return head;
    }
}
