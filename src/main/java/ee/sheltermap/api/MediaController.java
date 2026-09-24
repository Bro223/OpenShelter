package ee.sheltermap.api;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.GuidanceNotFoundException;
import ee.sheltermap.guidance.MediaAssetRepository;
import ee.sheltermap.guidance.MediaStorage;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.nio.file.Files;
import java.nio.file.Path;
import java.io.IOException;
import java.time.Duration;
import java.util.regex.Pattern;

/**
 * Serving of stored hero images (crisis-guidance) — permit-all: the
 * public guidance pages show them to anonymous visitors.
 *
 * <p>The stored name is matched against the generated shape
 * ({@code ^[a-f0-9]{32}\.(jpg|png|webp)$}) FIRST — the regex alone already
 * forbids traversal (no path separators, no upper case, no other
 * extensions) — and then resolved under the upload directory with the
 * storage layer's parent-equality check (the belt to the regex's braces).
 * The {@code Content-Type} comes from the STORED type (never re-derived
 * from the extension or the request), and the response is safe to cache
 * immutably — generated names are never reused, so a cached entry can
 * never be stale. EVERYTHING unknown answers 404 without revealing
 * whether a file exists elsewhere on disk.
 *
 * <p>derivatives: a derivative name
 * ({@code ^[a-f0-9]{32}-t\d+\.(jpg|png|webp)$}) is the SECOND shape —
 * the {@code -t<width>} marker is digits only (the traversal-forbidding
 * of the base shape is inherited), the base name (the 32-hex stem + the
 * extension) is looked up as the asset row, and the derivative file is
 * resolved under the same parent-equality gate. A derivative is served
 * with the ORIGINAL's stored content type (the derivative keeps the
 * original's extension — the same format) and its own on-disk size. A
 * derivative name with no base row, or a base row whose derivative file
 * is missing, answers the SAME uniform 404 as everything else — an
 * asset without derivatives (a WebP original, a pre-feature upload)
 * simply has no derivative URLs, and the slots render its original via
 * plain {@code src} (the srcset is built from what exists on disk).
 * The public URL shape of EXISTING assets is unchanged: the base regex
 * is untouched and a base name still answers exactly as before.
 *
 * <p>The path sits under {@code /api/} on purpose: the frontend dev
 * proxy already proxies {@code /api}, so the public pages and the admin
 * thumbnails load in dev with no proxy change.
 */
@Tag(name = "Public media",
        description = "Serving of stored hero images — permit-all (the public "
                + "guidance pages show them to anonymous visitors). Only generated "
                + "names (32 hex + .jpg/.png/.webp) resolve; the Content-Type comes "
                + "from the stored type and the response is immutable-cacheable "
                + "(generated names are never reused). Everything unknown is a 404.")
@RestController
@RequestMapping("/api/media")
public class MediaController {

    /** the generated name shape — the first gate of the public serving path. */
    private static final Pattern STORED_FILENAME = Pattern.compile("^[a-f0-9]{32}\\.(jpg|png|webp)$");

    /** the derivative name shape (the base shape + the digit-only {@code -t<width>} marker). */
    private static final Pattern DERIVATIVE_FILENAME = Pattern.compile("^[a-f0-9]{32}-t\\d+\\.(jpg|png|webp)$");

    /** Generated names are never reused → an immutable year. */
    private static final Duration IMMUTABLE_CACHE = Duration.ofSeconds(31_536_000);

    private final MediaStorage storage;
    private final MediaAssetRepository mediaAssets;

    public MediaController(MediaStorage storage, MediaAssetRepository mediaAssets) {
        this.storage = storage;
        this.mediaAssets = mediaAssets;
    }

    /**
     * Serves one stored image (the original OR a derivative). 404
     * for: a name outside the generated shapes (traversal, absolute
     * paths, encoded variants — all fail the regexes or the path
     * variable), a name with no asset row (a derivative name with no
     * BASE row), and a row whose file is missing (a derivative name
     * whose derivative file is missing — the asset renders its original
     * then, its srcset is built from what exists).
     */
    @GetMapping("/{filename}")
    @Operation(summary = "Serve a stored image",
            description = "404 for anything outside the generated name shapes, with "
                    + "no asset row, or with a missing file. A derivative name "
                    + "(`<32hex>-t<width>.<ext>`) is served with the BASE asset's "
                    + "stored Content-Type (the derivative keeps the original's "
                    + "format) and its own on-disk size. Content-Type from the "
                    + "STORED type; Cache-Control: public, max-age=31536000, "
                    + "immutable (generated names are never reused).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The image bytes"),
            @ApiResponse(responseCode = "404", description = "Unknown name — the "
                    + "uniform error body (traversal and absolute paths answer this "
                    + "too; nothing outside the upload directory is ever read)")
    })
    @SecurityRequirements({})
    public ResponseEntity<FileSystemResource> serve(@PathVariable String filename) {
        if (STORED_FILENAME.matcher(filename).matches()) {
            MediaAsset asset = mediaAssets.findByStoredFilename(filename)
                    .orElseThrow(() -> new GuidanceNotFoundException("Not found"));
            Path path = storage.resolve(filename)
                    .orElseThrow(() -> new GuidanceNotFoundException("Not found"));
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(asset.getContentType()))
                    .cacheControl(CacheControl.maxAge(IMMUTABLE_CACHE).cachePublic().immutable())
                    .contentLength(asset.getSizeBytes())
                    .body(new FileSystemResource(path));
        }
        // the derivative shape — the base row is looked up by the
        // BASE name (the derivative has no row of its own), the file by
        // its own name; a missing base row or a missing file is the same
        // uniform 404 (nothing outside the upload directory is ever read).
        if (DERIVATIVE_FILENAME.matcher(filename).matches()) {
            String baseName = filename.substring(0, filename.indexOf('-'))
                    + filename.substring(filename.lastIndexOf('.'));
            MediaAsset asset = mediaAssets.findByStoredFilename(baseName)
                    .orElseThrow(() -> new GuidanceNotFoundException("Not found"));
            Path path = storage.resolve(filename)
                    .orElseThrow(() -> new GuidanceNotFoundException("Not found"));
            if (!Files.isRegularFile(path)) {
                throw new GuidanceNotFoundException("Not found");
            }
            long size;
            try {
                size = Files.size(path);
            } catch (IOException e) {
                throw new GuidanceNotFoundException("Not found");
            }
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(asset.getContentType()))
                    .cacheControl(CacheControl.maxAge(IMMUTABLE_CACHE).cachePublic().immutable())
                    .contentLength(size)
                    .body(new FileSystemResource(path));
        }
        throw new GuidanceNotFoundException("Not found");
    }
}
