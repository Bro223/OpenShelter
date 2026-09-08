package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
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
 */
@RestController
@RequestMapping("/api/shelters")
public class ShelterController {

    private final ShelterQueryService queryService;
    private final ShelterService shelterService;
    private final UserRepository userRepository;
    private final ShelterRepository shelterRepository;

    public ShelterController(ShelterQueryService queryService,
                             ShelterService shelterService,
                             UserRepository userRepository,
                             ShelterRepository shelterRepository) {
        this.queryService = queryService;
        this.shelterService = shelterService;
        this.userRepository = userRepository;
        this.shelterRepository = shelterRepository;
    }

    @GetMapping
    public List<ShelterDto> list(@RequestParam(defaultValue = "ALL") ShelterSourceFilter source) {
        return queryService.findAll(source);
    }

    @GetMapping("/{id}")
    public ShelterDto get(@PathVariable long id) {
        return queryService.findById(id).orElseThrow(() -> new ShelterNotFoundException(id));
    }

    @PostMapping
    public ResponseEntity<ShelterDto> create(@Valid @RequestBody CreateShelterRequest request) {
        User user = currentUser();
        if (!user.canWrite()) {
            throw new NotVerifiedException("a verified account is required to submit shelters");
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
        shelterService.addPlace(user, shelter);
        ShelterDto dto = queryService.findById(shelter.getId())
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
        return ResponseEntity.created(URI.create("/api/shelters/" + shelter.getId())).body(dto);
    }

    /** GET /api/shelters/mine — the caller's own shelters (Bearer JWT). */
    @GetMapping("/mine")
    public List<ShelterDto> mine() {
        return queryService.findByCreatedBy(currentUser().getId());
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
            throw new NotAuthorException("only the author may modify this shelter");
        }
        return shelter;
    }

    /** The Estonia bbox gate, shared by POST and PUT so create/update cannot drift. */
    private static void requireInsideEstonia(double latitude, double longitude) {
        if (!GeoPoint.inEstonia(latitude, longitude)) {
            throw new InvalidShelterException("shelter location must be inside Estonia");
        }
    }

    /** Bearer JWT + verified registered account (author mutations, mirroring ReviewController). */
    private RegisteredUser requireVerifiedRegisteredUser() {
        User user = currentUser();
        if (!(user instanceof RegisteredUser registered)) {
            throw new NotVerifiedException("a verified account is required to modify shelters");
        }
        if (!registered.canWrite()) {
            throw new NotVerifiedException("a verified account is required to modify shelters");
        }
        return registered;
    }

    private User currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Long userId)) {
            throw new InvalidAccessTokenException("authentication required");
        }
        User user = userRepository.findById(userId);
        if (user == null) {
            throw new InvalidAccessTokenException("unknown user");
        }
        return user;
    }
}
