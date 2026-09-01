package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.app.ShelterReviewRepository.RatingAggregate;
import ee.sheltermap.domain.Shelter;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Read side of the shelter API. Returns <strong>DTOs only, never
 * entities</strong> (05-shelter-api.puml). Rating aggregates are computed in
 * <strong>one batched query</strong> per listing — no N+1 (hardening pass;
 * previously one {@code findByShelterId} per shelter).
 */
@Service
public class ShelterQueryService {

    private final ShelterRepository shelterRepository;
    private final ShelterReviewRepository reviewRepository;

    public ShelterQueryService(ShelterRepository shelterRepository,
                               ShelterReviewRepository reviewRepository) {
        this.shelterRepository = shelterRepository;
        this.reviewRepository = reviewRepository;
    }

    public List<ShelterDto> findAll(ShelterSourceFilter filter) {
        return toDtos(shelterRepository.findAllBySourceIn(filter.sources()));
    }

    public Optional<ShelterDto> findById(long id) {
        return shelterRepository.findById(id).map(shelter -> toDtos(List.of(shelter)).get(0));
    }

    /** Maps a batch of shelters in ONE aggregate query (no N+1). */
    private List<ShelterDto> toDtos(List<Shelter> shelters) {
        if (shelters.isEmpty()) {
            return List.of();
        }
        List<Long> ids = shelters.stream().map(Shelter::getId).toList();
        Map<Long, RatingAggregate> aggregates = reviewRepository.findRatingAggregates(ids).stream()
                .collect(Collectors.toMap(RatingAggregate::shelterId, Function.identity()));
        return shelters.stream()
                .map(shelter -> toDto(shelter, aggregates.get(shelter.getId())))
                .toList();
    }

    private ShelterDto toDto(Shelter shelter, RatingAggregate aggregate) {
        double average = aggregate == null ? 0 : aggregate.average();
        long count = aggregate == null ? 0 : aggregate.count();
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
                // createdAt is part of the frontend contract (puml) but is not
                // captured anywhere in the model yet (domain Shelter has no
                // createdAt, no created_at column) — see report.
                null,
                shelter.getDescription(),
                shelter.getCapacity());
    }
}
