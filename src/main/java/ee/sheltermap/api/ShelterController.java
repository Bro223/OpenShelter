package ee.sheltermap.api;

import ee.sheltermap.app.NotVerifiedException;
import ee.sheltermap.app.ShelterNotFoundException;
import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReportService;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.LocationKind;
import ee.sheltermap.domain.OccupancyBand;
import ee.sheltermap.domain.Provenance;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReportType;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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
 * <p>Deferred (06-CONTEXT-API.md decision 2, deliberately NOT built):
 * nearest/bbox queries need GeoService + PostGIS GIST index; paging
 * (limit/offset) — Estonia-scale data is small. TODO: add when it grows.
 *
 * <p>Trust layer (shelter-trust-and-reports): the public list is
 * ACTIVE-only (D5) and accepts the optional trust filters; the detail
 * read carries the caller's own occupancy band; the report/occupancy
 * POSTs require a verified registered user (same gate and error
 * vocabulary as submissions).
 */
@RestController
@RequestMapping("/api/shelters")
public class ShelterController {

    /**
     * 403 message for author-scoped shelter mutations (update/delete) —
     * duplicated here because both branches of
     * {@link #requireVerifiedRegisteredUser()} reject with it (de-slop K5).
     */
    private static final String MODIFY_SHELTERS_MESSAGE =
            "A verified account is required to modify shelters";

    private final ShelterQueryService queryService;
    private final ShelterService shelterService;
    private final ShelterReportService reportService;
    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;

    public ShelterController(ShelterQueryService queryService,
                             ShelterService shelterService,
                             ShelterReportService reportService,
                             UserRepository userRepository,
                             ShelterRepository shelterRepository) {
        this.queryService = queryService;
        this.shelterService = shelterService;
        this.reportService = reportService;
        this.userRepository = userRepository;
        this.shelterRepository = shelterRepository;
    }

    /**
     * The public list. {@code source} as before (D5: ACTIVE rows only —
     * auto-hidden shelters are absent); the optional trust filters combine
     * with it in the projection: {@code reviewed} (at least one visible
     * review; {@code false} = the negation), {@code minRating} 1..5
     * (anything else 400; shelters with no reviews never match),
     * {@code hasCapacity} (capacity data present).
     *
     * <p>{@code provenance} (shelter-provenance-taxonomy M6): optional
     * taxonomy filter — keeps rows whose server-derived provenance matches
     * (OFFICIAL / PARTNER_VERIFIED / COMMUNITY_REPORTED / UNDER_REVIEW are
     * the only values reachable in the ACTIVE-only list; REPORTED_INACTIVE
     * and REJECTED filter to an empty list by construction). Absent = no
     * provenance filter; combines with every other filter. A value outside
     * the enum is a 400 (Spring enum binding, same as {@code source}).
     */
    @GetMapping
    public List<ShelterDto> list(@RequestParam(defaultValue = "ALL") ShelterSourceFilter source,
                                 @RequestParam(required = false) Boolean reviewed,
                                 @RequestParam(required = false) Integer minRating,
                                 @RequestParam(required = false) Boolean hasCapacity,
                                 @RequestParam(required = false) Provenance provenance) {
        requireValidMinRating(minRating);
        return queryService.findAll(source, reviewed, minRating, hasCapacity, provenance);
    }

    /**
     * The detail read — additionally carries {@code yourOccupancyBand}
     * (the caller's own live band for this shelter; null for guests,
     * anonymous callers and callers without a report). Rejected
     * (INACTIVE) rows stay readable by id exactly as any other INACTIVE
     * row — the review model adds no detail-read rule.
     * (community-review-queue v2 D2).
     */
    @GetMapping("/{id}")
    public ShelterDto get(@PathVariable long id) {
        return queryService.findById(id, callerOrGuest()).orElseThrow(() -> new ShelterNotFoundException(id));
    }

    @PostMapping
    public ResponseEntity<ShelterDto> create(@Valid @RequestBody CreateShelterRequest request) {
        User user = currentUser();
        if (!user.canWrite()) {
            throw new NotVerifiedException(ShelterService.SUBMIT_SHELTERS_MESSAGE);
        }
        // P2 fix: user-submitted shelters get the same Estonia bounding-box
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
        // The private-home declaration (community-review-queue v2 D7):
        // absent = PUBLIC.
        shelter.setLocationKind(request.locationKind() == null
                ? LocationKind.PUBLIC : request.locationKind());
        shelterService.addPlace(user, shelter);
        ShelterDto dto = queryService.findById(shelter.getId())
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
        return ResponseEntity.created(URI.create("/api/shelters/" + shelter.getId())).body(dto);
    }

    /** GET /api/shelters/mine — the caller's own shelters (Bearer JWT), all statuses (D5). */
    @GetMapping("/mine")
    public List<ShelterDto> mine() {
        return queryService.findByCreatedBy(currentUser().getId());
    }

    /**
     * POST /api/shelters/{id}/reports — one typed report per user per
     * shelter per type (shelter-trust-and-reports D1). Verified users
     * only (same 403 vocabulary as submissions); 404 unknown shelter;
     * 409 duplicate (shelter, user, type); 429 report throttle.
     */
    @PostMapping("/{id}/reports")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void report(@PathVariable long id, @Valid @RequestBody ShelterReportRequest request) {
        reportService.reportShelter(currentUser(), id, request.type(), request.detail());
    }

    /**
     * PUT /api/shelters/{id}/occupancy — the caller's live occupancy band
     * (D4): one report per user per shelter, re-sending updates it
     * (latest band wins, {@code updated_at} refreshed). Verified users
     * only; 404 unknown shelter; 429 report throttle.
     */
    @PutMapping("/{id}/occupancy")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reportOccupancy(@PathVariable long id, @Valid @RequestBody OccupancyReportRequest request) {
        reportService.reportOccupancy(currentUser(), id, request.band());
    }

    /** minRating is 1..5 stars; anything else is a malformed value (400). */
    private static void requireValidMinRating(Integer minRating) {
        if (minRating != null && (minRating < 1 || minRating > 5)) {
            throw new InvalidShelterException("minRating must be between 1 and 5");
        }
    }

    /**
     * PUT /api/shelters/{id} — update the caller's OWN USER-source shelter.
     * 404 if absent; 403 if not the author (registry/legacy rows are
     * unmanageable by anyone); 400 on bbox/field violations. Only the five
     * writable fields change; the response is the updated {@link ShelterDto}.
     */
    @PutMapping("/{id}")
    public ShelterDto update(@PathVariable long id, @Valid @RequestBody UpdateShelterRequest request) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        Shelter shelter = requireOwnedShelter(id, user);
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
        // and the community trust state (a PUT must never let the owner
        // reset review_status/review_note — including "self-confirming"
        // a NEW row by editing it).
        updated.setAutoHideDisarmed(shelter.isAutoHideDisarmed());
        updated.setReviewStatus(shelter.getReviewStatus());
        updated.setReviewNote(shelter.getReviewNote());
        // The private-home declaration is updatable; absent = keep current.
        updated.setLocationKind(request.locationKind() == null
                ? shelter.getLocationKind() : request.locationKind());
        shelterService.updatePlace(updated);
        return queryService.findById(id)
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
    }

    /** DELETE /api/shelters/{id} — remove the caller's own shelter; 204. Its reviews cascade. */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable long id) {
        RegisteredUser user = requireVerifiedRegisteredUser();
        requireOwnedShelter(id, user);
        shelterService.deletePlace(id);
    }

    /** Resolve + author check, shared by PUT/DELETE: 404 if absent, 403 if not the author. */
    private Shelter requireOwnedShelter(long id, User user) {
        Shelter shelter = shelterRepository.findById(id)
                .orElseThrow(() -> new ShelterNotFoundException(id));
        if (shelter.getSource() != ShelterSource.USER
                || shelter.getCreatedBy() == null
                || !shelter.getCreatedBy().equals(user.getId())) {
            throw new NotAuthorException("Only the author may modify this shelter");
        }
        return shelter;
    }

    /** The Estonia bbox gate, shared by POST and PUT so create/update cannot drift. */
    private static void requireInsideEstonia(double latitude, double longitude) {
        if (!GeoPoint.inEstonia(latitude, longitude)) {
            throw new InvalidShelterException("Shelter location must be inside Estonia");
        }
    }

    /** Bearer JWT + verified registered account (author mutations, mirroring ReviewController). */
    private RegisteredUser requireVerifiedRegisteredUser() {
        User user = currentUser();
        if (!(user instanceof RegisteredUser registered)) {
            throw new NotVerifiedException(MODIFY_SHELTERS_MESSAGE);
        }
        if (!registered.canWrite()) {
            throw new NotVerifiedException(MODIFY_SHELTERS_MESSAGE);
        }
        return registered;
    }

    /**
     * The authenticated caller, or a fresh guest for anonymous reads —
     * the detail projection's {@code yourOccupancyBand} is null for a
     * guest (id {@code null}), so this never throws on public GETs.
     */
    private User callerOrGuest() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof Long userId) {
            User user = userRepository.findById(userId);
            if (user != null) {
                return user;
            }
        }
        return new GuestUser();
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InvalidAccessTokenException("Authentication required");
        }
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new InvalidAccessTokenException("Unknown user");
        }
        return user;
    }
}
