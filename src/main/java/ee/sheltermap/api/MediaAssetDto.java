package ee.sheltermap.api;

import java.time.Instant;

/**
 * One media-library asset (crisis-guidance D8) — the library listing row
 * behind {@code GET /admin/media}, newest-first.
 *
 * <p>{@code url} is the public serving URL ({@code /api/media/<stored
 * filename>}) — the admin thumbnails and the public pages both load it.
 * {@code originalFilename} is the client-supplied display metadata (never
 * part of a path); {@code storedFilename} is the server-generated name.
 * {@code reusedBy} is the number of guidance posts currently using the
 * asset as their hero image (0 for an unused asset — it is listed like
 * any other). {@code sourceUrl} is the origin of an IMPORTED image
 * (guidance-hero-import — the takedown trail; null for a manual upload).
 */
public record MediaAssetDto(
        long id,
        String url,
        String storedFilename,
        String originalFilename,
        String contentType,
        int width,
        int height,
        long sizeBytes,
        Instant createdAt,
        long reusedBy,
        String sourceUrl) {
}
