package ee.sheltermap.api;

import ee.sheltermap.app.ShelterRepository;
import ee.sheltermap.app.ShelterReviewRepository;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * Read side of the shelter API. Returns <strong>DTOs only, never
 * entities</strong> (05-shelter-api.puml). Rating aggregates are computed
 * per request in v1 (06-CONTEXT-API.md decision 1) — denormalize when
 * traffic grows.
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
        return shelterRepository.findAllBySourceIn(filter.sources()).stream()
                .map(this::toDto)
                .toList();
    }

    public Optional<ShelterDto> findById(long id) {
        return shelterRepository.findById(id).map(this::toDto);
    }

    private ShelterDto toDto(Shelter shelter) {
        List<ShelterReview> reviews = reviewRepository.findByShelterId(shelter.getId());
        double average = reviews.stream().mapToInt(ShelterReview::getRating).average().orElse(0);
        return new ShelterDto(
                shelter.getId(),
                shelter.getName(),
                shelter.getAddress(),
                shelter.getLocation().lat(),
                shelter.getLocation().lng(),
                shelter.getStatus(),
                shelter.getSource(),
                reviews.isEmpty() ? null : average,
                reviews.size(),
                // createdAt is part of the frontend contract (puml) but is not
                // captured anywhere in the model yet (domain Shelter has no
                // createdAt, no created_at column) — see report.
                null);
    }
}
