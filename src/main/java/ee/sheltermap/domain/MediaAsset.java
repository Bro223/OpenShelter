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
 * part of a path. {@code sourceUrl} (guidance-hero-import) is the remote
 * origin of an imported asset ({@code null} for a plain upload) —
 * attribution and takedown metadata, never re-fetched by the app.
 * {@code uploadedBy} may dangle after an account
 * erasure (the FK's {@code ON DELETE SET NULL} — the library row
 * outlives the account).
 *
 * <p>Pure Java — no Spring imports in {@code domain/} (a repo invariant).
 */
public class MediaAsset {

    private Long id;
    private String storedFilename;
    private String originalFilename;
    private String contentType;
    private int width;
    private int height;
    private long sizeBytes;
    private Long uploadedBy;
    /** The remote origin of an imported asset; {@code null} for a plain upload. */
    private String sourceUrl;
    private Instant createdAt;

    private MediaAsset() {
    }

    /**
     * Creates a PLAIN-UPLOAD asset (the no-source form used by the upload
     * path and the persistence round-trip of a pre-import row).
     */
    public static MediaAsset create(String storedFilename, String originalFilename,
                                    String contentType, int width, int height, long sizeBytes,
                                    Long uploadedBy, Instant now) {
        return create(storedFilename, originalFilename, contentType, width, height, sizeBytes,
                uploadedBy, now, null);
    }

    /**
     * The ONLY constructor: the caller — the upload service (stamped from
     * its injected Clock), the hero-import service (with the origin URL)
     * or the persistence layer (a restored row) — owns the creation
     * instant, so the domain never reaches for the wall clock (the
     * {@code PasswordResetToken.markUsed(Instant)} idiom).
     *
     * @param sourceUrl the remote URL the asset was imported from
     *                  (guidance-hero-import); {@code null} for a plain upload
     */
    public static MediaAsset create(String storedFilename, String originalFilename,
                                    String contentType, int width, int height, long sizeBytes,
                                    Long uploadedBy, Instant now, String sourceUrl) {
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
        asset.sourceUrl = sourceUrl;
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

    /** The remote origin of an imported asset; {@code null} for a plain upload. */
    public String getSourceUrl() {
        return sourceUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
