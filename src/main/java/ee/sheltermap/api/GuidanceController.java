package ee.sheltermap.api;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.guidance.MediaAssetRepository;
import ee.sheltermap.guidance.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The public crisis-guidance reads (crisis-guidance D3/D4) — permit-all
 * (no JWT): the public {@code /blog} pages read these anonymously.
 *
 * <p>The PUBLISHED-only filter lives in the QUERY, not in this mapping
 * layer (D4): a draft slug and an unknown slug answer the SAME 404 — the
 * response must not reveal that a draft exists. The index does not expose
 * the post body (the detail does — the stored, sanitized HTML).
 */
@Tag(name = "Public guidance",
        description = "The public crisis-guidance reads — permit-all (no JWT): "
                + "the /blog pages read these anonymously. PUBLISHED posts only, "
                + "pinned first; a draft slug and an unknown slug answer the SAME "
                + "404 (a draft's existence is never revealed).")
@RestController
@RequestMapping("/api/guidance")
public class GuidanceController {

    private final GuidanceService guidance;
    private final MediaAssetRepository mediaAssets;

    public GuidanceController(GuidanceService guidance, MediaAssetRepository mediaAssets) {
        this.guidance = guidance;
        this.mediaAssets = mediaAssets;
    }

    /**
     * The public index (D6): PUBLISHED only, pinned first, then
     * {@code publishedAt} descending, id descending as the stable
     * tie-break. 200 with {@code []} when nothing is published.
     */
    @GetMapping
    @Operation(summary = "The public guidance index",
            description = "PUBLISHED only (drafts are invisible), pinned first, "
                    + "then publishedAt descending (id descending tie-break). The "
                    + "index does not carry the post body (bodyHtml is null). 200 "
                    + "with [] when nothing is published.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published posts "
                    + "(pinned first)", content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = GuidancePostDto.class))))
    })
    @SecurityRequirements({})
    public List<GuidancePostDto> list() {
        List<GuidancePost> published = guidance.listPublic();
        // ONE library read for the hero URLs (no N+1 over the list).
        Map<Long, MediaAsset> heroes = heroIndex(published);
        return published.stream()
                .map(post -> toDto(post, heroes, false))
                .toList();
    }

    /**
     * The public detail (D4): PUBLISHED only, by slug (never by id). A
     * slug held by a draft answers the same 404 as an unknown slug.
     */
    @GetMapping("/{slug}")
    @Operation(summary = "The public guidance detail",
            description = "PUBLISHED only, by slug. A draft slug and an unknown "
                    + "slug answer the SAME 404. Carries the stored (sanitized) "
                    + "bodyHtml.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published post",
                    content = @Content(schema = @Schema(implementation = GuidancePostDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown slug (a draft "
                    + "slug is indistinguishable from one)")
    })
    @SecurityRequirements({})
    public GuidancePostDto get(@PathVariable String slug) {
        GuidancePost post = guidance.getByPublicSlug(slug);
        MediaAsset hero = null;
        if (post.getHeroImageId() != null) {
            hero = mediaAssets.findById(post.getHeroImageId()).orElse(null);
        }
        return toDto(post, hero == null ? Map.of() : Map.of(post.getHeroImageId(), hero), true);
    }

    private Map<Long, MediaAsset> heroIndex(List<GuidancePost> posts) {
        Map<Long, MediaAsset> heroes = new HashMap<>();
        for (MediaAsset asset : mediaAssets.findAll()) {
            heroes.put(asset.getId(), asset);
        }
        return heroes;
    }

    private GuidancePostDto toDto(GuidancePost post, Map<Long, MediaAsset> heroes, boolean withBody) {
        MediaAsset hero = post.getHeroImageId() == null ? null : heroes.get(post.getHeroImageId());
        return new GuidancePostDto(
                post.getSlug(),
                post.getTitle(),
                withBody ? post.getBodyHtml() : null,
                hero == null ? null : MediaService.MEDIA_URL_PREFIX + hero.getStoredFilename(),
                hero == null ? null : post.getHeroImageAlt(),
                post.isPinned(),
                post.getLocale(),
                post.getPublishedAt(),
                post.getUpdatedAt());
    }
}
