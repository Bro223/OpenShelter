package ee.sheltermap.api;

import ee.sheltermap.app.ShelterService;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.auth.InvalidAccessTokenException;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
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

    public ShelterController(ShelterQueryService queryService,
                             ShelterService shelterService,
                             UserRepository userRepository) {
        this.queryService = queryService;
        this.shelterService = shelterService;
        this.userRepository = userRepository;
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
        Shelter shelter = new Shelter(
                request.name(),
                new GeoPoint(request.latitude(), request.longitude()),
                ShelterStatus.ACTIVE,
                null, // USER submissions have no external id
                ShelterSource.USER);
        // description/capacity: validated at the boundary, then dropped —
        // the domain Shelter has no fields for them (see CreateShelterRequest javadoc).
        shelterService.addPlace(user, shelter);
        ShelterDto dto = queryService.findById(shelter.getId())
                .orElseThrow(() -> new IllegalStateException("shelter was not persisted"));
        return ResponseEntity.created(URI.create("/api/shelters/" + shelter.getId())).body(dto);
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
