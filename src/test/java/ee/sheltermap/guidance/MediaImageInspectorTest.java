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

    // ---- EXIF orientation (Wave 13: the portrait-upload distortion) --------
    //
    // A phone portrait photo stores LANDSCAPE sensor pixels plus an EXIF
    // Orientation tag; the browser rotates it at render time. The stored
    // dimensions must be the VISUAL ones (what the reader sees), otherwise
    // the derivative width set and the library's W x H column disagree with
    // what every browser shows for the same file.

    @Test
    void jpegWithExifOrientation6ReportsVisualDimensions() {
        // Raw 640x480 sensor pixels + orientation 6 (rotate 90 CW):
        // the visual photo is 480 wide x 640 tall.
        ImageInfo info = inspect(jpegExif(640, 480, 6)).orElseThrow();
        assertThat(info.width()).isEqualTo(480);
        assertThat(info.height()).isEqualTo(640);
        assertThat(info.orientation()).isEqualTo(6);
    }

    @Test
    void exifOrientations5To8SwapWidthAndHeight() {
        for (int orientation : new int[]{5, 6, 7, 8}) {
            ImageInfo info = inspect(jpegExif(640, 480, orientation)).orElseThrow();
            assertThat(info).as("orientation %d", orientation).isNotNull();
            assertThat(info.width()).as("orientation %d", orientation).isEqualTo(480);
            assertThat(info.height()).as("orientation %d", orientation).isEqualTo(640);
            assertThat(info.orientation()).isEqualTo(orientation);
        }
    }

    @Test
    void exifOrientations2To4KeepTheRawDimensions() {
        // Mirrors / 180 do not change which side is the width.
        for (int orientation : new int[]{2, 3, 4}) {
            ImageInfo info = inspect(jpegExif(640, 480, orientation)).orElseThrow();
            assertThat(info).as("orientation %d", orientation).isNotNull();
            assertThat(info.width()).as("orientation %d", orientation).isEqualTo(640);
            assertThat(info.height()).as("orientation %d", orientation).isEqualTo(480);
            assertThat(info.orientation()).isEqualTo(orientation);
        }
    }

    @Test
    void aJpegWithoutExifReportsOrientationOne() {
        ImageInfo info = inspect(jpeg(640, 480)).orElseThrow();
        assertThat(info.orientation()).isEqualTo(1);
        assertThat(info.width()).isEqualTo(640);
        assertThat(info.height()).isEqualTo(480);
    }

    @Test
    void pngAndWebPFixturesCarryOrientationOne() {
        assertThat(inspect(png(1024, 768)).orElseThrow().orientation()).isEqualTo(1);
        assertThat(inspect(webpVp8(320, 240)).orElseThrow().orientation()).isEqualTo(1);
    }

    @Test
    void anApp1ThatIsNotExifIsIgnored() {
        // An APP1 segment whose payload does not start with "Exif\\0\\0"
        // (e.g. XMP) must not be mistaken for an orientation source.
        ImageInfo info = inspect(jpegApp1(640, 480, "XMPPackedData")).orElseThrow();
        assertThat(info.orientation()).isEqualTo(1);
        assertThat(info.width()).isEqualTo(640);
        assertThat(info.height()).isEqualTo(480);
    }

    @Test
    void aTruncatedExifHeaderFallsBackToOrientationOne() {
        // The SOF is reachable only past a truncated APP1: the scanner must
        // jump by the segment length (not crash) and the orientation stays
        // the normal default.
        byte[] truncated = head(jpegExif(640, 480, 6), 24); // mid-APP1
        assertThat(inspect(truncated)).isEmpty(); // no SOF in the truncation
        // ...and the SAME APP1 cut AFTER the SOF is present: orientation
        // unreadable, dimensions from the SOF.
        ImageInfo info = inspect(jpegExifWithTrailingApp1(640, 480, 6)).orElseThrow();
        assertThat(info.orientation()).isEqualTo(1);
        assertThat(info.width()).isEqualTo(640);
        assertThat(info.height()).isEqualTo(480);
    }

    @Test
    void anExifOrientationOutside1To8IsIgnored() {
        for (int value : new int[]{0, 9, 100, 255}) {
            ImageInfo info = inspect(jpegExif(640, 480, value)).orElseThrow();
            assertThat(info).as("value %d", value).isNotNull();
            assertThat(info.orientation()).as("value %d", value).isEqualTo(1);
            assertThat(info.width()).as("value %d", value).isEqualTo(640);
            assertThat(info.height()).as("value %d", value).isEqualTo(480);
        }
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
     * JPEG: SOI + an APP1 EXIF segment carrying the Orientation tag + SOF0.
     * The TIFF header is little-endian ("II") — the form phone cameras
     * emit; the layout mirrors the real APP1 the probes measured on disk.
     */
    private static byte[] jpegExif(int width, int height, int orientation) {
        byte[] exif = exifPayload(orientation);
        int app1Len = exif.length + 2; // the length field counts itself
        byte[] b = new byte[4 + app1Len + 10];
        b[0] = (byte) 0xFF; b[1] = (byte) 0xD8;          // SOI
        b[2] = (byte) 0xFF; b[3] = (byte) 0xE1;          // APP1
        b[4] = (byte) (app1Len >> 8); b[5] = (byte) app1Len;
        System.arraycopy(exif, 0, b, 6, exif.length);
        int sofi = 4 + app1Len;
        b[sofi] = (byte) 0xFF; b[sofi + 1] = (byte) 0xC0; // SOF0
        b[sofi + 2] = 0x00; b[sofi + 3] = 0x11;
        b[sofi + 4] = 8;
        b[sofi + 5] = (byte) (height >> 8); b[sofi + 6] = (byte) height;
        b[sofi + 7] = (byte) (width >> 8); b[sofi + 8] = (byte) width;
        b[sofi + 9] = 3;
        return b;
    }

    /** The EXIF payload: "Exif\\0\\0" + a one-entry little-endian IFD0. */
    private static byte[] exifPayload(int orientation) {
        byte[] b = new byte[32];
        b[0] = 'E'; b[1] = 'x'; b[2] = 'i'; b[3] = 'f'; b[4] = 0; b[5] = 0;
        b[6] = 'I'; b[7] = 'I'; b[8] = 0x2A; b[9] = 0;   // TIFF little-endian
        b[10] = 8; b[11] = 0; b[12] = 0; b[13] = 0;      // IFD0 at offset 8
        b[14] = 1; b[15] = 0;                            // one entry
        b[16] = 0x12; b[17] = 0x01;                      // tag 0x0112 (Orientation)
        b[18] = 3; b[19] = 0;                            // type SHORT
        b[20] = 1; b[21] = 0; b[22] = 0; b[23] = 0;      // count 1
        b[24] = (byte) orientation; b[25] = 0;           // value (LEFT-justified
        // in the 4-byte field — little-endian short)
        // next-IFD offset 0 — the default zero fill
        return b;
    }

    /** JPEG with an APP1 whose payload is NOT an EXIF header. */
    private static byte[] jpegApp1(int width, int height, String payloadStart) {
        byte[] b = new byte[4 + 2 + payloadStart.length() + 10];
        b[0] = (byte) 0xFF; b[1] = (byte) 0xD8;
        b[2] = (byte) 0xFF; b[3] = (byte) 0xE1;
        int app1Len = 2 + payloadStart.length();
        b[4] = (byte) (app1Len >> 8); b[5] = (byte) app1Len;
        for (int i = 0; i < payloadStart.length(); i++) {
            b[6 + i] = (byte) payloadStart.charAt(i);
        }
        int sofi = 4 + app1Len;
        b[sofi] = (byte) 0xFF; b[sofi + 1] = (byte) 0xC0;
        b[sofi + 2] = 0x00; b[sofi + 3] = 0x11;
        b[sofi + 4] = 8;
        b[sofi + 5] = (byte) (height >> 8); b[sofi + 6] = (byte) height;
        b[sofi + 7] = (byte) (width >> 8); b[sofi + 8] = (byte) width;
        b[sofi + 9] = 3;
        return b;
    }

    /** SOF0 first, then a truncated APP1 (the scanner reads the SOF before it). */
    private static byte[] jpegExifWithTrailingApp1(int width, int height, int orientation) {
        byte[] sofi = new byte[10];
        sofi[0] = (byte) 0xFF; sofi[1] = (byte) 0xC0;
        sofi[2] = 0x00; sofi[3] = 0x11;
        sofi[4] = 8;
        sofi[5] = (byte) (height >> 8); sofi[6] = (byte) height;
        sofi[7] = (byte) (width >> 8); sofi[8] = (byte) width;
        sofi[9] = 3;
        byte[] exif = exifPayload(orientation);
        // SOI + SOF + an APP1 whose length field claims more than is present:
        // the scanner must not read past the end while looking for the SOF.
        byte[] b = new byte[2 + sofi.length + 6];
        b[0] = (byte) 0xFF; b[1] = (byte) 0xD8;
        System.arraycopy(sofi, 0, b, 2, sofi.length);
        int a = 2 + sofi.length;
        b[a] = (byte) 0xFF; b[a + 1] = (byte) 0xE1;
        b[a + 2] = 0x00; b[a + 3] = 0x24; // claims 36 bytes, 2 bytes follow
        System.arraycopy(exif, 0, b, a + 4, 2);
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
