package ee.sheltermap.guidance;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Magic-byte sniffing + header dimension reading for the media library
 * (crisis-guidance D7).
 *
 * <p>Dependency-free on purpose: Java's {@code ImageIO} understands JPEG
 * and PNG but has NO WebP reader, and the library listing needs the
 * pixel dimensions — a small header reader tested against fixture byte
 * arrays is less risk than a second Maven dependency for one format.
 *
 * <p>{@link #inspect(byte[])} returns {@code Optional.empty()} when the
 * bytes are not one of the three formats (JPEG, PNG, WebP) or the
 * dimensions cannot be read from the header. The sniffed type is the
 * stored type — the client's filename and the multipart part's declared
 * {@code Content-Type} are validated against this result upstream, never
 * the other way round.
 */
public final class MediaImageInspector {

    private MediaImageInspector() {
    }

    /** The sniffed content type plus the pixel dimensions read from the header. */
    public record ImageInfo(String contentType, int width, int height) {
    }

    /**
     * @param bytes the actually received upload bytes (never
     *              {@code Content-Length} or the client's word for them)
     * @return the sniffed type + dimensions, or empty when the bytes are
     *         not a readable JPEG/PNG/WebP
     */
    public static Optional<ImageInfo> inspect(byte[] bytes) {
        if (bytes == null || bytes.length < 12) {
            return Optional.empty();
        }
        if (isPng(bytes)) {
            return readPng(bytes);
        }
        if (isJpeg(bytes)) {
            return readJpeg(bytes);
        }
        if (isWebp(bytes)) {
            return readWebp(bytes);
        }
        return Optional.empty();
    }

    // ---- magic bytes -----------------------------------------------------

    private static boolean isPng(byte[] b) {
        return (b[0] & 0xFF) == 0x89 && b[1] == 0x50 && b[2] == 0x4E && b[3] == 0x47
                && b[4] == 0x0D && b[5] == 0x0A && b[6] == 0x1A && b[7] == 0x0A;
    }

    private static boolean isJpeg(byte[] b) {
        return (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF;
    }

    /** RIFF container with the WEBP fourcc. */
    private static boolean isWebp(byte[] b) {
        return b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P';
    }

    // ---- PNG (IHDR) -------------------------------------------------------

    /**
     * Signature (8) + first chunk: length (4) + {@code IHDR} (4), then
     * width (4, big-endian) and height (4, big-endian). The first chunk
     * of a PNG is always IHDR, so no chunk walk is needed.
     */
    private static Optional<ImageInfo> readPng(byte[] b) {
        if (b.length < 24) {
            return Optional.empty();
        }
        if (b[12] != 'I' || b[13] != 'H' || b[14] != 'D' || b[15] != 'R') {
            return Optional.empty();
        }
        return dimensions("image/png", unsignedInt(b, 16), unsignedInt(b, 20));
    }

    // ---- JPEG (SOFn) ------------------------------------------------------

    /**
     * Walk the segment list from the SOI until a SOFn marker
     * ({@code C0-C3}, {@code C5-C7} — not {@code C4}, which is DHT):
     * precision (1), height (2), width (2), all big-endian, right after
     * the segment's 2-byte length.
     */
    private static Optional<ImageInfo> readJpeg(byte[] b) {
        int i = 2; // skip the SOI (FF D8)
        while (i + 4 <= b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                i++;
                continue;
            }
            int marker = b[i + 1] & 0xFF;
            if (marker == 0xFF) {
                i++; // fill byte
                continue;
            }
            if (marker == 0xD9 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                i += 2; // EOI, TEM and RST markers carry no segment
                continue;
            }
            int segmentLength = ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            if (segmentLength < 2) {
                return Optional.empty(); // malformed segment — not readable
            }
            if (isSofMarker(marker) && i + 9 <= b.length) {
                int height = ((b[i + 5] & 0xFF) << 8) | (b[i + 6] & 0xFF);
                int width = ((b[i + 7] & 0xFF) << 8) | (b[i + 8] & 0xFF);
                return dimensions("image/jpeg", width, height);
            }
            i += 2 + segmentLength;
        }
        return Optional.empty();
    }

    /** SOF0-C3 and SOF5-C7; C4 is the DHT (Huffman table) marker, NOT a SOF. */
    private static boolean isSofMarker(int marker) {
        return marker == 0xC0 || marker == 0xC1 || marker == 0xC2 || marker == 0xC3
                || marker == 0xC5 || marker == 0xC6 || marker == 0xC7;
    }

    // ---- WebP (VP8 / VP8L / VP8X) -----------------------------------------

    /**
     * RIFF header (12) + chunk type (4) + chunk size (4) = 20, then the
     * payload: VP8 (lossy), VP8L (lossless) or VP8X (extended).
     */
    private static Optional<ImageInfo> readWebp(byte[] b) {
        if (b.length < 20) {
            return Optional.empty();
        }
        return switch (new String(b, 12, 4, StandardCharsets.US_ASCII)) {
            case "VP8 " -> readWebpLossy(b);
            case "VP8L" -> readWebpLossless(b);
            case "VP8X" -> readWebpExtended(b);
            default -> Optional.empty();
        };
    }

    /**
     * Lossy VP8 frame, bits in little-endian order (VP8 data format,
     * RFC 6386): 24-bit frame tag {@code 9D 01 2A}, 16-bit start code
     * {@code 0x1000}, then 2 bits h-scale, 14 bits width, 2 bits
     * v-scale, 14 bits height.
     */
    private static Optional<ImageInfo> readWebpLossy(byte[] b) {
        if (b.length < 30) {
            return Optional.empty();
        }
        if (b[20] != (byte) 0x9D || b[21] != 0x01 || b[22] != 0x2A) {
            return Optional.empty();
        }
        if (b[23] != 0x00 || b[24] != 0x10) {
            return Optional.empty();
        }
        int width = ((b[25] & 0x3C) >> 2) | ((b[26] & 0xFF) << 6);
        int height = ((b[27] & 0x3C) >> 2) | ((b[28] & 0xFF) << 6);
        return dimensions("image/webp", width, height);
    }

    /**
     * Lossless VP8L: 1-byte signature {@code 0x2F}, then 24 bits
     * little-endian holding {@code (width - 1)} in the low 14 bits and
     * {@code (height - 1)} in the next 14 bits.
     */
    private static Optional<ImageInfo> readWebpLossless(byte[] b) {
        if (b.length < 24) {
            return Optional.empty();
        }
        if (b[20] != 0x2F) {
            return Optional.empty();
        }
        int packed = (b[21] & 0xFF) | ((b[22] & 0xFF) << 8) | ((b[23] & 0xFF) << 16);
        int width = (packed & 0x3FFF) + 1;
        int height = ((packed >>> 14) & 0x3FFF) + 1;
        return dimensions("image/webp", width, height);
    }

    /**
     * Extended VP8X: flags (1) + reserved (3), then the canvas
     * {@code width - 1} and {@code height - 1}, each 24-bit
     * little-endian.
     */
    private static Optional<ImageInfo> readWebpExtended(byte[] b) {
        if (b.length < 30) {
            return Optional.empty();
        }
        int width = 1 + (b[24] & 0xFF) + ((b[25] & 0xFF) << 8) + ((b[26] & 0xFF) << 16);
        int height = 1 + (b[27] & 0xFF) + ((b[28] & 0xFF) << 8) + ((b[29] & 0xFF) << 16);
        return dimensions("image/webp", width, height);
    }

    // ---- shared -----------------------------------------------------------

    private static Optional<ImageInfo> dimensions(String contentType, int width, int height) {
        return (width > 0 && height > 0)
                ? Optional.of(new ImageInfo(contentType, width, height))
                : Optional.empty();
    }

    /** Big-endian unsigned 32-bit read (PNG fields). */
    private static int unsignedInt(byte[] b, int offset) {
        return ((b[offset] & 0xFF) << 24) | ((b[offset + 1] & 0xFF) << 16)
                | ((b[offset + 2] & 0xFF) << 8) | (b[offset + 3] & 0xFF);
    }
}
