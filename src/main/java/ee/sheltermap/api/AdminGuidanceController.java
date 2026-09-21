package ee.sheltermap.api;

import ee.sheltermap.domain.GuidancePost;
import ee.sheltermap.domain.GuidanceStatus;
import ee.sheltermap.domain.GuidanceTranslation;
import ee.sheltermap.domain.MediaAsset;
import ee.sheltermap.guidance.GuidanceNotFoundException;
import ee.sheltermap.guidance.GuidanceService;
import ee.sheltermap.guidance.GuidanceValidationException;
import ee.sheltermap.guidance.MediaAssetRepository;
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
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
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
 * <p>Authorization is the shared fresh per-request ADMIN kind lookup
 * ({@link AdminAccess#requireAdmin()}, D2): a FRESH user lookup per
 * request — the JWT's userId is loaded and its kind checked, never a
 * role claim in the token. A JWT minted before a demotion/deletion keeps
 * failing the instant the kind changes. Anonymous callers never reach
 * the guard: {@code /admin/**} requires a valid access token (default
 * security rule) and the entry point answers 401 first; the guard's own
 * 401 branch is the same fallback convention.
 *
 * <p>Surface: the list (every post, drafts included, in the stored
 * manual order — the live preview of the public order; scoped to ONE
 * locale via {@code ?locale=} — admin-locale-scope — only the posts that
 * have content in it are returned, in the active UI language's content),
 * the id-keyed detail (the admin form edits by id; the same optional
 * {@code ?locale=} serves that locale's content), create (DRAFT by
 * default — an explicit status publishes in one call; the new post
 * appends at the END of the manual order), full replace (slug kept when
 * omitted; {@code ?locale=} writes the content to that locale's
 * translation — the post-level fields stay shared), the idempotent
 * publish/unpublish (no-op → 204, NO audit row; never move a post's
 * stored order), the atomic full-list reorder
 * ({@code PUT /admin/guidance/order} → 204; 400 unknown / duplicate /
 * stale) — unscoped it renumbers every post 1..N, scoped
 * ({@code ?locale=}) it rewrites the visible posts into their slots of
 * the GLOBAL order (the other languages' rows are untouched) — and the
 * hard delete that requires {@code confirm=true} (400 without it).
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
@RequestMapping(value = "/admin/guidance", produces = MediaType.APPLICATION_JSON_VALUE)
public class AdminGuidanceController {

    private final GuidanceService guidance;
    private final MediaAssetRepository mediaAssets;
    private final AdminAccess adminAccess;

    public AdminGuidanceController(GuidanceService guidance,
                                   MediaAssetRepository mediaAssets,
                                   AdminAccess adminAccess) {
        this.guidance = guidance;
        this.mediaAssets = mediaAssets;
        this.adminAccess = adminAccess;
    }

    /**
     * The admin guidance list (D3): every post, drafts included, in the
     * stored manual order. With {@code ?locale=} (admin-locale-scope) only
     * the posts that HAVE content in that locale — a translation row there,
     * or the post's home locale being it — are returned, carrying that
     * locale's title/slug/body/alt (the DTO's {@code locale} names it, and
     * {@code homeLocale} the post's own): a post that exists in another
     * language only does not appear — that is the filter, not an error.
     * An empty scope is an empty list. A PRESENT but blank or over-long
     * locale is a 400 (the uniform vocabulary).
     */
    @GetMapping
    @Operation(summary = "The admin guidance list",
            description = "Every post, drafts included, in the stored manual order. "
                    + "With ?locale= (admin-locale-scope) only the posts that have content in "
                    + "that locale are returned — a translation row there, or the post's home "
                    + "locale being it — carrying that locale's title/slug/body/alt (the DTO's "
                    + "`locale` names the content locale, `homeLocale` the post's own). The "
                    + "stored (sanitized) bodyHtml is returned — the editor round-trips what "
                    + "is stored. An empty scope is an empty list; a present but blank or "
                    + "over-long locale is 400. Optional q (case-insensitive substring over "
                    + "the list's title and tag-stripped body) and limit (1..200) / offset "
                    + "(>= 0) slice the (filtered) stored manual order; the X-Total-Count "
                    + "response header is the filter length WITHOUT paging (always present).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "All posts (unscoped) or the "
                    + "locale's posts (scoped), drafts included, in the stored manual order, "
                    + "search-filtered and paged when q/limit/offset are given", headers = {
                    @Header(name = "X-Total-Count",
                            description = "The number of posts in the (search-filtered) scope "
                                    + "WITHOUT the paging applied.",
                            schema = @Schema(type = "integer", format = "int32"))
            }, content = @Content(array =
                    @ArraySchema(schema = @Schema(implementation = AdminGuidancePostDto.class)))),
            @ApiResponse(responseCode = "400", description = "A present but blank or over-long "
                    + "locale, an over-long q, a limit outside 1..200, or a negative offset",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class))),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public ResponseEntity<List<AdminGuidancePostDto>> list(
            @Parameter(description = "Optional: the active UI language (admin-locale-scope) — "
                    + "only the posts that have content in it are returned. Absent = every "
                    + "post (the legacy locale-blind list).")
            @RequestParam(required = false) String locale,
            @Parameter(description = "Optional case-insensitive substring over the list's "
                    + "title and TAG-STRIPPED body (search what you see): scoped (?locale=) "
                    + "it matches the locale's rendered content, absent it matches ANY of "
                    + "the post's locale content. Blank/absent = no filter; over 200 "
                    + "characters is a 400.")
            @RequestParam(required = false) String q,
            @Parameter(description = "Optional page size: 1..200; absent = no paging (the "
                    + "whole filtered scope).")
            @RequestParam(required = false) Integer limit,
            @Parameter(description = "Optional offset into the (filtered) stored manual "
                    + "order: >= 0; past the end answers an empty array.")
            @RequestParam(required = false) Integer offset) {
        adminAccess.requireAdmin();
        // The bounds are checked BEFORE the read: a rejected page never
        // pays for the list load.
        Pagination.requireLimit(limit);
        Pagination.requireOffset(offset);
        String resolved = guidance.optionalAdminLocale(locale);
        String query = requireSearch(q);
        boolean scoped = resolved != null;
        List<GuidancePost> all = scoped
                ? guidance.listForAdmin(resolved)
                : guidance.listForAdmin();
        Map<Long, GuidanceTranslation> content = scoped
                ? guidance.translationsInLocale(resolved)
                : Map.of();
        // Unscoped search matches ANY locale content: every translation row,
        // keyed by post (one query, no per-post loop). Scoped search only
        // needs the locale's row (or the home columns) — already in `content`.
        Map<Long, List<GuidanceTranslation>> allTranslations = scoped
                ? Map.of()
                : guidance.translationsByPost();
        Map<Long, MediaAsset> heroes = heroIndex(all);
        // The search filter runs over the RENDERED content, in the stored
        // manual order — the order is UNCHANGED, so search and reorder
        // never fight over sorting.
        List<GuidancePost> filtered = all.stream()
                .filter(post -> matchesPost(post, content.get(post.getId()),
                        allTranslations, scoped, query))
                .toList();
        int total = filtered.size();
        // The slice runs LAST, over the (filtered) stored manual order.
        List<GuidancePost> paged = Pagination.slice(filtered, offset, limit);
        List<AdminGuidancePostDto> dtos = paged.stream()
                .map(post -> toAdminDto(post, heroes, content.get(post.getId())))
                .toList();
        return ResponseEntity.ok()
                .header("X-Total-Count", String.valueOf(total))
                .body(dtos);
    }

    /**
     * Does a post match the search term? Scoped: the list renders the
     * locale's content (the translation row, or the home columns when the
     * post's home IS the locale) — match exactly that. Unscoped: match the
     * home columns OR any translation row. A null needle is no filter.
     */
    private static boolean matchesPost(GuidancePost post, GuidanceTranslation scopedContent,
                                       Map<Long, List<GuidanceTranslation>> allTranslations,
                                       boolean scoped, String query) {
        if (query == null) {
            return true;
        }
        if (scoped) {
            String title = scopedContent != null ? scopedContent.getTitle() : post.getTitle();
            String body = scopedContent != null ? scopedContent.getBodyHtml() : post.getBodyHtml();
            return GuidanceService.matchesSearch(title, body, query);
        }
        if (GuidanceService.matchesSearch(post.getTitle(), post.getBodyHtml(), query)) {
            return true;
        }
        for (GuidanceTranslation row : allTranslations.getOrDefault(post.getId(), List.of())) {
            if (GuidanceService.matchesSearch(row.getTitle(), row.getBodyHtml(), query)) {
                return true;
            }
        }
        return false;
    }

    /** The search-term bound (admin-guidance-search): absent/blank = no
     *  filter (the public {@code q}-less behaviour — never a 400); a
     *  present-but-over-long value is a 400 (the uniform vocabulary, the
     *  locale bound's shape). */
    private static String requireSearch(String q) {
        if (q == null || q.isBlank()) {
            return null;
        }
        String trimmed = q.trim();
        if (trimmed.length() > GuidanceService.MAX_SEARCH_LENGTH) {
            throw new GuidanceValidationException("q must be at most "
                    + GuidanceService.MAX_SEARCH_LENGTH + " characters");
        }
        return trimmed;
    }

    /**
     * The id-keyed admin detail (the admin form edits by id). 404 unknown.
     * With {@code ?locale=} the DTO carries that locale's content (a
     * translation row when the post has one, the home columns when the
     * post's home IS the locale); a post without content in the locale
     * answers the same 404 as an unknown id.
     */
    @GetMapping("/{id}")
    @Operation(summary = "The admin guidance detail",
            description = "Id-keyed (a draft has a slug, but the admin form edits "
                    + "by id). 404 unknown id. With ?locale= the DTO carries that locale's "
                    + "content (a translation row when the post has one, the home columns "
                    + "when the post's home IS the locale); a post without content in the "
                    + "locale answers the same 404 as an unknown id.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The post", content =
                    @Content(schema = @Schema(implementation = AdminGuidancePostDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown post id (or no content in the requested locale)"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public AdminGuidancePostDto get(@PathVariable long id,
                                    @Parameter(description = "Optional: the active UI "
                                            + "language — the DTO carries that locale's content.")
                                    @RequestParam(required = false) String locale) {
        adminAccess.requireAdmin();
        String resolved = guidance.optionalAdminLocale(locale);
        GuidancePost post = guidance.getById(id);
        GuidanceTranslation content = null;
        if (resolved != null) {
            content = guidance.translationInLocale(id, resolved).orElse(null);
            if (content == null && !post.getLocale().equals(resolved)) {
                // No content in the requested locale — the same 404 as an
                // unknown id (never reveal which locale the post is in).
                throw new GuidanceNotFoundException(GuidanceService.POST_NOT_FOUND_MESSAGE);
            }
        }
        return toAdminDto(post, heroIndexFor(post), content);
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
        long adminId = adminAccess.requireAdmin();
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
     *
     * <p>With {@code ?locale=} (admin-locale-scope) the content fields
     * (title, slug, body, hero alt) are written to THAT locale's
     * translation row while the post-level fields (pinned, the hero
     * reference, the pending import) stay shared on the post. Editing in
     * the post's own locale is exactly the unscoped semantics (including
     * the home-locale move); a foreign-locale edit never moves the home
     * (400) and 404s when the post has no row in the locale.
     */
    @PutMapping("/{id}")
    @Operation(summary = "Full replace of a guidance post",
            description = "Full replace of the editable fields; the slug is kept "
                    + "when omitted (a given slug that another post holds → 409 "
                    + "naming it). The body is re-sanitized — the stored value is "
                    + "the sanitizer output. 200 with the updated post; 404 "
                    + "unknown id. With ?locale= the content fields are written to "
                    + "that locale's translation (the post-level fields stay shared); "
                    + "editing in the post's own locale is the unscoped semantics, a "
                    + "foreign-locale edit never moves the home locale (400) and 404s "
                    + "when the post has no translation in the locale.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The updated post",
                    content = @Content(schema = @Schema(implementation = AdminGuidancePostDto.class))),
            @ApiResponse(responseCode = "400", description = "Validation failure (incl. a "
                    + "pending import URL on a published post, a home-locale move through "
                    + "a foreign-locale edit)"),
            @ApiResponse(responseCode = "409", description = "Slug collision (naming the slug)"),
            @ApiResponse(responseCode = "404", description = "Unknown post id (or a "
                    + "heroImageId with no such asset; scoped: no translation in the locale)"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public AdminGuidancePostDto update(@PathVariable long id,
                                       @Parameter(description = "Optional: the locale "
                                               + "being edited — the content fields "
                                               + "land on its translation row.")
                                       @RequestParam(required = false) String locale,
                                       @Valid @RequestBody UpdateGuidancePostRequest request) {
        adminAccess.requireAdmin();
        String resolved = guidance.optionalAdminLocale(locale);
        GuidancePost post;
        if (resolved == null) {
            post = guidance.update(id, request.title(), request.slug(),
                    request.body(), request.locale(), request.pinned(), request.heroImageId(),
                    request.heroImageAlt(), request.heroImportUrl());
        } else {
            post = guidance.updateInLocale(id, resolved, request.title(), request.slug(),
                    request.body(), request.locale(), request.pinned(), request.heroImageId(),
                    request.heroImageAlt(), request.heroImportUrl());
        }
        GuidanceTranslation content = null;
        if (resolved != null) {
            content = guidance.translationInLocale(id, resolved).orElse(null);
        }
        return toAdminDto(post, heroIndexFor(post), content);
    }

    /**
     * Reorder (guidance-manual-order D3 + admin-locale-scope). UNSCOPED: the
     * FULL ordered list of every post id (drafts and published alike) — a
     * strict permutation of every current post — renumbered 1..N in ONE
     * transaction. SCOPED ({@code ?locale=}): the FULL ordered list of the
     * posts VISIBLE IN that locale (a subset — the filtered list cannot be
     * a permutation of every post) — the slot-preserving algorithm: the
     * visible posts are rewritten into their slots of the GLOBAL order
     * (sort_order asc, published_at desc nulls last, id desc), in the
     * submitted order; posts not visible in the locale keep their values
     * (their languages are not disturbed) and the values stop being a
     * contiguous 1..N (no unique constraint; the tie-breakers stay
     * deterministic). Both: 204; resubmitting the current order is a no-op
     * that writes no audit row, a changing reorder writes one
     * GUIDANCE_REORDER row (named with the locale when scoped); 400 an
     * unknown id, a duplicate id, or a stale list missing a current post
     * (nothing changed); 404 never — 403 non-admin.
     */
    @PutMapping("/order")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Reorder the guidance posts",
            description = "Unscoped: the FULL ordered list of post ids — a strict "
                    + "permutation of every current post — renumbered 1..N in ONE transaction "
                    + "(all-or-nothing) and answered with 204. Scoped (?locale=): the FULL "
                    + "ordered list of the posts visible in that locale — the visible posts "
                    + "are rewritten into their slots of the GLOBAL order (sort_order asc, "
                    + "published_at desc nulls last, id desc), in the submitted order; posts "
                    + "not visible in the locale keep their values (their languages are not "
                    + "disturbed), and the values stop being a contiguous 1..N (no unique "
                    + "constraint; the tie-breakers stay deterministic). Resubmitting the "
                    + "current order is a no-op that writes no audit row; a changing reorder "
                    + "writes one GUIDANCE_REORDER row (named with the locale when scoped). "
                    + "400 an unknown id, a duplicate id, or a stale list — nothing changed; "
                    + "403 non-admin.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Reordered (or the "
                    + "current order resubmitted — no-op)"),
            @ApiResponse(responseCode = "400", description = "A blank or over-long locale, "
                    + "an id not visible in the locale, a duplicate id, a missing (stale) "
                    + "list, or an empty list while visible posts exist — nothing changed"),
            @ApiResponse(responseCode = "403", description = "Authenticated non-admin")
    })
    public void reorder(@Parameter(description = "Optional: the locale of the filtered "
            + "list — the list must be exactly the posts visible in it. Absent = every "
            + "post (the legacy 1..N renumber).")
            @RequestParam(required = false) String locale,
                        @Valid @RequestBody ReorderGuidanceRequest request) {
        long adminId = adminAccess.requireAdmin();
        String resolved = guidance.optionalAdminLocale(locale);
        if (resolved == null) {
            guidance.reorder(adminId, request.postIds());
        } else {
            guidance.reorderInLocale(adminId, resolved, request.postIds());
        }
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
        guidance.publish(adminAccess.requireAdmin(), id);
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
        guidance.unpublish(adminAccess.requireAdmin(), id);
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
        guidance.delete(adminAccess.requireAdmin(), id, confirm);
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
        adminAccess.requireAdmin();
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
        adminAccess.requireAdmin();
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
        adminAccess.requireAdmin();
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
        adminAccess.requireAdmin();
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
        adminAccess.requireAdmin();
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
        return toAdminDto(post, heroes, null);
    }

    /**
     * The admin DTO with an OPTIONAL content source (admin-locale-scope):
     * the translation row the read is scoped to. When present, the content
     * fields (title/slug/body/alt) and the DTO's {@code locale} come from
     * the row (the locale being shown/edited); when absent, from the
     * post's home columns (the legacy read — the DTO's {@code locale} is
     * then the home locale, as before). {@code homeLocale} is always the
     * post's own, and {@code sortOrder} the shared stored manual position.
     */
    private AdminGuidancePostDto toAdminDto(GuidancePost post, Map<Long, MediaAsset> heroes,
                                            GuidanceTranslation content) {
        MediaAsset hero = post.getHeroImageId() == null ? null : heroes.get(post.getHeroImageId());
        String title = content != null ? content.getTitle() : post.getTitle();
        String slug = content != null ? content.getSlug() : post.getSlug();
        String bodyHtml = content != null ? content.getBodyHtml() : post.getBodyHtml();
        String heroAlt = content != null ? content.getHeroImageAlt() : post.getHeroImageAlt();
        String contentLocale = content != null ? content.getLocale() : post.getLocale();
        return new AdminGuidancePostDto(
                post.getId() == null ? 0 : post.getId(),
                slug,
                title,
                bodyHtml,
                contentLocale,
                post.getLocale(),
                post.getStatus(),
                post.isPinned(),
                post.getSortOrder(),
                post.getHeroImageId(),
                hero == null ? null : MediaService.MEDIA_URL_PREFIX + hero.getStoredFilename(),
                heroAlt,
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

}
