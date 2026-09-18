package ee.sheltermap.api;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.guidance.MediaAssetRepository;
import ee.sheltermap.guidance.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
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
import org.springframework.web.bind.annotation.RequestParam;
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
 *
 * <p>Both reads take an OPTIONAL {@code locale} query parameter: when
 * present, only the posts of that language answer (the detail answers
 * 404 when the post is in another language — a bilingual site must not
 * serve the other language's text at a URL); when absent, the configured
 * default locale applies, so existing links keep working. Blank or
 * over-long values are a 400 (the column is VARCHAR(5)). The ADMIN
 * surface is locale-blind — the administrator manages both languages.
 */
@Tag(name = "Public guidance",
        description = "The public crisis-guidance reads — permit-all (no JWT): "
                + "the /blog pages read these anonymously. PUBLISHED posts only, "
                + "pinned first; a draft slug and an unknown slug answer the SAME "
                + "404 (a draft's existence is never revealed). Optional locale "
                + "query parameter: absent = the server's default locale; a post "
                + "in another locale is a 404.")
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
     * The public index (D6): PUBLISHED only, ONE locale, pinned first,
     * then {@code publishedAt} descending, id descending as the stable
     * tie-break. 200 with {@code []} when nothing is published in that
     * locale; 400 on a blank or over-long {@code locale}.
     */
    @GetMapping
    @Operation(summary = "The public guidance index",
            description = "PUBLISHED only (drafts are invisible), ONE locale, "
                    + "pinned first, then publishedAt descending (id descending "
                    + "tie-break). The index does not carry the post body "
                    + "(bodyHtml is null). 200 with [] when nothing is published "
                    + "in the requested locale.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published posts "
                    + "of the requested locale (pinned first)", content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = GuidancePostDto.class)))),
            @ApiResponse(responseCode = "400", description = "A blank or over-long "
                    + "locale (the column is VARCHAR(5))")
    })
    @SecurityRequirements({})
    public List<GuidancePostDto> list(
            @Parameter(description = "The reader's language (optional): only the "
                    + "published posts of this locale are returned. Absent = the "
                    + "server's default locale. Blank or more than 5 characters "
                    + "is a 400.")
            @RequestParam(name = "locale", required = false) String locale) {
        List<GuidancePost> published = guidance.listPublic(locale);
        // ONE library read for the hero URLs (no N+1 over the list).
        Map<Long, MediaAsset> heroes = heroIndex(published);
        return published.stream()
                .map(post -> toDto(post, heroes, false))
                .toList();
    }

    /**
     * The public detail (D4): PUBLISHED only, by slug (never by id), in
     * ONE locale. A slug held by a draft answers the same 404 as an
     * unknown slug, and a slug whose published post lives in ANOTHER
     * locale answers the same 404 — a bilingual site must not serve the
     * other language's text at a URL. 400 on a blank or over-long
     * {@code locale}.
     */
    @GetMapping("/{slug}")
    @Operation(summary = "The public guidance detail",
            description = "PUBLISHED only, by slug, in ONE locale. A draft slug, "
                    + "an unknown slug, and a slug whose post is in another "
                    + "locale answer the SAME 404. Carries the stored "
                    + "(sanitized) bodyHtml.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published post "
                    + "(in the requested locale)",
                    content = @Content(schema = @Schema(implementation = GuidancePostDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown slug, a draft "
                    + "slug, or a post in another locale (all the same answer)"),
            @ApiResponse(responseCode = "400", description = "A blank or over-long "
                    + "locale (the column is VARCHAR(5))")
    })
    @SecurityRequirements({})
    public GuidancePostDto get(@PathVariable String slug,
                               @Parameter(description = "The reader's language "
                                       + "(optional): 404 when the post is in "
                                       + "another locale. Absent = the server's "
                                       + "default locale. Blank or more than 5 "
                                       + "characters is a 400.")
                               @RequestParam(name = "locale", required = false) String locale) {
        GuidancePost post = guidance.getByPublicSlug(slug, locale);
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
