package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.ShelterReviewRepository.RatingAggregate;
import ee.sheltermap.app.UserRepository;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.User;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read side of the shelter API. Returns <strong>DTOs only, never
 * entities</strong> (05-shelter-api.puml). Rating aggregates and creator
 * verification state are each computed in <strong>one batched query</strong>
 * per listing — no N+1 (hardening pass; previously one {@code findByShelterId}
 * per shelter; the creator batch is accessibility-and-provenance D3).
 */
@Service
public class ShelterQueryService {

    private final ShelterRepository shelterRepository;
    private final ShelterReviewRepository reviewRepository;
    private final UserRepository userRepository;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               ShelterReviewRepository reviewRepository,
                               UserRepository userRepository) {
        this.shelterRepository = shelterRepository;
        this.reviewRepository = reviewRepository;
        this.userRepository = userRepository;
    }

    public List<ShelterDto> findAll(ShelterSourceFilter filter) {
        return toDtos(shelterRepository.findAllBySourceIn(filter.sources()));
    }

    public Optional<ShelterDto> findById(long id) {
        return shelterRepository.findById(id).map(shelter -> toDtos(List.of(shelter)).get(0));
    }

    /** The caller's own shelters, same lean DTO projection as the public list (no N+1). */
    public List<ShelterDto> findByCreatedBy(long userId) {
        return toDtos(shelterRepository.findByCreatedBy(userId));
    }

    /** Maps a batch of shelters in ONE aggregate query (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        List<Long> ids = shelters.stream().map(Shelter::getId).toList();
        Map<Long, RatingAggregate> aggregates = reviewRepository.findRatingAggregates(ids).stream()
                .collect(Collectors.toMap(RatingAggregate::shelterId, Function.identity()));
        // Provenance (accessibility-and-provenance D3): the batch's creators in
        // ONE lookup — distinct non-null author ids; missing ids (deleted users)
        // simply stay absent from the returned map.
        Set<Long> authorIds = shelters.stream()
                .map(Shelter::getCreatedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> authors = userRepository.findByIds(authorIds);
        return shelters.stream()
                .map(shelter -> {
                    // null key: registry row / pre-V7 legacy row — no author lookup
                    Long createdById = shelter.getCreatedBy();
                    User author = createdById == null ? null : authors.get(createdById);
                    return toDto(shelter, aggregates.get(shelter.getId()), author);
                })
                .toList();
    }

    private ShelterDto toDto(Shelter shelter, RatingAggregate aggregate, User author) {
        double average = aggregate == null ? 0 : aggregate.average();
        long count = aggregate == null ? 0 : aggregate.count();
        // "Completed verification" = at least one active (non-revoked) claim;
        // a null author (registry row or a deleted user) is never verified.
        boolean submitterVerified = author != null && !author.getData().levels().isEmpty();
        return new ShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getLocation().lat(),
                shelter.getLocation().lng(),
                shelter.getStatus(),
                shelter.getSource(),
                count == 0 ? null : average,
                (int) count,
                shelter.getCreatedAt(),
                shelter.getDescription(),
                shelter.getCapacity(),
                submitterVerified);
    }
}
