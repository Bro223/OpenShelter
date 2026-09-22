package ee.sheltermap.api;

import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.domain.PublicGuidanceView;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.guidance.MediaAssetRepository;
import ee.sheltermap.guidance.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.headers.Header;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

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
@RequestMapping(value = "/api/guidance", produces = MediaType.APPLICATION_JSON_VALUE)
public class GuidanceController {

    private final GuidanceService guidance;
    private final MediaAssetRepository mediaAssets;
    /** The derivative-srcset builder (P2-9) — the disk-truth read of the hero's widths. */
    private final MediaService media;

    public GuidanceController(GuidanceService guidance, MediaAssetRepository mediaAssets,
                              MediaService media) {
        this.guidance = guidance;
        this.mediaAssets = mediaAssets;
        this.media = media;
    }

    /**
     * The public index (D6): PUBLISHED only, ONE locale, pinned first,
     * then {@code sortOrder} ascending (the stored manual order), then
     * {@code publishedAt} descending and id descending as the stable
     * tie-breakers. 200 with {@code []} when nothing is published in that
     * locale; 400 on a blank or over-long {@code locale}.
     *
     * <p>Paging (guidance-index-paging): the optional {@code limit} (1..200)
     * / {@code offset} (>= 0) slice the STABLE index order — the slice runs
     * last, over the ordered list, so consecutive pages tile the index
     * without overlap or skips (the shelter list's offset/limit
     * vocabulary). The {@code X-Total-Count} response header carries the
     * UN-PAGED length of the locale's index — always present, so a paged
     * client knows the page count and can tell "beyond the end" from
     * "nothing published". Omitting both parameters answers exactly what
     * the endpoint answered before (the same order and body; the header
     * is additive). A limit outside 1..200 or a negative offset is a 400
     * (the shelter list's paging vocabulary); an offset past the end is an
     * empty page, never an error.
     */
    @GetMapping
    @Operation(summary = "The public guidance index",
            description = "PUBLISHED only (drafts are invisible), ONE locale, "
                    + "pinned first, then sortOrder ascending (the stored manual "
                    + "order), then publishedAt descending (id descending tie-"
                    + "break). The index does not carry the post body "
                    + "(bodyHtml is null). 200 with [] when nothing is published "
                    + "in the requested locale. Optional limit (1..200) and "
                    + "offset (>= 0) page the stable index order; the "
                    + "X-Total-Count response header is the un-paged index "
                    + "length (always present).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The published posts "
                    + "of the requested locale (pinned first), paged when limit/"
                    + "offset are given", headers = {
                    @Header(name = "X-Total-Count",
                            description = "The number of published posts in the "
                                    + "requested locale WITHOUT the paging applied.",
                            schema = @Schema(type = "integer", format = "int32"))
            }, content = @Content(array = @ArraySchema(
                    schema = @Schema(implementation = GuidancePostDto.class)))),
            @ApiResponse(responseCode = "400", description = "A blank or over-long "
                    + "locale (the column is VARCHAR(5)), a limit outside 1..200, "
                    + "or a negative offset",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @SecurityRequirements({})
    public ResponseEntity<List<GuidancePostDto>> list(
            @Parameter(description = "The reader's language (optional): only the "
                    + "published posts of this locale are returned. Absent = the "
                    + "server's default locale. Blank or more than 5 characters "
                    + "is a 400.")
            @RequestParam(name = "locale", required = false) String locale,
            @Parameter(description = "Optional page size: 1..200; absent = no "
                    + "paging (the whole index).")
            @RequestParam(name = "limit", required = false) Integer limit,
            @Parameter(description = "Optional offset into the stable index "
                    + "order: >= 0; past the end answers an empty array.")
            @RequestParam(name = "offset", required = false) Integer offset) {
        // The bounds are checked BEFORE the read: a rejected page never
        // pays for the (locale's) index load.
        Pagination.requireLimit(limit);
        Pagination.requireOffset(offset);
        List<PublicGuidanceView> published = guidance.listPublic(locale);
        int total = published.size();
        // The slice runs LAST, over the stable order (guidance-index-paging).
        List<PublicGuidanceView> page = Pagination.slice(published, offset, limit);
        // ONE batched read for the page's hero URLs (W2-A: the pre-change
        // hero index loaded the WHOLE media library for every request).
        Map<Long, MediaAsset> heroes = heroIndex(page);
        List<GuidancePostDto> dtos = page.stream()
                .map(view -> toDto(view, heroes))
                .toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .body(dtos);
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

    /**
     * The hero assets of the GIVEN views in ONE batched query (W2-A):
     * the distinct hero ids of the page, not the whole library — an
     * empty page (nothing published, or an offset past the end) touches
     * the media table at all only when a view actually references a hero.
     */
    private Map<Long, MediaAsset> heroIndex(List<PublicGuidanceView> views) {
        List<Long> heroIds = views.stream()
                .map(PublicGuidanceView::getHeroImageId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        if (heroIds.isEmpty()) {
            return Map.of();
        }
        return mediaAssets.findByIds(heroIds).stream()
                .collect(HashMap::new, (map, asset) -> map.put(asset.getId(), asset), HashMap::putAll);
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
                view.isLocaleFallback(),
                hero == null ? null : media.derivativeSrcset(hero));
    }
}
