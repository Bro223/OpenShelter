package ee.sheltermap.guidance;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

/**
 * Magic-byte sniffing + header dimension reading for the media library.
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
 *
 * <p><b>EXIF orientation.</b> A JPEG photo from a phone camera
 * stores SENSOR-orientation pixels plus an EXIF Orientation tag (5–8
 * rotate the image 90°/270° and swap the sides). Every browser applies
 * the tag at render time, so the dimensions this reader reports are the
 * VISUAL ones (swapped for 5–8) — what the reader actually sees — and
 * the orientation is carried in the {@link ImageInfo} for the derivative
 * renderer, which must rotate the decoded raster the same way before it
 * draws the thumbnails. A JPEG without a readable tag (and every PNG and
 * WebP) answers orientation 1 and the raw dimensions.
 */
public final class MediaImageInspector {

    private MediaImageInspector() {
    }

    /**
     * The sniffed content type plus the pixel dimensions read from the
     * header. For a JPEG with an EXIF Orientation tag the dimensions are
     * the VISUAL ones (swapped for orientations 5–8 — the form the
     * browser renders); {@code orientation} is 1–8, or 1 when the file
     * carries no readable tag (PNG and WebP have none).
     */
    public record ImageInfo(String contentType, int width, int height, int orientation) {

        /** The no-EXIF form (orientation 1). */
        public ImageInfo(String contentType, int width, int height) {
            this(contentType, width, height, 1);
        }
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
     * the segment's 2-byte length. Along the way the first APP1 EXIF
     * header is scanned for the Orientation tag, so the returned
     * dimensions are the VISUAL ones (swapped for orientations 5–8).
     */
    private static Optional<ImageInfo> readJpeg(byte[] b) {
        int i = 2; // skip the SOI (0xFFD8)
        int orientation = 1;
        boolean exifSeen = false;
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
            if (!exifSeen && marker == 0xE1) {
                orientation = exifOrientationIn(b, i + 4, segmentLength - 2);
                exifSeen = true; // the FIRST Exif-tagged APP1 is the tag's home
            }
            if (isSofMarker(marker) && i + 9 <= b.length) {
                int height = ((b[i + 5] & 0xFF) << 8) | (b[i + 6] & 0xFF);
                int width = ((b[i + 7] & 0xFF) << 8) | (b[i + 8] & 0xFF);
                return dimensions("image/jpeg", width, height, orientation);
            }
            i += 2 + segmentLength;
        }
        return Optional.empty();
    }

    /**
     * The EXIF Orientation of a JPEG body (1–8), or 1 when the bytes are
     * not a JPEG or carry no readable tag. {@code MediaDerivatives} uses
     * this to rotate the decoded raster into the VISUAL orientation
     * before rendering — the same tag the dimension reader uses, so the
     * stored dimensions and the rendered thumbnails can never disagree
     * about which side is the width.
     */
    public static int exifOrientationOf(byte[] bytes) {
        if (bytes == null || bytes.length < 12 || !isJpeg(bytes)) {
            return 1;
        }
        int i = 2;
        while (i + 4 <= bytes.length) {
            if ((bytes[i] & 0xFF) != 0xFF) {
                i++;
                continue;
            }
            int marker = bytes[i + 1] & 0xFF;
            if (marker == 0xFF) {
                i++;
                continue;
            }
            if (marker == 0xD9 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                i += 2;
                continue;
            }
            int segmentLength = ((bytes[i + 2] & 0xFF) << 8) | (bytes[i + 3] & 0xFF);
            if (segmentLength < 2) {
                return 1; // malformed segment — stop, answer normal
            }
            if (marker == 0xE1) {
                int orientation = exifOrientationIn(bytes, i + 4, segmentLength - 2);
                if (orientation != 1) {
                    return orientation;
                }
            }
            i += 2 + segmentLength;
        }
        return 1;
    }

    /**
     * The Orientation tag of the APP1 whose payload starts at
     * {@code payload} (length {@code payloadLength}), or 1 when the
     * payload is not an EXIF header, the tag is absent, or anything is
     * malformed. Every read is bounds-checked — a truncated or hostile
     * header answers 1, never an exception. Handles both TIFF byte
     * orders ("II" little-endian as phone cameras emit, "MM" not).
     */
    private static int exifOrientationIn(byte[] b, int payload, int payloadLength) {
        // "Exif\0\0" (6) + TIFF header: byte order (2) + magic (2) + IFD offset (4)
        if (payloadLength < 14 || payload + 14 > b.length) {
            return 1;
        }
        if (b[payload] != 'E' || b[payload + 1] != 'x' || b[payload + 2] != 'i'
                || b[payload + 3] != 'f' || b[payload + 4] != 0 || b[payload + 5] != 0) {
            return 1; // an APP1 that is not EXIF (XMP et al.)
        }
        int tiff = payload + 6;
        int littleEndian;
        if (b[tiff] == 'I' && b[tiff + 1] == 'I') {
            littleEndian = 1;
        } else if (b[tiff] == 'M' && b[tiff + 1] == 'M') {
            littleEndian = 0;
        } else {
            return 1; // not a TIFF header
        }
        if (u16(b, tiff + 2, littleEndian) != 42) {
            return 1; // the TIFF magic — a guard against a coincidental prefix
        }
        int ifdOffset = u32(b, tiff + 4, littleEndian);
        // The signed-int cast can wrap: bound against the REMAINING bytes
        // (never tiff + offset, which overflows) — a hostile offset
        // answers normal, never an exception.
        if (ifdOffset < 8 || ifdOffset > b.length - tiff) {
            return 1; // the IFD cannot start inside the 8-byte TIFF header
        }
        int ifd = tiff + ifdOffset;
        int entries = u16(b, ifd, littleEndian);
        if (entries < 1) {
            return 1;
        }
        for (int k = 0; k < entries; k++) {
            int e = ifd + 2 + 12 * k;
            if (e + 12 > b.length) {
                break; // truncated IFD — stop, answer normal
            }
            if (u16(b, e, littleEndian) == 0x0112) { // the Orientation tag
                if (u16(b, e + 2, littleEndian) != 3) {
                    return 1; // not a SHORT — refuse rather than guess
                }
                // A SHORT with count 1 is left-justified in the 4-byte
                // value field, in the file's byte order.
                int value = u16(b, e + 8, littleEndian);
                return (value >= 1 && value <= 8) ? value : 1;
            }
        }
        return 1; // no Orientation tag in IFD0
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
        int width = ((b[25] & 0xFC) >> 2) | ((b[26] & 0xFF) << 6);
        int height = ((b[27] & 0xFC) >> 2) | ((b[28] & 0xFF) << 6);
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

    /**
     * The readable dimensions as the VISUAL dimensions: orientations 5–8
     * (the 90°/270° family) swap which sensor side is the width — the
     * same swap the browsers apply when they render the original.
     */
    private static Optional<ImageInfo> dimensions(String contentType, int width, int height, int orientation) {
        int w = width, h = height;
        if (orientation >= 5 && orientation <= 8) {
            w = height;
            h = width;
        }
        return (w > 0 && h > 0)
                ? Optional.of(new ImageInfo(contentType, w, h, orientation))
                : Optional.empty();
    }

    /** The no-orientation form (PNG, WebP, a JPEG without an EXIF tag). */
    private static Optional<ImageInfo> dimensions(String contentType, int width, int height) {
        return dimensions(contentType, width, height, 1);
    }

    /** Big-endian unsigned 32-bit read (PNG fields). */
    private static int unsignedInt(byte[] b, int offset) {
        return ((b[offset] & 0xFF) << 24) | ((b[offset + 1] & 0xFF) << 16)
                | ((b[offset + 2] & 0xFF) << 8) | (b[offset + 3] & 0xFF);
    }

    /** An unsigned 16-bit read in the TIFF header's byte order. */
    private static int u16(byte[] b, int offset, int littleEndian) {
        int a = b[offset] & 0xFF;
        int c = b[offset + 1] & 0xFF;
        return littleEndian == 1 ? a | (c << 8) : (a << 8) | c;
    }

    /** An unsigned 32-bit read in the TIFF header's byte order. */
    private static int u32(byte[] b, int offset, int littleEndian) {
        if (littleEndian == 1) {
            return (b[offset] & 0xFF) | ((b[offset + 1] & 0xFF) << 8)
                    | ((b[offset + 2] & 0xFF) << 16) | ((b[offset + 3] & 0xFF) << 24);
        }
        return ((b[offset] & 0xFF) << 24) | ((b[offset + 1] & 0xFF) << 16)
                | ((b[offset + 2] & 0xFF) << 8) | (b[offset + 3] & 0xFF);
    }
}
