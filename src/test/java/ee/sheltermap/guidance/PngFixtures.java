package ee.sheltermap.guidance;

/**
 * The header-only PNG fixture shared by the guidance media tests:
 * the 33-byte PNG signature + IHDR header carrying the requested
 * 32-bit big-endian width/height, bit depth 8, colour type 2
 * (truecolour). No IDAT data — enough for {@code MediaImageInspector}
 * (which reads the dimensions from the header and never decodes),
 * not enough to decode; tests that need a decodable image use a real
 * 1x1 PNG instead.
 */
public final class PngFixtures {

    private PngFixtures() {
    }

    /** A header-only PNG declaring the given dimensions. */
    public static byte[] png(int width, int height) {
        byte[] b = new byte[33];
        b[0] = (byte) 0x89; b[1] = 0x50; b[2] = 0x4E; b[3] = 0x47;
        b[4] = 0x0D; b[5] = 0x0A; b[6] = 0x1A; b[7] = 0x0A;
        b[8] = 0; b[9] = 0; b[10] = 0; b[11] = 13; // IHDR chunk length
        b[12] = 'I'; b[13] = 'H'; b[14] = 'D'; b[15] = 'R';
        // IHDR payload: width and height are 32-bit big-endian values (the
        // reader takes four bytes for each), then bit depth and colour type.
        b[16] = (byte) (width >>> 24); b[17] = (byte) (width >>> 16);
        b[18] = (byte) (width >>> 8); b[19] = (byte) width;
        b[20] = (byte) (height >>> 24); b[21] = (byte) (height >>> 16);
        b[22] = (byte) (height >>> 8); b[23] = (byte) height;
        b[24] = 8; // bit depth
        b[25] = 2; // colour type: truecolour
        return b;
    }
}
