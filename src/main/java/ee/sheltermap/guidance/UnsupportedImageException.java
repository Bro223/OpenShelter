package ee.sheltermap.guidance;

/**
 * The upload is not a readable image (crisis-guidance D7): the magic
 * bytes are not JPEG/PNG/WebP, the sniffed type contradicts the
 * declared part {@code Content-Type}, or the pixel dimensions cannot be
 * read from the header (SVG in particular fails the magic-byte step —
 * its content is XML text). Mapped to 400 by
 * {@link ee.sheltermap.api.ApiErrorHandler}.
 */
public class UnsupportedImageException extends RuntimeException {

    public static final String MESSAGE =
            "The uploaded file is not a readable JPEG, PNG or WebP image";

    public UnsupportedImageException() {
        super(MESSAGE);
    }

    public UnsupportedImageException(String message) {
        super(message);
    }
}
