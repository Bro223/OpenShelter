package ee.sheltermap.guidance;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;

import java.net.URI;
import java.util.Objects;

/**
 * The save-time hero decision — the hero seam extracted from
 * {@link GuidanceService}: the pairing check, the import-URL shape 400s,
 * and — given the request's hero fields and the post's current state —
 * which hero reference and import URL a save WRITES, plus the import's
 * failure.
 *
 * <p>This class is deliberately NOT a Spring bean: {@code GuidanceService}
 * (whose constructor the unit suite freezes at its seven collaborators)
 * constructs it from its own media collaborators, and the service's
 * {@code create}/{@code update}/{@code updateInLocale} methods remain the
 * {@code @Transactional} entry points — the decision runs inside their
 * transaction, while the import itself runs in its OWN transaction inside
 * {@link HeroImageImportService}, so a failure cannot roll back the save.
 *
 * <p>Hero import: a post's hero may be given as an admin-supplied http(s)
 * URL in {@code heroImportUrl} instead of a library reference. The import
 * runs when the post is SAVED, draft or published alike, not when it is
 * published: a re-save with the SAME url whose import already produced
 * the current hero is idempotent (no re-fetch); a CHANGED url re-imports.
 * A failed fetch or validation NEVER blocks the save.
 */
public class HeroSaveResolver {

    /** The pending-import URL column width ({@code hero_import_url VARCHAR(2048)}). */
    public static final int MAX_HERO_IMPORT_URL_LENGTH = 2048;

    private final MediaAssetRepository mediaAssets;
    private final HeroImageImportService heroImport;

    public HeroSaveResolver(MediaAssetRepository mediaAssets, HeroImageImportService heroImport) {
        this.mediaAssets = Objects.requireNonNull(mediaAssets, "mediaAssets");
        this.heroImport = Objects.requireNonNull(heroImport, "heroImport");
    }

    /**
     * One save's hero decision (the save-time import): the hero reference
     * and import URL to WRITE, plus the import's failure ({@code null}
     * when no import ran or it succeeded). A non-null error never blocked
     * the save — see {@link #resolveHeroOnSave}.
     */
    public record HeroResolution(Long heroImageId, String heroImportUrl, String error) {
    }

    /**
     * Alt mandatory iff a hero is set — a hero being a stored-asset
     * reference OR an import URL (both directions 400; the CHECK on the
     * post row mirrors the reference half). A hero id must name a live
     * asset (unknown id → 404).
     */
    public void requireHeroPairing(Long heroImageId, String heroImageAlt, String heroImportUrl) {
        boolean hasHero = heroImageId != null || heroImportUrl != null;
        boolean hasAlt = heroImageAlt != null && !heroImageAlt.isBlank();
        if (hasHero && !hasAlt) {
            throw new GuidanceValidationException("heroImageAlt is required when a hero image is set");
        }
        if (!hasHero && hasAlt) {
            throw new GuidanceValidationException(
                    "heroImageAlt requires a hero image (heroImageId or heroImportUrl)");
        }
        if (heroImageId != null && mediaAssets.findById(heroImageId).isEmpty()) {
            throw new GuidanceNotFoundException(MediaService.ASSET_NOT_FOUND_MESSAGE);
        }
    }

    /**
     * The post row's home alt after a foreign-locale save: a hero set on
     * a hero-less post takes the request's alt as the new home alt (the
     * home edit can refine it later); a cleared hero nulls it; otherwise
     * the home value is untouched.
     */
    public static String homeAltAfterHeroChange(String oldHomeAlt, boolean hasHero, String requestAlt) {
        if (!hasHero) {
            return null;
        }
        if (oldHomeAlt == null || oldHomeAlt.isBlank()) {
            return requestAlt;
        }
        return oldHomeAlt;
    }

    /**
     * The admin-supplied import URL, normalized (trimmed) and shape-
     * checked BEFORE it is stored (the fetch-time policy re-validates
     * everything — this is the early 400 that saves the admin a save
     * round-trip): a parseable absolute http(s) URL with a host and no
     * embedded credentials. Blank means "no import URL" (null) —
     * clearing the hero URL is a null, like clearing the hero id.
     *
     * @throws GuidanceValidationException 400 — a malformed, non-http(s),
     *                                       hostless or credentialed URL
     */
    public String normalizeImportUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String trimmed = url.trim();
        if (trimmed.length() > MAX_HERO_IMPORT_URL_LENGTH) {
            throw new GuidanceValidationException("heroImportUrl must be at most "
                    + MAX_HERO_IMPORT_URL_LENGTH + " characters");
        }
        URI uri;
        try {
            uri = URI.create(trimmed);
        } catch (IllegalArgumentException e) {
            throw new GuidanceValidationException("heroImportUrl must be a valid http(s) URL");
        }
        if (!"http".equalsIgnoreCase(uri.getScheme()) && !"https".equalsIgnoreCase(uri.getScheme())) {
            throw new GuidanceValidationException(
                    "heroImportUrl must use http or https (got '"
                            + (uri.getScheme() == null ? "<none>" : uri.getScheme()) + "')");
        }
        if (uri.getHost() == null || uri.getHost().isBlank()) {
            throw new GuidanceValidationException("heroImportUrl must name a host");
        }
        if (uri.getUserInfo() != null) {
            throw new GuidanceValidationException(
                    "heroImportUrl must not carry credentials (user:pass@)");
        }
        return trimmed;
    }

    /**
     * The save-time hero decision: the import runs when the post is
     * SAVED, draft or published alike, not when it is published —
     * <ul>
     *   <li>no URL in the request → the hero is the request's library
     *       reference (or nothing); any stored URL is cleared (a cleared
     *       hero imports nothing);</li>
     *   <li>the URL is set and the post's CURRENT hero is exactly this
     *       URL's own import → idempotent re-save: no re-fetch, no
     *       duplicate asset;</li>
     *   <li>otherwise — a new/changed URL, a retry after a failed import,
     *       or a create — {@link HeroImageImportService} fetches,
     *       validates and stores the image (in its OWN transaction, so a
     *       failure cannot roll back this save): success links the new
     *       asset (superseding the previous hero — the replaced asset
     *       stays in the library); failure keeps the URL for a retry on
     *       the next save and falls the hero back to the request's
     *       library reference, or — none given — to what the post already
     *       had. A hero is always a validated stored asset or nothing: no
     *       broken reference, no placeholder — a published post's live
     *       hero is never lost to a failed fetch, and a fresh post is
     *       simply hero-less, which renders fine.</li>
     * </ul>
     */
    public HeroResolution resolveHeroOnSave(long adminId, GuidancePost post,
                                            Long requestHeroImageId, String cleanImportUrl) {
        if (cleanImportUrl == null) {
            return new HeroResolution(requestHeroImageId, null, null);
        }
        if (post != null && isHeroImportedFrom(post, cleanImportUrl)) {
            // The current hero IS this URL's import — a re-save with the
            // same URL does not re-fetch (the admin changed no hero).
            return new HeroResolution(post.getHeroImageId(), cleanImportUrl, null);
        }
        try {
            MediaAsset imported = heroImport.importHero(adminId, cleanImportUrl);
            return new HeroResolution(imported.getId(), cleanImportUrl, null);
        } catch (HeroImportRefusedException | HeroImportUnreachableException
                 | MediaTooLargeException | UnsupportedImageException ex) {
            // A failed import NEVER blocks the save — the error is
            // returned to the write response (the admin sees it against
            // the hero field), the post is stored with the URL kept, and
            // the hero falls back as described above.
            Long fallback = requestHeroImageId;
            if (fallback == null && post != null) {
                fallback = post.getHeroImageId();
            }
            return new HeroResolution(fallback, cleanImportUrl, ex.getMessage());
        }
    }

    /**
     * Whether the post's current hero is the imported asset of exactly
     * {@code url} (the asset's recorded origin, {@code source_url}) —
     * the idempotency check that keeps a same-URL re-save from minting a
     * duplicate asset. A hero whose origin is null (a plain library pick)
     * is never "imported from" a URL.
     */
    private boolean isHeroImportedFrom(GuidancePost post, String url) {
        if (post.getHeroImageId() == null) {
            return false;
        }
        return mediaAssets.findById(post.getHeroImageId())
                .map(asset -> url.equals(asset.getSourceUrl()))
                .orElse(false);
    }
}
