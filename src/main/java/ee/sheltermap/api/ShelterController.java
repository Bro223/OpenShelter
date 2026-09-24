package ee.sheltermap.api;

import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportService;
import ee.sheltermap.app.ShelterInfoRequestLog;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.CurrentCaller;
import ee.sheltermap.domain.BoundingBox;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
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

import java.net.URI;
import java.util.List;

/**
 * Thin shell (01-TASK.md §7): parse, validate, delegate, map.
 *
 * <p>GETs are public (guests can watch — an emergency map must be viewable
 * without an account). POST requires a Bearer JWT and a {@code canWrite()}
 * user; the shelter is saved ACTIVE/USER and answered with 201 + Location.
 *
 * <p>Author-scoped mutations (user-contributions, V7 author link): the
 * submitting user can list ({@code GET /mine}), update ({@code PUT /{id}})
 * and delete ({@code DELETE /{id}}) their own USER-source shelters. 404 if
 * the shelter is absent; 403 if it exists but is not the caller's (registry
 * and legacy rows are unmanageable by anyone) — ids are public (public
 * GET), so 403-vs-404 leaks nothing.
 *
 * <p>Viewport + paging (shelter-bbox-paging, the 06-CONTEXT-API.md
 * decision-2 deferral now built): the list accepts an optional bbox
 * (minLat/minLng/maxLat/maxLng — all four together or none) and offset/
 * limit paging over the stable id-ascending order. No PostGIS and no
 * GeoService by design (a (latitude, longitude) B-tree index plus the
 * bbox predicate is enough at Estonia scale — V23.1). What STAYS deferred:
 * nearest-shelter search — it is a ranking, not a filter, and remains
 * client-side (the map ranks the loaded list; the "around you" action
 * adds no backend call by spec).
 *
 * <p>Trust layer (shelter-trust-and-reports): the public list is
 * ACTIVE-only and accepts the optional trust filters; the detail
 * read carries the caller's own occupancy band; the report/occupancy
 * POSTs require a verified registered user (same gate and error
 * vocabulary as submissions).
 */
@Tag(name = "Public shelters",
        description = "The community shelter map. The list and detail reads are "
                + "PUBLIC (guests can watch — an emergency map must be viewable without "
                + "an account); every mutation requires a Bearer JWT and a verified "
                + "registered account. Note the deliberate split: GET /mine is "
                + "authenticated even though the rest of /api/shelters/** is public.")
@RestController
@RequestMapping(value = "/api/shelters", produces = MediaType.APPLICATION_JSON_VALUE)
public class ShelterController {

    /**
     * 403 message for author-scoped shelter mutations (update/delete) —
     * duplicated here because both branches of
     * {@link #requireVerifiedRegisteredUser()} reject with it.
     */
    private static final String MODIFY_SHELTERS_MESSAGE =
            "A verified account is required to modify shelters";

    private final ShelterQueryService queryService;
    private final ShelterService shelterService;
    private final ShelterReportService reportService;
    private final UserRepository userRepository;
    private final ShelterInfoRequestLog infoRequests;
    /** The per-request authenticated-caller lookup; the field the constructor no longer needs (the ownership read moved to the service) is dropped with it. */
    private final CurrentCaller currentCaller;

    public ShelterController(ShelterQueryService queryService,
                             ShelterService shelterService,
                             ShelterReportService reportService,
                             UserRepository userRepository,
                             /** Retained for the frozen constructor signature (the detail-read test seam); the ownership read it backed moved to {@link ShelterService#requireOwnedBy} — the parameter is no longer assigned. */
                             ShelterRepository shelterRepository,
                             ShelterInfoRequestLog infoRequests) {
        this.queryService = queryService;
        this.shelterService = shelterService;
        this.reportService = reportService;
        this.userRepository = userRepository;
        this.infoRequests = infoRequests;
        this.currentCaller = new CurrentCaller(userRepository);
    }

    /**
     * The public list. {@code source} as before (ACTIVE rows only —
     * auto-hidden shelters are absent); the optional trust filters combine
     * with it in the projection:
     * {@code hasCapacity}
     * (capacity data present). (The {@code minRating} rating filter was
     * removed in V21 with the rating model — an unknown {@code minRating}
     * param is ignored for API compatibility, not an error.)
     *
     * <p>{@code provenance} (shelter-provenance-taxonomy): optional
     * taxonomy filter — keeps rows whose server-derived provenance matches
     * (OFFICIAL / PARTNER_VERIFIED / COMMUNITY_REPORTED / UNDER_REVIEW are
     * the only values reachable in the ACTIVE-only list; REPORTED_INACTIVE
     * and REJECTED filter to an empty list by construction). Absent = no
     * provenance filter; combines with every other filter. A value outside
     * the enum is a 400 (Spring enum binding, same as {@code source}).
     *
     * <p>Viewport + paging (shelter-bbox-paging): the optional
     * {@code minLat}/{@code minLng}/{@code maxLat}/{@code maxLng} box (ALL
     * four together or none; inclusive edges) restricts the SQL read, and
     * {@code limit} (1…200) / {@code offset} (≥ 0) page the stably
     * id-ordered answer — the trust filters apply BEFORE the slice, so a
     * page never contains a row they would drop. Omitting all of them
     * answers exactly what the endpoint answered before (the same SQL,
     * order and body). Bad values are 400s with the uniform error body —
     * the same vocabulary as the POST/PUT Estonia bbox check; a
     * non-numeric value stays on Spring binding's 400 (same as
     * {@code source}).
     */
    @GetMapping
    @Operation(summary = "The public shelter list",
            description = "ACTIVE rows only (auto-hidden shelters are absent). The "
                    + "optional trust filters combine: hasCapacity (capacity data "
                    + "present). The minRating rating filter was removed in V21 — an "
                    + "unknown minRating param is ignored for API compatibility, not "
                    + "an error. provenance: keeps rows whose server-derived "
                    + "provenance matches; absent = no provenance filter; a value "
                    + "outside the enum is a 400 (same as source). Viewport "
                    + "(shelter-bbox-paging): minLat/minLng/maxLat/maxLng are ALL or "
                    + "NONE, inclusive, and keep the rows inside the box; limit "
                    + "(1..200) and offset (>= 0) page the stable id-ascending answer "
                    + "— the trust filters apply before paging. Omitting all of them "
                    + "answers exactly the pre-change list.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The ACTIVE rows", content =
                    @Content(array = @ArraySchema(schema = @Schema(implementation = ShelterDto.class)))),
            @ApiResponse(responseCode = "400", description = "A bad viewport or paging "
                    + "value (partial box, non-finite/out-of-range/inverted edges, "
                    + "limit outside 1..200, negative offset) — the uniform error body.",
                    content = @Content(mediaType = "application/json",
                            schema = @Schema(implementation = ErrorResponse.class)))
    })
    @SecurityRequirements({})
    public List<ShelterDto> list(@Parameter(description = "Source filter: ALL | REGISTRY "
                    + "(PAASETEAMET + MUNICIPALITY rows) | USER (community submissions). "
                    + "Default ALL.", schema = @Schema(implementation = ShelterSourceFilter.class))
                                 @RequestParam(defaultValue = "ALL") ShelterSourceFilter source,
                                 @Parameter(description = "Only rows with capacity data "
                                         + "(optional trust filter).")
                                 @RequestParam(required = false) Boolean hasCapacity,
                                 @Parameter(description = "Only rows with this "
                                         + "server-derived provenance (optional; 400 "
                                         + "outside the enum).")
                                 @RequestParam(required = false) Provenance provenance,
                                 @Parameter(description = "Optional viewport: the inclusive "
                                         + "min latitude. ALL FOUR edges together or none — "
                                         + "a partial box is a 400.")
                                 @RequestParam(required = false) Double minLat,
                                 @Parameter(description = "Optional viewport: the inclusive "
                                         + "min longitude. ALL FOUR edges together or none — "
                                         + "a partial box is a 400.")
                                 @RequestParam(required = false) Double minLng,
                                 @Parameter(description = "Optional viewport: the inclusive "
                                         + "max latitude. ALL FOUR edges together or none — "
                                         + "a partial box is a 400.")
                                 @RequestParam(required = false) Double maxLat,
                                 @Parameter(description = "Optional viewport: the inclusive "
                                         + "max longitude. ALL FOUR edges together or none — "
                                         + "a partial box is a 400.")
                                 @RequestParam(required = false) Double maxLng,
                                 @Parameter(description = "Optional page size: 1..200; "
                                         + "absent = no paging (the whole filtered list).")
                                 @RequestParam(required = false) Integer limit,
                                 @Parameter(description = "Optional offset into the stable "
                                         + "id-ascending, filter-applied list: >= 0; past the "
                                         + "end answers an empty array.")
                                 @RequestParam(required = false) Integer offset) {
        // The argument evaluation runs the bbox + paging bounds BEFORE the
        // read: a rejected page never pays for the list load.
        return queryService.findAll(source, hasCapacity, provenance,
                requireBbox(minLat, minLng, maxLat, maxLng),
                Pagination.requireLimit(limit), Pagination.requireOffset(offset));
    }

    /**
     * The detail read — additionally carries {@code yourOccupancyBand}
     * (the caller's own live band for this shelter; null for guests,
     * anonymous callers and callers without a report). Rejected
     * (INACTIVE) rows stay readable by id exactly as any other INACTIVE
     * row — no trust rule blocks a detail read.
     * (community-review-queue v2).
     */
    @GetMapping("/{id}")
    @Operation(summary = "The shelter detail read",
            description = "Additionally carries yourOccupancyBand (the caller's own "
                    + "live band for this shelter; null for guests, anonymous callers "
                    + "and callers without a report). Rejected (INACTIVE) rows stay "
                    + "readable by id exactly as any other INACTIVE row — no trust "
                    + "rule blocks a detail read.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The shelter detail "
                    + "projection", content = @Content(schema = @Schema(implementation =
                    ShelterDto.class))),
            @ApiResponse(responseCode = "404", description = "Unknown shelter id")
    })
    @SecurityRequirements({})
    public ShelterDto get(@PathVariable long id) {
        return queryService.findById(id, currentCaller.callerIdOrNull()).orElseThrow(() -> new ShelterNotFoundException(id));
    }

    @PostMapping
    @Operation(summary = "Submit a new shelter",
            description = "Requires a Bearer JWT and a canWrite() user; the shelter "
                    + "is saved ACTIVE/USER and answered with 201 + Location. The "
                    + "backend re-checks the Estonia bounding box and the field bounds. "
                    + "The locationKind private-home declaration is optional (absent = "
                    + "PUBLIC).")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Created — the created "
                    + "ShelterDto, Location header set", content = @Content(schema =
                    @Schema(implementation = ShelterDto.class))),
            @ApiResponse(responseCode = "400", description = "Outside the Estonia bbox "
                    + "or field-bound violations"),
            @ApiResponse(responseCode = "403", description = "Not a verified "
                    + "registered account")
    })
    public ResponseEntity<ShelterDto> create(@Valid @RequestBody CreateShelterRequest request) {
        User user = currentCaller.requireUser();
        if (!user.canWrite()) {
            throw new NotVerifiedException(ShelterService.SUBMIT_SHELTERS_MESSAGE);
        }
        // User-submitted shelters get the same Estonia bounding-box
        // sanity check the registry parser applies — no ocean shelters.
        requireInsideEstonia(request.latitude(), request.longitude());
        Shelter shelter = new Shelter(
                request.name(),
                new GeoPoint(request.latitude(), request.longitude()),
                ShelterStatus.ACTIVE,
                null, // USER submissions have no external id
                ShelterSource.USER,
                null, null, null, null, null, // no registry fields on USER rows
                request.description(),
                request.capacity());
        // The private-home declaration (community-review-queue v2):
        // absent = PUBLIC.
        shelter.setLocationKind(request.locationKind() == null
                ? LocationKind.PUBLIC : request.locationKind());
        shelterService.addPlace(user, shelter);
        ShelterDto dto = queryService.findById(shelter.getId())
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
        return ResponseEntity.created(URI.create("/api/shelters/" + shelter.getId())).body(dto);
    }

    /** GET /api/shelters/mine — the caller's own shelters (Bearer JWT), all statuses. */
    @GetMapping("/mine")
    @Operation(summary = "The caller's own shelters",
            description = "Author-scoped read (Bearer JWT), ALL statuses — "
                    + "authenticated even though the rest of /api/shelters/** is "
                    + "public.")
    @ApiResponse(responseCode = "200", description = "The caller's shelters", content =
            @Content(array = @ArraySchema(schema = @Schema(implementation = ShelterDto.class))))
    public List<ShelterDto> mine() {
        return queryService.findByCreatedBy(currentCaller.requireUser().getId());
    }

    /**
     * POST /api/shelters/{id}/info-request/reply — the submitter's ONE-TIME
     * answer to the admin's information request: 204. Author
     * only — the same 404/403 vocabulary as the other author-scoped
     * mutations (PUT/DELETE); 404 when the row has no request; 409 on a
     * second answer (the row is kept after the reply — audit posture).
     */
    @PostMapping("/{id}/info-request/reply")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Reply to the admin's information request",
            description = "The submitter's ONE-TIME answer to the admin's information "
                    + "request: 204. Author only — the same 404/403 vocabulary as the "
                    + "other author-scoped mutations (PUT/DELETE); 404 when the row "
                    + "has no request; 409 on a second answer (the row is kept after "
                    + "the reply — audit posture).")
    public void replyInfoRequest(@PathVariable long id, @Valid @RequestBody InfoRequestReplyRequest request) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        shelterService.requireOwnedBy(id, user.getId());
        infoRequests.reply(id, request.message().trim(), user.getId());
    }

    /**
     * POST /api/shelters/{id}/reports — one typed report per user per
     * shelter per type (shelter-trust-and-reports). Verified users
     * only (same 403 vocabulary as submissions); 404 unknown shelter;
     * 409 duplicate (shelter, user, type); 429 report throttle. The
     * body answers the dampening outcome:
     * {@code {"damped": true|false}}.
     */
    @PostMapping("/{id}/reports")
    @Operation(summary = "Report a shelter",
            description = "One typed report per user per shelter per type. Verified "
                    + "users only (same 403 vocabulary as submissions); 404 unknown "
                    + "shelter; 409 duplicate (shelter, user, type); 429 report "
                    + "throttle. The body answers the dampening outcome: "
                    + "{\"damped\": true|false}.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The dampening outcome "
                    + "({\"damped\": true|false})", content = @Content(schema =
                    @Schema(implementation = ShelterReportResult.class))),
            @ApiResponse(responseCode = "403", description = "Not a verified "
                    + "registered account"),
            @ApiResponse(responseCode = "404", description = "Unknown shelter"),
            @ApiResponse(responseCode = "409", description = "The caller already "
                    + "reported that type for this shelter"),
            @ApiResponse(responseCode = "429", description = "Report throttle "
                    + "exceeded — Retry-After in seconds")
    })
    public ShelterReportResult report(@PathVariable long id, @Valid @RequestBody ShelterReportRequest request) {
        boolean damped = reportService.reportShelter(currentCaller.requireUser(), id, request.type(), request.detail());
        return new ShelterReportResult(damped);
    }

    /**
     * PUT /api/shelters/{id}/occupancy — the caller's live occupancy band
     * one report per user per shelter, re-sending updates it
     * (latest band wins, {@code updated_at} refreshed). Verified users
     * only; 404 unknown shelter; 429 report throttle.
     */
    @PutMapping("/{id}/occupancy")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Report the caller's live occupancy band",
            description = "One report per user per shelter, re-sending updates it "
                    + "(latest band wins, updated_at refreshed). Verified users only; "
                    + "404 unknown shelter; 429 report throttle.")
    public void reportOccupancy(@PathVariable long id, @Valid @RequestBody OccupancyReportRequest request) {
        reportService.reportOccupancy(currentCaller.requireUser(), id, request.band());
    }

    /**
     * PUT /api/shelters/{id}/open-status — the caller's live open/closed
     * state (same level as capacity): one state per user per shelter,
     * re-sending updates it (latest state wins, {@code created_at}
     * refreshed). Verified users only (403, the same REPORTING_MESSAGE
     * vocabulary as occupancy); 404 unknown shelter; a value outside the
     * OPEN/CLOSED enum is a 400 (Spring enum binding, same as
     * {@code band}). NOT throttled — a tap is a state, not a report
     * action (it consumes no action-log budget).
     */
    @PutMapping("/{id}/open-status")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Report the caller's live open/closed state",
            description = "Same level as capacity: one state per user per shelter, "
                    + "re-sending updates it (latest state wins, created_at "
                    + "refreshed). Verified users only (403, the same vocabulary as "
                    + "occupancy); 404 unknown shelter; a value outside the OPEN/CLOSED "
                    + "enum is a 400 (same as band). NOT throttled — a tap is a state, "
                    + "not a report action.")
    public void reportOpenStatus(@PathVariable long id, @Valid @RequestBody OpenStatusReportRequest request) {
        reportService.putOpenStatus(requireRegistered(currentCaller.requireUser()), id, request.state());
    }

    /**
     * PUT /api/shelters/{id} — update the caller's OWN USER-source shelter.
     * 404 if absent; 403 if not the author (registry/legacy rows are
     * unmanageable by anyone); 400 on bbox/field violations. Only the five
     * writable fields change; the response is the updated {@link ShelterDto}.
     *
     * <p>Owner-edit trust reset: a real edit of a PUBLISHED row also
     * returns the shelter to the same pending-verification state
     * ({@code reviewStatus = NEW}) a newly added shelter carries —
     * published stays published (the row's status is preserved), the
     * pending treatment applies until a verification (the admin CONFIRM or
     * a community OPEN_CONFIRMED report) clears it. A no-op PUT and hidden
     * (REJECTED/auto-hidden) rows keep their state. The trust state is not
     * a request field — it cannot be set by the client (see
     * {@link ShelterService#updatePlace}).
     */
    @PutMapping("/{id}")
    @Operation(summary = "Update the caller's own shelter",
            description = "Update the caller's OWN USER-source shelter. 404 if absent; "
                    + "403 if not the author (registry/legacy rows are unmanageable by "
                    + "anyone); 400 on bbox/field violations. Only the writable fields "
                    + "change; an edit of a published row also returns the shelter to "
                    + "the pending-verification trust state a newly added shelter carries "
                    + "(reviewStatus NEW — published stays published, a following "
                    + "verification clears it; a no-op PUT and hidden rows keep their "
                    + "state; the trust state is not a request field). The response is "
                    + "the updated ShelterDto.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "The updated shelter", content =
                    @Content(schema = @Schema(implementation = ShelterDto.class))),
            @ApiResponse(responseCode = "403", description = "Not the author"),
            @ApiResponse(responseCode = "404", description = "Unknown shelter")
    })
    public ShelterDto update(@PathVariable long id, @Valid @RequestBody UpdateShelterRequest request) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        // The ownership check runs BEFORE the 400 validations (the API's
        // documented order: 404/403 before a bbox 400); the service
        // boundary re-checks it.
        Shelter shelter = shelterService.requireOwnedBy(id, user.getId());
        requireInsideEstonia(request.latitude(), request.longitude());
        Shelter updated = new Shelter(
                request.name(),
                new GeoPoint(request.latitude(), request.longitude()),
                shelter.getStatus(),
                shelter.getExternalId(),
                shelter.getSource(),
                shelter.getAddress(),
                shelter.getCounty(),
                shelter.getMunicipality(),
                shelter.getDataAsOf(),
                shelter.getSourceAttribution(),
                request.description(),
                request.capacity());
        updated.setId(shelter.getId());
        updated.setCreatedAt(shelter.getCreatedAt());
        updated.setCreatedBy(shelter.getCreatedBy());
        // Admin-owned state is preserved through the owner's edit (the
        // save copies every domain field): the trust-layer disarm flag
        // and the admin "inaccurate" mark. The community trust state is
        // NOT copied here — ShelterService.updatePlace owns it (the
        // owner-edit trust reset): a real edit of a published row returns
        // the shelter to the same pending-verification (NEW) state a
        // newly added shelter carries, and the owner can never
        // self-confirm by editing (the request carries no trust field —
        // the service overwrites the incoming value in every case).
        updated.setAutoHideDisarmed(shelter.isAutoHideDisarmed());
        updated.setReviewNote(shelter.getReviewNote());
        updated.setInaccurateMarkedAt(shelter.getInaccurateMarkedAt());
        updated.setInaccurateMarkedBy(shelter.getInaccurateMarkedBy());
        // The write-time trust snapshot (V31) is WROTE-TIME data — an edit
        // never re-snapshots it (the standing is as at the SUBMISSION);
        // preserve it through the owner's edit like the other
        // admin-owned state.
        updated.setSubmitterVerifiedAtCreation(shelter.getSubmitterVerifiedAtCreation());
        // The private-home declaration is updatable; absent = keep current.
        updated.setLocationKind(request.locationKind() == null
                ? shelter.getLocationKind() : request.locationKind());
        shelterService.updateOwned(user.getId(), updated);
        // The caller IS the author (requireOwnedBy) — pass the id so
        // the owner-scoped reviewNote stays on the owner's own response
        // (a rejected row keeps its reason through the owner's edit).
        return queryService.findById(id, user.getId())
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
    }

    /** DELETE /api/shelters/{id} — remove the caller's own shelter; 204. Its reports and occupancy cascade.
     *  The DELETED history row is actor-attributed to the submitter. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete the caller's own shelter",
            description = "204. Its reports and occupancy cascade. Author only (403 if "
                    + "not the author, 404 if absent); the DELETED history row is "
                    + "actor-attributed to the submitter.")
    public void delete(@PathVariable long id) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        shelterService.requireOwnedBy(id, user.getId());
        shelterService.deletePlace(id, user.getId());
    }

    /** The Estonia bbox gate, shared by POST and PUT so create/update cannot drift. */
    private static void requireInsideEstonia(double latitude, double longitude) {
        if (!GeoPoint.inEstonia(latitude, longitude)) {
            throw new InvalidShelterException("Shelter location must be inside Estonia");
        }
    }

    /**
     * The optional viewport box (shelter-bbox-paging): ALL four edges
     * together or none. The friendly 400 messages are thrown HERE (the
     * existing {@link InvalidShelterException} → 400 mapping, the same
     * vocabulary as the POST/PUT Estonia gate); {@link BoundingBox}'s own
     * constructor is the defense in depth. Note the explicit finiteness
     * check: Spring binds the literal "NaN" to {@code Double.NaN}, and
     * every comparison against NaN is false — a range check alone would
     * let it through and answer an empty list that reads as "no shelters".
     */
    private static BoundingBox requireBbox(Double minLat, Double minLng, Double maxLat, Double maxLng) {
        boolean any = minLat != null || minLng != null || maxLat != null || maxLng != null;
        if (!any) {
            return null;
        }
        if (minLat == null || minLng == null || maxLat == null || maxLng == null) {
            throw new InvalidShelterException("minLat, minLng, maxLat and maxLng must be given together");
        }
        if (!Double.isFinite(minLat) || !Double.isFinite(minLng)
                || !Double.isFinite(maxLat) || !Double.isFinite(maxLng)) {
            throw new InvalidShelterException("Bounding box coordinates must be finite numbers");
        }
        if (minLat < -90 || minLat > 90 || maxLat < -90 || maxLat > 90) {
            throw new InvalidShelterException("Latitude must be between -90 and 90");
        }
        if (minLng < -180 || minLng > 180 || maxLng < -180 || maxLng > 180) {
            throw new InvalidShelterException("Longitude must be between -180 and 180");
        }
        if (minLat > maxLat) {
            throw new InvalidShelterException("minLat must be <= maxLat");
        }
        if (minLng > maxLng) {
            throw new InvalidShelterException("minLng must be <= maxLng");
        }
        return new BoundingBox(minLat, minLng, maxLat, maxLng);
    }

    /** Bearer JWT + verified registered account (author mutations, mirroring the shelter author-mutation convention). */
    private RegisteredUser requireVerifiedRegisteredUser() {
        User user = currentCaller.requireUser();
        if (!(user instanceof RegisteredUser registered)) {
            throw new NotVerifiedException(MODIFY_SHELTERS_MESSAGE);
        }
        if (!registered.canWrite()) {
            throw new NotVerifiedException(MODIFY_SHELTERS_MESSAGE);
        }
        return registered;
    }

    /**
     * Bearer JWT + registered account for the open-status tap: a guest
     * is rejected here with the occupancy 403 vocabulary (REPORTING
     * MESSAGE); the {@code canWrite()} gate stays in the service, so an
     * unverified registered user gets the same 403 from the other side.
     */
    private static RegisteredUser requireRegistered(User user) {
        if (!(user instanceof RegisteredUser registered)) {
            throw new NotVerifiedException(ShelterReportService.REPORTING_MESSAGE);
        }
        return registered;
    }
}
