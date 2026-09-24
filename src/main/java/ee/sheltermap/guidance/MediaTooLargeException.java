package ee.sheltermap.guidance;

/**
 * The uploaded file exceeds the configured size cap
 * ({@code app.media.max-bytes}, default 5 MiB).
 * The message names the cap, per the spec. Mapped to 413 by
 * {@link ee.sheltermap.api.ApiErrorHandler}.
 */
public class MediaTooLargeException extends RuntimeException {

    public static final String DEFAULT_MESSAGE =
            "The uploaded file exceeds the maximum size of 5 MiB (5242880 bytes)";

    public MediaTooLargeException() {
        super(DEFAULT_MESSAGE);
    }

    public MediaTooLargeException(long maxBytes) {
        super("The uploaded file exceeds the maximum size of " + maxBytes + " bytes");
    }
}
