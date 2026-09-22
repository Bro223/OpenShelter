package ee.sheltermap.api;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

/**
 * The admin media-library API (crisis-guidance D3/D7/D8) — thin shell:
 * parse, authorize, delegate to {@link MediaService}.
 *
 * <p>Authorization is the shared fresh per-request ADMIN kind lookup
 * ({@link AdminAccess#requireAdmin()}, D2): anonymous → 401 (the security
 * entry point answers first), authenticated non-admin → 403. The
 * multipart upload field is {@code file}; the declared part
 * type the browser sends is validated against the SNIFFED type in the
 * service (a lying client gets a plain 400).
 */
@Tag(name = "Admin media",
        description = "Every operation requires a valid Bearer JWT AND an "
                + "ADMIN-kind account, checked by a fresh per-request DB lookup — "
                + "the JWT's userId is loaded and its kind checked, never a role "
                + "claim in the token (a JWT minted before a demotion/deletion "
                + "keeps failing). Anonymous → 401; authenticated non-admin → "
                + "403 (the x-admin-only extension marks these operations "
                + "machine-readably).")
@RestController
@RequestMapping(value = "/admin/media", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminMediaController {

    private final MediaService media;
    private final AdminAccess adminAccess;

    public AdminMediaController(MediaService media, AdminAccess adminAccess) {
        this.media = media;
        this.adminAccess = adminAccess;
    }

    /**
     * The library listing (D8): every asset newest-first, each with its
     * serving URL, dimensions, size, upload date and reused-by count
     * (0 for an unused asset — it is listed like any other).
     *
     * <p>Paging (W2-A — the owner's "every admin list pages" rule):
     * optional {@code limit} (1..200; absent = no paging) / {@code offset}
     * (>= 0) page the newest-first order in SQL, and the
     * {@code X-Total-Count} response header is the library's asset count
     * WITHOUT paging (always present).
     */
    @GetMapping
    @Operation(summary = "The media library listing",
            description = "Every asset newest-first, with serving URL, dimensions, "
                    + "size, upload date and the reused-by-post count (0 for an "
                    + "unused asset — the library is the admin's inventory). "
                    + "Optional limit (1..200; absent = no paging) / offset (>= 0) "
                    + "page the newest-first order; the X-Total-Count response "
                    + "header is the library's asset count WITHOUT paging (always "
                    + "present).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The assets (newest "
                    + "first)", headers = {
                    @Header(name = "X-Total-Count",
                            description = "The library's asset count WITHOUT the "
                                    + "paging applied (always present).",
                            schema = @Schema(type = "integer", format = "int32"))
            }, content = @Content(array = @ArraySchema(schema =
                    @Schema(implementation = MediaAssetDto.class)))),
            @ApiResponse(responseCode = "400", description = "A limit outside 1..200, "
                    + "or a negative offset"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public ResponseEntity<List<MediaAssetDto>> list(
            @Parameter(description = "Optional page size: 1..200; absent = no "
                    + "paging (the whole library).")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the newest-first "
                    + "order: >= 0; past the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read (the shared paging rule).
        Pagination.requireLimit(limit);
        Pagination.requireOffset(offset);
        Pagination.Paged<MediaService.MediaAssetWithUsage> paged = media.listPage(limit, offset);
        List<MediaAssetDto> dtos = paged.rows().stream().map(AdminMediaController::toDto).toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(paged.total()))
                .body(dtos);
    }

    /**
     * Multipart upload (D7): the fixed validation order (byte count vs
     * cap → 413; magic bytes + dimensions → 400; declared type vs sniffed
     * type → 400) lives in the service — a refused upload writes no file
     * and no row. 201 with the stored asset; the generated name is in
     * the response (the client's filename is display metadata only).
     */
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Operation(summary = "Upload an image into the library",
            description = "Multipart (field: file). 201 with the stored asset "
                    + "(generated name — the client's filename is display metadata "
                    + "only); 400 not a readable JPEG/PNG/WebP, or the declared "
                    + "type contradicts the bytes; 413 over the size cap (the "
                    + "message names the cap, no partial file left behind).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "The stored asset",
                    content = @Content(schema = @Schema(implementation = MediaAssetDto.class))),
            @ApiResponse(responseCode = "400", description = "Unsupported image "
                    + "(wrong magic bytes, SVG, unreadable dimensions) or a declared "
                    + "content type that contradicts the bytes"),
            @ApiResponse(responseCode = "413", description = "Over the size cap "
                    + "(the message names the cap)"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public ResponseEntity<MediaAssetDto> upload(
            @Parameter(description = "The image part (field name: file).")
            @RequestParam("file") MultipartFile file) {
        byte[] bytes;
        try {
            // The ACTUAL bytes received — the service caps on bytes.length
            // (never Content-Length).
            bytes = file.getBytes();
        } catch (IOException e) {
            throw new IllegalStateException("Could not read the uploaded file", e);
        }
        MediaAsset uploaded = media.upload(adminAccess.requireAdmin(), bytes,
                file.getContentType(), file.getOriginalFilename());
        // A freshly uploaded asset cannot be referenced by a post yet.
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(toDto(new MediaService.MediaAssetWithUsage(uploaded, 0L)));
    }

    /**
     * Delete an asset (D8): unreferenced → 200 (the pre-delete snapshot),
     * row and file gone; referenced without {@code confirm=true} → 409
     * naming the affected posts (the admin UI turns the answer into the
     * confirm dialog); referenced with {@code confirm=true} → 200 and
     * every referencing post loses both the hero id and the alt in the
     * same transaction (the post still renders, with no image).
     */
    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a media asset",
            description = "Unreferenced: 200, row and file gone. Referenced "
                    + "without confirm=true: 409 naming the affected posts "
                    + "(nothing deleted, no audit row). Referenced with "
                    + "confirm=true: 200 — every referencing post loses BOTH "
                    + "hero_image_id and hero_image_alt in the same "
                    + "transaction and renders without an image. 404 unknown "
                    + "id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Deleted — the "
                    + "pre-delete asset snapshot", content = @Content(schema =
                    @Schema(implementation = MediaAssetDto.class))),
            @ApiResponse(responseCode = "409", description = "Still referenced, "
                    + "confirm=true missing — the message names the affected posts"),
            @ApiResponse(responseCode = "404", description = "Unknown asset id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public MediaAssetDto delete(@PathVariable long id,
                                @Parameter(description = "Required when the asset is "
                                        + "still referenced by posts.")
                                @RequestParam(required = false, defaultValue = "false") boolean confirm) {
        return toDto(media.delete(adminAccess.requireAdmin(), id, confirm));
    }

    private static MediaAssetDto toDto(MediaService.MediaAssetWithUsage row) {
        MediaAsset asset = row.asset();
        return new MediaAssetDto(
                asset.getId() == null ? 0 : asset.getId(),
                MediaService.MEDIA_URL_PREFIX + asset.getStoredFilename(),
                asset.getStoredFilename(),
                asset.getOriginalFilename(),
                asset.getContentType(),
                asset.getWidth(),
                asset.getHeight(),
                asset.getSizeBytes(),
                asset.getCreatedAt(),
                row.reusedBy(),
                asset.getSourceUrl());
    }
}
