package ee.sheltermap.app;

import ee.sheltermap.domain.GeoPoint;
import ee.sheltermap.domain.GuestUser;
import ee.sheltermap.domain.RegisteredUser;
import ee.sheltermap.domain.Shelter;
import ee.sheltermap.domain.ShelterSource;
import ee.sheltermap.domain.ShelterStatus;
import ee.sheltermap.domain.VerificationClaim;
import ee.sheltermap.domain.VerificationLevel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ShelterServiceTest {

    private static final GeoPoint POINT = new GeoPoint(59.438861, 24.754472);

    private InMemoryShelterRepository repo;
    private ShelterService service;

    @BeforeEach
    void setUp() {
        repo = new InMemoryShelterRepository();
        service = new ShelterService(repo);
    }

    private static Shelter userPlace() {
        return userPlace("Kadriorg shelter");
    }

    private static Shelter userPlace(String name) {
        return new Shelter(name, POINT, ShelterStatus.ACTIVE, null, ShelterSource.USER);
    }

    private static RegisteredUser verifiedUser() {
        return verifiedUser(1L);
    }

    private static RegisteredUser verifiedUser(long id) {
        RegisteredUser user = new RegisteredUser(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.setId(id);
        user.addVerification(new VerificationClaim(
                VerificationLevel.PHONE, "twilio", "+37250000000", Instant.now()));
        return user;
    }

    @Test
    void guestCannotAddPlace() {
        assertThatThrownBy(() -> service.addPlace(new GuestUser(), userPlace()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(repo.findAll()).isEmpty();
    }

    @Test
    void unverifiedRegisteredUserCannotAddPlace() {
        RegisteredUser user = new RegisteredUser(
                "Aleks", "aleks@example.com", "+37250000000", "39001010001");
        user.setId(1L);

        assertThatThrownBy(() -> service.addPlace(user, userPlace()))
                .isInstanceOf(IllegalStateException.class);

        assertThat(repo.findAll()).isEmpty();
    }

    @Test
    void verifiedUserCanAddPlaceSavedAsActiveUser() {
        Shelter place = userPlace();

        service.addPlace(verifiedUser(), place);

        assertThat(repo.findAll()).hasSize(1);
        Shelter saved = repo.findAll().get(0);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
        assertThat(saved.getSource()).isEqualTo(ShelterSource.USER);
        assertThat(saved.getExternalId()).isNull();
    }

    @Test
    void addPlaceRecordsTheAuthorLink() {
        Shelter place = userPlace();

        service.addPlace(verifiedUser(), place);

        Shelter saved = repo.findAll().get(0);
        assertThat(saved.getCreatedBy()).isEqualTo(1L);
        assertThat(repo.findByCreatedBy(1L)).containsExactly(saved);
    }

    @Test
    void findMineReturnsOnlyThatUsersShelters() {
        RegisteredUser other = verifiedUser(2L);

        service.addPlace(verifiedUser(), userPlace("Mine One"));
        service.addPlace(verifiedUser(), userPlace("Mine Two"));
        service.addPlace(other, userPlace("Not Mine"));

        assertThat(service.findMine(1L))
                .extracting(Shelter::getName)
                .containsExactly("Mine One", "Mine Two");
        assertThat(service.findMine(99L)).isEmpty();
    }

    @Test
    void updatePlaceReplacesEditableFieldsKeepingIdentityAuthorAndSource() {
        Shelter place = userPlace("Original");
        service.addPlace(verifiedUser(), place);
        Long id = place.getId();

        Shelter updated = new Shelter(
                "Renamed", new GeoPoint(58.95, 25.55), ShelterStatus.ACTIVE, null, ShelterSource.USER,
                null, null, null, null, null, "New description", 40);
        updated.setId(id);
        updated.setCreatedBy(place.getCreatedBy());
        service.updatePlace(updated);

        Shelter saved = repo.findById(id).orElseThrow();
        assertThat(saved.getName()).isEqualTo("Renamed");
        assertThat(saved.getLocation().lat()).isEqualTo(58.95);
        assertThat(saved.getLocation().lng()).isEqualTo(25.55);
        assertThat(saved.getDescription()).isEqualTo("New description");
        assertThat(saved.getCapacity()).isEqualTo(40);
        // identity + author link untouched
        assertThat(saved.getCreatedBy()).isEqualTo(1L);
        assertThat(saved.getSource()).isEqualTo(ShelterSource.USER);
        assertThat(saved.getStatus()).isEqualTo(ShelterStatus.ACTIVE);
    }

    @Test
    void deletePlaceRemovesTheRow() {
        Shelter place = userPlace();
        service.addPlace(verifiedUser(), place);

        service.deletePlace(place.getId());

        assertThat(repo.findById(place.getId())).isEmpty();
        assertThat(service.findMine(1L)).isEmpty();
    }

    @Test
    void rejectsPlaceThatIsNotActiveOrNotUserSource() {
        Shelter inactivePlace = new Shelter("P", POINT, ShelterStatus.INACTIVE, null, ShelterSource.USER);
        Shelter registryPlace = new Shelter("R", POINT, ShelterStatus.ACTIVE, "ext-1", ShelterSource.PAASETEAMET);

        assertThatThrownBy(() -> service.addPlace(verifiedUser(), inactivePlace))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> service.addPlace(verifiedUser(), registryPlace))
                .isInstanceOf(IllegalArgumentException.class);

        assertThat(repo.findAll()).isEmpty();
    }
}
