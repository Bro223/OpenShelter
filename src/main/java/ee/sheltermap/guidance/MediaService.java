package ee.sheltermap.guidance;

import ee.sheltermap.api.Pagination;
import ee.sheltermap.app.ModerationAuditLog;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;

/**
 * The media library surface (crisis-guidance D7/D8/D13).
 *
 * <p>Upload (D7): the validation ORDER is fixed — the actual byte count of
 * what was received (never {@code Content-Length}) against the cap (413),
 * then the magic bytes / header dimensions (the inspector answers
 * empty for anything that is not a readable JPEG/PNG/WebP — 400), then
 * the sniffed type must equal the multipart part's declared type (400).
 * The file is stored under a SERVER-GENERATED name (32 hex + the sniffed
 * extension) — the client's filename is display metadata only and never
 * part of a path. An upload that fails any step writes no file and no row.
 *
 * <p>Listing (D8): every asset newest-first (the repository order) with
 * the reused-by count from ONE batched query (no N+1) — assets no post
 * references are listed like any other (the library is the admin's
 * inventory, uploads are independent of post references).
 *
 * <p>Delete (D8): unreferenced → the row and the file are removed; still
 * referenced without {@code confirm} → 409 naming the affected posts (and
 * nothing is deleted, no audit row); with {@code confirm} → the asset and
 * the file are removed and, in the SAME transaction, every referencing
 * post loses BOTH {@code hero_image_id} and {@code hero_image_alt} — the
 * post then renders with no image element, and no post is deleted,
 * unpublished or otherwise altered. A completed delete writes its
 * MEDIA_DELETE audit row in the same transaction (D12); a refused one
 * writes nothing.
 *
 * <p>Derivatives (P2-9): after a successful upload (and, in
 * {@code HeroImageImportService}, after a successful import) the
 * thumbnail derivatives are rendered and stored beside the original —
 * BEST EFFORT here: the original is authoritative, so a derivative that
 * cannot be rendered, that fails the content gate or that cannot be
 * written is skipped, never failing the upload (the slot then renders
 * the original — the srcset is built from what EXISTS on disk, see
 * {@link #derivativeSrcset}). Deletion removes the whole set
 * ({@code MediaStorage.deleteWithDerivatives}).
 */
@Service
public class MediaService {

    /** The uniform 404 for an unknown asset id (the same vehicle as the guidance 404s). */
    public static final String ASSET_NOT_FOUND_MESSAGE = "Media asset not found";

    /** The serving-URL prefix (D7: under /api/ so the frontend proxy covers it). */
    public static final String MEDIA_URL_PREFIX = "/api/media/";

    /** The extension implied by the SNIFFED type — the stored name's suffix (D7). */
    private static final Map<String, String> EXTENSION_BY_TYPE = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    private final MediaAssetRepository mediaAssets;
    private final GuidancePostRepository posts;
    private final MediaStorage storage;
    private final ModerationAuditLog audit;
    private final Clock clock;
    /** The upload size cap (D13: {@code app.media.max-bytes}, default 5 MiB). */
    private final long maxBytes;
    /**
     * The P2-9 decode guard: an original with a side above this is stored
     * WITHOUT derivatives (the decode is never attempted — the unbounded
     * header cannot drive an unbounded bitmap). Mirrors the import path's
     * guard 7 ({@code app.media.import-max-side}).
     */
    private final int derivativeMaxSide;

    @Autowired
    public MediaService(MediaAssetRepository mediaAssets,
                        GuidancePostRepository posts,
                        MediaStorage storage,
                        ModerationAuditLog audit,
                        Clock clock,
                        @Value("${app.media.max-bytes:5242880}") long maxBytes,
                        @Value("${app.media.derivative-max-side:10000}") int derivativeMaxSide) {
        this.mediaAssets = Objects.requireNonNull(mediaAssets, "mediaAssets");
        this.posts = Objects.requireNonNull(posts, "posts");
        this.storage = Objects.requireNonNull(storage, "storage");
        this.audit = Objects.requireNonNull(audit, "audit");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.maxBytes = maxBytes;
        this.derivativeMaxSide = derivativeMaxSide;
    }

    /** The pre-P2-9 form: the decode guard at its default (10000 px). */
    public MediaService(MediaAssetRepository mediaAssets,
                        GuidancePostRepository posts,
                        MediaStorage storage,
                        ModerationAuditLog audit,
                        Clock clock,
                        long maxBytes) {
        this(mediaAssets, posts, storage, audit, clock, maxBytes, 10_000);
    }

    /** One library listing row: the asset plus how many posts use it as hero. */
    public record MediaAssetWithUsage(MediaAsset asset, long reusedBy) {
    }

    // ------------------------------------------------------------- reads

    /**
     * The library listing (D8): every asset newest-first (createdAt
     * descending, id descending — the repository order), each with its
     * reused-by count from ONE batched query. An unused asset carries 0 —
     * it is listed like any other.
     */
    @Transactional(readOnly = true)
    public List<MediaAssetWithUsage> list() {
        Map<Long, Long> counts = mediaAssets.referencedCountsByAssetId();
        return mediaAssets.findAll().stream()
                .map(asset -> new MediaAssetWithUsage(asset, counts.getOrDefault(asset.getId(), 0L)))
                .toList();
    }

    /**
     * The library listing paged (W2-A — the owner's "every admin list
     * pages" rule): absent {@code limit}/{@code offset} = the unpaged
     * listing (byte-identical to the pre-change path); present, ONE
     * newest-first OFFSET/LIMIT page. The reused-by counts are batched
     * over the page's ids only. The answer's {@link Pagination.Paged#total()}
     * is the library's asset count WITHOUT paging (the X-Total-Count
     * header value, the controller's job to publish).
     */
    @Transactional(readOnly = true)
    public Pagination.Paged<MediaAssetWithUsage> listPage(Integer limit, Integer offset) {
        if (limit == null && offset == null) {
            List<MediaAssetWithUsage> all = list();
            return new Pagination.Paged<>(all, all.size());
        }
        long from = offset == null ? 0 : offset;
        List<MediaAsset> page = mediaAssets.findPage(from, limit == null ? (int) mediaAssets.countAll() : limit);
        if (page.isEmpty()) {
            return new Pagination.Paged<>(List.of(), mediaAssets.countAll());
        }
        Map<Long, Long> counts = mediaAssets.referencedCountsByAssetId();
        List<MediaAssetWithUsage> rows = page.stream()
                .map(asset -> new MediaAssetWithUsage(asset, counts.getOrDefault(asset.getId(), 0L)))
                .toList();
        return new Pagination.Paged<>(rows, mediaAssets.countAll());
    }

    /** The admin detail read (unknown id → 404). */
    @Transactional(readOnly = true)
    public MediaAssetWithUsage getById(long id) {
        MediaAsset asset = requireAsset(id);
        long count = mediaAssets.referencedCountsByAssetId().getOrDefault(asset.getId(), 0L);
        return new MediaAssetWithUsage(asset, count);
    }

    /**
     * The {@code srcset} for an asset's thumbnail slots (P2-9): one
     * {@code w} descriptor per derivative that EXISTS on disk (the
     * filesystem is the truth — the row knows nothing about them), in
     * ascending width order, or {@code null} when the asset has none
     * (a WebP original, a pre-feature upload, a skipped decode) — the
     * slot then renders the original via plain {@code src}.
     */
    public String derivativeSrcset(MediaAsset asset) {
        List<Integer> widths = storage.derivativeWidthsPresent(asset.getStoredFilename());
        if (widths.isEmpty()) {
            return null;
        }
        StringBuilder srcset = new StringBuilder();
        for (int width : widths) {
            if (srcset.length() > 0) {
                srcset.append(", ");
            }
            srcset.append(MEDIA_URL_PREFIX)
                    .append(MediaDerivatives.derivativeName(asset.getStoredFilename(), width))
                    .append(' ')
                    .append(width)
                    .append("w");
        }
        return srcset.toString();
    }

    // ------------------------------------------------------------- writes

    /**
     * Upload an image into the library (D7), in the fixed validation
     * order: byte count vs cap (413) → magic bytes + readable dimensions
     * (400) → sniffed type equals the declared part type (400). The file
     * is stored under a generated name BEFORE the row is written, but
     * only after every validation step passed, so a refused upload leaves
     * no partial file and no asset row. If a failure happens AFTER the
     * file is already on disk (the row insert), the just-written file is
     * removed before the failure propagates — a failed upload never
     * leaves an orphan file.
     *
     * @throws MediaTooLargeException      413 — the received bytes exceed the cap
     * @throws UnsupportedImageException   400 — not a readable JPEG/PNG/WebP (SVG
     *                                     included), or the declared type contradicts
     *                                     the bytes
     */
    @Transactional
    public MediaAsset upload(long adminId, byte[] bytes, String declaredContentType,
                             String originalFilename) {
        // D7 step 1: the ACTUAL byte count (never Content-Length) — the
        // cap failure is the one 413, and it fires before anything else
        // (no file written, no row stored, the inspector never runs).
        if (bytes.length > maxBytes) {
            throw new MediaTooLargeException(maxBytes);
        }
        // D7 step 2+4: magic bytes AND readable header dimensions — the
        // inspector answers empty for any other content (text named .jpg,
        // an SVG, a truncated header).
        MediaImageInspector.ImageInfo info = MediaImageInspector.inspect(bytes)
                .orElseThrow(() -> new UnsupportedImageException(
                        "Unsupported image: only readable JPEG, PNG and WebP uploads are accepted"));
        // D7 step 3: the sniffed type must equal the declared part type —
        // a PNG declared as image/jpeg is a lying client, plain 400.
        String declared = baseContentType(declaredContentType);
        if (!info.contentType().equalsIgnoreCase(declared)) {
            throw new UnsupportedImageException("Declared content type '" + declared
                    + "' does not match the image content (" + info.contentType() + ")");
        }
        String extension = EXTENSION_BY_TYPE.get(info.contentType().toLowerCase(Locale.ROOT));
        if (extension == null) {
            // Defensive: the inspector only answers with the three types,
            // but a drifted implementation must not mint an extensionless
            // public name.
            throw new UnsupportedImageException(
                    "Unsupported image type: " + info.contentType());
        }
        // Every validation step passed — only now does the upload touch
        // disk and the library (the file first, the row second).
        MediaStorage.StoredFile stored = storage.store(bytes, extension);
        try {
            MediaAsset asset = MediaAsset.create(
                    stored.storedFilename(),
                    originalFilename == null || originalFilename.isBlank() ? null : originalFilename.trim(),
                    info.contentType(),
                    info.width(),
                    info.height(),
                    bytes.length,
                    adminId,
                    clock.instant());
            MediaAsset saved = mediaAssets.save(asset);
            // P2-9: the thumbnail derivatives beside the original —
            // best effort (the hook never propagates: the upload of the
            // validated original cannot fail because of a thumbnail).
            storeDerivativesBestEffort(stored.storedFilename(), info, bytes);
            return saved;
        } catch (RuntimeException ex) {
            // The file is already on disk but the row could not be
            // stored: remove the just-written file (and any derivative
            // written before the failure) so the failed upload leaves no
            // orphan (the row would roll back with the transaction
            // anyway).
            storage.deleteWithDerivatives(stored.storedFilename());
            throw ex;
        }
    }

    /**
     * The P2-9 upload-path derivative step — BEST EFFORT by contract
     * (never propagates): the original is authoritative, so a skipped
     * render (WebP, an unbounded decode, an undecodable body), a
     * gate failure and a failed write all only skip the width — the
     * srcset is built from what ends up on disk. Package-visible for
     * the tests (the best-effort promise is asserted on this seam).
     */
    void storeDerivativesBestEffort(String storedFilename,
                                    MediaImageInspector.ImageInfo info,
                                    byte[] bytes) {
        if (!MediaDerivatives.isRenderable(info.contentType())) {
            return; // WebP: no JDK decoder — the slots render the original
        }
        // The decode guard: an unbounded header must never drive an
        // unbounded bitmap — store the original as-is, without derivatives.
        if (info.width() > derivativeMaxSide || info.height() > derivativeMaxSide) {
            return;
        }
        List<MediaDerivatives.RenderedDerivative> rendered;
        try {
            rendered = MediaDerivatives.renderAll(
                    info.contentType(), info.width(), info.height(), bytes, true);
        } catch (RuntimeException ex) {
            return; // best effort — the original stays
        }
        for (MediaDerivatives.RenderedDerivative derivative : rendered) {
            try {
                storage.storeDerivative(storedFilename, derivative.width(), derivative.bytes());
            } catch (RuntimeException ex) {
                // Best effort: skip the width (a disk failure likely
                // skips the rest too); the original and the row stand.
            }
        }
    }

    /**
     * Delete an asset (D8): unreferenced → row + file gone (200, the
     * controller's answer); referenced without {@code confirm} → 409
     * naming the affected posts (title + slug), nothing deleted, NO audit
     * row; referenced with {@code confirm} → row + file gone and every
     * referencing post gets BOTH the hero id and the alt cleared in the
     * same transaction (the FK's ON DELETE SET NULL is the structural
     * guarantee for the id; the explicit clear reaches the alt — leaving
     * a stale alt behind would be a small lie in the data). The post is
     * otherwise untouched: it still renders, with no image element.
     *
     * @throws GuidanceNotFoundException 404 — unknown id (a no-op delete
     *                                   never touches a different asset)
     * @throws MediaAssetInUseException  409 — referenced, confirm is false
     */
    @Transactional
    public MediaAssetWithUsage delete(long adminId, long assetId, boolean confirm) {
        MediaAsset asset = requireAsset(assetId);
        List<GuidancePost> referencing = posts.findByHeroImageId(assetId);
        if (!referencing.isEmpty() && !confirm) {
            // The 409 names the affected posts so the admin UI can turn
            // the answer straight into the confirm dialog. NOTHING is
            // deleted and NO audit row is written (a refused delete
            // leaves no trace, D12).
            throw new MediaAssetInUseException(referencing.stream()
                    .map(post -> post.getTitle() + " (" + post.getSlug() + ")")
                    .toList());
        }
        // D12: the audit row joins this transaction with a label snapshot
        // (original filename + stored filename) — the trail stays readable
        // after the asset is gone (the label has no FK by design).
        String original = asset.getOriginalFilename() == null ? "" : asset.getOriginalFilename();
        audit.recordLabeled(adminId, ModerationAuditLog.Action.MEDIA_DELETE,
                "Media asset \"" + original + "\" (" + asset.getStoredFilename() + ")", null);
        for (GuidancePost post : referencing) {
            post.clearHero();
            posts.save(post);
        }
        // P2-9: the whole set goes — original AND the derivatives beside
        // it (orphan thumbnails would only ever 404 against a gone row).
        storage.deleteWithDerivatives(asset.getStoredFilename());
        mediaAssets.delete(asset);
        // The pre-delete snapshot is the controller's 200 body.
        return new MediaAssetWithUsage(asset, referencing.size());
    }

    // ------------------------------------------------------------- guards

    private MediaAsset requireAsset(long id) {
        return mediaAssets.findById(id)
                .orElseThrow(() -> new GuidanceNotFoundException(ASSET_NOT_FOUND_MESSAGE));
    }

    /** The declared part type without parameters, for the equality check (D7 step 3). */
    private static String baseContentType(String declaredContentType) {
        if (declaredContentType == null) {
            return "";
        }
        int semicolon = declaredContentType.indexOf(';');
        String base = semicolon == -1 ? declaredContentType : declaredContentType.substring(0, semicolon);
        return base.trim().toLowerCase(Locale.ROOT);
    }
}
