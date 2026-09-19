package ee.sheltermap.api;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.domain.PublicGuidanceView;
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
 * present, only the posts that have a published translation of that language
 * answer (the detail SERVES the default-locale translation with
 * {@code localeFallback: true} when the post has no translation in the
 * requested locale — a 200, never a 404, so a language switch never dead-ends);
 * when absent, the configured default locale applies, so existing links keep
 * working. Blank or over-long values are a 400 (the column is VARCHAR(5)). The
 * detail carries an {@code alternates} map (locale -> slug) the frontend
 * language switcher follows. The ADMIN surface is locale-blind — the
 * administrator manages every language.
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
        List<PublicGuidanceView> published = guidance.listPublic(locale);
        // ONE library read for the hero URLs (no N+1 over the list).
        Map<Long, MediaAsset> heroes = heroIndex();
        return published.stream()
                .map(view -> toDto(view, heroes))
                .toList();
    }

    /**
     * The public detail (D4 + bilingual-guidance): PUBLISHED only, by slug
     * (never by id). A slug held by a draft answers the same 404 as an unknown
     * slug. When the post has no translation in the requested locale, the
     * default-locale translation is served with {@code localeFallback: true}
     * (a 200, never a 404 — a language switch must not dead-end); a 404 is
     * reserved for an unknown slug, a draft slug, and a post that has neither a
     * requested-locale nor a default-locale translation. The response carries an
     * {@code alternates} map (locale -> slug) for the language switcher. 400 on
     * a blank or over-long {@code locale}.
     */
    @GetMapping("/{slug}")
    @Operation(summary = "The public guidance detail",
            description = "PUBLISHED only, by slug. Serves the requested locale's "
                    + "translation, or the default-locale translation with "
                    + "localeFallback=true when the post has none in the requested "
                    + "locale (a 200, never a 404). Carries the stored (sanitized) "
                    + "bodyHtml and an alternates map (locale -> slug) for the "
                    + "language switcher.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published post — "
                    + "the requested locale's translation, or the default-locale one "
                    + "(localeFallback=true) when the post lacks the requested locale",
                    content = @Content(schema = @Schema(implementation = GuidancePostDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown slug, a draft "
                    + "slug, or a post with neither a requested-locale nor a "
                    + "default-locale translation"),
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
        PublicGuidanceView view = guidance.getByPublicSlug(slug, locale);
        MediaAsset hero = null;
        if (view.getHeroImageId() != null) {
            hero = mediaAssets.findById(view.getHeroImageId()).orElse(null);
        }
        return toDto(view, hero == null ? Map.of() : Map.of(view.getHeroImageId(), hero));
    }

    private Map<Long, MediaAsset> heroIndex() {
        Map<Long, MediaAsset> heroes = new HashMap<>();
        for (MediaAsset asset : mediaAssets.findAll()) {
            heroes.put(asset.getId(), asset);
        }
        return heroes;
    }

    private GuidancePostDto toDto(PublicGuidanceView view, Map<Long, MediaAsset> heroes) {
        MediaAsset hero = view.getHeroImageId() == null ? null : heroes.get(view.getHeroImageId());
        return new GuidancePostDto(
                view.getSlug(),
                view.getTitle(),
                view.getBodyHtml(),
                hero == null ? null : MediaService.MEDIA_URL_PREFIX + hero.getStoredFilename(),
                hero == null ? null : view.getHeroImageAlt(),
                view.isPinned(),
                view.getLocale(),
                view.getPublishedAt(),
                view.getUpdatedAt(),
                view.getAlternates(),
                view.isLocaleFallback());
    }
}
