package ee.sheltermap.api;

import ee.sheltermap.app.AdminAccessException;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.guidance.MediaAssetRepository;
import ee.sheltermap.guidance.MediaService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * The admin guidance authoring API (crisis-guidance D3) — thin shell:
 * parse, validate, authorize, delegate to {@link GuidanceService}.
 *
 * <p>Authorization (D2 idiom, copied from {@link AdminController}): a
 * FRESH user lookup per request — the JWT's userId is loaded and its kind
 * checked, never a role claim in the token. A JWT minted before a
 * demotion/deletion keeps failing the instant the kind changes. Anonymous
 * callers never reach the guard: {@code /admin/**} requires a valid
 * access token (default security rule) and the entry point answers 401
 * first; the guard's own 401 branch is the same fallback convention.
 *
 * <p>Surface: the list (every post, drafts included, in the stored
 * manual order — the live preview of the public order), the id-keyed
 * detail (the admin form edits by id), create (DRAFT by default — an
 * explicit status publishes in one call; the new post appends at the END
 * of the manual order), full replace (slug kept when omitted), the
 * idempotent publish/unpublish (no-op → 204, NO audit row; never move a
 * post's stored order), the atomic full-list reorder
 * ({@code PUT /admin/guidance/order} → 204; 400 unknown / duplicate /
 * stale), and the hard delete that requires {@code confirm=true} (400
 * without it).
 */
@Tag(name = "Admin guidance",
        description = "Every operation requires a valid Bearer JWT AND an "
                + "ADMIN-kind account, checked by a fresh per-request DB lookup — "
                + "the JWT's userId is loaded and its kind checked, never a role "
                + "claim in the token (a JWT minted before a demotion/deletion "
                + "keeps failing). Anonymous → 401; authenticated non-admin → "
                + "403 (the x-admin-only extension marks these operations "
                + "machine-readably).")
@RestController
@RequestMapping("/admin/guidance")
public class AdminGuidanceController {

    private final GuidanceService guidance;
    private final MediaAssetRepository mediaAssets;
    private final UserRepository userRepository;

    public AdminGuidanceController(GuidanceService guidance,
                                   MediaAssetRepository mediaAssets,
                                   UserRepository userRepository) {
        this.guidance = guidance;
        this.mediaAssets = mediaAssets;
        this.userRepository = userRepository;
    }

    /**
     * The admin guidance list (D3): every post, drafts included,
     * newest-updated first (id descending tie-break).
     */
    @GetMapping
    @Operation(summary = "The admin guidance list",
            description = "Every post, drafts included, newest-updated first. "
                    + "The stored (sanitized) bodyHtml is returned — the editor "
                    + "round-trips what is stored.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "All posts (drafts "
                    + "included, newest-updated first)", content = @Content(array =
                    @ArraySchema(schema = @Schema(implementation = AdminGuidancePostDto.class)))),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public List<AdminGuidancePostDto> list() {
        requireAdmin();
        List<GuidancePost> all = guidance.listForAdmin();
        Map<Long, MediaAsset> heroes = heroIndex(all);
        return all.stream()
                .map(post -> toAdminDto(post, heroes))
                .toList();
    }

    /** The id-keyed admin detail (the admin form edits by id). 404 unknown. */
    @GetMapping("/{id}")
    @Operation(summary = "The admin guidance detail",
            description = "Id-keyed (a draft has a slug, but the admin form edits "
                    + "by id). 404 unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The post", content =
                    @Content(schema = @Schema(implementation = AdminGuidancePostDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public AdminGuidancePostDto get(@PathVariable long id) {
        requireAdmin();
        GuidancePost post = guidance.getById(id);
        Map<Long, MediaAsset> heroes = post.getHeroImageId() == null
                ? Map.of()
                : Map.of(post.getHeroImageId(),
                        mediaAssets.findById(post.getHeroImageId()).orElse(null));
        return toAdminDto(post, heroes);
    }

    /**
     * Create a post (D4): DRAFT by default; an explicit PUBLISHED in the
     * body makes it a one-shot "write and publish". 200 with the created
     * post; 400 validation; 409 an admin-supplied slug collision naming
     * the slug; 404 a heroImageId with no such asset. A pending hero
     * import URL (guidance-hero-import) is stored with the draft and
     * consumed at publish — in the one-shot PUBLISHED create it is
     * imported first, and a failed import fails the whole create (400
     * policy/non-image, 413 over cap, 502 unfetchable).
     */
    @PostMapping
    @Operation(summary = "Create a guidance post",
            description = "DRAFT by default; an explicit status PUBLISHED "
                    + "publishes in one call. The slug is generated from the title "
                    + "when omitted; an explicit slug is used exactly as given "
                    + "(collision → 409 naming the slug). 200 with the created "
                    + "post; 400 validation (title/body required, alt mandatory iff "
                    + "a hero is set); 409 slug collision; 404 unknown heroImageId.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The created post",
                    content = @Content(schema = @Schema(implementation = AdminGuidancePostDto.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure "
                    + "(required fields, the alt/hero pairing, the slug shape, the import URL shape)"),
            @ApiResponse(responseCode = "409", description = "An admin-supplied slug "
                    + "another post already holds (naming the slug)"),
            @ApiResponse(responseCode = "404", description = "heroImageId with no such asset"),
            @ApiResponse(responseCode = "413", description = "The one-shot hero import "
                    + "exceeded the size cap"),
            @ApiResponse(responseCode = "502", description = "The one-shot hero import "
                    + "could not be fetched (timeout / network / upstream 5xx)"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public AdminGuidancePostDto create(@Valid @RequestBody CreateGuidancePostRequest request) {
        long adminId = requireAdmin();
        GuidancePost post = guidance.create(adminId, request.title(), request.slug(),
                request.body(), request.locale(), request.pinned(), request.heroImageId(),
                request.heroImageAlt(), request.heroImportUrl(),
                request.status() == null ? GuidanceStatus.DRAFT : request.status());
        return toAdminDto(post, heroIndexFor(post));
    }

    /**
     * Full replace of the editable fields (D3): the slug is kept when
     * omitted; the body is re-sanitized (D2); the publication state is
     * NOT editable here (publish/unpublish own it). 200 with the updated
     * post; 400/404/409 the same vocabulary as create.
     */
    @PutMapping("/{id}")
    @Operation(summary = "Full replace of a guidance post",
            description = "Full replace of the editable fields; the slug is kept "
                    + "when omitted (a given slug that another post holds → 409 "
                    + "naming it). The body is re-sanitized — the stored value is "
                    + "the sanitizer output. 200 with the updated post; 404 "
                    + "unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The updated post",
                    content = @Content(schema = @Schema(implementation = AdminGuidancePostDto.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure (incl. a "
                    + "pending import URL on a published post)"),
            @ApiResponse(responseCode = "409", description = "Slug collision (naming the slug)"),
            @ApiResponse(responseCode = "404", description = "Unknown post id (or "
                    + "heroImageId with no such asset)"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public AdminGuidancePostDto update(@PathVariable long id,
                                       @Valid @RequestBody UpdateGuidancePostRequest request) {
        requireAdmin();
        GuidancePost post = guidance.update(id, request.title(), request.slug(),
                request.body(), request.locale(), request.pinned(), request.heroImageId(),
                request.heroImageAlt(), request.heroImportUrl());
        return toAdminDto(post, heroIndexFor(post));
    }

    /**
     * Publish (D4): stamps publishedAt from the server clock. Idempotent
     * — an already-published post is a 204 no-op that writes NO audit
     * row and keeps its earlier stamp. A pending hero import (the
     * post's {@code heroImportUrl}) is consumed here: the server fetches,
     * validates and stores the image inside this call, and a failed
     * import fails the publish (400 policy/non-image, 413 over cap,
     * 502 unfetchable) leaving the post a DRAFT. 204; 404 unknown id.
     *
     * <p>The literal {@code order} segment outranks the {@code /{id}}
     * template in Spring's mapping — there is no ambiguity with the
     * update route (guidance-manual-order D3).
     */
    @PutMapping("/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Reorder the guidance posts",
            description = "The FULL ordered list of post ids (drafts and published "
                    + "alike) — a strict permutation of every current post. A valid "
                    + "reorder renumbers every post's stored order to 1..N in ONE "
                    + "transaction (all-or-nothing) and answers 204; resubmitting the "
                    + "current order is a no-op that writes no audit row, a changing "
                    + "reorder writes one GUIDANCE_REORDER row. 400 an unknown id, a "
                    + "duplicate id, or a stale list missing a concurrently created "
                    + "post (nothing changed); 404 never — 403 non-admin.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Renumbered 1..N (or the "
                    + "same order resubmitted — no-op)"),
            @ApiResponse(responseCode = "400", description = "An unknown id, a "
                    + "duplicate id, a missing (stale) list, or an empty list while "
                    + "posts exist — nothing changed"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void reorder(@Valid @RequestBody ReorderGuidanceRequest request) {
        guidance.reorder(requireAdmin(), request.postIds());
    }

    /**
     * Publish (D4): stamps publishedAt from the server clock. Idempotent
     * — an already-published post is a 204 no-op that writes NO audit
     * row and keeps its earlier stamp. A pending hero import (the
     * post's {@code heroImportUrl}) is consumed here: the server fetches,
     * validates and stores the image inside this call, and a failed
     * import fails the publish (400 policy/non-image, 413 over cap,
     * 502 unfetchable) leaving the post a DRAFT. 204; 404 unknown id.
     */
    @PostMapping("/{id}/publish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Publish a guidance post",
            description = "Stamps publishedAt (a re-publish stamps a FRESH "
                    + "instant). A pending hero import URL is fetched, validated "
                    + "and stored first — a failed import fails the publish. "
                    + "Idempotent: already published (and no pending import) → 204 "
                    + "no-op, NO audit row. 204; 400/413/502 import failure; "
                    + "404 unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Published (or already "
                    + "published — no-op)"),
            @ApiResponse(responseCode = "400", description = "The pending hero import "
                    + "was refused (URL policy, non-image body) or the URL is broken"),
            @ApiResponse(responseCode = "413", description = "The pending hero import "
                    + "exceeded the size cap"),
            @ApiResponse(responseCode = "502", description = "The pending hero import "
                    + "could not be fetched (timeout / network / upstream 5xx)"),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void publish(@PathVariable long id) {
        guidance.publish(requireAdmin(), id);
    }

    /**
     * Unpublish (D4): back to DRAFT, publishedAt cleared. Idempotent — a
     * draft is a 204 no-op that writes NO audit row. 204; 404 unknown id.
     */
    @PostMapping("/{id}/unpublish")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Unpublish a guidance post",
            description = "Back to DRAFT, publishedAt cleared (the public "
                    + "surface no longer exposes it). Idempotent: already a "
                    + "draft → 204 no-op, NO audit row. 204; 404 unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Unpublished (or "
                    + "already a draft — no-op)"),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void unpublish(@PathVariable long id) {
        guidance.unpublish(requireAdmin(), id);
    }

    /**
     * Hard delete (D4): {@code confirm=true} required (400 without it —
     * the admin UI shows a confirm dialog). The post's media assets stay
     * in the library, and its audit rows keep their label snapshot (D12).
     * 204; 404 unknown id.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Hard delete of a guidance post",
            description = "Requires confirm=true (400 without it). The post's "
                    + "media assets stay in the library (uploads are inventory, "
                    + "not garbage) and its audit rows keep their label "
                    + "snapshot. 204; 404 unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "400", description = "confirm=true missing"),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void delete(@Parameter(description = "Required: confirm=true.")
                       @PathVariable long id,
                       @Parameter(description = "Required: confirm=true.")
                       @RequestParam(required = false, defaultValue = "false") boolean confirm) {
        guidance.delete(requireAdmin(), id, confirm);
    }

    // ------------------------------------------------- translations (bilingual-guidance)

    /**
     * The post's translations, in locale order (the admin alternates editor).
     * The post's own-locale row is always present. 200; 404 unknown id.
     */
    @GetMapping("/{id}/translations")
    @Operation(summary = "The post's translations",
            description = "Every translation of the post, in locale order — the "
                    + "source of the public detail's alternates map. The post's "
                    + "own-locale row is always present.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The translations",
                    content = @Content(array = @ArraySchema(
                            schema = @Schema(implementation = GuidanceTranslationDto.class)))),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public List<GuidanceTranslationDto> listTranslations(@PathVariable long id) {
        requireAdmin();
        return guidance.listTranslations(id).stream().map(this::toTranslationDto).toList();
    }

    /**
     * Creates a translation of the post in a NEW locale. 200 with the created
     * translation; 400 validation (title/body required, locale required, the
     * slug shape); 409 the post already has a translation in that locale or the
     * (locale, slug) pair is taken; 404 unknown id.
     */
    @PostMapping("/{id}/translations")
    @Operation(summary = "Create a translation of a post",
            description = "Creates a translation in a new locale. The slug is generated "
                    + "from the title when omitted; a given slug must be free within the "
                    + "locale (409). 200 with the created translation; 400 validation; "
                    + "409 conflict; 404 unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The created translation",
                    content = @Content(schema = @Schema(implementation = GuidanceTranslationDto.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure"),
            @ApiResponse(responseCode = "409", description = "The post already has a "
                    + "translation in this locale, or the (locale, slug) pair is taken"),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public GuidanceTranslationDto createTranslation(@PathVariable long id,
                                                    @Valid @RequestBody CreateGuidanceTranslationRequest request) {
        requireAdmin();
        GuidanceTranslation t = guidance.createTranslation(id, request.locale(), request.slug(),
                request.title(), request.body(), request.heroImageAlt());
        return toTranslationDto(t);
    }

    /**
     * Full replace of a translation's content (the locale is the PATH key — it
     * never moves). 200 with the updated translation; 400 validation; 409 a slug
     * collision within the locale; 404 unknown post or locale.
     */
    @PutMapping("/{id}/translations/{locale}")
    @Operation(summary = "Replace a translation of a post",
            description = "Full replace of the translation named by the path locale; the "
                    + "slug is kept when omitted (a given slug another translation in the "
                    + "locale holds → 409). 200 with the updated translation; 400 "
                    + "validation; 404 unknown post or locale.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The updated translation",
                    content = @Content(schema = @Schema(implementation = GuidanceTranslationDto.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure"),
            @ApiResponse(responseCode = "409", description = "Slug collision within the locale"),
            @ApiResponse(responseCode = "404", description = "Unknown post or locale"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public GuidanceTranslationDto updateTranslation(@PathVariable long id, @PathVariable String locale,
                                                    @Valid @RequestBody UpdateGuidanceTranslationRequest request) {
        requireAdmin();
        GuidanceTranslation t = guidance.updateTranslation(id, locale, request.slug(),
                request.title(), request.body(), request.heroImageAlt());
        return toTranslationDto(t);
    }

    /**
     * Deletes a post's translation in a locale. The post's HOME-locale
     * translation cannot be deleted (400 — unpublish or delete the post
     * instead). 204; 404 unknown post or locale.
     */
    @DeleteMapping("/{id}/translations/{locale}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a translation of a post",
            description = "Deletes the translation named by the path locale. The post's "
                    + "own-locale translation cannot be deleted (400). 204; 404 unknown "
                    + "post or locale.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Deleted"),
            @ApiResponse(responseCode = "400", description = "Deleting the home-locale translation"),
            @ApiResponse(responseCode = "404", description = "Unknown post or locale"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void deleteTranslation(@PathVariable long id, @PathVariable String locale) {
        requireAdmin();
        guidance.deleteTranslation(id, locale);
    }

    /**
     * Attaches an EXISTING post as a translation of this one — the operator's
     * pairing convenience: the source post's home-locale translation row is
     * re-parented onto the target (a MOVE, not a copy). 200 with the moved
     * translation; 400 source == target; 409 the target already has a
     * translation in the source's locale; 404 unknown id.
     */
    @PostMapping("/{id}/translations/attach")
    @Operation(summary = "Attach an existing post as a translation",
            description = "Re-parents the source post's home-locale translation onto this "
                    + "post (a move, not a copy) — how the operator pairs two existing "
                    + "posts. 200 with the moved translation; 400 source == target; 409 "
                    + "the target already has a translation in the source's locale; 404 "
                    + "unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The moved translation",
                    content = @Content(schema = @Schema(implementation = GuidanceTranslationDto.class))),
            @ApiResponse(responseCode = "400", description = "source and target are the same post"),
            @ApiResponse(responseCode = "409", description = "The target already has a "
                    + "translation in the source's locale"),
            @ApiResponse(responseCode = "404", description = "Unknown post id"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public GuidanceTranslationDto attachTranslation(@PathVariable long id,
                                                    @Valid @RequestBody AttachGuidanceTranslationRequest request) {
        requireAdmin();
        GuidanceTranslation t = guidance.attachExistingPostAsTranslation(id, request.sourcePostId());
        return toTranslationDto(t);
    }

    // ------------------------------------------------------------- mapping

    private Map<Long, MediaAsset> heroIndex(List<GuidancePost> posts) {
        Map<Long, MediaAsset> heroes = new HashMap<>();
        for (MediaAsset asset : mediaAssets.findAll()) {
            heroes.put(asset.getId(), asset);
        }
        return heroes;
    }

    private Map<Long, MediaAsset> heroIndexFor(GuidancePost post) {
        if (post.getHeroImageId() == null) {
            return Map.of();
        }
        return mediaAssets.findById(post.getHeroImageId())
                .<Map<Long, MediaAsset>>map(asset -> Map.of(post.getHeroImageId(), asset))
                .orElse(Map.of());
    }

    private AdminGuidancePostDto toAdminDto(GuidancePost post, Map<Long, MediaAsset> heroes) {
        MediaAsset hero = post.getHeroImageId() == null ? null : heroes.get(post.getHeroImageId());
        return new AdminGuidancePostDto(
                post.getId() == null ? 0 : post.getId(),
                post.getSlug(),
                post.getTitle(),
                post.getBodyHtml(),
                post.getLocale(),
                post.getStatus(),
                post.isPinned(),
                post.getHeroImageId(),
                hero == null ? null : MediaService.MEDIA_URL_PREFIX + hero.getStoredFilename(),
                post.getHeroImageAlt(),
                post.getHeroImportUrl(),
                post.getCreatedBy(),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    private GuidanceTranslationDto toTranslationDto(GuidanceTranslation t) {
        return new GuidanceTranslationDto(
                t.getId() == null ? 0 : t.getId(),
                t.getPostId(),
                t.getLocale(),
                t.getSlug(),
                t.getTitle(),
                t.getBodyHtml(),
                t.getHeroImageAlt(),
                t.getCreatedAt(),
                t.getUpdatedAt());
    }

    /**
     * D2: fresh lookup per request — the kind column is the truth, never a
     * JWT claim. 401 (same fallback convention as the other controllers;
     * the security entry point answers this for anonymous requests first)
     * or 403 for an authenticated non-admin. Returns the moderator's user
     * id — every guidance WRITE is recorded in the moderation audit trail
     * under it (crisis-guidance D12).
     */
    private long requireAdmin() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InvalidAccessTokenException("Authentication required");
        }
        if (!userRepository.isAdmin(userId)) {
            throw new AdminAccessException("Admin access required");
        }
        return userId;
    }
}
