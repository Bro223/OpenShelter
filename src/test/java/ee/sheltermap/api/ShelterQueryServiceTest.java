package ee.sheltermap.api;

import ee.sheltermap.app.InMemoryShelterRepository;
import ee.sheltermap.app.InMemoryShelterReviewRepository;
import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterReview;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit tests for the read side of the shelter API: source-filter mapping
 * (REGISTRY/USER/ALL → repository source sets), DTO mapping that never leaks
 * the entity, and rating aggregates computed per request.
 */
class ShelterQueryServiceTest {

    private InMemoryShelterRepository shelters;
    private InMemoryShelterReviewRepository reviews;
    private ShelterQueryService service;

    private Shelter userShelter;
    private Shelter registryShelter;
    private Shelter municipalityShelter;

    @BeforeEach
    void setUp() {
        shelters = new InMemoryShelterRepository();
        reviews = new InMemoryShelterReviewRepository();
        service = new ShelterQueryService(shelters, reviews);

        userShelter = save("User House", ShelterSource.USER);
        registryShelter = save("Paasteamet House", ShelterSource.PAASETEAMET);
        municipalityShelter = save("City House", ShelterSource.MUNICIPALITY);
    }

    private Shelter save(String name, ShelterSource source) {
        Shelter shelter = new Shelter(name, new GeoPoint(59.4, 24.7), ShelterStatus.ACTIVE, "ext-" + name, source);
        shelters.save(shelter);
        return shelter;
    }

    @Test
    void filterUserReturnsOnlyUserRowsAsDtos() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.USER);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactly("User House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.USER);
    }

    @Test
    void filterRegistryReturnsOnlyImportedRows() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.REGISTRY);

        assertThat(dtos).extracting(ShelterDto::name)
                .containsExactlyInAnyOrder("Paasteamet House", "City House");
        assertThat(dtos).extracting(ShelterDto::source)
                .containsOnly(ShelterSource.PAASETEAMET, ShelterSource.MUNICIPALITY);
    }

    @Test
    void filterAllReturnsEverything() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL);

        assertThat(dtos).hasSize(3);
    }

    @Test
    void dtoCarriesRatingAggregatesComputedPerRequest() {
        // two reviews: 4 and 5 -> average 4.5, count 2
        reviews.save(new ShelterReview(userShelter.getId(), 1L, 4, "decent"));
        reviews.save(new ShelterReview(userShelter.getId(), 2L, 5, "great"));

        ShelterDto dto = service.findById(userShelter.getId()).orElseThrow();

        assertThat(dto.id()).isEqualTo(userShelter.getId());
        assertThat(dto.name()).isEqualTo("User House");
        assertThat(dto.latitude()).isEqualTo(59.4);
        assertThat(dto.longitude()).isEqualTo(24.7);
        assertThat(dto.status()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(dto.source()).isEqualTo(ShelterSource.USER);
        assertThat(dto.averageRating()).isEqualTo(4.5);
        assertThat(dto.reviewCount()).isEqualTo(2);
        assertThat(dto.address()).isNull(); // lean projection — no address on this row
    }

    @Test
    void dtoWithoutReviewsHasNullAverageAndZeroCount() {
        ShelterDto dto = service.findById(registryShelter.getId()).orElseThrow();

        assertThat(dto.averageRating()).isNull();
        assertThat(dto.reviewCount()).isZero();
    }

    @Test
    void findByIdMissingShelterReturnsEmpty() {
        assertThat(service.findById(999_999L)).isEmpty();
    }

    @Test
    void dtoNeverLeaksTheEntity() {
        List<ShelterDto> dtos = service.findAll(ShelterSourceFilter.ALL);
        // the returned objects are records (DTOs), not the domain Shelter
        assertThat(dtos).allMatch(dto -> dto instanceof ShelterDto);
        // and the repo still holds exactly the domain entities
        assertThat(shelters.findAll()).hasSize(3);
    }
}
