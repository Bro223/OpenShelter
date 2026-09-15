package ee.sheltermap.domain;

import java.time.Instant;
import java.util.Objects;

/**
 * One media-library asset (crisis-guidance D7): an uploaded image stored
 * under a server-generated, non-guessable {@code storedFilename} (32 hex
 * + the extension implied by the sniffed type) in the configured upload
 * directory.
 *
 * <p>Immutable once stored — no mutator, no update path: the library
 * grows until an admin deletes an asset, and a post's hero reference
 * ({@code guidance_posts.hero_image_id}) is a pointer to this row, never
 * a copy. {@code originalFilename} is display metadata only and never
 * part of a path. {@code uploadedBy} may dangle after an account
 * erasure (the FK's {@code ON DELETE SET NULL} — the library row
 * outlives the account).
 *
 * <p>Pure Java — no Spring imports in {@code domain/} (a repo invariant).
 */
public class MediaAsset {

    private Long id;
    private final String storedFilename;
    private final String originalFilename;
    private final String contentType;
    private final int width;
    private final int height;
    private final long sizeBytes;
    private final Long uploadedBy;
    private final Instant createdAt;

    private MediaAsset() {
    }

    /**
     * The ONLY constructor: the caller — the upload service (stamped
     * from its injected Clock) or the persistence layer (a restored
     * row) — owns the creation instant, so the domain never reaches for
     * the wall clock (the {@code PasswordResetToken.markUsed(Instant)}
     * idiom).
     */
    public static MediaAsset create(String storedFilename, String originalFilename,
                                    String contentType, int width, int height, long sizeBytes,
                                    Long uploadedBy, Instant now) {
        if (width <= 0 || height <= 0) {
            throw new IllegalArgumentException("width and height must be > 0");
        }
        if (sizeBytes <= 0) {
            throw new IllegalArgumentException("sizeBytes must be > 0");
        }
        MediaAsset asset = new MediaAsset();
        asset.storedFilename = Objects.requireNonNull(storedFilename, "storedFilename");
        asset.originalFilename = originalFilename;
        asset.contentType = Objects.requireNonNull(contentType, "contentType");
        asset.width = width;
        asset.height = height;
        asset.sizeBytes = sizeBytes;
        asset.uploadedBy = uploadedBy;
        asset.createdAt = Objects.requireNonNull(now, "now");
        return asset;
    }

    public Long getId() {
        return id;
    }

    /** Assigned by persistence; {@code null} until persisted. */
    public void setId(Long id) {
        this.id = id;
    }

    /** The server-generated stored name (32 hex + extension) — the public URL name. */
    public String getStoredFilename() {
        return storedFilename;
    }

    /** Display metadata only; never part of a path. */
    public String getOriginalFilename() {
        return originalFilename;
    }

    /** The sniffed type ({@code image/jpeg} | {@code image/png} | {@code image/webp}). */
    public String getContentType() {
        return contentType;
    }

    public int getWidth() {
        return width;
    }

    public int getHeight() {
        return height;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    /** The uploading account; may dangle after an erasure (FK SET NULL). */
    public Long getUploadedBy() {
        return uploadedBy;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
