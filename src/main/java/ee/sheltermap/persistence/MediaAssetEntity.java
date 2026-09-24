package ee.sheltermap.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/**
 * JPA entity for {@code media_assets} (V23, crisis-guidance). The
 * unique stored filename ({@code uq_media_assets_filename}), the
 * content-type allowlist and the positive dimension/size bounds are
 * enforced by the database; every mapped column exists in V23 with the
 * same shape (ddl-auto=validate stays green).
 */
@Entity
@Table(name = "media_assets")
public class MediaAssetEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Server-generated (32 hex + sniffed extension) — the public serving URL name. */
    @Column(name = "filename", nullable = false, length = 40)
    private String filename;

    /** Display metadata only; never part of a path. */
    @Column(name = "original_filename", length = 255)
    private String originalFilename;

    /** The sniffed type: image/jpeg | image/png | image/webp (the V23 CHECK). */
    @Column(name = "content_type", nullable = false, length = 20)
    private String contentType;

    @Column(nullable = false)
    private int width;

    @Column(nullable = false)
    private int height;

    @Column(name = "size_bytes", nullable = false)
    private long sizeBytes;

    /** The uploading account; dangles after an erasure (FK ON DELETE SET NULL). */
    @Column(name = "uploaded_by")
    private Long uploadedBy;

    /** The remote origin of an imported asset (V25); null for a plain upload. */
    @Column(name = "source_url", length = 2048)
    private String sourceUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getFilename() {
        return filename;
    }

    public void setFilename(String filename) {
        this.filename = filename;
    }

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getContentType() {
        return contentType;
    }

    public void setContentType(String contentType) {
        this.contentType = contentType;
    }

    public int getWidth() {
        return width;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public int getHeight() {
        return height;
    }

    public void setHeight(int height) {
        this.height = height;
    }

    public long getSizeBytes() {
        return sizeBytes;
    }

    public void setSizeBytes(long sizeBytes) {
        this.sizeBytes = sizeBytes;
    }

    public Long getUploadedBy() {
        return uploadedBy;
    }

    public void setUploadedBy(Long uploadedBy) {
        this.uploadedBy = uploadedBy;
    }

    public String getSourceUrl() {
        return sourceUrl;
    }

    public void setSourceUrl(String sourceUrl) {
        this.sourceUrl = sourceUrl;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
